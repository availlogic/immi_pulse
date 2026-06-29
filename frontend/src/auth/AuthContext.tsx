import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, ApiError } from '../api/client';

interface AuthState {
    tier: 'basic' | 'premium' | 'admin' | null;
    email: string | null;
}

interface AuthContextValue extends AuthState {
    initialized: boolean;
    login: (email: string, password: string) => Promise<void>;
    signup: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Read the `csrf_token` cookie value. The cookie is set as a non-HttpOnly
 * cookie by the backend, so `document.cookie` can access it.
 */
function readCsrfToken(): string | null {
    if (typeof document === 'undefined') return null;
    const m = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : null;
}

function clearClientAuthState() {
    // The HttpOnly access_token cookie is cleared by the server. We do
    // not need to (and cannot) clear it from JS. We just clear the auth
    // context here.
    return { tier: null, email: null } as AuthState;
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<AuthState>({ tier: null, email: null });
    const [initialized, setInitialized] = useState(false);

    // On boot: probe /user/me via cookie auth. If it succeeds we know the
    // user is logged in and have their tier + email. The server reads the
    // HttpOnly access_token cookie for us.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const me = await api.getMe();
                if (cancelled) return;
                setState({ tier: me.user_tier, email: me.email });
            } catch (err) {
                if (cancelled) return;
                if (err instanceof ApiError && err.status === 401) {
                    setState(clearClientAuthState());
                }
            } finally {
                if (!cancelled) setInitialized(true);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        const result = await api.login(email, password);
        setState({ tier: result.user_tier as 'basic' | 'premium' | 'admin' | null, email });
    }, []);

    const signup = useCallback(async (email: string, password: string) => {
        await api.signup(email, password);
        // Signup also logs the user in (sets the access_token cookie).
        const prefs = await api.getPreferences();
        setState({ tier: 'basic', email });
        void prefs;
    }, []);

    const logout = useCallback(async () => {
        try {
            await api.logout();
        } catch {
            // ignore — server will clear cookies regardless
        }
        setState(clearClientAuthState());
    }, []);

    const value = useMemo<AuthContextValue>(
        () => ({
            ...state,
            initialized,
            login,
            signup,
            logout,
            isAuthenticated: !!state.tier,
        }),
        [state, initialized, login, signup, logout]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
}

export const _csrf = { read: readCsrfToken };