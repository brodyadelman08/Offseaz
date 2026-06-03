import TutorialOverlay from './TutorialOverlay'

const COACH_STEPS = [
  {
    id:    'coach-invite',
    emoji: '🔗',
    title: 'Invite your athletes',
    body:  'Share this invite code or link with your athletes so they can join your team.',
  },
  {
    id:    'coach-blueprints',
    emoji: '📋',
    title: 'Create training blueprints',
    body:  'Build and assign personalized training plans to your athletes here.',
  },
  {
    id:    'coach-athletes',
    emoji: '👥',
    title: 'Track your roster',
    body:  "Monitor each athlete's progress, survey data, and injury status here.",
  },
  {
    id:    'coach-accountability',
    emoji: '📊',
    title: 'Accountability dashboard',
    body:  "See who's logging workouts and who's falling behind — all in one place.",
  },
  {
    id:    'coach-feed',
    emoji: '📢',
    title: 'Team feed',
    body:  'Team posts, workout logs, and activity all show up here.',
  },
]

export default function CoachTutorial() {
  return (
    <TutorialOverlay
      steps={COACH_STEPS}
      lsKey="offseaz_coach_tutorial_v1"
      accent="#F75709"
    />
  )
}
