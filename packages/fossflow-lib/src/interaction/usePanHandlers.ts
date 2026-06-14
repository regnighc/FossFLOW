import { useCallback, useEffect, useRef } from 'react';
import { useUiStateStore, useUiStateStoreApi } from 'src/stores/uiStateStore';
import { CoordsUtils, getItemAtTile } from 'src/utils';
import { useScene } from 'src/hooks/useScene';
import { SlimMouseEvent } from 'src/types';

export const usePanHandlers = () => {
  const modeType = useUiStateStore((state) => state.mode.type);
  const actions = useUiStateStore((state) => state.actions);
  const panSettings = useUiStateStore((state) => state.panSettings);
  const rendererEl = useUiStateStore((state) => state.rendererEl);
  const mouseTile = useUiStateStore((state) => state.mouse.position.tile);
  const uiStateApi = useUiStateStoreApi();
  const scene = useScene();
  const isPanningRef = useRef(false);
  const prevModeRef = useRef(uiStateApi.getState().mode);

  // Track the last mode we were in BEFORE entering PAN (from any source).
  // Updated whenever the mode changes to something other than PAN.
  const lastNonPanModeRef = useRef(uiStateApi.getState().mode);
  const prevModeTypeRef = useRef(modeType);
  useEffect(() => {
    if (modeType !== 'PAN' && prevModeTypeRef.current !== modeType) {
      lastNonPanModeRef.current = uiStateApi.getState().mode;
    }
    prevModeTypeRef.current = modeType;
  }, [modeType, uiStateApi]);

  const startPan = useCallback(() => {
    if (!isPanningRef.current) {
      isPanningRef.current = true;
      if (modeType !== 'PAN') {
        // Triggered by gesture (middle-click, ctrl+click, etc.) while not in PAN mode
        prevModeRef.current = uiStateApi.getState().mode;
        actions.setMode({
          type: 'PAN',
          showCursor: false,
          temp: true
        });
      } else {
        // Already in PAN mode (from toolbar or hotkey) — restore to last non-PAN mode on mouseup
        prevModeRef.current = lastNonPanModeRef.current;
      }
    }
  }, [modeType, actions, uiStateApi]);

  const endPan = useCallback(() => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      actions.setMode(prevModeRef.current);
    }
  }, [actions]);

  const isEmptyArea = useCallback((e: SlimMouseEvent): boolean => {
    if (!rendererEl || e.target !== rendererEl) return false;

    const itemAtTile = getItemAtTile({
      tile: mouseTile,
      scene
    });

    return !itemAtTile;
  }, [rendererEl, mouseTile, scene]);

  const handleMouseDown = useCallback((e: SlimMouseEvent): boolean => {
    const inPanMode = modeType === 'PAN';

    if (
      (e.button === 1 && panSettings.middleClickPan) ||
      (e.button === 2 && panSettings.rightClickPan) ||
      // Left-click while in explicit PAN mode → treat as gesture, restore after mouseup
      (e.button === 0 && inPanMode) ||
      (e.button === 0) && (
        (panSettings.ctrlClickPan && e.ctrlKey) ||
        (panSettings.altClickPan && e.altKey) ||
        (panSettings.emptyAreaClickPan && isEmptyArea(e))
      )) {
      e.preventDefault();
      startPan();
      return true;
    }
    return false;
  }, [panSettings, modeType, startPan, isEmptyArea]);

  const handleMouseUp = useCallback((_e: SlimMouseEvent): boolean => {
    if (isPanningRef.current) {
      endPan();
      return true;
    }
    return false;
  }, [endPan]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true' ||
        target.closest('.ql-editor')
      ) {
        return;
      }

      const currentState = uiStateApi.getState();
      const currentPanSettings = currentState.panSettings;
      const speed = currentPanSettings.keyboardPanSpeed;
      let dx = 0;
      let dy = 0;

      if (currentPanSettings.arrowKeysPan) {
        if (e.key === 'ArrowUp') {
          dy = speed;
          e.preventDefault();
        } else if (e.key === 'ArrowDown') {
          dy = -speed;
          e.preventDefault();
        } else if (e.key === 'ArrowLeft') {
          dx = speed;
          e.preventDefault();
        } else if (e.key === 'ArrowRight') {
          dx = -speed;
          e.preventDefault();
        }
      }

      if (currentPanSettings.wasdPan) {
        const key = e.key.toLowerCase();
        if (key === 'w') {
          dy = speed;
          e.preventDefault();
        } else if (key === 's') {
          dy = -speed;
          e.preventDefault();
        } else if (key === 'a') {
          dx = speed;
          e.preventDefault();
        } else if (key === 'd') {
          dx = -speed;
          e.preventDefault();
        }
      }

      if (currentPanSettings.ijklPan) {
        const key = e.key.toLowerCase();
        if (key === 'i') {
          dy = speed;
          e.preventDefault();
        } else if (key === 'k') {
          dy = -speed;
          e.preventDefault();
        } else if (key === 'j') {
          dx = speed;
          e.preventDefault();
        } else if (key === 'l') {
          dx = -speed;
          e.preventDefault();
        }
      }

      if (dx !== 0 || dy !== 0) {
        const currentScroll = currentState.scroll;
        const newPosition = CoordsUtils.add(
          currentScroll.position,
          { x: dx, y: dy }
        );
        currentState.actions.setScroll({
          position: newPosition,
          offset: currentScroll.offset
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [uiStateApi]);

  return {
    handleMouseDown,
    handleMouseUp,
    isPanning: isPanningRef.current
  };
};
