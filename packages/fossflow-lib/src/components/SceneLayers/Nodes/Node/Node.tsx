import React, { useMemo, memo, useState } from 'react';
import { Box, Typography } from '@mui/material';
import {
  PROJECTED_TILE_SIZE,
  DEFAULT_LABEL_HEIGHT,
  MARKDOWN_EMPTY_VALUE
} from 'src/config';
import { getTilePosition } from 'src/utils';
import { useIcon } from 'src/hooks/useIcon';
import { ViewItem } from 'src/types';
import { useModelItem } from 'src/hooks/useModelItem';
import { ExpandableLabel } from 'src/components/Label/ExpandableLabel';
import { RichTextEditor } from 'src/components/RichTextEditor/RichTextEditor';

interface Props {
  node: ViewItem;
  order: number;
  dimmed?: boolean;
}

export const Node = memo(({ node, order, dimmed = false }: Props) => {
  const modelItem = useModelItem(node.id);
  const { iconComponent } = useIcon(modelItem?.icon, node.iconScale, node.iconRotation);
  const [showDescription, setShowDescription] = useState(true);

  const position = useMemo(() => {
    return getTilePosition({
      tile: node.tile,
      origin: 'BOTTOM'
    });
  }, [node.tile]);

  const description = useMemo(() => {
    if (
      !modelItem ||
      modelItem.description === undefined ||
      modelItem.description === MARKDOWN_EMPTY_VALUE
    )
      return null;

    return modelItem.description;
  }, [modelItem?.description]);

  if (!modelItem) {
    return null;
  }

  const nameAlign = node.nameAlign ?? 'center';

  return (
    <Box
      sx={{
        position: 'absolute',
        zIndex: order,
        opacity: dimmed ? 0.12 : 1,
        transition: 'opacity 0.2s ease-in-out'
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          left: position.x,
          top: position.y - (PROJECTED_TILE_SIZE.height / 2),
        }}
      >
        {iconComponent && (
          <Box
            sx={{
              pointerEvents: 'none',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            {iconComponent}
          </Box>
        )}
        {(modelItem?.name || description) && (
          <Box>
            <ExpandableLabel
              maxWidth={250}
              expandDirection="BOTTOM"
              labelHeight={node.labelHeight ?? DEFAULT_LABEL_HEIGHT}
            >
              <Box sx={{ position: 'relative' }}>
                {modelItem.name && (
                  <Typography
                    fontWeight={600}
                    sx={{
                      textAlign: nameAlign,
                      color: 'var(--ff-label-text, rgba(0,0,0,0.87))',
                      pr: description ? 2 : 0
                    }}
                  >
                    {modelItem.name}
                  </Typography>
                )}
                {description && showDescription && (
                  <RichTextEditor value={description} readOnly />
                )}
                {description && (
                  <Box
                    component="button"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      setShowDescription(s => !s);
                    }}
                    sx={{
                      position: 'absolute',
                      top: 0,
                      right: 0,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '0 2px',
                      fontSize: '0.6rem',
                      color: 'var(--ff-label-text)',
                      opacity: 0.45,
                      lineHeight: 1,
                      '&:hover': { opacity: 1 }
                    }}
                  >
                    ^
                  </Box>
                )}
              </Box>
            </ExpandableLabel>
          </Box>
        )}
      </Box>
    </Box>
  );
});
