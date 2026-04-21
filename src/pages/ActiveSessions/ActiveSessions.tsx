import { useState, useMemo } from 'react';
import {
  Box, Container, Typography, Stack, IconButton, Tooltip, Chip, Alert, Button, Grid, Paper, Skeleton,
  Table, TableHead, TableRow, TableCell, TableBody, ToggleButtonGroup, ToggleButton, TextField, InputAdornment,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  FiberManualRecord as DotIcon,
  Lock as LockIcon,
  Laptop as DeviceIcon,
  LocationOn as LocationIcon,
  Search as SearchIcon,
  WarningAmber as WarnIcon,
  OpenInNew as OpenIcon,
} from '@mui/icons-material';
import { Navigate, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useRole } from '../../hooks/useRole';
import { activeSessionsService, type ActiveSessionsResponse } from '../../services/activeSessions/activeSessionsService';

const WINDOWS = [
  { key: 1, label: '1sa' },
  { key: 6, label: '6sa' },
  { key: 24, label: '24sa' },
  { key: 72, label: '3G' },
  { key: 168, label: '7G' },
];

function formatMinutes(m?: number): string {
  if (m === undefined || m === null) return '—';
  if (m < 1) return 'az önce';
  if (m < 60) return `${m}dk önce`;
  if (m < 1440) return `${(m / 60).toFixed(1)}sa önce`;
  return `${(m / 1440).toFixed(1)}g önce`;
}

