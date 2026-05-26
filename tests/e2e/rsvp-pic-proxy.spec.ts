/* eslint-disable no-console */
import { test, expect, Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const ADMIN_PIN = process.env.ADMIN_PIN ?? '20062026'

// Reuse the same anon Supabase config as the app so the test can
// read invitees.phone back after RSVP submission.
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL
  ?? 'https://bawnvpgjpueqdebjqcjp.supabase.co'
const SUPABASE_ANON =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhd252cGdqcHVlcWRlYmpxY2pwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMjI5NzksImV4cCI6MjA5NDU5ODk3OX0.KXqGWTee1_URiWRnHozT8mIJUf4EsYQy80ne3Rtfkyo'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)

// Cases — one row per scenario, with intentionally distinct names
// so the admin search + supabase select can pull them unambiguously.
const ROWS = [
  { tag: 'edit',     name: 'TEST PIC Editable',     phone: '6280000060', guests: 2 },
  { tag: 'override', name: 'TEST PIC Overwrite',    phone: '6280000061', guests: 2 },
  { tag: 'helper',   name: 'TEST PIC Helper',       phone: '6280000062', guests: 2 },
  { tag: 'ticket',   name: 'TEST PIC TicketClaim',  phone: '6280000063', guests: 3 },
] as const

const refs: Record<string, string> = {}

// ─── Helpers ────────────────────────────────────────────────────

async function loginAdmin(page: Page) {
  await page.goto('/admin/login')
  await page.waitForTimeout(800)
  await page.keyboard.type(ADMIN_PIN)
  await page.waitForURL(/\/admin$/, { timeout: 8000 })
}

function buildCsv(rows: readonly typeof ROWS[number][]): string {
  const header = 'name,phone,guests,notes,sender'
  const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
  return header + '\n' + rows
    .map(r => [r.name, r.phone, r.guests, 'pic-proxy', 'agam'].map(q).join(','))
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
    name: 'pic-proxy.csv',
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
      await page.fill('input[placeholder*="Cari"]', 'TEST PIC')
      await page.waitForTimeout(700)
      const rows = page.locator('tr').filter({ hasText: 'TEST PIC' })
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

// Anon SELECT on `invitees` is denied by RLS. The only anon-callable
// path that exposes the row's phone is the security-definer RPC
// get_invitee_by_ref, which returns the full row by ref.
async function readInviteePhone(ref: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('get_invitee_by_ref', {
    p_ref: ref,
  })
  if (error) {
    console.error('[readInviteePhone] rpc error:', error)
    return null
  }
  const row = (data as Array<{ phone: string | null }> | null)?.[0]
  return row?.phone ?? null
}

// Drives a guest page from /?ref=<…> through the envelope to the
// RSVP form. Stops before the HADIR/TIDAK HADIR click so callers
// can inspect the field state.
async function openToRsvpForm(page: Page, ref: string) {
  await page.goto(`/?ref=${ref}`)
  await page.waitForLoadState('networkidle')
  await page.waitForSelector('#envelope-screen', {
    state: 'visible', timeout: 12000,
  })
  await page.locator('#envelope-screen').click({ force: true })
  await page.waitForTimeout(1500)
  await page.locator('#rsvp').scrollIntoViewIfNeeded()
  await page.waitForTimeout(800)
}

// The phone input has no stable id today; locate it via its
// neighboring label "TELEPON / WHATSAPP".
function phoneInput(page: Page) {
  return page.locator('input[placeholder^="+62"]').first()
}
function nameInput(page: Page) {
  // Pre-filled value is the invitee's name; placeholder is "Nama Anda"
  // (or "Nama lengkap Anda" for physical anon).
  return page.locator('input[placeholder*="Nama"]').first()
}

// ─── Tests ──────────────────────────────────────────────────────

test.describe.serial('RSVP PIC proxy + helper texts + ticket claim info', () => {
  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await loginAdmin(page)
    const pre = await cleanupRows(page)
    console.log(`[setup] pre-cleanup removed ${pre} stale TEST PIC rows`)
    await importCsv(page, buildCsv(ROWS))
    for (const r of ROWS) {
      const ref = await getRef(page, r.name)
      if (!ref) throw new Error(`No ref for ${r.name}`)
      refs[r.tag] = ref
      // Read back the stored phone via the same RPC the form uses
      // so the test log shows whether normalizePhone or any other
      // step dropped the value before we even reach case 2.
      const storedPhone = await readInviteePhone(ref)
      console.log(
        `[setup] ${r.name} → ref=${ref} stored phone=${storedPhone}`
      )
      if (storedPhone !== r.phone) {
        console.warn(
          `[setup] ⚠ phone mismatch for ${r.name}: ` +
          `expected="${r.phone}" stored="${storedPhone}"`
        )
      }
    }
    await ctx.close()
  })

  test.afterAll(async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await loginAdmin(page)
    const post = await cleanupRows(page)
    console.log(`[teardown] post-cleanup removed ${post} TEST PIC rows`)
    await ctx.close()
  })

  test('1. Phone field is editable for every guest', async ({ page }) => {
    await openToRsvpForm(page, refs.edit)
    const phone = phoneInput(page)
    await expect(phone).toBeVisible()

    // Pre-filled with the imported phone.
    await expect(phone).toHaveValue('6280000060')
    // Not readOnly / not disabled.
    await expect(phone).not.toHaveAttribute('readonly', /.*/)
    await expect(phone).not.toBeDisabled()

    // We can actually type into it.
    await phone.fill('6280000099')
    await expect(phone).toHaveValue('6280000099')

    // Name should remain locked for non-physical-anon guests
    // (per the THING 1 answers — name is read-only by design).
    const nameEl = nameInput(page)
    await expect(nameEl).toHaveAttribute('readonly', /.*/)
  })

  test('2. New phone overwrites invitees.phone on submit',
    async ({ page }) => {
      const ref = refs.override
      const newPhone = '6280000777'
      const before = await readInviteePhone(ref)
      expect(before).toBe('6280000061')
      console.log('[case 2] phone before submit:', before)

      await openToRsvpForm(page, ref)
      const phone = phoneInput(page)
      await phone.fill(newPhone)
      await expect(phone).toHaveValue(newPhone)

      await page.click('#hadir-btn', { force: true })
      await page.waitForTimeout(800)
      await page.waitForSelector('#seat-selector', {
        state: 'visible', timeout: 10000,
      })
      await page.locator('button:has-text("KONFIRMASI")').click()
      await expect(page.locator('text=Terima kasih!'))
        .toBeVisible({ timeout: 20000 })

      // Give the RPC a beat to land before reading back.
      await page.waitForTimeout(1500)
      const after = await readInviteePhone(ref)
      console.log('[case 2] phone after submit:', after)
      expect(after).toBe(newPhone)
    })

  test('3. Helper texts visible below each field',
    async ({ page }) => {
      await openToRsvpForm(page, refs.helper)

      const nameHelper = page.locator('[data-testid="helper-name"]')
      await expect(nameHelper).toBeVisible()
      await expect(nameHelper).toContainText('Pastikan nama Anda sudah benar')
      await expect(nameHelper).toContainText('tertera di tiket undangan')

      const phoneHelper = page.locator('[data-testid="helper-phone"]')
      await expect(phoneHelper).toBeVisible()
      await expect(phoneHelper).toContainText('Pastikan nomor WhatsApp Anda aktif')
      await expect(phoneHelper).toContainText('konfirmasi')

      // Seats helper only renders after HADIR is selected (the
      // seat selector itself is conditional on attending===true).
      await page.click('#hadir-btn', { force: true })
      await page.waitForTimeout(800)
      const seatsHelper = page.locator('[data-testid="helper-seats"]')
      await expect(seatsHelper).toBeVisible({ timeout: 5000 })
      await expect(seatsHelper).toContainText('jumlah kotak makan')
      await expect(seatsHelper).toContainText('Souvenir dapat diambil')
    })

  test('4. QR ticket shows souvenir + kotak makan info with seat count',
    async ({ page }) => {
      const ref = refs.ticket
      await openToRsvpForm(page, ref)
      await page.click('#hadir-btn', { force: true })
      await page.waitForTimeout(800)
      await page.waitForSelector('#seat-selector', {
        state: 'visible', timeout: 10000,
      })
      // Row was seeded with guests=3 — the new pre-select should
      // already have it at 3, but be explicit.
      const sel = page.locator('#seat-selector')
      const deadline = Date.now() + 8000
      while (
        (await sel.locator('option').count()) !== 3 &&
        Date.now() < deadline
      ) {
        await page.waitForTimeout(200)
      }
      await sel.selectOption('3')

      await page.locator('button:has-text("KONFIRMASI")').click()
      await expect(page.locator('text=Terima kasih!'))
        .toBeVisible({ timeout: 20000 })

      // QR ticket block renders the claim info card.
      const claim = page.locator('[data-testid="ticket-claim-info"]')
      await expect(claim).toBeVisible({ timeout: 8000 })
      await expect(claim).toContainText('Souvenir:')
      await expect(claim).toContainText('1 per undangan')
      await expect(claim).toContainText('Kotak makan:')
      // Confirmed 3 seats → 3 lunch boxes.
      const count = page.locator('[data-testid="ticket-lunchbox-count"]')
      await expect(count).toHaveText('3')
      // And the human-facing "3 kotak" copy is in the same card.
      await expect(claim).toContainText('3 kotak')
    })
})
