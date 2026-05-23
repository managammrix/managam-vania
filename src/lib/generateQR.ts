import QRCode from 'qrcode'

export interface QRTicketData {
  name: string
  ref: string
  guests: number
}

export async function generateQRTicket(
  data: QRTicketData
): Promise<string> {
  const qrUrl =
    `https://managamvania.mrix.ai/checkin?ref=${data.ref}`

  const qrDataUrl = await QRCode.toDataURL(qrUrl, {
    width: 200,
    margin: 2,
    color: {
      dark: '#1e3d2a',
      light: '#faf6ef',
    },
    errorCorrectionLevel: 'M',
  })

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!

  canvas.width = 600
  canvas.height = 800

  // Background
  ctx.fillStyle = '#faf6ef'
  ctx.fillRect(0, 0, 600, 800)

  // Forest green header bar
  ctx.fillStyle = '#1e3d2a'
  ctx.fillRect(0, 0, 600, 140)

  // Header: M & V
  ctx.fillStyle = '#b8965a'
  ctx.font = '500 18px "Cinzel", serif'
  ctx.textAlign = 'center'
  ctx.fillText('M & V', 300, 45)

  // Header: Managam & Vania
  ctx.fillStyle = '#faf6ef'
  ctx.font = 'italic 32px "Cormorant Garamond", serif'
  ctx.fillText('Managam & Vania', 300, 90)

  // Header: date
  ctx.fillStyle = '#9db89f'
  ctx.font = '400 13px "Cinzel", serif'
  ctx.fillText('20 · 06 · 2026', 300, 125)

  // QR code image
  const qrImg = new Image()
  await new Promise<void>((resolve) => {
    qrImg.onload = () => resolve()
    qrImg.src = qrDataUrl
  })

  // QR background card
  ctx.fillStyle = '#ffffff'
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath()
    ctx.roundRect(175, 160, 250, 250, 12)
    ctx.fill()
  } else {
    ctx.fillRect(175, 160, 250, 250)
  }

  // Draw QR
  ctx.drawImage(qrImg, 200, 175, 200, 200)

  // Divider
  ctx.strokeStyle = '#d9cdb8'
  ctx.lineWidth = 0.5
  ctx.beginPath()
  ctx.moveTo(60, 440)
  ctx.lineTo(540, 440)
  ctx.stroke()

  // Guest name label
  ctx.fillStyle = '#6b8f71'
  ctx.font = '400 11px "Cinzel", serif'
  ctx.textAlign = 'center'
  ctx.fillText('KEPADA', 300, 475)

  // Guest name
  ctx.fillStyle = '#1e3d2a'
  ctx.font = 'italic 36px "Cormorant Garamond", serif'
  ctx.fillText(data.name, 300, 525)

  // Ref code
  ctx.fillStyle = '#b8965a'
  ctx.font = '400 11px "Cinzel", serif'
  ctx.fillText(`REF: ${data.ref.toUpperCase()}`, 300, 565)

  // Divider
  ctx.strokeStyle = '#d9cdb8'
  ctx.lineWidth = 0.5
  ctx.beginPath()
  ctx.moveTo(60, 590)
  ctx.lineTo(540, 590)
  ctx.stroke()

  // Seats label
  ctx.fillStyle = '#6b8f71'
  ctx.font = '400 10px "Cinzel", serif'
  ctx.fillText('JUMLAH TAMU', 300, 625)

  // Seats number
  ctx.fillStyle = '#1e3d2a'
  ctx.font = '500 48px "Cormorant Garamond", serif'
  ctx.fillText(String(data.guests), 300, 685)

  // Hashtag
  ctx.fillStyle = '#9db89f'
  ctx.font = '400 10px "Cinzel", serif'
  ctx.fillText(
    '#BuildingMANAGAMVANturesWithGod',
    300, 760
  )

  // Bottom accent line
  ctx.fillStyle = '#1e3d2a'
  ctx.fillRect(0, 780, 600, 20)

  return canvas.toDataURL('image/png')
}

export async function downloadQRTicket(
  data: QRTicketData
): Promise<void> {
  const dataUrl = await generateQRTicket(data)
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = `tiket-${data.name.replace(/\s+/g, '-').toLowerCase()}-mv2026.png`
  a.click()
}
