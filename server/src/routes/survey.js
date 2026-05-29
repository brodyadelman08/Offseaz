const express = require('express')
const router = express.Router()
const verifyToken = require('../middleware/verifyToken')
const { submit, update, mysurvey, teamSurveys, updatePhysical } = require('../controllers/surveyController')

router.post('/', verifyToken, submit)
router.put('/', verifyToken, update)
router.get('/my', verifyToken, mysurvey)
router.get('/team', verifyToken, teamSurveys)
router.patch('/physical', verifyToken, updatePhysical)

module.exports = router
