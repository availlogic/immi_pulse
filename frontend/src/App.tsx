import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { ToastContainer } from './components/Toast';
import { DashboardFeed } from './pages/DashboardFeed';
import { Settings } from './pages/Settings';
import { Alerts } from './pages/Alerts';
import { Login } from './pages/Login';
import { SignUp } from './pages/SignUp';
import { AdminDashboard } from './components/AdminDashboard';
import { api } from './api/client';
import { CookieConsentBanner } from './components/CookieConsentBanner';

function ProtectedRoute({
    children,
    requirePremium = false,
    requireAdmin = false,
}: {
    children: React.ReactNode;
    requirePremium?: boolean;
    requireAdmin?: boolean;
}) {
    const { isAuthenticated, tier, initialized } = useAuth();
    if (!initialized) return null;
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (requireAdmin && tier !== 'admin') return <Navigate to="/" replace />;
    if (requirePremium && tier !== 'premium' && tier !== 'admin') return <Navigate to="/" replace />;
    return <>{children}</>;
}

/**
 * Calls /auth/csrf once on app boot so the non-HttpOnly csrf_token
 * cookie is set. The api/client then echoes it in X-CSRF-Token on every
 * state-changing request.
 */
function CsrfBootstrap({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        // Best-effort; if the request fails (e.g. backend down) we just
        // log and the first protected call will fail.
        api
            .getCsrfToken()
            .catch(() => undefined);
    }, []);
    return <>{children}</>;
}

export function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <CsrfBootstrap>
                    <div className="app-shell">
                        <Header />
                        <main className="app-main">
                            <Routes>
                                <Route path="/" element={<DashboardFeed />} />
                                <Route path="/login" element={<Login />} />
                                <Route path="/signup" element={<SignUp />} />
                                <Route
                                    path="/settings"
                                    element={
                                        <ProtectedRoute>
                                            <Settings />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/alerts"
                                    element={
                                        <ProtectedRoute requirePremium>
                                            <Alerts />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/admin"
                                    element={
                                        <ProtectedRoute requireAdmin>
                                            <AdminDashboard />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route path="*" element={<Navigate to="/" replace />} />
                            </Routes>
                        </main>
                        <Footer />
                        <ToastContainer />
                        <CookieConsentBanner />
                    </div>
                </CsrfBootstrap>
            </AuthProvider>
        </BrowserRouter>
    );
}