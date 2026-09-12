import { useEffect, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { confirmTwoFactorSetup, startTwoFactorSetup } from '../api/auth';
import { ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';

interface LocationState {
  setupToken?: string;
  forced?: boolean;
}

export function TwoFactorSetupPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const state = (location.state as LocationState) ?? {};

  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    startTwoFactorSetup(state.setupToken)
      .then((result) => {
        setQrCodeDataUrl(result.qrCodeDataUrl);
        setSecret(result.secret);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not start two-factor setup.'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await confirmTwoFactorSetup(code, state.setupToken);
      await signIn(result.accessToken);
      navigate('/inventory');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Invalid code. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Set up two-factor authentication</h1>
        {state.forced && (
          <div className="alert alert-warning">
            Your 7-day grace period to set up two-factor authentication has ended. You must complete setup to
            continue.
          </div>
        )}
        {error && <div className="alert alert-error">{error}</div>}

        {loading && <p>Loading…</p>}

        {!loading && qrCodeDataUrl && (
          <>
            <p>Scan this QR code with an authenticator app (Google Authenticator, Authy, 1Password, etc.):</p>
            <img src={qrCodeDataUrl} alt="Two-factor authentication QR code" className="qr-code" />
            {secret && (
              <p className="muted">
                Or enter this key manually: <code>{secret}</code>
              </p>
            )}
            <form onSubmit={handleSubmit}>
              <label>
                Enter the 6-digit code to confirm
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
                {submitting ? 'Confirming…' : 'Confirm and enable'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
