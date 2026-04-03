import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Button,
  Avatar,
  Stack,
  Tab,
  Tabs,
  Chip,
  IconButton,
  Divider,
  Paper,
  TextField,
  MenuItem,
  CircularProgress,
  TablePagination,
  FormControlLabel,
  Checkbox,
  Alert,
  Tooltip,
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  History as ActivityIcon,
  ShoppingBag as OrdersIcon,
  EmojiEvents as PointsIcon,
  Notifications as NotifyIcon,
  AdminPanelSettings as AdminIcon,
  Dangerous as DangerIcon,
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  VerifiedUser as VerifiedIcon,
  Mail as MailIcon,
  Block as BlockIcon,
  LockReset as PasswordResetIcon,
  Refresh as RefreshIcon,
  Send as SendIcon,
  Login as LoginIcon,
  FilterAlt as FilterIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import { useUsers } from '../../hooks/useUsers';
import { useSnackbar } from 'notistack';
import {
  UserDTO,
  UserStatusEnum,
  AccountType,
  Language,
  LanguageDisplayNames,
  UserActivitySummary,
  ActivityLogItem,
  AdminNote,
} from '../../types/users/userModel';
import UserLoginStatsPanel from './components/UserLoginStatsPanel';
import UserGamificationRewardsPanel from './components/UserGamificationRewardsPanel';
import {
  AdminBulkNotificationRequest,
  RecipientType,
} from '../../types/notifications/adminBulkNotificationRequest';
import { NotificationPriority, NotificationType } from '../../types/notifications/notificationModel';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

import { PageContainer, PageHeader, PageSection } from '../../components/Page';
import { FormGrid } from '../../components/Form';
import { StatusChip, DataTable, StatCard } from '../../components/Data';
import { LoadingState, ErrorState, ConfirmDialog } from '../../components/Feedback';
import { userService } from '../../services/user/userService';
import { adminNotificationService } from '../../services/notification/adminNotificationService';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index, ...other }: TabPanelProps) {
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

function statusColor(status: string): 'success' | 'error' | 'warning' | 'default' {
  if (status === 'SUCCESS') return 'success';
  if (status === 'FAILURE' || status === 'FAILED') return 'error';
  if (status === 'PENDING') return 'warning';
  return 'default';
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    SUCCESS: 'Başarılı',
    FAILURE: 'Başarısız',
    FAILED: 'Başarısız',
    PENDING: 'Beklemede',
    SUSPICIOUS: 'Şüpheli',
  };
  return map[status] ?? status;
}

