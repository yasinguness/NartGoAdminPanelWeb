import { ReactNode, SyntheticEvent, useEffect, useMemo, useState, cloneElement, isValidElement } from 'react';
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
  RecentLoggedInUserDto,
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
const GRADIENT_PRIMARY = 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)';
const GRADIENT_SUCCESS = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
const GRADIENT_ERROR = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
const GRADIENT_WARNING = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
const GRADIENT_INFO = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';

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
  return { color: 'info' as const, icon: <InfoIcon fontSize="small" /> };
};

// Reusable Premium Stats Card
const PremiumStatCard = ({ title, value, subtitle, gradient, icon }: any) => {
  const theme = useTheme();
  return (
    <Card
      sx={{
        height: '100%',
        borderRadius: 5,
        border: '1px solid',
        borderColor: alpha(theme.palette.divider, 0.08),
        background: alpha(theme.palette.background.paper, 0.7),
        backdropFilter: 'blur(12px)',
        boxShadow: '0 10px 30px -10px rgba(0,0,0,0.04)',
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 20px 40px -15px rgba(0,0,0,0.1)',
        }
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: -10,
          right: -10,
          p: 2,
          opacity: 0.05,
          transform: 'scale(1.5)',
          background: gradient,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        {icon}
      </Box>
      <CardContent sx={{ p: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" mb={2}>
          <Box
            sx={{
              display: 'flex',
              p: 1.5,
              borderRadius: 3,
              background: gradient,
              color: 'white',
              boxShadow: '0 8px 16px -4px rgba(0,0,0,0.1)'
            }}
          >
            {icon && isValidElement(icon) && cloneElement(icon as any, { sx: { fontSize: 24 } })}
          </Box>
          <Typography variant="overline" color="text.secondary" fontWeight={700} sx={{ letterSpacing: 1.2 }}>
            {title}
          </Typography>
        </Stack>
        <Typography variant="h3" fontWeight={800} sx={{ mb: 0.5, letterSpacing: -1 }}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary" fontWeight={500} sx={{ opacity: 0.8 }}>
          {subtitle}
        </Typography>
      </CardContent>
    </Card>
  );
};

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
  const recentUsersPageSize = 10;
  const [searchTerm, setSearchTerm] = useState('');

  // Data States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [overview, setOverview] = useState<LoginStatsOverviewDto | null>(null);
  const [dailyTrend, setDailyTrend] = useState<DailyLoginStatsDto[]>([]);
  const [failureReasons, setFailureReasons] = useState<FailureReasonStatsDto[]>([]);
  const [recentLogs, setRecentLogs] = useState<RecentLoginLogDto[]>([]);
  const [recentUsers, setRecentUsers] = useState<RecentLoggedInUserDto[]>([]);
  const [recentUsersTotal, setRecentUsersTotal] = useState(0);
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

  const fetchRecentUsers = async (page: number) => {
    try {
      const response = await adminLoginStatsService.getRecentUsers({
        startDate,
        endDate,
        page: page - 1, // backend 0-indexed ise
        size: recentUsersPageSize,
        search: searchTerm || undefined
      });

      setRecentUsers(response.content);
      setRecentUsersTotal(response.totalElements);
      return response;
    } catch (err) {
      console.error('Recent users fetch error:', err);
      return null;
    }
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
        fetchRecentUsers(1),
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

      if (results[0].status === 'fulfilled' && results[0].value) setOverview(results[0].value);
      if (results[1].status === 'fulfilled' && results[1].value) setDailyTrend(results[1].value);
      if (results[2].status === 'fulfilled' && results[2].value) setFailureReasons(results[2].value as any);
      if (results[3].status === 'fulfilled' && results[3].value) setRecentLogs(results[3].value as any);
      if (results[4].status === 'fulfilled' && results[4].value) {
        const res = results[4].value as any;
        setRecentUsers(res.content || []);
        setRecentUsersTotal(res.totalElements || 0);
      }
      if (results[5].status === 'fulfilled' && results[5].value) setSessionQuality(results[5].value);
      if (results[6].status === 'fulfilled' && results[6].value) setRiskOverview(results[6].value);
      if (results[7].status === 'fulfilled' && results[7].value) setRiskTopUsers(results[7].value);
      if (results[8].status === 'fulfilled' && results[8].value) setRiskTopIps(results[8].value);
      if (results[9].status === 'fulfilled' && results[9].value) setAnomalySpikes(results[9].value);
      if (results[10].status === 'fulfilled' && results[10].value) setActiveAlerts(results[10].value);
      if (results[11].status === 'fulfilled' && results[11].value) setAuditTimeline(results[11].value);
      if (results[12].status === 'fulfilled' && results[12].value) setEngagementOverview(results[12].value);
      if (results[13].status === 'fulfilled' && results[13].value) setTopWeeklyUsers(results[13].value);
      if (results[14].status === 'fulfilled' && results[14].value) setWeeklyEngagement(results[14].value);

    } catch (err) {
      setError('Veriler yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAllAnalytics();
  }, []);

  useEffect(() => {
    if (recentUsersPage > 1) {
      void fetchRecentUsers(recentUsersPage);
    }
  }, [recentUsersPage]);

  const handlePresetChange = (preset: RangePreset) => {
    const range = getDateRangeForPreset(preset);
    setSelectedPreset(preset);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  };

  const paginatedRecentUsers = useMemo(() => {
    // Server-side pagination aktif olduğu için artik slice yapmıyoruz
    return recentUsers;
  }, [recentUsers]);

  const failurePieData = useMemo(() => {
    return failureReasons.slice(0, 5).map(r => ({ name: r.reason, value: r.count }));
  }, [failureReasons]);

  return (
    <PageContainer>
      {/* Header Section */}
      <Box sx={{ mb: 5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 3 }}>
        <Box>
          <Typography variant="h3" fontWeight={900} color="text.primary" sx={{ mb: 1, letterSpacing: -1.5 }}>
            Analiz Paneli
          </Typography>
          <Typography variant="body1" color="text.secondary" fontWeight={500} sx={{ opacity: 0.8 }}>
            Sistem güvenliği ve kullanıcı etkileşimlerini gerçek zamanlı izleyin.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<FilterIcon />}
            onClick={() => setShowFilters(!showFilters)}
            sx={{
              borderRadius: 3,
              px: 3,
              py: 1.5,
              bgcolor: alpha(theme.palette.action.selected, 0.05),
              '&:hover': { bgcolor: alpha(theme.palette.action.selected, 0.1) }
            }}
          >
            Filtrele
          </Button>
          <Button
            variant="contained"
            disableElevation
            startIcon={<RefreshIcon />}
            onClick={fetchAllAnalytics}
            disabled={loading}
            sx={{
              borderRadius: 3,
              px: 3,
              py: 1.5,
              background: GRADIENT_PRIMARY,
              boxShadow: '0 8px 16px -4px rgba(99, 102, 241, 0.3)',
              '&:hover': {
                boxShadow: '0 12px 20px -4px rgba(99, 102, 241, 0.4)',
              }
            }}
          >
            Veriyi Tazele
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
      <Box sx={{ mb: 4 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 48,
            '& .MuiTabs-indicator': {
              height: 3,
              borderRadius: '3px 3px 0 0',
              background: GRADIENT_PRIMARY
            },
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.95rem',
              minHeight: 48,
              color: 'text.secondary',
              opacity: 0.7,
              mr: 2,
              '&.Mui-selected': {
                color: 'primary.main',
                opacity: 1,
              }
            }
          }}
        >
          <Tab value="overview" label="Genel Bakış" />
          <Tab value="engagement" label="Kullanıcı Etkileşimi" />
          <Tab value="security" label="Risk & Güvenlik" />
          <Tab value="sessions" label="Oturum Logları" />
          <Tab value="audit" label="Sistem Denetimi" />
        </Tabs>
        <Divider sx={{ mt: -0.1, opacity: 0.5 }} />
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

        <Grid container spacing={3}>
          {/* Main User List Table - Now with Pagination & Search */}
          <Grid item xs={12}>
            <Card sx={{ borderRadius: 5, border: '1px solid', borderColor: alpha(theme.palette.divider, 0.1), boxShadow: 'none', background: alpha(theme.palette.background.paper, 0.5) }}>
              <CardHeader
                title="Son Giriş Yapan Kullanıcılar"
                titleTypographyProps={{ fontWeight: 800, variant: 'h6' }}
                subheader="Platformu en son kullanan kullanıcıların detaylı listesi"
                sx={{ p: 3 }}
                action={
                  <Stack direction="row" spacing={2} alignItems="center">
                    <TextField
                      size="small"
                      placeholder="Kullanıcı ara (E-posta veya isim)..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && fetchRecentUsers(1)}
                      sx={{ width: 280, '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                    />
                    <IconButton onClick={() => fetchRecentUsers(1)} disabled={loading} size="small" color="primary">
                      <RefreshIcon />
                    </IconButton>
                  </Stack>
                }
              />
              <TableContainer>
                <Table sx={{ minWidth: 600 }}>
                  <TableHead>
                    <TableRow sx={{ bgcolor: alpha(theme.palette.action.hover, 0.3) }}>
                      <TableCell sx={{ fontWeight: 700, py: 2 }}>Kullanıcı Bilgisi</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>E-posta</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Son Etkinlik</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Son Başarılı Giriş</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, pr: 3 }}>İşlem</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                          <PeopleIcon sx={{ fontSize: 48, opacity: 0.1, mb: 2, display: 'block', mx: 'auto' }} />
                          <Typography color="text.secondary" fontWeight={500}>Kullanıcı kaydı bulunamadı.</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedRecentUsers.map((user) => (
                        <TableRow key={user.userId} hover sx={{ '& td': { py: 2 } }}>
                          <TableCell>
                            <Stack direction="row" spacing={2} alignItems="center">
                              <Avatar
                                sx={{
                                  width: 40,
                                  height: 40,
                                  background: GRADIENT_PRIMARY,
                                  color: 'white',
                                  fontWeight: 700,
                                  fontSize: 14
                                }}
                              >
                                {user.displayName?.[0] || user.userEmail?.[0]?.toUpperCase() || 'U'}
                              </Avatar>
                              <Typography variant="body2" fontWeight={700}>
                                {user.displayName || 'İsimsiz Kullanıcı'}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary" fontWeight={500}>
                              {user.userEmail}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {formatDateTime(user.lastSessionAt)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <CheckCircleIcon color="success" sx={{ fontSize: 16 }} />
                              <Typography variant="caption" fontWeight={700} color="success.main">
                                {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'N/A'}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right" sx={{ pr: 3 }}>
                            <Button size="small" color="primary">Detay</Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ p: 2, display: 'flex', justifyContent: 'center', borderTop: '1px solid', borderColor: alpha(theme.palette.divider, 0.05) }}>
                <Pagination
                  count={Math.ceil(recentUsersTotal / recentUsersPageSize)}
                  page={recentUsersPage}
                  onChange={(_, value) => setRecentUsersPage(value)}
                  color="primary"
                  size="medium"
                  sx={{
                    '& .MuiPaginationItem-root': { fontWeight: 700, borderRadius: 2 }
                  }}
                />
              </Box>
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
              gradient="linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)"
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

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card sx={{ borderRadius: 5, border: '1px solid', borderColor: alpha(theme.palette.divider, 0.1), boxShadow: 'none', background: alpha(theme.palette.background.paper, 0.5) }}>
              <CardHeader
                title="Haftanın En Aktif Kullanıcıları"
                subheader="Belirtilen zaman aralığında en çok işlem gerçekleştirenler"
                titleTypographyProps={{ fontWeight: 800, variant: 'h6' }}
                sx={{ p: 3 }}
              />
              <TableContainer>
                <Table sx={{ minWidth: 600 }}>
                  <TableHead>
                    <TableRow sx={{ bgcolor: alpha(theme.palette.action.hover, 0.3) }}>
                      <TableCell sx={{ fontWeight: 700, pl: 3 }}>Sıralama & Kullanıcı</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>E-posta</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="center">Toplam Giriş</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="center">Başarı Oranı</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Son Görülme</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {topWeeklyUsers.length === 0 ? (
                      <TableRow><TableCell colSpan={5} align="center" sx={{ py: 6 }}>Aktif kullanıcı verisi bulunamadı.</TableCell></TableRow>
                    ) : (
                      topWeeklyUsers.slice(0, 15).map((u, i) => (
                        <TableRow key={u.userId} hover sx={{ '& td': { py: 2 } }}>
                          <TableCell sx={{ pl: 3 }}>
                            <Stack direction="row" spacing={2} alignItems="center">
                              {i < 3 ? (
                                <Box sx={{ position: 'relative' }}>
                                  <TrophyIcon sx={{ color: i === 0 ? '#f59e0b' : i === 1 ? '#9ca3af' : '#b45309', fontSize: 24 }} />
                                  <Typography variant="caption" sx={{ position: 'absolute', top: 12, left: 8, color: 'white', fontWeight: 900, fontSize: 10 }}>{i + 1}</Typography>
                                </Box>
                              ) : (
                                <Typography variant="body2" fontWeight={800} color="text.secondary" sx={{ width: 24, textAlign: 'center' }}>{i + 1}</Typography>
                              )}
                              <Avatar sx={{ width: 32, height: 32, fontSize: 14, background: alpha(theme.palette.primary.main, 0.1), color: 'primary.main' }}>
                                {u.userEmail?.[0]?.toUpperCase() || 'U'}
                              </Avatar>
                              <Typography variant="body2" fontWeight={700}>
                                {u.displayName || u.userEmail?.split('@')[0] || 'Kullanıcı'}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">{u.userEmail}</Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip label={u.totalLogins} size="small" sx={{ fontWeight: 700 }} />
                          </TableCell>
                          <TableCell align="center">
                            <Box sx={{ width: '100%', maxWidth: 100, display: 'inline-block' }}>
                              <Stack direction="row" justifyContent="space-between" mb={0.5}>
                                <Typography variant="caption" fontWeight={700}>{(u.successRate * 100).toFixed(0)}%</Typography>
                              </Stack>
                              <LinearProgress
                                variant="determinate"
                                value={u.successRate * 100}
                                color={u.successRate > 0.8 ? 'success' : 'warning'}
                                sx={{ height: 4, borderRadius: 2 }}
                              />
                            </Box>
                          </TableCell>
                          <TableCell align="right" sx={{ pr: 3 }}>
                            <Typography variant="caption" fontWeight={600} color="text.secondary">
                              {u.lastLoginAt ? formatDateTime(u.lastLoginAt) : 'N/A'}
                            </Typography>
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
