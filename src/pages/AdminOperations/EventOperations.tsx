import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import {
  AdminPanelSettings as AdminPanelSettingsIcon,
  Autorenew as BackfillIcon,
  EventBusy as CancelIcon,
  PauseCircle as PauseIcon,
  PlayCircle as ResumeIcon,
  QrCodeScanner as CheckInIcon,
  ReceiptLong as OrdersIcon,
  AirlineSeatReclineNormal as SeatsIcon,
  FactCheck as AuditIcon,
  Sell as CloseSalesIcon,
} from '@mui/icons-material';
import { PageContainer, PageHeader, PageSection } from '../../components/Page';
import { eventService } from '../../services/event/eventService';
import { adminOperationsService } from '../../services/admin/adminOperationsService';
import { EventResponseDTO } from '../../types/events/eventModel';
import {
  AdminTicketOverrideAction,
  SeatTargetState,
} from '../../types/admin/adminOperations';
import InteractiveSeatMap from './components/InteractiveSeatMap';
import InteractiveCheckInDashboard from './components/InteractiveCheckInDashboard';
import InteractiveOrderManagement from './components/InteractiveOrderManagement';
import InteractiveAuditLog from './components/InteractiveAuditLog';

type TabValue = 'event' | 'seats' | 'orders' | 'audit' | 'checkin';

const seatStateOptions: SeatTargetState[] = ['AVAILABLE', 'BLOCKED', 'RESERVED', 'SOLD', 'OCCUPIED'];
const ticketOverrideActions: AdminTicketOverrideAction[] = ['REFUND', 'CANCEL', 'REISSUE', 'CHECK_IN_RESET'];

const parseCsv = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const parseSeatNumbers = (value: string) =>
  parseCsv(value)
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item));

const prettyResponse = (value: unknown) => JSON.stringify(value, null, 2);

