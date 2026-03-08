import { ReactNode, SyntheticEvent, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Pagination,
  Paper,
  Select,
  Stack,
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
  useTheme,
  Tooltip as MuiTooltip,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Security as SecurityIcon,
  Timeline as TimelineIcon,
  History as HistoryIcon,
  Dashboard as DashboardIcon,
  FilterList as FilterIcon,
  WarningAmber as WarningIcon,
  CheckCircleOutline as CheckCircleIcon,
  ErrorOutline as ErrorOutlineIcon,
  InfoOutlined as InfoIcon,
  VpnKey as VpnKeyIcon,
  ReportProblem as ReportProblemIcon,
  Public as PublicIcon,
  PeopleAlt as PeopleIcon,
  EmojiEvents as TrophyIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { format, subDays } from 'date-fns';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { PageContainer, PageHeader } from '../components/Page';
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
  EngagementOverviewDto,
  TopLoginUserDto,
  WeeklyActiveStatsDto,
} from '../types/security/loginStats';

// Modern Color Palette
const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
const GRADIENT_PRIMARY = 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)';
const GRADIENT_SUCCESS = 'linear-gradient(135deg, #064e3b 0%, #10b981 100%)';
const GRADIENT_ERROR = 'linear-gradient(135deg, #7f1d1d 0%, #ef4444 100%)';
const GRADIENT_WARNING = 'linear-gradient(135deg, #78350f 0%, #f59e0b 100%)';
const GRADIENT_PURPLE = 'linear-gradient(135deg, #4c1d95 0%, #8b5cf6 100%)';

type RangePreset = '7d' | '30d' | '90d';
type TabKey = 'overview' | 'security' | 'sessions' | 'audit' | 'engagement';

interface TabPanelProps {
  value: TabKey;
  name: TabKey;
  children: ReactNode;
  padding?: number;
}

