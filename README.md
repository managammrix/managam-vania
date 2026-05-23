# Managam & Vania — Wedding Invitation

**Live:** https://managamvania.mrix.ai  
**Hashtag:** #BuildingMANAGAMVANturesWithGod  
**Date:** 20 Juni 2026

---

## Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 14 (static export) |
| Hosting | Cloudflare Pages |
| Database + Storage | Supabase |
| Domain | managamvania.mrix.ai (Cloudflare DNS) |
| CI/CD | GitHub Actions → Cloudflare Pages |

---

## Setup (one-time)

### 1. Clone & install
```bash
git clone https://github.com/YOUR_ORG/managam-vania.git
cd managam-vania
npm install
```

### 2. Environment variables
```bash
cp .env.local.example .env.local
# Fill in your Supabase URL and anon key
```

### 3. Supabase — run schema
- Open your Supabase project dashboard
- Go to **SQL Editor → New query**
- Paste and run `supabase/schema.sql`

### 4. Upload pre-wedding photos
- Go to **Storage → prewedding** bucket
- Upload photos named `01.jpg`, `02.jpg`, ... `18.jpg`
- They load in filename order into the editorial grid

### 5. Local dev
```bash
npm run dev
# Open http://localhost:3000
```

### 6. Local dev (admin panel)
The `/admin` panel calls a Cloudflare Pages Function at `/api/admin`. Pages Functions don't run under `next dev` — use Wrangler to serve the built output instead:
```bash
cp .dev.vars.example .dev.vars
# Fill in real values in .dev.vars (ADMIN_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
npm run build
npx wrangler pages dev out
# Admin available at http://localhost:8788/admin
```

---

## Deploy

### Cloudflare Pages (first time)
1. Push this repo to GitHub
2. Go to **Cloudflare Dashboard → Pages → Create project**
3. Connect GitHub → select `managam-vania`
4. Build settings:
   - Build command: `npm run build`
   - Build output: `out`
5. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. Deploy

### Custom domain
1. In Cloudflare Pages project → **Custom domains**
2. Add `managamvania.mrix.ai`
3. Cloudflare auto-creates the CNAME in your `mrix.ai` DNS zone

### GitHub Actions (subsequent deploys)
Add these secrets to your GitHub repo (**Settings → Secrets**):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `CLOUDFLARE_API_TOKEN` (from Cloudflare → My Profile → API Tokens → Edit Cloudflare Pages)
- `CLOUDFLARE_ACCOUNT_ID` (from Cloudflare dashboard sidebar)

Every push to `main` auto-deploys. ✓

---

## Edge Functions (scheduled WhatsApp blasts)

The `send-blast` Edge Function fires WhatsApp messages to filtered groups of invitees. It's invoked on a schedule via `pg_cron` — see `supabase/cron.sql`.

```bash
# Deploy the send-blast function
supabase functions deploy send-blast

# Set secrets
supabase secrets set FONNTE_TOKEN=your_token
supabase secrets set SUPABASE_URL=https://your-ref.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_key

# Test manually
supabase functions invoke send-blast \
  --body '{"type":"reminder_rsvp"}'
```

After the function is deployed, enable `pg_cron` + `pg_net` in **Database → Extensions**, then run `supabase/cron.sql` (substituting your project ref) to schedule the two automated blasts:
- Reminder RSVP — 7 Juni 2026 · 09:00 WIB → all pending invitees
- H-7 — 13 Juni 2026 · 09:00 WIB → all confirmed-attending invitees

---

## Project structure

```
managam-vania/
├── src/
│   ├── app/
│   │   ├── layout.tsx        # metadata, OG tags
│   │   └── page.tsx          # root — composes all sections
│   ├── components/
│   │   ├── EnvelopeScreen.tsx
│   │   ├── LangToggle.tsx
│   │   ├── NavDots.tsx
│   │   ├── SaveBar.tsx
│   │   ├── useReveal.ts
│   │   └── sections/
│   │       ├── CoverSection.tsx
│   │       ├── StorySection.tsx
│   │       ├── CoupleSection.tsx
│   │       ├── EventsSection.tsx
│   │       ├── RsvpSection.tsx
│   │       ├── GiftSection.tsx
│   │       ├── WishesSection.tsx
│   │       ├── GallerySection.tsx
│   │       └── ClosingSection.tsx
│   ├── lib/
│   │   ├── supabase.ts       # client + typed helpers
│   │   ├── translations.ts   # ID + EN strings
│   │   ├── useLang.ts        # language toggle hook
│   │   └── logo.ts           # base64 logo (zero-latency)
│   └── styles/
│       └── globals.css
├── supabase/
│   └── schema.sql            # paste into Supabase SQL editor
├── .github/workflows/
│   └── deploy.yml            # CI/CD
├── .cloudflare/pages.json
├── .env.local.example
├── next.config.js
└── README.md
```
