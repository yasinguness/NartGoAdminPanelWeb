import { Box, CircularProgress, Typography, Skeleton, SxProps, Theme } from '@mui/material';

interface LoadingStateProps {
  message?: string;
  size?: number;
  fullPage?: boolean;
  variant?: 'spinner' | 'skeleton';
  skeletonRows?: number;
  sx?: SxProps<Theme>;
}

export default function LoadingState({
  message = 'Yükleniyor...',
  size = 40,
  fullPage = false,
  variant = 'spinner',
  skeletonRows = 4,
  sx,
}: LoadingStateProps) {
  if (variant === 'skeleton') {
    return (
      <Box sx={{ p: 3, ...sx }}>
        {Array.from({ length: skeletonRows }).map((_, i) => (
          <Skeleton
            key={i}
            variant="rectangular"
            height={i === 0 ? 32 : 24}
            sx={{ mb: 2, borderRadius: 1, width: `${85 - i * 10}%` }}
            animation="wave"
          />
        ))}
      </Box>
    );
  }

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
