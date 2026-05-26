/* eslint-disable no-console */
import { test, expect, Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const ADMIN_PIN = process.env.ADMIN_PIN ?? '20062026'

// Reuse the same Supabase fallback the app uses so the test runs
// against the same project. Anon key has UPDATE on the four whitelisted
// settings keys (see 002_rsvp_notifications.sql).
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL
  ?? 'https://bawnvpgjpueqdebjqcjp.supabase.co'
const SUPABASE_ANON =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhd252cGdqcHVlcWRlYmpxY2pwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMjI5NzksImV4cCI6MjA5NDU5ODk3OX0.KXqGWTee1_URiWRnHozT8mIJUf4EsYQy80ne3Rtfkyo'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)

const MOCK_TOKEN = 'MOCK_RSVP_NOTIFY_TOKEN'

const NOTIFY_NUMBERS = {
  managam: '6281263387707',
  vania:   '6281542119177',
}

const ROWS = [
  { tag: 'hadir',   name: 'TEST Notify Hadir',   phone: '6280000020' },
  { tag: 'tidak',   name: 'TEST Notify Tidak',   phone: '6280000021' },
  { tag: 'fail',    name: 'TEST Notify Fail',    phone: '6280000022' },
] as const

const refs: Record<string, string> = {}
let priorToken: string | null = null

// ─── Helpers ────────────────────────────────────────────────────

async function loginAdmin(page: Page) {
  await page.goto('/admin/login')
  await page.waitForTimeout(800)
  await page.keyboard.type(ADMIN_PIN)
  await page.waitForURL(/\/admin$/, { timeout: 8000 })
}

function buildCsv(rows: readonly typeof ROWS[number][]): string {
  const header = 'name,phone,guests,notes,sender'
  const q = (v: string) => `"${v.replace(/"/g, '""')}"`
  return header + '\n' + rows
    .map(r => [r.name, r.phone, '2', 'rsvp-notify', 'agam'].map(q).join(','))
    .join('\n')
}

async function importCsv(page: Page, csv: string) {
  await page.goto('/admin/invitees')
  await page.waitForTimeout(800)
  const buffer = Buffer.from(csv, 'utf-8')
  const fileChooserPromise = page.waitForEvent('filechooser')
  await page.click('label[for="csv-import"]')
  const chooser = await fileChooserPromise
  await chooser.setFiles({
    name: 'rsvp-notify.csv',
    mimeType: 'text/csv',
    buffer,
  })
  await page.waitForSelector('button:has-text("IMPORT")', {
    state: 'visible', timeout: 5000,
  })
  await page.click('button:has-text("IMPORT")')
  page.once('dialog', d => d.accept())
  await page.waitForTimeout(3000)
}

async function getRef(page: Page, name: string): Promise<string | null> {
  await page.goto('/admin/invitees')
  await page.waitForTimeout(800)
  await page.fill('input[placeholder*="Cari"]', name)
  await page.waitForTimeout(700)
  const row = page.locator('tr').filter({ hasText: name }).first()
  await expect(row).toBeVisible({ timeout: 10000 })
  const btn = row.locator('button[data-ref]')
  if (await btn.count() === 0) return null
  return await btn.getAttribute('data-ref')
}

async function cleanupRows(page: Page): Promise<number> {
  const handler = (d: { accept: () => Promise<void> }) => d.accept()
  page.on('dialog', handler)
  let removed = 0
  try {
    for (let i = 0; i < 20; i++) {
      await page.goto('/admin/invitees')
      await page.waitForTimeout(900)
      await page.fill('input[placeholder*="Cari"]', 'TEST Notify')
      await page.waitForTimeout(700)
      const rows = page.locator('tr').filter({ hasText: 'TEST Notify' })
      if ((await rows.count()) === 0) break
      try {
        await rows.first()
          .locator('button:has-text("Hapus")')
          .click({ timeout: 5000 })
        await page.waitForTimeout(1100)
        removed++
      } catch { break }
    }
  } finally { page.off('dialog', handler) }
  return removed
}

async function setToken(value: string) {
  const { error } = await supabase
    .from('settings')
    .update({ value })
    .eq('key', 'fonnte_token_agam')
  if (error) throw error
}

async function readToken(): Promise<string | null> {
  const { data } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'fonnte_token_agam')
    .single()
  return (data?.value as string | undefined) ?? null
}

async function openAndRsvp(page: Page, ref: string, hadir: boolean) {
  await page.goto(`/?ref=${ref}`)
  await page.waitForLoadState('networkidle')
  await page.waitForSelector('#envelope-screen', {
    state: 'visible', timeout: 12000,
  })
  await page.locator('#envelope-screen').click({ force: true })
  await page.waitForTimeout(1500)
  await page.locator('#rsvp').scrollIntoViewIfNeeded()
  await page.waitForTimeout(800)
  if (hadir) {
    await page.click('#hadir-btn', { force: true })
    await page.waitForTimeout(800)
    await page.waitForSelector('#seat-selector', {
      state: 'visible', timeout: 10000,
    })
    const sel = page.locator('#seat-selector')
    const deadline = Date.now() + 5000
    while ((await sel.locator('option').count()) < 2 && Date.now() < deadline) {
      await page.waitForTimeout(200)
    }
    await sel.selectOption('2').catch(() => {})
  } else {
    await page.click('#tidak-hadir-btn', { force: true })
    await page.waitForTimeout(500)
  }
  await page.locator('button:has-text("KONFIRMASI")').click()
}

