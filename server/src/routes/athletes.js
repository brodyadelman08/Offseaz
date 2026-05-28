const express = require('express')
const router = express.Router()
const verifyToken = require('../middleware/verifyToken')
const { profile, saveNote } = require('../controllers/athleteController')

router.get('/:id', verifyToken, profile)
router.put('/:id/notes', verifyToken, saveNote)

module.exports = router
