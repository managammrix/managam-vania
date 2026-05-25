import { test, expect, Page } from '@playwright/test'

const ADMIN_PIN = 'MV20062026'
const TEST_TAMU = {
  name: 'E2E Test Tamu ' + Date.now(),
  phone: '628999888777',
  notes: 'automated e2e test',
}

async function loginAdmin(page: Page) {
  await page.goto('/admin/login')
  await page.waitForTimeout(800)
  await page.keyboard.type(ADMIN_PIN)
  await page.waitForURL(/\/admin$/, { timeout: 8000 })
}

test.describe('Full ref flow E2E @smoke', () => {

  test('complete flow: add tamu → personal link → RSVP → verify admin',
    async ({ page, context }) => {

    // ─── STEP 1: Login ───────────────────────
    await loginAdmin(page)
    console.log('✅ Step 1: Logged in to admin')

    // ─── STEP 2: Add tamu ────────────────────
    await page.goto('/admin/invitees')
    await page.click('button:has-text("TAMBAH TAMU")')

    // Wait for modal to be fully open
    await page.waitForSelector(
      'h2:has-text("Tambah Tamu")',
      { state: 'visible', timeout: 5000 }
    )

    // Scope all modal interactions to modal container
    const modal = page.locator('div').filter({
      has: page.locator('h2:has-text("Tambah Tamu")')
    }).last()

    await modal.locator('input[placeholder*="Nama"]')
      .fill(TEST_TAMU.name)
    await modal.locator('input[placeholder*="628"]')
      .fill(TEST_TAMU.phone)
    await modal.locator('textarea[placeholder*="Catatan"]')
      .fill(TEST_TAMU.notes)
    await modal.locator('button:has-text("Managam")')
      .click({ force: true })
    await modal.locator('button:has-text("SIMPAN")')
      .click()

    await page.waitForTimeout(1500)

    await expect(
      page.getByText(TEST_TAMU.name)
    ).toBeVisible({ timeout: 5000 })
    console.log('✅ Step 2: Tamu added:', TEST_TAMU.name)

    // ─── STEP 3: Get personal link (via data-ref) ──
    await context.grantPermissions([
      'clipboard-read', 'clipboard-write'
    ])

    // Clear any existing search
    await page.fill('input[placeholder*="Cari"]', '')
    await page.waitForTimeout(500)

    // Reload to ensure fresh data (new tamu's ref column populated)
    await page.reload()
    await page.waitForTimeout(1000)

    // Now search for the tamu
    await page.fill(
      'input[placeholder*="Cari"]',
      TEST_TAMU.name
    )
    await page.waitForTimeout(1000)

    const rowCount = await page.locator('tr')
      .filter({ hasText: TEST_TAMU.name })
      .count()
    console.log('   Rows found with name:', rowCount)

    const row = page.locator('tr').filter({
      hasText: TEST_TAMU.name
    })
    await expect(row).toBeVisible({ timeout: 10000 })

    const linkBtn = row.locator('button[data-ref]')
    await expect(linkBtn).toBeVisible({ timeout: 10000 })

    const ref = await linkBtn.getAttribute('data-ref')
    expect(ref).toBeTruthy()
    expect(ref?.length).toBe(8)
    console.log('✅ Step 3: Ref extracted from DOM:', ref)

    // Sanity-check the clipboard path too — but don't fail
    // the run if it's flaky in headless
    try {
      await row.locator('button', {
        hasText: 'Link'
      }).click()
      await page.waitForTimeout(400)
      const clipText = await page.evaluate(
        () => navigator.clipboard.readText()
      )
      console.log('   Clipboard URL:', clipText)
    } catch (e) {
      console.log('   Clipboard read skipped:',
        (e as Error).message)
    }

    // ─── STEP 4: Open personal link ──────────
    // Register error listener FIRST, then navigate.
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))

    await page.goto(`/?ref=${ref}`)
    await page.waitForTimeout(2500)

    await expect(
      page.getByText('KEPADA YTH.')
    ).toBeVisible({ timeout: 5000 })
    await expect(
      page.getByText(TEST_TAMU.name)
    ).toBeVisible()
    await expect(
      page.getByText('Bersama ini kami mengundang')
    ).toBeVisible()

    const hydrationErrs = errors.filter(e =>
      e.includes('React error #418') ||
      e.includes('React error #423') ||
      e.includes('React error #425')
    )
    expect(hydrationErrs).toHaveLength(0)
    console.log('✅ Step 4: Formal greeting shown, no hydration errors')

    // ─── STEP 5: Open envelope ───────────────
    // Wait for page to fully load with ref data
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // Wait for envelope screen to be fully loaded
    await page.waitForSelector(
      '#envelope-screen, #envelope-click-target',
      { state: 'visible', timeout: 10000 }
    )

    // Click the envelope to open it
    await page.click(
      '#envelope-click-target, #envelope-screen',
      { force: true }
    )
    await page.waitForTimeout(2000)

    await expect(
      page.locator('#cover')
    ).toBeVisible({ timeout: 5000 })
    console.log('✅ Step 5: Envelope opened')

    // ─── STEP 6: Verify RSVP pre-fill ────────
    await page.locator('#rsvp').scrollIntoViewIfNeeded()
    await page.waitForTimeout(1000)

    const nameInput = page.locator('#rsvp input').first()
    await expect(nameInput).toHaveValue(
      TEST_TAMU.name,
      { timeout: 5000 }
    )
    console.log('✅ Step 6: RSVP pre-filled')

    // ─── STEP 7: Select HADIR ─────────────────
    await page.click('#hadir-btn', { force: true })
    await page.waitForTimeout(1000)

    await expect(
      page.locator('#seat-selector')
    ).toBeVisible({ timeout: 5000 })
    console.log('✅ Step 7: HADIR selected, seat selector shown')

    // ─── STEP 8: Submit RSVP ─────────────────
    await page.click('#rsvp button:has-text("KONFIRMASI")')
    await expect(
      page.getByText('Terima kasih!')
    ).toBeVisible({ timeout: 8000 })
    console.log('✅ Step 8: RSVP submitted successfully')

    // ─── STEP 9: Verify opened_at in admin ───
    await loginAdmin(page)
    await page.goto('/admin/invitees')
    await page.fill(
      'input[placeholder*="Cari"]',
      TEST_TAMU.name
    )
    await page.waitForTimeout(1000)

    const adminRow = page.locator('tr').filter({
      hasText: TEST_TAMU.name
    })
    await expect(
      adminRow.locator('td').filter({ hasText: '✓' })
    ).toBeVisible({ timeout: 5000 })
    console.log('✅ Step 9: opened_at recorded in admin')

    // ─── STEP 10: Cleanup ─────────────────────
    const deleteBtn = adminRow.locator(
      'button', { hasText: 'Hapus' }
    )
    page.once('dialog', d => d.accept())
    await deleteBtn.click()
    await page.waitForTimeout(800)

    await expect(
      page.getByText(TEST_TAMU.name)
    ).not.toBeVisible()
    console.log('✅ Step 10: Test tamu cleaned up')

    console.log('\n🎉 Full ref flow E2E: ALL STEPS PASSED')
  })

  // ─── SEPARATE: Physical slot check-in flow ─
  test('physical slot: identify at /checkin → souvenir + lunchbox',
    async ({ page }) => {
    await loginAdmin(page)

    // Find the first still-anonymous physical slot via the FISIK
    // filter. Don't hardcode #N — once identified by a previous run,
    // the slot's name changes, so we always pick whichever one is
    // still labeled "Undangan Fisik #*". With 38 slots this works
    // for 38 runs before a SQL reset is needed.
    const SLOT_PREFIX = 'Undangan Fisik'
    const TEST_GUEST = 'E2E Physical ' + Date.now()

    await page.goto('/admin/invitees')
    await page.fill('input[placeholder*="Cari"]', '')
    await page.waitForTimeout(500)
    await page.reload()
    await page.waitForTimeout(1500)

    // Click FISIK filter so only physical slots show
    await page.click('button:has-text("FISIK")')
    await page.waitForTimeout(800)

    const physicalRows = page.locator('tr').filter({
      hasText: SLOT_PREFIX,
    })
    const anonCount = await physicalRows.count()
    console.log('   Anonymous physical slots remaining:', anonCount)
    expect(anonCount).toBeGreaterThan(0)

    const firstRow = physicalRows.first()
    await expect(firstRow).toBeVisible({ timeout: 10000 })
    const slotName = await firstRow.locator('td').first().textContent()
    console.log('   Using slot:', slotName?.trim())

    const linkBtn = firstRow.locator('button[data-ref]')
    const ref = await linkBtn.getAttribute('data-ref')
    expect(ref).toBeTruthy()
    expect(ref?.length).toBe(8)
    console.log('   Physical slot ref:', ref)

    // Navigate to checkin — should show identification form
    await page.goto(`/checkin?ref=${ref}`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1500)

    await expect(page.getByText('Identifikasi Tamu')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('#physical-name')).toBeVisible()
    console.log('   Identification form shown')

    await page.fill('#physical-name', TEST_GUEST)
    await page.fill('#physical-phone', '628999777666')
    await page.click('#identify-submit')
    await page.waitForTimeout(2500)

    // After identification, success card should appear with name + buttons
    await expect(page.getByText(TEST_GUEST)).toBeVisible({ timeout: 10000 })
    await expect(page.locator('#souvenir-btn')).toBeVisible()
    await expect(page.locator('#lunchbox-btn')).toBeVisible()
    console.log('   Check-in success card shown')

    // Claim souvenir + lunchbox
    await page.click('#souvenir-btn')
    await page.waitForTimeout(1500)
    await page.click('#lunchbox-btn')
    await page.waitForTimeout(1500)
    console.log('   Souvenir + lunchbox claimed')

    // The chosen slot is now consumed (named "TEST_GUEST", checked
    // in, claimed). Next run will pick the next available anonymous
    // slot. After ~38 runs, re-seed via SQL to refresh.
    console.log('\n🎉 Physical slot E2E: PASSED')
    console.log('   Slot consumed:', slotName?.trim(), '→', TEST_GUEST)
    console.log('   Remaining anon slots after this run:', anonCount - 1)
  })

  // ─── SEPARATE: CSV flow test ───────────────
  test('CSV import flow: download template → verify columns',
    async ({ page }) => {
    await loginAdmin(page)
    await page.goto('/admin/invitees')

    const downloadPromise = page.waitForEvent('download')
    await page.click('button:has-text("UNDUH TEMPLATE")')
    const dl = await downloadPromise
    expect(dl.suggestedFilename())
      .toContain('template_tamu')

    const path = await dl.path()
    const fs = await import('fs')
    const content = fs.readFileSync(path!, 'utf-8')
    const headers = content.split('\n')[0]

    expect(headers).toContain('name')
    expect(headers).toContain('phone')
    expect(headers).toContain('guests')
    expect(headers).toContain('notes')
    expect(headers).toContain('sender')

    console.log('✅ CSV template headers:', headers)
  })
})
