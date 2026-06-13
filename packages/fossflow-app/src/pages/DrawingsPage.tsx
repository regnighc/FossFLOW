import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService, DiagramMeta } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';
import './DrawingsPage.css';

const PLACEHOLDER_SVG = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200">
  <rect width="320" height="200" fill="#1e293b"/>
  <g opacity="0.15" stroke="#94a3b8" stroke-width="0.5">
    <line x1="160" y1="20" x2="40" y2="90"/><line x1="160" y1="20" x2="280" y2="90"/>
    <line x1="40" y1="90" x2="160" y2="160"/><line x1="280" y1="90" x2="160" y2="160"/>
    <line x1="40" y1="90" x2="280" y2="90"/>
  </g>
  <text x="160" y="108" text-anchor="middle" fill="#475569" font-size="13" font-family="sans-serif">No preview</text>
</svg>
`)}`;

export function DrawingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [diagrams, setDiagrams] = useState<DiagramMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quota, setQuota] = useState<{ used: number; total: number } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [list, q] = await Promise.all([authService.listDiagrams(), authService.getQuota()]);
      setDiagrams(list);
      setQuota(q);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load drawings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleOpen = (id: string) => {
    navigate(`/?diagram=${id}`);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      await authService.deleteDiagram(id);
      setDiagrams(prev => prev.filter(d => d.id !== id));
      setQuota(prev => prev ? { ...prev, used: prev.used - 1 } : null);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to delete');
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return iso; }
  };

  return (
    <div className="drawings-page">
      <div className="drawings-header">
        <div className="drawings-header-left">
          <button className="drawings-back-btn" onClick={() => navigate('/')}>
            ← Back to Editor
          </button>
          <div>
            <h1>My Drawings</h1>
            {quota && (
              <div className="drawings-quota">
                <div className="quota-bar">
                  <div
                    className="quota-fill"
                    style={{ width: `${Math.min(100, (quota.used / quota.total) * 100)}%`, background: quota.used >= quota.total ? '#ef4444' : 'var(--btn-primary-bg)' }}
                  />
                </div>
                <span className={quota.used >= quota.total ? 'quota-full' : ''}>
                  {quota.used} / {quota.total} drawings used
                  {quota.used >= quota.total && ' — delete some to save more'}
                </span>
              </div>
            )}
          </div>
        </div>
        <button className="drawings-new-btn" onClick={() => navigate('/')}>
          + New Drawing
        </button>
      </div>

      <div className="drawings-content">
        {loading && (
          <div className="drawings-empty">
            <div className="drawings-spinner" />
            <p>Loading your drawings...</p>
          </div>
        )}

        {!loading && error && (
          <div className="drawings-empty">
            <p style={{ color: '#ef4444' }}>{error}</p>
            <button className="drawings-btn-secondary" onClick={load}>Retry</button>
          </div>
        )}

        {!loading && !error && diagrams.length === 0 && (
          <div className="drawings-empty">
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none" opacity="0.3">
              <rect x="10" y="20" width="60" height="45" rx="4" stroke="var(--text-secondary)" strokeWidth="2"/>
              <path d="M40 15L60 25V45L40 55L20 45V25L40 15Z" stroke="var(--text-secondary)" strokeWidth="2" fill="none"/>
            </svg>
            <h3>No drawings yet</h3>
            <p>Create your first diagram in the editor and save it to your account.</p>
            <button className="drawings-btn-primary" onClick={() => navigate('/')}>
              Open Editor
            </button>
          </div>
        )}

        {!loading && !error && diagrams.length > 0 && (
          <div className="drawings-grid">
            {diagrams.map(diagram => (
              <div key={diagram.id} className="drawing-card">
                <div className="drawing-card-thumbnail" onClick={() => handleOpen(diagram.id)}>
                  <img
                    src={diagram.thumbnail || PLACEHOLDER_SVG}
                    alt={diagram.name}
                    onError={e => { (e.target as HTMLImageElement).src = PLACEHOLDER_SVG; }}
                  />
                  <div className="drawing-card-overlay">
                    <span>Open</span>
                  </div>
                </div>
                <div className="drawing-card-body">
                  <h3 className="drawing-card-name" title={diagram.name}>{diagram.name}</h3>
                  <p className="drawing-card-date">
                    Updated {formatDate(diagram.updated_at)}
                  </p>
                  <div className="drawing-card-actions">
                    <button
                      className="drawings-btn-primary"
                      onClick={() => handleOpen(diagram.id)}
                    >
                      Open
                    </button>
                    <button
                      className="drawings-btn-danger"
                      onClick={() => handleDelete(diagram.id, diagram.name)}
                      disabled={deleting === diagram.id}
                    >
                      {deleting === diagram.id ? '...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
