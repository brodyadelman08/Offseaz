const express = require('express')
const router = express.Router()
const verifyToken = require('../middleware/verifyToken')
const {
  create,
  mine,
  join,
  joinAsCoach,
  coaches,
  updateCoachAccess,
  removeCoach,
  athleteTeam,
  athleteTeams,
  myCoachTeams,
} = require('../controllers/teamsController')

router.post('/',                           verifyToken, create)
router.get('/my-coach-teams',              verifyToken, myCoachTeams)
router.get('/mine',                        verifyToken, mine)
router.post('/join',                       verifyToken, join)
router.post('/join-as-coach',              verifyToken, joinAsCoach)
router.get('/my-team',                     verifyToken, athleteTeam)
router.get('/my-teams',                    verifyToken, athleteTeams)
router.get('/coaches',                     verifyToken, coaches)
router.patch('/coaches/:coachId/access',   verifyToken, updateCoachAccess)
router.delete('/coaches/:coachId',         verifyToken, removeCoach)

module.exports = router
