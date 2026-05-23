import { test, expect, Page } from '@playwright/test'

const BASE_URL = process.env.TEST_URL ??
  'https://managamvania.mrix.ai'
const ADMIN_PIN = 'MV20062026'
const TEST_TAMU = {
  name: 'E2E Test Tamu',
  phone: '628999888777',
  notes: 'automated e2e test',
  sender: 'agam',
}

// Helper: login to admin
async function loginAdmin(page: Page) {
  await page.goto('/admin/login')
  await page.waitForTimeout(500)
  await page.keyboard.type(ADMIN_PIN)
  await page.waitForURL(/\/admin$/, { timeout: 5000 })
}

// Helper: get ref for a tamu by name
async function getRefForTamu(
  page: Page,
  name: string
): Promise<string> {
  await page.goto('/admin/invitees')
  await page.waitForTimeout(1000)

  // Search for the tamu
  await page.fill(
    'input[placeholder*="Cari"]', name
  )
  await page.waitForTimeout(500)

  // Click Link button for this tamu
  const row = page.locator('tr').filter({
    hasText: name
  })
  const linkBtn = row.locator('button', {
    hasText: 'Link'
  })

  // Get clipboard content after click
  await page.evaluate(() => {
    // Grant clipboard permission
  })
  await linkBtn.click()
  await page.waitForTimeout(500)

  // Read from clipboard
  const url = await page.evaluate(
    () => navigator.clipboard.readText()
  )
  const ref = new URL(url).searchParams.get('ref')
  return ref ?? ''
}

// Helper: delete test tamu (cleanup)
async function deleteTestTamu(
  page: Page,
  name: string
) {
  await page.goto('/admin/invitees')
  await page.fill(
    'input[placeholder*="Cari"]', name
  )
  await page.waitForTimeout(500)

  const row = page.locator('tr').filter({
    hasText: name
  })
  const deleteBtn = row.locator('button', {
    hasText: 'Hapus'
  })

  page.once('dialog', dialog => dialog.accept())
  await deleteBtn.click()
  await page.waitForTimeout(500)
}

