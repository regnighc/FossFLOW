import { useState, useRef } from 'react';
import { IsoflowControls, IsoflowUiState } from 'fossflow';
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
  controls?: IsoflowControls | null;
  uiState?: IsoflowUiState | null;
}

const MAX_VISIBLE_TABS = 4;

export function ViewTabBar({ views, currentViewId, onSwitch, onAdd, onRename, onDelete, readonly, controls, uiState }: ViewTabBarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [tabOffset, setTabOffset] = useState(0);
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

  // Tab window logic
  const totalTabs = views.length;
  const clampedOffset = Math.min(tabOffset, Math.max(0, totalTabs - MAX_VISIBLE_TABS));
  const visibleViews = views.slice(clampedOffset, clampedOffset + MAX_VISIBLE_TABS);
  const canScrollLeft = clampedOffset > 0;
  const canScrollRight = clampedOffset + MAX_VISIBLE_TABS < totalTabs;

  const modeType = uiState?.modeType ?? 'CURSOR';
  const zoom = uiState?.zoom ?? 1;
  const canUndo = uiState?.canUndo ?? false;
  const canRedo = uiState?.canRedo ?? false;
  const hasControls = !!controls && !readonly;

  return (
    <div className="view-tab-bar">
      {/* Tab area with scroll arrows */}
      <div className="view-tabs-section">
        {canScrollLeft && (
          <button className="view-tab-scroll-btn" onClick={() => setTabOffset(o => Math.max(0, o - 1))} title="Scroll left">‹</button>
        )}

        <div className="view-tabs-list">
          {visibleViews.map(view => {
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

        {canScrollRight && (
          <button className="view-tab-scroll-btn" onClick={() => setTabOffset(o => Math.min(o + 1, totalTabs - MAX_VISIBLE_TABS))} title="Scroll right">›</button>
        )}

        {!readonly && (
          <button className="view-tab-add-inline" onClick={onAdd} title="Add new view">+</button>
        )}
      </div>

      {/* Tools and zoom controls */}
      {hasControls && (
        <div className="bottom-toolbar-right">
          <div className="bottom-tool-group">
            <button
              className="bottom-tool-btn"
              onClick={() => controls.undo()}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
            >⟲</button>
            <button
              className="bottom-tool-btn"
              onClick={() => controls.redo()}
              disabled={!canRedo}
              title="Redo (Ctrl+Y)"
            >⟳</button>
          </div>

          <div className="bottom-tool-divider" />

          <div className="bottom-tool-group">
            <button
              className={`bottom-tool-btn ${(modeType === 'CURSOR' || modeType === 'DRAG_ITEMS') ? 'active' : ''}`}
              onClick={() => controls.setMode('CURSOR')}
              title="Select (S)"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2L7 13L9 8L14 6L2 2Z" fill="currentColor"/></svg>
            </button>
            <button
              className={`bottom-tool-btn ${modeType === 'LASSO' ? 'active' : ''}`}
              onClick={() => controls.setMode('LASSO')}
              title="Lasso select"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2C4.2 2 2 4.2 2 7s2.2 5 5 5 5-2.2 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M7 12h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
            <button
              className={`bottom-tool-btn ${modeType === 'FREEHAND_LASSO' ? 'active' : ''}`}
              onClick={() => controls.setMode('FREEHAND_LASSO')}
              title="Freehand lasso"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 10C3 5 5 2 7 2s4 3 4 6-2 4-3 3-1-3 0-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/></svg>
            </button>
            <button
              className={`bottom-tool-btn ${modeType === 'PAN' ? 'active' : ''}`}
              onClick={() => controls.setMode('PAN')}
              title="Pan (P)"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12M7 1L5 3M7 1L9 3M7 13L5 11M7 13L9 11M1 7L3 5M1 7L3 9M13 7L11 5M13 7L11 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
            </button>
            <button
              className={`bottom-tool-btn ${modeType === 'PLACE_ICON' ? 'active' : ''}`}
              onClick={() => controls.setMode('PLACE_ICON')}
              title="Add item (A)"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2" y="2" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M7 5v4M5 7h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
            <button
              className={`bottom-tool-btn ${modeType === 'RECTANGLE.DRAW' ? 'active' : ''}`}
              onClick={() => controls.setMode('RECTANGLE.DRAW')}
              title="Rectangle (R)"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2" y="3" width="10" height="8" rx="1" stroke="currentColor" strokeWidth="1.3"/></svg>
            </button>
            <button
              className={`bottom-tool-btn ${modeType === 'CONNECTOR' ? 'active' : ''}`}
              onClick={() => controls.setMode('CONNECTOR')}
              title="Connector (C)"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 12L12 2M12 2H8M12 2v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <button
              className={`bottom-tool-btn ${modeType === 'TEXTBOX' ? 'active' : ''}`}
              onClick={() => controls.setMode('TEXTBOX')}
              title="Text (T)"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 4h10M7 4v7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
          </div>

          <div className="bottom-tool-divider" />

          <div className="bottom-tool-group">
            <button
              className="bottom-tool-btn"
              onClick={() => controls.decrementZoom()}
              title="Zoom out"
            >−</button>
            <span className="bottom-zoom-pct">{Math.ceil(zoom * 100)}%</span>
            <button
              className="bottom-tool-btn"
              onClick={() => controls.incrementZoom()}
              title="Zoom in"
            >+</button>
            <button
              className="bottom-tool-btn"
              onClick={() => controls.fitToView()}
              title="Fit to screen"
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M1 4V1h3M9 1h3v3M1 9v3h3M9 12h3V9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <button
              className="bottom-tool-btn"
              onClick={() => controls.openHelp()}
              title="Help (F1)"
            >?</button>
          </div>
        </div>
      )}
    </div>
  );
}
