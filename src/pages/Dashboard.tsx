import { useCallback, useEffect, useMemo, useState } from 'react';
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
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
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
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useSnackbar } from 'notistack';
import { PageContainer } from '../components/Page';
import { adminLoginStatsService } from '../services/auth/adminLoginStatsService';
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

const formatTurkishDate = (date: Date): string =>
  new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    weekday: 'long',
  }).format(date);

const relativeTime = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'az once';
  if (mins < 60) return `${mins} dk once`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} saat once`;
  const days = Math.floor(hours / 24);
  return `${days} gun once`;
};

const relativeTimeFuture = (dateStr: string): string => {
  const diff = new Date(dateStr).getTime() - Date.now();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'simdi';
  if (mins < 60) return `${mins} dk sonra`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} saat sonra`;
  const days = Math.floor(hours / 24);
  return `${days} gun sonra`;
};

const getInitials = (name?: string | null, email?: string | null): string => {
  if (name) return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  if (email) return email[0].toUpperCase();
  return '?';
};

const mockNotifications = [
  {
    id: 1,
    icon: <NotificationIcon fontSize="small" />,
    title: 'Sistem Bakimi',
    description: 'Planli bakim calismasi',
    time: new Date(Date.now() + 2 * 3600000).toISOString(),
  },
  {
    id: 2,
    icon: <SecurityIcon fontSize="small" />,
    title: 'Guvenlik Taramasi',
    description: 'Otomatik guvenlik taramasi baslatilacak',
    time: new Date(Date.now() + 5 * 3600000).toISOString(),
  },
  {
    id: 3,
    icon: <EventIcon fontSize="small" />,
    title: 'Rapor Gönderimi',
    description: 'Haftalık rapor e-posta ile gönderilecek',
    time: new Date(Date.now() + 24 * 3600000).toISOString(),
  },
];

