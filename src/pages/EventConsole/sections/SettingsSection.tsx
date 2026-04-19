import { useState } from 'react';
import {
  Paper, Typography, Stack, Switch, Button, Box, alpha, useTheme,
  Dialog, DialogTitle, DialogContent, DialogActions, Chip, CircularProgress,
} from '@mui/material';
import {
  PauseCircle as PauseIcon, PlayCircle as PlayIcon,
  Cancel as CancelIcon, CheckCircle as CompleteIcon,
  Visibility as PublicIcon,
  ShoppingCart as SalesIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { EventResponseDTO, EventStatus } from '../../../types/events/eventModel';
import { api } from '../../../services/api';
import { adminOperationsService } from '../../../services/admin/adminOperationsService';

export default function SettingsSection({ event }: { event: EventResponseDTO }) {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const [status, setStatus] = useState<EventStatus>(event.status);
  const [isPublic, setIsPublic] = useState(event.isPrivate === false);
  const [salesOpen, setSalesOpen] = useState(event.isRegistrationOpen !== false);
  const [loading, setLoading] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ action: string; title: string; body: string } | null>(null);

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
      await adminOperationsService.updateEventStatus(event.id, newStatus);
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
        <Button
          variant="outlined"
          color="error"
          size="small"
          disabled={status === EventStatus.CANCELLED}
          onClick={() => setConfirmDialog({
            action: 'cancel',
            title: 'Etkinliği Kalıcı İptal',
            body: 'Etkinlik iptal edilecek ve tüm biletler iade edilecek. Bu işlem geri alınamaz.',
          })}
        >
          Etkinliği İptal Et
        </Button>
      </Paper>

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
