import { Grid, Box, Stack, Typography } from '@mui/material';
import { Group as GroupIcon } from '@mui/icons-material';
import SectionCard from '../components/SectionCard';
import SectionHeader from '../components/SectionHeader';
import ExecutiveStatCard from '../components/ExecutiveStatCard';
import type { GrowthKpi } from '../../../services/executive/executiveTypes';

interface Props {
  data: GrowthKpi | null;
  loading: boolean;
  partial: boolean;
}

const fmtNum = (v: number) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString('tr-TR');
};

const fmtFactor = (v: number) => v.toFixed(2);

export default function GrowthSection({ data, loading, partial }: Props) {
  return (
    <SectionCard partial={partial} partialMessage="Büyüme metrikleri kullanıcı istatistik servisinden alındı. Retention cohort'ları için /admin/executive/growth endpoint'i gerekli.">
      <SectionHeader
        title="Büyüme"
        subtitle="Aktif kullanıcı, kayıt ve retention"
        icon={<GroupIcon sx={{ fontSize: 20 }} />}
        refreshLabel="saatlik"
        accent="#3b82f6"
      />

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={4} lg={2.4}>
          <ExecutiveStatCard label="DAU" metric={data?.dau} format={fmtNum} loading={loading} color="#3b82f6" helperText="Günlük aktif" />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2.4}>
          <ExecutiveStatCard label="WAU" metric={data?.wau} format={fmtNum} loading={loading} color="#3b82f6" helperText="Haftalık aktif" />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2.4}>
          <ExecutiveStatCard label="MAU" metric={data?.mau} format={fmtNum} loading={loading} color="#3b82f6" helperText="Aylık aktif" />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2.4}>
          <ExecutiveStatCard label="Yeni Kayıt" metric={data?.newSignups} format={fmtNum} loading={loading} helperText="Son 30 gün" />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2.4}>
          <ExecutiveStatCard label="K-Faktörü" metric={data?.kFactor} format={fmtFactor} loading={loading} helperText="Viral katsayı" />
        </Grid>
      </Grid>

      {data?.retention && (
        <Box sx={{ mt: 3, p: 2.5, borderRadius: 2, bgcolor: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.05)' }}>
          <Typography sx={{ fontSize: 11, letterSpacing: 1.2, fontWeight: 700, color: 'rgba(30,41,59,0.60)', textTransform: 'uppercase', mb: 2 }}>
            Retention Eğrisi
          </Typography>
          <Grid container spacing={3}>
            {[
              { label: 'D1', value: data.retention.d1, color: '#22c55e' },
              { label: 'D7', value: data.retention.d7, color: '#3b82f6' },
              { label: 'D30', value: data.retention.d30, color: '#C9A227' },
            ].map(r => (
              <Grid item xs={4} key={r.label}>
                <Stack alignItems="center" spacing={0.5}>
                  <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'rgba(30,41,59,0.60)', letterSpacing: 1 }}>
                    {r.label}
                  </Typography>
                  <Typography sx={{
                    fontFamily: 'inherit', fontStyle: 'normal',
                    fontSize: 26, fontWeight: 700, color: r.color, lineHeight: 1,
                  }}>
                    {r.value != null ? `%${r.value.toFixed(1)}` : '—'}
                  </Typography>
                </Stack>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </SectionCard>
  );
}