function TabPanel({ value, name, children, padding = 3 }: TabPanelProps) {
  if (value !== name) return null;
  return (
    <Box
      sx={{
        p: padding,
        animation: 'fadeIn 0.5s ease-in-out',
        '@keyframes fadeIn': {
          '0%': { opacity: 0, transform: 'translateY(10px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      }}
    >
      {children}
    </Box>
  );
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
  if (!value) return '-';
  const hasTimeZone = /[zZ]|[+-]\d{2}:\d{2}$/.test(value);
  const normalized = hasTimeZone ? value : `${value}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
};

const getStatusConfig = (status?: string | null) => {
  const normalized = (status || '').toUpperCase();
  if (normalized === 'SUCCESS') return { color: 'success' as const, icon: <CheckCircleIcon fontSize="small" /> };
  if (normalized === 'FAILED' || normalized === 'FAILURE') return { color: 'error' as const, icon: <ErrorOutlineIcon fontSize="small" /> };
  if (normalized === 'SUSPICIOUS' || normalized === 'BLOCKED') return { color: 'warning' as const, icon: <WarningIcon fontSize="small" /> };
  return { color: 'default' as const, icon: <InfoIcon fontSize="small" /> };
};

// Reusable Premium Stats Card
const PremiumStatCard = ({ title, value, subtitle, gradient, icon }: any) => (
  <Card sx={{ height: '100%', borderRadius: 4, border: 'none', boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)', position: 'relative', overflow: 'hidden' }}>
    <Box sx={{ position: 'absolute', top: 0, right: 0, p: 2, opacity: 0.2 }}>{icon}</Box>
    <CardContent sx={{ p: 3 }}>
      <Typography variant="subtitle2" color="text.secondary" fontWeight={600} gutterBottom sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
        {title}
      </Typography>
      <Typography variant="h3" fontWeight={800} sx={{ mb: 1, background: gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        {value}
      </Typography>
      <Typography variant="body2" color="text.secondary" fontWeight={500}>
        {subtitle}
      </Typography>
    </CardContent>
  </Card>
);

export default function Dashboard() {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();

  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [selectedPreset, setSelectedPreset] = useState<RangePreset>('30d');
  const [startDate, setStartDate] = useState<string>(() => getDateRangeForPreset('30d').startDate);
  const [endDate, setEndDate] = useState<string>(() => getDateRangeForPreset('30d').endDate);
  const [showFilters, setShowFilters] = useState(false);

  // Pagination & Limits
  const [recentUsersPage, setRecentUsersPage] = useState(1);
  const recentUsersPageSize = 5;

  // Data States
  const [loading, setLoading] = useState(true);
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

  // Engagement States
  const [engagementOverview, setEngagementOverview] = useState<EngagementOverviewDto | null>(null);
  const [topWeeklyUsers, setTopWeeklyUsers] = useState<TopLoginUserDto[]>([]);
  const [weeklyEngagement, setWeeklyEngagement] = useState<WeeklyActiveStatsDto[]>([]);

  const validateDateRange = (): boolean => {
    if (!startDate || !endDate) return false;
    if (startDate > endDate) {
      enqueueSnackbar('Başlangıç tarihi bitiş tarihinden büyük olamaz.', { variant: 'warning' });
      return false;
    }
    return true;
  };

  const fetchAllAnalytics = async () => {
    if (!validateDateRange()) return;
    setLoading(true);
    setError(null);

    const query = { startDate, endDate };

    try {
      const results = await Promise.allSettled([
        adminLoginStatsService.getOverview(query),
        adminLoginStatsService.getDailyTrend(query),
        adminLoginStatsService.getFailureReasons({ ...query, limit: 10 }),
        adminLoginStatsService.getRecentLogs({ ...query, limit: 15 }),
        adminLoginStatsService.getRecentUsers({ ...query, limit: 30 }),
        adminLoginStatsService.getSessionQuality(query),
        adminLoginStatsService.getRiskOverview(query),
        adminLoginStatsService.getRiskTopUsers({ ...query, limit: 10 }),
        adminLoginStatsService.getRiskTopIps({ ...query, limit: 10 }),
        adminLoginStatsService.getAnomalySpikes({ ...query, window: '24h' }),
        adminLoginStatsService.getActiveAlerts(query),
        adminLoginStatsService.getAuditTimeline({ ...query, limit: 50 }),
        adminLoginStatsService.getEngagementOverview(),
        adminLoginStatsService.getTopWeeklyUsers({ ...query, limit: 20 }),
        adminLoginStatsService.getWeeklyEngagement(query),
      ]);

      if (results[0].status === 'fulfilled') setOverview(results[0].value);
      if (results[1].status === 'fulfilled') setDailyTrend(results[1].value);
      if (results[2].status === 'fulfilled') setFailureReasons(results[2].value);
      if (results[3].status === 'fulfilled') setRecentLogs(results[3].value);
      if (results[4].status === 'fulfilled') setRecentUsers(results[4].value);
      if (results[5].status === 'fulfilled') setSessionQuality(results[5].value);
      if (results[6].status === 'fulfilled') setRiskOverview(results[6].value);
      if (results[7].status === 'fulfilled') setRiskTopUsers(results[7].value);
      if (results[8].status === 'fulfilled') setRiskTopIps(results[8].value);
      if (results[9].status === 'fulfilled') setAnomalySpikes(results[9].value);
      if (results[10].status === 'fulfilled') setActiveAlerts(results[10].value);
      if (results[11].status === 'fulfilled') setAuditTimeline(results[11].value);
      if (results[12].status === 'fulfilled') setEngagementOverview(results[12].value);
      if (results[13].status === 'fulfilled') setTopWeeklyUsers(results[13].value);
      if (results[14].status === 'fulfilled') setWeeklyEngagement(results[14].value);

    } catch (err) {
      setError('Veriler yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAllAnalytics();
  }, []);

  const handlePresetChange = (preset: RangePreset) => {
    const range = getDateRangeForPreset(preset);
    setSelectedPreset(preset);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  };

  const paginatedRecentUsers = useMemo(() => {
    const start = (recentUsersPage - 1) * recentUsersPageSize;
    return recentUsers.slice(start, start + recentUsersPageSize);
  }, [recentUsers, recentUsersPage]);

  const failurePieData = useMemo(() => {
    return failureReasons.slice(0, 5).map(r => ({ name: r.reason, value: r.count }));
  }, [failureReasons]);

  return (
    <PageContainer>
      {/* Header Section */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} color="text.primary" gutterBottom>
            Güvenlik ve Oturum Analizi
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Kullanıcı oturumları, etkileşim, güvenlik riskleri ve anomali tespiti gösterge paneli.
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<FilterIcon />}
            onClick={() => setShowFilters(!showFilters)}
            sx={{ borderRadius: 2 }}
          >
            Filtreler
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<RefreshIcon />}
            onClick={fetchAllAnalytics}
            disabled={loading}
            sx={{ borderRadius: 2, boxShadow: '0 4px 14px 0 rgba(59, 130, 246, 0.39)' }}
          >
            Tazele
          </Button>
        </Stack>
      </Box>

      {/* Expandable Filters */}
      {showFilters && (
        <Card sx={{ mb: 4, borderRadius: 3, boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)', border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <Stack direction="row" spacing={1} sx={{ bgcolor: 'action.hover', p: 0.5, borderRadius: 2 }}>
              {(['7d', '30d', '90d'] as RangePreset[]).map(preset => (
                <Button
                  key={preset}
                  size="small"
                  variant={selectedPreset === preset ? 'contained' : 'text'}
                  onClick={() => handlePresetChange(preset)}
                  disableElevation
                  sx={{ borderRadius: 1.5, minWidth: 60 }}
                >
                  {preset.toUpperCase()}
                </Button>
              ))}
            </Stack>
            <Divider orientation="vertical" flexItem />
            <TextField size="small" label="Başlangıç" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} InputLabelProps={{ shrink: true }} />
            <TextField size="small" label="Bitiş" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} />
            <Button variant="contained" onClick={fetchAllAnalytics} disabled={loading} sx={{ ml: 'auto' }}>Uygula</Button>
          </CardContent>
        </Card>
      )}

      {loading && <LinearProgress sx={{ mb: 4, borderRadius: 1 }} />}
      {error && <Alert severity="error" sx={{ mb: 4, borderRadius: 2 }}>{error}</Alert>}

      {/* Main Tabs Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} variant="scrollable" scrollButtons="auto" 
          sx={{ '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: '1rem', minHeight: 60 } }}>
          <Tab value="overview" label="Genel Bakış" icon={<DashboardIcon />} iconPosition="start" />
          <Tab value="engagement" label="Kullanıcı Etkileşimi" icon={<PeopleIcon />} iconPosition="start" />
          <Tab value="security" label="Risk & Güvenlik" icon={<SecurityIcon />} iconPosition="start" />
          <Tab value="sessions" label="Oturum Logları" icon={<HistoryIcon />} iconPosition="start" />
          <Tab value="audit" label="Sistem Denetimi" icon={<TimelineIcon />} iconPosition="start" />
        </Tabs>
      </Box>

      {/* ==================== OVERVIEW TAB ==================== */}
      <TabPanel value={activeTab} name="overview" padding={0}>
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <PremiumStatCard
              title="Toplam Deneme"
              value={overview?.totalAttempts?.toLocaleString() || '0'}
              subtitle="Tüm oturum açma istekleri"
              gradient={GRADIENT_PRIMARY}
              icon={<VpnKeyIcon sx={{ fontSize: 60, color: '#3b82f6' }} />}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <PremiumStatCard
              title="Giriş Başarısı"
              value={`${overview?.successRate?.toFixed(1) || '0'}%`}
              subtitle="Başarılı oturum oranı"
              gradient={GRADIENT_SUCCESS}
              icon={<CheckCircleIcon sx={{ fontSize: 60, color: '#10b981' }} />}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <PremiumStatCard
              title="Hata Oranı"
              value={`${overview?.failureRate?.toFixed(1) || '0'}%`}
              subtitle="Başarısız denemeler"
              gradient={GRADIENT_ERROR}
              icon={<ErrorOutlineIcon sx={{ fontSize: 60, color: '#ef4444' }} />}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <PremiumStatCard
              title="Aktif Alarmlar"
              value={activeAlerts.length.toString()}
              subtitle="İncelenmesi gereken durumlar"
              gradient={activeAlerts.length > 0 ? GRADIENT_WARNING : GRADIENT_PRIMARY}
              icon={<WarningIcon sx={{ fontSize: 60, color: activeAlerts.length > 0 ? '#f59e0b' : '#3b82f6' }} />}
            />
          </Grid>
        </Grid>

        <Grid container spacing={4}>
          <Grid item xs={12} lg={8}>
            <Card sx={{ height: '100%', borderRadius: 4, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
              <CardHeader title="Giriş Trendleri" titleTypographyProps={{ fontWeight: 700 }} subheader="Son 30 gündeki başarılı ve başarısız giriş denemeleri" />
              <CardContent sx={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorError" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.palette.divider} />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickMargin={10} minTickGap={30} />
                    <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }} />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: 20 }} />
                    <Area type="monotone" dataKey="successfulLogins" name="Başarılı" stroke="#10b981" fillOpacity={1} fill="url(#colorSuccess)" strokeWidth={3} />
                    <Area type="monotone" dataKey="failedLogins" name="Başarısız" stroke="#ef4444" fillOpacity={1} fill="url(#colorError)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} lg={4}>
            <Card sx={{ height: '100%', borderRadius: 4, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
              <CardHeader title="Başarısızlık Nedenleri" titleTypographyProps={{ fontWeight: 700 }} />
              <CardContent>
                {failurePieData.length > 0 ? (
                  <Box sx={{ height: 250, mb: 3 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={failurePieData} innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                          {failurePieData.map((_, i) => <Cell key={`cell-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: 8 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                ) : (
                  <Alert severity="info" sx={{ mb: 3 }}>Veri bulunamadı.</Alert>
                )}
                
                <Stack spacing={2}>
                  {failureReasons.slice(0, 4).map((r, i) => (
                    <Box key={r.reason}>
                      <Stack direction="row" justifyContent="space-between" mb={0.5}>
                        <Typography variant="body2" fontWeight={600} display="flex" alignItems="center" gap={1}>
                          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: CHART_COLORS[i % CHART_COLORS.length] }} />
                          {r.reason}
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>{r.count} ({r.ratio.toFixed(1)}%)</Typography>
                      </Stack>
                      <LinearProgress variant="determinate" value={r.ratio} sx={{ height: 6, borderRadius: 3, '& .MuiLinearProgress-bar': { bgcolor: CHART_COLORS[i % CHART_COLORS.length] } }} />
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* ==================== ENGAGEMENT TAB ==================== */}
      <TabPanel value={activeTab} name="engagement" padding={0}>
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <PremiumStatCard
              title="Günlük Aktif Kullanıcı (DAU)"
              value={engagementOverview?.dailyActiveUsers?.toLocaleString() || '0'}
              subtitle="Bugün giriş yapan kullanıcılar"
              gradient={GRADIENT_SUCCESS}
              icon={<PeopleIcon sx={{ fontSize: 60, color: '#10b981' }} />}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <PremiumStatCard
              title="Haftalık Aktif Kullanıcı (WAU)"
              value={engagementOverview?.weeklyActiveUsers?.toLocaleString() || '0'}
              subtitle="Son 7 gün içindeki tekil erişim"
              gradient={GRADIENT_PRIMARY}
              icon={<TrendingUpIcon sx={{ fontSize: 60, color: '#3b82f6' }} />}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <PremiumStatCard
              title="Aylık Aktif Kullanıcı (MAU)"
              value={engagementOverview?.monthlyActiveUsers?.toLocaleString() || '0'}
              subtitle="Son 30 gün içindeki tekil kullanıcı"
              gradient={GRADIENT_PURPLE}
              icon={<DashboardIcon sx={{ fontSize: 60, color: '#8b5cf6' }} />}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <PremiumStatCard
              title="DAU / MAU Oranı"
              value={`${(engagementOverview?.dauWauRatio ? engagementOverview.dauWauRatio * 100 : 0).toFixed(1)}%`}
              subtitle="Günlük kullanıcı tutundurma oranı"
              gradient={GRADIENT_WARNING}
              icon={<TimelineIcon sx={{ fontSize: 60, color: '#f59e0b' }} />}
            />
          </Grid>
        </Grid>

        <Grid container spacing={4}>
          <Grid item xs={12} lg={7}>
            <Card sx={{ height: '100%', borderRadius: 4, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
              <CardHeader title="Haftalık Aktif Kullanıcı Trendi" titleTypographyProps={{ fontWeight: 700 }} />
              <CardContent sx={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyEngagement} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.palette.divider} />
                    <XAxis dataKey="weekStartDate" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: alpha(theme.palette.primary.main, 0.1) }} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }} />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: 20 }} />
                    <Bar dataKey="activeUsers" name="Aktif Kullanıcı" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="successfulLogins" name="Başarılı Logins" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} lg={5}>
            <Card sx={{ height: '100%', borderRadius: 4, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
              <CardHeader title="Haftanın En Aktifleri" subheader="Filtre aralığındaki lider tablosu" titleTypographyProps={{ fontWeight: 700 }} />
              <TableContainer>
                <Table sx={{ minWidth: 400 }}>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell sx={{ fontWeight: 600 }}>Kullanıcı</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Logins</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Başarı</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {topWeeklyUsers.length === 0 ? (
                      <TableRow><TableCell colSpan={3} align="center" sx={{ py: 3 }}>Aktif kullanıcı bulunamadı.</TableCell></TableRow>
                    ) : (
                      topWeeklyUsers.slice(0, 10).map((u, i) => (
                        <TableRow key={u.userId} hover>
                          <TableCell sx={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            {i < 3 ? <TrophyIcon sx={{ color: i === 0 ? '#f59e0b' : i === 1 ? '#9ca3af' : '#b45309' }} /> : <Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>{u.userEmail?.[0]?.toUpperCase() || 'U'}</Avatar>}
                            {u.displayName || u.userEmail || u.userId.slice(0, 8)}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={700}>{u.totalLogins}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={`${(u.successRate * 100).toFixed(0)}%`} size="small" color={u.successRate > 0.8 ? 'success' : 'warning'} variant="outlined" />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* ==================== SECURITY TAB ==================== */}
      <TabPanel value={activeTab} name="security" padding={0}>
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}>
            <PremiumStatCard
              title="Yüksek Riskli Kullanıcılar"
              value={riskOverview?.highRiskUsers || '0'}
              subtitle="Dikkat gerektiren hesaplar"
              gradient={GRADIENT_ERROR}
              icon={<ReportProblemIcon sx={{ fontSize: 60, color: '#ef4444' }} />}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <PremiumStatCard
              title="Yüksek Riskli IP Adresleri"
              value={riskOverview?.highRiskIps || '0'}
              subtitle="Şüpheli trafik kaynakları"
              gradient={GRADIENT_WARNING}
              icon={<PublicIcon sx={{ fontSize: 60, color: '#f59e0b' }} />}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <PremiumStatCard
              title="Ortalama Risk Skoru"
              value={riskOverview?.averageUserRiskScore?.toFixed(1) || '0.0'}
              subtitle="Genel güvenlik sağlığı"
              gradient={GRADIENT_PRIMARY}
              icon={<SecurityIcon sx={{ fontSize: 60, color: '#3b82f6' }} />}
            />
          </Grid>
        </Grid>

        <Grid container spacing={4}>
          <Grid item xs={12} lg={6}>
            <Card sx={{ height: '100%', borderRadius: 4, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
              <CardHeader title="En Riskli Kullanıcılar" titleTypographyProps={{ fontWeight: 700 }} />
              <TableContainer>
                <Table sx={{ minWidth: 400 }}>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell sx={{ fontWeight: 600 }}>Kullanıcı</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Risk Skoru</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Hata Oranı</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Tespitler</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {riskTopUsers.length === 0 ? (
                      <TableRow><TableCell colSpan={4} align="center" sx={{ py: 3 }}>Riskli kullanıcı bulunamadı.</TableCell></TableRow>
                    ) : (
                      riskTopUsers.slice(0, 5).map(u => (
                        <TableRow key={u.userId} hover>
                          <TableCell sx={{ fontWeight: 500 }}>{u.userEmail}</TableCell>
                          <TableCell>
                            <Chip label={u.riskScore.toFixed(1)} size="small" color={u.riskScore > 75 ? 'error' : u.riskScore > 50 ? 'warning' : 'success'} />
                          </TableCell>
                          <TableCell>{u.failureRate.toFixed(1)}%</TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
                              {u.topSignals.slice(0, 2).map(s => <Chip key={s} label={s} size="small" variant="outlined" />)}
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          </Grid>

          <Grid item xs={12} lg={6}>
            <Card sx={{ height: '100%', borderRadius: 4, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
              <CardHeader title="Aktif Alarmlar" titleTypographyProps={{ fontWeight: 700 }} />
              <CardContent>
                <Stack spacing={2}>
                  {activeAlerts.length === 0 ? (
                    <Box sx={{ p: 4, textAlign: 'center', bgcolor: 'action.hover', borderRadius: 2 }}>
                      <CheckCircleIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
                      <Typography variant="h6">Her şey yolunda!</Typography>
                      <Typography color="text.secondary">Şu anda aktif bir güvenlik alarmı bulunmuyor.</Typography>
                    </Box>
                  ) : (
                    activeAlerts.map(alert => (
                      <Alert key={alert.code} severity={getStatusConfig(alert.severity).color} icon={getStatusConfig(alert.severity).icon} sx={{ borderRadius: 2, alignItems: 'center' }}>
                        <Typography variant="subtitle2" fontWeight={700}>{alert.title}</Typography>
                        <Typography variant="body2" sx={{ mt: 0.5 }}>{alert.description}</Typography>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>{formatDateTime(alert.createdAt)}</Typography>
                      </Alert>
                    ))
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* ==================== SESSIONS TAB ==================== */}
      <TabPanel value={activeTab} name="sessions" padding={0}>
        <Card sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider', boxShadow: 'none', mb: 4 }}>
          <CardHeader title="Son Gerçekleşen Oturum İstekleri" titleTypographyProps={{ fontWeight: 700 }} />
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Durum</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Kullanıcı</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>IP & Konum</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Cihaz</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Tarih</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Detay</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentLogs.length === 0 ? (
                  <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}>Bağlantı kaydı bulunamadı.</TableCell></TableRow>
                ) : (
                  recentLogs.map((log, i) => {
                    const status = getStatusConfig(log.status);
                    return (
                      <TableRow key={i} hover>
                        <TableCell>
                          <Chip icon={status.icon} label={log.status} color={status.color} size="small" variant="filled" sx={{ fontWeight: 600 }} />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>{log.userEmail || '-'}</TableCell>
                        <TableCell>
                          <Typography variant="body2">{log.ipAddress}</Typography>
                          <Typography variant="caption" color="text.secondary">{[log.city, log.country].filter(Boolean).join(', ') || 'Bilinmiyor'}</Typography>
                        </TableCell>
                        <TableCell>{log.device || log.deviceInfo || '-'}</TableCell>
                        <TableCell>{formatDateTime(log.createdAt)}</TableCell>
                        <TableCell>
                          <Typography variant="body2" color="error.main" fontWeight={500}>{log.failureReason || '-'}</Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </TabPanel>

      {/* ==================== AUDIT TAB ==================== */}
      <TabPanel value={activeTab} name="audit" padding={0}>
        <Card sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
          <CardHeader title="Sistem Denetim Günlüğü" titleTypographyProps={{ fontWeight: 700 }} />
          <TableContainer>
            <Table size="medium">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Tarih</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>İşlem Türü</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Durum</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Kullanıcı</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Kaynak IP</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Cihaz/Tarayıcı</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {auditTimeline.length === 0 ? (
                  <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}>Denetim kaydı bulunamadı.</TableCell></TableRow>
                ) : (
                  auditTimeline.map(event => (
                    <TableRow key={event.eventId} hover>
                      <TableCell>{formatDateTime(event.createdAt)}</TableCell>
                      <TableCell><Typography color="primary" fontWeight={600} variant="body2">{event.eventType}</Typography></TableCell>
                      <TableCell>
                        <Chip label={event.status} color={getStatusConfig(event.status).color} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>{event.userEmail || event.userId || '-'}</TableCell>
                      <TableCell>{event.ipAddress || '-'}</TableCell>
                      <TableCell>{event.device || '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </TabPanel>

    </PageContainer>
  );
}
