import { Grid, Paper, Typography, Box, Stack, Skeleton } from '@mui/material';
import {
  PeopleAlt as PeopleIcon,
  Schedule as ClockIcon,
  CheckCircle as CheckIcon,
  Send as SendIcon,
  ErrorOutline as FailIcon,
  LocalAtm as AtmIcon,
} from '@mui/icons-material';
import type { PayoutSummary } from '../../../services/payouts/payoutTypes';
import { formatMoney, safeDate } from './helpers';

interface Props {
  summary?: PayoutSummary;
  loading?: boolean;
}

export default function SummaryCards({ summary, loading }: Props) {
  const cards = [
    { label: 'Pending Organizatör', value: summary?.organizersWithPending ?? 0, icon: <PeopleIcon sx={{ fontSize: 20 }} />, color: '#f59e0b', subtitle: 'bekleyen batch\'i olan' },
    { label: 'Pending Batch', value: summary?.totalPendingBatches ?? 0, icon: <ClockIcon sx={{ fontSize: 20 }} />, color: '#f59e0b', subtitle: formatMoney(summary?.pendingPayoutAmount) },
    { label: 'Approved Batch', value: summary?.totalApprovedBatches ?? 0, icon: <CheckIcon sx={{ fontSize: 20 }} />, color: '#3b82f6', subtitle: formatMoney(summary?.approvedPayoutAmount) },
    { label: 'Paid Out', value: summary?.totalPaidBatches ?? 0, icon: <SendIcon sx={{ fontSize: 20 }} />, color: '#22c55e', subtitle: formatMoney(summary?.paidPayoutAmount) },
    { label: 'Failed', value: summary?.totalFailedBatches ?? 0, icon: <FailIcon sx={{ fontSize: 20 }} />, color: '#ef4444', subtitle: 'retry gerekli' },
    { label: 'En Eski Bekleyen', value: summary?.oldestPendingAt ? safeDate(summary.oldestPendingAt) : '—', icon: <AtmIcon sx={{ fontSize: 20 }} />, color: '#C9A227', subtitle: 'SLA göstergesi', small: true },
  ];

  return (
    <Grid container spacing={2}>
      {cards.map((c) => (
        <Grid item xs={6} sm={4} md={2} key={c.label}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#F8FAFC', borderColor: 'rgba(201,162,39,0.18)', height: '100%' }}>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
              <Box sx={{
                width: 32, height: 32, borderRadius: 1.25,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                bgcolor: `${c.color}22`, color: c.color,
              }}>
                {c.icon}
              </Box>
              <Typography sx={{ fontSize: 10, letterSpacing: 1.2, fontWeight: 700, color: 'rgba(30,41,59,0.60)', textTransform: 'uppercase' }}>
                {c.label}
              </Typography>
            </Stack>
            {loading ? (
              <Skeleton variant="text" width="60%" height={28} sx={{ bgcolor: 'rgba(0,0,0,0.06)' }} />
            ) : (
              <Typography sx={{
                fontFamily: 'inherit', fontStyle: 'normal',
                fontSize: c.small ? 13 : 22, fontWeight: 700,
                color: c.color, lineHeight: 1.1,
              }}>
                {typeof c.value === 'number' ? c.value.toLocaleString('tr-TR') : c.value}
              </Typography>
            )}
            {c.subtitle && (
              <Typography sx={{ mt: 0.5, fontSize: 10, color: 'rgba(30,41,59,0.50)', fontStyle: 'normal' }}>
                {c.subtitle}
              </Typography>
            )}
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
}
