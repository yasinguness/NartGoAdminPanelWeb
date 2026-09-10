import { Paper, Typography, Box, Stack, Skeleton } from '@mui/material';
import { TrendingUp, TrendingDown, TrendingFlat } from '@mui/icons-material';

interface Props {
  label: string;
  value?: string;
  deltaPct?: number;
  loading?: boolean;
  color?: string;
  invertDelta?: boolean;
  subtitle?: string;
}

export default function KpiTile({ label, value, deltaPct, loading, color = '#C9A227', invertDelta, subtitle }: Props) {
  const isFlat = deltaPct !== undefined && Math.abs(deltaPct) < 0.5;
  const isUp = deltaPct !== undefined && deltaPct > 0;
  const isGood = invertDelta ? !isUp : isUp;
  const deltaColor = deltaPct === undefined ? 'text.disabled' : isFlat ? 'text.secondary' : isGood ? 'success.main' : 'error.main';
  const Icon = deltaPct === undefined ? TrendingFlat : isFlat ? TrendingFlat : isUp ? TrendingUp : TrendingDown;
  const sign = deltaPct === undefined ? '' : isFlat ? '' : isUp ? '+' : '';

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.25,
        borderRadius: 2,
        bgcolor: '#F8FAFC',
        border: '1px solid rgba(201,162,39,0.18)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <Typography sx={{ fontSize: 10, letterSpacing: 1.5, fontWeight: 700, color: 'rgba(30,41,59,0.60)', textTransform: 'uppercase' }}>
        {label}
      </Typography>

      <Box sx={{ mt: 1 }}>
        {loading ? (
          <Skeleton variant="text" width="70%" height={32} sx={{ bgcolor: 'rgba(0,0,0,0.06)' }} />
        ) : (
          <Typography sx={{
            fontFamily: 'inherit',
            fontStyle: 'normal',
            fontSize: 26,
            fontWeight: 700,
            lineHeight: 1.1,
            color,
          }}>
            {value ?? '—'}
          </Typography>
        )}

        {deltaPct !== undefined && !loading && (
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 1 }}>
            <Icon sx={{ fontSize: 14, color: deltaColor }} />
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: deltaColor }}>
              {sign}{deltaPct.toFixed(1)}%
            </Typography>
            <Typography sx={{ fontSize: 10, color: 'rgba(30,41,59,0.45)' }}>
              geçen dönem
            </Typography>
          </Stack>
        )}

        {subtitle && (
          <Typography sx={{ mt: 0.5, fontSize: 10, color: 'rgba(30,41,59,0.45)', fontStyle: 'normal' }}>
            {subtitle}
          </Typography>
        )}
      </Box>
    </Paper>
  );
}
