create extension if not exists pgcrypto;

create table if not exists public.schedule_slots (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  day_of_week text not null,
  start_time time not null,
  end_time time not null,
  program text not null,
  kids_group text null,
  gi_type text not null,
  tags text[] null,
  default_coach_id uuid null references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.schedule_slots
  add column if not exists code text,
  add column if not exists kids_group text,
  add column if not exists gi_type text,
  add column if not exists tags text[],
  add column if not exists default_coach_id uuid references public.profiles(id),
  add column if not exists created_at timestamptz not null default now();

alter table public.schedule_slots
  alter column day_of_week set not null,
  alter column program set not null;

alter table public.schedule_slots
  alter column start_time type time using start_time::time,
  alter column end_time type time using end_time::time;

update public.schedule_slots
set gi_type = 'GI'
where gi_type is null;

update public.schedule_slots
set code = concat(lower(day_of_week), '-', extract(hour from start_time)::int, '-', extract(minute from start_time)::int, '-', lower(program))
where (code is null or code = '');

alter table public.schedule_slots
  alter column code set not null,
  alter column gi_type set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'schedule_slots_code_key'
      and conrelid = 'public.schedule_slots'::regclass
  ) then
    alter table public.schedule_slots add constraint schedule_slots_code_key unique (code);
  end if;
end $$;

create table if not exists public.class_plans (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.schedule_slots(id) on delete cascade,
  date date not null,
  topic text null,
  techniques text null,
  coach_primary_id uuid null references public.profiles(id),
  coach_secondary_id uuid null references public.profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid null,
  unique(slot_id, date)
);

alter table public.class_plans
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists updated_by uuid null;

create or replace function public.set_class_plans_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_class_plans_updated_at on public.class_plans;
create trigger trg_class_plans_updated_at
before update on public.class_plans
for each row
execute procedure public.set_class_plans_updated_at();

alter table public.schedule_slots enable row level security;
alter table public.class_plans enable row level security;

drop policy if exists "schedule_slots_select_authenticated" on public.schedule_slots;
create policy "schedule_slots_select_authenticated"
on public.schedule_slots
for select
to authenticated
using (true);

drop policy if exists "schedule_slots_write_authenticated" on public.schedule_slots;
create policy "schedule_slots_write_authenticated"
on public.schedule_slots
for all
to authenticated
using (true)
with check (true);

drop policy if exists "class_plans_select_authenticated" on public.class_plans;
create policy "class_plans_select_authenticated"
on public.class_plans
for select
to authenticated
using (true);

drop policy if exists "class_plans_insert_authenticated" on public.class_plans;
create policy "class_plans_insert_authenticated"
on public.class_plans
for insert
to authenticated
with check (true);

drop policy if exists "class_plans_update_authenticated" on public.class_plans;
create policy "class_plans_update_authenticated"
on public.class_plans
for update
to authenticated
using (true)
with check (true);

-- Temporary anon access for current app (remove once auth is enforced)
drop policy if exists "schedule_slots_select_anon" on public.schedule_slots;
create policy "schedule_slots_select_anon"
on public.schedule_slots
for select
to anon
using (true);

drop policy if exists "schedule_slots_write_anon" on public.schedule_slots;
create policy "schedule_slots_write_anon"
on public.schedule_slots
for all
to anon
using (true)
with check (true);

drop policy if exists "class_plans_select_anon" on public.class_plans;
create policy "class_plans_select_anon"
on public.class_plans
for select
to anon
using (true);

drop policy if exists "class_plans_insert_anon" on public.class_plans;
create policy "class_plans_insert_anon"
on public.class_plans
for insert
to anon
with check (true);

drop policy if exists "class_plans_update_anon" on public.class_plans;
create policy "class_plans_update_anon"
on public.class_plans
for update
to anon
using (true)
with check (true);

