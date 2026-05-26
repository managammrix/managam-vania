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
      countryCode: payload.countryCode ?? '62',
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
    targets.filter(Boolean).map(async target => {
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

export async function sendBulkWhatsApp(
  token: string,
  recipients: Recipient[],
  messageTemplate: string
): Promise<{ sent: number; failed: number }> {
  let sent = 0
  let failed = 0

  for (const recipient of recipients) {
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
      console.log('[fonnte] sending to:', recipient.phone, 'name:', recipient.name)
      const result = await sendWhatsApp(token, {
        target: recipient.phone,
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

  return { sent, failed }
}
