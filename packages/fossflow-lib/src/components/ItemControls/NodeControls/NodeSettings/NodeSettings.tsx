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
import { extractSvgFills } from 'src/utils/svgColors';
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

  const svgFills = useMemo(() => extractSvgFills(iconUrl), [iconUrl]);

  const handleColorChange = useCallback((origFill: string, newColor: string) => {
    onViewItemUpdated({ iconColors: { ...iconColors, [origFill]: newColor } });
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

      {svgFills.length > 0 && (
        <Section title="Icon Colors">
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
            Override individual fill colors in this icon
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {svgFills.map((fill) => (
              <Box key={fill} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 22,
                    height: 22,
                    borderRadius: 0.5,
                    border: '1px solid rgba(0,0,0,0.2)',
                    background: fill,
                    flexShrink: 0
                  }}
                  title="Original color"
                />
                <Typography variant="caption" sx={{ opacity: 0.6, minWidth: 64, fontSize: '0.65rem', fontFamily: 'monospace' }}>
                  {fill}
                </Typography>
                <Box
                  component="input"
                  type="color"
                  value={iconColors[fill] || fill}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleColorChange(fill, e.target.value)}
                  sx={{
                    width: 32,
                    height: 28,
                    border: '1px solid rgba(0,0,0,0.2)',
                    borderRadius: 0.5,
                    cursor: 'pointer',
                    padding: '1px 2px',
                    flexShrink: 0,
                    background: 'none'
                  }}
                />
                {iconColors[fill] && iconColors[fill] !== fill && (
                  <Typography
                    variant="caption"
                    sx={{ fontSize: '0.65rem', fontFamily: 'monospace', opacity: 0.7 }}
                  >
                    → {iconColors[fill]}
                  </Typography>
                )}
              </Box>
            ))}
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
