// Clean SVG icon library — stroke-based, 24x24 viewBox
// All icons accept: size (number), color (string), strokeWidth (number)

const base = (size, color, sw = 1.75) => ({
  width: size,
  height: size,
  display: 'inline-block',
  flexShrink: 0,
  verticalAlign: 'middle',
  fill: 'none',
  stroke: color,
  strokeWidth: sw,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
})

export function GridIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg style={base(size, color)} viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  )
}

export function UsersIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg style={base(size, color)} viewBox="0 0 24 24">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

export function LayoutIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg style={base(size, color)} viewBox="0 0 24 24">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
      <path d="M9 21V9" />
    </svg>
  )
}

export function MessageIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg style={base(size, color)} viewBox="0 0 24 24">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

export function BarChartIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg style={base(size, color)} viewBox="0 0 24 24">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  )
}

export function HomeIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg style={base(size, color)} viewBox="0 0 24 24">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

export function CalendarIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg style={base(size, color)} viewBox="0 0 24 24">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

export function EditIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg style={base(size, color)} viewBox="0 0 24 24">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

export function UserIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg style={base(size, color)} viewBox="0 0 24 24">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

export function SignOutIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg style={base(size, color)} viewBox="0 0 24 24">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

export function BoltIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg style={base(size, color)} viewBox="0 0 24 24">
      <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}

export function FlameIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg style={base(size, color)} viewBox="0 0 24 24">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  )
}

export function AlertIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg style={base(size, color)} viewBox="0 0 24 24">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

export function ClipboardIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg style={base(size, color)} viewBox="0 0 24 24">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" />
    </svg>
  )
}

export function DumbbellIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg style={base(size, color)} viewBox="0 0 24 24">
      <line x1="6.5" y1="12" x2="17.5" y2="12" />
      <rect x="2" y="10" width="4" height="4" rx="1" />
      <rect x="18" y="10" width="4" height="4" rx="1" />
      <rect x="6" y="8" width="2.5" height="8" rx="1" />
      <rect x="15.5" y="8" width="2.5" height="8" rx="1" />
    </svg>
  )
}

export function CheckCircleIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg style={base(size, color)} viewBox="0 0 24 24">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}

export function CheckIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg style={base(size, color)} viewBox="0 0 24 24">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export function CopyIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg style={base(size, color)} viewBox="0 0 24 24">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

export function BroadcastIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg style={base(size, color)} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="2" />
      <path d="M8.5 8.5a5 5 0 0 0 0 7.07" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7.07" />
      <path d="M5 5a10 10 0 0 0 0 14.14" />
      <path d="M19 5a10 10 0 0 1 0 14.14" />
    </svg>
  )
}

export function ArrowLeftIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg style={base(size, color)} viewBox="0 0 24 24">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  )
}

export function PlusIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg style={base(size, color)} viewBox="0 0 24 24">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

export function ChevronDownIcon({ size = 16, color = 'currentColor' }) {
  return (
    <svg style={base(size, color)} viewBox="0 0 24 24">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

export function ChevronUpIcon({ size = 16, color = 'currentColor' }) {
  return (
    <svg style={base(size, color)} viewBox="0 0 24 24">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  )
}

export function TrophyIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg style={base(size, color)} viewBox="0 0 24 24">
      <path d="M8 21h8M12 17v4" />
      <path d="M7 4H4a2 2 0 0 0-2 2v1a5 5 0 0 0 5 5" />
      <path d="M17 4h3a2 2 0 0 1 2 2v1a5 5 0 0 1-5 5" />
      <path d="M12 17a7 7 0 0 0 7-7V4H5v6a7 7 0 0 0 7 7z" />
    </svg>
  )
}

export function HeartIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg style={base(size, color)} viewBox="0 0 24 24">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

export function HeartFilledIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg style={{ ...base(size, color), fill: color }} viewBox="0 0 24 24">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

export function LockIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg style={base(size, color)} viewBox="0 0 24 24">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

export function ArrowUpIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg style={base(size, color)} viewBox="0 0 24 24">
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </svg>
  )
}

export function ArrowDownIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg style={base(size, color)} viewBox="0 0 24 24">
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="19 12 12 19 5 12" />
    </svg>
  )
}

export function SeedlingIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg style={base(size, color)} viewBox="0 0 24 24">
      <path d="M12 22V12" />
      <path d="M12 12C12 8 8 4 3 4c0 5 4 8 9 8z" />
      <path d="M12 12c0-4 4-8 9-8-1 5-5 8-9 8z" />
    </svg>
  )
}

export function BarbellIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg style={base(size, color)} viewBox="0 0 24 24">
      <line x1="6.5" y1="12" x2="17.5" y2="12" />
      <rect x="2" y="9" width="3" height="6" rx="1" />
      <rect x="19" y="9" width="3" height="6" rx="1" />
      <line x1="5" y1="12" x2="6.5" y2="12" />
      <line x1="17.5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

