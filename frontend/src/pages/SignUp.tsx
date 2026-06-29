import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { showToast } from '../components/Toast';

export function SignUp() {
    const navigate = useNavigate();
    const { signup } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        if (password.length < 8) {
            setError('Password must be at least 8 characters.');
            setSubmitting(false);
            return;
        }
        try {
            // Stage 5.2: signup → cookie auth. AuthContext.signup calls
            // /auth/signup and then /user/preferences to confirm the session.
            await signup(email, password);
            showToast('Welcome to ImmiPulse!');
            navigate('/settings');
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <section style={{ maxWidth: 420, margin: '0 auto' }}>
            <h1>Create Your Account</h1>
            <p>Personalize your feed and opt-in to email digests.</p>
            <form onSubmit={submit} className="settings-section" noValidate>
                <label htmlFor="signup-email">Email</label>
                <input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                />
                <label htmlFor="signup-password" style={{ marginTop: 16 }}>
                    Password (min 8 characters)
                </label>
                <input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    minLength={8}
                />
                {error && (
                    <p className="form-error" role="alert">
                        {error}
                    </p>
                )}
                <p style={{ marginTop: 16 }}>
                    <button className="btn btn-primary" type="submit" disabled={submitting}>
                        {submitting ? 'Creating account…' : 'Register'}
                    </button>
                </p>
                <p>
                    Already have an account? <Link to="/login">Log in</Link>
                </p>
            </form>
        </section>
    );
}