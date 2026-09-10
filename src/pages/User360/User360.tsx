import { useMemo } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import {
  Box, Container, Typography, Stack, IconButton, Tooltip, Chip, Grid, Button, Alert,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  FiberManualRecord as DotIcon,
  ArrowBack as BackIcon,
  Person as PersonIcon,
  WarningAmber as WarnIcon,
} from '@mui/icons-material';
import { useRole } from '../../hooks/useRole';
import { useUser360 } from './useUser360';
import ProfileCard from './components/ProfileCard';
import LtvCard from './components/LtvCard';
import OrdersList from './components/OrdersList';
import SessionsPanel from './components/SessionsPanel';
import NotesPanel from './components/NotesPanel';
import ActivityFeed from './components/ActivityFeed';
import { unwrap } from './components/helpers';

export default function User360() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useRole();
  const { profile, ordersSummary, sessionSummary, loginStats, notes, activity, refetchAll } = useUser360(id);

  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  if (!id) return <Navigate to="/users" replace />;

  const user = unwrap<any>(profile.data);
  const orders = unwrap<any>(ordersSummary.data);
  const sessionSummaryData = unwrap<any>(sessionSummary.data);
  const loginStatsData = unwrap<any>(loginStats.data);
  const notesData = unwrap<any[]>(notes.data) || [];
  const activityData = unwrap<any>(activity.data);

  const sessions = sessionSummaryData?.sessions || sessionSummaryData?.recentSessions || [];
  const activityItems = Array.isArray(activityData)
    ? activityData
    : (activityData?.items || activityData?.content || []);

  const anyFetching = profile.isFetching || ordersSummary.isFetching || sessionSummary.isFetching || notes.isFetching;

  const lastUpdated = useMemo(() => {
    const t = Math.max(
      profile.dataUpdatedAt || 0,
      ordersSummary.dataUpdatedAt || 0,
      sessionSummary.dataUpdatedAt || 0,
    );
    if (!t) return '—';
    const diff = Date.now() - t;
    if (diff < 60_000) return `${Math.round(diff / 1000)}sn önce`;
    if (diff < 3_600_000) return `${Math.round(diff / 60_000)}dk önce`;
    return new Date(t).toLocaleTimeString('tr-TR');
  }, [profile.dataUpdatedAt, ordersSummary.dataUpdatedAt, sessionSummary.dataUpdatedAt]);

  const refundSignal = orders && orders.paidOrders > 0 && (orders.refundedOrders / orders.paidOrders) > 0.2;
  const suspiciousLogins = loginStatsData && (loginStatsData.failedLogins || 0) > 5;

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
        <Box sx={{ mb: 3 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2}>
            <Stack direction="row" spacing={2} alignItems="center">
              <IconButton
                size="small"
                onClick={() => navigate(-1)}
                sx={{ color: 'rgba(30,41,59,0.70)', border: '1px solid rgba(0,0,0,0.08)' }}
              >
                <BackIcon sx={{ fontSize: 18 }} />
              </IconButton>
              <Box>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                  <PersonIcon sx={{ fontSize: 14, color: '#C9A227' }} />
                  <Typography sx={{ fontSize: 10, letterSpacing: 2, fontWeight: 800, color: '#C9A227', textTransform: 'uppercase' }}>
                    User 360° · Destek Görünümü
                  </Typography>
                </Stack>
                <Typography sx={{ fontFamily: 'inherit', fontStyle: 'normal', fontSize: { xs: 24, md: 32 }, fontWeight: 700, lineHeight: 1, color: '#1E293B' }}>
                  {user ? ([user.firstName, user.lastName].filter(Boolean).join(' ') || user.email) : 'Yükleniyor…'}
                </Typography>
                {user?.email && (
                  <Typography sx={{ mt: 0.5, fontSize: 12, color: 'rgba(30,41,59,0.60)', fontFamily: 'monospace' }}>
                    {user.email}
                  </Typography>
                )}
              </Box>
            </Stack>

            <Stack direction="row" spacing={1.5} alignItems="center">
              <Chip
                icon={<DotIcon sx={{ fontSize: '10px !important', color: `${anyFetching ? '#f59e0b' : '#22c55e'} !important` }} />}
                label={anyFetching ? 'güncelleniyor' : `son: ${lastUpdated}`}
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
              <Tooltip title="Tümünü Yenile" arrow>
                <IconButton onClick={() => refetchAll()} size="small" sx={{ color: '#C9A227', border: '1px solid rgba(201,162,39,0.2)' }}>
                  <RefreshIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        </Box>

        {/* Risk alerts */}
        {(refundSignal || suspiciousLogins) && (
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
            {refundSignal && (
              <Alert
                icon={<WarnIcon sx={{ color: '#ef4444' }} />}
                severity="error"
                sx={{
                  flex: 1,
                  bgcolor: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  color: '#1E293B',
                }}
              >
                <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: '#ef4444' }}>
                  YÜKSEK İADE ORANI
                </Typography>
                <Typography sx={{ fontSize: 12 }}>
                  Bu kullanıcının siparişlerinin %{((orders.refundedOrders / orders.paidOrders) * 100).toFixed(0)}'ı iade edildi. Fraud riski için inceleyin.
                </Typography>
              </Alert>
            )}
            {suspiciousLogins && (
              <Alert
                icon={<WarnIcon sx={{ color: '#f59e0b' }} />}
                severity="warning"
                sx={{
                  flex: 1,
                  bgcolor: 'rgba(245,158,11,0.08)',
                  border: '1px solid rgba(245,158,11,0.25)',
                  color: '#1E293B',
                }}
              >
                <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: '#f59e0b' }}>
                  ŞÜPHELİ GİRİŞLER
                </Typography>
                <Typography sx={{ fontSize: 12 }}>
                  {loginStatsData?.failedLogins} başarısız giriş denemesi kayıtlı.
                </Typography>
              </Alert>
            )}
          </Stack>
        )}

        {/* Layout: Sol sütun profil + notlar, sağ sütun LTV + siparişler + oturumlar + aktivite */}
        <Grid container spacing={3}>
          {/* Sol sütun */}
          <Grid item xs={12} md={4} lg={3}>
            <Stack spacing={3}>
              <ProfileCard user={user} loading={profile.isLoading} />
              <NotesPanel
                userId={id}
                notes={notesData}
                loading={notes.isLoading}
                onChange={() => notes.refetch()}
              />
            </Stack>
          </Grid>

          {/* Sağ sütun */}
          <Grid item xs={12} md={8} lg={9}>
            <Stack spacing={3}>
              <LtvCard data={orders} loading={ordersSummary.isLoading} />

              <Grid container spacing={3}>
                <Grid item xs={12} lg={7}>
                  <OrdersList
                    rows={orders?.recentOrders}
                    currency={orders?.currency}
                    loading={ordersSummary.isLoading}
                  />
                </Grid>
                <Grid item xs={12} lg={5}>
                  <SessionsPanel
                    sessions={sessions}
                    totalLogins={loginStatsData?.successfulLogins || loginStatsData?.totalLogins}
                    totalFailed={loginStatsData?.failedLogins}
                    lastLogin={loginStatsData?.lastSuccessfulLoginAt || loginStatsData?.lastLoginAt}
                    loading={sessionSummary.isLoading || loginStats.isLoading}
                  />
                </Grid>
              </Grid>

              <ActivityFeed items={activityItems} loading={activity.isLoading} />
            </Stack>
          </Grid>
        </Grid>

        {/* Footer */}
        <Box sx={{ mt: 5, pt: 3, borderTop: '1px solid rgba(0,0,0,0.05)', textAlign: 'center' }}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => navigate('/users')}
            sx={{
              borderColor: 'rgba(201,162,39,0.2)',
              color: 'rgba(30,41,59,0.60)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 1,
              '&:hover': { borderColor: '#C9A227', color: '#C9A227' },
            }}
          >
            ← Kullanıcı Listesine Dön
          </Button>
        </Box>
      </Container>
    </Box>
  );
}
