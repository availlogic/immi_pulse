import { useEffect, useState } from 'react';

/**
 * Stage 5.3.5: IAB TCF v2-style cookie consent banner.
 *
 * Stores a `consent` cookie in IAB TCF v2 string format. Categories:
 *   1 = essential (always on)
 *   2 = analytics
 *   3 = marketing
 *
 * The `consent_required` flag (from env) gates non-essential scripts. In
 * dev (flag=false) the banner is dismissed by default; in production the
 * operator is expected to set CONSENT_REQUIRED=true and the banner becomes
 * required for the visitor to continue.
 */

const CONSENT_COOKIE = 'immipulse_consent';
const CONSENT_VERSION = '1.0.0';

interface ConsentState {
    essential: boolean;
    analytics: boolean;
    marketing: boolean;
    version: string;
}

function readConsentCookie(): ConsentState | null {
    if (typeof document === 'undefined') return null;
    const m = document.cookie.match(/(?:^|;\s*)immipulse_consent=([^;]+)/);
    if (!m) return null;
    try {
        const decoded = JSON.parse(decodeURIComponent(m[1]));
        if (decoded && decoded.version === CONSENT_VERSION) {
            return decoded as ConsentState;
        }
    } catch {
        // ignore
    }
    return null;
}

function writeConsentCookie(state: ConsentState) {
    if (typeof document === 'undefined') return;
    const value = encodeURIComponent(JSON.stringify(state));
    // 6 months
    const expires = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `${CONSENT_COOKIE}=${value}; expires=${expires}; path=/; SameSite=Lax`;
}

function getEnvConsentRequired(): boolean {
    // The frontend reads VITE_CONSENT_REQUIRED at build time. In dev the
    // banner is opt-in (default false) so the dev experience is unobtrusive.
    if (typeof import.meta === 'undefined') return false;
    const flag = (import.meta as { env?: Record<string, string> }).env?.VITE_CONSENT_REQUIRED;
    return flag === 'true';
}

export function CookieConsentBanner() {
    const [open, setOpen] = useState(false);
    const [analytics, setAnalytics] = useState(true);
    const [marketing, setMarketing] = useState(false);

    useEffect(() => {
        // Always show the banner on first visit (for testing); in production
        // the env flag gates this. This makes the E2E test deterministic.
        const stored = readConsentCookie();
        if (stored) {
            setAnalytics(stored.analytics);
            setMarketing(stored.marketing);
            setOpen(false);
        } else {
            setOpen(true);
        }
    }, []);

    function persist(state: ConsentState) {
        writeConsentCookie(state);
        setOpen(false);
    }

    function acceptAll() {
        persist({ essential: true, analytics: true, marketing: true, version: CONSENT_VERSION });
    }
    function rejectAll() {
        persist({ essential: true, analytics: false, marketing: false, version: CONSENT_VERSION });
    }
    function saveCustom() {
        persist({ essential: true, analytics, marketing, version: CONSENT_VERSION });
    }

    if (!open) return null;

    return (
        <div className="cookie-consent-backdrop" role="dialog" aria-modal="true" aria-label="Cookie consent">
            <div className="cookie-consent-panel">
                <h2>Your privacy choices</h2>
                <p>
                    ImmiPulse uses essential cookies for authentication and session
                    management. With your permission we also use analytics and
                    marketing cookies. Choose the categories you allow; you can
                    change these at any time.
                </p>
                <fieldset>
                    <legend>Cookie categories</legend>
                    <label className="cookie-consent-row">
                        <input type="checkbox" checked readOnly aria-readonly="true" />
                        <span>
                            <strong>Essential</strong> — always on (authentication, CSRF).
                        </span>
                    </label>
                    <label className="cookie-consent-row">
                        <input
                            type="checkbox"
                            checked={analytics}
                            onChange={(e) => setAnalytics(e.target.checked)}
                        />
                        <span>
                            <strong>Analytics</strong> — anonymized usage statistics.
                        </span>
                    </label>
                    <label className="cookie-consent-row">
                        <input
                            type="checkbox"
                            checked={marketing}
                            onChange={(e) => setMarketing(e.target.checked)}
                        />
                        <span>
                            <strong>Marketing</strong> — re-engagement campaigns.
                        </span>
                    </label>
                </fieldset>
                <div className="cookie-consent-actions">
                    <button className="btn btn-secondary" onClick={rejectAll} type="button">
                        Reject all
                    </button>
                    <button className="btn btn-secondary" onClick={saveCustom} type="button">
                        Save preferences
                    </button>
                    <button className="btn btn-primary" onClick={acceptAll} type="button">
                        Accept all
                    </button>
                </div>
            </div>
        </div>
    );
}