const express = require('express')
const router = express.Router()
const verifyToken = require('../middleware/verifyToken')
const { register, profile } = require('../controllers/authController')

router.post('/register', verifyToken, register)
router.get('/profile', verifyToken, profile)

module.exports = router
