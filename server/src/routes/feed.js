const express = require('express')
const router  = express.Router()
const verifyToken = require('../middleware/verifyToken')
const {
  getFeedHandler, createPostHandler, deletePostHandler, uploadPhotoHandler,
  toggleLikeHandler, addCommentHandler, deleteCommentHandler,
} = require('../controllers/feedController')

router.get('/',                        verifyToken, getFeedHandler)
router.post('/',                       verifyToken, createPostHandler)
router.post('/photos',                 verifyToken, uploadPhotoHandler)
router.delete('/comments/:commentId',  verifyToken, deleteCommentHandler)
router.delete('/:postId',              verifyToken, deletePostHandler)
router.post('/:postId/like',           verifyToken, toggleLikeHandler)
router.post('/:postId/comments',       verifyToken, addCommentHandler)

module.exports = router
