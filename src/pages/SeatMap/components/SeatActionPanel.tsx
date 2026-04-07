/**
 * SeatActionPanel — Koltuk durum yönetimi paneli
 * Seçili koltuklara toplu veya tekil işlem: rezerve, bloke, manuel atama, durum değiştirme
 * + Koltuk detay popup
 */
import { useState } from 'react';
import {
  Box, Typography, Stack, Button, IconButton, TextField, Chip, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions, Divider, Tooltip,
  alpha, useTheme, CircularProgress,
} from '@mui/material';
import {
  Block as BlockIcon, BookOnline as ReserveIcon, PersonAdd as AssignIcon,
  LockOpen as UnlockIcon, CheckCircle as AvailableIcon, Close as CloseIcon,
  Info as InfoIcon, Delete as DeleteIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { ticketService } from '../../../services/ticket/ticketService';
import type { Seat, SeatStatus, SeatAssignment } from '../venueEngine';

interface SeatActionPanelProps {
  selectedSeats: Seat[];
  eventId: string;
  onStatusChange: (seatIds: string[], status: SeatStatus, assignment?: SeatAssignment) => void;
  onClearSelection: () => void;
}

const STATUS_CONFIG: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
  available: { color: '#22c55e', label: 'Müsait', icon: <AvailableIcon sx={{ fontSize: 14 }} /> },
  reserved: { color: '#f59e0b', label: 'Rezerve', icon: <ReserveIcon sx={{ fontSize: 14 }} /> },
  blocked: { color: '#6b7280', label: 'Bloke', icon: <BlockIcon sx={{ fontSize: 14 }} /> },
  disabled: { color: '#9ca3af', label: 'Devre Dışı', icon: <BlockIcon sx={{ fontSize: 14 }} /> },
  sold: { color: '#ef4444', label: 'Satıldı', icon: <CheckCircle sx={{ fontSize: 14 }} /> },
  manual_assigned: { color: '#8b5cf6', label: 'Manuel Atama', icon: <AssignIcon sx={{ fontSize: 14 }} /> },
};

// Fix missing import
function CheckCircle(props: any) {
  return <AvailableIcon {...props} />;
}

