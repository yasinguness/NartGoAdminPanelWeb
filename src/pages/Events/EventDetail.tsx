/**
 * EventDetail — Full-featured event detail page with 6 tabs, all backed by real API data.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import {
  Box, Typography, Avatar, Stack, Button, Tab, Tabs, Divider, Paper, Grid,
  Table, TableHead, TableRow, TableCell, TableBody, Chip, LinearProgress,
  Switch, IconButton, alpha, Skeleton, CircularProgress, Tooltip,
  TextField, InputAdornment, TablePagination, useTheme,
} from '@mui/material';
import {
  ArrowBack as BackIcon, Event as EventIcon, Edit as EditIcon,
  PauseCircle as PauseIcon, Cancel as CancelIcon, Delete as DeleteIcon,
  ContentCopy as CopyIcon, Email as EmailIcon, Lock as LockIcon,
  Download as DownloadIcon, TrendingUp as TrendingUpIcon,
  Search as SearchIcon, Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon, HourglassEmpty as PendingIcon,
  QrCode as QrIcon,
  WarningAmber as WarningIcon,
  AccessTime as AccessTimeIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { eventService } from '../../services/event/eventService';
import { adminOperationsService } from '../../services/admin/adminOperationsService';
import type { TicketTypeResponse, OrderResponse, CheckInStats } from '../../types/admin/adminOperations';
import { EventResponseDTO, EventStatus, ParticipationDTO } from '../../types/events/eventModel';
import { useEvent } from '../../hooks/useEvent';
import { PauseModal, CancelModal, DeleteModal, NotificationModal, CapacityModal, CloseSalesModal, EditEventModal, type EditEventData } from './components/EventModals';
import CheckInStaffPanel from './components/CheckInStaffPanel';
import { api } from '../../services/api';
import { ticketService } from '../../services/ticket/ticketService';
import { CreateTicketTypeRequest } from '../../types/tickets/ticketTypes';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

import { parseDate, formatDateTime } from '../../utils/dateUtils';

// ─── TYPES ──────────────────────────────────────────────────
type TabValue = 'genel' | 'biletler' | 'satin-alimlar' | 'katilimcilar' | 'denetim' | 'ayarlar';

// ─── STYLES ─────────────────────────────────────────────────
const cardSx = {
  bgcolor: 'background.paper',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 3,
  overflow: 'hidden',
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
};

const infoRowSx = {
  display: 'flex', alignItems: 'center', px: 2.5, py: 1.5,
  borderBottom: '1px solid', borderColor: 'divider',
  '&:last-child': { borderBottom: 'none' },
};

function TabLoadingState() {
  return (
    <Box sx={cardSx}>
      {[1, 2, 3, 4].map(i => (
        <Box key={i} sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Skeleton variant="text" width="60%" height={20} />
          <Skeleton variant="text" width="40%" height={16} />
        </Box>
      ))}
    </Box>
  );
}

function EmptyState({ message, icon }: { message: string; icon?: React.ReactNode }) {
  return (
    <Box sx={{ p: 6, textAlign: 'center', color: 'text.secondary' }}>
      <Typography sx={{ fontSize: 40, mb: 1 }}>{icon ?? '📭'}</Typography>
      <Typography variant="body2" color="text.secondary">{message}</Typography>
    </Box>
  );
}

const STATUS_COLOR_MAP: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  ACTIVE: 'success', SOLD_OUT: 'error', INACTIVE: 'default', ENDED: 'default',
  PAID: 'success', PENDING: 'warning', CANCELLED: 'error', REFUNDED: 'info', FAILED: 'error',
  CONFIRMED: 'success', COMPLETED: 'success',
};
const STATUS_LABEL_MAP: Record<string, string> = {
  ACTIVE: 'Satışta', SOLD_OUT: 'Tükendi', INACTIVE: 'Pasif', ENDED: 'Sona Erdi',
  PAID: 'Ödendi', PENDING: 'Beklemede', CANCELLED: 'İptal', REFUNDED: 'İade', FAILED: 'Başarısız',
  CONFIRMED: 'Onaylı', COMPLETED: 'Tamamlandı',
};

// ─── COMPONENT ──────────────────────────────────────────────
export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const { deleteEvent } = useEvent();

  // ── Core state ────────────────────────────────────────────
  const [event, setEvent] = useState<EventResponseDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabValue>('genel');

  // ── Modal states ──────────────────────────────────────────
  const [pauseOpen, setPauseOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [capacityOpen, setCapacityOpen] = useState(false);
  const [closeSalesOpen, setCloseSalesOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // ── Tab data states ───────────────────────────────────────
  const [ticketTypes, setTicketTypes] = useState<TicketTypeResponse[]>([]);
  const [ticketTypesLoading, setTicketTypesLoading] = useState(false);

  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersSearch, setOrdersSearch] = useState('');
  const [ordersPage, setOrdersPage] = useState(0);

  const [attendeesSearch, setAttendeesSearch] = useState('');
  const [attendeesPage, setAttendeesPage] = useState(0);

  const [checkInStats, setCheckInStats] = useState<CheckInStats | null>(null);
  const [checkInLoading, setCheckInLoading] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [attendees, setAttendees] = useState<any[]>([]);
  const [attendeesLoading, setAttendeesLoading] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [checkInLogs, setCheckInLogs] = useState<any[]>([]);
  const [checkInLogsLoading, setCheckInLogsLoading] = useState(false);
  const [checkInLogsSearch, setCheckInLogsSearch] = useState('');

  // ── Ticket CRUD state ──────────────────────────────────────
  const [editingTicket, setEditingTicket] = useState<TicketTypeResponse | null>(null);
  const [showAddTicket, setShowAddTicket] = useState(false);
  const [ticketForm, setTicketForm] = useState({ name: '', basePrice: 0, capacityTotal: 100, currency: 'TRY', description: '' });
  const [ticketSaving, setTicketSaving] = useState(false);
  const [deletingTicketId, setDeletingTicketId] = useState<string | null>(null);

  // ── Settings state ────────────────────────────────────────
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsValues, setSettingsValues] = useState({
    isPublic: true, salesOpen: true,
  });

  // ── Fetch event ───────────────────────────────────────────
  const fetchEvent = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await eventService.getEventById(id);
      const ev: EventResponseDTO = res.data;
      setEvent(ev);
      setSettingsValues({
        isPublic: !ev.isPrivate,
        salesOpen: ev.isRegistrationOpen !== false,
      });
      // Koltuklu etkinlikse seating config backfill (rowLabelToCategoryId uyumsuzluğunu düzeltir)
      if (ev.seatingConfig?.enabled) {
        adminOperationsService.backfillSeating(id).catch(() => {/* silent */});
      }
    } catch {
      enqueueSnackbar('Etkinlik yüklenemedi', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [id, enqueueSnackbar]);

  useEffect(() => { fetchEvent(); }, [fetchEvent]);

  // ── Fetch ticket types ─────────────────────────────────────
  const fetchTicketTypes = useCallback(async () => {
    if (!id) return;
    setTicketTypesLoading(true);
    try {
      const res = await adminOperationsService.getTicketTypes(id);
      setTicketTypes(res.data ?? []);
    } catch (err: any) {
      if (err?.response?.status !== 404) enqueueSnackbar('Bilet tipleri yüklenemedi', { variant: 'error' });
    } finally { setTicketTypesLoading(false); }
  }, [id, enqueueSnackbar]);

  // ── Fetch orders ───────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    if (!id) return;
    setOrdersLoading(true);
    try {
      const res = await adminOperationsService.getOrders(id);
      setOrders(res.data ?? []);
    } catch {
      enqueueSnackbar('Siparişler yüklenemedi', { variant: 'error' });
    } finally { setOrdersLoading(false); }
  }, [id, enqueueSnackbar]);

  // ── Fetch check-in stats ──────────────────────────────────
  const fetchCheckInStats = useCallback(async () => {
    if (!id) return;
    setCheckInLoading(true);
    try {
      const res = await adminOperationsService.getCheckInStats(id);
      setCheckInStats(res.data ?? null);
    } catch {
      // Stats endpoint may not have data yet; silently ignore
      setCheckInStats(null);
    } finally { setCheckInLoading(false); }
  }, [id]);

  // ── Fetch attendees ────────────────────────────────────────
  const fetchAttendees = useCallback(async () => {
    if (!id) return;
    setAttendeesLoading(true);
    try {
      const res = await adminOperationsService.getAttendees(id);
      setAttendees(Array.isArray(res.data) ? res.data : []);
    } catch {
      setAttendees([]);
    } finally { setAttendeesLoading(false); }
  }, [id]);

  // ── Fetch check-in logs ──────────────────────────────────
  const fetchCheckInLogs = useCallback(async () => {
    if (!id) return;
    setCheckInLogsLoading(true);
    try {
      const res = await adminOperationsService.getCheckInLogs(id);
      setCheckInLogs(Array.isArray(res.data) ? res.data : []);
    } catch {
      setCheckInLogs([]);
    } finally { setCheckInLogsLoading(false); }
  }, [id]);

  // ── Lazy tab loading ──────────────────────────────────────
  useEffect(() => {
    if (activeTab === 'biletler' && ticketTypes.length === 0) fetchTicketTypes();
    if (activeTab === 'satin-alimlar' && orders.length === 0) fetchOrders();
    if (activeTab === 'katilimcilar' && attendees.length === 0) fetchAttendees();
    if (activeTab === 'denetim') { fetchCheckInStats(); fetchCheckInLogs(); }
  }, [activeTab, fetchTicketTypes, fetchOrders, fetchCheckInStats, fetchAttendees, fetchCheckInLogs, ticketTypes.length, orders.length, attendees.length]);

  // ── Derived values ────────────────────────────────────────
  const daysLeft = useMemo(() => {
    if (!event?.eventTime) return 0;
    return Math.max(0, Math.ceil((new Date(event.eventTime).getTime() - Date.now()) / 86400000));
  }, [event]);

  const fillPercent = useMemo(() => {
    if (!event?.maxParticipants) return 0;
    return Math.round(((event.currentParticipants || 0) / event.maxParticipants) * 100);
  }, [event]);

  const participants: ParticipationDTO[] = event?.participants ?? [];

  const resolvedParticipants = useMemo(() =>
    participants.map(p => ({
      ...p,
      userName: (p.userName && p.userName !== 'null null' && p.userName !== 'null')
        ? p.userName
        : (p.userId?.slice(0, 8) ? `Kullanici #${p.userId.slice(0, 8)}` : 'Anonim'),
    })),
    [participants],
  );

  const filteredAttendees = useMemo(() => {
    if (!attendeesSearch.trim()) return attendees;
    const q = attendeesSearch.toLowerCase();
    return attendees.filter((a: any) =>
      a.name?.toLowerCase().includes(q) ||
      a.email?.toLowerCase().includes(q) ||
      a.ticketNo?.toLowerCase().includes(q)
    );
  }, [attendees, attendeesSearch]);

  const filteredCheckInLogs = useMemo(() => {
    if (!checkInLogsSearch.trim()) return checkInLogs;
    const q = checkInLogsSearch.toLowerCase();
    return checkInLogs.filter((l: any) =>
      l.attendeeName?.toLowerCase().includes(q) ||
      l.ticketNumber?.toLowerCase().includes(q)
    );
  }, [checkInLogs, checkInLogsSearch]);

  const filteredOrders = useMemo(() => {
    if (!ordersSearch.trim()) return orders;
    const q = ordersSearch.toLowerCase();
    return orders.filter(o => o.id?.toLowerCase().includes(q));
  }, [orders, ordersSearch]);

  const totalRevenue = useMemo(() =>
    orders.filter(o => o.status === 'PAID').reduce((sum, o) => sum + (o.totalAmount || 0), 0),
    [orders]);

  const refundStats = useMemo(() => {
    const refunded = orders.filter(o => o.status === 'REFUNDED');
    const cancelled = orders.filter(o => o.status === 'CANCELLED');
    return {
      refundedCount: refunded.length,
      refundedAmount: refunded.reduce((s, o) => s + (o.totalAmount || 0), 0),
      cancelledCount: cancelled.length,
    };
  }, [orders]);

  // ── Handlers ──────────────────────────────────────────────
  const handlePause = async (_reason: string, _note: string) => {
    if (!id) return;
    setActionLoading(true);
    try {
      await adminOperationsService.pauseEvent(id);
      enqueueSnackbar('Etkinlik duraklatıldı', { variant: 'success' });
      setPauseOpen(false);
      await fetchEvent();
    } catch { enqueueSnackbar('İşlem başarısız', { variant: 'error' }); }
    finally { setActionLoading(false); }
  };

  const handleCancel = async (reason: string) => {
    if (!id) return;
    setActionLoading(true);
    try {
      await adminOperationsService.cancelEvent(id, { reason });
      enqueueSnackbar('Etkinlik iptal edildi', { variant: 'success' });
      setCancelOpen(false);
      navigate('/events');
    } catch { enqueueSnackbar('İşlem başarısız', { variant: 'error' }); }
    finally { setActionLoading(false); }
  };

  const handleDelete = async (action: 'delete' | 'cancel', reason?: string) => {
    if (!event) return;
    setActionLoading(true);
    try {
      if (action === 'cancel') {
        // Ücretli etkinlik: iptal et → Kafka event.cancelled → otomatik iade
        await adminOperationsService.cancelEvent(event.id, { reason: reason || 'Organizatör tarafından iptal edildi' });
        enqueueSnackbar('Etkinlik iptal edildi. Bilet iadeleri otomatik başlatıldı.', { variant: 'success' });
      } else {
        // Ücretsiz / satış olmayan etkinlik: soft delete
        try {
          await adminOperationsService.cancelEvent(event.id, { reason: 'Silindi' });
        } catch {
          await deleteEvent(event.id, event.organizerId);
        }
        enqueueSnackbar('Etkinlik silindi', { variant: 'success' });
      }
      navigate('/events');
    } catch { enqueueSnackbar('İşlem başarısız', { variant: 'error' }); }
    finally { setActionLoading(false); }
  };

  const handleSendNotification = async (title: string, content: string, type: string) => {
    if (!event) return;
    setActionLoading(true);
    try {
      // Bilet sahibi e-postalarını topla (attendees > participants fallback)
      const emails = attendees.length > 0
        ? [...new Set(attendees.map((a: any) => a.email).filter(Boolean))]
        : participants.map(p => p.email || p.userEmail).filter(Boolean) as string[];
      if (emails.length === 0) {
        enqueueSnackbar('Katılımcı bulunamadı', { variant: 'warning' });
        return;
      }
      await adminOperationsService.sendEventNotification({
        title,
        content,
        type,
        priority: 'HIGH',
        emailList: emails,
        additionalData: { eventId: event.id, eventName: event.name },
      });
      enqueueSnackbar(`${emails.length} katılımcıya bildirim gönderildi`, { variant: 'success' });
      setNotifOpen(false);
    } catch { enqueueSnackbar('Bildirim gönderimi başarısız', { variant: 'error' }); }
    finally { setActionLoading(false); }
  };

  const handleUpdateCapacity = async (newCapacity: number) => {
    if (!event) return;
    setActionLoading(true);
    try {
      await adminOperationsService.updateEventCapacity(event.id, { maxParticipants: newCapacity });
      enqueueSnackbar(`Kapasite ${newCapacity} olarak güncellendi`, { variant: 'success' });
      setCapacityOpen(false);
      // Refresh event
      window.location.reload();
    } catch { enqueueSnackbar('Kapasite güncelleme başarısız', { variant: 'error' }); }
    finally { setActionLoading(false); }
  };

  const handleCloseSales = async () => {
    if (!event) return;
    setActionLoading(true);
    try {
      await adminOperationsService.closeEventSales(event.id);
      enqueueSnackbar('Bilet satışları kapatıldı', { variant: 'success' });
      setCloseSalesOpen(false);
      window.location.reload();
    } catch { enqueueSnackbar('Satış kapatma başarısız', { variant: 'error' }); }
    finally { setActionLoading(false); }
  };

  const handleEditEvent = async (data: EditEventData) => {
    if (!event) return;
    setActionLoading(true);
    try {
      // Görsel değiştirildiyse önce upload et
      let imageUrl = data.currentImageUrl;
      if (data.coverImage) {
        try {
          const formData = new FormData();
          formData.append('file', data.coverImage);
          formData.append('path', `events/covers/${Date.now()}_${data.coverImage.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`);
          const uploadRes = await api.post('/media/upload', formData, { headers: { 'Content-Type': undefined } });
          imageUrl = uploadRes.data?.data?.cdnUrl || uploadRes.data?.data?.originalUrl || imageUrl;
        } catch { enqueueSnackbar('Görsel yüklenemedi', { variant: 'warning' }); }
      }

      const payload: Record<string, unknown> = {
        name: data.name,
        description: data.description,
        eventTime: data.eventTime?.toISOString(),
        endTime: data.endTime?.toISOString(),
        maxParticipants: data.maxParticipants,
        ticketPrice: data.ticketPrice,
        isRegistrationOpen: data.isRegistrationOpen,
        isPrivate: data.isPrivate,
        thumbnailUrl: imageUrl,
        organizerId: event.organizerId,
        address: data.address ? {
          city: data.address.city || '',
          district: data.address.district || '',
          country: data.address.country || 'Türkiye',
          street: data.address.street || data.address.description || '',
          description: data.address.description || '',
          latitude: data.address.latitude,
          longitude: data.address.longitude,
        } : undefined,
      };

      await eventService.updateEvent(event.id, payload as any);

      // Satış tarihleri değiştiyse bilet türlerini güncelle
      if (data.saleStartDate || data.saleEndDate) {
        // ticketTypes state'i boş olabilir — event response'undaki ticketTypes'ı da kontrol et
        const tts = ticketTypes.length > 0 ? ticketTypes : ((event as any).ticketTypes || []);
        if (tts.length > 0) {
          try {
            for (const tt of tts) {
              const updatePayload = {
                eventId: event.id,
                name: tt.name,
                description: tt.description || null,
                basePrice: tt.basePrice,
                currency: tt.currency || 'TRY',
                capacityTotal: tt.capacityTotal,
                saleStartAt: data.saleStartDate?.toISOString() || (tt.saleStartAt ? parseDate(tt.saleStartAt)?.toISOString() : null),
                saleEndAt: data.saleEndDate?.toISOString() || (tt.saleEndAt ? parseDate(tt.saleEndAt)?.toISOString() : null),
              };
              await ticketService.updateTicketType(tt.id, updatePayload as any);
            }
            enqueueSnackbar(`${tts.length} bilet türünün satış tarihleri güncellendi`, { variant: 'info' });
          } catch (err) {
            console.error('Satış tarihi güncelleme hatası:', err);
            enqueueSnackbar('Satış tarihleri güncellenemedi', { variant: 'warning' });
          }
        }
      }

      enqueueSnackbar('Etkinlik güncellendi', { variant: 'success' });
      setEditOpen(false);
      fetchEvent();
      if (ticketTypes.length > 0) fetchTicketTypes();
    } catch { enqueueSnackbar('Güncelleme başarısız', { variant: 'error' }); }
    finally { setActionLoading(false); }
  };

  // ── Ticket CRUD handlers ───────────────────────────────────
  const handleSaveTicketType = async () => {
    if (!id || !ticketForm.name.trim()) return;
    setTicketSaving(true);
    try {
      const payload: CreateTicketTypeRequest = {
        eventId: id,
        name: ticketForm.name,
        basePrice: ticketForm.basePrice,
        capacityTotal: ticketForm.capacityTotal,
        currency: ticketForm.currency,
        description: ticketForm.description || undefined,
        saleStartAt: new Date().toISOString(),
        saleEndAt: event?.eventTime ? new Date(event.eventTime).toISOString() : new Date().toISOString(),
      };

      if (editingTicket) {
        await ticketService.updateTicketType(editingTicket.id, payload);
        enqueueSnackbar('Bilet tipi güncellendi', { variant: 'success' });
      } else {
        await ticketService.createTicketType(payload);
        enqueueSnackbar('Bilet tipi oluşturuldu', { variant: 'success' });
      }

      // Bilet tiplerinin toplam kapasitesini hesapla ve event kapasitesini senkronize et
      try {
        const refreshed = await ticketService.getEventTicketTypes(id);
        const types: TicketTypeResponse[] = refreshed?.data ?? [];
        if (types.length > 0) {
          const totalCapacity = types.reduce((sum, t) => sum + (t.capacityTotal || 0), 0);
          if (totalCapacity > 0 && totalCapacity !== event?.maxParticipants) {
            await adminOperationsService.updateEventCapacity(id, { maxParticipants: totalCapacity });
          }
        }
      } catch { /* best-effort sync */ }

      setShowAddTicket(false);
      setEditingTicket(null);
      setTicketForm({ name: '', basePrice: 0, capacityTotal: 100, currency: 'TRY', description: '' });
      fetchTicketTypes();
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'İşlem başarısız', { variant: 'error' });
    } finally { setTicketSaving(false); }
  };

  const handleEditTicket = (ticket: TicketTypeResponse) => {
    setEditingTicket(ticket);
    setTicketForm({
      name: ticket.name,
      basePrice: ticket.basePrice,
      capacityTotal: ticket.capacityTotal,
      currency: ticket.currency || 'TRY',
      description: ticket.description || '',
    });
    setShowAddTicket(true);
  };

  const handleDeleteTicketType = async (ticketId: string) => {
    setDeletingTicketId(ticketId);
    try {
      await ticketService.deleteTicketType(ticketId);
      enqueueSnackbar('Bilet tipi silindi', { variant: 'success' });
      fetchTicketTypes();

      // Event kapasitesini kalan bilet tiplerinin toplamıyla senkronize et
      try {
        const refreshed = await ticketService.getEventTicketTypes(id!);
        const types: TicketTypeResponse[] = refreshed?.data ?? [];
        if (types.length > 0) {
          const totalCapacity = types.reduce((sum, t) => sum + (t.capacityTotal || 0), 0);
          await adminOperationsService.updateEventCapacity(id!, { maxParticipants: Math.max(totalCapacity, 1) });
        }
      } catch { /* best-effort sync */ }
    } catch {
      enqueueSnackbar('Silme başarısız', { variant: 'error' });
    } finally { setDeletingTicketId(null); }
  };

  const handleSettingToggle = async (key: keyof typeof settingsValues, value: boolean) => {
    if (!id || !event) return;
    setSettingsLoading(true);
    const prevValues = { ...settingsValues };
    setSettingsValues(prev => ({ ...prev, [key]: value }));
    try {
      const patch: Partial<EventResponseDTO> = {};
      if (key === 'isPublic') patch.isPrivate = !value;
      if (key === 'salesOpen') patch.isRegistrationOpen = value;
      await eventService.updateEvent(id, patch as any);
      enqueueSnackbar('Ayar güncellendi', { variant: 'success' });
    } catch {
      setSettingsValues(prevValues);
      enqueueSnackbar('Ayar güncellenemedi', { variant: 'error' });
    } finally { setSettingsLoading(false); }
  };

  const copyEventLink = () => {
    navigator.clipboard.writeText(`https://nartgo.net/events/${id}`);
    enqueueSnackbar('Bağlantı kopyalandı', { variant: 'success' });
  };

  const openEditWizard = () => {
    if (!event?.id) return;
    navigate(`/event-creation/${event.id}?edit=true`);
  };

  // ── Loading / Not found ───────────────────────────────────
  if (loading) {
    return (
      <Box sx={{ p: 4 }}>
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 3, mb: 3 }} />
        <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 3 }} />
      </Box>
    );
  }

  if (!event) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">Etkinlik bulunamadı</Typography>
        <Button onClick={() => navigate('/events')} sx={{ mt: 2 }}>← Etkinliklere Dön</Button>
      </Box>
    );
  }

  const statusColor = event.status === EventStatus.ACTIVE ? 'success' : 'default';
  const statusLabel = event.status === EventStatus.ACTIVE ? 'Aktif'
    : event.status === EventStatus.CANCELLED ? 'İptal'
    : event.status === EventStatus.COMPLETED ? 'Tamamlandı'
    : event.status === EventStatus.PASSIVE ? 'Duraklatıldı'
    : String(event.status);

  // ─── RENDER ───────────────────────────────────────────────
  return (
    <Box>
      {/* ═══ HEADER ═══ */}
      <Box sx={{ bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider', px: 4, pt: 3, pb: 0 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2, cursor: 'pointer' }}
          onClick={() => navigate('/events')}>
          <BackIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
          <Typography variant="caption" color="text.secondary" sx={{ '&:hover': { color: 'primary.main' } }}>
            Etkinliklere Dön
          </Typography>
          <Typography variant="caption" color="text.disabled">›</Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={500}>{event.name}</Typography>
        </Stack>

        <Stack direction="row" spacing={2.5} alignItems="flex-start" sx={{ mb: 3 }}>
          <Avatar src={event.image} variant="rounded"
            sx={{ width: 80, height: 80, borderRadius: 3, bgcolor: 'grey.100', border: '1px solid', borderColor: 'divider', fontSize: 36 }}>
            <EventIcon sx={{ fontSize: 36, color: 'primary.main' }} />
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 0.5 }}>
              <Typography variant="h5" fontWeight={800} letterSpacing={-0.5}>{event.name}</Typography>
              <Chip label={statusLabel} size="small" color={statusColor as any} variant="outlined"
                sx={{ fontWeight: 600, height: 24 }} />
            </Stack>
            <Stack direction="row" spacing={2} sx={{ color: 'text.secondary', fontSize: 13 }} flexWrap="wrap">
              <Typography variant="body2">
                📅 {formatDateTime(event.eventTime)}
                {event.endTime && ` – ${formatDateTime(event.endTime).split(', ')[1] || ''}`}
              </Typography>
              <Typography variant="body2">📍 {event.address?.city || 'Sanal'}</Typography>
              <Typography variant="body2">🏷 {event.category?.name || 'Genel'}</Typography>
              <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.disabled' }}>
                #{event.id?.slice(0, 8)}
              </Typography>
            </Stack>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" size="small" startIcon={<PauseIcon />}
              onClick={() => setPauseOpen(true)}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>
              Duraklat
            </Button>
            <Button variant="outlined" size="small" startIcon={<EditIcon />}
              onClick={openEditWizard}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>
              Düzenle
            </Button>
            <Button variant="outlined" size="small" color="error" startIcon={<CancelIcon />}
              onClick={() => setCancelOpen(true)}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>
              İptal Et
            </Button>
          </Stack>
        </Stack>

        {/* Quick Stats */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderTop: '1px solid', borderColor: 'divider' }}>
          {[
            { label: 'Katılımcı', value: event.currentParticipants || 0, color: 'info.main' },
            { label: 'Satılan Bilet', value: ticketTypes.reduce((s, t) => s + (t.capacitySold || 0), 0) || (event.currentParticipants || 0), color: 'success.main' },
            { label: 'Mevcut Gelir', value: `₺${totalRevenue > 0 ? totalRevenue.toLocaleString('tr-TR') : '0'}`, color: 'success.main' },
            { label: 'Gün Kaldı', value: daysLeft, color: daysLeft < 7 ? 'error.main' : 'warning.main' },
          ].map((stat, i) => (
            <Box key={i} sx={{ py: 1.5, px: 2.5, textAlign: 'center', borderRight: i < 3 ? '1px solid' : 'none', borderColor: 'divider' }}>
              <Typography variant="h5" fontWeight={800} fontFamily="JetBrains Mono, monospace"
                sx={{ color: stat.color, letterSpacing: -0.5 }}>
                {stat.value}
              </Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={600}
                textTransform="uppercase" letterSpacing={0.4}>
                {stat.label}
              </Typography>
            </Box>
          ))}
        </Box>

        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}
          sx={{
            mt: 0.5, borderTop: '1px solid', borderColor: 'divider',
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 500, fontSize: 13.5, minHeight: 48 },
            '& .Mui-selected': { fontWeight: 700, color: 'primary.main' },
          }}>
          <Tab value="genel" label="📋 Genel Bilgiler" />
          <Tab value="biletler" label="🎫 Biletler" />
          <Tab value="satin-alimlar" label="💳 Satın Alımlar" />
          <Tab value="katilimcilar" label="👥 Katılımcılar" />
          <Tab value="denetim" label="🔍 Denetim & Giriş" />
          <Tab value="ayarlar" label="⚙️ Ayarlar" />
        </Tabs>
      </Box>

      {/* ═══ TAB CONTENT ═══ */}
      <Box sx={{ p: 4 }}>

        {/* ─── GENEL ─── */}
        {activeTab === 'genel' && (
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <Box sx={cardSx}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle2" fontWeight={700}>Etkinlik Detayları</Typography>
                <Button size="small" startIcon={<EditIcon />}
                  onClick={openEditWizard}
                  sx={{ textTransform: 'none' }}>Düzenle</Button>
              </Box>
              {(() => {
                // Bilet fiyat aralığı hesapla
                const priceDisplay = (() => {
                  if (!event.isPaid) return 'Ücretsiz';
                  if (ticketTypes.length > 1) {
                    const prices = ticketTypes.map(t => t.basePrice || 0).filter(p => p > 0);
                    if (prices.length > 1) {
                      const min = Math.min(...prices);
                      const max = Math.max(...prices);
                      return min === max ? `₺${min}` : `₺${min} – ₺${max}`;
                    }
                  }
                  return `₺${event.ticketPrice || ticketTypes[0]?.basePrice || 0}`;
                })();

                const eventTicketTypes = (event as any).ticketTypes || [];
                const saleStart = eventTicketTypes[0]?.saleStartAt;
                const saleEnd = eventTicketTypes[0]?.saleEndAt;

                return [
                  { label: 'Etkinlik Adı', value: event.name },
                  { label: 'Kategori', value: event.category?.name || 'Genel', badge: true },
                  { label: 'Konum', value: [event.address?.city, event.address?.district].filter(Boolean).join(', ') || 'Sanal' },
                  { label: 'Başlangıç', value: formatDateTime(event.eventTime) },
                  { label: 'Bitiş', value: event.endTime ? formatDateTime(event.endTime) : null, warn: !event.endTime },
                  { label: 'Kapasite', value: `${event.maxParticipants || 0} kişi` },
                  { label: 'Bilet Fiyatı', value: priceDisplay },
                  ...(event.isPaid ? [
                    { label: 'Satış Başlangıcı', value: saleStart ? formatDateTime(saleStart) : 'Belirtilmedi' },
                    { label: 'Satış Bitişi', value: saleEnd ? formatDateTime(saleEnd) : 'Etkinlik başlangıcına kadar' },
                  ] : []),
                  { label: 'Oluşturulma', value: formatDateTime(event.createdAt), mono: true },
                ];
              })().map((row: any, i: number) => (
                <Box key={i} sx={infoRowSx}>
                  <Typography variant="caption" fontWeight={600} color="text.secondary"
                    textTransform="uppercase" letterSpacing={0.4} sx={{ width: 160, flexShrink: 0 }}>
                    {row.label}
                  </Typography>
                  {row.badge ? (
                    <Chip label={row.value} size="small" color="info" variant="outlined" sx={{ height: 22, fontSize: 12 }} />
                  ) : (
                    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flex: 1 }}>
                      {row.warn && <WarningIcon sx={{ fontSize: 14, color: 'warning.main' }} />}
                      <Typography variant="body2" sx={{
                        fontFamily: row.mono ? 'monospace' : 'inherit',
                        color: row.warn ? 'warning.main' : 'text.primary',
                      }}>
                        {row.value || 'Belirtilmedi'}
                      </Typography>
                    </Stack>
                  )}
                </Box>
              ))}
              {/* Açıklama */}
              <Box sx={{ px: 2.5, py: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" fontWeight={600} color="text.secondary" textTransform="uppercase" letterSpacing={0.4}>
                  Açıklama
                </Typography>
                {event.description ? (
                  <Typography variant="body2" color="text.primary" sx={{ mt: 1, lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                    {event.description}
                  </Typography>
                ) : (
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                    <Typography variant="body2" color="text.disabled">Açıklama eklenmemiş</Typography>
                    <Button size="small" onClick={openEditWizard} sx={{ textTransform: 'none', fontSize: 12, minWidth: 0, p: 0, color: 'primary.main' }}>Düzenle</Button>
                  </Stack>
                )}
              </Box>
            </Box>

            <Stack spacing={2}>
              {/* Capacity */}
              <Box sx={cardSx}>
                <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="subtitle2" fontWeight={700}>Kapasite Durumu</Typography>
                </Box>
                <Box sx={{ p: 2.5 }}>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">Doluluk oranı</Typography>
                    <Typography variant="body2" fontWeight={700} fontFamily="JetBrains Mono, monospace">
                      {event.currentParticipants || 0} / {event.maxParticipants || 0}
                    </Typography>
                  </Stack>
                  <LinearProgress variant="determinate" value={fillPercent} sx={{
                    height: 10, borderRadius: 5, mb: 2, bgcolor: 'divider',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 5,
                      bgcolor: fillPercent > 80 ? 'error.main' : fillPercent > 50 ? 'warning.main' : 'success.light',
                    },
                  }} />
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                    <Box sx={{ bgcolor: 'grey.50', borderRadius: 2, p: 1.5, textAlign: 'center' }}>
                      <Typography variant="h6" fontWeight={800} color="info.main" fontFamily="JetBrains Mono, monospace">
                        {event.currentParticipants || 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">Satılan Bilet</Typography>
                    </Box>
                    <Box sx={{ bgcolor: 'grey.50', borderRadius: 2, p: 1.5, textAlign: 'center' }}>
                      <Typography variant="h6" fontWeight={800} color="text.disabled" fontFamily="JetBrains Mono, monospace">
                        {Math.max(0, (event.maxParticipants || 0) - (event.currentParticipants || 0))}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">Boş Yer</Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>

              {/* Quick Actions */}
              <Box sx={cardSx}>
                <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="subtitle2" fontWeight={700}>Hızlı Aksiyonlar</Typography>
                </Box>
                <Stack sx={{ p: 1.5 }} spacing={0.5}>
                  {[
                    { icon: <TrendingUpIcon fontSize="small" />, label: 'Kapasiteyi Güncelle', action: () => setCapacityOpen(true) },
                    { icon: <LockIcon fontSize="small" />, label: 'Satışı Kapat', action: () => setCloseSalesOpen(true) },
                    { icon: <EmailIcon fontSize="small" />, label: 'Katılımcılara Bildirim Gönder', action: () => setNotifOpen(true) },
                    { icon: <CopyIcon fontSize="small" />, label: 'Etkinlik Bağlantısını Kopyala', action: copyEventLink },
                  ].map((action, i) => (
                    <Button key={i} variant="text" fullWidth startIcon={action.icon}
                      onClick={action.action}
                      sx={{ justifyContent: 'flex-start', textTransform: 'none', fontWeight: 500, color: 'text.secondary', px: 2, py: 1.2, borderRadius: 2, transition: 'all 0.15s', '&:hover': { bgcolor: 'grey.50', color: 'success.main', '& .MuiSvgIcon-root': { color: 'success.main' } } }}>
                      {action.label}
                    </Button>
                  ))}
                </Stack>
              </Box>
            </Stack>
          </Box>
        )}

        {/* ─── BİLETLER ─── */}
        {activeTab === 'biletler' && (
          <Stack spacing={2}>
            {/* Satış Dağılımı Grafikleri */}
            {ticketTypes.length > 0 && (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                {/* Bilet Türü Satış Dağılımı (Pie) */}
                <Box sx={cardSx}>
                  <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="subtitle2" fontWeight={700}>Bilet Türü Dağılımı</Typography>
                    <Typography variant="caption" color="text.secondary">Satış adedi bazında</Typography>
                  </Box>
                  <Box sx={{ px: 2, py: 2, height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={ticketTypes.map((t, i) => ({
                            name: t.name,
                            value: t.capacitySold || 0,
                            fill: ['#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ef4444', '#ec4899'][i % 6],
                          }))}
                          cx="50%" cy="50%"
                          innerRadius={50} outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {ticketTypes.map((_, i) => (
                            <Cell key={i} fill={['#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ef4444', '#ec4899'][i % 6]} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                </Box>

                {/* Kapasite / Satış Karşılaştırma (Bar) */}
                <Box sx={cardSx}>
                  <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="subtitle2" fontWeight={700}>Kapasite & Satış</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Toplam {ticketTypes.reduce((s, t) => s + (t.capacitySold || 0), 0)} / {ticketTypes.reduce((s, t) => s + (t.capacityTotal || 0), 0)} satıldı
                    </Typography>
                  </Box>
                  <Box sx={{ px: 2, py: 2, height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={ticketTypes.map(t => ({
                        name: t.name.length > 12 ? t.name.slice(0, 12) + '…' : t.name,
                        satilan: t.capacitySold || 0,
                        kalan: (t.availableCapacity || 0),
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <RechartsTooltip />
                        <Bar dataKey="satilan" stackId="a" fill="#3b82f6" name="Satılan" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="kalan" stackId="a" fill="#e5e7eb" name="Kalan" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </Box>
              </Box>
            )}

            {/* Stok Uyarısı */}
            {ticketTypes.some(t => t.capacityTotal > 0 && (t.availableCapacity / t.capacityTotal) <= 0.2 && t.availableCapacity > 0) && (
              <Paper sx={{ p: 2, borderRadius: 2, bgcolor: alpha('#f59e0b', 0.08), border: '1px solid', borderColor: alpha('#f59e0b', 0.3) }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Typography sx={{ fontSize: 20 }}>⚠️</Typography>
                  <Box>
                    <Typography variant="body2" fontWeight={700} color="warning.dark">Stok Azalıyor!</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {ticketTypes.filter(t => t.capacityTotal > 0 && (t.availableCapacity / t.capacityTotal) <= 0.2 && t.availableCapacity > 0)
                        .map(t => `${t.name}: ${t.availableCapacity} kaldı`).join(' · ')}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            )}

            {/* Tükenen Biletler Uyarısı */}
            {ticketTypes.some(t => t.availableCapacity <= 0 && t.capacityTotal > 0) && (
              <Paper sx={{ p: 2, borderRadius: 2, bgcolor: alpha('#ef4444', 0.06), border: '1px solid', borderColor: alpha('#ef4444', 0.2) }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Typography sx={{ fontSize: 20 }}>🚫</Typography>
                  <Box>
                    <Typography variant="body2" fontWeight={700} color="error.main">Tükenen Biletler</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {ticketTypes.filter(t => t.availableCapacity <= 0 && t.capacityTotal > 0).map(t => t.name).join(', ')} tükendi.
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            )}

            {/* İade/İptal Özeti (sadece varsa göster) */}
            {(refundStats.refundedCount > 0 || refundStats.cancelledCount > 0) && (
              <Paper sx={{ p: 2, borderRadius: 2, bgcolor: alpha('#6b7280', 0.04), border: '1px solid', borderColor: 'divider' }}>
                <Stack direction="row" spacing={3} alignItems="center">
                  {refundStats.refundedCount > 0 && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">İade Edilen</Typography>
                      <Typography variant="body2" fontWeight={700}>{refundStats.refundedCount} bilet · ₺{refundStats.refundedAmount.toLocaleString('tr-TR')}</Typography>
                    </Box>
                  )}
                  {refundStats.cancelledCount > 0 && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">İptal Edilen</Typography>
                      <Typography variant="body2" fontWeight={700}>{refundStats.cancelledCount} sipariş</Typography>
                    </Box>
                  )}
                </Stack>
              </Paper>
            )}

            <Box sx={cardSx}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Box>
                  <Typography variant="subtitle2" fontWeight={700}>Bilet Tipleri</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {ticketTypes.length} tip · {ticketTypes.reduce((s, t) => s + (t.capacitySold || 0), 0)} satıldı
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                  <Tooltip title="Yenile">
                    <IconButton size="small" onClick={fetchTicketTypes} disabled={ticketTypesLoading}>
                      <RefreshIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Button variant="contained" size="small"
                    onClick={() => { setEditingTicket(null); setTicketForm({ name: '', basePrice: 0, capacityTotal: 100, currency: 'TRY', description: '' }); setShowAddTicket(true); }}
                    sx={{ textTransform: 'none', borderRadius: 2 }}>
                    + Yeni Bilet Ekle
                  </Button>
                </Stack>
              </Box>

              {/* Inline Add/Edit Form */}
              {showAddTicket && (
                <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha('#3b82f6', 0.03) }}>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
                    {editingTicket ? `"${editingTicket.name}" Düzenle` : 'Yeni Bilet Tipi'}
                  </Typography>
                  <Stack spacing={1.5}>
                    <Stack direction="row" spacing={1.5}>
                      <TextField size="small" fullWidth label="Bilet Adı" required value={ticketForm.name}
                        onChange={e => setTicketForm(f => ({ ...f, name: e.target.value }))} />
                      <TextField size="small" label="Fiyat (₺)" type="number" value={ticketForm.basePrice}
                        onChange={e => setTicketForm(f => ({ ...f, basePrice: Number(e.target.value) }))}
                        sx={{ width: 140 }} InputProps={{ inputProps: { min: 0 } }} />
                      <TextField size="small" label="Kapasite" type="number" value={ticketForm.capacityTotal}
                        onChange={e => setTicketForm(f => ({ ...f, capacityTotal: Number(e.target.value) }))}
                        sx={{ width: 120 }} InputProps={{ inputProps: { min: 1 } }} />
                    </Stack>
                    <TextField size="small" fullWidth label="Açıklama (opsiyonel)" value={ticketForm.description}
                      onChange={e => setTicketForm(f => ({ ...f, description: e.target.value }))} />
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button size="small" onClick={() => { setShowAddTicket(false); setEditingTicket(null); }}
                        sx={{ textTransform: 'none' }}>İptal</Button>
                      <Button size="small" variant="contained" onClick={handleSaveTicketType}
                        disabled={ticketSaving || !ticketForm.name.trim()}
                        sx={{ textTransform: 'none', borderRadius: 2 }}>
                        {ticketSaving ? <CircularProgress size={16} /> : editingTicket ? 'Güncelle' : 'Oluştur'}
                      </Button>
                    </Stack>
                  </Stack>
                </Box>
              )}

              {ticketTypesLoading ? (
                <TabLoadingState />
              ) : ticketTypes.length === 0 ? (
                <EmptyState message="Bu etkinlik için henüz bilet tipi tanımlanmamış." icon="🎫" />
              ) : (
                ticketTypes.map(ticket => {
                  const soldPct = ticket.capacityTotal > 0
                    ? Math.round((ticket.capacitySold / ticket.capacityTotal) * 100) : 0;
                  const lowStock = ticket.capacityTotal > 0 && (ticket.availableCapacity / ticket.capacityTotal) <= 0.2;
                  return (
                    <Box key={ticket.id} sx={{
                      display: 'grid', gridTemplateColumns: '1fr auto auto auto auto',
                      gap: 2, alignItems: 'center', px: 2.5, py: 2,
                      borderBottom: '1px solid', borderColor: 'divider',
                      '&:last-child': { borderBottom: 'none' },
                      '&:hover': { bgcolor: 'grey.50' },
                    }}>
                      <Box>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="body2" fontWeight={700}>{ticket.name}</Typography>
                          {lowStock && ticket.availableCapacity > 0 && (
                            <Chip label="Az Kaldı" size="small" color="warning" sx={{ height: 20, fontSize: 10, fontWeight: 700 }} />
                          )}
                          {ticket.availableCapacity <= 0 && ticket.capacityTotal > 0 && (
                            <Chip label="Tükendi" size="small" color="error" sx={{ height: 20, fontSize: 10, fontWeight: 700 }} />
                          )}
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                          {ticket.description || `Kapasite: ${ticket.capacityTotal}`}
                        </Typography>
                        <Box sx={{ mt: 0.5 }}>
                          <LinearProgress variant="determinate" value={soldPct}
                            sx={{ height: 4, borderRadius: 2, bgcolor: 'grey.200', width: 180,
                              '& .MuiLinearProgress-bar': {
                                bgcolor: soldPct >= 100 ? 'error.main' : soldPct > 80 ? 'warning.main' : 'primary.main',
                                borderRadius: 2,
                              } }} />
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.3, display: 'block' }}>
                            {ticket.capacitySold} / {ticket.capacityTotal} ({soldPct}%)
                          </Typography>
                        </Box>
                      </Box>
                      <Typography variant="subtitle1" fontWeight={800} fontFamily="JetBrains Mono, monospace" color="primary.main">
                        {ticket.basePrice > 0 ? `₺${ticket.basePrice.toLocaleString('tr-TR')}` : 'Ücretsiz'}
                      </Typography>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="body2"><strong>{ticket.capacitySold}</strong> satıldı</Typography>
                        <Typography variant="caption" color="text.secondary">{ticket.availableCapacity} kaldı</Typography>
                      </Box>
                      <Chip
                        label={STATUS_LABEL_MAP[ticket.status] ?? ticket.status}
                        size="small"
                        color={STATUS_COLOR_MAP[ticket.status] ?? 'default'}
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="Düzenle">
                          <IconButton size="small" onClick={() => handleEditTicket(ticket)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Sil">
                          <IconButton size="small" color="error"
                            onClick={() => handleDeleteTicketType(ticket.id)}
                            disabled={deletingTicketId === ticket.id || ticket.capacitySold > 0}>
                            {deletingTicketId === ticket.id
                              ? <CircularProgress size={16} />
                              : <DeleteIcon fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Box>
                  );
                })
              )}
            </Box>
          </Stack>
        )}

        {/* ─── SİPARİŞLER ─── */}
        {activeTab === 'satin-alimlar' && (
          <Box sx={cardSx}>
            <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" fontWeight={700}>Satın Alımlar</Typography>
              <Typography variant="caption" color="text.secondary">
                Bu etkinlik için bilet satın alım özeti
              </Typography>
            </Box>

            {ordersLoading ? (
              <TabLoadingState />
            ) : orders.length === 0 ? (
              <EmptyState message="Henüz satın alım yok." icon="💳" />
            ) : (
              <Box sx={{ p: 2.5 }}>
                {/* Özet kartlar */}
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, mb: 3 }}>
                  {(() => {
                    const paidOrders = orders.filter(o => o.status === 'PAID' || o.status === 'COMPLETED');
                    const cancelledOrders = orders.filter(o => o.status === 'CANCELLED' || o.status === 'REFUNDED');
                    const paidTicketCount = paidOrders.reduce((s, o) => s + (o.tickets?.length || 0), 0);
                    return (<>
                      <Box sx={{ p: 2, bgcolor: alpha('#10b981', 0.06), borderRadius: 2, border: '1px solid', borderColor: alpha('#10b981', 0.15), textAlign: 'center' }}>
                        <Typography variant="h5" fontWeight={800} fontFamily="monospace" color="#10b981">
                          ₺{totalRevenue.toLocaleString('tr-TR')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>Toplam Gelir</Typography>
                      </Box>
                      <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2, border: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
                        <Typography variant="h5" fontWeight={800} fontFamily="monospace">
                          {paidOrders.length}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>Başarılı Satın Alım</Typography>
                        {cancelledOrders.length > 0 && (
                          <Typography variant="caption" color="error" display="block" fontSize={10}>
                            +{cancelledOrders.length} iptal/iade
                          </Typography>
                        )}
                      </Box>
                      <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2, border: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
                        <Typography variant="h5" fontWeight={800} fontFamily="monospace">
                          {paidTicketCount}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>Aktif Bilet</Typography>
                      </Box>
                    </>);
                  })()}
                </Box>

                {/* Son 5 satın alım */}
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, mb: 1.5, display: 'block' }}>
                  Son Satın Alımlar
                </Typography>
                <Stack spacing={1} sx={{ mb: 3 }}>
                  {[...orders].sort((a, b) => {
                    // Başarılı siparişler önce, iptal edilenler sona
                    const statusOrder = (s: string) => s === 'PAID' || s === 'COMPLETED' ? 0 : 1;
                    const diff = statusOrder(a.status) - statusOrder(b.status);
                    if (diff !== 0) return diff;
                    // Aynı status grubunda tarihe göre (yeni önce)
                    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
                  }).slice(0, 5).map(order => (
                    <Box key={order.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider', '&:hover': { bgcolor: 'grey.50' } }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight={600} fontFamily="monospace" fontSize={12}>
                          {order.id?.slice(0, 8).toUpperCase()}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {order.createdAt ? formatDateTime(order.createdAt) : '—'}
                        </Typography>
                      </Box>
                      <Typography variant="body2" fontWeight={700} fontFamily="monospace">
                        ₺{(order.totalAmount || 0).toLocaleString('tr-TR')}
                      </Typography>
                      <Chip
                        label={STATUS_LABEL_MAP[order.status] ?? order.status}
                        size="small"
                        color={STATUS_COLOR_MAP[order.status] ?? 'default'}
                        variant="outlined"
                        sx={{ fontWeight: 600, height: 22, fontSize: 11 }}
                      />
                    </Box>
                  ))}
                </Stack>

                {/* Bilet Yönetimine Git */}
                <Button
                  variant="contained"
                  fullWidth
                  href="/admin/tickets"
                  sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 700, py: 1.5 }}
                >
                  Bilet Yönetimine Git →
                </Button>
              </Box>
            )}
          </Box>
        )}

        {/* ─── KATILIMCILAR ─── */}
        {activeTab === 'katilimcilar' && (
          <Box sx={cardSx}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Box>
                <Typography variant="subtitle2" fontWeight={700}>Katılımcı Listesi</Typography>
                <Typography variant="caption" color="text.secondary">
                  {attendees.length} bilet sahibi · {attendees.filter((a: any) => a.checkedIn).length} giriş yaptı
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField size="small" placeholder="İsim, e-posta veya bilet no..."
                  value={attendeesSearch} onChange={e => { setAttendeesSearch(e.target.value); setAttendeesPage(0); }}
                  InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18 }} /></InputAdornment> }}
                  sx={{ width: 240, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                <Tooltip title="Yenile">
                  <IconButton size="small" onClick={fetchAttendees} disabled={attendeesLoading}>
                    {attendeesLoading ? <CircularProgress size={16} /> : <RefreshIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>
                <Button variant="outlined" size="small" startIcon={<DownloadIcon />}
                  onClick={() => {
                    const headers = ['Ad', 'E-posta', 'Bilet No', 'Bilet Türü', 'Koltuk', 'Giriş', 'Giriş Saati', 'Görevli'];
                    const rows = attendees.map((a: any) => [
                      a.name || '—',
                      a.email || '—',
                      a.ticketNo || '—',
                      a.ticketType || '—',
                      a.seat || '—',
                      a.checkedIn ? 'Evet' : 'Hayır',
                      a.checkedInAt ? format(new Date(a.checkedInAt), 'dd.MM.yyyy HH:mm') : '—',
                      a.checkedInBy || '—',
                    ]);
                    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
                    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url; a.download = `katilimcilar_${event.name.replace(/\s+/g, '_')}.csv`;
                    a.click(); URL.revokeObjectURL(url);
                    enqueueSnackbar('CSV indirildi', { variant: 'success' });
                  }}
                  sx={{ textTransform: 'none', borderRadius: 2 }}>CSV İndir</Button>
              </Stack>
            </Box>

            {attendeesLoading ? (
              <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={28} /></Box>
            ) : attendees.length === 0 ? (
              <EmptyState message="Henüz bilet satışı yok — bilet sahibi katılımcı olarak görünecek." icon="👥" />
            ) : filteredAttendees.length === 0 ? (
              <EmptyState message="Arama sonucu bulunamadı." icon="🔍" />
            ) : (
              <>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      {['Katılımcı', 'Bilet No', 'Bilet Türü', 'Koltuk', 'Giriş Durumu'].map(h => (
                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary' }}>
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredAttendees.slice(attendeesPage * 25, (attendeesPage + 1) * 25).map((att: any, i: number) => (
                      <TableRow key={att.id ?? i} hover>
                        <TableCell>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Avatar
                              sx={{ width: 30, height: 30, bgcolor: alpha('#6366f1', 0.12), color: '#6366f1', fontSize: 12, fontWeight: 700 }}>
                              {(att.name || '?')[0]?.toUpperCase()}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight={500}>{att.name || '—'}</Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>{att.email}</Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" fontFamily="monospace" fontSize={11}>
                            {att.ticketNo || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">{att.ticketType || '—'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" fontFamily="monospace" fontSize={11}>
                            {att.seat || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {att.checkedIn ? (
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main' }} />
                              <Box>
                                <Typography variant="caption" fontWeight={600} color="success.main">Giriş Yaptı</Typography>
                                {att.checkedInAt && (
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: 10 }}>
                                    {format(new Date(att.checkedInAt), 'HH:mm', { locale: tr })}
                                    {att.checkedInBy && ` · ${att.checkedInBy.split('@')[0]}`}
                                  </Typography>
                                )}
                              </Box>
                            </Stack>
                          ) : (
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'grey.400' }} />
                              <Typography variant="caption" color="text.secondary">Giriş Yapmadı</Typography>
                            </Stack>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filteredAttendees.length > 25 && (
                  <TablePagination
                    component="div" count={filteredAttendees.length} page={attendeesPage}
                    rowsPerPage={25} rowsPerPageOptions={[25]}
                    onPageChange={(_, p) => setAttendeesPage(p)}
                    labelDisplayedRows={({ from, to, count }) => `${from}–${to} / ${count}`}
                  />
                )}
              </>
            )}
          </Box>
        )}

        {/* ─── DENETİM & GİRİŞ ─── */}
        {activeTab === 'denetim' && (
          <Grid container spacing={2}>
            {/* ━━━ SOL KART — Kapı & Giriş Kontrolü ━━━ */}
            <Grid item xs={12} md={6}>
              <Box sx={cardSx}>
                <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700}>Kapı & Giriş Kontrolü</Typography>
                    <Typography variant="caption" color="text.secondary">Check-in durumu, personel yönetimi</Typography>
                  </Box>
                  <Chip label={event.checkInEnabled ? 'Kapı Açık' : 'Kapı Kapalı'} size="small"
                    color={event.checkInEnabled ? 'success' : 'default'}
                    variant={event.checkInEnabled ? 'filled' : 'outlined'} sx={{ fontWeight: 700 }} />
                </Box>
                <Box sx={{ p: 2.5 }}>
                  {/* Status Banner */}
                  {event.checkInEnabled ? (
                    <Box sx={{ border: '1px solid', borderColor: 'success.light', borderRadius: 2, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, bgcolor: '#f0fdf4' }}>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#22c55e', boxShadow: '0 0 0 3px rgba(34,197,94,0.2)', animation: 'pulse 2s infinite', '@keyframes pulse': { '0%, 100%': { boxShadow: '0 0 0 3px rgba(34,197,94,0.2)' }, '50%': { boxShadow: '0 0 0 6px rgba(34,197,94,0.1)' } } }} />
                        <Box>
                          <Typography variant="body2" fontWeight={600} color="success.dark">Check-in Aktif</Typography>
                          <Typography variant="caption" color="text.secondary">Personeller QR tarama yapabilir</Typography>
                        </Box>
                      </Stack>
                      <Button variant="outlined" size="small" color="error"
                        onClick={async () => {
                          if (!window.confirm('Check-in kapatılsın mı?')) return;
                          try { await api.post(`/events/admin/${event.id}/checkin/disable`); enqueueSnackbar('Kapı kapatıldı', { variant: 'success' }); fetchEvent(); }
                          catch { enqueueSnackbar('İşlem başarısız', { variant: 'error' }); }
                        }}
                        sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}>Kapıyı Kapat</Button>
                    </Box>
                  ) : (
                    <Box sx={{ border: '1px dashed', borderColor: 'grey.300', borderRadius: 2, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, bgcolor: '#fafafa' }}>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'grey.400' }} />
                        <Box>
                          <Typography variant="body2" fontWeight={600}>Check-in Kapalı</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {(() => {
                              if (!event.eventTime) return 'Etkinlik tarihi belirlenmemiş';
                              const diff = new Date(event.eventTime).getTime() - Date.now();
                              if (diff <= 0) return 'Etkinlik başlamış — kapıyı manuel açabilirsiniz';
                              const days = Math.floor(diff / 86400000);
                              const hours = Math.floor((diff % 86400000) / 3600000);
                              if (days > 0) return `${days} gün ${hours} saat kaldı`;
                              return `${hours} saat kaldı`;
                            })()}
                          </Typography>
                        </Box>
                      </Stack>
                      <Button variant="contained" size="small" color="success"
                        onClick={async () => {
                          try { await api.post(`/events/admin/${event.id}/checkin/enable`); enqueueSnackbar('Kapı açıldı — check-in başladı', { variant: 'success' }); fetchEvent(); }
                          catch { enqueueSnackbar('İşlem başarısız', { variant: 'error' }); }
                        }}
                        sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}>Kapıyı Aç</Button>
                    </Box>
                  )}

                  {/* Geri Sayım — sadece check-in kapalıyken */}
                  {!event.checkInEnabled && event.eventTime && new Date(event.eventTime).getTime() > Date.now() && (() => {
                    const diff = new Date(event.eventTime).getTime() - Date.now();
                    const d = Math.floor(diff / 86400000);
                    const h = Math.floor((diff % 86400000) / 3600000);
                    const m = Math.floor((diff % 3600000) / 60000);
                    return (
                      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                        {[{ val: d, label: 'Gün' }, { val: h, label: 'Saat' }, { val: m, label: 'Dakika' }].map(item => (
                          <Box key={item.label} sx={{ flex: 1, bgcolor: '#f3f4f6', borderRadius: 2, p: 1.5, textAlign: 'center' }}>
                            <Typography sx={{ fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: '#111', lineHeight: 1 }}>
                              {String(item.val).padStart(2, '0')}
                            </Typography>
                            <Typography sx={{ fontSize: 9, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', mt: 0.5 }}>
                              {item.label}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    );
                  })()}

                  {/* Otomatik açılma bilgisi */}
                  {!event.checkInEnabled && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#eff6ff', borderRadius: 2, p: 1.5, mb: 2 }}>
                      <AccessTimeIcon sx={{ fontSize: 14, color: '#1d4ed8' }} />
                      <Typography variant="caption" sx={{ color: '#1d4ed8' }}>
                        Etkinlikten 2 saat önce otomatik açılacak
                      </Typography>
                    </Box>
                  )}

                  {/* Seat Map linki */}
                  {event.seatingConfig?.enabled && (
                    <Button variant="text" size="small" fullWidth href={`/admin/events/${event.id}/seat-map`}
                      sx={{ mb: 2, textTransform: 'none', borderRadius: 2, fontWeight: 600, color: 'text.secondary', justifyContent: 'flex-start' }}>
                      🪑 Koltuk Haritasını Görüntüle →
                    </Button>
                  )}

                  {/* Staff Atamaları */}
                  <CheckInStaffPanel eventId={event.id} />
                </Box>
              </Box>
            </Grid>

            {/* ━━━ SAĞ KART — Giriş İstatistikleri ━━━ */}
            <Grid item xs={12} md={6}>
              <Box sx={cardSx}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700}>Giriş İstatistikleri</Typography>
                    <Typography variant="caption" color="text.secondary">QR tarama verileri</Typography>
                  </Box>
                  <Tooltip title="Yenile">
                    <IconButton size="small" onClick={fetchCheckInStats} disabled={checkInLoading}>
                      {checkInLoading ? <CircularProgress size={16} /> : <RefreshIcon fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                </Box>

                {checkInLoading ? (
                  <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={24} /></Box>
                ) : !checkInStats || checkInStats.totalTickets === 0 ? (
                  <Box sx={{ py: 5, textAlign: 'center' }}>
                    <Box sx={{ width: 48, height: 48, bgcolor: '#f3f4f6', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1.5 }}>
                      <QrIcon sx={{ color: '#9ca3af', fontSize: 24 }} />
                    </Box>
                    <Typography variant="body2" color="text.secondary" fontWeight={500}>Giriş kontrolü başlamadı</Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                      Etkinlik günü QR tarama verileri burada görünecek
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ p: 2.5 }}>
                    {/* 3 stat kart */}
                    <Grid container spacing={1.5} sx={{ mb: 2 }}>
                      {[
                        { val: checkInStats.checkedIn, label: 'Giriş Yaptı', color: '#16a34a' },
                        { val: checkInStats.totalTickets, label: 'Toplam Bilet', color: '#6b7280' },
                        { val: checkInStats.notCheckedIn, label: 'Bekliyor', color: '#f59e0b' },
                      ].map(item => (
                        <Grid item xs={4} key={item.label}>
                          <Box sx={{ bgcolor: '#f9fafb', borderRadius: 2, p: 1.5, textAlign: 'center' }}>
                            <Typography sx={{ fontSize: 22, fontWeight: 700, color: item.color, lineHeight: 1 }}>{item.val}</Typography>
                            <Typography sx={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', mt: 0.5 }}>{item.label}</Typography>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>

                    {/* Progress bar */}
                    <Box sx={{ mb: 2 }}>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.75 }}>
                        <Typography variant="caption" color="text.secondary">Doluluk oranı</Typography>
                        <Typography variant="caption" fontWeight={500}>{checkInStats.checkedIn} / {checkInStats.totalTickets}</Typography>
                      </Stack>
                      <LinearProgress variant="determinate" value={checkInStats.checkInRate}
                        sx={{ height: 8, borderRadius: 4, bgcolor: '#f3f4f6', '& .MuiLinearProgress-bar': { bgcolor: checkInStats.checkInRate > 80 ? '#f59e0b' : '#16a34a', borderRadius: 4 } }} />
                    </Box>
                  </Box>
                )}
              </Box>
            </Grid>

            {/* ━━━ GİRİŞ KAYITLARI — Full width tablo ━━━ */}
            <Grid item xs={12}>
              <Box sx={cardSx}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', flexWrap: 'wrap', gap: 1 }}>
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700}>Giriş Kayıtları</Typography>
                    <Typography variant="caption" color="text.secondary">Tüm bilet sahiplerinin giriş durumu</Typography>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <TextField size="small" placeholder="İsim veya bilet no..."
                      value={checkInLogsSearch} onChange={e => setCheckInLogsSearch(e.target.value)}
                      InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16, color: 'text.disabled', mr: 0.5 }} /></InputAdornment> }}
                      sx={{ width: 220, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                    <Chip label={`${checkInLogs.filter((l: any) => l.checkedIn).length} / ${checkInLogs.length} giriş yaptı`}
                      size="small" color="success" variant="outlined" sx={{ fontWeight: 600 }} />
                    <Tooltip title="Yenile">
                      <IconButton size="small" onClick={fetchCheckInLogs} disabled={checkInLogsLoading}>
                        {checkInLogsLoading ? <CircularProgress size={16} /> : <RefreshIcon fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                    <Button variant="outlined" size="small" startIcon={<DownloadIcon sx={{ fontSize: 14 }} />}
                      onClick={() => {
                        const headers = ['Ad Soyad', 'E-posta', 'Bilet No', 'Koltuk', 'Bilet Türü', 'Giriş Saati', 'Görevli', 'Kanal', 'Durum'];
                        const rows = checkInLogs.map((l: any) => [
                          l.attendeeName || '—', l.attendeeEmail || '—', l.ticketNumber || '—',
                          l.seatInfo || '—', l.ticketType || '—',
                          l.checkedInAt ? format(new Date(l.checkedInAt), 'dd.MM.yyyy HH:mm') : '',
                          l.checkedInBy || '', l.gate || '',
                          l.checkedIn ? 'Giriş Yaptı' : 'Bekleniyor',
                        ]);
                        const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
                        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a'); a.href = url;
                        a.download = `giris-kayitlari-${event.name.replace(/\s+/g, '_')}.csv`;
                        a.click(); URL.revokeObjectURL(url);
                        enqueueSnackbar('CSV indirildi', { variant: 'success' });
                      }}
                      sx={{ textTransform: 'none', fontSize: 11, borderRadius: 2 }}>CSV İndir</Button>
                  </Stack>
                </Box>

                {checkInLogsLoading ? (
                  <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={28} /></Box>
                ) : checkInLogs.length === 0 && !checkInLogsSearch ? (
                  <Box sx={{ textAlign: 'center', py: 5 }}>
                    <Typography variant="body2" color="text.secondary" fontWeight={500}>Henüz giriş kaydı yok</Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>Bilet satışı yapıldığında kayıtlar burada görünecek</Typography>
                  </Box>
                ) : filteredCheckInLogs.length === 0 && checkInLogsSearch ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" color="text.secondary">"{checkInLogsSearch}" için sonuç bulunamadı</Typography>
                  </Box>
                ) : (
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#fafafa' }}>
                        {['Kişi', 'Bilet No', 'Koltuk', 'Bilet Türü', 'Giriş Saati', 'Görevli', 'Kanal', 'Durum'].map(col => (
                          <TableCell key={col} sx={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', py: 1 }}>{col}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredCheckInLogs.map((log: any, i: number) => (
                        <TableRow key={log.id ?? i} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={500}>{log.attendeeName || '—'}</Typography>
                            <Typography variant="caption" color="text.secondary">{log.attendeeEmail}</Typography>
                          </TableCell>
                          <TableCell><Typography sx={{ fontSize: 11, fontFamily: 'monospace', color: '#374151' }}>{log.ticketNumber || '—'}</Typography></TableCell>
                          <TableCell><Typography variant="body2">{log.seatInfo || '—'}</Typography></TableCell>
                          <TableCell><Typography variant="body2">{log.ticketType || '—'}</Typography></TableCell>
                          <TableCell>
                            {log.checkedInAt ? (
                              <Typography variant="body2" fontWeight={500}>{format(new Date(log.checkedInAt), 'HH:mm')}</Typography>
                            ) : (
                              <Typography variant="body2" color="text.disabled">—</Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color={log.checkedInBy ? 'text.primary' : 'text.disabled'}>
                              {log.checkedInBy ? log.checkedInBy.split('@')[0] : '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {log.gate ? (
                              <Chip label={log.gate} size="small" sx={{ fontSize: 10, height: 20, bgcolor: log.gate === 'QR' ? '#eff6ff' : '#f9fafb', color: log.gate === 'QR' ? '#1d4ed8' : '#6b7280', border: log.gate === 'QR' ? 'none' : '0.5px solid #e5e7eb' }} />
                            ) : <Typography variant="caption" color="text.disabled">—</Typography>}
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.75} alignItems="center">
                              <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: log.checkedIn ? '#22c55e' : '#d1d5db' }} />
                              <Typography variant="caption" sx={{ color: log.checkedIn ? '#16a34a' : '#6b7280', fontWeight: 500 }}>
                                {log.checkedIn ? 'Giriş Yaptı' : 'Bekleniyor'}
                              </Typography>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Box>
            </Grid>
          </Grid>
        )}

        {/* ─── AYARLAR ─── */}
        {activeTab === 'ayarlar' && (
          <Stack spacing={2}>
            <Box sx={cardSx}>
              <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2" fontWeight={700}>Görünürlük & Satış</Typography>
                {settingsLoading && <CircularProgress size={16} />}
              </Box>
              <Box sx={{ px: 2.5 }}>
                {[
                  {
                    key: 'isPublic' as const,
                    name: 'Etkinliği yayında göster',
                    desc: 'Kapatırsanız kullanıcılar etkinliği göremez',
                  },
                  {
                    key: 'salesOpen' as const,
                    name: 'Bilet satışına izin ver',
                    desc: 'Kapatırsanız yeni satın alma yapılamaz',
                  },
                ].map(toggle => (
                  <Stack key={toggle.key} direction="row" alignItems="center" justifyContent="space-between"
                    sx={{ py: 1.5, borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 'none' } }}>
                    <Box>
                      <Typography variant="body2" fontWeight={500}>{toggle.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{toggle.desc}</Typography>
                    </Box>
                    <Switch
                      checked={settingsValues[toggle.key]}
                      onChange={e => handleSettingToggle(toggle.key, e.target.checked)}
                      disabled={settingsLoading}
                      color="primary"
                    />
                  </Stack>
                ))}
              </Box>
            </Box>

            {/* Biletli Etkinliğe Dönüştür — sadece ücretsiz etkinliklerde */}
            {!event.isPaid && (
              <Box sx={{
                border: '1.5px solid', borderColor: t => alpha(t.palette.primary.main, 0.3),
                borderRadius: 3, overflow: 'hidden',
                bgcolor: t => alpha(t.palette.primary.main, 0.03),
              }}>
                <Box sx={{ px: 2.5, py: 2 }}>
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    <Box sx={{
                      width: 44, height: 44, borderRadius: 2,
                      bgcolor: t => alpha(t.palette.primary.main, 0.1),
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Typography fontSize={22}>🎫</Typography>
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
                        Biletli Etkinliğe Dönüştür
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, lineHeight: 1.6 }}>
                        Bu etkinlik şu an <strong>ücretsiz</strong>.
                        Biletli etkinliğe dönüştürerek bilet satışı başlatabilirsiniz.
                        Mevcut {event.currentParticipants || 0} katılımcı korunur.
                      </Typography>
                      <Stack spacing={0.5} sx={{ mb: 2 }}>
                        {[
                          'Bilet türleri ve fiyatları belirlenir',
                          'Salon planı atanabilir (numaralı koltuk)',
                          'Satış takvimi ve iade politikası tanımlanır',
                        ].map((item, i) => (
                          <Stack key={i} direction="row" spacing={1} alignItems="center">
                            <CheckCircleIcon sx={{ fontSize: 14, color: 'primary.main' }} />
                            <Typography variant="caption" color="text.secondary">{item}</Typography>
                          </Stack>
                        ))}
                      </Stack>
                      <Button
                        variant="contained"
                        onClick={() => navigate(`/event-creation/${event.id}?convert=true`)}
                        sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, px: 3 }}
                      >
                        🎫 Biletli Etkinliğe Dönüştür
                      </Button>
                    </Box>
                  </Stack>
                </Box>
              </Box>
            )}

            {/* Danger Zone */}
            <Box sx={{
              border: '1.5px solid', borderColor: t => alpha(t.palette.error.main, 0.3),
              borderRadius: 3, p: 2.5, bgcolor: t => alpha(t.palette.error.main, 0.04),
            }}>
              <Typography variant="subtitle2" fontWeight={700} color="error.main" sx={{ mb: 0.5 }}>⚠ Tehlikeli Bölge</Typography>
              <Typography variant="body2" color="error.dark" sx={{ mb: 2 }}>
                Aşağıdaki aksiyonlar geri alınamaz. Onay adımı geçilmeden işlem yapılamaz.
              </Typography>
              <Stack direction="row" spacing={1.5} flexWrap="wrap">
                <Button variant="outlined" color="error" startIcon={<PauseIcon />}
                  onClick={() => setPauseOpen(true)}
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}>
                  Etkinliği Duraklat
                </Button>
                <Button variant="outlined" color="error" startIcon={<CancelIcon />}
                  onClick={() => setCancelOpen(true)}
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}>
                  Etkinliği İptal Et
                </Button>
                <Button variant="outlined" color="error" startIcon={<DeleteIcon />}
                  onClick={() => { if (orders.length === 0) fetchOrders(); setDeleteOpen(true); }}
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}>
                  Etkinliği Sil
                </Button>
              </Stack>
            </Box>
          </Stack>
        )}
      </Box>

      {/* ═══ MODALS ═══ */}
      <PauseModal open={pauseOpen} onClose={() => setPauseOpen(false)} onConfirm={handlePause} loading={actionLoading} />
      <CancelModal open={cancelOpen} onClose={() => setCancelOpen(false)} onConfirm={handleCancel}
        eventName={event.name} participantCount={event.currentParticipants || 0} loading={actionLoading} />
      <DeleteModal open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={handleDelete} loading={actionLoading}
        eventName={event.name}
        paidOrderCount={orders.filter(o => o.status === 'PAID').length}
        ticketCount={orders.filter(o => o.status === 'PAID').reduce((sum, o) => sum + (o.tickets?.length || 0), 0)}
        totalRevenue={totalRevenue}
      />
      <NotificationModal open={notifOpen} onClose={() => setNotifOpen(false)} onSend={handleSendNotification}
        eventName={event?.name || ''} participantCount={participants.length} loading={actionLoading} />
      <CapacityModal open={capacityOpen} onClose={() => setCapacityOpen(false)} onConfirm={handleUpdateCapacity}
        currentCapacity={event?.maxParticipants || 0} currentParticipants={event?.currentParticipants || 0} loading={actionLoading} />
      <CloseSalesModal open={closeSalesOpen} onClose={() => setCloseSalesOpen(false)} onConfirm={handleCloseSales}
        eventName={event?.name || ''} loading={actionLoading} />
      {event && (
        <EditEventModal open={editOpen} onClose={() => setEditOpen(false)} onSave={handleEditEvent} loading={actionLoading}
          isPaid={event.isPaid}
          eventId={event.id}
          seatingEnabled={Boolean((event as any).seatingConfig?.enabled)}
          initialData={{
            name: event.name || '',
            description: event.description || '',
            eventTime: parseDate(event.eventTime),
            endTime: parseDate(event.endTime),
            maxParticipants: event.maxParticipants || 0,
            ticketPrice: event.ticketPrice || 0,
            isRegistrationOpen: event.isRegistrationOpen !== false,
            isPrivate: event.isPrivate === true,
            saleStartDate: parseDate((event as any).ticketTypes?.[0]?.saleStartAt || ticketTypes[0]?.saleStartAt),
            saleEndDate: parseDate((event as any).ticketTypes?.[0]?.saleEndAt || ticketTypes[0]?.saleEndAt),
            coverImage: null,
            currentImageUrl: event.image || null,
            address: event.address ? {
              city: event.address.city,
              district: event.address.district,
              country: event.address.country || 'Türkiye',
              street: event.address.street,
              description: event.address.description || [event.address.city, event.address.district].filter(Boolean).join(', '),
              latitude: event.address.latitude,
              longitude: event.address.longitude,
            } : null,
          }} />
      )}
    </Box>
  );
}
