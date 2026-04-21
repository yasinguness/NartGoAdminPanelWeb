import { Paper, Typography, Stack, Grid, Box, Skeleton } from '@mui/material';
import type { UserOrdersSummary } from '../../../services/user360/user360Types';
import { formatMoney, safeDate, toNumber } from './helpers';

interface Props {
  data?: UserOrdersSummary | null;
  loading?: boolean;
}

export default function LtvCard({ data, loading }: Props) {
  const currency = data?.currency || 'TRY';

  return (
    <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, bgcolor: '#FFFFFF', borderColor: 'rgba(201,162,39,0.12)' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 2 }}>
        <Typography sx={{ fontSize: 11, letterSpacing: 1.5, fontWeight: 700, color: 'rgba(30,41,59,0.60)', textTransform: 'uppercase' }}>
          Müşteri Değeri (LTV)
        </Typography>
        {data && (
          <Typography sx={{ fontSize: 10, color: 'rgba(30,41,59,0.45)', fontStyle: 'normal' }}>
            {data.totalOrders} sipariş · {data.paidOrders} ödendi · {data.refundedOrders} iade
          </Typography>
        )}
      </Stack>

      {loading ? (
        <Skeleton variant="rectangular" height={120} sx={{ bgcolor: 'rgba(0,0,0,0.03)', borderRadius: 1 }} />
      ) : !data ? (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography sx={{ fontSize: 13, color: 'rgba(30,41,59,0.45)', fontStyle: 'normal' }}>
            Henüz sipariş yok
          </Typography>
        </Box>
      ) : (
        <>
          <Grid container spacing={2}>
            <Grid item xs={6} md={3}>
              <LtvTile
                label="Toplam Harcama"
                value={formatMoney(data.lifetimeGrossAmount, currency)}
                color="#22c55e"
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <LtvTile
                label="Platformdan Net"
                value={formatMoney(data.lifetimeNetAmount, currency)}
                color="#C9A227"
                subtitle="bu user'dan kazanç"
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <LtvTile
                label="Ortalama Sipariş"
                value={formatMoney(data.averageOrderValue, currency)}
                color="#3b82f6"
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <LtvTile
                label="İade Oranı"
                value={data.paidOrders > 0
                  ? `%${((data.refundedOrders / data.paidOrders) * 100).toFixed(1)}`
                  : '—'}
                color={toNumber(data.refundedOrders) > 0 ? '#ef4444' : '#64748b'}
                subtitle={data.refundedOrders > 0 ? 'Risk göstergesi' : 'Hiç iade yok'}
              />
            </Grid>
          </Grid>

          <Stack direction="row" spacing={3} sx={{ mt: 3, pt: 2, borderTop: '1px solid rgba(0,0,0,0.05)' }}>
            <InfoPair label="İlk sipariş" value={safeDate(data.firstOrderAt)} />
            <InfoPair label="Son sipariş" value={safeDate(data.lastOrderAt)} />
          </Stack>
        </>
      )}
    </Paper>
  );
}

function LtvTile({ label, value, color, subtitle }: { label: string; value: string; color: string; subtitle?: string }) {
  return (
    <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.05)' }}>
      <Typography sx={{ fontSize: 9, letterSpacing: 1, fontWeight: 700, color: 'rgba(30,41,59,0.55)', textTransform: 'uppercase' }}>
        {label}
      </Typography>
      <Typography sx={{
        fontFamily: 'inherit',
        fontStyle: 'normal',
        fontSize: 20,
        fontWeight: 700,
        color,
        lineHeight: 1.2,
        mt: 0.5,
      }}>
        {value}
      </Typography>
      {subtitle && (
        <Typography sx={{ fontSize: 9, color: 'rgba(30,41,59,0.45)', mt: 0.5, fontStyle: 'normal' }}>
          {subtitle}
        </Typography>
      )}
    </Box>
  );
}

function InfoPair({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography sx={{ fontSize: 9, letterSpacing: 1, fontWeight: 700, color: 'rgba(30,41,59,0.45)', textTransform: 'uppercase' }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 11, color: '#1E293B', fontFamily: 'monospace' }}>
        {value}
      </Typography>
    </Box>
  );
}
