import { Grid, Paper, Typography, Box, Stack, Skeleton } from '@mui/material';
import {
  Schedule as ClockIcon,
  Sync as SyncIcon,
  CheckCircle as CheckIcon,
  ErrorOutline as FailIcon,
  Warning as WarnIcon,
  LocalAtm as AtmIcon,
} from '@mui/icons-material';
import type { RefundSummary } from '../../../services/refunds/refundTypes';
import { formatMoney, safeDate } from './helpers';

interface Props {
  summary?: RefundSummary;
  loading?: boolean;
}

export default function RefundSummaryCards({ summary, loading }: Props) {
  const cards = [
    { label: 'Bekliyor', value: summary?.pendingCount ?? 0, icon: <ClockIcon sx={{ fontSize: 20 }} />, color: '#f59e0b', subtitle: formatMoney(summary?.pendingAmount) },
    { label: 'İşleniyor', value: summary?.processingCount ?? 0, icon: <SyncIcon sx={{ fontSize: 20 }} />, color: '#3b82f6', subtitle: formatMoney(summary?.processingAmount) },
    { label: 'Tamamlandı', value: summary?.completedCount ?? 0, icon: <CheckIcon sx={{ fontSize: 20 }} />, color: '#22c55e', subtitle: formatMoney(summary?.completedAmount) },
    { label: 'Başarısız', value: summary?.failedCount ?? 0, icon: <FailIcon sx={{ fontSize: 20 }} />, color: '#ef4444', subtitle: formatMoney(summary?.failedAmount) },
    { label: 'SLA İhlali', value: summary?.slaBreachCount ?? 0, icon: <WarnIcon sx={{ fontSize: 20 }} />, color: '#ef4444', subtitle: '48sa üstü bekleyen' },
    { label: 'En Eski Bekleyen', value: summary?.oldestPendingAt ? safeDate(summary.oldestPendingAt) : '—', icon: <AtmIcon sx={{ fontSize: 20 }} />, color: '#C9A227', subtitle: 'öncelik göstergesi', small: true },
  ];

  return (
    <Grid container spacing={2}>
      {cards.map(c => (
        <Grid item xs={6} sm={4} md={2} key={c.label}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#0F1A14', borderColor: 'rgba(201,162,39,0.18)', height: '100%' }}>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
              <Box sx={{
                width: 32, height: 32, borderRadius: 1.25,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                bgcolor: `${c.color}22`, color: c.color,
              }}>
                {c.icon}
              </Box>
              <Typography sx={{ fontSize: 10, letterSpacing: 1.2, fontWeight: 700, color: 'rgba(243,238,224,0.6)', textTransform: 'uppercase' }}>
                {c.label}
              </Typography>
            </Stack>
            {loading ? (
              <Skeleton variant="text" width="60%" height={28} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
            ) : (
              <Typography sx={{
                fontFamily: 'Georgia, serif', fontStyle: 'italic',
                fontSize: c.small ? 13 : 22, fontWeight: 700,
                color: c.color, lineHeight: 1.1,
              }}>
                {typeof c.value === 'number' ? c.value.toLocaleString('tr-TR') : c.value}
              </Typography>
            )}
            {c.subtitle && (
              <Typography sx={{ mt: 0.5, fontSize: 10, color: 'rgba(243,238,224,0.45)', fontStyle: 'italic' }}>
                {c.subtitle}
              </Typography>
            )}
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
}
