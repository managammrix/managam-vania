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

export async function sendBulkWhatsApp(
  token: string,
  recipients: Array<{ name: string; phone: string }>,
  messageTemplate: string
): Promise<{ sent: number; failed: number }> {
  let sent = 0
  let failed = 0

  for (const recipient of recipients) {
    const message = messageTemplate
      .replace(/\{name\}/g, recipient.name)
      .replace(/\{Name\}/g, recipient.name)

    try {
      const result = await sendWhatsApp(token, {
        target: recipient.phone,
        message,
      })
      if (result.status) sent++
      else failed++
    } catch {
      failed++
    }

    await new Promise(r => setTimeout(r, 1000))
  }

  return { sent, failed }
}
