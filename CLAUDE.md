# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Offseaz is a coach-first offseason athletic training platform. Coaches create teams, build training blueprints, and track athlete accountability. Athletes join via invite code, complete a needs-analysis survey, and follow their assigned plan. An automated weekly email summary goes to coaches every Sunday.

Two roles only: **coach** and **athlete**. No admin panel.

## Monorepo layout

```
offseaz/
  client/        Vite + React 19 SPA — deployed to Vercel (Root Directory: client/)
  server/        Express 5 API       — deployed to Railway (Root Directory: server/)
  railway.json   Railway build/start config
  CLAUDE.md
```

## Commands

**Client** (from `client/`):
```bash
npm run dev      # Vite dev server on localhost:5173
npm run build    # Production build → client/dist/
npm run lint     # ESLint
npm run preview  # Serve production build locally
```

**Server** (from `server/`):
```bash
npm run dev   # nodemon src/index.js (auto-restarts on change)
npm start     # node src/index.js
```

No test runner is configured.

## Environment variables

**Client** — `client/.env` (gitignored, never committed):
```
VITE_API_URL=http://localhost:3000
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```
`VITE_*` variables are baked in at Vite build time. Changing them in Vercel requires a full redeploy with build cache cleared.

**Server** — `server/.env` (gitignored, never committed):
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
RESEND_FROM=        # optional, defaults to onboarding@resend.dev
CORS_ORIGIN=        # optional, defaults to * — set to Vercel URL in production
PORT=               # set automatically by Railway
```

## Deployment config

- **Railway**: Root Directory = `server/`. `railway.json` commands must NOT include `cd server &&` — Railway is already in that directory.
- **Vercel**: Root Directory = `client/`. `client/vercel.json` must contain a catch-all SPA rewrite (`routes: [{ handle: "filesystem" }, { src: "/(.*)", dest: "/index.html" }]`) or any deep link returns Vercel's 404 before React Router loads.

## Architecture

### Auth flow

1. Client calls `supabase.auth.signInWithPassword()` or `signUp()`. Supabase handles credentials.
2. Every API request goes through `client/src/services/api.js` (an axios instance). A request interceptor attaches the session `access_token` as `Authorization: Bearer <token>`.
3. On the server, `server/src/middleware/verifyToken.js` calls `supabaseAdmin.auth.getUser(token)` and populates `req.user` with the full Supabase user object (including `user_metadata`).
4. `POST /api/auth/register` is the **one unprotected route** — it validates the caller via `supabaseAdmin.auth.admin.getUserById(userId)` instead of a JWT, because a session may not exist immediately after `signUp()` when email confirmation is enabled.
5. On `GET /api/auth/profile`, if the profile row is missing (Supabase error `PGRST116`), the controller auto-creates it from `req.user.user_metadata` (set at sign-up via `options.data: { role, full_name }`). This self-heals accounts created before the profile row was written.

### Role gating

Roles are stored in the `profiles` table, not in the JWT. `AuthContext` fetches `/api/auth/profile` on session change and stores it in React state. `ProtectedRoute` reads `profile.role` to guard routes. After login, `Login.jsx` fetches the profile and navigates to `/coach` or `/athlete` based on role.

### Data model (key tables)

| Table | Purpose |
|---|---|
| `profiles` | One row per user — `id` matches `auth.users.id`, stores `role` and `full_name` |
| `teams` | Owned by a coach (`coach_id`); has an `invite_code` (8-char lowercase hex) |
| `team_members` | Join table: `team_id` + `athlete_id` |
| `surveys` | One per athlete; `completed_at` timestamp signals completion |
| `blueprints` | Training plans; owned by a coach, assigned to an athlete |
| `blueprint_weeks` | Child of blueprint; `sessions` is a JSONB array of session objects |
| `workout_logs` | Athlete logs; references `blueprint_week_id` + `session_index` |
| `weekly_summaries` | Written after each Sunday scheduler run |

### Server structure

Pattern: `routes/` → `controllers/` → `services/` → `config/supabase.js`

The admin Supabase client (`SUPABASE_SERVICE_ROLE_KEY`) bypasses RLS and is used for all server-side DB operations. Never use the anon key on the server.

`server/src/scheduler.js` is `require()`d at the bottom of `index.js` **after** `app.listen()`. It registers a node-cron job (Sundays 8pm) that calls `runWeeklySummary()` — which queries all teams, computes accountability stats, sends emails via Resend, and inserts into `weekly_summaries`. A crash in the scheduler kills the process; Railway restarts it.

### Client structure

- `AuthContext` (`client/src/context/AuthContext.jsx`) is the single source of truth for `session`, `profile`, and `loading`. Wrap order: `BrowserRouter` → `AuthProvider` → `Routes`.
- All pages use **inline styles only** — `const styles = {}` objects at the bottom of each file. No CSS modules, no Tailwind.
- `client/src/services/api.js` — the axios instance. Import this for all backend calls; never call the backend with raw `fetch`.
- `client/src/services/supabase.js` — the Supabase browser client (anon key). Use this for auth operations only; data fetching goes through the Express API.

### Invite code join

Athletes join a team two ways:
1. **URL**: `/join/:code` → `JoinTeam.jsx` auto-joins if logged in, redirects to `/register?invite=code` if not.
2. **Dashboard input**: `AthleteDashboard.jsx` shows a code input for athletes without a team.

Both paths call `POST /api/teams/join` with `{ invite_code }`. The code is always sent lowercase (stored as lowercase hex); the dashboard input displays uppercase for readability.

## Key error codes to know

- **`PGRST116`** — Supabase "row not found". Treated as 404 in most controllers; triggers auto-create in the profile endpoint.
- **`23505`** — Postgres unique constraint violation. Returned as 409 in register (duplicate profile) and join team (already a member).

## Security

**No Row Level Security (RLS) policies are configured on any Supabase table.** The database currently has zero RLS policies. The only thing preventing one user from reading or modifying another user's data is that:

1. Every server-side query uses the Supabase **service-role key** (`SUPABASE_SERVICE_ROLE_KEY`), which bypasses RLS entirely, and
2. All authorization — role checks, team-membership checks, ownership checks — is enforced by hand in application code inside route handlers and services, not by the database.

This means the application relies **entirely on server-side authorization checks**, with no database-level safety net behind them. Concretely:

- **The service-role key must never be exposed to the client.** It lives only in `server/.env` (never committed) and must never be sent in an API response, bundled into client-side code, or logged.
- **Any new feature that queries Supabase must go through the server API layer — never directly from the browser.** `client/src/services/supabase.js` (the anon-key client) exists *only* for `supabase.auth.*` calls (sign up, sign in, session/token management). All data reads and writes must go through `client/src/services/api.js` → `server/src/routes` → `controllers` → `services`. A direct `supabase.from(...)` call from client code would bypass every authorization check this app has, since there's no RLS layer to catch what application code misses.
- **Adding RLS policies is a planned improvement for a future security hardening pass** — it has not been done yet. Until it is, do not assume the database provides any protection on its own; every new endpoint needs its own explicit ownership/role check, following the existing pattern in `server/src/services/athleteService.js`'s `getAthleteProfile(athleteId, coachId)`.

## Brand colors (for UI work)

```
Orange  #F75709  — coach-facing UI, primary buttons, CTAs
Blue    #308EBD  — athlete-facing UI
Yellow  #F0BE24  — badges, streaks, recognition only
Black   #000000
White   #FFFFFF

Dark mode:  background #0F0F0F, cards #1A1A1A
Light mode: background #FFFFFF, cards #F7F7F7
```

Headings: Calibri or geometric sans-serif. Body: Inter or system-ui.
