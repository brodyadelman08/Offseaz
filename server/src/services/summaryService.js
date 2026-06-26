const { Resend } = require('resend')
const supabaseAdmin = require('../config/supabase')
const { getAccountabilityData } = require('./accountabilityService')

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getWeekRange() {
  const now = new Date()
  const dow = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1))
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return { monday, sunday, label: `${fmt(monday)} – ${fmt(sunday)}` }
}

function computeStats(athletes) {
  const logged = athletes.filter(a => a.logged_this_week)
  const notLogged = athletes.filter(a => !a.logged_this_week)

  const effortValues = logged
    .filter(a => a.avg_effort_this_week != null)
    .map(a => a.avg_effort_this_week)
  const avgEffort = effortValues.length
    ? Math.round((effortValues.reduce((a, b) => a + b, 0) / effortValues.length) * 10) / 10
    : null

  const withStreak = [...athletes].filter(a => a.streak_weeks > 0)
  const mostConsistent = withStreak.length
    ? withStreak.sort((a, b) => b.streak_weeks - a.streak_weeks)[0]
    : null

  const needsAttention = notLogged.length
    ? [...notLogged].sort((a, b) => a.streak_weeks - b.streak_weeks)[0]
    : null

  return { logged, notLogged, avgEffort, mostConsistent, needsAttention }
}

// ─── Email HTML ───────────────────────────────────────────────────────────────

