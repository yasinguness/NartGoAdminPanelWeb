import { Paper, Stack, Typography, Button, Box } from '@mui/material';
import { CheckCircle as ApproveIcon, Replay as RetryIcon, Close as CloseIcon } from '@mui/icons-material';

interface Props {
  selectedCount: number;
  onApprove: () => void;
  onRetry: () => void;
  onClear: () => void;
  loading?: boolean;
}

export default function BulkActionBar({ selectedCount, onApprove, onRetry, onClear, loading }: Props) {
  if (selectedCount === 0) return null;

  return (
    <Paper
      elevation={8}
      sx={{
        position: 'sticky',
        top: 16,
        zIndex: 10,
        p: 1.5,
        mb: 2,
        borderRadius: 2,
        bgcolor: 'rgba(201,162,39,0.15)',
        border: '1px solid rgba(201,162,39,0.4)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box sx={{
          width: 32, height: 32, borderRadius: '50%',
          bgcolor: '#C9A227', color: '#0A130F',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 900, fontSize: 14,
        }}>
          {selectedCount}
        </Box>
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#F3EEE0', flex: 1 }}>
          batch seçildi
        </Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<ApproveIcon sx={{ fontSize: 16 }} />}
          onClick={onApprove}
          disabled={loading}
          sx={{
            bgcolor: '#22c55e',
            color: '#0A130F',
            fontSize: 11, fontWeight: 800,
            '&:hover': { bgcolor: '#1aa34a' },
          }}
        >
          Toplu Onayla
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={<RetryIcon sx={{ fontSize: 16 }} />}
          onClick={onRetry}
          disabled={loading}
          sx={{
            borderColor: 'rgba(201,162,39,0.5)',
            color: '#C9A227',
            fontSize: 11, fontWeight: 700,
            '&:hover': { borderColor: '#C9A227', bgcolor: 'rgba(201,162,39,0.08)' },
          }}
        >
          Yeniden Dene
        </Button>
        <Button
          size="small"
          startIcon={<CloseIcon sx={{ fontSize: 16 }} />}
          onClick={onClear}
          sx={{ color: 'rgba(243,238,224,0.5)', fontSize: 11 }}
        >
          Temizle
        </Button>
      </Stack>
    </Paper>
  );
}
