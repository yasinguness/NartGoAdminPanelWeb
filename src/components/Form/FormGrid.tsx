/**
 * FormGrid Component
 * 
 * A responsive grid container for form fields.
 * Defaults to 2 columns on desktop and 1 column on mobile.
 * 
 * Usage:
 * ```tsx
 * <FormGrid columns={2}>
 *   <TextField label="First Name" />
 *   <TextField label="Last Name" />
 * </FormGrid>
 * ```
 */

import { ReactNode } from 'react';
import { Grid, GridProps } from '@mui/material';

interface FormGridProps extends Omit<GridProps, 'children'> {
  /** Form fields */
  children: ReactNode;
  /** Number of columns on desktop (default: 2) */
  columns?: number;
  /** Spacing between fields (default: 2) */
  spacing?: number;
}

export default function FormGrid({
  children,
  columns = 2,
  spacing = 2,
  ...props
}: FormGridProps) {
  // Map column count to grid item size
  // 2 columns -> md=6
  // 3 columns -> md=4
  // 1 column -> md=12
  const mdSize = Math.floor(12 / columns);

  return (
    <Grid container spacing={spacing} {...props}>
      {Array.isArray(children) ? (
        children.map((child, index) => (
          <Grid item xs={12} md={mdSize} key={index}>
            {child}
          </Grid>
        ))
      ) : (
        <Grid item xs={12}>
          {children}
        </Grid>
      )}
    </Grid>
  );
}
