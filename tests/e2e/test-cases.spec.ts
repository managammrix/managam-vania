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
  // Quote every field so that empty cells (e.g. No Phone) survive the
  // import parser. The admin CSV regex uses `[^,]+` which silently skips
  // consecutive commas — without quotes, an empty phone would shift later
  // columns left and put `guests` into the phone field.
  const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
  const body = rows
    .map(r => [r.name, r.phone, r.guests, r.notes, r.sender].map(q).join(','))
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
  await page.waitForSelector('button:has-text("IMPORT")', {
    state: 'visible', timeout: 5000,
  })
  await page.click('button:has-text("IMPORT")')
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

// Delete every row whose name starts with "TEST -". After each
// delete the admin component calls load() which re-fetches and
// re-renders, possibly clearing the search input. We therefore
// re-navigate + re-search on every iteration for a clean state.
async function cleanupAllTestRows(page: Page): Promise<number> {
  let removed = 0
  let attempts = 0
  // Persistent dialog handler — page.once was re-registering per
  // iteration but if the dialog fired faster than the next handler
  // could attach, the handler was missing.
  const dialogHandler = (d: { accept: () => Promise<void> }) => d.accept()
  page.on('dialog', dialogHandler)
  try {
    for (let i = 0; i < 60; i++) {
      attempts++
      await page.goto('/admin/invitees')
      await page.waitForTimeout(1000)
      await page.fill('input[placeholder*="Cari"]', 'TEST -')
      await page.waitForTimeout(900)
      const rows = page.locator('tr').filter({ hasText: 'TEST -' })
      const count = await rows.count()
      if (count === 0) break
      try {
        await rows.first()
          .locator('button:has-text("Hapus")')
          .click({ timeout: 5000 })
        await page.waitForTimeout(1200)
        removed++
      } catch (e) {
        console.warn(`  cleanup iter ${i}: click failed —`,
          (e as Error).message.slice(0, 100))
        break
      }
    }
  } finally {
    page.off('dialog', dialogHandler)
  }
  console.log(`  cleanup: ${removed} removed across ${attempts} attempts`)
  return removed
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
  test.setTimeout(15 * 60 * 1000)

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

    // ─── Intercept get_invitee_by_ref RPC responses ─────────
    // Listen to all Supabase RPC responses; case-1 verbose logging
    // toggles based on `verboseCase` below.
    const rpcResponses: Array<{
      url: string
      body: unknown
      caseLabel: string
    }> = []
    let verboseCase = ''
    page.on('response', async resp => {
      const url = resp.url()
      if (url.includes('/rpc/get_invitee_by_ref')) {
        try {
          const body = await resp.json()
          rpcResponses.push({ url, body, caseLabel: verboseCase })
          if (verboseCase) {
            console.log(`  [RPC ${verboseCase}] get_invitee_by_ref →`,
              JSON.stringify(body).slice(0, 300))
          }
        } catch { /* not JSON */ }
      }
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

    // ─── STEP 0: Login + pre-cleanup stale TEST rows ────────
    await loginAdmin(page)
    console.log('✅ Step 0: Logged in to admin')
    const preRemoved = await cleanupAllTestRows(page)
    console.log(`✅ Step 0b: Pre-cleanup — removed ${preRemoved} stale TEST rows`)

    // ─── STEP 1: Import CSV ─────────────────────────────────
    await importCsv(page, buildCsv(CASES))
    console.log('✅ Step 1: CSV import dispatched, reloading table')
    await page.reload()
    await page.waitForTimeout(2000)

    // Wait until first row's Link button (data-ref) is in DOM
    await page.fill('input[placeholder*="Cari"]', CASES[0].name)
    await page.waitForTimeout(800)
    await page.waitForSelector(
      `tr:has-text("${CASES[0].name}") button[data-ref]`,
      { state: 'attached', timeout: 10000 }
    ).catch(() => null)

    const firstRowHtml = await page.locator('tr')
      .filter({ hasText: CASES[0].name })
      .first()
      .innerHTML()
      .catch(() => '(row not found)')
    console.log('   First TEST row HTML (first 500 chars):')
    console.log('  ', firstRowHtml.slice(0, 500))
    await page.fill('input[placeholder*="Cari"]', '')
    await page.waitForTimeout(400)

    // ─── STEP 2: Per-guest verification ─────────────────────
    for (let i = 0; i < CASES.length; i++) {
      const c = CASES[i]
      const r = results[i]
      // Verbose for cases 1, 6 (No Phone), 8 (Overseas SG)
      const verbose = i === 0 || i === 5 || i === 7
      verboseCase = verbose ? c.label : ''
      console.log(`\n── ${c.label} (${c.name}) ──`)
      const log = (...args: unknown[]) => {
        if (verbose) console.log('  [v]', ...args)
      }

      try {
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

        // ─── Open personal link ────────────────────────────
        log('navigating to /?ref=' + ref)
        await page.goto(`/?ref=${ref}`)
        await page.waitForLoadState('networkidle')
        log('networkidle reached')

        let envelopeLoaded = false
        try {
          await page.waitForSelector('#envelope-screen', {
            state: 'visible', timeout: 12000,
          })
          envelopeLoaded = true
          log('#envelope-screen visible')
        } catch { envelopeLoaded = false }
        r.linkOpens = envelopeLoaded
        console.log('  link opens (envelope visible):', envelopeLoaded)

        if (!envelopeLoaded) {
          const visibleText = await page.locator('body').innerText().catch(() => '')
          console.log('  page text snippet:', visibleText.slice(0, 200).replace(/\n/g, ' | '))
          continue
        }

        // ─── Open envelope ─────────────────────────────────
        log('clicking #envelope-screen')
        await page.locator('#envelope-screen').click({ force: true }).catch(() => {})
        await page.waitForTimeout(1500)
        const coverVisible = await page.locator('#cover').isVisible().catch(() => false)
        log('#cover visible after click:', coverVisible)
        if (!coverVisible) {
          r.error = 'Envelope did not open (no #cover after click)'
          console.warn('  ⚠', r.error)
          continue
        }

        // ─── Navigate to RSVP ──────────────────────────────
        try {
          await page.locator('#rsvp').scrollIntoViewIfNeeded()
          await page.waitForTimeout(800)
          log('scrolled to #rsvp')

          if (c.guests > 0) {
            const hadirVisible = await page.locator('#hadir-btn').isVisible().catch(() => false)
            log('#hadir-btn visible:', hadirVisible)
            await page.click('#hadir-btn', { force: true })
            log('clicked #hadir-btn')
            await page.waitForTimeout(900)

            await page.waitForSelector('#seat-selector', {
              state: 'visible', timeout: 5000,
            })
            const selectEl = page.locator('#seat-selector')
            const optionCount = await selectEl.locator('option').count()
            log('seat selector option count:', optionCount)
            if (verbose) {
              const selectorHtml = await selectEl.innerHTML().catch(() => '')
              log('seat selector HTML:', selectorHtml.replace(/\s+/g, ' ').slice(0, 300))
            }
            if (optionCount !== c.guests) {
              r.error = `seat options=${optionCount}, expected ${c.guests}`
              console.warn('  ⚠ seat options mismatch:', optionCount, 'vs', c.guests)
            }
            const seatToPick = Math.min(c.guests, optionCount)
            if (seatToPick > 0) {
              await selectEl.selectOption(String(seatToPick)).catch(err => {
                console.warn('  ⚠ selectOption failed:', (err as Error).message)
              })
              log('selected seat:', seatToPick)
            }
          } else {
            const tidakVisible = await page.locator('#tidak-hadir-btn').isVisible().catch(() => false)
            log('#tidak-hadir-btn visible:', tidakVisible)
            await page.click('#tidak-hadir-btn', { force: true })
            log('clicked #tidak-hadir-btn')
            await page.waitForTimeout(500)
          }

          const konfirmasiBtn = page.locator('button:has-text("KONFIRMASI")')
          const konfirmasiVisible = await konfirmasiBtn.isVisible().catch(() => false)
          log('KONFIRMASI button visible:', konfirmasiVisible)
          await konfirmasiBtn.click()
          log('clicked KONFIRMASI')

          // Wait for success message. 20s timeout to accommodate
          // Supabase RPC + QR canvas generation + render time on
          // slower test runs.
          try {
            await page.waitForSelector('text=Terima kasih!', {
              state: 'visible', timeout: 20000,
            })
            r.rsvpFlow = true
            log('"Terima kasih!" visible')
          } catch {
            r.rsvpFlow = false
            log('"Terima kasih!" never appeared within 20s')
          }
        } catch (err) {
          r.error = `rsvp flow error: ${(err as Error).message}`
          console.warn('  ⚠ rsvp flow threw:', r.error)
        }
        console.log('  rsvp flow:', r.rsvpFlow)

        // ─── Verify admin reflects status ──────────────────
        await page.goto('/admin/invitees')
        await page.waitForTimeout(1000)
        const adminRow = await findRow(page, c.name)
        // Admin getStatusBadge() returns "Kehormatan" (not "Tidak Hadir")
        // for any row with guests=0, by design. So that's what we look
        // for when the test case is a 0-seat decline.
        const expectedBadge = c.guests > 0 ? 'Konfirmasi' : 'Kehormatan'
        // For guests=0 the row renders "Kehormatan" twice (status badge
        // + guest-count cell), so `.first()` avoids a strict-mode throw.
        const badgeOk = await adminRow.getByText(expectedBadge).first()
          .isVisible({ timeout: 5000 })
          .catch(() => false)
        r.adminUpdated = badgeOk
        console.log('  admin status reflects:', badgeOk, `(expected "${expectedBadge}")`)

        if (c.guests > 0) {
          const qrBtn = adminRow.locator('button:has-text("QR")')
          r.qrAvailable = (await qrBtn.count()) > 0
        } else {
          r.qrAvailable = true
        }
        console.log('  qr ready:', r.qrAvailable)
      } catch (err) {
        r.error = (err as Error).message
        console.error('  ERROR:', r.error)
      } finally {
        verboseCase = ''
      }
    }

    // ─── STEP 3: WA blast — verify recipient routing ────────
    console.log('\n── Blast: verify "No Phone" excluded ──')
    await page.goto('/admin/messages')
    await page.waitForTimeout(1500)
    await page.fill('input[placeholder*="Managam"]', 'MOCK_AGAM_TOKEN')
    await page.fill('input[placeholder*="Vania"]', 'MOCK_VANIA_TOKEN')
    await page.waitForTimeout(300)
    await page.click('label:has-text("Konfirmasi hadir")')
    await page.waitForTimeout(500)
    page.once('dialog', d => d.accept())
    fonnteHits.length = 0
    await page.click('button:has(span:has-text("KIRIM")), button:has-text("KIRIM")')
      .catch(err => console.warn('  KIRIM click failed:', (err as Error).message))
    await page.waitForTimeout(15000)

    const phonesReceived = new Set(fonnteHits.map(h => h.target))
    console.log('  fonnte calls intercepted:', fonnteHits.length)
    console.log('  unique recipient phones:', Array.from(phonesReceived))

    for (let i = 0; i < CASES.length; i++) {
      const c = CASES[i]
      const r = results[i]
      if (c.guests === 0) {
        r.blastIncluded = !phonesReceived.has(c.phone)
      } else if (c.phone === '') {
        r.blastIncluded = !phonesReceived.has('')
      } else {
        r.blastIncluded = phonesReceived.has(c.phone) ||
          Array.from(phonesReceived).some(p => p.endsWith(c.phone.slice(-9)))
      }
    }

    // ─── STEP 4: Print summary ──────────────────────────────
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

    // ─── STEP 5: Cleanup ────────────────────────────────────
    console.log('\n── Cleanup: deleting TEST entries ──')
    const postRemoved = await cleanupAllTestRows(page)
    console.log(`  removed ${postRemoved} TEST rows`)

    expect(results.every(r => r.csvImported)).toBeTruthy()
    expect(results.every(r => r.refGenerated)).toBeTruthy()
  })
})
