import React, { useMemo, memo, useRef } from 'react';
import { useTheme, Box } from '@mui/material';
import { UNPROJECTED_TILE_SIZE } from 'src/config';
import {
  getAnchorTile,
  getColorVariant,
  getConnectorDirectionIcon
} from 'src/utils';
import { getGroupOffset } from 'src/utils/connectorGroups';
import { Circle } from 'src/components/Circle/Circle';
import { Svg } from 'src/components/Svg/Svg';
import { useIsoProjection } from 'src/hooks/useIsoProjection';
import { useConnector } from 'src/hooks/useConnector';
import { useScene } from 'src/hooks/useScene';
import { useColor } from 'src/hooks/useColor';

interface Props {
  connector: ReturnType<typeof useScene>['connectors'][0];
  isSelected?: boolean;
  groupIndex?: number;
  groupTotal?: number;
  dimmed?: boolean;
}

const getPerpendicularAt = (
  tiles: { x: number; y: number }[],
  i: number
): { dx: number; dy: number } => {
  const curr = tiles[i];
  let dirX = 0;
  let dirY = 0;

  if (i > 0 && i < tiles.length - 1) {
    const prev = tiles[i - 1];
    const next = tiles[i + 1];
    dirX = ((curr.x - prev.x) + (next.x - curr.x)) / 2;
    dirY = ((curr.y - prev.y) + (next.y - curr.y)) / 2;
  } else if (i === 0 && tiles.length > 1) {
    dirX = tiles[1].x - curr.x;
    dirY = tiles[1].y - curr.y;
  } else if (i === tiles.length - 1 && tiles.length > 1) {
    const prev = tiles[i - 1];
    dirX = curr.x - prev.x;
    dirY = curr.y - prev.y;
  }

  const len = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
  return { dx: -dirY / len, dy: dirX / len };
};

const buildOffsetPolyline = (
  tiles: { x: number; y: number }[],
  drawOffset: { x: number; y: number },
  perpOffset: number
): string => {
  const points: string[] = [];
  for (let i = 0; i < tiles.length; i++) {
    const { dx, dy } = getPerpendicularAt(tiles, i);
    const x = tiles[i].x * UNPROJECTED_TILE_SIZE + drawOffset.x + dx * perpOffset;
    const y = tiles[i].y * UNPROJECTED_TILE_SIZE + drawOffset.y + dy * perpOffset;
    points.push(`${x},${y}`);
  }
  return points.join(' ');
};

const getArrowAtPercent = (
  tiles: { x: number; y: number }[],
  percent: number,
  drawOffset: { x: number; y: number }
): { x: number; y: number; rotation: number } | null => {
  if (tiles.length < 2) return null;
  const totalSegments = tiles.length - 1;
  const pos = (percent / 100) * totalSegments;
  const idx = Math.min(Math.floor(pos), totalSegments - 1);
  const frac = pos - idx;
  const t1 = tiles[idx];
  const t2 = tiles[idx + 1];

  const x = (t1.x + (t2.x - t1.x) * frac) * UNPROJECTED_TILE_SIZE + drawOffset.x;
  const y = (t1.y + (t2.y - t1.y) * frac) * UNPROJECTED_TILE_SIZE + drawOffset.y;

  const dx = t2.x - t1.x;
  const dy = t2.y - t1.y;
  let rotation = 0;
  if (dx > 0) {
    rotation = dy > 0 ? 135 : dy < 0 ? 45 : 90;
  } else if (dx < 0) {
    rotation = dy > 0 ? -135 : dy < 0 ? -45 : -90;
  } else {
    rotation = dy > 0 ? 180 : dy < 0 ? 0 : -90;
  }

  return { x, y, rotation };
};

// Shared epoch for cross-connector animation sync
const PAGE_LOAD_MS = Date.now();

let _animCounter = 0;

