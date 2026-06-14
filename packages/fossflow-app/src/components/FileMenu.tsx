import { useState, useRef, useEffect } from 'react';
import './FileMenu.css';

export interface FileMenuAction {
  label: string;
  icon: string;
  onClick: () => void;
  disabled?: boolean;
  divider?: boolean;
}

interface FileMenuProps {
  actions: FileMenuAction[];
  hasUnsavedChanges?: boolean;
}

export function FileMenu({ actions, hasUnsavedChanges }: FileMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="file-menu" ref={ref}>
      <button
        className={`file-menu-trigger ${open ? 'open' : ''} ${hasUnsavedChanges ? 'unsaved' : ''}`}
        onClick={() => setOpen(o => !o)}
        title="Menu"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <rect x="2" y="3.25" width="12" height="1.5" rx="0.75"/>
          <rect x="2" y="7.25" width="12" height="1.5" rx="0.75"/>
          <rect x="2" y="11.25" width="12" height="1.5" rx="0.75"/>
        </svg>
        {hasUnsavedChanges && <span className="unsaved-dot" />}
      </button>

      {open && (
        <div className="file-menu-dropdown">
          {actions.map((action, i) => (
            <div key={i}>
              {action.divider && <div className="file-menu-divider" />}
              <button
                className={`file-menu-item ${action.disabled ? 'disabled' : ''}`}
                onClick={() => { if (!action.disabled) { action.onClick(); setOpen(false); } }}
                disabled={action.disabled}
              >
                <span className="file-menu-icon">{action.icon}</span>
                <span className="file-menu-label">{action.label}</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
