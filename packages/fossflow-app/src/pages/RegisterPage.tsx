import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/authService';
import './AuthPages.css';

export function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('token') || '';

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [signupMode, setSignupMode] = useState<'open' | 'invite' | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteValid, setInviteValid] = useState(false);

  useEffect(() => {
    authService.getSignupInfo().then(info => {
      setSignupMode(info.mode);
    }).catch(() => setSignupMode('open'));
  }, []);

  useEffect(() => {
    if (!inviteToken) return;
    authService.checkInviteToken(inviteToken).then(result => {
      setInviteValid(result.valid);
      if (result.email) {
        setEmail(result.email);
        setInviteEmail(result.email);
      }
    }).catch(() => {
      setError('This invitation link is invalid or has expired.');
    });
  }, [inviteToken]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      const { token, user } = await authService.register(username, email, password, inviteToken || undefined);
      localStorage.setItem('fossflow-token', token);
      // Refresh the auth context by re-calling me()
      await login(username, password); // This triggers a fresh login
      navigate('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (signupMode === null) {
    return <div className="auth-page"><div className="auth-card"><p style={{color:'var(--text-secondary)'}}>Loading...</p></div></div>;
  }

  if (signupMode === 'invite' && !inviteToken) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect width="48" height="48" rx="10" fill="var(--btn-primary-bg)" />
              <path d="M24 10L38 18V30L24 38L10 30V18L24 10Z" stroke="white" strokeWidth="2.5" fill="none" />
            </svg>
          </div>
          <h1>FossFLOW</h1>
          <div className="auth-error" style={{textAlign:'center'}}>
            This instance is invite-only. Please contact an administrator for an invitation.
          </div>
          <div className="auth-footer">
            <Link to="/login">Back to Sign In</Link>
          </div>
        </div>
      </div>
    );
  }

  if (signupMode === 'invite' && inviteToken && !inviteValid && !error) {
    return <div className="auth-page"><div className="auth-card"><p style={{color:'var(--text-secondary)'}}>Validating invitation...</p></div></div>;
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <rect width="48" height="48" rx="10" fill="var(--btn-primary-bg)" />
            <path d="M24 10L38 18V30L24 38L10 30V18L24 10Z" stroke="white" strokeWidth="2.5" fill="none" />
            <path d="M24 10V38M10 18L38 30M38 18L10 30" stroke="white" strokeWidth="1.5" opacity="0.5" />
          </svg>
        </div>
        <h1>FossFLOW</h1>
        <h2>{inviteToken ? 'Accept Invitation' : 'Create an account'}</h2>

        {inviteEmail && (
          <div className="auth-info">Invitation sent to <strong>{inviteEmail}</strong></div>
        )}

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Choose a username"
              autoFocus
              required
            />
          </div>
          <div className="auth-field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Enter email address"
              readOnly={!!inviteEmail}
              required
            />
          </div>
          <div className="auth-field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
            />
          </div>
          <div className="auth-field">
            <label>Confirm Password</label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Repeat password"
              required
            />
          </div>
          <button type="submit" className="auth-btn-primary" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          <Link to="/login">Already have an account? Sign in</Link>
        </div>
      </div>
    </div>
  );
}
