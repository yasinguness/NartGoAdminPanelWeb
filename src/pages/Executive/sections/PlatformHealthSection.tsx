import { Grid, Box, Stack, Typography, Skeleton } from '@mui/material';
import { MonitorHeart as HealthIcon } from '@mui/icons-material';
import SectionCard from '../components/SectionCard';
import SectionHeader from '../components/SectionHeader';
import ExecutiveStatCard from '../components/ExecutiveStatCard';
import HealthDot from '../components/HealthDot';
import type { PlatformHealthKpi } from '../../../services/executive/executiveTypes';

interface Props {
  data: PlatformHealthKpi | null;
  loading: boolean;
  partial: boolean;
}

const fmtPct = (v: number) => `%${v.toFixed(2)}`;
const fmtMs = (v: number) => `${Math.round(v)} ms`;

export default function PlatformHealthSection({ data, loading, partial }: Props) {
  return (
    <SectionCard partial={partial} partialMessage="Platform sağlık metrikleri için /admin/executive/platform-health endpoint'i gerekli. Actuator + Elasticsearch entegrasyonu şart.">
      <SectionHeader
        title="Platform Sağlığı"
        subtitle="Hata oranı, ödeme başarısı, mesaj iletimi, servis durumu"
        icon={<HealthIcon sx={{ fontSize: 20 }} />}
        refreshLabel="gerçek zamanlı"
        accent="#ef4444"
      />

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <ExecutiveStatCard
            label="Hata Oranı p99"
            metric={data?.errorRateP99}
            format={fmtPct}
            loading={loading}
            color="#ef4444"
            invertDelta
            helperText="Son 1 saat"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <ExecutiveStatCard
            label="Ödeme Başarısızlık"
            metric={data?.paymentFailureRate}
            format={fmtPct}
            loading={loading}
            color="#ef4444"
            invertDelta
            helperText="Iyzico reddi"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <ExecutiveStatCard
            label="FCM İletim"
            metric={data?.fcmDeliveryRate}
            format={fmtPct}
            loading={loading}
            color="#22c55e"
            helperText="Push bildirim"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <ExecutiveStatCard
            label="Kafka Lag"
            metric={data?.kafkaLagTotal}
            format={(v) => v.toLocaleString('tr-TR')}
            loading={loading}
            color="#f59e0b"
            invertDelta
            helperText="Toplam mesaj"
          />
        </Grid>
      </Grid>

      {/* Services list */}
      <Box sx={{ mt: 3, p: 2.5, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 2 }}>
          <Typography sx={{ fontSize: 11, letterSpacing: 1.2, fontWeight: 700, color: 'rgba(243,238,224,0.6)', textTransform: 'uppercase' }}>
            Mikroservis Durumu
          </Typography>
          {data?.uptime30dPct !== undefined && (
            <Typography sx={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: data.uptime30dPct >= 99.9 ? '#22c55e' : data.uptime30dPct >= 99 ? '#f59e0b' : '#ef4444' }}>
              %{data.uptime30dPct.toFixed(2)} uptime • 30G
            </Typography>
          )}
        </Stack>

        {loading ? (
          <Grid container spacing={1}>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Grid item xs={6} sm={4} md={3} lg={2} key={i}>
                <Skeleton variant="rectangular" height={48} sx={{ bgcolor: 'rgba(255,255,255,0.06)', borderRadius: 1 }} />
              </Grid>
            ))}
          </Grid>
        ) : data?.services && data.services.length > 0 ? (
          <Grid container spacing={1}>
            {data.services.map(svc => (
              <Grid item xs={6} sm={4} md={3} lg={2} key={svc.name}>
                <Box sx={{
                  p: 1.25,
                  borderRadius: 1,
                  bgcolor: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}>
                  <HealthDot status={svc.status} label={svc.name} size={8} />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#F3EEE0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {svc.name}
                    </Typography>
                    {svc.latencyMs !== undefined && (
                      <Typography sx={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(243,238,224,0.5)' }}>
                        {fmtMs(svc.latencyMs)}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Typography sx={{ fontSize: 12, fontStyle: 'italic', color: 'rgba(243,238,224,0.4)', py: 2, textAlign: 'center' }}>
            Servis durum verisi yok
          </Typography>
        )}
      </Box>
    </SectionCard>
  );
}
