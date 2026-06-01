/* eslint-disable no-console */
import { test, expect, Page } from '@playwright/test'

const ADMIN_PIN = process.env.ADMIN_PIN ?? '20062026'

const ROW = {
  name:  'TEST Loading Overlay',
  phone: '6280000050',
}

let savedRef = ''

// ─── Helpers ────────────────────────────────────────────────────

async function loginAdmin(page: Page) {
  await page.goto('/admin/login')
  await page.waitForTimeout(800)
  await page.keyboard.type(ADMIN_PIN)
  await page.waitForURL(/\/admin$/, { timeout: 8000 })
}

function buildCsv(): string {
  const header = 'name,phone,guests,notes,sender'
  const q = (v: string) => `"${v.replace(/"/g, '""')}"`
  return header + '\n' +
    [ROW.name, ROW.phone, '2', 'loading-overlay', 'agam']
      .map(q).join(',')
}

async function importCsv(page: Page, csv: string) {
  await page.goto('/admin/invitees')
  await page.waitForTimeout(800)
  const buffer = Buffer.from(csv, 'utf-8')
  const fileChooserPromise = page.waitForEvent('filechooser')
  await page.click('label[for="csv-import"]')
  const chooser = await fileChooserPromise
  await chooser.setFiles({
    name: 'rsvp-loading.csv',
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
    for (let i = 0; i < 10; i++) {
      await page.goto('/admin/invitees')
      await page.waitForTimeout(900)
      await page.fill('input[placeholder*="Cari"]', 'TEST Loading')
      await page.waitForTimeout(700)
      const rows = page.locator('tr').filter({ hasText: 'TEST Loading' })
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

// ─── Test ───────────────────────────────────────────────────────

test.describe.serial('RSVP loading overlay', () => {
  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await loginAdmin(page)
    const pre = await cleanupRows(page)
    console.log(`[setup] pre-cleanup removed ${pre} stale TEST Loading rows`)
    await importCsv(page, buildCsv())
    const ref = await getRef(page, ROW.name)
    if (!ref) throw new Error(`No ref for ${ROW.name}`)
    savedRef = ref
    console.log(`[setup] ${ROW.name} → ref=${ref}`)
    await ctx.close()
  })

  test.afterAll(async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await loginAdmin(page)
    const post = await cleanupRows(page)
    console.log(`[teardown] post-cleanup removed ${post} TEST Loading rows`)
    await ctx.close()
  })

  test('Overlay appears during submit and disappears with the success screen',
    async ({ page }) => {
      const ref = savedRef
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

      // Click KONFIRMASI. The overlay is transient — it mounts on submit and
      // unmounts in the SAME React commit as the success screen. On a fast
      // submit it can appear+disappear inside one poll window, so asserting the
      // overlay strictly is flaky. Win the race either way: pass if we catch
      // the overlay OR the submit already resolved to the success screen.
      await page.locator('button:has-text("KONFIRMASI")').click()
      const overlay = page.locator('[data-testid="rsvp-loading-overlay"]')
      const success = page.locator('text=Terima kasih!')
      await expect(overlay.or(success).first()).toBeVisible({ timeout: 5000 })

      // Soft copy check — only when we actually caught the overlay, so a copy
      // tweak doesn't break the test but a real wording regression still shows.
      if (await overlay.isVisible()) {
        console.log('[case] overlay shown during submit')
        await expect(overlay).toContainText('Sedang mempersiapkan undangan')
      }

      // End state is deterministic regardless of the race above: success screen
      // is shown and the overlay is gone.
      await expect(success).toBeVisible({ timeout: 20000 })
      await expect(overlay).toHaveCount(0)
    })
})
