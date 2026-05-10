const express = require('express')
const router = express.Router()
const verifyToken = require('../middleware/verifyToken')
const { submit, mysurvey, teamSurveys } = require('../controllers/surveyController')

router.post('/', verifyToken, submit)
router.get('/my', verifyToken, mysurvey)
router.get('/team', verifyToken, teamSurveys)

module.exports = router
