/**
 * Events — Premium Card-Based Redesign
 * Optimized for high-end aesthetics, subtle animations, and clear data visualization.
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Paper,
  Tooltip,
  Zoom,
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
  ArrowForwardIos as ChevronIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
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

// ─── PREMIUM STYLES ──────────────────────────────────────
const glassCardSx = {
  bgcolor: 'background.paper',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 4,
  overflow: 'hidden',
  boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  position: 'relative' as const,
  '&:hover': {
    borderColor: 'primary.light',
    boxShadow: '0 12px 32px rgba(0,0,0,0.08)',
    transform: 'translateY(-4px)',
    '& .chevron-icon': { transform: 'translateX(4px)', opacity: 1 },
  },
};

const statCardSx = (color: string) => ({
  p: 3,
  borderRadius: 4,
  bgcolor: 'background.paper',
  border: '1px solid',
  borderColor: 'divider',
  position: 'relative' as const,
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0, left: 0, width: '4px', height: '100%',
    bgcolor: color,
  },
});

// ─── COMPONENT ──────────────────────────────────────────
export default function Events() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

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

  // Form & Image States
  const [formData, setFormData] = useState<Partial<EventResponseDTO>>({});
  const [eventImage, setEventImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [organizerOptions, setOrganizerOptions] = useState<any[]>([]);
  const [selectedOrganizer, setSelectedOrganizer] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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


  // ─── DATA FETCHING ────────────────────────────────
  const fetchEventsData = useCallback(async () => {
    const searchParams: EventSearchDTO = {
      keyword: searchQuery,
      isUpcoming: true,
    };
    await getPopularEvents(searchParams, page, rowsPerPage);
  }, [getPopularEvents, page, rowsPerPage, searchQuery]);

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

  const handleOpenDialog = (event?: EventResponseDTO) => {
    if (event) {
      setSelectedEvent(event);
      setFormData({ ...event });
      setImagePreview(event.image || null);
    } else {
      setSelectedEvent(undefined);
      setFormData({ status: EventStatus.ACTIVE, maxParticipants: 100, ticketPrice: 0 });
      setImagePreview(null);
    }
    setOpenDialog(true);
  };

  const handleSaveEvent = async () => {
    try {
      if (selectedEvent) await updateEvent(selectedEvent.id, formData as any);
      else await createEvent(formData as any);
      setOpenDialog(false);
      fetchEventsData();
      enqueueSnackbar('Etkinlik başarıyla kaydedildi', { variant: 'success' });
    } catch { /* hook handles */ }
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
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/ticket-creation')}
              sx={{
                borderRadius: 2.5,
                px: 3,
                py: 1,
                textTransform: 'none',
                fontWeight: 700,
                boxShadow: '0 4px 14px 0 rgba(30, 107, 60, 0.39)',
                '&:hover': { boxShadow: '0 6px 20px rgba(30, 107, 60, 0.23)' }
              }}
            >
              Yeni Etkinlik Oluştur
            </Button>
          }
          breadcrumbs={[
            { label: 'Kontrol Paneli', href: '/' },
            { label: 'Etkinlikler', active: true },
          ]}
        />

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
                    <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5, color: 'text.primary' }}>
                      {stat.value}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: alpha(stat.color, 0.1), color: stat.color, width: 44, height: 44 }}>
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
          borderRadius: 4,
          mb: 3,
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: 'center',
          gap: 2,
        }}>
          <TextField
            fullWidth
            placeholder="Etkinlik adına veya konuma göre ara..."
            onChange={(e) => handleSearchChange(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ color: 'text.disabled', mr: 1 }} />,
              sx: { borderRadius: 3, bgcolor: '#f1f5f9', border: 'none', '& fieldset': { border: 'none' } }
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
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Box key={i} sx={{ height: 100, borderRadius: 4, bgcolor: 'background.paper', opacity: 0.6, animation: 'pulse 1.5s infinite' }} />
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
                  onClick={() => navigate(`/events/${event.id}`)}
                >
                  <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: '80px 1.5fr 1fr 1.2fr 100px 48px' },
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
                        {event.eventTime ? format(new Date(event.eventTime), 'dd MMM yyyy') : '—'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {event.eventTime ? format(new Date(event.eventTime), 'HH:mm') : '--:--'}
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

                    {/* Action */}
                    <IconButton
                      className="chevron-icon"
                      sx={{ opacity: 0.4, transition: 'all 0.3s' }}
                    >
                      <ChevronIcon />
                    </IconButton>
                  </Box>
                </Box>
              );
            })
          )}
        </Stack>
      </PageContainer>

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
