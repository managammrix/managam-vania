import { normalizePhone, isValidPhone } from './phone'

export interface FonntePayload {
  target: string
  message: string
  countryCode?: string
}

export async function sendWhatsApp(
  token: string,
  payload: FonntePayload
): Promise<{ status: boolean; id?: string }> {
  const res = await fetch('https://api.fonnte.com/send', {
    method: 'POST',
    headers: {
      'Authorization': token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      target: payload.target,
      message: payload.message,
      // '0' disables Fonnte's country-code filter so it never rewrites our
      // already-normalized international targets (e.g. prepending 62 to a 65/61
      // number). We normalize every target ourselves before sending.
      countryCode: payload.countryCode ?? '0',
    }),
  })
  const data = await res.json()
  return data
}

export interface Recipient {
  name: string
  phone: string
  ref?: string
}

// Fire-and-forget admin notification when any guest submits an RSVP.
// Sends one message per target phone using Managam's Fonnte token.
// Failures are swallowed — never block the guest's confirmation UI.
export async function sendRsvpAdminNotifications(args: {
  token: string
  targets: string[]
  message: string
}): Promise<void> {
  const { token, targets, message } = args
  if (!token || targets.length === 0 || !message) return
  await Promise.all(
    targets
      .map(normalizePhone)
      .filter(isValidPhone)
      .map(async target => {
        try {
          await sendWhatsApp(token, { target, message })
        } catch (e) {
          console.error('[rsvp-notify] error sending to', target, e)
        }
      })
  )
}

export function buildRsvpNotification(args: {
  attending: boolean
  guestName: string
  guests: number
  ref: string
}): string {
  const { attending, guestName, guests, ref } = args
  if (attending) {
    return [
      '🎉 *Konfirmasi Hadir!*',
      '',
      `*${guestName}* telah mengkonfirmasi kehadiran`,
      `👥 Jumlah tamu: *${guests} orang*`,
      `📋 Ref: ${ref}`,
      '',
      '_#BuildingMANAGAMVANturesWithGod_ 🌿',
    ].join('\n')
  }
  return [
    '😔 *Tidak Bisa Hadir*',
    '',
    `*${guestName}* menyampaikan tidak bisa hadir`,
    `📋 Ref: ${ref}`,
    '',
    '_#BuildingMANAGAMVANturesWithGod_ 🌿',
  ].join('\n')
}

export interface BulkResult {
  sent: number
  failed: number
  skipped: number
  skippedRecipients: { name: string; phone: string }[]
}

export async function sendBulkWhatsApp(
  token: string,
  recipients: Recipient[],
  messageTemplate: string
): Promise<BulkResult> {
  let sent = 0
  let failed = 0
  const skippedRecipients: { name: string; phone: string }[] = []

  for (const recipient of recipients) {
    // Normalize + validate at send time. Numbers entered via the RSVP form are
    // stored raw, so this is the last line of defence before Fonnte.
    const target = normalizePhone(recipient.phone)
    if (!isValidPhone(target)) {
      console.warn('[fonnte] skipping invalid number:', recipient.phone, 'name:', recipient.name)
      skippedRecipients.push({ name: recipient.name, phone: recipient.phone })
      continue
    }

    const message = messageTemplate
      .replace(/\{name\}/g, recipient.name)
      .replace(/\{Name\}/g, recipient.name)
      .replace(/\{ref\}/g, recipient.ref ?? '')
      .replace(
        /\{link\}/g,
        recipient.ref
          ? `https://managamvania.mrix.ai?ref=${recipient.ref}`
          : 'https://managamvania.mrix.ai'
      )

    try {
      console.log('[fonnte] sending to:', target, 'name:', recipient.name)
      const result = await sendWhatsApp(token, {
        target,
        message,
      })
      console.log('[fonnte] response:', result)
      if (result.status) sent++
      else failed++
    } catch (e) {
      console.error('[fonnte] error:', e)
      failed++
    }

    await new Promise(r => setTimeout(r, 1000))
  }

  return { sent, failed, skipped: skippedRecipients.length, skippedRecipients }
}
