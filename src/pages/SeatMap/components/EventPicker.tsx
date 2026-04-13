import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Stack, Chip, TextField, useTheme, alpha,
  useMediaQuery, Paper, Avatar, CircularProgress, InputAdornment,
} from '@mui/material';
import { Search as SearchIcon, MapOutlined as MapIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { api } from '../../../services/api';

export interface EventSummary {
  id: string;
  name: string;
  eventTime?: string;
  status?: string;
  isPaid?: boolean;
  currentParticipants?: number;
  maxParticipants?: number;
  image?: string;
  category?: { name: string };
}

interface Props {
  onSelect: (event: EventSummary) => void;
}

export default function EventPicker({ onSelect }: Props) {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [search, setSearch] = useState('');
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const fetchEvents = async (keyword?: string) => {
    setLoading(true);
    try {
      const params: Record<string, string | number | boolean> = { page: 0, size: 20, isPaid: true };
      if (keyword?.trim()) params.keyword = keyword.trim();
      const res = await api.get('/events', { params });
      setEvents(res.data?.data?.content || []);
      setSearched(true);
    } catch { enqueueSnackbar('Etkinlikler yüklenemedi', { variant: 'error' }); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchEvents(); }, []);

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto', px: { xs: 2, sm: 3 }, py: { xs: 3, sm: 5 } }}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
        <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <MapIcon sx={{ color: 'primary.main', fontSize: 22 }} />
        </Box>
        <Box>
          <Typography variant="subtitle1" fontWeight={800}>Koltuk Haritası</Typography>
          <Typography variant="caption" color="text.secondary">Düzenlemek istediğiniz etkinliği seçin</Typography>
        </Box>
      </Stack>

      <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
        <TextField fullWidth placeholder="Etkinlik adı ile ara..." size="small" value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') fetchEvents(search); }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} /></InputAdornment> }}
        />
        <Button variant="contained" onClick={() => fetchEvents(search)} disabled={loading}
          sx={{ textTransform: 'none', borderRadius: 2, px: 3, whiteSpace: 'nowrap', flexShrink: 0 }}>
          {loading ? <CircularProgress size={18} color="inherit" /> : 'Ara'}
        </Button>
      </Stack>

      {loading && <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress size={28} /></Box>}
      {!loading && searched && events.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography sx={{ fontSize: 32, mb: 1 }}>🎟️</Typography>
          <Typography variant="body2" color="text.secondary">Ücretli etkinlik bulunamadı</Typography>
        </Box>
      )}

      <Stack spacing={1}>
        {events.map(event => (
          <Paper key={event.id} variant="outlined" onClick={() => onSelect(event)}
            sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2.5, cursor: 'pointer', transition: 'all 0.15s',
              '&:hover': { borderColor: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.02) } }}>
            <Stack direction="row" spacing={{ xs: 1, sm: 2 }} alignItems="center">
              <Avatar variant="rounded" src={event.image}
                sx={{ width: { xs: 40, sm: 48 }, height: { xs: 40, sm: 48 }, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main', fontWeight: 700, fontSize: 14 }}>
                {event.name?.[0]}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={700} noWrap>{event.name}</Typography>
                <Stack direction="row" spacing={0.5} sx={{ mt: 0.3, flexWrap: 'wrap' }}>
                  {event.category?.name && <Chip label={event.category.name} size="small" sx={{ height: 18, fontSize: 9 }} />}
                  {event.eventTime && <Chip label={new Date(event.eventTime).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} size="small" variant="outlined" sx={{ height: 18, fontSize: 9 }} />}
                </Stack>
              </Box>
              {!isMobile && (
                <Button size="small" variant="outlined" sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }}>
                  Düzenle
                </Button>
              )}
            </Stack>
          </Paper>
        ))}
      </Stack>
    </Box>
  );
}
