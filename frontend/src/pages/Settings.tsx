import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { FEATURE_TAGS, JURISDICTIONS, REGIONS } from '../api/jurisdictions';
import { showToast } from '../components/Toast';

export function Settings() {
    const navigate = useNavigate();
    const [jurisdictions, setJurisdictions] = useState<string[]>([]);
    const [tags, setTags] = useState<string[]>([]);
    const [digest, setDigest] = useState<'none' | 'daily' | 'weekly'>('none');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            try {
                const prefs = await api.getPreferences();
                if (!cancelled) {
                    setJurisdictions(prefs.preferred_jurisdictions);
                    setTags(prefs.preferred_tags);
                    setDigest(prefs.digest_frequency);
                }
            } catch (err) {
                showToast('Could not load preferences', 'error');
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        load();
        return () => {
            cancelled = true;
        };
    }, []);

    function toggle(j: string) {
        setJurisdictions((prev) => (prev.includes(j) ? prev.filter((x) => x !== j) : [...prev, j]));
    }
    function toggleTag(t: string) {
        setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
    }

    async function save() {
        setSaving(true);
        try {
            await api.putPreferences({
                preferred_jurisdictions: jurisdictions,
                preferred_tags: tags,
                digest_frequency: digest,
            });
            showToast('Preferences saved successfully!');
            navigate('/');
        } catch (err) {
            showToast((err as Error).message || 'Save failed', 'error');
        } finally {
            setSaving(false);
        }
    }

    function reset() {
        setJurisdictions([]);
        setTags([]);
        setDigest('none');
        showToast('Preferences reset to global feed');
        navigate('/');
    }

    if (loading) return <p>Loading preferences…</p>;

    return (
        <section aria-label="Preferences and subscription settings">
            <h1>Preferences &amp; Subscription Settings</h1>

            <div className="settings-section">
                <h2>Select Jurisdictions</h2>
                {REGIONS.map((region) => (
                    <details key={region} open>
                        <summary style={{ cursor: 'pointer', fontWeight: 500 }}>{region}</summary>
                        <div className="checkbox-grid">
                            {JURISDICTIONS.filter((j) => j.region === region).map((j) => (
                                <label key={j.code} className="checkbox-item">
                                    <input
                                        type="checkbox"
                                        checked={jurisdictions.includes(j.code)}
                                        onChange={() => toggle(j.code)}
                                    />
                                    <span>{j.name}</span>
                                </label>
                            ))}
                        </div>
                    </details>
                ))}
            </div>

            <div className="settings-section">
                <h2>Select Feature Tags</h2>
                <div className="checkbox-grid">
                    {FEATURE_TAGS.map((t) => (
                        <label key={t} className="checkbox-item">
                            <input type="checkbox" checked={tags.includes(t)} onChange={() => toggleTag(t)} />
                            <span>{t}</span>
                        </label>
                    ))}
                </div>
            </div>

            <div className="settings-section">
                <h2>Notification Preferences</h2>
                <label htmlFor="digest-select">Email digest cadence</label>
                <select
                    id="digest-select"
                    value={digest}
                    onChange={(e) => setDigest(e.target.value as 'none' | 'daily' | 'weekly')}
                >
                    <option value="none">None</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                </select>
            </div>

            <div className="settings-section" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <button className="btn btn-primary" onClick={save} disabled={saving}>
                    {saving ? 'Saving…' : 'Save Preferences'}
                </button>
                <button className="btn btn-secondary" onClick={reset}>
                    Reset to Global Feed
                </button>
            </div>
        </section>
    );
}