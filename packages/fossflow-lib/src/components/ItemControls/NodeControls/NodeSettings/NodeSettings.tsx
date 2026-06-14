import React, { useCallback, useMemo } from 'react';
import { Slider, Box, TextField, Typography, ToggleButtonGroup, ToggleButton, Button } from '@mui/material';
import {
  FormatAlignLeft as AlignLeftIcon,
  FormatAlignCenter as AlignCenterIcon,
  FormatAlignRight as AlignRightIcon
} from '@mui/icons-material';
import { ModelItem, ViewItem } from 'src/types';
import { RichTextEditor } from 'src/components/RichTextEditor/RichTextEditor';
import { useModelItem } from 'src/hooks/useModelItem';
import { useModelStore } from 'src/stores/modelStore';
import { getItemById } from 'src/utils';
import { extractSvgColors, SvgColorEntry } from 'src/utils/svgColors';
import { DeleteButton } from '../../components/DeleteButton';
import { Section } from '../../components/Section';

export type NodeUpdates = {
  model: Partial<ModelItem>;
  view: Partial<ViewItem>;
};

interface Props {
  node: ViewItem;
  onModelItemUpdated: (updates: Partial<ModelItem>) => void;
  onViewItemUpdated: (updates: Partial<ViewItem>) => void;
  onDeleted: () => void;
}

export const NodeSettings = ({
  node,
  onModelItemUpdated,
  onViewItemUpdated,
  onDeleted
}: Props) => {
  const modelItem = useModelItem(node.id);
  const icons = useModelStore((state) => state.icons);

  const iconScale = node.iconScale ?? 1;
  const iconRotation = node.iconRotation ?? 0;
  const nameAlign = node.nameAlign ?? 'center';
  const iconColors = node.iconColors ?? {};

  const handleScaleChange = useCallback((_e: Event, val: number | number[]) => {
    onViewItemUpdated({ iconScale: val as number });
  }, [onViewItemUpdated]);

  const handleRotationChange = useCallback((_e: Event, val: number | number[]) => {
    onViewItemUpdated({ iconRotation: val as number });
  }, [onViewItemUpdated]);

  // Get the icon URL so we can extract SVG fills
  const iconUrl = useMemo(() => {
    if (!modelItem?.icon) return '';
    const item = getItemById(icons, modelItem.icon);
    return item?.value.url ?? '';
  }, [icons, modelItem?.icon]);

  const svgColorEntries = useMemo<SvgColorEntry[]>(() => extractSvgColors(iconUrl), [iconUrl]);

  // Key format: "fill:<original>" or "stroke:<original>"
  const handleColorChange = useCallback((entry: SvgColorEntry, newColor: string) => {
    const key = `${entry.type}:${entry.value}`;
    onViewItemUpdated({ iconColors: { ...iconColors, [key]: newColor } });
  }, [iconColors, onViewItemUpdated]);

  const handleResetColors = useCallback(() => {
    onViewItemUpdated({ iconColors: {} });
  }, [onViewItemUpdated]);

  if (!modelItem) {
    return null;
  }

  return (
    <>
      <Section title="Name">
        <TextField
          value={modelItem.name}
          onChange={(e) => {
            const text = e.target.value as string;
            if (modelItem.name !== text) onModelItemUpdated({ name: text });
          }}
        />
      </Section>
      <Section title="Description">
        <RichTextEditor
          value={modelItem.description}
          onChange={(text) => {
            if (modelItem.description !== text)
              onModelItemUpdated({ description: text });
          }}
        />
      </Section>
      {modelItem.name && (
        <>
          <Section title="Name alignment">
            <ToggleButtonGroup
              value={nameAlign}
              exclusive
              size="small"
              onChange={(_e, val) => { if (val) onViewItemUpdated({ nameAlign: val }); }}
            >
              <ToggleButton value="left"><AlignLeftIcon fontSize="small" /></ToggleButton>
              <ToggleButton value="center"><AlignCenterIcon fontSize="small" /></ToggleButton>
              <ToggleButton value="right"><AlignRightIcon fontSize="small" /></ToggleButton>
            </ToggleButtonGroup>
          </Section>
          <Section title="Label position (negative = below node)">
            <Typography variant="caption" color="text.secondary">{node.labelHeight ?? 80}</Typography>
            <Slider
              marks
              step={20}
              min={-200}
              max={280}
              value={node.labelHeight ?? 80}
              onChange={(_e, newHeight) => {
                const labelHeight = newHeight as number;
                onViewItemUpdated({ labelHeight });
              }}
            />
          </Section>
        </>
      )}

      <Section title="Icon size">
        <Typography variant="caption" color="text.secondary">{iconScale.toFixed(1)}x</Typography>
        <Slider
          marks
          step={0.1}
          min={0.3}
          max={2.5}
          value={iconScale}
          onChange={handleScaleChange}
        />
      </Section>

      <Section title="Icon rotation">
        <Typography variant="caption" color="text.secondary">{iconRotation}°</Typography>
        <Slider
          marks
          step={15}
          min={0}
          max={345}
          value={iconRotation}
          onChange={handleRotationChange}
        />
      </Section>

      {svgColorEntries.length > 0 && (
        <Section title="Icon Colors">
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
            Override fills &amp; strokes — transparent faces are colorable
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {svgColorEntries.map((entry) => {
              const key = `${entry.type}:${entry.value}`;
              const currentColor = iconColors[key];
              const swatchBg = entry.isTransparent
                ? 'repeating-conic-gradient(#ccc 0% 25%, white 0% 50%) 0 0 / 8px 8px'
                : entry.value;
              const pickerVal = currentColor || (entry.isTransparent ? '#ffffff' : entry.value);
              return (
                <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{ width: 22, height: 22, borderRadius: 0.5, border: '1px solid rgba(0,0,0,0.2)', background: swatchBg, flexShrink: 0 }}
                    title={`Original ${entry.type}: ${entry.value}`}
                  />
                  <Typography variant="caption" sx={{ opacity: 0.55, minWidth: 54, fontSize: '0.62rem', fontFamily: 'monospace' }}>
                    {entry.type}: {entry.value.length > 10 ? entry.value.slice(0, 10) + '…' : entry.value}
                  </Typography>
                  <Box
                    component="input"
                    type="color"
                    value={pickerVal.startsWith('#') ? pickerVal : '#000000'}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleColorChange(entry, e.target.value)}
                    sx={{ width: 32, height: 28, border: '1px solid rgba(0,0,0,0.2)', borderRadius: 0.5, cursor: 'pointer', padding: '1px 2px', flexShrink: 0, background: 'none' }}
                  />
                  {currentColor && (
                    <Typography variant="caption" sx={{ fontSize: '0.62rem', fontFamily: 'monospace', opacity: 0.7 }}>
                      → {currentColor}
                    </Typography>
                  )}
                </Box>
              );
            })}
          </Box>
          {Object.keys(iconColors).length > 0 && (
            <Button size="small" onClick={handleResetColors} sx={{ mt: 1.5 }} variant="outlined">
              Reset Colors
            </Button>
          )}
        </Section>
      )}

      <Section>
        <Box>
          <DeleteButton onClick={onDeleted} />
        </Box>
      </Section>
    </>
  );
};
