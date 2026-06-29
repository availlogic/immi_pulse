import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function BottomNav() {
    const { tier } = useAuth();
    return (
        <nav className="bottom-nav" aria-label="Primary mobile navigation">
            <div className="bottom-nav-inner">
                <NavLink to="/" end>
                    Dashboard
                </NavLink>
                <NavLink to="/settings">Settings</NavLink>
                {(tier === 'premium' || tier === 'admin') && <NavLink to="/alerts">Alerts</NavLink>}
                {!(tier === 'premium' || tier === 'admin') && <span style={{ visibility: 'hidden' }}>Alerts</span>}
            </div>
        </nav>
    );
}