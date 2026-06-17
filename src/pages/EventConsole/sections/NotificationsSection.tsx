import { useState } from 'react';
import {
  Paper, Typography, Stack, Button, TextField, Box,
  FormControl, InputLabel, Select, MenuItem, CircularProgress,
} from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { api } from '../../../services/api';
import { EventResponseDTO } from '../../../types/events/eventModel';

export default function NotificationsSection({ event }: { event: EventResponseDTO }) {
  const { enqueueSnackbar } = useSnackbar();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [target, setTarget] = useState('attendees');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      enqueueSnackbar('Başlık ve metin zorunlu', { variant: 'warning' });
      return;
    }
    setSending(true);
    try {
      const topic = target === 'attendees' ? `event_${event.id}` : 'all_users';
      await api.post('/notifications/admin/push/topic', {
        topic,
        title,
        body,
        deepLink: `nartgo://events/${event.id}`,
      });
      enqueueSnackbar('Bildirim gönderildi', { variant: 'success' });
      setTitle('');
      setBody('');
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Bildirim gönderilemedi';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setSending(false);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, maxWidth: 600 }}>
      <Typography variant="caption" sx={{ letterSpacing: 1.5, fontSize: 10, fontWeight: 700, color: 'text.secondary' }}>
        BİLDİRİM GÖNDER
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>
        Etkinlik katılımcılarına veya tüm kullanıcılara push bildirim gönder
      </Typography>

      <Stack spacing={2}>
        <FormControl size="small">
          <InputLabel>Hedef</InputLabel>
          <Select value={target} label="Hedef" onChange={e => setTarget(e.target.value)}>
            <MenuItem value="attendees">Bu Etkinliğin Katılımcıları</MenuItem>
            <MenuItem value="all">Tüm Kullanıcılar</MenuItem>
          </Select>
        </FormControl>

        <TextField
          label="Başlık"
          value={title}
          onChange={e => setTitle(e.target.value)}
          size="small"
          fullWidth
        />

        <TextField
          label="Bildirim Metni"
          value={body}
          onChange={e => setBody(e.target.value)}
          multiline
          rows={4}
          fullWidth
          placeholder="Etkinlik başlamadan 2 saat kala kapılarımız açılacak. Tüm katılımcılarımıza iyi eğlenceler!"
        />

        <Box>
          <Button
            variant="contained"
            startIcon={sending ? <CircularProgress size={16} /> : <SendIcon />}
            onClick={handleSend}
            disabled={sending}
          >
            {sending ? 'Gönderiliyor...' : 'Gönder'}
          </Button>
        </Box>
      </Stack>
    </Paper>
  );
}
