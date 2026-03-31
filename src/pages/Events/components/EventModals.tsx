/**
 * EventModals — Confirmation modals for dangerous event actions
 * 
 * Contains: PauseModal, CancelModal, DeleteModal
 */
import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Typography,
  Box,
  alpha,
  Stack,
  IconButton,
} from '@mui/material';
import {
  Close as CloseIcon,
  PauseCircle as PauseIcon,
  Cancel as CancelIcon,
  DeleteForever as DeleteIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

// ─── PAUSE MODAL ────────────────────────────────────────────
interface PauseModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string, note: string) => void;
  loading?: boolean;
}

const pauseReasons = [
  'Teknik sorun',
  'Mekan değişikliği',
  'İçerik güncellemesi',
  'Geçici kapasite durdurma',
];

export function PauseModal({ open, onClose, onConfirm, loading }: PauseModalProps) {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');

  const handleConfirm = () => {
    onConfirm(reason, note);
    setReason('');
    setNote('');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <PauseIcon sx={{ color: 'warning.main' }} />
          <Typography variant="h6" fontWeight={800}>Etkinliği Duraklat</Typography>
        </Stack>
        <IconButton onClick={onClose} size="small"><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{
          bgcolor: (t) => alpha(t.palette.warning.main, 0.08),
          border: '1px solid',
          borderColor: (t) => alpha(t.palette.warning.main, 0.3),
          borderRadius: 2,
          p: 2,
          mb: 3,
        }}>
          <Typography variant="body2" color="warning.dark">
            <strong>⚠ Dikkat:</strong> Etkinliği duraklatırsanız yeni bilet satışları durur. Mevcut biletler geçerli kalmaya devam eder.
          </Typography>
        </Box>
        <TextField
          fullWidth
          select
          label="Durdurma Sebebi *"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          sx={{ mb: 2 }}
        >
          <MenuItem value="" disabled>Seçin...</MenuItem>
          {pauseReasons.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
        </TextField>
        <TextField
          fullWidth
          multiline
          rows={3}
          label="Ek Not (opsiyonel)"
          placeholder="Katılımcılara iletilecek mesaj..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} variant="text" color="inherit" disabled={loading}>Vazgeç</Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={!reason || loading}
          sx={{ bgcolor: 'warning.main', '&:hover': { bgcolor: 'warning.dark' } }}
        >
          {loading ? 'İşleniyor...' : 'Etkinliği Duraklat'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── CANCEL MODAL ───────────────────────────────────────────
interface CancelModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  eventName: string;
  participantCount: number;
  loading?: boolean;
}

const cancelReasons = [
  'Organizatör kararı',
  'Mekan iptal etti',
  'Yeterli katılım yok',
  'Mücbir sebep',
];

export function CancelModal({ open, onClose, onConfirm, eventName, participantCount, loading }: CancelModalProps) {
  const [reason, setReason] = useState('');
  const [confirmName, setConfirmName] = useState('');

  const handleConfirm = () => {
    onConfirm(reason);
    setReason('');
    setConfirmName('');
  };

  const isValid = reason && confirmName === eventName;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Typography variant="h6" fontWeight={800} color="error.main">✕ Etkinliği İptal Et</Typography>
        <IconButton onClick={onClose} size="small"><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{
          bgcolor: (t) => alpha(t.palette.error.main, 0.08),
          border: '1px solid',
          borderColor: (t) => alpha(t.palette.error.main, 0.24),
          borderRadius: 2,
          p: 2,
          mb: 3,
        }}>
          <Typography variant="body2" color="error.dark">
            <strong>⛔ Bu işlem geri alınamaz.</strong> {participantCount} katılımcıya otomatik iade ve bildirim gönderilecek.
          </Typography>
        </Box>
        <TextField
          fullWidth
          select
          label="İptal Sebebi *"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          sx={{ mb: 2 }}
        >
          <MenuItem value="" disabled>Seçin...</MenuItem>
          {cancelReasons.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
        </TextField>
        <TextField
          fullWidth
          label="Onay için etkinlik adını yazın"
          placeholder={eventName}
          value={confirmName}
          onChange={(e) => setConfirmName(e.target.value)}
          helperText={confirmName && confirmName !== eventName ? 'Etkinlik adı eşleşmiyor' : ''}
          error={!!confirmName && confirmName !== eventName}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} variant="text" color="inherit" disabled={loading}>Vazgeç</Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color="error"
          disabled={!isValid || loading}
        >
          {loading ? 'İşleniyor...' : 'Etkinliği İptal Et'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── DELETE MODAL ───────────────────────────────────────────
interface DeleteModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export function DeleteModal({ open, onClose, onConfirm, loading }: DeleteModalProps) {
  const [confirmText, setConfirmText] = useState('');

  const handleConfirm = () => {
    onConfirm();
    setConfirmText('');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Typography variant="h6" fontWeight={800} color="error.main">🗑 Etkinliği Sil</Typography>
        <IconButton onClick={onClose} size="small"><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{
          bgcolor: (t) => alpha(t.palette.error.main, 0.08),
          border: '1px solid',
          borderColor: (t) => alpha(t.palette.error.main, 0.24),
          borderRadius: 2,
          p: 2,
          mb: 3,
        }}>
          <Typography variant="body2" color="error.dark">
            <strong>⛔ Kalıcı olarak silinecek.</strong> Sipariş geçmişi, bilet verileri ve tüm katılımcı bilgileri silinir. Bu işlem geri alınamaz.
          </Typography>
        </Box>
        <TextField
          fullWidth
          label={<>Onaylamak için <strong>SİL</strong> yazın</>}
          placeholder="SİL"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} variant="text" color="inherit" disabled={loading}>Vazgeç</Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color="error"
          disabled={confirmText !== 'SİL' || loading}
        >
          {loading ? 'İşleniyor...' : 'Kalıcı Olarak Sil'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
