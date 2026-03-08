import { ReactNode, SyntheticEvent, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  alpha,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Security as SecurityIcon,
  Insights as InsightsIcon,
  Timeline as TimelineIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { format, subDays } from 'date-fns';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { PageContainer, PageHeader, PageSection } from '../components/Page';
import { StatCard } from '../components/Data';
import { adminLoginStatsService } from '../services/auth/adminLoginStatsService';
import {
  ActiveAlertDto,
  AnomalySpikeDto,
  AuditTimelineEventDto,
  DailyLoginStatsDto,
  FailureReasonStatsDto,
  LoginStatsOverviewDto,
  RecentLoginLogDto,
  RecentUserSessionDto,
  RiskOverviewDto,
  RiskTopIpDto,
  RiskTopUserDto,
  SessionQualityDto,
} from '../types/security/loginStats';

const CHART_COLORS = ['#16a34a', '#ef4444', '#2563eb', '#9333ea', '#f59e0b', '#0ea5e9'];

type RangePreset = '7d' | '30d' | '90d';

type TabKey = 'overview' | 'security' | 'sessions' | 'audit';

interface TabPanelProps {
  value: TabKey;
  name: TabKey;
  children: ReactNode;
}

function TabPanel({ value, name, children }: TabPanelProps) {
  if (value !== name) {
    return null;
  }
  return <Box sx={{ mt: 3 }}>{children}</Box>;
}

const getDateRangeForPreset = (preset: RangePreset): { startDate: string; endDate: string } => {
  const today = new Date();
  const days = preset === '7d' ? 7 : preset === '90d' ? 90 : 30;

  return {
    startDate: format(subDays(today, days - 1), 'yyyy-MM-dd'),
    endDate: format(today, 'yyyy-MM-dd'),
  };
};

const formatDateTime = (value?: string | null): string => {
  if (!value) {
    return '-';
  }

  // Backend sends zone-less timestamps (e.g. 2026-02-28T16:48:12) that represent UTC.
  // If timezone suffix is missing, force UTC parsing by appending 'Z'.
  const hasTimeZone = /[zZ]|[+-]\d{2}:\d{2}$/.test(value);
  const normalized = hasTimeZone ? value : `${value}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(date);
};

const statusColor = (status?: string | null): 'success' | 'error' | 'warning' | 'default' => {
  const normalized = (status || '').toUpperCase();
  if (normalized === 'SUCCESS') {
    return 'success';
  }
  if (normalized === 'FAILED' || normalized === 'FAILURE') {
    return 'error';
  }
  if (normalized === 'SUSPICIOUS' || normalized === 'BLOCKED') {
    return 'warning';
  }
  return 'default';
};

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [selectedPreset, setSelectedPreset] = useState<RangePreset>('30d');
  const [startDate, setStartDate] = useState<string>(() => getDateRangeForPreset('30d').startDate);
  const [endDate, setEndDate] = useState<string>(() => getDateRangeForPreset('30d').endDate);

  const [failureLimit, setFailureLimit] = useState<number>(10);
  const [recentLimit, setRecentLimit] = useState<number>(20);
  const [riskLimit, setRiskLimit] = useState<number>(20);
  const [auditLimit, setAuditLimit] = useState<number>(50);
  const [auditUserId, setAuditUserId] = useState<string>('');
  const [anomalyWindow, setAnomalyWindow] = useState<string>('24h');
  const [showUniqueUsersLine, setShowUniqueUsersLine] = useState<boolean>(true);

  const [loading, setLoading] = useState<boolean>(true);
  const [auditLoading, setAuditLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [overview, setOverview] = useState<LoginStatsOverviewDto | null>(null);
  const [dailyTrend, setDailyTrend] = useState<DailyLoginStatsDto[]>([]);
  const [failureReasons, setFailureReasons] = useState<FailureReasonStatsDto[]>([]);
  const [recentLogs, setRecentLogs] = useState<RecentLoginLogDto[]>([]);
  const [recentUsers, setRecentUsers] = useState<RecentUserSessionDto[]>([]);

  const [sessionQuality, setSessionQuality] = useState<SessionQualityDto | null>(null);
  const [riskOverview, setRiskOverview] = useState<RiskOverviewDto | null>(null);
  const [riskTopUsers, setRiskTopUsers] = useState<RiskTopUserDto[]>([]);
  const [riskTopIps, setRiskTopIps] = useState<RiskTopIpDto[]>([]);
  const [anomalySpikes, setAnomalySpikes] = useState<AnomalySpikeDto[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<ActiveAlertDto[]>([]);

  const [auditTimeline, setAuditTimeline] = useState<AuditTimelineEventDto[]>([]);

  const { enqueueSnackbar } = useSnackbar();

  const dateRangeLabel = useMemo(() => `${startDate} - ${endDate}`, [startDate, endDate]);

  const validateDateRange = (): boolean => {
    if (!startDate || !endDate) {
      enqueueSnackbar('Başlangıç ve bitiş tarihi zorunludur.', { variant: 'warning' });
      return false;
    }

    if (startDate > endDate) {
      enqueueSnackbar('Başlangıç tarihi bitiş tarihinden büyük olamaz.', { variant: 'warning' });
      return false;
    }

    return true;
  };

  const fetchAuditTimeline = async (options?: { silent?: boolean }) => {
    if (!validateDateRange()) {
      return;
    }

    if (!options?.silent) {
      setAuditLoading(true);
    }

    try {
      const timeline = await adminLoginStatsService.getAuditTimeline({
        startDate,
        endDate,
        userId: auditUserId || undefined,
        limit: auditLimit,
      });
      setAuditTimeline(timeline);
    } catch (timelineError: any) {
      const message = timelineError.response?.data?.message || timelineError.message || 'Denetim zaman çizelgesi alınamadı.';
      enqueueSnackbar(message, { variant: 'error' });
      setAuditTimeline([]);
    } finally {
      if (!options?.silent) {
        setAuditLoading(false);
      }
    }
  };

  const fetchAllAnalytics = async () => {
    if (!validateDateRange()) {
      return;
    }

    setLoading(true);
    setError(null);

    const query = { startDate, endDate };

    const results = await Promise.allSettled([
      adminLoginStatsService.getOverview(query),
      adminLoginStatsService.getDailyTrend(query),
      adminLoginStatsService.getFailureReasons({ ...query, limit: failureLimit }),
      adminLoginStatsService.getRecentLogs({ ...query, limit: recentLimit }),
      adminLoginStatsService.getRecentUsers({ ...query, limit: recentLimit }),
      adminLoginStatsService.getSessionQuality(query),
      adminLoginStatsService.getRiskOverview(query),
      adminLoginStatsService.getRiskTopUsers({ ...query, limit: riskLimit }),
      adminLoginStatsService.getRiskTopIps({ ...query, limit: riskLimit }),
      adminLoginStatsService.getAnomalySpikes({ ...query, window: anomalyWindow }),
      adminLoginStatsService.getActiveAlerts(query),
      adminLoginStatsService.getAuditTimeline({ ...query, userId: auditUserId || undefined, limit: auditLimit }),
    ]);

    const errors: string[] = [];

    if (results[0].status === 'fulfilled') setOverview(results[0].value); else errors.push('overview');
    if (results[1].status === 'fulfilled') setDailyTrend(results[1].value); else errors.push('daily');
    if (results[2].status === 'fulfilled') setFailureReasons(results[2].value); else errors.push('failure-reasons');
    if (results[3].status === 'fulfilled') setRecentLogs(results[3].value); else errors.push('recent');
    if (results[4].status === 'fulfilled') setRecentUsers(results[4].value); else errors.push('recent-users');
    if (results[5].status === 'fulfilled') setSessionQuality(results[5].value); else errors.push('session-quality');
    if (results[6].status === 'fulfilled') setRiskOverview(results[6].value); else errors.push('risk-overview');
    if (results[7].status === 'fulfilled') setRiskTopUsers(results[7].value); else errors.push('risk-top-users');
    if (results[8].status === 'fulfilled') setRiskTopIps(results[8].value); else errors.push('risk-top-ips');
    if (results[9].status === 'fulfilled') setAnomalySpikes(results[9].value); else errors.push('anomaly-spikes');
    if (results[10].status === 'fulfilled') setActiveAlerts(results[10].value); else errors.push('alerts-active');
    if (results[11].status === 'fulfilled') setAuditTimeline(results[11].value); else errors.push('audit-timeline');

    if (!overview && results[0].status === 'rejected') {
      setError('Özet endpointinden veri alınamadı.');
    }

    if (errors.length > 0) {
      enqueueSnackbar(`Bazı bölümler yüklenemedi: ${errors.join(', ')}`, { variant: 'warning' });
    }

    setLoading(false);
  };

  const handlePresetChange = (_: SyntheticEvent, value: RangePreset | null) => {
    if (!value) {
      return;
    }

    const range = getDateRangeForPreset(value);
    setSelectedPreset(value);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  };

  useEffect(() => {
    void fetchAllAnalytics();
  }, []);

  const failureReasonPie = useMemo(
    () => failureReasons.slice(0, 6).map((item) => ({ name: item.reason, value: item.count })),
    [failureReasons]
  );

  return (
    <PageContainer>
      <PageHeader
        title="Kimlik Doğrulama Analitik Merkezi"
        subtitle={`Saat dilimi: Local | Aralık: ${dateRangeLabel}`}
        actions={
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1} alignItems={{ xs: 'stretch', lg: 'center' }}>
            <Tabs
              value={selectedPreset}
              onChange={handlePresetChange}
              sx={{ minHeight: 36, '& .MuiTab-root': { minHeight: 36, py: 0.5 } }}
            >
              <Tab value="7d" label="7D" />
              <Tab value="30d" label="30D" />
              <Tab value="90d" label="90D" />
            </Tabs>

            <TextField
              size="small"
              label="Başlangıç"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              size="small"
              label="Bitiş"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              InputLabelProps={{ shrink: true }}
            />

            <Button variant="outlined" onClick={() => void fetchAllAnalytics()} disabled={loading}>
              Filtreleri Uygula
            </Button>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => void fetchAllAnalytics()} disabled={loading}>
              Yenile
            </Button>
          </Stack>
        }
      />

      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Tabs
          value={activeTab}
          onChange={(_, value) => setActiveTab(value)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ px: 2, borderBottom: '1px solid', borderColor: 'divider' }}
        >
          <Tab value="overview" label="Genel Bakış" icon={<InsightsIcon />} iconPosition="start" />
          <Tab value="security" label="Güvenlik" icon={<SecurityIcon />} iconPosition="start" />
          <Tab value="sessions" label="Oturumlar" icon={<HistoryIcon />} iconPosition="start" />
          <Tab value="audit" label="Denetim" icon={<TimelineIcon />} iconPosition="start" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          <TabPanel value={activeTab} name="overview">
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard title="Toplam Deneme" value={overview?.totalAttempts || 0} subtitle="Kimlik doğrulama denemesi" color="info" />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard title="Başarı Oranı" value={`${overview?.successRate?.toFixed(2) || '0.00'}%`} subtitle="Giriş başarısı" color="success" />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard title="Hata Oranı" value={`${overview?.failureRate?.toFixed(2) || '0.00'}%`} subtitle="Başarısız giriş" color="error" />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard title="Oturum Devam Oranı" value={`${sessionQuality?.sessionResumeRate?.toFixed(2) || '0.00'}%`} subtitle="Refresh tabanlı" color="primary" />
              </Grid>
            </Grid>

            <Grid container spacing={3}>
              <Grid item xs={12} lg={8}>
                <PageSection
                  title="Günlük Giriş Trendi"
                  subtitle="Seçilen aralıkta başarılı/başarısız giriş eğrisi"
                  headerActions={
                    <FormControlLabel
                      control={<Switch checked={showUniqueUsersLine} onChange={(e) => setShowUniqueUsersLine(e.target.checked)} size="small" />}
                      label="Benzersiz kullanıcı"
                    />
                  }
                >
                  {dailyTrend.length === 0 ? (
                    <Typography color="text.secondary" variant="body2">Günlük veri bulunamadı.</Typography>
                  ) : (
                    <Box sx={{ width: '100%', height: 320 }}>
                      <ResponsiveContainer>
                        <LineChart data={dailyTrend} margin={{ top: 8, right: 20, left: -8, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#eceff3" />
                          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="successfulLogins" name="Başarılı" stroke="#16a34a" strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="failedLogins" name="Başarısız" stroke="#ef4444" strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="totalAttempts" name="Toplam" stroke="#2563eb" strokeWidth={2} dot={false} />
                          {showUniqueUsersLine && <Line type="monotone" dataKey="uniqueUsers" name="Benzersiz Kullanıcı" stroke="#9333ea" strokeWidth={2} dot={false} />}
                        </LineChart>
                      </ResponsiveContainer>
                    </Box>
                  )}
                </PageSection>
              </Grid>

              <Grid item xs={12} lg={4}>
                <PageSection
                  title="Başarısızlık Nedenleri"
                  subtitle="En yaygın kök nedenler"
                  headerActions={
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel id="failure-limit-label">Sınır</InputLabel>
                      <Select
                        labelId="failure-limit-label"
                        value={failureLimit}
                        label="Sınır"
                        onChange={(event) => setFailureLimit(Number(event.target.value))}
                      >
                        {[5, 10, 15, 20].map((item) => (
                          <MenuItem key={item} value={item}>{item}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  }
                >
                  {failureReasons.length === 0 ? (
                    <Typography color="text.secondary" variant="body2">Başarısızlık nedeni verisi yok.</Typography>
                  ) : (
                    <Stack spacing={1.25}>
                      {failureReasons.slice(0, failureLimit).map((reason) => (
                        <Box key={reason.reason}>
                          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{reason.reason}</Typography>
                            <Typography variant="caption" color="text.secondary">{reason.count} ({reason.ratio.toFixed(2)}%)</Typography>
                          </Stack>
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(reason.ratio, 100)}
                            sx={{
                              height: 7,
                              borderRadius: 8,
                              bgcolor: alpha('#ef4444', 0.15),
                              '& .MuiLinearProgress-bar': {
                                bgcolor: '#ef4444',
                              },
                            }}
                          />
                        </Box>
                      ))}
                    </Stack>
                  )}
                </PageSection>
              </Grid>

              <Grid item xs={12}>
                <PageSection title="Son Giriş Yapan Kullanıcılar" subtitle="lastSessionAt alanına göre azalan sıralı">
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Kullanıcı</TableCell>
                          <TableCell>Kullanıcı ID</TableCell>
                          <TableCell>Son Oturum</TableCell>
                          <TableCell>Son Login</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {recentUsers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4}>Son kullanıcı verisi bulunamadı.</TableCell>
                          </TableRow>
                        ) : (
                          recentUsers.map((user) => (
                            <TableRow key={`${user.userId}-${user.lastSessionAt}`}>
                              <TableCell>{user.displayName || user.userEmail}</TableCell>
                              <TableCell>{user.userId}</TableCell>
                              <TableCell>{formatDateTime(user.lastSessionAt)}</TableCell>
                              <TableCell>{formatDateTime(user.lastLoginAt)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </PageSection>
              </Grid>
            </Grid>
          </TabPanel>

          <TabPanel value={activeTab} name="security">
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard title="Yüksek Riskli Kullanıcı" value={riskOverview?.highRiskUsers || 0} color="error" />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard title="Yüksek Riskli IP" value={riskOverview?.highRiskIps || 0} color="warning" />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard title="Ortalama Risk Skoru" value={riskOverview?.averageUserRiskScore?.toFixed(2) || '0.00'} color="info" />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard title="P95 Risk Skoru" value={riskOverview?.p95UserRiskScore?.toFixed(2) || '0.00'} color="primary" />
              </Grid>
            </Grid>

            <Grid container spacing={3}>
              <Grid item xs={12} lg={6}>
                <PageSection
                  title="En Riskli Kullanıcılar"
                  subtitle="Yüksek hata + çoklu kaynak paterni"
                  headerActions={
                    <FormControl size="small" sx={{ minWidth: 110 }}>
                      <InputLabel id="risk-user-limit-label">Sınır</InputLabel>
                      <Select
                        labelId="risk-user-limit-label"
                        value={riskLimit}
                        label="Sınır"
                        onChange={(event) => setRiskLimit(Number(event.target.value))}
                      >
                        {[10, 20, 50].map((item) => (
                          <MenuItem key={item} value={item}>{item}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  }
                >
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Kullanıcı</TableCell>
                          <TableCell align="right">Risk</TableCell>
                          <TableCell align="right">Hata %</TableCell>
                          <TableCell>Sinyaller</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {riskTopUsers.length === 0 ? (
                          <TableRow><TableCell colSpan={4}>Riskli kullanıcı verisi yok.</TableCell></TableRow>
                        ) : (
                          riskTopUsers.slice(0, riskLimit).map((user) => (
                            <TableRow key={user.userId}>
                              <TableCell>{user.userEmail}</TableCell>
                              <TableCell align="right">{user.riskScore.toFixed(2)}</TableCell>
                              <TableCell align="right">{user.failureRate.toFixed(2)}%</TableCell>
                              <TableCell>
                                <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
                                  {user.topSignals.slice(0, 3).map((signal) => (
                                    <Chip key={signal} label={signal} size="small" />
                                  ))}
                                </Stack>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </PageSection>
              </Grid>

              <Grid item xs={12} lg={6}>
                <PageSection title="En Riskli IP'ler" subtitle="Yüksek hata riskine sahip IP adresleri">
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>IP</TableCell>
                          <TableCell align="right">Risk</TableCell>
                          <TableCell align="right">Hata %</TableCell>
                          <TableCell align="right">Etkilenen Kullanıcı</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {riskTopIps.length === 0 ? (
                          <TableRow><TableCell colSpan={4}>Riskli IP verisi yok.</TableCell></TableRow>
                        ) : (
                          riskTopIps.slice(0, riskLimit).map((ip) => (
                            <TableRow key={ip.ip}>
                              <TableCell>{ip.ip}</TableCell>
                              <TableCell align="right">{ip.riskScore.toFixed(2)}</TableCell>
                              <TableCell align="right">{ip.failureRate.toFixed(2)}%</TableCell>
                              <TableCell align="right">{ip.affectedUsers}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </PageSection>
              </Grid>

              <Grid item xs={12} md={6}>
                <PageSection
                  title="Anomali Sıçramaları"
                  subtitle="Trafik ve hata sapmaları"
                  headerActions={
                    <FormControl size="small" sx={{ minWidth: 130 }}>
                      <InputLabel id="anomaly-window-label">Pencere</InputLabel>
                      <Select
                        labelId="anomaly-window-label"
                        value={anomalyWindow}
                        label="Pencere"
                        onChange={(event) => setAnomalyWindow(event.target.value)}
                      >
                        <MenuItem value="24h">24h</MenuItem>
                        <MenuItem value="12h">12h</MenuItem>
                        <MenuItem value="6h">6h</MenuItem>
                      </Select>
                    </FormControl>
                  }
                >
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Tür</TableCell>
                          <TableCell>Seviye</TableCell>
                          <TableCell align="right">Gerçek</TableCell>
                          <TableCell align="right">Beklenen</TableCell>
                          <TableCell align="right">Sapma</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {anomalySpikes.length === 0 ? (
                          <TableRow><TableCell colSpan={5}>Anomali verisi yok.</TableCell></TableRow>
                        ) : (
                          anomalySpikes.map((item, index) => (
                            <TableRow key={`${item.type}-${item.bucketStart}-${index}`}>
                              <TableCell>{item.type}</TableCell>
                              <TableCell><Chip size="small" label={item.severity} color={statusColor(item.severity)} /></TableCell>
                              <TableCell align="right">{item.actualCount}</TableCell>
                              <TableCell align="right">{item.baselineCount}</TableCell>
                              <TableCell align="right">{item.deviationRate.toFixed(2)}%</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </PageSection>
              </Grid>

              <Grid item xs={12} md={6}>
                <PageSection title="Aktif Alarmlar" subtitle="Güncel yüksek öncelikli uyarılar">
                  <Stack spacing={1.5}>
                    {activeAlerts.length === 0 ? (
                      <Typography color="text.secondary" variant="body2">Aktif alarm yok.</Typography>
                    ) : (
                      activeAlerts.map((alert) => (
                        <Box
                          key={`${alert.code}-${alert.createdAt}`}
                          sx={{
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 2,
                            p: 1.5,
                            bgcolor: alpha('#ffffff', 0.45),
                          }}
                        >
                          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{alert.title}</Typography>
                            <Chip size="small" label={alert.severity} color={statusColor(alert.severity)} />
                          </Stack>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75 }}>{alert.description}</Typography>
                          <Typography variant="caption" color="text.secondary">{formatDateTime(alert.createdAt)}</Typography>
                        </Box>
                      ))
                    )}
                  </Stack>
                </PageSection>
              </Grid>
            </Grid>
          </TabPanel>

          <TabPanel value={activeTab} name="sessions">
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard title="Refresh Başarı Oranı" value={`${sessionQuality?.refreshSuccessRate?.toFixed(2) || '0.00'}%`} color="success" />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard title="Ort. Oturum Aralığı" value={`${sessionQuality?.avgSessionGapMinutes?.toFixed(2) || '0.00'} dk`} color="info" />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard title="Medyan Oturum Aralığı" value={`${sessionQuality?.medianSessionGapMinutes?.toFixed(2) || '0.00'} dk`} color="primary" />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard title="Toplam Oturum Olayı" value={sessionQuality?.totalSessionEvents || 0} color="warning" />
              </Grid>
            </Grid>

            <Grid container spacing={3}>
              <Grid item xs={12}>
                <PageSection
                  title="Son Denemeler"
                  subtitle="En güncel giriş denemeleri"
                  headerActions={
                    <FormControl size="small" sx={{ minWidth: 110 }}>
                      <InputLabel id="recent-limit-label">Sınır</InputLabel>
                      <Select
                        labelId="recent-limit-label"
                        value={recentLimit}
                        label="Sınır"
                        onChange={(event) => setRecentLimit(Number(event.target.value))}
                      >
                        {[10, 20, 50].map((item) => (
                          <MenuItem key={item} value={item}>{item}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  }
                >
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Durum</TableCell>
                          <TableCell>Kullanıcı</TableCell>
                          <TableCell>IP</TableCell>
                          <TableCell>Cihaz</TableCell>
                          <TableCell>Konum</TableCell>
                          <TableCell>Hata</TableCell>
                          <TableCell>Zaman</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {recentLogs.length === 0 ? (
                          <TableRow><TableCell colSpan={7}>Son deneme verisi yok.</TableCell></TableRow>
                        ) : (
                          recentLogs.slice(0, recentLimit).map((log, index) => (
                            <TableRow key={`${log.userId || 'unknown'}-${log.createdAt || 'na'}-${index}`}>
                              <TableCell><Chip size="small" label={log.status || 'UNKNOWN'} color={statusColor(log.status)} /></TableCell>
                              <TableCell>{log.userEmail || '-'}</TableCell>
                              <TableCell>{log.ipAddress || '-'}</TableCell>
                              <TableCell>{log.device || log.deviceInfo || '-'}</TableCell>
                              <TableCell>{[log.city, log.country].filter(Boolean).join(', ') || '-'}</TableCell>
                              <TableCell>{log.failureReason || '-'}</TableCell>
                              <TableCell>{formatDateTime(log.createdAt)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </PageSection>
              </Grid>

              <Grid item xs={12}>
                <PageSection title="Oturum Sağlığı" subtitle="Session-quality endpointinden türetilen metrikler">
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={3}>
                      <StatCard title="Login Başarı" value={sessionQuality?.loginSuccessCount || 0} color="success" />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <StatCard title="Refresh Başarı" value={sessionQuality?.refreshSuccessCount || 0} color="info" />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <StatCard title="Refresh Hata" value={sessionQuality?.refreshFailureCount || 0} color="error" />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <StatCard title="Session Resume" value={`${sessionQuality?.sessionResumeRate?.toFixed(2) || '0.00'}%`} color="primary" />
                    </Grid>
                  </Grid>
                </PageSection>
              </Grid>
            </Grid>
          </TabPanel>

          <TabPanel value={activeTab} name="audit">
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  size="small"
                  label="Kullanıcı ID (opsiyonel)"
                  value={auditUserId}
                  onChange={(event) => setAuditUserId(event.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl size="small" fullWidth>
                  <InputLabel id="audit-limit-label">Sınır</InputLabel>
                  <Select
                    labelId="audit-limit-label"
                    value={auditLimit}
                    label="Sınır"
                    onChange={(event) => setAuditLimit(Number(event.target.value))}
                  >
                    {[25, 50, 100, 200].map((value) => (
                      <MenuItem key={value} value={value}>{value}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={5}>
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Button variant="outlined" onClick={() => void fetchAuditTimeline()} disabled={auditLoading}>Uygula</Button>
                  <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => void fetchAuditTimeline()} disabled={auditLoading}>Zaman Çizelgesini Yenile</Button>
                </Stack>
              </Grid>
            </Grid>

            {auditLoading && <LinearProgress sx={{ mb: 2 }} />}

            <PageSection title="Denetim Zaman Çizelgesi" subtitle="Auth olayları (login, refresh, hata, rol/şifre aksiyonları)">
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Zaman</TableCell>
                      <TableCell>Olay</TableCell>
                      <TableCell>Durum</TableCell>
                      <TableCell>Kullanıcı</TableCell>
                      <TableCell>IP</TableCell>
                      <TableCell>Cihaz</TableCell>
                      <TableCell>Kaynak</TableCell>
                      <TableCell>Hata</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {auditTimeline.length === 0 ? (
                      <TableRow><TableCell colSpan={8}>Denetim olayı bulunamadı.</TableCell></TableRow>
                    ) : (
                      auditTimeline.map((event) => (
                        <TableRow key={event.eventId}>
                          <TableCell>{formatDateTime(event.createdAt)}</TableCell>
                          <TableCell>{event.eventType}</TableCell>
                          <TableCell><Chip size="small" label={event.status} color={statusColor(event.status)} /></TableCell>
                          <TableCell>{event.userEmail || event.userId || '-'}</TableCell>
                          <TableCell>{event.ipAddress || '-'}</TableCell>
                          <TableCell>{event.device || '-'}</TableCell>
                          <TableCell>{event.source || '-'}</TableCell>
                          <TableCell>{event.failureReason || '-'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </PageSection>
          </TabPanel>
        </Box>
      </Paper>

      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid item xs={12} lg={6}>
          <PageSection title="Başarısızlık Dağılımı" subtitle="Başarısızlık nedenlerinin pasta grafiği">
            {failureReasonPie.length === 0 ? (
              <Typography variant="body2" color="text.secondary">Başarısızlık dağılım verisi yok.</Typography>
            ) : (
              <Box sx={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={failureReasonPie} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={3}>
                      {failureReasonPie.map((_, index) => (
                        <Cell key={`failure-pie-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            )}
          </PageSection>
        </Grid>

        <Grid item xs={12} lg={6}>
          <PageSection title="Operasyon Notları" subtitle="Master spec kontrat hatırlatmaları">
            <Stack spacing={1}>
              <Typography variant="body2">`last_session_at` alanı son kullanıcı sıralamasını belirlemelidir.</Typography>
              <Typography variant="body2">Durum alanları uppercase kalmalıdır (SUCCESS/FAILED/BLOCKED/SUSPICIOUS).</Typography>
              <Typography variant="body2">Array alanları stabil render için her zaman `[]` dönmelidir (`null` değil).</Typography>
              <Typography variant="body2">Tüm tarih-saatler kullanıcının local saat diliminde gösterilir.</Typography>
            </Stack>
          </PageSection>
        </Grid>
      </Grid>
    </PageContainer>
  );
}