// ─── Tests ──────────────────────────────────────────────────────

test.describe.serial('RSVP admin WA notifications', () => {
  test.beforeAll(async ({ browser }) => {
    // Stash the real token so we can restore it in afterAll.
    priorToken = await readToken()
    await setToken(MOCK_TOKEN)
    console.log(`[setup] swapped fonnte_token_agam (was ${
      priorToken ? '<set>' : '<empty>'
    } → mock)`)

    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await loginAdmin(page)
    const pre = await cleanupRows(page)
    console.log(`[setup] pre-cleanup removed ${pre} stale TEST Notify rows`)
    await importCsv(page, buildCsv(ROWS))
    for (const r of ROWS) {
      const ref = await getRef(page, r.name)
      if (!ref) throw new Error(`No ref for ${r.name}`)
      refs[r.tag] = ref
      console.log(`[setup] ${r.name} → ref=${ref}`)
    }
    await ctx.close()
  })

  test.afterAll(async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await loginAdmin(page)
    const post = await cleanupRows(page)
    console.log(`[teardown] post-cleanup removed ${post} TEST Notify rows`)
    await ctx.close()
    // Restore whatever token was there before — empty string is fine
    // (the migration ships with empty by default).
    await setToken(priorToken ?? '')
    console.log('[teardown] restored fonnte_token_agam')
  })

  test('1. Hadir RSVP fires admin notifications to both numbers',
    async ({ page, context }) => {
      const hits: { target: string; message: string }[] = []
      await context.route('https://api.fonnte.com/**', async (route, req) => {
        try {
          const body = req.postDataJSON()
          hits.push({
            target: body.target ?? '',
            message: body.message ?? '',
          })
        } catch {}
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: true, id: 'mock-' + Date.now() }),
        })
      })

      await openAndRsvp(page, refs.hadir, true)
      await expect(page.locator('text=Terima kasih!')).toBeVisible({ timeout: 20000 })
      // Give the fire-and-forget notification a moment to land.
      await page.waitForTimeout(2000)

      const managam = hits.find(h => h.target === NOTIFY_NUMBERS.managam)
      const vania   = hits.find(h => h.target === NOTIFY_NUMBERS.vania)
      expect(managam, 'Managam notify hit').toBeDefined()
      expect(vania, 'Vania notify hit').toBeDefined()

      // Both should carry the hadir-flavored body.
      for (const h of [managam!, vania!]) {
        expect(h.message).toContain('Konfirmasi Hadir')
        expect(h.message).toContain('TEST Notify Hadir')
        expect(h.message).toContain('Jumlah tamu: *2 orang*')
        expect(h.message).toContain(`Ref: ${refs.hadir}`)
        expect(h.message).toContain('#BuildingMANAGAMVANturesWithGod')
      }
    })

  test('2. Tidak Hadir RSVP fires admin notifications to both numbers',
    async ({ page, context }) => {
      const hits: { target: string; message: string }[] = []
      await context.route('https://api.fonnte.com/**', async (route, req) => {
        try {
          const body = req.postDataJSON()
          hits.push({
            target: body.target ?? '',
            message: body.message ?? '',
          })
        } catch {}
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: true, id: 'mock-' + Date.now() }),
        })
      })

      await openAndRsvp(page, refs.tidak, false)
      await expect(page.locator('text=Terima kasih!')).toBeVisible({ timeout: 20000 })
      await page.waitForTimeout(2000)

      const managam = hits.find(h => h.target === NOTIFY_NUMBERS.managam)
      const vania   = hits.find(h => h.target === NOTIFY_NUMBERS.vania)
      expect(managam, 'Managam notify hit').toBeDefined()
      expect(vania, 'Vania notify hit').toBeDefined()

      for (const h of [managam!, vania!]) {
        expect(h.message).toContain('Tidak Bisa Hadir')
        expect(h.message).toContain('TEST Notify Tidak')
        expect(h.message).toContain(`Ref: ${refs.tidak}`)
        // Decline message must not advertise a seat count.
        expect(h.message).not.toContain('Jumlah tamu')
      }
    })

  test('3. Notification failure does not block the success UI',
    async ({ page, context }) => {
      // Force Fonnte to error so the notify promise rejects. RSVP
      // confirmation must still complete normally for the guest.
      await context.route('https://api.fonnte.com/**', async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ status: false, reason: 'mock-failure' }),
        })
      })

      await openAndRsvp(page, refs.fail, true)
      await expect(page.locator('text=Terima kasih!'))
        .toBeVisible({ timeout: 20000 })
      // QR for the confirmed-hadir branch should still appear.
      await expect(page.locator('img[alt="QR Ticket"]'))
        .toBeVisible({ timeout: 8000 })
    })
})
