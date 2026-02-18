/**
 * Spacing System for Admin Panel
 * 
 * Based on an 8px grid system for consistent spacing throughout the application.
 * Use these tokens instead of arbitrary pixel values.
 */

// =============================================================================
// BASE SPACING SCALE
// =============================================================================

/**
 * Core spacing values following 8px grid
 * Usage: spacing.md for standard gaps, spacing.lg for section separation
 */
export const spacing = {
  /** 4px - Tight spacing for inline elements, chip gaps */
  xs: 0.5,   // 4px (MUI spacing unit * 0.5)
  
  /** 8px - Small gaps between related elements */
  sm: 1,     // 8px
  
  /** 16px - Medium gaps, form field spacing */
  md: 2,     // 16px
  
  /** 24px - Large gaps, section separators */
  lg: 3,     // 24px
  
  /** 32px - Extra large, page padding on desktop */
  xl: 4,     // 32px
  
  /** 48px - Major section separations */
  '2xl': 6,  // 48px
} as const;

// =============================================================================
// PAGE SPACING
// =============================================================================

/**
 * Standard page padding that adapts to screen size
 * Usage: sx={{ p: pageSpacing.padding }}
 */
export const pageSpacing = {
  /** Responsive page padding */
  padding: { xs: 2, sm: 3, md: 4 },
  
  /** Top margin after header */
  headerMargin: { xs: 2, md: 3 },
  
  /** Gap between major page sections */
  sectionGap: 3,
  
  /** Gap between stat cards in a row */
  cardGap: 3,
} as const;

// =============================================================================
// COMPONENT SPACING
// =============================================================================

/**
 * Standard spacing values for common components
 */
export const componentSpacing = {
  /** Card internal padding */
  cardPadding: 3,
  
  /** Table cell padding */
  tableCellPadding: 2,
  
  /** Dialog content padding */
  dialogPadding: 3,
  
  /** Form section gap */
  formSectionGap: 3,
  
  /** Gap between form fields */
  formFieldGap: 2,
  
  /** Button group gap */
  buttonGap: 1,
  
  /** Icon button size */
  iconButtonSize: 'small' as const,
  
  /** Chip gap */
  chipGap: 0.5,
} as const;

// =============================================================================
// BORDER RADIUS
// =============================================================================

/**
 * Consistent border radius values
 */
export const borderRadius = {
  /** Small radius for chips, badges */
  sm: 8,
  
  /** Medium radius for inputs, buttons */
  md: 12,
  
  /** Large radius for cards, dialogs */
  lg: 16,
  
  /** Full radius for circular elements */
  full: '50%',
} as const;

// =============================================================================
// SHADOWS
// =============================================================================

/**
 * Consistent shadow values
 */
export const shadows = {
  /** No shadow */
  none: 'none',
  
  /** Subtle shadow for cards */
  card: '0px 2px 8px rgba(0, 0, 0, 0.05)',
  
  /** Medium shadow for dropdowns */
  dropdown: '0px 4px 16px rgba(0, 0, 0, 0.08)',
  
  /** Drawer shadow */
  drawer: '0px 0px 20px rgba(0, 0, 0, 0.05)',
  
  /** Elevated shadow for modals */
  modal: '0px 8px 32px rgba(0, 0, 0, 0.12)',
} as const;

// =============================================================================
// Z-INDEX
// =============================================================================

/**
 * Consistent z-index values
 */
export const zIndex = {
  drawer: 1200,
  modal: 1300,
  snackbar: 1400,
  tooltip: 1500,
} as const;
