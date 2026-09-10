import { Box, Typography } from '@mui/material';
import { TrendingUp, TrendingDown, TrendingFlat } from '@mui/icons-material';

interface Props {
  deltaPct?: number;
  label?: string;
  invert?: boolean;
  compact?: boolean;
}

export default function TrendDelta({ deltaPct, label = 'geçen döneme göre', invert = false, compact = false }: Props) {
  if (deltaPct === undefined || deltaPct === null || !isFinite(deltaPct)) {
    return (
      <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10, fontStyle: 'normal' }}>
        trend yok
      </Typography>
    );
  }

  const abs = Math.abs(deltaPct);
  const isFlat = abs < 0.5;
  const isUp = deltaPct > 0;
  const isGood = invert ? !isUp : isUp;

  const color = isFlat ? 'text.secondary' : isGood ? 'success.main' : 'error.main';
  const Icon = isFlat ? TrendingFlat : isUp ? TrendingUp : TrendingDown;

  const sign = isFlat ? '' : isUp ? '+' : '';
  const display = `${sign}${deltaPct.toFixed(1)}%`;

  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color }}>
      <Icon sx={{ fontSize: 14 }} />
      <Typography component="span" sx={{ fontSize: compact ? 11 : 12, fontWeight: 700, lineHeight: 1 }}>
        {display}
      </Typography>
      {!compact && (
        <Typography component="span" variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
          {label}
        </Typography>
      )}
    </Box>
  );
}
