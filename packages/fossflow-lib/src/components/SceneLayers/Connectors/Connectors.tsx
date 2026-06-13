import React, { useMemo } from 'react';
import type { useScene } from 'src/hooks/useScene';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { getConnectorGroups } from 'src/utils/connectorGroups';
import { Connector } from './Connector';

interface Props {
  connectors: ReturnType<typeof useScene>['connectors'];
}

export const Connectors = ({ connectors }: Props) => {
  const itemControls = useUiStateStore((state) => state.itemControls);
  const mode = useUiStateStore((state) => state.mode);

  const selectedConnectorId = useMemo(() => {
    if (mode.type === 'CONNECTOR') return mode.id;
    if (itemControls?.type === 'CONNECTOR') return itemControls.id;
    return null;
  }, [mode, itemControls]);

  const { focusedId, groupIds } = useMemo(() => {
    if (itemControls?.type === 'CONNECTOR_GROUP') {
      return { focusedId: itemControls.focusedId, groupIds: new Set(itemControls.ids) };
    }
    return { focusedId: null as string | null, groupIds: new Set<string>() };
  }, [itemControls]);

  // When a node is selected, dim connectors that don't touch it
  const selectedNodeId = itemControls?.type === 'ITEM' ? itemControls.id : null;

  const connectedConnectorIds = useMemo(() => {
    if (!selectedNodeId) return null;
    return new Set(
      connectors
        .filter((c) => c.anchors.some((a) => a.ref?.item === selectedNodeId))
        .map((c) => c.id)
    );
  }, [selectedNodeId, connectors]);

  const groups = useMemo(() => getConnectorGroups(connectors), [connectors]);

  return (
    <>
      {[...connectors].reverse().map((connector) => {
        const group = groups.get(connector.id);

        const isGroupDimmed =
          focusedId !== null &&
          groupIds.has(connector.id) &&
          connector.id !== focusedId;

        const isNodeDimmed =
          connectedConnectorIds !== null &&
          !connectedConnectorIds.has(connector.id);

        return (
          <Connector
            key={connector.id}
            connector={connector}
            isSelected={selectedConnectorId === connector.id || connector.id === focusedId}
            groupIndex={group?.index ?? 0}
            groupTotal={group?.total ?? 1}
            dimmed={isGroupDimmed || isNodeDimmed}
          />
        );
      })}
    </>
  );
};
