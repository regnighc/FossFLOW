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
        title="File"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
          <path d="M2 2h6l2 2h2v8H2V2z" fill="none" stroke="currentColor" strokeWidth="1.2"/>
          <path d="M5 7h4M5 9h2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
        </svg>
        File
        {hasUnsavedChanges && <span className="unsaved-dot" />}
        <svg className="chevron" width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round"/>
        </svg>
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
