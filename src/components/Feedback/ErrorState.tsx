import { Box, Typography, Button, SxProps, Theme } from '@mui/material';
import { ErrorOutline as ErrorIcon, Refresh as RefreshIcon } from '@mui/icons-material';

interface ErrorStateProps {
  message?: string;
  title?: string;
  onRetry?: () => void;
  compact?: boolean;
  sx?: SxProps<Theme>;
}

export default function ErrorState({
  message = 'Bir şeyler yanlış gitti. Lütfen tekrar deneyin.',
  title = 'Bir hata oluştu',
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
          Tekrar Dene
        </Button>
      )}
    </Box>
  );
}
