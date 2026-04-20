import { Chip, Tooltip } from '@mui/material';
import { Warning as WarnIcon, Error as ErrorIcon } from '@mui/icons-material';

interface Props {
  zScore?: number;
  severity?: 'low' | 'medium' | 'high';
}

export default function AnomalyChip({ zScore, severity }: Props) {
  if (!severity || zScore === undefined) return null;
  if (severity === 'low') return null;

  const isHigh = severity === 'high';
  const color = isHigh ? 'error' : 'warning';
  const Icon = isHigh ? ErrorIcon : WarnIcon;
  const label = isHigh ? 'KRİTİK' : 'ANOMALİ';

  return (
    <Tooltip title={`z-score: ${zScore.toFixed(2)} — son ${severity === 'high' ? '60' : '30'} günlük normalin dışında`} arrow>
      <Chip
        size="small"
        icon={<Icon sx={{ fontSize: 12 }} />}
        label={label}
        color={color}
        sx={{ height: 18, fontSize: 9, fontWeight: 800, letterSpacing: 0.5 }}
      />
    </Tooltip>
  );
}
