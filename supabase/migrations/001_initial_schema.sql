-- ============================================================
-- Migration 001 — Managam & Vania Wedding App
-- Run via: supabase db push  (or paste into Supabase SQL editor)
-- ============================================================

-- ── EXTENSIONS ──────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── RSVP TABLE ──────────────────────────────────────────────
create table if not exists public.rsvp (
  id            uuid primary key default uuid_generate_v4(),
  created_at    timestamptz not null default now(),
  name          text not null,
  phone         text,
  attending     boolean not null,
  guest_count   int not null default 1 check (guest_count >= 1 and guest_count <= 20),
  message       text,
  lang          text default 'id' check (lang in ('id','en'))
);

comment on table public.rsvp is 'Guest RSVP confirmations';

-- ── WISHES TABLE ────────────────────────────────────────────
create table if not exists public.wishes (
  id          uuid primary key default uuid_generate_v4(),
  created_at  timestamptz not null default now(),
  name        text not null,
  message     text not null,
  approved    boolean not null default true  -- set false to require moderation
);

comment on table public.wishes is 'Guest wishes & blessings';

-- ── GALLERY TABLE (metadata, actual files in Storage) ───────
create table if not exists public.gallery (
  id          uuid primary key default uuid_generate_v4(),
  created_at  timestamptz not null default now(),
  filename    text not null unique,
  alt         text,
  sort_order  int not null default 0,
  featured    boolean not null default false  -- hero slot
);

comment on table public.gallery is 'Pre-wedding photo metadata (files in storage bucket)';

-- ── ROW LEVEL SECURITY ──────────────────────────────────────

-- RSVP: anyone can insert, only service role can read
alter table public.rsvp enable row level security;

create policy "Anyone can submit RSVP"
  on public.rsvp for insert
  with check (true);

create policy "Service role can read RSVP"
  on public.rsvp for select
  using (auth.role() = 'service_role');

-- Wishes: anyone can insert & read approved wishes
alter table public.wishes enable row level security;

create policy "Anyone can submit a wish"
  on public.wishes for insert
  with check (true);

create policy "Anyone can read approved wishes"
  on public.wishes for select
  using (approved = true);

-- Gallery: public read, service role write
alter table public.gallery enable row level security;

create policy "Anyone can view gallery"
  on public.gallery for select
  using (true);

create policy "Service role manages gallery"
  on public.gallery for all
  using (auth.role() = 'service_role');

-- ── STORAGE BUCKET ──────────────────────────────────────────
-- Run this in Supabase Dashboard → Storage OR via CLI:
-- supabase storage create prewedding --public
-- The SQL equivalent (Supabase internal):
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'prewedding',
  'prewedding',
  true,
  10485760,   -- 10 MB per file
  array['image/jpeg','image/jpg','image/png','image/webp','image/avif']
)
on conflict (id) do nothing;

-- Storage policies
create policy "Public can view prewedding photos"
  on storage.objects for select
  using (bucket_id = 'prewedding');

create policy "Service role can upload prewedding photos"
  on storage.objects for insert
  with check (bucket_id = 'prewedding' and auth.role() = 'service_role');

create policy "Service role can delete prewedding photos"
  on storage.objects for delete
  using (bucket_id = 'prewedding' and auth.role() = 'service_role');

-- ── INDEXES ─────────────────────────────────────────────────
create index if not exists idx_wishes_approved_created
  on public.wishes (approved, created_at desc);

create index if not exists idx_gallery_sort
  on public.gallery (sort_order asc, featured desc);

create index if not exists idx_rsvp_created
  on public.rsvp (created_at desc);

-- ── ANALYTICS VIEW (nice to have) ───────────────────────────
create or replace view public.rsvp_summary as
select
  count(*) filter (where attending = true)  as attending_count,
  count(*) filter (where attending = false) as declined_count,
  sum(guest_count) filter (where attending = true) as total_guests,
  count(*) as total_responses
from public.rsvp;

comment on view public.rsvp_summary is 'Quick RSVP dashboard — read via service role';
