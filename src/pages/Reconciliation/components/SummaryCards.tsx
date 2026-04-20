import { Grid, Paper, Typography, Box, Stack, Skeleton } from '@mui/material';
import {
  Schedule as ClockIcon,
  SyncProblem as DriftIcon,
  ContentCopy as DupIcon,
  LocalAtm as AtmIcon,
  Warning as WarnIcon,
} from '@mui/icons-material';
import type { ReconciliationSummary } from '../../../services/reconciliation/reconciliationTypes';
import { formatMoney, safeDate } from './helpers';

interface Props {
  summary?: ReconciliationSummary;
  totalMismatches: number;
  loading?: boolean;
}

export default function SummaryCards({ summary, totalMismatches, loading }: Props) {
  const cards = [
    { label: 'Toplam Uyumsuzluk', value: totalMismatches, icon: <WarnIcon sx={{ fontSize: 20 }} />, color: '#ef4444', subtitle: `${summary?.criticalCount ?? 0} kritik, ${summary?.warningCount ?? 0} orta` },
    { label: 'Takılı Kalmış', value: summary?.stalePending ?? 0, icon: <ClockIcon sx={{ fontSize: 20 }} />, color: '#f59e0b', subtitle: '1saat+ PENDING' },
    { label: 'Boşta Checkout', value: summary?.orphanedCheckout ?? 0, icon: <ClockIcon sx={{ fontSize: 20 }} />, color: '#64748b', subtitle: '2saat+ tamamlanmamış' },
    { label: 'Provider Drift', value: summary?.providerDbStatusDrift ?? 0, icon: <DriftIcon sx={{ fontSize: 20 }} />, color: '#ef4444', subtitle: 'DB ↔ Iyzico çeliş.' },
    { label: 'Mükerrer İşlem', value: summary?.duplicateTransactions ?? 0, icon: <DupIcon sx={{ fontSize: 20 }} />, color: '#ef4444', subtitle: 'Aynı order, çok payment' },
    { label: 'Risk Altında', value: formatMoney(summary?.totalAtRiskAmount), icon: <AtmIcon sx={{ fontSize: 20 }} />, color: '#C9A227', subtitle: summary?.oldestMismatchAt ? `En eski: ${safeDate(summary.oldestMismatchAt)}` : '—' },
  ];

  return (
    <Grid container spacing={2}>
      {cards.map(c => (
        <Grid item xs={6} sm={4} md={2} key={c.label}>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: '#0F1A14',
              borderColor: 'rgba(201,162,39,0.18)',
              height: '100%',
            }}
          >
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
                fontFamily: 'Georgia, serif',
                fontStyle: 'italic',
                fontSize: 22,
                fontWeight: 700,
                color: c.color,
                lineHeight: 1.1,
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
