import { useNavigate } from 'react-router-dom';
import { FEATURE_TAGS, JURISDICTIONS, REGIONS } from '../api/jurisdictions';

interface Props {
    jurisdictions: string[];
    tags: string[];
    digestFrequency: 'none' | 'daily' | 'weekly';
    onChange: (next: { jurisdictions: string[]; tags: string[]; digestFrequency: 'none' | 'daily' | 'weekly' }) => void;
}

export function PreferencesSidebar({ jurisdictions, tags, digestFrequency, onChange }: Props) {
    const navigate = useNavigate();

    function toggleJurisdiction(code: string) {
        const next = jurisdictions.includes(code) ? jurisdictions.filter((j) => j !== code) : [...jurisdictions, code];
        onChange({ jurisdictions: next, tags, digestFrequency });
    }

    function toggleTag(tag: string) {
        const next = tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag];
        onChange({ jurisdictions, tags: next, digestFrequency });
    }

    return (
        <aside className="sidebar" aria-label="Subscription preferences">
            <h2>Preferences</h2>
            <h3>Jurisdictions</h3>
            {REGIONS.map((region) => (
                <details key={region} open>
                    <summary style={{ cursor: 'pointer', fontWeight: 500 }}>{region}</summary>
                    <div className="checkbox-grid">
                        {JURISDICTIONS.filter((j) => j.region === region).map((j) => (
                            <label key={j.code} className="checkbox-item">
                                <input
                                    type="checkbox"
                                    checked={jurisdictions.includes(j.code)}
                                    onChange={() => toggleJurisdiction(j.code)}
                                />
                                <span>{j.name}</span>
                            </label>
                        ))}
                    </div>
                </details>
            ))}

            <h3>Feature Tags</h3>
            <div className="checkbox-grid">
                {FEATURE_TAGS.map((t) => (
                    <label key={t} className="checkbox-item">
                        <input
                            type="checkbox"
                            checked={tags.includes(t)}
                            onChange={() => toggleTag(t)}
                        />
                        <span>{t}</span>
                    </label>
                ))}
            </div>

            <h3>Digest Frequency</h3>
            <label htmlFor="digest">Email digest cadence</label>
            <select
                id="digest"
                value={digestFrequency}
                onChange={(e) => onChange({ jurisdictions, tags, digestFrequency: e.target.value as 'none' | 'daily' | 'weekly' })}
            >
                <option value="none">None</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
            </select>

            <p style={{ marginTop: 16 }}>
                <button className="btn btn-primary" onClick={() => navigate('/settings')}>
                    Manage Settings
                </button>
            </p>
        </aside>
    );
}