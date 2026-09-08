# MASAR — Student Operating System

MASAR is a calm, adaptive student workspace focused on one core question: **What should I study now?**

## What is included
- Today command center with a prominent "What should you study now?" priority card.
- Weekly planner with generated study blocks.
- Courses, exams and tasks with create/edit/delete flows.
- Exam readiness and risk indicators.
- Focus mode with pause/resume/finish and session logging.
- Recovery strategies that rebalance open work.
- Progress dashboard and export.
- Search / command palette (`Ctrl/Cmd + K`).
- Arabic RTL + English LTR.
- Light / dark mode.
- Responsive desktop/tablet/mobile navigation.
- Local persistence using `localStorage`.
- Supabase schema prepared in `supabase/schema.sql` for the cloud phase.

## Deploy
This is a static site. Put `index.html`, `app.js`, `styles.css`, `assets/`, and the optional config/deployment files in the repository root. Vercel will deploy automatically from the connected branch.

## Supabase
`supabase/schema.sql` is a database blueprint. Run it in Supabase SQL Editor when moving from the local prototype to the cloud-connected version. Never commit a `service_role` key or other secrets.

## Important
The current release is a fully interactive front-end prototype. The UI flows are functional locally; Supabase Auth and live database synchronization are intentionally the next integration layer.
