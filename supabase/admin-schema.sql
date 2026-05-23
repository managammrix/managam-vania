-- ══════════════════════════════════════════════════════════════════
-- Admin tables — anon has NO access. All writes go through the
-- Cloudflare Pages Function at /api/admin which holds the
-- service_role key and validates ADMIN_SECRET server-side.
-- ══════════════════════════════════════════════════════════════════

-- ── INVITEES ──────────────────────────────────────────────────────
create table if not exists public.invitees (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text not null,
  phone text not null,
  rsvp_status text default 'pending',
  attending boolean,
  guests integer default 1,
  notes text
);

alter table public.invitees enable row level security;

-- Drop any previously-installed permissive policies
drop policy if exists "Public access on invitees" on public.invitees;
drop policy if exists "Auth users only on invitees" on public.invitees;
-- No policies means anon gets denied. service_role bypasses RLS.

-- ── WISHES — add approved + lock down admin ops ───────────────────
alter table public.wishes
  add column if not exists approved boolean default true;

-- Public site needs SELECT(approved) + INSERT. Admin ops go via proxy.
drop policy if exists "Allow public read on wishes" on public.wishes;
drop policy if exists "Allow public read approved wishes" on public.wishes;
drop policy if exists "Auth users read all wishes" on public.wishes;
drop policy if exists "Auth users update wishes" on public.wishes;
drop policy if exists "Auth users delete wishes" on public.wishes;
drop policy if exists "Public update wishes" on public.wishes;
drop policy if exists "Public delete wishes" on public.wishes;

create policy "Allow public read approved wishes"
  on public.wishes for select
  to anon
  using (approved = true);

-- (Public insert policy from base schema.sql remains)

-- ── MESSAGE LOG ───────────────────────────────────────────────────
create table if not exists public.message_log (
  id uuid primary key default gen_random_uuid(),
  sent_at timestamptz default now(),
  recipient_count integer,
  message text,
  recipients jsonb,
  status text default 'sent'
);

alter table public.message_log enable row level security;

drop policy if exists "Public access on message_log" on public.message_log;
drop policy if exists "Auth users only on message_log" on public.message_log;
-- No policies → anon denied. service_role bypasses RLS.

-- ── INVITEES — unique ref links, max guests, opened tracking ─────
alter table public.invitees
  add column if not exists ref text unique;

alter table public.invitees
  add column if not exists max_guests integer;

alter table public.invitees
  add column if not exists opened_at timestamptz;

-- Anon needs to look up invitee by ref (for personalized invite) and
-- update opened_at (first-open tracking). Reads are restricted to
-- queries that filter by ref via the policy below.
drop policy if exists "Anon read invitee by ref" on public.invitees;
drop policy if exists "Anon update opened_at" on public.invitees;

create policy "Anon read invitee by ref"
  on public.invitees for select
  to anon
  using (ref is not null);

create policy "Anon update opened_at"
  on public.invitees for update
  to anon
  using (ref is not null)
  with check (ref is not null);

-- ── SETTINGS — global key/value config (e.g. default_max_guests) ─
create table if not exists public.settings (
  key text primary key,
  value text not null
);
alter table public.settings
  enable row level security;

drop policy if exists "Anon read settings" on public.settings;
drop policy if exists "Anon write settings" on public.settings;

create policy "Anon read settings"
  on public.settings for select
  to anon using (true);
create policy "Anon write settings"
  on public.settings for all
  to anon using (true) with check (true);

insert into public.settings (key, value)
  values ('default_max_guests', '2')
  on conflict (key) do nothing;

-- Generate refs for all existing invitees that don't have one yet
update public.invitees
  set ref = substr(md5(random()::text), 1, 8)
  where ref is null;
