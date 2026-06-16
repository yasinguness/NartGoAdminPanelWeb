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
  SeatTargetState,
} from '../../types/admin/adminOperations';
import InteractiveSeatMap from './components/InteractiveSeatMap';
import InteractiveCheckInDashboard from './components/InteractiveCheckInDashboard';
import InteractiveOrderManagement from './components/InteractiveOrderManagement';
import InteractiveAuditLog from './components/InteractiveAuditLog';

type TabValue = 'event' | 'seats' | 'orders' | 'audit' | 'checkin';

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
  const [lastAction, setLastAction] = useState<string>('Henüz istek yok');
  const [responseBody, setResponseBody] = useState<string>('');

  const [eventReason, setEventReason] = useState('Operasyonel admin aksiyonu');
  const [eventCapacity, setEventCapacity] = useState<number>(0);

  const [, setAuditEventId] = useState(routeEventId ?? '');

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
        } else {
          // Route'da ID yok — kullanıcının aktif tek etkinliği varsa auto-select
          const now = Date.now();
          const activeEvents = loadedEvents.filter((e: any) => {
            if (e.status === 'CANCELLED' || e.status === 'COMPLETED') return false;
            if (e.eventTime) {
              const endTime = e.endTime ? new Date(e.endTime).getTime() : new Date(e.eventTime).getTime() + 24 * 60 * 60 * 1000;
              return endTime >= now;
            }
            return true;
          });
          if (activeEvents.length === 1) {
            setSelectedEvent(activeEvents[0]);
            setEventCapacity(activeEvents[0].maxParticipants ?? 0);
          }
        }
      } catch (error) {
        enqueueSnackbar('Etkinlik seçenekleri yüklenemedi', { variant: 'error' });
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
      return 'Etkinlik seçilmedi';
    }
    return `${selectedEvent.name} (${selectedEvent.id})`;
  }, [selectedEvent]);

  const requireEventId = () => {
    if (!currentEventId) {
      throw new Error('Önce bir etkinlik seçin');
    }
    return currentEventId;
  };

  const runAction = async (key: string, label: string, request: () => Promise<unknown>) => {
    try {
      setSubmittingKey(key);
      const response = await request();
      setLastAction(label);
      setResponseBody(prettyResponse(response));
      enqueueSnackbar(`${label} tamamlandı`, { variant: 'success' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'İstek başarısız oldu';
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
    { value: 'event', label: 'Etkinlik Yönetimi', icon: <AdminPanelSettingsIcon fontSize="small" /> },
    { value: 'seats', label: 'Koltuk Yönetimi', icon: <SeatsIcon fontSize="small" /> },
    { value: 'orders', label: 'Sipariş/Bilet', icon: <OrdersIcon fontSize="small" /> },
    { value: 'audit', label: 'Denetim', icon: <AuditIcon fontSize="small" /> },
    { value: 'checkin', label: 'Giriş', icon: <CheckInIcon fontSize="small" /> },
  ] as const;

  return (
    <PageContainer>
      <PageHeader
        title="Etkinlik Operasyonları"
        subtitle="Etkinlik yaşam döngüsü, koltuk, sipariş, denetim ve giriş yönetimi tek bir ekranda."
        breadcrumbs={[
          { label: 'Kontrol Paneli', href: '/dashboard' },
          { label: 'Etkinlikler', href: '/events' },
          { label: 'Operasyonlar', active: true },
        ]}
        showBackButton
        backPath="/events"
        actions={
          <Button variant="outlined" onClick={() => navigate('/events')}>
            Etkinliklere Dön
          </Button>
        }
      />

      <PageSection title="Bağlam" subtitle="Admin isteklerinin hedeflemesi gereken etkinliği seçin.">
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            {/* Aktif etkinlik sayısını hesapla — tek aktif varsa sadece Chip göster */}
            {(() => {
              const now = Date.now();
              const activeEvents = events.filter((e: any) => {
                if (e.status === 'CANCELLED' || e.status === 'COMPLETED') return false;
                if (e.eventTime) {
                  const endTime = e.endTime ? new Date(e.endTime).getTime() : new Date(e.eventTime).getTime() + 86400000;
                  return endTime >= now;
                }
                return true;
              });
              const showDropdown = activeEvents.length > 1 || events.length > 1;

              if (!showDropdown && selectedEvent) {
                return (
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Chip label="Tek Etkinlik" color="primary" size="small" sx={{ fontWeight: 700 }} />
                      <Typography variant="body2" fontWeight={600}>{selectedEvent.name}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                        Otomatik seçildi
                      </Typography>
                    </Stack>
                  </Paper>
                );
              }

              return (
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
                  getOptionLabel={(option) => `${option.name}`}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Hedef etkinlik"
                      placeholder="Etkinliklerde ara"
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
              );
            })()}
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
              <Stack spacing={1}>
                <Typography variant="subtitle2" color="text.secondary">
                  Aktif etkinlik
                </Typography>
                <Typography variant="body2">{currentEventLabel}</Typography>
                {selectedEvent && (
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip size="small" label={selectedEvent.status} />
                    <Chip size="small" label={`Kapasite ${selectedEvent.maxParticipants ?? 0}`} />
                    <Chip size="small" label={`Katılımcı ${selectedEvent.currentParticipants ?? 0}`} />
                  </Stack>
                )}
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </PageSection>

      {!currentEventId && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Çoğu işlem etkinlik seçimi gerektirir. İstek göndermeden önce yukarıdan birini seçin.
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
                  label="Sebep"
                  value={eventReason}
                  onChange={(event) => setEventReason(event.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Kapasite"
                  type="number"
                  value={eventCapacity}
                  onChange={(event) => setEventCapacity(Number(event.target.value))}
                />
              </Grid>
              <Grid item xs={12}>
                <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                  {renderSubmitButton('pause', 'Duraklat', () => runAction('pause', 'Etkinlik duraklatıldı', () => adminOperationsService.pauseEvent(requireEventId())), <PauseIcon />)}
                  {renderSubmitButton('resume', 'Devam Et', () => runAction('resume', 'Etkinlik devam ettirildi', () => adminOperationsService.resumeEvent(requireEventId())), <ResumeIcon />)}
                  {renderSubmitButton('cancel', 'Etkinliği İptal Et', () => runAction('cancel', 'Etkinlik iptal edildi', () => adminOperationsService.cancelEvent(requireEventId(), { reason: eventReason })), <CancelIcon />)}
                  {renderSubmitButton('close-sales', 'Satışı Kapat', () => runAction('close-sales', 'Etkinlik satışı kapatıldı', () => adminOperationsService.closeEventSales(requireEventId())), <CloseSalesIcon />)}
                  {renderSubmitButton('capacity', 'Kapasiteyi Güncelle', () => runAction('capacity', 'Etkinlik kapasitesi güncellendi', () => adminOperationsService.updateEventCapacity(requireEventId(), { capacity: eventCapacity, reason: eventReason })))}
                  {renderSubmitButton('event-audit-backfill', 'Denetim Doldur', () => runAction('event-audit-backfill', 'Etkinlik denetimi dolduruldu', () => adminOperationsService.backfillEventAudit(requireEventId(), { reason: eventReason })), <BackfillIcon />)}
                </Stack>
              </Grid>
            </Grid>
          )}

          {activeTab === 'seats' && (
            <Box sx={{ mt: -2, mx: -3, mb: -3 }}>
              <InteractiveSeatMap 
                 eventData={selectedEvent}
                 onSeatAction={async (action, seatIds, actionReason) => {
                    try {
                      const mappedStates: Record<string, SeatTargetState> = {
                        block: 'BLOCKED',
                        release: 'AVAILABLE',
                        override: 'SOLD'
                      };
                      const response = await adminOperationsService.overrideSeats(requireEventId(), {
                        targetState: mappedStates[action] || 'BLOCKED',
                        reason: actionReason,
                        seatIds: seatIds,
                      });
                      setLastAction('Koltuklar güncellendi');
                      setResponseBody(prettyResponse(response));
                      enqueueSnackbar('Koltuklar güncellendi', { variant: 'success' });
                    } catch (error) {
                      const message = error instanceof Error ? error.message : 'İstek başarısız oldu';
                      setLastAction('Koltuklar güncellenemedi');
                      setResponseBody(prettyResponse({ error: message }));
                      enqueueSnackbar(message, { variant: 'error' });
                      throw error;
                    }
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
                  enqueueSnackbar(`${orderIds.length} sipariş başarıyla iade edildi!`, { variant: 'success' });
                }}
                onCancelAll={async (reason) => {
                  await adminOperationsService.cancelAllOrders(requireEventId(), { reason });
                  enqueueSnackbar(`Tüm siparişler iptal için gruplandı!`, { variant: 'success' });
                }}
                onRefundOrder={async (orderId, reason) => {
                  await adminOperationsService.refundOrder(orderId, { reason });
                  enqueueSnackbar(`Sipariş ${orderId} başarıyla iade edildi!`, { variant: 'success' });
                }}
                onTicketOverride={async (ticketId, action, reason) => {
                  await adminOperationsService.overrideTicket(requireEventId(), ticketId, { action, reason });
                  enqueueSnackbar(`Bilet ${ticketId} durumu ${action} olarak değiştirildi`, { variant: 'success' });
                }}
                onUpdateCategoryCapacity={async (categoryId, capacity, reason) => {
                  await adminOperationsService.updateCategoryCapacity(requireEventId(), categoryId, { capacity, reason });
                  enqueueSnackbar(`Kategori ${categoryId} kapasitesi ${capacity} olarak güncellendi`, { variant: 'success' });
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
                  await runAction('audit-admin', 'Admin denetim kayıtları getirildi', () =>
                    adminOperationsService.getAdminAudit({
                      eventId: requireEventId(),
                      ...filters
                    })
                  );
                }}
                onBackfillAdminAudit={async () => {
                  await runAction('audit-backfill', 'Denetim doldurma talep edildi', () =>
                    adminOperationsService.backfillAdminAudit(requireEventId())
                  );
                }}
                onFetchCheckInAudit={async () => {
                  await runAction('audit-checkin', 'Giriş denetim kayıtları getirildi', () =>
                    adminOperationsService.getCheckInAuditByEvent(requireEventId())
                  );
                }}
                onFetchMyHistory={async () => {
                  await runAction('audit-my-history', 'Giriş geçmişiniz getirildi', () =>
                    adminOperationsService.getMyCheckInHistory()
                  );
                }}
                onFetchStaffStats={async () => {
                  await runAction('audit-staff-stats', 'Personel istatistikleri getirildi', () =>
                    adminOperationsService.getCheckInStaffStats(requireEventId())
                  );
                }}
                onFetchRecentCheckIns={async () => {
                  await runAction('audit-recent-checkins', 'Son girişler getirildi', () =>
                    adminOperationsService.getRecentCheckIns(requireEventId())
                  );
                }}
                onFetchHourlyCounts={async () => {
                  await runAction('audit-hourly-counts', 'Saatlik giriş sayıları getirildi', () =>
                    adminOperationsService.getHourlyCheckInCounts(requireEventId())
                  );
                }}
                onFetchTicketAudit={async (ticketId) => {
                  await runAction('audit-ticket', `${ticketId} bilet denetim geçmişi getirildi`, () =>
                    adminOperationsService.getCheckInAuditByTicket(ticketId)
                  );
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

      <PageSection title="Son Yanıt" subtitle={lastAction}>
        <TextField
          fullWidth
          multiline
          minRows={16}
          value={responseBody}
          placeholder="Yanıtlar burada biçimlendirilmiş JSON olarak gösterilecektir."
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
