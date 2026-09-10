import { Grid } from '@mui/material';
import { EventAvailable as EventIcon } from '@mui/icons-material';
import SectionCard from '../components/SectionCard';
import SectionHeader from '../components/SectionHeader';
import ExecutiveStatCard from '../components/ExecutiveStatCard';
import type { OperationalKpi } from '../../../services/executive/executiveTypes';

interface Props {
  data: OperationalKpi | null;
  loading: boolean;
  partial: boolean;
}

const fmtNum = (v: number) => v.toLocaleString('tr-TR');
const fmtPct = (v: number) => `%${v.toFixed(1)}`;

export default function OperationalSection({ data, loading, partial }: Props) {
  return (
    <SectionCard partial={partial} partialMessage="Operasyonel metrikler etkinlik listesinden türetildi. Anlık zaman serisi için /admin/executive/operational endpoint'i gerekli.">
      <SectionHeader
        title="Operasyonel Sağlık"
        subtitle="Aktif etkinlik, yaklaşan 72 saat, doluluk"
        icon={<EventIcon sx={{ fontSize: 20 }} />}
        refreshLabel="1dk"
        accent="#8b5cf6"
      />

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={4} lg={2.4}>
          <ExecutiveStatCard
            label="Aktif Etkinlik"
            metric={{ value: data?.activeEvents ?? 0 }}
            format={fmtNum}
            loading={loading}
            color="#8b5cf6"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2.4}>
          <ExecutiveStatCard
            label="Yaklaşan • 72sa"
            metric={{ value: data?.upcomingEvents72h ?? 0 }}
            format={fmtNum}
            loading={loading}
            color="#C9A227"
            helperText="Önümüzdeki 3 gün"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2.4}>
          <ExecutiveStatCard
            label="Ortalama Doluluk"
            metric={data?.avgOccupancyPct}
            format={fmtPct}
            loading={loading}
            color="#22c55e"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2.4}>
          <ExecutiveStatCard
            label="İptal Oranı"
            metric={data?.cancellationRatePct}
            format={fmtPct}
            loading={loading}
            color="#ef4444"
            invertDelta
            helperText="Düşük iyi"
          />
        </Grid>
        {data?.suspiciousTicketRatePct !== undefined && (
          <Grid item xs={12} sm={6} md={4} lg={2.4}>
            <ExecutiveStatCard
              label="Sahte Bilet Oranı"
              metric={{ value: data.suspiciousTicketRatePct }}
              format={fmtPct}
              loading={loading}
              color="#ef4444"
              invertDelta
              helperText="QR doğrulama reddi"
            />
          </Grid>
        )}
      </Grid>
    </SectionCard>
  );
}
