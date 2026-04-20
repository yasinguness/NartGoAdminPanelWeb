import { useState, useMemo } from 'react';
import { Box, Container, Typography, Stack, IconButton, Tooltip, Chip, Alert, Button } from '@mui/material';
import { Refresh as RefreshIcon, FiberManualRecord as DotIcon, Lock as LockIcon } from '@mui/icons-material';
import { Navigate } from 'react-router-dom';
import { useRole } from '../../hooks/useRole';
import { useExecutiveData } from './useExecutiveData';
import PeriodSelector from './components/PeriodSelector';
import RevenueSection from './sections/RevenueSection';
import GrowthSection from './sections/GrowthSection';
import FunnelSection from './sections/FunnelSection';
import OperationalSection from './sections/OperationalSection';
import PlatformHealthSection from './sections/PlatformHealthSection';
import type { TimeRange } from '../../services/executive/executiveTypes';

export default function ExecutiveDashboard() {
  const { isAdmin, userName } = useRole();
  const [range, setRange] = useState<TimeRange>('7d');
  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useExecutiveData(range);

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const lastUpdated = useMemo(() => {
    if (!dataUpdatedAt) return '—';
    const diff = Date.now() - dataUpdatedAt;
    if (diff < 60_000) return `${Math.round(diff / 1000)}sn önce`;
    if (diff < 3_600_000) return `${Math.round(diff / 60_000)}dk önce`;
    return new Date(dataUpdatedAt).toLocaleTimeString('tr-TR');
  }, [dataUpdatedAt, isFetching]);

  const partial = data?.partial || { revenue: true, growth: true, funnel: true, operational: true, platform: true };
  const allPartial = partial.revenue && partial.growth && partial.funnel && partial.operational && partial.platform;

  return (
    <Box
      sx={{
        minHeight: 'calc(100vh - 64px)',
        bgcolor: '#060C09',
        color: '#F3EEE0',
        mx: { xs: -2, sm: -3 },
        my: -3,
        py: 4,
      }}
    >
      <Container maxWidth="xl">
        {/* Executive header */}
        <Box sx={{ mb: 4 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'flex-end' }} spacing={2}>
            <Box>
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.5 }}>
                <LockIcon sx={{ fontSize: 16, color: '#C9A227' }} />
                <Typography sx={{ fontSize: 10, letterSpacing: 2, fontWeight: 800, color: '#C9A227', textTransform: 'uppercase' }}>
                  Executive • Yalnızca Admin
                </Typography>
              </Stack>
              <Typography sx={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: { xs: 32, md: 42 }, fontWeight: 700, lineHeight: 1, color: '#F3EEE0' }}>
                North Star Kontrol Paneli
              </Typography>
              <Typography sx={{ mt: 1, fontSize: 13, color: 'rgba(243,238,224,0.65)' }}>
                Merhaba {userName} — platformun nabzı 30 saniyede.
              </Typography>
            </Box>

            <Stack direction="row" spacing={1.5} alignItems="center">
              <Chip
                icon={<DotIcon sx={{ fontSize: '10px !important', color: `${isFetching ? '#f59e0b' : '#22c55e'} !important` }} />}
                label={isFetching ? 'güncelleniyor' : `son: ${lastUpdated}`}
                size="small"
                sx={{
                  bgcolor: 'rgba(255,255,255,0.04)',
                  color: 'rgba(243,238,224,0.8)',
                  fontSize: 11,
                  fontWeight: 600,
                  height: 26,
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              />
              <PeriodSelector value={range} onChange={setRange} />
              <Tooltip title="Yenile" arrow>
                <IconButton onClick={() => refetch()} size="small" sx={{ color: '#C9A227', border: '1px solid rgba(201,162,39,0.2)' }}>
                  <RefreshIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        </Box>

        {/* Partial data warning banner */}
        {allPartial && !isLoading && (
          <Alert
            severity="info"
            icon={false}
            sx={{
              mb: 3,
              bgcolor: 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.25)',
              color: 'rgba(243,238,224,0.85)',
              '& .MuiAlert-message': { width: '100%' },
            }}
            action={
              <Button
                size="small"
                onClick={() => refetch()}
                sx={{ color: '#C9A227', fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}
              >
                Tekrar Dene
              </Button>
            }
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: '#f59e0b' }}>
                BACKEND BEKLENİYOR
              </Typography>
              <Typography sx={{ fontSize: 12 }}>
                Executive endpoint'leri (<code style={{ fontFamily: 'monospace', fontSize: 11 }}>/admin/executive/*</code>) henüz yayında değil. Mevcut servislerden türetilen yaklaşık değerler gösteriliyor.
              </Typography>
            </Stack>
          </Alert>
        )}

        {/* Sections */}
        <Stack spacing={3}>
          <RevenueSection data={data?.revenue ?? null} loading={isLoading} partial={!!partial.revenue} />
          <GrowthSection data={data?.growth ?? null} loading={isLoading} partial={!!partial.growth} />
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3 }}>
            <FunnelSection data={data?.funnel ?? null} loading={isLoading} partial={!!partial.funnel} />
            <OperationalSection data={data?.operational ?? null} loading={isLoading} partial={!!partial.operational} />
          </Box>
          <PlatformHealthSection data={data?.platform ?? null} loading={isLoading} partial={!!partial.platform} />
        </Stack>

        {/* Footer */}
        <Box sx={{ mt: 5, pt: 3, borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
          <Typography sx={{ fontSize: 10, letterSpacing: 2, fontWeight: 700, color: 'rgba(243,238,224,0.3)' }}>
            NARTGO EXECUTIVE • {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
