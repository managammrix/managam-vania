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

-- ── INVITEES: family fields ───────────────────────────────────────
-- is_family marks core/nuclear family members (auto-confirmed,
-- no RSVP needed, excluded from reminder blasts).
-- auto_confirmed records whether the row was confirmed at import
-- rather than via the public RSVP form.
alter table public.invitees
  add column if not exists is_family boolean default false;
alter table public.invitees
  add column if not exists auto_confirmed boolean default false;
