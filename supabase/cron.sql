-- ══════════════════════════════════════════════════════════════════
-- Scheduled WhatsApp blasts via pg_cron + Edge Function
--
-- Prerequisites (run once via Supabase Dashboard):
-- 1. Database → Extensions → enable pg_cron
-- 2. Database → Extensions → enable pg_net (for net.http_post)
-- 3. Edge Function deployed: supabase functions deploy send-blast
-- 4. Secrets set: FONNTE_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
--
-- Replace YOUR_ANON_KEY with your Supabase anon key from
-- Dashboard → Settings → API → anon public.
-- This is safe — the Edge Function validates FONNTE_TOKEN
-- server-side; the anon key only authenticates the function
-- invocation itself.
-- ══════════════════════════════════════════════════════════════════

-- Reminder RSVP: 7 Juni 2026 02:00 UTC = 09:00 WIB
select cron.schedule(
  'reminder-rsvp-blast',
  '0 2 7 6 *',
  $$
  select net.http_post(
    url := 'https://bawnvpgjpueqdebjqcjp.supabase.co/functions/v1/send-blast',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhd252cGdqcHVlcWRlYmpxY2pwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMjI5NzksImV4cCI6MjA5NDU5ODk3OX0.KXqGWTee1_URiWRnHozT8mIJUf4EsYQy80ne3RtfkyoY"}'::jsonb,
    body := '{"type":"reminder_rsvp"}'::jsonb
  );
  $$
);

-- H-7 blast: 13 Juni 2026 02:00 UTC = 09:00 WIB
select cron.schedule(
  'h7-blast',
  '0 2 13 6 *',
  $$
  select net.http_post(
    url := 'https://bawnvpgjpueqdebjqcjp.supabase.co/functions/v1/send-blast',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhd252cGdqcHVlcWRlYmpxY2pwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMjI5NzksImV4cCI6MjA5NDU5ODk3OX0.KXqGWTee1_URiWRnHozT8mIJUf4EsYQy80ne3Rtfkyo"}'::jsonb,
    body := '{"type":"h7"}'::jsonb
  );
  $$
);

-- View scheduled jobs
select * from cron.job;

-- To cancel if needed:
-- select cron.unschedule('reminder-rsvp-blast');
-- select cron.unschedule('h7-blast');