export const Connector = memo(({ connector: _connector, isSelected, groupIndex = 0, groupTotal = 1, dimmed = false }: Props) => {
  const animId = useMemo(() => `ffa${++_animCounter}`, []);
  const theme = useTheme();
  const predefinedColor = useColor(_connector.color);
  const { currentView } = useScene();
  const connector = useConnector(_connector.id);

  // Capture animation begin time once per mount (for sync)
  const circleBeginRef = useRef<string | null>(null);

  if (!connector) return null;

  const color = connector.customColor
    ? { value: connector.customColor }
    : predefinedColor;

  if (!color) return null;

  const { css, pxSize } = useIsoProjection({
    ...connector.path.rectangle
  });

  const drawOffset = useMemo(() => ({
    x: UNPROJECTED_TILE_SIZE / 2,
    y: UNPROJECTED_TILE_SIZE / 2
  }), []);

  const connectorWidthPx = useMemo(() => (UNPROJECTED_TILE_SIZE / 100) * connector.width, [connector.width]);
  const groupOffsetPx = useMemo(() => getGroupOffset(groupIndex, groupTotal, UNPROJECTED_TILE_SIZE), [groupIndex, groupTotal]);

  const pathString = useMemo(() => {
    if (groupTotal > 1) return buildOffsetPolyline(connector.path.tiles, drawOffset, groupOffsetPx);
    return connector.path.tiles.reduce((acc, tile) =>
      `${acc} ${tile.x * UNPROJECTED_TILE_SIZE + drawOffset.x},${tile.y * UNPROJECTED_TILE_SIZE + drawOffset.y}`, '');
  }, [connector.path.tiles, drawOffset, groupTotal, groupOffsetPx]);

  const offsetPaths = useMemo(() => {
    if (!connector.lineType || connector.lineType === 'SINGLE') return null;
    const tiles = connector.path.tiles;
    if (tiles.length < 2) return null;
    const doubleOffset = connectorWidthPx * 3;
    if (groupTotal > 1) {
      return {
        path1: buildOffsetPolyline(tiles, drawOffset, groupOffsetPx + doubleOffset),
        path2: buildOffsetPolyline(tiles, drawOffset, groupOffsetPx - doubleOffset)
      };
    }
    return {
      path1: buildOffsetPolyline(tiles, drawOffset, doubleOffset),
      path2: buildOffsetPolyline(tiles, drawOffset, -doubleOffset)
    };
  }, [connector.path.tiles, connector.lineType, connectorWidthPx, drawOffset, groupTotal, groupOffsetPx]);

  const anchorPositions = useMemo(() => {
    if (!isSelected) return [];
    return connector.anchors.map((anchor) => {
      const position = getAnchorTile(anchor, currentView);
      return {
        id: anchor.id,
        x: (connector.path.rectangle.from.x - position.x) * UNPROJECTED_TILE_SIZE + drawOffset.x,
        y: (connector.path.rectangle.from.y - position.y) * UNPROJECTED_TILE_SIZE + drawOffset.y
      };
    });
  }, [currentView, connector.path.rectangle, connector.anchors, drawOffset, isSelected]);

  const directionIcon = useMemo(() => getConnectorDirectionIcon(connector.path.tiles), [connector.path.tiles]);

  const startArrowPos = useMemo(() => {
    if (!connector.showStartArrow) return null;
    const pos = getArrowAtPercent(connector.path.tiles, 0, drawOffset);
    if (!pos) return null;
    return { ...pos, rotation: (pos.rotation + 180) % 360 };
  }, [connector.path.tiles, drawOffset, connector.showStartArrow]);

  const isFlow = connector.style === 'FLOW';
  const isAnimated = isFlow || connector.flowAnimate === true;
  const isForward = (connector.flowDirection ?? 'FORWARD') === 'FORWARD';
  const dashLen = connectorWidthPx * 4;
  const gapLen = connectorWidthPx * 2;
  const animTo = isForward ? -(dashLen + gapLen) : (dashLen + gapLen);

  const strokeDashArray = useMemo(() => {
    switch (connector.style) {
      case 'DASHED': return `${connectorWidthPx * 2}, ${connectorWidthPx * 2}`;
      case 'DOTTED': return `0, ${connectorWidthPx * 1.8}`;
      case 'FLOW': return `${dashLen}, ${gapLen}`;
      default: return 'none';
    }
  }, [connector.style, connectorWidthPx, dashLen, gapLen]);

  const additionalArrows = useMemo(() => {
    if (!connector.arrows || connector.arrows.length === 0) return [];
    return connector.arrows
      .map(a => ({ id: a.id, pos: getArrowAtPercent(connector.path.tiles, a.position, drawOffset) }))
      .filter(a => a.pos !== null) as { id: string; pos: { x: number; y: number; rotation: number } }[];
  }, [connector.arrows, connector.path.tiles, drawOffset]);

  // Circle animation
  const circleAnimate = connector.circleAnimate === true;
  const circleSpeed = connector.circleSpeed ?? 2;
  const circleRadius = connectorWidthPx * 1.5 * (connector.circleSize ?? 1);

  // Capture begin time once; recompute only when animation is toggled or speed changes
  const circleBegin = useMemo(() => {
    if (!circleAnimate) { circleBeginRef.current = null; return '0'; }
    const elapsed = (Date.now() - PAGE_LOAD_MS) / 1000;
    const offset = (elapsed % circleSpeed).toFixed(3);
    circleBeginRef.current = `-${offset}s`;
    return circleBeginRef.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circleAnimate, circleSpeed]);

  const motionPath = useMemo(() => {
    const pts = pathString.trim().split(/\s+/).filter(Boolean);
    if (pts.length < 2) return '';
    return 'M ' + pts[0] + ' L ' + pts.slice(1).join(' L ');
  }, [pathString]);

  const lineType = connector.lineType || 'SINGLE';
  const arrowShape = connector.arrowShape || 'TRIANGLE';
  const arrowFill = connector.arrowColor || '#000000';

  const renderArrow = (x: number, y: number, rotation: number, key: string) => (
    <g key={key} transform={`translate(${x}, ${y})`}>
      <g transform={`rotate(${rotation})`}>
        {arrowShape === 'TRIANGLE' && (
          <polygon fill={arrowFill} stroke={theme.palette.common.white} strokeWidth={4} points="17.58,17.01 0,-17.01 -17.58,17.01" />
        )}
        {arrowShape === 'OPEN' && (
          <polyline fill="none" stroke={arrowFill} strokeWidth={connectorWidthPx * 1.2} strokeLinecap="round" strokeLinejoin="round" points="-16,14 0,-16 16,14" />
        )}
        {arrowShape === 'CIRCLE' && (
          <>
            <circle r={12} fill={theme.palette.common.white} stroke={theme.palette.common.white} strokeWidth={4} />
            <circle r={12} fill={arrowFill} />
          </>
        )}
        {arrowShape === 'DIAMOND' && (
          <polygon fill={arrowFill} stroke={theme.palette.common.white} strokeWidth={4} points="0,-18 14,0 0,18 -14,0" />
        )}
        {arrowShape === 'BARB' && (
          <polygon fill={arrowFill} stroke={theme.palette.common.white} strokeWidth={3} points="18,16 0,-18 -18,16 0,4" />
        )}
      </g>
    </g>
  );

  const svgAnimate = (isAnimated && strokeDashArray !== 'none') ? (
    <animate
      attributeName="stroke-dashoffset"
      from="0"
      to={String(animTo)}
      dur="0.8s"
      repeatCount="indefinite"
      calcMode="linear"
    />
  ) : null;

  const circleColor = getColorVariant(color.value, 'dark', { grade: 1 });

  return (
    <Box style={{ ...css, opacity: dimmed ? 0.15 : 1, transition: 'opacity 0.2s ease-in-out' }}>
      <Svg style={{ transform: 'scale(-1, 1)' }} viewboxSize={pxSize}>
        {lineType === 'SINGLE' ? (
          <>
            <polyline
              points={pathString}
              stroke={theme.palette.common.white}
              strokeWidth={connectorWidthPx * 1.4}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity={0.7}
              strokeDasharray={strokeDashArray}
              fill="none"
            />
            <polyline
              points={pathString}
              stroke={circleColor}
              strokeWidth={connectorWidthPx}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={strokeDashArray}
              fill="none"
            >
              {svgAnimate}
            </polyline>
          </>
        ) : offsetPaths ? (
          <>
            <polyline points={offsetPaths.path1} stroke={theme.palette.common.white} strokeWidth={connectorWidthPx * 1.4} strokeLinecap="round" strokeLinejoin="round" strokeOpacity={0.7} strokeDasharray={strokeDashArray} fill="none" />
            <polyline points={offsetPaths.path1} stroke={circleColor} strokeWidth={connectorWidthPx} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={strokeDashArray} fill="none">
              {svgAnimate}
            </polyline>
            <polyline points={offsetPaths.path2} stroke={theme.palette.common.white} strokeWidth={connectorWidthPx * 1.4} strokeLinecap="round" strokeLinejoin="round" strokeOpacity={0.7} strokeDasharray={strokeDashArray} fill="none" />
            <polyline points={offsetPaths.path2} stroke={circleColor} strokeWidth={connectorWidthPx} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={strokeDashArray} fill="none">
              {svgAnimate}
            </polyline>
          </>
        ) : null}

        {/* Port-channel circle */}
        {lineType === 'DOUBLE_WITH_CIRCLE' && connector.path.tiles.length >= 2 && (() => {
          const midIndex = Math.floor(connector.path.tiles.length / 2);
          const midTile = connector.path.tiles[midIndex];
          const { dx, dy } = getPerpendicularAt(connector.path.tiles, midIndex);
          const x = midTile.x * UNPROJECTED_TILE_SIZE + drawOffset.x + dx * groupOffsetPx;
          const y = midTile.y * UNPROJECTED_TILE_SIZE + drawOffset.y + dy * groupOffsetPx;
          let rotation = 0;
          if (midIndex > 0 && midIndex < connector.path.tiles.length - 1) {
            const prevTile = connector.path.tiles[midIndex - 1];
            const nextTile = connector.path.tiles[midIndex + 1];
            const rdx = nextTile.x - prevTile.x;
            const rdy = nextTile.y - prevTile.y;
            rotation = Math.atan2(rdy, rdx) * (180 / Math.PI);
          }
          const circleRadiusX = connectorWidthPx * 5;
          const circleRadiusY = connectorWidthPx * 4;
          return (
            <g transform={`translate(${x}, ${y}) rotate(${rotation})`}>
              <ellipse cx={0} cy={0} rx={circleRadiusX} ry={circleRadiusY} fill="none" stroke={circleColor} strokeWidth={connectorWidthPx * 0.8} />
              <ellipse cx={0} cy={0} rx={circleRadiusX} ry={circleRadiusY} fill="none" stroke={theme.palette.common.white} strokeWidth={connectorWidthPx * 1.2} strokeOpacity={0.5} />
            </g>
          );
        })()}

        {anchorPositions.map((anchor) => (
          <g key={anchor.id}>
            <Circle tile={anchor} radius={18} fill={theme.palette.common.white} fillOpacity={0.7} />
            <Circle tile={anchor} radius={12} stroke={theme.palette.common.black} fill={theme.palette.common.white} strokeWidth={6} />
          </g>
        ))}

        {/* End arrow */}
        {directionIcon && connector.showArrow !== false &&
          renderArrow(directionIcon.x, directionIcon.y, directionIcon.rotation ?? 0, 'dir')}

        {/* Start arrow (2-way) */}
        {startArrowPos &&
          renderArrow(startArrowPos.x, startArrowPos.y, startArrowPos.rotation, 'start-dir')}

        {/* Additional arrows */}
        {additionalArrows.map(a => renderArrow(a.pos.x, a.pos.y, a.pos.rotation, a.id))}

        {/* Traveling circle animation */}
        {circleAnimate && motionPath && (
          <>
            <circle r={circleRadius + 2} fill={theme.palette.common.white} fillOpacity={0.6}>
              <animateMotion
                path={motionPath}
                dur={`${circleSpeed}s`}
                repeatCount="indefinite"
                keyPoints={isForward ? '0;1' : '1;0'}
                keyTimes="0;1"
                calcMode="linear"
                begin={circleBegin}
              />
            </circle>
            <circle r={circleRadius} fill={circleColor}>
              <animateMotion
                path={motionPath}
                dur={`${circleSpeed}s`}
                repeatCount="indefinite"
                keyPoints={isForward ? '0;1' : '1;0'}
                keyTimes="0;1"
                calcMode="linear"
                begin={circleBegin}
              />
            </circle>
          </>
        )}
      </Svg>
    </Box>
  );
});
