import React from 'react';

interface Props {
  id: string;
}

// Node selection is shown by SelectionHighlight (animated dashes). The static
// dashed TransformControls border is not needed for nodes — nodes can't be resized.
export const NodeTransformControls = (_props: Props) => null;
