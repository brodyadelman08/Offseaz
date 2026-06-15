const ORANGE = '#F75709'
const BLUE   = '#308EBD'
const YELLOW = '#F0BE24'
const FLOOR  = '#0D0D0D'

// CSS: keyframes + animation classes for station lifters and warm-up.
// transform-box + transform-origin ensure translateY works correctly on SVG <g> elements.
const CSS = `
.fig { transform-box: fill-box; transform-origin: center; }

@keyframes squat {
  0%,18%,82%,100% { transform: translateY(0px); }
  45%,55%         { transform: translateY(6px);  }
}
@keyframes bench {
  0%,100%   { transform: translateY(0px);  }
  40%,60%   { transform: translateY(-7px); }
}
@keyframes deadlift {
  0%,12%,75%,100% { transform: translateY(0px);  }
  32%,42%         { transform: translateY(8px);   }
  58%             { transform: translateY(-2px);  }
}
@keyframes powerclean {
  0%,8%,60%,100% { transform: translateY(0px);   }
  20%            { transform: translateY(8px);    }
  32%            { transform: translateY(-10px);  }
  48%,55%        { transform: translateY(0px);    }
}
@keyframes warmup-bob {
  0%,100% { transform: translateY(0px); }
  50%     { transform: translateY(5px); }
}
@keyframes warmup-wave {
  0%,100% { transform: translateY(0px) scaleX(1);    }
  50%     { transform: translateY(2px) scaleX(1.2);  }
}

.sq-0 { animation: squat      2.2s ease-in-out infinite 0s;     }
.sq-1 { animation: squat      2.3s ease-in-out infinite 0.45s;  }
.sq-2 { animation: squat      2.1s ease-in-out infinite 0.9s;   }
.sq-3 { animation: squat      2.4s ease-in-out infinite 1.35s;  }
.sq-4 { animation: squat      2.2s ease-in-out infinite 1.8s;   }

.bp-0 { animation: bench      2.5s ease-in-out infinite 0s;     }
.bp-1 { animation: bench      2.6s ease-in-out infinite 0.6s;   }
.bp-2 { animation: bench      2.4s ease-in-out infinite 1.2s;   }
.bp-3 { animation: bench      2.5s ease-in-out infinite 1.8s;   }

.dl-0 { animation: deadlift   3.2s ease-in-out infinite 0s;     }
.dl-1 { animation: powerclean 2.8s ease-in-out infinite 0.7s;   }
.dl-2 { animation: deadlift   3.1s ease-in-out infinite 1.4s;   }
.dl-3 { animation: powerclean 2.9s ease-in-out infinite 2.1s;   }

.wu-0 { animation: warmup-bob  1.6s ease-in-out infinite 0s;    }
.wu-1 { animation: warmup-wave 1.5s ease-in-out infinite 0.35s; }
.wu-2 { animation: warmup-bob  1.7s ease-in-out infinite 0.7s;  }

@media (max-width: 767px) { .hide-mobile { display: none; } }
`

// Standing stick figure — head at top (−y), used for squatters, deadlifters, warm-up, transit
function SF({ cls = '' }) {
  return (
    <g className={`fig ${cls}`}>
      <circle cy="-4" r="4.5" fill={YELLOW}/>
      <line x1="0"  y1="0.5" x2="0"  y2="12"  stroke={YELLOW} strokeWidth="2.2" strokeLinecap="round"/>
      <line x1="-8" y1="5.5" x2="8"  y2="5.5"  stroke={YELLOW} strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="0"  y1="12"  x2="-6" y2="21"   stroke={YELLOW} strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="0"  y1="12"  x2="6"  y2="21"   stroke={YELLOW} strokeWidth="1.8" strokeLinecap="round"/>
    </g>
  )
}

// Bench-presser — lying along y-axis, head at −y, arms spread wide gripping bar
function BF({ cls = '' }) {
  return (
    <g className={`fig ${cls}`}>
      <circle cy="-13" r="4.5" fill={YELLOW}/>
      <line x1="0"   y1="-8" x2="0"  y2="6"  stroke={YELLOW} strokeWidth="2.2" strokeLinecap="round"/>
      <line x1="-14" y1="-1" x2="14" y2="-1" stroke={YELLOW} strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="0"   y1="6"  x2="-6" y2="15" stroke={YELLOW} strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="0"   y1="6"  x2="6"  y2="15" stroke={YELLOW} strokeWidth="1.8" strokeLinecap="round"/>
    </g>
  )
}

