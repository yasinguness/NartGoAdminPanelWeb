import { useState, useMemo } from 'react';
import {
  Box, Container, Typography, Stack, IconButton, Tooltip, Chip, Alert, Button, Grid, Paper, Skeleton,
  Table, TableHead, TableRow, TableCell, TableBody, LinearProgress, ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  FiberManualRecord as DotIcon,
  Lock as LockIcon,
  TrendingDown as ChurnIcon,
  OpenInNew as OpenIcon,
  NotificationsActive as NotifyIcon,
} from '@mui/icons-material';
import { Navigate, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useRole } from '../../hooks/useRole';
import { churnService, type ChurnOverviewResponse } from '../../services/churn/churnService';

const RISK_COLOR: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f59e0b',
  MEDIUM: '#C9A227',
  LOW: '#64748b',
};

const RISK_LABEL: Record<string, string> = {
  CRITICAL: 'Kritik',
  HIGH: 'Yüksek',
  MEDIUM: 'Orta',
  LOW: 'Düşük',
};

function safeDate(iso?: string): string {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return iso.slice(0, 10); }
}

export default function ChurnRisk() {
  const { isAdmin } = useRole();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<string>('ALL');

  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useQuery<ChurnOverviewResponse | null>({
    queryKey: ['churn', 'overview'],
    queryFn: () => churnService.overview(),
    staleTime: 300_000,
  });

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const summary = data?.summary;
  const users = data?.atRiskUsers || [];

  const filtered = useMemo(() => {
    if (filter === 'ALL') return users;
    return users.filter(u => u.riskLevel === filter);
  }, [users, filter]);

  const lastUpdated = useMemo(() => {
    if (!dataUpdatedAt) return '—';
    const diff = Date.now() - dataUpdatedAt;
    if (diff < 60_000) return `${Math.round(diff / 1000)}sn önce`;
    if (diff < 3_600_000) return `${Math.round(diff / 60_000)}dk önce`;
    return new Date(dataUpdatedAt).toLocaleTimeString('tr-TR');
  }, [dataUpdatedAt]);

  const churnRate = summary?.estimatedMonthlyChurnRate ?? 0;
  const churnColor = churnRate > 30 ? '#ef4444' : churnRate > 15 ? '#f59e0b' : churnRate > 5 ? '#C9A227' : '#22c55e';

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
                  Churn Risk • Predictive • Yalnızca Admin
                </Typography>
              </Stack>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{ width: 48, height: 48, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
                  <ChurnIcon sx={{ fontSize: 28 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontFamily: 'inherit', fontStyle: 'normal', fontSize: { xs: 28, md: 38 }, fontWeight: 700, lineHeight: 1, color: '#1E293B' }}>
                    Churn Risk Skoru
                  </Typography>
                  <Typography sx={{ mt: 0.5, fontSize: 13, color: 'rgba(30,41,59,0.70)' }}>
                    Recency-tabanlı risk skorlaması · retention kampanyası önerisi
                  </Typography>
                </Box>
              </Stack>
            </Box>

            <Stack direction="row" spacing={1.5} alignItems="center">
              <Chip
                icon={<DotIcon sx={{ fontSize: '10px !important', color: `${isFetching ? '#f59e0b' : '#22c55e'} !important` }} />}
                label={isFetching ? 'güncelleniyor' : `son: ${lastUpdated}`}
                size="small"
                sx={{ bgcolor: 'rgba(0,0,0,0.03)', color: 'rgba(30,41,59,0.80)', fontSize: 11, fontWeight: 600, height: 26, border: '1px solid rgba(0,0,0,0.06)' }}
              />
              <Tooltip title="Yenile" arrow>
                <IconButton onClick={() => refetch()} size="small" sx={{ color: '#C9A227', border: '1px solid rgba(201,162,39,0.2)' }}>
                  <RefreshIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        </Box>

        {!isLoading && !data && (
          <Alert severity="info" icon={false} sx={{ mb: 3, bgcolor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: 'rgba(30,41,59,0.85)' }}
            action={<Button size="small" onClick={() => refetch()} sx={{ color: '#C9A227', fontSize: 11, fontWeight: 700 }}>Tekrar Dene</Button>}>
            <Typography sx={{ fontSize: 12 }}>
              <code style={{ fontFamily: 'monospace', fontSize: 11 }}>/auth/admin/churn/overview</code> endpoint'ine ulaşılamadı.
            </Typography>
          </Alert>
        )}

        {/* Churn rate hero + summary */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <Paper variant="outlined" sx={{
              p: 3, borderRadius: 2,
              bgcolor: `${churnColor}10`,
              border: `1px solid ${churnColor}33`,
              height: '100%',
            }}>
              <Typography sx={{ fontSize: 10, letterSpacing: 1.5, fontWeight: 800, color: 'rgba(30,41,59,0.60)', textTransform: 'uppercase' }}>
                Tahmini Aylık Churn Oranı
              </Typography>
              {isLoading ? (
                <Skeleton variant="text" width="60%" height={56} sx={{ bgcolor: 'rgba(0,0,0,0.06)' }} />
              ) : (
                <Typography sx={{
                  fontFamily: 'inherit', fontStyle: 'normal',
                  fontSize: 56, fontWeight: 700, color: churnColor, lineHeight: 1, mt: 1,
                }}>
                  %{churnRate.toFixed(1)}
                </Typography>
              )}
              <Typography sx={{ mt: 1, fontSize: 11, color: 'rgba(30,41,59,0.55)', fontStyle: 'normal' }}>
                (CRITICAL + HIGH) / toplam risk havuzu — heuristik tahmin
              </Typography>
              {summary?.avgDaysSinceLogin !== undefined && (
                <Typography sx={{ mt: 2, fontSize: 11, color: 'rgba(30,41,59,0.60)' }}>
                  Ortalama son giriş: {summary.avgDaysSinceLogin.toFixed(0)} gün önce
                </Typography>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} md={8}>
            <Grid container spacing={2}>
              {[
                { label: 'Kritik', value: summary?.criticalRiskCount ?? 0, color: '#ef4444', hint: '180g+ pasif' },
                { label: 'Yüksek', value: summary?.highRiskCount ?? 0, color: '#f59e0b', hint: '90-180g pasif' },
                { label: 'Orta', value: summary?.mediumRiskCount ?? 0, color: '#C9A227', hint: '60-90g pasif' },
                { label: 'Düşük', value: summary?.lowRiskCount ?? 0, color: '#64748b', hint: '30-60g pasif' },
                { label: 'Toplam Risk', value: summary?.totalEligibleUsers ?? 0, color: '#8b5cf6', hint: 'tüm seviyeler' },
                { label: 'Ort. Sessiz', value: summary?.avgDaysSinceLogin !== undefined ? `${summary.avgDaysSinceLogin}g` : '—', color: '#3b82f6', hint: 'gün' },
              ].map(c => (
                <Grid item xs={6} md={4} key={c.label}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#F8FAFC', borderColor: 'rgba(201,162,39,0.18)', height: '100%' }}>
                    <Typography sx={{ fontSize: 10, letterSpacing: 1.2, fontWeight: 700, color: 'rgba(30,41,59,0.60)', textTransform: 'uppercase' }}>
                      {c.label}
                    </Typography>
                    {isLoading ? (
                      <Skeleton variant="text" width="60%" height={28} sx={{ bgcolor: 'rgba(0,0,0,0.06)' }} />
                    ) : (
                      <Typography sx={{ fontFamily: 'inherit', fontStyle: 'normal', fontSize: 22, fontWeight: 700, color: c.color, lineHeight: 1.1, mt: 0.5 }}>
                        {typeof c.value === 'number' ? c.value.toLocaleString('tr-TR') : c.value}
                      </Typography>
                    )}
                    <Typography sx={{ mt: 0.5, fontSize: 9, color: 'rgba(30,41,59,0.45)', fontStyle: 'normal' }}>
                      {c.hint}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Grid>
        </Grid>

        {/* Filter bar */}
        <Stack direction="row" spacing={2} sx={{ mb: 2, alignItems: 'center' }}>
          <ToggleButtonGroup
            size="small" value={filter} exclusive onChange={(_, v) => v && setFilter(v)}
            sx={{
              bgcolor: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.06)',
              '& .MuiToggleButton-root': {
                color: 'rgba(30,41,59,0.60)', fontSize: 11, fontWeight: 700, px: 1.5, py: 0.5, border: 'none', textTransform: 'none',
                '&.Mui-selected': { bgcolor: 'rgba(201,162,39,0.18)', color: '#C9A227' },
              },
            }}
          >
            <ToggleButton value="ALL">Tümü</ToggleButton>
            <ToggleButton value="CRITICAL">Kritik</ToggleButton>
            <ToggleButton value="HIGH">Yüksek</ToggleButton>
            <ToggleButton value="MEDIUM">Orta</ToggleButton>
            <ToggleButton value="LOW">Düşük</ToggleButton>
          </ToggleButtonGroup>
          <Box sx={{ flex: 1 }} />
          <Typography sx={{ fontSize: 10, color: 'rgba(30,41,59,0.55)', fontStyle: 'normal' }}>
            Top 50 en yüksek riskli kullanıcı gösteriliyor
          </Typography>
        </Stack>

        {/* Table */}
        <Paper variant="outlined" sx={{ borderRadius: 2, bgcolor: '#FFFFFF', borderColor: 'rgba(201,162,39,0.12)', overflow: 'hidden' }}>
          {isLoading ? (
            <Box sx={{ p: 2 }}>
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} variant="rectangular" height={44} sx={{ bgcolor: 'rgba(0,0,0,0.03)', mb: 1, borderRadius: 0.5 }} />)}
            </Box>
          ) : filtered.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography sx={{ fontSize: 14, color: '#22c55e', fontWeight: 700 }}>
                ✓ {filter === 'ALL' ? 'Churn riski olan kullanıcı yok' : 'Bu seviyede kullanıcı yok'}
              </Typography>
            </Box>
          ) : (
            <Table size="small" sx={{ '& .MuiTableCell-root': { borderBottomColor: 'rgba(0,0,0,0.05)', color: '#1E293B' } }}>
              <TableHead>
                <TableRow>
                  <HeaderCell align="center">Risk</HeaderCell>
                  <HeaderCell align="center">Skor</HeaderCell>
                  <HeaderCell>Email</HeaderCell>
                  <HeaderCell>Sebep</HeaderCell>
                  <HeaderCell align="center">Son Giriş</HeaderCell>
                  <HeaderCell align="center">Tenure</HeaderCell>
                  <HeaderCell align="center">Aksiyon</HeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map(u => {
                  const color = RISK_COLOR[u.riskLevel] || '#64748b';
                  return (
                    <TableRow key={u.userId} hover sx={{ '&:hover': { bgcolor: 'rgba(201,162,39,0.05) !important' } }}>
                      <TableCell align="center">
                        <Chip label={RISK_LABEL[u.riskLevel] || u.riskLevel} size="small" sx={{ bgcolor: `${color}22`, color, fontSize: 9, fontWeight: 800, letterSpacing: 0.5, height: 20 }} />
                      </TableCell>
                      <TableCell align="center" sx={{ minWidth: 90 }}>
                        <Stack spacing={0.5}>
                          <Typography sx={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 800, color }}>
                            {u.riskScore}
                          </Typography>
                          <LinearProgress
                            variant="determinate" value={Math.min(100, u.riskScore)}
                            sx={{ height: 3, borderRadius: 2, bgcolor: 'rgba(0,0,0,0.05)', '& .MuiLinearProgress-bar': { bgcolor: color } }}
                          />
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: '#C9A227' }}>
                        {u.email || u.userId.slice(0, 12)}
                      </TableCell>
                      <TableCell sx={{ fontSize: 11, color: 'rgba(30,41,59,0.75)', maxWidth: 360 }}>
                        <Typography sx={{ fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {u.primaryRisk}
                        </Typography>
                      </TableCell>
                      <TableCell align="center" sx={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(30,41,59,0.60)' }}>
                        {u.lastLoginAt ? (
                          <>
                            <Typography sx={{ fontSize: 11, color: '#1E293B', fontWeight: 700 }}>
                              {u.daysSinceLogin}g önce
                            </Typography>
                            <Typography sx={{ fontSize: 9, color: 'rgba(30,41,59,0.50)' }}>
                              {safeDate(u.lastLoginAt)}
                            </Typography>
                          </>
                        ) : (
                          <Typography sx={{ fontSize: 11, color: '#ef4444', fontWeight: 700 }}>Hiç giriş yok</Typography>
                        )}
                      </TableCell>
                      <TableCell align="center" sx={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(30,41,59,0.60)' }}>
                        {u.tenureDays}g
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" justifyContent="center" spacing={0.5}>
                          <Tooltip title="User 360" arrow>
                            <IconButton size="small" onClick={() => navigate(`/users/${u.userId}/360`)} sx={{ color: 'rgba(201,162,39,0.7)' }}>
                              <OpenIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Retention kampanyası" arrow>
                            <IconButton size="small" onClick={() => navigate(`/notifications?segment=churn&user=${u.userId}`)} sx={{ color: '#C9A227' }}>
                              <NotifyIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Paper>

        <Box sx={{ mt: 5, pt: 3, borderTop: '1px solid rgba(0,0,0,0.05)', textAlign: 'center' }}>
          <Typography sx={{ fontSize: 10, letterSpacing: 2, fontWeight: 700, color: 'rgba(30,41,59,0.35)' }}>
            NARTGO CHURN • {users.length} risk havuzu · %{churnRate.toFixed(1)} tahmini aylık churn
          </Typography>
          <Typography sx={{ mt: 1, fontSize: 9, color: 'rgba(30,41,59,0.35)', fontStyle: 'normal' }}>
            Heuristik skor: recency-tabanlı (son login + kayıt süresi). ML modeli sonraki fazda eklenecek.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}

function HeaderCell({ children, align }: { children: React.ReactNode; align?: 'right' | 'center' }) {
  return (
    <TableCell align={align} sx={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, color: 'rgba(30,41,59,0.55) !important', textTransform: 'uppercase' }}>
      {children}
    </TableCell>
  );
}
