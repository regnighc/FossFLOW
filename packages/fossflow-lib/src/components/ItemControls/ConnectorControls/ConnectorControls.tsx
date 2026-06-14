import React, { useState, useMemo } from 'react';
import {
  Connector,
  ConnectorLabel,
  connectorStyleOptions
} from 'src/types';
import {
  Box,
  Slider,
  Select,
  MenuItem,
  TextField,
  IconButton as MUIIconButton,
  FormControlLabel,
  Switch,
  Typography,
  Button,
  Paper
} from '@mui/material';
import { useConnector } from 'src/hooks/useConnector';
import { ColorSelector } from 'src/components/ColorSelector/ColorSelector';
import { ColorPicker } from 'src/components/ColorSelector/ColorPicker';
import { CustomColorInput } from 'src/components/ColorSelector/CustomColorInput';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { useScene } from 'src/hooks/useScene';
import {
  Close as CloseIcon,
  Add as AddIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { getConnectorLabels, generateId } from 'src/utils';
import { ControlsContainer } from '../components/ControlsContainer';
import { Section } from '../components/Section';
import { DeleteButton } from '../components/DeleteButton';

interface Props {
  id: string;
  embedded?: boolean;
}

export const ConnectorControls = ({ id, embedded }: Props) => {
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });
  const connector = useConnector(id);
  const { updateConnector, deleteConnector } = useScene();
  const [useCustomColor, setUseCustomColor] = useState(
    !!connector?.customColor
  );

  // Get all labels (including migrated legacy labels)
  const labels = useMemo(() => {
    if (!connector) return [];
    return getConnectorLabels(connector);
  }, [connector]);

  // If connector doesn't exist, return null
  if (!connector) {
    return null;
  }

  const handleAddLabel = () => {
    if (labels.length >= 256) return;

    const newLabel: ConnectorLabel = {
      id: generateId(),
      text: '',
      position: 50,
      height: 0,
      line: '1'
    };

    // Migrate legacy labels if needed and add new label
    const updatedLabels = [...labels, newLabel];
    updateConnector(connector.id, {
      labels: updatedLabels,
      // Clear legacy fields on first new label addition
      description: undefined,
      startLabel: undefined,
      endLabel: undefined,
      startLabelHeight: undefined,
      centerLabelHeight: undefined,
      endLabelHeight: undefined
    });
  };

  const handleUpdateLabel = (
    labelId: string,
    updates: Partial<ConnectorLabel>
  ) => {
    const updatedLabels = labels.map((label) => {
      return label.id === labelId ? { ...label, ...updates } : label;
    });

    updateConnector(connector.id, {
      labels: updatedLabels,
      // Clear legacy fields
      description: undefined,
      startLabel: undefined,
      endLabel: undefined,
      startLabelHeight: undefined,
      centerLabelHeight: undefined,
      endLabelHeight: undefined
    });
  };

  const handleDeleteLabel = (labelId: string) => {
    const updatedLabels = labels.filter((label) => {
      return label.id !== labelId;
    });
    updateConnector(connector.id, {
      labels: updatedLabels,
      // Clear legacy fields
      description: undefined,
      startLabel: undefined,
      endLabel: undefined,
      startLabelHeight: undefined,
      centerLabelHeight: undefined,
      endLabelHeight: undefined
    });
  };

  const sections = (
    <>
      <Section title="Labels">
          <Box sx={{ mb: 2 }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 2
              }}
            >
              <Typography variant="body2" color="text.secondary">
                {labels.length} / 256 labels
              </Typography>
              <Button
                startIcon={<AddIcon />}
                onClick={handleAddLabel}
                disabled={labels.length >= 256}
                size="small"
                variant="outlined"
              >
                Add Label
              </Button>
            </Box>

            {labels.length === 0 && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ textAlign: 'center', py: 2 }}
              >
                No labels. Click &quot;Add Label&quot; to create one.
              </Typography>
            )}

            {labels.map((label, index) => {
              return (
                <Paper key={label.id} variant="outlined" sx={{ p: 2, mb: 2 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mb: 1
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      Label {index + 1}
                    </Typography>
                    <MUIIconButton
                      size="small"
                      onClick={() => {
                        return handleDeleteLabel(label.id);
                      }}
                      color="error"
                    >
                      <DeleteIcon fontSize="small" />
                    </MUIIconButton>
                  </Box>

                  <TextField
                    label="Text"
                    value={label.text}
                    onChange={(e) => {
                      return handleUpdateLabel(label.id, {
                        text: e.target.value
                      });
                    }}
                    fullWidth
                    sx={{ mb: 2 }}
                  />

                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <TextField
                      label="Position (%)"
                      type="number"
                      value={label.position}
                      onChange={(e) => {
                        const inputValue = e.target.value;

                        // Allow empty input
                        if (inputValue === '') {
                          handleUpdateLabel(label.id, { position: 0 });
                          return;
                        }

                        const value = parseInt(inputValue, 10);
                        if (!Number.isNaN(value)) {
                          handleUpdateLabel(label.id, {
                            position: Math.max(0, Math.min(100, value))
                          });
                        }
                      }}
                      onBlur={(e) => {
                        // On blur, ensure we have a valid value
                        if (e.target.value === '') {
                          handleUpdateLabel(label.id, { position: 0 });
                        }
                      }}
                      inputProps={{ min: 0, max: 100 }}
                      sx={{ flex: 1 }}
                    />

                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Height Offset
                    </Typography>
                    <Slider
                      marks
                      step={10}
                      min={-100}
                      max={100}
                      value={label.height || 0}
                      onChange={(e, value) => {
                        return handleUpdateLabel(label.id, {
                          height: value as number
                        });
                      }}
                    />
                  </Box>

                  <Box>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={label.showLine !== false}
                          onChange={(e) => {
                            return handleUpdateLabel(label.id, {
                              showLine: e.target.checked
                            });
                          }}
                        />
                      }
                      label="Show Dotted Line"
                    />
                  </Box>
                </Paper>
              );
            })}
          </Box>
        </Section>
        <Section title="Color">
          <FormControlLabel
            control={
              <Switch
                checked={useCustomColor}
                onChange={(e) => {
                  setUseCustomColor(e.target.checked);
                  if (!e.target.checked) {
                    updateConnector(connector.id, { customColor: '' });
                  }
                }}
              />
            }
            label="Use Custom Color"
            sx={{ mb: 2 }}
          />
          {useCustomColor ? (
            <CustomColorInput
              value={connector.customColor || '#000000'}
              onChange={(color) => {
                updateConnector(connector.id, { customColor: color });
              }}
            />
          ) : (
            <ColorSelector
              onChange={(color) => {
                return updateConnector(connector.id, {
                  color,
                  customColor: ''
                });
              }}
              activeColor={connector.color}
            />
          )}
        </Section>
        <Section title="Width">
          <Slider
            marks
            step={10}
            min={10}
            max={30}
            value={connector.width}
            onChange={(e, newWidth) => {
              updateConnector(connector.id, { width: newWidth as number });
            }}
          />
        </Section>
        <Section title="Line Style">
          <Select
            value={connector.style || 'SOLID'}
            onChange={(e) => {
              updateConnector(connector.id, {
                style: e.target.value as Connector['style']
              });
            }}
            fullWidth
            sx={{ mb: 2 }}
          >
            {Object.values(connectorStyleOptions).map((style) => {
              return (
                <MenuItem key={style} value={style}>
                  {style === 'FLOW' ? 'FLOW (animated)' : style}
                </MenuItem>
              );
            })}
          </Select>
        </Section>
        <Section title="Flow Animation">
          <FormControlLabel
            control={
              <Switch
                checked={connector.flowAnimate === true || connector.style === 'FLOW'}
                disabled={connector.style === 'FLOW'}
                onChange={(e) => {
                  updateConnector(connector.id, { flowAnimate: e.target.checked });
                }}
              />
            }
            label={connector.style === 'FLOW' ? 'Animated (always on for FLOW)' : 'Animate dash/dot flow'}
          />
          {(connector.flowAnimate === true || connector.style === 'FLOW') && (
            <Select
              value={connector.flowDirection || 'FORWARD'}
              onChange={(e) => {
                updateConnector(connector.id, {
                  flowDirection: e.target.value as 'FORWARD' | 'BACKWARD'
                });
              }}
              fullWidth
              size="small"
              sx={{ mt: 1 }}
            >
              <MenuItem value="FORWARD">→ Forward (toward arrow)</MenuItem>
              <MenuItem value="BACKWARD">← Backward (away from arrow)</MenuItem>
            </Select>
          )}
        </Section>
        <Section title="Arrows">
          <FormControlLabel
            control={
              <Switch
                checked={connector.showArrow !== false}
                onChange={(e) => updateConnector(connector.id, { showArrow: e.target.checked })}
              />
            }
            label="Show End Arrow"
          />
          <FormControlLabel
            control={
              <Switch
                checked={connector.showStartArrow === true}
                onChange={(e) => updateConnector(connector.id, { showStartArrow: e.target.checked })}
              />
            }
            label="Show Start Arrow (2-way)"
          />
        </Section>
        <Section title="Additional Arrows">
          <Box sx={{ mb: 1 }}>
            {(connector.arrows || []).map((arrow, idx) => (
              <Box
                key={arrow.id}
                sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}
              >
                <Typography variant="caption" sx={{ minWidth: 60 }}>
                  Arrow {idx + 1}
                </Typography>
                <Slider
                  size="small"
                  min={0}
                  max={100}
                  step={5}
                  value={arrow.position}
                  onChange={(_, val) => {
                    const updated = (connector.arrows || []).map(a =>
                      a.id === arrow.id ? { ...a, position: val as number } : a
                    );
                    updateConnector(connector.id, { arrows: updated });
                  }}
                  sx={{ flex: 1 }}
                />
                <TextField
                  type="number"
                  value={arrow.position}
                  onChange={(e) => {
                    const val = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                    const updated = (connector.arrows || []).map(a =>
                      a.id === arrow.id ? { ...a, position: val } : a
                    );
                    updateConnector(connector.id, { arrows: updated });
                  }}
                  inputProps={{ min: 0, max: 100, style: { width: 42 } }}
                  size="small"
                  sx={{ width: 64 }}
                />
                <MUIIconButton
                  size="small"
                  color="error"
                  onClick={() => {
                    const updated = (connector.arrows || []).filter(a => a.id !== arrow.id);
                    updateConnector(connector.id, { arrows: updated });
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </MUIIconButton>
              </Box>
            ))}
            <Button
              startIcon={<AddIcon />}
              size="small"
              variant="outlined"
              disabled={(connector.arrows || []).length >= 10}
              onClick={() => {
                const newArrow = { id: `arr-${Date.now()}`, position: 50 };
                updateConnector(connector.id, {
                  arrows: [...(connector.arrows || []), newArrow]
                });
              }}
            >
              Add Arrow
            </Button>
          </Box>
        </Section>
        <Section title="Arrow Shape">
          <Select
            value={connector.arrowShape || 'TRIANGLE'}
            onChange={(e) => {
              updateConnector(connector.id, { arrowShape: e.target.value as Connector['arrowShape'] });
            }}
            fullWidth
            size="small"
            sx={{ mb: 2 }}
          >
            <MenuItem value="TRIANGLE">▲ Triangle (filled)</MenuItem>
            <MenuItem value="OPEN">› Open Chevron</MenuItem>
            <MenuItem value="CIRCLE">● Circle</MenuItem>
            <MenuItem value="DIAMOND">◆ Diamond</MenuItem>
            <MenuItem value="BARB">⟩ Barb</MenuItem>
          </Select>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            Arrow Color
          </Typography>
          <CustomColorInput
            value={connector.arrowColor || '#000000'}
            onChange={(color) => {
              updateConnector(connector.id, { arrowColor: color });
            }}
          />
        </Section>
        <Section title="Traveling Circle">
          <FormControlLabel
            control={
              <Switch
                checked={connector.circleAnimate === true}
                onChange={(e) => updateConnector(connector.id, { circleAnimate: e.target.checked })}
              />
            }
            label="Animate traveling circle"
          />
          {connector.circleAnimate === true && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Size: {(connector.circleSize ?? 1).toFixed(1)}x
              </Typography>
              <Slider
                marks
                step={0.25}
                min={0.5}
                max={4}
                value={connector.circleSize ?? 1}
                onChange={(_, val) => updateConnector(connector.id, { circleSize: val as number })}
              />
              <Typography variant="caption" color="text.secondary">
                Speed: {(connector.circleSpeed ?? 2).toFixed(1)}s per cycle
              </Typography>
              <Slider
                marks
                step={0.5}
                min={0.5}
                max={10}
                value={connector.circleSpeed ?? 2}
                onChange={(_, val) => updateConnector(connector.id, { circleSpeed: val as number })}
              />
            </Box>
          )}
        </Section>
        <Section title="Line Outline">
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            The border/shadow drawn beneath the connector line
          </Typography>
          <Button
            variant={connector.outlineColor === 'transparent' ? 'contained' : 'outlined'}
            size="small"
            onClick={() => {
              updateConnector(connector.id, {
                outlineColor: connector.outlineColor === 'transparent' ? '' : 'transparent'
              });
            }}
            sx={{ mb: 2 }}
          >
            {connector.outlineColor === 'transparent' ? 'Outline Hidden' : 'Hide Outline'}
          </Button>
          {connector.outlineColor !== 'transparent' && (
            <CustomColorInput
              value={connector.outlineColor || '#ffffff'}
              onChange={(color) => {
                updateConnector(connector.id, { outlineColor: color });
              }}
            />
          )}
        </Section>
      <Section>
        <Box>
          <DeleteButton
            onClick={() => {
              uiStateActions.setItemControls(null);
              deleteConnector(connector.id);
            }}
          />
        </Box>
      </Section>
    </>
  );

  if (embedded) {
    return <Box sx={{ pb: 2 }}>{sections}</Box>;
  }

  return (
    <ControlsContainer>
      <Box
        sx={{ position: 'relative', paddingTop: '24px', paddingBottom: '24px' }}
      >
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
        {sections}
      </Box>
    </ControlsContainer>
  );
};
