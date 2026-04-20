import { Box, Tooltip } from '@mui/material';

type Status = 'up' | 'degraded' | 'down' | 'unknown';

interface Props {
  status: Status;
  label?: string;
  size?: number;
  pulse?: boolean;
}

const COLOR: Record<Status, string> = {
  up: '#22c55e',
  degraded: '#f59e0b',
  down: '#ef4444',
  unknown: '#6b7280',
};

const STATUS_LABEL: Record<Status, string> = {
  up: 'Çalışıyor',
  degraded: 'Yavaş',
  down: 'Kapalı',
  unknown: 'Bilinmiyor',
};

export default function HealthDot({ status, label, size = 8, pulse = true }: Props) {
  const color = COLOR[status];
  const tooltip = label ? `${label}: ${STATUS_LABEL[status]}` : STATUS_LABEL[status];

  return (
    <Tooltip title={tooltip} arrow>
      <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size + 6, height: size + 6 }}>
        <Box
          sx={{
            width: size,
            height: size,
            borderRadius: '50%',
            bgcolor: color,
            boxShadow: `0 0 0 0 ${color}`,
            animation: pulse && status === 'up' ? 'pulseUp 2s ease-in-out infinite' : pulse && status === 'down' ? 'pulseDown 1s ease-in-out infinite' : 'none',
            '@keyframes pulseUp': {
              '0%, 100%': { boxShadow: `0 0 0 0 ${color}88` },
              '50%': { boxShadow: `0 0 0 4px ${color}00` },
            },
            '@keyframes pulseDown': {
              '0%, 100%': { boxShadow: `0 0 0 0 ${color}` },
              '50%': { boxShadow: `0 0 0 6px ${color}00` },
            },
          }}
        />
      </Box>
    </Tooltip>
  );
}
