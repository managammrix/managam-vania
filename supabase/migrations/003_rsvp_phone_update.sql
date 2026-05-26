-- ══════════════════════════════════════════════════════════════════
-- Allow the RSVP form to update invitees.phone via the existing
-- security-definer RPC. Direct anon UPDATE on invitees is blocked
-- by RLS; the RPC is the only path that can write the row. We add
-- an optional p_phone argument and only overwrite when it's non-empty
-- so that legacy 3-arg callers (or guests who blanked the field)
-- don't accidentally null the stored number.
-- ══════════════════════════════════════════════════════════════════

drop function if exists public.submit_rsvp_by_ref(text, boolean, integer);

create or replace function public.submit_rsvp_by_ref(
  p_ref text,
  p_attending boolean,
  p_guests integer,
  p_phone text default null
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
      guests    = p_guests,
      phone     = coalesce(nullif(trim(p_phone), ''), phone)
    where ref = p_ref;

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

grant execute on function
  public.submit_rsvp_by_ref(text, boolean, integer, text)
  to anon;
