import { useState } from 'react';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Chip,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useNbMobile } from '../../components/nartbusiness';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { nbAdminService } from '../../services/nartbusiness/nbAdminService';
import type { NbMember } from '../../services/nartbusiness/nbTypes';
import { nbErrorMessage } from '../../services/nartbusiness/nbErrorMessage';

const DUPLICATE_REASONS = [
  { label: 'Çift kayıt', note: 'Çift kayıt: aynı işletmenin başka bir üyelik kaydı var; bu kopya silindi.' },
  { label: 'Test kaydı', note: 'Test kaydı: deneme amacıyla açılmıştı, gerçek bir işletmeye ait değil.' },
];

interface Props {
  open: boolean;
  member: NbMember | null;
  onClose: () => void;
  onDeleted: () => void;
}

export default function NbMemberHardDeleteDialog({ open, member, onClose, onDeleted }: Props) {
  const fullScreen = useNbMobile();
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const noteValid = note.trim().length >= 30;

  const handleClose = () => {
    if (submitting) return;
    setNote('');
    setError(null);
    onClose();
  };

  const handleDelete = async () => {
    if (!member || !noteValid) return;
    setSubmitting(true);
    setError(null);
    try {
      await nbAdminService.hardDeleteMember(member.memberId, {
        category: 'HARD_DELETE',
        note: note.trim(),
      });
      setNote('');
      onDeleted();
      onClose();
    } catch (e: any) {
      setError(nbErrorMessage(e, 'Silinemedi'));
    } finally {
      setSubmitting(false);
    }
  };

  const companyName = member?.companyName ?? member?.memberId ?? '—';

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth fullScreen={fullScreen}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
        <DeleteForeverIcon />
        Kalıcı olarak sil
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2.5}>
          <Alert severity="error" icon={<WarningAmberIcon />}>
            <Typography variant="body2" fontWeight={700}>
              Bu işlem geri alınamaz.
            </Typography>
            <Typography variant="body2">
              <b>{companyName}</b> NartBusiness'tan tamamen kalkar: üyelik kaydı, dönemler,
              paket satın alımları ve işletme profili silinir; kişinin NartBusiness erişimi
              kapanır. NartGo hesabı silinmez.
            </Typography>
          </Alert>

          {/* Çift kayıtlar en sık neden: gerekçe tek dokunuşla (en az 30 karakter kuralı korunur). */}
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {DUPLICATE_REASONS.map((r) => (
              <Chip key={r.label} label={r.label} onClick={() => setNote(r.note)} variant={note === r.note ? 'filled' : 'outlined'} />
            ))}
          </Stack>

          <TextField
            label="Silme gerekçesi *"
            multiline
            rows={3}
            fullWidth
            size="small"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            error={note.trim().length > 0 && !noteValid}
            helperText={
              note.trim().length > 0 && !noteValid
                ? `En az 30 karakter gerekli (şu an: ${note.trim().length})`
                : 'Kritik olay kaydına kalıcı yazılır.'
            }
            placeholder="Neden siliniyor? (örn. çift kayıt, test kaydı, kullanıcı talebi)"
          />

          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={submitting}>
          İptal
        </Button>
        <Button
          variant="contained"
          color="error"
          disabled={!noteValid || submitting}
          startIcon={
            submitting ? <CircularProgress size={16} color="inherit" /> : <DeleteForeverIcon />
          }
          onClick={handleDelete}
        >
          Kalıcı Sil
        </Button>
      </DialogActions>
    </Dialog>
  );
}
