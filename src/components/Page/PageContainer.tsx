/**
 * PageContainer Component
 * 
 * A consistent wrapper for all admin pages that provides:
 * - Responsive padding
 * - Full viewport width
 * - Minimum height
 * - Background color
 * 
 * Usage:
 * ```tsx
 * <PageContainer>
 *   <PageHeader title="Users" />
 *   {content}
 * </PageContainer>
 * ```
 */

import { Box, BoxProps } from '@mui/material';
import { ReactNode } from 'react';
import { pageSpacing } from '../../theme';

interface PageContainerProps extends Omit<BoxProps, 'children'> {
  /** Page content */
  children: ReactNode;
  /** Maximum width constraint (optional) */
  maxWidth?: string | number;
  /** Disable minimum height (useful for dialogs) */
  disableMinHeight?: boolean;
}

export default function PageContainer({
  children,
  maxWidth,
  disableMinHeight = false,
  sx,
  ...props
}: PageContainerProps) {
  return (
    <Box
      sx={{
        p: pageSpacing.padding,
        width: '100%',
        minHeight: disableMinHeight ? undefined : '100vh',
        bgcolor: 'background.default',
        ...(maxWidth && { maxWidth, mx: 'auto' }),
        ...sx,
      }}
      {...props}
    >
      {children}
    </Box>
  );
}
