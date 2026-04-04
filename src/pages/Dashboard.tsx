import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  Pagination,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  FiberManualRecord as LiveDotIcon,
  Business as BusinessIcon,
  People as PeopleIcon,
  Event as EventIcon,
  Sensors as SessionIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  TrendingUp as TrendingUpIcon,
  EmojiEvents as TrophyIcon,
  Schedule as ScheduleIcon,
  Laptop as LaptopIcon,
  PhoneAndroid as PhoneIcon,
  Close as CloseIcon,
  Block as BlockIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  Security as SecurityIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Notifications as NotificationIcon,
  ArrowForward as ArrowForwardIcon,
  EventSeat as SeatIcon,
  ConfirmationNumber as TicketIcon,
  Store as StoreIcon,
  Campaign as CampaignIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useSnackbar } from 'notistack';
import { PageContainer } from '../components/Page';
import { adminLoginStatsService } from '../services/auth/adminLoginStatsService';
import { campaignService } from '../services/notification/campaignService';
import { api } from '../services/api';
import { useRole } from '../hooks/useRole';
import type {
  LoginStatsOverviewDto,
  RecentLoggedInUserDto,
  TopLoginUserDto,
  ActiveAlertDto,
  EngagementOverviewDto,
  RecentLoginLogDto,
  AuditTimelineEventDto,
} from '../types/security/loginStats';
import type { PageResponseDto } from '../types/common/pageResponse';

// ─── Helpers ───
const formatTurkishDate = (date: Date): string =>
  new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    weekday: 'long',
  }).format(date);

const getGreeting = (): string => {
  const h = new Date().getHours();
  if (h < 6) return 'İyi geceler';
  if (h < 12) return 'Günaydın';
  if (h < 18) return 'İyi günler';
  return 'İyi akşamlar';
};

const relativeTime = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'az önce';
  if (mins < 60) return `${mins} dk önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} saat önce`;
  const days = Math.floor(hours / 24);
  return `${days} gün önce`;
};

