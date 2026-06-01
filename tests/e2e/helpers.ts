import { Page } from '@playwright/test'

// Navigate to the admin Messages page and fill the Fonnte API tokens.
//
// The token section is a collapsible <details> (mobile pass), so the inputs
// are hidden by default. We force the panel open via the DOM (idempotent —
// `open = true` stays open, no toggle/animation race) and target the inputs by
// data-testid so the tests don't depend on placeholder wording or layout.
export async function gotoMessagesAndFillTokens(page: Page) {
  await page.goto('/admin/messages')
  // Wait for the manual-selection picker to hydrate before driving the page.
  // Cold-start runs can take >1.5s to render.
  await page.waitForSelector('[data-testid="manual-search-input"]', {
    state: 'visible', timeout: 15000,
  })
  await page.locator('[data-testid="fonnte-token-section"]')
    .evaluate(el => { (el as HTMLDetailsElement).open = true })
  await page.fill('[data-testid="fonnte-token-agam"]', 'MOCK_AGAM_TOKEN')
  await page.fill('[data-testid="fonnte-token-vania"]', 'MOCK_VANIA_TOKEN')
  await page.waitForTimeout(300)
}
