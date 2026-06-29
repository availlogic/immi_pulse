import { useEffect, useState } from 'react';
import { api, type Alert } from '../api/client';
import { JURISDICTIONS } from '../api/jurisdictions';
import { showToast } from '../components/Toast';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';

const KEYWORD_REGEX = /^[A-Za-z0-9 ]{1,50}$/;

export function Alerts() {
    const { tier } = useAuth();
    const navigate = useNavigate();
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [jurisdiction, setJurisdiction] = useState<string>(JURISDICTIONS[0]?.name ?? '');
    const [keyword, setKeyword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // FPA-02: "No duplicate API request is dispatched."
    // We pre-check the existing alert list and refuse to call the API when
    // the keyword+jurisdiction combination already exists.
    function isDuplicate(): boolean {
        const trimmed = keyword.trim();
        return alerts.some(
            (a) =>
                a.target_jurisdiction === jurisdiction &&
                a.keyword.toLowerCase() === trimmed.toLowerCase()
        );
    }

    useEffect(() => {
        if (tier !== 'premium' && tier !== 'admin') {
            navigate('/');
            return;
        }
        let cancelled = false;
        async function load() {
            try {
                const list = await api.getAlerts();
                if (!cancelled) setAlerts(list.alerts);
            } catch (err) {
                showToast('Could not load alerts', 'error');
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        load();
        return () => {
            cancelled = true;
        };
    }, [tier, navigate]);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        const trimmed = keyword.trim();
        if (!KEYWORD_REGEX.test(trimmed)) {
            setError('Keyword must be alphanumeric/spaces, max 50 characters.');
            return;
        }
        if (isDuplicate()) {
            setError('You already have an alarm configured for this keyword in this jurisdiction.');
            return;
        }
        try {
            await api.createAlert(jurisdiction, trimmed);
            showToast('Alert created successfully');
            setKeyword('');
            const list = await api.getAlerts();
            setAlerts(list.alerts);
        } catch (err) {
            const message = (err as Error).message;
            if (message.toLowerCase().includes('already')) {
                setError('You already have an alarm configured for this keyword in this jurisdiction.');
            } else {
                setError(message);
            }
        }
    }

    async function remove(id: string) {
        try {
            await api.deleteAlert(id);
            setAlerts((prev) => prev.filter((a) => a.alert_id !== id));
            showToast('Alert deleted successfully');
        } catch (err) {
            showToast((err as Error).message || 'Delete failed', 'error');
        }
    }

    return (
        <section aria-label="Configure keyword alerts">
            <h1>Configure Keyword Alerts</h1>

            <form className="settings-section" onSubmit={submit} noValidate>
                <div className="alarm-form">
                    <div>
                        <label htmlFor="alarm-jurisdiction">Jurisdiction</label>
                        <select
                            id="alarm-jurisdiction"
                            value={jurisdiction}
                            onChange={(e) => setJurisdiction(e.target.value)}
                        >
                            {JURISDICTIONS.map((j) => (
                                <option key={j.code} value={j.name}>
                                    {j.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="alarm-keyword">Keyword</label>
                        <input
                            id="alarm-keyword"
                            type="text"
                            value={keyword}
                            maxLength={50}
                            onChange={(e) => setKeyword(e.target.value)}
                            aria-invalid={!!error}
                            className={error ? 'error' : ''}
                            required
                        />
                    </div>
                    <button className="btn btn-primary" type="submit">
                        Create Alarm
                    </button>
                </div>
                {error && (
                    <p className="form-error" role="alert">
                        {error}
                    </p>
                )}
            </form>

            <div className="settings-section">
                <h2>Active Alarms</h2>
                {loading && <p>Loading…</p>}
                {!loading && alerts.length === 0 && <p>No alarms configured yet.</p>}
                {!loading && alerts.length > 0 && (
                    <div className="alarm-list">
                        {alerts.map((a) => (
                            <div key={a.alert_id} className="alarm-row">
                                <div>
                                    <strong>Jurisdiction:</strong> {a.target_jurisdiction}
                                    <br />
                                    <strong>Keyword:</strong> {a.keyword}
                                    <br />
                                    <span style={{ fontSize: 'var(--caption-size)', color: 'var(--color-text-secondary)' }}>
                                        Created: {new Date(a.created_at).toLocaleString()}
                                    </span>
                                </div>
                                <button
                                    className="btn btn-warning trash-button"
                                    onClick={() => remove(a.alert_id)}
                                    aria-label={`Delete alarm for ${a.keyword} in ${a.target_jurisdiction}`}
                                    title="Delete alarm"
                                >
                                    <svg
                                        className="trash-icon"
                                        width="18"
                                        height="18"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                        aria-hidden="true"
                                    >
                                        <path
                                            d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                        <path
                                            d="M10 11v6M14 11v6"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                    <span className="sr-only">Delete</span>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}