insert into public.schedule_slots (
  code, day_of_week, start_time, end_time, program, kids_group, gi_type, tags, default_coach_id
)
values
  ('seg-1', 'SEG', '07:00', '08:00', 'GB1', null, 'GI', null, null),
  ('seg-2', 'SEG', '12:15', '13:15', 'GB1', null, 'GI', null, null),
  ('seg-3', 'SEG', '13:15', '13:45', 'GB1', null, 'GI', array['SPARRING'], null),
  ('seg-4', 'SEG', '18:15', '19:15', 'GBK', 'PC1', 'GI', null, null),
  ('seg-5', 'SEG', '19:15', '20:15', 'GB1', null, 'GI', null, null),
  ('seg-6', 'SEG', '20:15', '21:15', 'GB2', null, 'GI', null, null),
  ('ter-1', 'TER', '07:00', '08:00', 'GB1', null, 'GI', null, null),
  ('ter-2', 'TER', '12:15', '13:15', 'GB2', null, 'GI', null, null),
  ('ter-3', 'TER', '17:30', '18:15', 'GBK', 'MC', 'GI', null, null),
  ('ter-4', 'TER', '18:15', '19:15', 'GBK', 'PC2', 'GI', null, null),
  ('ter-5', 'TER', '19:15', '20:15', 'GB2', null, 'NOGI', null, null),
  ('ter-6', 'TER', '20:15', '21:15', 'GB1', null, 'GI', null, null),
  ('qua-1', 'QUA', '07:00', '08:00', 'GB1', null, 'GI', null, null),
  ('qua-2', 'QUA', '12:15', '13:15', 'GB1', null, 'GI', null, null),
  ('qua-3', 'QUA', '13:15', '13:45', 'GB1', null, 'GI', array['SPARRING'], null),
  ('qua-4', 'QUA', '18:15', '19:15', 'GBK', 'PC1', 'GI', null, null),
  ('qua-5', 'QUA', '19:15', '20:15', 'GB1', null, 'GI', null, null),
  ('qua-6', 'QUA', '20:15', '21:15', 'GB2', null, 'GI', null, null),
  ('qui-1', 'QUI', '07:00', '08:00', 'GB1', null, 'GI', null, null),
  ('qui-2', 'QUI', '12:15', '13:15', 'GB2', null, 'NOGI', null, null),
  ('qui-3', 'QUI', '17:30', '18:15', 'GBK', 'MC', 'GI', null, null),
  ('qui-4', 'QUI', '18:15', '19:15', 'GBK', 'PC2', 'GI', null, null),
  ('qui-5', 'QUI', '19:15', '20:15', 'GB2', null, 'GI', null, null),
  ('qui-6', 'QUI', '20:15', '21:15', 'GB1', null, 'GI', null, null),
  ('sex-1', 'SEX', '07:00', '08:00', 'GB1', null, 'GI', null, null),
  ('sex-2', 'SEX', '12:15', '13:15', 'GB1', null, 'GI', null, null),
  ('sex-3', 'SEX', '13:15', '13:45', 'GB1', null, 'GI', array['SPARRING'], null),
  ('sex-4', 'SEX', '18:15', '19:15', 'GBK', 'PC1', 'GI', null, null),
  ('sex-5', 'SEX', '19:15', '20:15', 'GB1', null, 'GI', null, null),
  ('sab-1', 'SAB', '10:00', '11:00', 'GB1', null, 'GI', null, null),
  ('sab-2', 'SAB', '10:00', '11:00', 'GB2', null, 'GI', null, null),
  ('sab-3', 'SAB', '11:00', '11:30', 'GB1', null, 'GI', array['SPARRING'], null)
on conflict (code) do update set
  day_of_week = excluded.day_of_week,
  start_time = excluded.start_time,
  end_time = excluded.end_time,
  program = excluded.program,
  kids_group = excluded.kids_group,
  gi_type = excluded.gi_type,
  tags = excluded.tags,
  default_coach_id = excluded.default_coach_id;
