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
