const ORANGE = '#F75709'
const BLUE   = '#308EBD'
const YELLOW = '#F0BE24'
const WHITE  = '#FFFFFF'

const CSS = `
.anim { transform-box: fill-box; transform-origin: center; will-change: transform; }

@keyframes squat {
  0%,20%,80%,100% { transform: translateY(0); }
  45%,55% { transform: translateY(7px); }
}
@keyframes bench-press {
  0%,100% { transform: translateY(0); }
  38%,62% { transform: translateY(-8px); }
}
@keyframes deadlift {
  0%,15%,78%,100% { transform: translateY(0); }
  35%,55% { transform: translateY(9px); }
}
@keyframes power-clean {
  0%,10%,65%,100% { transform: translateY(0); }
  22% { transform: translateY(8px); }
  35% { transform: translateY(-10px); }
  50%,60% { transform: translateY(0); }
}
@keyframes band-work {
  0%,100% { transform: scaleX(1); }
  50% { transform: scaleX(1.3); }
}
@keyframes foam-roll {
  0%,100% { transform: translateX(0); }
  50% { transform: translateX(9px); }
}
@keyframes celebrate {
  0%,84%,100% { transform: scale(1); }
  88%,96% { transform: scale(1.4); }
}
@keyframes plat-pulse {
  0%,100% { opacity: 0; }
  40%,60% { opacity: 0.2; }
}

.sq-0 { animation: squat       2.4s ease-in-out infinite 0s;     }
.sq-1 { animation: squat       2.5s ease-in-out infinite 0.48s;  }
.sq-2 { animation: squat       2.3s ease-in-out infinite 0.96s;  }
.sq-3 { animation: squat       2.4s ease-in-out infinite 1.44s;  }
.sq-4 { animation: squat       2.5s ease-in-out infinite 1.92s;  }
.bp-0 { animation: bench-press 3.0s ease-in-out infinite 0s;     }
.bp-1 { animation: bench-press 3.1s ease-in-out infinite 0.75s;  }
.bp-2 { animation: bench-press 2.9s ease-in-out infinite 1.5s;   }
.bp-3 { animation: bench-press 3.0s ease-in-out infinite 2.25s;  }
.dl-0 { animation: deadlift    3.5s ease-in-out infinite 0s;     }
.dl-1 { animation: power-clean 3.0s ease-in-out infinite 0.87s;  }
.dl-2 { animation: deadlift    3.4s ease-in-out infinite 1.75s;  }
.dl-3 { animation: deadlift    3.5s ease-in-out infinite 2.6s;   }
.bw-0 { animation: band-work   1.9s ease-in-out infinite 0s;     }
.bw-1 { animation: band-work   2.0s ease-in-out infinite 0.7s;   }
.fr-0 { animation: foam-roll   2.2s ease-in-out infinite 0s;     }
.fr-1 { animation: foam-roll   2.1s ease-in-out infinite 0.6s;   }
.cel-0 { animation: celebrate  14s  ease-in-out infinite 2s;     }
.cel-1 { animation: celebrate  12s  ease-in-out infinite 9s;     }
.pp-0 { animation: plat-pulse  3.5s ease-in-out infinite 0s;     }
.pp-1 { animation: plat-pulse  3.0s ease-in-out infinite 0.87s;  }
.pp-2 { animation: plat-pulse  3.4s ease-in-out infinite 1.75s;  }
.pp-3 { animation: plat-pulse  3.5s ease-in-out infinite 2.6s;   }

.show-mobile { display: none; }

@media (max-width: 767px) {
  .hide-mobile { display: none; }
  .show-mobile { display: inline; }
  .anim { will-change: auto; }
  .sq-0,.sq-1,.sq-2,.sq-3,.sq-4,
  .bp-0,.bp-1,.bp-2,.bp-3,
  .dl-0,.dl-1,.dl-2,.dl-3,
  .bw-0,.bw-1,.fr-0,.fr-1,
  .cel-0,.cel-1,
  .pp-0,.pp-1,.pp-2,.pp-3 { animation: none !important; }
  .sq-0 { transform: translateY(5px);  }
  .sq-1 { transform: translateY(3px);  }
  .sq-2 { transform: translateY(7px);  }
  .bp-0 { transform: translateY(-7px); }
  .bp-1 { transform: translateY(-4px); }
  .bp-2 { transform: translateY(-8px); }
  .dl-0 { transform: translateY(7px);  }
  .dl-1 { transform: translateY(-8px); }
  .dl-2 { transform: translateY(8px);  }
}
`

