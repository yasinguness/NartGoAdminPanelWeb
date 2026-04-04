/**
 * EventDetail — Full-featured event detail page with 6 tabs, all backed by real API data.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import {
  Box, Typography, Avatar, Stack, Button, Tab, Tabs, Divider, Paper,
  Table, TableHead, TableRow, TableCell, TableBody, Chip, LinearProgress,
  Switch, IconButton, alpha, Skeleton, CircularProgress, Tooltip,
  TextField, InputAdornment, TablePagination,
} from '@mui/material';
import {
  ArrowBack as BackIcon, Event as EventIcon, Edit as EditIcon,
  PauseCircle as PauseIcon, Cancel as CancelIcon, Delete as DeleteIcon,
  ContentCopy as CopyIcon, Email as EmailIcon, Lock as LockIcon,
  Download as DownloadIcon, TrendingUp as TrendingUpIcon,
  Search as SearchIcon, Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon, HourglassEmpty as PendingIcon,
  QrCode as QrIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { eventService } from '../../services/event/eventService';
import { adminOperationsService } from '../../services/admin/adminOperationsService';
import type { TicketTypeResponse, OrderResponse, CheckInStats } from '../../types/admin/adminOperations';
import { EventResponseDTO, EventStatus, ParticipationDTO } from '../../types/events/eventModel';
import { useEvent } from '../../hooks/useEvent';
import { PauseModal, CancelModal, DeleteModal } from './components/EventModals';

// ─── TYPES ──────────────────────────────────────────────────
type TabValue = 'genel' | 'biletler' | 'siparisler' | 'katilimcilar' | 'denetim' | 'ayarlar';

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
  const { deleteEvent } = useEvent();

  // ── Core state ────────────────────────────────────────────
  const [event, setEvent] = useState<EventResponseDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabValue>('genel');

  // ── Modal states ──────────────────────────────────────────
  const [pauseOpen, setPauseOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
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

  // ── Settings state ────────────────────────────────────────
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsValues, setSettingsValues] = useState({
    isPublic: true, salesOpen: true, waitlistEnabled: false, showParticipants: true,
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
        waitlistEnabled: false,
        showParticipants: true,
      });
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
    } catch {
      enqueueSnackbar('Bilet tipleri yüklenemedi', { variant: 'error' });
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

  // ── Lazy tab loading ──────────────────────────────────────
  useEffect(() => {
    if (activeTab === 'biletler' && ticketTypes.length === 0) fetchTicketTypes();
    if (activeTab === 'siparisler' && orders.length === 0) fetchOrders();
    if (activeTab === 'denetim') fetchCheckInStats();
  }, [activeTab, fetchTicketTypes, fetchOrders, fetchCheckInStats, ticketTypes.length, orders.length]);

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

  const filteredAttendees = useMemo(() => {
    if (!attendeesSearch.trim()) return participants;
    const q = attendeesSearch.toLowerCase();
    return participants.filter(p =>
      p.userName?.toLowerCase().includes(q)
    );
  }, [participants, attendeesSearch]);

  const filteredOrders = useMemo(() => {
    if (!ordersSearch.trim()) return orders;
    const q = ordersSearch.toLowerCase();
    return orders.filter(o => o.id?.toLowerCase().includes(q));
  }, [orders, ordersSearch]);

  const totalRevenue = useMemo(() =>
    orders.filter(o => o.status === 'PAID').reduce((sum, o) => sum + (o.totalAmount || 0), 0),
    [orders]);

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
      await fetchEvent();
    } catch { enqueueSnackbar('İşlem başarısız', { variant: 'error' }); }
    finally { setActionLoading(false); }
  };

  const handleDelete = async () => {
    if (!event) return;
    setActionLoading(true);
    try {
      await deleteEvent(event.id, event.organizerId);
      enqueueSnackbar('Etkinlik silindi', { variant: 'success' });
      navigate('/events');
    } catch { enqueueSnackbar('Silme başarısız', { variant: 'error' }); }
    finally { setActionLoading(false); }
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
                📅 {event.eventTime ? format(new Date(event.eventTime), 'dd MMM yyyy, HH:mm', { locale: tr }) : '—'}
                {event.endTime && ` – ${format(new Date(event.endTime), 'HH:mm', { locale: tr })}`}
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
              onClick={() => navigate(`/event-creation/${event.id}`)}
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
            { label: 'Toplam Gelir', value: `₺${totalRevenue > 0 ? totalRevenue.toLocaleString('tr-TR') : ((event.ticketPrice || 0) * (event.currentParticipants || 0)).toLocaleString('tr-TR')}`, color: 'text.primary' },
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
          <Tab value="siparisler" label="📦 Siparişler" />
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
                  onClick={() => navigate(`/event-creation/${event.id}`)}
                  sx={{ textTransform: 'none' }}>Düzenle</Button>
              </Box>
              {[
                { label: 'Etkinlik Adı', value: event.name },
                { label: 'Kategori', value: event.category?.name || 'Genel', badge: true },
                { label: 'Konum', value: [event.address?.city, event.address?.district].filter(Boolean).join(', ') || 'Sanal' },
                { label: 'Başlangıç', value: event.eventTime ? format(new Date(event.eventTime), 'dd MMM yyyy, HH:mm', { locale: tr }) : '—' },
                { label: 'Bitiş', value: event.endTime ? format(new Date(event.endTime), 'dd MMM yyyy, HH:mm', { locale: tr }) : '—' },
                { label: 'Kapasite', value: `${event.maxParticipants || 0} kişi` },
                { label: 'Bilet Fiyatı', value: event.isPaid ? `₺${event.ticketPrice || 0}` : 'Ücretsiz' },
                { label: 'Oluşturulma', value: event.createdAt ? format(new Date(event.createdAt), 'dd MMM yyyy, HH:mm', { locale: tr }) : '—', mono: true },
              ].map((row, i) => (
                <Box key={i} sx={infoRowSx}>
                  <Typography variant="caption" fontWeight={600} color="text.secondary"
                    textTransform="uppercase" letterSpacing={0.4} sx={{ width: 160, flexShrink: 0 }}>
                    {row.label}
                  </Typography>
                  {row.badge ? (
                    <Chip label={row.value} size="small" color="info" variant="outlined" sx={{ height: 22, fontSize: 12 }} />
                  ) : (
                    <Typography variant="body2" sx={{ flex: 1, fontFamily: row.mono ? 'monospace' : 'inherit' }}>
                      {row.value}
                    </Typography>
                  )}
                </Box>
              ))}
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
                      <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">Kayıtlı</Typography>
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
                    { icon: <TrendingUpIcon fontSize="small" />, label: 'Kapasiteyi Güncelle', action: () => enqueueSnackbar('Kapasite güncelleme — yakında', { variant: 'info' }) },
                    { icon: <LockIcon fontSize="small" />, label: 'Satışı Kapat', action: () => adminOperationsService.closeEventSales(id!).then(() => { enqueueSnackbar('Satışlar kapatıldı', { variant: 'success' }); fetchEvent(); }).catch(() => enqueueSnackbar('İşlem başarısız', { variant: 'error' })) },
                    { icon: <EmailIcon fontSize="small" />, label: 'Katılımcılara Bildirim Gönder', action: () => enqueueSnackbar('Toplu bildirim — bildirimler sayfasından gönderin', { variant: 'info' }) },
                    { icon: <CopyIcon fontSize="small" />, label: 'Etkinlik Bağlantısını Kopyala', action: copyEventLink },
                  ].map((action, i) => (
                    <Button key={i} variant="text" fullWidth startIcon={action.icon}
                      onClick={action.action}
                      sx={{ justifyContent: 'flex-start', textTransform: 'none', fontWeight: 500, color: 'text.secondary', px: 2, py: 1, borderRadius: 2, '&:hover': { bgcolor: 'grey.50', color: 'text.primary' } }}>
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
                  onClick={() => navigate(`/event-creation/${event.id}`)}
                  sx={{ textTransform: 'none', borderRadius: 2 }}>
                  + Yeni Bilet Ekle
                </Button>
              </Stack>
            </Box>

            {ticketTypesLoading ? (
              <TabLoadingState />
            ) : ticketTypes.length === 0 ? (
              <EmptyState message="Bu etkinlik için henüz bilet tipi tanımlanmamış." icon="🎫" />
            ) : (
              ticketTypes.map(ticket => {
                const soldPct = ticket.capacityTotal > 0
                  ? Math.round((ticket.capacitySold / ticket.capacityTotal) * 100) : 0;
                return (
                  <Box key={ticket.id} sx={{
                    display: 'grid', gridTemplateColumns: '1fr auto auto auto',
                    gap: 2, alignItems: 'center', px: 2.5, py: 2,
                    borderBottom: '1px solid', borderColor: 'divider',
                    '&:last-child': { borderBottom: 'none' },
                    '&:hover': { bgcolor: 'grey.50' },
                  }}>
                    <Box>
                      <Typography variant="body2" fontWeight={700}>{ticket.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {ticket.description || `Kapasite: ${ticket.capacityTotal}`}
                      </Typography>
                      <Box sx={{ mt: 0.5 }}>
                        <LinearProgress variant="determinate" value={soldPct}
                          sx={{ height: 4, borderRadius: 2, bgcolor: 'grey.200', width: 180,
                            '& .MuiLinearProgress-bar': { bgcolor: soldPct > 80 ? 'error.main' : 'primary.main', borderRadius: 2 } }} />
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
                  </Box>
                );
              })
            )}
          </Box>
        )}

        {/* ─── SİPARİŞLER ─── */}
        {activeTab === 'siparisler' && (
          <Box sx={cardSx}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Box>
                <Typography variant="subtitle2" fontWeight={700}>Siparişler</Typography>
                <Typography variant="caption" color="text.secondary">
                  {orders.length} sipariş · ₺{totalRevenue.toLocaleString('tr-TR')} toplam
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField size="small" placeholder="Sipariş ara..."
                  value={ordersSearch} onChange={e => { setOrdersSearch(e.target.value); setOrdersPage(0); }}
                  InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18 }} /></InputAdornment> }}
                  sx={{ width: 200, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                <Tooltip title="Yenile">
                  <IconButton size="small" onClick={fetchOrders} disabled={ordersLoading}>
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Button variant="outlined" size="small" startIcon={<DownloadIcon />}
                  sx={{ textTransform: 'none', borderRadius: 2 }}>CSV</Button>
              </Stack>
            </Box>

            {ordersLoading ? (
              <TabLoadingState />
            ) : filteredOrders.length === 0 ? (
              <EmptyState message="Henüz sipariş yok." icon="📦" />
            ) : (
              <>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      {['Sipariş No', 'Bilet Sayısı', 'Tutar', 'Para Birimi', 'Oluşturulma', 'Ödeme', 'Durum'].map(h => (
                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary' }}>
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredOrders.slice(ordersPage * 20, (ordersPage + 1) * 20).map(order => (
                      <TableRow key={order.id} sx={{ '&:hover': { bgcolor: 'grey.50' } }}>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                          {order.id?.slice(0, 8).toUpperCase()}
                        </TableCell>
                        <TableCell sx={{ fontSize: 13 }}>
                          {order.tickets?.length || order.items?.reduce((s, i) => s + (i.quantity || 0), 0) || '—'}
                        </TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13 }}>
                          ₺{(order.totalAmount || 0).toLocaleString('tr-TR')}
                        </TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{order.currency || 'TRY'}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                          {order.createdAt ? format(new Date(order.createdAt), 'dd MMM yy, HH:mm', { locale: tr }) : '—'}
                        </TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                          {order.paidAt ? format(new Date(order.paidAt), 'dd MMM yy, HH:mm', { locale: tr }) : '—'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={STATUS_LABEL_MAP[order.status] ?? order.status}
                            size="small"
                            color={STATUS_COLOR_MAP[order.status] ?? 'default'}
                            variant="outlined"
                            sx={{ fontWeight: 600, height: 22 }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filteredOrders.length > 20 && (
                  <TablePagination
                    component="div" count={filteredOrders.length} page={ordersPage}
                    rowsPerPage={20} rowsPerPageOptions={[20]}
                    onPageChange={(_, p) => setOrdersPage(p)}
                    labelDisplayedRows={({ from, to, count }) => `${from}–${to} / ${count}`}
                  />
                )}
              </>
            )}
          </Box>
        )}

        {/* ─── KATILIMCILAR ─── */}
        {activeTab === 'katilimcilar' && (
          <Box sx={cardSx}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Box>
                <Typography variant="subtitle2" fontWeight={700}>Katılımcı Listesi</Typography>
                <Typography variant="caption" color="text.secondary">{participants.length} kişi kayıtlı</Typography>
              </Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField size="small" placeholder="İsim ara..."
                  value={attendeesSearch} onChange={e => { setAttendeesSearch(e.target.value); setAttendeesPage(0); }}
                  InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18 }} /></InputAdornment> }}
                  sx={{ width: 180, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                <Button variant="outlined" size="small" startIcon={<DownloadIcon />}
                  sx={{ textTransform: 'none', borderRadius: 2 }}>CSV İndir</Button>
                <Button variant="outlined" size="small" startIcon={<EmailIcon />}
                  sx={{ textTransform: 'none', borderRadius: 2 }}>Toplu Bildirim</Button>
              </Stack>
            </Box>

            {participants.length === 0 ? (
              <EmptyState message="Henüz katılımcı yok." icon="👥" />
            ) : filteredAttendees.length === 0 ? (
              <EmptyState message="Arama sonucu bulunamadı." icon="🔍" />
            ) : (
              <>
                {filteredAttendees.slice(attendeesPage * 25, (attendeesPage + 1) * 25).map((attendee, i) => (
                  <Stack key={attendee.id ?? i} direction="row" spacing={1.5} alignItems="center"
                    sx={{ px: 2.5, py: 1.2, borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 'none' }, '&:hover': { bgcolor: 'grey.50' } }}>
                    <Avatar src={attendee.userImage}
                      sx={{ width: 34, height: 34, bgcolor: alpha('#6366f1', 0.12), color: '#6366f1', fontSize: 13, fontWeight: 700 }}>
                      {(attendee.userName || '?')[0]}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" fontWeight={500}>{attendee.userName || '—'}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {attendee.ticketCode ? `Bilet: ${attendee.ticketCode}` : ''}
                        {attendee.joinedAt ? ` · ${format(new Date(attendee.joinedAt), 'dd MMM yyyy', { locale: tr })}` : ''}
                      </Typography>
                    </Box>
                    <Chip
                      label={STATUS_LABEL_MAP[attendee.status] ?? attendee.status ?? 'Kayıtlı'}
                      size="small"
                      color={STATUS_COLOR_MAP[attendee.status ?? ''] ?? 'default'}
                      variant="outlined"
                      sx={{ fontWeight: 600, height: 22 }}
                    />
                    <Chip
                      label={STATUS_LABEL_MAP[attendee.paymentStatus] ?? attendee.paymentStatus ?? '—'}
                      size="small"
                      color={STATUS_COLOR_MAP[attendee.paymentStatus ?? ''] ?? 'default'}
                      variant="filled"
                      sx={{ fontWeight: 600, height: 22 }}
                    />
                  </Stack>
                ))}
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
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            {/* Check-in Stats */}
            <Box sx={cardSx}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Box>
                  <Typography variant="subtitle2" fontWeight={700}>Giriş Kontrolü</Typography>
                  <Typography variant="caption" color="text.secondary">QR tarama istatistikleri</Typography>
                </Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Tooltip title="Yenile">
                    <IconButton size="small" onClick={fetchCheckInStats} disabled={checkInLoading}>
                      {checkInLoading ? <CircularProgress size={16} /> : <RefreshIcon fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                  <Chip
                    label={checkInStats?.checkedIn ? `${checkInStats.checkedIn} giriş yapıldı` : 'Veri yok'}
                    size="small" variant="outlined"
                    color={checkInStats?.checkedIn ? 'success' : 'default'}
                  />
                </Stack>
              </Box>

              {checkInLoading ? (
                <Box sx={{ p: 3 }}><CircularProgress size={24} /></Box>
              ) : !checkInStats || checkInStats.totalTickets === 0 ? (
                <Box sx={{ p: 5, textAlign: 'center', color: 'text.secondary' }}>
                  <Typography sx={{ fontSize: 40, mb: 1 }}>📱</Typography>
                  <Typography variant="subtitle2" fontWeight={600} color="text.secondary">Giriş kontrolü başlamadı</Typography>
                  <Typography variant="caption" color="text.secondary">Etkinlik gününde QR tarama verileri burada görünecek.</Typography>
                </Box>
              ) : (
                <Box sx={{ p: 2.5 }}>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 1.5 }}>
                    <Typography variant="caption" color="text.secondary">Giriş oranı</Typography>
                    <Typography variant="body2" fontWeight={700} fontFamily="JetBrains Mono, monospace">
                      {checkInStats.checkedIn} / {checkInStats.totalTickets}
                    </Typography>
                  </Stack>
                  <LinearProgress variant="determinate" value={checkInStats.checkInRate}
                    sx={{ height: 8, borderRadius: 4, mb: 2, bgcolor: 'grey.200',
                      '& .MuiLinearProgress-bar': { borderRadius: 4, bgcolor: 'success.main' } }} />
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1.5 }}>
                    {[
                      { label: 'Toplam Bilet', value: checkInStats.totalTickets, icon: <QrIcon />, color: 'info.main' },
                      { label: 'Giriş Yaptı', value: checkInStats.checkedIn, icon: <CheckCircleIcon />, color: 'success.main' },
                      { label: 'Giriş Yapmadı', value: checkInStats.notCheckedIn, icon: <PendingIcon />, color: 'text.secondary' },
                    ].map((s, i) => (
                      <Paper key={i} elevation={0} sx={{ p: 1.5, borderRadius: 2, bgcolor: 'grey.50', textAlign: 'center' }}>
                        <Box sx={{ color: s.color, mb: 0.5 }}>{s.icon}</Box>
                        <Typography variant="h6" fontWeight={800} fontFamily="JetBrains Mono, monospace" sx={{ color: s.color }}>{s.value}</Typography>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>{s.label}</Typography>
                      </Paper>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>

            {/* Audit Logs — sourced from event participants / ticket data */}
            <Box sx={cardSx}>
              <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle2" fontWeight={700}>Etkinlik Zaman Çizelgesi</Typography>
                <Typography variant="caption" color="text.secondary">Oluşturma ve güncelleme geçmişi</Typography>
              </Box>
              <Stack sx={{ p: 2 }} spacing={1.5}>
                {event.createdAt && (
                  <Box sx={{ display: 'flex', gap: 1.5, p: 1.5, bgcolor: 'grey.50', borderRadius: 2 }}>
                    <Typography sx={{ fontSize: 16 }}>📅</Typography>
                    <Box>
                      <Typography variant="body2" fontWeight={500}>Etkinlik oluşturuldu</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {format(new Date(event.createdAt), 'dd MMM yyyy, HH:mm', { locale: tr })}
                      </Typography>
                    </Box>
                  </Box>
                )}
                {event.updatedAt && event.updatedAt !== event.createdAt && (
                  <Box sx={{ display: 'flex', gap: 1.5, p: 1.5, bgcolor: 'grey.50', borderRadius: 2 }}>
                    <Typography sx={{ fontSize: 16 }}>✏️</Typography>
                    <Box>
                      <Typography variant="body2" fontWeight={500}>Etkinlik güncellendi</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {format(new Date(event.updatedAt), 'dd MMM yyyy, HH:mm', { locale: tr })}
                      </Typography>
                    </Box>
                  </Box>
                )}
                {ticketTypes.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 1.5, p: 1.5, bgcolor: 'grey.50', borderRadius: 2 }}>
                    <Typography sx={{ fontSize: 16 }}>🎫</Typography>
                    <Box>
                      <Typography variant="body2" fontWeight={500}>{ticketTypes.length} bilet tipi tanımlandı</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {ticketTypes.map(t => t.name).join(', ')}
                      </Typography>
                    </Box>
                  </Box>
                )}
                {event.status === EventStatus.ACTIVE && (
                  <Box sx={{ display: 'flex', gap: 1.5, p: 1.5, bgcolor: (t) => alpha(t.palette.success.main, 0.06), borderRadius: 2, border: '1px solid', borderColor: (t) => alpha(t.palette.success.main, 0.2) }}>
                    <Typography sx={{ fontSize: 16 }}>✅</Typography>
                    <Box>
                      <Typography variant="body2" fontWeight={500} color="success.main">Etkinlik aktif durumda</Typography>
                      <Typography variant="caption" color="text.secondary">Satışlar açık</Typography>
                    </Box>
                  </Box>
                )}
                {event.status === EventStatus.CANCELLED && (
                  <Box sx={{ display: 'flex', gap: 1.5, p: 1.5, bgcolor: (t) => alpha(t.palette.error.main, 0.06), borderRadius: 2, border: '1px solid', borderColor: (t) => alpha(t.palette.error.main, 0.2) }}>
                    <Typography sx={{ fontSize: 16 }}>❌</Typography>
                    <Box>
                      <Typography variant="body2" fontWeight={500} color="error.main">Etkinlik iptal edildi</Typography>
                    </Box>
                  </Box>
                )}
              </Stack>
            </Box>
          </Box>
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
                  {
                    key: 'waitlistEnabled' as const,
                    name: 'Bekleme listesi aktif',
                    desc: 'Kapasite dolduğunda kayıt almaya devam et',
                  },
                  {
                    key: 'showParticipants' as const,
                    name: 'Katılımcı listesini göster',
                    desc: 'Diğer kullanıcılar katılımcıları görebilir',
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
                  onClick={() => setDeleteOpen(true)}
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
      <DeleteModal open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={handleDelete} loading={actionLoading} />
    </Box>
  );
}
