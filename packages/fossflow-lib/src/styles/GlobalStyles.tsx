import React from 'react';
import { GlobalStyles as MUIGlobalStyles } from '@mui/material';
import 'react-quill-new/dist/quill.snow.css';

export const GlobalStyles = () => {
  return (
    <MUIGlobalStyles
      styles={{
        div: {
          boxSizing: 'border-box'
        },
        ':root': {
          '--ff-label-bg': '#ffffff',
          '--ff-label-border': '#bdbdbd',
          '--ff-label-text': 'rgba(0,0,0,0.87)'
        },
        '[data-theme="dark"]': {
          '--ff-label-bg': '#2d3748',
          '--ff-label-border': '#4a5568',
          '--ff-label-text': '#e2e8f0'
        }
      } as any}
    />
  );
};
