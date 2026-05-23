-- Invitees
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

-- RLS: anon can read/write invitees (PIN-gated client-side)
alter table public.invitees enable row level security;
create policy "Public access on invitees"
  on public.invitees for all
  to anon
  using (true)
  with check (true);

-- Add approved column to wishes
alter table public.wishes
  add column if not exists approved boolean default true;

-- Update wishes RLS: anon can read approved + update/delete (PIN-gated client-side)
drop policy if exists "Allow public read on wishes"
  on public.wishes;
create policy "Allow public read approved wishes"
  on public.wishes for select
  to anon
  using (approved = true);

create policy "Public update wishes"
  on public.wishes for update
  to anon
  using (true);

create policy "Public delete wishes"
  on public.wishes for delete
  to anon
  using (true);

-- Message log
create table if not exists public.message_log (
  id uuid primary key default gen_random_uuid(),
  sent_at timestamptz default now(),
  recipient_count integer,
  message text,
  recipients jsonb,
  status text default 'sent'
);

alter table public.message_log enable row level security;
create policy "Public access on message_log"
  on public.message_log for all
  to anon
  using (true)
  with check (true);
