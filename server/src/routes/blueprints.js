const express = require('express')
const router = express.Router()
const verifyToken = require('../middleware/verifyToken')
const { create, list, detail, assign, myPlan, lock, getOverrides, saveOverrides } = require('../controllers/blueprintController')

// Static routes before dynamic /:id
router.get('/my-plan', verifyToken, myPlan)
router.get('/overrides/:athleteId', verifyToken, getOverrides)
router.post('/overrides/:athleteId', verifyToken, saveOverrides)

router.post('/', verifyToken, create)
router.get('/', verifyToken, list)
router.get('/:id', verifyToken, detail)
router.post('/:id/assign', verifyToken, assign)
router.patch('/:id/lock', verifyToken, lock)

module.exports = router
