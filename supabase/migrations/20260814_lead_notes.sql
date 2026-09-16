-- Internal staff notes/history log for a lead — separate from
-- `mensagem_inicial` (the lead's own words from the Wix form) and from any
-- future WhatsApp messaging feature. Append-only: staff can add notes, never
-- edit/delete them, so no update/delete policy is defined.
create table if not exists public.lead_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  staff_name text not null,
  staff_email text null,
  note_text text not null,
  created_at timestamptz not null default now()
);

create index if not exists lead_notes_lead_id_idx on public.lead_notes(lead_id);

alter table public.lead_notes enable row level security;

drop policy if exists "lead_notes_select_authenticated" on public.lead_notes;
create policy "lead_notes_select_authenticated"
on public.lead_notes
for select
to authenticated
using (true);

drop policy if exists "lead_notes_insert_authenticated" on public.lead_notes;
create policy "lead_notes_insert_authenticated"
on public.lead_notes
for insert
to authenticated
with check (true);
