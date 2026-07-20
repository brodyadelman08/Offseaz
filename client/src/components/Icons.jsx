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

// ── Sport icons — multicolor, brand colors, viewBox 0 0 40 40 ─────────────────
const sb = { display: 'inline-block', flexShrink: 0, verticalAlign: 'middle' }

export function FootballIcon({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={sb}>
      <g transform="rotate(-28 20 20)">
        <ellipse cx="20" cy="20" rx="17" ry="10" fill="#F75709" />
        <ellipse cx="20" cy="20" rx="17" ry="10" fill="none" stroke="#bf4207" strokeWidth="0.8" />
        {/* Lengthwise seam */}
        <line x1="3" y1="20" x2="37" y2="20" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        {/* Lace vertical bar */}
        <line x1="20" y1="13" x2="20" y2="27" stroke="white" strokeWidth="2" strokeLinecap="round" />
        {/* Lace horizontal stitches */}
        <line x1="15.5" y1="16.5" x2="24.5" y2="16.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="15" y1="19.5" x2="25" y2="19.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="15.5" y1="22.5" x2="24.5" y2="22.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
      </g>
    </svg>
  )
}

export function BasketballIcon({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={sb}>
      <circle cx="20" cy="20" r="17" fill="#F75709" />
      <circle cx="20" cy="20" r="17" fill="none" stroke="#bf4207" strokeWidth="0.8" />
      {/* Seam lines */}
      <line x1="3" y1="20" x2="37" y2="20" stroke="#7a2800" strokeWidth="1.5" />
      <line x1="20" y1="3" x2="20" y2="37" stroke="#7a2800" strokeWidth="1.5" />
      <path d="M 20 3 Q 9 15 9 20 Q 9 25 20 37" fill="none" stroke="#7a2800" strokeWidth="1.5" />
      <path d="M 20 3 Q 31 15 31 20 Q 31 25 20 37" fill="none" stroke="#7a2800" strokeWidth="1.5" />
    </svg>
  )
}

