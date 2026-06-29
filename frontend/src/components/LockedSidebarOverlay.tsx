import { Link } from 'react-router-dom';
import { FEATURE_TAGS } from '../api/jurisdictions';

interface Props {
    jurisdictions: string[];
    tags: string[];
    jurisdictionNames: Record<string, string>;
}

export function LockedSidebarOverlay({ jurisdictions, tags, jurisdictionNames }: Props) {
    return (
        <aside className="sidebar sidebar-locked" aria-label="Subscription preferences (locked)">
            <h2>Preferences</h2>
            <h3>Jurisdictions</h3>
            {jurisdictions.length === 0 && (
                <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--caption-size)' }}>
                    No jurisdictions selected yet.
                </p>
            )}
            {jurisdictions.map((j) => (
                <div key={j} className="checkbox-item">
                    <input type="checkbox" checked readOnly aria-readonly="true" disabled />
                    <span>{jurisdictionNames[j] ?? j}</span>
                </div>
            ))}
            <h3>Feature Tags</h3>
            {FEATURE_TAGS.map((t) => (
                <div key={t} className="checkbox-item">
                    <input type="checkbox" checked={tags.includes(t)} readOnly aria-readonly="true" disabled />
                    <span>{t}</span>
                </div>
            ))}
            <div className="locked-overlay">
                <div className="lock-card">
                    <svg
                        className="lock-icon"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                    >
                        <path
                            d="M6 10V8a6 6 0 0112 0v2"
                            stroke="#1E40AF"
                            strokeWidth="2"
                            strokeLinecap="round"
                        />
                        <rect x="4" y="10" width="16" height="11" rx="2" stroke="#1E40AF" strokeWidth="2" />
                    </svg>
                    <p>Register to customize your feed.</p>
                    <Link to="/signup" className="btn btn-primary">
                        Sign Up
                    </Link>
                </div>
            </div>
        </aside>
    );
}