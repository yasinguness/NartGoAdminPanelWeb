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
  primary: '#6366F1',      // Main brand color - Indigo/Purple matching Expinova
  secondary: '#818CF8',    // Lighter accent
  tertiary: '#4F46E5',     // Darker accent
} as const;

// =============================================================================
// NEUTRAL COLORS
// =============================================================================

export const neutral = {
  white: '#FFFFFF',
  black: '#0F172A',
  
  // Background shades
  background: '#F4F6F8',   // Light gray app background
  surface: '#FFFFFF',      // Pure white cards/panels
  surfaceHover: '#F9FAFB', // Slate gray subtle hover
  
  // Border colors
  border: '#E2E8F0',       // Soft light borders
  borderLight: '#F1F5F9',  // Very soft borders
  borderDark: '#CBD5E1',   // Stronger borders
  
  // Divider
  divider: 'rgba(15, 23, 42, 0.08)',
} as const;

// =============================================================================
// SEMANTIC COLORS
// =============================================================================

export const semantic = {
  success: {
    main: '#10B981',       // Emerald Green
    light: '#34D399',
    dark: '#059669',       // Deep strong green (for text inside badges)
    background: 'rgba(16, 185, 129, 0.12)', // Soft badge bg
    border: 'rgba(16, 185, 129, 0.2)',
  },
  warning: {
    main: '#F59E0B',       // Amber
    light: '#FBBF24',
    dark: '#D97706',
    background: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.2)',
  },
  error: {
    main: '#EF4444',       // Red
    light: '#F87171',
    dark: '#DC2626',
    background: 'rgba(239, 68, 68, 0.12)',
    border: 'rgba(239, 68, 68, 0.2)',
  },
  info: {
    main: '#3B82F6',       // Blue
    light: '#60A5FA',
    dark: '#2563EB',
    background: 'rgba(59, 130, 246, 0.12)',
    border: 'rgba(59, 130, 246, 0.2)',
  },
} as const;

// =============================================================================
// TEXT COLORS
// =============================================================================

export const text = {
  primary: '#1E293B',      // Slate 800 (very dark blue/gray for primary text)
  secondary: '#64748B',    // Slate 500 (muted text)
  tertiary: '#94A3B8',     // Hint text
  disabled: '#CBD5E1',     // Disabled text
  inverse: '#FFFFFF',      // Text on dark backgrounds
} as const;

// =============================================================================
// STATUS COLORS (for chips, badges, indicators)
// =============================================================================

export const status = {
  active: semantic.success.main,
  inactive: '#94A3B8',
  pending: semantic.warning.main,
  blocked: semantic.error.main,
  deleted: '#64748B',
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
    light: '#A5B4FC',
    dark: brand.tertiary,
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
