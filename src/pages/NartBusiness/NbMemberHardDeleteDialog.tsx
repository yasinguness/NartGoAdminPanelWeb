import { useState } from 'react';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useNbMobile } from '../../components/nartbusiness';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { nbAdminService } from '../../services/nartbusiness/nbAdminService';
import type { NbMember } from '../../services/nartbusiness/nbTypes';

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
      setError(e?.response?.data?.error?.message ?? e?.message ?? 'Silinemedi');
    } finally {
      setSubmitting(false);
    }
  };

  const companyName = member?.companyName ?? member?.memberId ?? '—';

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth fullScreen={fullScreen}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
        <DeleteForeverIcon />
        Hard Delete — Kalıcı Silme
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2.5}>
          <Alert severity="error" icon={<WarningAmberIcon />}>
            <Typography variant="body2" fontWeight={700}>
              Bu işlem geri alınamaz.
            </Typography>
            <Typography variant="body2">
              <b>{companyName}</b> üyesine ait tüm veriler kalıcı olarak silinir:
              üyelik kaydı, dönemler, paket satın alımları ve dizin profili.
              Keycloak hesabı silinmez.
            </Typography>
          </Alert>

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
                : 'Audit log\'a kalıcı yazılır.'
            }
            placeholder="Neden siliniyor? (örn. 'Test verisi, migration hatası, kullanıcı talebi')"
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
