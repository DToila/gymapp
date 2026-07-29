-- Support for the Wix Automation webhook (/api/webhooks/wix-leads).
--
-- contact_source already exists and already serves as the "lead source"
-- column (shown as "Via" in the UI) — no need for a separate source column,
-- just a new allowed value ('Site Wix'), which is enforced at the app layer
-- (LEAD_SOURCES in src/components/leads/types.ts), not a DB constraint.

-- Free-text field for the initial inquiry message submitted on a public
-- lead-intake form (e.g. the Wix form's message/comment field). Distinct
-- from the old "notes" field removed earlier for being auto-populated with
-- duplicated structured data — this one holds genuine free text from the
-- person themselves.
alter table public.leads
  add column if not exists mensagem_inicial text null;

-- Raw payload log for debugging external webhook integrations (what an
-- external system actually sent vs. what we expected), primarily useful
-- while testing a new integration before trusting it with real traffic.
create table if not exists public.webhook_logs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  payload jsonb not null,
  lead_id uuid null references public.leads(id) on delete set null,
  success boolean not null default true,
  error_message text null,
  created_at timestamptz not null default now()
);

alter table public.webhook_logs enable row level security;

drop policy if exists "webhook_logs_select_authenticated" on public.webhook_logs;
create policy "webhook_logs_select_authenticated"
on public.webhook_logs
for select
to authenticated
using (true);