// Standard standing figure — head at −y, centered at origin
function SF({ cls = '' }) {
  return (
    <g className={`anim ${cls}`}>
      <circle cy="-12" r="5"   fill={YELLOW}/>
      <line x1="0"  y1="-7" x2="0"  y2="8"  stroke={YELLOW} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="-9" y1="-1" x2="9"  y2="-1" stroke={YELLOW} strokeWidth="2"   strokeLinecap="round"/>
      <line x1="0"  y1="8"  x2="-6" y2="19" stroke={YELLOW} strokeWidth="2"   strokeLinecap="round"/>
      <line x1="0"  y1="8"  x2="6"  y2="19" stroke={YELLOW} strokeWidth="2"   strokeLinecap="round"/>
    </g>
  )
}

// Bench presser — wider arms gripping bar
function BF({ cls = '' }) {
  return (
    <g className={`anim ${cls}`}>
      <circle cy="-12" r="5"    fill={YELLOW}/>
      <line x1="0"   y1="-7" x2="0"  y2="8"  stroke={YELLOW} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="-15" y1="-2" x2="15" y2="-2" stroke={YELLOW} strokeWidth="2"   strokeLinecap="round"/>
      <line x1="0"   y1="8"  x2="-6" y2="19" stroke={YELLOW} strokeWidth="2"   strokeLinecap="round"/>
      <line x1="0"   y1="8"  x2="6"  y2="19" stroke={YELLOW} strokeWidth="2"   strokeLinecap="round"/>
    </g>
  )
}

// Band-work figure — arms raised forward
function BWF({ cls = '' }) {
  return (
    <g className={`anim ${cls}`}>
      <circle cy="-12" r="5"   fill={YELLOW}/>
      <line x1="0"   y1="-7" x2="0"   y2="8"  stroke={YELLOW} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="-10" y1="-9" x2="10"  y2="-9" stroke={YELLOW} strokeWidth="2"   strokeLinecap="round"/>
      <line x1="0"   y1="8"  x2="-6"  y2="19" stroke={YELLOW} strokeWidth="2"   strokeLinecap="round"/>
      <line x1="0"   y1="8"  x2="6"   y2="19" stroke={YELLOW} strokeWidth="2"   strokeLinecap="round"/>
    </g>
  )
}

// Foam roller figure — compact with roller shape below
function FRF({ cls = '' }) {
  return (
    <g className={`anim ${cls}`}>
      <circle cy="-4" r="5"   fill={YELLOW}/>
      <line x1="0"   y1="1"  x2="0"  y2="10" stroke={YELLOW} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="-12" y1="6"  x2="12" y2="6"  stroke={YELLOW} strokeWidth="2"   strokeLinecap="round"/>
      <rect x="-9" y="11" width="18" height="6" fill="none" stroke={WHITE} strokeWidth="1.5" rx="3"/>
    </g>
  )
}

// Jogger facing +x — for animateMotion rotate="auto"
function Jogger() {
  return (
    <>
      <circle cx="12" cy="0"  r="5"   fill={YELLOW}/>
      <line x1="8"  y1="0"  x2="-5"  y2="0"  stroke={YELLOW} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="2"  y1="-9" x2="2"   y2="9"  stroke={YELLOW} strokeWidth="2"   strokeLinecap="round"/>
      <line x1="-5" y1="0"  x2="-13" y2="-6" stroke={YELLOW} strokeWidth="2"   strokeLinecap="round"/>
      <line x1="-5" y1="0"  x2="-13" y2="6"  stroke={YELLOW} strokeWidth="2"   strokeLinecap="round"/>
    </>
  )
}

// SMIL transit figure — walks in from entrance, dwells, walks back
function makeTransit(x0, y0, x1, y1, dur = 18) {
  const path    = `${x0},${y0}; ${x0},${y0}; ${x1},${y1}; ${x1},${y1}; ${x0},${y0}; ${x0},${y0}`
  const kt      = '0; 0.04; 0.22; 0.76; 0.93; 1'
  const op      = '0; 0; 1; 1; 1; 0'
  const splines = '0.42 0 0.58 1; 0.42 0 0.58 1; 0 0 1 1; 0.42 0 0.58 1; 0.42 0 0.58 1'
  return { path, opKT: { kt, op, splines }, dur }
}

