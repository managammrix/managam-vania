/* eslint-disable no-console */
import { test, expect, Page, BrowserContext } from '@playwright/test'

const ADMIN_PIN = process.env.ADMIN_PIN ?? '20062026'

// Fixed phones + names so the test can search by either field
// without depending on what else is in the DB.
const MANUAL_CASES = [
  { name: 'TEST Manual Alice',        phone: '6280000001', sender: 'agam' as const },
  { name: 'TEST Manual Bob',          phone: '6280000002', sender: 'agam' as const },
  { name: 'TEST Manual Carol',        phone: '6280000003', sender: 'agam' as const },
  { name: 'TEST Manual Dan NoPhone',  phone: '',           sender: 'agam' as const },
]

// ─── Helpers ────────────────────────────────────────────────────

async function loginAdmin(page: Page) {
  await page.goto('/admin/login')
  await page.waitForTimeout(800)
  await page.keyboard.type(ADMIN_PIN)
  await page.waitForURL(/\/admin$/, { timeout: 8000 })
}

function buildCsv(rows: typeof MANUAL_CASES): string {
  const header = 'name,phone,guests,notes,sender'
  const q = (v: string) => `"${v.replace(/"/g, '""')}"`
  const body = rows
    .map(r => [r.name, r.phone, '2', 'manual-sel', r.sender].map(q).join(','))
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
    name: 'manual-selection.csv',
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

// Delete every row whose name starts with "TEST Manual". Pattern
// follows test-cases.spec.ts: re-navigate + re-search per iteration
// because each delete refreshes the admin table.
async function cleanupManualRows(page: Page): Promise<number> {
  const dialogHandler = (d: { accept: () => Promise<void> }) => d.accept()
  page.on('dialog', dialogHandler)
  let removed = 0
  try {
    for (let i = 0; i < 30; i++) {
      await page.goto('/admin/invitees')
      await page.waitForTimeout(900)
      await page.fill('input[placeholder*="Cari"]', 'TEST Manual')
      await page.waitForTimeout(700)
      const rows = page.locator('tr').filter({ hasText: 'TEST Manual' })
      const count = await rows.count()
      if (count === 0) break
      try {
        await rows.first()
          .locator('button:has-text("Hapus")')
          .click({ timeout: 5000 })
        await page.waitForTimeout(1100)
        removed++
      } catch {
        break
      }
    }
  } finally {
    page.off('dialog', dialogHandler)
  }
  return removed
}

async function gotoMessagesAndFillTokens(page: Page) {
  await page.goto('/admin/messages')
  await page.waitForTimeout(1500)
  await page.fill('input[placeholder*="Managam"]', 'MOCK_AGAM_TOKEN')
  await page.fill('input[placeholder*="Vania"]', 'MOCK_VANIA_TOKEN')
  await page.waitForTimeout(300)
}

async function setupFonnteStub(
  context: BrowserContext,
  hits: { target: string; message: string }[],
) {
  await context.route('https://api.fonnte.com/**', async (route, req) => {
    try {
      const body = req.postDataJSON()
      hits.push({
        target: body.target ?? '',
        message: (body.message ?? '').slice(0, 120),
      })
    } catch {}
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: true, id: 'mock-' + Date.now() }),
    })
  })
}

// Tick the only checkbox currently visible in the manual-results
// list. Use this *after* a search narrows results to one row.
async function checkOnlyVisibleResult(page: Page) {
  const cb = page.locator('[data-testid="manual-results"] input[type="checkbox"]').first()
  await expect(cb).toBeVisible({ timeout: 3000 })
  await cb.check()
}

// ─── Tests ──────────────────────────────────────────────────────

