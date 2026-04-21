/**
 * Events — Premium Card-Based Redesign
 * Optimized for high-end aesthetics, subtle animations, and clear data visualization.
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRole } from '../../hooks/useRole';
import { adminOperationsService } from '../../services/admin/adminOperationsService';
import {
  Box,
  Typography,
  Button,
  Stack,
  Avatar,
  TextField,
  InputAdornment,
  Chip,
  LinearProgress,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
  Autocomplete,
  CircularProgress,
  Skeleton,
  alpha,
  Grid,
  Paper,
  Tooltip,
  Zoom,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Event as EventIcon,
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  ConfirmationNumber as TicketIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreIcon,
  PauseCircle as PauseIcon,
  PlayCircle as PlayIcon,
  LocationOn as LocationIcon,
  Category as CategoryIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  Person as PersonIcon,
  CloudUpload as CloudUploadIcon,
  InsertPhoto as PhotoIcon,
  ArrowForwardIos as ChevronIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { formatDate, formatTime } from '../../utils/dateUtils';
import { debounce } from 'lodash';
import { useSnackbar } from 'notistack';

import { useEvent } from '../../hooks/useEvent';
import { EventResponseDTO, EventStatus, EventSearchDTO, EventCategoryDto } from '../../types/events/eventModel';
import { AddressDTO } from '../../types/businesses/addressModel';
import { associationService } from '../../services/association/associationService';
import { AssociationSummaryResponse } from '../../types/association/associationSummaryResponse';
import { useEventCategories } from '../../hooks/useEventCategories';
import { searchPlaces, getPlaceDetails, PlacePrediction, loadGoogleMapsScript } from '../../services/google/googlePlacesService';

// Layout Components
import { PageContainer, PageHeader } from '../../components/Page';
import { ConfirmDialog } from '../../components/Feedback';
import { FormSection, FormGrid } from '../../components/Form';
import UserSearchAutocomplete from '../../components/UserSearchAutocomplete';
import { UserDTO } from '../../types/users/userModel';

// ─── PREMIUM STYLES ──────────────────────────────────────
const glassCardSx = {
  bgcolor: 'background.paper',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 3,
  overflow: 'hidden',
  transition: 'all 0.2s ease',
  position: 'relative' as const,
  '&:hover': {
    borderColor: 'primary.light',
    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
    transform: 'translateY(-2px)',
    '& .chevron-icon': { transform: 'translateX(4px)', opacity: 1 },
  },
};

const statCardSx = (color: string) => ({
  p: 2.5,
  borderRadius: 3,
  bgcolor: 'background.paper',
  border: '1px solid',
  position: 'relative' as const,
  overflow: 'hidden',
  background: `linear-gradient(135deg, ${alpha(color, 0.06)} 0%, ${alpha(color, 0.02)} 100%)`,
  borderColor: alpha(color, 0.12),
  transition: 'all 0.2s ease',
  '&:hover': {
    borderColor: alpha(color, 0.25),
    boxShadow: `0 8px 24px ${alpha(color, 0.12)}`,
  },
});

// ─── COMPONENT ──────────────────────────────────────────
export default function Events() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();

  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  // Dialog & Menu States
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventResponseDTO | undefined>();
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<EventResponseDTO | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuEvent, setMenuEvent] = useState<EventResponseDTO | null>(null);

  // Admin Create Dialog
  const [selectedOwner, setSelectedOwner] = useState<UserDTO | null>(null);
  const [createFormData, setCreateFormData] = useState({
    name: '',
    description: '',
    maxParticipants: 100,
    ticketPrice: 0,
    eventTime: '',
    endTime: '',
    city: '',
  });
  const [eventImage, setEventImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { isAdmin } = useRole();

  const {
    events: allEvents,
    loading,
    getPopularEvents,
    createEvent,
    createEventAsAdmin,
    updateEvent,
    deleteEvent,
    updateActiveStatus,
  } = useEvent();

  // Organizatör kendi etkinliklerini görür
  const [myEvents, setMyEvents] = useState<EventResponseDTO[]>([]);
  const [myEventsLoading, setMyEventsLoading] = useState(false);
  const events = isAdmin ? allEvents : myEvents;
  const effectiveLoading = isAdmin ? loading : myEventsLoading;

  // ─── DATA FETCHING ────────────────────────────────
  const fetchEventsData = useCallback(async () => {
    if (isAdmin) {
      const searchParams: EventSearchDTO = {
        keyword: searchQuery,
        isUpcoming: true,
      };
      await getPopularEvents(searchParams, page, rowsPerPage);
    } else {
      setMyEventsLoading(true);
      try {
        const res = await adminOperationsService.getMyEvents();
        const list = Array.isArray(res) ? res : (res as any)?.data ?? [];
        setMyEvents(list);
      } catch { setMyEvents([]); }
      finally { setMyEventsLoading(false); }
    }
  }, [isAdmin, getPopularEvents, page, rowsPerPage, searchQuery]);

  useEffect(() => { fetchEventsData(); }, [fetchEventsData]);

  // ─── STATS ────────────────────────────────────────
  const stats = useMemo(() => ({
    total: events?.length || 0,
    active: events?.filter(e => e.status === EventStatus.ACTIVE).length || 0,
    participants: events?.reduce((acc, e) => acc + (e.currentParticipants || 0), 0) || 0,
    revenue: events?.reduce((acc, e) => acc + ((e.ticketPrice || 0) * (e.currentParticipants || 0)), 0) || 0,
  }), [events]);

  const filteredEvents = useMemo(() => {
    if (!events) return [];
    switch (activeFilter) {
      case 'active': return events.filter(e => e.status === EventStatus.ACTIVE);
      case 'full': return events.filter(e => (e.currentParticipants || 0) >= (e.maxParticipants || Infinity));
      case 'past': return events.filter(e => new Date(e.eventTime || '') < new Date());
      default: return events;
    }
  }, [events, activeFilter]);

  // ─── HANDLERS ─────────────────────────────────────
  const handleSearchChange = debounce((value: string) => {
    setSearchQuery(value);
    setPage(0);
  }, 500);

  const handleOpenCreateDialog = () => {
    setSelectedOwner(null);
    setCreateFormData({ name: '', description: '', maxParticipants: 100, ticketPrice: 0, eventTime: '', endTime: '', city: '' });
    setEventImage(null);
    setImagePreview(null);
    setOpenDialog(true);
  };

  const handleCreateAsAdmin = async () => {
    if (!selectedOwner) {
      enqueueSnackbar('Lütfen etkinliğin sahibi olacak kullanıcıyı seçin', { variant: 'warning' });
      return;
    }
    if (!createFormData.name.trim()) {
      enqueueSnackbar('Etkinlik adı zorunludur', { variant: 'warning' });
      return;
    }
    try {
      const eventPayload = {
        name: createFormData.name,
        description: createFormData.description,
        maxParticipants: createFormData.maxParticipants,
        ticketPrice: createFormData.ticketPrice,
        eventTime: createFormData.eventTime || undefined,
        endTime: createFormData.endTime || undefined,
        status: EventStatus.ACTIVE,
        address: createFormData.city ? { city: createFormData.city, country: 'Türkiye', district: '', id: '', isDefault: true } as AddressDTO : undefined,
      } as Omit<EventResponseDTO, 'id'>;

      await createEventAsAdmin(eventPayload, selectedOwner.id, eventImage || undefined);
      setOpenDialog(false);
      fetchEventsData();
      enqueueSnackbar(`Etkinlik "${createFormData.name}" ${selectedOwner.firstName || selectedOwner.email} adına oluşturuldu`, { variant: 'success' });
    } catch { /* hook handles */ }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEventImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // ─── RENDER HELPERS ───────────────────────────────
  const getFillPercent = (e: EventResponseDTO) => {
    if (!e.maxParticipants) return 0;
    return Math.min(100, Math.round(((e.currentParticipants || 0) / e.maxParticipants) * 100));
  };

  // ─── UI ───────────────────────────────────────────
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', pb: 8 }}>
      <PageContainer>
        <PageHeader
          title="Etkinlik Yönetimi"
          subtitle="Topluluk etkinliklerinizi ve biletlerinizi organize edin, takip edin ve yönetin."
          actions={
            <Stack direction="row" spacing={1}>
             
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate('/event-creation')}
                sx={{
                  borderRadius: 2.5, px: 3, py: 1, textTransform: 'none', fontWeight: 700,
                  boxShadow: '0 4px 14px 0 rgba(30, 107, 60, 0.39)',
                  '&:hover': { boxShadow: '0 6px 20px rgba(30, 107, 60, 0.23)' },
                }}
              >
                Yeni Etkinlik Oluştur
              </Button>
            </Stack>
          }
          breadcrumbs={[
            { label: 'Kontrol Paneli', href: '/' },
            { label: 'Etkinlikler', active: true },
          ]}
        />

        {/* ═══ TOP-LEVEL LOADING INDICATOR ═══ */}
        {effectiveLoading && (
          <Box sx={{ mb: 2 }}>
            <LinearProgress
              sx={{
                height: 3,
                borderRadius: 2,
                bgcolor: alpha('#1e6b3c', 0.08),
                '& .MuiLinearProgress-bar': { bgcolor: '#1e6b3c' },
              }}
            />
          </Box>
        )}

        {/* ═══ STAT CARDS ═══ */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {[
            { label: 'Toplam Etkinlik', value: stats.total, icon: <EventIcon />, color: '#1e6b3c' },
            { label: 'Aktif Etkinlikler', value: stats.active, icon: <TrendingUpIcon />, color: '#22c55e' },
            { label: 'Toplam Katılım', value: stats.participants, icon: <PeopleIcon />, color: '#3b82f6' },
            { label: 'Tahmini Gelir', value: `₺${stats.revenue.toLocaleString()}`, icon: <TicketIcon />, color: '#f59e0b' },
          ].map((stat, i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Box sx={statCardSx(stat.color)}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={1}>
                      {stat.label}
                    </Typography>
                    {effectiveLoading ? (
                      <Skeleton variant="text" width="70%" height={44} sx={{ mt: 0.75 }} />
                    ) : (
                      <Typography variant="h4" fontWeight={800} sx={{ mt: 0.75, color: stat.color }}>
                        {stat.value}
                      </Typography>
                    )}
                  </Box>
                  <Avatar sx={{ bgcolor: alpha(stat.color, 0.12), color: stat.color, width: 48, height: 48, borderRadius: 2.5 }}>
                    {stat.icon}
                  </Avatar>
                </Stack>
              </Box>
            </Grid>
          ))}
        </Grid>

        {/* ═══ SEARCH & FILTERS ═══ */}
        <Box sx={{
          bgcolor: 'background.paper',
          p: 2,
          borderRadius: 3,
          mb: 3,
          border: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: 'center',
          gap: 2,
        }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Etkinlik adına veya konuma göre ara..."
            onChange={(e) => handleSearchChange(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ color: 'text.disabled', mr: 1, fontSize: 20 }} />,
              sx: { borderRadius: 2, bgcolor: 'background.default', '&:hover': { bgcolor: alpha('#000', 0.02) } },
            }}
          />
          <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
            {[
              { id: 'all', label: 'Tümü' },
              { id: 'active', label: 'Aktif' },
              { id: 'full', label: 'Dolu' },
              { id: 'past', label: 'Geçmiş' },
            ].map((f) => (
              <Chip
                key={f.id}
                label={f.label}
                onClick={() => setActiveFilter(f.id)}
                color={activeFilter === f.id ? 'primary' : 'default'}
                variant={activeFilter === f.id ? 'filled' : 'outlined'}
                sx={{
                  fontWeight: 600,
                  borderRadius: 2,
                  px: 1,
                  height: 36,
                  borderColor: activeFilter === f.id ? 'primary.main' : 'divider',
                }}
              />
            ))}
          </Stack>
        </Box>

        {/* ═══ EVENTS LIST ═══ */}
        <Stack spacing={2}>
          {effectiveLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Box key={i} sx={{ ...glassCardSx, p: 2.5 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '80px 1.5fr 1fr 1.2fr 100px 130px' }, gap: 3, alignItems: 'center' }}>
                  <Skeleton variant="rounded" width={80} height={80} sx={{ borderRadius: 3 }} />
                  <Box>
                    <Skeleton variant="text" width="70%" height={24} />
                    <Skeleton variant="text" width="40%" height={16} sx={{ mt: 0.5 }} />
                  </Box>
                  <Box>
                    <Skeleton variant="text" width="60%" height={14} />
                    <Skeleton variant="text" width="80%" height={18} sx={{ mt: 0.5 }} />
                    <Skeleton variant="text" width="30%" height={14} />
                  </Box>
                  <Box>
                    <Skeleton variant="text" width="50%" height={14} />
                    <Skeleton variant="rounded" width="100%" height={8} sx={{ mt: 1, borderRadius: 4 }} />
                    <Skeleton variant="text" width="40%" height={14} sx={{ mt: 0.5 }} />
                  </Box>
                  <Skeleton variant="rounded" width={60} height={24} sx={{ borderRadius: 2 }} />
                  <Skeleton variant="circular" width={32} height={32} />
                </Box>
              </Box>
            ))
          ) : filteredEvents.length === 0 ? (
            <Box sx={{ py: 10, textAlign: 'center', bgcolor: 'background.paper', borderRadius: 4 }}>
              <Typography variant="h5" color="text.disabled" fontWeight={700}>Henüz Etkinlik Yok</Typography>
              <Typography variant="body2" color="text.secondary">Yeni bir etkinlik oluşturarak başlayın.</Typography>
            </Box>
          ) : (
            filteredEvents.map((event) => {
              const fill = getFillPercent(event);
              const isFull = fill >= 100;

              return (
                <Box
                  key={event.id}
                  sx={glassCardSx}
                  onClick={() => navigate(`/event-console/${event.id}`)}
                >
                  <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: '80px 1.5fr 1fr 1.2fr 100px 130px' },
                    gap: 3,
                    alignItems: 'center',
                    p: 2.5,
                  }}>
                    {/* Thumbnail */}
                    <Avatar
                      src={event.image}
                      variant="rounded"
                      sx={{ width: 80, height: 80, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
                    >
                      <EventIcon />
                    </Avatar>

                    {/* Basic Info */}
                    <Box>
                      <Typography variant="subtitle1" fontWeight={800} sx={{ color: 'text.primary', lineClamp: 1, overflow: 'hidden' }}>
                        {event.name}
                      </Typography>
                      <Stack direction="row" spacing={2} sx={{ mt: 0.5, color: 'text.secondary' }}>
                        <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <LocationIcon sx={{ fontSize: 14 }} /> {event.address?.city || 'İstanbul'}
                        </Typography>
                        <Chip label={event.category?.name || 'Genel'} size="small" sx={{ height: 20, fontSize: 10, fontWeight: 700 }} />
                      </Stack>
                    </Box>

                    {/* Timing */}
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase">Tarih & Saat</Typography>
                      <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5 }}>
                        {formatDate(event.eventTime)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatTime(event.eventTime)}
                      </Typography>
                    </Box>

                    {/* Capacity */}
                    <Box>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-end" sx={{ mb: 0.8 }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={700}>Katılımcı Doluluğu</Typography>
                        <Typography variant="caption" fontWeight={800} color={isFull ? 'error.main' : 'primary.main'}>
                          {event.currentParticipants || 0} / {event.maxParticipants || 0}
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={fill}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          bgcolor: '#f1f5f9',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 4,
                            bgcolor: fill > 80 ? '#ef4444' : fill > 50 ? '#f59e0b' : '#1e6b3c',
                          }
                        }}
                      />
                    </Box>

                    {/* Status */}
                    <Box sx={{ textAlign: 'center' }}>
                      <Chip
                        label={event.status === EventStatus.ACTIVE ? 'AKTİF' : 'PASİF'}
                        color={event.status === EventStatus.ACTIVE ? 'success' : 'default'}
                        variant="outlined"
                        sx={{ fontWeight: 800, fontSize: 11, px: 1 }}
                      />
                    </Box>

                    {/* Action — tek doğruluk kaynağı: Operasyon Konsolu */}
                    <Button
                      size="small"
                      variant="contained"
                      endIcon={<ChevronIcon sx={{ fontSize: 16 }} />}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/event-console/${event.id}`);
                      }}
                      sx={{
                        textTransform: 'none',
                        fontWeight: 700,
                        fontSize: 11,
                        px: 1.5, py: 0.5,
                        borderRadius: 1.5,
                        bgcolor: '#F8FAFC',
                        color: '#C9A227',
                        '&:hover': { bgcolor: '#1a2b1f' },
                        whiteSpace: 'nowrap',
                        '& .MuiButton-endIcon': { ml: 0.25 },
                      }}
                    >
                      Konsola Git
                    </Button>
                  </Box>
                </Box>
              );
            })
          )}
        </Stack>
      </PageContainer>

      {/* ═══ ADMIN CREATE DIALOG ═══ */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <PersonIcon color="primary" />
            <Box>
              <Typography variant="h6" fontWeight={800}>Kullanıcı Adına Etkinlik Oluştur</Typography>
              <Typography variant="caption" color="text.secondary">
                Seçtiğiniz kullanıcı etkinliğin organizatörü olarak atanır
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {/* Owner picker */}
            <UserSearchAutocomplete
              value={selectedOwner}
              onChange={setSelectedOwner}
              label="Etkinlik Sahibi *"
              placeholder="Kullanıcı adı veya e-posta ile ara..."
              helperText="Bu kullanıcı etkinliğin organizatörü olarak görünecek"
              required
            />

            {selectedOwner && (
              <Box sx={{
                p: 1.5, borderRadius: 2, bgcolor: alpha('#10b981', 0.06),
                border: `1px solid ${alpha('#10b981', 0.15)}`,
              }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Avatar src={selectedOwner.imageUrl} sx={{ width: 32, height: 32, fontSize: 13, bgcolor: alpha('#10b981', 0.15), color: '#10b981' }}>
                    {selectedOwner.firstName?.[0]}
                  </Avatar>
                  <Box>
                    <Typography variant="body2" fontWeight={700}>
                      {selectedOwner.displayName || `${selectedOwner.firstName} ${selectedOwner.lastName}`}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">{selectedOwner.email}</Typography>
                  </Box>
                </Stack>
              </Box>
            )}

            <TextField
              label="Etkinlik Adı *"
              value={createFormData.name}
              onChange={(e) => setCreateFormData(prev => ({ ...prev, name: e.target.value }))}
              fullWidth
              size="small"
            />

            <TextField
              label="Açıklama"
              value={createFormData.description}
              onChange={(e) => setCreateFormData(prev => ({ ...prev, description: e.target.value }))}
              fullWidth
              size="small"
              multiline
              rows={3}
            />

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Başlangıç Tarihi"
                  type="datetime-local"
                  value={createFormData.eventTime}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, eventTime: e.target.value }))}
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Bitiş Tarihi"
                  type="datetime-local"
                  value={createFormData.endTime}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, endTime: e.target.value }))}
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid item xs={4}>
                <TextField
                  label="Maks. Katılımcı"
                  type="number"
                  value={createFormData.maxParticipants}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, maxParticipants: parseInt(e.target.value) || 0 }))}
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  label="Bilet Fiyatı (₺)"
                  type="number"
                  value={createFormData.ticketPrice}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, ticketPrice: parseFloat(e.target.value) || 0 }))}
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  label="Şehir"
                  value={createFormData.city}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, city: e.target.value }))}
                  fullWidth
                  size="small"
                  placeholder="İstanbul"
                />
              </Grid>
            </Grid>

            {/* Image upload */}
            <Box>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleImageSelect}
                style={{ display: 'none' }}
              />
              {imagePreview ? (
                <Box sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                  <Box component="img" src={imagePreview} sx={{ width: '100%', height: 160, objectFit: 'cover' }} />
                  <IconButton
                    size="small"
                    onClick={() => { setEventImage(null); setImagePreview(null); }}
                    sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'rgba(0,0,0,0.5)', color: 'white', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' } }}
                  >
                    <CloseIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Box>
              ) : (
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<CloudUploadIcon />}
                  onClick={() => fileInputRef.current?.click()}
                  sx={{
                    py: 3, borderStyle: 'dashed', borderRadius: 2, textTransform: 'none',
                    color: 'text.secondary', borderColor: 'divider',
                  }}
                >
                  Etkinlik Görseli Yükle
                </Button>
              )}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setOpenDialog(false)} sx={{ textTransform: 'none', borderRadius: 2 }}>
            İptal
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateAsAdmin}
            disabled={!selectedOwner || !createFormData.name.trim()}
            startIcon={<SaveIcon />}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
          >
            Oluştur
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        open={isConfirmDeleteOpen}
        title="Etkinliği Sil"
        message={`"${eventToDelete?.name}" etkinliğini silmek istiyor musunuz? Bu işlem geri alınamaz.`}
        severity="error"
        onConfirm={async () => {
          if (eventToDelete) {
            await deleteEvent(eventToDelete.id, eventToDelete.organizerId);
            setIsConfirmDeleteOpen(false);
            fetchEventsData();
          }
        }}
        onClose={() => setIsConfirmDeleteOpen(false)}
      />
    </Box>
  );
}
