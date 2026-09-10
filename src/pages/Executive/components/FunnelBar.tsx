import { Box, Stack, Typography, Tooltip } from '@mui/material';
import type { FunnelStep } from '../../../services/executive/executiveTypes';

interface Props {
  steps: FunnelStep[];
}

export default function FunnelBar({ steps }: Props) {
  if (!steps || steps.length === 0) {
    return (
      <Typography sx={{ fontSize: 12, fontStyle: 'normal', color: 'rgba(30,41,59,0.45)' }}>
        funnel verisi yok
      </Typography>
    );
  }

  const max = Math.max(...steps.map(s => s.count), 1);

  return (
    <Stack spacing={1.25}>
      {steps.map((step, idx) => {
        const widthPct = (step.count / max) * 100;
        const drop = idx > 0 && step.dropOffPct !== undefined ? step.dropOffPct : null;

        return (
          <Box key={step.key}>
            <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 0.5 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'rgba(30,41,59,0.80)', letterSpacing: 0.3 }}>
                {idx + 1}. {step.label}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="baseline">
                <Typography sx={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: '#1E293B' }}>
                  {step.count.toLocaleString('tr-TR')}
                </Typography>
                {drop !== null && drop > 0 && (
                  <Tooltip title={`Önceki adımdan kayıp: %${drop.toFixed(1)}`} arrow>
                    <Typography sx={{ fontSize: 10, fontWeight: 700, color: drop > 50 ? '#ef4444' : drop > 25 ? '#f59e0b' : 'rgba(30,41,59,0.55)' }}>
                      ↓{drop.toFixed(0)}%
                    </Typography>
                  </Tooltip>
                )}
              </Stack>
            </Stack>
            <Box
              sx={{
                height: 22,
                width: `${widthPct}%`,
                minWidth: widthPct > 0 ? 12 : 0,
                borderRadius: 0.75,
                background: `linear-gradient(90deg, #C9A227 0%, rgba(201,162,39,${0.9 - idx * 0.12}) 100%)`,
                transition: 'width 300ms ease',
              }}
            />
          </Box>
        );
      })}
    </Stack>
  );
}
