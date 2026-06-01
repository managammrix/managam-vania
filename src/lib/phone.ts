// Phone number normalization for the Fonnte WhatsApp API.
//
// Fonnte's `countryCode` parameter rewrites targets: it "replaces the first 0
// (if any) from a target number or adds the country code if it doesn't exist."
// With countryCode='62', a Singapore number like 6586737636 (which has no
// leading 0 and doesn't start with 62) gets 62 *prepended* → 626586737636.
// We therefore send countryCode='0' (disables Fonnte's filter) and take full
// responsibility for producing fully-qualified international targets here.
//
// Output contract: digits only, no '+', no leading 0, country code included.
// Indonesian local forms (0…, 08…, 8…) get 62 prepended. Anything already
// carrying a country code (62…, 65…, 61…, 1…, …) is left intact.
export function normalizePhone(raw: string): string {
  let digits = (raw ?? '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('00')) digits = digits.slice(2) // intl exit prefix → drop
  if (digits.startsWith('0628')) return digits.slice(1) // 0628… → 628…
  if (digits.startsWith('628')) return digits           // already ID intl
  if (digits.startsWith('08')) return '62' + digits.slice(1) // 08… → 628…
  if (digits.startsWith('8')) return '62' + digits      // 8…  → 628… (ID local)
  return digits                                         // 65…, 61…, 1…, etc.
}

// E.164-ish sanity check on an already-normalized number: digits only,
// no leading 0, 8–15 digits total.
export function isValidPhone(normalized: string): boolean {
  return /^[1-9]\d{7,14}$/.test(normalized)
}
