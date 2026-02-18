/**
 * Main Theme Export
 * 
 * This file composes all theme modules into a single MUI theme.
 * Import this theme in your App.tsx and wrap with ThemeProvider.
 */

import { createTheme } from '@mui/material/styles';
import { muiPalette } from './palette';
import { muiTypography } from './typography';
import { borderRadius } from './spacing';
import { muiComponents } from './components';

// =============================================================================
// THEME CREATION
// =============================================================================

export const theme = createTheme({
  palette: muiPalette,
  typography: muiTypography,
  shape: {
    borderRadius: borderRadius.md,
  },
  components: muiComponents,
});

// =============================================================================
// RE-EXPORTS
// =============================================================================

// Export all theme tokens for direct use in components
export * from './palette';
export * from './spacing';
export * from './typography';

// Type exports for TypeScript support
export type AppTheme = typeof theme;
