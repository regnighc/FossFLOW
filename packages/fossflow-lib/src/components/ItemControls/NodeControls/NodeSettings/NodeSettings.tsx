import React, { useCallback } from 'react';
import { Slider, Box, TextField, Typography, ToggleButtonGroup, ToggleButton } from '@mui/material';
import {
  FormatAlignLeft as AlignLeftIcon,
  FormatAlignCenter as AlignCenterIcon,
  FormatAlignRight as AlignRightIcon
} from '@mui/icons-material';
import { ModelItem, ViewItem } from 'src/types';
import { RichTextEditor } from 'src/components/RichTextEditor/RichTextEditor';
import { useModelItem } from 'src/hooks/useModelItem';
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

  const iconScale = node.iconScale ?? 1;
  const iconRotation = node.iconRotation ?? 0;
  const nameAlign = node.nameAlign ?? 'center';

  const handleScaleChange = useCallback((_e: Event, val: number | number[]) => {
    onViewItemUpdated({ iconScale: val as number });
  }, [onViewItemUpdated]);

  const handleRotationChange = useCallback((_e: Event, val: number | number[]) => {
    onViewItemUpdated({ iconRotation: val as number });
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

      <Section>
        <Box>
          <DeleteButton onClick={onDeleted} />
        </Box>
      </Section>
    </>
  );
};
