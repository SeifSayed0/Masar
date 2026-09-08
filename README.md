# MASAR 3.0

واجهة وإطار عمل Front-end أعيد بناؤه حول الفكرة الأساسية: **ماذا تذاكر الآن؟** ثم تحويل القرار إلى جلسة، تقدم، وخطة قابلة لإعادة الترتيب.

## التشغيل
لا يوجد build step. ارفع محتويات هذا المجلد إلى GitHub بحيث يكون `index.html` في جذر المستودع، وسيعمل على Vercel/Netlify/static hosting.

## البيانات الحالية
MASAR 3.0 يستخدم طبقة تخزين محلية `localStorage` تحت المفتاح `masar.v4.state`. تم فصل منطق الحالة عن الواجهة بحيث يمكن استبداله بطبقة Supabase لاحقًا.

## ما تم تضمينه
- Today Command Center
- Planner + workload analysis
- Courses CRUD
- Exams CRUD مع جاهزية 0–100
- Tasks CRUD + completion
- Focus mode مع pause/resume/finish وتسجيل الجلسة
- Recovery strategies + إعادة بناء الخطة
- Search / ⌘K
- Notifications
- Progress + export
- RTL/LTR
- Light/Dark
- Mobile navigation
- SVG icon system
- Empty/success/error validation states

## Supabase
`supabase/schema.sql` هو مخطط قاعدة البيانات، لكنه **ليس اتصالًا سحابيًا تلقائيًا**. لا تضع أي service role key في GitHub.

## Cloud mode (Supabase)

MASAR 3.1 keeps working in local mode until Supabase is configured. To enable accounts and cloud persistence:

1. Open `supabase/config.js`.
2. Set your Supabase Project URL and **Publishable key**. Do not use or expose a `service_role`/secret key in the browser.
3. In Supabase SQL Editor, run `supabase/schema.sql`.
4. In Supabase Auth, configure your site URL and redirect URL to your deployed MASAR URL. Hosted Supabase projects may require email confirmation by default.
5. Deploy the repository again on Vercel.

The browser client uses `@supabase/supabase-js` and persistent auth sessions. This follows Supabase's browser client and password-auth flow. See the official docs: https://supabase.com/docs/reference/javascript/initializing and https://supabase.com/docs/guides/auth/passwords.


## 3.1.2 Auth delivery fix
- Signup explicitly requests a confirmation email after Supabase returns a user without a session.
- Unconfirmed password sign-in automatically attempts a confirmation resend.
- PKCE callback and persistent session handling remain enabled.
