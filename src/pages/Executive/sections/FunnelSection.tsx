import { Box, Typography, Stack, Skeleton } from '@mui/material';
import { FilterAlt as FunnelIcon } from '@mui/icons-material';
import SectionCard from '../components/SectionCard';
import SectionHeader from '../components/SectionHeader';
import FunnelBar from '../components/FunnelBar';
import type { FunnelKpi } from '../../../services/executive/executiveTypes';

interface Props {
  data: FunnelKpi | null;
  loading: boolean;
  partial: boolean;
}

export default function FunnelSection({ data, loading, partial }: Props) {
  return (
    <SectionCard partial={partial} partialMessage="Funnel verileri için /admin/executive/funnel endpoint'i gerekli. Kafka event topic'leri üzerinden agregasyon yapılmalı.">
      <SectionHeader
        title="Dönüşüm Hunisi"
        subtitle="Görüntüleme → Sepet → Ödeme → Teslim"
        icon={<FunnelIcon sx={{ fontSize: 20 }} />}
        refreshLabel="5dk"
        accent="#C9A227"
      />

      {loading ? (
        <Stack spacing={1.5}>
          {[1, 2, 3, 4, 5].map(i => (
            <Box key={i}>
              <Skeleton variant="text" width="30%" height={14} sx={{ bgcolor: 'rgba(0,0,0,0.05)' }} />
              <Skeleton variant="rectangular" width={`${100 - i * 15}%`} height={22} sx={{ bgcolor: 'rgba(0,0,0,0.05)', borderRadius: 0.75, mt: 0.5 }} />
            </Box>
          ))}
        </Stack>
      ) : data ? (
        <>
          <Box sx={{ mb: 3, p: 2, borderRadius: 2, bgcolor: 'rgba(201,162,39,0.08)', border: '1px solid rgba(201,162,39,0.18)' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography sx={{ fontSize: 11, letterSpacing: 1.2, fontWeight: 700, color: 'rgba(30,41,59,0.75)' }}>
                TOPLAM DÖNÜŞÜM
              </Typography>
              <Typography sx={{ fontFamily: 'inherit', fontStyle: 'normal', fontSize: 28, fontWeight: 700, color: '#C9A227', lineHeight: 1 }}>
                {data.conversionOverall != null ? `%${data.conversionOverall.toFixed(2)}` : '—'}
              </Typography>
            </Stack>
          </Box>
          <FunnelBar steps={data.steps} />
        </>
      ) : (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <Typography sx={{ fontSize: 13, color: 'rgba(30,41,59,0.45)', fontStyle: 'normal' }}>
            Funnel verisi yok. Kafka event agregasyonu aktif değil.
          </Typography>
        </Box>
      )}
    </SectionCard>
  );
}
