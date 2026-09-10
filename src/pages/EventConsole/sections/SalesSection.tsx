import { useEffect, useState } from 'react';
import {
  Box, Paper, Typography, Stack, Grid, alpha, useTheme, LinearProgress, Skeleton, Divider,
} from '@mui/material';
import {
  TrendingUp as SalesIcon, Payments as RevenueIcon,
  ReceiptLong as OrdersIcon, MoneyOff as RefundIcon,
  Schedule as PendingIcon, Group as AttendeesIcon,
} from '@mui/icons-material';
import { EventResponseDTO } from '../../../types/events/eventModel';
import { ticketService } from '../../../services/ticket/ticketService';

interface SalesMetrics {
  totalOrders: number;
  paidOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  refundedOrders: number;
  grossRevenue: number;
  refundedAmount: number;
  netRevenue: number;
  ticketsSold: number;
  avgOrderValue: number;
  currency: string;
  byDay: Array<{ date: string; revenue: number; orders: number }>;
  topDay?: { date: string; revenue: number };
}

function isoDay(iso?: string): string {
  if (!iso) return '';
  try { return new Date(iso).toISOString().slice(0, 10); } catch { return ''; }
}

export default function SalesSection({ event }: { event: EventResponseDTO }) {
  const theme = useTheme();
  const [metrics, setMetrics] = useState<SalesMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    ticketService.getEventOrders(event.id)
      .then(res => {
        const orders: any[] = (res.success && Array.isArray(res.data)) ? res.data : [];
        setMetrics(computeMetrics(orders));
      })
      .catch(() => setMetrics(computeMetrics([])))
      .finally(() => setLoading(false));
  }, [event.id]);

  const capacity = event.maxParticipants || 0;
  const occupancyPct = capacity > 0 && metrics
    ? Math.min(100, Math.round((metrics.ticketsSold / capacity) * 100))
    : 0;

  return (
    <Stack spacing={2}>
      {/* ━━━ KPI Grid ━━━ */}
      <Grid container spacing={2}>
        <KpiTile
          icon={<OrdersIcon />}
          label="Toplam Sipariş"
          value={loading ? null : metrics?.totalOrders}
          sub={loading ? null : `${metrics?.paidOrders ?? 0} ödendi · ${metrics?.pendingOrders ?? 0} beklemede`}
          color={theme.palette.primary.main}
        />
        <KpiTile
          icon={<AttendeesIcon />}
          label="Satılan Bilet"
          value={loading ? null : metrics?.ticketsSold}
          sub={capacity > 0 ? `/ ${capacity} kapasite` : undefined}
          color={theme.palette.info.main}
        />
        <KpiTile
          icon={<RevenueIcon />}
          label="Brüt Gelir"
          valueStr={loading ? null : `${Math.round(metrics?.grossRevenue || 0).toLocaleString('tr-TR')} ₺`}
          sub={loading ? null : `Ort. sipariş ${Math.round(metrics?.avgOrderValue || 0).toLocaleString('tr-TR')} ₺`}
          color={theme.palette.success.main}
        />
        <KpiTile
          icon={<RefundIcon />}
          label="İade"
          valueStr={loading ? null : `${Math.round(metrics?.refundedAmount || 0).toLocaleString('tr-TR')} ₺`}
          sub={loading ? null : `${metrics?.refundedOrders ?? 0} sipariş`}
          color={theme.palette.error.main}
        />
        <KpiTile
          icon={<SalesIcon />}
          label="Net Gelir"
          valueStr={loading ? null : `${Math.round(metrics?.netRevenue || 0).toLocaleString('tr-TR')} ₺`}
          sub="Brüt − İade"
          color={theme.palette.warning.main}
        />
        <KpiTile
          icon={<PendingIcon />}
          label="Doluluk"
          valueStr={loading ? null : `%${occupancyPct}`}
          sub={capacity > 0 ? undefined : 'Kapasite tanımsız'}
          color={occupancyPct > 80 ? theme.palette.error.main : theme.palette.primary.main}
        />
      </Grid>

      {/* ━━━ Occupancy Progress ━━━ */}
      {capacity > 0 && (
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 1 }}>
            <Box>
              <Typography variant="caption" sx={{ letterSpacing: 1.2, fontSize: 10, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>
                Bilet Doluluğu
              </Typography>
              <Typography variant="h6" sx={{ fontFamily: 'serif', fontStyle: 'normal', fontWeight: 700, lineHeight: 1, mt: 0.5 }}>
                {loading ? <Skeleton width={80} /> : `${metrics?.ticketsSold ?? 0} / ${capacity}`}
              </Typography>
            </Box>
            <Typography sx={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 20, color: occupancyPct > 80 ? 'error.main' : 'primary.main' }}>
              %{occupancyPct}
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate" value={occupancyPct}
            sx={{
              height: 8, borderRadius: 4,
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              '& .MuiLinearProgress-bar': {
                bgcolor: occupancyPct >= 100 ? theme.palette.error.main : occupancyPct > 80 ? theme.palette.warning.main : theme.palette.primary.main,
                borderRadius: 4,
              },
            }}
          />
        </Paper>
      )}

      {/* ━━━ Günlük satış trendi (simple inline bars) ━━━ */}
      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 2 }}>
          <Box>
            <Typography variant="caption" sx={{ letterSpacing: 1.2, fontSize: 10, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>
              Günlük Satış Trendi
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {loading
                ? <Skeleton width={180} />
                : metrics && metrics.byDay.length > 0
                  ? `${metrics.byDay.length} gün · En yoğun: ${metrics.topDay ? `${metrics.topDay.date} (${Math.round(metrics.topDay.revenue).toLocaleString('tr-TR')} ₺)` : '—'}`
                  : 'Henüz satış yok'}
            </Typography>
          </Box>
        </Stack>
        {loading ? (
          <Skeleton variant="rectangular" height={120} />
        ) : !metrics || metrics.byDay.length === 0 ? (
          <Box sx={{ py: 3, textAlign: 'center' }}>
            <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'normal' }}>
              Grafik için veri yok
            </Typography>
          </Box>
        ) : (
          <DailyBarChart data={metrics.byDay} color={theme.palette.primary.main} />
        )}
      </Paper>

      {/* ━━━ Durum Dağılımı ━━━ */}
      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
        <Typography variant="caption" sx={{ letterSpacing: 1.2, fontSize: 10, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', mb: 1.5, display: 'block' }}>
          Sipariş Durum Dağılımı
        </Typography>
        {loading ? (
          <Skeleton variant="rectangular" height={36} />
        ) : !metrics || metrics.totalOrders === 0 ? (
          <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'normal' }}>Henüz sipariş yok</Typography>
        ) : (
          <>
            <StatusBar segments={[
              { label: 'Ödenen', value: metrics.paidOrders, color: theme.palette.success.main },
              { label: 'Bekleyen', value: metrics.pendingOrders, color: theme.palette.warning.main },
              { label: 'İptal', value: metrics.cancelledOrders, color: theme.palette.action.disabled },
              { label: 'İade', value: metrics.refundedOrders, color: theme.palette.error.main },
            ]} total={metrics.totalOrders} />
            <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mt: 2 }}>
              {[
                { label: 'Ödenen', value: metrics.paidOrders, color: theme.palette.success.main },
                { label: 'Bekleyen', value: metrics.pendingOrders, color: theme.palette.warning.main },
                { label: 'İptal', value: metrics.cancelledOrders, color: theme.palette.action.disabled },
                { label: 'İade', value: metrics.refundedOrders, color: theme.palette.error.main },
              ].map(s => (
                <Stack key={s.label} direction="row" spacing={0.75} alignItems="center">
                  <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: s.color }} />
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>{s.label}: {s.value}</Typography>
                </Stack>
              ))}
            </Stack>
          </>
        )}
      </Paper>

      {/* Alt açıklayıcı */}
      <Divider sx={{ my: 1 }} />
      <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'normal', textAlign: 'center' }}>
        Detaylı sipariş tablosu, iade işlemleri ve indirim kodları için <strong>Siparişler & Katılımcılar</strong> sekmesini kullanın.
      </Typography>
    </Stack>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────

