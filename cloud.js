(() => {
  const cfg = window.MASAR_SUPABASE || {};
  const ready = Boolean(
    window.supabase &&
    cfg.url &&
    cfg.publishableKey &&
    !cfg.url.includes('YOUR-PROJECT') &&
    !cfg.publishableKey.includes('YOUR_')
  );

  let client = null;
  let syncing = false;
  let user = null;
  let bootstrapped = false;

  if (ready) {
    client = window.supabase.createClient(cfg.url, cfg.publishableKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      }
    });
  }

  console.info('[MASAR AUTH] build=3.1.3 ready=', ready, 'project=', cfg.url || '(missing)');

  const isUuid = v =>
    typeof v === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

  const clone = x => JSON.parse(JSON.stringify(x));
  const redirectUrl = () => location.origin + location.pathname;
  const safe = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  function authDiagnostics(result, email) {
    const data = result?.data || {};
    const u = data.user || null;
    return [
      `Project: ${safe(cfg.url)}`,
      `Email: ${safe(email)}`,
      `User returned: ${u ? 'yes' : 'no'}`,
      `User ID: ${safe(u?.id || '—')}`,
      `Session returned: ${data.session ? 'yes' : 'no'}`,
      `Confirmed: ${u?.email_confirmed_at ? 'yes' : 'no'}`,
      `Identities: ${Array.isArray(u?.identities) ? u.identities.length : '—'}`
    ].join('<br>');
  }

  function authErrorMessage(error) {
    const message = String(error?.message || error || 'Something went wrong.');
    const lower = message.toLowerCase();
    if (lower.includes('email not confirmed')) {
      return 'البريد الإلكتروني لم يتم تأكيده بعد. افتح رسالة التأكيد من Supabase ثم جرّب تسجيل الدخول مرة أخرى.';
    }
    if (lower.includes('invalid login credentials')) {
      return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
    }
    return message;
  }

  async function handleAuthCallback() {
    if (!client) return false;

    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
    const hasTokens = hash.has('access_token') && hash.has('refresh_token');

    try {
      // PKCE confirmation / magic-link callback.
      if (code) {
        const { data, error } = await client.auth.exchangeCodeForSession(code);
        if (error) {
          console.warn('MASAR auth callback exchange failed:', error);
          return false;
        }
        user = data.session?.user || data.user || null;
        history.replaceState({}, document.title, url.pathname);
        return Boolean(user);
      }

      // Legacy/implicit callback. Supabase JS can normally process this itself,
      // but explicitly setting the session makes the behavior deterministic.
      if (hasTokens) {
        const { data, error } = await client.auth.setSession({
          access_token: hash.get('access_token'),
          refresh_token: hash.get('refresh_token')
        });
        if (error) {
          console.warn('MASAR token callback failed:', error);
          return false;
        }
        user = data.session?.user || null;
        history.replaceState({}, document.title, url.pathname);
        return Boolean(user);
      }
    } catch (e) {
      console.warn('MASAR auth callback error:', e);
    }

    return false;
  }

  async function accountModal() {
    if (!client) {
      window.MASAR.modal(
        window.MASAR.t('student'),
        'Supabase is not configured yet.',
        `<div class="empty"><strong>Cloud mode is ready.</strong><p>Open <code>supabase/config.js</code> and add your Supabase Project URL + Publishable key.</p><p>Local mode continues to work until then.</p></div>`,
        `<button class="btn btn-primary" data-action="close-modal">${window.MASAR.t('close')}</button>`
      );
      return;
    }

    const { data, error } = await client.auth.getUser();
    if (!error) user = data.user || null;

    if (user) {
      window.MASAR.modal(
        window.MASAR.t('student'),
        user.email || '',
        `<div class="account-panel"><div class="notification"><strong>Cloud sync is active</strong><p>Your Masar data is connected to your account.</p></div></div>`,
        `<button class="btn danger-btn" data-cloud="signout">Sign out</button><button class="btn" data-action="close-modal">${window.MASAR.t('close')}</button>`
      );
      return;
    }

    renderAuth('signin');
  }

  function renderAuth(mode) {
    const signup = mode === 'signup';
    window.MASAR.modal(
      signup ? 'Create your Masar account' : 'Sign in to Masar',
      signup ? 'Keep your plan synced across devices.' : 'Your study plan is waiting for you.',
      `<form id="cloud-auth-form" class="form-grid" novalidate>
        ${signup ? `<div class="field full"><label>Name</label><input id="cloud-name" autocomplete="name" maxlength="80" required></div>` : ''}
        <div class="field full"><label>Email</label><input id="cloud-email" type="email" autocomplete="email" required></div>
        <div class="field full"><label>Password</label><input id="cloud-password" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" minlength="6" required></div>
        <div id="cloud-auth-error" class="form-error full" hidden></div>
        <div id="cloud-resend-wrap" class="full" hidden>
          <button type="button" class="text-btn" data-cloud="resend-confirmation">Resend confirmation email</button>
        </div>
        <div class="full auth-switch"><span>${signup ? 'Already have an account?' : 'New to Masar?'}</span><button type="button" class="text-btn" data-cloud="toggle-auth">${signup ? 'Sign in' : 'Create account'}</button></div>
      </form>`,
      `<button class="btn" data-action="close-modal">${window.MASAR.t('cancel')}</button><button class="btn btn-primary" data-cloud="submit-auth">${signup ? 'Create account' : 'Sign in'}</button>`
    );
    document.getElementById('modal-root').dataset.authMode = mode;
  }

  async function authSubmit() {
    if (!client) return;

    const root = document.getElementById('modal-root');
    const mode = root.dataset.authMode || 'signin';
    const email = document.getElementById('cloud-email')?.value.trim();
    const password = document.getElementById('cloud-password')?.value;
    const name = document.getElementById('cloud-name')?.value.trim() || '';
    const err = document.getElementById('cloud-auth-error');
    const resend = document.getElementById('cloud-resend-wrap');

    if (!email || !password || password.length < 6 || (mode === 'signup' && !name)) {
      err.hidden = false;
      err.textContent = 'Please complete the form. Password must be at least 6 characters.';
      return;
    }

    err.hidden = true;
    resend.hidden = true;

    const button = document.querySelector('[data-cloud="submit-auth"]');
    button.disabled = true;

    let result;
    try {
      if (mode === 'signup') {
        result = await client.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
              major: window.MASAR.getState().student.major || ''
            },
            emailRedirectTo: redirectUrl()
          }
        });
      } else {
        result = await client.auth.signInWithPassword({ email, password });
      }
    } catch (e) {
      result = { error: e };
    } finally {
      button.disabled = false;
    }

    if (result.error) {
      err.hidden = false;
      err.textContent = authErrorMessage(result.error);
      if (String(result.error.message || '').toLowerCase().includes('email not confirmed')) {
        resend.hidden = false;
        try {
          await client.auth.resend({
            type: 'signup',
            email,
            options: { emailRedirectTo: redirectUrl() }
          });
          err.textContent = 'البريد الإلكتروني لم يتم تأكيده بعد. أعدنا إرسال رسالة التأكيد؛ راجع Inbox وSpam/Junk.';
        } catch (_) {}
      }
      return;
    }

    if (mode === 'signup' && !result.data.session) {
      // With email confirmations enabled, Supabase intentionally returns a user
      // without a session. The first confirmation message is generated by the
      // Auth server. Do not immediately call resend here: doing so can hit the
      // per-user email cooldown and obscure the real result.
      const confirmationUser = result.data.user || null;
      const confirmationState = confirmationUser?.email_confirmed_at ? 'already confirmed' : 'waiting for confirmation';
      const diagnostics = authDiagnostics(result, email);

      window.MASAR.modal(
        'Check your email',
        'Your Masar account was created.',
        `<div class="empty">
          <strong>Confirmation required.</strong>
          <p>Supabase reports this account as <strong>${safe(confirmationState)}</strong>.</p>
          <p>Check Inbox and Spam/Junk for the confirmation message.</p>
          <div class="notification" style="margin-top:12px"><strong>Auth status</strong><p>${diagnostics}</p></div>
          <p class="form-hint">If no message arrives, use <strong>Resend email</strong> below. If Resend still shows no outgoing message, the problem is on the Auth/SMTP side rather than the MASAR frontend.</p>
        </div>`,
        `<button class="btn" data-action="close-modal">${window.MASAR.t('close')}</button><button class="btn btn-primary" data-cloud="resend-confirmation" data-resend-email="${safe(email)}">Resend email</button>`
      );
      return;
    }

    user = result.data.user || result.data.session?.user || null;
    if (user) await loadCloud();
    window.MASAR.closeModal();
    window.MASAR.render();
    window.MASAR.toast('Cloud sync connected');
  }

  async function resendConfirmation(emailOverride) {
    if (!client) return;
    const email = emailOverride || document.getElementById('cloud-email')?.value.trim();
    if (!email) return;

    const button = document.querySelector('[data-cloud="resend-confirmation"]');
    if (button) button.disabled = true;

    let result;
    try {
      result = await client.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: redirectUrl() }
      });
    } catch (e) {
      result = { error: e };
    } finally {
      if (button) button.disabled = false;
    }

    if (result.error) {
      window.MASAR.modal(
        'Confirmation email',
        'Supabase returned an error.',
        `<div class="empty"><strong>Resend failed.</strong><p>${safe(authErrorMessage(result.error))}</p><div class="notification"><strong>What this means</strong><p>The MASAR frontend reached Supabase successfully, but Supabase rejected the resend request. Check the Supabase Auth settings/logs and Resend delivery log.</p></div></div>`,
        `<button class="btn btn-primary" data-action="close-modal">${window.MASAR.t('close')}</button>`
      );
      return;
    }

    window.MASAR.modal(
      'Confirmation email requested',
      'Supabase accepted the resend request.',
      `<div class="empty"><strong>Request accepted.</strong><p>Check Inbox and Spam/Junk for <strong>${safe(email)}</strong>.</p><p>If Resend → Emails remains empty after this request, send us the exact message shown here and we will trace the Supabase configuration next.</p></div>`,
      `<button class="btn btn-primary" data-action="close-modal">${window.MASAR.t('close')}</button>`
    );
  }

  async function loadCloud() {
    if (!client || !user) return;

    const uid = user.id;
    const [profile, courses, exams, tasks, sessions] = await Promise.all([
      client.from('profiles').select('*').eq('id', uid).maybeSingle(),
      client.from('courses').select('*').eq('user_id', uid).order('created_at'),
      client.from('exams').select('*').eq('user_id', uid).order('date'),
      client.from('tasks').select('*').eq('user_id', uid).order('date'),
      client.from('study_sessions').select('*').eq('user_id', uid).order('date')
    ]);

    const errors = [profile, courses, exams, tasks, sessions].filter(x => x.error);
    if (errors.length) {
      console.warn('MASAR cloud load failed:', errors.map(x => x.error));
      return;
    }

    const s = clone(window.MASAR.getState());

    if (profile.data) {
      s.student = {
        name: profile.data.name || s.student.name,
        major: profile.data.major || s.student.major
      };
      s.lang = profile.data.language || s.lang;
      s.theme = profile.data.theme || s.theme;
      s.settings = {
        adaptive: profile.data.adaptive ?? true,
        notifications: profile.data.notifications ?? true
      };
    }

    // An empty remote collection should also be respected. This prevents old
    // local records from silently reappearing after the user signs in.
    s.courses = (courses.data || []).map(x => ({
      id: x.id,
      name: x.name,
      code: x.code || '',
      progress: x.progress || 0,
      color: 'blue'
    }));
    s.exams = (exams.data || []).map(x => ({
      id: x.id,
      title: x.title,
      courseId: x.course_id,
      date: x.date,
      readiness: x.readiness || 0
    }));
    s.tasks = (tasks.data || []).map(x => ({
      id: x.id,
      title: x.title,
      courseId: x.course_id,
      date: x.date,
      minutes: x.minutes,
      priority: x.priority,
      done: x.done
    }));
    s.sessions = (sessions.data || []).map(x => ({
      id: x.id,
      taskId: x.task_id,
      title: x.title,
      courseId: x.course_id,
      minutes: x.minutes,
      date: x.date
    }));

    // setState triggers local persistence only; the syncing guard prevents a
    // cloud-load from starting a second upload cycle.
    window.MASAR.setState(s);
  }

  async function syncCloud() {
    if (!client || !user || syncing) return;
    syncing = true;

    try {
      const uid = user.id;
      const s = clone(window.MASAR.getState());

      const profileResult = await client.from('profiles').upsert({
        id: uid,
        name: s.student.name,
        major: s.student.major,
        language: s.lang,
        theme: s.theme,
        adaptive: s.settings.adaptive,
        notifications: s.settings.notifications
      });
      if (profileResult.error) throw profileResult.error;

      const maps = new Map();

      for (const c of s.courses) {
        const payload = {
          user_id: uid,
          name: c.name,
          code: c.code || '',
          progress: Math.max(0, Math.min(100, Number(c.progress) || 0))
        };

        if (isUuid(c.id)) {
          const { error } = await client.from('courses').upsert({ id: c.id, ...payload });
          if (error) throw error;
          maps.set(c.id, c.id);
        } else {
          const { data, error } = await client.from('courses').insert(payload).select('id').single();
          if (error) throw error;
          maps.set(c.id, data.id);
          c.id = data.id;
        }
      }

      for (const e of s.exams) {
        const payload = {
          user_id: uid,
          title: e.title,
          date: e.date,
          readiness: Math.max(0, Math.min(100, Number(e.readiness) || 0)),
          course_id: maps.get(e.courseId) || (isUuid(e.courseId) ? e.courseId : null)
        };
        if (isUuid(e.id)) {
          const { error } = await client.from('exams').upsert({ id: e.id, ...payload });
          if (error) throw error;
        } else {
          const { data, error } = await client.from('exams').insert(payload).select('id').single();
          if (error) throw error;
          if (data) e.id = data.id;
        }
      }

      for (const x of s.tasks) {
        const payload = {
          user_id: uid,
          title: x.title,
          date: x.date,
          minutes: x.minutes,
          priority: x.priority,
          done: Boolean(x.done),
          course_id: maps.get(x.courseId) || (isUuid(x.courseId) ? x.courseId : null)
        };
        if (isUuid(x.id)) {
          const { error } = await client.from('tasks').upsert({ id: x.id, ...payload });
          if (error) throw error;
        } else {
          const { data, error } = await client.from('tasks').insert(payload).select('id').single();
          if (error) throw error;
          if (data) x.id = data.id;
        }
      }

      for (const x of s.sessions) {
        const payload = {
          user_id: uid,
          task_id: isUuid(x.taskId) ? x.taskId : null,
          title: x.title,
          course_id: maps.get(x.courseId) || (isUuid(x.courseId) ? x.courseId : null),
          minutes: x.minutes,
          date: x.date
        };
        if (isUuid(x.id)) {
          const { error } = await client.from('study_sessions').upsert({ id: x.id, ...payload });
          if (error) throw error;
        } else {
          const { error } = await client.from('study_sessions').insert(payload);
          if (error) throw error;
        }
      }

      // Save newly assigned UUIDs locally without triggering another upload.
      window.MASAR.setState(s);
    } catch (e) {
      console.warn('MASAR cloud sync failed', e);
    } finally {
      syncing = false;
    }
  }

  window.addEventListener('masar:state-change', () => {
    if (user) syncCloud();
  });

  document.addEventListener('click', e => {
    const el = e.target.closest('[data-cloud]');
    if (!el) return;

    const action = el.dataset.cloud;
    if (action === 'account') accountModal();
    if (action === 'toggle-auth') {
      const mode = document.getElementById('modal-root').dataset.authMode || 'signin';
      renderAuth(mode === 'signin' ? 'signup' : 'signin');
    }
    if (action === 'submit-auth') authSubmit();
    if (action === 'resend-confirmation') resendConfirmation(el.dataset.resendEmail);
    if (action === 'signout') {
      client.auth.signOut().then(({ error }) => {
        if (error) {
          window.MASAR.toast(authErrorMessage(error));
          return;
        }
        user = null;
        window.MASAR.closeModal();
        window.MASAR.toast('Signed out');
      });
    }
  });

  document.addEventListener('click', e => {
    if (e.target.closest('[data-action="account"]')) accountModal();
  });

  async function bootstrap() {
    if (!client) return;

    // Register the listener BEFORE reading the session so a confirmation
    // redirect cannot race past the SIGNED_IN event.
    client.auth.onAuthStateChange((_event, session) => {
      user = session?.user || null;
      if (user) {
        // Do not await inside the auth callback; Supabase recommends keeping
        // the callback free of long-running Supabase calls.
        setTimeout(() => loadCloud(), 0);
      }
    });

    await handleAuthCallback();

    const { data, error } = await client.auth.getSession();
    if (error) {
      console.warn('MASAR getSession failed:', error);
      return;
    }

    user = data.session?.user || user || null;
    bootstrapped = true;

    if (user) {
      await loadCloud();
      // If the app loaded from a confirmation URL, give the user a clear cue.
      if (new URLSearchParams(location.search).has('code')) {
        window.MASAR.toast('Email confirmed — Cloud sync connected');
      }
    }
  }

  bootstrap();
})();
