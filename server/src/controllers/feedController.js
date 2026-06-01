const { getProfile } = require('../services/authService')
const {
  getTeamId, getFeed, createPost, deletePost,
  toggleLike, addComment, deleteComment,
  uploadFeedPhoto, deleteFeedPhoto,
} = require('../services/feedService')

async function getFeedHandler(req, res) {
  try {
    const profile = await getProfile(req.user.id)
    const teamId  = await getTeamId(req.user.id, profile.role)
    const posts   = await getFeed(teamId, req.user.id)
    res.json({ posts })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
}

async function createPostHandler(req, res) {
  const { content, photo_url } = req.body
  if (!content?.trim() && !photo_url) {
    return res.status(400).json({ error: 'Content or photo is required' })
  }
  try {
    const profile = await getProfile(req.user.id)
    const teamId  = await getTeamId(req.user.id, profile.role)
    const post    = await createPost(teamId, req.user.id, (content || '').trim(), photo_url || null)
    res.status(201).json({ post })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
}

async function deletePostHandler(req, res) {
  const { postId } = req.params
  try {
    const profile  = await getProfile(req.user.id)
    const photoUrl = await deletePost(postId, req.user.id, profile.role)
    // Fire-and-forget storage deletion — don't block the response
    if (photoUrl) deleteFeedPhoto(photoUrl)
    res.json({ success: true })
  } catch (err) {
    if (err.status === 403) return res.status(403).json({ error: err.message })
    res.status(400).json({ error: err.message })
  }
}

async function uploadPhotoHandler(req, res) {
  const { dataUrl, mimeType } = req.body
  if (!dataUrl || !mimeType) {
    return res.status(400).json({ error: 'dataUrl and mimeType are required' })
  }
  try {
    const url = await uploadFeedPhoto(req.user.id, dataUrl, mimeType)
    res.status(201).json({ url })
  } catch (err) {
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
  getFeedHandler, createPostHandler, deletePostHandler, uploadPhotoHandler,
  toggleLikeHandler, addCommentHandler, deleteCommentHandler,
}
