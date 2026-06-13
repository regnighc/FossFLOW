import React from 'react';
import { Box, SxProps } from '@mui/material';

interface Props {
  isExpanded: boolean;
  onClick: () => void;
  sx?: SxProps;
}

export const ExpandButton = ({ isExpanded, onClick, sx }: Props) => {
  return (
    <Box
      component="button"
      onClick={onClick}
      sx={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '2px 4px',
        fontSize: '0.6rem',
        color: 'var(--ff-label-text, rgba(0,0,0,0.6))',
        opacity: 0.45,
        lineHeight: 1,
        '&:hover': { opacity: 1 },
        ...sx
      }}
    >
      {isExpanded ? '⌃' : '⌄'}
    </Box>
  );
};
