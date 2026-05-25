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

-- ── INVITEES — unique ref links + opened tracking ─────────────────
-- NB: per-invitee seat limit is the `guests` column itself; the
-- separate `max_guests` column has been removed (dropped at the
-- bottom of this file). `default_max_guests` in settings is the
-- fallback when an invitee's `guests` is null/0.
alter table public.invitees
  add column if not exists ref text unique;

alter table public.invitees
  add column if not exists opened_at timestamptz;

-- Anon must NOT have direct table access (would expose all invitee
-- rows to anyone with the anon key). Lookup goes through a security
-- definer RPC that only returns the single matching row.
drop policy if exists "Anon read invitee by ref" on public.invitees;
drop policy if exists "Anon update opened_at" on public.invitees;

-- Drop required because postgres can't change a function's return
-- type via CREATE OR REPLACE — must drop first when the table shape
-- (and thus the returns table (...) signature) changes.
drop function if exists public.get_invitee_by_ref(text);

create or replace function public.get_invitee_by_ref(p_ref text)
returns table (
  id uuid,
  name text,
  phone text,
  ref text,
  opened_at timestamptz,
  sender text,
  guests integer,
  rsvp_status text,
  type text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.invitees
    set opened_at = now()
    where invitees.ref = p_ref
    and opened_at is null;

  return query
    select
      i.id, i.name, i.phone, i.ref,
      i.opened_at, i.sender,
      i.guests, i.rsvp_status, i.type
    from public.invitees i
    where i.ref = p_ref
    limit 1;
end;
$$;

grant execute on function public.get_invitee_by_ref(text) to anon;

grant execute on function public.get_invitee_by_ref(text) to anon;

-- RSVP submission goes through a security definer RPC, NOT direct
-- anon UPDATE. The RPC only writes rsvp_status/attending/guests on
-- the row whose ref matches — name, phone, sender etc. stay protected.
drop policy if exists "Anon update own rsvp status" on public.invitees;

create or replace function public.submit_rsvp_by_ref(
  p_ref text,
  p_attending boolean,
  p_guests integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer;
begin
  update public.invitees
    set
      rsvp_status = case
        when p_attending then 'confirmed'
        else 'declined'
      end,
      attending = p_attending,
      guests = p_guests
    where ref = p_ref;

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

grant execute on function
  public.submit_rsvp_by_ref(text, boolean, integer)
  to anon;

-- Check-in, souvenir, and lunchbox tracking columns
alter table public.invitees
  add column if not exists checked_in_at timestamptz;
alter table public.invitees
  add column if not exists souvenir_claimed boolean default false;
alter table public.invitees
  add column if not exists lunchbox_claimed boolean default false;

-- ── Check-in / claim RPCs ─────────────────────────────────────────
-- All three are security-definer so anon can call them without a
-- direct UPDATE policy on invitees. They return JSON for easy client
-- consumption, including idempotency signals (already_checked_in /
-- already_claimed) so the scanner UI can show distinct states.

create or replace function public.checkin_by_ref(p_ref text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.invitees%rowtype;
begin
  select * into v_row from public.invitees where ref = p_ref limit 1;

  if not found then
    return json_build_object(
      'success', false,
      'error', 'Tamu tidak ditemukan'
    );
  end if;

  if v_row.checked_in_at is not null then
    return json_build_object(
      'success', false,
      'already_checked_in', true,
      'name', v_row.name,
      'guests', v_row.guests,
      'checked_in_at', v_row.checked_in_at,
      'souvenir_claimed', v_row.souvenir_claimed,
      'lunchbox_claimed', v_row.lunchbox_claimed
    );
  end if;

  update public.invitees
    set checked_in_at = now()
    where ref = p_ref;

  return json_build_object(
    'success', true,
    'name', v_row.name,
    'guests', v_row.guests,
    'rsvp_status', v_row.rsvp_status,
    'souvenir_claimed', false,
    'lunchbox_claimed', false
  );
end;
$$;
grant execute on function public.checkin_by_ref(text) to anon;

create or replace function public.claim_souvenir_by_ref(p_ref text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.invitees%rowtype;
begin
  select * into v_row from public.invitees where ref = p_ref limit 1;

  if not found then
    return json_build_object(
      'success', false,
      'error', 'Tamu tidak ditemukan'
    );
  end if;

  if v_row.souvenir_claimed then
    return json_build_object(
      'success', false,
      'already_claimed', true,
      'name', v_row.name
    );
  end if;

  update public.invitees
    set souvenir_claimed = true
    where ref = p_ref;

  return json_build_object(
    'success', true,
    'name', v_row.name,
    'guests', v_row.guests
  );
end;
$$;
grant execute on function public.claim_souvenir_by_ref(text) to anon;

create or replace function public.claim_lunchbox_by_ref(p_ref text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.invitees%rowtype;
begin
  select * into v_row from public.invitees where ref = p_ref limit 1;

  if not found then
    return json_build_object(
      'success', false,
      'error', 'Tamu tidak ditemukan'
    );
  end if;

  if v_row.lunchbox_claimed then
    return json_build_object(
      'success', false,
      'already_claimed', true,
      'name', v_row.name,
      'guests', v_row.guests
    );
  end if;

  update public.invitees
    set lunchbox_claimed = true
    where ref = p_ref;

  return json_build_object(
    'success', true,
    'name', v_row.name,
    'guests', v_row.guests
  );
end;
$$;
grant execute on function public.claim_lunchbox_by_ref(text) to anon;

-- ── SETTINGS — global key/value config (e.g. default_max_guests) ─
create table if not exists public.settings (
  key text primary key,
  value text not null
);
alter table public.settings
  enable row level security;

drop policy if exists "Anon read settings" on public.settings;
drop policy if exists "Anon write settings" on public.settings;
drop policy if exists "Anon update settings" on public.settings;

create policy "Anon read settings"
  on public.settings for select
  to anon using (true);

-- Anon can only UPDATE the known default_max_guests key.
-- No insert/delete from anon — new keys must come from SQL migration.
create policy "Anon update settings"
  on public.settings for update
  to anon
  using (true)
  with check (key = 'default_max_guests');

insert into public.settings (key, value)
  values ('default_max_guests', '2')
  on conflict (key) do nothing;

-- Generate refs for all existing invitees that don't have one yet
update public.invitees
  set ref = substr(md5(random()::text), 1, 8)
  where ref is null;

-- ══════════════════════════════════════════════════════════════════
-- PHYSICAL INVITATION SLOTS
-- 38 anonymous slots for printed cards. Guests at the door scan the
-- QR on their card, fill in name + phone + party size on /checkin,
-- and are checked in atomically by update_physical_guest.
-- ══════════════════════════════════════════════════════════════════

-- Allow NULL phone for anonymous slots
alter table public.invitees
  alter column phone drop not null;

-- Type discriminator: 'digital' (default) or 'physical'
alter table public.invitees
  add column if not exists type text default 'digital';
alter table public.invitees
  drop constraint if exists invitees_type_check;
alter table public.invitees
  add constraint invitees_type_check
  check (type in ('digital','physical'));

-- Seed 38 physical slots (idempotent — only inserts missing #N)
do $$
declare i int;
begin
  for i in 1..38 loop
    insert into public.invitees (name, phone, type, ref, guests, rsvp_status)
    select
      'Undangan Fisik #' || i,
      null,
      'physical',
      substr(md5(random()::text || i::text), 1, 8),
      2,
      'pending'
    where not exists (
      select 1 from public.invitees where name = 'Undangan Fisik #' || i
    );
  end loop;
end $$;

-- RPC: update_physical_guest — identifies + checks in atomically.
-- Used by /checkin when an anonymous slot scans at the door.
create or replace function public.update_physical_guest(
  p_ref text,
  p_name text,
  p_phone text,
  p_guests integer
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.invitees%rowtype;
begin
  select * into v_row from public.invitees where ref = p_ref limit 1;

  if not found then
    return json_build_object('success', false, 'error', 'Tamu tidak ditemukan');
  end if;

  if v_row.type <> 'physical' then
    return json_build_object('success', false, 'error', 'Bukan slot fisik');
  end if;

  update public.invitees
    set name = p_name,
        phone = p_phone,
        guests = p_guests,
        rsvp_status = 'confirmed',
        attending = true,
        checked_in_at = coalesce(checked_in_at, now())
    where ref = p_ref;

  return json_build_object(
    'success', true,
    'name', p_name,
    'guests', p_guests
  );
end;
$$;
grant execute on function public.update_physical_guest(text, text, text, integer) to anon;

-- RPC: identify_physical_guest — same as above WITHOUT checked_in_at.
-- Used by RsvpSection on /?ref=xxx for pre-wedding RSVP. Lets a
-- physical-slot guest fill in their real name early without being
-- prematurely marked as having arrived at the venue.
create or replace function public.identify_physical_guest(
  p_ref text,
  p_name text,
  p_phone text,
  p_guests integer,
  p_attending boolean
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.invitees%rowtype;
begin
  select * into v_row from public.invitees where ref = p_ref limit 1;

  if not found then
    return json_build_object('success', false, 'error', 'Tamu tidak ditemukan');
  end if;

  if v_row.type <> 'physical' then
    return json_build_object('success', false, 'error', 'Bukan slot fisik');
  end if;

  update public.invitees
    set name = p_name,
        phone = p_phone,
        guests = p_guests,
        attending = p_attending,
        rsvp_status = case when p_attending then 'confirmed' else 'declined' end
    where ref = p_ref;

  return json_build_object('success', true, 'name', p_name);
end;
$$;
grant execute on function public.identify_physical_guest(text, text, text, integer, boolean) to anon;

-- ──────────────────────────────────────────────────────────────────
-- Drop the deprecated max_guests column. Per-invitee seat limit is
-- now just `guests`. Must run AFTER get_invitee_by_ref above has
-- been redefined to no longer reference it (otherwise the function
-- definition would dangle).
-- ──────────────────────────────────────────────────────────────────
alter table public.invitees drop column if exists max_guests;
