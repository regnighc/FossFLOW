import React, { useState, useRef } from 'react';
import {
  Box,
  IconButton as MUIIconButton,
  FormControlLabel,
  Switch,
  Typography,
  Paper,
  Tooltip,
  ToggleButtonGroup,
  ToggleButton,
  Button,
  Slider
} from '@mui/material';
import {
  KeyboardArrowUp as UpIcon,
  KeyboardArrowDown as DownIcon,
  VerticalAlignTop as ToFrontIcon,
  VerticalAlignBottom as ToBackIcon
} from '@mui/icons-material';
import { useRectangle } from 'src/hooks/useRectangle';
import { ColorSelector } from 'src/components/ColorSelector/ColorSelector';
import { CustomColorInput } from 'src/components/ColorSelector/CustomColorInput';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { useScene } from 'src/hooks/useScene';
import { Close as CloseIcon } from '@mui/icons-material';
import { ControlsContainer } from '../components/ControlsContainer';
import { Section } from '../components/Section';
import { DeleteButton } from '../components/DeleteButton';

interface Props {
  id: string;
}

export const RectangleControls = ({ id }: Props) => {
  const uiStateActions = useUiStateStore((state) => state.actions);
  const rectangle = useRectangle(id);
  const { updateRectangle, deleteRectangle, reorderRectangles, rectangles } = useScene();
  const [useCustomColor, setUseCustomColor] = useState(!!rectangle?.customColor);

  // Drag state for layer reordering
  const dragIndex = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  if (!rectangle) return null;

  // Rectangles in render order: Rectangles.tsx reverses the array, so index 0 = top layer
  const layerList = [...rectangles].reverse();
  const currentIndex = layerList.findIndex(r => r.id === id);

  const reorder = (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;
    const ids = layerList.map(r => r.id);
    const [moved] = ids.splice(fromIdx, 1);
    ids.splice(toIdx, 0, moved);
    // Convert back: reorderRectangles expects the non-reversed order
    reorderRectangles([...ids].reverse());
  };

  const moveUp = () => reorder(currentIndex, Math.max(0, currentIndex - 1));
  const moveDown = () => reorder(currentIndex, Math.min(layerList.length - 1, currentIndex + 1));
  const toFront = () => reorder(currentIndex, 0);
  const toBack = () => reorder(currentIndex, layerList.length - 1);

  return (
    <ControlsContainer>
      <Box sx={{ position: 'relative' }}>
        <MUIIconButton
          aria-label="Close"
          onClick={() => uiStateActions.setItemControls(null)}
          sx={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }}
          size="small"
        >
          <CloseIcon />
        </MUIIconButton>

        <Section title="Color">
          <FormControlLabel
            control={
              <Switch
                checked={useCustomColor}
                onChange={(e) => {
                  setUseCustomColor(e.target.checked);
                  if (!e.target.checked) updateRectangle(rectangle.id, { customColor: '' });
                }}
              />
            }
            label="Use Custom Color"
            sx={{ mb: 2 }}
          />
          {useCustomColor ? (
            <CustomColorInput
              value={rectangle.customColor || '#000000'}
              onChange={(color) => updateRectangle(rectangle.id, { customColor: color })}
            />
          ) : (
            <ColorSelector
              onChange={(color) => updateRectangle(rectangle.id, { color, customColor: '' })}
              activeColor={rectangle.color}
            />
          )}
        </Section>

        <Section title="Corner Style">
          <ToggleButtonGroup
            value={rectangle.cornerStyle ?? 'ROUNDED'}
            exclusive
            size="small"
            onChange={(_, val) => { if (val) updateRectangle(rectangle.id, { cornerStyle: val }); }}
          >
            <ToggleButton value="ROUNDED">Rounded</ToggleButton>
            <ToggleButton value="SQUARE">Square</ToggleButton>
          </ToggleButtonGroup>
        </Section>

        <Section title="Border Style">
          <ToggleButtonGroup
            value={rectangle.borderStyle ?? 'SOLID'}
            exclusive
            size="small"
            sx={{ mb: rectangle.borderStyle === 'DASHED' ? 1.5 : 0 }}
            onChange={(_, val) => { if (val) updateRectangle(rectangle.id, { borderStyle: val }); }}
          >
            <ToggleButton value="SOLID">Solid</ToggleButton>
            <ToggleButton value="DASHED">Dashed</ToggleButton>
          </ToggleButtonGroup>
          {rectangle.borderStyle === 'DASHED' && (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Border Thickness
              </Typography>
              <Slider
                marks
                step={1}
                min={1}
                max={8}
                value={rectangle.borderWidth ?? 2}
                valueLabelDisplay="auto"
                onChange={(_, val) => updateRectangle(rectangle.id, { borderWidth: val as number })}
                sx={{ mb: 1.5 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Border Color (auto = darker shade)
              </Typography>
              <CustomColorInput
                value={rectangle.borderColor || '#000000'}
                onChange={(color) => updateRectangle(rectangle.id, { borderColor: color })}
              />
              {rectangle.borderColor && (
                <Button
                  size="small"
                  variant="text"
                  sx={{ mt: 0.5, fontSize: '0.7rem', p: '2px 6px' }}
                  onClick={() => updateRectangle(rectangle.id, { borderColor: '' })}
                >
                  Reset to auto
                </Button>
              )}
            </Box>
          )}
        </Section>

        <Section title="Layer Order">
          <Box sx={{ display: 'flex', gap: 0.5, mb: 1.5 }}>
            <Tooltip title="Bring to front">
              <span>
                <MUIIconButton size="small" onClick={toFront} disabled={currentIndex === 0}>
                  <ToFrontIcon fontSize="small" />
                </MUIIconButton>
              </span>
            </Tooltip>
            <Tooltip title="Move up">
              <span>
                <MUIIconButton size="small" onClick={moveUp} disabled={currentIndex === 0}>
                  <UpIcon fontSize="small" />
                </MUIIconButton>
              </span>
            </Tooltip>
            <Tooltip title="Move down">
              <span>
                <MUIIconButton size="small" onClick={moveDown} disabled={currentIndex === layerList.length - 1}>
                  <DownIcon fontSize="small" />
                </MUIIconButton>
              </span>
            </Tooltip>
            <Tooltip title="Send to back">
              <span>
                <MUIIconButton size="small" onClick={toBack} disabled={currentIndex === layerList.length - 1}>
                  <ToBackIcon fontSize="small" />
                </MUIIconButton>
              </span>
            </Tooltip>
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
            Drag to reorder (top = front)
          </Typography>
          <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
            {layerList.map((rect, idx) => (
              <Paper
                key={rect.id}
                variant="outlined"
                draggable
                onDragStart={() => { dragIndex.current = idx; }}
                onDragOver={(e) => { e.preventDefault(); setDragOver(idx); }}
                onDrop={() => {
                  if (dragIndex.current !== null) reorder(dragIndex.current, idx);
                  dragIndex.current = null;
                  setDragOver(null);
                }}
                onDragEnd={() => { dragIndex.current = null; setDragOver(null); }}
                sx={{
                  p: 0.75,
                  mb: 0.5,
                  cursor: 'grab',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  bgcolor: rect.id === id ? 'action.selected' : dragOver === idx ? 'action.hover' : 'background.paper',
                  borderColor: rect.id === id ? 'primary.main' : undefined,
                  userSelect: 'none'
                }}
              >
                <Box
                  sx={{
                    width: 14,
                    height: 14,
                    borderRadius: 0.5,
                    flexShrink: 0,
                    bgcolor: rect.customColor || 'grey.400',
                    border: '1px solid',
                    borderColor: 'divider'
                  }}
                />
                <Typography variant="caption" sx={{ flex: 1 }}>
                  Layer {layerList.length - idx} {rect.id === id ? '(this)' : ''}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  #{idx + 1}
                </Typography>
              </Paper>
            ))}
          </Box>
        </Section>

        <Section>
          <Box>
            <DeleteButton
              onClick={() => {
                uiStateActions.setItemControls(null);
                deleteRectangle(rectangle.id);
              }}
            />
          </Box>
        </Section>
      </Box>
    </ControlsContainer>
  );
};
