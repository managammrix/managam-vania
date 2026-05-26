-- ══════════════════════════════════════════════════════════════════
-- RSVP NOTIFICATIONS
-- Store the two WA numbers that receive a notification each time a
-- guest submits an RSVP (hadir or tidak hadir), plus Managam's
-- Fonnte token used to send those notifications client-side.
--
-- NOTE: Anyone with the anon key can read `settings`, which means
-- `fonnte_token_agam` is exposed to every visitor. The app already
-- exposes the same token via admin localStorage and direct calls to
-- api.fonnte.com from the browser, so storing it here doesn't lower
-- the existing security posture. If we later move WA sending behind
-- a server route, drop `fonnte_token_agam` from this table and read
-- it from a server-only env var instead.
-- ══════════════════════════════════════════════════════════════════

-- Allow anon to UPDATE the new keys too (still no insert/delete).
drop policy if exists "Anon update settings" on public.settings;
create policy "Anon update settings"
  on public.settings for update
  to anon
  using (true)
  with check (
    key in (
      'default_max_guests',
      'notify_managam',
      'notify_vania',
      'fonnte_token_agam'
    )
  );

-- Seed numbers. The token is empty by default so existing envs that
-- haven't been provisioned don't accidentally fire to real phones —
-- the client treats empty token as "skip notification".
insert into public.settings (key, value)
  values
    ('notify_managam',    '6281263387707'),
    ('notify_vania',      '6281542119177'),
    ('fonnte_token_agam', '')
  on conflict (key) do nothing;
