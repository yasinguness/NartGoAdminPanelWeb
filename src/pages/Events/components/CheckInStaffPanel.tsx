/**
 * CheckInStaffPanel — Check-in personel yönetimi.
 * Kullanıcı arama ile personel ata, listele, kaldır.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Stack, TextField, Button, IconButton, Chip,
  Avatar, Tooltip, CircularProgress, alpha, useTheme, Autocomplete,
  InputAdornment,
} from '@mui/material';
import {
  Delete as DeleteIcon, PersonAdd as AddIcon, Refresh as RefreshIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { api } from '../../../services/api';
import { userService } from '../../../services/user/userService';
import { useSnackbar } from 'notistack';

interface Staff {
  id: string;
  email: string;
  displayName?: string;
  isActive: boolean;
  assignedAt: string;
  assignedByEmail?: string;
}

interface UserOption {
  id: string;
  email: string;
  displayName: string;
  imageUrl?: string;
}

interface Props {
  eventId: string;
}

export default function CheckInStaffPanel({ eventId }: Props) {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  // User search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/tickets/admin/events/${eventId}/checkin-staff`);
      setStaff(res.data?.data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [eventId]);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  // Kullanıcı ara — 300ms debounce
  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await userService.getAllUsers({ keyword: searchQuery, size: 8 });
        const users = res.data?.content || [];
        setSearchResults(users.map((u: any) => ({
          id: u.id,
          email: u.email || '',
          displayName: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || '',
          imageUrl: u.imageUrl,
        })));
      } catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleAdd = async () => {
    const email = selectedUser?.email;
    const displayName = selectedUser?.displayName;
    if (!email) {
      enqueueSnackbar('Bir kullanıcı seçin', { variant: 'warning' });
      return;
    }
    if (staff.some(s => s.email === email)) {
      enqueueSnackbar('Bu kullanıcı zaten atanmış', { variant: 'info' });
      return;
    }
    setAdding(true);
    try {
      await api.post(`/tickets/admin/events/${eventId}/checkin-staff`, { email, displayName });
      enqueueSnackbar(`${displayName || email} check-in personeli olarak atandı`, { variant: 'success' });
      setSelectedUser(null);
      setSearchQuery('');
      setSearchResults([]);
      fetchStaff();
    } catch {
      enqueueSnackbar('Atama başarısız', { variant: 'error' });
    } finally { setAdding(false); }
  };

  const handleRemove = async (email: string, name?: string) => {
    if (!window.confirm(`${name || email} kaldırılsın mı?`)) return;
    try {
      await api.delete(`/tickets/admin/events/${eventId}/checkin-staff/${encodeURIComponent(email)}`);
      enqueueSnackbar('Personel kaldırıldı', { variant: 'success' });
      fetchStaff();
    } catch {
      enqueueSnackbar('Kaldırma başarısız', { variant: 'error' });
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
        <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase" letterSpacing={0.5}>
          Check-in Personeli ({staff.length})
        </Typography>
        <Tooltip title="Yenile">
          <IconButton size="small" onClick={fetchStaff} disabled={loading}>
            {loading ? <CircularProgress size={14} /> : <RefreshIcon sx={{ fontSize: 16 }} />}
          </IconButton>
        </Tooltip>
      </Stack>

      {/* Personel Listesi */}
      {staff.length > 0 ? (
        <Stack spacing={1} sx={{ mb: 2 }}>
          {staff.map(s => (
            <Box key={s.id} sx={{
              display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5,
              borderRadius: 2, bgcolor: alpha(theme.palette.success.main, 0.04),
              border: `1px solid ${alpha(theme.palette.success.main, 0.15)}`,
            }}>
              <Avatar sx={{ width: 32, height: 32, fontSize: 12, bgcolor: theme.palette.success.main }}>
                {(s.displayName || s.email)[0].toUpperCase()}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={600} noWrap>{s.displayName || s.email.split('@')[0]}</Typography>
                <Typography variant="caption" color="text.secondary" noWrap>{s.email}</Typography>
              </Box>
              <Chip label="Aktif" size="small" color="success" variant="outlined" sx={{ height: 20, fontSize: 10 }} />
              <Tooltip title="Kaldır">
                <IconButton size="small" onClick={() => handleRemove(s.email, s.displayName)} sx={{ color: 'error.main' }}>
                  <DeleteIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </Box>
          ))}
        </Stack>
      ) : (
        <Box sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.50', borderRadius: 2, mb: 2 }}>
          <Typography variant="caption" color="text.secondary">Henüz personel atanmadı</Typography>
        </Box>
      )}

      {/* Kullanıcı Arama + Atama */}
      <Box sx={{ p: 2, borderRadius: 2, border: '1px dashed', borderColor: 'divider', bgcolor: 'grey.50' }}>
        <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 1, display: 'block' }}>
          Personel Ekle
        </Typography>
        <Stack spacing={1.5}>
          <Autocomplete
            size="small"
            options={searchResults}
            getOptionLabel={(o) => `${o.displayName} (${o.email})`}
            filterOptions={(x) => x}
            loading={searching}
            value={selectedUser}
            onChange={(_, v) => setSelectedUser(v)}
            onInputChange={(_, v) => setSearchQuery(v)}
            noOptionsText={searchQuery.length < 2 ? 'En az 2 karakter yazın...' : 'Kullanıcı bulunamadı'}
            loadingText="Aranıyor..."
            isOptionEqualToValue={(a, b) => a.id === b.id}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Ad, soyad veya e-posta ile ara..."
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <>
                      <InputAdornment position="start">
                        <SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                      </InputAdornment>
                      {params.InputProps.startAdornment}
                    </>
                  ),
                }}
              />
            )}
            renderOption={(props, option) => (
              <Box component="li" {...props} key={option.id} sx={{ display: 'flex', gap: 1.5, py: 1 }}>
                <Avatar src={option.imageUrl} sx={{ width: 28, height: 28, fontSize: 11 }}>
                  {option.displayName[0]?.toUpperCase()}
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={600} noWrap>{option.displayName}</Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>{option.email}</Typography>
                </Box>
              </Box>
            )}
          />
          <Button
            variant="contained" size="small" startIcon={<AddIcon />}
            disabled={adding || !selectedUser}
            onClick={handleAdd}
            sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}
          >
            {adding ? <CircularProgress size={16} /> : 'Personel Ata'}
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}
