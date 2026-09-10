import { useState, useMemo } from 'react';
import {
  Box, Container, Typography, Stack, IconButton, Tooltip, Chip, Alert, Button, Grid, Paper, Skeleton,
  ToggleButtonGroup, ToggleButton, FormControlLabel, Switch,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  FiberManualRecord as DotIcon,
  Lock as LockIcon,
  FilterAlt as FunnelIcon,
  TrendingUp,
  TrendingDown,
  TrendingFlat,
} from '@mui/icons-material';
import { Navigate } from 'react-router-dom';
import { useRole } from '../../hooks/useRole';
import { useFunnelAnalytics } from './useFunnelAnalytics';
import type { TimeRange } from '../../services/executive/executiveTypes';

const PERIODS: { key: TimeRange; label: string }[] = [
  { key: '7d', label: '7G' },
  { key: '30d', label: '30G' },
  { key: '90d', label: '90G' },
  { key: 'ytd', label: 'YTD' },
];

export default function FunnelAnalytics() {
  const { isAdmin } = useRole();
  const [period, setPeriod] = useState<TimeRange>('30d');
  const [compare, setCompare] = useState(true);

  // compare period: period'tan bir önceki eşit aralık (approx: aynı range key'i önceki periyot)
  const compareRange: TimeRange | undefined = compare ? period : undefined;

  const { curQuery, prevQuery } = useFunnelAnalytics(period, compareRange);

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const current = curQuery.data;
  const previous = prevQuery.data;

  const lastUpdated = useMemo(() => {
    if (!curQuery.dataUpdatedAt) return '—';
    const diff = Date.now() - curQuery.dataUpdatedAt;
    if (diff < 60_000) return `${Math.round(diff / 1000)}sn önce`;
    if (diff < 3_600_000) return `${Math.round(diff / 60_000)}dk önce`;
    return new Date(curQuery.dataUpdatedAt).toLocaleTimeString('tr-TR');
  }, [curQuery.dataUpdatedAt]);

  const steps = current?.steps || [];
  const maxCount = Math.max(...steps.map(s => s.count), 1);

  return (
    <Box sx={{ minHeight: 'calc(100vh - 64px)', bgcolor: '#FAFAFA', color: '#1E293B', mx: { xs: -2, sm: -3 }, my: -3, py: 4 }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2}>
            <Box>
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.5 }}>
                <LockIcon sx={{ fontSize: 16, color: '#C9A227' }} />
                <Typography sx={{ fontSize: 10, letterSpacing: 2, fontWeight: 800, color: '#C9A227', textTransform: 'uppercase' }}>
                  Funnel • Conversion • Yalnızca Admin
                </Typography>
              </Stack>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{ width: 48, height: 48, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(201,162,39,0.12)', color: '#C9A227' }}>
                  <FunnelIcon sx={{ fontSize: 28 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontFamily: 'inherit', fontStyle: 'normal', fontSize: { xs: 28, md: 38 }, fontWeight: 700, lineHeight: 1, color: '#1E293B' }}>
                    Dönüşüm Hunisi
                  </Typography>
                  <Typography sx={{ mt: 0.5, fontSize: 13, color: 'rgba(30,41,59,0.70)' }}>
                    Sipariş oluşturma → Ödeme → Teslim · adım bazlı drop-off analizi
                  </Typography>
                </Box>
              </Stack>
            </Box>

            <Stack direction="row" spacing={1.5} alignItems="center">
              <FormControlLabel
                control={<Switch checked={compare} onChange={e => setCompare(e.target.checked)} size="small" />}
                label={<Typography sx={{ fontSize: 11, color: 'rgba(30,41,59,0.70)' }}>Karşılaştır</Typography>}
                sx={{ m: 0 }}
              />
              <ToggleButtonGroup
                size="small"
                value={period}
                exclusive
                onChange={(_, v) => v && setPeriod(v)}
                sx={{
                  bgcolor: 'rgba(0,0,0,0.02)',
                  border: '1px solid rgba(0,0,0,0.06)',
                  '& .MuiToggleButton-root': {
                    color: 'rgba(30,41,59,0.60)', fontSize: 11, fontWeight: 700, px: 1.5, py: 0.5, border: 'none', textTransform: 'none',
                    '&.Mui-selected': { bgcolor: 'rgba(201,162,39,0.18)', color: '#C9A227' },
                  },
                }}
              >
                {PERIODS.map(p => <ToggleButton key={p.key} value={p.key}>{p.label}</ToggleButton>)}
              </ToggleButtonGroup>
              <Chip
                icon={<DotIcon sx={{ fontSize: '10px !important', color: `${curQuery.isFetching ? '#f59e0b' : '#22c55e'} !important` }} />}
                label={curQuery.isFetching ? 'güncelleniyor' : `son: ${lastUpdated}`}
                size="small"
                sx={{ bgcolor: 'rgba(0,0,0,0.03)', color: 'rgba(30,41,59,0.80)', fontSize: 11, fontWeight: 600, height: 26, border: '1px solid rgba(0,0,0,0.06)' }}
              />
              <Tooltip title="Yenile" arrow>
                <IconButton onClick={() => { curQuery.refetch(); prevQuery.refetch(); }} size="small" sx={{ color: '#C9A227', border: '1px solid rgba(201,162,39,0.2)' }}>
                  <RefreshIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        </Box>

        {!curQuery.isLoading && !current && (
          <Alert severity="info" icon={false} sx={{ mb: 3, bgcolor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: 'rgba(30,41,59,0.85)' }}
            action={<Button size="small" onClick={() => curQuery.refetch()} sx={{ color: '#C9A227', fontSize: 11, fontWeight: 700 }}>Tekrar Dene</Button>}>
            <Typography sx={{ fontSize: 12 }}>
              <code style={{ fontFamily: 'monospace', fontSize: 11 }}>/tickets/admin/executive/funnel</code> endpoint'ine ulaşılamadı.
            </Typography>
          </Alert>
        )}

        {/* Overall conversion */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <ConversionCard
              title="Toplam Dönüşüm"
              current={current?.conversionOverall}
              previous={previous?.conversionOverall}
              loading={curQuery.isLoading}
              comparison={compare}
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <ConversionCard
              title="Giriş (Adım 1)"
              current={steps[0]?.count}
              previous={previous?.steps?.[0]?.count}
              loading={curQuery.isLoading}
              comparison={compare}
              asNumber
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <ConversionCard
              title="Teslim (Son Adım)"
              current={steps[steps.length - 1]?.count}
              previous={previous?.steps?.[steps.length - 1]?.count}
              loading={curQuery.isLoading}
              comparison={compare}
              asNumber
            />
          </Grid>
        </Grid>

        {/* Funnel visualization */}
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, bgcolor: '#FFFFFF', borderColor: 'rgba(201,162,39,0.12)', mb: 3 }}>
          <Typography sx={{ fontSize: 11, letterSpacing: 1.5, fontWeight: 700, color: 'rgba(30,41,59,0.60)', textTransform: 'uppercase', mb: 3 }}>
            Adım Akışı — genişlik dönüşüm oranıyla orantılı
          </Typography>

          {curQuery.isLoading ? (
            <Stack spacing={1.5}>
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} variant="rectangular" height={52} sx={{ bgcolor: 'rgba(0,0,0,0.03)', borderRadius: 1 }} />
              ))}
            </Stack>
          ) : steps.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography sx={{ fontSize: 12, color: 'rgba(30,41,59,0.45)', fontStyle: 'normal' }}>
                Funnel verisi yok — seçilen periyotta sipariş yok
              </Typography>
            </Box>
          ) : (
            <Stack spacing={2}>
              {steps.map((step, idx) => {
                const widthPct = Math.max(10, (step.count / maxCount) * 100);
                const prevStep = idx > 0 ? steps[idx - 1] : null;
                const dropoff = prevStep && prevStep.count > 0
                  ? ((prevStep.count - step.count) / prevStep.count) * 100
                  : 0;
                const conversionFromPrev = prevStep && prevStep.count > 0
                  ? (step.count / prevStep.count) * 100
                  : 100;

                const prevCount = previous?.steps?.[idx]?.count;
                const countDelta = prevCount !== undefined && prevCount > 0
                  ? ((step.count - prevCount) / prevCount) * 100
                  : undefined;

                return (
                  <Box key={step.key}>
                    <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 0.75 }}>
                      <Stack direction="row" spacing={1} alignItems="baseline">
                        <Chip label={idx + 1} size="small" sx={{ bgcolor: 'rgba(201,162,39,0.15)', color: '#C9A227', fontSize: 11, fontWeight: 800, minWidth: 26, height: 22 }} />
                        <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#1E293B' }}>
                          {step.label}
                        </Typography>
                        {idx > 0 && (
                          <Typography sx={{ fontSize: 11, fontWeight: 700, color: conversionFromPrev > 75 ? '#22c55e' : conversionFromPrev > 50 ? '#C9A227' : '#ef4444' }}>
                            · %{conversionFromPrev.toFixed(1)} geçiş
                          </Typography>
                        )}
                      </Stack>
                      <Stack direction="row" spacing={2} alignItems="baseline">
                        {countDelta !== undefined && compare && (
                          <Tooltip title="Geçen döneme göre" arrow>
                            <Stack direction="row" spacing={0.25} alignItems="center" sx={{ color: Math.abs(countDelta) < 0.5 ? 'text.secondary' : countDelta > 0 ? 'success.main' : 'error.main' }}>
                              {Math.abs(countDelta) < 0.5 ? <TrendingFlat sx={{ fontSize: 12 }} /> : countDelta > 0 ? <TrendingUp sx={{ fontSize: 12 }} /> : <TrendingDown sx={{ fontSize: 12 }} />}
                              <Typography sx={{ fontSize: 10, fontWeight: 700 }}>
                                {countDelta > 0 ? '+' : ''}{countDelta.toFixed(1)}%
                              </Typography>
                            </Stack>
                          </Tooltip>
                        )}
                        <Typography sx={{ fontSize: 14, fontFamily: 'monospace', fontWeight: 800, color: '#1E293B' }}>
                          {step.count.toLocaleString('tr-TR')}
                        </Typography>
                        {idx > 0 && dropoff > 0 && (
                          <Typography sx={{ fontSize: 11, fontWeight: 700, color: dropoff > 50 ? '#ef4444' : dropoff > 25 ? '#f59e0b' : 'rgba(30,41,59,0.55)' }}>
                            ↓{dropoff.toFixed(0)}%
                          </Typography>
                        )}
                      </Stack>
                    </Stack>
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                      <Box
                        sx={{
                          height: 32,
                          width: `${widthPct}%`,
                          borderRadius: 1,
                          background: `linear-gradient(90deg, #C9A227 0%, rgba(201,162,39,${Math.max(0.3, 1 - idx * 0.15)}) 100%)`,
                          transition: 'width 400ms ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#FFFFFF',
                          fontFamily: 'monospace',
                          fontWeight: 800,
                          fontSize: 11,
                          letterSpacing: 0.5,
                        }}
                      >
                        {idx === 0 ? '%100' : `%${((step.count / steps[0].count) * 100).toFixed(1)}`}
                      </Box>
                    </Box>
                  </Box>
                );
              })}
            </Stack>
          )}
        </Paper>

        {/* Step-by-step detail table */}
        {steps.length > 0 && (
          <Paper variant="outlined" sx={{ borderRadius: 2, bgcolor: '#FFFFFF', borderColor: 'rgba(201,162,39,0.12)', overflow: 'hidden' }}>
            <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
              <Typography sx={{ fontSize: 11, letterSpacing: 1.5, fontWeight: 700, color: 'rgba(30,41,59,0.60)', textTransform: 'uppercase' }}>
                Adım Detayı
              </Typography>
            </Box>
            <Box sx={{ p: 2 }}>
              <Grid container spacing={2}>
                {steps.map((step, idx) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={step.key}>
                    <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.05)' }}>
                      <Stack direction="row" spacing={1} alignItems="baseline" sx={{ mb: 1 }}>
                        <Chip label={idx + 1} size="small" sx={{ bgcolor: 'rgba(201,162,39,0.15)', color: '#C9A227', fontSize: 10, fontWeight: 800, minWidth: 22, height: 18 }} />
                        <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'rgba(30,41,59,0.80)' }}>
                          {step.label}
                        </Typography>
                      </Stack>
                      <Typography sx={{ fontFamily: 'inherit', fontStyle: 'normal', fontSize: 22, fontWeight: 700, color: '#C9A227', lineHeight: 1 }}>
                        {step.count.toLocaleString('tr-TR')}
                      </Typography>
                      {step.dropOffPct !== undefined && step.dropOffPct > 0 && (
                        <Typography sx={{ mt: 0.5, fontSize: 10, color: step.dropOffPct > 50 ? '#ef4444' : step.dropOffPct > 25 ? '#f59e0b' : 'rgba(30,41,59,0.55)', fontWeight: 700 }}>
                          Drop-off: %{step.dropOffPct.toFixed(1)}
                        </Typography>
                      )}
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Paper>
        )}

        <Box sx={{ mt: 5, pt: 3, borderTop: '1px solid rgba(0,0,0,0.05)', textAlign: 'center' }}>
          <Typography sx={{ fontSize: 10, letterSpacing: 2, fontWeight: 700, color: 'rgba(30,41,59,0.35)' }}>
            NARTGO FUNNEL • {steps.length} adım · {current?.period?.toUpperCase() || period.toUpperCase()}
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}

