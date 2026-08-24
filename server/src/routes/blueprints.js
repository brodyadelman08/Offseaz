const express = require('express')
const router = express.Router()
const verifyToken = require('../middleware/verifyToken')
const { listTemplates, generateFromTemplate, create, list, detail, assign, bulkAssign, myPlan, lock, remove, getOverrides, saveOverrides, getActivePlanAthletes } = require('../controllers/blueprintController')

// Static routes before dynamic /:id
router.get('/templates', verifyToken, listTemplates)
router.post('/templates/generate', verifyToken, generateFromTemplate)
router.get('/my-plan', verifyToken, myPlan)
router.get('/active-plan-athletes', verifyToken, getActivePlanAthletes)
router.get('/overrides/:athleteId', verifyToken, getOverrides)
router.post('/overrides/:athleteId', verifyToken, saveOverrides)

router.post('/', verifyToken, create)
router.get('/', verifyToken, list)
router.get('/:id', verifyToken, detail)
router.post('/:id/assign', verifyToken, assign)
router.post('/:id/assign-bulk', verifyToken, bulkAssign)
router.patch('/:id/lock', verifyToken, lock)
router.delete('/:id', verifyToken, remove)

module.exports = router
