import React, { useMemo } from 'react';
import { ViewItem } from 'src/types';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { useScene } from 'src/hooks/useScene';
import { Node } from './Node/Node';

interface Props {
  nodes: ViewItem[];
}

export const Nodes = ({ nodes }: Props) => {
  const itemControls = useUiStateStore((state) => state.itemControls);
  const { connectors } = useScene();

  const selectedNodeId = itemControls?.type === 'ITEM' ? itemControls.id : null;

  // Build set of node IDs that should NOT be dimmed: selected + direct peers
  const visibleNodeIds = useMemo(() => {
    if (!selectedNodeId) return null;
    const set = new Set<string>([selectedNodeId]);
    connectors.forEach((c) => {
      if (c.anchors.some((a) => a.ref?.item === selectedNodeId)) {
        c.anchors.forEach((a) => { if (a.ref?.item) set.add(a.ref.item); });
      }
    });
    return set;
  }, [selectedNodeId, connectors]);

  return (
    <>
      {[...nodes].reverse().map((node) => (
        <Node
          key={node.id}
          order={-node.tile.x - node.tile.y}
          node={node}
          dimmed={visibleNodeIds !== null && !visibleNodeIds.has(node.id)}
        />
      ))}
    </>
  );
};
