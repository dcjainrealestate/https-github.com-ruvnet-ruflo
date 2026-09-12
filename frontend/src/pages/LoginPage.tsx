import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login, verifyTwoFactorLogin } from '../api/auth';
import { ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';

type Step = 'credentials' | '2fa-verify';

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleCredentialsSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await login(email, password);
      if (result.requiresTwoFactor && result.tempToken) {
        setTempToken(result.tempToken);
        setStep('2fa-verify');
      } else if (result.accessToken) {
        await signIn(result.accessToken);
        navigate('/inventory');
      }
    } catch (err) {
      if (err instanceof ApiError && err.tempToken) {
        navigate('/2fa-setup', { state: { setupToken: err.tempToken, forced: true } });
        return;
      }
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTwoFactorSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await verifyTwoFactorLogin(tempToken, code);
      await signIn(result.accessToken);
      navigate('/inventory');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Invalid authentication code.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Sign in</h1>
        {error && <div className="alert alert-error">{error}</div>}

        {step === 'credentials' && (
          <form onSubmit={handleCredentialsSubmit}>
            <label>
              Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label>
              Password
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>
            <button type="submit" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
            <div className="auth-links">
              <Link to="/forgot-password">Forgot password?</Link>
              <Link to="/register">Create an account</Link>
            </div>
          </form>
        )}

        {step === '2fa-verify' && (
          <form onSubmit={handleTwoFactorSubmit}>
            <p>Enter the 6-digit code from your authenticator app.</p>
            <label>
              Authentication code
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                autoFocus
              />
            </label>
            <button type="submit" disabled={submitting}>
              {submitting ? 'Verifying…' : 'Verify'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
