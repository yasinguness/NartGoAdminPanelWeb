import { useState, useEffect, useCallback, useMemo } from 'react';
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
  MoreVert as MoreVertIcon,
  RestartAlt as ToggleIcon,
} from '@mui/icons-material';
import { useEvent } from '../../hooks/useEvent';
import { format } from 'date-fns';
import { EventResponseDTO, EventStatus, EventSearchDTO } from '../../types/events/eventModel';
import { debounce } from 'lodash';

// Standardized components
import { PageContainer, PageHeader, PageSection } from '../../components/Page';
import { DataTable, StatCard, StatusChip } from '../../components/Data';
import { FilterBar } from '../../components/Filter';
import { ConfirmDialog } from '../../components/Feedback';
import { FormSection, FormGrid } from '../../components/Form';
import { ActionMenu } from '../../components/Actions';

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

  const {
    events,
    loading,
    getPopularEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    updateActiveStatus,
  } = useEvent();

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

  // -- Handlers --
  const handleSearchChange = debounce((value: string) => {
    setSearchQuery(value);
    setPage(0);
  }, 500);

  const handleOpenDialog = (event?: EventResponseDTO) => {
    if (event) {
      setSelectedEvent(event);
      setFormData({ ...event });
    } else {
      setSelectedEvent(undefined);
      setFormData({
        status: EventStatus.ACTIVE,
        isRegistrationOpen: true,
        maxParticipants: 100,
        ticketPrice: 0,
      });
    }
    setOpenDialog(true);
  };

  const handleSaveEvent = async () => {
    try {
      if (selectedEvent) {
        await updateEvent(selectedEvent.id, formData as any);
      } else {
        await createEvent(formData as any);
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
                <TextField
                  fullWidth
                  label="Category (ID)"
                  placeholder="e.g. 1"
                  value={formData.category?.id || ''}
                  onChange={(e) => setFormData({ ...formData, category: { ...formData.category!, id: e.target.value } })}
                />
              </FormGrid>
            </FormSection>

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

            <FormSection title="Location Details">
              <FormGrid>
                <TextField
                  fullWidth
                  label="City"
                  value={formData.address?.city || ''}
                  onChange={(e) => setFormData({ ...formData, address: { ...formData.address!, city: e.target.value } })}
                />
                <TextField
                  fullWidth
                  label="District"
                  value={formData.address?.district || ''}
                  onChange={(e) => setFormData({ ...formData, address: { ...formData.address!, district: e.target.value } })}
                />
              </FormGrid>
              <Box mt={2}>
                  <TextField
                    fullWidth
                    label="Full Address / Street"
                    value={formData.address?.street || ''}
                    onChange={(e) => setFormData({ ...formData, address: { ...formData.address!, street: e.target.value } })}
                  />
              </Box>
            </FormSection>

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
          <Button variant="contained" onClick={handleSaveEvent} startIcon={<SaveIcon />} sx={{ px: 4 }}>
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