-- Supabase's Security Advisor flagged "RLS Disabled in Public" on
-- public.attendance (CRITICAL). Checking further with the app's own public
-- key turned up the same problem on public.members and public.notes (never
-- had RLS at all — created out-of-band, like public.leads before it), plus
-- public.class_logs already had RLS enabled but its migration also granted
-- `anon` full select/insert/update (using(true)), letting anyone read or
-- forge class content with no login at all.
--
-- attendance and members keep an open SELECT policy on purpose: the student
-- portal has no real Supabase Auth session (see
-- src/components/student/studentSession.ts — students are identified by a
-- plain localStorage id, not a JWT), so it reads both tables with the
-- public anon key. Writes to both are restricted to `authenticated` (staff),
-- since every insert/update/delete call in lib/database.ts for these tables
-- is only ever reached from staff-only, middleware-protected routes.
-- notes has no anon caller anywhere in the app, so it's locked to
-- `authenticated` entirely.

alter table public.attendance enable row level security;

drop policy if exists "attendance_select_public" on public.attendance;
create policy "attendance_select_public"
on public.attendance
for select
using (true);

drop policy if exists "attendance_insert_authenticated" on public.attendance;
create policy "attendance_insert_authenticated"
on public.attendance
for insert
to authenticated
with check (true);

drop policy if exists "attendance_update_authenticated" on public.attendance;
create policy "attendance_update_authenticated"
on public.attendance
for update
to authenticated
using (true)
with check (true);

drop policy if exists "attendance_delete_authenticated" on public.attendance;
create policy "attendance_delete_authenticated"
on public.attendance
for delete
to authenticated
using (true);

alter table public.members enable row level security;

drop policy if exists "members_select_public" on public.members;
create policy "members_select_public"
on public.members
for select
using (true);

drop policy if exists "members_insert_authenticated" on public.members;
create policy "members_insert_authenticated"
on public.members
for insert
to authenticated
with check (true);

drop policy if exists "members_update_authenticated" on public.members;
create policy "members_update_authenticated"
on public.members
for update
to authenticated
using (true)
with check (true);

drop policy if exists "members_delete_authenticated" on public.members;
create policy "members_delete_authenticated"
on public.members
for delete
to authenticated
using (true);

alter table public.notes enable row level security;

drop policy if exists "notes_select_authenticated" on public.notes;
create policy "notes_select_authenticated"
on public.notes
for select
to authenticated
using (true);

drop policy if exists "notes_insert_authenticated" on public.notes;
create policy "notes_insert_authenticated"
on public.notes
for insert
to authenticated
with check (true);

drop policy if exists "notes_update_authenticated" on public.notes;
create policy "notes_update_authenticated"
on public.notes
for update
to authenticated
using (true)
with check (true);

drop policy if exists "notes_delete_authenticated" on public.notes;
create policy "notes_delete_authenticated"
on public.notes
for delete
to authenticated
using (true);

-- class_logs already had proper `authenticated` policies from its original
-- migration (20260319_create_class_logs.sql) — just remove the `anon` ones
-- layered on top of them. No feature in the app reads or writes class_logs
-- outside the staff-only /schedule page, so nothing legitimate depends on
-- anonymous access here.
drop policy if exists "class_logs_select_anon" on public.class_logs;
drop policy if exists "class_logs_insert_anon" on public.class_logs;
drop policy if exists "class_logs_update_anon" on public.class_logs;
