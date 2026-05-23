import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SB_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SB_SERVICE_KEY')!
const FONNTE_TOKEN = Deno.env.get('FONNTE_TOKEN')!

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY
)

const TEMPLATES = {
  reminder_rsvp: `Syalom, {name}! 🌿\n\nKiranya damai sejahtera Tuhan menyertai Bapak/Ibu/Saudara/i hari ini 🙏\n\nKami mengingatkan dengan kasih — *konfirmasi kehadiran* ditutup *14 Juni 2026*.\n\n📅 *Sabtu, 20 Juni 2026 · 10:00 WIB*\n📍 GMS Central Park – Hall B, Jakarta Barat\n\n🔗 https://managamvania.mrix.ai/u/reminder\n\n_"There is a time for everything, and a season for every activity under the heavens."_\n— Ecclesiastes 3:1 🌿\n\nTerima kasih atas doa dan kasih Anda 🙏\n*Managam & Vania*`,
  h7: `Syalom, {name}! 🌿🎉\n\n*Haleluya — tinggal 7 hari lagi!*\n\nIa yang memulai, Ia yang menyelesaikan! 🙌\nKami sangat menantikan kehadiran dan doa restu Bapak/Ibu/Saudara/i pada:\n\n📅 *Sabtu, 20 Juni 2026 · 10:00 WIB*\n📍 GMS Central Park – Hall B, Jakarta Barat\n\n🔗 https://managamvania.mrix.ai/u/h7\n\n_"There is a time for everything."_\n— Ecclesiastes 3:1 🌿\n\nSampai berjumpa di hari yang penuh berkat!\n*#BuildingMANAGAMVANturesWithGod* 🙏\n*Managam & Vania*`,
}

async function sendWhatsApp(
  phone: string,
  message: string
): Promise<boolean> {
  const res = await fetch('https://api.fonnte.com/send', {
    method: 'POST',
    headers: {
      'Authorization': FONNTE_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      target: phone,
      message,
      countryCode: '62',
    }),
  })
  const data = await res.json()
  return data.status === true
}

serve(async (req) => {
  const { type } = await req.json() as {
    type: 'reminder_rsvp' | 'h7'
  }

  const filter = type === 'reminder_rsvp'
    ? { column: 'rsvp_status', value: 'pending' }
    : { column: 'attending', value: true }

  const { data: invitees, error } = await supabase
    .from('invitees')
    .select('name, phone')
    .eq(filter.column, filter.value)

  if (error || !invitees?.length) {
    return new Response(
      JSON.stringify({ error: error?.message ?? 'no recipients' }),
      { status: 400 }
    )
  }

  const template = TEMPLATES[type]
  let sent = 0
  let failed = 0

  for (const inv of invitees) {
    const message = template.replace(/\{name\}/g, inv.name)
    const ok = await sendWhatsApp(inv.phone, message)
    if (ok) sent++
    else failed++
    await new Promise(r => setTimeout(r, 1000))
  }

  await supabase.from('message_log').insert({
    recipient_count: sent,
    message: template,
    recipients: invitees,
    status: failed === 0 ? 'sent' : 'partial',
  })

  return new Response(
    JSON.stringify({ sent, failed, total: invitees.length }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
