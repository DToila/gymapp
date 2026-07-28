create extension if not exists pgcrypto;

create table if not exists public.class_logs (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.schedule_slots(id) on delete cascade,
  date date not null,
  topic text null,
  content text not null,
  teacher_id uuid null references public.profiles(id),
  attendees text[] null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (schedule_id, date)
);

create or replace function public.set_class_logs_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_class_logs_updated_at on public.class_logs;
create trigger trg_class_logs_updated_at
before update on public.class_logs
for each row
execute procedure public.set_class_logs_updated_at();

alter table public.class_logs enable row level security;

drop policy if exists "class_logs_select_authenticated" on public.class_logs;
create policy "class_logs_select_authenticated"
on public.class_logs
for select
to authenticated
using (true);

drop policy if exists "class_logs_insert_authenticated" on public.class_logs;
create policy "class_logs_insert_authenticated"
on public.class_logs
for insert
to authenticated
with check (true);

drop policy if exists "class_logs_update_authenticated" on public.class_logs;
create policy "class_logs_update_authenticated"
on public.class_logs
for update
to authenticated
using (true)
with check (true);

drop policy if exists "class_logs_select_anon" on public.class_logs;
create policy "class_logs_select_anon"
on public.class_logs
for select
to anon
using (true);

drop policy if exists "class_logs_insert_anon" on public.class_logs;
create policy "class_logs_insert_anon"
on public.class_logs
for insert
to anon
with check (true);

drop policy if exists "class_logs_update_anon" on public.class_logs;
create policy "class_logs_update_anon"
on public.class_logs
for update
to anon
using (true)
with check (true);

insert into public.class_logs (
  schedule_id, date, topic, content, teacher_id, attendees, created_at, updated_at
)
select
  slot_id,
  date,
  topic,
  coalesce(nullif(trim(techniques), ''), nullif(trim(topic), '')) as content,
  coach_primary_id,
  null,
  updated_at,
  updated_at
from public.class_plans
where coalesce(nullif(trim(techniques), ''), nullif(trim(topic), '')) is not null
on conflict (schedule_id, date) do nothing;
