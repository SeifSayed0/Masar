# MASAR — Student Operating System

A production-oriented bilingual Arabic/English static frontend inspired by the supplied Student OS reference. The reference's strongest ideas were carried over and reorganized into a cleaner MASAR product: Today-first dashboard, adaptive plan/recovery, courses, exams/readiness, tasks, focus sessions, progress, command search, theme/language controls, onboarding concepts, and Supabase-ready data architecture.

## Deploy immediately
Upload the whole folder to Vercel, Netlify, GitHub Pages, or any static host. `index.html` is the entry point. No build step is required.

## Included
- `index.html` — entry point
- `styles.css` — responsive design system
- `app.js` — application state, routing, UI and interactions
- `assets/favicon.svg` — brand favicon
- `supabase/schema.sql` — Auth/RLS/database schema
- `supabase/config.example.js` — safe browser configuration template

## Product features
- Arabic RTL + English LTR
- Light + dark mode
- Today dashboard with a single recommended priority
- Weekly planner
- Adaptive recovery modal
- Courses and progress
- Exams, countdown and readiness/risk
- Tasks
- Focus timer with pause/resume/complete
- Progress report export
- Global search shortcut Ctrl/Cmd+K
- Local persistence for instant demo use
- Supabase schema for cloud persistence

## Important security
Only a public Supabase `anon` key belongs in frontend code. Never expose `service_role` credentials in a browser.

## Next production integration
Replace the localStorage adapter in `app.js` with Supabase Auth + table queries, then implement the adaptive planning engine as a server-side function. The database is already structured for courses, exams, tasks, sessions and plan events.
