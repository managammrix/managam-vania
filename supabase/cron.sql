-- ══════════════════════════════════════════════════════════════════
-- Scheduled WhatsApp blasts via pg_cron + Edge Function
--
-- Prerequisites (run once via Supabase Dashboard):
-- 1. Database → Extensions → enable pg_cron
-- 2. Database → Extensions → enable pg_net (for net.http_post)
-- 3. Edge Function deployed: supabase functions deploy send-blast
-- 4. Secrets set: FONNTE_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
-- 5. Replace YOUR_PROJECT_REF below with your actual Supabase ref
-- ══════════════════════════════════════════════════════════════════

-- Reminder RSVP: 7 Juni 2026 02:00 UTC = 09:00 WIB
select cron.schedule(
  'reminder-rsvp-blast',
  '0 2 7 6 *',
  $$
  select net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-blast',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
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
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-blast',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := '{"type":"h7"}'::jsonb
  );
  $$
);

-- View scheduled jobs
select * from cron.job;

-- To cancel if needed:
-- select cron.unschedule('reminder-rsvp-blast');
-- select cron.unschedule('h7-blast');
