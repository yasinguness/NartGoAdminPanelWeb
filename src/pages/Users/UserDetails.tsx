import { useState, useEffect, useCallback, useMemo } from 'react';
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
  ListItemIcon,
  ListItemText,
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
  ArrowBack as BackIcon,
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  VerifiedUser as VerifiedIcon,
  Mail as MailIcon,
  Phone as PhoneIcon,
  Cake as BirthIcon,
  LocationOn as LocationIcon,
  Language as LanguageIcon,
  Work as JobIcon,
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
    AdminNote
} from '../../types/users/userModel';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

// Standard Components
import { PageContainer, PageHeader, PageSection } from '../../components/Page';
import { FormGrid } from '../../components/Form';
import { StatusChip, DataTable, StatCard } from '../../components/Data';
import { LoadingState, ErrorState, ConfirmDialog } from '../../components/Feedback';
import { ActionMenu } from '../../components/Actions';
import { userService } from '../../services/user/userService';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function UserDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  
  // Data State
  const [user, setUser] = useState<UserDTO | null>(null);
  const [activitySummary, setActivitySummary] = useState<UserActivitySummary | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>([]);
  const [adminNotes, setAdminNotes] = useState<AdminNote[]>([]);
  
  // UI State
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<UserDTO | null>(null);
  const [newNote, setNewNote] = useState('');

  // Hook-based mutations
  const { updateUserAdmin } = useUsers();

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [userRes, summaryRes, notesRes] = await Promise.all([
        userService.getUserAdmin(id),
        userService.getActivitySummary(id),
        userService.getAdminNotes(id)
      ]);
      
      setUser(userRes.data);
      setFormData(userRes.data);
      setActivitySummary(summaryRes.data);
      setAdminNotes(notesRes.data);
    } catch (error) {
      enqueueSnackbar('Kullanıcı verileri yüklenirken hata oluştu', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [id, enqueueSnackbar]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Tab change triggers fetch for heavy data
  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    if (newValue === 1 && activityLogs.length === 0) fetchLogs();
  };

  const fetchLogs = async () => {
    if (!id) return;
    try {
      const res = await userService.getActivityLog(id);
      setActivityLogs(res.data);
    } catch (err) {
      // silently handled
    }
  };

  const handleSave = async () => {
    if (!id || !formData) return;
    try {
      setSaving(true);
      await updateUserAdmin({ userId: id, userData: formData });
      setUser(formData);
      setEditing(false);
      enqueueSnackbar('Kullanıcı başarıyla güncellendi', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('Güncelleme başarısız', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddNote = async () => {
    if (!id || !newNote.trim()) return;
    try {
      const res = await userService.addAdminNote(id, newNote);
      setAdminNotes(prev => [res.data, ...prev]);
      setNewNote('');
      enqueueSnackbar('Not eklendi', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar('Not eklenemedi', { variant: 'error' });
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await userService.deleteAdminNote(noteId);
      setAdminNotes(prev => prev.filter(n => n.id !== noteId));
      enqueueSnackbar('Not silindi', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar('Not silinemedi', { variant: 'error' });
    }
  };

  if (loading) return <LoadingState message="Kullanıcı verileri getiriliyor..." />;
  if (!user) return <ErrorState title="Kullanıcı Bulunamadı" onRetry={() => navigate('/users')} />;

  const displayName = user.displayName || `${user.firstName} ${user.lastName}`.trim() || user.email;

  return (
    <PageContainer>
      <PageHeader
        title={displayName}
        subtitle={`Kullanıcı Kimliği: ${user.id}`}
        onBack={() => navigate('/users')}
        breadcrumbs={[
          { label: 'Panel', href: '/dashboard' },
          { label: 'Kullanıcılar', href: '/users' },
          { label: displayName }
        ]}
        actions={
          editing ? (
            <Stack direction="row" spacing={1}>
              <Button startIcon={<CancelIcon />} onClick={() => { setEditing(false); setFormData(user); }}>İptal</Button>
              <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={saving}>
                {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
              </Button>
            </Stack>
          ) : (
            <Button variant="contained" startIcon={<EditIcon />} onClick={() => setEditing(true)}>Kullanıcıyı Düzenle</Button>
          )
        }
      />

      {/* Hero Section */}
      <Paper sx={{ p: 4, mb: 4, borderRadius: 4, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Grid container spacing={4} alignItems="center">
          <Grid item>
            <Box sx={{ position: 'relative' }}>
              <Avatar
                src={user.imageUrl}
                sx={{ width: 120, height: 120, borderRadius: 3, border: '4px solid', borderColor: 'divider' }}
              >
                {user.firstName ? user.firstName[0] : '?'}
              </Avatar>
              <IconButton 
                size="small" 
                sx={{ position: 'absolute', bottom: -10, right: -10, bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }}
              >
                <UploadIcon fontSize="small" />
              </IconButton>
            </Box>
          </Grid>
          <Grid item xs>
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="h4" fontWeight={800}>{displayName}</Typography>
                <StatusChip status={user.userStatus} />
                <StatusChip 
                    status={user.accountType} 
                    color={user.accountType === AccountType.BUSINESS ? 'secondary' : 'info'} 
                    label={user.accountType === AccountType.BUSINESS ? 'İşletme' : 'Bireysel'}
                />
              </Stack>
              <Typography variant="body1" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <MailIcon fontSize="small" /> {user.email}
                {user.role.includes('ADMIN') && <VerifiedIcon sx={{ color: 'primary.main', fontSize: 18 }} />}
              </Typography>
              <Stack direction="row" spacing={3} sx={{ mt: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Kayıt Tarihi</Typography>
                  <Typography variant="body2" fontWeight={600}>{user.createdAt ? format(new Date(user.createdAt), 'dd MMMM yyyy', { locale: tr }) : '-'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Son Giriş</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {activitySummary?.lastLoginAt ? format(new Date(activitySummary.lastLoginAt), 'dd MMM yyyy HH:mm', { locale: tr }) : 'Hiç giriş yapmadı'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Profil Tamamlama</Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ width: 100, height: 6, bgcolor: 'grey.100', borderRadius: 3, overflow: 'hidden' }}>
                        <Box sx={{ width: `${activitySummary?.profileCompletionPercent || 0}%`, height: '100%', bgcolor: 'success.main' }} />
                    </Box>
                    <Typography variant="caption" fontWeight={700}>{activitySummary?.profileCompletionPercent || 0}%</Typography>
                  </Stack>
                </Box>
              </Stack>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* Stats Quick View */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Toplam Sipariş" value={activitySummary?.totalOrders || 0} icon={<OrdersIcon color="primary" />} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Toplam Harcama" value={`₺${activitySummary?.totalSpent?.toLocaleString() || '0'}`} icon={<PointsIcon color="secondary" />} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Platform Puanı" value={activitySummary?.gamificationPoints || 0} icon={<PointsIcon color="warning" />} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Toplam Badge" value={activitySummary?.badges || 0} icon={<VerifiedIcon color="success" />} />
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ borderRadius: 4, mb: 4, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
        <Box sx={{ px: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'grey.50' }}>
          <Tabs value={tabValue} onChange={handleTabChange} sx={{ minHeight: 64 }}>
            <Tab icon={<EditIcon fontSize="small" />} iconPosition="start" label="Profil & Bilgiler" sx={{ minHeight: 64, fontWeight: 700 }} />
            <Tab icon={<ActivityIcon fontSize="small" />} iconPosition="start" label="Aktivite & Loglar" sx={{ minHeight: 64, fontWeight: 700 }} />
            <Tab icon={<OrdersIcon fontSize="small" />} iconPosition="start" label="Siparişler" sx={{ minHeight: 64, fontWeight: 700 }} />
            <Tab icon={<PointsIcon fontSize="small" />} iconPosition="start" label="Ödüller & Puanlar" sx={{ minHeight: 64, fontWeight: 700 }} />
            <Tab icon={<NotifyIcon fontSize="small" />} iconPosition="start" label="Bildirimler" sx={{ minHeight: 64, fontWeight: 700 }} />
            <Tab icon={<AdminIcon fontSize="small" />} iconPosition="start" label="Yönetici Notları" sx={{ minHeight: 64, fontWeight: 700 }} />
            <Tab icon={<DangerIcon fontSize="small" />} iconPosition="start" label="Tehlikeli İşlemler" sx={{ minHeight: 64, fontWeight: 700 }} />
          </Tabs>
        </Box>

        <Box sx={{ p: 0 }}>
          {/* Tab 1: General Info */}
          <TabPanel value={tabValue} index={0}>
            <Box sx={{ px: 3 }}>
                <PageSection title="Kişisel Bilgiler">
                    <FormGrid>
                        <TextField 
                            label="Ad" 
                            fullWidth 
                            value={formData?.firstName || ''} 
                            onChange={(e) => setFormData(prev => prev ? {...prev, firstName: e.target.value} : null)}
                            disabled={!editing}
                        />
                        <TextField 
                            label="Soyad" 
                            fullWidth 
                            value={formData?.lastName || ''} 
                            onChange={(e) => setFormData(prev => prev ? {...prev, lastName: e.target.value} : null)}
                            disabled={!editing}
                        />
                        <TextField 
                            label="E-posta" 
                            fullWidth 
                            value={formData?.email || ''} 
                            disabled // Email usually can't be changed here
                        />
                        <TextField 
                            label="Telefon" 
                            fullWidth 
                            value={formData?.gsmNo || ''} 
                            onChange={(e) => setFormData(prev => prev ? {...prev, gsmNo: e.target.value} : null)}
                            disabled={!editing}
                        />
                        <TextField 
                            label="Doğum Tarihi" 
                            fullWidth 
                            type="date"
                            value={formData?.birthDate ? formData.birthDate.substring(0, 10) : ''} 
                            onChange={(e) => setFormData(prev => prev ? {...prev, birthDate: e.target.value} : null)}
                            disabled={!editing}
                            InputLabelProps={{ shrink: true }}
                        />
                        <TextField
                            label="Dil"
                            select
                            fullWidth
                            value={formData?.language || Language.TR}
                            onChange={(e) => setFormData(prev => prev ? {...prev, language: e.target.value as Language} : null)}
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
                        <TextField 
                            label="Şehir" 
                            fullWidth 
                            value={formData?.currentCity || ''} 
                            onChange={(e) => setFormData(prev => prev ? {...prev, currentCity: e.target.value} : null)}
                            disabled={!editing}
                        />
                        <TextField 
                            label="İlçe" 
                            fullWidth 
                            value={formData?.currentDistrict || ''} 
                            onChange={(e) => setFormData(prev => prev ? {...prev, currentDistrict: e.target.value} : null)}
                            disabled={!editing}
                        />
                        <TextField 
                            label="Memleket" 
                            fullWidth 
                            value={formData?.hometownCity || ''} 
                            onChange={(e) => setFormData(prev => prev ? {...prev, hometownCity: e.target.value} : null)}
                            disabled={!editing}
                        />
                    </FormGrid>
                </PageSection>
            </Box>
          </TabPanel>

          {/* Tab 2: Activity Logs */}
          <TabPanel value={tabValue} index={1}>
            <Box sx={{ px: 3 }}>
                <DataTable
                    columns={[
                        { id: 'date', label: 'Tarih', render: (l: ActivityLogItem) => format(new Date(l.createdAt), 'dd MMM HH:mm', { locale: tr }) },
                        { id: 'status', label: 'Durum', render: (l: ActivityLogItem) => (
                            <Chip 
                                size="small" 
                                label={l.status} 
                                color={l.status === 'SUCCESS' ? 'success' : 'error'} 
                                variant="outlined" 
                                sx={{ fontWeight: 700 }}
                            />
                        ) },
                        { id: 'ip', label: 'IP Adresi', render: (l: ActivityLogItem) => l.ipAddress || '-' },
                        { id: 'device', label: 'Cihaz', render: (l: ActivityLogItem) => l.device || '-' },
                        { id: 'location', label: 'Konum', render: (l: ActivityLogItem) => l.city ? `${l.city}, ${l.country}` : 'Bilinmiyor' }
                    ]}
                    data={activityLogs}
                />
            </Box>
          </TabPanel>

          {/* Tab 3: Orders Placeholder */}
          <TabPanel value={tabValue} index={2}>
            <Box sx={{ px: 3, py: 5, textAlign: 'center' }}>
                <OrdersIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">Henüz sipariş kaydı bulunmuyor</Typography>
                <Typography variant="body2" color="text.disabled">E-ticaret entegrasyonu tamamlandığında burada listelenecektir.</Typography>
            </Box>
          </TabPanel>

          {/* Tab 4: Gamification Placeholder */}
          <TabPanel value={tabValue} index={3}>
             <Box sx={{ px: 3, py: 5, textAlign: 'center' }}>
                <PointsIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">Gamification Detayları</Typography>
                <Typography variant="body2" color="text.disabled">Mevcut kazanılan ödüller ve puan geçmişi yakında burada..</Typography>
            </Box>
          </TabPanel>

          {/* Tab 5: Notifications Placeholder */}
          <TabPanel value={tabValue} index={4}>
            <Box sx={{ px: 3 }}>
                <PageSection title="Özel Bildirim Gönder">
                    <Stack spacing={2} sx={{ maxWidth: 600 }}>
                        <TextField label="Bildirim Başlığı" fullWidth />
                        <TextField label="Mesaj İçeriği" fullWidth multiline rows={4} />
                        <Button variant="contained" sx={{ alignSelf: 'flex-start' }}>Bildirimi Gönder</Button>
                    </Stack>
                </PageSection>
            </Box>
          </TabPanel>

          {/* Tab 6: Admin Notes */}
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
                                onChange={(e) => setNewNote(e.target.value)}
                            />
                            <Button variant="contained" onClick={handleAddNote} disabled={!newNote.trim()}>Kaydet</Button>
                        </Box>
                        
                        <Stack spacing={2}>
                            {adminNotes.length === 0 ? (
                                <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic' }}>Henüz not eklenmemiş.</Typography>
                            ) : (
                                adminNotes.map(note => (
                                    <Paper key={note.id} variant="outlined" sx={{ p: 2, borderRadius: 2, position: 'relative' }}>
                                        <Typography variant="body2" sx={{ mb: 1, whiteSpace: 'pre-wrap' }}>{note.content}</Typography>
                                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
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

          {/* Tab 7: Dangerous Actions */}
          <TabPanel value={tabValue} index={6}>
            <Box sx={{ px: 3 }}>
                <PageSection title="Kritik İşlemler">
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={4}>
                            <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, borderColor: 'error.light' }}>
                                <Typography variant="subtitle1" fontWeight={700} gutterBottom>Şifre Sıfırlama</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Kullanıcıya şifre sıfırlama bağlantısı gönderir.</Typography>
                                <Button variant="outlined" color="error" fullWidth>Link Gönder</Button>
                            </Paper>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, borderColor: 'error.light' }}>
                                <Typography variant="subtitle1" fontWeight={700} gutterBottom>Kullanıcıyı Engelle</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Kullanıcının sisteme girişini engeller.</Typography>
                                <Button 
                                    variant="outlined" 
                                    color="error" 
                                    fullWidth
                                    onClick={() => userService.toggleUserStatus(user.id, UserStatusEnum.BLOCKED).then(() => fetchData())}
                                >
                                    Engelle
                                </Button>
                            </Paper>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, bgcolor: 'error.main', color: 'white' }}>
                                <Typography variant="subtitle1" fontWeight={700} gutterBottom>Hesabı Tamamen Sil</Typography>
                                <Typography variant="body2" sx={{ mb: 2, opacity: 0.8 }}>Kullanıcı verilerini kalıcı olarak kaldırır.</Typography>
                                <Button variant="contained" sx={{ bgcolor: 'white', color: 'error.main', '&:hover': { bgcolor: 'grey.100' } }} fullWidth>Kalıcı Olarak Sil</Button>
                            </Paper>
                        </Grid>
                    </Grid>
                </PageSection>
            </Box>
          </TabPanel>
        </Box>
      </Paper>
    </PageContainer>
  );
}
