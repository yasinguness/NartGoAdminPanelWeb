import { useMemo } from 'react';
import {
  Box, Container, Typography, Stack, IconButton, Tooltip, Chip, Alert, Button, Grid, Paper, Skeleton, LinearProgress,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  FiberManualRecord as DotIcon,
  Lock as LockIcon,
  Segment as SegmentIcon,
  OpenInNew as OpenIcon,
  NotificationsActive as NotifyIcon,
} from '@mui/icons-material';
import { Navigate, useNavigate } from 'react-router-dom';
import { useRole } from '../../hooks/useRole';
import { useSegments } from './useSegments';
import type { SegmentItem } from '../../services/segments/segmentTypes';

const CATEGORY_COLOR: Record<string, string> = {
  'Temel': '#3b82f6',
  'Moderasyon': '#f59e0b',
  'Büyüme': '#22c55e',
  'Ticaret': '#C9A227',
  'Churn': '#ef4444',
};

export default function Segments() {
  const { isAdmin } = useRole();
  const navigate = useNavigate();
  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useSegments();

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const segments = data?.segments || [];

  const grouped = useMemo(() => {
    const map = new Map<string, SegmentItem[]>();
    for (const s of segments) {
      const cat = s.category || 'Diğer';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(s);
    }
    return Array.from(map.entries());
  }, [segments]);

  const lastUpdated = useMemo(() => {
    if (!dataUpdatedAt) return '—';
    const diff = Date.now() - dataUpdatedAt;
    if (diff < 60_000) return `${Math.round(diff / 1000)}sn önce`;
    if (diff < 3_600_000) return `${Math.round(diff / 60_000)}dk önce`;
    return new Date(dataUpdatedAt).toLocaleTimeString('tr-TR');
  }, [dataUpdatedAt]);

  return (
    <Box sx={{ minHeight: 'calc(100vh - 64px)', bgcolor: '#060C09', color: '#F3EEE0', mx: { xs: -2, sm: -3 }, my: -3, py: 4 }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2}>
            <Box>
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.5 }}>
                <LockIcon sx={{ fontSize: 16, color: '#C9A227' }} />
                <Typography sx={{ fontSize: 10, letterSpacing: 2, fontWeight: 800, color: '#C9A227', textTransform: 'uppercase' }}>
                  Segments • Growth • Yalnızca Admin
                </Typography>
              </Stack>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{ width: 48, height: 48, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>
                  <SegmentIcon sx={{ fontSize: 28 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: { xs: 28, md: 38 }, fontWeight: 700, lineHeight: 1, color: '#F3EEE0' }}>
                    Kullanıcı Segmentleri
                  </Typography>
                  <Typography sx={{ mt: 0.5, fontSize: 13, color: 'rgba(243,238,224,0.65)' }}>
                    Hazır segmentler · hedefli kampanya için hızlı erişim
                  </Typography>
                </Box>
              </Stack>
            </Box>

            <Stack direction="row" spacing={1.5} alignItems="center">
              <Chip
                icon={<DotIcon sx={{ fontSize: '10px !important', color: `${isFetching ? '#f59e0b' : '#22c55e'} !important` }} />}
                label={isFetching ? 'güncelleniyor' : `son: ${lastUpdated}`}
                size="small"
                sx={{ bgcolor: 'rgba(255,255,255,0.04)', color: 'rgba(243,238,224,0.8)', fontSize: 11, fontWeight: 600, height: 26, border: '1px solid rgba(255,255,255,0.08)' }}
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
          <Alert severity="info" icon={false} sx={{ mb: 3, bgcolor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: 'rgba(243,238,224,0.85)' }}
            action={<Button size="small" onClick={() => refetch()} sx={{ color: '#C9A227', fontSize: 11, fontWeight: 700 }}>Tekrar Dene</Button>}>
            <Typography sx={{ fontSize: 12 }}>
              <code style={{ fontFamily: 'monospace', fontSize: 11 }}>/auth/admin/segments/overview</code> endpoint'ine ulaşılamadı.
            </Typography>
          </Alert>
        )}

        {/* Grouped segments */}
        {isLoading ? (
          <Grid container spacing={2}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
                <Skeleton variant="rectangular" height={160} sx={{ bgcolor: 'rgba(255,255,255,0.04)', borderRadius: 2 }} />
              </Grid>
            ))}
          </Grid>
        ) : grouped.length === 0 ? (
          <Paper variant="outlined" sx={{ py: 6, textAlign: 'center', bgcolor: '#0A130F', borderColor: 'rgba(201,162,39,0.12)' }}>
            <Typography sx={{ fontSize: 12, color: 'rgba(243,238,224,0.4)', fontStyle: 'italic' }}>
              Segment verisi yok
            </Typography>
          </Paper>
        ) : (
          <Stack spacing={4}>
            {grouped.map(([category, items]) => (
              <Box key={category}>
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
                  <Box sx={{ width: 4, height: 24, borderRadius: 0.5, bgcolor: CATEGORY_COLOR[category] || '#C9A227' }} />
                  <Typography sx={{ fontSize: 12, letterSpacing: 2, fontWeight: 800, color: 'rgba(243,238,224,0.7)', textTransform: 'uppercase' }}>
                    {category}
                  </Typography>
                  <Chip label={items.length} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.06)', color: 'rgba(243,238,224,0.7)', fontSize: 10, fontWeight: 700, height: 18 }} />
                </Stack>

                <Grid container spacing={2}>
                  {items.map(segment => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={segment.key}>
                      <SegmentCard
                        segment={segment}
                        color={CATEGORY_COLOR[category] || '#C9A227'}
                        onOpen={() => {
                          if (segment.filterUrl) navigate(segment.filterUrl);
                          else navigate('/users');
                        }}
                        onNotify={() => navigate(`/notifications?segment=${segment.key}`)}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Box>
            ))}
          </Stack>
        )}

        <Box sx={{ mt: 5, pt: 3, borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
          <Typography sx={{ fontSize: 10, letterSpacing: 2, fontWeight: 700, color: 'rgba(243,238,224,0.3)' }}>
            NARTGO GROWTH • {segments.length} segment · {segments.reduce((s, v) => s + v.count, 0).toLocaleString('tr-TR')} toplam kullanıcı
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}

function SegmentCard({
  segment, color, onOpen, onNotify,
}: {
  segment: SegmentItem; color: string; onOpen: () => void; onNotify: () => void;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2.5, borderRadius: 2,
        bgcolor: '#0A130F', borderColor: 'rgba(201,162,39,0.12)',
        display: 'flex', flexDirection: 'column',
        height: '100%',
        '&:hover': { borderColor: `${color}66`, bgcolor: 'rgba(201,162,39,0.03)' },
        transition: 'border-color 200ms, background-color 200ms',
      }}
    >
      <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'rgba(243,238,224,0.7)', letterSpacing: 0.5, mb: 0.5 }}>
        {segment.label}
      </Typography>
      <Typography sx={{ fontSize: 10, color: 'rgba(243,238,224,0.45)', fontStyle: 'italic', minHeight: 30 }}>
        {segment.description || ''}
      </Typography>

      <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mt: 1.5 }}>
        <Typography sx={{
          fontFamily: 'Georgia, serif', fontStyle: 'italic',
          fontSize: 32, fontWeight: 700, color, lineHeight: 1,
        }}>
          {segment.count.toLocaleString('tr-TR')}
        </Typography>
        {segment.percentOfTotal !== undefined && (
          <Typography sx={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(243,238,224,0.5)' }}>
            %{segment.percentOfTotal.toFixed(1)}
          </Typography>
        )}
      </Stack>

      {segment.percentOfTotal !== undefined && (
        <LinearProgress
          variant="determinate"
          value={Math.min(100, segment.percentOfTotal)}
          sx={{
            mt: 1, height: 4, borderRadius: 2,
            bgcolor: 'rgba(255,255,255,0.05)',
            '& .MuiLinearProgress-bar': { bgcolor: color },
          }}
        />
      )}

      <Box sx={{ flex: 1 }} />

      <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<OpenIcon sx={{ fontSize: 12 }} />}
          onClick={onOpen}
          disabled={segment.count === 0}
          sx={{
            flex: 1,
            borderColor: 'rgba(255,255,255,0.1)',
            color: 'rgba(243,238,224,0.8)',
            fontSize: 10, fontWeight: 700,
            '&:hover': { borderColor: color, color, bgcolor: `${color}15` },
          }}
        >
          Göster
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<NotifyIcon sx={{ fontSize: 12 }} />}
          onClick={onNotify}
          disabled={segment.count === 0}
          sx={{
            flex: 1,
            borderColor: 'rgba(201,162,39,0.3)',
            color: '#C9A227',
            fontSize: 10, fontWeight: 700,
            '&:hover': { borderColor: '#C9A227', bgcolor: 'rgba(201,162,39,0.08)' },
          }}
        >
          Bildirim
        </Button>
      </Stack>
    </Paper>
  );
}
