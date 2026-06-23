'use strict'
const { Resend } = require('resend')
const supabaseAdmin = require('../config/supabase')

// ─── Brand colours ────────────────────────────────────────────────────────────
const ORANGE = '#F75709'
const BLUE   = '#308EBD'
const YELLOW = '#F0BE24'
const BLACK  = '#0A0A0A'

// ─── Previous-week window ─────────────────────────────────────────────────────
// Returns the Mon 00:00 → Sun 23:59:59 window for the week just completed.
// Always relative to the current week start, so a delayed cron still picks
// the correct window (e.g. fires Tuesday → still covers last Mon–Sun).
function getPreviousWeekRange() {
  const now = new Date()
  const dow = now.getUTCDay() // 0 = Sun, 1 = Mon, …

  // Start of THIS week (Monday 00:00 UTC)
  const thisMon = new Date(now)
  thisMon.setUTCHours(0, 0, 0, 0)
  thisMon.setUTCDate(now.getUTCDate() - (dow === 0 ? 6 : dow - 1))

  const prevMon = new Date(thisMon)
  prevMon.setUTCDate(thisMon.getUTCDate() - 7)

  // One millisecond before this Monday = last Sunday 23:59:59.999
  const prevSun = new Date(thisMon.getTime() - 1)

  const fmt = d =>
    d.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
    })

  return {
    start:         prevMon,
    end:           prevSun,
    label:         `${fmt(prevMon)} – ${fmt(prevSun)}`,
    weekStartDate: prevMon.toISOString().split('T')[0],
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

function computeStreak(logs) {
  const active = logs.filter(l => l.status !== 'skipped' && l.status !== 'skipped_injury')
  if (!active.length) return 0
  const weeks  = new Set(active.map(l => getMondayKey(l.logged_at)))
  const latest = [...active].sort((a, b) => new Date(b.logged_at) - new Date(a.logged_at))[0]
  const cur    = new Date(getMondayKey(latest.logged_at))
  let streak   = 0
  while (weeks.has(cur.toISOString().split('T')[0])) {
    streak++
    cur.setUTCDate(cur.getUTCDate() - 7)
  }
  return streak
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function esc(s) {
  if (s == null) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ─── Stat computation ─────────────────────────────────────────────────────────
function computeDigestStats({ athletes, weekLogs, allLogs, surveyMap, injuryLogs }) {
  const athleteData = athletes.map(a => {
    const aWeekActive = weekLogs.filter(
      l => l.athlete_id === a.id && l.status !== 'skipped' && l.status !== 'skipped_injury'
    )
    const aAllLogs = allLogs.filter(l => l.athlete_id === a.id)
    const lastLog  = [...aAllLogs].sort((x, y) => new Date(y.logged_at) - new Date(x.logged_at))[0]
    const survey   = surveyMap[a.id] || {}

    const sessionsThisWeek = aWeekActive.length
    const streak           = computeStreak(aAllLogs)
    const lastAt           = lastLog?.logged_at || null
    const daysSince        = lastAt
      ? Math.floor((Date.now() - new Date(lastAt).getTime()) / 86400000)
      : null

    return {
      id:              a.id,
      full_name:       a.full_name,
      sport:           survey.sport    || null,
      position:        survey.position || null,
      sessionsThisWeek,
      streak,
      daysSince,
    }
  })

  const withSessions = athleteData.filter(a => a.sessionsThisWeek > 0)
  const zeroSessions = athleteData
    .filter(a => a.sessionsThisWeek === 0)
    .sort((a, b) => {
      // Put athletes who never logged at the bottom
      if (a.daysSince === null && b.daysSince !== null) return 1
      if (b.daysSince === null && a.daysSince !== null) return -1
      return (b.daysSince ?? 0) - (a.daysSince ?? 0) // most days since = top of list
    })

  const totalSessions  = withSessions.reduce((s, a) => s + a.sessionsThisWeek, 0)
  const completionRate = athletes.length
    ? Math.round((withSessions.length / athletes.length) * 100)
    : 0
  const activeStreaks  = athleteData.filter(a => a.streak > 0).length
  const injuryCount   = injuryLogs.length

  // Top performer: most sessions this week, tiebreak streak
  let topPerformer = null
  if (withSessions.length) {
    const sorted = [...withSessions].sort((a, b) =>
      b.sessionsThisWeek !== a.sessionsThisWeek
        ? b.sessionsThisWeek - a.sessionsThisWeek
        : b.streak - a.streak
    )
    const top = sorted[0]
    // Individual completion rate: sessions vs 7-day maximum, capped at 100
    const indivRate = Math.min(Math.round((top.sessionsThisWeek / 7) * 100), 100)
    topPerformer = { ...top, completionRate: indivRate }
  }

  // Injury flags: attach athlete names
  const athleteMap  = Object.fromEntries(athleteData.map(a => [a.id, a]))
  const injuryFlags = injuryLogs
    .sort((a, b) => new Date(a.logged_at) - new Date(b.logged_at))
    .map(l => ({
      full_name: athleteMap[l.athlete_id]?.full_name || 'Unknown',
      logged_at: l.logged_at,
      note:      l.note,
    }))

  // Top 3 streak leaders
  const streakLeaders = [...athleteData]
    .filter(a => a.streak > 0)
    .sort((a, b) => b.streak - a.streak)
    .slice(0, 3)
    .map(a => ({ full_name: a.full_name, streak: a.streak }))

  return {
    totalSessions,
    completionRate,
    activeStreaks,
    injuryCount,
    topPerformer,
    zeroSessions,
    injuryFlags,
    streakLeaders,
    hasActivity: totalSessions > 0,
  }
}

// ─── Email HTML ───────────────────────────────────────────────────────────────
function buildDigestHtml({ coachName, isAssistant, teamName, weekLabel, stats, inviteCode }) {
  const RED    = '#DC2626'
  const BORDER = '#E5E5E5'

  const {
    totalSessions, completionRate, activeStreaks, injuryCount,
    topPerformer, zeroSessions, injuryFlags, streakLeaders, hasActivity,
  } = stats

  // Stat card (2-column table cell)
  function statCard(value, label, accentColor) {
    return `<td width="50%" style="padding:6px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:10px;overflow:hidden;border:1px solid ${BORDER};">
        <tr><td style="background:#FFFFFF;border-top:3px solid ${accentColor};padding:18px 18px 16px;">
          <p style="margin:0;font-size:32px;font-weight:900;color:${BLACK};letter-spacing:-1.5px;line-height:1;">${esc(value)}</p>
          <p style="margin:8px 0 0;font-size:11px;font-weight:700;color:#999999;text-transform:uppercase;letter-spacing:0.9px;">${label}</p>
        </td></tr>
      </table>
    </td>`
  }

  // ── Zero sessions ──
  const zeroRows = zeroSessions.length
    ? zeroSessions.map(a => {
        const lastStr = a.daysSince === null
          ? 'Never logged a session'
          : a.daysSince === 0
          ? 'Last active today'
          : `Last active ${a.daysSince}d ago`
        return `<tr>
          <td style="padding:11px 18px;border-bottom:1px solid #FEE2E2;">
            <p style="margin:0;font-size:14px;font-weight:600;color:${BLACK};">${esc(a.full_name)}</p>
          </td>
          <td style="padding:11px 18px;border-bottom:1px solid #FEE2E2;text-align:right;white-space:nowrap;">
            <p style="margin:0;font-size:12px;font-weight:600;color:${RED};">${lastStr}</p>
          </td>
        </tr>`
      }).join('')
    : `<tr><td colspan="2" style="padding:18px;text-align:center;">
        <p style="margin:0;font-size:14px;font-weight:600;color:#16A34A;">&#10003;&nbsp; Every athlete logged at least one session this week!</p>
      </td></tr>`

  // ── Injury rows ──
  const injuryRows = injuryFlags.map(f => {
    const dateStr = new Date(f.logged_at).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', timeZone: 'UTC',
    })
    const detail = f.note ? esc(String(f.note).slice(0, 100)) : 'No additional details'
    return `<tr>
      <td style="padding:11px 18px;border-bottom:1px solid #FEF3C7;">
        <p style="margin:0;font-size:14px;font-weight:600;color:${BLACK};">${esc(f.full_name)}</p>
        <p style="margin:3px 0 0;font-size:12px;color:#92400E;line-height:1.4;">${detail}</p>
      </td>
      <td style="padding:11px 18px;border-bottom:1px solid #FEF3C7;text-align:right;white-space:nowrap;vertical-align:top;">
        <p style="margin:0;font-size:12px;font-weight:600;color:#D97706;">${dateStr}</p>
      </td>
    </tr>`
  }).join('')

  // ── Streak leaders ──
  const medals = ['&#127945;', '&#127946;', '&#127947;'] // 🥇🥈🥉
  const streakRows = streakLeaders.map((a, i) => `
    <tr>
      <td width="44" style="padding:12px 18px;border-bottom:1px solid ${BORDER};font-size:20px;">${medals[i]}</td>
      <td style="padding:12px 18px;border-bottom:1px solid ${BORDER};">
        <p style="margin:0;font-size:14px;font-weight:600;color:${BLACK};">${esc(a.full_name)}</p>
      </td>
      <td style="padding:12px 18px;border-bottom:1px solid ${BORDER};text-align:right;white-space:nowrap;">
        <p style="margin:0;font-size:15px;font-weight:800;color:${ORANGE};">${a.streak}&nbsp;wk${a.streak !== 1 ? 's' : ''}</p>
      </td>
    </tr>`).join('')

  // ── Top performer block ──
  const topPerformerHtml = topPerformer ? `
    <tr><td style="padding:0 24px 18px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;overflow:hidden;">
        <tr><td style="padding:22px 24px;">
          <p style="margin:0 0 14px;font-size:10px;font-weight:700;color:${BLUE};text-transform:uppercase;letter-spacing:1.4px;">&#11088;&nbsp; Athlete of the Week</p>
          <p style="margin:0 0 4px;font-size:22px;font-weight:800;color:${BLACK};">${esc(topPerformer.full_name)}</p>
          <p style="margin:0 0 18px;font-size:13px;color:#555555;">${
            [topPerformer.sport, topPerformer.position].filter(Boolean).map(esc).join(' &middot; ') || '&nbsp;'
          }</p>
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding-right:36px;">
                <p style="margin:0;font-size:26px;font-weight:900;color:${ORANGE};letter-spacing:-1px;">${topPerformer.completionRate}%</p>
                <p style="margin:4px 0 0;font-size:10px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.8px;">Completion Rate</p>
              </td>
              <td>
                <p style="margin:0;font-size:26px;font-weight:900;color:${BLUE};letter-spacing:-1px;">${topPerformer.streak}<span style="font-size:16px;font-weight:600;">&nbsp;wk${topPerformer.streak !== 1 ? 's' : ''}</span></p>
                <p style="margin:4px 0 0;font-size:10px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.8px;">Current Streak</p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </td></tr>` : ''

  const injurySectionHtml = injuryFlags.length ? `
    <tr><td style="padding:0 24px 18px;">
      <p style="margin:0 0 10px;font-size:10px;font-weight:700;color:#D97706;text-transform:uppercase;letter-spacing:1.2px;">&#128680;&nbsp; Injury Flags</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:10px;overflow:hidden;">
        <tbody>${injuryRows}</tbody>
      </table>
    </td></tr>` : ''

  const streakSectionHtml = streakLeaders.length ? `
    <tr><td style="padding:0 24px 18px;">
      <p style="margin:0 0 10px;font-size:10px;font-weight:700;color:#888888;text-transform:uppercase;letter-spacing:1.2px;">&#128293;&nbsp; Weekly Streak Leaders</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border:1px solid ${BORDER};border-radius:10px;overflow:hidden;">
        <tbody>${streakRows}</tbody>
      </table>
    </td></tr>` : ''

  const noActivityHtml = `
    <tr><td style="padding:0 24px 18px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F5;border-radius:12px;">
        <tr><td style="padding:36px 24px;text-align:center;">
          <p style="margin:0 0 10px;font-size:44px;line-height:1;">&#128203;</p>
          <p style="margin:0 0 8px;font-size:18px;font-weight:800;color:${BLACK};">No sessions logged last week</p>
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

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Weekly Digest &mdash; ${esc(teamName)}</title>
</head>
<body style="margin:0;padding:0;background:#EAEAEA;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,Helvetica,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#EAEAEA;padding:40px 16px;">
  <tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;border-radius:16px;overflow:hidden;box-shadow:0 8px 48px rgba(0,0,0,0.20);">

    <!-- ═══════════════════════════════════════
         HEADER
    ═══════════════════════════════════════ -->
    <tr><td style="background:${BLACK};padding:0;">
      <!-- Orange top bar -->
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr><td style="background:${ORANGE};height:5px;font-size:0;line-height:0;">&zwnj;</td></tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="padding:28px 32px 26px;">
        <tr><td>
          <p style="margin:0 0 22px;font-size:26px;font-weight:900;color:#FFFFFF;letter-spacing:-0.5px;">
            Off<span style="color:${ORANGE};">seaz</span>
          </p>
          <p style="margin:0 0 5px;font-size:11px;font-weight:700;color:#555555;text-transform:uppercase;letter-spacing:1.4px;">Weekly Coach Digest</p>
          <p style="margin:0;font-size:24px;font-weight:700;color:#FFFFFF;">Hi, ${esc(coachName)} &#128075;</p>
          ${isAssistant
            ? `<p style="margin:10px 0 0;display:inline-block;font-size:10px;font-weight:700;color:${YELLOW};background:rgba(240,190,36,0.14);border:1px solid rgba(240,190,36,0.30);border-radius:4px;padding:3px 10px;letter-spacing:1.4px;text-transform:uppercase;">Assistant Coach</p>`
            : ''}
          <p style="margin:${isAssistant ? '10' : '8'}px 0 0;font-size:14px;color:#777777;">
            ${esc(teamName)}&nbsp;&nbsp;&middot;&nbsp;&nbsp;${weekLabel}
          </p>
        </td></tr>
      </table>
    </td></tr>

    <!-- ═══════════════════════════════════════
         TEAM OVERVIEW — 4 stats in 2×2 grid
    ═══════════════════════════════════════ -->
    <tr><td style="background:#F8F8F8;padding:24px 18px 16px;">
      <p style="margin:0 0 14px;padding:0 6px;font-size:10px;font-weight:700;color:#BBBBBB;text-transform:uppercase;letter-spacing:1.2px;">Team Overview</p>
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr valign="top">
          ${statCard(totalSessions,        'Sessions Logged',   ORANGE)}
          ${statCard(completionRate + '%', 'Completion Rate',   BLUE)}
        </tr>
        <tr valign="top">
          ${statCard(activeStreaks,         'Active Streaks',    YELLOW)}
          ${statCard(injuryCount,           'Injury Flags',      injuryCount > 0 ? RED : '#CCCCCC')}
        </tr>
      </table>
    </td></tr>

    <!-- ═══════════════════════════════════════
         BODY SECTIONS
    ═══════════════════════════════════════ -->
    <tr><td style="background:#FFFFFF;padding:24px 0 8px;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">

        ${hasActivity ? `
        ${topPerformerHtml}

        <!-- Zero Sessions -->
        <tr><td style="padding:0 24px 18px;">
          <p style="margin:0 0 10px;font-size:10px;font-weight:700;color:${RED};text-transform:uppercase;letter-spacing:1.2px;">&#9888;&nbsp; Zero Sessions Last Week</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFF5F5;border:1px solid #FECACA;border-radius:10px;overflow:hidden;">
            <tbody>${zeroRows}</tbody>
          </table>
        </td></tr>

        ${injurySectionHtml}
        ${streakSectionHtml}

        ` : noActivityHtml}

      </table>
    </td></tr>

    <!-- ═══════════════════════════════════════
         FOOTER
    ═══════════════════════════════════════ -->
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
            Manage your email preferences in your profile settings.
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

  // ── 1. Head coach profile + assistant coaches, in parallel ──
  const [headProfileRes, assistantsRes] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('id, full_name')
      .eq('id', headCoachId)
      .single(),
    supabaseAdmin
      .from('team_members')
      .select('athlete_id, access_level, profiles!team_members_athlete_id_fkey(id, full_name)')
      .eq('team_id', teamId)
      .in('access_level', ['admin_coach', 'view_only']),
  ])

  if (headProfileRes.error) {
    console.error(`[Digest] No profile for head coach ${headCoachId}:`, headProfileRes.error.message)
    return
  }

  const headName   = headProfileRes.data.full_name || 'Coach'
  const assistants = (assistantsRes.data || []).map(m => ({
    id:          m.athlete_id,
    full_name:   m.profiles?.full_name || 'Coach',
    isAssistant: true,
  }))

  // All coaches on this team (head first)
  const coaches = [
    { id: headCoachId, full_name: headName, isAssistant: false },
    ...assistants,
  ]

  // Fetch all coach emails in parallel via auth admin
  const emailResults = await Promise.all(
    coaches.map(c => supabaseAdmin.auth.admin.getUserById(c.id))
  )
  const emailMap = {}
  for (let i = 0; i < coaches.length; i++) {
    const u = emailResults[i]?.data?.user
    console.log(`[Digest] Coach lookup — id:${coaches[i].id} name:"${coaches[i].full_name}" email:${u?.email || 'NOT FOUND'} authErr:${emailResults[i]?.error?.message || 'none'}`)
    if (u?.email) emailMap[coaches[i].id] = u.email
  }
  console.log(`[Digest] Team "${teamName}" — resolved coach emails:`, Object.values(emailMap))

  // ── 2. Athletes on this team ──
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

  // ── 3. Logs + surveys in parallel ──
  const [weekLogsRes, allLogsRes, injuryRes, surveyRes] = await Promise.all([
    // All logs in the previous week (for session counts)
    supabaseAdmin
      .from('workout_logs')
      .select('athlete_id, status, logged_at')
      .in('athlete_id', athleteIds)
      .gte('logged_at', week.start.toISOString())
      .lte('logged_at', week.end.toISOString()),
    // All-time logs (for streak + last activity)
    supabaseAdmin
      .from('workout_logs')
      .select('athlete_id, status, logged_at')
      .in('athlete_id', athleteIds),
    // Injury-skipped logs in the previous week (with note for body part)
    supabaseAdmin
      .from('workout_logs')
      .select('athlete_id, logged_at, note')
      .in('athlete_id', athleteIds)
      .eq('status', 'skipped_injury')
      .gte('logged_at', week.start.toISOString())
      .lte('logged_at', week.end.toISOString()),
    // Latest survey per athlete for sport / position
    supabaseAdmin
      .from('survey_responses')
      .select('athlete_id, sport, position')
      .in('athlete_id', athleteIds)
      .eq('team_id', teamId)
      .order('created_at', { ascending: false }),
  ])

  // Most-recent survey per athlete (query is already DESC, first-wins)
  const surveyMap = {}
  for (const s of (surveyRes.data || [])) {
    if (!surveyMap[s.athlete_id]) surveyMap[s.athlete_id] = s
  }

  // ── 4. Compute stats ──
  const stats = computeDigestStats({
    athletes,
    weekLogs:   weekLogsRes.data  || [],
    allLogs:    allLogsRes.data   || [],
    surveyMap,
    injuryLogs: injuryRes.data    || [],
  })

  // ── 5. Send to every coach, skipping if already sent this week ──
  const resend = new Resend(process.env.RESEND_API_KEY)
  const from   = 'Offseaz <notifications@offseaz.com>'
  console.log(`[Digest] Using from address: "${from}"`)

  for (const coach of coaches) {
    const email = emailMap[coach.id]
    if (!email) {
      console.warn(`[Digest] No email found for coach ${coach.id} (${coach.full_name}) — skipping`)
      continue
    }

    // Deduplication: skip if a digest for this coach + week already exists (bypass with force=true)
    if (!week.force) {
      const { data: existing } = await supabaseAdmin
        .from('weekly_digests')
        .select('id')
        .eq('coach_id', coach.id)
        .eq('week_start_date', week.weekStartDate)
        .limit(1)

      if (existing?.length) {
        console.log(`[Digest] Already sent to ${email} for week ${week.weekStartDate} — skipping (pass force=true to override)`)
        continue
      }
    } else {
      console.log(`[Digest] force=true — bypassing dedup check for ${email}`)
    }

    const html = buildDigestHtml({
      coachName:   coach.full_name,
      isAssistant: coach.isAssistant,
      teamName,
      weekLabel:   week.label,
      stats,
      inviteCode,
    })

    console.log(`[Digest] Attempting send → from:"${from}" to:"${email}" subject:"Weekly Digest — ${teamName} · ${week.label}"`)
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

    await supabaseAdmin.from('weekly_digests').insert({
      team_id:         teamId,
      coach_id:        coach.id,
      sent_at:         new Date().toISOString(),
      week_start_date: week.weekStartDate,
      status,
    })
  }
}

// ─── Entry point ──────────────────────────────────────────────────────────────
async function runWeeklyDigest({ force = false } = {}) {
  if (!process.env.RESEND_API_KEY) {
    console.error('[Digest] RESEND_API_KEY not set — aborting')
    return
  }

  const week = { ...getPreviousWeekRange(), force }
  console.log(`[Digest] Starting weekly digest for ${week.label} (force=${force})`)

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
