import { useState } from 'react';
import {
  Paper, Typography, Stack, Switch, Button, Box, alpha, useTheme,
  Dialog, DialogTitle, DialogContent, DialogActions, Chip, CircularProgress,
  TextField,
} from '@mui/material';
import {
  PauseCircle as PauseIcon, PlayCircle as PlayIcon,
  Cancel as CancelIcon, CheckCircle as CompleteIcon,
  Visibility as PublicIcon,
  ShoppingCart as SalesIcon,
  TrendingUp as CapacityIcon,
  Edit as EditIcon,
  DeleteForever as DeleteIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { EventResponseDTO, EventStatus } from '../../../types/events/eventModel';
import { api } from '../../../services/api';
import { adminOperationsService } from '../../../services/admin/adminOperationsService';
import { eventService } from '../../../services/event/eventService';
import { useAuthStore } from '../../../store/authStore';

export default function SettingsSection({ event }: { event: EventResponseDTO }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const currentUser = useAuthStore(s => s.user);
  const [status, setStatus] = useState<EventStatus>(event.status);
  const [isPublic, setIsPublic] = useState(event.isPrivate === false);
  const [salesOpen, setSalesOpen] = useState(event.isRegistrationOpen !== false);
  const [loading, setLoading] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ action: string; title: string; body: string } | null>(null);
  const [capacityOpen, setCapacityOpen] = useState(false);
  const [capacityValue, setCapacityValue] = useState(event.maxParticipants || 0);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const handleCapacitySave = async () => {
    if (!event.id || capacityValue < 1) return;
    setLoading('capacity');
    try {
      await adminOperationsService.updateEventCapacity(event.id, { capacity: capacityValue, reason: 'Konsol üzerinden güncellendi' });
      enqueueSnackbar('Kapasite güncellendi', { variant: 'success' });
      setCapacityOpen(false);
    } catch {
      enqueueSnackbar('Kapasite güncellenemedi', { variant: 'error' });
    } finally { setLoading(null); }
  };

  const handleDelete = async () => {
    if (!event.id || !currentUser?.id) return;
    setLoading('delete');
    try {
      await eventService.deleteEvent(currentUser.id, event.id);
      enqueueSnackbar('Etkinlik silindi', { variant: 'success' });
      setDeleteOpen(false);
      navigate('/events');
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Silinemedi', { variant: 'error' });
    } finally { setLoading(null); }
  };

  const handleVisibilityToggle = async (newValue: boolean) => {
    setIsPublic(newValue);
    setLoading('visibility');
    try {
      await api.put(`/events/${event.id}`, { isPrivate: !newValue });
      enqueueSnackbar(newValue ? 'Etkinlik herkese açık' : 'Etkinlik gizlendi', { variant: 'success' });
    } catch {
      setIsPublic(!newValue);
      enqueueSnackbar('Değişiklik kaydedilemedi', { variant: 'error' });
    } finally { setLoading(null); }
  };

  const handleSalesToggle = async (newValue: boolean) => {
    setSalesOpen(newValue);
    setLoading('sales');
    try {
      await api.put(`/events/${event.id}`, { isRegistrationOpen: newValue });
      enqueueSnackbar(newValue ? 'Satış açıldı' : 'Satış kapatıldı', { variant: 'success' });
    } catch {
      setSalesOpen(!newValue);
      enqueueSnackbar('Değişiklik kaydedilemedi', { variant: 'error' });
    } finally { setLoading(null); }
  };

  const handleStatusChange = async (newStatus: EventStatus, actionLabel: string) => {
    setLoading('status');
    try {
      await eventService.updateEventStatus(event.id, newStatus);
      setStatus(newStatus);
      enqueueSnackbar(`Etkinlik ${actionLabel}`, { variant: 'success' });
    } catch {
      enqueueSnackbar('Durum değiştirilemedi', { variant: 'error' });
    } finally {
      setLoading(null);
      setConfirmDialog(null);
    }
  };

  const statusColor: Record<string, 'success' | 'warning' | 'default' | 'error'> = {
    ACTIVE: 'success',
    PASSIVE: 'warning',
    COMPLETED: 'default',
    CANCELLED: 'error',
  };

  return (
    <Stack spacing={2}>
      {/* Mevcut Durum */}
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="caption" sx={{ letterSpacing: 1.5, fontSize: 10, fontWeight: 700, color: 'text.secondary' }}>
          ETKİNLİK DURUMU
        </Typography>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mt: 1.5 }}>
          <Chip
            label={status === EventStatus.ACTIVE ? 'Aktif' : status === EventStatus.PASSIVE ? 'Pasif' : status === EventStatus.COMPLETED ? 'Tamamlandı' : 'İptal Edildi'}
            color={statusColor[status] || 'default'}
            sx={{ fontWeight: 700 }}
          />
          <Box sx={{ flex: 1 }} />

          {/* Aksiyonlar duruma göre */}
          {status === EventStatus.ACTIVE && (
            <>
              <Button
                variant="outlined"
                size="small"
                startIcon={<PauseIcon />}
                disabled={loading === 'status'}
                onClick={() => setConfirmDialog({
                  action: 'pause',
                  title: 'Etkinliği Duraklat',
                  body: 'Etkinlik pasif duruma alınacak. Bilet satışı durdurulur. İstediğiniz zaman tekrar aktif edebilirsiniz.',
                })}
              >
                Duraklat
              </Button>
              <Button
                variant="outlined"
                size="small"
                color="warning"
                startIcon={<CompleteIcon />}
                disabled={loading === 'status'}
                onClick={() => setConfirmDialog({
                  action: 'complete',
                  title: 'Etkinliği Tamamla',
                  body: 'Etkinlik tamamlandı olarak işaretlenecek. Bu işlem geri alınabilir.',
                })}
              >
                Tamamla
              </Button>
              <Button
                variant="outlined"
                size="small"
                color="error"
                startIcon={<CancelIcon />}
                disabled={loading === 'status'}
                onClick={() => setConfirmDialog({
                  action: 'cancel',
                  title: 'Etkinliği İptal Et',
                  body: 'DİKKAT: Etkinlik iptal edilecek ve tüm satılan biletler iade edilecek. Bu işlem geri alınamaz.',
                })}
              >
                İptal Et
              </Button>
            </>
          )}

          {status === EventStatus.PASSIVE && (
            <Button
              variant="contained"
              size="small"
              color="success"
              startIcon={<PlayIcon />}
              disabled={loading === 'status'}
              onClick={() => handleStatusChange(EventStatus.ACTIVE, 'aktif edildi')}
            >
              Aktif Et
            </Button>
          )}
        </Stack>
      </Paper>

      {/* Görünürlük Toggles */}
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="caption" sx={{ letterSpacing: 1.5, fontSize: 10, fontWeight: 700, color: 'text.secondary' }}>
          GÖRÜNÜRLÜK & SATIŞ
        </Typography>

        <Stack spacing={0} sx={{ mt: 1 }}>
          <ToggleRow
            icon={<PublicIcon />}
            title="Etkinliği yayında göster"
            desc="Kapatırsanız etkinlik arama ve keşfet ekranlarında görünmez"
            value={isPublic}
            loading={loading === 'visibility'}
            onChange={handleVisibilityToggle}
          />
          <Box sx={{ borderTop: '1px solid', borderColor: 'divider' }} />
          <ToggleRow
            icon={<SalesIcon />}
            title="Bilet satışına izin ver"
            desc="Kapatırsanız yeni satın alma yapılamaz, mevcut biletler korunur"
            value={salesOpen}
            loading={loading === 'sales'}
            onChange={handleSalesToggle}
          />
        </Stack>
      </Paper>

      {/* Kapasite & Temel Bilgiler */}
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="caption" sx={{ letterSpacing: 1.5, fontSize: 10, fontWeight: 700, color: 'text.secondary' }}>
          KAPASİTE & TEMEL BİLGİLER
        </Typography>
        <Stack spacing={2} sx={{ mt: 1.5 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between">
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" fontWeight={600}>Maksimum Katılımcı</Typography>
              <Typography variant="caption" color="text.secondary">
                Şu an: <strong>{event.maxParticipants || 0}</strong> · Satıldı: {event.currentParticipants || 0}
              </Typography>
            </Box>
            <Button
              variant="outlined" size="small" startIcon={<CapacityIcon sx={{ fontSize: 16 }} />}
              onClick={() => { setCapacityValue(event.maxParticipants || 0); setCapacityOpen(true); }}
            >
              Kapasiteyi Güncelle
            </Button>
          </Stack>
          <Box sx={{ borderTop: '1px solid', borderColor: 'divider' }} />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between">
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" fontWeight={600}>Etkinlik Adı, Açıklama, Tarih, Medya</Typography>
              <Typography variant="caption" color="text.secondary">
                Detaylı düzenleme için oluşturma sihirbazını aç
              </Typography>
            </Box>
            <Button
              variant="outlined" size="small" startIcon={<EditIcon sx={{ fontSize: 16 }} />}
              onClick={() => navigate(`/event-creation/${event.id}?edit=true`)}
            >
              Temel Bilgileri Düzenle
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* Danger Zone */}
      <Paper variant="outlined" sx={{
        p: 3, borderRadius: 2,
        borderColor: alpha(theme.palette.error.main, 0.3),
        bgcolor: alpha(theme.palette.error.main, 0.03),
      }}>
        <Typography variant="subtitle2" fontWeight={700} color="error.main" sx={{ mb: 0.5 }}>
          ⚠ Tehlikeli Bölge
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Aşağıdaki işlemler geri alınamaz. Sadece gerektiğinde kullanın.
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Button
            variant="outlined"
            color="error"
            size="small"
            startIcon={<CancelIcon sx={{ fontSize: 16 }} />}
            disabled={status === EventStatus.CANCELLED}
            onClick={() => setConfirmDialog({
              action: 'cancel',
              title: 'Etkinliği Kalıcı İptal',
              body: 'Etkinlik iptal edilecek ve tüm biletler iade edilecek. Bu işlem geri alınamaz.',
            })}
          >
            Etkinliği İptal Et
          </Button>
          <Button
            variant="contained"
            color="error"
            size="small"
            startIcon={<DeleteIcon sx={{ fontSize: 16 }} />}
            onClick={() => { setDeleteConfirmText(''); setDeleteOpen(true); }}
          >
            Etkinliği Sil
          </Button>
        </Stack>
      </Paper>

      {/* Kapasite Dialog */}
      <Dialog open={capacityOpen} onClose={() => setCapacityOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Kapasiteyi Güncelle</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth autoFocus type="number" size="small"
            label="Maksimum Katılımcı" value={capacityValue}
            onChange={e => setCapacityValue(Number(e.target.value))}
            InputProps={{ inputProps: { min: 1 } }}
            sx={{ mt: 1 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Not: Bilet tiplerinin toplam kapasitesi ile senkron olması önerilir.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCapacityOpen(false)}>Vazgeç</Button>
          <Button variant="contained" onClick={handleCapacitySave}
            disabled={loading === 'capacity' || capacityValue < 1}
            startIcon={loading === 'capacity' ? <CircularProgress size={16} /> : undefined}
          >
            Güncelle
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog (confirmation with text) */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: 'error.main' }}>Etkinliği Kalıcı Olarak Sil</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            <strong>{event.name}</strong> etkinliği silinecek. Bu işlem <strong>geri alınamaz</strong>.
            Onaylamak için etkinlik adını yazın:
          </Typography>
          <TextField
            fullWidth size="small" autoFocus
            placeholder={event.name}
            value={deleteConfirmText}
            onChange={e => setDeleteConfirmText(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Vazgeç</Button>
          <Button variant="contained" color="error" onClick={handleDelete}
            disabled={loading === 'delete' || deleteConfirmText !== event.name}
            startIcon={loading === 'delete' ? <CircularProgress size={16} /> : <DeleteIcon sx={{ fontSize: 16 }} />}
          >
            Kalıcı Sil
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={!!confirmDialog} onClose={() => setConfirmDialog(null)}>
        <DialogTitle>{confirmDialog?.title}</DialogTitle>
        <DialogContent>
          <Typography variant="body2">{confirmDialog?.body}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog(null)}>Vazgeç</Button>
          <Button
            variant="contained"
            color={confirmDialog?.action === 'cancel' ? 'error' : 'primary'}
            onClick={() => {
              if (!confirmDialog) return;
              const mapping: Record<string, { status: EventStatus; label: string }> = {
                pause: { status: EventStatus.PASSIVE, label: 'duraklatıldı' },
                complete: { status: EventStatus.COMPLETED, label: 'tamamlandı' },
                cancel: { status: EventStatus.CANCELLED, label: 'iptal edildi' },
              };
              const m = mapping[confirmDialog.action];
              if (m) handleStatusChange(m.status, m.label);
            }}
            disabled={loading === 'status'}
            startIcon={loading === 'status' ? <CircularProgress size={16} /> : undefined}
          >
            Onayla
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

function ToggleRow({ icon, title, desc, value, loading, onChange }: {
  icon: React.ReactNode; title: string; desc: string;
  value: boolean; loading: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <Stack direction="row" spacing={2} alignItems="center" sx={{ py: 1.5 }}>
      <Box sx={{ color: 'text.secondary' }}>{icon}</Box>
      <Box sx={{ flex: 1 }}>
        <Typography variant="body2" fontWeight={600}>{title}</Typography>
        <Typography variant="caption" color="text.secondary">{desc}</Typography>
      </Box>
      <Switch checked={value} onChange={e => onChange(e.target.checked)} disabled={loading} />
    </Stack>
  );
}