export default function EventOperations() {
  const navigate = useNavigate();
  const { eventId: routeEventId } = useParams();
  const { enqueueSnackbar } = useSnackbar();

  const [events, setEvents] = useState<EventResponseDTO[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<EventResponseDTO | null>(null);
  const [activeTab, setActiveTab] = useState<TabValue>('event');
  const [submittingKey, setSubmittingKey] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<string>('No request yet');
  const [responseBody, setResponseBody] = useState<string>('');

  const [eventReason, setEventReason] = useState('Operational admin action');
  const [eventCapacity, setEventCapacity] = useState<number>(0);

  const [seatReason, setSeatReason] = useState('Admin seating override');
  const [seatTargetState, setSeatTargetState] = useState<SeatTargetState>('BLOCKED');
  const [seatIdsInput, setSeatIdsInput] = useState('');
  const [singleSeatId, setSingleSeatId] = useState('');
  const [addCategoryId, setAddCategoryId] = useState('');
  const [addRowLabel, setAddRowLabel] = useState('');
  const [addSeatNumbers, setAddSeatNumbers] = useState('');
  const [removeSeatIds, setRemoveSeatIds] = useState('');
  const [moveSeatId, setMoveSeatId] = useState('');
  const [moveTargetCategoryId, setMoveTargetCategoryId] = useState('');
  const [moveTargetRowLabel, setMoveTargetRowLabel] = useState('');
  const [moveTargetSeatNumber, setMoveTargetSeatNumber] = useState<number>(1);

  const [orderReason, setOrderReason] = useState('Manual admin adjustment');
  const [orderIdsInput, setOrderIdsInput] = useState('');
  const [orderId, setOrderId] = useState('');
  const [ticketId, setTicketId] = useState('');
  const [ticketOverrideAction, setTicketOverrideAction] = useState<AdminTicketOverrideAction>('REFUND');
  const [categoryId, setCategoryId] = useState('');
  const [categoryCapacity, setCategoryCapacity] = useState<number>(0);

  const [auditEventId, setAuditEventId] = useState(routeEventId ?? '');
  const [auditActorId, setAuditActorId] = useState('');
  const [auditAction, setAuditAction] = useState('');
  const [auditPage, setAuditPage] = useState(0);
  const [auditSize, setAuditSize] = useState(20);
  const [auditTicketId, setAuditTicketId] = useState('');

  const [staffUserId, setStaffUserId] = useState('');
  const [ticketCode, setTicketCode] = useState('');
  const [qrCodeData, setQrCodeData] = useState('');
  const [deviceId, setDeviceId] = useState('gate-1');
  const [platform, setPlatform] = useState('android');
  const [gate, setGate] = useState('main');
  const [offlineAttempts, setOfflineAttempts] = useState('[]');

  useEffect(() => {
    let mounted = true;

    const loadEvents = async () => {
      setEventsLoading(true);
      try {
        const response = await eventService.getPopularEvents({ isUpcoming: true }, 0, 100);
        if (!mounted) {
          return;
        }

        const loadedEvents = response.data.content;
        setEvents(loadedEvents);

        if (routeEventId) {
          const existing = loadedEvents.find((event) => event.id === routeEventId);
          if (existing) {
            setSelectedEvent(existing);
            setEventCapacity(existing.maxParticipants ?? 0);
          } else {
            const eventResponse = await eventService.getEventById(routeEventId);
            if (!mounted) {
              return;
            }
            setEvents((current) => [eventResponse.data, ...current]);
            setSelectedEvent(eventResponse.data);
            setEventCapacity(eventResponse.data.maxParticipants ?? 0);
          }
        }
      } catch (error) {
        enqueueSnackbar('Failed to load event options', { variant: 'error' });
      } finally {
        if (mounted) {
          setEventsLoading(false);
        }
      }
    };

    void loadEvents();

    return () => {
      mounted = false;
    };
  }, [enqueueSnackbar, routeEventId]);

  useEffect(() => {
    if (!selectedEvent) {
      return;
    }

    setAuditEventId(selectedEvent.id);
    setEventCapacity(selectedEvent.maxParticipants ?? 0);
  }, [selectedEvent]);

  const currentEventId = selectedEvent?.id ?? routeEventId ?? '';
  const currentEventLabel = useMemo(() => {
    if (!selectedEvent) {
      return 'No event selected';
    }
    return `${selectedEvent.name} (${selectedEvent.id})`;
  }, [selectedEvent]);

  const requireEventId = () => {
    if (!currentEventId) {
      throw new Error('Select an event first');
    }
    return currentEventId;
  };

  const runAction = async (key: string, label: string, request: () => Promise<unknown>) => {
    try {
      setSubmittingKey(key);
      const response = await request();
      setLastAction(label);
      setResponseBody(prettyResponse(response));
      enqueueSnackbar(`${label} completed`, { variant: 'success' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Request failed';
      setLastAction(`${label} failed`);
      setResponseBody(prettyResponse({ error: message }));
      enqueueSnackbar(message, { variant: 'error' });
    } finally {
      setSubmittingKey(null);
    }
  };

  const renderSubmitButton = (key: string, label: string, onClick: () => Promise<void>, icon?: React.ReactNode) => (
    <Button
      variant="contained"
      onClick={() => void onClick()}
      disabled={submittingKey !== null}
      startIcon={submittingKey === key ? <CircularProgress size={16} color="inherit" /> : icon}
    >
      {label}
    </Button>
  );

  const sectionTabs = [
    { value: 'event', label: 'Event Admin', icon: <AdminPanelSettingsIcon fontSize="small" /> },
    { value: 'seats', label: 'Seat Admin', icon: <SeatsIcon fontSize="small" /> },
    { value: 'orders', label: 'Order/Ticket', icon: <OrdersIcon fontSize="small" /> },
    { value: 'audit', label: 'Audit', icon: <AuditIcon fontSize="small" /> },
    { value: 'checkin', label: 'Check-In', icon: <CheckInIcon fontSize="small" /> },
  ] as const;

  return (
    <PageContainer>
      <PageHeader
        title="Event Operations"
        subtitle="Event lifecycle, seating, order, audit and check-in admin calls in one surface."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Events', href: '/events' },
          { label: 'Operations', active: true },
        ]}
        showBackButton
        backPath="/events"
        actions={
          <Button variant="outlined" onClick={() => navigate('/events')}>
            Back to Events
          </Button>
        }
      />

      <PageSection title="Context" subtitle="Select the event that admin requests should target.">
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Autocomplete
              options={events}
              loading={eventsLoading}
              value={selectedEvent}
              onChange={(_, value) => {
                setSelectedEvent(value);
                if (value) {
                  navigate(`/event-operations/${value.id}`);
                }
              }}
              getOptionLabel={(option) => `${option.name} (${option.id})`}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Target event"
                  placeholder="Search loaded events"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {eventsLoading ? <CircularProgress size={18} color="inherit" /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
              <Stack spacing={1}>
                <Typography variant="subtitle2" color="text.secondary">
                  Active event
                </Typography>
                <Typography variant="body2">{currentEventLabel}</Typography>
                {selectedEvent && (
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip size="small" label={selectedEvent.status} />
                    <Chip size="small" label={`Capacity ${selectedEvent.maxParticipants ?? 0}`} />
                    <Chip size="small" label={`Participants ${selectedEvent.currentParticipants ?? 0}`} />
                  </Stack>
                )}
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </PageSection>

      {!currentEventId && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Most operations require an event selection. Choose one above before submitting requests.
        </Alert>
      )}

      <PageSection noPadding>
        <Tabs
          value={activeTab}
          onChange={(_, value: TabValue) => setActiveTab(value)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ px: 2, pt: 1 }}
        >
          {sectionTabs.map((tab) => (
            <Tab
              key={tab.value}
              value={tab.value}
              label={tab.label}
              icon={tab.icon}
              iconPosition="start"
            />
          ))}
        </Tabs>
        <Divider />
        <Box sx={{ p: 3 }}>
          {activeTab === 'event' && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Reason"
                  value={eventReason}
                  onChange={(event) => setEventReason(event.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Capacity"
                  type="number"
                  value={eventCapacity}
                  onChange={(event) => setEventCapacity(Number(event.target.value))}
                />
              </Grid>
              <Grid item xs={12}>
                <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                  {renderSubmitButton('pause', 'Pause', () => runAction('pause', 'Pause event', () => adminOperationsService.pauseEvent(requireEventId())), <PauseIcon />)}
                  {renderSubmitButton('resume', 'Resume', () => runAction('resume', 'Resume event', () => adminOperationsService.resumeEvent(requireEventId())), <ResumeIcon />)}
                  {renderSubmitButton('cancel', 'Cancel Event', () => runAction('cancel', 'Cancel event', () => adminOperationsService.cancelEvent(requireEventId(), { reason: eventReason })), <CancelIcon />)}
                  {renderSubmitButton('close-sales', 'Close Sales', () => runAction('close-sales', 'Close event sales', () => adminOperationsService.closeEventSales(requireEventId())), <CloseSalesIcon />)}
                  {renderSubmitButton('capacity', 'Update Capacity', () => runAction('capacity', 'Update event capacity', () => adminOperationsService.updateEventCapacity(requireEventId(), { capacity: eventCapacity, reason: eventReason })))}
                  {renderSubmitButton('event-audit-backfill', 'Audit Backfill', () => runAction('event-audit-backfill', 'Backfill event audit', () => adminOperationsService.backfillEventAudit(requireEventId(), { reason: eventReason })), <BackfillIcon />)}
                </Stack>
              </Grid>
            </Grid>
          )}

          {activeTab === 'seats' && (
            <Box sx={{ mt: -2, mx: -3, mb: -3 }}>
              <InteractiveSeatMap 
                 eventData={selectedEvent}
                 onSeatAction={async (action, seatIds, actionReason) => {
                    const mappedStates: Record<string, SeatTargetState> = {
                      block: 'BLOCKED',
                      release: 'AVAILABLE',
                      override: 'SOLD'
                    };
                    await adminOperationsService.overrideSeats(requireEventId(), {
                      targetState: mappedStates[action] || 'BLOCKED',
                      reason: actionReason,
                      seatIds: seatIds,
                    });
                    enqueueSnackbar(`Seats successfully updated via interactive map!`, { variant: 'success' });
                 }}
              />
            </Box>
          )}

          {activeTab === 'orders' && (
            <Box sx={{ mt: -2, mx: -3, mb: -3 }}>
              <InteractiveOrderManagement 
                eventId={requireEventId()}
                eventName={selectedEvent?.name || ''}
                onBulkCancelRefund={async (orderIds, reason) => {
                  await adminOperationsService.bulkCancelRefundOrders(requireEventId(), {
                    orderIds,
                    reason,
                  });
                  enqueueSnackbar(`${orderIds.length} orders refunded successfully!`, { variant: 'success' });
                }}
                onCancelAll={async (reason) => {
                  await adminOperationsService.cancelAllOrders(requireEventId(), { reason });
                  enqueueSnackbar(`All orders grouped for cancellation!`, { variant: 'success' });
                }}
                onRefundOrder={async (orderId, reason) => {
                  await adminOperationsService.refundOrder(orderId, { reason });
                  enqueueSnackbar(`Order ${orderId} refunded successfully!`, { variant: 'success' });
                }}
                onTicketOverride={async (ticketId, action, reason) => {
                  await adminOperationsService.overrideTicket(requireEventId(), ticketId, { action, reason });
                  enqueueSnackbar(`Ticket ${ticketId} overridden to ${action}`, { variant: 'success' });
                }}
                onUpdateCategoryCapacity={async (categoryId, capacity, reason) => {
                  await adminOperationsService.updateCategoryCapacity(requireEventId(), categoryId, { capacity, reason });
                  enqueueSnackbar(`Category ${categoryId} capacity updated to ${capacity}`, { variant: 'success' });
                }}
              />
            </Box>
          )}

          {activeTab === 'audit' && (
            <Box sx={{ mt: -2, mx: -3, mb: -3 }}>
              <InteractiveAuditLog 
                eventId={requireEventId()}
                eventName={selectedEvent?.name || ''}
                onFetchAdminAudit={async (filters) => {
                  await adminOperationsService.getAdminAudit({
                    eventId: requireEventId(),
                    ...filters
                  });
                  enqueueSnackbar(`Admin audit logs fetched successfully!`, { variant: 'success' });
                }}
                onBackfillAdminAudit={async () => {
                  await adminOperationsService.backfillAdminAudit(requireEventId());
                  enqueueSnackbar(`Audit backfill requested.`, { variant: 'info' });
                }}
                onFetchCheckInAudit={async () => {
                  await adminOperationsService.getCheckInAuditByEvent(requireEventId());
                  enqueueSnackbar(`Check-in event audit logs fetched!`, { variant: 'success' });
                }}
                onFetchMyHistory={async () => {
                  await adminOperationsService.getMyCheckInHistory();
                  enqueueSnackbar(`Your check-in history fetched!`, { variant: 'success' });
                }}
                onFetchStaffStats={async () => {
                  await adminOperationsService.getCheckInStaffStats(requireEventId());
                  enqueueSnackbar(`Staff stats fetched!`, { variant: 'success' });
                }}
                onFetchRecentCheckIns={async () => {
                  await adminOperationsService.getRecentCheckIns(requireEventId());
                  enqueueSnackbar(`Recent check-ins fetched!`, { variant: 'success' });
                }}
                onFetchHourlyCounts={async () => {
                  await adminOperationsService.getHourlyCheckInCounts(requireEventId());
                  enqueueSnackbar(`Hourly check-in counts fetched!`, { variant: 'success' });
                }}
                onFetchTicketAudit={async (ticketId) => {
                  await adminOperationsService.getCheckInAuditByTicket(ticketId);
                  enqueueSnackbar(`Ticket audit history for ${ticketId} fetched!`, { variant: 'success' });
                }}
              />
            </Box>
          )}

          {activeTab === 'checkin' && (
            <Box sx={{ mt: -2, mx: -3, mb: -3 }}>
              <InteractiveCheckInDashboard 
                 eventId={requireEventId()}
                 eventName={selectedEvent?.name || ''}
                 onScan={async (qrCodeData, gate) => {
                    // Mapped to actual validator optionally
                    const response = await adminOperationsService.validateCheckIn({
                      qrCodeData,
                      eventId: requireEventId(),
                      deviceInfo: { deviceId: 'gate-scanner-1', platform: 'web' },
                      locationInfo: { gate },
                    });
                    
                    if (response) {
                       enqueueSnackbar('Tarama işlemi backend\'e kaydedildi', { variant: 'info' });
                    }
                 }}
              />
            </Box>
          )}
        </Box>
      </PageSection>

      <PageSection title="Latest Response" subtitle={lastAction}>
        <TextField
          fullWidth
          multiline
          minRows={16}
          value={responseBody}
          placeholder="Responses will be rendered here as formatted JSON."
          InputProps={{
            readOnly: true,
            sx: {
              fontFamily: 'monospace',
              alignItems: 'flex-start',
            },
          }}
        />
      </PageSection>
    </PageContainer>
  );
}
