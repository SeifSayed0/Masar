# MASAR 3.1.4 — Auth Hard Fix

This build hardens the Supabase Auth UI flow.

Changes:
- Auth click controls run in capture phase and stop the generic app click router from consuming the same click.
- Auth form submit is intercepted explicitly, including Enter key submission.
- The Create account / Sign in button shows a working state and is restored after the request.
- If Supabase is not connected, the UI now shows a clear error instead of silently doing nothing.
- Keeps the 3.1.3 diagnostic confirmation screen and resend action.

Use the existing production Supabase URL/publishable key in `supabase/config.js`.
Do not add a service_role key to the frontend.