function buildEmailHtml(teamName, weekLabel, athletes, stats) {
  const { logged, notLogged, avgEffort, mostConsistent, needsAttention } = stats

  // Offseaz brand colors
  const brandOrange = '#F75709'
  const brandBlue   = '#308EBD'
  const brandYellow = '#F0BE24'

  const headerBg = '#1a1a1a'
  const subtle = '#f9f9f9'
  const border = '#e5e5e5'

  function sectionHeader(label, color) {
    return `<p style="margin:0 0 12px;font-size:12px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:.5px;">${label}</p>`
  }

  function athleteRow(a, didLog) {
    const sessions = didLog ? `${a.sessions_this_week} session${a.sessions_this_week !== 1 ? 's' : ''}` : '—'
    const effort = didLog && a.avg_effort_this_week != null ? a.avg_effort_this_week.toFixed(1) : '—'
    const streak = a.streak_weeks > 0 ? `${a.streak_weeks}wk` : '—'
    // Blue = logged (informational/good), Orange = not logged (action required)
    const dotColor = didLog ? brandBlue : brandOrange
    const dot = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${dotColor};vertical-align:middle;"></span>`
    return `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid ${border};text-align:center;">${dot}</td>
        <td style="padding:10px 12px;border-bottom:1px solid ${border};font-size:14px;font-weight:600;color:#1a1a1a;">${a.full_name}</td>
        <td style="padding:10px 12px;border-bottom:1px solid ${border};font-size:13px;color:#555;text-align:center;">${sessions}</td>
        <td style="padding:10px 12px;border-bottom:1px solid ${border};font-size:13px;color:#555;text-align:center;">${effort}</td>
        <td style="padding:10px 12px;border-bottom:1px solid ${border};font-size:13px;color:#888;text-align:center;">${streak}</td>
      </tr>`
  }

  const allRows = [
    ...logged.map(a => athleteRow(a, true)),
    ...notLogged.map(a => athleteRow(a, false)),
  ].join('')

  const highlights = []
  if (mostConsistent) {
    highlights.push(`<tr><td style="padding:8px 0;font-size:14px;border-left:3px solid ${brandYellow};padding-left:10px;"><strong style="color:${brandYellow};">Achievement</strong> &nbsp; ${mostConsistent.full_name} &nbsp;<span style="color:#888;font-size:13px;">${mostConsistent.streak_weeks}-week streak 🔥</span></td></tr>`)
  }
  if (needsAttention) {
    highlights.push(`<tr><td style="padding:8px 0;font-size:14px;border-left:3px solid ${brandOrange};padding-left:10px;margin-top:8px;"><strong style="color:${brandOrange};">Action Required</strong> &nbsp; ${needsAttention.full_name} &nbsp;<span style="color:#888;font-size:13px;">0 sessions this week</span></td></tr>`)
  }

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Weekly Summary</title></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:10px;overflow:hidden;border:1px solid ${border};">

        <!-- Header -->
        <tr><td style="background:${headerBg};padding:28px 32px;">
          <p style="margin:0;font-size:20px;font-weight:700;color:#fff;letter-spacing:-0.5px;">Offseaz</p>
          <p style="margin:6px 0 0;font-size:13px;color:#aaa;">Weekly Training Summary</p>
        </td></tr>

        <!-- Week + headline stats -->
        <tr><td style="padding:24px 32px;border-bottom:1px solid ${border};background:${subtle};">
          <p style="margin:0 0 12px;font-size:12px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.5px;">Week of ${weekLabel}</p>
          <p style="margin:0;font-size:28px;font-weight:700;color:#1a1a1a;">${logged.length} <span style="font-size:18px;color:#888;">of ${athletes.length}</span> logged</p>
          ${avgEffort != null ? `<p style="margin:6px 0 0;font-size:14px;color:#555;">Team average effort <strong>${avgEffort} / 10</strong></p>` : ''}
        </td></tr>

        <!-- Athlete table -->
        <tr><td style="padding:24px 32px 0;">
          ${sectionHeader('Athlete Breakdown', brandBlue)}
          <table width="100%" cellpadding="0" cellspacing="0">
            <thead>
              <tr style="background:${subtle};">
                <th style="padding:8px 12px;font-size:11px;font-weight:700;color:#aaa;text-align:left;text-transform:uppercase;"></th>
                <th style="padding:8px 12px;font-size:11px;font-weight:700;color:#aaa;text-align:left;text-transform:uppercase;">Athlete</th>
                <th style="padding:8px 12px;font-size:11px;font-weight:700;color:#aaa;text-align:center;text-transform:uppercase;">Sessions</th>
                <th style="padding:8px 12px;font-size:11px;font-weight:700;color:#aaa;text-align:center;text-transform:uppercase;">Effort</th>
                <th style="padding:8px 12px;font-size:11px;font-weight:700;color:#aaa;text-align:center;text-transform:uppercase;">Streak</th>
              </tr>
            </thead>
            <tbody>${allRows}</tbody>
          </table>
        </td></tr>

        <!-- Highlights -->
        ${highlights.length ? `
        <tr><td style="padding:24px 32px;border-top:1px solid ${border};margin-top:8px;">
          ${sectionHeader('Highlights', brandYellow)}
          <table cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0 6px;"><tbody>${highlights.join('')}</tbody></table>
        </td></tr>` : ''}

        <!-- Footer -->
        <tr><td style="padding:20px 32px;border-top:1px solid ${border};background:${subtle};">
          <p style="margin:0;font-size:12px;color:#aaa;">Sent automatically by Offseaz every Sunday at 8pm. <br>Log in to view the full accountability dashboard.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ─── Send + Record ────────────────────────────────────────────────────────────

async function sendSummaryEmail(coachEmail, teamName, weekLabel, athletes, stats) {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY is not set in environment')
  const resend = new Resend(key)

  const from = 'Offseaz <notifications@offseaz.com>'
  const html = buildEmailHtml(teamName, weekLabel, athletes, stats)

  const { error } = await resend.emails.send({
    from,
    to: coachEmail,
    subject: `Weekly Training Summary — ${teamName} · Week of ${weekLabel}`,
    html,
  })

  if (error) throw new Error(error.message || 'Resend error')
}

async function recordSummary(teamId, coachId, weekStart, athletes, stats, emailStatus) {
  const row = {
    team_id: teamId,
    coach_id: coachId,
    week_start: weekStart,
    athlete_count: athletes.length,
    logged_count: stats.logged.length,
    avg_effort: stats.avgEffort,
    most_consistent_athlete: stats.mostConsistent?.full_name || null,
    needs_attention_athlete: stats.needsAttention?.full_name || null,
    email_status: emailStatus,
  }
  const { error } = await supabaseAdmin.from('weekly_summaries').insert(row)
  if (error) console.error('[Summary] Failed to record summary:', error.message)
}

// ─── Per-team processor ───────────────────────────────────────────────────────

async function processTeam(team) {
  const { id: teamId, name: teamName, coach_id: coachId } = team

  // Get coach email from auth.users
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.getUserById(coachId)
  if (authError || !authData?.user?.email) {
    console.error(`[Summary] Could not fetch email for coach ${coachId}:`, authError?.message)
    return
  }
  const coachEmail = authData.user.email

  // Fetch accountability data (reuses Phase 6 service)
  const { athletes } = await getAccountabilityData(coachId)
  if (!athletes.length) {
    console.log(`[Summary] Team "${teamName}" has no athletes — skipping`)
    return
  }

  const { monday, label: weekLabel } = getWeekRange()
  const weekStart = monday.toISOString().split('T')[0]
  const stats = computeStats(athletes)

  let emailStatus = 'sent'
  try {
    await sendSummaryEmail(coachEmail, teamName, weekLabel, athletes, stats)
    console.log(`[Summary] Sent to ${coachEmail} for team "${teamName}"`)
  } catch (err) {
    console.error(`[Summary] Email failed for team "${teamName}":`, err.message)
    emailStatus = 'failed'
  }

  await recordSummary(teamId, coachId, weekStart, athletes, stats, emailStatus)
}

// ─── Entry point ─────────────────────────────────────────────────────────────

async function runWeeklySummary() {
  const { data: teams, error } = await supabaseAdmin
    .from('teams')
    .select('id, name, coach_id')

  if (error) throw error
  if (!teams || teams.length === 0) {
    console.log('[Summary] No teams found')
    return
  }

  console.log(`[Summary] Processing ${teams.length} team(s)`)
  for (const team of teams) {
    try {
      await processTeam(team)
    } catch (err) {
      console.error(`[Summary] Unhandled error for team ${team.id}:`, err.message)
    }
  }
}

module.exports = { runWeeklySummary }
