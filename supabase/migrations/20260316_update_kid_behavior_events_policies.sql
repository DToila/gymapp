alter table public.kid_behavior_events enable row level security;

drop policy if exists kid_behavior_events_select_authenticated on public.kid_behavior_events;
drop policy if exists kid_behavior_events_insert_authenticated on public.kid_behavior_events;
drop policy if exists kid_behavior_events_update_authenticated on public.kid_behavior_events;

drop policy if exists "kid_behavior_select_auth" on public.kid_behavior_events;
drop policy if exists "kid_behavior_insert_auth" on public.kid_behavior_events;
drop policy if exists "kid_behavior_update_auth" on public.kid_behavior_events;

drop policy if exists "kid_behavior_select_anon_auth" on public.kid_behavior_events;
drop policy if exists "kid_behavior_insert_anon_auth" on public.kid_behavior_events;
drop policy if exists "kid_behavior_update_anon_auth" on public.kid_behavior_events;

create policy "kid_behavior_select_anon_auth"
on public.kid_behavior_events
for select
to anon, authenticated
using (true);

create policy "kid_behavior_insert_anon_auth"
on public.kid_behavior_events
for insert
to anon, authenticated
with check (true);

create policy "kid_behavior_update_anon_auth"
on public.kid_behavior_events
for update
to anon, authenticated
using (true)
with check (true);
