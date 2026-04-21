import { useState } from 'react';
import {
  Paper, Box, Typography, Stack, TextField, Button, IconButton, Skeleton,
} from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon, Note as NoteIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { userService } from '../../../services/user/userService';
import { safeDate } from './helpers';

interface AdminNote {
  id: string;
  content: string;
  createdAt?: string;
  authorEmail?: string;
  authorName?: string;
}

interface Props {
  userId: string;
  notes?: AdminNote[];
  loading?: boolean;
  onChange?: () => void;
}

export default function NotesPanel({ userId, notes, loading, onChange }: Props) {
  const { enqueueSnackbar } = useSnackbar();
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const content = draft.trim();
    if (!content) return;
    setSaving(true);
    try {
      await userService.addAdminNote(userId, content);
      setDraft('');
      enqueueSnackbar('Not eklendi', { variant: 'success' });
      onChange?.();
    } catch (err: any) {
      enqueueSnackbar(err?.message || 'Not eklenemedi', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    try {
      await userService.deleteAdminNote(userId, noteId);
      enqueueSnackbar('Not silindi', { variant: 'success' });
      onChange?.();
    } catch (err: any) {
      enqueueSnackbar(err?.message || 'Silinemedi', { variant: 'error' });
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, bgcolor: '#FFFFFF', borderColor: 'rgba(201,162,39,0.12)', height: '100%' }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <NoteIcon sx={{ fontSize: 16, color: '#C9A227' }} />
        <Typography sx={{ fontSize: 11, letterSpacing: 1.5, fontWeight: 700, color: 'rgba(30,41,59,0.60)', textTransform: 'uppercase' }}>
          Admin Notları
        </Typography>
        {notes && notes.length > 0 && (
          <Typography sx={{ fontSize: 10, color: 'rgba(30,41,59,0.45)' }}>
            ({notes.length})
          </Typography>
        )}
      </Stack>

      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="Bu kullanıcı için not ekle..."
          value={draft}
          onChange={e => setDraft(e.target.value)}
          fullWidth
          multiline
          maxRows={3}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: 'rgba(0,0,0,0.02)',
              fontSize: 12,
              color: '#1E293B',
              '& fieldset': { borderColor: 'rgba(0,0,0,0.06)' },
              '&:hover fieldset': { borderColor: 'rgba(201,162,39,0.3)' },
              '&.Mui-focused fieldset': { borderColor: '#C9A227' },
            },
          }}
        />
        <Button
          size="small"
          variant="contained"
          onClick={handleSave}
          disabled={saving || !draft.trim()}
          startIcon={<AddIcon sx={{ fontSize: 14 }} />}
          sx={{
            bgcolor: '#C9A227',
            color: '#FFFFFF',
            fontSize: 11,
            fontWeight: 700,
            minWidth: 80,
            '&:hover': { bgcolor: '#b58f1f' },
            '&.Mui-disabled': { bgcolor: 'rgba(0,0,0,0.05)' },
          }}
        >
          Ekle
        </Button>
      </Stack>

      {loading ? (
        <Stack spacing={1}>
          {[1, 2].map(i => (
            <Skeleton key={i} variant="rectangular" height={60} sx={{ bgcolor: 'rgba(0,0,0,0.03)', borderRadius: 1 }} />
          ))}
        </Stack>
      ) : !notes || notes.length === 0 ? (
        <Box sx={{ py: 2, textAlign: 'center' }}>
          <Typography sx={{ fontSize: 12, color: 'rgba(30,41,59,0.45)', fontStyle: 'normal' }}>
            Henüz not yok
          </Typography>
        </Box>
      ) : (
        <Stack spacing={1.25}>
          {notes.map(n => (
            <Box
              key={n.id}
              sx={{
                p: 1.5,
                borderRadius: 1,
                bgcolor: 'rgba(201,162,39,0.04)',
                border: '1px solid rgba(201,162,39,0.12)',
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                <Typography sx={{ fontSize: 12, color: '#1E293B', flex: 1, whiteSpace: 'pre-wrap' }}>
                  {n.content}
                </Typography>
                <IconButton size="small" onClick={() => handleDelete(n.id)} sx={{ color: 'rgba(30,41,59,0.45)', '&:hover': { color: '#ef4444' } }}>
                  <DeleteIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Stack>
              <Typography sx={{ fontSize: 9, color: 'rgba(30,41,59,0.45)', fontFamily: 'monospace', mt: 0.5 }}>
                {n.authorEmail || n.authorName || '—'} · {safeDate(n.createdAt)}
              </Typography>
            </Box>
          ))}
        </Stack>
      )}
    </Paper>
  );
}
