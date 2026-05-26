/* eslint-disable no-console */
import { test, expect, Page } from '@playwright/test'

const ADMIN_PIN = process.env.ADMIN_PIN ?? '20062026'

// One dedicated row per test so the suite is order-independent and
// state from one case can't leak into another. Phones are distinct
// so admin search returns exactly one row per name.
const ROWS = [
  { tag: 'confirmed', name: 'TEST RSVP Confirmed', phone: '6280000010' },
  { tag: 'declined',  name: 'TEST RSVP Declined',  phone: '6280000011' },
  { tag: 'pending',   name: 'TEST RSVP Pending',   phone: '6280000012' },
  { tag: 'edit',      name: 'TEST RSVP Edit',      phone: '6280000013' },
  { tag: 'deadline',  name: 'TEST RSVP Deadline',  phone: '6280000014' },
] as const
type RowTag = typeof ROWS[number]['tag']

// Resolved by the beforeAll seed step. Indexed by row tag.
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
  const q = (v: string) => `"${v.replace(/"/g, '""')}"`
  // guests=2 across the board — enough seats for the RSVP flow.
  const body = rows
    .map(r => [r.name, r.phone, '2', 'rsvp-persist', 'agam'].map(q).join(','))
    .join('\n')
  return header + '\n' + body
}

