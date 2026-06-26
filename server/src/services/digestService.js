'use strict'
const { Resend } = require('resend')
const supabaseAdmin = require('../config/supabase')
const { computeStreakDays } = require('./streakService')

// ─── Brand colours ────────────────────────────────────────────────────────────
const ORANGE = '#F75709'
const BLUE   = '#308EBD'
const YELLOW = '#F0BE24'
const BLACK  = '#0A0A0A'

// ─── Sport emoji map ──────────────────────────────────────────────────────────
const SPORT_EMOJI = {
  'baseball':      '⚾',
  'softball':      '🥎',
  'football':      '🏈',
  'basketball':    '🏀',
  'soccer':        '⚽',
  'hockey':        '🏒',
  'wrestling':     '🤼',
  'volleyball':    '🏐',
  'track':         '🏃',
  'cross country': '🌲',
  'lacrosse':      '🥍',
  'swimming':      '🏊',
  'rugby':         '🏉',
  'tennis':        '🎾',
  'golf':          '⛳',
}
const DEFAULT_EMOJI = '🏋️'
function sportEmoji(sport) {
  if (!sport) return DEFAULT_EMOJI
  return SPORT_EMOJI[sport.toLowerCase().trim()] || DEFAULT_EMOJI
}

// ─── Lift labels ──────────────────────────────────────────────────────────────
const LIFT_LABELS = {
  bench_press:        'Bench Press',
  squat:              'Squat',
  deadlift:           'Deadlift',
  trap_bar_deadlift:  'Trap Bar Deadlift',
  power_clean:        'Power Clean',
  overhead_press:     'Overhead Press',
  hang_clean:         'Hang Clean',
  clean:              'Clean',
  front_squat:        'Front Squat',
  romanian_deadlift:  'Romanian Deadlift',
  reverse_lunge:      'Reverse Lunge',
}
function liftLabel(lift) {
  return LIFT_LABELS[lift] || lift.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// ─── Week window helpers ──────────────────────────────────────────────────────
const fmtDate = d =>
  d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

function getThisMonday() {
  const now = new Date()
  const dow = now.getUTCDay()
  const mon = new Date(now)
  mon.setUTCHours(0, 0, 0, 0)
  mon.setUTCDate(now.getUTCDate() - (dow === 0 ? 6 : dow - 1))
  return mon
}

function getPreviousWeekRange() {
  const thisMon = getThisMonday()
  const prevMon = new Date(thisMon)
  prevMon.setUTCDate(thisMon.getUTCDate() - 7)
  const prevSun = new Date(thisMon.getTime() - 1)
  return {
    start:         prevMon,
    end:           prevSun,
    label:         `${fmtDate(prevMon)} – ${fmtDate(prevSun)}`,
    weekStartDate: prevMon.toISOString().split('T')[0],
  }
}

function getCurrentWeekRange() {
  const thisMon = getThisMonday()
  const now     = new Date()
  return {
    start:         thisMon,
    end:           now,
    label:         `${fmtDate(thisMon)} – ${fmtDate(now)} (test)`,
    weekStartDate: thisMon.toISOString().split('T')[0],
  }
}

// ─── Streak computation (mirrors accountabilityService.js) ────────────────────
function getMondayKey(dateStr) {
  const d = new Date(dateStr)
  const dow = d.getUTCDay()
  d.setUTCDate(d.getUTCDate() - (dow === 0 ? 6 : dow - 1))
  d.setUTCHours(0, 0, 0, 0)
  return d.toISOString().split('T')[0]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function esc(s) {
  if (s == null) return ''
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function getSuggestedAction(a) {
  if (a.daysSince === null)                            return "Send a welcome message — they haven't logged a session yet"
  if (a.sessionsThisWeek === 0 && a.daysSince > 14)   return "Check in — it's been over 2 weeks since their last session"
  if (a.sessionsThisWeek === 0 && a.daysSince > 6)    return "Reach out — they missed all of last week"
  if (a.sessionsThisWeek === 0)                        return "Follow up — active recently but haven't logged this week"
  return "Encourage — below the 50% completion target this week"
}

function daysSinceText(d) {
  if (d === null)  return 'Never logged'
  if (d === 0)     return 'Last active today'
  if (d === 1)     return 'Last active yesterday'
  return `Last active ${d}d ago`
}

// ─── Stat computation ─────────────────────────────────────────────────────────
function computeDigestStats({ athletes, weekLogs, allLogs, surveyMap, injuryLogs, weekMaxes, allMaxes }) {
  const athleteMap = {}

  const athleteData = athletes.map(a => {
    const survey       = surveyMap[a.id] || {}
    const aWeekActive  = weekLogs.filter(l => l.athlete_id === a.id && l.status !== 'skipped' && l.status !== 'skipped_injury')
    const aAllLogs     = allLogs.filter(l => l.athlete_id === a.id)
    const lastLog      = [...aAllLogs].sort((x, y) => new Date(y.logged_at) - new Date(x.logged_at))[0]

    const sessionsThisWeek = aWeekActive.length
    const streak           = computeStreakDays(aAllLogs)
    const lastAt           = lastLog?.logged_at || null
    const daySince         = lastAt ? Math.floor((Date.now() - new Date(lastAt).getTime()) / 86400000) : null
    const completionRate   = Math.min(Math.round(sessionsThisWeek / 7 * 100), 100)
    const status           = completionRate >= 80 ? 'on_track' : completionRate >= 50 ? 'building' : 'at_risk'
    const emoji            = sportEmoji(survey.sport)

    const athlete = {
      id: a.id,
      full_name:       a.full_name,
      sport:           survey.sport    || null,
      position:        survey.position || null,
      emoji,
      sessionsThisWeek,
      streak,
      daysSince:       daySince,
      completionRate,
      status,
    }
    athleteMap[a.id] = athlete
    return athlete
  })

  // ── Section 1: Team Overview ──
  const withSessions  = athleteData.filter(a => a.sessionsThisWeek > 0)
  const totalSessions = withSessions.reduce((s, a) => s + a.sessionsThisWeek, 0)
  const completionRate = athletes.length ? Math.round(withSessions.length / athletes.length * 100) : 0
  const activeStreaks  = athleteData.filter(a => a.streak > 0).length
  const hasActivity   = totalSessions > 0

  // ── Section 2: Athlete of the Week ──
  let topPerformer = null
  if (withSessions.length) {
    const sorted = [...withSessions].sort((a, b) =>
      b.completionRate !== a.completionRate
        ? b.completionRate - a.completionRate
        : b.streak - a.streak
    )
    topPerformer = sorted[0]
  }

  // ── Section 3: Full Roster Breakdown ──
  const statusOrder    = { on_track: 0, building: 1, at_risk: 2 }
  const rosterBreakdown = [...athleteData].sort((a, b) =>
    statusOrder[a.status] !== statusOrder[b.status]
      ? statusOrder[a.status] - statusOrder[b.status]
      : (a.full_name || '').localeCompare(b.full_name || '')
  )

  // ── Section 4: Athletes Who Need Attention (< 50% completion) ──
  const needsAttention = athleteData
    .filter(a => a.completionRate < 50)
    .sort((a, b) => {
      if (a.daysSince === null && b.daysSince !== null) return 1
      if (b.daysSince === null && a.daysSince !== null) return -1
      return (b.daysSince ?? 0) - (a.daysSince ?? 0)
    })
    .map(a => ({ ...a, suggestedAction: getSuggestedAction(a) }))

  // ── Section 5: Top 5 Streaks ──
  const streakLeaders = [...athleteData]
    .filter(a => a.streak > 0)
    .sort((a, b) => b.streak - a.streak)
    .slice(0, 5)

  // ── Section 6: Injury Flags — skipped_injury logs this week ──
  const injuryFlags = injuryLogs
    .sort((a, b) => new Date(a.logged_at) - new Date(b.logged_at))
    .map(l => ({
      full_name: athleteMap[l.athlete_id]?.full_name || 'Unknown',
      emoji:     athleteMap[l.athlete_id]?.emoji     || DEFAULT_EMOJI,
      logged_at: l.logged_at,
      note:      l.note,
    }))

  // ── Section 6b: Athletes with survey-reported injury areas ──
  const skippedInjuryIds = new Set(injuryLogs.map(l => l.athlete_id))
  const surveyInjuries = athleteData
    .map(a => {
      const survey = surveyMap[a.id] || {}
      const areas  = (survey.injury_areas || []).filter(x => x && x !== 'None')
      if (!areas.length) return null
      return {
        full_name:         a.full_name,
        emoji:             a.emoji,
        injury_areas:      areas,
        injury_other:      survey.injury_other || null,
        sessionsThisWeek:  a.sessionsThisWeek,
        alsoSkippedInjury: skippedInjuryIds.has(a.id),
      }
    })
    .filter(Boolean)
    .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''))

  // Unique athletes with any injury concern (skipped_injury log OR survey areas)
  const injuryCount = new Set([
    ...injuryLogs.map(l => l.athlete_id),
    ...athleteData.filter(a => (surveyMap[a.id]?.injury_areas || []).some(x => x && x !== 'None')).map(a => a.id),
  ]).size

  // ── Section 7: Weekly Wins (new PRs this week) ──
  const weeklyPRs = []
  const prSeen    = new Set()
  const sortedWeekMaxes = [...(weekMaxes || [])].sort((a, b) => b.weight_lbs - a.weight_lbs)
  for (const entry of sortedWeekMaxes) {
    const key      = `${entry.athlete_id}:${entry.lift}`
    if (prSeen.has(key)) continue
    const prevBest = (allMaxes || [])
      .filter(m => m.athlete_id === entry.athlete_id && m.lift === entry.lift && new Date(m.logged_at) < new Date(entry.logged_at))
      .reduce((mx, m) => Math.max(mx, Number(m.weight_lbs)), 0)
    if (Number(entry.weight_lbs) > prevBest) {
      prSeen.add(key)
      const ath = athleteMap[entry.athlete_id]
      weeklyPRs.push({
        full_name:  ath?.full_name || 'Athlete',
        emoji:      ath?.emoji     || DEFAULT_EMOJI,
        lift:       liftLabel(entry.lift),
        weight_lbs: entry.weight_lbs,
        is_first:   prevBest === 0,
      })
    }
  }

  return {
    totalSessions, completionRate, activeStreaks, injuryCount, hasActivity,
    topPerformer, rosterBreakdown, needsAttention, streakLeaders, injuryFlags, surveyInjuries, weeklyPRs,
  }
}

// ─── Email HTML ───────────────────────────────────────────────────────────────
function buildDigestHtml({ coachName, isAssistant, teamName, weekLabel, stats, inviteCode }) {
  const BORDER    = '#E5E5E5'
  const BG        = '#F8F8F8'
  const GREEN     = '#16A34A'
  const GREEN_BG  = '#DCFCE7'
  const AMBER     = '#92400E'
  const AMBER_BG  = '#FEF9C3'
  const RED       = '#DC2626'
  const RED_BG    = '#FEE2E2'

  const {
    totalSessions, completionRate, activeStreaks, injuryCount, hasActivity,
    topPerformer, rosterBreakdown, needsAttention, streakLeaders, injuryFlags, surveyInjuries, weeklyPRs,
  } = stats

  // ── Shared components ──────────────────────────────────────────────────────

  function sectionHeader(label, color) {
    return `<p style="margin:0 0 12px;font-size:10px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:1.4px;">${label}</p>`
  }

  function statCard(value, label, accent) {
    return `<td width="50%" style="padding:6px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:10px;overflow:hidden;border:1px solid ${BORDER};">
        <tr><td style="background:#FFFFFF;border-top:3px solid ${accent};padding:16px 16px 14px;">
          <p style="margin:0;font-size:30px;font-weight:900;color:${BLACK};letter-spacing:-1.5px;line-height:1;">${esc(String(value))}</p>
          <p style="margin:7px 0 0;font-size:10px;font-weight:700;color:#999999;text-transform:uppercase;letter-spacing:0.9px;">${label}</p>
        </td></tr>
      </table>
    </td>`
  }

  function statusBadge(status) {
    const cfg = {
      on_track: { label: '✓ On Track', bg: GREEN_BG,  color: GREEN },
      building:  { label: '▲ Building', bg: AMBER_BG,  color: AMBER },
      at_risk:   { label: '⚠ At Risk',  bg: RED_BG,    color: RED   },
    }[status] || { label: status, bg: BG, color: '#888' }
    return `<span style="display:inline-block;font-size:10px;font-weight:700;color:${cfg.color};background:${cfg.bg};border-radius:4px;padding:3px 8px;white-space:nowrap;">${cfg.label}</span>`
  }

  // ── Section 2: Athlete of the Week ──────────────────────────────────────────
  const topPerformerHtml = topPerformer ? `
    <tr><td style="padding:0 24px 20px;">
      ${sectionHeader('⭐ Athlete of the Week', BLUE)}
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;overflow:hidden;">
        <tr><td style="padding:20px 24px;">
          <p style="margin:0 0 3px;font-size:20px;font-weight:800;color:${BLACK};">${esc(topPerformer.emoji)} ${esc(topPerformer.full_name)}</p>
          <p style="margin:0 0 16px;font-size:13px;color:#555555;">${
            [topPerformer.sport, topPerformer.position].filter(Boolean).map(esc).join(' &middot; ') || '&nbsp;'
          }</p>
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding-right:32px;">
                <p style="margin:0;font-size:28px;font-weight:900;color:${ORANGE};letter-spacing:-1px;">${topPerformer.completionRate}%</p>
                <p style="margin:3px 0 0;font-size:10px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.8px;">Completion Rate</p>
              </td>
              <td>
                <p style="margin:0;font-size:28px;font-weight:900;color:${BLUE};letter-spacing:-1px;">${topPerformer.streak}<span style="font-size:15px;font-weight:600;"> d</span></p>
                <p style="margin:3px 0 0;font-size:10px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.8px;">Streak</p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </td></tr>` : ''

  // ── Section 3: Full Roster Breakdown ────────────────────────────────────────
  const rosterRows = rosterBreakdown.map((a, i) => `
    <tr style="background:${i % 2 === 0 ? '#FFFFFF' : BG};">
      <td style="padding:10px 14px;font-size:13px;font-weight:600;color:${BLACK};">${esc(a.emoji)} ${esc(a.full_name)}</td>
      <td style="padding:10px 14px;font-size:13px;color:#555555;text-align:center;">${a.sessionsThisWeek}</td>
      <td style="padding:10px 14px;font-size:13px;font-weight:700;color:${a.completionRate >= 80 ? GREEN : a.completionRate >= 50 ? AMBER : RED};text-align:center;">${a.completionRate}%</td>
      <td style="padding:10px 14px;font-size:13px;font-weight:700;color:${YELLOW};text-align:center;">${a.streak > 0 ? `${a.streak}d` : '—'}</td>
      <td style="padding:10px 14px;text-align:center;">${statusBadge(a.status)}</td>
    </tr>`).join('')

  const rosterHtml = `
    <tr><td style="padding:0 24px 20px;">
      ${sectionHeader('📋 Full Roster Breakdown', '#888888')}
      <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:10px;overflow:hidden;border:1px solid ${BORDER};">
        <thead>
          <tr style="background:${BLACK};">
            <th style="padding:9px 14px;font-size:10px;font-weight:700;color:#888888;text-align:left;text-transform:uppercase;letter-spacing:0.8px;">Athlete</th>
            <th style="padding:9px 14px;font-size:10px;font-weight:700;color:#888888;text-align:center;text-transform:uppercase;letter-spacing:0.8px;">Sessions</th>
            <th style="padding:9px 14px;font-size:10px;font-weight:700;color:#888888;text-align:center;text-transform:uppercase;letter-spacing:0.8px;">Rate</th>
            <th style="padding:9px 14px;font-size:10px;font-weight:700;color:${YELLOW};text-align:center;text-transform:uppercase;letter-spacing:0.8px;">Streak</th>
            <th style="padding:9px 14px;font-size:10px;font-weight:700;color:#888888;text-align:center;text-transform:uppercase;letter-spacing:0.8px;">Status</th>
          </tr>
        </thead>
        <tbody>${rosterRows}</tbody>
      </table>
    </td></tr>`

  // ── Section 4: Athletes Who Need Attention ───────────────────────────────────
  const attentionHtml = needsAttention.length ? `
    <tr><td style="padding:0 24px 20px;">
      ${sectionHeader('🚨 Athletes Who Need Attention', RED)}
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFF5F5;border:1px solid #FECACA;border-radius:10px;overflow:hidden;">
        <tbody>${needsAttention.map(a => `
          <tr>
            <td style="padding:13px 18px;border-bottom:1px solid #FEE2E2;">
              <p style="margin:0 0 2px;font-size:14px;font-weight:700;color:${BLACK};">${esc(a.emoji)} ${esc(a.full_name)}</p>
              <p style="margin:0 0 5px;font-size:12px;color:#888888;">${daysSinceText(a.daysSince)} &middot; ${a.completionRate}% this week</p>
              <p style="margin:0;font-size:12px;font-weight:600;color:${RED};">&rsaquo; ${esc(a.suggestedAction)}</p>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </td></tr>` : ''

  // ── Section 5: Top Streaks ───────────────────────────────────────────────────
  const medals      = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣']
  const streakHtml  = streakLeaders.length ? `
    <tr><td style="padding:0 24px 20px;">
      ${sectionHeader('🔥 Top Streaks', YELLOW)}
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border:1px solid ${BORDER};border-radius:10px;overflow:hidden;">
        <tbody>${streakLeaders.map((a, i) => `
          <tr>
            <td width="44" style="padding:12px 14px;border-bottom:1px solid ${BORDER};font-size:18px;">${medals[i]}</td>
            <td style="padding:12px 14px;border-bottom:1px solid ${BORDER};">
              <p style="margin:0;font-size:14px;font-weight:600;color:${BLACK};">${esc(a.emoji)} ${esc(a.full_name)}</p>
            </td>
            <td style="padding:12px 14px;border-bottom:1px solid ${BORDER};text-align:right;white-space:nowrap;">
              <p style="margin:0;font-size:16px;font-weight:900;color:${YELLOW};">${a.streak}<span style="font-size:12px;font-weight:600;">&nbsp;d</span></p>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </td></tr>` : ''

  // ── Section 6: Injury Watch ───────────────────────────────────────────────────
  const injuryHtml = (injuryFlags.length || surveyInjuries.length) ? `
    <tr><td style="padding:0 24px 20px;">
      ${sectionHeader('🚑 Injury Watch', '#D97706')}
      ${injuryFlags.length ? `
      <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#92400E;text-transform:uppercase;letter-spacing:0.6px;">Skipped this week — injury</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:10px;overflow:hidden;margin-bottom:16px;">
        <tbody>${injuryFlags.map(f => {
          const dateStr = new Date(f.logged_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
          const detail  = f.note ? esc(String(f.note).slice(0, 120)) : 'No additional details'
          return `<tr>
            <td style="padding:12px 18px;border-bottom:1px solid #FEF3C7;">
              <p style="margin:0 0 3px;font-size:14px;font-weight:700;color:${BLACK};">${esc(f.emoji)} ${esc(f.full_name)}</p>
              <p style="margin:0;font-size:12px;color:#92400E;line-height:1.5;">${detail} &middot; <em>${dateStr}</em></p>
            </td>
          </tr>`
        }).join('')}
        </tbody>
      </table>` : ''}
      ${surveyInjuries.length ? `
      <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#92400E;text-transform:uppercase;letter-spacing:0.6px;">Athletes with reported injury areas</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:10px;overflow:hidden;">
        <tbody>${surveyInjuries.map(s => {
          const areaText  = esc(s.injury_areas.join(', ') + (s.injury_other ? ` (${s.injury_other.slice(0, 60)})` : ''))
          const sessionTxt = s.sessionsThisWeek > 0
            ? `${s.sessionsThisWeek} session${s.sessionsThisWeek !== 1 ? 's' : ''} logged this week`
            : 'No sessions logged this week'
          const skipNote  = s.alsoSkippedInjury ? ' &middot; also skipped due to injury' : ''
          return `<tr>
            <td style="padding:12px 18px;border-bottom:1px solid #FEF3C7;">
              <p style="margin:0 0 3px;font-size:14px;font-weight:700;color:${BLACK};">${esc(s.emoji)} ${esc(s.full_name)}</p>
              <p style="margin:0 0 2px;font-size:12px;color:#92400E;font-weight:600;">Flagged: ${areaText}</p>
              <p style="margin:0;font-size:12px;color:#888888;">${sessionTxt}${skipNote}</p>
            </td>
          </tr>`
        }).join('')}
        </tbody>
      </table>` : ''}
    </td></tr>` : ''

  // ── Section 7: Weekly Wins ───────────────────────────────────────────────────
  const prHtml = weeklyPRs.length ? `
    <tr><td style="padding:0 24px 20px;">
      ${sectionHeader('🏆 Weekly Wins — New Personal Records', ORANGE)}
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:10px;overflow:hidden;">
        <tbody>${weeklyPRs.map(pr => `
          <tr>
            <td style="padding:12px 18px;border-bottom:1px solid #FFEDD5;">
              <p style="margin:0 0 2px;font-size:14px;font-weight:700;color:${BLACK};">${esc(pr.emoji)} ${esc(pr.full_name)}</p>
              <p style="margin:0;font-size:13px;color:${ORANGE};font-weight:700;">${esc(pr.lift)} &mdash; ${pr.weight_lbs} lbs${pr.is_first ? ' <span style="font-size:11px;color:#888;">(first log)</span>' : ' &#127881;'}</p>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </td></tr>` : ''

  // ── No-activity fallback ────────────────────────────────────────────────────
  const noActivityHtml = `
    <tr><td style="padding:0 24px 20px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F5;border-radius:12px;">
        <tr><td style="padding:36px 24px;text-align:center;">
          <p style="margin:0 0 10px;font-size:44px;line-height:1;">📋</p>
          <p style="margin:0 0 8px;font-size:18px;font-weight:800;color:${BLACK};">No sessions logged this week</p>
          <p style="margin:0 0 24px;font-size:14px;color:#888888;line-height:1.6;">Your team hasn&rsquo;t logged any sessions yet.<br>Share your athlete invite code to get them started.</p>
          <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
            <tr><td style="background:${BLACK};border-radius:10px;padding:16px 32px;text-align:center;">
              <p style="margin:0 0 4px;font-size:10px;font-weight:700;color:#666666;text-transform:uppercase;letter-spacing:1.8px;">Athlete Invite Code</p>
              <p style="margin:0;font-size:26px;font-weight:900;color:#FFFFFF;letter-spacing:5px;">${esc(inviteCode || '—')}</p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>`

  // ── Full email ──────────────────────────────────────────────────────────────
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Weekly Digest &mdash; ${esc(teamName)}</title>
</head>
<body style="margin:0;padding:0;background:#EAEAEA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#EAEAEA;padding:40px 16px;">
  <tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;border-radius:16px;overflow:hidden;box-shadow:0 8px 48px rgba(0,0,0,0.20);">

    <!-- ══ HEADER ══ -->
    <tr><td style="background:${BLACK};padding:0;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr><td style="background:${ORANGE};height:5px;font-size:0;line-height:0;">&zwnj;</td></tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="padding:28px 32px 26px;">
        <tr><td>
          <img src="https://offseaz.com/Offseaz-Logo-White-Letter-Dark.png"
               alt="Offseaz" width="140"
               style="display:block;margin:0 0 22px;border:0;max-width:140px;" />
          <p style="margin:0 0 5px;font-size:11px;font-weight:700;color:#555555;text-transform:uppercase;letter-spacing:1.4px;">Weekly Coach Digest</p>
          <p style="margin:0;font-size:24px;font-weight:700;color:#FFFFFF;">Hi, ${esc(coachName)} 👋</p>
          ${isAssistant
            ? `<p style="margin:10px 0 0;display:inline-block;font-size:10px;font-weight:700;color:${YELLOW};background:rgba(240,190,36,0.14);border:1px solid rgba(240,190,36,0.30);border-radius:4px;padding:3px 10px;letter-spacing:1.4px;text-transform:uppercase;">Assistant Coach</p>`
            : ''}
          <p style="margin:${isAssistant ? '10' : '8'}px 0 0;font-size:14px;color:#777777;">
            ${esc(teamName)}&nbsp;&nbsp;&middot;&nbsp;&nbsp;${weekLabel}
          </p>
        </td></tr>
      </table>
    </td></tr>

    <!-- ══ SECTION 1: Team Overview ══ -->
    <tr><td style="background:${BG};padding:24px 18px 16px;">
      <p style="margin:0 0 14px;padding:0 6px;font-size:10px;font-weight:700;color:#BBBBBB;text-transform:uppercase;letter-spacing:1.2px;">Team Overview</p>
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr valign="top">
          ${statCard(totalSessions,         'Sessions Logged',   ORANGE)}
          ${statCard(completionRate + '%',  'Completion Rate',   BLUE)}
        </tr>
        <tr valign="top">
          ${statCard(activeStreaks,          'Active Streaks',    YELLOW)}
          ${statCard(injuryCount,            'Injury Flags',      injuryCount > 0 ? RED : '#CCCCCC')}
        </tr>
      </table>
    </td></tr>

    <!-- ══ BODY SECTIONS ══ -->
    <tr><td style="background:#FFFFFF;padding:24px 0 8px;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        ${hasActivity ? `
        ${topPerformerHtml}
        ${rosterHtml}
        ${attentionHtml}
        ${streakHtml}
        ${injuryHtml}
        ${prHtml}
        ` : noActivityHtml}
      </table>
    </td></tr>

    <!-- ══ FOOTER ══ -->
    <tr><td style="background:#0F0F0F;padding:32px 24px;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr><td align="center" style="padding-bottom:20px;">
          <table cellpadding="0" cellspacing="0" role="presentation">
            <tr><td style="background:${ORANGE};border-radius:10px;">
              <a href="https://offseaz.com/coach"
                 style="display:block;padding:14px 44px;font-size:15px;font-weight:700;color:#FFFFFF;text-decoration:none;letter-spacing:0.2px;">
                View Full Dashboard &rarr;
              </a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td align="center">
          <p style="margin:0;font-size:12px;color:#555555;line-height:1.8;">
            You are receiving this because you are a coach on Offseaz.<br>
            You can turn off digest emails in your profile settings.
          </p>
        </td></tr>
      </table>
    </td></tr>

  </table>
  </td></tr>
</table>
</body>
</html>`
}

// ─── Fetch + process one team ─────────────────────────────────────────────────
async function processTeam(team, week) {
  const { id: teamId, name: teamName, coach_id: headCoachId, invite_code: inviteCode } = team

  // ── 1. Head coach profile + assistant coaches in parallel ──────────────────
  const [headProfileRes, assistantsRes] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('id, full_name, digest_enabled')
      .eq('id', headCoachId)
      .single(),
    supabaseAdmin
      .from('team_members')
      .select('athlete_id, access_level, profiles!team_members_athlete_id_fkey(id, full_name, digest_enabled)')
      .eq('team_id', teamId)
      .in('access_level', ['admin_coach', 'view_only']),
  ])

  if (headProfileRes.error) {
    console.error(`[Digest] No profile for head coach ${headCoachId}:`, headProfileRes.error.message)
    return
  }

  const headName          = headProfileRes.data.full_name   || 'Coach'
  const headDigestEnabled = headProfileRes.data.digest_enabled !== false

  const assistants = (assistantsRes.data || []).map(m => ({
    id:             m.athlete_id,
    full_name:      m.profiles?.full_name      || 'Coach',
    digest_enabled: m.profiles?.digest_enabled !== false,
    isAssistant:    true,
  }))

  const coaches = [
    { id: headCoachId, full_name: headName, digest_enabled: headDigestEnabled, isAssistant: false },
    ...assistants,
  ]

  // Fetch all coach emails in parallel via auth admin
  const emailResults = await Promise.all(
    coaches.map(c => supabaseAdmin.auth.admin.getUserById(c.id))
  )
  const emailMap = {}
  for (let i = 0; i < coaches.length; i++) {
    const u = emailResults[i]?.data?.user
    console.log(`[Digest] Coach lookup — id:${coaches[i].id} name:"${coaches[i].full_name}" email:${u?.email || 'NOT FOUND'} digest_enabled:${coaches[i].digest_enabled}`)
    if (u?.email) emailMap[coaches[i].id] = u.email
  }
  console.log(`[Digest] Team "${teamName}" — resolved coach emails:`, Object.values(emailMap))

  // ── 2. Athletes on this team ───────────────────────────────────────────────
  const { data: memberRows, error: memberErr } = await supabaseAdmin
    .from('team_members')
    .select('athlete_id, profiles!team_members_athlete_id_fkey(id, full_name)')
    .eq('team_id', teamId)
    .eq('access_level', 'athlete')

  if (memberErr) {
    console.error(`[Digest] Failed to fetch athletes for team ${teamId}:`, memberErr.message)
    return
  }

  const athletes = (memberRows || []).map(m => ({
    id:        m.athlete_id,
    full_name: m.profiles?.full_name || 'Athlete',
  }))

  console.log(`[Digest] Team "${teamName}" — ${athletes.length} athlete(s) found`)
  if (!athletes.length) {
    console.log(`[Digest] Team "${teamName}" has no athletes — skipping`)
    return
  }

  const athleteIds = athletes.map(a => a.id)

  // ── 3. Logs, surveys, and maxes in parallel ────────────────────────────────
  console.log(`[Digest] Team "${teamName}" — querying ${athleteIds.length} athlete(s)`)
  console.log(`[Digest] Week log window: ${week.start.toISOString()} → ${week.end.toISOString()}`)

  const [weekLogsRes, allLogsRes, injuryRes, surveyRes, weekMaxesRes, allMaxesRes] = await Promise.all([
    supabaseAdmin
      .from('workout_logs')
      .select('athlete_id, status, logged_at')
      .in('athlete_id', athleteIds)
      .gte('logged_at', week.start.toISOString())
      .lte('logged_at', week.end.toISOString()),
    supabaseAdmin
      .from('workout_logs')
      .select('athlete_id, status, logged_at')
      .in('athlete_id', athleteIds),
    supabaseAdmin
      .from('workout_logs')
      .select('athlete_id, logged_at, note')
      .in('athlete_id', athleteIds)
      .eq('status', 'skipped_injury')
      .gte('logged_at', week.start.toISOString())
      .lte('logged_at', week.end.toISOString()),
    supabaseAdmin
      .from('survey_responses')
      .select('athlete_id, sport, position, injury_areas, injury_other')
      .in('athlete_id', athleteIds)
      .eq('team_id', teamId)
      .order('created_at', { ascending: false }),
    // Maxes logged this week (for PR detection)
    supabaseAdmin
      .from('lifting_maxes')
      .select('athlete_id, lift, weight_lbs, logged_at')
      .in('athlete_id', athleteIds)
      .gte('logged_at', week.start.toISOString())
      .lte('logged_at', week.end.toISOString()),
    // All-time maxes (for comparing against previous bests)
    supabaseAdmin
      .from('lifting_maxes')
      .select('athlete_id, lift, weight_lbs, logged_at')
      .in('athlete_id', athleteIds),
  ])

  console.log(`[Digest] weekLogs: ${weekLogsRes.data?.length ?? 'ERR'} rows, err: ${weekLogsRes.error?.message || 'none'}`)
  console.log(`[Digest] weekLogs statuses:`, JSON.stringify((weekLogsRes.data || []).map(l => l.status)))
  console.log(`[Digest] allLogs: ${allLogsRes.data?.length ?? 'ERR'} rows total`)
  console.log(`[Digest] weekMaxes: ${weekMaxesRes.data?.length ?? 'ERR'} rows`)

  // Most-recent survey per athlete (query is DESC, first-wins)
  const surveyMap = {}
  for (const s of (surveyRes.data || [])) {
    if (!surveyMap[s.athlete_id]) surveyMap[s.athlete_id] = s
  }

  // ── 4. Compute stats ───────────────────────────────────────────────────────
  const stats = computeDigestStats({
    athletes,
    weekLogs:   weekLogsRes.data  || [],
    allLogs:    allLogsRes.data   || [],
    surveyMap,
    injuryLogs: injuryRes.data    || [],
    weekMaxes:  weekMaxesRes.data || [],
    allMaxes:   allMaxesRes.data  || [],
  })

  // ── 5. Send to each coach ──────────────────────────────────────────────────
  const resend = new Resend(process.env.RESEND_API_KEY)
  const from   = 'Offseaz <brody@offseaz.com>'
  console.log(`[Digest] Using from address: "${from}"`)

  for (const coach of coaches) {
    const email = emailMap[coach.id]
    if (!email) {
      console.warn(`[Digest] No email for coach ${coach.id} (${coach.full_name}) — skipping`)
      continue
    }

    if (!coach.digest_enabled) {
      console.log(`[Digest] ${email} has digest disabled — skipping`)
      continue
    }

    if (!week.force) {
      const { data: existing } = await supabaseAdmin
        .from('weekly_digests')
        .select('id')
        .eq('coach_id', coach.id)
        .eq('week_start_date', week.weekStartDate)
        .limit(1)

      if (existing?.length) {
        console.log(`[Digest] Already sent to ${email} for week ${week.weekStartDate} — skipping`)
        continue
      }
    } else {
      console.log(`[Digest] force=true — bypassing dedup for ${email}`)
    }

    const html = buildDigestHtml({
      coachName:   coach.full_name,
      isAssistant: coach.isAssistant,
      teamName,
      weekLabel:   week.label,
      stats,
      inviteCode,
    })

    console.log(`[Digest] Attempting send → to:"${email}" subject:"Weekly Digest — ${teamName}"`)
    let status = 'sent'
    try {
      const resendRes = await resend.emails.send({
        from,
        to:      email,
        subject: `Weekly Digest — ${teamName} · ${week.label}`,
        html,
      })
      console.log(`[Digest] Resend raw response:`, JSON.stringify({ data: resendRes.data, error: resendRes.error }))
      if (resendRes.error) throw new Error(resendRes.error.message || JSON.stringify(resendRes.error))
      console.log(`[Digest] ✓ Sent to ${email} (${coach.isAssistant ? 'asst' : 'head'}) — ${teamName}`)
    } catch (err) {
      console.error(`[Digest] ✗ Email failed → ${email}:`, err.message)
      status = 'failed'
    }

    const { error: insertErr } = await supabaseAdmin.from('weekly_digests').insert({
      team_id:         teamId,
      coach_id:        coach.id,
      sent_at:         new Date().toISOString(),
      week_start_date: week.weekStartDate,
      status,
    })
    if (insertErr) console.warn(`[Digest] weekly_digests insert warn (${email}):`, insertErr.message)
  }
}

// ─── Entry point ──────────────────────────────────────────────────────────────
async function runWeeklyDigest({ force = false } = {}) {
  if (!process.env.RESEND_API_KEY) {
    console.error('[Digest] RESEND_API_KEY not set — aborting')
    return
  }

  const week = { ...(force ? getCurrentWeekRange() : getPreviousWeekRange()), force }
  console.log(`[Digest] Starting weekly digest for ${week.label} (force=${force})`)
  console.log(`[Digest] Query window: ${week.start.toISOString()} → ${week.end.toISOString()}`)

  const { data: teams, error } = await supabaseAdmin
    .from('teams')
    .select('id, name, coach_id, invite_code')

  if (error) {
    console.error('[Digest] Failed to fetch teams:', error.message)
    return
  }
  if (!teams?.length) {
    console.log('[Digest] No teams found')
    return
  }

  console.log(`[Digest] Processing ${teams.length} team(s)`)
  for (const team of teams) {
    try {
      await processTeam(team, week)
    } catch (err) {
      console.error(`[Digest] Unhandled error for team ${team.id} ("${team.name}"):`, err.message)
    }
  }
  console.log('[Digest] Done')
}

module.exports = { runWeeklyDigest }
