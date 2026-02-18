/**
 * FormSection Component
 * 
 * A wrapper for form sections with a title and optional divider.
 * Helps organize long forms into logical groups.
 * 
 * Usage:
 * ```tsx
 * <FormSection title="Personal Information" description="Basic user data">
 *   <FormGrid>
 *     <TextField label="First Name" />
 *     <TextField label="Last Name" />
 *   </FormGrid>
 * </FormSection>
 * ```
 */

import { ReactNode } from 'react';
import { Box, Typography, Divider, Stack } from '@mui/material';

interface FormSectionProps {
  /** Section title */
  title?: string;
  /** Section description/subtitle */
  description?: string;
  /** Section content */
  children: ReactNode;
  /** Show divider below title */
  showDivider?: boolean;
  /** Bottom margin */
  mb?: number;
}

export default function FormSection({
  title,
  description,
  children,
  showDivider = true,
  mb = 4,
}: FormSectionProps) {
  return (
    <Box sx={{ mb }}>
      {(title || description) && (
        <Box sx={{ mb: 2 }}>
          {title && (
            <Typography variant="h6" component="h3" gutterBottom>
              {title}
            </Typography>
          )}
          {description && (
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          )}
          {showDivider && title && <Divider sx={{ mt: 2 }} />}
        </Box>
      )}
      <Box sx={{ pt: (title && showDivider) ? 2 : 0 }}>
        {children}
      </Box>
    </Box>
  );
}
