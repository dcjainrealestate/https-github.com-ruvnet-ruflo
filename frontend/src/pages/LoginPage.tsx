import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login, loginWithGoogle, verifyTwoFactorLogin, type LoginResult } from '../api/auth';
import { ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';

type Step = 'credentials' | '2fa-verify';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

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
  const googleButtonRef = useRef<HTMLDivElement>(null);

  async function handleLoginResult(result: LoginResult) {
    if (result.requiresTwoFactor && result.tempToken) {
      setTempToken(result.tempToken);
      setStep('2fa-verify');
    } else if (result.accessToken) {
      await signIn(result.accessToken);
      navigate('/inventory');
    }
  }

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !googleButtonRef.current) {
      return;
    }

    let cancelled = false;

    async function handleGoogleCredential(response: { credential: string }) {
      setError(null);
      try {
        const result = await loginWithGoogle(response.credential);
        await handleLoginResult(result);
      } catch (err) {
        if (err instanceof ApiError && err.tempToken) {
          navigate('/2fa-setup', { state: { setupToken: err.tempToken, forced: true } });
          return;
        }
        setError(err instanceof ApiError ? err.message : 'Google sign-in failed. Please try again.');
      }
    }

    function render() {
      if (cancelled || !window.google || !googleButtonRef.current) {
        return;
      }
      window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID!, callback: handleGoogleCredential });
      window.google.accounts.id.renderButton(googleButtonRef.current, { theme: 'outline', size: 'large', width: 280 });
    }

    if (window.google) {
      render();
    } else {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = render;
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCredentialsSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await login(email, password);
      await handleLoginResult(result);
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

        {step === 'credentials' && GOOGLE_CLIENT_ID && (
          <div className="auth-divider">
            <span>or</span>
            <div ref={googleButtonRef} />
          </div>
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
