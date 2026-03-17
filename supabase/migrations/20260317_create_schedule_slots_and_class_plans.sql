create extension if not exists pgcrypto;

create table if not exists public.schedule_slots (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  day_of_week text not null,
  start_time text not null,
  end_time text not null,
  program text not null,
  class_label text,
  created_at timestamptz not null default now()
);

create table if not exists public.class_plans (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.schedule_slots(id) on delete cascade,
  date date not null,
  topic text,
  techniques text,
  coach_primary_id uuid references public.profiles(id),
  coach_secondary_id uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid,
  unique (slot_id, date)
);

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
