const express = require('express')
const router = express.Router()
const verifyToken = require('../middleware/verifyToken')
const { register, profile, updateAvatar } = require('../controllers/authController')

router.post('/register', register)
router.get('/profile', verifyToken, profile)
router.patch('/avatar', verifyToken, updateAvatar)

module.exports = router
