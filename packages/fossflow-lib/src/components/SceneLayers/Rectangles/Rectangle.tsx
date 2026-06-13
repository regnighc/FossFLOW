import React, { memo } from 'react';
import { useScene } from 'src/hooks/useScene';
import { IsoTileArea } from 'src/components/IsoTileArea/IsoTileArea';
import { getColorVariant } from 'src/utils';
import { useColor } from 'src/hooks/useColor';

type Props = ReturnType<typeof useScene>['rectangles'][0];

export const Rectangle = memo(({
  from, to, color: colorId, customColor, cornerStyle, borderStyle, borderColor, borderWidth
}: Props) => {
  const predefinedColor = useColor(colorId);
  const color = customColor ? { value: customColor } : predefinedColor;

  if (!color) return null;

  const cornerRadius = cornerStyle === 'SQUARE' ? 0 : 22;
  const isDashed = borderStyle === 'DASHED';
  const strokeWidth = isDashed ? (borderWidth ?? 2) : 1;
  const strokeColor = isDashed
    ? (borderColor || getColorVariant(color.value, 'dark', { grade: 3 }))
    : getColorVariant(color.value, 'dark', { grade: 2 });

  return (
    <IsoTileArea
      from={from}
      to={to}
      fill={color.value}
      cornerRadius={cornerRadius}
      stroke={{
        color: strokeColor,
        width: strokeWidth,
        dashArray: isDashed ? `${strokeWidth * 5},${strokeWidth * 2.5}` : undefined
      }}
    />
  );
});