const SQUAT_X = [185, 265, 345, 425, 505]
const BENCH_X = [200, 315, 485, 600]
const DEAD_X  = [210, 330, 470, 590]

// Transit figure using SMIL animateTransform — avoids CSS/SVG coordinate-system mismatch.
// All positions are SVG user units (viewBox coords). opacity animated separately.
function Transit({ path, opKT, dur, begin }) {
  return (
    <g>
      <SF/>
      <animateTransform
        attributeName="transform"
        type="translate"
        values={path}
        keyTimes={opKT.kt}
        dur={`${dur}s`}
        begin={begin}
        repeatCount="indefinite"
        calcMode="spline"
        keySplines={opKT.splines}
      />
      <animate
        attributeName="opacity"
        values={opKT.op}
        keyTimes={opKT.kt}
        dur={`${dur}s`}
        begin={begin}
        repeatCount="indefinite"
      />
    </g>
  )
}

function makeTransit(x0, y0, x1, y1, dur = 16) {
  // phases: hidden → walk in → dwell → walk out → hidden
  const pos = `${x0},${y0}; ${x0},${y0}; ${x1},${y1}; ${x1},${y1}; ${x0},${y0}; ${x0},${y0}`
  const kt   = '0; 0.04; 0.20; 0.76; 0.93; 1'
  const op   = '0; 0; 1; 1; 1; 0'
  const splines = '0.42 0 0.58 1; 0.42 0 0.58 1; 0 0 1 1; 0.42 0 0.58 1; 0.42 0 0.58 1'
  return { path: pos, opKT: { kt, op, splines }, dur }
}

