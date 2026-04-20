import { Grid, Box, Stack, Typography, LinearProgress } from '@mui/material';
import { MonetizationOn as MoneyIcon } from '@mui/icons-material';
import SectionCard from '../components/SectionCard';
import SectionHeader from '../components/SectionHeader';
import ExecutiveStatCard from '../components/ExecutiveStatCard';
import type { RevenueKpi } from '../../../services/executive/executiveTypes';

interface Props {
  data: RevenueKpi | null;
  loading: boolean;
  partial: boolean;
}

const fmtMoney = (currency = 'TRY') => (v: number) => {
  const sym = currency === 'TRY' ? '₺' : currency;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M ${sym}`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K ${sym}`;
  return `${v.toLocaleString('tr-TR')} ${sym}`;
};

export default function RevenueSection({ data, loading, partial }: Props) {
  const money = fmtMoney(data?.currency);

  const paidPct = data?.paidVsFreeSplit
    ? (data.paidVsFreeSplit.paid / (data.paidVsFreeSplit.paid + data.paidVsFreeSplit.free || 1)) * 100
    : null;

  return (
    <SectionCard partial={partial} partialMessage="Gelir verileri settlement servisinden türetildi. Detaylı zaman serisi için /admin/executive/revenue endpoint'i gerekli.">
      <SectionHeader
        title="Gelir"
        subtitle="GMV, net gelir, ortalama sipariş değeri"
        icon={<MoneyIcon sx={{ fontSize: 20 }} />}
        refreshLabel="30sn gerçek zamanlı"
        accent="#22c55e"
      />

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={4} lg={2.4}>
          <ExecutiveStatCard
            label="GMV • Bugün"
            metric={data?.gmvToday}
            format={money}
            loading={loading}
            color="#22c55e"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2.4}>
          <ExecutiveStatCard
            label="GMV • 7 Gün"
            metric={data?.gmvWeek}
            format={money}
            loading={loading}
            color="#22c55e"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2.4}>
          <ExecutiveStatCard
            label="GMV • 30 Gün"
            metric={data?.gmvMonth}
            format={money}
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2.4}>
          <ExecutiveStatCard
            label="Net Gelir • 30G"
            metric={data?.netRevenueMonth}
            format={money}
            loading={loading}
            helperText="Iyzico komisyonu + vergi düşüldü"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2.4}>
          <ExecutiveStatCard
            label="AOV"
            metric={data?.aov}
            format={money}
            loading={loading}
            helperText="Ortalama sipariş değeri"
          />
        </Grid>
      </Grid>

      {data?.mrr && (
        <Box sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <ExecutiveStatCard
                label="MRR"
                metric={data.mrr}
                format={money}
                loading={loading}
                color="#C9A227"
                helperText="Aylık tekrarlayan gelir"
              />
            </Grid>
          </Grid>
        </Box>
      )}

      {paidPct !== null && (
        <Box sx={{ mt: 3, p: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 1 }}>
            <Typography sx={{ fontSize: 11, letterSpacing: 1.2, fontWeight: 700, color: 'rgba(243,238,224,0.6)', textTransform: 'uppercase' }}>
              Ücretli / Ücretsiz Etkinlik
            </Typography>
            <Typography sx={{ fontSize: 11, fontFamily: 'monospace', color: '#F3EEE0' }}>
              %{paidPct.toFixed(1)} ücretli
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={paidPct}
            sx={{
              height: 6,
              borderRadius: 3,
              bgcolor: 'rgba(255,255,255,0.06)',
              '& .MuiLinearProgress-bar': {
                bgcolor: '#C9A227',
              },
            }}
          />
        </Box>
      )}
    </SectionCard>
  );
}