function computeMetrics(orders: any[]): SalesMetrics {
  const paid = orders.filter(o => ['PAID', 'COMPLETED'].includes(o.status));
  const pending = orders.filter(o => o.status === 'PENDING');
  const cancelled = orders.filter(o => o.status === 'CANCELLED');
  const refunded = orders.filter(o => o.status === 'REFUNDED');

  const grossRevenue = paid.reduce((s, o) => s + (Number(o.totalAmount) || 0), 0)
    + refunded.reduce((s, o) => s + (Number(o.totalAmount) || 0), 0);
  const refundedAmount = refunded.reduce((s, o) => s + (Number(o.totalAmount) || 0), 0);
  const netRevenue = grossRevenue - refundedAmount;

  const ticketsSold = [...paid, ...refunded].reduce((s, o) => {
    const qty = Array.isArray(o.items)
      ? o.items.reduce((q: number, it: any) => q + (Number(it.quantity) || 0), 0)
      : 1;
    return s + qty;
  }, 0);

  const avgOrderValue = paid.length > 0 ? grossRevenue / paid.length : 0;

  // Günlük agregasyon
  const dayMap = new Map<string, { revenue: number; orders: number }>();
  paid.forEach(o => {
    const d = isoDay(o.paidAt || o.createdAt);
    if (!d) return;
    const prev = dayMap.get(d) || { revenue: 0, orders: 0 };
    dayMap.set(d, {
      revenue: prev.revenue + (Number(o.totalAmount) || 0),
      orders: prev.orders + 1,
    });
  });
  const byDay = Array.from(dayMap.entries())
    .map(([date, v]) => ({ date, revenue: v.revenue, orders: v.orders }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const topDay = byDay.length > 0
    ? byDay.reduce((max, d) => (d.revenue > max.revenue ? d : max), byDay[0])
    : undefined;

  const currency = orders[0]?.currency || 'TRY';

  return {
    totalOrders: orders.length,
    paidOrders: paid.length,
    pendingOrders: pending.length,
    cancelledOrders: cancelled.length,
    refundedOrders: refunded.length,
    grossRevenue,
    refundedAmount,
    netRevenue,
    ticketsSold,
    avgOrderValue,
    currency,
    byDay,
    topDay,
  };
}

// ─── Sub-components ───────────────────────────────────────────────────

function KpiTile({ icon, label, value, valueStr, sub, color }: {
  icon: React.ReactNode; label: string;
  value?: number | null; valueStr?: string | null;
  sub?: string | null; color: string;
}) {
  const displayValue = valueStr ?? (value !== null && value !== undefined ? value.toLocaleString('tr-TR') : null);
  return (
    <Grid item xs={6} md={4} lg={2}>
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <Box sx={{
            width: 28, height: 28, borderRadius: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: alpha(color, 0.12), color,
            '& svg': { fontSize: 16 },
          }}>
            {icon}
          </Box>
          <Typography variant="caption" sx={{ fontSize: 10, letterSpacing: 0.8, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>
            {label}
          </Typography>
        </Stack>
        {displayValue === null ? (
          <Skeleton width="70%" height={28} />
        ) : (
          <Typography sx={{ fontFamily: 'serif', fontStyle: 'normal', fontSize: 22, fontWeight: 700, color, lineHeight: 1 }}>
            {displayValue}
          </Typography>
        )}
        {sub && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, fontSize: 10, display: 'block' }}>
            {sub}
          </Typography>
        )}
      </Paper>
    </Grid>
  );
}

function StatusBar({ segments, total }: {
  segments: Array<{ label: string; value: number; color: string }>;
  total: number;
}) {
  return (
    <Box sx={{ display: 'flex', height: 24, borderRadius: 1, overflow: 'hidden', bgcolor: 'action.hover' }}>
      {segments.map((s, i) => {
        const pct = total > 0 ? (s.value / total) * 100 : 0;
        if (pct === 0) return null;
        return (
          <Box
            key={i}
            title={`${s.label}: ${s.value} (${pct.toFixed(1)}%)`}
            sx={{
              width: `${pct}%`, bgcolor: s.color,
              transition: 'width 200ms ease',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 10, fontWeight: 700, fontFamily: 'monospace',
            }}
          >
            {pct > 8 && `${Math.round(pct)}%`}
          </Box>
        );
      })}
    </Box>
  );
}

function DailyBarChart({ data, color }: { data: Array<{ date: string; revenue: number; orders: number }>; color: string }) {
  const max = Math.max(...data.map(d => d.revenue), 1);
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.5, height: 100, mt: 1 }}>
      {data.map(d => {
        const h = Math.max(2, (d.revenue / max) * 92);
        return (
          <Box
            key={d.date}
            title={`${d.date}: ${Math.round(d.revenue).toLocaleString('tr-TR')} ₺ · ${d.orders} sipariş`}
            sx={{
              flex: 1, minWidth: 3, maxWidth: 24,
              height: `${h}%`,
              bgcolor: color,
              borderRadius: '2px 2px 0 0',
              opacity: 0.85,
              transition: 'opacity 150ms, transform 150ms',
              '&:hover': { opacity: 1, transform: 'scaleY(1.05)', transformOrigin: 'bottom' },
              cursor: 'help',
            }}
          />
        );
      })}
    </Box>
  );
}
