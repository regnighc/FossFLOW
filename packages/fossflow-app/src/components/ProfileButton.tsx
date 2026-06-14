import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './ProfileButton.css';

async function emailHash(email: string): Promise<string> {
  const normalized = email.trim().toLowerCase();
  const data = new TextEncoder().encode(normalized);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function initialsColor(name: string): string {
  const palette = ['#5b6ef5', '#e8614f', '#22c55e', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#0891b2'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return palette[Math.abs(h) % palette.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

interface ProfileButtonProps {
  username: string;
  email: string;
  isAdmin: boolean;
  onChangePassword: () => void;
  onSignOut: () => void;
}

export function ProfileButton({ username, email, isAdmin, onChangePassword, onSignOut }: ProfileButtonProps) {
  const [open, setOpen] = useState(false);
  const [gravatarSrc, setGravatarSrc] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!email) return;
    setImgFailed(false);
    emailHash(email).then(hash => {
      setGravatarSrc(`https://www.gravatar.com/avatar/${hash}?d=404&s=80`);
    });
  }, [email]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const showImg = gravatarSrc && !imgFailed;
  const color = initialsColor(username);
  const abbr = initials(username);

  return (
    <div className="profile-btn-wrapper" ref={ref}>
      <button className="profile-avatar-btn" onClick={() => setOpen(o => !o)} title={username}>
        {showImg ? (
          <img
            src={gravatarSrc!}
            alt={username}
            className="profile-avatar-img"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <span className="profile-avatar-initials" style={{ background: color }}>{abbr}</span>
        )}
      </button>

      {open && (
        <div className="profile-dropdown">
          <div className="profile-dropdown-header">
            <span className="profile-dropdown-name">{username}</span>
            <span className="profile-dropdown-email">{email}</span>
          </div>
          <div className="profile-dropdown-divider" />
          <button
            className="profile-dropdown-item"
            onClick={() => { onChangePassword(); setOpen(false); }}
          >
            Change Password
          </button>
          {isAdmin && (
            <Link to="/admin" className="profile-dropdown-item" onClick={() => setOpen(false)}>
              Admin Panel
            </Link>
          )}
          <div className="profile-dropdown-divider" />
          <button
            className="profile-dropdown-item profile-dropdown-signout"
            onClick={() => { onSignOut(); setOpen(false); }}
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
