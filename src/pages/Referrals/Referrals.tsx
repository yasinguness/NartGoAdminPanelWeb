import { useMemo } from 'react';
import {
  Box, Container, Typography, Stack, IconButton, Tooltip, Chip, Alert, Button, Grid, Paper, Skeleton,
  Table, TableHead, TableRow, TableCell, TableBody, LinearProgress,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  FiberManualRecord as DotIcon,
  Lock as LockIcon,
  PersonAdd as ReferralIcon,
  OpenInNew as OpenIcon,
  EmojiEvents as TrophyIcon,
} from '@mui/icons-material';
import { Navigate, useNavigate } from 'react-router-dom';
import { useRole } from '../../hooks/useRole';
import { useReferrals } from './useReferrals';

function safeDate(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso.slice(0, 10);
  }
}

export default function Referrals() {
  const { isAdmin } = useRole();
  const navigate = useNavigate();
  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useReferrals();

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const summary = data?.summary;
  const top = data?.topReferrers || [];

  const lastUpdated = useMemo(() => {
    if (!dataUpdatedAt) return '—';
    const diff = Date.now() - dataUpdatedAt;
    if (diff < 60_000) return `${Math.round(diff / 1000)}sn önce`;
    if (diff < 3_600_000) return `${Math.round(diff / 60_000)}dk önce`;
    return new Date(dataUpdatedAt).toLocaleTimeString('tr-TR');
  }, [dataUpdatedAt]);

  const kFactor = summary?.kFactor ?? 0;
  const kFactorColor = kFactor >= 1 ? '#22c55e' : kFactor >= 0.5 ? '#C9A227' : kFactor > 0 ? '#f59e0b' : '#ef4444';

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
                  Referrals • Growth • Yalnızca Admin
                </Typography>
              </Stack>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{ width: 48, height: 48, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>
                  <ReferralIcon sx={{ fontSize: 28 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontFamily: 'inherit', fontStyle: 'normal', fontSize: { xs: 28, md: 38 }, fontWeight: 700, lineHeight: 1, color: '#1E293B' }}>
                    Davet Programı
                  </Typography>
                  <Typography sx={{ mt: 0.5, fontSize: 13, color: 'rgba(30,41,59,0.70)' }}>
                    K-factor · conversion oranı · en iyi davet eden kullanıcılar
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
              <code style={{ fontFamily: 'monospace', fontSize: 11 }}>/auth/admin/referrals/overview</code> endpoint'ine ulaşılamadı.
            </Typography>
          </Alert>
        )}

        {/* K-factor hero card + summary grid */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <Paper variant="outlined" sx={{
              p: 3, borderRadius: 2,
              bgcolor: 'rgba(139,92,246,0.08)',
              border: '1px solid rgba(139,92,246,0.25)',
              height: '100%',
            }}>
              <Typography sx={{ fontSize: 10, letterSpacing: 1.5, fontWeight: 800, color: 'rgba(30,41,59,0.60)', textTransform: 'uppercase' }}>
                K-Factor (Viral Katsayı)
              </Typography>
              {isLoading ? (
                <Skeleton variant="text" width="60%" height={56} sx={{ bgcolor: 'rgba(0,0,0,0.06)' }} />
              ) : (
                <Typography sx={{
                  fontFamily: 'inherit', fontStyle: 'normal',
                  fontSize: 56, fontWeight: 700, color: kFactorColor, lineHeight: 1, mt: 1,
                }}>
                  {kFactor.toFixed(3)}
                </Typography>
              )}
              <Typography sx={{ mt: 1, fontSize: 11, color: 'rgba(30,41,59,0.55)', fontStyle: 'normal' }}>
                Her yeni kayıtta ortalama {kFactor.toFixed(2)} davet tamamlanıyor.
                {kFactor >= 1 && ' 🚀 Viral büyüme bölgesinde.'}
                {kFactor > 0 && kFactor < 1 && ' Sub-viral — ödül programı gözden geçir.'}
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} md={8}>
            <Grid container spacing={2}>
              {[
                { label: 'Toplam Davet', value: summary?.totalInvites ?? 0, color: '#C9A227' },
                { label: 'Tamamlanan', value: summary?.completedInvites ?? 0, color: '#22c55e' },
                { label: 'Bekleyen', value: summary?.pendingInvites ?? 0, color: '#f59e0b' },
                { label: 'Conversion', value: summary?.conversionRate !== undefined ? `%${summary.conversionRate.toFixed(1)}` : '—', color: '#3b82f6' },
                { label: 'Son 30G Davet', value: summary?.invitesLast30d ?? 0, color: '#8b5cf6' },
                { label: 'Son 30G Tamamlanan', value: summary?.completedLast30d ?? 0, color: '#22c55e' },
              ].map(c => (
                <Grid item xs={6} md={4} key={c.label}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#F8FAFC', borderColor: 'rgba(201,162,39,0.18)', height: '100%' }}>
                    <Typography sx={{ fontSize: 10, letterSpacing: 1.2, fontWeight: 700, color: 'rgba(30,41,59,0.60)', textTransform: 'uppercase' }}>
                      {c.label}
                    </Typography>
                    {isLoading ? (
                      <Skeleton variant="text" width="60%" height={28} sx={{ bgcolor: 'rgba(0,0,0,0.06)' }} />
                    ) : (
                      <Typography sx={{
                        fontFamily: 'inherit', fontStyle: 'normal',
                        fontSize: 22, fontWeight: 700, color: c.color, lineHeight: 1.1, mt: 0.5,
                      }}>
                        {typeof c.value === 'number' ? c.value.toLocaleString('tr-TR') : c.value}
                      </Typography>
                    )}
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Grid>
        </Grid>

        {/* Top referrers */}
        <Paper variant="outlined" sx={{ borderRadius: 2, bgcolor: '#FFFFFF', borderColor: 'rgba(201,162,39,0.12)', overflow: 'hidden' }}>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ px: 2.5, py: 2, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
            <TrophyIcon sx={{ fontSize: 16, color: '#C9A227' }} />
            <Typography sx={{ fontSize: 11, letterSpacing: 1.5, fontWeight: 700, color: 'rgba(30,41,59,0.60)', textTransform: 'uppercase' }}>
              En İyi Davet Edenler
            </Typography>
          </Stack>

          {isLoading ? (
            <Box sx={{ p: 2 }}>
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} variant="rectangular" height={44} sx={{ bgcolor: 'rgba(0,0,0,0.03)', mb: 1, borderRadius: 0.5 }} />)}
            </Box>
          ) : top.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography sx={{ fontSize: 13, color: 'rgba(30,41,59,0.55)' }}>
                Henüz davet kaydı yok
              </Typography>
              <Typography sx={{ fontSize: 11, color: 'rgba(30,41,59,0.45)', mt: 0.5 }}>
                Kullanıcılar davet göndermeye başladığında burada listelenecek
              </Typography>
            </Box>
          ) : (
            <Table size="small" sx={{ '& .MuiTableCell-root': { borderBottomColor: 'rgba(0,0,0,0.05)', color: '#1E293B' } }}>
              <TableHead>
                <TableRow>
                  <HeaderCell>#</HeaderCell>
                  <HeaderCell>Kullanıcı</HeaderCell>
                  <HeaderCell align="center">Toplam Davet</HeaderCell>
                  <HeaderCell align="center">Tamamlanan</HeaderCell>
                  <HeaderCell align="center">Bekleyen</HeaderCell>
                  <HeaderCell align="center">Conversion</HeaderCell>
                  <HeaderCell>Son Davet</HeaderCell>
                  <HeaderCell align="center" />
                </TableRow>
              </TableHead>
              <TableBody>
                {top.map((r, idx) => (
                  <TableRow key={r.userId} hover sx={{ '&:hover': { bgcolor: 'rgba(201,162,39,0.05) !important' } }}>
                    <TableCell sx={{ fontSize: 11, fontFamily: 'monospace', color: idx < 3 ? '#C9A227' : 'rgba(30,41,59,0.55)', fontWeight: 800 }}>
                      {idx + 1}
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#1E293B' }}>
                        {r.name || '—'}
                      </Typography>
                      <Typography sx={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(30,41,59,0.55)' }}>
                        {r.email || r.userId.slice(0, 12)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center" sx={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700 }}>
                      {r.totalInvites.toLocaleString('tr-TR')}
                    </TableCell>
                    <TableCell align="center" sx={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: '#22c55e' }}>
                      {r.completedCount.toLocaleString('tr-TR')}
                    </TableCell>
                    <TableCell align="center" sx={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: '#f59e0b' }}>
                      {r.pendingCount.toLocaleString('tr-TR')}
                    </TableCell>
                    <TableCell align="center" sx={{ minWidth: 120 }}>
                      {r.conversionRate !== undefined && (
                        <Stack spacing={0.5}>
                          <Typography sx={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700 }}>
                            %{r.conversionRate.toFixed(1)}
                          </Typography>
                          <LinearProgress
                            variant="determinate" value={Math.min(100, r.conversionRate)}
                            sx={{
                              height: 4, borderRadius: 2,
                              bgcolor: 'rgba(0,0,0,0.05)',
                              '& .MuiLinearProgress-bar': { bgcolor: r.conversionRate >= 50 ? '#22c55e' : r.conversionRate >= 20 ? '#C9A227' : '#ef4444' },
                            }}
                          />
                        </Stack>
                      )}
                    </TableCell>
                    <TableCell sx={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(30,41,59,0.60)' }}>
                      {safeDate(r.lastInviteAt)}
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Kullanıcıyı aç" arrow>
                        <IconButton size="small" onClick={() => navigate(`/users/${r.userId}/360`)} sx={{ color: 'rgba(201,162,39,0.7)' }}>
                          <OpenIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Paper>

        <Box sx={{ mt: 5, pt: 3, borderTop: '1px solid rgba(0,0,0,0.05)', textAlign: 'center' }}>
          <Typography sx={{ fontSize: 10, letterSpacing: 2, fontWeight: 700, color: 'rgba(30,41,59,0.35)' }}>
            NARTGO REFERRALS • {summary?.totalInvites ?? 0} toplam davet · K={kFactor.toFixed(3)}
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}

function HeaderCell({ children, align }: { children?: React.ReactNode; align?: 'right' | 'center' }) {
  return (
    <TableCell align={align} sx={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, color: 'rgba(30,41,59,0.55) !important', textTransform: 'uppercase' }}>
      {children}
    </TableCell>
  );
}
