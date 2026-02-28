import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography,
  Button,
  Stack,
  Avatar,
  Box,
  TextField,
  FormControlLabel,
  Switch,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  AvatarGroup,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Autocomplete,
  CircularProgress,
  alpha,
  Chip,
  InputAdornment,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  LocationOn as LocationIcon,
  Event as EventIcon,
  Save as SaveIcon,
  ConfirmationNumber as TicketIcon,
  Close as CloseIcon,
  People as PeopleIcon,
  TrendingUp as TrendingUpIcon,
  RestartAlt as ToggleIcon,
  CloudUpload as CloudUploadIcon,
  InsertPhoto as PhotoIcon,
  Person as PersonIcon,
  Category as CategoryIcon,
  Search as SearchIcon,
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

// Standardized components
import { PageContainer, PageHeader, PageSection } from '../../components/Page';
import { DataTable, StatCard, StatusChip } from '../../components/Data';
import { FilterBar } from '../../components/Filter';
import { ConfirmDialog } from '../../components/Feedback';
import { FormSection, FormGrid } from '../../components/Form';
import { ActionMenu } from '../../components/Actions';

interface OrganizerOption {
  ownerId: string;
  associationName: string;
  logoUrl?: string;
  coverImageUrl?: string;
}

export default function Events() {
  const navigate = useNavigate();

  // -- State --
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPastEvents, setShowPastEvents] = useState(false);

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

  const {
    categories,
    fetchCategories,
  } = useEventCategories();

  // -- Data Fetching --
  const fetchEvents = useCallback(async () => {
    const searchParams: EventSearchDTO = {
      keyword: searchQuery,
      isUpcoming: !showPastEvents,
    };
    await getPopularEvents(searchParams, page, rowsPerPage);
  }, [getPopularEvents, page, rowsPerPage, searchQuery, showPastEvents]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Load Google Maps on mount
  useEffect(() => {
    loadGoogleMapsScript()
      .then(() => setGoogleMapsLoaded(true))
      .catch(() => setGoogleMapsLoaded(false));
  }, []);

  // Fetch association owners for organizer selection
  const fetchOrganizers = useCallback(async () => {
    setLoadingOrganizers(true);
    try {
      const response = await associationService.getAllAssociations('', 0, 100);
      const associations = response.data?.content || [];
      const options: OrganizerOption[] = associations.map((a: AssociationSummaryResponse) => ({
        ownerId: a.ownerId,
        associationName: a.name,
        logoUrl: a.logoUrl,
        coverImageUrl: a.coverImageUrl,
      }));
      setOrganizerOptions(options);
    } catch (error) {
      console.error('Failed to fetch organizers:', error);
    } finally {
      setLoadingOrganizers(false);
    }
  }, []);

  // Debounced place search
  const debouncedPlaceSearch = useMemo(
    () =>
      debounce(async (input: string) => {
        if (!input || input.length < 3) {
          setPlacePredictions([]);
          return;
        }
        setLoadingPlaces(true);
        try {
          const predictions = await searchPlaces(input);
          setPlacePredictions(predictions);
        } catch {
          setPlacePredictions([]);
        } finally {
          setLoadingPlaces(false);
        }
      }, 400),
    []
  );

  // -- Handlers --
  const handleSearchChange = debounce((value: string) => {
    setSearchQuery(value);
    setPage(0);
  }, 500);

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
      setPlacePredictions([]);
    } else {
      setSelectedEvent(undefined);
      setFormData({
        status: EventStatus.ACTIVE,
        isRegistrationOpen: true,
        maxParticipants: 100,
        ticketPrice: 0,
      });
      setSelectedOrganizer(null);
      setEventImage(null);
      setImagePreview(null);
      setSelectedCategory(null);
      setSelectedPlace(null);
      setPlaceSearchInput('');
      setPlacePredictions([]);
    }
    setOpenDialog(true);
    fetchOrganizers();
    fetchCategories();
  };

  // Category Handler
  const handleCategoryChange = (_e: any, newValue: EventCategoryDto | null) => {
    setSelectedCategory(newValue);
    if (newValue) {
      setFormData({ ...formData, category: newValue });
    } else {
      const { category, ...rest } = formData;
      setFormData(rest);
    }
  };

  // Place Selection Handler
  const handlePlaceSelect = async (_e: any, newValue: PlacePrediction | null) => {
    setSelectedPlace(newValue);
    if (newValue) {
      const details = await getPlaceDetails(newValue.place_id);
      if (details) {
        setFormData({
          ...formData,
          address: {
            ...formData.address,
            ...details,
          } as AddressDTO,
        });
      }
    } else {
      setFormData({
        ...formData,
        address: undefined,
      });
    }
  };

  // Image Handlers
  const handleImageSelect = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setEventImage(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageSelect(file);
  };

  const handleRemoveImage = () => {
    setEventImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveEvent = async () => {
    try {
      if (selectedEvent) {
        await updateEvent(selectedEvent.id, formData as any);
      } else {
        // Use admin creation if organizer is selected
        if (selectedOrganizer) {
          await createEventAsAdmin(formData as any, selectedOrganizer.ownerId, eventImage || undefined);
        } else {
          await createEvent(formData as any);
        }
      }
      setOpenDialog(false);
      fetchEvents();
    } catch (err) {
      // Error handled by hook
    }
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

  const stats = useMemo(() => ({
    total: events?.length || 0,
    upcoming: events?.filter(e => e.status === EventStatus.ACTIVE).length || 0,
    participants: events?.reduce((acc, e) => acc + (e.currentParticipants || 0), 0) || 0,
    revenue: events?.reduce((acc, e) => acc + ((e.ticketPrice || 0) * (e.currentParticipants || 0)), 0) || 0,
  }), [events]);

  const columns = [
    {
      id: 'event',
      label: 'Event',
      render: (row: EventResponseDTO) => (
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar
            src={row.image}
            variant="rounded"
            sx={{ width: 44, height: 44, bgcolor: 'primary.light' }}
          >
            <EventIcon sx={{ color: 'primary.main' }} />
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight={600}>{row.name}</Typography>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', maxWidth: 200 }}>
              {row.category?.name || 'General'}
            </Typography>
          </Box>
        </Stack>
      )
    },
    {
      id: 'date',
      label: 'Schedule',
      render: (row: EventResponseDTO) => (
        <Box>
          <Typography variant="body2">
            {row.eventTime ? format(new Date(row.eventTime), 'MMM d, p') : 'TBD'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {row.endTime ? `Ends: ${format(new Date(row.endTime), 'p')}` : 'No end time'}
          </Typography>
        </Box>
      )
    },
    {
      id: 'location',
      label: 'Location',
      render: (row: EventResponseDTO) => (
        <Stack direction="row" spacing={0.5} alignItems="center">
          <LocationIcon fontSize="inherit" sx={{ color: 'text.secondary' }} />
          <Typography variant="body2">{row.address?.city || 'Virtual'}</Typography>
        </Stack>
      )
    },
    {
      id: 'participants',
      label: 'Participants',
      render: (row: EventResponseDTO) => (
        <Box>
          <Typography variant="body2" fontWeight={600}>
            {row.currentParticipants || 0} / {row.maxParticipants || '∞'}
          </Typography>
          <AvatarGroup max={3} sx={{ '& .MuiAvatar-root': { width: 20, height: 20, fontSize: 10 } }}>
            {row.participants?.map(p => (
              <Avatar key={p.id} src={p.userImage} />
            ))}
          </AvatarGroup>
        </Box>
      )
    },
    {
      id: 'status',
      label: 'Status',
      render: (row: EventResponseDTO) => (
        <StatusChip status={row.status === EventStatus.ACTIVE ? 'ACTIVE' : 'INACTIVE'} label={row.status} />
      )
    }
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Events Management"
        subtitle="Organize, track, and manage all your community events and tickets"
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
            Create Event
          </Button>
        }
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Events', active: true },
        ]}
      />

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Events"
            value={String(stats.total)}
            icon={<EventIcon />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Events"
            value={String(stats.upcoming)}
            icon={<TrendingUpIcon />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Bookings"
            value={String(stats.participants)}
            icon={<PeopleIcon />}
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Est. Revenue"
            value={`$${stats.revenue.toLocaleString()}`}
            icon={<TicketIcon />}
            color="warning"
          />
        </Grid>
      </Grid>

      <PageSection>
        <FilterBar
          search={{
            value: searchQuery,
            onChange: handleSearchChange,
            debounceMs: 500,
            placeholder: "Search events..."
          }}
          sx={{ mb: 3 }}
          filters={
            <FormControlLabel
              control={
                <Switch
                  checked={showPastEvents}
                  onChange={(e) => setShowPastEvents(e.target.checked)}
                  size="small"
                />
              }
              label={<Typography variant="body2" color="text.secondary">Show Past Events</Typography>}
            />
          }
        />

        <DataTable
          columns={columns}
          data={events || []}
          loading={loading}
          pagination={{
            page: page + 1,
            pageSize: rowsPerPage,
            total: events?.length || 0,
            onPageChange: (p) => setPage(p - 1),
          }}
          renderRowActions={(row) => (
            <ActionMenu>
              <MenuItem onClick={() => navigate(`/ticket-creation/${row.id}`)}>
                <ListItemIcon><TicketIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Manage Tickets</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => handleOpenDialog(row)}>
                <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Edit Event</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => handleToggleStatus(row)}>
                <ListItemIcon><ToggleIcon fontSize="small" /></ListItemIcon>
                <ListItemText>{row.status === EventStatus.ACTIVE ? 'Deactivate' : 'Activate'}</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => { setEventToDelete(row); setIsConfirmDeleteOpen(true); }} sx={{ color: 'error.main' }}>
                <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
                <ListItemText>Delete Event</ListItemText>
              </MenuItem>
            </ActionMenu>
          )}
        />
      </PageSection>

      {/* CREATE / EDIT DIALOG */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" fontWeight={600}>
              {selectedEvent ? 'Edit Event' : 'Create New Event'}
            </Typography>
            <IconButton onClick={() => setOpenDialog(false)} size="small">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 4 }}>
          <Stack spacing={4}>
            {/* ORGANIZER SELECTION - Only for new events */}
            {!selectedEvent && (
              <FormSection title="Event Organizer">
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Select the association account owner who will be the organizer of this event.
                </Typography>
                <Autocomplete
                  options={organizerOptions}
                  getOptionLabel={(option) => `${option.associationName}`}
                  value={selectedOrganizer}
                  onChange={(_e, newValue) => setSelectedOrganizer(newValue)}
                  loading={loadingOrganizers}
                  isOptionEqualToValue={(option, value) => option.ownerId === value.ownerId}
                  renderOption={(props, option) => (
                    <Box component="li" {...props} key={option.ownerId}>
                      <Stack direction="row" spacing={2} alignItems="center" sx={{ width: '100%' }}>
                        <Avatar
                          src={option.logoUrl || option.coverImageUrl}
                          sx={{
                            width: 40,
                            height: 40,
                            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                          }}
                        >
                          <PersonIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" fontWeight={600}>
                            {option.associationName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Owner ID: {option.ownerId.substring(0, 8)}...
                          </Typography>
                        </Box>
                      </Stack>
                    </Box>
                  )}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Select Organizer (Association)"
                      placeholder="Search associations..."
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <>
                            <PersonIcon sx={{ color: 'text.secondary', mr: 1 }} />
                            {params.InputProps.startAdornment}
                          </>
                        ),
                        endAdornment: (
                          <>
                            {loadingOrganizers ? <CircularProgress color="inherit" size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />
              </FormSection>
            )}

            {/* EVENT IMAGE UPLOAD */}
            <FormSection title="Event Image">
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleFileInputChange}
                style={{ display: 'none' }}
                id="event-image-upload"
              />
              {imagePreview ? (
                <Box
                  sx={{
                    position: 'relative',
                    borderRadius: 3,
                    overflow: 'hidden',
                    border: '2px solid',
                    borderColor: 'divider',
                    '&:hover .image-overlay': {
                      opacity: 1,
                    },
                  }}
                >
                  <Box
                    component="img"
                    src={imagePreview}
                    alt="Event preview"
                    sx={{
                      width: '100%',
                      height: 220,
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                  <Box
                    className="image-overlay"
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      bgcolor: 'rgba(0,0,0,0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 2,
                      opacity: 0,
                      transition: 'opacity 0.25s ease',
                    }}
                  >
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<PhotoIcon />}
                      onClick={() => fileInputRef.current?.click()}
                      sx={{
                        bgcolor: 'rgba(255,255,255,0.9)',
                        color: 'text.primary',
                        '&:hover': { bgcolor: 'white' },
                      }}
                    >
                      Change
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<DeleteIcon />}
                      onClick={handleRemoveImage}
                      sx={{
                        bgcolor: 'error.main',
                        '&:hover': { bgcolor: 'error.dark' },
                      }}
                    >
                      Remove
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Box
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  sx={{
                    border: '2px dashed',
                    borderColor: isDragging ? 'primary.main' : 'divider',
                    borderRadius: 3,
                    p: 5,
                    textAlign: 'center',
                    cursor: 'pointer',
                    bgcolor: isDragging
                      ? (theme) => alpha(theme.palette.primary.main, 0.04)
                      : 'transparent',
                    transition: 'all 0.25s ease',
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: (theme) => alpha(theme.palette.primary.main, 0.02),
                    },
                  }}
                >
                  <CloudUploadIcon
                    sx={{
                      fontSize: 48,
                      color: isDragging ? 'primary.main' : 'text.disabled',
                      mb: 1,
                      transition: 'color 0.25s ease',
                    }}
                  />
                  <Typography variant="body1" fontWeight={600} color={isDragging ? 'primary.main' : 'text.secondary'}>
                    {isDragging ? 'Drop your image here' : 'Click or drag to upload event image'}
                  </Typography>
                  <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
                    Supports JPG, PNG, WebP • Max 10MB
                  </Typography>
                </Box>
              )}
            </FormSection>

            {/* GENERAL INFORMATION */}
            <FormSection title="General Information">
              <FormGrid columns={1}>
                <TextField
                  fullWidth
                  label="Event Title"
                  placeholder="e.g. Annual Sports Day 2024"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Description"
                  placeholder="Detailed information about the event..."
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
                {/* CATEGORY SELECTION */}
                <Autocomplete
                  options={categories || []}
                  getOptionLabel={(option) => option.name || ''}
                  value={selectedCategory}
                  onChange={handleCategoryChange}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  renderOption={(props, option) => (
                    <Box component="li" {...props} key={option.id}>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar
                          sx={{
                            width: 32,
                            height: 32,
                            bgcolor: (theme) => alpha(theme.palette.info.main, 0.1),
                          }}
                        >
                          <CategoryIcon sx={{ color: 'info.main', fontSize: 16 }} />
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {option.name}
                          </Typography>
                          {option.description && (
                            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', maxWidth: 300 }}>
                              {option.description}
                            </Typography>
                          )}
                        </Box>
                      </Stack>
                    </Box>
                  )}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      fullWidth
                      label="Event Category"
                      placeholder="Select a category..."
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <>
                            <InputAdornment position="start">
                              <CategoryIcon sx={{ color: 'text.secondary' }} />
                            </InputAdornment>
                            {params.InputProps.startAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />
              </FormGrid>
            </FormSection>

            {/* SCHEDULE & CAPACITY */}
            <FormSection title="Schedule & Capacity">
              <FormGrid>
                <TextField
                  fullWidth
                  label="Start Time"
                  type="datetime-local"
                  value={formData.eventTime ? new Date(formData.eventTime).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setFormData({ ...formData, eventTime: new Date(e.target.value).toISOString() })}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  fullWidth
                  label="End Time"
                  type="datetime-local"
                  value={formData.endTime ? new Date(formData.endTime).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setFormData({ ...formData, endTime: new Date(e.target.value).toISOString() })}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  fullWidth
                  label="Max Participants"
                  type="number"
                  value={formData.maxParticipants || ''}
                  onChange={(e) => setFormData({ ...formData, maxParticipants: parseInt(e.target.value) })}
                />
                <TextField
                  fullWidth
                  label="Min Ticket Price (€)"
                  type="number"
                  value={formData.ticketPrice || 0}
                  onChange={(e) => setFormData({ ...formData, ticketPrice: parseFloat(e.target.value) })}
                />
              </FormGrid>
            </FormSection>

            {/* LOCATION DETAILS - Google Places */}
            <FormSection title="Location Details">
              <Stack spacing={3}>
                {/* Google Places Search */}
                <Autocomplete
                  options={placePredictions}
                  getOptionLabel={(option) => option.description}
                  value={selectedPlace}
                  onChange={handlePlaceSelect}
                  onInputChange={(_e, newInputValue) => {
                    setPlaceSearchInput(newInputValue);
                    debouncedPlaceSearch(newInputValue);
                  }}
                  inputValue={placeSearchInput}
                  loading={loadingPlaces}
                  noOptionsText={
                    placeSearchInput.length < 3
                      ? 'Type at least 3 characters to search...'
                      : googleMapsLoaded
                        ? 'No places found'
                        : 'Google Maps API not loaded. Check your API key.'
                  }
                  filterOptions={(x) => x} // Disable built-in filtering, use API results
                  isOptionEqualToValue={(option, value) => option.place_id === value.place_id}
                  renderOption={(props, option) => (
                    <Box component="li" {...props} key={option.place_id}>
                      <Stack direction="row" spacing={1.5} alignItems="flex-start">
                        <PlaceIcon sx={{ color: 'error.main', mt: 0.3, flexShrink: 0 }} />
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {option.structured_formatting.main_text}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {option.structured_formatting.secondary_text}
                          </Typography>
                        </Box>
                      </Stack>
                    </Box>
                  )}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      fullWidth
                      label="Search Location (Google Places)"
                      placeholder="Search for a venue, address, or place..."
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <>
                            <InputAdornment position="start">
                              <SearchIcon sx={{ color: 'text.secondary' }} />
                            </InputAdornment>
                            {params.InputProps.startAdornment}
                          </>
                        ),
                        endAdornment: (
                          <>
                            {loadingPlaces ? <CircularProgress color="inherit" size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />

                {/* Address Details (auto-filled from Google Places, editable) */}
                {formData.address && (
                  <Box
                    sx={{
                      p: 2.5,
                      borderRadius: 2,
                      bgcolor: (theme) => alpha(theme.palette.success.main, 0.04),
                      border: '1px solid',
                      borderColor: (theme) => alpha(theme.palette.success.main, 0.2),
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                      <MyLocationIcon sx={{ color: 'success.main', fontSize: 18 }} />
                      <Typography variant="subtitle2" color="success.main">
                        Address Details
                      </Typography>
                      {formData.address.latitude && formData.address.longitude && (
                        <Chip
                          label={`${formData.address.latitude.toFixed(4)}, ${formData.address.longitude.toFixed(4)}`}
                          size="small"
                          variant="outlined"
                          color="success"
                          sx={{ ml: 'auto !important', fontSize: '0.7rem' }}
                        />
                      )}
                    </Stack>
                    <FormGrid>
                      <TextField
                        fullWidth
                        label="Country"
                        value={formData.address?.country || ''}
                        onChange={(e) => setFormData({ ...formData, address: { ...formData.address!, country: e.target.value } })}
                        size="small"
                      />
                      <TextField
                        fullWidth
                        label="City"
                        value={formData.address?.city || ''}
                        onChange={(e) => setFormData({ ...formData, address: { ...formData.address!, city: e.target.value } })}
                        size="small"
                      />
                      <TextField
                        fullWidth
                        label="District"
                        value={formData.address?.district || ''}
                        onChange={(e) => setFormData({ ...formData, address: { ...formData.address!, district: e.target.value } })}
                        size="small"
                      />
                      <TextField
                        fullWidth
                        label="Postal Code"
                        value={formData.address?.postalCode || ''}
                        onChange={(e) => setFormData({ ...formData, address: { ...formData.address!, postalCode: e.target.value } })}
                        size="small"
                      />
                    </FormGrid>
                    <Box mt={2}>
                      <TextField
                        fullWidth
                        label="Full Address / Street"
                        value={formData.address?.street || ''}
                        onChange={(e) => setFormData({ ...formData, address: { ...formData.address!, street: e.target.value } })}
                        size="small"
                      />
                    </Box>
                    <Box mt={2}>
                      <TextField
                        fullWidth
                        multiline
                        rows={2}
                        label="Address Description / Directions"
                        placeholder="Additional directions or notes about the venue..."
                        value={formData.address?.description || ''}
                        onChange={(e) => setFormData({ ...formData, address: { ...formData.address!, description: e.target.value } })}
                        size="small"
                      />
                    </Box>
                  </Box>
                )}
              </Stack>
            </FormSection>

            {/* SETTINGS */}
            <FormSection title="Settings">
              <Stack direction="row" spacing={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.status === EventStatus.ACTIVE}
                      onChange={(e) => setFormData({ ...formData, status: e.target.checked ? EventStatus.ACTIVE : EventStatus.PASSIVE })}
                    />
                  }
                  label="Event Active"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.isRegistrationOpen ?? true}
                      onChange={(e) => setFormData({ ...formData, isRegistrationOpen: e.target.checked })}
                    />
                  }
                  label="Open for Registration"
                />
              </Stack>
            </FormSection>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, px: 4 }}>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveEvent}
            startIcon={<SaveIcon />}
            sx={{ px: 4 }}
            disabled={!selectedEvent && !selectedOrganizer}
          >
            {selectedEvent ? 'Save Changes' : 'Create Event'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={isConfirmDeleteOpen}
        title="Delete Event"
        message={`Are you sure you want to delete "${eventToDelete?.name}"? All ticket and participant data will be lost.`}
        severity="error"
        onConfirm={handleDeleteConfirm}
        onClose={() => setIsConfirmDeleteOpen(false)}
      />
    </PageContainer>
  );
}