test.describe.serial('Manual recipient selection', () => {
  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await loginAdmin(page)
    const pre = await cleanupManualRows(page)
    console.log(`[setup] pre-cleanup removed ${pre} stale TEST Manual rows`)
    await importCsv(page, buildCsv(MANUAL_CASES))
    console.log('[setup] imported 4 TEST Manual rows')
    await ctx.close()
  })

  test.afterAll(async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await loginAdmin(page)
    const post = await cleanupManualRows(page)
    console.log(`[teardown] post-cleanup removed ${post} TEST Manual rows`)
    await ctx.close()
  })

  test.beforeEach(async ({ page }) => {
    await loginAdmin(page)
    await gotoMessagesAndFillTokens(page)
  })

  test('1. Search by name shows matching results', async ({ page }) => {
    await page.fill('[data-testid="manual-search-input"]', 'Manual Alice')
    await page.waitForTimeout(400)
    const results = page.locator('[data-testid="manual-results"]')
    await expect(results).toBeVisible({ timeout: 3000 })
    await expect(results).toContainText('TEST Manual Alice')
    await expect(results).not.toContainText('TEST Manual Bob')
  })

  test('2. Search by phone shows matching results', async ({ page }) => {
    await page.fill('[data-testid="manual-search-input"]', '6280000002')
    await page.waitForTimeout(400)
    const results = page.locator('[data-testid="manual-results"]')
    await expect(results).toBeVisible({ timeout: 3000 })
    await expect(results).toContainText('TEST Manual Bob')
    // Alice's phone is 6280000001 — shouldn't appear when searching for Bob's.
    await expect(results).not.toContainText('TEST Manual Alice')
  })

  test('3. Selecting one recipient sets KIRIM count to 1', async ({ page }) => {
    await page.fill('[data-testid="manual-search-input"]', 'Manual Alice')
    await page.waitForTimeout(400)
    await checkOnlyVisibleResult(page)
    await page.waitForTimeout(300)
    const label = await page.locator('[data-testid="kirim-button"]').innerText()
    expect(label).toMatch(/KIRIM\s+1\s+PENERIMA\s*\(Managam\)/i)
    // Manual mode indicator should also show "(1)"
    await expect(page.locator('[data-testid="manual-count"]')).toHaveText('(1)')
  })

  test('4. Selecting multiple recipients sets KIRIM count to N', async ({ page }) => {
    for (const fragment of ['Manual Alice', 'Manual Bob', 'Manual Carol']) {
      await page.fill('[data-testid="manual-search-input"]', fragment)
      await page.waitForTimeout(400)
      await checkOnlyVisibleResult(page)
    }
    await page.waitForTimeout(300)
    await expect(page.locator('[data-testid="manual-count"]')).toHaveText('(3)')
    const label = await page.locator('[data-testid="kirim-button"]').innerText()
    expect(label).toMatch(/KIRIM\s+3\s+PENERIMA\s*\(Managam\)/i)
  })

  test('5. Clear selection restores radio filter', async ({ page }) => {
    await page.fill('[data-testid="manual-search-input"]', 'Manual Alice')
    await page.waitForTimeout(400)
    await checkOnlyVisibleResult(page)
    await page.waitForTimeout(200)
    // Confirm manual mode is active before clearing.
    await expect(page.locator('[data-testid="manual-clear"]')).toBeVisible()
    await expect(page.locator('[data-testid="kirim-button"]')).toContainText('KIRIM 1')

    await page.locator('[data-testid="manual-clear"]').click()
    await page.waitForTimeout(300)

    // Manual mode off → clear button gone, count chip gone, search emptied.
    await expect(page.locator('[data-testid="manual-clear"]')).toHaveCount(0)
    await expect(page.locator('[data-testid="manual-count"]')).toHaveCount(0)
    await expect(page.locator('[data-testid="manual-search-input"]')).toHaveValue('')
    // Radio filter ('all') is back in control — the button must no
    // longer say "KIRIM 1 PENERIMA" specifically.
    const labelAfter = await page.locator('[data-testid="kirim-button"]').innerText()
    expect(labelAfter).not.toMatch(/KIRIM\s+1\s+PENERIMA/i)
  })

  test('6. Manual selection overrides radio filter at blast time',
    async ({ page, context }) => {
      const hits: { target: string; message: string }[] = []
      await setupFonnteStub(context, hits)

      // Default radio is 'Semua tamu' (`all`); without override the
      // blast would target everyone. We pick just Alice manually.
      await page.fill('[data-testid="manual-search-input"]', 'Manual Alice')
      await page.waitForTimeout(400)
      await checkOnlyVisibleResult(page)
      await page.waitForTimeout(300)
      await expect(page.locator('[data-testid="kirim-button"]')).toContainText('KIRIM 1')

      page.once('dialog', d => d.accept())
      await page.locator('[data-testid="kirim-button"]').click()
      await page.waitForTimeout(8000)

      expect(hits.length).toBe(1)
      expect(hits[0].target).toBe('6280000001')
      expect(hits[0].message).toContain('TEST Manual Alice')
    })

  test('7. No-phone recipient selected manually is excluded from blast',
    async ({ page, context }) => {
      const hits: { target: string; message: string }[] = []
      await setupFonnteStub(context, hits)

      // Tick Dan (no phone) AND Alice (has phone) so the blast has
      // someone real to send to. Dan must not produce a Fonnte call.
      await page.fill('[data-testid="manual-search-input"]', 'Manual Dan')
      await page.waitForTimeout(400)
      await checkOnlyVisibleResult(page)
      await page.fill('[data-testid="manual-search-input"]', 'Manual Alice')
      await page.waitForTimeout(400)
      await checkOnlyVisibleResult(page)
      await page.waitForTimeout(300)
      await expect(page.locator('[data-testid="manual-count"]')).toHaveText('(2)')

      page.once('dialog', d => d.accept())
      await page.locator('[data-testid="kirim-button"]').click()
      await page.waitForTimeout(8000)

      // Alice was blasted; Dan was not; no empty-target hit slipped through.
      expect(hits.some(h => h.message.includes('TEST Manual Alice'))).toBe(true)
      expect(hits.some(h => h.message.includes('TEST Manual Dan'))).toBe(false)
      expect(hits.some(h => h.target === '')).toBe(false)
    })

  test('8. Search with no matches shows empty state', async ({ page }) => {
    await page.fill(
      '[data-testid="manual-search-input"]',
      'zzz-no-such-guest-xyz'
    )
    await page.waitForTimeout(400)
    const empty = page.locator('[data-testid="manual-empty"]')
    await expect(empty).toBeVisible({ timeout: 3000 })
    await expect(empty).toContainText('Tidak ada hasil')
    // Results dropdown must not be shown.
    await expect(page.locator('[data-testid="manual-results"]')).toHaveCount(0)
  })
})