function ConversionCard({ title, current, previous, loading, comparison, asNumber }: {
  title: string; current?: number; previous?: number; loading?: boolean; comparison?: boolean; asNumber?: boolean;
}) {
  const delta = (current !== undefined && previous !== undefined && previous > 0)
    ? ((current - previous) / previous) * 100
    : undefined;

  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, bgcolor: '#F8FAFC', borderColor: 'rgba(201,162,39,0.18)' }}>
      <Typography sx={{ fontSize: 10, letterSpacing: 1.5, fontWeight: 700, color: 'rgba(30,41,59,0.60)', textTransform: 'uppercase' }}>
        {title}
      </Typography>
      {loading ? (
        <Skeleton variant="text" width="60%" height={36} sx={{ bgcolor: 'rgba(0,0,0,0.06)' }} />
      ) : current === undefined ? (
        <Typography sx={{ fontSize: 13, color: 'rgba(30,41,59,0.45)', fontStyle: 'normal' }}>
          veri yok
        </Typography>
      ) : (
        <>
          <Typography sx={{ fontFamily: 'inherit', fontStyle: 'normal', fontSize: 28, fontWeight: 700, color: '#C9A227', lineHeight: 1.1, mt: 0.5 }}>
            {asNumber ? current.toLocaleString('tr-TR') : `%${current.toFixed(2)}`}
          </Typography>
          {comparison && delta !== undefined && (
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 1, color: Math.abs(delta) < 0.5 ? 'text.secondary' : delta > 0 ? 'success.main' : 'error.main' }}>
              {Math.abs(delta) < 0.5 ? <TrendingFlat sx={{ fontSize: 14 }} /> : delta > 0 ? <TrendingUp sx={{ fontSize: 14 }} /> : <TrendingDown sx={{ fontSize: 14 }} />}
              <Typography sx={{ fontSize: 11, fontWeight: 700 }}>
                {delta > 0 ? '+' : ''}{delta.toFixed(1)}%
              </Typography>
              <Typography sx={{ fontSize: 10, color: 'rgba(30,41,59,0.45)' }}>
                geçen dönem
              </Typography>
            </Stack>
          )}
        </>
      )}
    </Paper>
  );
}
