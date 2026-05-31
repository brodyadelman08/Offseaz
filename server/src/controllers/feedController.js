const { getProfile } = require('../services/authService')
const {
  getTeamId, getFeed, createPost, deletePost,
  toggleLike, addComment, deleteComment,
} = require('../services/feedService')

async function getFeedHandler(req, res) {
  try {
    const profile = await getProfile(req.user.id)
    const teamId = await getTeamId(req.user.id, profile.role)
    const posts = await getFeed(teamId, req.user.id)
    res.json({ posts })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
}

async function createPostHandler(req, res) {
  const { content } = req.body
  if (!content?.trim()) return res.status(400).json({ error: 'Content is required' })
  try {
    const profile = await getProfile(req.user.id)
    const teamId = await getTeamId(req.user.id, profile.role)
    const post = await createPost(teamId, req.user.id, content.trim())
    res.status(201).json({ post })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
}

async function deletePostHandler(req, res) {
  const { postId } = req.params
  try {
    const profile = await getProfile(req.user.id)
    await deletePost(postId, req.user.id, profile.role)
    res.json({ success: true })
  } catch (err) {
    if (err.status === 403) return res.status(403).json({ error: err.message })
    res.status(400).json({ error: err.message })
  }
}

async function toggleLikeHandler(req, res) {
  const { postId } = req.params
  try {
    const result = await toggleLike(postId, req.user.id)
    res.json(result)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
}

async function addCommentHandler(req, res) {
  const { postId } = req.params
  const { content } = req.body
  if (!content?.trim()) return res.status(400).json({ error: 'Content is required' })
  try {
    const comment = await addComment(postId, req.user.id, content.trim())
    res.status(201).json({ comment })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
}

async function deleteCommentHandler(req, res) {
  const { commentId } = req.params
  try {
    const profile = await getProfile(req.user.id)
    await deleteComment(commentId, req.user.id, profile.role)
    res.json({ success: true })
  } catch (err) {
    if (err.status === 403) return res.status(403).json({ error: err.message })
    res.status(400).json({ error: err.message })
  }
}

module.exports = {
  getFeedHandler, createPostHandler, deletePostHandler,
  toggleLikeHandler, addCommentHandler, deleteCommentHandler,
}
