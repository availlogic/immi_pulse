import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { showToast } from '../components/Toast';

export function Login() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        try {
            // Stage 5.2: login uses HttpOnly cookies. AuthContext.login calls
            // /auth/login and stores the resulting tier + email in state.
            await login(email, password);
            showToast('Logged in successfully');
            navigate('/');
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <section style={{ maxWidth: 420, margin: '0 auto' }}>
            <h1>Login</h1>
            <form onSubmit={submit} className="settings-section" noValidate>
                <label htmlFor="login-email">Email</label>
                <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                />
                <label htmlFor="login-password" style={{ marginTop: 16 }}>
                    Password
                </label>
                <input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                />
                {error && (
                    <p className="form-error" role="alert">
                        {error}
                    </p>
                )}
                <p style={{ marginTop: 16 }}>
                    <button className="btn btn-primary" type="submit" disabled={submitting}>
                        {submitting ? 'Signing in…' : 'Sign In'}
                    </button>
                </p>
                <p>
                    Don&apos;t have an account? <Link to="/signup">Register</Link>
                </p>
            </form>
        </section>
    );
}