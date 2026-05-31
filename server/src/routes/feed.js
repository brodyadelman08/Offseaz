const express = require('express')
const router = express.Router()
const verifyToken = require('../middleware/verifyToken')
const {
  getFeedHandler, createPostHandler, deletePostHandler,
  toggleLikeHandler, addCommentHandler, deleteCommentHandler,
} = require('../controllers/feedController')

router.get('/',                          verifyToken, getFeedHandler)
router.post('/',                         verifyToken, createPostHandler)
router.delete('/:postId',               verifyToken, deletePostHandler)
router.post('/:postId/like',            verifyToken, toggleLikeHandler)
router.post('/:postId/comments',        verifyToken, addCommentHandler)
router.delete('/comments/:commentId',   verifyToken, deleteCommentHandler)

module.exports = router