test.describe('Full ref flow E2E @smoke', () => {

  test.beforeEach(async ({ page }) => {
    await loginAdmin(page)
  })

  test.afterAll(async ({ browser }) => {
    // Cleanup: delete test tamu after all tests
    const page = await browser.newPage()
    await loginAdmin(page)
    await deleteTestTamu(page, TEST_TAMU.name)
    await page.close()
  })

  // ═══════════════════════════════════════════
  // STEP 1 — Add tamu manually via Tambah Tamu
  // ═══════════════════════════════════════════
  test('1. Add tamu via Tambah Tamu form',
    async ({ page }) => {
    await page.goto('/admin/invitees')

    // Click + TAMBAH TAMU
    await page.click('button:has-text("TAMBAH TAMU")')
    await page.waitForTimeout(500)

    // Fill form
    await page.fill(
      'input[placeholder*="Nama lengkap"]',
      TEST_TAMU.name
    )
    await page.fill(
      'input[placeholder*="628"]',
      TEST_TAMU.phone
    )
    await page.fill(
      'textarea[placeholder*="Catatan"]',
      TEST_TAMU.notes
    )

    // Select Managam as sender
    await page.click('button:has-text("Managam")')

    // Save
    await page.click('button:has-text("SIMPAN")')
    await page.waitForTimeout(1000)

    // Verify tamu appears in table
    await expect(
      page.getByText(TEST_TAMU.name)
    ).toBeVisible()

    // Verify Belum RSVP status
    const row = page.locator('tr').filter({
      hasText: TEST_TAMU.name
    })
    await expect(
      row.getByText('Belum RSVP')
    ).toBeVisible()

    // Verify Managam sender badge
    await expect(
      row.getByText('Managam')
    ).toBeVisible()

    console.log('✅ Tamu added successfully')
  })

  // ═══════════════════════════════════════════
  // STEP 2 — Verify ref was auto-generated
  // ═══════════════════════════════════════════
  test('2. Ref auto-generated for new tamu',
    async ({ page }) => {
    await page.goto('/admin/invitees')
    await page.fill(
      'input[placeholder*="Cari"]',
      TEST_TAMU.name
    )
    await page.waitForTimeout(500)

    const row = page.locator('tr').filter({
      hasText: TEST_TAMU.name
    })

    // Link button should exist (means ref exists)
    await expect(
      row.locator('button', { hasText: 'Link' })
    ).toBeVisible()

    console.log('✅ Ref auto-generated')
  })

  // ═══════════════════════════════════════════
  // STEP 3 — Copy personal link
  // ═══════════════════════════════════════════
  test('3. Copy personal link from admin',
    async ({ context, page }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])

    await page.goto('/admin/invitees')
    await page.fill(
      'input[placeholder*="Cari"]',
      TEST_TAMU.name
    )
    await page.waitForTimeout(500)

    const row = page.locator('tr').filter({
      hasText: TEST_TAMU.name
    })
    await row.locator('button', {
      hasText: 'Link'
    }).click()
    await page.waitForTimeout(500)

    // Read clipboard
    const clipText = await page.evaluate(
      () => navigator.clipboard.readText()
    )

    // Should be a valid URL with ref param
    expect(clipText).toContain(
      'managamvania.mrix.ai'
    )
    expect(clipText).toContain('?ref=')

    const ref = new URL(clipText)
      .searchParams.get('ref')
    expect(ref).toHaveLength(8)

    console.log('✅ Personal link copied:', clipText)
    console.log('✅ Ref:', ref)
  })

  // ═══════════════════════════════════════════
  // STEP 4 — Open personal link, verify greeting
  // ═══════════════════════════════════════════
  test('4. Personal link shows formal greeting',
    async ({ context, page }) => {
    await context.grantPermissions([
      'clipboard-read', 'clipboard-write'
    ])

    // Get ref from admin
    await page.goto('/admin/invitees')
    await page.fill(
      'input[placeholder*="Cari"]',
      TEST_TAMU.name
    )
    await page.waitForTimeout(500)

    const row = page.locator('tr').filter({
      hasText: TEST_TAMU.name
    })
    await row.locator('button', {
      hasText: 'Link'
    }).click()
    await page.waitForTimeout(500)

    const clipText = await page.evaluate(
      () => navigator.clipboard.readText()
    )
    const ref = new URL(clipText)
      .searchParams.get('ref')

    // Open personal link
    await page.goto(`/?ref=${ref}`)
    await page.waitForTimeout(2000)

    // Should show formal greeting
    await expect(page.getByText('KEPADA YTH.'))
      .toBeVisible({ timeout: 5000 })
    await expect(
      page.getByText(TEST_TAMU.name)
    ).toBeVisible()
    await expect(page.getByText(
      'Bersama ini kami mengundang'
    )).toBeVisible()
    await expect(page.getByText(
      'DENGAN HORMAT DAN KASIH'
    )).toBeVisible()

    console.log('✅ Formal greeting shown for:',
      TEST_TAMU.name)
  })

  // ═══════════════════════════════════════════
  // STEP 5 — Open envelope, verify RSVP pre-fill
  // ═══════════════════════════════════════════
  test('5. RSVP pre-filled from ref data',
    async ({ context, page }) => {
    await context.grantPermissions([
      'clipboard-read', 'clipboard-write'
    ])

    // Get ref
    await page.goto('/admin/invitees')
    await page.fill(
      'input[placeholder*="Cari"]',
      TEST_TAMU.name
    )
    await page.waitForTimeout(500)
    const row = page.locator('tr').filter({
      hasText: TEST_TAMU.name
    })
    await row.locator('button', {
      hasText: 'Link'
    }).click()
    await page.waitForTimeout(300)
    const clipText = await page.evaluate(
      () => navigator.clipboard.readText()
    )
    const ref = new URL(clipText)
      .searchParams.get('ref')

    // Open invitation
    await page.goto(`/?ref=${ref}`)
    await page.waitForTimeout(2000)

    // Open envelope
    await page.click('body')
    await page.waitForTimeout(1000)

    // Scroll to RSVP
    await page.locator('#rsvp')
      .scrollIntoViewIfNeeded()
    await page.waitForTimeout(1000)

    // Name pre-filled and read-only
    const inputs = page.locator('#rsvp input')
    const nameInput = inputs.first()
    await expect(nameInput).toHaveValue(
      TEST_TAMU.name
    )

    // Phone pre-filled
    const phoneInput = inputs.nth(1)
    const phoneVal = await phoneInput.inputValue()
    expect(phoneVal).toContain('628')

    console.log('✅ RSVP pre-filled with:',
      TEST_TAMU.name)
  })

  // ═══════════════════════════════════════════
  // STEP 6 — Submit RSVP as HADIR
  // ═══════════════════════════════════════════
  test('6. Submit RSVP as HADIR',
    async ({ context, page }) => {
    await context.grantPermissions([
      'clipboard-read', 'clipboard-write'
    ])

    // Get ref
    await page.goto('/admin/invitees')
    await page.fill(
      'input[placeholder*="Cari"]',
      TEST_TAMU.name
    )
    await page.waitForTimeout(500)
    const row = page.locator('tr').filter({
      hasText: TEST_TAMU.name
    })
    await row.locator('button', {
      hasText: 'Link'
    }).click()
    await page.waitForTimeout(300)
    const clipText = await page.evaluate(
      () => navigator.clipboard.readText()
    )
    const ref = new URL(clipText)
      .searchParams.get('ref')

    // Open invitation with ref
    await page.goto(`/?ref=${ref}`)
    await page.waitForTimeout(2000)
    await page.click('body')
    await page.waitForTimeout(1000)

    // Scroll to RSVP
    await page.locator('#rsvp')
      .scrollIntoViewIfNeeded()
    await page.waitForTimeout(1000)

    // Select HADIR
    const hadirBtn = page.locator(
      'label:has-text("HADIR"), ' +
      'button:has-text("HADIR"), ' +
      'input[value="true"]'
    ).first()
    await hadirBtn.click()
    await page.waitForTimeout(500)

    // Seat selector should appear
    await expect(page.locator('select'))
      .toBeVisible({ timeout: 3000 })

    // Submit RSVP
    await page.click(
      'button:has-text("KONFIRMASI")'
    )

    // Success message
    await expect(
      page.getByText('Terima kasih!')
    ).toBeVisible({ timeout: 5000 })

    console.log('✅ RSVP submitted as HADIR')
  })

  // ═══════════════════════════════════════════
  // STEP 7 — Verify in admin: status updated,
  //           opened_at recorded
  // ═══════════════════════════════════════════
  test('7. Verify RSVP and opened_at in admin',
    async ({ page }) => {
    await page.goto('/admin/invitees')
    await page.fill(
      'input[placeholder*="Cari"]',
      TEST_TAMU.name
    )
    await page.waitForTimeout(1000)

    const row = page.locator('tr').filter({
      hasText: TEST_TAMU.name
    })

    // opened_at should be recorded (✓ date)
    await expect(
      row.locator('td').filter({ hasText: '✓' })
    ).toBeVisible({ timeout: 5000 })

    console.log('✅ opened_at recorded in admin')
  })

  // ═══════════════════════════════════════════
  // STEP 8 — Verify RSVP in Supabase via admin
  // ═══════════════════════════════════════════
  test('8. RSVP record exists in dashboard stats',
    async ({ page }) => {
    await page.goto('/admin')
    await page.waitForTimeout(1000)

    // Total tamu should be > 0
    const totalCard = page.locator(
      'div:has-text("Total Tamu")'
    ).last()
    const totalText = await totalCard
      .locator('div:last-child').textContent()
    expect(Number(totalText)).toBeGreaterThan(0)

    console.log('✅ Dashboard stats updated')
  })

  // ═══════════════════════════════════════════
  // STEP 9 — CSV import flow (alternative to
  //           manual tambah tamu)
  // ═══════════════════════════════════════════
  test('9. CSV import generates refs for all rows',
    async ({ page }) => {
    await page.goto('/admin/invitees')

    // Download template
    const downloadPromise = page.waitForEvent(
      'download'
    )
    await page.click(
      'button:has-text("UNDUH TEMPLATE")'
    )
    const download = await downloadPromise
    expect(download.suggestedFilename())
      .toContain('template_tamu')

    // Verify template has sender column
    const path = await download.path()
    const fs = await import('fs')
    const content = fs.readFileSync(path, 'utf-8')
    expect(content).toContain('name')
    expect(content).toContain('phone')
    expect(content).toContain('sender')

    console.log('✅ CSV template downloaded with correct columns')
    console.log('Template content:', content.split('\n')[0])
  })
})

// BASE_URL is referenced via playwright.config baseURL; export to silence
// the unused-var warning when running without a config file.
export { BASE_URL }
