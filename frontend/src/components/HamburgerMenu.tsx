import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export function HamburgerMenu({ isOpen, onClose }: Props) {
    const { isAuthenticated, tier, logout } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    function closeAndNavigate(path: string) {
        onClose();
        navigate(path);
    }

    return (
        <div
            className="modal-backdrop"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <nav className="hamburger-panel" aria-label="Mobile navigation">
                <button
                    className="modal-close"
                    onClick={onClose}
                    aria-label="Close menu"
                    title="Close"
                >
                    ×
                </button>
                <h2>Menu</h2>
                <ul>
                    <li>
                        <Link to="/" onClick={onClose}>
                            Dashboard
                        </Link>
                    </li>
                    {isAuthenticated && (
                        <li>
                            <Link to="/settings" onClick={onClose}>
                                Settings
                            </Link>
                        </li>
                    )}
                    {isAuthenticated && (tier === 'premium' || tier === 'admin') && (
                        <li>
                            <Link to="/alerts" onClick={onClose}>
                                Alerts
                            </Link>
                        </li>
                    )}
                    {isAuthenticated && tier === 'admin' && (
                        <li>
                            <Link to="/admin" onClick={onClose}>
                                Admin
                            </Link>
                        </li>
                    )}
                </ul>
                <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '16px 0' }} />
                {isAuthenticated ? (
                    <div>
                        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--caption-size)' }}>
                            Signed in as {tier}
                        </p>
                        <button
                            className="btn btn-secondary"
                            onClick={() => {
                                logout();
                                closeAndNavigate('/');
                            }}
                        >
                            Logout
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-secondary" onClick={() => closeAndNavigate('/login')}>
                            Login
                        </button>
                        <button className="btn btn-primary" onClick={() => closeAndNavigate('/signup')}>
                            Sign Up
                        </button>
                    </div>
                )}
            </nav>
        </div>
    );
}