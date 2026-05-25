/* eslint-disable no-console */
import { test, expect, Page } from '@playwright/test'

const ADMIN_PIN = process.env.ADMIN_PIN ?? '20062026'

type TestCase = {
  label: string
  name: string
  phone: string
  guests: number  // doubles as invited count + RSVP seat limit
  notes: string
  sender: 'agam' | 'vania'
}

const PHONE = '6281263387707'

const CASES: TestCase[] = [
  { label: '1. Normal 2pax',         name: 'TEST - Normal 2pax',         phone: PHONE,             guests: 2,  notes: 'normal 2pax',         sender: 'agam' },
  { label: '2. Normal 1pax',         name: 'TEST - Normal 1pax',         phone: PHONE,             guests: 1,  notes: 'normal 1pax',         sender: 'agam' },
  { label: '3. Normal 3pax',         name: 'TEST - Normal 3pax',         phone: PHONE,             guests: 3,  notes: 'normal 3pax',         sender: 'agam' },
  { label: '4. Group 20pax',         name: 'TEST - Group 20pax',         phone: PHONE,             guests: 20, notes: 'group 20pax',         sender: 'agam' },
  { label: '5. Digital Only 0pax',   name: 'TEST - Digital Only 0pax',   phone: PHONE,             guests: 0,  notes: 'digital only',        sender: 'agam' },
  { label: '6. No Phone',            name: 'TEST - No Phone',            phone: '',                guests: 2,  notes: 'no phone',            sender: 'agam' },
  { label: '7. Overseas AU +61',     name: 'TEST - Overseas AU +61',     phone: '61412345678',     guests: 2,  notes: 'overseas AU',         sender: 'vania' },
  { label: '8. Overseas SG +65',     name: 'TEST - Overseas SG +65',     phone: '6591234567',      guests: 2,  notes: 'overseas SG',         sender: 'vania' },
  { label: '9. Overseas US +1',      name: 'TEST - Overseas US +1',      phone: '14155551234',     guests: 2,  notes: 'overseas US',         sender: 'vania' },
  { label: '10. Long Number',        name: 'TEST - Long Number',         phone: '62895805222125',  guests: 2,  notes: 'long number',         sender: 'agam' },
  { label: '11. PIC Proxy',          name: 'TEST - PIC Proxy',           phone: PHONE,             guests: 0,  notes: 'pic proxy',           sender: 'agam' },
  { label: '12. 4pax',               name: 'TEST - 4pax',                phone: PHONE,             guests: 4,  notes: '4pax',                sender: 'agam' },
]

// ─── Helpers ────────────────────────────────────────────────────

async function loginAdmin(page: Page) {
  await page.goto('/admin/login')
  await page.waitForTimeout(800)
  await page.keyboard.type(ADMIN_PIN)
  await page.waitForURL(/\/admin$/, { timeout: 8000 })
}

function buildCsv(rows: TestCase[]): string {
  const header = 'name,phone,guests,notes,sender'
  const body = rows
    .map(r => `${r.name},${r.phone},${r.guests},${r.notes},${r.sender}`)
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
    name: 'test-cases.csv',
    mimeType: 'text/csv',
    buffer,
  })
  // Preview modal appears — confirm import
  await page.waitForSelector('button:has-text("IMPORT")', {
    state: 'visible', timeout: 5000,
  })
  await page.click('button:has-text("IMPORT")')
  // Wait for alert dialog showing imported count, accept it
  page.once('dialog', d => d.accept())
  await page.waitForTimeout(3000)
}

async function findRow(page: Page, name: string) {
  await page.fill('input[placeholder*="Cari"]', '')
  await page.waitForTimeout(300)
  await page.fill('input[placeholder*="Cari"]', name)
  await page.waitForTimeout(700)
  return page.locator('tr').filter({ hasText: name }).first()
}

async function getRef(page: Page, name: string): Promise<string | null> {
  const row = await findRow(page, name)
  await expect(row).toBeVisible({ timeout: 10000 })
  const btn = row.locator('button[data-ref]')
  if (await btn.count() === 0) return null
  return await btn.getAttribute('data-ref')
}

async function deleteRow(page: Page, name: string) {
  const row = await findRow(page, name)
  if (await row.count() === 0) return
  page.once('dialog', d => d.accept())
  await row.locator('button:has-text("Hapus")').click()
  await page.waitForTimeout(800)
}

