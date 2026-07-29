-- Structured fields for what the public registration form collects, so this
-- data shows up as separate editable fields on the lead instead of being
-- packed into one long "notes" string.
alter table public.leads
  add column if not exists nif text null,
  add column if not exists sexo text null,
  add column if not exists morada text null,
  add column if not exists codigo_postal text null,
  add column if not exists contacto_emergencia text null,
  add column if not exists como_soube text null,
  add column if not exists nome_pai text null,
  add column if not exists nome_mae text null;
