/**
 * EventActionBar — Üst kısımdaki etkinlik aksiyon butonları
 */
import { Button, Stack } from '@mui/material';
import {
  Edit as EditIcon, PauseCircle as PauseIcon, Cancel as CancelIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

interface Props {
  onEdit: () => void;
  onPause: () => void;
  onCancel: () => void;
  onDelete: () => void;
  isPaused?: boolean;
}

export default function EventActionBar({ onEdit, onPause, onCancel, onDelete, isPaused }: Props) {
  return (
    <Stack direction="row" spacing={1}>
      <Button variant="outlined" size="small" startIcon={<PauseIcon />}
        onClick={onPause}
        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>
        {isPaused ? 'Devam Ettir' : 'Duraklat'}
      </Button>
      <Button variant="outlined" size="small" startIcon={<EditIcon />}
        onClick={onEdit}
        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>
        Düzenle
      </Button>
      <Button variant="outlined" size="small" color="error" startIcon={<CancelIcon />}
        onClick={onCancel}
        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>
        İptal Et
      </Button>
      <Button variant="outlined" size="small" color="error" startIcon={<DeleteIcon />}
        onClick={onDelete}
        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>
        Sil
      </Button>
    </Stack>
  );
}
