/**
 * Ürün Kullanım Analitiği — mobile SDK event'lerinden türetilen insightlar.
 *
 * Endpoint'ler:
 *   GET /analytics/admin/events/top
 *   GET /analytics/admin/events/by-platform
 *   GET /analytics/admin/events/daily-trend
 *   GET /analytics/admin/events/first-screen-distribution
 */
import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Stack, Paper, Grid, Typography, Skeleton, Alert, Chip,
  ToggleButtonGroup, ToggleButton, Autocomplete, TextField, LinearProgress,
} from '@mui/material';
import {
  Insights as InsightsIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
} from 'recharts';
import AdminShell from '../../components/AdminShell';
import { useRole } from '../../hooks/useRole';
import { darkAdmin } from '../../theme/darkAdmin';
import { productAnalyticsService } from '../../services/analytics/productAnalyticsService';

const DAY_OPTIONS = [7, 14, 30] as const;

const PLATFORM_COLORS: Record<string, string> = {
  ANDROID: '#22c55e',
  IOS: '#3b82f6',
  WEB: '#8b5cf6',
  UNKNOWN: '#94a3b8',
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
  } catch {
    return iso.slice(0, 10);
  }
}

function SectionCard({
  title, subtitle, children, minHeight,
}: { title: string; subtitle?: string; children: React.ReactNode; minHeight?: number }) {
  return (
    <Paper variant="outlined" sx={{
      p: 2.5, borderRadius: 2, bgcolor: darkAdmin.bg.card,
      borderColor: darkAdmin.border.default, height: '100%', minHeight,
    }}>
      <Box sx={{ mb: 2 }}>
        <Typography sx={{ ...darkAdmin.sx.sectionLabel }}>{title}</Typography>
        {subtitle && (
          <Typography sx={{ mt: 0.5, fontSize: 11, color: darkAdmin.text.secondary }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {children}
    </Paper>
  );
}

export default function ProductAnalytics() {
  const { isAdmin } = useRole();
  const [days, setDays] = useState<number>(7);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);

  const topQuery = useQuery({
    queryKey: ['product-analytics', 'top-events', days],
    queryFn: () => productAnalyticsService.getTopEvents(days, 20),
    staleTime: 120_000,
    enabled: isAdmin,
  });

  const platformQuery = useQuery({
    queryKey: ['product-analytics', 'by-platform', days],
    queryFn: () => productAnalyticsService.getEventsByPlatform(days),
    staleTime: 120_000,
    enabled: isAdmin,
  });

  const firstScreenQuery = useQuery({
    queryKey: ['product-analytics', 'first-screen', days],
    queryFn: () => productAnalyticsService.getFirstScreenDistribution(days),
    staleTime: 120_000,
    enabled: isAdmin,
  });

  const trendQuery = useQuery({
    queryKey: ['product-analytics', 'daily-trend', selectedEvent, 30],
    queryFn: () => productAnalyticsService.getDailyTrend(selectedEvent || '', 30),
    staleTime: 120_000,
    enabled: isAdmin && !!selectedEvent,
  });

  const anyFetching =
    topQuery.isFetching || platformQuery.isFetching ||
    firstScreenQuery.isFetching || trendQuery.isFetching;

  const anyLoading = topQuery.isLoading || platformQuery.isLoading || firstScreenQuery.isLoading;

  const lastUpdated = Math.max(
    topQuery.dataUpdatedAt || 0,
    platformQuery.dataUpdatedAt || 0,
    firstScreenQuery.dataUpdatedAt || 0,
    trendQuery.dataUpdatedAt || 0,
  );

  const topEvents = topQuery.data ?? [];
  const platforms = platformQuery.data ?? [];
  const firstScreens = firstScreenQuery.data ?? [];
  const trend = trendQuery.data ?? [];

  const allEmpty =
    !anyLoading && topEvents.length === 0 && platforms.length === 0 && firstScreens.length === 0;

  const totalEvents = useMemo(
    () => topEvents.reduce((s, e) => s + (e.count || 0), 0),
    [topEvents],
  );
  const totalUniqueUsers = useMemo(
    () => platforms.reduce((s, p) => s + (p.userCount || 0), 0),
    [platforms],
  );
  const topPlatform = useMemo(() => {
    if (platforms.length === 0) return null;
    return [...platforms].sort((a, b) => b.userCount - a.userCount)[0];
  }, [platforms]);

  const eventOptions = useMemo(() => topEvents.map(e => e.eventName), [topEvents]);
  const maxEventCount = Math.max(...topEvents.map(e => e.count), 1);

  // İlk render'da default seçili event: en popüler
  const effectiveSelected = selectedEvent ?? eventOptions[0] ?? null;

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <AdminShell
      title="Ürün Kullanım Analitiği"
      subtitle="Mobile SDK event'lerinden türetilen kullanım insightları"
      icon={<InsightsIcon sx={{ fontSize: 26 }} />}
      label="Kullanıcı Etkileşimi • Yalnızca Admin"
      isFetching={anyFetching}
      lastUpdatedAt={lastUpdated || null}
      onRefresh={() => {
        topQuery.refetch();
        platformQuery.refetch();
        firstScreenQuery.refetch();
        if (effectiveSelected) trendQuery.refetch();
      }}
      actions={
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
                bgcolor: 'rgba(201,162,39,0.18)',
                color: darkAdmin.status.primary,
              },
            },
          }}
        >
          {DAY_OPTIONS.map(d => (
            <ToggleButton key={d} value={d}>{d}g</ToggleButton>
          ))}
        </ToggleButtonGroup>
      }
    >
      {/* Info banner — SDK bilgilendirme */}
      <Alert
        severity="info"
        icon={<InfoIcon sx={{ fontSize: 18 }} />}
        sx={{
          mb: 3,
          bgcolor: 'rgba(37,99,235,0.06)',
          border: '1px solid rgba(37,99,235,0.2)',
          color: darkAdmin.text.primary,
          '& .MuiAlert-icon': { color: darkAdmin.status.info },
        }}
      >
        <Typography sx={{ fontSize: 12 }}>
          Bu veriler mobile SDK'nın{' '}
          <code style={{ fontFamily: 'monospace', fontSize: 11, background: 'rgba(0,0,0,0.05)', padding: '1px 4px', borderRadius: 3 }}>
            /analytics/events/track
          </code>{' '}
          endpoint'ine POST attığı event'lerden biriktiriliyor.
        </Typography>
      </Alert>

      {allEmpty && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
            Henüz analytics event'i bulunamadı.
          </Typography>
          <Typography sx={{ fontSize: 11, color: darkAdmin.text.secondary, mt: 0.5 }}>
            Mobile app SDK'sının event gönderdiğinden emin olun. Ayrıca{' '}
            <code style={{ fontFamily: 'monospace' }}>/analytics/events/track-batch</code>{' '}
            endpoint'i de kullanılabilir.
          </Typography>
        </Alert>
      )}

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ p: 2, ...darkAdmin.sx.statTile, height: '100%' }}>
            <Typography sx={{ ...darkAdmin.sx.sectionLabel }}>Toplam Event (son {days}g)</Typography>
            {anyLoading ? (
              <Skeleton variant="text" width="60%" height={36} sx={{ bgcolor: 'rgba(0,0,0,0.06)' }} />
            ) : (
              <Typography sx={{ ...darkAdmin.sx.kpiValue, color: darkAdmin.status.primary, mt: 0.5 }}>
                {totalEvents.toLocaleString('tr-TR')}
              </Typography>
            )}
            <Typography sx={{ mt: 0.5, fontSize: 10, color: darkAdmin.text.muted }}>
              top 20 event toplamı
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ p: 2, ...darkAdmin.sx.statTile, height: '100%' }}>
            <Typography sx={{ ...darkAdmin.sx.sectionLabel }}>Unique Kullanıcı</Typography>
            {anyLoading ? (
              <Skeleton variant="text" width="60%" height={36} sx={{ bgcolor: 'rgba(0,0,0,0.06)' }} />
            ) : (
              <Typography sx={{ ...darkAdmin.sx.kpiValue, color: darkAdmin.status.info, mt: 0.5 }}>
                {totalUniqueUsers.toLocaleString('tr-TR')}
              </Typography>
            )}
            <Typography sx={{ mt: 0.5, fontSize: 10, color: darkAdmin.text.muted }}>
              platformlar toplamı
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ p: 2, ...darkAdmin.sx.statTile, height: '100%' }}>
            <Typography sx={{ ...darkAdmin.sx.sectionLabel }}>En Aktif Platform</Typography>
            {anyLoading ? (
              <Skeleton variant="text" width="60%" height={36} sx={{ bgcolor: 'rgba(0,0,0,0.06)' }} />
            ) : topPlatform ? (
              <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mt: 0.5 }}>
                <Typography sx={{ ...darkAdmin.sx.kpiValue, color: PLATFORM_COLORS[topPlatform.platform] || darkAdmin.status.success }}>
                  {topPlatform.platform}
                </Typography>
                <Typography sx={{ fontSize: 13, color: darkAdmin.text.secondary, fontWeight: 600 }}>
                  {topPlatform.userCount.toLocaleString('tr-TR')} kullanıcı
                </Typography>
              </Stack>
            ) : (
              <Typography sx={{ ...darkAdmin.sx.kpiValue, color: darkAdmin.text.muted, mt: 0.5 }}>—</Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Top events + Platform breakdown */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={7}>
          <SectionCard title="Top Event'ler" subtitle={`Son ${days} günde en çok tetiklenen event'ler`} minHeight={420}>
            {topQuery.isLoading ? (
              <Stack spacing={1}>
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <Skeleton key={i} variant="rectangular" height={30} sx={{ bgcolor: 'rgba(0,0,0,0.04)', borderRadius: 0.5 }} />
                ))}
              </Stack>
            ) : topEvents.length === 0 ? (
              <Typography sx={{ fontSize: 12, color: darkAdmin.text.secondary, py: 4, textAlign: 'center' }}>
                Event bulunamadı.
              </Typography>
            ) : (
              <Stack spacing={1}>
                {topEvents.map((e, idx) => {
                  const pct = (e.count / maxEventCount) * 100;
                  return (
                    <Box
                      key={e.eventName}
                      sx={{
                        px: 1, py: 0.75, borderRadius: 1,
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'rgba(201,162,39,0.05)' },
                      }}
                      onClick={() => setSelectedEvent(e.eventName)}
                    >
                      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.5 }}>
                        <Typography sx={{ fontSize: 10, color: darkAdmin.text.muted, width: 20, fontWeight: 700 }}>
                          {idx + 1}
                        </Typography>
                        <Typography sx={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 600, flex: 1, color: darkAdmin.text.primary }}>
                          {e.eventName}
                        </Typography>
                        <Typography sx={{ fontSize: 12, fontWeight: 800, color: darkAdmin.status.primary, fontFamily: 'monospace' }}>
                          {e.count.toLocaleString('tr-TR')}
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate" value={pct}
                        sx={{
                          height: 4, borderRadius: 2,
                          bgcolor: 'rgba(0,0,0,0.04)',
                          '& .MuiLinearProgress-bar': { bgcolor: darkAdmin.status.primary },
                        }}
                      />
                    </Box>
                  );
                })}
              </Stack>
            )}
          </SectionCard>
        </Grid>

        <Grid item xs={12} md={5}>
          <SectionCard title="Platform Dağılımı" subtitle={`Son ${days}g · unique user`} minHeight={420}>
            {platformQuery.isLoading ? (
              <Skeleton variant="circular" width={200} height={200} sx={{ mx: 'auto', bgcolor: 'rgba(0,0,0,0.04)' }} />
            ) : platforms.length === 0 ? (
              <Typography sx={{ fontSize: 12, color: darkAdmin.text.secondary, py: 4, textAlign: 'center' }}>
                Platform verisi yok.
              </Typography>
            ) : (
              <Box sx={{ height: 320 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={platforms}
                      dataKey="userCount"
                      nameKey="platform"
                      cx="50%" cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      label={(entry: any) => `${entry.platform}: ${entry.userCount}`}
                      labelLine={false}
                    >
                      {platforms.map((p) => (
                        <Cell key={p.platform} fill={PLATFORM_COLORS[p.platform] || '#94a3b8'} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{
                        background: '#FFFFFF',
                        border: `1px solid ${darkAdmin.border.default}`,
                        borderRadius: 6,
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            )}
            {!platformQuery.isLoading && platforms.length > 0 && (
              <Stack direction="row" spacing={1.5} justifyContent="center" flexWrap="wrap" sx={{ mt: 1 }}>
                {platforms.map(p => (
                  <Chip
                    key={p.platform}
                    size="small"
                    label={`${p.platform}: ${p.userCount}`}
                    sx={{
                      bgcolor: `${PLATFORM_COLORS[p.platform] || '#94a3b8'}22`,
                      color: PLATFORM_COLORS[p.platform] || '#94a3b8',
                      fontSize: 10, fontWeight: 700, height: 22,
                    }}
                  />
                ))}
              </Stack>
            )}
          </SectionCard>
        </Grid>
      </Grid>

      {/* First screen distribution */}
      <Box sx={{ mb: 3 }}>
        <SectionCard title="Login Sonrası İlk Ekran" subtitle={`Son ${days}g · kullanıcıların login sonrası ilk açtığı ekranlar`}>
          {firstScreenQuery.isLoading ? (
            <Skeleton variant="rectangular" height={300} sx={{ bgcolor: 'rgba(0,0,0,0.04)', borderRadius: 1 }} />
          ) : firstScreens.length === 0 ? (
            <Typography sx={{ fontSize: 12, color: darkAdmin.text.secondary, py: 4, textAlign: 'center' }}>
              İlk ekran verisi yok.
            </Typography>
          ) : (
            <Box sx={{ height: 320 }}>
              <ResponsiveContainer>
                <BarChart data={firstScreens} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                  <XAxis
                    dataKey="screenName"
                    tick={{ fontSize: 10, fill: darkAdmin.text.secondary }}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fontSize: 10, fill: darkAdmin.text.secondary }} />
                  <RechartsTooltip
                    contentStyle={{
                      background: '#FFFFFF',
                      border: `1px solid ${darkAdmin.border.default}`,
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                    formatter={(value: any, _name, props: any) => [
                      `${value} kullanıcı (%${(props?.payload?.percentage ?? 0).toFixed(1)})`,
                      'Kullanıcı',
                    ]}
                  />
                  <Bar dataKey="userCount" fill={darkAdmin.status.primary} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          )}
        </SectionCard>
      </Box>

      {/* Event trend */}
      <Box sx={{ mb: 3 }}>
        <SectionCard
          title="Event Trendi (Son 30 gün)"
          subtitle="Seçilen event'in günlük trendi"
        >
          <Autocomplete
            size="small"
            options={eventOptions}
            value={effectiveSelected}
            onChange={(_, v) => setSelectedEvent(v)}
            sx={{ mb: 2, maxWidth: 360 }}
            renderInput={(params) => (
              <TextField {...params} label="Event seç" placeholder="event_name" />
            )}
            disabled={eventOptions.length === 0}
          />

          {!effectiveSelected ? (
            <Typography sx={{ fontSize: 12, color: darkAdmin.text.secondary, py: 4, textAlign: 'center' }}>
              Önce bir event seçin.
            </Typography>
          ) : trendQuery.isLoading ? (
            <Skeleton variant="rectangular" height={280} sx={{ bgcolor: 'rgba(0,0,0,0.04)', borderRadius: 1 }} />
          ) : trend.length === 0 ? (
            <Typography sx={{ fontSize: 12, color: darkAdmin.text.secondary, py: 4, textAlign: 'center' }}>
              Seçili event için veri bulunamadı.
            </Typography>
          ) : (
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer>
                <AreaChart data={trend} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                  <defs>
                    <linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={darkAdmin.status.primary} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={darkAdmin.status.primary} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    tick={{ fontSize: 10, fill: darkAdmin.text.secondary }}
                  />
                  <YAxis tick={{ fontSize: 10, fill: darkAdmin.text.secondary }} />
                  <RechartsTooltip
                    contentStyle={{
                      background: '#FFFFFF',
                      border: `1px solid ${darkAdmin.border.default}`,
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                    labelFormatter={(v) => formatDate(String(v))}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke={darkAdmin.status.primary}
                    strokeWidth={2}
                    fill="url(#goldFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          )}
        </SectionCard>
      </Box>
    </AdminShell>
  );
}
