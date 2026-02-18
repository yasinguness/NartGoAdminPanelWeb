/**
 * LoadingState Component
 * 
 * Full-page or container-level loading indicator.
 * Consistent styling for all loading states.
 * 
 * Usage:
 * ```tsx
 * if (isLoading) return <LoadingState message="Fetching data..." />;
 * ```
 */

import { Box, CircularProgress, Typography, SxProps, Theme } from '@mui/material';

interface LoadingStateProps {
  /** Optional loading message */
  message?: string;
  /** Circular progress size */
  size?: number;
  /** Full viewport height */
  fullPage?: boolean;
  /** Custom styles */
  sx?: SxProps<Theme>;
}

export default function LoadingState({
  message = 'Loading...',
  size = 40,
  fullPage = false,
  sx,
}: LoadingStateProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 4,
        minHeight: fullPage ? 'calc(100vh - 200px)' : '200px',
        ...sx,
      }}
    >
      <CircularProgress size={size} thickness={4} />
      {message && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 2, fontWeight: 500 }}
        >
          {message}
        </Typography>
      )}
    </Box>
  );
}
