/* eslint-disable no-console */
import { test, expect, Page } from '@playwright/test'
import { gotoMessagesAndFillTokens } from './helpers'

const ADMIN_PIN = process.env.ADMIN_PIN ?? '20062026'

// Two rows per sender so we can verify the filter narrows the blast
// to exactly that sender's bucket. Names are intentionally distinct
// so the message-body substring check (which sees the first ~120
// chars of each Fonnte call) can tell rows apart.
const ROWS = [
  { name: 'TEST Sender Agam One',   phone: '6280000040', sender: 'agam'  as const },
  { name: 'TEST Sender Agam Two',   phone: '6280000041', sender: 'agam'  as const },
  { name: 'TEST Sender Vania One',  phone: '6280000042', sender: 'vania' as const },
  { name: 'TEST Sender Vania Two',  phone: '6280000043', sender: 'vania' as const },
] as const

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
    .map(r => [r.name, r.phone, '2', 'sender-filter', r.sender].map(q).join(','))
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
    name: 'sender-filter.csv',
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

async function cleanupRows(page: Page): Promise<number> {
  const handler = (d: { accept: () => Promise<void> }) => d.accept()
  page.on('dialog', handler)
  let removed = 0
  try {
    for (let i = 0; i < 20; i++) {
      await page.goto('/admin/invitees')
      await page.waitForTimeout(900)
      await page.fill('input[placeholder*="Cari"]', 'TEST Sender')
      await page.waitForTimeout(700)
      const rows = page.locator('tr').filter({ hasText: 'TEST Sender' })
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

// ─── Tests ──────────────────────────────────────────────────────

test.describe.serial('Sender filters (Tamu Managam / Tamu Vania)', () => {
  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await loginAdmin(page)
    const pre = await cleanupRows(page)
    console.log(`[setup] pre-cleanup removed ${pre} stale TEST Sender rows`)
    await importCsv(page, buildCsv(ROWS))
    await ctx.close()
  })

  test.afterAll(async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await loginAdmin(page)
    const post = await cleanupRows(page)
    console.log(`[teardown] post-cleanup removed ${post} TEST Sender rows`)
    await ctx.close()
  })

  test.beforeEach(async ({ page }) => {
    await loginAdmin(page)
    await gotoMessagesAndFillTokens(page)
  })

  test('Tamu Managam filter is present with non-zero count', async ({ page }) => {
    const radio = page.locator('[data-testid="filter-radio-agam"]')
    await expect(radio).toBeVisible()
    // Label format: "Tamu Managam (N)" — N must be ≥ 2 since we
    // seeded two TEST Sender Agam rows above.
    const text = await radio.innerText()
    console.log('  agam radio label:', text)
    const m = text.match(/Tamu Managam \((\d+)\)/)
    expect(m, 'agam label has count').not.toBeNull()
    expect(Number(m![1])).toBeGreaterThanOrEqual(2)
  })

  test('Tamu Vania filter is present with non-zero count', async ({ page }) => {
    const radio = page.locator('[data-testid="filter-radio-vania"]')
    await expect(radio).toBeVisible()
    const text = await radio.innerText()
    console.log('  vania radio label:', text)
    const m = text.match(/Tamu Vania \((\d+)\)/)
    expect(m, 'vania label has count').not.toBeNull()
    expect(Number(m![1])).toBeGreaterThanOrEqual(2)
  })

  test('Selecting Tamu Managam blasts only sender=agam rows',
    async ({ page, context }) => {
      const hits: { target: string; message: string }[] = []
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

      await page.locator('[data-testid="filter-radio-agam"]').click()
      await page.waitForTimeout(300)
      const label = await page.locator('[data-testid="kirim-button"]').innerText()
      expect(label).toMatch(/Managam/)
      // Button must not advertise any "(Vania)" recipient slice.
      expect(label).not.toMatch(/Vania/)

      page.once('dialog', d => d.accept())
      await page.locator('[data-testid="kirim-button"]').click()
      await page.waitForTimeout(8000)

      // Both seeded agam rows must have been blasted; neither vania.
      expect(hits.some(h => h.message.includes('TEST Sender Agam One'))).toBe(true)
      expect(hits.some(h => h.message.includes('TEST Sender Agam Two'))).toBe(true)
      expect(hits.some(h => h.message.includes('TEST Sender Vania One'))).toBe(false)
      expect(hits.some(h => h.message.includes('TEST Sender Vania Two'))).toBe(false)
    })

  test('Selecting Tamu Vania blasts only sender=vania rows',
    async ({ page, context }) => {
      const hits: { target: string; message: string }[] = []
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

      await page.locator('[data-testid="filter-radio-vania"]').click()
      await page.waitForTimeout(300)
      const label = await page.locator('[data-testid="kirim-button"]').innerText()
      expect(label).toMatch(/Vania/)
      expect(label).not.toMatch(/Managam/)

      page.once('dialog', d => d.accept())
      await page.locator('[data-testid="kirim-button"]').click()
      await page.waitForTimeout(8000)

      expect(hits.some(h => h.message.includes('TEST Sender Vania One'))).toBe(true)
      expect(hits.some(h => h.message.includes('TEST Sender Vania Two'))).toBe(true)
      expect(hits.some(h => h.message.includes('TEST Sender Agam One'))).toBe(false)
      expect(hits.some(h => h.message.includes('TEST Sender Agam Two'))).toBe(false)
    })
})