export default function ActiveSessions() {
  const { isAdmin } = useRole();
  const navigate = useNavigate();
  const [hours, setHours] = useState(24);
  const [search, setSearch] = useState('');
  const [onlySuspicious, setOnlySuspicious] = useState(false);

  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useQuery<ActiveSessionsResponse | null>({
    queryKey: ['active-sessions', hours],
    queryFn: () => activeSessionsService.active(hours),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const sessions = data?.sessions || [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sessions.filter(s => {
      if (onlySuspicious && !s.suspicious) return false;
      if (q) {
        const hay = [s.email, s.userId, s.ipAddress, s.deviceInfo].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [sessions, search, onlySuspicious]);

  const lastUpdated = useMemo(() => {
    if (!dataUpdatedAt) return '—';
    const diff = Date.now() - dataUpdatedAt;
    if (diff < 60_000) return `${Math.round(diff / 1000)}sn önce`;
    if (diff < 3_600_000) return `${Math.round(diff / 60_000)}dk önce`;
    return new Date(dataUpdatedAt).toLocaleTimeString('tr-TR');
  }, [dataUpdatedAt]);

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
                  Active Sessions • Security • Yalnızca Admin
                </Typography>
              </Stack>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{ width: 48, height: 48, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>
                  <DeviceIcon sx={{ fontSize: 28 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontFamily: 'inherit', fontStyle: 'normal', fontSize: { xs: 28, md: 38 }, fontWeight: 700, lineHeight: 1, color: '#1E293B' }}>
                    Aktif Oturumlar
                  </Typography>
                  <Typography sx={{ mt: 0.5, fontSize: 13, color: 'rgba(30,41,59,0.70)' }}>
                    Son {hours} saatte giriş yapan kullanıcılar · şüpheli oturum tespiti
                  </Typography>
                </Box>
              </Stack>
            </Box>

            <Stack direction="row" spacing={1.5} alignItems="center">
              <ToggleButtonGroup
                size="small"
                value={hours}
                exclusive
                onChange={(_, v) => { if (typeof v === 'number') setHours(v); }}
                sx={{
                  bgcolor: 'rgba(0,0,0,0.02)',
                  border: '1px solid rgba(0,0,0,0.06)',
                  '& .MuiToggleButton-root': {
                    color: 'rgba(30,41,59,0.60)', fontSize: 11, fontWeight: 700, px: 1.5, py: 0.5, border: 'none', textTransform: 'none',
                    '&.Mui-selected': { bgcolor: 'rgba(201,162,39,0.18)', color: '#C9A227' },
                  },
                }}
              >
                {WINDOWS.map(w => <ToggleButton key={w.key} value={w.key}>{w.label}</ToggleButton>)}
              </ToggleButtonGroup>
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
              <code style={{ fontFamily: 'monospace', fontSize: 11 }}>/auth/admin/sessions/active</code> endpoint'ine ulaşılamadı.
            </Typography>
          </Alert>
        )}

        {/* Stats */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} md={3}>
            <StatTile label="Aktif Oturum" value={data?.totalActiveSessions ?? 0} color="#22c55e" loading={isLoading} />
          </Grid>
          <Grid item xs={6} md={3}>
            <StatTile
              label="Şüpheli"
              value={data?.suspiciousCount ?? 0}
              color={(data?.suspiciousCount ?? 0) > 0 ? '#ef4444' : '#64748b'}
              loading={isLoading}
              hint="Bot/invalid IP"
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <StatTile label="Zaman Penceresi" value={`${hours}sa`} color="#C9A227" loading={false} />
          </Grid>
          <Grid item xs={6} md={3}>
            <StatTile
              label="Son 1sa"
              value={sessions.filter(s => (s.minutesAgo ?? Infinity) < 60).length}
              color="#3b82f6"
              loading={isLoading}
              hint="Gerçek zamanlı"
            />
          </Grid>
        </Grid>

        {/* Filter */}
        <Stack direction="row" spacing={2} sx={{ mb: 2, alignItems: 'center' }}>
          <ToggleButtonGroup
            size="small"
            value={onlySuspicious}
            exclusive
            onChange={(_, v) => typeof v === 'boolean' && setOnlySuspicious(v)}
            sx={{
              bgcolor: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.06)',
              '& .MuiToggleButton-root': {
                color: 'rgba(30,41,59,0.60)', fontSize: 11, fontWeight: 700, px: 1.5, py: 0.5, border: 'none', textTransform: 'none',
                '&.Mui-selected': { bgcolor: 'rgba(201,162,39,0.18)', color: '#C9A227' },
              },
            }}
          >
            <ToggleButton value={false}>Tümü</ToggleButton>
            <ToggleButton value={true}>Sadece Şüpheli</ToggleButton>
          </ToggleButtonGroup>
          <Box sx={{ flex: 1 }} />
          <TextField
            size="small"
            placeholder="Email/IP/cihaz ara..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16, color: 'rgba(30,41,59,0.45)' }} /></InputAdornment> }}
            sx={{
              minWidth: 260,
              '& .MuiOutlinedInput-root': {
                bgcolor: 'rgba(0,0,0,0.02)', fontSize: 12, color: '#1E293B',
                '& fieldset': { borderColor: 'rgba(0,0,0,0.06)' },
              },
            }}
          />
        </Stack>

        {/* Table */}
        <Paper variant="outlined" sx={{ borderRadius: 2, bgcolor: '#FFFFFF', borderColor: 'rgba(201,162,39,0.12)', overflow: 'hidden' }}>
          {isLoading ? (
            <Box sx={{ p: 2 }}>
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} variant="rectangular" height={44} sx={{ bgcolor: 'rgba(0,0,0,0.03)', mb: 1, borderRadius: 0.5 }} />)}
            </Box>
          ) : filtered.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography sx={{ fontSize: 13, color: 'rgba(30,41,59,0.55)' }}>
                {sessions.length === 0 ? 'Bu pencerede aktif oturum yok' : 'Filtreyle eşleşen oturum yok'}
              </Typography>
            </Box>
          ) : (
            <Table size="small" sx={{ '& .MuiTableCell-root': { borderBottomColor: 'rgba(0,0,0,0.05)', color: '#1E293B' } }}>
              <TableHead>
                <TableRow>
                  <HeaderCell>Kullanıcı</HeaderCell>
                  <HeaderCell>Cihaz</HeaderCell>
                  <HeaderCell>Konum / IP</HeaderCell>
                  <HeaderCell align="right">Son Giriş</HeaderCell>
                  <HeaderCell align="center">Durum</HeaderCell>
                  <HeaderCell align="center" />
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map(s => (
                  <TableRow key={s.userId} hover sx={{ '&:hover': { bgcolor: 'rgba(201,162,39,0.05) !important' } }}>
                    <TableCell>
                      <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{s.email || s.userId?.slice(0, 12)}</Typography>
                      {s.userId && (
                        <Typography sx={{ fontSize: 9, fontFamily: 'monospace', color: 'rgba(30,41,59,0.45)' }}>
                          {s.userId.slice(0, 16)}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(30,41,59,0.70)', maxWidth: 260 }}>
                      <Typography sx={{ fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {s.deviceInfo || s.userAgent?.slice(0, 50) || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <LocationIcon sx={{ fontSize: 12, color: 'rgba(30,41,59,0.45)' }} />
                        <Typography sx={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(30,41,59,0.70)' }}>
                          {[s.ipAddress, s.location].filter(Boolean).join(' · ') || '—'}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: 11, fontFamily: 'monospace', color: (s.minutesAgo ?? Infinity) < 60 ? '#22c55e' : 'rgba(30,41,59,0.70)' }}>
                      {formatMinutes(s.minutesAgo)}
                    </TableCell>
                    <TableCell align="center">
                      {s.suspicious ? (
                        <Tooltip title={s.suspicionReason || 'Şüpheli'} arrow>
                          <Chip
                            icon={<WarnIcon sx={{ fontSize: '11px !important', color: '#ef4444 !important' }} />}
                            label="ŞÜPHELİ"
                            size="small"
                            sx={{ bgcolor: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: 9, fontWeight: 800, letterSpacing: 0.5, height: 20 }}
                          />
                        </Tooltip>
                      ) : (
                        <Chip label="Normal" size="small" sx={{ bgcolor: 'rgba(34,197,94,0.1)', color: '#22c55e', fontSize: 9, fontWeight: 700, height: 18 }} />
                      )}
                    </TableCell>
                    <TableCell align="center">
                      {s.userId && (
                        <Tooltip title="User 360" arrow>
                          <IconButton size="small" onClick={() => navigate(`/users/${s.userId}/360`)} sx={{ color: 'rgba(201,162,39,0.7)' }}>
                            <OpenIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Paper>

        <Box sx={{ mt: 5, pt: 3, borderTop: '1px solid rgba(0,0,0,0.05)', textAlign: 'center' }}>
          <Typography sx={{ fontSize: 10, letterSpacing: 2, fontWeight: 700, color: 'rgba(30,41,59,0.35)' }}>
            NARTGO SESSIONS • {sessions.length} aktif oturum · {hours}sa penceresi
          </Typography>
          <Typography sx={{ mt: 1, fontSize: 9, color: 'rgba(30,41,59,0.35)', fontStyle: 'normal' }}>
            Not: Force-logout Keycloak admin API entegrasyonu gerektirir — sonraki fazda eklenecek.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}

function StatTile({ label, value, color, loading, hint }: { label: string; value: number | string; color: string; loading?: boolean; hint?: string }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#F8FAFC', borderColor: 'rgba(201,162,39,0.18)' }}>
      <Typography sx={{ fontSize: 10, letterSpacing: 1.2, fontWeight: 700, color: 'rgba(30,41,59,0.60)', textTransform: 'uppercase' }}>
        {label}
      </Typography>
      {loading ? (
        <Skeleton variant="text" width="60%" height={32} sx={{ bgcolor: 'rgba(0,0,0,0.06)' }} />
      ) : (
        <Typography sx={{ fontFamily: 'inherit', fontStyle: 'normal', fontSize: 26, fontWeight: 700, color, lineHeight: 1.1, mt: 0.5 }}>
          {typeof value === 'number' ? value.toLocaleString('tr-TR') : value}
        </Typography>
      )}
      {hint && <Typography sx={{ mt: 0.5, fontSize: 9, color: 'rgba(30,41,59,0.45)', fontStyle: 'normal' }}>{hint}</Typography>}
    </Paper>
  );
}

function HeaderCell({ children, align }: { children?: React.ReactNode; align?: 'right' | 'center' }) {
  return (
    <TableCell align={align} sx={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, color: 'rgba(30,41,59,0.55) !important', textTransform: 'uppercase' }}>
      {children}
    </TableCell>
  );
}
