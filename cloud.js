(() => {
  const cfg = window.MASAR_SUPABASE || {};
  const ready = Boolean(window.supabase && cfg.url && cfg.publishableKey && !cfg.url.includes('YOUR-PROJECT') && !cfg.publishableKey.includes('YOUR_'));
  let client = null;
  let syncing = false;
  let user = null;

  if (ready) {
    client = window.supabase.createClient(cfg.url, cfg.publishableKey, {
      auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true }
    });
  }

  const isUuid = v => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
  const clone = x => JSON.parse(JSON.stringify(x));

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
    const { data } = await client.auth.getUser();
    user = data.user || null;
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
        <div class="field full"><label>Password</label><input id="cloud-password" type="password" autocomplete="current-password" minlength="6" required></div>
        <div id="cloud-auth-error" class="form-error full" hidden></div>
        <div class="full auth-switch"><span>${signup ? 'Already have an account?' : 'New to Masar?'}</span><button type="button" class="text-btn" data-cloud="toggle-auth">${signup ? 'Sign in' : 'Create account'}</button></div>
      </form>`,
      `<button class="btn" data-action="close-modal">${window.MASAR.t('cancel')}</button><button class="btn btn-primary" data-cloud="submit-auth">${signup ? 'Create account' : 'Sign in'}</button>`
    );
    document.getElementById('modal-root').dataset.authMode = mode;
  }

  async function authSubmit() {
    const root = document.getElementById('modal-root');
    const mode = root.dataset.authMode || 'signin';
    const email = document.getElementById('cloud-email')?.value.trim();
    const password = document.getElementById('cloud-password')?.value;
    const name = document.getElementById('cloud-name')?.value.trim() || '';
    const err = document.getElementById('cloud-auth-error');
    if (!email || !password || password.length < 6 || (mode === 'signup' && !name)) {
      err.hidden = false; err.textContent = 'Please complete the form. Password must be at least 6 characters.'; return;
    }
    err.hidden = true;
    const button = document.querySelector('[data-cloud="submit-auth"]');
    button.disabled = true;
    let result;
    if (mode === 'signup') {
      result = await client.auth.signUp({ email, password, options: { data: { name, major: window.MASAR.getState().student.major || '' }, emailRedirectTo: location.origin + location.pathname } });
    } else {
      result = await client.auth.signInWithPassword({ email, password });
    }
    button.disabled = false;
    if (result.error) { err.hidden = false; err.textContent = result.error.message; return; }
    if (mode === 'signup' && !result.data.session) {
      window.MASAR.modal('Check your email', 'Supabase may require email confirmation.', '<div class="empty"><strong>Account created.</strong><p>Confirm your email, then return and sign in.</p></div>', `<button class="btn btn-primary" data-action="close-modal">${window.MASAR.t('close')}</button>`);
      return;
    }
    user = result.data.user || result.data.session?.user || null;
    await loadCloud();
    window.MASAR.closeModal();
    window.MASAR.render();
    window.MASAR.toast('Cloud sync connected');
  }

  async function loadCloud() {
    if (!client || !user) return;
    const [profile, courses, exams, tasks, sessions] = await Promise.all([
      client.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      client.from('courses').select('*').order('created_at'),
      client.from('exams').select('*').order('date'),
      client.from('tasks').select('*').order('date'),
      client.from('study_sessions').select('*').order('date')
    ]);
    const s = clone(window.MASAR.getState());
    if (profile.data) {
      s.student = { name: profile.data.name || s.student.name, major: profile.data.major || s.student.major };
      s.lang = profile.data.language || s.lang; s.theme = profile.data.theme || s.theme;
      s.settings = { adaptive: profile.data.adaptive ?? true, notifications: profile.data.notifications ?? true };
    }
    if (courses.data?.length) s.courses = courses.data.map(x => ({id:x.id,name:x.name,code:x.code||'',progress:x.progress||0,color:'blue'}));
    if (exams.data?.length) s.exams = exams.data.map(x => ({id:x.id,title:x.title,courseId:x.course_id,date:x.date,readiness:x.readiness||0}));
    if (tasks.data?.length) s.tasks = tasks.data.map(x => ({id:x.id,title:x.title,courseId:x.course_id,date:x.date,minutes:x.minutes,priority:x.priority,done:x.done}));
    if (sessions.data) s.sessions = sessions.data.map(x => ({id:x.id,taskId:x.task_id,title:x.title,courseId:x.course_id,minutes:x.minutes,date:x.date}));
    window.MASAR.setState(s);
  }

  async function syncCloud() {
    if (!client || !user || syncing) return;
    syncing = true;
    try {
      const s = clone(window.MASAR.getState());
      await client.from('profiles').upsert({ id:user.id, name:s.student.name, major:s.student.major, language:s.lang, theme:s.theme, adaptive:s.settings.adaptive, notifications:s.settings.notifications });
      const maps = new Map();
      for (const c of s.courses) {
        const payload = {user_id:user.id,name:c.name,code:c.code||'',progress:Math.max(0,Math.min(100,Number(c.progress)||0))};
        if (isUuid(c.id)) { await client.from('courses').upsert({id:c.id,...payload}); maps.set(c.id,c.id); }
        else { const {data,error}=await client.from('courses').insert(payload).select('id').single(); if(!error&&data){maps.set(c.id,data.id); c.id=data.id;} }
      }
      for (const e of s.exams) {
        const payload={user_id:user.id,title:e.title,date:e.date,readiness:e.readiness||0,course_id:maps.get(e.courseId)||e.courseId||null};
        if(isUuid(e.id)) await client.from('exams').upsert({id:e.id,...payload}); else { const {data}=await client.from('exams').insert(payload).select('id').single(); if(data)e.id=data.id; }
      }
      for (const x of s.tasks) {
        const payload={user_id:user.id,title:x.title,date:x.date,minutes:x.minutes,priority:x.priority,done:Boolean(x.done),course_id:maps.get(x.courseId)||x.courseId||null};
        if(isUuid(x.id)) await client.from('tasks').upsert({id:x.id,...payload}); else { const {data}=await client.from('tasks').insert(payload).select('id').single(); if(data)x.id=data.id; }
      }
      for (const x of s.sessions) {
        const payload={user_id:user.id,task_id:isUuid(x.taskId)?x.taskId:null,title:x.title,course_id:maps.get(x.courseId)||x.courseId||null,minutes:x.minutes,date:x.date};
        if(isUuid(x.id)) await client.from('study_sessions').upsert({id:x.id,...payload}); else await client.from('study_sessions').insert(payload);
      }
      window.MASAR.setState(s);
    } catch (e) { console.warn('MASAR cloud sync failed',e); }
    finally { syncing=false; }
  }

  window.addEventListener('masar:state-change', () => { if (user) syncCloud(); });
  document.addEventListener('click', e => {
    const el=e.target.closest('[data-cloud]'); if(!el)return;
    const action=el.dataset.cloud;
    if(action==='account'){accountModal();}
    if(action==='toggle-auth'){renderAuth((document.getElementById('modal-root').dataset.authMode||'signin')==='signin'?'signup':'signin');}
    if(action==='submit-auth'){authSubmit();}
    if(action==='signout'){client.auth.signOut().then(()=>{user=null; window.MASAR.closeModal(); window.MASAR.toast('Signed out');});}
  });
  document.addEventListener('click', e => { if(e.target.closest('[data-action="account"]')) accountModal(); });

  async function bootstrap(){
    if(!client) return;
    const {data}=await client.auth.getSession();
    user=data.session?.user||null;
    client.auth.onAuthStateChange(async (_event, session)=>{ user=session?.user||null; if(user) await loadCloud(); });
    if(user) await loadCloud();
  }
  bootstrap();
})();
