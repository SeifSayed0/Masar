# MASAR 2.0 — Student Operating System

A polished static front-end prototype for MASAR, built as a student command center rather than a generic AI tutor.

## Deploy
- Vercel: import the GitHub repository. No build command is required.
- Netlify: publish the repository root.
- The `index.html` file must remain at the project root.

## Included
- Today command center
- Adaptive weekly planner
- Courses / exams / tasks
- Recovery / plan rebuild flows
- Focus mode
- Progress analytics
- Search / command shortcut (Ctrl/Cmd + K)
- Arabic RTL + English LTR
- Light / dark mode
- Responsive mobile navigation
- Local demo persistence
- Supabase schema in `/supabase`

## Production note
The UI is fully client-side and uses localStorage for the demo. The Supabase schema is prepared for the cloud phase; production auth, realtime sync and the real adaptive scheduling engine should be connected before launch.
