import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { Box } from '@mui/material';
import { theme } from 'src/styles/theme';
import { IsoflowProps } from 'src/types';
import { setWindowCursor, modelFromModelStore, generateId } from 'src/utils';
import { useModelStore, ModelProvider } from 'src/stores/modelStore';
import { SceneProvider } from 'src/stores/sceneStore';
import { LocaleProvider } from 'src/stores/localeStore';
import { GlobalStyles } from 'src/styles/GlobalStyles';
import { Renderer } from 'src/components/Renderer/Renderer';
import { UiOverlay } from 'src/components/UiOverlay/UiOverlay';
import { UiStateProvider, useUiStateStore } from 'src/stores/uiStateStore';
import { INITIAL_DATA, MAIN_MENU_OPTIONS, TEXTBOX_DEFAULTS } from 'src/config';
import { useInitialDataManager } from 'src/hooks/useInitialDataManager';
import { useHistory } from 'src/hooks/useHistory';
import { useDiagramUtils } from 'src/hooks/useDiagramUtils';
import { useScene } from 'src/hooks/useScene';
import { DialogTypeEnum } from 'src/types/ui';
import enUS from 'src/i18n/en-US';

const App = ({
  initialData,
  mainMenuOptions = MAIN_MENU_OPTIONS,
  width = '100%',
  height = '100%',
  onModelUpdated,
  enableDebugTools = false,
  editorMode = 'EDITABLE',
  renderer,
  locale = enUS,
  iconPackManager,
  controlRef,
  onUiStateChange,
  hideMainMenu = false,
  hideToolMenu = false,
  hideZoomControls = false,
  hideViewTitle = false,
}: IsoflowProps) => {
  const uiStateActions = useUiStateStore((state) => state.actions);
  const mode = useUiStateStore((state) => state.mode);
  const zoom = useUiStateStore((state) => state.zoom);
  const mousePosition = useUiStateStore((state) => state.mouse.position.tile);
  const initialDataManager = useInitialDataManager();
  const model = useModelStore((state) => modelFromModelStore(state));
  const { undo, redo, canUndo, canRedo } = useHistory();
  const { fitToView } = useDiagramUtils();
  const { createTextBox } = useScene();

  // Keep latest refs so the controlRef closures always invoke current functions
  const fitToViewRef = useRef(fitToView);
  useEffect(() => { fitToViewRef.current = fitToView; }, [fitToView]);
  const mousePositionRef = useRef(mousePosition);
  useEffect(() => { mousePositionRef.current = mousePosition; }, [mousePosition]);
  const undoRef = useRef(undo);
  useEffect(() => { undoRef.current = undo; }, [undo]);
  const redoRef = useRef(redo);
  useEffect(() => { redoRef.current = redo; }, [redo]);
  const createTextBoxRef = useRef(createTextBox);
  useEffect(() => { createTextBoxRef.current = createTextBox; }, [createTextBox]);

  // Populate external control ref
  useEffect(() => {
    if (!controlRef) return;
    controlRef.current = {
      setMode: (modeType: string) => {
        switch (modeType) {
          case 'CURSOR':
            uiStateActions.setMode({ type: 'CURSOR', showCursor: true, mousedownItem: null });
            break;
          case 'PAN':
            uiStateActions.setMode({ type: 'PAN', showCursor: false });
            uiStateActions.setItemControls(null);
            break;
          case 'LASSO':
            uiStateActions.setMode({ type: 'LASSO', showCursor: true, selection: null, isDragging: false });
            break;
          case 'FREEHAND_LASSO':
            uiStateActions.setMode({ type: 'FREEHAND_LASSO', showCursor: true, path: [], selection: null, isDragging: false });
            break;
          case 'PLACE_ICON':
            uiStateActions.setItemControls({ type: 'ADD_ITEM' });
            uiStateActions.setMode({ type: 'PLACE_ICON', showCursor: true, id: null });
            break;
          case 'RECTANGLE.DRAW':
            uiStateActions.setMode({ type: 'RECTANGLE.DRAW', showCursor: true, id: null });
            break;
          case 'CONNECTOR':
            uiStateActions.setMode({ type: 'CONNECTOR', id: null, showCursor: true });
            break;
          case 'TEXTBOX': {
            const textBoxId = generateId();
            createTextBoxRef.current({ ...TEXTBOX_DEFAULTS, id: textBoxId, tile: mousePositionRef.current });
            uiStateActions.setMode({ type: 'TEXTBOX', showCursor: false, id: textBoxId });
            break;
          }
          default:
            break;
        }
      },
      undo: () => undoRef.current(),
      redo: () => redoRef.current(),
      incrementZoom: uiStateActions.incrementZoom,
      decrementZoom: uiStateActions.decrementZoom,
      fitToView: () => fitToViewRef.current(),
      openHelp: () => uiStateActions.setDialog(DialogTypeEnum.HELP),
    };
  }, [controlRef, uiStateActions]);

  // Fire UI state change to external consumer
  useEffect(() => {
    onUiStateChange?.({ modeType: mode.type, zoom, canUndo, canRedo });
  }, [mode.type, zoom, canUndo, canRedo, onUiStateChange]);

  const { load } = initialDataManager;

  useEffect(() => {
    load({ ...INITIAL_DATA, ...initialData });
  }, [initialData, load]);

  useEffect(() => {
    uiStateActions.setEditorMode(editorMode);
    uiStateActions.setMainMenuOptions(mainMenuOptions);
  }, [editorMode, uiStateActions, mainMenuOptions]);

  useEffect(() => {
    return () => {
      setWindowCursor('default');
    };
  }, []);

  useEffect(() => {
    if (!initialDataManager.isReady || !onModelUpdated) return;
    onModelUpdated(model);
  }, [model, initialDataManager.isReady, onModelUpdated]);

  useEffect(() => {
    uiStateActions.setEnableDebugTools(enableDebugTools);
  }, [enableDebugTools, uiStateActions]);

  useEffect(() => {
    if (renderer?.expandLabels !== undefined) {
      uiStateActions.setExpandLabels(renderer.expandLabels);
    }
  }, [renderer?.expandLabels, uiStateActions]);

  useLayoutEffect(() => {
    uiStateActions.setIconPackManager(iconPackManager || null);
  }, [iconPackManager, uiStateActions]);

  if (!initialDataManager.isReady) return null;

  return (
    <>
      <GlobalStyles />
      <Box
        sx={{
          width,
          height,
          position: 'relative',
          overflow: 'hidden',
          transform: 'translateZ(0)'
        }}
      >
        <Renderer {...renderer} />
        <UiOverlay
          hideMainMenu={hideMainMenu}
          hideToolMenu={hideToolMenu}
          hideZoomControls={hideZoomControls}
          hideViewTitle={hideViewTitle}
        />
      </Box>
    </>
  );
};

export const Isoflow = (props: IsoflowProps) => {
  return (
    <ThemeProvider theme={theme}>
      <LocaleProvider locale={props.locale || enUS}>
        <ModelProvider>
          <SceneProvider>
            <UiStateProvider>
              <App {...props} />
            </UiStateProvider>
          </SceneProvider>
        </ModelProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
};

const useIsoflow = () => {
  const rendererEl = useUiStateStore((state) => state.rendererEl);
  const ModelActions = useModelStore((state) => state.actions);
  const uiStateActions = useUiStateStore((state) => state.actions);

  return {
    Model: ModelActions,
    uiState: uiStateActions,
    rendererEl
  };
};

export { useIsoflow };
export * from 'src/standaloneExports';
export default Isoflow;
