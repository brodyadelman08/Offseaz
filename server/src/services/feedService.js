const supabaseAdmin = require('../config/supabase')

async function getTeamId(userId, role) {
  if (role === 'coach') {
    const { data, error } = await supabaseAdmin
      .from('teams')
      .select('id')
      .eq('coach_id', userId)
      .single()
    if (error) throw new Error('Team not found')
    return data.id
  } else {
    const { data, error } = await supabaseAdmin
      .from('team_members')
      .select('team_id')
      .eq('athlete_id', userId)
      .single()
    if (error) throw new Error('Not on a team')
    return data.team_id
  }
}

async function getFeed(teamId, userId) {
  const { data: posts, error } = await supabaseAdmin
    .from('team_posts')
    .select('id, team_id, author_id, content, created_at')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })
    .limit(60)
  if (error) throw new Error(error.message)
  if (!posts || posts.length === 0) return []

  const postIds = posts.map(p => p.id)
  const authorIds = [...new Set(posts.map(p => p.author_id))]

  // Profiles, likes, comments in parallel
  const [profilesRes, likesRes, commentsRes] = await Promise.all([
    supabaseAdmin.from('profiles').select('id, full_name, avatar_url').in('id', authorIds),
    supabaseAdmin.from('post_likes').select('post_id, user_id').in('post_id', postIds),
    supabaseAdmin.from('post_comments')
      .select('id, post_id, author_id, content, created_at')
      .in('post_id', postIds)
      .order('created_at', { ascending: true }),
  ])

  const profileMap = Object.fromEntries((profilesRes.data || []).map(p => [p.id, p]))

  // Gather extra author IDs from comments
  const commentAuthorIds = [...new Set((commentsRes.data || []).map(c => c.author_id).filter(id => !profileMap[id]))]
  if (commentAuthorIds.length > 0) {
    const { data: extras } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', commentAuthorIds)
    for (const p of extras || []) profileMap[p.id] = p
  }

  const likes = likesRes.data || []
  const comments = commentsRes.data || []

  return posts.map(post => ({
    ...post,
    author: profileMap[post.author_id] || { id: post.author_id, full_name: 'Unknown', avatar_url: null },
    like_count: likes.filter(l => l.post_id === post.id).length,
    liked_by_me: likes.some(l => l.post_id === post.id && l.user_id === userId),
    comments: comments
      .filter(c => c.post_id === post.id)
      .map(c => ({ ...c, author: profileMap[c.author_id] || { full_name: 'Unknown' } })),
  }))
}

async function createPost(teamId, authorId, content) {
  const { data, error } = await supabaseAdmin
    .from('team_posts')
    .insert({ team_id: teamId, author_id: authorId, content })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

async function deletePost(postId, userId, role) {
  const { data: post, error } = await supabaseAdmin
    .from('team_posts')
    .select('id, author_id')
    .eq('id', postId)
    .single()
  if (error) throw new Error('Post not found')
  if (role !== 'coach' && post.author_id !== userId) {
    throw Object.assign(new Error('Not allowed to delete this post'), { status: 403 })
  }
  const { error: delError } = await supabaseAdmin
    .from('team_posts')
    .delete()
    .eq('id', postId)
  if (delError) throw new Error(delError.message)
}

async function toggleLike(postId, userId) {
  const { data: existing } = await supabaseAdmin
    .from('post_likes')
    .select('post_id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) {
    await supabaseAdmin.from('post_likes').delete().eq('post_id', postId).eq('user_id', userId)
    return { liked: false }
  } else {
    await supabaseAdmin.from('post_likes').insert({ post_id: postId, user_id: userId })
    return { liked: true }
  }
}

async function addComment(postId, authorId, content) {
  const { data, error } = await supabaseAdmin
    .from('post_comments')
    .insert({ post_id: postId, author_id: authorId, content })
    .select()
    .single()
  if (error) throw new Error(error.message)

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, avatar_url')
    .eq('id', authorId)
    .single()

  return { ...data, author: profile || { full_name: 'Unknown' } }
}

async function deleteComment(commentId, userId, role) {
  const { data: comment, error } = await supabaseAdmin
    .from('post_comments')
    .select('id, author_id')
    .eq('id', commentId)
    .single()
  if (error) throw new Error('Comment not found')
  if (role !== 'coach' && comment.author_id !== userId) {
    throw Object.assign(new Error('Not allowed to delete this comment'), { status: 403 })
  }
  await supabaseAdmin.from('post_comments').delete().eq('id', commentId)
}

module.exports = { getTeamId, getFeed, createPost, deletePost, toggleLike, addComment, deleteComment }
