const express = require('express')
const router = express.Router()
const verifyToken = require('../middleware/verifyToken')
const { create, list, detail, assign, myPlan } = require('../controllers/blueprintController')

// Static routes before dynamic /:id
router.get('/my-plan', verifyToken, myPlan)

router.post('/', verifyToken, create)
router.get('/', verifyToken, list)
router.get('/:id', verifyToken, detail)
router.post('/:id/assign', verifyToken, assign)

module.exports = router
