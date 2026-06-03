import TutorialOverlay from './TutorialOverlay'

const ATHLETE_STEPS = [
  {
    id:    'athlete-join-team',
    emoji: '🔑',
    title: 'Join your team',
    body:  "Enter your coach's invite code here to get connected and unlock your training plan.",
  },
  {
    id:    'athlete-survey',
    emoji: '📝',
    title: 'Complete your profile',
    body:  'Fill out your athlete profile so your coach can build the right plan for you.',
  },
  {
    id:    'athlete-plan',
    emoji: '📅',
    title: 'Your training blueprint',
    body:  'Your personalized training blueprint will appear here once your coach assigns one.',
  },
  {
    id:    'athlete-feed',
    emoji: '📢',
    title: 'Team feed',
    body:  'Post your workouts and see what your teammates are up to here.',
  },
  {
    id:    'athlete-goals',
    emoji: '🎯',
    title: 'Offseason goals',
    body:  'Set your offseason goals and track your progress all in one place.',
  },
]

export default function AthleteTutorial() {
  return (
    <TutorialOverlay
      steps={ATHLETE_STEPS}
      lsKey="offseaz_athlete_tutorial_v1"
      accent="#308EBD"
    />
  )
}
