-- The "Observações"/notes field on leads was removed from the app entirely
-- (it duplicated data already captured in dedicated columns and had no clear
-- purpose separate from the Followup field). Drop the column.
alter table public.leads
  drop column if exists notes;
