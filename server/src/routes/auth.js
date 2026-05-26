const express = require('express')
const router = express.Router()
const verifyToken = require('../middleware/verifyToken')
const { register, profile, updateAvatar, updatePrivacy } = require('../controllers/authController')

router.post('/register', register)
router.get('/profile', verifyToken, profile)
router.patch('/avatar', verifyToken, updateAvatar)
router.patch('/privacy', verifyToken, updatePrivacy)

module.exports = router
