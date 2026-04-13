/**
 * OrganizerStep — Step 1: Organizatör seçimi (admin only)
 */
import { useState } from 'react';
import {
  Box, Typography, Button, TextField, Stack, Paper, Chip, Avatar,
  IconButton, alpha, useTheme, CircularProgress, styled,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import type { UserDTO } from '../../../types/users/userModel';
import { userService } from '../../../services/user/userService';
import { useSnackbar } from 'notistack';

const SC = styled(Paper)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`, borderRadius: 16, overflow: 'hidden',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
}));

interface Props {
  organizer: UserDTO | null;
  onSelect: (user: UserDTO | null) => void;
  error?: string;
  onClearError: () => void;
}

export default function OrganizerStep({ organizer, onSelect, error, onClearError }: Props) {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<UserDTO[]>([]);
  const [loading, setLoading] = useState(false);

  const doSearch = async () => {
    if (!search.trim()) return;
    setLoading(true);
    try {
      const res = await userService.getAllUsers({ keyword: search, size: 10 });
      setResults(res.data?.content || []);
    } catch { enqueueSnackbar('Arama başarısız', { variant: 'error' }); }
    finally { setLoading(false); }
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="subtitle1" fontWeight={700}>Etkinliği kim oluşturuyor?</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>Etkinliğin sahibi olarak görünecek kullanıcıyı seçin.</Typography>
      </Box>

      <Stack direction="row" spacing={1}>
        <TextField fullWidth placeholder="E-posta veya isim ile ara..." value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') doSearch(); }}
          size="small" />
        <Button variant="contained" onClick={doSearch} disabled={loading}
          sx={{ textTransform: 'none', borderRadius: 2, px: 3, whiteSpace: 'nowrap' }}>
          {loading ? <CircularProgress size={20} color="inherit" /> : 'Ara'}
        </Button>
      </Stack>
      {error && <Typography variant="caption" color="error">{error}</Typography>}

      {results.length > 0 && !organizer && (
        <SC>
          {results.map(u => (
            <Stack key={u.id} direction="row" spacing={1.5} alignItems="center"
              onClick={() => { onSelect(u); onClearError(); }}
              sx={{ px: 2.5, py: 1.5, cursor: 'pointer', borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 'none' }, '&:hover': { bgcolor: 'grey.50' } }}>
              <Avatar src={u.imageUrl} sx={{ width: 36, height: 36, fontSize: 14 }}>{(u.firstName || u.email)?.[0]}</Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" fontWeight={600}>{u.displayName || `${u.firstName || ''} ${u.lastName || ''}`}</Typography>
                <Typography variant="caption" color="text.secondary">{u.email}</Typography>
              </Box>
              <Chip label={u.accountType || 'INDIVIDUAL'} size="small" variant="outlined" sx={{ fontSize: 10, height: 20 }} />
            </Stack>
          ))}
        </SC>
      )}

      {organizer && (
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, bgcolor: alpha(theme.palette.success.main, 0.04), borderColor: alpha(theme.palette.success.main, 0.3) }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar src={organizer.imageUrl} sx={{ width: 44, height: 44, bgcolor: alpha('#10b981', 0.15), color: '#10b981', fontWeight: 700 }}>{organizer.firstName?.[0]}</Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" fontWeight={700}>{organizer.displayName || `${organizer.firstName} ${organizer.lastName}`}</Typography>
              <Typography variant="caption" color="text.secondary">{organizer.email}</Typography>
            </Box>
            <Chip label="Organizatör" size="small" color="success" variant="outlined" sx={{ fontWeight: 600 }} />
            <IconButton size="small" onClick={() => { onSelect(null); setResults([]); }}><CloseIcon fontSize="small" /></IconButton>
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}
