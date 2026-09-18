-- "O Meu Jogo": each student picks 4-5 tags describing their game (guards,
-- passes, takedowns, submissions, sweeps) and ranks them by priority.
-- game_tags is the curated, staff-defined catalog students pick from — not
-- user-editable. member_game is each student's own selection.

create table if not exists public.game_tags (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('guardas', 'passagens', 'quedas', 'finalizações', 'raspagens')),
  label text not null,
  sort_order integer not null default 0,
  unique (category, label)
);

alter table public.game_tags enable row level security;

-- Read-only catalog for everyone (staff and the student portal's anon key
-- both need it to render the picker); no insert/update/delete policy is
-- defined since the list is only meant to change via migration.
drop policy if exists "game_tags_select_public" on public.game_tags;
create policy "game_tags_select_public"
on public.game_tags
for select
using (true);

insert into public.game_tags (category, sort_order, label) values
  ('guardas', 1, 'Guarda Fechada'),
  ('guardas', 2, 'Guarda Aberta'),
  ('guardas', 3, 'Meia Guarda'),
  ('guardas', 4, 'Guarda de Lasso'),
  ('guardas', 5, 'Guarda de La Reguera (X-Guard)'),
  ('guardas', 6, 'Guarda De La Riva'),
  ('guardas', 7, 'Guarda De La Riva Invertida'),
  ('guardas', 8, 'Guarda Espinha (Spider Guard)'),
  ('guardas', 9, 'Guarda Borboleta'),
  ('guardas', 10, 'Guarda 50/50'),
  ('guardas', 11, 'Guarda Z (Z-Guard)'),
  ('guardas', 12, 'Guarda Reversa De Kesa (Reverse De La Riva)'),
  ('guardas', 13, 'Guarda Williams'),
  ('guardas', 14, 'Guarda Rubber (Rubber Guard)'),

  ('passagens', 1, 'Passagem Toreando'),
  ('passagens', 2, 'Passagem Pressão (Pressure Pass)'),
  ('passagens', 3, 'Passagem Empilhada (Stack Pass)'),
  ('passagens', 4, 'Passagem Joelho na Barriga'),
  ('passagens', 5, 'Passagem Long Step'),
  ('passagens', 6, 'Passagem Leg Drag'),
  ('passagens', 7, 'Passagem Smash (Smash Pass)'),
  ('passagens', 8, 'Passagem Over-Under'),
  ('passagens', 9, 'Passagem Cartwheel'),
  ('passagens', 10, 'Passagem Folding'),

  ('quedas', 1, 'Queda de Ombro (Kata Guruma)'),
  ('quedas', 2, 'Dupla Perna (Double Leg)'),
  ('quedas', 3, 'Simples Perna (Single Leg)'),
  ('quedas', 4, 'Osoto Gari'),
  ('quedas', 5, 'Uchi Mata'),
  ('quedas', 6, 'Ashi Guruma'),
  ('quedas', 7, 'Puxão para Guarda (Guard Pull)'),
  ('quedas', 8, 'Foot Sweep'),
  ('quedas', 9, 'Tomoe Nage'),

  ('finalizações', 1, 'Mata-Leão (Rear Naked Choke)'),
  ('finalizações', 2, 'Triângulo (Triangle Choke)'),
  ('finalizações', 3, 'Armlock / Chave de Braço (Armbar)'),
  ('finalizações', 4, 'Kimura'),
  ('finalizações', 5, 'Americana'),
  ('finalizações', 6, 'Guilhotina (Guillotine)'),
  ('finalizações', 7, 'Anaconda'),
  ('finalizações', 8, 'D''Arce Choke'),
  ('finalizações', 9, 'Chave de Pé Reta (Straight Ankle Lock)'),
  ('finalizações', 10, 'Chave de Joelho (Kneebar)'),
  ('finalizações', 11, 'Heel Hook'),
  ('finalizações', 12, 'Crucifixo (Crucifix)'),
  ('finalizações', 13, 'Baseball Choke'),
  ('finalizações', 14, 'Ezekiel Choke'),
  ('finalizações', 15, 'Chave de Ombro (Omoplata)'),

  ('raspagens', 1, 'Raspagem de Guarda Fechada (Scissor Sweep)'),
  ('raspagens', 2, 'Raspagem Pêndulo (Pendulum Sweep)'),
  ('raspagens', 3, 'Raspagem Butterfly (Hook Sweep)'),
  ('raspagens', 4, 'Raspagem Flower Sweep'),
  ('raspagens', 5, 'Raspagem de Lasso'),
  ('raspagens', 6, 'Raspagem Balloon Sweep'),
  ('raspagens', 7, 'Raspagem Tripod'),
  ('raspagens', 8, 'Raspagem Sickle'),
  ('raspagens', 9, 'Raspagem Elevator (De La Riva)'),
  ('raspagens', 10, 'Raspagem Berimbolo')
on conflict (category, label) do nothing;

create table if not exists public.member_game (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  tag_id uuid not null references public.game_tags(id) on delete cascade,
  priority integer not null check (priority between 1 and 5),
  created_at timestamptz not null default now(),
  unique (member_id, priority),
  unique (member_id, tag_id)
);

create index if not exists member_game_member_id_idx on public.member_game(member_id);

alter table public.member_game enable row level security;

-- Selects are public for the same reason members/attendance are (see
-- 20260823_lock_down_rls.sql): the student portal has no real Supabase Auth
-- session, so the dashboard card reads this with the anon key.
--
-- Writes go only through POST /api/student/game (service role), which
-- validates the 4-5 tag count and unique priorities server-side before
-- replacing a member's rows — so no anon/authenticated write policy is
-- defined here at all; the service role bypasses RLS entirely.
drop policy if exists "member_game_select_public" on public.member_game;
create policy "member_game_select_public"
on public.member_game
for select
using (true);
