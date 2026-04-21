/**
 * Login Sıklığı — kullanıcıları login sayısına göre listeler.
 *
 * Endpoint: GET /auth/admin/analytics/login-frequency
 */
import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Stack, Paper, Grid, Typography, Table, TableHead, TableBody,
  TableRow, TableCell, ToggleButtonGroup, ToggleButton, Skeleton, LinearProgress,
  MenuItem, Select, FormControl, InputLabel,
} from '@mui/material';
import { TrendingUp as TrendingUpIcon } from '@mui/icons-material';
import AdminShell from '../../components/AdminShell';
import { useRole } from '../../hooks/useRole';
import { darkAdmin } from '../../theme/darkAdmin';
import { userEngagementService } from '../../services/engagement/userEngagementService';

const DAY_OPTIONS = [7, 14, 30, 60, 90] as const;

function safeDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return String(iso).slice(0, 10);
  }
}

function HeaderCell({ children, align }: { children: React.ReactNode; align?: 'right' | 'center' | 'left' }) {
  return (
    <TableCell align={align} sx={{
      fontSize: 10, fontWeight: 800, letterSpacing: 1,
      color: 'rgba(30,41,59,0.55) !important', textTransform: 'uppercase',
    }}>
      {children}
    </TableCell>
  );
}

export default function LoginFrequency() {
  const { isAdmin } = useRole();
  const [days, setDays] = useState<number>(30);
  const [platform, setPlatform] = useState<string>('MOBILE');
  const [sort, setSort] = useState<'asc' | 'desc'>('desc');

  const { data, isLoading, isFetching, refetch, dataUpdatedAt, error } = useQuery({
    queryKey: ['engagement', 'login-frequency', days, platform, sort],
    queryFn: () => userEngagementService.getLoginFrequency({ days, platform, sort, limit: 100 }),
    staleTime: 60_000,
    enabled: isAdmin,
  });

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const rows = data ?? [];

  const kpis = useMemo(() => {
    if (rows.length === 0) return { total: 0, avg: 0, max: 0 };
    const total = rows.reduce((s, r) => s + (r.loginCount || 0), 0);
    const avg = total / rows.length;
    const max = Math.max(...rows.map(r => r.loginCount || 0));
    return { total, avg, max };
  }, [rows]);

  const maxCount = kpis.max || 1;

  const status = (error as any)?.response?.status;
  const showEmptyAlert = !isLoading && (!!status && (status === 403 || status === 404 || status === 501));

  return (
    <AdminShell
      title="Login Sıklığı"
      subtitle="En aktif kullanıcılar · son X gün içinde kaç kez giriş yapmış"
      icon={<TrendingUpIcon sx={{ fontSize: 26 }} />}
      label="Kullanıcı Etkileşimi • Yalnızca Admin"
      isFetching={isFetching}
      lastUpdatedAt={dataUpdatedAt}
      onRefresh={() => refetch()}
      showEmptyDataAlert={showEmptyAlert}
      emptyDataMessage="/auth/admin/analytics/login-frequency endpoint'ine ulaşılamadı."
      onEmptyDataRetry={() => refetch()}
    >
      {/* Filter bar */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2, bgcolor: darkAdmin.bg.card, borderColor: darkAdmin.border.default }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
          <Box>
            <Typography sx={{ fontSize: 10, letterSpacing: 1.2, fontWeight: 700, color: 'rgba(30,41,59,0.55)', textTransform: 'uppercase', mb: 0.5 }}>
              Süre
            </Typography>
            <ToggleButtonGroup
              size="small" exclusive value={days}
              onChange={(_, v) => { if (v !== null) setDays(Number(v)); }}
              sx={{
                bgcolor: darkAdmin.bg.surface,
                border: `1px solid ${darkAdmin.border.default}`,
                '& .MuiToggleButton-root': {
                  color: 'rgba(30,41,59,0.65)', fontSize: 11, fontWeight: 700,
                  px: 1.5, py: 0.5, border: 'none', textTransform: 'none',
                  '&.Mui-selected': {
                    bgcolor: 'rgba(201,162,39,0.18)', color: darkAdmin.status.primary,
                  },
                },
              }}
            >
              {DAY_OPTIONS.map(d => (
                <ToggleButton key={d} value={d}>{d}g</ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>

          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel sx={{ fontSize: 12 }}>Platform</InputLabel>
            <Select label="Platform" value={platform} onChange={(e) => setPlatform(String(e.target.value))}>
              <MenuItem value="MOBILE">Mobile</MenuItem>
              <MenuItem value="ANDROID">Android</MenuItem>
              <MenuItem value="IOS">iOS</MenuItem>
              <MenuItem value="WEB">Web</MenuItem>
              <MenuItem value="ALL">Tümü</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel sx={{ fontSize: 12 }}>Sıralama</InputLabel>
            <Select label="Sıralama" value={sort} onChange={(e) => setSort(e.target.value as 'asc' | 'desc')}>
              <MenuItem value="desc">En çok login</MenuItem>
              <MenuItem value="asc">En az login</MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ flex: 1 }} />
          <Typography sx={{ fontSize: 11, color: darkAdmin.text.secondary }}>
            İlk 100 kullanıcı
          </Typography>
        </Stack>
      </Paper>

      {/* KPI cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Toplam Login (top 100)', value: kpis.total, color: darkAdmin.status.primary },
          { label: 'Ortalama Login/Kullanıcı', value: kpis.avg.toFixed(1), color: darkAdmin.status.info },
          { label: 'En Yüksek Login Sayısı', value: kpis.max, color: darkAdmin.status.success },
        ].map((c) => (
          <Grid item xs={12} md={4} key={c.label}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, ...darkAdmin.sx.statTile, height: '100%' }}>
              <Typography sx={{ ...darkAdmin.sx.sectionLabel }}>{c.label}</Typography>
              {isLoading ? (
                <Skeleton variant="text" width="60%" height={36} sx={{ bgcolor: 'rgba(0,0,0,0.06)' }} />
              ) : (
                <Typography sx={{ ...darkAdmin.sx.kpiValue, color: c.color, mt: 0.5 }}>
                  {typeof c.value === 'number' ? c.value.toLocaleString('tr-TR') : c.value}
                </Typography>
              )}
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Table */}
      <Paper variant="outlined" sx={{ borderRadius: 2, bgcolor: darkAdmin.bg.card, borderColor: darkAdmin.border.default, overflow: 'hidden' }}>
        {isLoading ? (
          <Box sx={{ p: 2 }}>
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} variant="rectangular" height={44} sx={{ bgcolor: 'rgba(0,0,0,0.03)', mb: 1, borderRadius: 0.5 }} />
            ))}
          </Box>
        ) : rows.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography sx={{ fontSize: 13, color: darkAdmin.text.secondary }}>
              Kayıt bulunamadı.
            </Typography>
          </Box>
        ) : (
          <Table size="small" sx={{ '& .MuiTableCell-root': { borderBottomColor: darkAdmin.border.subtle, color: darkAdmin.text.primary } }}>
            <TableHead>
              <TableRow>
                <HeaderCell align="center">#</HeaderCell>
                <HeaderCell>Kullanıcı</HeaderCell>
                <HeaderCell>Email</HeaderCell>
                <HeaderCell align="center">Login</HeaderCell>
                <HeaderCell align="center">Ort. / Gün</HeaderCell>
                <HeaderCell align="center">Son Giriş</HeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((u, idx) => {
                const pct = Math.min(100, ((u.loginCount || 0) / maxCount) * 100);
                return (
                  <TableRow key={u.userId} hover sx={{ '&:hover': { bgcolor: 'rgba(201,162,39,0.05) !important' } }}>
                    <TableCell align="center" sx={{ fontSize: 11, fontWeight: 700, color: darkAdmin.text.secondary, width: 44 }}>
                      {idx + 1}
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, fontWeight: 700 }}>
                      {u.userName || <span style={{ opacity: 0.5 }}>—</span>}
                    </TableCell>
                    <TableCell sx={{ fontSize: 11, fontFamily: 'monospace', color: darkAdmin.status.primary }}>
                      {u.userEmail || u.userId.slice(0, 12)}
                    </TableCell>
                    <TableCell align="center" sx={{ minWidth: 150 }}>
                      <Stack spacing={0.5}>
                        <Typography sx={{ fontSize: 12, fontWeight: 800, color: darkAdmin.text.primary }}>
                          {(u.loginCount || 0).toLocaleString('tr-TR')}
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={pct}
                          sx={{
                            height: 4, borderRadius: 2,
                            bgcolor: 'rgba(0,0,0,0.05)',
                            '& .MuiLinearProgress-bar': { bgcolor: darkAdmin.status.primary },
                          }}
                        />
                      </Stack>
                    </TableCell>
                    <TableCell align="center" sx={{ fontSize: 11, fontFamily: 'monospace', color: darkAdmin.text.secondary }}>
                      {(u.avgLoginsPerDay ?? 0).toFixed(2)}
                    </TableCell>
                    <TableCell align="center" sx={{ fontSize: 11, color: darkAdmin.text.secondary }}>
                      {safeDate(u.lastLoginAt)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Paper>
    </AdminShell>
  );
}
