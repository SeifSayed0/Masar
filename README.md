# MASAR — Student Operating System

Bilingual Arabic/English responsive MVP for an adaptive student planner.

## Included
- Today dashboard
- Adaptive Planner
- Courses
- Exams / readiness / risk
- Progress
- Focus session
- Recovery flow
- Arabic RTL + English LTR
- Light / dark mode
- LocalStorage prototype persistence
- Supabase schema + RLS

## Run
Open `index.html` or serve this folder with any static server.

## Supabase
Run `supabase.sql` in the Supabase SQL Editor. Replace the localStorage layer in `app.js` with Supabase Auth/queries when connecting production data.

## Product principle
MASAR is not a generic AI tutor. The core differentiator is adaptive planning: understand the student's workload, build a path, observe reality, detect drift, rebuild the remaining path, and tell the student what to study next.
