import { useState, useEffect, useRef, useCallback } from 'react';
import { Isoflow } from 'fossflow';
import { flattenCollections } from '@isoflow/isopacks/dist/utils';
import isoflowIsopack from '@isoflow/isopacks/dist/isoflow';
import { useTranslation } from 'react-i18next';
import { DiagramData } from './diagramUtils';
import { useIconPackManager } from './services/iconPackManager';
import { allLocales } from 'fossflow';
import { BrowserRouter, Route, Routes, useParams, useNavigate, useSearchParams, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { authService } from './services/authService';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DrawingsPage } from './pages/DrawingsPage';
import { AdminPage } from './pages/AdminPage';
import { FileMenu, FileMenuAction } from './components/FileMenu';
import { ViewTabBar } from './components/ViewTabBar';
import ChangeLanguage from './components/ChangeLanguage';
import './App.css';

const coreIcons = flattenCollections([isoflowIsopack]);

// Module-level singleton that survives React route unmounts so navigating
// to DrawingsPage / AdminPage and back restores the in-progress diagram.
const _editorPersist: {
  model: DiagramData | null;
  name: string;
  id: string | null;
  viewId: string | null;
  hasUnsaved: boolean;
} = { model: null, name: 'Untitled Diagram', id: null, viewId: null, hasUnsaved: false };

const defaultColors = [
  // Vibrant
  { id: 'blue', value: '#0066cc' },
  { id: 'green', value: '#00aa00' },
  { id: 'red', value: '#cc0000' },
  { id: 'orange', value: '#ff9900' },
  { id: 'purple', value: '#9900cc' },
  { id: 'black', value: '#000000' },
  { id: 'gray', value: '#666666' },
  { id: 'teal', value: '#008080' },
  { id: 'indigo', value: '#4b0082' },
  { id: 'brown', value: '#8b4513' },
  { id: 'navy', value: '#001f5b' },
  { id: 'magenta', value: '#cc0066' },
  { id: 'cyan', value: '#007acc' },
  { id: 'olive', value: '#556b2f' },
  // Pastels
  { id: 'pastel-blue', value: '#aec6e8' },
  { id: 'pastel-green', value: '#b8e0b8' },
  { id: 'pastel-pink', value: '#f4b8c8' },
  { id: 'pastel-yellow', value: '#fef08a' },
  { id: 'pastel-purple', value: '#d4b8f0' },
  { id: 'pastel-orange', value: '#ffd8a8' },
  { id: 'pastel-teal', value: '#99ddd8' }
];

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

function getInitialTheme(): 'light' | 'dark' {
  const saved = localStorage.getItem('fossflow-theme');
  if (saved === 'dark' || saved === 'light') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: 'light' | 'dark') {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('fossflow-theme', theme);
}

// ---------------------------------------------------------------------------
// Thumbnail capture
// ---------------------------------------------------------------------------

async function captureThumbnail(): Promise<string | null> {
  try {
    const canvas = document.querySelector('.fossflow-container canvas') as HTMLCanvasElement | null;
    if (!canvas) return null;
    return new Promise(resolve => {
      const thumb = document.createElement('canvas');
      thumb.width = 320;
      thumb.height = 200;
      const ctx = thumb.getContext('2d');
      if (!ctx) { resolve(null); return; }
      ctx.drawImage(canvas, 0, 0, 320, 200);
      thumb.toBlob(blob => {
        if (!blob) { resolve(null); return; }
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      }, 'image/jpeg', 0.6);
    });
  } catch {
    return null;
  }
}

