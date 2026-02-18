/**
 * PageSection Component
 * 
 * A card wrapper for content sections within a page.
 * Provides consistent styling with optional title and divider.
 * 
 * Usage:
 * ```tsx
 * <PageSection title="Personal Information">
 *   <Grid container spacing={2}>
 *     <Grid item xs={6}><TextField /></Grid>
 *     <Grid item xs={6}><TextField /></Grid>
 *   </Grid>
 * </PageSection>
 * ```
 */

import { ReactNode } from 'react';
import {
  Paper,
  Typography,
  Divider,
  Box,
  Skeleton,
  PaperProps,
  Collapse,
  IconButton,
  Stack,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import { useState } from 'react';
import { componentSpacing } from '../../theme';

interface PageSectionProps extends Omit<PaperProps, 'title'> {
  /** Section title (optional) */
  title?: string;
  /** Section subtitle/description */
  subtitle?: string;
  /** Section content */
  children: ReactNode;
  /** Actions to display in header (right side) */
  headerActions?: ReactNode;
  /** Show divider below title */
  showDivider?: boolean;
  /** Loading state - shows skeleton */
  loading?: boolean;
  /** Make section collapsible */
  collapsible?: boolean;
  /** Default collapsed state (when collapsible) */
  defaultCollapsed?: boolean;
  /** Remove padding from content */
  noPadding?: boolean;
  /** Bottom margin (MUI spacing units) */
  mb?: number;
}

export default function PageSection({
  title,
  subtitle,
  children,
  headerActions,
  showDivider = true,
  loading = false,
  collapsible = false,
  defaultCollapsed = false,
  noPadding = false,
  mb = 3,
  sx,
  ...paperProps
}: PageSectionProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const hasHeader = title || headerActions;

  if (loading) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: componentSpacing.cardPadding,
          mb,
          ...sx,
        }}
        {...paperProps}
      >
        <Skeleton variant="text" width={200} height={28} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 1 }} />
      </Paper>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        mb,
        overflow: 'hidden',
        ...sx,
      }}
      {...paperProps}
    >
      {/* Header */}
      {hasHeader && (
        <Box
          sx={{
            p: componentSpacing.cardPadding,
            pb: showDivider ? 2 : componentSpacing.cardPadding,
          }}
        >
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Box flex={1}>
              {title && (
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography variant="h6" component="h2">
                    {title}
                  </Typography>
                  {collapsible && (
                    <IconButton
                      size="small"
                      onClick={() => setCollapsed(!collapsed)}
                      sx={{ ml: 1 }}
                    >
                      {collapsed ? <ExpandMoreIcon /> : <ExpandLessIcon />}
                    </IconButton>
                  )}
                </Stack>
              )}
              {subtitle && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.5 }}
                >
                  {subtitle}
                </Typography>
              )}
            </Box>
            {headerActions && (
              <Stack direction="row" spacing={1}>
                {headerActions}
              </Stack>
            )}
          </Stack>
        </Box>
      )}

      {/* Divider */}
      {hasHeader && showDivider && <Divider />}

      {/* Content */}
      <Collapse in={!collapsed || !collapsible} timeout="auto">
        <Box
          sx={{
            p: noPadding ? 0 : componentSpacing.cardPadding,
            pt: hasHeader && showDivider && !noPadding ? 3 : undefined,
          }}
        >
          {children}
        </Box>
      </Collapse>
    </Paper>
  );
}
