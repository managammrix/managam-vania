-- ══════════════════════════════════════════════════════════════════
-- Managam & Vania — Supabase Schema
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- ══════════════════════════════════════════════════════════════════

-- ── RSVP ──────────────────────────────────────────────────────────
create table if not exists public.rsvp (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz default now(),
  name        text not null,
  phone       text,
  attending   boolean not null,
  guests      integer default 1 check (guests >= 1 and guests <= 10)
);

-- Anyone can insert (submit RSVP), nobody can read (only admin via service key)
alter table public.rsvp enable row level security;

create policy "Allow public insert on rsvp"
  on public.rsvp for insert
  to anon
  with check (true);

-- ── WISHES ────────────────────────────────────────────────────────
create table if not exists public.wishes (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz default now(),
  author      text not null,
  message     text not null
);

-- Anyone can read + insert wishes (public guestbook)
alter table public.wishes enable row level security;

create policy "Allow public read on wishes"
  on public.wishes for select
  to anon
  using (true);

create policy "Allow public insert on wishes"
  on public.wishes for insert
  to anon
  with check (true);

-- ── STORAGE: prewedding bucket ────────────────────────────────────
-- Run this AFTER creating the bucket named "prewedding" in Storage dashboard
-- Dashboard > Storage > New bucket > Name: prewedding > Public: YES

insert into storage.buckets (id, name, public)
values ('prewedding', 'prewedding', true)
on conflict (id) do nothing;

create policy "Public read on prewedding"
  on storage.objects for select
  to anon
  using (bucket_id = 'prewedding');

-- Service-role only for upload (you upload from dashboard or Supabase CLI)
create policy "Service role upload to prewedding"
  on storage.objects for insert
  to service_role
  with check (bucket_id = 'prewedding');

-- ══════════════════════════════════════════════════════════════════
-- Done! Next steps:
-- 1. Copy your Project URL + anon key to .env.local
-- 2. Upload pre-wedding photos to Storage > prewedding bucket
--    (photos will load in order by filename — name them 01.jpg, 02.jpg etc.)
-- ══════════════════════════════════════════════════════════════════
