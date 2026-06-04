const express = require('express')
const router = express.Router()
const verifyToken = require('../middleware/verifyToken')
const { register, profile, updateAvatar, updateName, updatePrivacy } = require('../controllers/authController')

router.post('/register', register)
router.get('/profile', verifyToken, profile)
router.patch('/avatar', verifyToken, updateAvatar)
router.patch('/name', verifyToken, updateName)
router.patch('/privacy', verifyToken, updatePrivacy)

module.exports = router
