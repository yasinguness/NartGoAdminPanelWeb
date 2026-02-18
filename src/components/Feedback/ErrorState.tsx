/**
 * ErrorState Component
 * 
 * Displays an error message with a retry button.
 * Used for full-page or section-level errors.
 * 
 * Usage:
 * ```tsx
 * if (error) return <ErrorState message={error.message} onRetry={refetch} />;
 * ```
 */

import { Box, Typography, Button, SxProps, Theme } from '@mui/material';
import { ErrorOutline as ErrorIcon, Refresh as RefreshIcon } from '@mui/icons-material';

interface ErrorStateProps {
  /** Error message */
  message?: string;
  /** Error title */
  title?: string;
  /** Retry handler */
  onRetry?: () => void;
  /** Compact mode for inline usage */
  compact?: boolean;
  /** Custom styles */
  sx?: SxProps<Theme>;
}

export default function ErrorState({
  message = 'Something went wrong. Please try again.',
  title = 'Oops! Error occurred',
  onRetry,
  compact = false,
  sx,
}: ErrorStateProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        py: compact ? 4 : 8,
        px: 3,
        ...sx,
      }}
    >
      <Box sx={{ color: 'error.main', mb: 2 }}>
        <ErrorIcon sx={{ fontSize: compact ? 48 : 64 }} />
      </Box>

      <Typography
        variant={compact ? 'subtitle1' : 'h6'}
        color="text.primary"
        gutterBottom
        sx={{ fontWeight: 600 }}
      >
        {title}
      </Typography>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ maxWidth: 400, mb: onRetry ? 3 : 0 }}
      >
        {message}
      </Typography>

      {onRetry && (
        <Button
          variant="outlined"
          color="primary"
          startIcon={<RefreshIcon />}
          onClick={onRetry}
          sx={{ borderRadius: 2 }}
        >
          Retry
        </Button>
      )}
    </Box>
  );
}
