create extension if not exists pgcrypto;

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.members(id) on delete set null,
  amount numeric(10,2) not null,
  method text not null check (method in ('DD', 'TPA_CARD', 'TPA_MBWAY', 'CASH')),
  payment_month text not null,
  paid_at timestamptz not null default now(),
  note text,
  dd_batch_item_id uuid,
  voided boolean not null default false,
  voided_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists payments_unique_active_member_method_month
on public.payments(member_id, method, payment_month)
where voided = false;

create table if not exists public.dd_batches (
  id uuid primary key default gen_random_uuid(),
  month text not null,
  file_name text,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (month, file_name)
);

create table if not exists public.dd_batch_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.dd_batches(id) on delete cascade,
  member_id uuid references public.members(id) on delete set null,
  match_key text,
  amount numeric(10,2) not null default 0,
  status text not null check (status in ('success', 'failed')),
  reason text,
  raw_row jsonb,
  ignored boolean not null default false,
  ignored_by uuid references auth.users(id),
  ignored_at timestamptz,
  payment_id uuid references public.payments(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.payments
  add column if not exists member_id uuid references public.members(id) on delete set null,
  add column if not exists amount numeric(10,2),
  add column if not exists method text,
  add column if not exists payment_month text,
  add column if not exists paid_at timestamptz not null default now(),
  add column if not exists note text,
  add column if not exists dd_batch_item_id uuid,
  add column if not exists voided boolean not null default false,
  add column if not exists voided_at timestamptz,
  add column if not exists created_at timestamptz not null default now();

alter table public.dd_batches
  add column if not exists month text,
  add column if not exists file_name text,
  add column if not exists uploaded_by uuid references auth.users(id),
  add column if not exists created_at timestamptz not null default now();

alter table public.dd_batch_items
  add column if not exists batch_id uuid references public.dd_batches(id) on delete cascade,
  add column if not exists member_id uuid references public.members(id) on delete set null,
  add column if not exists match_key text,
  add column if not exists amount numeric(10,2) default 0,
  add column if not exists status text,
  add column if not exists reason text,
  add column if not exists raw_row jsonb,
  add column if not exists ignored boolean not null default false,
  add column if not exists ignored_by uuid references auth.users(id),
  add column if not exists ignored_at timestamptz,
  add column if not exists payment_id uuid references public.payments(id) on delete set null,
  add column if not exists created_at timestamptz not null default now();

alter table public.members
  add column if not exists paid_through date,
  add column if not exists dd_failed_this_month boolean not null default false,
  add column if not exists dd_failed_month text;

alter table public.payments enable row level security;
alter table public.dd_batches enable row level security;
alter table public.dd_batch_items enable row level security;

drop policy if exists "payments_all_authenticated" on public.payments;
create policy "payments_all_authenticated"
on public.payments
for all
to authenticated
using (true)
with check (true);

drop policy if exists "dd_batches_all_authenticated" on public.dd_batches;
create policy "dd_batches_all_authenticated"
on public.dd_batches
for all
to authenticated
using (true)
with check (true);

drop policy if exists "dd_batch_items_all_authenticated" on public.dd_batch_items;
create policy "dd_batch_items_all_authenticated"
on public.dd_batch_items
for all
to authenticated
using (true)
with check (true);
