const express = require('express')
const router = express.Router()
const verifyToken = require('../middleware/verifyToken')
const { register, profile } = require('../controllers/authController')

router.post('/register', register)
router.get('/profile', verifyToken, profile)

module.exports = router
