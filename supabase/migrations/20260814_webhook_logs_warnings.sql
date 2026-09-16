-- Diagnostic column: records when an accepted/rejected webhook payload had an
-- expected field (phone, email, ...) present under a recognized key but with
-- an empty value, or missing entirely. This is how we caught the Wix
-- Automation sending "telefone": "" for real form submissions — the field
-- name mapping was correct, the value itself never arrived from Wix. Kept
-- separate from error_message (which is reserved for hard insert failures).
alter table public.webhook_logs
  add column if not exists warnings text null;