async function importCsv(page: Page, csv: string) {
  await page.goto('/admin/invitees')
  await page.waitForTimeout(800)
  const buffer = Buffer.from(csv, 'utf-8')
  const fileChooserPromise = page.waitForEvent('filechooser')
  await page.click('label[for="csv-import"]')
  const chooser = await fileChooserPromise
  await chooser.setFiles({
    name: 'rsvp-persistence.csv',
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
  await page.fill('input[placeholder*="Cari"]', '')
  await page.waitForTimeout(300)
  await page.fill('input[placeholder*="Cari"]', name)
  await page.waitForTimeout(700)
  const row = page.locator('tr').filter({ hasText: name }).first()
  await expect(row).toBeVisible({ timeout: 10000 })
  const btn = row.locator('button[data-ref]')
  if (await btn.count() === 0) return null
  return await btn.getAttribute('data-ref')
}

async function cleanupRsvpRows(page: Page): Promise<number> {
  const dialogHandler = (d: { accept: () => Promise<void> }) => d.accept()
  page.on('dialog', dialogHandler)
  let removed = 0
  try {
    for (let i = 0; i < 30; i++) {
      await page.goto('/admin/invitees')
      await page.waitForTimeout(900)
      await page.fill('input[placeholder*="Cari"]', 'TEST RSVP')
      await page.waitForTimeout(700)
      const rows = page.locator('tr').filter({ hasText: 'TEST RSVP' })
      if ((await rows.count()) === 0) break
      try {
        await rows.first()
          .locator('button:has-text("Hapus")')
          .click({ timeout: 5000 })
        await page.waitForTimeout(1100)
        removed++
      } catch { break }
    }
  } finally { page.off('dialog', dialogHandler) }
  return removed
}

// Open the personal link and walk through envelope → RSVP. If
// `hadir` is null, only opens the link (used for the pending case).
async function openInvite(page: Page, ref: string) {
  await page.goto(`/?ref=${ref}`)
  await page.waitForLoadState('networkidle')
  await page.waitForSelector('#envelope-screen', {
    state: 'visible', timeout: 12000,
  })
  await page.locator('#envelope-screen').click({ force: true })
  await page.waitForTimeout(1500)
}

async function doRsvp(page: Page, hadir: boolean) {
  await page.locator('#rsvp').scrollIntoViewIfNeeded()
  await page.waitForTimeout(800)
  if (hadir) {
    await page.click('#hadir-btn', { force: true })
    await page.waitForTimeout(800)
    await page.waitForSelector('#seat-selector', {
      state: 'visible', timeout: 10000,
    })
    // Wait briefly for guestData to settle before picking a seat,
    // otherwise the selector may still be at defaultMaxGuests=1.
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
  await page.waitForSelector('text=Terima kasih!', {
    state: 'visible', timeout: 20000,
  })
}

// ─── Tests ──────────────────────────────────────────────────────

test.describe.serial('RSVP persistence across reloads', () => {
  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await loginAdmin(page)
    const pre = await cleanupRsvpRows(page)
    console.log(`[setup] pre-cleanup removed ${pre} stale TEST RSVP rows`)
    await importCsv(page, buildCsv(ROWS))
    for (const r of ROWS) {
      const ref = await getRef(page, r.name)
      if (!ref) throw new Error(`No ref generated for ${r.name}`)
      refs[r.tag] = ref
      console.log(`[setup] ${r.name} → ref=${ref}`)
    }
    await ctx.close()
  })

  test.afterAll(async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await loginAdmin(page)
    const post = await cleanupRsvpRows(page)
    console.log(`[teardown] post-cleanup removed ${post} TEST RSVP rows`)
    await ctx.close()
  })

  test('1. Confirmed guest sees ticket on refresh', async ({ page }) => {
    const ref = refs.confirmed
    expect(ref).toBeTruthy()

    await openInvite(page, ref)
    await doRsvp(page, true)

    // Reload — the page should hydrate straight into the ticket screen.
    await page.goto(`/?ref=${ref}`)
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('#envelope-screen', {
      state: 'visible', timeout: 12000,
    })
    await page.locator('#envelope-screen').click({ force: true })
    await page.waitForTimeout(1500)
    await page.locator('#rsvp').scrollIntoViewIfNeeded()
    await page.waitForTimeout(1500)

    await expect(page.locator('text=Terima kasih!')).toBeVisible({ timeout: 8000 })
    await expect(page.locator('text=TIKET UNDANGAN ANDA')).toBeVisible({ timeout: 8000 })
    await expect(page.locator('img[alt="QR Ticket"]')).toBeVisible({ timeout: 8000 })
    await expect(page.locator('#ubah-kehadiran-btn')).toBeVisible()
    // Form must not be back.
    await expect(page.locator('#hadir-btn')).toHaveCount(0)
  })

  test('2. Declined guest sees thank you on refresh', async ({ page }) => {
    const ref = refs.declined
    expect(ref).toBeTruthy()

    await openInvite(page, ref)
    await doRsvp(page, false)

    await page.goto(`/?ref=${ref}`)
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('#envelope-screen', {
      state: 'visible', timeout: 12000,
    })
    await page.locator('#envelope-screen').click({ force: true })
    await page.waitForTimeout(1500)
    await page.locator('#rsvp').scrollIntoViewIfNeeded()
    await page.waitForTimeout(1500)

    await expect(page.locator('text=Terima kasih!')).toBeVisible({ timeout: 8000 })
    // Decline branch wording — "doa dan restu" / "tetap berarti".
    await expect(
      page.locator('text=/doa dan restu|tetap berarti/i')
    ).toBeVisible({ timeout: 8000 })
    // No ticket / QR for declined guests.
    await expect(page.locator('img[alt="QR Ticket"]')).toHaveCount(0)
    await expect(page.locator('text=TIKET UNDANGAN ANDA')).toHaveCount(0)
    // Edit link still allowed before deadline.
    await expect(page.locator('#ubah-kehadiran-btn')).toBeVisible()
    await expect(page.locator('#hadir-btn')).toHaveCount(0)
  })

  test('3. Pending guest still sees the RSVP form', async ({ page }) => {
    const ref = refs.pending
    expect(ref).toBeTruthy()

    // Open & close once (no submission), then reload.
    await openInvite(page, ref)
    await page.goto(`/?ref=${ref}`)
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('#envelope-screen', {
      state: 'visible', timeout: 12000,
    })
    await page.locator('#envelope-screen').click({ force: true })
    await page.waitForTimeout(1500)
    await page.locator('#rsvp').scrollIntoViewIfNeeded()
    await page.waitForTimeout(1500)

    // The form must still be present, not the post-submit screen.
    await expect(page.locator('#hadir-btn')).toBeVisible({ timeout: 8000 })
    await expect(page.locator('#tidak-hadir-btn')).toBeVisible()
    await expect(page.locator('#ubah-kehadiran-btn')).toHaveCount(0)
  })

  test('4. "Ubah kehadiran" reopens the form with values preserved',
    async ({ page }) => {
      const ref = refs.edit
      expect(ref).toBeTruthy()

      await openInvite(page, ref)
      await doRsvp(page, true)

      // Reload → ticket screen → click edit link → form reopens.
      await page.goto(`/?ref=${ref}`)
      await page.waitForLoadState('networkidle')
      await page.waitForSelector('#envelope-screen', {
        state: 'visible', timeout: 12000,
      })
      await page.locator('#envelope-screen').click({ force: true })
      await page.waitForTimeout(1500)
      await page.locator('#rsvp').scrollIntoViewIfNeeded()
      await page.waitForTimeout(1500)

      const editBtn = page.locator('#ubah-kehadiran-btn')
      await expect(editBtn).toBeVisible({ timeout: 8000 })
      await editBtn.click()
      await page.waitForTimeout(400)

      // Form is back.
      await expect(page.locator('#hadir-btn')).toBeVisible()
      await expect(page.locator('#tidak-hadir-btn')).toBeVisible()
      // Name preserved (locked input still carries the value).
      const nameInput = page.locator('input[placeholder*="Nama"]').first()
      await expect(nameInput).toHaveValue('TEST RSVP Edit')
      // Attendance preserved: the hidden radio for attending=true is checked.
      const hadirRadio = page.locator('input[name="attendance"][value="true"]')
      await expect(hadirRadio).toBeChecked()
    })

  test('5. After the deadline the edit link is hidden', async ({ page }) => {
    const ref = refs.deadline
    expect(ref).toBeTruthy()

    // Install a fake clock BEFORE any navigation so the in-page
    // `Date.now() < RSVP_DEADLINE_MS` check sees a post-deadline time.
    // Wedding is 2026-06-20; deadline is 2026-06-14 23:59:59 Jakarta.
    // 2026-06-15 09:00 WIB sits cleanly past it.
    await page.clock.install({
      time: new Date('2026-06-15T09:00:00+07:00'),
    })

    await openInvite(page, ref)
    await doRsvp(page, true)

    await page.goto(`/?ref=${ref}`)
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('#envelope-screen', {
      state: 'visible', timeout: 12000,
    })
    await page.locator('#envelope-screen').click({ force: true })
    await page.waitForTimeout(1500)
    await page.locator('#rsvp').scrollIntoViewIfNeeded()
    await page.waitForTimeout(1500)

    // Persistent screen is shown (this guest is confirmed)…
    await expect(page.locator('text=Terima kasih!')).toBeVisible({ timeout: 8000 })
    // …but the edit affordance is gone because the deadline passed.
    await expect(page.locator('#ubah-kehadiran-btn')).toHaveCount(0)
  })
})
