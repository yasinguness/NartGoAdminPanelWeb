/**
 * Color Palette for Admin Panel
 * 
 * Organized into semantic categories for consistent usage across the application.
 * Import these tokens instead of hardcoding color values.
 */

// =============================================================================
// BRAND COLORS
// =============================================================================

export const brand = {
  primary: '#16461C',      // Main brand color - used for primary actions
  secondary: '#4C8B53',    // Secondary brand color - lighter accent
  tertiary: '#2D5A33',     // Tertiary brand color - darker accent
} as const;

// =============================================================================
// NEUTRAL COLORS
// =============================================================================

export const neutral = {
  white: '#FFFFFF',
  black: '#000000',
  
  // Background shades
  background: '#FFFFFF',
  surface: '#F8F9FA',
  surfaceHover: '#F1F3F4',
  
  // Border colors
  border: '#E0E0E0',
  borderLight: '#F0F0F0',
  borderDark: '#BDBDBD',
  
  // Divider
  divider: 'rgba(0, 0, 0, 0.12)',
} as const;

// =============================================================================
// SEMANTIC COLORS
// =============================================================================

export const semantic = {
  success: {
    main: '#4CAF50',
    light: '#81C784',
    dark: '#388E3C',
    background: 'rgba(76, 175, 80, 0.08)',
    border: 'rgba(76, 175, 80, 0.24)',
  },
  warning: {
    main: '#FFA000',
    light: '#FFB74D',
    dark: '#F57C00',
    background: 'rgba(255, 160, 0, 0.08)',
    border: 'rgba(255, 160, 0, 0.24)',
  },
  error: {
    main: '#E74C3C',
    light: '#EF5350',
    dark: '#C62828',
    background: 'rgba(231, 76, 60, 0.08)',
    border: 'rgba(231, 76, 60, 0.24)',
  },
  info: {
    main: '#2196F3',
    light: '#64B5F6',
    dark: '#1976D2',
    background: 'rgba(33, 150, 243, 0.08)',
    border: 'rgba(33, 150, 243, 0.24)',
  },
} as const;

// =============================================================================
// TEXT COLORS
// =============================================================================

export const text = {
  primary: '#1A1A1A',      // Main text color
  secondary: '#666666',    // Secondary/muted text
  tertiary: '#999999',     // Tertiary/hint text
  disabled: '#CCCCCC',     // Disabled text
  inverse: '#FFFFFF',      // Text on dark backgrounds
} as const;

// =============================================================================
// STATUS COLORS (for chips, badges, indicators)
// =============================================================================

export const status = {
  active: semantic.success.main,
  inactive: '#9E9E9E',
  pending: semantic.warning.main,
  blocked: semantic.error.main,
  deleted: '#757575',
} as const;

// =============================================================================
// ALPHA UTILITIES
// =============================================================================

/**
 * Get a color with alpha transparency
 * @param color - Hex color value
 * @param alpha - Alpha value 0-1
 */
export const withAlpha = (color: string, alpha: number): string => {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// =============================================================================
// MUI PALETTE CONFIGURATION
// =============================================================================

export const muiPalette = {
  primary: {
    main: brand.primary,
    light: brand.secondary,
    dark: brand.tertiary,
    contrastText: neutral.white,
  },
  secondary: {
    main: brand.secondary,
    light: '#6BAE72',
    dark: '#3A7A41',
    contrastText: neutral.white,
  },
  background: {
    default: neutral.background,
    paper: neutral.surface,
  },
  text: {
    primary: text.primary,
    secondary: text.secondary,
  },
  error: {
    main: semantic.error.main,
    light: semantic.error.light,
    dark: semantic.error.dark,
  },
  warning: {
    main: semantic.warning.main,
    light: semantic.warning.light,
    dark: semantic.warning.dark,
  },
  success: {
    main: semantic.success.main,
    light: semantic.success.light,
    dark: semantic.success.dark,
  },
  info: {
    main: semantic.info.main,
    light: semantic.info.light,
    dark: semantic.info.dark,
  },
  divider: neutral.divider,
} as const;