export default function WeightRoomGraphic() {
  const trA = makeTransit(400, 455, 280, 282)
  const trB = makeTransit(400, 455, 520, 282)
  const trC = makeTransit(400, 455, 400, 182)

  return (
    <section style={sec}>
      <h2 style={h2s}>The Weight Room in Your Pocket</h2>
      <div style={wrap}>
        <svg
          viewBox="0 0 800 500"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: '100%', display: 'block' }}
          aria-label="Animated top-down weight room view"
          role="img"
        >
          <defs>
            {/* Oval path for joggers (SMIL animateMotion) — clockwise full ellipse */}
            <path id="jog-path" d="M58,260 A342,192 0 0,1 742,260 A342,192 0 0,1 58,260"/>
          </defs>

          <style>{CSS}</style>

          {/* ── Floor + track surface ─────────────────────────────────────── */}
          <rect width="800" height="500" fill={FLOOR}/>
          <ellipse cx="400" cy="260" rx="350" ry="200" fill="#101010"/>
          <ellipse cx="400" cy="260" rx="335" ry="185" fill="#111111"/>

          {/* Orange track ring */}
          <ellipse cx="400" cy="260" rx="342" ry="192"
            fill="none" stroke={ORANGE} strokeWidth="11" strokeOpacity="0.88"/>
          {/* Entrance gap — masks the orange ring at the bottom */}
          <rect x="367" y="444" width="66" height="22" fill={FLOOR}/>

          {/* Subtle grid lines on inner floor */}
          {[200, 280, 360, 440, 520, 600].map(x => (
            <line key={x} x1={x} y1="82" x2={x} y2="438"
              stroke="#fff" strokeOpacity="0.025" strokeWidth="1"/>
          ))}
          {[160, 220, 260, 300, 360].map(y => (
            <line key={y} x1="70" y1={y} x2="730" y2={y}
              stroke="#fff" strokeOpacity="0.025" strokeWidth="1"/>
          ))}

          {/* ══ SQUAT RACKS — back wall (y ≈ 85) ══════════════════════════ */}
          {SQUAT_X.map((x, i) => (
            <g key={i} transform={`translate(${x},85)`}>
              {/* rack frame */}
              <rect x="-19" y="-12" width="38" height="24"
                fill="#0A1E2C" stroke={BLUE} strokeWidth="1.2" rx="2"/>
              {/* bench inside rack — dark grey default (figures are squatting, not pressing) */}
              <rect x="-6" y="-4" width="12" height="8" fill="#333" rx="1"/>
              {/* barbell */}
              <line x1="-30" y1="0" x2="30" y2="0"
                stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
              {/* plates */}
              <rect x="-36" y="-6" width="6" height="12" fill="#fff" fillOpacity="0.85" rx="1"/>
              <rect x="30"  y="-6" width="6" height="12" fill="#fff" fillOpacity="0.85" rx="1"/>
              {/* knurling marks */}
              <line x1="-5" y1="-1.5" x2="5" y2="-1.5"
                stroke="#fff" strokeOpacity="0.25" strokeWidth="1"/>
              <line x1="-5" y1="1.5"  x2="5" y2="1.5"
                stroke="#fff" strokeOpacity="0.25" strokeWidth="1"/>
            </g>
          ))}

          {/* ══ BENCH PRESS STATIONS — middle (y ≈ 238) ═══════════════════ */}
          {BENCH_X.map((x, i) => (
            <g key={i} transform={`translate(${x},238)`}>
              {/* bench pad — long axis in y (figure lies along it) */}
              <rect x="-7" y="-21" width="14" height="42"
                fill={BLUE} fillOpacity="0.65" rx="4"/>
              {/* upright cups */}
              <circle cx="-9" cy="-18" r="3" fill="#0A1E2C" stroke={BLUE} strokeWidth="1"/>
              <circle cx="9"  cy="-18" r="3" fill="#0A1E2C" stroke={BLUE} strokeWidth="1"/>
              {/* barbell */}
              <line x1="-32" y1="-18" x2="32" y2="-18"
                stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
              {/* plates */}
              <rect x="-38" y="-24" width="6" height="12" fill="#fff" fillOpacity="0.82" rx="1"/>
              <rect x="32"  y="-24" width="6" height="12" fill="#fff" fillOpacity="0.82" rx="1"/>
            </g>
          ))}

          {/* ══ DEADLIFT PLATFORMS — front (y ≈ 388) ═══════════════════════
              Trap bar = white hexagon outline around the figure            */}
          {DEAD_X.map((x, i) => (
            <g key={i} transform={`translate(${x},388)`}>
              {/* platform */}
              <rect x="-26" y="-26" width="52" height="52"
                fill="#0A1E2C" stroke={BLUE} strokeWidth="1.5" rx="3" fillOpacity="0.55"/>
              {/* rubber surface texture hint */}
              <rect x="-23" y="-23" width="46" height="46"
                fill="none" stroke="#fff" strokeOpacity="0.05" strokeWidth="0.5" rx="2"/>
              {/* trap bar hexagon */}
              <polygon
                points="0,-19 16.5,-9.5 16.5,9.5 0,19 -16.5,9.5 -16.5,-9.5"
                fill="none" stroke="#fff" strokeWidth="2.5" strokeOpacity="0.9"/>
              {/* center grip */}
              <line x1="-5" y1="0" x2="5" y2="0"
                stroke="#fff" strokeWidth="2" strokeOpacity="0.4"/>
              {/* floor plates */}
              <circle cx="-22" cy="0" r="5" fill="#fff" fillOpacity="0.7"/>
              <circle cx="22"  cy="0" r="5" fill="#fff" fillOpacity="0.7"/>
            </g>
          ))}

          {/* ══ SQUATTERS at racks (y ≈ 112) ══════════════════════════════ */}
          {SQUAT_X.map((x, i) => (
            <g key={i} transform={`translate(${x},112)`}
               className={i >= 3 ? 'hide-mobile' : ''}>
              <SF cls={`sq-${i}`}/>
            </g>
          ))}

          {/* ══ BENCH PRESSERS (y ≈ 250) ══════════════════════════════════ */}
          {BENCH_X.map((x, i) => (
            <g key={i} transform={`translate(${x},250)`}
               className={i >= 3 ? 'hide-mobile' : ''}>
              <BF cls={`bp-${i}`}/>
            </g>
          ))}

          {/* ══ DEADLIFTERS (y ≈ 362) ═════════════════════════════════════ */}
          {DEAD_X.map((x, i) => (
            <g key={i} transform={`translate(${x},362)`}
               className={i >= 3 ? 'hide-mobile' : ''}>
              <SF cls={`dl-${i}`}/>
            </g>
          ))}

          {/* ══ WARM-UP FIGURES — side lanes (hidden on mobile) ═══════════ */}
          <g transform="translate(140,185)" className="hide-mobile">
            <SF cls="wu-0"/>
          </g>
          <g transform="translate(660,185)" className="hide-mobile">
            <SF cls="wu-1"/>
          </g>
          <g transform="translate(140,335)" className="hide-mobile">
            <SF cls="wu-2"/>
          </g>

          {/* ══ JOGGERS on oval track (SMIL animateMotion, rotate=auto) ═══ */}
          {/* 4 on desktop, 2 on mobile */}
          {[0, 2.5, 5, 7.5].map((off, i) => (
            <g key={i} className={i >= 2 ? 'hide-mobile' : ''}>
              {/* Jogger faces +x so rotate="auto" orients head toward direction of travel */}
              <circle cx="13" cy="0" r="4.5" fill={YELLOW}/>
              <line x1="9"  y1="0" x2="-4"  y2="0"   stroke={YELLOW} strokeWidth="2.2" strokeLinecap="round"/>
              <line x1="3"  y1="-9" x2="3"  y2="9"   stroke={YELLOW} strokeWidth="1.8" strokeLinecap="round"/>
              <line x1="-4" y1="0" x2="-12" y2="-6.5" stroke={YELLOW} strokeWidth="1.8" strokeLinecap="round"/>
              <line x1="-4" y1="0" x2="-12" y2="6.5"  stroke={YELLOW} strokeWidth="1.8" strokeLinecap="round"/>
              <animateMotion
                dur="10s"
                begin={`-${off}s`}
                repeatCount="indefinite"
                rotate="auto"
              >
                <mpath href="#jog-path"/>
              </animateMotion>
            </g>
          ))}

          {/* ══ TRANSIT / ARRIVAL FIGURES (SMIL animateTransform) ═════════
              Uses SVG user units for position — no CSS/px coordinate mismatch.
              3 figures appear from entrance, walk to mid-room, dwell, return. */}
          <Transit {...trA} begin="0s"/>
          <Transit {...trB} begin="-5.3s"/>
          <g className="hide-mobile">
            <Transit {...trC} begin="-10.6s"/>
          </g>

          {/* ══ ENTRANCE indicator ════════════════════════════════════════ */}
          <text x="400" y="492" textAnchor="middle"
            fill={ORANGE} fillOpacity="0.35"
            fontSize="8" fontFamily="Inter,sans-serif" letterSpacing="3">ENTRANCE</text>
          <line x1="395" y1="477" x2="400" y2="484"
            stroke={ORANGE} strokeOpacity="0.35" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="405" y1="477" x2="400" y2="484"
            stroke={ORANGE} strokeOpacity="0.35" strokeWidth="1.5" strokeLinecap="round"/>

        </svg>
      </div>
      <p style={ps}>offseaz.com — the weight room that never closes</p>
    </section>
  )
}

const sec = {
  background: '#0A0A0A',
  padding: 'clamp(48px,8vw,80px) clamp(16px,4vw,40px) clamp(40px,6vw,64px)',
  textAlign: 'center',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
}
const h2s = {
  margin: '0 0 clamp(24px,4vw,40px)',
  fontSize: 'clamp(24px,4.5vw,40px)',
  fontWeight: 800,
  color: '#FFFFFF',
  fontFamily: 'Calibri, "Gill Sans MT", system-ui, sans-serif',
  letterSpacing: '-0.5px',
  lineHeight: 1.2,
}
const wrap = {
  maxWidth: 880,
  margin: '0 auto',
  width: '100%',
  borderRadius: 16,
  overflow: 'hidden',
  border: '1px solid rgba(255,255,255,0.06)',
  boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
}
const ps = {
  margin: 'clamp(16px,3vw,28px) 0 0',
  fontSize: 12,
  color: 'rgba(255,255,255,0.3)',
  letterSpacing: '0.5px',
  fontFamily: 'Inter, sans-serif',
}
