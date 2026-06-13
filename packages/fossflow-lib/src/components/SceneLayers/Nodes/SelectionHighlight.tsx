import React, { memo, useMemo } from 'react';
import { Coords } from 'src/types';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { useScene } from 'src/hooks/useScene';
import { useIsoProjection } from 'src/hooks/useIsoProjection';
import { Svg } from 'src/components/Svg/Svg';

const TileHighlight = memo(({ tile }: { tile: Coords }) => {
  const to = useMemo(() => ({ x: tile.x + 1, y: tile.y + 1 }), [tile.x, tile.y]);
  const { css, pxSize } = useIsoProjection({ from: tile, to });

  return (
    <Svg viewboxSize={pxSize} style={css}>
      <rect
        width={pxSize.width}
        height={pxSize.height}
        fill="rgba(59,130,246,0.07)"
        rx={0}
        stroke="#3b82f6"
        strokeWidth={2.5}
        strokeDasharray="10,6"
      >
        <animate
          attributeName="stroke-dashoffset"
          from="0"
          to="-16"
          dur="0.5s"
          repeatCount="indefinite"
          calcMode="linear"
        />
      </rect>
    </Svg>
  );
});

export const SelectionHighlight = () => {
  const itemControls = useUiStateStore((state) => state.itemControls);
  const { items } = useScene();

  const selectedNode = useMemo(() => {
    if (itemControls?.type !== 'ITEM') return null;
    return items.find((n) => n.id === itemControls.id) ?? null;
  }, [itemControls, items]);

  if (!selectedNode) return null;

  return <TileHighlight tile={selectedNode.tile} />;
};
