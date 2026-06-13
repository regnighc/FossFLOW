import React, { useState } from 'react';
import { ProjectionOrientationEnum } from 'src/types';
import {
  Box,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Slider,
  IconButton as MUIIconButton,
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  TextRotationNone as TextRotationNoneIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { CustomColorInput } from 'src/components/ColorSelector/CustomColorInput';
import { useTextBox } from 'src/hooks/useTextBox';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { getIsoProjectionCss } from 'src/utils';
import { useScene } from 'src/hooks/useScene';
import { ControlsContainer } from '../components/ControlsContainer';
import { Section } from '../components/Section';
import { DeleteButton } from '../components/DeleteButton';

interface Props {
  id: string;
}

export const TextBoxControls = ({ id }: Props) => {
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });
  const textBox = useTextBox(id);
  const { updateTextBox, deleteTextBox } = useScene();
  const [useCustomColor, setUseCustomColor] = useState(!!textBox?.color);

  // If textBox doesn't exist, return null
  if (!textBox) {
    return null;
  }

  return (
    <ControlsContainer>
      <Box sx={{ position: 'relative', paddingTop: '24px' }}>
        {/* Close button */}
        <MUIIconButton
          aria-label="Close"
          onClick={() => {
            return uiStateActions.setItemControls(null);
          }}
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 2
          }}
          size="small"
        >
          <CloseIcon />
        </MUIIconButton>
        <Section title="Enter text">
          <TextField
            value={textBox.content}
            onChange={(e) => {
              updateTextBox(textBox.id, { content: e.target.value as string });
            }}
          />
        </Section>
        <Section title="Text size">
          <Slider
            marks
            step={0.3}
            min={0.3}
            max={0.9}
            value={textBox.fontSize}
            onChange={(e, newSize) => {
              updateTextBox(textBox.id, { fontSize: newSize as number });
            }}
          />
        </Section>
        <Section title="Alignment">
          <ToggleButtonGroup
            value={textBox.orientation}
            exclusive
            onChange={(e, orientation) => {
              if (textBox.orientation === orientation || orientation === null)
                return;

              updateTextBox(textBox.id, { orientation });
            }}
          >
            <ToggleButton value={ProjectionOrientationEnum.X}>
              <TextRotationNoneIcon sx={{ transform: getIsoProjectionCss() }} />
            </ToggleButton>
            <ToggleButton value={ProjectionOrientationEnum.Y}>
              <TextRotationNoneIcon
                sx={{
                  transform: `scale(-1, 1) ${getIsoProjectionCss()} scale(-1, 1)`
                }}
              />
            </ToggleButton>
          </ToggleButtonGroup>
        </Section>
        <Section title="Font">
          <FormControl fullWidth size="small">
            <InputLabel>Font Family</InputLabel>
            <Select
              label="Font Family"
              value={textBox.fontFamily || ''}
              onChange={(e) => updateTextBox(textBox.id, { fontFamily: e.target.value || undefined })}
            >
              <MenuItem value=""><em>Default</em></MenuItem>
              <MenuItem value="Inter" sx={{ fontFamily: 'Inter, sans-serif' }}>Inter</MenuItem>
              <MenuItem value="Roboto" sx={{ fontFamily: 'Roboto, sans-serif' }}>Roboto</MenuItem>
              <MenuItem value="Arial" sx={{ fontFamily: 'Arial, sans-serif' }}>Arial</MenuItem>
              <MenuItem value="Georgia" sx={{ fontFamily: 'Georgia, serif' }}>Georgia</MenuItem>
              <MenuItem value="'Courier New', monospace" sx={{ fontFamily: "'Courier New', monospace" }}>Courier New</MenuItem>
              <MenuItem value="'Times New Roman', serif" sx={{ fontFamily: "'Times New Roman', serif" }}>Times New Roman</MenuItem>
              <MenuItem value="Verdana, sans-serif" sx={{ fontFamily: 'Verdana, sans-serif' }}>Verdana</MenuItem>
              <MenuItem value="'Comic Sans MS', cursive" sx={{ fontFamily: "'Comic Sans MS', cursive" }}>Comic Sans MS</MenuItem>
              <MenuItem value="Impact, sans-serif" sx={{ fontFamily: 'Impact, sans-serif' }}>Impact</MenuItem>
              <MenuItem value="'Trebuchet MS', sans-serif" sx={{ fontFamily: "'Trebuchet MS', sans-serif" }}>Trebuchet MS</MenuItem>
            </Select>
          </FormControl>
        </Section>
        <Section title="Text color">
          <FormControlLabel
            control={
              <Switch
                checked={useCustomColor}
                onChange={(e) => {
                  setUseCustomColor(e.target.checked);
                  if (!e.target.checked) updateTextBox(textBox.id, { color: '' });
                }}
              />
            }
            label="Custom color"
            sx={{ mb: useCustomColor ? 1 : 0 }}
          />
          {useCustomColor && (
            <CustomColorInput
              value={textBox.color || '#000000'}
              onChange={(color) => updateTextBox(textBox.id, { color })}
            />
          )}
        </Section>
        <Section>
          <Box>
            <DeleteButton
              onClick={() => {
                uiStateActions.setItemControls(null);
                deleteTextBox(textBox.id);
              }}
            />
          </Box>
        </Section>
      </Box>
    </ControlsContainer>
  );
};
