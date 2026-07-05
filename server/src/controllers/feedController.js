const { getProfile } = require('../services/authService')
const {
  getTeamId, getFeed, createPost, deletePost,
  toggleLike, addComment, deleteComment,
  uploadFeedPhoto, deleteFeedPhoto,
} = require('../services/feedService')
const { sendError } = require('../utils/errorResponse')
const { rejectIfOversized } = require('../utils/uploadLimits')

async function getFeedHandler(req, res) {
  try {
    const profile = await getProfile(req.user.id)
    const teamId  = await getTeamId(req.user.id, profile.role, req.query.teamId || null)
    const posts   = await getFeed(teamId, req.user.id)
    res.json({ posts })
  } catch (err) {
    sendError(res, err, 'Failed to load feed.', 400)
  }
}

async function createPostHandler(req, res) {
  const { content, photo_url } = req.body
  if (!content?.trim() && !photo_url) {
    return res.status(400).json({ error: 'Content or photo is required' })
  }
  try {
    const profile = await getProfile(req.user.id)
    const teamId  = await getTeamId(req.user.id, profile.role, req.query.teamId || null)
    const post    = await createPost(teamId, req.user.id, (content || '').trim(), photo_url || null)
    res.status(201).json({ post })
  } catch (err) {
    sendError(res, err, 'Failed to create post.', 400)
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
    sendError(res, err, 'Failed to delete post.', 400)
  }
}

async function uploadPhotoHandler(req, res) {
  const { dataUrl, mimeType } = req.body
  if (!dataUrl || !mimeType) {
    return res.status(400).json({ error: 'dataUrl and mimeType are required' })
  }
  // Reject oversized payloads by declared size BEFORE the service decodes to
  // a Buffer — avoids allocating memory for a request we'll reject anyway.
  const base64 = dataUrl.split(',')[1]
  if (rejectIfOversized(req, res, base64)) return
  try {
    const url = await uploadFeedPhoto(req.user.id, dataUrl, mimeType)
    res.status(201).json({ url })
  } catch (err) {
    sendError(res, err, 'Failed to upload photo.', 400)
  }
}

async function toggleLikeHandler(req, res) {
  const { postId } = req.params
  try {
    const result = await toggleLike(postId, req.user.id)
    res.json(result)
  } catch (err) {
    sendError(res, err, 'Failed to update like.', 400)
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
    sendError(res, err, 'Failed to add comment.', 400)
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
    sendError(res, err, 'Failed to delete comment.', 400)
  }
}

module.exports = {
  getFeedHandler, createPostHandler, deletePostHandler, uploadPhotoHandler,
  toggleLikeHandler, addCommentHandler, deleteCommentHandler,
}
