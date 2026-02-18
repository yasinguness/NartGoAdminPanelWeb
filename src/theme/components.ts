/**
 * MUI Component Overrides
 * 
 * Consistent styling for all MUI components used in the admin panel.
 */

import { Components, Theme } from '@mui/material/styles';
import { brand, neutral, semantic, text } from './palette';
import { borderRadius, shadows } from './spacing';

export const muiComponents: Components<Omit<Theme, 'components'>> = {
  MuiCssBaseline: {
    styleOverrides: {
      body: {
        scrollbarWidth: 'thin',
        '&::-webkit-scrollbar': {
          width: '8px',
          height: '8px',
        },
        '&::-webkit-scrollbar-track': {
          background: neutral.surface,
        },
        '&::-webkit-scrollbar-thumb': {
          background: neutral.borderDark,
          borderRadius: '4px',
        },
        '&::-webkit-scrollbar-thumb:hover': {
          background: text.tertiary,
        },
      },
    },
  },

  MuiAppBar: {
    styleOverrides: {
      root: {
        backgroundColor: brand.primary,
        boxShadow: 'none',
        borderBottom: 'none',
      },
    },
  },

  MuiDrawer: {
    styleOverrides: {
      paper: {
        backgroundColor: neutral.surface,
        borderRight: 'none',
        boxShadow: shadows.drawer,
      },
    },
  },

  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: borderRadius.md,
        padding: '10px 20px',
        fontSize: '0.875rem',
        fontWeight: 600,
        textTransform: 'none',
        boxShadow: 'none',
        '&:hover': {
          boxShadow: 'none',
        },
      },
      sizeSmall: {
        padding: '6px 14px',
        fontSize: '0.813rem',
      },
      sizeLarge: {
        padding: '12px 24px',
        fontSize: '1rem',
      },
      contained: {
        boxShadow: 'none',
        '&:hover': {
          boxShadow: 'none',
        },
      },
      outlined: {
        borderWidth: 1.5,
        '&:hover': {
          borderWidth: 1.5,
        },
      },
    },
    defaultProps: {
      disableElevation: true,
    },
  },

  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: borderRadius.lg,
        boxShadow: shadows.card,
        border: `1px solid ${neutral.border}`,
      },
    },
    defaultProps: {
      elevation: 0,
    },
  },

  MuiPaper: {
    styleOverrides: {
      root: {
        borderRadius: borderRadius.lg,
      },
      elevation0: {
        border: `1px solid ${neutral.border}`,
      },
    },
  },

  MuiTextField: {
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          borderRadius: borderRadius.md,
          backgroundColor: neutral.surface,
          '& fieldset': {
            borderColor: neutral.border,
          },
          '&:hover fieldset': {
            borderColor: neutral.borderDark,
          },
          '&.Mui-focused fieldset': {
            borderColor: brand.primary,
            borderWidth: 2,
          },
          '&.Mui-error fieldset': {
            borderColor: semantic.error.main,
          },
          '&.Mui-focused.Mui-error fieldset': {
            borderColor: semantic.error.main,
            borderWidth: 2,
          },
        },
        '& .MuiInputLabel-root': {
          '&.Mui-focused': {
            color: brand.primary,
          },
          '&.Mui-error': {
            color: semantic.error.main,
          },
        },
      },
    },
  },

  MuiSelect: {
    styleOverrides: {
      root: {
        borderRadius: borderRadius.md,
      },
    },
  },

  MuiChip: {
    styleOverrides: {
      root: {
        borderRadius: borderRadius.sm,
        fontWeight: 500,
      },
      sizeSmall: {
        height: 24,
        fontSize: '0.75rem',
      },
    },
  },

  MuiListItemButton: {
    styleOverrides: {
      root: {
        borderRadius: borderRadius.md,
        marginBottom: 4,
        '&.Mui-selected': {
          backgroundColor: brand.primary,
          color: neutral.white,
          '&:hover': {
            backgroundColor: brand.tertiary,
          },
          '& .MuiListItemIcon-root': {
            color: neutral.white,
          },
        },
      },
    },
  },

  MuiTableCell: {
    styleOverrides: {
      root: {
        borderBottom: `1px solid ${neutral.border}`,
        padding: '12px 16px',
      },
      head: {
        fontWeight: 600,
        backgroundColor: `rgba(22, 70, 28, 0.04)`,
      },
    },
  },

  MuiTableRow: {
    styleOverrides: {
      root: {
        '&:hover': {
          backgroundColor: neutral.surfaceHover,
        },
        '&:last-child td': {
          borderBottom: 0,
        },
      },
    },
  },

  MuiDialog: {
    styleOverrides: {
      paper: {
        borderRadius: borderRadius.lg,
        boxShadow: shadows.modal,
      },
    },
  },

  MuiDialogTitle: {
    styleOverrides: {
      root: {
        fontSize: '1.25rem',
        fontWeight: 600,
        padding: '20px 24px 16px',
      },
    },
  },

  MuiDialogContent: {
    styleOverrides: {
      root: {
        padding: '16px 24px',
      },
    },
  },

  MuiDialogActions: {
    styleOverrides: {
      root: {
        padding: '16px 24px 20px',
        gap: 8,
      },
    },
  },

  MuiSwitch: {
    styleOverrides: {
      root: {
        '& .MuiSwitch-switchBase.Mui-checked': {
          color: brand.primary,
          '&:hover': {
            backgroundColor: `${brand.primary}14`,
          },
        },
        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
          backgroundColor: brand.primary,
        },
      },
    },
  },

  MuiTooltip: {
    styleOverrides: {
      tooltip: {
        backgroundColor: text.primary,
        fontSize: '0.75rem',
        padding: '6px 12px',
        borderRadius: borderRadius.sm,
      },
    },
  },

  MuiAlert: {
    styleOverrides: {
      root: {
        borderRadius: borderRadius.md,
      },
      standardSuccess: {
        backgroundColor: semantic.success.background,
        border: `1px solid ${semantic.success.border}`,
      },
      standardWarning: {
        backgroundColor: semantic.warning.background,
        border: `1px solid ${semantic.warning.border}`,
      },
      standardError: {
        backgroundColor: semantic.error.background,
        border: `1px solid ${semantic.error.border}`,
      },
      standardInfo: {
        backgroundColor: semantic.info.background,
        border: `1px solid ${semantic.info.border}`,
      },
    },
  },

  MuiPagination: {
    styleOverrides: {
      root: {
        '& .MuiPaginationItem-root': {
          borderRadius: borderRadius.sm,
        },
      },
    },
  },

  MuiBreadcrumbs: {
    styleOverrides: {
      root: {
        fontSize: '0.875rem',
      },
      separator: {
        marginLeft: 8,
        marginRight: 8,
      },
    },
  },

  MuiIconButton: {
    styleOverrides: {
      root: {
        borderRadius: borderRadius.sm,
      },
      sizeSmall: {
        padding: 6,
      },
    },
  },

  MuiMenu: {
    styleOverrides: {
      paper: {
        borderRadius: borderRadius.md,
        boxShadow: shadows.dropdown,
        border: `1px solid ${neutral.border}`,
      },
    },
  },

  MuiMenuItem: {
    styleOverrides: {
      root: {
        fontSize: '0.875rem',
        padding: '10px 16px',
        '&:hover': {
          backgroundColor: neutral.surfaceHover,
        },
      },
    },
  },

  MuiDivider: {
    styleOverrides: {
      root: {
        borderColor: neutral.border,
      },
    },
  },

  MuiSkeleton: {
    styleOverrides: {
      root: {
        backgroundColor: neutral.surfaceHover,
      },
      rounded: {
        borderRadius: borderRadius.md,
      },
    },
  },

  MuiAvatar: {
    styleOverrides: {
      root: {
        fontWeight: 600,
      },
      rounded: {
        borderRadius: borderRadius.md,
      },
    },
  },

  MuiBadge: {
    styleOverrides: {
      badge: {
        fontSize: '0.625rem',
        fontWeight: 600,
        minWidth: 18,
        height: 18,
      },
    },
  },

  MuiTabs: {
    styleOverrides: {
      indicator: {
        height: 3,
        borderRadius: '3px 3px 0 0',
      },
    },
  },

  MuiTab: {
    styleOverrides: {
      root: {
        textTransform: 'none',
        fontWeight: 500,
        fontSize: '0.875rem',
        minHeight: 48,
      },
    },
  },
};
