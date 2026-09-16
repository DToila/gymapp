-- Stores Web Push subscriptions (one row per device/browser that opted in
-- to notifications) so the server can push to all of them when a new lead
-- arrives, a payment fails, etc.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

-- No public policies: this table is only ever read/written via the
-- service-role key from server-side API routes, same pattern as
-- webhook_logs.
