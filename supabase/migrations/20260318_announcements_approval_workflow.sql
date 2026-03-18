create extension if not exists pgcrypto;

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  tag text not null check (tag in ('URGENT', 'INFO', 'EVENT', 'PAYMENTS')),
  title text not null,
  details text null,
  audience text not null check (audience in ('ALL', 'ADULTS', 'KIDS', 'STAFF')),
  kids_group text null check (kids_group in ('Kids 1', 'Kids 2', 'Teens')),
  expires_at date not null,
  pinned boolean not null default false,
  ack_required boolean not null default false,
  approval_status text not null default 'pending' check (approval_status in ('pending', 'approved', 'rejected')),
  created_by uuid not null references public.profiles(id),
  approved_by uuid null references public.profiles(id),
  approved_at timestamptz null,
  rejection_reason text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.announcements
  add column if not exists approval_status text,
  add column if not exists created_by uuid references public.profiles(id),
  add column if not exists approved_by uuid references public.profiles(id),
  add column if not exists approved_at timestamptz,
  add column if not exists rejection_reason text,
  add column if not exists updated_at timestamptz not null default now();

update public.announcements
set approval_status = 'approved'
where approval_status is null;

alter table public.announcements
  alter column approval_status set not null;

create or replace function public.set_announcements_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_announcements_updated_at on public.announcements;
create trigger trg_announcements_updated_at
before update on public.announcements
for each row
execute procedure public.set_announcements_updated_at();

create or replace function public.current_app_role()
returns text
language sql
stable
as $$
  select role::text from public.profiles where id = auth.uid()
$$;

alter table public.announcements enable row level security;

drop policy if exists "announcements_select_authenticated" on public.announcements;
create policy "announcements_select_authenticated"
on public.announcements
for select
to authenticated
using (
  approval_status = 'approved'
  or created_by = auth.uid()
  or public.current_app_role() in ('staff', 'admin')
);

drop policy if exists "announcements_insert_authenticated" on public.announcements;
create policy "announcements_insert_authenticated"
on public.announcements
for insert
to authenticated
with check (
  (
    public.current_app_role() = 'coach'
    and created_by = auth.uid()
    and approval_status = 'pending'
    and approved_by is null
    and approved_at is null
  )
  or
  (
    public.current_app_role() in ('staff', 'admin')
    and created_by = auth.uid()
    and approval_status in ('pending', 'approved', 'rejected')
  )
);

drop policy if exists "announcements_update_staff_admin" on public.announcements;
create policy "announcements_update_staff_admin"
on public.announcements
for update
to authenticated
using (public.current_app_role() in ('staff', 'admin'))
with check (public.current_app_role() in ('staff', 'admin'));

drop policy if exists "announcements_update_coach_own_pending" on public.announcements;
create policy "announcements_update_coach_own_pending"
on public.announcements
for update
to authenticated
using (
  public.current_app_role() = 'coach'
  and created_by = auth.uid()
  and approval_status = 'pending'
)
with check (
  public.current_app_role() = 'coach'
  and created_by = auth.uid()
  and approval_status = 'pending'
  and approved_by is null
  and approved_at is null
);

drop policy if exists "announcements_delete_staff_admin" on public.announcements;
create policy "announcements_delete_staff_admin"
on public.announcements
for delete
to authenticated
using (public.current_app_role() in ('staff', 'admin'));

-- Optional anon read for student/public pages without auth.
-- Shows only published announcements.
drop policy if exists "announcements_select_anon_approved" on public.announcements;
create policy "announcements_select_anon_approved"
on public.announcements
for select
to anon
using (approval_status = 'approved');
