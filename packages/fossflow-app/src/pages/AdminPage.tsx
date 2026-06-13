import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';
import './AdminPage.css';

type Tab = 'users' | 'settings' | 'smtp' | 'invites';

interface UserRow {
  id: string; username: string; email: string; role: string;
  quota: number; active: number; created_at: string; last_login: string | null;
  diagram_count: number;
}

interface InviteRow {
  id: string; email: string; token: string; used: number;
  created_by_name: string | null; created_at: string; expires_at: string;
}

interface SmtpConfig {
  configured: boolean; host?: string; port?: number; secure?: boolean;
  user?: string; from?: string; password?: string;
}

export function AdminPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('users');

  // Users
  const [users, setUsers] = useState<UserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [editingQuota, setEditingQuota] = useState<Record<string, number>>({});
  const [editingPassword, setEditingPassword] = useState<Record<string, string>>({});

  // Settings
  const [signupMode, setSignupMode] = useState<'open' | 'invite'>('open');
  const [settingsMsg, setSettingsMsg] = useState('');

  // SMTP
  const [smtp, setSmtp] = useState<SmtpConfig>({ configured: false });
  const [smtpForm, setSmtpForm] = useState({ host: '', port: '587', secure: false, user: '', password: '', from: '' });
  const [smtpMsg, setSmtpMsg] = useState('');
  const [smtpLoading, setSmtpLoading] = useState(false);

  // Invites
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMsg, setInviteMsg] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

  const loadUsers = async () => {
    setUsersLoading(true); setUsersError('');
    try {
      const list = await authService.adminGetUsers() as UserRow[];
      setUsers(list);
      const q: Record<string, number> = {};
      list.forEach(u => { q[u.id] = u.quota; });
      setEditingQuota(q);
    } catch (e: unknown) { setUsersError(e instanceof Error ? e.message : 'Failed'); }
    finally { setUsersLoading(false); }
  };

  const loadSettings = async () => {
    const s = await authService.adminGetSettings();
    setSignupMode(s.signup_mode as 'open' | 'invite');
  };

  const loadSmtp = async () => {
    const s = await authService.adminGetSmtp() as SmtpConfig;
    setSmtp(s);
    if (s.configured) {
      setSmtpForm(f => ({ ...f, host: s.host||'', port: String(s.port||587), secure: s.secure||false, user: s.user||'', from: s.from||'', password: '' }));
    }
  };

  const loadInvites = async () => {
    const list = await authService.adminGetInvites() as InviteRow[];
    setInvites(list);
  };

  useEffect(() => {
    if (tab === 'users') loadUsers();
    if (tab === 'settings') loadSettings();
    if (tab === 'smtp') loadSmtp();
    if (tab === 'invites') { loadInvites(); loadSettings(); }
  }, [tab]);

  const handleSaveQuota = async (userId: string) => {
    try {
      await authService.adminUpdateUser(userId, { quota: editingQuota[userId] });
      await loadUsers();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed'); }
  };

  const handleSavePassword = async (userId: string) => {
    const pw = editingPassword[userId];
    if (!pw) return;
    try {
      await authService.adminUpdateUser(userId, { password: pw });
      setEditingPassword(p => ({ ...p, [userId]: '' }));
      alert('Password updated');
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed'); }
  };

  const handleToggleActive = async (u: UserRow) => {
    try {
      await authService.adminUpdateUser(u.id, { active: !u.active });
      await loadUsers();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed'); }
  };

  const handleDeleteUser = async (u: UserRow) => {
    if (!window.confirm(`Delete user "${u.username}" and all their diagrams?`)) return;
    try {
      await authService.adminDeleteUser(u.id);
      await loadUsers();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed'); }
  };

  const handleToggleSignupMode = async () => {
    const newMode = signupMode === 'open' ? 'invite' : 'open';
    try {
      await authService.adminUpdateSettings({ signup_mode: newMode });
      setSignupMode(newMode);
      setSettingsMsg(`Signup mode set to ${newMode}`);
      setTimeout(() => setSettingsMsg(''), 3000);
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed'); }
  };

  const handleSmtpSave = async (e: FormEvent) => {
    e.preventDefault(); setSmtpLoading(true); setSmtpMsg('');
    try {
      await authService.adminUpdateSmtp({ ...smtpForm, port: Number(smtpForm.port) });
      setSmtpMsg('SMTP settings saved');
      await loadSmtp();
    } catch (e: unknown) { setSmtpMsg(e instanceof Error ? e.message : 'Failed'); }
    finally { setSmtpLoading(false); }
  };

  const handleSmtpTest = async () => {
    setSmtpLoading(true); setSmtpMsg('');
    try {
      await authService.adminTestSmtp();
      setSmtpMsg('Test email sent to your account email!');
    } catch (e: unknown) { setSmtpMsg(e instanceof Error ? `Test failed: ${e.message}` : 'Test failed'); }
    finally { setSmtpLoading(false); }
  };

  const handleSendInvite = async (e: FormEvent) => {
    e.preventDefault(); setInviteLoading(true); setInviteMsg('');
    try {
      const result = await authService.adminSendInvite(inviteEmail);
      if (result.emailSent) {
        setInviteMsg(`Invitation sent to ${inviteEmail}`);
      } else {
        const link = `${window.location.origin}/register?token=${result.token}`;
        setInviteMsg(`Invite created (email not sent — ${result.emailError}). Link: ${link}`);
      }
      setInviteEmail('');
      await loadInvites();
    } catch (e: unknown) { setInviteMsg(e instanceof Error ? e.message : 'Failed'); }
    finally { setInviteLoading(false); }
  };

  const handleDeleteInvite = async (id: string) => {
    await authService.adminDeleteInvite(id);
    await loadInvites();
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return 'Never';
    try { return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); }
    catch { return iso; }
  };

  const isExpired = (iso: string) => new Date(iso) < new Date();

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div className="admin-header-left">
          <button className="admin-back-btn" onClick={() => navigate('/')}>← Editor</button>
          <h1>Admin Panel</h1>
        </div>
        <div className="admin-header-right">
          <span className="admin-welcome">Signed in as <strong>{user?.username}</strong></span>
          <button className="admin-logout-btn" onClick={() => { logout(); navigate('/login'); }}>Sign Out</button>
        </div>
      </div>

      <div className="admin-tabs">
        {(['users', 'settings', 'smtp', 'invites'] as Tab[]).map(t => (
          <button key={t} className={`admin-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'users' ? 'Users' : t === 'settings' ? 'Settings' : t === 'smtp' ? 'SMTP' : 'Invites'}
          </button>
        ))}
      </div>

      <div className="admin-content">

        {/* USERS TAB */}
        {tab === 'users' && (
          <div className="admin-section">
            <div className="admin-section-header">
              <h2>User Management</h2>
              <button className="admin-btn-secondary" onClick={loadUsers}>Refresh</button>
            </div>
            {usersError && <div className="admin-error">{usersError}</div>}
            {usersLoading && <div className="admin-loading">Loading...</div>}
            {!usersLoading && (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Drawings</th>
                      <th>Quota</th>
                      <th>Last Login</th>
                      <th>Status</th>
                      <th>Password</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} className={!u.active ? 'row-inactive' : ''}>
                        <td><strong>{u.username}</strong>{u.role === 'admin' && <span className="badge-admin">admin</span>}</td>
                        <td>{u.email}</td>
                        <td>{u.role}</td>
                        <td>{u.diagram_count}</td>
                        <td>
                          <div className="quota-edit">
                            <input
                              type="number"
                              min="0"
                              max="9999"
                              value={editingQuota[u.id] ?? u.quota}
                              onChange={e => setEditingQuota(p => ({ ...p, [u.id]: Number(e.target.value) }))}
                            />
                            <button className="admin-btn-xs" onClick={() => handleSaveQuota(u.id)}>Save</button>
                          </div>
                        </td>
                        <td>{formatDate(u.last_login)}</td>
                        <td>
                          <span className={`status-badge ${u.active ? 'active' : 'inactive'}`}>
                            {u.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div className="password-edit">
                            <input
                              type="password"
                              placeholder="New password"
                              value={editingPassword[u.id] || ''}
                              onChange={e => setEditingPassword(p => ({ ...p, [u.id]: e.target.value }))}
                            />
                            <button className="admin-btn-xs" onClick={() => handleSavePassword(u.id)}>Set</button>
                          </div>
                        </td>
                        <td>
                          <div className="action-btns">
                            <button
                              className={`admin-btn-xs ${u.active ? 'btn-warn' : 'btn-ok'}`}
                              onClick={() => handleToggleActive(u)}
                              disabled={u.id === user?.id}
                            >
                              {u.active ? 'Disable' : 'Enable'}
                            </button>
                            <button
                              className="admin-btn-xs btn-danger"
                              onClick={() => handleDeleteUser(u)}
                              disabled={u.id === user?.id}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* SETTINGS TAB */}
        {tab === 'settings' && (
          <div className="admin-section">
            <h2>Application Settings</h2>
            <div className="settings-card">
              <div className="settings-row">
                <div>
                  <h3>Registration Mode</h3>
                  <p>Control how new users can sign up for FossFLOW.</p>
                </div>
                <div className="toggle-group">
                  <button
                    className={`toggle-btn ${signupMode === 'open' ? 'active' : ''}`}
                    onClick={() => signupMode !== 'open' && handleToggleSignupMode()}
                  >
                    Open Signup
                  </button>
                  <button
                    className={`toggle-btn ${signupMode === 'invite' ? 'active' : ''}`}
                    onClick={() => signupMode !== 'invite' && handleToggleSignupMode()}
                  >
                    Invite Only
                  </button>
                </div>
              </div>
              <div className="settings-description">
                {signupMode === 'open'
                  ? 'Anyone can register. New users can sign up at /register.'
                  : 'New users can only register with a valid invitation link issued by an admin.'}
              </div>
              {settingsMsg && <div className="admin-success">{settingsMsg}</div>}
            </div>
          </div>
        )}

        {/* SMTP TAB */}
        {tab === 'smtp' && (
          <div className="admin-section">
            <h2>SMTP Email Settings</h2>
            <p className="admin-hint">
              SMTP credentials are encrypted before being stored in the database. Used for sending invitation emails.
            </p>
            <div className="settings-card">
              <form onSubmit={handleSmtpSave} className="smtp-form">
                <div className="form-row">
                  <div className="form-field">
                    <label>SMTP Host</label>
                    <input type="text" value={smtpForm.host} onChange={e => setSmtpForm(f => ({ ...f, host: e.target.value }))} placeholder="smtp.example.com" required />
                  </div>
                  <div className="form-field form-field-sm">
                    <label>Port</label>
                    <input type="number" value={smtpForm.port} onChange={e => setSmtpForm(f => ({ ...f, port: e.target.value }))} placeholder="587" required />
                  </div>
                  <div className="form-field form-field-sm">
                    <label>TLS/SSL</label>
                    <label className="checkbox-label">
                      <input type="checkbox" checked={smtpForm.secure} onChange={e => setSmtpForm(f => ({ ...f, secure: e.target.checked }))} />
                      <span>Secure (port 465)</span>
                    </label>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-field">
                    <label>Username</label>
                    <input type="text" value={smtpForm.user} onChange={e => setSmtpForm(f => ({ ...f, user: e.target.value }))} placeholder="user@example.com" required />
                  </div>
                  <div className="form-field">
                    <label>Password</label>
                    <input type="password" value={smtpForm.password} onChange={e => setSmtpForm(f => ({ ...f, password: e.target.value }))} placeholder={smtp.configured ? '(unchanged)' : 'SMTP password'} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-field">
                    <label>From Address</label>
                    <input type="email" value={smtpForm.from} onChange={e => setSmtpForm(f => ({ ...f, from: e.target.value }))} placeholder="FossFLOW <noreply@example.com>" required />
                  </div>
                </div>
                {smtpMsg && <div className={smtpMsg.startsWith('Test failed') || smtpMsg.startsWith('Failed') ? 'admin-error' : 'admin-success'}>{smtpMsg}</div>}
                <div className="form-actions">
                  <button type="submit" className="admin-btn-primary" disabled={smtpLoading}>
                    {smtpLoading ? 'Saving...' : 'Save SMTP Settings'}
                  </button>
                  {smtp.configured && (
                    <button type="button" className="admin-btn-secondary" onClick={handleSmtpTest} disabled={smtpLoading}>
                      Send Test Email
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}

        {/* INVITES TAB */}
        {tab === 'invites' && (
          <div className="admin-section">
            <h2>User Invitations</h2>
            <div className="settings-card">
              <h3>Send Invitation</h3>
              {signupMode === 'open' && (
                <div className="admin-warning">Signup mode is currently Open — invitations are not required but can still be sent.</div>
              )}
              <form onSubmit={handleSendInvite} className="invite-form">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="recipient@example.com"
                  required
                />
                <button type="submit" className="admin-btn-primary" disabled={inviteLoading}>
                  {inviteLoading ? 'Sending...' : 'Send Invite'}
                </button>
              </form>
              {inviteMsg && (
                <div className="admin-success" style={{ marginTop: 12, wordBreak: 'break-all' }}>{inviteMsg}</div>
              )}
            </div>

            <div className="admin-section-header" style={{ marginTop: 24 }}>
              <h3>Invitation History</h3>
              <button className="admin-btn-secondary" onClick={loadInvites}>Refresh</button>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Created By</th>
                    <th>Sent</th>
                    <th>Expires</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invites.length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No invitations yet</td></tr>
                  )}
                  {invites.map(inv => (
                    <tr key={inv.id}>
                      <td>{inv.email}</td>
                      <td>
                        <span className={`status-badge ${inv.used ? 'active' : isExpired(inv.expires_at) ? 'inactive' : 'pending'}`}>
                          {inv.used ? 'Used' : isExpired(inv.expires_at) ? 'Expired' : 'Pending'}
                        </span>
                      </td>
                      <td>{inv.created_by_name || '—'}</td>
                      <td>{formatDate(inv.created_at)}</td>
                      <td>{formatDate(inv.expires_at)}</td>
                      <td>
                        {!inv.used && (
                          <button className="admin-btn-xs btn-danger" onClick={() => handleDeleteInvite(inv.id)}>
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
