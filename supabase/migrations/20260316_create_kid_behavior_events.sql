create table if not exists public.kid_behavior_events (
  id uuid primary key default gen_random_uuid(),
  kid_id uuid not null references public.members(id) on delete cascade,
  date date not null,
  value text not null check (value in ('GOOD', 'NEUTRAL', 'BAD')),
  coach_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kid_id, date)
);

alter table public.kid_behavior_events enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'kid_behavior_events'
      and policyname = 'kid_behavior_events_select_authenticated'
  ) then
    create policy kid_behavior_events_select_authenticated
      on public.kid_behavior_events
      for select
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'kid_behavior_events'
      and policyname = 'kid_behavior_events_insert_authenticated'
  ) then
    create policy kid_behavior_events_insert_authenticated
      on public.kid_behavior_events
      for insert
      to authenticated
      with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'kid_behavior_events'
      and policyname = 'kid_behavior_events_update_authenticated'
  ) then
    create policy kid_behavior_events_update_authenticated
      on public.kid_behavior_events
      for update
      to authenticated
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'kid_behavior_events'
      and policyname = 'kid_behavior_events_delete_authenticated'
  ) then
    create policy kid_behavior_events_delete_authenticated
      on public.kid_behavior_events
      for delete
      to authenticated
      using (true);
  end if;
end
$$;

create or replace function public.set_kid_behavior_events_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_set_kid_behavior_events_updated_at on public.kid_behavior_events;
create trigger trg_set_kid_behavior_events_updated_at
before update on public.kid_behavior_events
for each row
execute function public.set_kid_behavior_events_updated_at();
