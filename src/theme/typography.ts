/**
 * Typography System for Admin Panel
 * 
 * Defines font families, sizes, weights, and line heights for consistent text styling.
 */

// =============================================================================
// FONT FAMILIES
// =============================================================================

export const fontFamily = {
  /** Primary font stack for all UI text */
  primary: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  
  /** Monospace font for code, IDs, tokens */
  mono: '"Roboto Mono", "Consolas", "Monaco", monospace',
} as const;

// =============================================================================
// FONT WEIGHTS
// =============================================================================

export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

// =============================================================================
// TYPOGRAPHY VARIANTS
// =============================================================================

/**
 * MUI Typography variant configurations
 */
export const muiTypography = {
  fontFamily: fontFamily.primary,
  
  // Page title - largest heading
  h1: {
    fontSize: '2.5rem',      // 40px
    fontWeight: fontWeight.bold,
    letterSpacing: '0.5px',
    lineHeight: 1.2,
  },
  
  // Section title - major sections
  h2: {
    fontSize: '2rem',        // 32px
    fontWeight: fontWeight.semibold,
    letterSpacing: '0.5px',
    lineHeight: 1.3,
  },
  
  // Subsection title
  h3: {
    fontSize: '1.75rem',     // 28px
    fontWeight: fontWeight.semibold,
    letterSpacing: '0.5px',
    lineHeight: 1.3,
  },
  
  // Page title (most common for admin pages)
  h4: {
    fontSize: '1.5rem',      // 24px
    fontWeight: fontWeight.semibold,
    letterSpacing: '0.5px',
    lineHeight: 1.35,
  },
  
  // Card/section headers
  h5: {
    fontSize: '1.25rem',     // 20px
    fontWeight: fontWeight.semibold,
    letterSpacing: '0.5px',
    lineHeight: 1.4,
  },
  
  // Small section headers
  h6: {
    fontSize: '1rem',        // 16px
    fontWeight: fontWeight.semibold,
    letterSpacing: '0.5px',
    lineHeight: 1.5,
  },
  
  // Subtitle variants
  subtitle1: {
    fontSize: '1rem',        // 16px
    fontWeight: fontWeight.medium,
    lineHeight: 1.5,
  },
  subtitle2: {
    fontSize: '0.875rem',    // 14px
    fontWeight: fontWeight.medium,
    lineHeight: 1.43,
  },
  
  // Body text
  body1: {
    fontSize: '1rem',        // 16px
    fontWeight: fontWeight.regular,
    lineHeight: 1.5,
  },
  body2: {
    fontSize: '0.875rem',    // 14px
    fontWeight: fontWeight.regular,
    lineHeight: 1.5,
  },
  
  // Caption text - timestamps, hints
  caption: {
    fontSize: '0.75rem',     // 12px
    fontWeight: fontWeight.regular,
    lineHeight: 1.66,
  },
  
  // Overline text - labels above inputs
  overline: {
    fontSize: '0.75rem',     // 12px
    fontWeight: fontWeight.medium,
    letterSpacing: '1px',
    lineHeight: 2.66,
    textTransform: 'uppercase' as const,
  },
  
  // Button text
  button: {
    fontSize: '0.875rem',    // 14px
    fontWeight: fontWeight.semibold,
    letterSpacing: '0.5px',
    textTransform: 'none' as const,
  },
} as const;

// =============================================================================
// TEXT STYLES (for custom use outside MUI Typography)
// =============================================================================

/**
 * Pre-defined text styles for common use cases
 */
export const textStyles = {
  /** Large stat numbers */
  statValue: {
    fontSize: '1.5rem',
    fontWeight: fontWeight.bold,
    lineHeight: 1.2,
  },
  
  /** Stat labels below values */
  statLabel: {
    fontSize: '0.875rem',
    fontWeight: fontWeight.regular,
    lineHeight: 1.5,
  },
  
  /** Table header cells */
  tableHeader: {
    fontSize: '0.875rem',
    fontWeight: fontWeight.semibold,
    lineHeight: 1.5,
  },
  
  /** Table body cells */
  tableCell: {
    fontSize: '0.875rem',
    fontWeight: fontWeight.regular,
    lineHeight: 1.5,
  },
  
  /** Chip/badge text */
  chip: {
    fontSize: '0.75rem',
    fontWeight: fontWeight.medium,
    lineHeight: 1.5,
  },
  
  /** Breadcrumb links */
  breadcrumb: {
    fontSize: '0.875rem',
    fontWeight: fontWeight.regular,
    lineHeight: 1.5,
  },
  
  /** Menu items */
  menuItem: {
    fontSize: '0.875rem',
    fontWeight: fontWeight.regular,
    lineHeight: 1.5,
  },
  
  /** Code/monospace text */
  code: {
    fontFamily: fontFamily.mono,
    fontSize: '0.875rem',
    fontWeight: fontWeight.regular,
    lineHeight: 1.5,
  },
} as const;
