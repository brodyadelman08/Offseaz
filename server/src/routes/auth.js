const express = require('express')
const router = express.Router()
const verifyToken = require('../middleware/verifyToken')
const { checkAge, register, profile, confirmAge, updateAvatar, updateName, updatePrivacy, updateDigestPreference, deleteAccount } = require('../controllers/authController')

router.post('/check-age', checkAge)
router.post('/register', register)
router.get('/profile', verifyToken, profile)
router.patch('/confirm-age', verifyToken, confirmAge)
router.patch('/avatar', verifyToken, updateAvatar)
router.patch('/name', verifyToken, updateName)
router.patch('/privacy', verifyToken, updatePrivacy)
router.patch('/digest-preference', verifyToken, updateDigestPreference)
router.delete('/account', verifyToken, deleteAccount)

module.exports = router