function eventLabel(type: string): string {
  const map: Record<string, string> = {
    LOGIN: 'Giriş',
    LOGOUT: 'Çıkış',
    REGISTER: 'Kayıt',
    PASSWORD_RESET: 'Şifre Sıfırlama',
    TOKEN_REFRESH: 'Token Yenileme',
    PROFILE_UPDATE: 'Profil Güncelleme',
    EMAIL_VERIFICATION: 'E-posta Doğrulama',
    TWO_FACTOR_AUTH: '2FA',
  };
  return map[type] ?? type ?? '-';
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export default function UserDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  // ── Core data ──────────────────────────────
  const [user, setUser] = useState<UserDTO | null>(null);
  const [activitySummary, setActivitySummary] = useState<UserActivitySummary | null>(null);
  const [adminNotes, setAdminNotes] = useState<AdminNote[]>([]);

  // ── UI ────────────────────────────────────
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<UserDTO | null>(null);
  const [newNote, setNewNote] = useState('');

  // ── Activity Logs ─────────────────────────
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [logPage, setLogPage] = useState(0);
  const [logSize] = useState(20);
  const [logTotal, setLogTotal] = useState(0);
  const [logLoading, setLogLoading] = useState(false);
  const [logStatus, setLogStatus] = useState('');
  const [logStartDate, setLogStartDate] = useState('');
  const [logEndDate, setLogEndDate] = useState('');

  // ── Gamification — handled by UserGamificationRewardsPanel ───────────

  // ── Notifications ─────────────────────────
  const [notifTitle, setNotifTitle] = useState('');
  const [notifContent, setNotifContent] = useState('');
  const [notifType, setNotifType] = useState<string>(NotificationType.ANNOUNCEMENT);
  const [notifPriority, setNotifPriority] = useState<NotificationPriority>(NotificationPriority.NORMAL);
  const [notifSendPush, setNotifSendPush] = useState(true);
  const [notifSendEmail, setNotifSendEmail] = useState(false);
  const [notifSending, setNotifSending] = useState(false);

  // ── Dangerous Actions Confirm ─────────────
  type DangerType = 'block' | 'unblock' | 'delete' | 'passwordReset';
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmType, setConfirmType] = useState<DangerType | null>(null);
  const [dangerLoading, setDangerLoading] = useState(false);

  // Hook
  const { updateUserAdmin } = useUsers();

  // ─────────────────────────────────────────
  // Initial fetch
  // ─────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [userRes, notesRes] = await Promise.all([
        userService.getUserAdmin(id),
        userService.getAdminNotes(id),
      ]);
      setUser(userRes.data);
      setFormData(userRes.data);
      setActivitySummary(userRes.data.activitySummary ?? null);
      setAdminNotes(Array.isArray(notesRes.data) ? notesRes.data : []);
    } catch {
      enqueueSnackbar('Kullanıcı verileri yüklenirken hata oluştu', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [id, enqueueSnackbar]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Fallback: fetch activity summary if not embedded in user response
  useEffect(() => {
    if (!id || !user || activitySummary) return;
    userService.getActivitySummary(id)
      .then(res => setActivitySummary(res.data))
      .catch(() => setActivitySummary(null));
  }, [id, user, activitySummary]);

  // ─────────────────────────────────────────
  // Activity logs fetch (with filters + pagination)
  // ─────────────────────────────────────────
  const fetchLogs = useCallback(async (page = 0) => {
    if (!id) return;
    try {
      setLogLoading(true);
      const res = await userService.getActivityLogPaged(id, {
        page,
        size: logSize,
        status: logStatus || undefined,
        startDate: logStartDate || undefined,
        endDate: logEndDate || undefined,
      });
      const pagedData = res.data as any; // PageResponseDto<ActivityLogItem>
      setLogs(Array.isArray(pagedData?.content) ? pagedData.content : (Array.isArray(pagedData) ? pagedData : []));
      setLogTotal(pagedData?.totalElements ?? pagedData?.content?.length ?? 0);
      setLogPage(page);
    } catch {
      enqueueSnackbar('Aktivite logları yüklenemedi', { variant: 'error' });
    } finally {
      setLogLoading(false);
    }
  }, [id, logSize, logStatus, logStartDate, logEndDate, enqueueSnackbar]);

  // ─────────────────────────────────────────
  // Tab change handler
  // ─────────────────────────────────────────
  const handleTabChange = (_: React.SyntheticEvent, val: number) => {
    setTabValue(val);
    if (val === 1 && logs.length === 0) fetchLogs(0);
  };

  // ─────────────────────────────────────────
  // Save profile
  // ─────────────────────────────────────────
  const handleSave = async () => {
    if (!id || !formData) return;
    try {
      setSaving(true);
      await updateUserAdmin({ userId: id, userData: formData });
      setUser(formData);
      setEditing(false);
      enqueueSnackbar('Kullanıcı başarıyla güncellendi', { variant: 'success' });
    } catch {
      enqueueSnackbar('Güncelleme başarısız', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // ─────────────────────────────────────────
  // Admin notes
  // ─────────────────────────────────────────
  const handleAddNote = async () => {
    if (!id || !newNote.trim()) return;
    try {
      const res = await userService.addAdminNote(id, newNote);
      setAdminNotes(prev => [res.data, ...prev]);
      setNewNote('');
      enqueueSnackbar('Not eklendi', { variant: 'success' });
    } catch {
      enqueueSnackbar('Not eklenemedi', { variant: 'error' });
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await userService.deleteAdminNote(noteId);
      setAdminNotes(prev => prev.filter(n => n.id !== noteId));
      enqueueSnackbar('Not silindi', { variant: 'success' });
    } catch {
      enqueueSnackbar('Not silinemedi', { variant: 'error' });
    }
  };

  // ─────────────────────────────────────────
  // Send notification
  // ─────────────────────────────────────────
  const handleSendNotification = async () => {
    if (!user?.email || !notifTitle.trim() || !notifContent.trim()) return;
    try {
      setNotifSending(true);
      const request: AdminBulkNotificationRequest = {
        title: notifTitle.trim(),
        content: notifContent.trim(),
        type: notifType,
        priority: notifPriority,
        sendPush: notifSendPush,
        sendEmail: notifSendEmail,
        sendTelegram: false,
        sendWebSocket: false,
        emailList: [user.email],
        recipientType: RecipientType.SPECIFIC_USERS,
      };
      await adminNotificationService.sendBulkNotificationToSpecificEmails(request);
      setNotifTitle('');
      setNotifContent('');
      enqueueSnackbar('Bildirim başarıyla gönderildi', { variant: 'success' });
    } catch {
      enqueueSnackbar('Bildirim gönderilemedi', { variant: 'error' });
    } finally {
      setNotifSending(false);
    }
  };

  // ─────────────────────────────────────────
  // Dangerous actions
  // ─────────────────────────────────────────
  const openConfirm = (type: DangerType) => { setConfirmType(type); setConfirmOpen(true); };

  const handleConfirmDanger = async () => {
    if (!id || !user || !confirmType) return;
    try {
      setDangerLoading(true);
      if (confirmType === 'block') {
        await userService.toggleUserStatus(id, UserStatusEnum.BLOCKED);
        enqueueSnackbar('Kullanıcı engellendi', { variant: 'warning' });
        await fetchData();
      } else if (confirmType === 'unblock') {
        await userService.toggleUserStatus(id, UserStatusEnum.ACTIVE);
        enqueueSnackbar('Kullanıcı engeli kaldırıldı', { variant: 'success' });
        await fetchData();
      } else if (confirmType === 'passwordReset') {
        await userService.sendPasswordReset(id);
        enqueueSnackbar('Şifre sıfırlama bağlantısı gönderildi', { variant: 'success' });
      } else if (confirmType === 'delete') {
        await userService.deleteAccountById(id);
        enqueueSnackbar('Hesap silindi', { variant: 'success' });
        navigate('/users');
      }
    } catch {
      enqueueSnackbar('İşlem başarısız oldu', { variant: 'error' });
    } finally {
      setDangerLoading(false);
      setConfirmOpen(false);
    }
  };

  const confirmMessages: Record<DangerType, { title: string; message: string; confirmText: string; severity: 'error' | 'warning' | 'info' }> = {
    block: {
      title: 'Kullanıcıyı Engelle',
      message: `${user?.email} adlı kullanıcının sisteme girişi engellenecek. Devam etmek istiyor musunuz?`,
      confirmText: 'Engelle',
      severity: 'error',
    },
    unblock: {
      title: 'Engeli Kaldır',
      message: `${user?.email} adlı kullanıcının engeli kaldırılacak ve hesabı aktif edilecek. Devam etmek istiyor musunuz?`,
      confirmText: 'Engeli Kaldır',
      severity: 'warning',
    },
    passwordReset: {
      title: 'Şifre Sıfırlama Bağlantısı Gönder',
      message: `${user?.email} adresine şifre sıfırlama bağlantısı gönderilecek. Devam etmek istiyor musunuz?`,
      confirmText: 'Gönder',
      severity: 'info',
    },
    delete: {
      title: 'Hesabı Kalıcı Olarak Sil',
      message: `Bu işlem geri alınamaz! ${user?.email} adlı kullanıcının tüm verileri kalıcı olarak silinecek. Devam etmek istiyor musunuz?`,
      confirmText: 'Kalıcı Olarak Sil',
      severity: 'error',
    },
  };

  // ─────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────
  if (loading) return <LoadingState message="Kullanıcı verileri getiriliyor..." />;
  if (!user) return <ErrorState title="Kullanıcı Bulunamadı" onRetry={() => navigate('/users')} />;

  const displayName = user.displayName || `${user.firstName} ${user.lastName}`.trim() || user.email;
  const isBlocked = user.userStatus === UserStatusEnum.BLOCKED;

  return (
    <PageContainer>
      {/* ── Header ── */}
      <PageHeader
        title={displayName}
        subtitle={`Kullanıcı Kimliği: ${user.id}`}
        onBack={() => navigate('/users')}
        breadcrumbs={[
          { label: 'Panel', href: '/dashboard' },
          { label: 'Kullanıcılar', href: '/users' },
          { label: displayName },
        ]}
        actions={
          editing ? (
            <Stack direction="row" spacing={1}>
              <Button startIcon={<CancelIcon />} onClick={() => { setEditing(false); setFormData(user); }}>
                İptal
              </Button>
              <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={saving}>
                {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
              </Button>
            </Stack>
          ) : (
            <Button variant="contained" startIcon={<EditIcon />} onClick={() => setEditing(true)}>
              Kullanıcıyı Düzenle
            </Button>
          )
        }
      />

      {/* ── Hero Card ── */}
      <Paper sx={{ p: 4, mb: 4, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
        <Grid container spacing={4} alignItems="center">
          <Grid item>
            <Box sx={{ position: 'relative' }}>
              <Avatar
                src={user.imageUrl}
                sx={{ width: 120, height: 120, borderRadius: 3, border: '4px solid', borderColor: 'divider' }}
              >
                {user.firstName?.[0] ?? '?'}
              </Avatar>
              <Tooltip title="Fotoğraf yükle">
                <IconButton
                  size="small"
                  sx={{ position: 'absolute', bottom: -10, right: -10, bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }}
                >
                  <UploadIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>
          <Grid item xs>
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Typography variant="h4" fontWeight={800}>{displayName}</Typography>
                <StatusChip status={user.userStatus} />
                <StatusChip
                  status={user.accountType}
                  color={user.accountType === AccountType.BUSINESS ? 'secondary' : 'info'}
                  label={user.accountType === AccountType.BUSINESS ? 'İşletme' : 'Bireysel'}
                />
              </Stack>
              <Typography variant="body1" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <MailIcon fontSize="small" />
                {user.email}
                {user.role.includes('ADMIN') && <VerifiedIcon sx={{ color: 'primary.main', fontSize: 18 }} />}
              </Typography>
              <Stack direction="row" spacing={3} sx={{ mt: 2 }} flexWrap="wrap">
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">Kayıt Tarihi</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {user.createdAt ? format(new Date(user.createdAt), 'dd MMMM yyyy', { locale: tr }) : '-'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">Son Giriş</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {activitySummary?.lastLoginAt
                      ? format(new Date(activitySummary.lastLoginAt), 'dd MMM yyyy HH:mm', { locale: tr })
                      : 'Hiç giriş yapmadı'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">Profil Tamamlama</Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ width: 100, height: 6, bgcolor: 'grey.100', borderRadius: 3, overflow: 'hidden' }}>
                      <Box sx={{ width: `${activitySummary?.profileCompletionPercent ?? 0}%`, height: '100%', bgcolor: 'success.main' }} />
                    </Box>
                    <Typography variant="caption" fontWeight={700}>{activitySummary?.profileCompletionPercent ?? 0}%</Typography>
                  </Stack>
                </Box>
              </Stack>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* ── Quick Stats ── */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Toplam Sipariş" value={activitySummary?.totalOrders ?? 0} icon={<OrdersIcon color="primary" />} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Toplam Harcama" value={`₺${activitySummary?.totalSpent?.toLocaleString() ?? '0'}`} icon={<PointsIcon color="secondary" />} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Platform Puanı" value={activitySummary?.gamificationPoints ?? 0} icon={<PointsIcon color="warning" />} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Toplam Giriş" value={activitySummary?.totalLogins ?? 0} icon={<LoginIcon color="info" />} />
        </Grid>
      </Grid>

      {/* ── Tabs ── */}
      <Paper sx={{ borderRadius: 4, mb: 4, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
        <Box sx={{ px: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'grey.50' }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ minHeight: 64 }}
          >
            <Tab icon={<EditIcon fontSize="small" />} iconPosition="start" label="Profil & Bilgiler" sx={{ minHeight: 64, fontWeight: 700 }} />
            <Tab icon={<ActivityIcon fontSize="small" />} iconPosition="start" label="Aktivite & Loglar" sx={{ minHeight: 64, fontWeight: 700 }} />
            <Tab icon={<OrdersIcon fontSize="small" />} iconPosition="start" label="Siparişler" sx={{ minHeight: 64, fontWeight: 700 }} />
            <Tab icon={<PointsIcon fontSize="small" />} iconPosition="start" label="Ödüller & Puanlar" sx={{ minHeight: 64, fontWeight: 700 }} />
            <Tab icon={<NotifyIcon fontSize="small" />} iconPosition="start" label="Bildirim Gönder" sx={{ minHeight: 64, fontWeight: 700 }} />
            <Tab icon={<AdminIcon fontSize="small" />} iconPosition="start" label="Yönetici Notları" sx={{ minHeight: 64, fontWeight: 700 }} />
            <Tab icon={<DangerIcon fontSize="small" />} iconPosition="start" label="Tehlikeli İşlemler" sx={{ minHeight: 64, fontWeight: 700 }} />
          </Tabs>
        </Box>

        <Box>
          {/* ─── Tab 0: Profile & Info ─── */}
          <TabPanel value={tabValue} index={0}>
            <Box sx={{ px: 3 }}>
              <PageSection title="Kişisel Bilgiler">
                <FormGrid>
                  <TextField label="Ad" fullWidth value={formData?.firstName ?? ''} onChange={e => setFormData(p => p ? { ...p, firstName: e.target.value } : null)} disabled={!editing} />
                  <TextField label="Soyad" fullWidth value={formData?.lastName ?? ''} onChange={e => setFormData(p => p ? { ...p, lastName: e.target.value } : null)} disabled={!editing} />
                  <TextField label="E-posta" fullWidth value={formData?.email ?? ''} disabled />
                  <TextField label="Telefon" fullWidth value={formData?.gsmNo ?? ''} onChange={e => setFormData(p => p ? { ...p, gsmNo: e.target.value } : null)} disabled={!editing} />
                  <TextField
                    label="Doğum Tarihi"
                    fullWidth
                    type="date"
                    value={formData?.birthDate ? formData.birthDate.substring(0, 10) : ''}
                    onChange={e => setFormData(p => p ? { ...p, birthDate: e.target.value } : null)}
                    disabled={!editing}
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    label="Dil"
                    select
                    fullWidth
                    value={formData?.language ?? Language.TR}
                    onChange={e => setFormData(p => p ? { ...p, language: e.target.value as Language } : null)}
                    disabled={!editing}
                  >
                    {Object.entries(LanguageDisplayNames).map(([val, label]) => (
                      <MenuItem key={val} value={val}>{label}</MenuItem>
                    ))}
                  </TextField>
                </FormGrid>
              </PageSection>
              <Divider sx={{ my: 4 }} />
              <PageSection title="Konum Bilgileri">
                <FormGrid>
                  <TextField label="Şehir" fullWidth value={formData?.currentCity ?? ''} onChange={e => setFormData(p => p ? { ...p, currentCity: e.target.value } : null)} disabled={!editing} />
                  <TextField label="İlçe" fullWidth value={formData?.currentDistrict ?? ''} onChange={e => setFormData(p => p ? { ...p, currentDistrict: e.target.value } : null)} disabled={!editing} />
                  <TextField label="Memleket" fullWidth value={formData?.hometownCity ?? ''} onChange={e => setFormData(p => p ? { ...p, hometownCity: e.target.value } : null)} disabled={!editing} />
                </FormGrid>
              </PageSection>
            </Box>
          </TabPanel>

          {/* ─── Tab 1: Activity Logs ─── */}
          <TabPanel value={tabValue} index={1}>
            <Box sx={{ px: 3 }}>
              {/* Login statistics panel (charts, breakdowns, trend) */}
              <UserLoginStatsPanel userId={id!} />

              {/* Filters */}
              <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                  <FilterIcon color="action" fontSize="small" />
                  <TextField
                    label="Başlangıç Tarihi"
                    type="date"
                    size="small"
                    value={logStartDate}
                    onChange={e => setLogStartDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{ minWidth: 160 }}
                  />
                  <TextField
                    label="Bitiş Tarihi"
                    type="date"
                    size="small"
                    value={logEndDate}
                    onChange={e => setLogEndDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{ minWidth: 160 }}
                  />
                  <TextField
                    label="Durum"
                    select
                    size="small"
                    value={logStatus}
                    onChange={e => setLogStatus(e.target.value)}
                    sx={{ minWidth: 150 }}
                  >
                    <MenuItem value="">Tümü</MenuItem>
                    <MenuItem value="SUCCESS">Başarılı</MenuItem>
                    <MenuItem value="FAILURE">Başarısız</MenuItem>
                    <MenuItem value="PENDING">Beklemede</MenuItem>
                  </TextField>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<RefreshIcon />}
                    onClick={() => { setLogPage(0); fetchLogs(0); }}
                  >
                    Filtrele
                  </Button>
                  {(logStatus || logStartDate || logEndDate) && (
                    <Button
                      size="small"
                      onClick={() => { setLogStatus(''); setLogStartDate(''); setLogEndDate(''); }}
                    >
                      Temizle
                    </Button>
                  )}
                </Stack>
              </Paper>

              {/* Table */}
              {logLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                  <CircularProgress />
                </Box>
              ) : logs.length === 0 ? (
                <Box sx={{ py: 6, textAlign: 'center' }}>
                  <ActivityIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
                  <Typography color="text.secondary">
                    {logStatus || logStartDate || logEndDate
                      ? 'Seçili filtrelere uygun kayıt bulunamadı.'
                      : 'Henüz aktivite kaydı yok. Listelemek için "Filtrele" butonuna basın.'}
                  </Typography>
                </Box>
              ) : (
                <>
                  <DataTable
                    columns={[
                      {
                        id: 'createdAt',
                        label: 'Tarih',
                        render: (l: ActivityLogItem) => (
                          <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                            {format(new Date(l.createdAt), 'dd MMM yyyy HH:mm:ss', { locale: tr })}
                          </Typography>
                        ),
                      },
                      {
                        id: 'status',
                        label: 'Durum',
                        render: (l: ActivityLogItem) => (
                          <Chip
                            size="small"
                            label={statusLabel(l.status)}
                            color={statusColor(l.status)}
                            variant="outlined"
                            sx={{ fontWeight: 700, minWidth: 90 }}
                          />
                        ),
                      },
                      {
                        id: 'eventType',
                        label: 'Olay Tipi',
                        render: (l: ActivityLogItem) => (
                          <Typography variant="body2">{eventLabel(l.eventType ?? '')}</Typography>
                        ),
                      },
                      {
                        id: 'failureReason',
                        label: 'Hata Nedeni',
                        render: (l: ActivityLogItem) =>
                          l.failureReason ? (
                            <Tooltip title={l.failureReason}>
                              <Typography variant="caption" color="error.main" noWrap sx={{ maxWidth: 180, display: 'block' }}>
                                {l.failureReason}
                              </Typography>
                            </Tooltip>
                          ) : (
                            <Typography variant="caption" color="text.disabled">-</Typography>
                          ),
                      },
                      {
                        id: 'ipAddress',
                        label: 'IP Adresi',
                        render: (l: ActivityLogItem) => (
                          <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                            {l.ipAddress ?? '-'}
                          </Typography>
                        ),
                      },
                      {
                        id: 'device',
                        label: 'Cihaz',
                        render: (l: ActivityLogItem) => (
                          <Typography variant="caption" noWrap sx={{ maxWidth: 160, display: 'block' }}>
                            {l.device ?? '-'}
                          </Typography>
                        ),
                      },
                      {
                        id: 'location',
                        label: 'Konum',
                        render: (l: ActivityLogItem) => {
                          const loc = l.location ?? (l.city ? `${l.city}${l.country ? `, ${l.country}` : ''}` : null);
                          return <Typography variant="caption" color={loc ? 'text.primary' : 'text.disabled'}>{loc ?? 'Bilinmiyor'}</Typography>;
                        },
                      },
                      {
                        id: 'source',
                        label: 'Kaynak',
                        render: (l: ActivityLogItem) => (
                          <Chip size="small" label={l.source ?? 'UNKNOWN'} variant="filled" sx={{ fontSize: 10 }} />
                        ),
                      },
                    ]}
                    data={logs}
                  />
                  <TablePagination
                    component="div"
                    count={logTotal}
                    page={logPage}
                    rowsPerPage={logSize}
                    rowsPerPageOptions={[logSize]}
                    onPageChange={(_, p) => fetchLogs(p)}
                    labelDisplayedRows={({ from, to, count }) => `${from}–${to} / ${count}`}
                  />
                </>
              )}
            </Box>
          </TabPanel>

          {/* ─── Tab 2: Orders (placeholder) ─── */}
          <TabPanel value={tabValue} index={2}>
            <Box sx={{ px: 3, py: 5, textAlign: 'center' }}>
              <OrdersIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">Henüz sipariş kaydı bulunmuyor</Typography>
              <Typography variant="body2" color="text.disabled">E-ticaret entegrasyonu tamamlandığında burada listelenecektir.</Typography>
            </Box>
          </TabPanel>

          {/* ─── Tab 3: Gamification ─── */}
          <TabPanel value={tabValue} index={3}>
            <Box sx={{ px: 3 }}>
              {/* Summary chips */}
              <Stack direction="row" spacing={2} sx={{ mb: 3 }} flexWrap="wrap">
                <Paper variant="outlined" sx={{ px: 2, py: 1.5, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <StarIcon color="warning" fontSize="small" />
                  <Box>
                    <Typography variant="h6" fontWeight={800} lineHeight={1}>{activitySummary?.gamificationPoints ?? 0}</Typography>
                    <Typography variant="caption" color="text.secondary">Toplam Puan</Typography>
                  </Box>
                </Paper>
                <Paper variant="outlined" sx={{ px: 2, py: 1.5, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <VerifiedIcon color="success" fontSize="small" />
                  <Box>
                    <Typography variant="h6" fontWeight={800} lineHeight={1}>{activitySummary?.badges ?? 0}</Typography>
                    <Typography variant="caption" color="text.secondary">Kazanılan Rozet</Typography>
                  </Box>
                </Paper>
              </Stack>

              <UserGamificationRewardsPanel userId={id!} />
            </Box>
          </TabPanel>

          {/* ─── Tab 4: Send Notification ─── */}
          <TabPanel value={tabValue} index={4}>
            <Box sx={{ px: 3 }}>
              <PageSection title="Kullanıcıya Bildirim Gönder">
                <Alert severity="info" sx={{ mb: 3 }}>
                  Bu bildirim yalnızca <strong>{user.email}</strong> adresine gönderilecektir.
                </Alert>
                <Stack spacing={3} sx={{ maxWidth: 640 }}>
                  <TextField
                    label="Bildirim Başlığı"
                    fullWidth
                    required
                    value={notifTitle}
                    onChange={e => setNotifTitle(e.target.value)}
                    placeholder="Örn: Hesabınız hakkında bilgilendirme"
                  />
                  <TextField
                    label="Mesaj İçeriği"
                    fullWidth
                    required
                    multiline
                    rows={4}
                    value={notifContent}
                    onChange={e => setNotifContent(e.target.value)}
                    placeholder="Bildirim içeriğini girin..."
                  />
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      label="Bildirim Tipi"
                      select
                      fullWidth
                      value={notifType}
                      onChange={e => setNotifType(e.target.value)}
                    >
                      <MenuItem value={NotificationType.ANNOUNCEMENT}>Duyuru</MenuItem>
                      <MenuItem value={NotificationType.ALERT}>Uyarı</MenuItem>
                      <MenuItem value={NotificationType.SYSTEM}>Sistem</MenuItem>
                      <MenuItem value={NotificationType.PROMOTION}>Promosyon</MenuItem>
                    </TextField>
                    <TextField
                      label="Öncelik"
                      select
                      fullWidth
                      value={notifPriority}
                      onChange={e => setNotifPriority(e.target.value as NotificationPriority)}
                    >
                      <MenuItem value={NotificationPriority.LOW}>Düşük</MenuItem>
                      <MenuItem value={NotificationPriority.NORMAL}>Normal</MenuItem>
                      <MenuItem value={NotificationPriority.HIGH}>Yüksek</MenuItem>
                      <MenuItem value={NotificationPriority.URGENT}>Acil</MenuItem>
                    </TextField>
                  </Stack>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                    <Typography variant="subtitle2" fontWeight={700} gutterBottom>Gönderim Kanalları</Typography>
                    <Stack direction="row" spacing={2}>
                      <FormControlLabel
                        control={<Checkbox checked={notifSendPush} onChange={e => setNotifSendPush(e.target.checked)} />}
                        label="Push Bildirimi"
                      />
                      <FormControlLabel
                        control={<Checkbox checked={notifSendEmail} onChange={e => setNotifSendEmail(e.target.checked)} />}
                        label="E-posta"
                      />
                    </Stack>
                  </Paper>
                  <Box>
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={notifSending ? <CircularProgress size={18} color="inherit" /> : <SendIcon />}
                      onClick={handleSendNotification}
                      disabled={notifSending || !notifTitle.trim() || !notifContent.trim() || (!notifSendPush && !notifSendEmail)}
                    >
                      {notifSending ? 'Gönderiliyor...' : 'Bildirimi Gönder'}
                    </Button>
                  </Box>
                </Stack>
              </PageSection>
            </Box>
          </TabPanel>

          {/* ─── Tab 5: Admin Notes ─── */}
          <TabPanel value={tabValue} index={5}>
            <Box sx={{ px: 3 }}>
              <PageSection title="Yönetici Notları">
                <Stack spacing={3}>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                      placeholder="Kullanıcı hakkında bir not ekleyin..."
                      fullWidth
                      multiline
                      rows={2}
                      value={newNote}
                      onChange={e => setNewNote(e.target.value)}
                    />
                    <Button variant="contained" onClick={handleAddNote} disabled={!newNote.trim()} sx={{ alignSelf: 'flex-end', px: 3 }}>
                      Kaydet
                    </Button>
                  </Box>
                  <Stack spacing={2}>
                    {adminNotes.length === 0 ? (
                      <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic' }}>Henüz not eklenmemiş.</Typography>
                    ) : (
                      adminNotes.map(note => (
                        <Paper key={note.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                          <Typography variant="body2" sx={{ mb: 1, whiteSpace: 'pre-wrap' }}>{note.content}</Typography>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="caption" color="text.secondary">
                              <strong>{note.createdBy}</strong> · {format(new Date(note.createdAt), 'dd MMMM yyyy HH:mm', { locale: tr })}
                            </Typography>
                            <IconButton size="small" color="error" onClick={() => handleDeleteNote(note.id)}>
                              <DeleteIcon fontSize="inherit" />
                            </IconButton>
                          </Stack>
                        </Paper>
                      ))
                    )}
                  </Stack>
                </Stack>
              </PageSection>
            </Box>
          </TabPanel>

          {/* ─── Tab 6: Dangerous Actions ─── */}
          <TabPanel value={tabValue} index={6}>
            <Box sx={{ px: 3 }}>
              <Alert severity="warning" sx={{ mb: 3 }}>
                Bu sayfadaki işlemler geri alınamaz veya kullanıcı deneyimini doğrudan etkiler. Dikkatli olun.
              </Alert>
              <PageSection title="Kritik İşlemler">
                <Grid container spacing={3}>
                  {/* Password Reset */}
                  <Grid item xs={12} md={4}>
                    <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <PasswordResetIcon color="warning" />
                        <Typography variant="subtitle1" fontWeight={700}>Şifre Sıfırlama</Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                        Kullanıcıya kayıtlı e-posta adresine şifre sıfırlama bağlantısı gönderir.
                      </Typography>
                      <Button variant="outlined" color="warning" fullWidth onClick={() => openConfirm('passwordReset')}>
                        Sıfırlama Bağlantısı Gönder
                      </Button>
                    </Paper>
                  </Grid>

                  {/* Block / Unblock */}
                  <Grid item xs={12} md={4}>
                    <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, borderColor: 'error.light', height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <BlockIcon color="error" />
                        <Typography variant="subtitle1" fontWeight={700}>
                          {isBlocked ? 'Kullanıcı Engeli Kaldır' : 'Kullanıcıyı Engelle'}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                        {isBlocked
                          ? 'Engelli kullanıcının hesabını yeniden aktif eder.'
                          : 'Kullanıcının sisteme girişini engeller. Mevcut oturumlar sonlandırılır.'}
                      </Typography>
                      {isBlocked ? (
                        <Button variant="outlined" color="success" fullWidth onClick={() => openConfirm('unblock')}>
                          Engeli Kaldır
                        </Button>
                      ) : (
                        <Button variant="outlined" color="error" fullWidth onClick={() => openConfirm('block')}>
                          Engelle
                        </Button>
                      )}
                    </Paper>
                  </Grid>

                  {/* Delete */}
                  <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3, borderRadius: 2, bgcolor: 'error.main', color: 'white', height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <DeleteIcon />
                        <Typography variant="subtitle1" fontWeight={700}>Hesabı Kalıcı Sil</Typography>
                      </Box>
                      <Typography variant="body2" sx={{ opacity: 0.85, flexGrow: 1 }}>
                        Kullanıcıya ait tüm veriler, siparişler ve aktivite kayıtları kalıcı olarak silinir. Bu işlem geri alınamaz.
                      </Typography>
                      <Button
                        variant="contained"
                        sx={{ bgcolor: 'white', color: 'error.main', '&:hover': { bgcolor: 'grey.100' } }}
                        fullWidth
                        onClick={() => openConfirm('delete')}
                      >
                        Kalıcı Olarak Sil
                      </Button>
                    </Paper>
                  </Grid>
                </Grid>
              </PageSection>
            </Box>
          </TabPanel>
        </Box>
      </Paper>

      {/* ── Confirm Dialog ── */}
      {confirmType && (
        <ConfirmDialog
          open={confirmOpen}
          title={confirmMessages[confirmType].title}
          message={confirmMessages[confirmType].message}
          confirmText={confirmMessages[confirmType].confirmText}
          severity={confirmMessages[confirmType].severity}
          loading={dangerLoading}
          onConfirm={handleConfirmDanger}
          onClose={() => setConfirmOpen(false)}
        />
      )}
    </PageContainer>
  );
}
