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
    .select('id, team_id, author_id, content, photo_url, created_at')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })
    .limit(60)
  if (error) throw new Error(error.message)
  if (!posts || posts.length === 0) return []

  const postIds = posts.map(p => p.id)
  const authorIds = [...new Set(posts.map(p => p.author_id))]

  const [profilesRes, likesRes, commentsRes] = await Promise.all([
    supabaseAdmin.from('profiles').select('id, full_name, avatar_url').in('id', authorIds),
    supabaseAdmin.from('post_likes').select('post_id, user_id').in('post_id', postIds),
    supabaseAdmin.from('post_comments')
      .select('id, post_id, author_id, content, created_at')
      .in('post_id', postIds)
      .order('created_at', { ascending: true }),
  ])

  const profileMap = Object.fromEntries((profilesRes.data || []).map(p => [p.id, p]))

  const commentAuthorIds = [...new Set((commentsRes.data || []).map(c => c.author_id).filter(id => !profileMap[id]))]
  if (commentAuthorIds.length > 0) {
    const { data: extras } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', commentAuthorIds)
    for (const p of extras || []) profileMap[p.id] = p
  }

  const likes    = likesRes.data    || []
  const comments = commentsRes.data || []

  return posts.map(post => ({
    ...post,
    author: profileMap[post.author_id] || { id: post.author_id, full_name: 'Unknown', avatar_url: null },
    like_count:   likes.filter(l => l.post_id === post.id).length,
    liked_by_me:  likes.some(l => l.post_id === post.id && l.user_id === userId),
    comments: comments
      .filter(c => c.post_id === post.id)
      .map(c => ({ ...c, author: profileMap[c.author_id] || { full_name: 'Unknown' } })),
  }))
}

async function createPost(teamId, authorId, content, photoUrl) {
  const { data, error } = await supabaseAdmin
    .from('team_posts')
    .insert({ team_id: teamId, author_id: authorId, content, photo_url: photoUrl || null })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

async function deletePost(postId, userId, role) {
  const { data: post, error } = await supabaseAdmin
    .from('team_posts')
    .select('id, author_id, photo_url')
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

  // Return photo_url so the controller can remove from storage
  return post.photo_url || null
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

// Upload a feed photo to Supabase Storage (avatars bucket, feed-photos folder).
// Returns the public URL.
async function uploadFeedPhoto(authorId, dataUrl, mimeType) {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!allowedTypes.includes(mimeType)) throw new Error('Unsupported image type')

  const base64 = dataUrl.split(',')[1]
  if (!base64) throw new Error('Invalid image data')

  const buffer = Buffer.from(base64, 'base64')
  if (buffer.byteLength > 5 * 1024 * 1024) throw new Error('Image must be under 5 MB')

  const ext  = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg'
  const slug = `${Date.now()}_${authorId.replace(/-/g, '').slice(0, 12)}_${Math.random().toString(36).slice(2, 8)}`
  const path = `feed-photos/${slug}.${ext}`

  const { error: upError } = await supabaseAdmin.storage
    .from('avatars')
    .upload(path, buffer, { contentType: mimeType, upsert: false })

  if (upError) throw new Error(upError.message)

  const { data: urlData } = supabaseAdmin.storage.from('avatars').getPublicUrl(path)
  return urlData.publicUrl
}

// Delete a feed photo from Supabase Storage given its full public URL.
async function deleteFeedPhoto(photoUrl) {
  try {
    // Extract path after /avatars/ from the public URL
    const marker = '/avatars/'
    const idx = photoUrl.indexOf(marker)
    if (idx === -1) return
    // After the marker, strip any query string
    const path = photoUrl.slice(idx + marker.length).split('?')[0]
    await supabaseAdmin.storage.from('avatars').remove([path])
  } catch (_) {
    // Non-fatal — post is already deleted; just log
    console.warn('[feedService] Failed to delete feed photo from storage:', photoUrl)
  }
}

module.exports = {
  getTeamId, getFeed, createPost, deletePost,
  toggleLike, addComment, deleteComment,
  uploadFeedPhoto, deleteFeedPhoto,
}