const formatSessionTime = (dateStr: string): string => {
  const d = new Date(dateStr);
  return d.toLocaleString('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const relativeTimeFuture = (dateStr: string): string => {
  const diff = new Date(dateStr).getTime() - Date.now();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'şimdi';
  if (mins < 60) return `${mins} dk sonra`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} saat sonra`;
  const days = Math.floor(hours / 24);
  return `${days} gün sonra`;
};

const getInitials = (name?: string | null, email?: string | null): string => {
  if (name) return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  if (email) return email[0].toUpperCase();
  return '?';
};

const getUserDisplayName = (name?: string | null, email?: string | null): string => {
  if (name?.trim()) return name;
  if (email?.trim()) return email.split('@')[0];
  return 'Bilinmiyor';
};

interface UpcomingNotification {
  id: string | number;
  title: string;
  description: string;
  time: string;
}

// ─── Metric Card Skeleton ───
function MetricSkeleton() {
  return (
    <Card elevation={0} sx={{ height: '100%' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box flex={1}>
            <Skeleton width={80} height={16} />
            <Skeleton width={60} height={36} sx={{ mt: 0.5 }} />
          </Box>
          <Skeleton variant="circular" width={48} height={48} />
        </Stack>
        <Skeleton width={120} height={24} sx={{ mt: 1.5 }} />
      </CardContent>
    </Card>
  );
}

// ─── Quick Action Card ───
function QuickAction({ icon, label, desc, color, onClick }: {
  icon: React.ReactNode; label: string; desc: string; color: string; onClick: () => void;
}) {
  const theme = useTheme();
  return (
    <Card
      elevation={0}
      onClick={onClick}
      sx={{
        cursor: 'pointer',
        border: `1px solid ${theme.palette.divider}`,
        transition: 'all 0.2s ease',
        '&:hover': {
          borderColor: color,
          bgcolor: alpha(color, 0.04),
          transform: 'translateY(-2px)',
          boxShadow: `0 4px 20px ${alpha(color, 0.15)}`,
        },
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Avatar
            sx={{
              width: 40,
              height: 40,
              bgcolor: alpha(color, 0.1),
              color,
            }}
          >
            {icon}
          </Avatar>
          <Box flex={1} minWidth={0}>
            <Typography variant="body2" fontWeight={600} noWrap>
              {label}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {desc}
            </Typography>
          </Box>
          <ArrowForwardIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
        </Stack>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───
export default function Dashboard() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { userName, isAdmin } = useRole();

  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<LoginStatsOverviewDto | null>(null);
  const [engagement, setEngagement] = useState<EngagementOverviewDto | null>(null);
  const [recentUsersData, setRecentUsersData] = useState<PageResponseDto<RecentLoggedInUserDto> | null>(null);
  const [topUsers, setTopUsers] = useState<TopLoginUserDto[]>([]);
  const [alerts, setAlerts] = useState<ActiveAlertDto[]>([]);
  const [recentLogs, setRecentLogs] = useState<RecentLoginLogDto[]>([]);
  const [page, setPage] = useState(0);
  const [selectedUser, setSelectedUser] = useState<RecentLoggedInUserDto | null>(null);
  const [userTimeline, setUserTimeline] = useState<AuditTimelineEventDto[]>([]);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<ActiveAlertDto | null>(null);
  const [upcomingNotifications, setUpcomingNotifications] = useState<UpcomingNotification[]>([]);
  const [entityCounts, setEntityCounts] = useState({ businesses: 0, users: 0, events: 0, activeSessions: 0 });

  const query = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return {
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
    };
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const results = await Promise.allSettled([
      adminLoginStatsService.getOverview(query),
      adminLoginStatsService.getRecentUsers({ ...query, page, size: 10 }),
      adminLoginStatsService.getEngagementOverview(),
      adminLoginStatsService.getTopWeeklyUsers({ ...query, limit: 10 }),
      adminLoginStatsService.getActiveAlerts(query),
      adminLoginStatsService.getRecentLogs({ ...query, limit: 10 }),
      campaignService.getCampaigns(undefined, 0, 5),
      api.get('/businesses', { params: { page: 0, size: 1 } }).catch(() => null),
      api.get('/auth/all-users', { params: { page: 0, size: 1 } }).catch(() => null),
      api.get('/events/popular/all', { params: { page: 0, size: 1 } }).catch(() => null),
    ]);

    if (results[0].status === 'fulfilled') setOverview(results[0].value);
    if (results[1].status === 'fulfilled') setRecentUsersData(results[1].value);
    if (results[2].status === 'fulfilled') setEngagement(results[2].value);
    if (results[3].status === 'fulfilled') setTopUsers(results[3].value);
    if (results[4].status === 'fulfilled') setAlerts(results[4].value);
    if (results[5].status === 'fulfilled') setRecentLogs(results[5].value);
    if (results[6].status === 'fulfilled') {
      const campaignData = results[6].value;
      const scheduled = (campaignData.campaigns || [])
        .filter((c: any) => c.status === 'SCHEDULED' || c.scheduledAt)
        .slice(0, 4)
        .map((c: any) => ({
          id: c.id,
          title: c.name || c.title || 'Kampanya',
          description: c.description || c.content?.body || '',
          time: c.scheduledAt || c.createdAt || new Date().toISOString(),
        }));
      if (scheduled.length > 0) setUpcomingNotifications(scheduled);
    }

    const counts = { businesses: 0, users: 0, events: 0, activeSessions: engagement?.dailyActiveUsers ?? 0 };
    if (results[7]?.status === 'fulfilled') {
      const d = (results[7] as any).value?.data?.data;
      counts.businesses = d?.totalElements ?? d?.total ?? 0;
    }
    if (results[8]?.status === 'fulfilled') {
      const d = (results[8] as any).value?.data?.data;
      counts.users = d?.totalElements ?? d?.total ?? 0;
    }
    if (results[9]?.status === 'fulfilled') {
      const d = (results[9] as any).value?.data?.data;
      counts.events = d?.totalElements ?? d?.total ?? 0;
    }
    counts.activeSessions = engagement?.dailyActiveUsers ?? 0;
    setEntityCounts(counts);

    const failCount = results.filter((r) => r.status === 'rejected').length;
    if (failCount > 0) {
      enqueueSnackbar(`${failCount} veri kaynağı yüklenemedi`, { variant: 'warning' });
    }
    setLoading(false);
  }, [query, page, enqueueSnackbar, engagement?.dailyActiveUsers]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUserClick = async (user: RecentLoggedInUserDto) => {
    setSelectedUser(user);
    try {
      const timeline = await adminLoginStatsService.getAuditTimeline({
        ...query,
        userId: user.userId,
        limit: 20,
      });
      setUserTimeline(timeline);
    } catch {
      setUserTimeline([]);
    }
  };

  const handleAlertClick = (alert: ActiveAlertDto) => {
    setSelectedAlert(alert);
    setAlertDialogOpen(true);
  };

  const criticalAlerts = alerts.filter((a) => a.severity === 'HIGH');
  const otherAlerts = alerts.filter((a) => a.severity !== 'HIGH');
  const recentUsers = recentUsersData?.content ?? [];
  const maxLogins = topUsers.length > 0 ? Math.max(...topUsers.map((u) => u.totalLogins)) : 1;

  const metricCards = [
    {
      label: 'Toplam İşletme',
      value: entityCounts.businesses,
      icon: <BusinessIcon />,
      color: theme.palette.primary.main,
      bgGradient: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.primary.light, 0.04)} 100%)`,
      path: '/businesses',
    },
    {
      label: 'Toplam Kullanıcı',
      value: entityCounts.users,
      icon: <PeopleIcon />,
      color: theme.palette.success.main,
      bgGradient: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.08)} 0%, ${alpha(theme.palette.success.light, 0.04)} 100%)`,
      path: '/users',
    },
    {
      label: 'Toplam Etkinlik',
      value: entityCounts.events,
      icon: <EventIcon />,
      color: theme.palette.warning.main,
      bgGradient: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.08)} 0%, ${alpha(theme.palette.warning.light, 0.04)} 100%)`,
      path: '/events',
    },
    {
      label: 'Aktif Oturum',
      value: entityCounts.activeSessions,
      icon: <SessionIcon />,
      color: theme.palette.info.main,
      bgGradient: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.08)} 0%, ${alpha(theme.palette.info.light, 0.04)} 100%)`,
      path: '/users',
    },
  ];

  const firstName = userName.split(' ')[0] || 'Admin';

  return (
    <PageContainer>
      {loading && (
        <LinearProgress
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1300,
            height: 3,
          }}
        />
      )}

      {/* ── Welcome Header ── */}
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography
              variant="h4"
              fontWeight={800}
              sx={{
                background: `linear-gradient(135deg, ${theme.palette.text.primary} 0%, ${theme.palette.primary.main} 100%)`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {getGreeting()}, {firstName}
            </Typography>
            <Stack direction="row" alignItems="center" spacing={1} mt={0.75}>
              <LiveDotIcon
                sx={{
                  fontSize: 8,
                  color: 'success.main',
                  animation: 'pulse 2s infinite',
                  '@keyframes pulse': {
                    '0%': { opacity: 1 },
                    '50%': { opacity: 0.4 },
                    '100%': { opacity: 1 },
                  },
                }}
              />
              <Typography variant="body2" color="text.secondary">
                {formatTurkishDate(new Date())} &middot; Sistem aktif
              </Typography>
            </Stack>
          </Box>
          <Tooltip title="Verileri yenile">
            <IconButton
              onClick={fetchData}
              disabled={loading}
              sx={{
                bgcolor: alpha(theme.palette.primary.main, 0.08),
                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.14) },
              }}
            >
              <RefreshIcon
                sx={{
                  transition: 'transform 0.3s',
                  ...(loading && { animation: 'spin 1s linear infinite', '@keyframes spin': { '100%': { transform: 'rotate(360deg)' } } }),
                }}
              />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* ── Alert Banners ── */}
      {criticalAlerts.length > 0 && (
        <Stack spacing={1} mb={3}>
          {criticalAlerts.map((alert, i) => (
            <Alert
              key={i}
              severity="error"
              icon={<ErrorIcon />}
              sx={{
                cursor: 'pointer',
                borderRadius: 3,
                border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
                '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.08) },
              }}
              onClick={() => handleAlertClick(alert)}
              action={<Chip label="Detay" size="small" color="error" variant="outlined" sx={{ borderRadius: 2 }} />}
            >
              <Typography variant="body2" fontWeight={600}>{alert.title}</Typography>
              <Typography variant="caption" color="text.secondary">{alert.description}</Typography>
            </Alert>
          ))}
        </Stack>
      )}

      {otherAlerts.length > 0 && (
        <Stack spacing={1} mb={3}>
          {otherAlerts.slice(0, 2).map((alert, i) => (
            <Alert
              key={i}
              severity="warning"
              icon={<WarningIcon />}
              sx={{
                cursor: 'pointer',
                borderRadius: 3,
                border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
                '&:hover': { bgcolor: alpha(theme.palette.warning.main, 0.06) },
              }}
              onClick={() => handleAlertClick(alert)}
              action={<Chip label="Detay" size="small" color="warning" variant="outlined" sx={{ borderRadius: 2 }} />}
            >
              <Typography variant="body2" fontWeight={600}>{alert.title}</Typography>
              <Typography variant="caption" color="text.secondary">{alert.description}</Typography>
            </Alert>
          ))}
        </Stack>
      )}

      {/* ── Metric Cards ── */}
      <Grid container spacing={2.5} mb={3}>
        {metricCards.map((card, i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            {loading ? (
              <MetricSkeleton />
            ) : (
              <Card
                elevation={0}
                onClick={() => navigate(card.path)}
                sx={{
                  height: '100%',
                  cursor: 'pointer',
                  background: card.bgGradient,
                  border: `1px solid ${alpha(card.color, 0.12)}`,
                  borderRadius: 3,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: alpha(card.color, 0.3),
                    transform: 'translateY(-2px)',
                    boxShadow: `0 8px 24px ${alpha(card.color, 0.12)}`,
                  },
                }}
              >
                <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        fontWeight={600}
                        sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 11 }}
                      >
                        {card.label}
                      </Typography>
                      <Typography variant="h4" fontWeight={800} mt={0.75} sx={{ color: card.color }}>
                        {card.value.toLocaleString('tr-TR')}
                      </Typography>
                    </Box>
                    <Avatar
                      sx={{
                        bgcolor: alpha(card.color, 0.15),
                        color: card.color,
                        width: 48,
                        height: 48,
                        borderRadius: 3,
                      }}
                    >
                      {card.icon}
                    </Avatar>
                  </Stack>
                  <Stack direction="row" alignItems="center" spacing={0.5} mt={1.5}>
                    <TrendingUpIcon sx={{ fontSize: 14, color: 'success.main' }} />
                    <Typography variant="caption" color="text.secondary" fontWeight={500}>
                      Son 30 gün
                    </Typography>
                    <OpenInNewIcon sx={{ fontSize: 12, color: 'text.disabled', ml: 'auto' }} />
                  </Stack>
                </CardContent>
              </Card>
            )}
          </Grid>
        ))}
      </Grid>

      {/* ── Quick Actions ── */}
      {isAdmin && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight={700} color="text.secondary" mb={1.5} sx={{ textTransform: 'uppercase', letterSpacing: 1, fontSize: 11 }}>
            Hızlı Erişim
          </Typography>
          <Grid container spacing={2}>
            {[
              { icon: <EventIcon fontSize="small" />, label: 'Etkinlik Oluştur', desc: 'Yeni etkinlik ekle', color: theme.palette.warning.main, path: '/events' },
              { icon: <TicketIcon fontSize="small" />, label: 'Etkinlik Oluştur', desc: 'Yeni etkinlik & bilet', color: theme.palette.info.main, path: '/event-creation' },
              { icon: <SeatIcon fontSize="small" />, label: 'Oturma Düzeni', desc: 'Salon planı tasarla', color: theme.palette.success.main, path: '/seat-map' },
              { icon: <StoreIcon fontSize="small" />, label: 'İşletme Ekle', desc: 'Yeni işletme kaydet', color: theme.palette.primary.main, path: '/businesses' },
              { icon: <CampaignIcon fontSize="small" />, label: 'Bildirim Gönder', desc: 'Kampanya oluştur', color: theme.palette.error.main, path: '/notifications' },
              { icon: <PersonIcon fontSize="small" />, label: 'Kullanıcılar', desc: 'Kullanıcı yönetimi', color: '#8b5cf6', path: '/users' },
            ].map((action) => (
              <Grid item xs={12} sm={6} md={4} lg={2} key={action.label}>
                <QuickAction {...action} onClick={() => navigate(action.path)} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* ── Son 3 Gün Eklenenler ── */}
      <Card
        elevation={0}
        sx={{
          mb: 3,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <Box sx={{ px: 3, pt: 2.5, pb: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" fontWeight={700}>
              Aktif Kullanıcılar
            </Typography>
            <Chip
              label="Canlı"
              size="small"
              icon={<LiveDotIcon sx={{ fontSize: '8px !important', color: 'success.main !important' }} />}
              sx={{
                bgcolor: alpha(theme.palette.success.main, 0.08),
                color: 'success.dark',
                fontWeight: 600,
                fontSize: 11,
              }}
            />
          </Stack>
        </Box>
        <CardContent sx={{ pt: 1 }}>
          <Grid container spacing={2}>
            {[
              {
                label: 'Günlük Aktif (DAU)',
                value: engagement?.dailyActiveUsers ?? 0,
                subtitle: `${engagement?.dailyLoginCount ?? 0} oturum`,
                color: theme.palette.primary.main,
                icon: <PeopleIcon />,
              },
              {
                label: 'Haftalık Aktif (WAU)',
                value: engagement?.weeklyActiveUsers ?? 0,
                subtitle: `${engagement?.weeklyLoginCount ?? 0} oturum`,
                color: theme.palette.success.main,
                icon: <SessionIcon />,
              },
              {
                label: 'Aylık Aktif (MAU)',
                value: engagement?.monthlyActiveUsers ?? 0,
                subtitle: `${engagement?.monthlyLoginCount ?? 0} oturum`,
                color: theme.palette.warning.main,
                icon: <TrendingUpIcon />,
              },
            ].map((item, i) => (
              <Grid item xs={12} md={4} key={i}>
                <Box
                  sx={{
                    p: 2.5,
                    borderRadius: 3,
                    background: `linear-gradient(135deg, ${alpha(item.color, 0.06)} 0%, ${alpha(item.color, 0.02)} 100%)`,
                    border: `1px solid ${alpha(item.color, 0.1)}`,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: alpha(item.color, 0.25),
                      boxShadow: `0 4px 12px ${alpha(item.color, 0.1)}`,
                    },
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Avatar
                      sx={{
                        bgcolor: alpha(item.color, 0.15),
                        color: item.color,
                        width: 44,
                        height: 44,
                        borderRadius: 2.5,
                      }}
                    >
                      {item.icon}
                    </Avatar>
                    <Box flex={1}>
                      <Typography variant="caption" color="text.secondary" fontWeight={500}>
                        {item.label}
                      </Typography>
                      <Stack direction="row" alignItems="baseline" spacing={1}>
                        <Typography variant="h4" fontWeight={800} color={item.color}>
                          {item.value.toLocaleString('tr-TR')}
                        </Typography>
                        <Typography variant="caption" color="text.disabled">
                          {item.subtitle}
                        </Typography>
                      </Stack>
                    </Box>
                  </Stack>
                </Box>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* ── Main Grid: Table + Sidebar ── */}
      <Grid container spacing={3}>
        {/* Left: Recent Users Table */}
        <Grid item xs={12} lg={8}>
          <Card
            elevation={0}
            sx={{
              height: '100%',
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 3,
            }}
          >
            <CardContent sx={{ p: 0 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" px={3} pt={2.5} pb={1.5}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Typography variant="h6" fontWeight={700}>
                    Son Giriş Yapanlar
                  </Typography>
                  <Chip
                    label={`${recentUsersData?.totalElements ?? 0}`}
                    size="small"
                    sx={{
                      height: 22,
                      fontSize: 11,
                      fontWeight: 700,
                      bgcolor: alpha(theme.palette.primary.main, 0.08),
                      color: 'primary.main',
                    }}
                  />
                </Stack>
                <Button
                  size="small"
                  endIcon={<ArrowForwardIcon sx={{ fontSize: '14px !important' }} />}
                  onClick={() => navigate('/users')}
                  sx={{ textTransform: 'none', fontWeight: 600, fontSize: 12 }}
                >
                  Tümünü Gör
                </Button>
              </Stack>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12, color: 'text.secondary', pl: 3 }}>
                        Kullanıcı
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12, color: 'text.secondary' }}>
                        E-posta
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12, color: 'text.secondary' }}>
                        Son Giriş
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12, color: 'text.secondary' }}>
                        Cihaz
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, fontSize: 12, color: 'text.secondary', pr: 3 }}>
                        Durum
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentUsers.map((user) => {
                      const userLog = recentLogs.find((l) => l.userEmail === user.userEmail);
                      const isRecent =
                        user.lastLoginAt &&
                        Date.now() - new Date(user.lastLoginAt).getTime() < 3600000;
                      return (
                        <TableRow
                          key={user.userId}
                          hover
                          sx={{
                            cursor: 'pointer',
                            transition: 'background 0.15s',
                            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) },
                            '&:last-child td': { borderBottom: 0 },
                          }}
                          onClick={() => handleUserClick(user)}
                        >
                          <TableCell sx={{ pl: 3 }}>
                            <Stack direction="row" alignItems="center" spacing={1.5}>
                              <Avatar
                                sx={{
                                  width: 34,
                                  height: 34,
                                  fontSize: 13,
                                  fontWeight: 600,
                                  bgcolor: alpha(theme.palette.primary.main, 0.12),
                                  color: 'primary.main',
                                }}
                              >
                                {getInitials(user.displayName, user.userEmail)}
                              </Avatar>
                              <Typography variant="body2" fontWeight={500}>
                                {getUserDisplayName(user.displayName, user.userEmail)}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {user.userEmail || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13, whiteSpace: 'nowrap' }}>
                              {user.lastLoginAt ? formatSessionTime(user.lastLoginAt) : '-'}
                            </Typography>
                            {user.lastLoginAt && (
                              <Typography variant="caption" color="text.disabled" sx={{ fontSize: 11 }}>
                                {relativeTime(user.lastLoginAt)}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            {userLog?.device ? (
                              <Stack direction="row" alignItems="center" spacing={0.5}>
                                {userLog.device.toLowerCase().includes('mobile') ? (
                                  <PhoneIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
                                ) : (
                                  <LaptopIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
                                )}
                                <Typography variant="caption" color="text.secondary">
                                  {userLog.device}
                                </Typography>
                              </Stack>
                            ) : (
                              <Typography variant="caption" color="text.disabled">-</Typography>
                            )}
                          </TableCell>
                          <TableCell align="center" sx={{ pr: 3 }}>
                            <Chip
                              size="small"
                              label={isRecent ? 'Aktif' : 'Çevrimdışı'}
                              sx={{
                                fontSize: 11,
                                fontWeight: 600,
                                height: 24,
                                borderRadius: 1.5,
                                ...(isRecent
                                  ? {
                                      bgcolor: alpha(theme.palette.success.main, 0.1),
                                      color: 'success.dark',
                                    }
                                  : {
                                      bgcolor: alpha(theme.palette.grey[500], 0.08),
                                      color: 'text.secondary',
                                    }),
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {recentUsers.length === 0 && !loading && (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                          <PeopleIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                          <Typography variant="body2" color="text.secondary">
                            Henüz giriş kaydı bulunamadı
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              {recentUsersData && recentUsersData.totalPages > 1 && (
                <Stack alignItems="center" py={2}>
                  <Pagination
                    count={recentUsersData.totalPages}
                    page={page + 1}
                    onChange={(_, p) => setPage(p - 1)}
                    size="small"
                    color="primary"
                  />
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column */}
        <Grid item xs={12} lg={4}>
          <Stack spacing={2.5}>
            {/* Bu Hafta En Çok Giriş */}
            <Card
              elevation={0}
              sx={{
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 3,
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                  <Avatar
                    sx={{
                      width: 28,
                      height: 28,
                      bgcolor: alpha(theme.palette.warning.main, 0.12),
                      color: 'warning.main',
                    }}
                  >
                    <TrophyIcon sx={{ fontSize: 16 }} />
                  </Avatar>
                  <Typography variant="subtitle1" fontWeight={700}>
                    Haftalık Sıralama
                  </Typography>
                </Stack>
                <Stack spacing={1.5}>
                  {topUsers.slice(0, 5).map((user, i) => (
                    <Stack key={user.userId} spacing={0.5}>
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Typography
                          variant="caption"
                          fontWeight={800}
                          sx={{
                            width: 24,
                            height: 24,
                            borderRadius: 1.5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: i === 0
                              ? alpha('#f59e0b', 0.15)
                              : i === 1
                                ? alpha('#94a3b8', 0.15)
                                : i === 2
                                  ? alpha('#cd7f32', 0.15)
                                  : alpha(theme.palette.grey[500], 0.08),
                            color: i === 0
                              ? '#d97706'
                              : i === 1
                                ? '#64748b'
                                : i === 2
                                  ? '#b45309'
                                  : 'text.secondary',
                            fontSize: 11,
                          }}
                        >
                          {i + 1}
                        </Typography>
                        <Avatar
                          sx={{
                            width: 30,
                            height: 30,
                            fontSize: 12,
                            fontWeight: 600,
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            color: 'primary.main',
                          }}
                        >
                          {getInitials(user.displayName, user.userEmail)}
                        </Avatar>
                        <Box flex={1} minWidth={0}>
                          <Typography variant="body2" fontWeight={500} noWrap>
                            {getUserDisplayName(user.displayName, user.userEmail)}
                          </Typography>
                        </Box>
                        <Chip
                          label={user.totalLogins}
                          size="small"
                          sx={{
                            height: 22,
                            fontSize: 11,
                            fontWeight: 700,
                            bgcolor: i === 0
                              ? alpha(theme.palette.warning.main, 0.1)
                              : alpha(theme.palette.grey[500], 0.08),
                            color: i === 0 ? 'warning.dark' : 'text.secondary',
                          }}
                        />
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={(user.totalLogins / maxLogins) * 100}
                        sx={{
                          height: 3,
                          borderRadius: 2,
                          ml: 6.5,
                          bgcolor: alpha(theme.palette.primary.main, 0.06),
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 2,
                            background: i === 0
                              ? `linear-gradient(90deg, ${theme.palette.warning.main}, ${theme.palette.warning.light})`
                              : `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
                          },
                        }}
                      />
                    </Stack>
                  ))}
                  {topUsers.length === 0 && (
                    <Box textAlign="center" py={3}>
                      <TrophyIcon sx={{ fontSize: 32, color: 'text.disabled', mb: 0.5 }} />
                      <Typography variant="body2" color="text.secondary">
                        Veri bulunamadı
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </CardContent>
            </Card>

            {/* Yaklaşan Bildirimler */}
            <Card
              elevation={0}
              sx={{
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 3,
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Avatar
                      sx={{
                        width: 28,
                        height: 28,
                        bgcolor: alpha(theme.palette.info.main, 0.12),
                        color: 'info.main',
                      }}
                    >
                      <ScheduleIcon sx={{ fontSize: 16 }} />
                    </Avatar>
                    <Typography variant="subtitle1" fontWeight={700}>
                      Yaklaşan Bildirimler
                    </Typography>
                  </Stack>
                  {upcomingNotifications.length > 0 && (
                    <Chip
                      label={upcomingNotifications.length}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: 11,
                        fontWeight: 700,
                        bgcolor: alpha(theme.palette.info.main, 0.1),
                        color: 'info.dark',
                      }}
                    />
                  )}
                </Stack>
                <Stack spacing={0}>
                  {upcomingNotifications.length === 0 ? (
                    <Box textAlign="center" py={3}>
                      <NotificationIcon sx={{ fontSize: 32, color: 'text.disabled', mb: 0.5 }} />
                      <Typography variant="body2" color="text.disabled">
                        Yaklaşan bildirim bulunmuyor
                      </Typography>
                    </Box>
                  ) : upcomingNotifications.map((notif, i) => (
                    <Box key={notif.id}>
                      <Stack direction="row" spacing={1.5} alignItems="flex-start" py={1.5}>
                        <Avatar
                          sx={{
                            width: 32,
                            height: 32,
                            bgcolor: alpha(theme.palette.info.main, 0.1),
                            color: 'info.main',
                          }}
                        >
                          <NotificationIcon sx={{ fontSize: 16 }} />
                        </Avatar>
                        <Box flex={1} minWidth={0}>
                          <Typography variant="body2" fontWeight={600} noWrap>
                            {notif.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {notif.description}
                          </Typography>
                        </Box>
                        <Chip
                          label={relativeTimeFuture(notif.time)}
                          size="small"
                          sx={{
                            fontSize: 10,
                            fontWeight: 600,
                            height: 22,
                            borderRadius: 1.5,
                            bgcolor: alpha(theme.palette.info.main, 0.08),
                            color: 'info.dark',
                          }}
                        />
                      </Stack>
                      {i < upcomingNotifications.length - 1 && <Divider />}
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      {/* ── User Detail Dialog ── */}
      <Dialog
        open={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        {selectedUser && (
          <>
            <DialogTitle sx={{ pb: 1 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Avatar
                    sx={{
                      width: 48,
                      height: 48,
                      bgcolor: alpha(theme.palette.primary.main, 0.15),
                      color: 'primary.main',
                      fontWeight: 700,
                    }}
                  >
                    {getInitials(selectedUser.displayName, selectedUser.userEmail)}
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight={600}>
                      {getUserDisplayName(selectedUser.displayName, selectedUser.userEmail)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedUser.userEmail || '-'}
                    </Typography>
                  </Box>
                </Stack>
                <IconButton onClick={() => setSelectedUser(null)} size="small">
                  <CloseIcon />
                </IconButton>
              </Stack>
            </DialogTitle>
            <DialogContent dividers>
              {/* Stats Grid */}
              <Grid container spacing={1.5} mb={3}>
                {[
                  {
                    label: 'Toplam Giriş',
                    value: userTimeline.length,
                    icon: <PersonIcon fontSize="small" />,
                    color: theme.palette.primary.main,
                  },
                  {
                    label: 'Başarı Oranı',
                    value:
                      userTimeline.length > 0
                        ? `${((userTimeline.filter((e) => e.status === 'SUCCESS').length / userTimeline.length) * 100).toFixed(0)}%`
                        : '-',
                    icon: <CheckCircleIcon fontSize="small" />,
                    color: theme.palette.success.main,
                  },
                  {
                    label: 'Risk Skoru',
                    value:
                      userTimeline.filter((e) => e.status === 'FAILURE').length > 3
                        ? 'Yüksek'
                        : 'Düşük',
                    icon: <SecurityIcon fontSize="small" />,
                    color:
                      userTimeline.filter((e) => e.status === 'FAILURE').length > 3
                        ? theme.palette.error.main
                        : theme.palette.success.main,
                  },
                  {
                    label: 'Son Cihaz',
                    value: userTimeline[0]?.device || '-',
                    icon: <LaptopIcon fontSize="small" />,
                    color: theme.palette.info.main,
                  },
                ].map((stat, i) => (
                  <Grid item xs={6} key={i}>
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 2.5,
                        bgcolor: alpha(stat.color, 0.06),
                        border: `1px solid ${alpha(stat.color, 0.1)}`,
                        textAlign: 'center',
                      }}
                    >
                      <Box sx={{ color: stat.color, mb: 0.5 }}>{stat.icon}</Box>
                      <Typography variant="caption" color="text.secondary" display="block" fontWeight={500}>
                        {stat.label}
                      </Typography>
                      <Typography variant="body1" fontWeight={700}>
                        {stat.value}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>

              {/* User Info */}
              <Typography variant="subtitle2" fontWeight={700} mb={1}>
                Kullanıcı Bilgileri
              </Typography>
              <Stack spacing={0.5} mb={3}>
                {[
                  { label: 'Kullanıcı ID', value: selectedUser.userId },
                  { label: 'E-posta', value: selectedUser.userEmail },
                  {
                    label: 'Son Oturum',
                    value: selectedUser.lastSessionAt
                      ? format(new Date(selectedUser.lastSessionAt), 'dd.MM.yyyy HH:mm')
                      : '-',
                  },
                  {
                    label: 'Son Giriş',
                    value: selectedUser.lastLoginAt
                      ? format(new Date(selectedUser.lastLoginAt), 'dd.MM.yyyy HH:mm')
                      : '-',
                  },
                ].map((row, i) => (
                  <Stack
                    key={i}
                    direction="row"
                    justifyContent="space-between"
                    sx={{
                      py: 1,
                      px: 1.5,
                      borderRadius: 2,
                      bgcolor: i % 2 === 0 ? alpha(theme.palette.grey[500], 0.04) : 'transparent',
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">{row.label}</Typography>
                    <Typography variant="body2" fontWeight={600}>{row.value}</Typography>
                  </Stack>
                ))}
              </Stack>

              {/* Activity Timeline */}
              <Typography variant="subtitle2" fontWeight={700} mb={1}>
                Aktivite Geçmişi
              </Typography>
              <Stack spacing={0} sx={{ maxHeight: 240, overflowY: 'auto' }}>
                {userTimeline.slice(0, 10).map((event, i) => (
                  <Stack
                    key={event.eventId}
                    direction="row"
                    spacing={1.5}
                    alignItems="flex-start"
                    py={1}
                    sx={{
                      borderBottom:
                        i < Math.min(userTimeline.length, 10) - 1
                          ? `1px solid ${theme.palette.divider}`
                          : 'none',
                    }}
                  >
                    {event.status === 'SUCCESS' ? (
                      <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main', mt: 0.25 }} />
                    ) : (
                      <CancelIcon sx={{ fontSize: 18, color: 'error.main', mt: 0.25 }} />
                    )}
                    <Box flex={1}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" fontWeight={600}>
                          {event.eventType === 'LOGIN'
                            ? 'Giriş'
                            : event.eventType === 'LOGOUT'
                              ? 'Çıkış'
                              : event.eventType}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {relativeTime(event.createdAt)}
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={1} mt={0.25}>
                        {event.ipAddress && (
                          <Typography variant="caption" color="text.disabled">{event.ipAddress}</Typography>
                        )}
                        {event.device && (
                          <Typography variant="caption" color="text.disabled">{event.device}</Typography>
                        )}
                      </Stack>
                      {event.failureReason && (
                        <Typography variant="caption" color="error.main">{event.failureReason}</Typography>
                      )}
                    </Box>
                  </Stack>
                ))}
                {userTimeline.length === 0 && (
                  <Typography variant="body2" color="text.secondary" textAlign="center" py={3}>
                    Aktivite bulunamadı
                  </Typography>
                )}
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
              <Button
                startIcon={<LogoutIcon />}
                color="warning"
                variant="outlined"
                size="small"
                sx={{ borderRadius: 2, textTransform: 'none' }}
                onClick={() => {
                  enqueueSnackbar('Oturum kapatma işlemi başlatıldı', { variant: 'info' });
                  setSelectedUser(null);
                }}
              >
                Oturumu Kapat
              </Button>
              <Button
                startIcon={<BlockIcon />}
                color="error"
                variant="outlined"
                size="small"
                sx={{ borderRadius: 2, textTransform: 'none' }}
                onClick={() => {
                  enqueueSnackbar('Hesap engelleme işlemi başlatıldı', { variant: 'warning' });
                  setSelectedUser(null);
                }}
              >
                Hesabı Engelle
              </Button>
              <Button
                startIcon={<PersonIcon />}
                color="primary"
                variant="contained"
                size="small"
                sx={{ borderRadius: 2, textTransform: 'none' }}
                onClick={() => {
                  navigate(`/users/${selectedUser.userId}`);
                  setSelectedUser(null);
                }}
              >
                Profili Gör
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ── Alert Detail Dialog ── */}
      <Dialog
        open={alertDialogOpen}
        onClose={() => setAlertDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        {selectedAlert && (
          <>
            <DialogTitle>
              <Stack direction="row" alignItems="center" spacing={1}>
                {selectedAlert.severity === 'HIGH' ? (
                  <ErrorIcon color="error" />
                ) : (
                  <WarningIcon color="warning" />
                )}
                <Typography variant="h6" fontWeight={700}>
                  {selectedAlert.title}
                </Typography>
              </Stack>
            </DialogTitle>
            <DialogContent dividers>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    Açıklama
                  </Typography>
                  <Typography variant="body2">{selectedAlert.description}</Typography>
                </Box>
                <Stack direction="row" spacing={2}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      Önem Derecesi
                    </Typography>
                    <Box mt={0.5}>
                      <Chip
                        size="small"
                        sx={{ borderRadius: 1.5 }}
                        label={
                          selectedAlert.severity === 'HIGH'
                            ? 'Yüksek'
                            : selectedAlert.severity === 'MEDIUM'
                              ? 'Orta'
                              : 'Düşük'
                        }
                        color={
                          selectedAlert.severity === 'HIGH'
                            ? 'error'
                            : selectedAlert.severity === 'MEDIUM'
                              ? 'warning'
                              : 'info'
                        }
                      />
                    </Box>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      Durum
                    </Typography>
                    <Typography variant="body2" mt={0.5}>{selectedAlert.status}</Typography>
                  </Box>
                </Stack>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    Kod
                  </Typography>
                  <Typography variant="body2" fontFamily="monospace">{selectedAlert.code}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    Oluşturulma
                  </Typography>
                  <Typography variant="body2">
                    {format(new Date(selectedAlert.createdAt), 'dd.MM.yyyy HH:mm:ss')}
                  </Typography>
                </Box>
                {selectedAlert.assignee && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      Atanan
                    </Typography>
                    <Typography variant="body2">{selectedAlert.assignee}</Typography>
                  </Box>
                )}
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
              <Button
                onClick={() => setAlertDialogOpen(false)}
                sx={{ borderRadius: 2, textTransform: 'none' }}
              >
                Kapat
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </PageContainer>
  );
}
