import { useState, useMemo } from 'react';
import {
  Box, Container, Typography, Stack, IconButton, Tooltip, Chip, Alert, Button, Grid,
  ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  FiberManualRecord as DotIcon,
  Lock as LockIcon,
  AccountBalance as FinanceIcon,
} from '@mui/icons-material';
import { Navigate } from 'react-router-dom';
import { useRole } from '../../hooks/useRole';
import { useFinanceOverview } from './useFinanceOverview';
import PnlWaterfall from './components/PnlWaterfall';
import KpiTile from './components/KpiTile';
import RevenueChart from './components/RevenueChart';
import BreakdownTable from './components/BreakdownTable';
import TopEventsTable from './components/TopEventsTable';
import { formatMoney, formatPct, toNumber } from './components/formatters';
import type { FinanceRange } from '../../services/financeOverview/financeOverviewTypes';

const RANGES: { key: FinanceRange; label: string }[] = [
  { key: '24h', label: '24s' },
  { key: '7d', label: '7G' },
  { key: '30d', label: '30G' },
  { key: '90d', label: '90G' },
  { key: 'ytd', label: 'YTD' },
];

export default function FinanceOverview() {
  const { isAdmin, userName } = useRole();
  const [range, setRange] = useState<FinanceRange>('30d');
  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useFinanceOverview(range);

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const currency = data?.currency || 'TRY';

  const lastUpdated = useMemo(() => {
    if (!dataUpdatedAt) return '—';
    const diff = Date.now() - dataUpdatedAt;
    if (diff < 60_000) return `${Math.round(diff / 1000)}sn önce`;
    if (diff < 3_600_000) return `${Math.round(diff / 60_000)}dk önce`;
    return new Date(dataUpdatedAt).toLocaleTimeString('tr-TR');
  }, [dataUpdatedAt, isFetching]);

  const hasData = !isLoading && !!data;

  const currencyRows = (data?.byCurrency || []).map(c => ({
    key: c.currency,
    label: c.currency,
    value: formatMoney(c.grossAmount, c.currency),
    sharePct: c.sharePct,
    meta: `${c.orderCount.toLocaleString('tr-TR')} sipariş`,
  }));

  const methodRows = (data?.byPaymentMethod || []).map(m => ({
    key: m.method,
    label: m.method,
    value: formatMoney(m.amount, currency),
    sharePct: m.sharePct,
    meta: `${m.count.toLocaleString('tr-TR')} işlem`,
  }));

  return (
    <Box
      sx={{
        minHeight: 'calc(100vh - 64px)',
        bgcolor: '#FAFAFA',
        color: '#1E293B',
        mx: { xs: -2, sm: -3 },
        my: -3,
        py: 4,
      }}
    >
      <Container maxWidth="xl">
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'flex-end' }} spacing={2}>
            <Box>
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.5 }}>
                <LockIcon sx={{ fontSize: 16, color: '#C9A227' }} />
                <Typography sx={{ fontSize: 10, letterSpacing: 2, fontWeight: 800, color: '#C9A227', textTransform: 'uppercase' }}>
                  Finance Overview • Yalnızca Admin
                </Typography>
              </Stack>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{
                  width: 48, height: 48, borderRadius: 2,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  bgcolor: 'rgba(201,162,39,0.15)', color: '#C9A227',
                }}>
                  <FinanceIcon sx={{ fontSize: 28 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontFamily: 'inherit', fontStyle: 'normal', fontSize: { xs: 28, md: 38 }, fontWeight: 700, lineHeight: 1, color: '#1E293B' }}>
                    Finansal Genel Bakış
                  </Typography>
                  <Typography sx={{ mt: 0.5, fontSize: 13, color: 'rgba(30,41,59,0.70)' }}>
                    {userName} — para nereden geliyor, nereye gidiyor, platformda ne kalıyor
                  </Typography>
                </Box>
              </Stack>
            </Box>

            <Stack direction="row" spacing={1.5} alignItems="center">
              <Chip
                icon={<DotIcon sx={{ fontSize: '10px !important', color: `${isFetching ? '#f59e0b' : '#22c55e'} !important` }} />}
                label={isFetching ? 'güncelleniyor' : `son: ${lastUpdated}`}
                size="small"
                sx={{
                  bgcolor: 'rgba(0,0,0,0.03)',
                  color: 'rgba(30,41,59,0.80)',
                  fontSize: 11,
                  fontWeight: 600,
                  height: 26,
                  border: '1px solid rgba(0,0,0,0.06)',
                }}
              />
              <ToggleButtonGroup
                size="small"
                value={range}
                exclusive
                onChange={(_, v) => v && setRange(v)}
                sx={{
                  bgcolor: 'rgba(0,0,0,0.03)',
                  border: '1px solid rgba(201,162,39,0.2)',
                  '& .MuiToggleButton-root': {
                    color: 'rgba(30,41,59,0.60)',
                    fontSize: 11,
                    fontWeight: 700,
                    px: 1.5,
                    py: 0.5,
                    border: 'none',
                    textTransform: 'none',
                    letterSpacing: 0.5,
                    '&.Mui-selected': {
                      bgcolor: 'rgba(201,162,39,0.18)',
                      color: '#C9A227',
                      '&:hover': { bgcolor: 'rgba(201,162,39,0.22)' },
                    },
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.05)' },
                  },
                }}
              >
                {RANGES.map(r => (
                  <ToggleButton key={r.key} value={r.key}>{r.label}</ToggleButton>
                ))}
              </ToggleButtonGroup>
              <Tooltip title="Yenile" arrow>
                <IconButton onClick={() => refetch()} size="small" sx={{ color: '#C9A227', border: '1px solid rgba(201,162,39,0.2)' }}>
                  <RefreshIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        </Box>

        {/* Missing data warning */}
        {!isLoading && !data && (
          <Alert
            severity="info"
            icon={false}
            sx={{
              mb: 3,
              bgcolor: 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.25)',
              color: 'rgba(30,41,59,0.85)',
            }}
            action={
              <Button size="small" onClick={() => refetch()} sx={{ color: '#C9A227', fontSize: 11, fontWeight: 700 }}>
                Tekrar Dene
              </Button>
            }
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: '#f59e0b' }}>
                BACKEND YANIT VERMEDİ
              </Typography>
              <Typography sx={{ fontSize: 12 }}>
                <code style={{ fontFamily: 'monospace', fontSize: 11 }}>/finance/admin/overview</code> endpoint'ine ulaşılamadı.
              </Typography>
            </Stack>
          </Alert>
        )}

        {/* KPI row */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <KpiTile
              label="Brüt Gelir"
              value={hasData ? formatMoney(data?.grossRevenue?.value, currency) : undefined}
              deltaPct={data?.grossRevenue?.deltaPct}
              loading={isLoading}
              color="#22c55e"
              subtitle="GMV"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <KpiTile
              label="Net Kâr"
              value={hasData ? formatMoney(data?.netRevenue?.value, currency) : undefined}
              deltaPct={data?.netRevenue?.deltaPct}
              loading={isLoading}
              color="#C9A227"
              subtitle="platformda kalan"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <KpiTile
              label="Platform Ücreti"
              value={hasData ? formatMoney(data?.platformFee?.value, currency) : undefined}
              deltaPct={data?.platformFee?.deltaPct}
              loading={isLoading}
              color="#8b5cf6"
              subtitle="%8 komisyon"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <KpiTile
              label="Marj"
              value={hasData ? formatPct(data?.marginPct?.value, 1) : undefined}
              deltaPct={data?.marginPct?.deltaPct}
              loading={isLoading}
              color="#3b82f6"
              subtitle="net / brüt"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <KpiTile
              label="İade Oranı"
              value={hasData ? formatPct(data?.refundRate?.value, 2) : undefined}
              deltaPct={data?.refundRate?.deltaPct}
              loading={isLoading}
              color="#ef4444"
              invertDelta
              subtitle="düşük iyi"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <KpiTile
              label="Chargeback"
              value={hasData && data?.chargebackRate !== undefined ? formatPct(data?.chargebackRate?.value, 2) : 'n/a'}
              deltaPct={data?.chargebackRate?.deltaPct}
              loading={isLoading}
              color="#f59e0b"
              invertDelta
              subtitle="itiraz oranı"
            />
          </Grid>
        </Grid>

        {/* P&L Waterfall + Chart */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} lg={6}>
            <PnlWaterfall data={data?.pnl} currency={currency} loading={isLoading} />
          </Grid>
          <Grid item xs={12} lg={6}>
            <RevenueChart data={data?.dailySeries} currency={currency} loading={isLoading} />
          </Grid>
        </Grid>

        {/* Breakdowns */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <BreakdownTable
              title="Para Birimi"
              rows={currencyRows}
              loading={isLoading}
              accentColor="#22c55e"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <BreakdownTable
              title="Ödeme Yöntemi"
              rows={methodRows}
              loading={isLoading}
              accentColor="#C9A227"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <BreakdownTable
              title="Etkinlik Tipi"
              loading={isLoading}
              rows={
                data?.byEventType
                  ? [
                      {
                        key: 'paid',
                        label: 'Ücretli etkinlikler',
                        value: formatMoney(data.byEventType.paidGross, currency),
                        meta: `${data.byEventType.paidCount.toLocaleString('tr-TR')} sipariş`,
                        sharePct: 100,
                      },
                      {
                        key: 'free',
                        label: 'Ücretsiz etkinlikler',
                        value: `${toNumber(data.byEventType.freeCount).toLocaleString('tr-TR')} katılım`,
                        sharePct: 0,
                      },
                    ]
                  : undefined
              }
              accentColor="#8b5cf6"
            />
          </Grid>
        </Grid>

        {/* Top events */}
        <TopEventsTable rows={data?.topEvents} currency={currency} loading={isLoading} />

        {/* Footer */}
        <Box sx={{ mt: 5, pt: 3, borderTop: '1px solid rgba(0,0,0,0.05)', textAlign: 'center' }}>
          <Typography sx={{ fontSize: 10, letterSpacing: 2, fontWeight: 700, color: 'rgba(30,41,59,0.35)' }}>
            NARTGO FINANCE • {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
