/**
 * Events — Card-based event list with progress bars, filter chips, and stat cards
 * Redesigned to match the reference nartgo-events-redesign.html
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  alpha,
  Grid,
} from '@mui/material';
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
  Place as PlaceIcon,
  MyLocation as MyLocationIcon,
} from '@mui/icons-material';
import { useEvent } from '../../hooks/useEvent';
import { format } from 'date-fns';
import { EventResponseDTO, EventStatus, EventSearchDTO, EventCategoryDto } from '../../types/events/eventModel';
import { AddressDTO } from '../../types/businesses/addressModel';
import { debounce } from 'lodash';
import { associationService } from '../../services/association/associationService';
import { AssociationSummaryResponse } from '../../types/association/associationSummaryResponse';
import { useEventCategories } from '../../hooks/useEventCategories';
import { searchPlaces, getPlaceDetails, PlacePrediction, loadGoogleMapsScript } from '../../services/google/googlePlacesService';
import { useSnackbar } from 'notistack';

// Standardized components
import { PageContainer, PageHeader } from '../../components/Page';
import { StatCard } from '../../components/Data';
import { ConfirmDialog } from '../../components/Feedback';
import { FormSection, FormGrid } from '../../components/Form';
import { useRef } from 'react';

// ─── STYLES ──────────────────────────────────────────────
const cardSx = {
  bgcolor: 'background.paper',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 3,
  overflow: 'hidden',
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  cursor: 'pointer',
  transition: 'all 0.15s',
  position: 'relative' as const,
  '&:hover': {
    borderColor: 'success.light',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    transform: 'translateY(-1px)',
  },
};

// ─── INTERFACES ──────────────────────────────────────────
interface OrganizerOption {
  ownerId: string;
  associationName: string;
  logoUrl?: string;
  coverImageUrl?: string;
}

// ─── COMPONENT ──────────────────────────────────────────
export default function Events() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPastEvents, setShowPastEvents] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  // Dialog States
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventResponseDTO | undefined>();
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<EventResponseDTO | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<EventResponseDTO>>({});

  // Organizer State
  const [organizerOptions, setOrganizerOptions] = useState<OrganizerOption[]>([]);
  const [selectedOrganizer, setSelectedOrganizer] = useState<OrganizerOption | null>(null);
  const [loadingOrganizers, setLoadingOrganizers] = useState(false);

  // Category State
  const [selectedCategory, setSelectedCategory] = useState<EventCategoryDto | null>(null);

  // Image State
  const [eventImage, setEventImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Google Places State
  const [placeSearchInput, setPlaceSearchInput] = useState('');
  const [placePredictions, setPlacePredictions] = useState<PlacePrediction[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlacePrediction | null>(null);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);

  // Action menu
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuEvent, setMenuEvent] = useState<EventResponseDTO | null>(null);

  const {
    events,
    loading,
    getPopularEvents,
    createEvent,
    createEventAsAdmin,
    updateEvent,
    deleteEvent,
    updateActiveStatus,
  } = useEvent();

  const { categories, fetchCategories } = useEventCategories();

  // ─── DATA FETCHING ────────────────────────────────
  const fetchEvents = useCallback(async () => {
    const searchParams: EventSearchDTO = {
      keyword: searchQuery,
      isUpcoming: !showPastEvents,
    };
    await getPopularEvents(searchParams, page, rowsPerPage);
  }, [getPopularEvents, page, rowsPerPage, searchQuery, showPastEvents]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  useEffect(() => {
    loadGoogleMapsScript()
      .then(() => setGoogleMapsLoaded(true))
      .catch(() => setGoogleMapsLoaded(false));
  }, []);

  const fetchOrganizers = useCallback(async () => {
    setLoadingOrganizers(true);
    try {
      const response = await associationService.getAllAssociations('', 0, 100);
      const associations = response.data?.content || [];
      setOrganizerOptions(associations.map((a: AssociationSummaryResponse) => ({
        ownerId: a.ownerId, associationName: a.name, logoUrl: a.logoUrl, coverImageUrl: a.coverImageUrl,
      })));
    } catch { /* silently handle */ }
    finally { setLoadingOrganizers(false); }
  }, []);

  const debouncedPlaceSearch = useMemo(
    () => debounce(async (input: string) => {
      if (!input || input.length < 3) { setPlacePredictions([]); return; }
      setLoadingPlaces(true);
      try { setPlacePredictions(await searchPlaces(input)); }
      catch { setPlacePredictions([]); }
      finally { setLoadingPlaces(false); }
    }, 400),
    []
  );

  const handleSearchChange = debounce((value: string) => {
    setSearchQuery(value);
    setPage(0);
  }, 500);

  // ─── STATS ────────────────────────────────────────
  const stats = useMemo(() => ({
    total: events?.length || 0,
    active: events?.filter(e => e.status === EventStatus.ACTIVE).length || 0,
    participants: events?.reduce((acc, e) => acc + (e.currentParticipants || 0), 0) || 0,
    revenue: events?.reduce((acc, e) => acc + ((e.ticketPrice || 0) * (e.currentParticipants || 0)), 0) || 0,
  }), [events]);

  // ─── FILTERED EVENTS ─────────────────────────────
  const filteredEvents = useMemo(() => {
    if (!events) return [];
    switch (activeFilter) {
      case 'active': return events.filter(e => e.status === EventStatus.ACTIVE);
      case 'full': return events.filter(e => (e.currentParticipants || 0) >= (e.maxParticipants || Infinity));
      case 'past': return events.filter(e => e.status !== EventStatus.ACTIVE);
      default: return events;
    }
  }, [events, activeFilter]);

  // ─── HANDLERS ─────────────────────────────────────
  const handleOpenDialog = (event?: EventResponseDTO) => {
    if (event) {
      setSelectedEvent(event);
      setFormData({ ...event });
      setSelectedOrganizer(null);
      setEventImage(null);
      setImagePreview(event.image || null);
      setSelectedCategory(event.category || null);
      setSelectedPlace(null);
      setPlaceSearchInput('');
    } else {
      setSelectedEvent(undefined);
      setFormData({ status: EventStatus.ACTIVE, isRegistrationOpen: true, maxParticipants: 100, ticketPrice: 0 });
      setSelectedOrganizer(null);
      setEventImage(null);
      setImagePreview(null);
      setSelectedCategory(null);
      setSelectedPlace(null);
      setPlaceSearchInput('');
    }
    setOpenDialog(true);
    fetchOrganizers();
    fetchCategories();
  };

  const handleCategoryChange = (_e: any, newValue: EventCategoryDto | null) => {
    setSelectedCategory(newValue);
    if (newValue) setFormData({ ...formData, category: newValue });
    else { const { category, ...rest } = formData; setFormData(rest); }
  };

  const handlePlaceSelect = async (_e: any, newValue: PlacePrediction | null) => {
    setSelectedPlace(newValue);
    if (newValue) {
      const details = await getPlaceDetails(newValue.place_id);
      if (details) setFormData({ ...formData, address: { ...formData.address, ...details } as AddressDTO });
    } else {
      setFormData({ ...formData, address: undefined });
    }
  };

  const handleImageSelect = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setEventImage(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSaveEvent = async () => {
    try {
      if (selectedEvent) {
        await updateEvent(selectedEvent.id, formData as any);
      } else {
        if (selectedOrganizer) await createEventAsAdmin(formData as any, selectedOrganizer.ownerId, eventImage || undefined);
        else await createEvent(formData as any);
      }
      setOpenDialog(false);
      fetchEvents();
    } catch { /* handled by hook */ }
  };

  const handleDeleteConfirm = async () => {
    if (!eventToDelete) return;
    await deleteEvent(eventToDelete.id, eventToDelete.organizerId);
    setIsConfirmDeleteOpen(false);
    setEventToDelete(null);
    fetchEvents();
  };

  const handleToggleStatus = async (event: EventResponseDTO) => {
    const newStatus = event.status === EventStatus.ACTIVE ? EventStatus.PASSIVE : EventStatus.ACTIVE;
    await updateActiveStatus(event.id, newStatus);
    fetchEvents();
  };

  // ─── HELPER ───────────────────────────────────────
  const getFillPercent = (e: EventResponseDTO) => {
    if (!e.maxParticipants) return 0;
    return Math.round(((e.currentParticipants || 0) / e.maxParticipants) * 100);
  };

  const getEventEmoji = (category?: string) => {
    if (!category) return '📅';
    if (category.includes('Festival') || category.includes('Şenlik')) return '🎵';
    if (category.includes('Spor')) return '⚽';
    if (category.includes('Düğün')) return '💃';
    if (category.includes('Eğitim')) return '📚';
    if (category.includes('Teknoloji')) return '💻';
    return '🎸';
  };

  // ─── RENDER ───────────────────────────────────────
  return (
    <PageContainer>
      <PageHeader
        title="Etkinlik Yönetimi"
        subtitle="Tüm etkinlikleri buradan yönetin, izleyin ve müdahale edin."
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/ticket-creation')}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
          >+ Yeni Etkinlik</Button>
        }
        breadcrumbs={[
          { label: 'Kontrol Paneli', href: '/' },
          { label: 'Etkinlikler', active: true },
        ]}
      />

      {/* ═══ STAT CARDS ═══ */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Toplam Etkinlik" value={String(stats.total)} icon={<EventIcon />} color="primary" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Aktif Etkinlik" value={String(stats.active)} icon={<TrendingUpIcon />} color="success" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Toplam Katılım" value={String(stats.participants)} icon={<PeopleIcon />} color="info" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Tahmini Gelir" value={`₺${stats.revenue.toLocaleString()}`} icon={<TicketIcon />} color="warning" />
        </Grid>
      </Grid>

      {/* ═══ SEARCH + FILTERS ═══ */}
      <Box sx={{
        bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 3,
        px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, mb: 2,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}>
        <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
        <TextField
          variant="standard"
          placeholder="Etkinlik adı, konum veya kategori ara..."
          fullWidth
          InputProps={{ disableUnderline: true, sx: { fontSize: 14 } }}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
        <Stack direction="row" spacing={1}>
          {[
            { key: 'all', label: `Tümü (${stats.total})` },
            { key: 'active', label: `Aktif (${stats.active})` },
            { key: 'full', label: 'Dolu' },
            { key: 'past', label: 'Geçmiş' },
          ].map(chip => (
            <Chip
              key={chip.key}
              label={chip.label}
              size="small"
              variant={activeFilter === chip.key ? 'filled' : 'outlined'}
              color={activeFilter === chip.key ? 'primary' : 'default'}
              onClick={() => setActiveFilter(chip.key)}
              sx={{
                fontWeight: activeFilter === chip.key ? 600 : 500,
                borderRadius: 5,
                cursor: 'pointer',
                fontSize: 12.5,
              }}
            />
          ))}
        </Stack>
      </Box>

      {/* ═══ EVENT CARDS ═══ */}
      <Stack spacing={1.25}>
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Box key={i} sx={{ ...cardSx, cursor: 'default', p: 2.5, height: 90, opacity: 0.5 }} />
          ))
        ) : filteredEvents.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
            <Typography sx={{ fontSize: 40, mb: 1 }}>📅</Typography>
            <Typography variant="subtitle1" fontWeight={600}>Etkinlik bulunamadı</Typography>
            <Typography variant="body2" color="text.secondary">Arama veya filtreleri değiştirin.</Typography>
          </Box>
        ) : (
          filteredEvents.map((event) => {
            const fill = getFillPercent(event);
            const hasWarning = (event.currentParticipants || 0) === 0 && event.status === EventStatus.ACTIVE;
            const isFilling = fill > 70;

            return (
              <Box
                key={event.id}
                sx={{
                  ...cardSx,
                  display: 'grid',
                  gridTemplateColumns: '60px 1fr auto auto auto auto',
                  gap: 2,
                  alignItems: 'center',
                  px: 2.5,
                  py: 2,
                  ...(hasWarning && { borderLeft: '3px solid', borderLeftColor: 'error.main' }),
                  ...(isFilling && !hasWarning && { borderLeft: '3px solid', borderLeftColor: 'warning.main' }),
                }}
                onClick={() => navigate(`/events/${event.id}`)}
              >
                {/* Thumbnail */}
                <Avatar
                  src={event.image}
                  variant="rounded"
                  sx={{ width: 60, height: 60, borderRadius: 2.5, bgcolor: 'grey.100', fontSize: 24, border: '1px solid', borderColor: 'divider' }}
                >
                  {getEventEmoji(event.category?.name)}
                </Avatar>

                {/* Info */}
                <Box>
                  <Typography variant="body2" fontWeight={700} sx={{ mb: 0.3 }}>{event.name}</Typography>
                  <Stack direction="row" spacing={1.5} sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                    <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                      📍 {event.address?.city || 'Sanal'}
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                      🏷 {event.category?.name || 'Genel'}
                    </Typography>
                    {hasWarning && (
                      <Typography variant="caption" color="error.main" fontWeight={600}>
                        ⚠ Hiç katılımcı yok
                      </Typography>
                    )}
                    {isFilling && !hasWarning && (
                      <Typography variant="caption" color="warning.main" fontWeight={600}>
                        ⚠ Kapasite dolmak üzere
                      </Typography>
                    )}
                  </Stack>
                </Box>

                {/* Date */}
                <Box sx={{ textAlign: 'center', minWidth: 90 }}>
                  <Typography variant="body2" fontWeight={600}>
                    {event.eventTime ? format(new Date(event.eventTime), 'dd MMM, HH:mm') : '—'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {event.endTime ? `Bitiş: ${format(new Date(event.endTime), 'HH:mm')}` : ''}
                  </Typography>
                </Box>

                {/* Capacity with progress */}
                <Box sx={{ minWidth: 110 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.3}
                    sx={{ fontSize: 11, display: 'block', mb: 0.5 }}
                  >Katılım</Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" fontWeight={600} fontFamily="JetBrains Mono, monospace"
                      sx={{ whiteSpace: 'nowrap', color: hasWarning ? 'error.main' : 'text.primary' }}
                    >
                      {event.currentParticipants || 0}/{event.maxParticipants || 0}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={fill}
                      sx={{
                        flex: 1, height: 5, borderRadius: 3, bgcolor: 'divider',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 3,
                          bgcolor: fill > 80 ? 'error.main' : fill > 50 ? 'warning.main' : 'success.light',
                        },
                      }}
                    />
                  </Stack>
                </Box>

                {/* Status badge */}
                <Chip
                  label={event.status === EventStatus.ACTIVE ? 'Aktif' : event.status}
                  size="small"
                  color={event.status === EventStatus.ACTIVE ? 'success' : 'default'}
                  variant="outlined"
                  sx={{ fontWeight: 600, height: 26, borderRadius: 5 }}
                />

                {/* Action menu */}
                <IconButton
                  size="small"
                  onClick={(e) => { e.stopPropagation(); setAnchorEl(e.currentTarget); setMenuEvent(event); }}
                  sx={{ border: '1.5px solid', borderColor: 'divider', borderRadius: 2, width: 34, height: 34 }}
                >
                  <MoreIcon fontSize="small" />
                </IconButton>
              </Box>
            );
          })
        )}
      </Stack>

      {/* ═══ ACTION MENU ═══ */}
      <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={() => setAnchorEl(null)}
        PaperProps={{ sx: { borderRadius: 2, minWidth: 200 } }}
      >
        <MenuItem onClick={() => { if (menuEvent) navigate(`/events/${menuEvent.id}`); setAnchorEl(null); }}>
          <ListItemIcon><EventIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Detay Sayfası</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { if (menuEvent) navigate(`/ticket-creation/${menuEvent.id}`); setAnchorEl(null); }}>
          <ListItemIcon><TicketIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Bilet Yönetimi</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { if (menuEvent) handleOpenDialog(menuEvent); setAnchorEl(null); }}>
          <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Etkinliği Düzenle</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { if (menuEvent) handleToggleStatus(menuEvent); setAnchorEl(null); }}>
          <ListItemIcon>{menuEvent?.status === EventStatus.ACTIVE ? <PauseIcon fontSize="small" /> : <PlayIcon fontSize="small" />}</ListItemIcon>
          <ListItemText>{menuEvent?.status === EventStatus.ACTIVE ? 'Devre Dışı Bırak' : 'Etkinleştir'}</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { if (menuEvent) { setEventToDelete(menuEvent); setIsConfirmDeleteOpen(true); } setAnchorEl(null); }} sx={{ color: 'error.main' }}>
          <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
          <ListItemText>Etkinliği Sil</ListItemText>
        </MenuItem>
      </Menu>

      {/* ═══ CREATE / EDIT DIALOG ═══ */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" fontWeight={600}>
              {selectedEvent ? 'Etkinliği Düzenle' : 'Yeni Etkinlik Oluştur'}
            </Typography>
            <IconButton onClick={() => setOpenDialog(false)} size="small"><CloseIcon fontSize="small" /></IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 4 }}>
          <Stack spacing={4}>
            {!selectedEvent && (
              <FormSection title="Etkinlik Organizatörü">
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Bu etkinliğin organizatörü olacak dernek hesap sahibini seçin.
                </Typography>
                <Autocomplete
                  options={organizerOptions}
                  getOptionLabel={(option) => option.associationName}
                  value={selectedOrganizer}
                  onChange={(_e, newValue) => setSelectedOrganizer(newValue)}
                  loading={loadingOrganizers}
                  isOptionEqualToValue={(option, value) => option.ownerId === value.ownerId}
                  renderOption={(props, option) => (
                    <Box component="li" {...props} key={option.ownerId}>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar src={option.logoUrl || option.coverImageUrl} sx={{ width: 40, height: 40, bgcolor: (t) => alpha(t.palette.primary.main, 0.1) }}>
                          <PersonIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{option.associationName}</Typography>
                          <Typography variant="caption" color="text.secondary">Owner ID: {option.ownerId.substring(0, 8)}...</Typography>
                        </Box>
                      </Stack>
                    </Box>
                  )}
                  renderInput={(params) => (
                    <TextField {...params} label="Organizatör Seçin (Dernek)" placeholder="Dernek ara..."
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (<><PersonIcon sx={{ color: 'text.secondary', mr: 1 }} />{params.InputProps.startAdornment}</>),
                        endAdornment: (<>{loadingOrganizers ? <CircularProgress color="inherit" size={20} /> : null}{params.InputProps.endAdornment}</>),
                      }}
                    />
                  )}
                />
              </FormSection>
            )}

            <FormSection title="Etkinlik Görseli">
              <input type="file" accept="image/*" ref={fileInputRef}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageSelect(f); }}
                style={{ display: 'none' }}
              />
              {imagePreview ? (
                <Box sx={{ position: 'relative', borderRadius: 3, overflow: 'hidden', border: '2px solid', borderColor: 'divider',
                  '&:hover .image-overlay': { opacity: 1 }
                }}>
                  <Box component="img" src={imagePreview} alt="preview" sx={{ width: '100%', height: 220, objectFit: 'cover' }} />
                  <Box className="image-overlay" sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, opacity: 0, transition: '0.25s' }}>
                    <Button variant="contained" size="small" startIcon={<PhotoIcon />}
                      onClick={() => fileInputRef.current?.click()}
                      sx={{ bgcolor: 'rgba(255,255,255,0.9)', color: 'text.primary', '&:hover': { bgcolor: 'white' } }}
                    >Değiştir</Button>
                    <Button variant="contained" size="small" color="error" startIcon={<DeleteIcon />}
                      onClick={() => { setEventImage(null); setImagePreview(null); }}
                    >Kaldır</Button>
                  </Box>
                </Box>
              ) : (
                <Box
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                  onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files?.[0]; if (f) handleImageSelect(f); }}
                  onClick={() => fileInputRef.current?.click()}
                  sx={{
                    border: '2px dashed', borderColor: isDragging ? 'primary.main' : 'divider', borderRadius: 3,
                    p: 5, textAlign: 'center', cursor: 'pointer',
                    bgcolor: isDragging ? (t) => alpha(t.palette.primary.main, 0.04) : 'transparent',
                    transition: '0.25s',
                    '&:hover': { borderColor: 'primary.main', bgcolor: (t) => alpha(t.palette.primary.main, 0.02) },
                  }}
                >
                  <CloudUploadIcon sx={{ fontSize: 48, color: isDragging ? 'primary.main' : 'text.disabled', mb: 1 }} />
                  <Typography variant="body1" fontWeight={600} color={isDragging ? 'primary.main' : 'text.secondary'}>
                    {isDragging ? 'Görselinizi buraya bırakın' : 'Tıklayın veya sürükleyin'}
                  </Typography>
                  <Typography variant="caption" color="text.disabled">JPG, PNG, WebP · Maks 10MB</Typography>
                </Box>
              )}
            </FormSection>

            <FormSection title="Genel Bilgiler">
              <FormGrid columns={1}>
                <TextField fullWidth label="Etkinlik Adı" placeholder="örn. Yıllık Spor Günü 2024"
                  value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
                <TextField fullWidth multiline rows={3} label="Açıklama" placeholder="Etkinlik hakkında detaylı bilgi..."
                  value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
                <Autocomplete
                  options={categories || []}
                  getOptionLabel={(option) => option.name || ''}
                  value={selectedCategory}
                  onChange={handleCategoryChange}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  renderInput={(params) => (
                    <TextField {...params} fullWidth label="Etkinlik Kategorisi" placeholder="Kategori seçin..."
                      InputProps={{ ...params.InputProps, startAdornment: (<><InputAdornment position="start"><CategoryIcon sx={{ color: 'text.secondary' }} /></InputAdornment>{params.InputProps.startAdornment}</>) }}
                    />
                  )}
                />
              </FormGrid>
            </FormSection>

            <FormSection title="Tarih & Kapasite">
              <FormGrid>
                <TextField fullWidth label="Başlangıç" type="datetime-local" InputLabelProps={{ shrink: true }}
                  value={formData.eventTime ? new Date(formData.eventTime).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setFormData({ ...formData, eventTime: new Date(e.target.value).toISOString() })}
                />
                <TextField fullWidth label="Bitiş" type="datetime-local" InputLabelProps={{ shrink: true }}
                  value={formData.endTime ? new Date(formData.endTime).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setFormData({ ...formData, endTime: new Date(e.target.value).toISOString() })}
                />
                <TextField fullWidth label="Maksimum Katılımcı" type="number"
                  value={formData.maxParticipants || ''} onChange={(e) => setFormData({ ...formData, maxParticipants: parseInt(e.target.value) })}
                />
                <TextField fullWidth label="Minimum Bilet Fiyatı (₺)" type="number"
                  value={formData.ticketPrice || 0} onChange={(e) => setFormData({ ...formData, ticketPrice: parseFloat(e.target.value) })}
                />
              </FormGrid>
            </FormSection>

            <FormSection title="Konum Detayları">
              <Autocomplete
                options={placePredictions}
                getOptionLabel={(o) => o.description}
                value={selectedPlace}
                onChange={handlePlaceSelect}
                onInputChange={(_, v) => { setPlaceSearchInput(v); debouncedPlaceSearch(v); }}
                inputValue={placeSearchInput}
                loading={loadingPlaces}
                noOptionsText={placeSearchInput.length < 3 ? 'En az 3 karakter yazın...' : 'Yer bulunamadı'}
                filterOptions={(x) => x}
                isOptionEqualToValue={(o, v) => o.place_id === v.place_id}
                renderInput={(params) => (
                  <TextField {...params} fullWidth label="Konum Ara (Google Places)" placeholder="Mekan arayın..."
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (<><InputAdornment position="start"><SearchIcon sx={{ color: 'text.secondary' }} /></InputAdornment>{params.InputProps.startAdornment}</>),
                      endAdornment: (<>{loadingPlaces ? <CircularProgress color="inherit" size={20} /> : null}{params.InputProps.endAdornment}</>),
                    }}
                  />
                )}
              />
              {formData.address && (
                <Box sx={{ mt: 2, p: 2.5, borderRadius: 2, bgcolor: (t) => alpha(t.palette.success.main, 0.04), border: '1px solid', borderColor: (t) => alpha(t.palette.success.main, 0.2) }}>
                  <FormGrid>
                    <TextField fullWidth label="Ülke" size="small" value={formData.address?.country || ''} onChange={(e) => setFormData({ ...formData, address: { ...formData.address!, country: e.target.value } })} />
                    <TextField fullWidth label="Şehir" size="small" value={formData.address?.city || ''} onChange={(e) => setFormData({ ...formData, address: { ...formData.address!, city: e.target.value } })} />
                    <TextField fullWidth label="İlçe" size="small" value={formData.address?.district || ''} onChange={(e) => setFormData({ ...formData, address: { ...formData.address!, district: e.target.value } })} />
                    <TextField fullWidth label="Posta Kodu" size="small" value={formData.address?.postalCode || ''} onChange={(e) => setFormData({ ...formData, address: { ...formData.address!, postalCode: e.target.value } })} />
                  </FormGrid>
                </Box>
              )}
            </FormSection>

            <FormSection title="Ayarlar">
              <Stack direction="row" spacing={4}>
                <FormControlLabel control={<Switch checked={formData.status === EventStatus.ACTIVE} onChange={(e) => setFormData({ ...formData, status: e.target.checked ? EventStatus.ACTIVE : EventStatus.PASSIVE })} />} label="Etkinlik Aktif" />
                <FormControlLabel control={<Switch checked={formData.isRegistrationOpen ?? true} onChange={(e) => setFormData({ ...formData, isRegistrationOpen: e.target.checked })} />} label="Kayıt Açık" />
              </Stack>
            </FormSection>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, px: 4 }}>
          <Button onClick={() => setOpenDialog(false)}>İptal</Button>
          <Button variant="contained" onClick={handleSaveEvent} startIcon={<SaveIcon />} sx={{ px: 4 }}
            disabled={!selectedEvent && !selectedOrganizer}
          >
            {selectedEvent ? 'Değişiklikleri Kaydet' : 'Etkinlik Oluştur'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={isConfirmDeleteOpen}
        title="Etkinliği Sil"
        message={`"${eventToDelete?.name}" etkinliğini silmek istediğinize emin misiniz? Tüm bilet ve katılımcı verileri silinecektir.`}
        severity="error"
        onConfirm={handleDeleteConfirm}
        onClose={() => setIsConfirmDeleteOpen(false)}
      />
    </PageContainer>
  );
}
