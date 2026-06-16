/**
 * AnalyticsDashboard — Admin Panel kullanım analitikleri
 * Hangi ekran en çok açılıyor, nerede zaman harcanıyor, hangi özellikler kullanılıyor
 */
import { useState, useMemo } from 'react';
import {
  Box, Typography, Stack, Paper, Chip, Button, Select, MenuItem,
  FormControl, Table, TableHead, TableRow, TableCell,
  TableBody, LinearProgress, Tooltip, IconButton, alpha, useTheme,
} from '@mui/material';
import {
  TrendingUp as TrendingIcon, AccessTime as TimeIcon,
  Visibility as ViewIcon, TouchApp as ActionIcon,
  Delete as DeleteIcon, Download as DownloadIcon,
  Refresh as RefreshIcon, Schedule as ScheduleIcon,
} from '@mui/icons-material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';
import { analyticsService } from '../../services/analytics/analyticsService';
import type { AnalyticsSummary } from '../../services/analytics/analyticsService';

const CHART_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ef4444', '#ec4899', '#06b6d4', '#84cc16'];

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const remSec = sec % 60;
  if (min < 60) return `${min}dk ${remSec}s`;
  const hr = Math.floor(min / 60);
  return `${hr}sa ${min % 60}dk`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

const cardSx = {
  bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider',
  borderRadius: 3, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
};