export default function Dashboard() {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();

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
    ]);

    if (results[0].status === 'fulfilled') setOverview(results[0].value);
    if (results[1].status === 'fulfilled') setRecentUsersData(results[1].value);
    if (results[2].status === 'fulfilled') setEngagement(results[2].value);
    if (results[3].status === 'fulfilled') setTopUsers(results[3].value);
    if (results[4].status === 'fulfilled') setAlerts(results[4].value);
    if (results[5].status === 'fulfilled') setRecentLogs(results[5].value);

    const failCount = results.filter((r) => r.status === 'rejected').length;
    if (failCount > 0) {
      enqueueSnackbar(`${failCount} veri kaynağı yüklenemedi`, { variant: 'warning' });
    }
    setLoading(false);
  }, [query, page, enqueueSnackbar]);

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
      value: overview?.uniqueUsers ?? 0,
      icon: <BusinessIcon />,
      color: theme.palette.primary.main,
      delta: '+12%',
      newLast3: engagement?.dailyActiveUsers ?? 0,
    },
    {
      label: 'Toplam Kullanıcı',
      value: overview?.uniqueUsers ?? 0,
      icon: <PeopleIcon />,
      color: theme.palette.success.main,
      delta: '+8%',
      newLast3: engagement?.weeklyActiveUsers ?? 0,
    },
    {
      label: 'Toplam Etkinlik',
      value: overview?.totalAttempts ?? 0,
      icon: <EventIcon />,
      color: theme.palette.warning.main,
      delta: '+15%',
      newLast3: engagement?.dailyLoginCount ?? 0,
    },
    {
      label: 'Aktif Oturum',
      value: engagement?.dailyActiveUsers ?? 0,
      icon: <SessionIcon />,
      color: theme.palette.info.main,
      delta: `${((engagement?.dauWauRatio ?? 0) * 100).toFixed(0)}%`,
      newLast3: engagement?.dailyLoginCount ?? 0,
    },
  ];

  return (
    <PageContainer>
      {loading && (
        <LinearProgress sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1300 }} />
      )}

      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Kontrol Paneli
          </Typography>
          <Stack direction="row" alignItems="center" spacing={1} mt={0.5}>
            <LiveDotIcon sx={{ fontSize: 10, color: 'success.main' }} />
            <Typography variant="body2" color="text.secondary">
              {formatTurkishDate(new Date())}
            </Typography>
          </Stack>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<FilterIcon />} size="small">
            Filtre
          </Button>
          <Button variant="contained" startIcon={<RefreshIcon />} size="small" onClick={fetchData}>
            Yenile
          </Button>
        </Stack>
      </Stack>

      {/* Alert Banners */}
      {criticalAlerts.length > 0 && (
        <Stack spacing={1} mb={3}>
          {criticalAlerts.map((alert, i) => (
            <Alert
              key={i}
              severity="error"
              icon={<ErrorIcon />}
              sx={{
                cursor: 'pointer',
                '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.08) },
              }}
              onClick={() => handleAlertClick(alert)}
              action={<Chip label="Detay" size="small" color="error" variant="outlined" />}
            >
              <Typography variant="body2" fontWeight={600}>
                {alert.title}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {alert.description}
              </Typography>
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
                '&:hover': { bgcolor: alpha(theme.palette.warning.main, 0.06) },
              }}
              onClick={() => handleAlertClick(alert)}
              action={<Chip label="Detay" size="small" color="warning" variant="outlined" />}
            >
              <Typography variant="body2" fontWeight={600}>
                {alert.title}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {alert.description}
              </Typography>
            </Alert>
          ))}
        </Stack>
      )}

      {/* 4 Main Metric Cards */}
      <Grid container spacing={2} mb={3}>
        {metricCards.map((card, i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}` }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={500}>
                      {card.label}
                    </Typography>
                    <Typography variant="h4" fontWeight={700} mt={0.5}>
                      {card.value.toLocaleString('tr-TR')}
                    </Typography>
                  </Box>
                  <Avatar
                    sx={{
                      bgcolor: alpha(card.color, 0.1),
                      color: card.color,
                      width: 44,
                      height: 44,
                    }}
                  >
                    {card.icon}
                  </Avatar>
                </Stack>
                <Stack direction="row" spacing={1} mt={1.5}>
                  <Chip
                    size="small"
                    icon={<TrendingUpIcon sx={{ fontSize: 14 }} />}
                    label={card.delta}
                    sx={{
                      bgcolor: alpha(theme.palette.success.main, 0.1),
                      color: 'success.dark',
                      fontWeight: 600,
                      fontSize: 11,
                    }}
                  />
                  <Chip
                    size="small"
                    label={`Son 3 gün: ${card.newLast3}`}
                    sx={{
                      bgcolor: alpha(theme.palette.info.main, 0.1),
                      color: 'info.dark',
                      fontWeight: 500,
                      fontSize: 11,
                    }}
                  />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Son 3 Gün Eklenenler */}
      <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} mb={2}>
            Son 3 Gün Eklenenler
          </Typography>
          <Grid container spacing={3}>
            {[
              {
                label: 'Yeni İşletme',
                value: engagement?.dailyActiveUsers ?? 0,
                avg: ((engagement?.dailyActiveUsers ?? 0) / 3).toFixed(1),
                color: theme.palette.primary.main,
                icon: <BusinessIcon />,
              },
              {
                label: 'Yeni Kullanıcı',
                value: engagement?.weeklyActiveUsers ?? 0,
                avg: ((engagement?.weeklyActiveUsers ?? 0) / 3).toFixed(1),
                color: theme.palette.success.main,
                icon: <PeopleIcon />,
              },
              {
                label: 'Yeni Etkinlik',
                value: engagement?.dailyLoginCount ?? 0,
                avg: ((engagement?.dailyLoginCount ?? 0) / 3).toFixed(1),
                color: theme.palette.warning.main,
                icon: <EventIcon />,
              },
            ].map((item, i) => (
              <Grid item xs={12} md={4} key={i}>
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={2}
                  sx={{ p: 2, borderRadius: 2, bgcolor: alpha(item.color, 0.04) }}
                >
                  <Avatar sx={{ bgcolor: alpha(item.color, 0.12), color: item.color }}>
                    {item.icon}
                  </Avatar>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      {item.label}
                    </Typography>
                    <Typography variant="h5" fontWeight={700}>
                      {item.value}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Gunluk ort: {item.avg}
                    </Typography>
                  </Box>
                </Stack>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Main Grid: 2fr 1fr */}
      <Grid container spacing={3}>
        {/* Left: Recent Users Table */}
        <Grid item xs={12} lg={8}>
          <Card
            elevation={0}
            sx={{ border: `1px solid ${theme.palette.divider}`, height: '100%' }}
          >
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" fontWeight={600}>
                  Son Giriş Yapan Kullanıcılar
                </Typography>
                <Chip
                  label={`${recentUsersData?.totalElements ?? 0} kullanici`}
                  size="small"
                />
              </Stack>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Kullanıcı</TableCell>
                      <TableCell>E-posta</TableCell>
                      <TableCell>Son Giriş</TableCell>
                      <TableCell>Cihaz</TableCell>
                      <TableCell align="center">Durum</TableCell>
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
                            '&:hover': {
                              bgcolor: alpha(theme.palette.primary.main, 0.04),
                            },
                          }}
                          onClick={() => handleUserClick(user)}
                        >
                          <TableCell>
                            <Stack direction="row" alignItems="center" spacing={1.5}>
                              <Avatar
                                sx={{
                                  width: 32,
                                  height: 32,
                                  fontSize: 13,
                                  bgcolor: alpha(theme.palette.primary.main, 0.15),
                                  color: 'primary.main',
                                }}
                              >
                                {getInitials(user.displayName, user.userEmail)}
                              </Avatar>
                              <Typography variant="body2" fontWeight={500}>
                                {user.displayName || user.userEmail.split('@')[0]}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {user.userEmail}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {user.lastLoginAt ? relativeTime(user.lastLoginAt) : '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {userLog?.device ? (
                              <Stack direction="row" alignItems="center" spacing={0.5}>
                                {userLog.device.toLowerCase().includes('mobile') ? (
                                  <PhoneIcon sx={{ fontSize: 16 }} />
                                ) : (
                                  <LaptopIcon sx={{ fontSize: 16 }} />
                                )}
                                <Typography variant="caption">{userLog.device}</Typography>
                              </Stack>
                            ) : (
                              <Typography variant="caption" color="text.disabled">
                                -
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              size="small"
                              label={isRecent ? 'Aktif' : 'Cevrimdisi'}
                              color={isRecent ? 'success' : 'default'}
                              variant={isRecent ? 'filled' : 'outlined'}
                              sx={{ fontSize: 11, height: 24 }}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {recentUsers.length === 0 && !loading && (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                          <Typography variant="body2" color="text.secondary">
                            Kullanıcı bulunamadı
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              {recentUsersData && recentUsersData.totalPages > 1 && (
                <Stack alignItems="center" mt={2}>
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
          <Stack spacing={3}>
            {/* Bu Hafta En Çok Giriş */}
            <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}` }}>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                  <TrophyIcon sx={{ color: 'warning.main', fontSize: 20 }} />
                  <Typography variant="h6" fontWeight={600}>
                    Bu Hafta En Çok Giriş
                  </Typography>
                </Stack>
                <Stack spacing={1.5}>
                  {topUsers.slice(0, 5).map((user, i) => (
                    <Stack key={user.userId} spacing={0.5}>
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Typography
                          variant="caption"
                          fontWeight={700}
                          sx={{
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor:
                              i < 3
                                ? alpha(theme.palette.warning.main, 0.15)
                                : alpha(theme.palette.grey[500], 0.1),
                            color: i < 3 ? 'warning.dark' : 'text.secondary',
                            fontSize: 11,
                          }}
                        >
                          {i + 1}
                        </Typography>
                        <Avatar
                          sx={{
                            width: 28,
                            height: 28,
                            fontSize: 11,
                            bgcolor: alpha(theme.palette.primary.main, 0.12),
                            color: 'primary.main',
                          }}
                        >
                          {getInitials(user.displayName, user.userEmail)}
                        </Avatar>
                        <Box flex={1} minWidth={0}>
                          <Typography variant="body2" fontWeight={500} noWrap>
                            {user.displayName || user.userEmail?.split('@')[0] || 'Bilinmiyor'}
                          </Typography>
                        </Box>
                        <Typography variant="caption" fontWeight={600} color="text.secondary">
                          {user.totalLogins}
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={(user.totalLogins / maxLogins) * 100}
                        sx={{
                          height: 4,
                          borderRadius: 2,
                          ml: 6.5,
                          bgcolor: alpha(theme.palette.primary.main, 0.08),
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 2,
                            bgcolor: i === 0 ? 'warning.main' : 'primary.main',
                          },
                        }}
                      />
                    </Stack>
                  ))}
                  {topUsers.length === 0 && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      textAlign="center"
                      py={2}
                    >
                      Veri bulunamadı
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>

            {/* Yaklaşan Bildirimler */}
            <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}` }}>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                  <ScheduleIcon sx={{ color: 'info.main', fontSize: 20 }} />
                  <Typography variant="h6" fontWeight={600}>
                    Yaklaşan Bildirimler
                  </Typography>
                </Stack>
                <Stack spacing={0}>
                  {mockNotifications.map((notif, i) => (
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
                          {notif.icon}
                        </Avatar>
                        <Box flex={1} minWidth={0}>
                          <Typography variant="body2" fontWeight={500}>
                            {notif.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {notif.description}
                          </Typography>
                        </Box>
                        <Chip
                          label={relativeTimeFuture(notif.time)}
                          size="small"
                          sx={{
                            fontSize: 10,
                            height: 22,
                            bgcolor: alpha(theme.palette.info.main, 0.08),
                            color: 'info.dark',
                          }}
                        />
                      </Stack>
                      {i < mockNotifications.length - 1 && <Divider />}
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      {/* User Detail Dialog */}
      <Dialog
        open={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        maxWidth="sm"
        fullWidth
      >
        {selectedUser && (
          <>
            <DialogTitle>
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
                      {selectedUser.displayName || selectedUser.userEmail.split('@')[0]}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedUser.userEmail}
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
              <Grid container spacing={2} mb={3}>
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
                        ? 'Yuksek'
                        : 'Dusuk',
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
                        borderRadius: 2,
                        bgcolor: alpha(stat.color, 0.06),
                        textAlign: 'center',
                      }}
                    >
                      <Box sx={{ color: stat.color, mb: 0.5 }}>{stat.icon}</Box>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {stat.label}
                      </Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {stat.value}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>

              {/* User Info */}
              <Typography variant="subtitle2" fontWeight={600} mb={1}>
                Kullanıcı Bilgileri
              </Typography>
              <Stack spacing={1} mb={3}>
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
                      py: 0.75,
                      px: 1.5,
                      borderRadius: 1,
                      bgcolor:
                        i % 2 === 0 ? alpha(theme.palette.grey[500], 0.04) : 'transparent',
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      {row.label}
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {row.value}
                    </Typography>
                  </Stack>
                ))}
              </Stack>

              {/* Activity Timeline */}
              <Typography variant="subtitle2" fontWeight={600} mb={1}>
                Aktivite Gecmisi
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
                      <CheckCircleIcon
                        sx={{ fontSize: 18, color: 'success.main', mt: 0.25 }}
                      />
                    ) : (
                      <CancelIcon sx={{ fontSize: 18, color: 'error.main', mt: 0.25 }} />
                    )}
                    <Box flex={1}>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                      >
                        <Typography variant="body2" fontWeight={500}>
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
                          <Typography variant="caption" color="text.disabled">
                            {event.ipAddress}
                          </Typography>
                        )}
                        {event.device && (
                          <Typography variant="caption" color="text.disabled">
                            {event.device}
                          </Typography>
                        )}
                      </Stack>
                      {event.failureReason && (
                        <Typography variant="caption" color="error.main">
                          {event.failureReason}
                        </Typography>
                      )}
                    </Box>
                  </Stack>
                ))}
                {userTimeline.length === 0 && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    textAlign="center"
                    py={3}
                  >
                    Aktivite bulunamadı
                  </Typography>
                )}
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
              <Button
                startIcon={<LogoutIcon />}
                color="warning"
                variant="outlined"
                size="small"
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
                onClick={() => {
                  enqueueSnackbar('Hesap engelleme işlemi başlatıldı', {
                    variant: 'warning',
                  });
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
                onClick={() => {
                  setSelectedUser(null);
                }}
              >
                Profili Gör
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Alert Detail Dialog */}
      <Dialog
        open={alertDialogOpen}
        onClose={() => setAlertDialogOpen(false)}
        maxWidth="xs"
        fullWidth
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
                <Typography variant="h6" fontWeight={600}>
                  {selectedAlert.title}
                </Typography>
              </Stack>
            </DialogTitle>
            <DialogContent dividers>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Aciklama
                  </Typography>
                  <Typography variant="body2">{selectedAlert.description}</Typography>
                </Box>
                <Stack direction="row" spacing={2}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Onem Derecesi
                    </Typography>
                    <Box>
                      <Chip
                        size="small"
                        label={
                          selectedAlert.severity === 'HIGH'
                            ? 'Yuksek'
                            : selectedAlert.severity === 'MEDIUM'
                              ? 'Orta'
                              : 'Dusuk'
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
                    <Typography variant="caption" color="text.secondary">
                      Durum
                    </Typography>
                    <Typography variant="body2">{selectedAlert.status}</Typography>
                  </Box>
                </Stack>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Kod
                  </Typography>
                  <Typography variant="body2" fontFamily="monospace">
                    {selectedAlert.code}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Oluşturulma
                  </Typography>
                  <Typography variant="body2">
                    {format(new Date(selectedAlert.createdAt), 'dd.MM.yyyy HH:mm:ss')}
                  </Typography>
                </Box>
                {selectedAlert.assignee && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Atanan
                    </Typography>
                    <Typography variant="body2">{selectedAlert.assignee}</Typography>
                  </Box>
                )}
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setAlertDialogOpen(false)}>Kapat</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </PageContainer>
  );
}
