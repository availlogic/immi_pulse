import type { APIRequestContext, BrowserContext, Page } from '@playwright/test';

/**
 * Stage 5.3.6 helper: pre-set the IAB TCF v2 consent cookie so the
 * consent banner does not intercept pointer events during E2E tests.
 *
 * Tests that interact with the consent banner itself should NOT use this
 * helper.
 */
const CONSENT_VERSION = '1.0.0';

export async function acceptAllConsent(ctx: BrowserContext | APIRequestContext): Promise<void> {
    // The consent cookie is a non-HttpOnly JSON-encoded value. We can set
    // it via Playwright's cookie API.
    if ('addCookies' in ctx) {
        await (ctx as BrowserContext).addCookies([
            {
                name: 'immipulse_consent',
                value: encodeURIComponent(
                    JSON.stringify({
                        essential: true,
                        analytics: true,
                        marketing: true,
                        version: CONSENT_VERSION,
                    })
                ),
                domain: 'localhost',
                path: '/',
                httpOnly: false,
                secure: false,
                sameSite: 'Lax',
            },
        ]);
    }
}

export async function rejectAllConsent(ctx: BrowserContext | APIRequestContext): Promise<void> {
    if ('addCookies' in ctx) {
        await (ctx as BrowserContext).addCookies([
            {
                name: 'immipulse_consent',
                value: encodeURIComponent(
                    JSON.stringify({
                        essential: true,
                        analytics: false,
                        marketing: false,
                        version: CONSENT_VERSION,
                    })
                ),
                domain: 'localhost',
                path: '/',
                httpOnly: false,
                secure: false,
                sameSite: 'Lax',
            },
        ]);
    }
}

export async function dismissConsentBanner(page: Page): Promise<void> {
    // Wait for the banner to be present (it always shows on first visit
    // per the simplified banner behavior) and click "Accept all".
    const banner = page.locator('.cookie-consent-backdrop');
    if (await banner.isVisible().catch(() => false)) {
        await banner.getByRole('button', { name: 'Accept all' }).click();
        await banner.waitFor({ state: 'hidden' });
    }
}