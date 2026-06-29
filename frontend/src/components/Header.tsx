import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { HamburgerMenu } from './HamburgerMenu';

export function Header() {
    const { isAuthenticated, tier, logout } = useAuth();
    const [hamburgerOpen, setHamburgerOpen] = useState(false);

    return (
        <header className="header">
            <div className="header-inner">
                <button
                    className="hamburger"
                    type="button"
                    aria-label="Open navigation menu"
                    onClick={() => setHamburgerOpen(true)}
                >
                    ☰
                </button>
                <Link to="/" className="brand" aria-label="ImmiPulse home">
                    ImmiPulse
                </Link>
                <nav className="nav-links" aria-label="Primary">
                    <NavLink to="/" end>
                        Dashboard
                    </NavLink>
                    {isAuthenticated && (
                        <NavLink to="/settings">Settings</NavLink>
                    )}
                    {isAuthenticated && (tier === 'premium' || tier === 'admin') && (
                        <NavLink to="/alerts">Alerts</NavLink>
                    )}
                    {/* Stage 6.6.5: Admin link visible only to admin-tier users. */}
                    {isAuthenticated && tier === 'admin' && (
                        <NavLink to="/admin">Admin</NavLink>
                    )}
                </nav>
                <div className="auth-actions">
                    {isAuthenticated ? (
                        <>
                            <span aria-label="Tier" style={{ alignSelf: 'center', color: 'var(--color-text-secondary)' }}>
                                {tier}
                            </span>
                            <button className="btn btn-secondary" onClick={logout}>
                                Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="btn btn-secondary">
                                Login
                            </Link>
                            <Link to="/signup" className="btn btn-primary">
                                Sign Up
                            </Link>
                        </>
                    )}
                </div>
            </div>
            <HamburgerMenu isOpen={hamburgerOpen} onClose={() => setHamburgerOpen(false)} />
        </header>
    );
}