export function BaseballIcon({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={sb}>
      <circle cx="20" cy="20" r="17" fill="white" />
      <circle cx="20" cy="20" r="17" fill="none" stroke="#ccc" strokeWidth="1" />
      {/* Left stitch curve + tick marks */}
      <path d="M 13 6 Q 7 20 13 34" fill="none" stroke="#c73820" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="13" y1="10" x2="9.5" y2="8.5" stroke="#c73820" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="11.5" y1="16" x2="8" y2="16" stroke="#c73820" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="10.5" y1="22" x2="7" y2="22" stroke="#c73820" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="11.5" y1="28" x2="8" y2="29" stroke="#c73820" strokeWidth="1.5" strokeLinecap="round" />
      {/* Right stitch curve + tick marks */}
      <path d="M 27 6 Q 33 20 27 34" fill="none" stroke="#c73820" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="27" y1="10" x2="30.5" y2="8.5" stroke="#c73820" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="28.5" y1="16" x2="32" y2="16" stroke="#c73820" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="29.5" y1="22" x2="33" y2="22" stroke="#c73820" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="28.5" y1="28" x2="32" y2="29" stroke="#c73820" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function SoftballIcon({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={sb}>
      <circle cx="20" cy="20" r="17" fill="#F0BE24" />
      <circle cx="20" cy="20" r="17" fill="none" stroke="#c89e00" strokeWidth="1" />
      <path d="M 13 6 Q 7 20 13 34" fill="none" stroke="#c73820" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="13" y1="10" x2="9.5" y2="8.5" stroke="#c73820" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="11.5" y1="16" x2="8" y2="16" stroke="#c73820" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="10.5" y1="22" x2="7" y2="22" stroke="#c73820" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="11.5" y1="28" x2="8" y2="29" stroke="#c73820" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M 27 6 Q 33 20 27 34" fill="none" stroke="#c73820" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="27" y1="10" x2="30.5" y2="8.5" stroke="#c73820" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="28.5" y1="16" x2="32" y2="16" stroke="#c73820" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="29.5" y1="22" x2="33" y2="22" stroke="#c73820" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="28.5" y1="28" x2="32" y2="29" stroke="#c73820" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function SoccerIcon({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={sb}>
      <circle cx="20" cy="20" r="17" fill="white" />
      <circle cx="20" cy="20" r="17" fill="none" stroke="#bbb" strokeWidth="1" />
      {/* Center pentagon */}
      <polygon points="20,12 26,16 24,23 16,23 14,16" fill="#308EBD" />
      {/* Radiating lines from each vertex to edge */}
      <line x1="20" y1="12" x2="20" y2="3" stroke="#308EBD" strokeWidth="1.5" />
      <line x1="26" y1="16" x2="35" y2="12" stroke="#308EBD" strokeWidth="1.5" />
      <line x1="24" y1="23" x2="31" y2="32" stroke="#308EBD" strokeWidth="1.5" />
      <line x1="16" y1="23" x2="9" y2="32" stroke="#308EBD" strokeWidth="1.5" />
      <line x1="14" y1="16" x2="5" y2="12" stroke="#308EBD" strokeWidth="1.5" />
    </svg>
  )
}

export function HockeyIcon({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={sb}>
      {/* Puck side */}
      <rect x="6" y="20" width="28" height="8" rx="1" fill="#2a2a2a" />
      {/* Puck bottom ellipse */}
      <ellipse cx="20" cy="28" rx="14" ry="4" fill="#333" />
      {/* Puck top face */}
      <ellipse cx="20" cy="20" rx="14" ry="5" fill="#308EBD" />
      {/* Subtle top highlight */}
      <ellipse cx="16" cy="19" rx="5" ry="2" fill="rgba(255,255,255,0.2)" />
    </svg>
  )
}

export function VolleyballIcon({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={sb}>
      <circle cx="20" cy="20" r="17" fill="#eef2ff" />
      <circle cx="20" cy="20" r="17" fill="none" stroke="#308EBD" strokeWidth="1.5" />
      {/* Three curved seam lines */}
      <path d="M 3 20 Q 14 9 37 15" fill="none" stroke="#308EBD" strokeWidth="2" />
      <path d="M 9 9 Q 20 22 10 35" fill="none" stroke="#308EBD" strokeWidth="2" />
      <path d="M 31 8 Q 22 21 35 33" fill="none" stroke="#308EBD" strokeWidth="2" />
    </svg>
  )
}

export function WrestlingIcon({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={sb}>
      {/* Orange wrestler (left) */}
      <circle cx="10" cy="6" r="3.5" fill="#F75709" />
      <line x1="10" y1="10" x2="12" y2="22" stroke="#F75709" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="11" y1="14" x2="20" y2="17" stroke="#F75709" strokeWidth="2" strokeLinecap="round" />
      <line x1="11" y1="14" x2="4" y2="10" stroke="#F75709" strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="22" x2="6" y2="34" stroke="#F75709" strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="22" x2="17" y2="33" stroke="#F75709" strokeWidth="2" strokeLinecap="round" />
      {/* Blue wrestler (right) */}
      <circle cx="30" cy="6" r="3.5" fill="#308EBD" />
      <line x1="30" y1="10" x2="28" y2="22" stroke="#308EBD" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="29" y1="14" x2="20" y2="17" stroke="#308EBD" strokeWidth="2" strokeLinecap="round" />
      <line x1="29" y1="14" x2="36" y2="10" stroke="#308EBD" strokeWidth="2" strokeLinecap="round" />
      <line x1="28" y1="22" x2="23" y2="33" stroke="#308EBD" strokeWidth="2" strokeLinecap="round" />
      <line x1="28" y1="22" x2="34" y2="34" stroke="#308EBD" strokeWidth="2" strokeLinecap="round" />
      {/* Grapple point */}
      <circle cx="20" cy="17" r="2.5" fill="#F0BE24" />
    </svg>
  )
}

export function RunningIcon({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={sb}>
      {/* Head */}
      <circle cx="27" cy="6" r="4" fill="#F75709" />
      {/* Torso */}
      <line x1="25" y1="10" x2="20" y2="23" stroke="#F75709" strokeWidth="2.5" strokeLinecap="round" />
      {/* Back arm */}
      <line x1="23" y1="14" x2="14" y2="10" stroke="#F75709" strokeWidth="2" strokeLinecap="round" />
      {/* Front arm */}
      <line x1="22" y1="17" x2="31" y2="14" stroke="#F75709" strokeWidth="2" strokeLinecap="round" />
      {/* Front leg — striding forward */}
      <line x1="20" y1="23" x2="27" y2="35" stroke="#F75709" strokeWidth="2.5" strokeLinecap="round" />
      {/* Back leg — kick behind */}
      <line x1="20" y1="23" x2="12" y2="30" stroke="#F75709" strokeWidth="2.5" strokeLinecap="round" />
      {/* Front foot plant */}
      <line x1="27" y1="35" x2="33" y2="37" stroke="#F75709" strokeWidth="2" strokeLinecap="round" />
      {/* Back foot kick-up */}
      <line x1="12" y1="30" x2="8" y2="24" stroke="#F75709" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function CrossCountryIcon({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={sb}>
      {/* Runner */}
      <circle cx="29" cy="5" r="3.5" fill="#F75709" />
      <line x1="27" y1="9" x2="23" y2="21" stroke="#F75709" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="25" y1="13" x2="17" y2="10" stroke="#F75709" strokeWidth="2" strokeLinecap="round" />
      <line x1="24" y1="16" x2="32" y2="13" stroke="#F75709" strokeWidth="2" strokeLinecap="round" />
      <line x1="23" y1="21" x2="30" y2="31" stroke="#F75709" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="23" y1="21" x2="16" y2="28" stroke="#F75709" strokeWidth="2.5" strokeLinecap="round" />
      {/* Terrain / rolling hills */}
      <path d="M 2 34 Q 8 25 16 30 Q 24 36 33 27 Q 37 23 40 25" fill="none" stroke="#308EBD" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

export function LacrosseIcon({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={sb}>
      {/* Stick shaft */}
      <line x1="5" y1="37" x2="27" y2="10" stroke="#F75709" strokeWidth="3" strokeLinecap="round" />
      {/* Stick head — pocket outline */}
      <path d="M 27 10 Q 39 5 37 18 Q 35 23 27 22" fill="rgba(247,87,9,0.18)" stroke="#F75709" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Mesh pocket strings */}
      <line x1="28.5" y1="12" x2="34" y2="20" stroke="#F75709" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
      <line x1="32" y1="10" x2="31" y2="22" stroke="#F75709" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
      {/* Ball */}
      <circle cx="11" cy="31" r="4" fill="#308EBD" />
    </svg>
  )
}

export function SwimmingIcon({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={sb}>
      {/* Head */}
      <circle cx="33" cy="9" r="4" fill="#F75709" />
      {/* Body reaching forward */}
      <line x1="29" y1="11" x2="9" y2="18" stroke="#F75709" strokeWidth="2.5" strokeLinecap="round" />
      {/* Leading arm extended */}
      <line x1="9" y1="18" x2="2" y2="13" stroke="#F75709" strokeWidth="2" strokeLinecap="round" />
      {/* Recovery arm (out of water, overhead) */}
      <line x1="22" y1="14" x2="26" y2="5" stroke="#F75709" strokeWidth="2" strokeLinecap="round" />
      {/* Flutter kick legs */}
      <line x1="29" y1="11" x2="36" y2="18" stroke="#F75709" strokeWidth="2" strokeLinecap="round" />
      <line x1="30" y1="13" x2="36" y2="22" stroke="#F75709" strokeWidth="2" strokeLinecap="round" />
      {/* Water surface waves */}
      <path d="M 2 24 Q 7 20 12 24 Q 17 28 22 24 Q 27 20 32 24 Q 37 28 40 25" fill="none" stroke="#308EBD" strokeWidth="2" strokeLinecap="round" />
      <path d="M 5 30 Q 10 26 15 30 Q 20 34 25 30 Q 30 26 36 30" fill="none" stroke="#308EBD" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function RugbyIcon({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={sb}>
      <g transform="rotate(-28 20 20)">
        <ellipse cx="20" cy="20" rx="17" ry="11" fill="#7a3b1e" />
        <ellipse cx="20" cy="20" rx="17" ry="11" fill="none" stroke="#5c2b13" strokeWidth="0.8" />
        {/* Lengthwise seam only — a rugby ball has no laces */}
        <line x1="3" y1="20" x2="37" y2="20" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      </g>
    </svg>
  )
}

export function TennisIcon({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={sb}>
      <circle cx="20" cy="20" r="17" fill="#D5E326" />
      <circle cx="20" cy="20" r="17" fill="none" stroke="#a7b01d" strokeWidth="0.8" />
      {/* Curved seam */}
      <path d="M 5 12 Q 16 20 5 28" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path d="M 35 12 Q 24 20 35 28" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function GolfIcon({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={sb}>
      {/* Ball */}
      <circle cx="16" cy="18" r="10" fill="white" />
      <circle cx="16" cy="18" r="10" fill="none" stroke="#ccc" strokeWidth="1" />
      {/* Dimples */}
      <circle cx="12" cy="14" r="1" fill="#ddd" />
      <circle cx="17" cy="13" r="1" fill="#ddd" />
      <circle cx="21" cy="16" r="1" fill="#ddd" />
      <circle cx="11" cy="19" r="1" fill="#ddd" />
      <circle cx="16" cy="19" r="1" fill="#ddd" />
      <circle cx="20" cy="21" r="1" fill="#ddd" />
      <circle cx="13" cy="23" r="1" fill="#ddd" />
      <circle cx="18" cy="24" r="1" fill="#ddd" />
      {/* Flagstick */}
      <line x1="30" y1="6" x2="30" y2="35" stroke="#555" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M 30 6 L 38 9.5 L 30 13 Z" fill="#F75709" />
    </svg>
  )
}

export function SportOtherIcon({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={sb}>
      <circle cx="20" cy="20" r="17" fill="#308EBD" />
      <line x1="20" y1="10" x2="20" y2="30" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="10" y1="20" x2="30" y2="20" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  )
}

// ── End sport icons ────────────────────────────────────────────────────────────

export function TrashIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg style={base(size, color)} viewBox="0 0 24 24">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}

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

// ── Status icons — workout logging ─────────────────────────────────────────────
// These replace emoji-based status indicators throughout the app.
// All are stroke-only so they inherit the parent button's text/icon color.

/** Completed workout — circle with bold checkmark */
export function StatusCompleteIcon({ size = 24, color = 'currentColor' }) {
  return (
    <svg style={base(size, color, 2)} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" />
      <polyline points="7.5 12 10.5 15.5 16.5 8.5" />
    </svg>
  )
}

/** Partial workout — circle split into filled / empty halves */
export function StatusPartialIcon({ size = 24, color = 'currentColor' }) {
  return (
    <svg style={base(size, color, 1.75)} viewBox="0 0 24 24">
      {/* Full outer ring (dim) */}
      <circle cx="12" cy="12" r="9" strokeOpacity="0.35" />
      {/* Left half arc (solid) — 180° from bottom to top via left */}
      <path d="M 12 3 A 9 9 0 0 0 12 21" />
      {/* Centre dividing line */}
      <line x1="12" y1="3" x2="12" y2="21" />
    </svg>
  )
}

/** Skipped workout — circle with media-skip symbol (right bar + chevron) */
export function StatusSkippedIcon({ size = 24, color = 'currentColor' }) {
  return (
    <svg style={base(size, color, 1.75)} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" strokeOpacity="0.35" />
      {/* Forward chevron */}
      <polyline points="9 8.5 13.5 12 9 15.5" />
      {/* Vertical end-bar */}
      <line x1="15.5" y1="8.5" x2="15.5" y2="15.5" />
    </svg>
  )
}

/** Skipped — Injury — circle with medical cross */
export function StatusInjuryIcon({ size = 24, color = 'currentColor' }) {
  return (
    <svg style={base(size, color, 1.75)} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" />
      {/* Medical cross */}
      <line x1="12" y1="7.5" x2="12" y2="16.5" strokeWidth="2" />
      <line x1="7.5" y1="12" x2="16.5" y2="12" strokeWidth="2" />
    </svg>
  )
}

// ── Utility icons ──────────────────────────────────────────────────────────────

/** Open padlock — "unlocked / enter code" */
export function UnlockIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg style={base(size, color)} viewBox="0 0 24 24">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      {/* Shackle open on right */}
      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </svg>
  )
}

/** Eye — preview / visibility */
export function EyeIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg style={base(size, color)} viewBox="0 0 24 24">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

/** X / close / dismiss */
export function XIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg style={base(size, color)} viewBox="0 0 24 24">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

/** Warning triangle — API errors, alerts */
export function WarningIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg style={base(size, color)} viewBox="0 0 24 24">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <circle cx="12" cy="17" r="0.5" fill={color} />
    </svg>
  )
}

export function ArrowRightIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg style={base(size, color)} viewBox="0 0 24 24">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}

export function SendIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg style={base(size, color)} viewBox="0 0 24 24">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

export function CameraIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg style={base(size, color)} viewBox="0 0 24 24">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}

/** Simple side-view bed — rest day / recovery */
export function RestDayIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg style={base(size, color)} viewBox="0 0 24 24">
      {/* Pillow */}
      <rect x="3" y="9" width="7" height="5" rx="1.5" />
      {/* Mattress + footboard */}
      <path d="M3 14h18v4" />
      <path d="M21 14v-2a2 2 0 0 0-2-2h-6" />
      {/* Legs */}
      <path d="M3 18v2" />
      <path d="M21 18v2" />
    </svg>
  )
}

/** Crescent moon with a "Z" — sleep quality */
export function SleepIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg style={base(size, color)} viewBox="0 0 24 24">
      <path d="M20 13.5A8.5 8.5 0 1 1 10.5 5a6.5 6.5 0 0 0 9.5 8.5z" />
      <path d="M15 3h4l-4 4h4" />
    </svg>
  )
}