export default function AnalyticsDashboard() {
  const theme = useTheme();
  const [daysBack, setDaysBack] = useState(30);
  const [refreshKey, setRefreshKey] = useState(0);

  const summary: AnalyticsSummary = useMemo(
    () => analyticsService.getSummary(daysBack),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [daysBack, refreshKey]
  );

  const maxViews = Math.max(...summary.topPages.map(p => p.totalViews), 1);
  const maxDuration = Math.max(...summary.topPages.map(p => p.avgDurationMs), 1);

  const handleExport = () => {
    const data = JSON.stringify(analyticsService.exportRaw(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `admin_analytics_${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    if (window.confirm('Tüm analitik verileri silinecek. Emin misiniz?')) {
      analyticsService.clearAll();
      setRefreshKey(k => k + 1);
    }
  };

  return (
    <Box sx={{ p: 4 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={800} letterSpacing={-0.5}>Panel Analitik</Typography>
          <Typography variant="body2" color="text.secondary">
            Admin panelde hangi ekranlar en çok kullanılıyor, nerede zaman harcanıyor
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select value={daysBack} onChange={e => setDaysBack(Number(e.target.value))}
              sx={{ borderRadius: 2, fontSize: 13 }}>
              <MenuItem value={7}>Son 7 gün</MenuItem>
              <MenuItem value={14}>Son 14 gün</MenuItem>
              <MenuItem value={30}>Son 30 gün</MenuItem>
              <MenuItem value={90}>Son 90 gün</MenuItem>
            </Select>
          </FormControl>
          <Tooltip title="Yenile">
            <IconButton size="small" onClick={() => setRefreshKey(k => k + 1)}><RefreshIcon fontSize="small" /></IconButton>
          </Tooltip>
          <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={handleExport}
            sx={{ textTransform: 'none', borderRadius: 2 }}>JSON</Button>
          <Button size="small" variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={handleClear}
            sx={{ textTransform: 'none', borderRadius: 2 }}>Sıfırla</Button>
        </Stack>
      </Stack>

      {/* KPI Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: 3 }}>
        {[
          { label: 'Toplam Görüntüleme', value: summary.totalPageViews, icon: <ViewIcon />, color: theme.palette.primary.main },
          { label: 'Toplam Aksiyon', value: summary.totalActions, icon: <ActionIcon />, color: theme.palette.success.main },
          { label: 'Toplam Süre', value: formatDuration(summary.totalSessionTimeMs), icon: <TimeIcon />, color: theme.palette.warning.main },
          { label: 'Aktif Sayfa', value: summary.topPages.length, icon: <TrendingIcon />, color: theme.palette.info.main },
        ].map((kpi, i) => (
          <Paper key={i} sx={{ ...cardSx, p: 2.5 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box sx={{
                width: 44, height: 44, borderRadius: 2,
                bgcolor: alpha(kpi.color, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: kpi.color,
              }}>
                {kpi.icon}
              </Box>
              <Box>
                <Typography variant="h5" fontWeight={800} fontFamily="JetBrains Mono, monospace" sx={{ color: kpi.color }}>
                  {kpi.value}
                </Typography>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>{kpi.label}</Typography>
              </Box>
            </Stack>
          </Paper>
        ))}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 2, mb: 3 }}>
        {/* En Çok Açılan Sayfalar */}
        <Box sx={cardSx}>
          <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle2" fontWeight={700}>En Çok Açılan Sayfalar</Typography>
            <Typography variant="caption" color="text.secondary">Görüntüleme sayısına göre sıralı</Typography>
          </Box>
          {summary.topPages.length === 0 ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <Typography variant="body2" color="text.disabled">Henüz veri yok. Panel kullanıldıkça veriler burada görünecek.</Typography>
            </Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  {['Sayfa', 'Görüntüleme', 'Ort. Süre', 'Toplam Süre', ''].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary' }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {summary.topPages.slice(0, 15).map((page, i) => (
                  <TableRow key={page.path} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Box sx={{
                          width: 24, height: 24, borderRadius: 1,
                          bgcolor: alpha(CHART_COLORS[i % CHART_COLORS.length], 0.12),
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 800, color: CHART_COLORS[i % CHART_COLORS.length],
                        }}>
                          {i + 1}
                        </Box>
                        <Box>
                          <Typography variant="body2" fontWeight={600} fontSize={13}>{page.pageName}</Typography>
                          <Typography variant="caption" color="text.disabled" fontFamily="monospace" fontSize={10}>{page.path}</Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack spacing={0.5}>
                        <Typography variant="body2" fontWeight={700} fontFamily="monospace">{page.totalViews}</Typography>
                        <LinearProgress variant="determinate" value={(page.totalViews / maxViews) * 100}
                          sx={{ height: 3, borderRadius: 2, width: 80, bgcolor: 'grey.100',
                            '& .MuiLinearProgress-bar': { bgcolor: CHART_COLORS[i % CHART_COLORS.length], borderRadius: 2 }
                          }} />
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace" fontSize={12}>{formatDuration(page.avgDurationMs)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace" fontSize={12} color="text.secondary">
                        {formatDuration(page.totalDurationMs)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <LinearProgress variant="determinate" value={(page.avgDurationMs / maxDuration) * 100}
                        sx={{ height: 3, borderRadius: 2, width: 60, bgcolor: 'grey.100',
                          '& .MuiLinearProgress-bar': { bgcolor: theme.palette.warning.main, borderRadius: 2 }
                        }} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Box>

        {/* Sayfa Dağılımı (Pie) */}
        <Box sx={cardSx}>
          <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle2" fontWeight={700}>Sayfa Dağılımı</Typography>
          </Box>
          <Box sx={{ p: 2, height: 300 }}>
            {summary.topPages.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={summary.topPages.slice(0, 8).map((p, i) => ({
                      name: p.pageName,
                      value: p.totalViews,
                      fill: CHART_COLORS[i % CHART_COLORS.length],
                    }))}
                    cx="50%" cy="50%" innerRadius={45} outerRadius={90}
                    paddingAngle={2} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {summary.topPages.slice(0, 8).map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="body2" color="text.disabled">Veri bekleniyor...</Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2, mb: 3 }}>
        {/* Günlük Aktivite */}
        <Box sx={cardSx}>
          <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle2" fontWeight={700}>Günlük Aktivite</Typography>
          </Box>
          <Box sx={{ p: 2, height: 220 }}>
            {summary.dailyActivity.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={summary.dailyActivity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={formatDate} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <RechartsTooltip />
                  <Area type="monotone" dataKey="views" stroke="#3b82f6" fill={alpha('#3b82f6', 0.15)} name="Görüntüleme" />
                  <Area type="monotone" dataKey="actions" stroke="#22c55e" fill={alpha('#22c55e', 0.15)} name="Aksiyon" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="body2" color="text.disabled">Veri bekleniyor...</Typography>
              </Box>
            )}
          </Box>
        </Box>

        {/* Yoğun Saatler */}
        <Box sx={cardSx}>
          <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <ScheduleIcon sx={{ fontSize: 16 }} />
              <Typography variant="subtitle2" fontWeight={700}>Yoğun Saatler</Typography>
            </Stack>
          </Box>
          <Box sx={{ p: 2, height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.peakHours}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} tickFormatter={h => `${h}:00`} />
                <YAxis tick={{ fontSize: 10 }} />
                <RechartsTooltip labelFormatter={h => `${h}:00 - ${Number(h) + 1}:00`} />
                <Bar dataKey="count" fill="#a855f7" radius={[4, 4, 0, 0]} name="Sayfa Görüntüleme" />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Box>
      </Box>

      {/* En Çok Kullanılan Aksiyonlar */}
      {summary.topActions.length > 0 && (
        <Box sx={cardSx}>
          <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle2" fontWeight={700}>En Çok Kullanılan Özellikler</Typography>
          </Box>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                {['Özellik', 'Kullanım', 'Son Kullanım', 'Sayfalar'].map(h => (
                  <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary' }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {summary.topActions.slice(0, 10).map((action) => (
                <TableRow key={action.action} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600} fontSize={13}>{action.action}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={action.count} size="small" sx={{ fontWeight: 700, fontFamily: 'monospace' }} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(action.lastUsed).toLocaleString('tr-TR')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      {action.paths.slice(0, 3).map(p => (
                        <Chip key={p} label={p} size="small" variant="outlined"
                          sx={{ height: 20, fontSize: '0.6rem' }} />
                      ))}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}

      {/* İpucu */}
      <Paper sx={{ p: 2, mt: 3, borderRadius: 2, bgcolor: alpha(theme.palette.info.main, 0.04), border: '1px solid', borderColor: alpha(theme.palette.info.main, 0.2) }}>
        <Typography variant="body2" color="text.secondary">
          <strong>Nasıl çalışır:</strong> Panelde gezindikçe sayfa görüntülemeleri ve aksiyonlar otomatik kaydedilir.
          Veriler tarayıcınızda saklanır (localStorage). Bireysel aksiyonları izlemek için sayfalarda{' '}
          <code style={{ fontSize: 11, background: '#f1f5f9', padding: '1px 4px', borderRadius: 3 }}>trackAction('aksiyon_adi')</code>{' '}
          kullanabilirsiniz.
        </Typography>
      </Paper>
    </Box>
  );
}
