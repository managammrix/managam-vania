export interface TemplateVersion {
  label: string
  message: string
}

export interface Template {
  label: string
  versions: TemplateVersion[]
}

export const TEMPLATES: Template[] = [
  {
    label: 'Undangan Awal',
    versions: [
      {
        label: 'Panjang',
        message: `Syalom, {name}! 🌿\n\nPuji Tuhan — Ia yang telah memulai pekerjaan yang baik ini, Ia pula yang menyelesaikannya! 🙌\n\nDengan penuh sukacita dan ucapan syukur atas kesetiaan Tuhan, kami ingin bersaksi:\n\n*Tuhan telah menetapkan waktu-Nya* — dan kami akan melangsungkan Pernikahan Kudus kami:\n\n✝️ *Managam Raja Silalahi, S.Kom., M.Sc.*\n    Putra Bapak Saut Silalahi & Ibu Erna Sitinjak, S.K.M.\n\nbersama\n\n🌸 *Vania, S.Psi.*\n    Putri Bapak Pdt. Fredi (Tee Tjien Hian), S.Th. & Ibu Tan Tjoen Nio\n\n📅 *Sabtu, 20 Juni 2026*\n⛪ GMS Central Park – Hall B\n    Jl. Letjen S. Parman No. Kav. 28, Jakarta Barat\n🕙 Pukul 10:00 – 12:00 WIB\n\nKami mengundang Bapak/Ibu/Saudara/i *{name}* untuk hadir menjadi saksi atas karya Tuhan dalam hidup kami dan turut bersukacita bersama kami pada hari yang penuh berkat ini.\n\n_"For I know the plans I have for you, declares the Lord — plans to prosper you and not to harm you, plans to give you hope and a future."_\n— Jeremiah 29:11\n\nMohon konfirmasi kehadiran:\n🔗 https://managamvania.mrix.ai/u/awal\n\n*#BuildingMANAGAMVANturesWithGod* 🙏\nTuhan Yesus memberkati Bapak/Ibu/Saudara/i!\n\nDengan kasih dalam Kristus,\n*Managam & Vania*`,
      },
      {
        label: 'Sedang',
        message: `Syalom, {name}! 🌿\n\nPuji Tuhan — dengan penuh sukacita kami ingin bersaksi bahwa Tuhan telah menetapkan waktu-Nya bagi kami!\n\nKami akan melangsungkan Pernikahan Kudus:\n\n✝️ *Managam Raja Silalahi, S.Kom., M.Sc.*\n    Putra Bapak Saut Silalahi & Ibu Erna Sitinjak, S.K.M.\nbersama\n🌸 *Vania, S.Psi.*\n    Putri Bapak Pdt. Fredi (Tee Tjien Hian), S.Th. & Ibu Tan Tjoen Nio\n\n📅 *Sabtu, 20 Juni 2026 · 10:00 WIB*\n⛪ GMS Central Park – Hall B, Jakarta Barat\n\nKami mengundang *{name}* untuk hadir menjadi saksi atas karya Tuhan dalam hidup kami 🙌\n\n🔗 https://managamvania.mrix.ai/u/awal\n\n_"For I know the plans I have for you, declares the Lord — plans to give you hope and a future."_\n— Jeremiah 29:11\n\nTuhan Yesus memberkati 🙏\n*Managam & Vania*\n*#BuildingMANAGAMVANturesWithGod*`,
      },
      {
        label: 'Singkat',
        message: `Syalom, {name}! 🌿\n\nPuji Tuhan — kami akan melangsungkan Pernikahan Kudus kami:\n\n✝️ *Managam Raja Silalahi & Vania*\n\n📅 *Sabtu, 20 Juni 2026 · 10:00 WIB*\n⛪ GMS Central Park – Hall B, Jakarta Barat\n\nKami mengundang *{name}* untuk hadir menjadi saksi atas karya Tuhan dalam hidup kami.\n\n🔗 https://managamvania.mrix.ai/u/awal\n\n_"For I know the plans I have for you, declares the Lord."_\n— Jeremiah 29:11\n\nTuhan memberkati 🙏\n*Managam & Vania*`,
      },
    ],
  },
  {
    label: 'Reminder RSVP',
    versions: [
      {
        label: 'Panjang',
        message: `Syalom, {name}! 🌿\n\nKiranya damai sejahtera Tuhan menyertai Bapak/Ibu/Saudara/i hari ini 🙏\n\nKami mengingatkan dengan penuh kasih bahwa *konfirmasi kehadiran* pernikahan kami ditutup pada *14 Juni 2026*.\n\nKami percaya Tuhan sudah menetapkan siapa yang akan menjadi saksi pada hari bersejarah dalam hidup kami ini 🙌\n\n📅 *Sabtu, 20 Juni 2026 · 10:00 WIB*\n📍 GMS Central Park – Hall B, Jakarta Barat\n\nMohon konfirmasi kehadiran di:\n🔗 https://managamvania.mrix.ai/u/reminder\n\n_"There is a time for everything, and a season for every activity under the heavens."_\n— Ecclesiastes 3:1 🌿\n\nTerima kasih atas doa dan kasih Bapak/Ibu/Saudara/i 🙏\n\n*Tuhan memberkati!*\nManagam & Vania`,
      },
      {
        label: 'Sedang',
        message: `Syalom, {name}! 🌿\n\nKiranya damai sejahtera Tuhan menyertai Bapak/Ibu/Saudara/i hari ini 🙏\n\nKami mengingatkan dengan kasih — *konfirmasi kehadiran* ditutup *14 Juni 2026*.\n\n📅 *Sabtu, 20 Juni 2026 · 10:00 WIB*\n📍 GMS Central Park – Hall B, Jakarta Barat\n\n🔗 https://managamvania.mrix.ai/u/reminder\n\n_"There is a time for everything, and a season for every activity under the heavens."_\n— Ecclesiastes 3:1 🌿\n\nTerima kasih atas doa dan kasih Anda 🙏\n*Managam & Vania*`,
      },
      {
        label: 'Singkat',
        message: `Syalom, {name}! 🌿\n\nKonfirmasi kehadiran pernikahan kami ditutup *14 Juni 2026*.\n\n📅 *20 Juni 2026 · 10:00 WIB*\n📍 GMS Central Park – Hall B, Jakarta Barat\n\n🔗 https://managamvania.mrix.ai/u/reminder\n\nTuhan memberkati 🙏\n*Managam & Vania*`,
      },
    ],
  },
  {
    label: 'H-7',
    versions: [
      {
        label: 'Panjang',
        message: `Syalom, {name}! 🌿🎉\n\n*Haleluya — tinggal 7 hari lagi!*\n\nKami bersukacita dan memuliakan Tuhan atas kesetiaan-Nya yang luar biasa dalam perjalanan panjang ini. Ia yang memulai, Ia yang menyelesaikan! 🙌\n\nKami sangat menantikan kehadiran dan doa restu Bapak/Ibu/Saudara/i pada:\n\n📅 *Sabtu, 20 Juni 2026 · 10:00 WIB*\n📍 GMS Central Park – Hall B, Jakarta Barat\n\nDetail lengkap undangan:\n🔗 https://managamvania.mrix.ai/u/h7\n\n_"There is a time for everything, and a season for every activity under the heavens."_\n— Ecclesiastes 3:1 🌿\n\nSampai berjumpa di hari yang penuh kemuliaan-Nya!\n*#BuildingMANAGAMVANturesWithGod* 🙏\n\nTuhan Yesus memberkati!\n*Managam & Vania*`,
      },
      {
        label: 'Sedang',
        message: `Syalom, {name}! 🌿🎉\n\n*Haleluya — tinggal 7 hari lagi!*\n\nIa yang memulai, Ia yang menyelesaikan! 🙌\nKami sangat menantikan kehadiran dan doa restu Bapak/Ibu/Saudara/i pada:\n\n📅 *Sabtu, 20 Juni 2026 · 10:00 WIB*\n📍 GMS Central Park – Hall B, Jakarta Barat\n\n🔗 https://managamvania.mrix.ai/u/h7\n\n_"There is a time for everything."_\n— Ecclesiastes 3:1 🌿\n\nSampai berjumpa di hari yang penuh berkat!\n*#BuildingMANAGAMVANturesWithGod* 🙏\n*Managam & Vania*`,
      },
      {
        label: 'Singkat',
        message: `Syalom, {name}! 🌿🎉\n\n*Haleluya — tinggal 7 hari lagi!*\n\n📅 *20 Juni 2026 · 10:00 WIB*\n📍 GMS Central Park – Hall B, Jakarta Barat\n\n🔗 https://managamvania.mrix.ai/u/h7\n\nSampai berjumpa! 🙏\n*#BuildingMANAGAMVANturesWithGod*\n*Managam & Vania*`,
      },
    ],
  },
  {
    label: 'Tamu Kehormatan',
    versions: [
      {
        label: 'Panjang',
        message: `Syalom, {name}! 🌿\n\nKiranya kasih karunia dan damai sejahtera Tuhan Yesus Kristus menyertai Bapak/Ibu/Saudara/i 🙏\n\nDengan penuh hormat dan kasih dalam Kristus, kami ingin berbagi kabar sukacita ini:\n\n*Puji Tuhan — Ia telah menuntun perjalanan kami hingga pada hari yang telah Ia tetapkan.*\n\nKami akan melangsungkan Pernikahan Kudus kami pada *Sabtu, 20 Juni 2026* di Jakarta.\n\nKami memahami bahwa jarak dan situasi mungkin tidak memungkinkan kehadiran fisik Bapak/Ibu/Saudara/i — namun kami percaya *doa dan restu Anda adalah kekuatan* bagi kami.\n\nKiranya Anda turut bersukacita bersama kami dari jauh dan mengangkat kami dalam doa 🙌\n\nDetail undangan digital:\n🔗 https://managamvania.mrix.ai/u/hormat\n\n_"I press on toward the goal for the prize of the upward call of God in Christ Jesus."_\n— Philippians 3:14\n\nSalam dalam kasih Kristus Yesus,\n*Managam & Vania*\n*#BuildingMANAGAMVANturesWithGod*`,
      },
      {
        label: 'Sedang',
        message: `Syalom, {name}! 🌿\n\nDengan penuh hormat dan kasih dalam Kristus, kami ingin berbagi kabar sukacita ini:\n\n*Puji Tuhan* — kami akan melangsungkan Pernikahan Kudus kami pada *Sabtu, 20 Juni 2026* di Jakarta.\n\nKami memahami jarak dan kesibukan Bapak/Ibu/Saudara/i — namun kami percaya *doa dan restu Anda adalah kekuatan* bagi kami 🙏\n\n🔗 https://managamvania.mrix.ai/u/hormat\n\n_"I press on toward the goal for the prize of the upward call of God in Christ Jesus."_\n— Philippians 3:14\n\nSalam dalam kasih Kristus,\n*Managam & Vania*\n*#BuildingMANAGAMVANturesWithGod*`,
      },
      {
        label: 'Singkat',
        message: `Syalom, {name}! 🌿\n\nPuji Tuhan — kami akan melangsungkan Pernikahan Kudus kami pada *Sabtu, 20 Juni 2026* di Jakarta.\n\nDoa dan restu Anda adalah berkat terbesar bagi kami 🙏\n\n🔗 https://managamvania.mrix.ai/u/hormat\n\n_"I press on toward the goal."_\n— Philippians 3:14\n\nSalam dalam kasih Kristus,\n*Managam & Vania*`,
      },
    ],
  },
]