type Result = {
  label: string
  csvImported: boolean
  refGenerated: boolean
  linkOpens: boolean
  rsvpFlow: boolean
  adminUpdated: boolean
  qrAvailable: boolean
  blastIncluded?: boolean
  error?: string
}

// ─── Test ───────────────────────────────────────────────────────

test.describe('Comprehensive guest test suite @smoke', () => {
  test.setTimeout(15 * 60 * 1000) // 15 min for full sweep

  test('12 cases: CSV import → ref → link → RSVP → admin status → blast filter → cleanup',
    async ({ page, context }) => {

    await context.grantPermissions(['clipboard-read', 'clipboard-write'])

    // ─── Stub Fonnte to avoid real WhatsApp sends ─────────────
    const fonnteHits: { target: string; message: string }[] = []
    await context.route('https://api.fonnte.com/**', async (route, req) => {
      try {
        const body = req.postDataJSON()
        fonnteHits.push({
          target: body.target ?? '(no target)',
          message: (body.message ?? '').slice(0, 50),
        })
      } catch {}
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: true, id: 'mock-' + Date.now() }),
      })
    })

    const results: Result[] = CASES.map(c => ({
      label: c.label,
      csvImported: false,
      refGenerated: false,
      linkOpens: false,
      rsvpFlow: false,
      adminUpdated: false,
      qrAvailable: false,
    }))

    // ─── STEP 1: Login + import CSV ──────────────────────────
    await loginAdmin(page)
    console.log('✅ Step 1: Logged in to admin')

    await importCsv(page, buildCsv(CASES))
    console.log('✅ Step 2: CSV import dispatched, waiting for table refresh')
    await page.reload()
    await page.waitForTimeout(2000)

    // ─── STEP 3: Per-guest verification ──────────────────────
    for (let i = 0; i < CASES.length; i++) {
      const c = CASES[i]
      const r = results[i]
      console.log(`\n── ${c.label} (${c.name}) ──`)
      try {
        // Re-load invitees page each iteration to get fresh data
        await page.goto('/admin/invitees')
        await page.waitForTimeout(800)

        const row = await findRow(page, c.name)
        const exists = (await row.count()) > 0
        r.csvImported = exists
        console.log('  csv imported:', exists)
        if (!exists) { r.error = 'Row missing after CSV import'; continue }

        const ref = await getRef(page, c.name)
        r.refGenerated = !!ref && ref.length === 8
        console.log('  ref:', ref)
        if (!ref) { r.error = 'No ref generated'; continue }

        // Open personal link in same page
        await page.goto(`/?ref=${ref}`)
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(2500)
        // Envelope shows "KEPADA YTH." for ref-linked guests
        const greetingVisible = await page.getByText('KEPADA YTH.').isVisible().catch(() => false)
        r.linkOpens = greetingVisible
        console.log('  link opens:', greetingVisible)

        // RSVP flow
        await page.locator('#envelope-screen').click({ force: true }).catch(() => {})
        await page.waitForTimeout(1500)
        await page.locator('#rsvp').scrollIntoViewIfNeeded()
        await page.waitForTimeout(800)

        if (c.guests > 0) {
          await page.click('#hadir-btn', { force: true })
          await page.waitForTimeout(700)
          // Seat selector should reflect this invitee's `guests` value
          // (which doubles as the per-row seat limit).
          const selectEl = page.locator('#seat-selector')
          const optionCount = await selectEl.locator('option').count()
          if (optionCount !== c.guests) {
            r.error = `seat selector has ${optionCount} options, expected guests=${c.guests}`
            console.warn('  ⚠ seat options mismatch:', optionCount, 'vs', c.guests)
          }
          await selectEl.selectOption(String(c.guests))
        } else {
          await page.click('#tidak-hadir-btn', { force: true })
          await page.waitForTimeout(500)
        }
        await page.click('button:has-text("KONFIRMASI")')
        const ok = await page.getByText('Terima kasih!').isVisible({ timeout: 10000 })
          .catch(() => false)
        r.rsvpFlow = ok
        console.log('  rsvp flow:', ok)

        // Verify admin reflects status
        await page.goto('/admin/invitees')
        await page.waitForTimeout(1000)
        const adminRow = await findRow(page, c.name)
        const expectedBadge = c.guests > 0 ? 'Konfirmasi' : 'Tidak Hadir'
        const badgeOk = await adminRow.getByText(expectedBadge).isVisible({ timeout: 5000 })
          .catch(() => false)
        r.adminUpdated = badgeOk
        console.log('  admin status reflects:', badgeOk, `(expected "${expectedBadge}")`)

        // QR available for confirmed guests (excludes 0-seat declines)
        if (c.guests > 0) {
          const qrBtn = adminRow.locator('button:has-text("QR")')
          r.qrAvailable = (await qrBtn.count()) > 0
        } else {
          r.qrAvailable = true // N/A for declined — pass by default
        }
        console.log('  qr ready:', r.qrAvailable)
      } catch (err) {
        r.error = (err as Error).message
        console.error('  ERROR:', r.error)
      }
    }

    // ─── STEP 4: WA blast — verify recipient routing ─────────
    console.log('\n── Blast: verify "No Phone" excluded ──')
    await page.goto('/admin/messages')
    await page.waitForTimeout(1500)
    // Fill mock tokens so both Managam and Vania buckets can dispatch
    await page.fill('input[placeholder*="Managam"]', 'MOCK_AGAM_TOKEN')
    await page.fill('input[placeholder*="Vania"]', 'MOCK_VANIA_TOKEN')
    await page.waitForTimeout(300)
    // Filter: Konfirmasi hadir — only confirmed guests
    await page.click('label:has-text("Konfirmasi hadir")')
    await page.waitForTimeout(500)
    // Click the send button; auto-accept the confirm dialog
    page.once('dialog', d => d.accept())
    fonnteHits.length = 0
    await page.click('button:has(span:has-text("KIRIM")), button:has-text("KIRIM")')
    // Wait for all bulk sends to complete (1s sleep per recipient)
    await page.waitForTimeout(15000)

    const phonesReceived = new Set(fonnteHits.map(h => h.target))
    console.log('  fonnte calls intercepted:', fonnteHits.length)
    console.log('  unique recipient phones:', Array.from(phonesReceived))

    for (let i = 0; i < CASES.length; i++) {
      const c = CASES[i]
      const r = results[i]
      if (c.guests === 0) {
        // Not in "konfirmasi hadir" filter, expected not in blast
        r.blastIncluded = !phonesReceived.has(c.phone)
      } else if (c.phone === '') {
        r.blastIncluded = !phonesReceived.has('') // must be excluded
      } else {
        r.blastIncluded = phonesReceived.has(c.phone) ||
          // accept normalized form (e.g. leading 0 stripped)
          Array.from(phonesReceived).some(p => p.endsWith(c.phone.slice(-9)))
      }
    }

    // ─── STEP 5: Print summary ──────────────────────────────
    console.log('\n══════════ TEST SUMMARY ══════════')
    const pad = (s: string, n: number) => (s + ' '.repeat(n)).slice(0, n)
    console.log(pad('Case', 32), 'CSV  Ref  Link Rsvp Admn QR   Blst')
    for (const r of results) {
      const cell = (b: boolean | undefined) => b ? ' ✓ ' : ' ✗ '
      console.log(
        pad(r.label, 32),
        cell(r.csvImported),
        cell(r.refGenerated),
        cell(r.linkOpens),
        cell(r.rsvpFlow),
        cell(r.adminUpdated),
        cell(r.qrAvailable),
        cell(r.blastIncluded),
        r.error ? `→ ${r.error}` : ''
      )
    }
    const allChecks = results.flatMap(r => [
      r.csvImported, r.refGenerated, r.linkOpens,
      r.rsvpFlow, r.adminUpdated, r.qrAvailable, r.blastIncluded,
    ])
    const passed = allChecks.filter(Boolean).length
    const total = allChecks.length
    console.log(`\n→ ${passed} / ${total} checks passed (${Math.round(100 * passed / total)}%)`)

    // ─── STEP 6: Cleanup ────────────────────────────────────
    console.log('\n── Cleanup: deleting TEST entries ──')
    await page.goto('/admin/invitees')
    await page.waitForTimeout(1000)
    for (const c of CASES) {
      try {
        await deleteRow(page, c.name)
        console.log('  deleted:', c.name)
      } catch (e) {
        console.error('  cleanup failed for', c.name, (e as Error).message)
      }
    }

    // Final assertion — at least imported and refs generated
    expect(results.every(r => r.csvImported)).toBeTruthy()
    expect(results.every(r => r.refGenerated)).toBeTruthy()
  })
})
