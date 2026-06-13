import React, { memo } from 'react';
import { useScene } from 'src/hooks/useScene';
import { IsoTileArea } from 'src/components/IsoTileArea/IsoTileArea';
import { getColorVariant } from 'src/utils';
import { useColor } from 'src/hooks/useColor';

type Props = ReturnType<typeof useScene>['rectangles'][0];

export const Rectangle = memo(({
  from, to, color: colorId, customColor, cornerStyle, borderStyle, borderColor
}: Props) => {
  const predefinedColor = useColor(colorId);
  const color = customColor ? { value: customColor } : predefinedColor;

  if (!color) return null;

  const cornerRadius = cornerStyle === 'SQUARE' ? 0 : 22;
  const isDashed = borderStyle === 'DASHED';
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
        width: isDashed ? 2 : 1,
        dashArray: isDashed ? '10,5' : undefined
      }}
    />
  );
});
