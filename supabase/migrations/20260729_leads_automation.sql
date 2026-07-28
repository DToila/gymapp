create extension if not exists pgcrypto;

-- The leads table already exists live in Supabase (created out-of-band, no prior
-- migration in this repo). Define it here retroactively so migration history is
-- self-consistent; this is a no-op against the live table.
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_source text not null default 'Website',
  contact_date date not null default current_date,
  phone text null,
  email text null,
  class_type text not null default 'GB1',
  notes text null,
  next_contact_date date null,
  followup_note text null,
  status text not null default 'Por contactar',
  trial_date date null,
  enrolled boolean not null default false,
  not_enrolled_reason text null,
  not_enrolled_reason_text text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- New columns for trial scheduling + post-trial feedback.
alter table public.leads
  add column if not exists age integer null,
  add column if not exists trial_schedule_id uuid null references public.schedule_slots(id),
  add column if not exists trial_feedback text null,
  add column if not exists trial_feedback_at timestamptz null,
  add column if not exists trial_feedback_by uuid null references public.profiles(id);

create or replace function public.set_leads_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_leads_updated_at on public.leads;
create trigger trg_leads_updated_at
before update on public.leads
for each row
execute procedure public.set_leads_updated_at();

alter table public.leads enable row level security;

drop policy if exists "leads_select_authenticated" on public.leads;
create policy "leads_select_authenticated"
on public.leads
for select
to authenticated
using (true);

drop policy if exists "leads_insert_authenticated" on public.leads;
create policy "leads_insert_authenticated"
on public.leads
for insert
to authenticated
with check (true);

drop policy if exists "leads_update_authenticated" on public.leads;
create policy "leads_update_authenticated"
on public.leads
for update
to authenticated
using (true)
with check (true);

-- Trial capacity limits per class session (kids vs adults tracked separately). Null = unlimited.
alter table public.schedule_slots
  add column if not exists trial_capacity_kids integer null,
  add column if not exists trial_capacity_adults integer null;

-- Status history: needed for accurate historical funnel reporting and for
-- computing "time spent in a stage" (e.g. days sitting in Aguarda decisao),
-- rather than relying only on the lead's current-snapshot status/updated_at.
create table if not exists public.lead_status_history (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  status text not null,
  changed_at timestamptz not null default now(),
  changed_by uuid null references public.profiles(id)
);

alter table public.lead_status_history enable row level security;

drop policy if exists "lead_status_history_select_authenticated" on public.lead_status_history;
create policy "lead_status_history_select_authenticated"
on public.lead_status_history
for select
to authenticated
using (true);

drop policy if exists "lead_status_history_insert_authenticated" on public.lead_status_history;
create policy "lead_status_history_insert_authenticated"
on public.lead_status_history
for insert
to authenticated
with check (true);

-- Day-before reminder pipeline. Actual send (Twilio/WhatsApp Business API) is
-- stubbed in application code for now; this table is the queue/audit log so the
-- pipeline is fully testable before a real provider is wired in.
create table if not exists public.reminders_log (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  scheduled_for date not null,
  message text not null,
  sent boolean not null default false,
  channel text not null default 'whatsapp',
  created_at timestamptz not null default now()
);

alter table public.reminders_log enable row level security;

drop policy if exists "reminders_log_select_authenticated" on public.reminders_log;
create policy "reminders_log_select_authenticated"
on public.reminders_log
for select
to authenticated
using (true);

drop policy if exists "reminders_log_insert_authenticated" on public.reminders_log;
create policy "reminders_log_insert_authenticated"
on public.reminders_log
for insert
to authenticated
with check (true);

drop policy if exists "reminders_log_update_authenticated" on public.reminders_log;
create policy "reminders_log_update_authenticated"
on public.reminders_log
for update
to authenticated
using (true)
with check (true);