// ── Sport icons ────────────────────────────────────────────────────────────────

export function FootballIcon({ size = 24, color = 'currentColor' }) {
  return (
    <svg style={base(size, color, 1.5)} viewBox="0 0 24 24">
      <ellipse cx="12" cy="12" rx="9" ry="6" />
      <line x1="12" y1="6" x2="12" y2="18" />
      <line x1="9" y1="11" x2="15" y2="11" />
      <line x1="9" y1="13" x2="15" y2="13" />
    </svg>
  )
}

export function BasketballIcon({ size = 24, color = 'currentColor' }) {
  return (
    <svg style={base(size, color, 1.5)} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <path d="M12 3c-3.5 4-3.5 14 0 18" />
      <path d="M12 3c3.5 4 3.5 14 0 18" />
    </svg>
  )
}

export function BaseballIcon({ size = 24, color = 'currentColor' }) {
  return (
    <svg style={base(size, color, 1.5)} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 4.5c1 5 1 10 0 15" />
      <path d="M14.5 4.5c-1 5-1 10 0 15" />
    </svg>
  )
}

export function SoccerIcon({ size = 24, color = 'currentColor' }) {
  return (
    <svg style={base(size, color, 1.5)} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" />
      <polygon points="12,6 15,9 14,13 10,13 9,9" />
      <line x1="9" y1="9" x2="4.5" y2="8" />
      <line x1="15" y1="9" x2="19.5" y2="8" />
      <line x1="10" y1="13" x2="8.5" y2="18" />
      <line x1="14" y1="13" x2="15.5" y2="18" />
    </svg>
  )
}

export function HockeyIcon({ size = 24, color = 'currentColor' }) {
  return (
    <svg style={base(size, color, 1.5)} viewBox="0 0 24 24">
      <ellipse cx="12" cy="16" rx="8" ry="4" />
      <path d="M4 16V13c0-2.2 3.6-4 8-4s8 1.8 8 4v3" />
    </svg>
  )
}

export function VolleyballIcon({ size = 24, color = 'currentColor' }) {
  return (
    <svg style={base(size, color, 1.5)} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 11c4-4 10-3 12 1" />
      <path d="M15 12c2-4 8-4 7.5 1" />
      <path d="M12 3c-1 4-4 6-4 9" />
    </svg>
  )
}

export function WrestlingIcon({ size = 24, color = 'currentColor' }) {
  return (
    <svg style={base(size, color, 1.5)} viewBox="0 0 24 24">
      <circle cx="7" cy="4" r="2" />
      <circle cx="17" cy="4" r="2" />
      <path d="M5 21l2-6 3 2 2-4 2 4 3-2 2 6" />
      <path d="M7 10c1 2 2 3 5 3s4-1 5-3" />
    </svg>
  )
}

export function RunningIcon({ size = 24, color = 'currentColor' }) {
  return (
    <svg style={base(size, color, 1.5)} viewBox="0 0 24 24">
      <circle cx="15" cy="4" r="2" />
      <path d="M19 9l-4 2-2 9" />
      <path d="M5 19l4-5 4-1 2-4" />
      <path d="M11 13l-5-2" />
    </svg>
  )
}

export function LacrosseIcon({ size = 24, color = 'currentColor' }) {
  return (
    <svg style={base(size, color, 1.5)} viewBox="0 0 24 24">
      <line x1="5" y1="20" x2="15" y2="8" />
      <path d="M15 8c0-3 6-3 6 0s-6 3-6 0z" />
    </svg>
  )
}

export function SwimmingIcon({ size = 24, color = 'currentColor' }) {
  return (
    <svg style={base(size, color, 1.5)} viewBox="0 0 24 24">
      <circle cx="17" cy="5" r="2" />
      <path d="M13 7l4-2 2 4-5 4" />
      <path d="M2 16c2-3 4-3 6 0s4 3 6 0 4-3 6 0" />
      <path d="M2 20c2-3 4-3 6 0s4 3 6 0 4-3 6 0" />
    </svg>
  )
}

export function MedalIcon({ size = 24, color = 'currentColor' }) {
  return (
    <svg style={base(size, color, 1.5)} viewBox="0 0 24 24">
      <circle cx="12" cy="15" r="6" />
      <path d="M8.5 8.5L12 3l3.5 5.5" />
      <line x1="10" y1="15" x2="14" y2="15" />
      <line x1="12" y1="13" x2="12" y2="17" />
    </svg>
  )
}

// ── End sport icons ────────────────────────────────────────────────────────────

export function FeedIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg style={base(size, color)} viewBox="0 0 24 24">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <line x1="9" y1="9" x2="15" y2="9" />
      <line x1="9" y1="13" x2="13" y2="13" />
    </svg>
  )
}

export function TargetIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg style={base(size, color)} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  )
}

export function FileTextIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg style={base(size, color)} viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )
}
