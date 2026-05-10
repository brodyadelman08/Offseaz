\# OFFSEAZ — CLAUDE.md



\## What This Project Is

Offseaz is a coach-first offseason athletic training platform.

It connects coaches and athletes between sports seasons.

Coaches assign training plans, athletes log workouts, and

coaches get automated visibility into who is working and

who isn't — without chasing anyone.



\## Tech Stack

\- Frontend: React (inside /client)

\- Backend: Express + Node.js (inside /server)

\- Database: Supabase

\- Email: Resend (for automated weekly summaries)

\- Hosting: Vercel (frontend) + Railway (backend)



\## User Roles — 2 Total

1\. Coach

2\. Athlete

No admin panel at MVP stage.



\## MVP Features — 7 Total

1\. Authentication — email login, two roles (coach + athlete),

&#x20;  team creation, shareable invite link

2\. Needs Analysis Survey — athlete fills out sport, position,

&#x20;  goals, weaknesses, injury history, equipment, time per week.

&#x20;  Auto-populates athlete profile. Coach sees all results on dashboard.

3\. Blueprint System (Manual) — coach picks from templates or

&#x20;  builds a weekly plan. Athletes see it week by week.

4\. Workout Logging — completed/partial/skipped, effort rating,

&#x20;  optional short note. Feeds coach dashboard immediately.

5\. Accountability Dashboard — real-time activity feed, streak

&#x20;  tracking, effort visibility, automated weekly email summary to coach.

6\. Basic Messenger — coach sends group announcements or

&#x20;  individual messages to athletes.

7\. Athlete Profile — survey data plus session log history.



\## What Is NOT In MVP

\- Auto-generated blueprints

\- Video or photo upload

\- End-of-season reports

\- Profile verification

\- Group feed or peer comments

\- Leaderboards or rankings

\- Progress charts or trend analysis

\- Athlete-to-athlete messaging

\- Admin panel

\- AI features of any kind



\## Coach Flow — 11 Steps

1\. Create account with email

2\. Complete coach profile (school, sport, preferences)

3\. Create team, receive shareable invite link

4\. Send link to athletes

5\. Athletes join, populate dashboard

6\. Build weekly training plan (templates or manual)

7\. Assign plan to team or individuals

8\. Athletes begin logging workouts

9\. Coach receives automated weekly summary

10\. Coach monitors accountability dashboard

11\. Coach sends messages via messenger



\## Athlete Flow — 9 Steps

1\. Receive invite link, create account

2\. Complete onboarding walkthrough

3\. Fill out Needs Analysis Survey

4\. Profile auto-populated from survey

5\. Coach notified of completed onboarding

6\. View weekly training plan

7\. Train

8\. Log session (completed/partial/skipped, effort, note)

9\. Receive messages from coach



\## Rules For Every Session

\- Always read this file before doing anything

\- Build one feature at a time

\- Never combine multiple features in one session

\- Use plan mode for every new feature

\- After each feature is complete and tested, stop.

&#x20; User will /clear and start a new session for the next feature.

\- Never delete working code to start over

\- Always confirm before making large structural changes

\- Keep the client and server folders completely separate

\- All environment variables go in .env files, never hardcoded



\## Build Order

Phase 1 — Project setup and folder structure

Phase 2 — Authentication (login, roles, team creation, invite link)

Phase 3 — Needs Analysis Survey

Phase 4 — Blueprint System

Phase 5 — Workout Logging

Phase 6 — Accountability Dashboard

Phase 7 — Automated Weekly Summary Email

Phase 8 — Basic Messenger

Phase 9 — Athlete Profile

