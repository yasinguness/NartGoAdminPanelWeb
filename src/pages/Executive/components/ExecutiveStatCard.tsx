import { Paper, Typography, Stack, Box, Skeleton } from '@mui/material';
import TrendDelta from './TrendDelta';
import Sparkline from './Sparkline';
import AnomalyChip from './AnomalyChip';
import type { MetricWithTrend } from '../../../services/executive/executiveTypes';

interface Props {
  label: string;
  metric?: MetricWithTrend;
  format?: (v: number) => string;
  unit?: string;
  color?: string;
  loading?: boolean;
  invertDelta?: boolean;
  helperText?: string;
}

const defaultFormat = (v: number) => v.toLocaleString('tr-TR');

export default function ExecutiveStatCard({
  label,
  metric,
  format = defaultFormat,
  unit,
  color,
  loading = false,
  invertDelta = false,
  helperText,
}: Props) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2.25,
        borderRadius: 2,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#0F1A14',
        borderColor: 'rgba(201,162,39,0.18)',
        color: '#F3EEE0',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
        <Typography sx={{ fontSize: 10, letterSpacing: 1.5, fontWeight: 700, textTransform: 'uppercase', color: 'rgba(243,238,224,0.6)' }}>
          {label}
        </Typography>
        {metric?.anomaly && <AnomalyChip zScore={metric.anomaly.zScore} severity={metric.anomaly.severity} />}
      </Stack>

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', mt: 1 }}>
        {loading ? (
          <Skeleton variant="text" width="60%" height={36} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
        ) : metric ? (
          <Stack direction="row" alignItems="baseline" spacing={0.5}>
            <Typography
              sx={{
                fontFamily: 'Georgia, serif',
                fontStyle: 'italic',
                fontSize: 28,
                fontWeight: 700,
                lineHeight: 1,
                color: color || '#C9A227',
              }}
            >
              {format(metric.value)}
            </Typography>
            {unit && (
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'rgba(243,238,224,0.55)' }}>
                {unit}
              </Typography>
            )}
          </Stack>
        ) : (
          <Typography sx={{ fontSize: 13, fontStyle: 'italic', color: 'rgba(243,238,224,0.4)' }}>
            veri yok
          </Typography>
        )}

        {!loading && metric && (
          <Box sx={{ mt: 1 }}>
            <TrendDelta deltaPct={metric.deltaPct} invert={invertDelta} compact />
          </Box>
        )}
      </Box>

      {!loading && metric?.series && metric.series.length > 1 && (
        <Box sx={{ mt: 1 }}>
          <Sparkline data={metric.series} color={color || '#C9A227'} height={30} />
        </Box>
      )}

      {helperText && (
        <Typography sx={{ mt: 1, fontSize: 10, color: 'rgba(243,238,224,0.4)' }}>
          {helperText}
        </Typography>
      )}
    </Paper>
  );
}