function Transit({ path, opKT, dur, begin }) {
  return (
    <g>
      <SF/>
      <animateTransform
        attributeName="transform" type="translate"
        values={path} keyTimes={opKT.kt}
        dur={`${dur}s`} begin={begin}
        repeatCount="indefinite"
        calcMode="spline" keySplines={opKT.splines}
      />
      <animate
        attributeName="opacity"
        values={opKT.op} keyTimes={opKT.kt}
        dur={`${dur}s`} begin={begin}
        repeatCount="indefinite"
      />
    </g>
  )
}

// Station coordinates
const RACK_X  = [270, 335, 400, 465, 530]
const BENCH_X = [205, 320, 480, 595]
const DEAD_X  = [210, 335, 465, 590]

export default function WeightRoomGraphic() {
  const trA = makeTransit(400, 478, 280, 300)
  const trB = makeTransit(400, 478, 520, 300)
  const trC = makeTransit(400, 478, 400, 192)

  return (
    <section style={sec}>
      <h2 style={h2s}>THE WEIGHT ROOM IN YOUR POCKET</h2>
      <div style={wrap}>
        <svg
          viewBox="0 0 800 500"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: '100%', display: 'block' }}
          role="img"
          aria-label="Animated top-down weight room view"
        >
          <defs>
            {/* Track midline path for joggers — clockwise oval rx=348,ry=196 */}
            <path id="jog-path" d="M52,255 A348,196 0 0,1 748,255 A348,196 0 0,1 52,255"/>
          </defs>
          <style>{CSS}</style>

          {/* ══ FLOOR ════════════════════════════════════════════════════════ */}
          <rect width="800" height="500" fill="#000"/>

          {/* ══ ORANGE OVAL TRACK — 3 lanes ══════════════════════════════════ */}
          <ellipse cx="400" cy="255" rx="370" ry="218" fill={ORANGE}/>
          <ellipse cx="400" cy="255" rx="325" ry="173" fill="#000"/>
          {/* Lane dividers */}
          <ellipse cx="400" cy="255" rx="354" ry="202"
            fill="none" stroke={WHITE} strokeWidth="1.2" strokeOpacity="0.55"/>
          <ellipse cx="400" cy="255" rx="339" ry="187"
            fill="none" stroke={WHITE} strokeWidth="1.2" strokeOpacity="0.55"/>
          {/* Entrance door gap */}
          <rect x="363" y="466" width="74" height="20" fill="#000"/>

          {/* ══ SUBTLE GRID ══════════════════════════════════════════════════ */}
          {[215,280,345,455,520,585].map(x => (
            <line key={x} x1={x} y1="85" x2={x} y2="425"
              stroke={WHITE} strokeOpacity="0.022" strokeWidth="0.8"/>
          ))}
          {[150,210,255,300,360,420].map(y => (
            <line key={y} x1="82" y1={y} x2="718" y2={y}
              stroke={WHITE} strokeOpacity="0.022" strokeWidth="0.8"/>
          ))}

          {/* ══ SQUAT RACKS — back wall ═══════════════════════════════════════ */}
          {RACK_X.map((x, i) => (
            <g key={i} transform={`translate(${x},100)`}>
              <rect x="-20" y="-13" width="40" height="26"
                fill="#0A1C2C" stroke={BLUE} strokeWidth="1.5" rx="2"/>
              {/* bench inside rack: dark grey default */}
              <rect x="-7" y="-5" width="14" height="10" fill="#222" rx="1"/>
              {/* barbell */}
              <line x1="-33" y1="0" x2="33" y2="0"
                stroke={WHITE} strokeWidth="3" strokeLinecap="round"/>
              {/* plates */}
              <rect x="-40" y="-7" width="7" height="14"
                fill={WHITE} fillOpacity="0.9" rx="1"/>
              <rect x="33"  y="-7" width="7" height="14"
                fill={WHITE} fillOpacity="0.9" rx="1"/>
              {/* knurling */}
              <line x1="-6" y1="-1.5" x2="6" y2="-1.5"
                stroke={WHITE} strokeOpacity="0.3" strokeWidth="1"/>
              <line x1="-6" y1="1.5"  x2="6" y2="1.5"
                stroke={WHITE} strokeOpacity="0.3" strokeWidth="1"/>
            </g>
          ))}

          {/* ══ BENCH PRESS STATIONS ══════════════════════════════════════════ */}
          {BENCH_X.map((x, i) => (
            <g key={i} transform={`translate(${x},255)`}>
              {/* bench pad — long axis vertical */}
              <rect x="-8" y="-24" width="16" height="48"
                fill={BLUE} fillOpacity="0.6" rx="4"/>
              {/* J-cup uprights */}
              <circle cx="-10" cy="-21" r="3.5"
                fill="#0A1C2C" stroke={BLUE} strokeWidth="1"/>
              <circle cx="10"  cy="-21" r="3.5"
                fill="#0A1C2C" stroke={BLUE} strokeWidth="1"/>
              {/* barbell */}
              <line x1="-36" y1="-21" x2="36" y2="-21"
                stroke={WHITE} strokeWidth="3" strokeLinecap="round"/>
              {/* plates */}
              <rect x="-43" y="-28" width="7" height="14"
                fill={WHITE} fillOpacity="0.9" rx="1"/>
              <rect x="36"  y="-28" width="7" height="14"
                fill={WHITE} fillOpacity="0.9" rx="1"/>
            </g>
          ))}

          {/* ══ DEADLIFT PLATFORMS — trap bar hex ════════════════════════════ */}
          {DEAD_X.map((x, i) => (
            <g key={i} transform={`translate(${x},390)`}>
              <rect x="-28" y="-28" width="56" height="56"
                fill="#0A1C2C" stroke={BLUE} strokeWidth="1.5" rx="3" fillOpacity="0.55"/>
              {/* active pulse overlay */}
              <rect x="-26" y="-26" width="52" height="52"
                fill={WHITE} rx="2" className={`anim pp-${i}`} opacity="0"/>
              {/* trap bar hexagon */}
              <polygon
                points="0,-20 17.3,-10 17.3,10 0,20 -17.3,10 -17.3,-10"
                fill="none" stroke={WHITE} strokeWidth="2.5"/>
              {/* floor plates */}
              <circle cx="-24" cy="0" r="5.5" fill={WHITE} fillOpacity="0.75"/>
              <circle cx="24"  cy="0" r="5.5" fill={WHITE} fillOpacity="0.75"/>
            </g>
          ))}

          {/* ══ ENVIRONMENTAL DETAILS (static) ═══════════════════════════════ */}
          {/* Plate storage — left */}
          <g transform="translate(150,168)">
            <circle r="7" fill="none" stroke={WHITE} strokeWidth="1.5" strokeOpacity="0.55"/>
            <circle r="5" fill="none" stroke={WHITE} strokeWidth="1.5" strokeOpacity="0.45"/>
            <circle r="3" fill={WHITE} fillOpacity="0.35"/>
          </g>
          {/* Plate storage — right */}
          <g transform="translate(650,168)">
            <circle r="7" fill="none" stroke={WHITE} strokeWidth="1.5" strokeOpacity="0.55"/>
            <circle r="5" fill="none" stroke={WHITE} strokeWidth="1.5" strokeOpacity="0.45"/>
            <circle r="3" fill={WHITE} fillOpacity="0.35"/>
          </g>
          {/* Medicine balls — left */}
          <circle cx="147" cy="308" r="6" fill={WHITE} fillOpacity="0.5"/>
          <circle cx="160" cy="316" r="5" fill={WHITE} fillOpacity="0.4"/>
          {/* Medicine balls — right */}
          <circle cx="653" cy="308" r="6" fill={WHITE} fillOpacity="0.5"/>
          <circle cx="640" cy="316" r="5" fill={WHITE} fillOpacity="0.4"/>
          {/* Water station — left side */}
          <rect x="132" y="242" width="14" height="18"
            fill={BLUE} fillOpacity="0.5" rx="2"/>
          {/* Foam rollers — lower sides */}
          <rect x="160" y="368" width="19" height="7"
            fill={WHITE} fillOpacity="0.4" rx="3.5"/>
          <rect x="621" y="368" width="19" height="7"
            fill={WHITE} fillOpacity="0.4" rx="3.5"/>

          {/* ══ SQUATTERS ════════════════════════════════════════════════════ */}
          {RACK_X.map((x, i) => (
            <g key={i} transform={`translate(${x},116)`}
               className={i >= 3 ? 'hide-mobile' : ''}>
              <SF cls={`sq-${i}`}/>
            </g>
          ))}

          {/* ══ BENCH PRESSERS ═══════════════════════════════════════════════ */}
          {BENCH_X.map((x, i) => (
            <g key={i} transform={`translate(${x},258)`}
               className={i >= 3 ? 'hide-mobile' : ''}>
              <BF cls={`bp-${i}`}/>
            </g>
          ))}

          {/* ══ DEADLIFTERS ══════════════════════════════════════════════════ */}
          {DEAD_X.map((x, i) => (
            <g key={i} transform={`translate(${x},383)`}
               className={i >= 3 ? 'hide-mobile' : ''}>
              <SF cls={`dl-${i}`}/>
            </g>
          ))}

          {/* ══ BAND WORK — sides (hide-mobile) ══════════════════════════════ */}
          <g transform="translate(153,214)" className="hide-mobile">
            <BWF cls="bw-0"/>
          </g>
          <g transform="translate(647,214)" className="hide-mobile">
            <BWF cls="bw-1"/>
          </g>

          {/* ══ FOAM ROLLING (hide-mobile) ═══════════════════════════════════ */}
          <g transform="translate(182,376)" className="hide-mobile">
            <FRF cls="fr-0"/>
          </g>
          <g transform="translate(618,376)" className="hide-mobile">
            <FRF cls="fr-1"/>
          </g>

          {/* ══ CELEBRATION FIGURES — every ~12–14s raise arms (hide-mobile) ═ */}
          <g transform="translate(310,200)" className="hide-mobile">
            <SF cls="cel-0"/>
          </g>
          <g transform="translate(490,200)" className="hide-mobile">
            <SF cls="cel-1"/>
          </g>

          {/* ══ JOGGERS on oval track — SMIL animateMotion (hide-mobile) ═════ */}
          {[0, 2.75, 5.5, 8.25].map((off, i) => (
            <g key={i} className="hide-mobile">
              <Jogger/>
              <animateMotion
                dur="11s"
                begin={`-${off}s`}
                repeatCount="indefinite"
                rotate="auto"
              >
                <mpath href="#jog-path"/>
              </animateMotion>
            </g>
          ))}

          {/* ══ TRANSIT / ARRIVAL FIGURES — SMIL (hide-mobile) ══════════════ */}
          <g className="hide-mobile"><Transit {...trA} begin="0s"/></g>
          <g className="hide-mobile"><Transit {...trB} begin="-6s"/></g>
          <g className="hide-mobile"><Transit {...trC} begin="-12s"/></g>

          {/* ══ ENTRANCE INDICATOR ═══════════════════════════════════════════ */}
          <text x="400" y="494" textAnchor="middle"
            fill={ORANGE} fillOpacity="0.38"
            fontSize="8" fontFamily="Inter,sans-serif" letterSpacing="3">ENTRANCE</text>
          <line x1="394" y1="479" x2="400" y2="486"
            stroke={ORANGE} strokeOpacity="0.38" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="406" y1="479" x2="400" y2="486"
            stroke={ORANGE} strokeOpacity="0.38" strokeWidth="1.5" strokeLinecap="round"/>

        </svg>
      </div>
      <p style={ps}>offseaz.com — the weight room that never closes.</p>
    </section>
  )
}

const sec = {
  background: '#000',
  padding: 'clamp(52px,8vw,88px) clamp(16px,4vw,40px) clamp(44px,6vw,68px)',
  textAlign: 'center',
  borderBottom: '1px solid rgba(255,255,255,0.07)',
}
const h2s = {
  margin: '0 0 clamp(28px,4vw,48px)',
  fontSize: 'clamp(20px,3.5vw,36px)',
  fontWeight: 700,
  color: '#FFF',
  fontFamily: 'Calibri, "Gill Sans MT", system-ui, sans-serif',
  letterSpacing: '0.08em',
  lineHeight: 1.1,
  textTransform: 'uppercase',
}
const wrap = {
  maxWidth: 900,
  margin: '0 auto',
  width: '100%',
  borderRadius: 12,
  overflow: 'hidden',
  border: '1px solid rgba(247,87,9,0.18)',
  boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 24px 64px rgba(0,0,0,0.85)',
}
const ps = {
  margin: 'clamp(18px,3vw,32px) 0 0',
  fontSize: 12,
  color: 'rgba(255,255,255,0.3)',
  letterSpacing: '0.05em',
  fontFamily: 'Inter, sans-serif',
}