export default function SeatActionPanel({
  selectedSeats, eventId, onStatusChange, onClearSelection,
}: SeatActionPanelProps) {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();

  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignName, setAssignName] = useState('');
  const [assignEmail, setAssignEmail] = useState('');
  const [assignNote, setAssignNote] = useState('');
  const [processing, setProcessing] = useState(false);

  if (selectedSeats.length === 0) return null;

  const seatIds = selectedSeats.map(s => s.id);
  const singleSeat = selectedSeats.length === 1 ? selectedSeats[0] : null;

  // Status counts
  const statusCounts: Record<string, number> = {};
  selectedSeats.forEach(s => { statusCounts[s.status] = (statusCounts[s.status] || 0) + 1; });

  const handleStatusUpdate = async (status: SeatStatus, assignment?: SeatAssignment) => {
    setProcessing(true);
    try {
      await ticketService.updateSeatStatus(eventId, seatIds, status, assignment ? {
        ownerName: assignment.ownerName,
        ownerEmail: assignment.ownerEmail,
        note: assignment.note,
      } : undefined);
      onStatusChange(seatIds, status, assignment);
      enqueueSnackbar(`${seatIds.length} koltuk → ${STATUS_CONFIG[status]?.label || status}`, { variant: 'success' });
    } catch {
      // Fallback: local state update
      onStatusChange(seatIds, status, assignment);
      enqueueSnackbar(`${seatIds.length} koltuk güncellendi (yerel)`, { variant: 'info' });
    } finally { setProcessing(false); }
  };

  const handleManualAssign = () => {
    if (!assignName.trim() || !assignEmail.trim()) return;
    const assignment: SeatAssignment = {
      ownerName: assignName.trim(),
      ownerEmail: assignEmail.trim(),
      note: assignNote.trim() || undefined,
      assignedAt: new Date().toISOString(),
    };
    handleStatusUpdate('manual_assigned', assignment);
    setAssignDialogOpen(false);
    setAssignName('');
    setAssignEmail('');
    setAssignNote('');
  };

  return (
    <Paper elevation={0} sx={{
      p: 2, borderRadius: 2,
      border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
      bgcolor: alpha(theme.palette.primary.main, 0.03),
    }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <Chip label={`${selectedSeats.length} koltuk seçili`} size="small"
            color="primary" sx={{ height: 22, fontWeight: 700, fontSize: 11 }} />
          {Object.entries(statusCounts).map(([status, count]) => (
            <Chip key={status} label={`${count} ${STATUS_CONFIG[status]?.label || status}`}
              size="small" variant="outlined"
              sx={{ height: 18, fontSize: '0.6rem', fontWeight: 600,
                borderColor: alpha(STATUS_CONFIG[status]?.color || '#666', 0.4),
                color: STATUS_CONFIG[status]?.color || '#666',
              }} />
          ))}
        </Stack>
        <IconButton size="small" onClick={onClearSelection}><CloseIcon sx={{ fontSize: 14 }} /></IconButton>
      </Stack>

      {/* Tek koltuk detay */}
      {singleSeat && (
        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, mb: 1.5, bgcolor: 'background.paper' }}>
          <Stack spacing={0.5}>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="caption" color="text.secondary">Konum</Typography>
              <Typography variant="caption" fontWeight={700}>
                {singleSeat.sectionName} · Sıra {singleSeat.rowLabel} · Koltuk {singleSeat.seatNumber}
              </Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="caption" color="text.secondary">Durum</Typography>
              <Chip label={STATUS_CONFIG[singleSeat.status]?.label || singleSeat.status}
                size="small" sx={{
                  height: 18, fontSize: '0.6rem', fontWeight: 700,
                  bgcolor: alpha(STATUS_CONFIG[singleSeat.status]?.color || '#666', 0.12),
                  color: STATUS_CONFIG[singleSeat.status]?.color || '#666',
                }} />
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="caption" color="text.secondary">Kategori</Typography>
              <Typography variant="caption" fontWeight={700}>{singleSeat.category}</Typography>
            </Stack>
            {singleSeat.assignment && (
              <>
                <Divider sx={{ my: 0.5 }} />
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">Sahip</Typography>
                  <Typography variant="caption" fontWeight={700}>{singleSeat.assignment.ownerName}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">E-posta</Typography>
                  <Typography variant="caption" fontFamily="monospace" fontSize={10}>{singleSeat.assignment.ownerEmail}</Typography>
                </Stack>
                {singleSeat.assignment.ticketCode && (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary">Bilet Kodu</Typography>
                    <Typography variant="caption" fontFamily="monospace" fontSize={10}>{singleSeat.assignment.ticketCode}</Typography>
                  </Stack>
                )}
              </>
            )}
          </Stack>
        </Paper>
      )}

      {/* Aksiyon Butonları */}
      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
        <Tooltip title="Müsait yap">
          <Button size="small" variant="outlined" color="success"
            startIcon={<AvailableIcon sx={{ fontSize: '12px !important' }} />}
            onClick={() => handleStatusUpdate('available')}
            disabled={processing}
            sx={{ textTransform: 'none', borderRadius: 1.5, fontSize: 10, fontWeight: 700, py: 0.5, px: 1 }}>
            Müsait
          </Button>
        </Tooltip>
        <Tooltip title="Rezerve et">
          <Button size="small" variant="outlined" color="warning"
            startIcon={<ReserveIcon sx={{ fontSize: '12px !important' }} />}
            onClick={() => handleStatusUpdate('reserved')}
            disabled={processing}
            sx={{ textTransform: 'none', borderRadius: 1.5, fontSize: 10, fontWeight: 700, py: 0.5, px: 1 }}>
            Rezerve
          </Button>
        </Tooltip>
        <Tooltip title="Bloke et (satışa kapalı)">
          <Button size="small" variant="outlined"
            startIcon={<BlockIcon sx={{ fontSize: '12px !important' }} />}
            onClick={() => handleStatusUpdate('blocked')}
            disabled={processing}
            sx={{ textTransform: 'none', borderRadius: 1.5, fontSize: 10, fontWeight: 700, py: 0.5, px: 1, borderColor: '#6b7280', color: '#6b7280' }}>
            Bloke
          </Button>
        </Tooltip>
        <Tooltip title="Manuel bilet ata (isim + email)">
          <Button size="small" variant="outlined" color="secondary"
            startIcon={<AssignIcon sx={{ fontSize: '12px !important' }} />}
            onClick={() => setAssignDialogOpen(true)}
            disabled={processing}
            sx={{ textTransform: 'none', borderRadius: 1.5, fontSize: 10, fontWeight: 700, py: 0.5, px: 1 }}>
            Manuel Ata
          </Button>
        </Tooltip>
      </Stack>

      {processing && <CircularProgress size={14} sx={{ mt: 1 }} />}

      {/* Manuel Atama Dialog */}
      <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, fontSize: 16 }}>
          Manuel Bilet Atama
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {selectedSeats.length} koltuğa manuel bilet atayın. QR kod otomatik oluşturulur.
          </Typography>
          <Stack spacing={2}>
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: 'grey.50' }}>
              <Typography variant="caption" fontWeight={700}>Seçili Koltuklar:</Typography>
              <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap' }} useFlexGap>
                {selectedSeats.slice(0, 8).map(s => (
                  <Chip key={s.id} label={`${s.sectionName} ${s.rowLabel}-${s.seatNumber}`}
                    size="small" sx={{ height: 20, fontSize: '0.6rem' }} />
                ))}
                {selectedSeats.length > 8 && (
                  <Chip label={`+${selectedSeats.length - 8} daha`} size="small" variant="outlined"
                    sx={{ height: 20, fontSize: '0.6rem' }} />
                )}
              </Stack>
            </Paper>
            <TextField fullWidth label="Ad Soyad" required size="small" value={assignName}
              onChange={e => setAssignName(e.target.value)} autoFocus />
            <TextField fullWidth label="E-posta" required size="small" type="email" value={assignEmail}
              onChange={e => setAssignEmail(e.target.value)} />
            <TextField fullWidth label="Not (opsiyonel)" size="small" value={assignNote}
              onChange={e => setAssignNote(e.target.value)}
              placeholder="VIP davetli, sponsor vb." />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialogOpen(false)} sx={{ textTransform: 'none' }}>İptal</Button>
          <Button variant="contained" onClick={handleManualAssign}
            disabled={!assignName.trim() || !assignEmail.trim() || processing}
            sx={{ textTransform: 'none', borderRadius: 2 }}>
            {processing ? <CircularProgress size={16} /> : `${selectedSeats.length} Koltuğa Ata`}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
