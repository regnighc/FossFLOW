import { useState, useRef } from 'react';
import './ViewTabBar.css';

export interface ViewTab {
  id: string;
  name: string;
}

interface ViewTabBarProps {
  views: ViewTab[];
  currentViewId: string | null;
  onSwitch: (viewId: string) => void;
  onAdd: () => void;
  onRename: (viewId: string, newName: string) => void;
  onDelete: (viewId: string) => void;
  readonly?: boolean;
}

export function ViewTabBar({ views, currentViewId, onSwitch, onAdd, onRename, onDelete, readonly }: ViewTabBarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = (view: ViewTab, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(view.id);
    setEditValue(view.name);
    setTimeout(() => { inputRef.current?.select(); }, 30);
  };

  const commitEdit = () => {
    if (editingId && editValue.trim()) {
      onRename(editingId, editValue.trim());
    }
    setEditingId(null);
  };

  const handleTabClick = (viewId: string) => {
    if (editingId) return;
    onSwitch(viewId);
  };

  if (views.length === 0) return null;

  return (
    <div className="view-tab-bar">
      <div className="view-tabs-scroll">
        {views.map(view => {
          const isActive = view.id === currentViewId;
          const isEditing = editingId === view.id;
          return (
            <div
              key={view.id}
              className={`view-tab ${isActive ? 'active' : ''}`}
              onClick={() => handleTabClick(view.id)}
              onDoubleClick={e => !readonly && startEdit(view, e)}
              title={readonly ? view.name : 'Click to switch · Double-click to rename'}
            >
              {isEditing ? (
                <input
                  ref={inputRef}
                  className="view-tab-input"
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={e => {
                    if (e.key === 'Enter') commitEdit();
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  onClick={e => e.stopPropagation()}
                  maxLength={60}
                />
              ) : (
                <span className="view-tab-name">{view.name}</span>
              )}
              {!readonly && views.length > 1 && (
                <button
                  className="view-tab-close"
                  onClick={e => { e.stopPropagation(); onDelete(view.id); }}
                  title="Delete view"
                  tabIndex={-1}
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
      </div>

      {!readonly && (
        <button className="view-tab-add" onClick={onAdd} title="Add new view">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span>Add view</span>
        </button>
      )}
    </div>
  );
}
