/**
 * FormField Component
 * 
 * A wrapper for form inputs that handles labels, basic layout, and error messages.
 * 
 * Usage:
 * ```tsx
 * <FormField label="Email" required error={errors.email}>
 *   <TextField {...register('email')} />
 * </FormField>
 * ```
 */

import { ReactNode } from 'react';
import { FormControl, Box, Typography, FormHelperText } from '@mui/material';
import { componentSpacing } from '../../theme/spacing';

interface FormFieldProps {
  /** Input element(s) */
  children: ReactNode;
  /** Label text */
  label?: string;
  /** Error message or boolean */
  error?: string | boolean | { message?: string };
  /** Helper text */
  helperText?: string;
  /** Required asterisk */
  required?: boolean;
  /** Margin bottom */
  mb?: number;
  /** Full width */
  fullWidth?: boolean;
}

export default function FormField({
  children,
  label,
  error,
  helperText,
  required = false,
  mb = componentSpacing.formFieldGap,
  fullWidth = true,
}: FormFieldProps) {
  
  // Extract error message string
  const errorMessage = typeof error === 'string' 
    ? error 
    : typeof error === 'object' && error?.message 
      ? error.message 
      : undefined;
  
  const hasError = !!error;

  return (
    <FormControl 
      fullWidth={fullWidth} 
      error={hasError}
      sx={{ mb }}
    >
      {label && (
        <Typography 
          variant="subtitle2" 
          component="label" 
          gutterBottom
          sx={{ 
            fontWeight: 500,
            color: hasError ? 'error.main' : 'text.primary',
            display: 'flex',
            alignItems: 'center',
            gap: 0.5
          }}
        >
          {label}
          {required && <Typography component="span" color="error" variant="inherit">*</Typography>}
        </Typography>
      )}
      
      {children}
      
      {(errorMessage || helperText) && (
        <FormHelperText sx={{ mx: 0 }}>
          {errorMessage || helperText}
        </FormHelperText>
      )}
    </FormControl>
  );
}
