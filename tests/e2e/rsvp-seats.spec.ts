/* eslint-disable no-console */
import { test, expect, Page } from '@playwright/test'

const ADMIN_PIN = process.env.ADMIN_PIN ?? '20062026'

// One row per case so tests can run independently and don't trample
// each other's seat counts.
const ROWS = [
  { tag: 'three', name: 'TEST Seats 3pax', phone: '6280000030', guests: 3 },
  { tag: 'one',   name: 'TEST Seats 1pax', phone: '6280000031', guests: 1 },
  { tag: 'four',  name: 'TEST Seats 4pax', phone: '6280000032', guests: 4 },
  { tag: 'two',   name: 'TEST Seats 2pax', phone: '6280000033', guests: 2 },
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
    .map(r => [r.name, r.phone, r.guests, 'rsvp-seats', 'agam'].map(q).join(','))
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
    name: 'rsvp-seats.csv',
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
      await page.fill('input[placeholder*="Cari"]', 'TEST Seats')
      await page.waitForTimeout(700)
      const rows = page.locator('tr').filter({ hasText: 'TEST Seats' })
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

// Drives the page from /?ref=… all the way to the visible seat
// selector, then polls until the option count settles at
// `expectedMax` (the per-invitee allotment). Returns the selector
// locator so the caller can read value / select / count.
async function openToSeatSelector(
  page: Page, ref: string, expectedMax: number
) {
  await page.goto(`/?ref=${ref}`)
  await page.waitForLoadState('networkidle')
  await page.waitForSelector('#envelope-screen', {
    state: 'visible', timeout: 12000,
  })
  await page.locator('#envelope-screen').click({ force: true })
  await page.waitForTimeout(1500)
  await page.locator('#rsvp').scrollIntoViewIfNeeded()
  await page.waitForTimeout(800)
  await page.click('#hadir-btn', { force: true })
  await page.waitForTimeout(800)
  await page.waitForSelector('#seat-selector', {
    state: 'visible', timeout: 10000,
  })
  const sel = page.locator('#seat-selector')
  // The selector first renders with defaultMaxGuests (=2) before
  // the per-invitee RPC settles. Poll until the option count matches
  // the invitee's allotment.
  const deadline = Date.now() + 8000
  while (
    (await sel.locator('option').count()) !== expectedMax &&
    Date.now() < deadline
  ) {
    await page.waitForTimeout(200)
  }
  return sel
}

// Read the admin table's `Tamu` column for a given guest name.
async function readAdminGuestCount(
  page: Page, name: string
): Promise<string> {
  await page.goto('/admin/invitees')
  await page.waitForTimeout(800)
  await page.fill('input[placeholder*="Cari"]', name)
  await page.waitForTimeout(800)
  // Same row-rendering as test-cases.spec.ts — for guests>0 the
  // text content of the guests cell is the bare number.
  const row = page.locator('tr').filter({ hasText: name }).first()
  await expect(row).toBeVisible({ timeout: 10000 })
  return (await row.innerText()).replace(/\s+/g, ' ').trim()
}

// ─── Tests ──────────────────────────────────────────────────────

test.describe.serial('RSVP seat selector defaults to max allotment', () => {
  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await loginAdmin(page)
    const pre = await cleanupRows(page)
    console.log(`[setup] pre-cleanup removed ${pre} stale TEST Seats rows`)
    await importCsv(page, buildCsv(ROWS))
    for (const r of ROWS) {
      const ref = await getRef(page, r.name)
      if (!ref) throw new Error(`No ref for ${r.name}`)
      refs[r.tag] = ref
      console.log(`[setup] ${r.name} (guests=${r.guests}) → ref=${ref}`)
    }
    await ctx.close()
  })

  test.afterAll(async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await loginAdmin(page)
    const post = await cleanupRows(page)
    console.log(`[teardown] post-cleanup removed ${post} TEST Seats rows`)
    await ctx.close()
  })

  test('1. 3pax invitee → selector pre-selected to 3', async ({ page }) => {
    const sel = await openToSeatSelector(page, refs.three, 3)
    await expect(sel.locator('option')).toHaveCount(3)
    await expect(sel).toHaveValue('3')
  })

  test('2. 1pax invitee → selector pre-selected to 1', async ({ page }) => {
    const sel = await openToSeatSelector(page, refs.one, 1)
    await expect(sel.locator('option')).toHaveCount(1)
    await expect(sel).toHaveValue('1')
  })

  test('3. 4pax invitee can drop to 2 and admin reflects the change',
    async ({ page }) => {
      const sel = await openToSeatSelector(page, refs.four, 4)
      await expect(sel.locator('option')).toHaveCount(4)
      // Pre-select defaults to 4 (the full allotment).
      await expect(sel).toHaveValue('4')

      await sel.selectOption('2')
      await expect(sel).toHaveValue('2')

      await page.locator('button:has-text("KONFIRMASI")').click()
      await expect(page.locator('text=Terima kasih!'))
        .toBeVisible({ timeout: 20000 })

      // Admin row should now reflect the confirmed seat count (2).
      await loginAdmin(page)
      const rowText = await readAdminGuestCount(page, 'TEST Seats 4pax')
      console.log('[case 3] admin row text:', rowText)
      // The guests cell renders just the bare number; ensure 2
      // appears in the row and 4 does not.
      expect(rowText).toMatch(/\b2\b/)
      expect(rowText).not.toMatch(/\b4\b/)
    })

  test('4. 2pax invitee selector caps at 2 options', async ({ page }) => {
    const sel = await openToSeatSelector(page, refs.two, 2)
    await expect(sel.locator('option')).toHaveCount(2)
    // Bonus: still pre-selected to the cap.
    await expect(sel).toHaveValue('2')
  })
})