async function exportCanvasImage(name: string) {
  const canvas = document.querySelector('.fossflow-container canvas') as HTMLCanvasElement | null;
  if (!canvas) { alert('Could not capture the diagram canvas.'); return; }
  return new Promise<void>(resolve => {
    canvas.toBlob(blob => {
      if (!blob) { alert('Export failed.'); resolve(); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name || 'diagram'}-${new Date().toISOString().split('T')[0]}.png`;
      a.click();
      URL.revokeObjectURL(url);
      resolve();
    }, 'image/png');
  });
}

// ---------------------------------------------------------------------------
// Protected route
// ---------------------------------------------------------------------------

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="app-loading">Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  if (loading) return <div className="app-loading">Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

// ---------------------------------------------------------------------------
// App shell with routing
// ---------------------------------------------------------------------------

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme);

  useEffect(() => { applyTheme(theme); }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  const publicUrl = process.env.PUBLIC_URL || '';
  const basename = publicUrl ? (publicUrl.endsWith('/') ? publicUrl.slice(0, -1) : publicUrl) : '/';

  return (
    <BrowserRouter basename={basename}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/display/:readonlyDiagramId" element={<EditorPage theme={theme} toggleTheme={toggleTheme} />} />
          <Route path="/drawings" element={<RequireAuth><DrawingsPage /></RequireAuth>} />
          <Route path="/admin" element={<RequireAdmin><AdminPage /></RequireAdmin>} />
          <Route path="/" element={<RequireAuth><EditorPage theme={theme} toggleTheme={toggleTheme} /></RequireAuth>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

// ---------------------------------------------------------------------------
// Editor page
// ---------------------------------------------------------------------------

interface EditorPageProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

function EditorPage({ theme, toggleTheme }: EditorPageProps) {
  const iconPackManager = useIconPackManager(coreIcons);
  const { readonlyDiagramId } = useParams<{ readonlyDiagramId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, logout, isAdmin, refreshUser } = useAuth();
  const { t, i18n } = useTranslation('app');
  const currentLocale = allLocales[i18n.language as keyof typeof allLocales] || allLocales['en-US'];

  const isReadonlyUrl = !!readonlyDiagramId;

  const [diagramName, setDiagramName] = useState(() => _editorPersist.name);
  const [editingName, setEditingName] = useState(false);
  const [nameInputValue, setNameInputValue] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [currentDiagramId, setCurrentDiagramId] = useState<string | null>(() => _editorPersist.id);
  const [currentViewId, setCurrentViewId] = useState<string | null>(() => {
    const persisted = _editorPersist.viewId;
    const model = _editorPersist.model;
    if (!persisted || !model) return persisted;
    // Validate the persisted view ID still exists in the persisted model
    const viewExists = (model.views || []).some((v: any) => v.id === persisted);
    return viewExists ? persisted : ((model.views || [])[0]?.id ?? null);
  });
  const [fossflowKey, setFossflowKey] = useState(0);
  const [currentModel, setCurrentModel] = useState<DiagramData | null>(() => _editorPersist.model);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(() => _editorPersist.hasUnsaved);

  // Stable refs so the unmount cleanup always has the latest values
  const diagramNameRef = useRef(diagramName);
  const currentDiagramIdRef = useRef(currentDiagramId);
  const currentViewIdRef = useRef(currentViewId);
  const hasUnsavedRef = useRef(hasUnsavedChanges);
  useEffect(() => { diagramNameRef.current = diagramName; }, [diagramName]);
  useEffect(() => { currentDiagramIdRef.current = currentDiagramId; }, [currentDiagramId]);
  useEffect(() => { currentViewIdRef.current = currentViewId; }, [currentViewId]);
  useEffect(() => { hasUnsavedRef.current = hasUnsavedChanges; }, [hasUnsavedChanges]);

  // On unmount, save editor state so navigating back restores the diagram
  useEffect(() => {
    return () => {
      _editorPersist.model = latestModelRef.current;
      _editorPersist.name = diagramNameRef.current;
      _editorPersist.id = currentDiagramIdRef.current;
      _editorPersist.viewId = currentViewIdRef.current;
      _editorPersist.hasUnsaved = hasUnsavedRef.current;
    };
  }, []);
  const [quota, setQuota] = useState<{ used: number; total: number } | null>(null);

  // Save-to-account dialog
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveDialogName, setSaveDialogName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // User settings modal
  const [showUserSettings, setShowUserSettings] = useState(false);
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  const [diagramData, setDiagramData] = useState<DiagramData>(() =>
    _editorPersist.model ?? {
      title: 'Untitled Diagram',
      icons: coreIcons,
      colors: defaultColors,
      items: [],
      views: [],
      fitToScreen: true
    }
  );

  // Refs for debounced model updates — avoids React re-renders on every pan frame.
  // Initialised from persisted state so navigation-restore works immediately.
  const latestModelRef = useRef<DiagramData | null>(_editorPersist.model);
  const modelFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load quota info
  const refreshQuota = useCallback(async () => {
    if (!user) return;
    try { setQuota(await authService.getQuota()); } catch {}
  }, [user]);

  useEffect(() => { refreshQuota(); }, [refreshQuota]);

  // Load diagram from ?diagram=id query param (from DrawingsPage)
  useEffect(() => {
    const diagramId = searchParams.get('diagram');
    if (!diagramId || !user) return;

    (async () => {
      try {
        const data = await authService.getDiagram(diagramId) as any;
        await loadDiagramData(diagramId, data.name || 'Loaded Diagram', data);
        // Remove param from URL without re-render
        setSearchParams({}, { replace: true });
      } catch (e: unknown) {
        alert(e instanceof Error ? e.message : 'Failed to load diagram');
      }
    })();
  }, [searchParams, user]);

  // Load readonly diagram
  useEffect(() => {
    if (!isReadonlyUrl || !readonlyDiagramId) return;
    (async () => {
      try {
        const res = await fetch(`/api/public/diagrams/${readonlyDiagramId}`);
        if (!res.ok) throw new Error('Diagram not found');
        const data = await res.json();
        await loadDiagramData(readonlyDiagramId, data.name || data.title || 'Diagram', data, true);
      } catch (e: unknown) {
        alert('Failed to load readonly diagram');
        window.location.href = '/';
      }
    })();
  }, [readonlyDiagramId]);

  // Update icons when packs change
  useEffect(() => {
    setDiagramData(prev => ({
      ...prev,
      icons: [
        ...iconPackManager.loadedIcons,
        ...(prev.icons || []).filter(i => i.collection === 'imported')
      ]
    }));
  }, [iconPackManager.loadedIcons]);

  async function loadDiagramData(id: string, name: string, data: any, skipIconMerge = false) {
    await iconPackManager.loadPacksForDiagram(data.items || []);
    const importedIcons = (data.icons || []).filter((i: any) => i.collection === 'imported');
    const mergedIcons = skipIconMerge ? data.icons : [...iconPackManager.loadedIcons, ...importedIcons];

    const merged: DiagramData = {
      ...data,
      title: name,
      icons: mergedIcons,
      colors: data.colors?.length ? data.colors : defaultColors,
      fitToScreen: data.fitToScreen !== false
    };

    const firstViewId = merged.views?.[0]?.id ?? null;
    setDiagramName(name);
    setCurrentDiagramId(id);
    setDiagramData(merged);
    setCurrentModel(merged);
    setCurrentViewId(firstViewId);
    setHasUnsavedChanges(false);
    setFossflowKey(k => k + 1);
  }

  const handleModelUpdated = useCallback((model: any) => {
    if (isReadonlyUrl) return;
    const updated: DiagramData = {
      title: model.title || diagramName || 'Untitled',
      icons: model.icons || [],
      colors: model.colors || defaultColors,
      items: model.items || [],
      views: model.views || [],
      fitToScreen: true
    };

    // Always keep the ref current — used by save so we never lose data
    latestModelRef.current = updated;
    // Lightweight state update: just marks the dirty indicator
    setHasUnsavedChanges(true);
    // Capture view ID once (cheap, only fires when prev is null)
    if (model.views?.length > 0) {
      setCurrentViewId(prev => prev ?? model.views[0].id);
    }

    // Debounce the expensive React state syncs so panning doesn't cause
    // a full re-render on every animation frame
    if (modelFlushTimerRef.current) clearTimeout(modelFlushTimerRef.current);
    modelFlushTimerRef.current = setTimeout(() => {
      const m = latestModelRef.current;
      if (m) {
        setCurrentModel(m);
        setDiagramData(m);
      }
    }, 300);
  }, [isReadonlyUrl, diagramName]);

  // Save to account
  const handleSaveToAccount = () => {
    setSaveDialogName(diagramName || 'Untitled Diagram');
    setSaveError('');
    setShowSaveDialog(true);
  };

  const handleSaveConfirm = async () => {
    if (!saveDialogName.trim()) { setSaveError('Enter a name'); return; }
    setSaving(true); setSaveError('');
    try {
      const modelToSave = latestModelRef.current || currentModel || diagramData;
      const importedIcons = (modelToSave.icons || []).filter(i => i.collection === 'imported');
      const saveData = {
        title: saveDialogName,
        icons: importedIcons,
        colors: modelToSave.colors || [],
        items: modelToSave.items || [],
        views: modelToSave.views || [],
        fitToScreen: true
      };
      const thumbnail = await captureThumbnail();
      const { id } = await authService.saveDiagram(saveDialogName, saveData, thumbnail, currentDiagramId || undefined);
      setCurrentDiagramId(id);
      setDiagramName(saveDialogName);
      setHasUnsavedChanges(false);
      setShowSaveDialog(false);
      await refreshQuota();
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  // Export to JSON
  const handleSaveToJson = () => {
    const modelToExport = latestModelRef.current || currentModel || diagramData;
    const exportData = {
      title: diagramName || 'diagram',
      icons: modelToExport.icons || [],
      colors: modelToExport.colors || [],
      items: modelToExport.items || [],
      views: modelToExport.views || [],
      fitToScreen: true
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${diagramName || 'diagram'}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Load JSON file
  const handleLoadJson = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const name = data.title || file.name.replace('.json', '') || 'Imported Diagram';
        await loadDiagramData('', name, data);
        setCurrentDiagramId(null);
      } catch {
        alert('Failed to load file. Make sure it is a valid FossFLOW JSON file.');
      }
    };
    input.click();
  };

  // Export image
  const handleExportImage = async () => {
    await exportCanvasImage(diagramName);
  };

  // Diagram name editing
  const startEditingName = () => {
    if (isReadonlyUrl) return;
    setNameInputValue(diagramName);
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.select(), 0);
  };

  const commitNameEdit = () => {
    const trimmed = nameInputValue.trim();
    if (trimmed) {
      setDiagramName(trimmed);
      setHasUnsavedChanges(true);
    }
    setEditingName(false);
  };

  // User password change
  const handleChangePassword = async () => {
    setPwError(''); setPwSuccess('');
    if (!pwCurrent || !pwNew || !pwConfirm) { setPwError('All fields required'); return; }
    if (pwNew !== pwConfirm) { setPwError('New passwords do not match'); return; }
    if (pwNew.length < 8) { setPwError('Password must be at least 8 characters'); return; }
    setPwSaving(true);
    try {
      await authService.changePassword(pwCurrent, pwNew);
      setPwSuccess('Password changed successfully');
      setPwCurrent(''); setPwNew(''); setPwConfirm('');
    } catch (e: unknown) {
      setPwError(e instanceof Error ? e.message : 'Failed to change password');
    } finally {
      setPwSaving(false);
    }
  };

  // New diagram
  const handleNewDiagram = () => {
    if (hasUnsavedChanges && !window.confirm('You have unsaved changes. Start a new diagram anyway?')) return;
    setDiagramName('Untitled Diagram');
    setCurrentDiagramId(null);
    setCurrentViewId(null); // will be captured from first onModelUpdated
    setDiagramData({ title: 'Untitled Diagram', icons: iconPackManager.loadedIcons, colors: defaultColors, items: [], views: [], fitToScreen: true });
    setCurrentModel(null);
    setHasUnsavedChanges(false);
    setFossflowKey(k => k + 1);
  };

  // View management — always use latestModelRef so debounced state is never stale
  const getActiveViews = () => {
    const src = latestModelRef.current || currentModel || diagramData;
    return (src.views || []) as Array<{ id: string; name: string; [k: string]: any }>;
  };

  const switchView = (viewId: string) => {
    if (viewId === currentViewId) return;
    // Flush pending debounce so diagramData is up-to-date before switching
    if (modelFlushTimerRef.current) {
      clearTimeout(modelFlushTimerRef.current);
      modelFlushTimerRef.current = null;
      const m = latestModelRef.current;
      if (m) { setCurrentModel(m); setDiagramData(m); }
    }
    setCurrentViewId(viewId);
  };

  const addView = () => {
    const views = getActiveViews();
    const newView = {
      id: crypto.randomUUID(),
      name: `View ${views.length + 1}`,
      items: [],
      connectors: [],
      rectangles: [],
      textBoxes: []
    };
    // Flush any pending debounced model update so latestModelRef is canonical
    if (modelFlushTimerRef.current) {
      clearTimeout(modelFlushTimerRef.current);
      modelFlushTimerRef.current = null;
    }
    const base = latestModelRef.current || currentModel || diagramData;
    const updatedData = { ...base, views: [...views, newView] } as DiagramData;
    latestModelRef.current = updatedData;
    setDiagramData(updatedData);
    setCurrentModel(updatedData);
    setCurrentViewId(newView.id);
    setHasUnsavedChanges(true);
    // Force Isoflow remount so it reliably initialises the new empty view
    setFossflowKey(k => k + 1);
  };

  const renameView = (viewId: string, newName: string) => {
    const views = getActiveViews().map(v => v.id === viewId ? { ...v, name: newName } : v);
    const base = latestModelRef.current || currentModel || diagramData;
    const updatedData = { ...base, views } as DiagramData;
    latestModelRef.current = updatedData;
    setDiagramData(updatedData);
    setCurrentModel(updatedData);
    setHasUnsavedChanges(true);
  };

  const deleteView = (viewId: string) => {
    const views = getActiveViews();
    if (views.length <= 1) return;
    if (!window.confirm(`Delete "${views.find(v => v.id === viewId)?.name ?? 'this view'}"? Items placed only in this view will remain in the diagram.`)) return;
    const remaining = views.filter(v => v.id !== viewId);
    const base = latestModelRef.current || currentModel || diagramData;
    const updatedData = { ...base, views: remaining } as DiagramData;
    latestModelRef.current = updatedData;
    setDiagramData(updatedData);
    setCurrentModel(updatedData);
    const newViewId = viewId === currentViewId ? remaining[0].id : currentViewId;
    setCurrentViewId(newViewId);
    setHasUnsavedChanges(true);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (user) handleSaveToAccount();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        navigate('/drawings');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [user, hasUnsavedChanges, currentModel, diagramName]);

  // Warn before unload
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsavedChanges]);

  const fileActions: FileMenuAction[] = [
    {
      label: 'Save to Account',
      icon: '☁️',
      onClick: handleSaveToAccount,
      disabled: isReadonlyUrl
    },
    {
      label: 'Save to JSON',
      icon: '📄',
      onClick: handleSaveToJson,
      divider: false
    },
    {
      label: 'Load Drawing',
      icon: '📂',
      onClick: () => navigate('/drawings'),
      disabled: isReadonlyUrl
    },
    {
      label: 'Import JSON',
      icon: '📥',
      onClick: handleLoadJson,
      disabled: isReadonlyUrl,
      divider: false
    },
    {
      label: 'Export Image (PNG)',
      icon: '🖼️',
      onClick: handleExportImage,
      divider: true
    }
  ];

  return (
    <div className="App">
      <div className="toolbar">
        {!isReadonlyUrl && (
          <>
            <button className="toolbar-btn" onClick={handleNewDiagram}>New</button>
            <FileMenu actions={fileActions} hasUnsavedChanges={hasUnsavedChanges} />
            {user && (
              <Link to="/drawings" className="toolbar-btn toolbar-btn-drawings">
                My Drawings
                {quota && <span className="quota-chip">{quota.used}/{quota.total}</span>}
              </Link>
            )}
          </>
        )}

        {isReadonlyUrl && (
          <div className="readonly-badge">Read-only</div>
        )}

        <div className="toolbar-spacer" />

        {/* Editable diagram name */}
        {editingName ? (
          <input
            ref={nameInputRef}
            className="diagram-name-input"
            value={nameInputValue}
            onChange={e => setNameInputValue(e.target.value)}
            onBlur={commitNameEdit}
            onKeyDown={e => { if (e.key === 'Enter') commitNameEdit(); if (e.key === 'Escape') setEditingName(false); }}
            maxLength={100}
          />
        ) : (
          <span
            className={`current-diagram-name ${!isReadonlyUrl ? 'editable' : ''}`}
            onClick={startEditingName}
            title={!isReadonlyUrl ? 'Click to rename' : diagramName}
          >
            {diagramName}
            {hasUnsavedChanges && !isReadonlyUrl && <span className="unsaved-indicator"> •</span>}
          </span>
        )}

        <ChangeLanguage />

        <button
          className="theme-toggle"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>

        {user && !isReadonlyUrl && (
          <div className="user-menu">
            <button
              className="user-name-btn"
              onClick={() => { setPwError(''); setPwSuccess(''); setPwCurrent(''); setPwNew(''); setPwConfirm(''); setShowUserSettings(true); }}
              title="Account settings"
            >
              {user.username}
            </button>
            {isAdmin && (
              <Link to="/admin" className="toolbar-btn toolbar-btn-admin">
                Admin
              </Link>
            )}
            <button className="toolbar-btn" onClick={() => { logout(); navigate('/login'); }}>
              Sign Out
            </button>
          </div>
        )}
      </div>

      <div className="fossflow-container">
        <Isoflow
          key={`${fossflowKey}-${i18n.language}`}
          initialData={currentViewId ? { ...diagramData, view: currentViewId } : diagramData}
          onModelUpdated={handleModelUpdated}
          editorMode={isReadonlyUrl ? 'EXPLORABLE_READONLY' : 'EDITABLE'}
          locale={currentLocale}
          renderer={{ backgroundColor: theme === 'dark' ? '#1e293b' : '#f6faff' }}
          iconPackManager={{
            lazyLoadingEnabled: iconPackManager.lazyLoadingEnabled,
            onToggleLazyLoading: iconPackManager.toggleLazyLoading,
            packInfo: Object.values(iconPackManager.packInfo),
            enabledPacks: iconPackManager.enabledPacks,
            onTogglePack: (packName: string, enabled: boolean) => {
              iconPackManager.togglePack(packName as any, enabled);
            }
          }}
        />
      </div>

      <ViewTabBar
        views={getActiveViews().map(v => ({ id: v.id, name: v.name }))}
        currentViewId={currentViewId}
        onSwitch={switchView}
        onAdd={addView}
        onRename={renameView}
        onDelete={deleteView}
        readonly={isReadonlyUrl}
      />

      {/* Save to Account Dialog */}
      {showSaveDialog && (
        <div className="dialog-overlay" onClick={e => e.target === e.currentTarget && setShowSaveDialog(false)}>
          <div className="dialog">
            <h2>Save to Account</h2>
            {quota && quota.used >= quota.total && !currentDiagramId && (
              <div className="dialog-warning">
                You've used all {quota.total} drawing slots. Delete drawings to free up space.
              </div>
            )}
            {saveError && <div className="dialog-error">{saveError}</div>}
            <label className="dialog-label">Diagram name</label>
            <input
              type="text"
              value={saveDialogName}
              onChange={e => setSaveDialogName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSaveConfirm()}
              autoFocus
              placeholder="Enter a name..."
            />
            {quota && !currentDiagramId && (
              <p className="dialog-hint">{quota.used} / {quota.total} slots used</p>
            )}
            {currentDiagramId && (
              <p className="dialog-hint">This will overwrite the existing saved version.</p>
            )}
            <div className="dialog-buttons">
              <button onClick={handleSaveConfirm} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => setShowSaveDialog(false)} className="btn-cancel">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* User Settings Modal */}
      {showUserSettings && (
        <div className="dialog-overlay" onClick={e => e.target === e.currentTarget && setShowUserSettings(false)}>
          <div className="dialog">
            <h2>Account Settings</h2>
            <p className="dialog-hint" style={{ marginBottom: 20 }}>
              Signed in as <strong>{user?.username}</strong> ({user?.email})
              {quota && ` · ${quota.used}/${quota.total} drawings used`}
            </p>

            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 12px' }}>
              Change Password
            </h3>

            {pwError && <div className="dialog-error">{pwError}</div>}
            {pwSuccess && <div style={{ background:'#dcfce7', border:'1px solid #86efac', color:'#166534', padding:'10px 14px', borderRadius:8, fontSize:13, marginBottom:16 }}>{pwSuccess}</div>}

            <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:20 }}>
              <div>
                <label className="dialog-label">Current Password</label>
                <input type="password" value={pwCurrent} onChange={e => setPwCurrent(e.target.value)} placeholder="Enter current password" />
              </div>
              <div>
                <label className="dialog-label">New Password</label>
                <input type="password" value={pwNew} onChange={e => setPwNew(e.target.value)} placeholder="At least 8 characters" />
              </div>
              <div>
                <label className="dialog-label">Confirm New Password</label>
                <input type="password" value={pwConfirm} onChange={e => setPwConfirm(e.target.value)} placeholder="Repeat new password"
                  onKeyDown={e => e.key === 'Enter' && handleChangePassword()} />
              </div>
            </div>

            <div className="dialog-buttons">
              <button onClick={handleChangePassword} disabled={pwSaving}>
                {pwSaving ? 'Changing...' : 'Change Password'}
              </button>
              <button onClick={() => setShowUserSettings(false)} className="btn-cancel">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
