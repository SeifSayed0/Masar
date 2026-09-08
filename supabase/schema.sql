create extension if not exists pgcrypto;
create table if not exists profiles (id uuid primary key references auth.users(id) on delete cascade, name text, major text, language text default 'ar', theme text default 'light', adaptive boolean default true, notifications boolean default true, created_at timestamptz default now());
create table if not exists courses (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, name text not null, code text, progress int not null default 0 check(progress between 0 and 100), created_at timestamptz default now());
create table if not exists exams (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, course_id uuid references courses(id) on delete set null, title text not null, date date not null, readiness int not null default 0 check(readiness between 0 and 100), created_at timestamptz default now());
create table if not exists tasks (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, course_id uuid references courses(id) on delete set null, title text not null, date date not null, minutes int not null default 30 check(minutes between 5 and 600), priority text not null default 'medium' check(priority in ('high','medium','low')), done boolean default false, created_at timestamptz default now());
create table if not exists study_sessions (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, task_id uuid references tasks(id) on delete set null, title text, course_id uuid references courses(id) on delete set null, minutes int not null default 0, date date not null default current_date, created_at timestamptz default now());
create table if not exists plan_events (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, task_id uuid references tasks(id) on delete cascade, date date not null, minutes int not null default 30, version int not null default 1, created_at timestamptz default now());
alter table profiles enable row level security; alter table courses enable row level security; alter table exams enable row level security; alter table tasks enable row level security; alter table study_sessions enable row level security; alter table plan_events enable row level security;
create policy "own profile" on profiles for all using (id=auth.uid()) with check (id=auth.uid());
create policy "own courses" on courses for all using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "own exams" on exams for all using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "own tasks" on tasks for all using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "own sessions" on study_sessions for all using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "own plan events" on plan_events for all using (user_id=auth.uid()) with check (user_id=auth.uid());


-- MASAR production grants + automatic profile creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, major)
  values (new.id, coalesce(new.raw_user_meta_data->>'name',''), coalesce(new.raw_user_meta_data->>'major',''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

grant select, insert, update, delete on public.profiles, public.courses, public.exams, public.tasks, public.study_sessions, public.plan_events to authenticated;
