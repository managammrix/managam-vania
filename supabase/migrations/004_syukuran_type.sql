-- ══════════════════════════════════════════════════════════════════
-- Allow a third invitee `type`: 'syukuran' (Ibadah Ucapan Syukur).
-- These guests get the thanksgiving-service event card and no RSVP form;
-- they reuse the same envelope / prewed / wishes flow. Until this runs,
-- inserting type='syukuran' rows fails the existing CHECK constraint.
-- ══════════════════════════════════════════════════════════════════

alter table public.invitees
  drop constraint if exists invitees_type_check;
alter table public.invitees
  add constraint invitees_type_check
  check (type in ('digital','physical','syukuran'));
