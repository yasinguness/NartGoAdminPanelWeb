import { Paper, Typography, Stack, Box, LinearProgress, Skeleton } from '@mui/material';
import { ReactNode } from 'react';

interface Row {
  key: string;
  label: ReactNode;
  value: string;
  sharePct?: number;
  meta?: string;
}

interface Props {
  title: string;
  rows?: Row[];
  loading?: boolean;
  emptyText?: string;
  accentColor?: string;
}

export default function BreakdownTable({ title, rows, loading, emptyText = 'Veri yok', accentColor = '#C9A227' }: Props) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, bgcolor: '#0A130F', borderColor: 'rgba(201,162,39,0.12)', height: '100%' }}>
      <Typography sx={{ fontSize: 11, letterSpacing: 1.5, fontWeight: 700, color: 'rgba(243,238,224,0.6)', textTransform: 'uppercase', mb: 2 }}>
        {title}
      </Typography>

      {loading ? (
        <Stack spacing={1.5}>
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} variant="rectangular" height={32} sx={{ bgcolor: 'rgba(255,255,255,0.04)', borderRadius: 0.5 }} />
          ))}
        </Stack>
      ) : !rows || rows.length === 0 ? (
        <Box sx={{ py: 3, textAlign: 'center' }}>
          <Typography sx={{ fontSize: 12, color: 'rgba(243,238,224,0.4)', fontStyle: 'italic' }}>
            {emptyText}
          </Typography>
        </Box>
      ) : (
        <Stack spacing={1.5}>
          {rows.map(row => (
            <Box key={row.key}>
              <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 0.5 }}>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#F3EEE0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {row.label}
                  </Typography>
                  {row.meta && (
                    <Typography sx={{ fontSize: 10, color: 'rgba(243,238,224,0.4)' }}>
                      {row.meta}
                    </Typography>
                  )}
                </Box>
                <Stack direction="row" spacing={1.5} alignItems="baseline">
                  <Typography sx={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: '#F3EEE0' }}>
                    {row.value}
                  </Typography>
                  {row.sharePct !== undefined && (
                    <Typography sx={{ fontSize: 10, fontWeight: 700, color: accentColor, minWidth: 44, textAlign: 'right' }}>
                      %{row.sharePct.toFixed(1)}
                    </Typography>
                  )}
                </Stack>
              </Stack>
              {row.sharePct !== undefined && (
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, row.sharePct)}
                  sx={{
                    height: 4,
                    borderRadius: 2,
                    bgcolor: 'rgba(255,255,255,0.05)',
                    '& .MuiLinearProgress-bar': { bgcolor: accentColor },
                  }}
                />
              )}
            </Box>
          ))}
        </Stack>
      )}
    </Paper>
  );
}
