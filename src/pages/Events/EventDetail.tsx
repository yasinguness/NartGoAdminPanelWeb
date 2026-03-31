/**
 * EventDetail — Full-featured event detail page with 6 tabs
 * Replaces the old EventOperations page.
 */
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import {
  Box,
  Typography,
  Avatar,
  Stack,
  Button,
  Tab,
  Tabs,
  Divider,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  LinearProgress,
  Switch,
  IconButton,
  alpha,
  Skeleton,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Event as EventIcon,
  Edit as EditIcon,
  PauseCircle as PauseIcon,
  Cancel as CancelIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
  Email as EmailIcon,
  Lock as LockIcon,
  Download as DownloadIcon,
  QrCodeScanner as QrIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { eventService } from '../../services/event/eventService';
import { adminOperationsService } from '../../services/admin/adminOperationsService';
import { EventResponseDTO, EventStatus } from '../../types/events/eventModel';
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
  display: 'flex',
  alignItems: 'center',
  px: 2.5,
  py: 1.5,
  borderBottom: '1px solid',
  borderColor: 'divider',
  '&:last-child': { borderBottom: 'none' },
  '&:hover .edit-link': { opacity: 1 },
};

// ─── COMPONENT ──────────────────────────────────────────────
export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { deleteEvent } = useEvent();

  const [event, setEvent] = useState<EventResponseDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabValue>('genel');

  // Modal states
  const [pauseOpen, setPauseOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch event
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    eventService.getEventById(id)
      .then(res => setEvent(res.data))
      .catch(() => enqueueSnackbar('Etkinlik yüklenemedi', { variant: 'error' }))
      .finally(() => setLoading(false));
  }, [id, enqueueSnackbar]);

  const daysLeft = useMemo(() => {
    if (!event?.eventTime) return 0;
    return Math.max(0, Math.ceil((new Date(event.eventTime).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  }, [event]);

  const fillPercent = useMemo(() => {
    if (!event?.maxParticipants) return 0;
    return Math.round(((event.currentParticipants || 0) / event.maxParticipants) * 100);
  }, [event]);

  // ─── HANDLERS ─────────────────────────────────────
  const handlePause = async (reason: string, note: string) => {
    if (!id) return;
    setActionLoading(true);
    try {
      await adminOperationsService.pauseEvent(id);
      enqueueSnackbar('⏸ Etkinlik duraklatıldı', { variant: 'success' });
      setPauseOpen(false);
      // Refresh
      const res = await eventService.getEventById(id);
      setEvent(res.data);
    } catch {
      enqueueSnackbar('İşlem başarısız', { variant: 'error' });
    } finally { setActionLoading(false); }
  };

  const handleCancel = async (reason: string) => {
    if (!id) return;
    setActionLoading(true);
    try {
      await adminOperationsService.cancelEvent(id, { reason });
      enqueueSnackbar('✕ Etkinlik iptal edildi', { variant: 'success' });
      setCancelOpen(false);
      const res = await eventService.getEventById(id);
      setEvent(res.data);
    } catch {
      enqueueSnackbar('İşlem başarısız', { variant: 'error' });
    } finally { setActionLoading(false); }
  };

  const handleDelete = async () => {
    if (!event) return;
    setActionLoading(true);
    try {
      await deleteEvent(event.id, event.organizerId);
      enqueueSnackbar('🗑 Etkinlik silindi', { variant: 'success' });
      navigate('/events');
    } catch {
      enqueueSnackbar('Silme başarısız', { variant: 'error' });
    } finally { setActionLoading(false); }
  };

  // ─── LOADING STATE ────────────────────────────────
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
  const statusLabel = event.status === EventStatus.ACTIVE ? 'Aktif' : event.status;

  // ─── RENDER ───────────────────────────────────────
  return (
    <Box>
      {/* ═══ DETAIL HEADER ═══ */}
      <Box sx={{ bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider', px: 4, pt: 3, pb: 0 }}>
        {/* Breadcrumb */}
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2, cursor: 'pointer' }}
          onClick={() => navigate('/events')}
        >
          <BackIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
          <Typography variant="caption" color="text.secondary" sx={{ '&:hover': { color: 'primary.main' } }}>
            Etkinliklere Dön
          </Typography>
          <Typography variant="caption" color="text.disabled">›</Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={500}>{event.name}</Typography>
        </Stack>

        {/* Event Top */}
        <Stack direction="row" spacing={2.5} alignItems="flex-start" sx={{ mb: 3 }}>
          <Avatar
            src={event.image}
            variant="rounded"
            sx={{ width: 80, height: 80, borderRadius: 3, bgcolor: 'grey.100', border: '1px solid', borderColor: 'divider', fontSize: 36 }}
          >
            <EventIcon sx={{ fontSize: 36, color: 'primary.main' }} />
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 0.5 }}>
              <Typography variant="h5" fontWeight={800} letterSpacing={-0.5}>{event.name}</Typography>
              <Chip label={statusLabel} size="small" color={statusColor as any} variant="outlined"
                sx={{ fontWeight: 600, height: 24 }}
              />
            </Stack>
            <Stack direction="row" spacing={2} sx={{ color: 'text.secondary', fontSize: 13 }}>
              <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                📅 {event.eventTime ? format(new Date(event.eventTime), 'dd MMM yyyy, HH:mm') : '—'}
                {event.endTime && `–${format(new Date(event.endTime), 'HH:mm')}`}
              </Typography>
              <Typography variant="body2">📍 {event.address?.city || 'Sanal'}</Typography>
              <Typography variant="body2">🏷 {event.category?.name || 'Genel'}</Typography>
              <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.disabled' }}>#{event.id?.slice(0, 8)}</Typography>
            </Stack>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" size="small" startIcon={<PauseIcon />}
              onClick={() => setPauseOpen(true)}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            >Duraklat</Button>
            <Button variant="outlined" size="small" startIcon={<EditIcon />}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            >Düzenle</Button>
            <Button variant="outlined" size="small" color="error" startIcon={<CancelIcon />}
              onClick={() => setCancelOpen(true)}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            >İptal Et</Button>
          </Stack>
        </Stack>

        {/* Quick Stats */}
        <Box sx={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          borderTop: '1px solid', borderColor: 'divider',
        }}>
          {[
            { label: 'Katılımcı', value: event.currentParticipants || 0, color: 'info.main' },
            { label: 'Satılan Bilet', value: event.currentParticipants || 0, color: 'success.main' },
            { label: 'Toplam Gelir', value: `₺${((event.ticketPrice || 0) * (event.currentParticipants || 0)).toLocaleString()}`, color: 'text.primary' },
            { label: 'Gün Kaldı', value: daysLeft, color: 'warning.main' },
          ].map((stat, i) => (
            <Box key={i} sx={{ py: 1.5, px: 2.5, textAlign: 'center', borderRight: i < 3 ? '1px solid' : 'none', borderColor: 'divider' }}>
              <Typography variant="h5" fontWeight={800} fontFamily="JetBrains Mono, monospace" sx={{ color: stat.color, letterSpacing: -0.5 }}>
                {stat.value}
              </Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.4}>
                {stat.label}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Tabs */}
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}
          sx={{
            mt: 0.5,
            borderTop: '1px solid',
            borderColor: 'divider',
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 500, fontSize: 13.5, minHeight: 48 },
            '& .Mui-selected': { fontWeight: 700, color: 'primary.main' },
          }}
        >
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

        {/* ─── GENEL BİLGİLER ─── */}
        {activeTab === 'genel' && (
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            {/* Left: Event Details */}
            <Box sx={cardSx}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle2" fontWeight={700}>Etkinlik Detayları</Typography>
                <Button size="small" startIcon={<EditIcon />} sx={{ textTransform: 'none' }}>Düzenle</Button>
              </Box>
              {[
                { label: 'Etkinlik Adı', value: event.name },
                { label: 'Kategori', value: event.category?.name || 'Genel', badge: true },
                { label: 'Konum', value: event.address?.city || 'Sanal' },
                { label: 'Başlangıç', value: event.eventTime ? format(new Date(event.eventTime), 'dd MMM yyyy, HH:mm') : '—' },
                { label: 'Bitiş', value: event.endTime ? format(new Date(event.endTime), 'dd MMM yyyy, HH:mm') : '—' },
                { label: 'Kapasite', value: `${event.maxParticipants || 0} kişi` },
                { label: 'Oluşturulma', value: event.createdAt ? format(new Date(event.createdAt), 'dd MMM yyyy, HH:mm') : '—', mono: true },
              ].map((row, i) => (
                <Box key={i} sx={infoRowSx}>
                  <Typography variant="caption" fontWeight={600} color="text.secondary" textTransform="uppercase" letterSpacing={0.4}
                    sx={{ width: 160, flexShrink: 0 }}
                  >
                    {row.label}
                  </Typography>
                  {row.badge ? (
                    <Chip label={row.value} size="small" color="info" variant="outlined" sx={{ height: 22, fontSize: 12 }} />
                  ) : (
                    <Typography variant="body2" sx={{ flex: 1, fontFamily: row.mono ? 'monospace' : 'inherit' }}>
                      {row.value}
                    </Typography>
                  )}
                  <Typography variant="caption" className="edit-link"
                    sx={{ color: 'primary.main', cursor: 'pointer', fontWeight: 600, ml: 'auto', opacity: 0, transition: 'opacity 0.1s' }}
                  >Düzenle</Typography>
                </Box>
              ))}
            </Box>

            {/* Right: Capacity + Quick Actions */}
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
                  <LinearProgress
                    variant="determinate"
                    value={fillPercent}
                    sx={{
                      height: 10, borderRadius: 5, mb: 2,
                      bgcolor: 'divider',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 5,
                        bgcolor: fillPercent > 80 ? 'error.main' : fillPercent > 50 ? 'warning.main' : 'success.light',
                      },
                    }}
                  />
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                    <Box sx={{ bgcolor: 'grey.50', borderRadius: 2, p: 1.5, textAlign: 'center' }}>
                      <Typography variant="h6" fontWeight={800} color="info.main" fontFamily="JetBrains Mono, monospace">
                        {event.currentParticipants || 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">Kayıtlı</Typography>
                    </Box>
                    <Box sx={{ bgcolor: 'grey.50', borderRadius: 2, p: 1.5, textAlign: 'center' }}>
                      <Typography variant="h6" fontWeight={800} color="text.disabled" fontFamily="JetBrains Mono, monospace">
                        {(event.maxParticipants || 0) - (event.currentParticipants || 0)}
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
                    { icon: <TrendingUpIcon fontSize="small" />, label: 'Kapasiteyi Güncelle' },
                    { icon: <LockIcon fontSize="small" />, label: 'Satışı Kapat' },
                    { icon: <EmailIcon fontSize="small" />, label: 'Katılımcılara Bildirim Gönder' },
                    { icon: <CopyIcon fontSize="small" />, label: 'Etkinlik Bağlantısını Kopyala' },
                  ].map((action, i) => (
                    <Button key={i} variant="text" fullWidth startIcon={action.icon}
                      sx={{ justifyContent: 'flex-start', textTransform: 'none', fontWeight: 500, color: 'text.secondary', px: 2, py: 1, borderRadius: 2,
                        '&:hover': { bgcolor: 'grey.50', color: 'text.primary' }
                      }}
                      onClick={() => enqueueSnackbar(`${action.label} — İşlem yapıldı`, { variant: 'info' })}
                    >
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
                <Typography variant="caption" color="text.secondary">Bu etkinlik için tanımlı bilet kategorileri</Typography>
              </Box>
              <Button variant="contained" size="small" onClick={() => navigate(`/ticket-creation/${event.id}`)}
                sx={{ textTransform: 'none', borderRadius: 2 }}
              >+ Yeni Bilet Ekle</Button>
            </Box>
            {/* Sample ticket items */}
            {[
              { name: 'VIP Oturma', desc: 'Ön sıra, özel karşılama · Kapasite: 20', price: '₺250', sold: 2, left: 18, badge: 'Satışta', badgeColor: 'success' },
              { name: 'Standart Giriş', desc: 'Genel oturma · Kapasite: 60', price: '₺100', sold: 2, left: 58, badge: 'Satışta', badgeColor: 'success' },
              { name: 'Ücretsiz (Davetli)', desc: 'Sadece davetliler · Kapasite: 20', price: '₺0', sold: 2, left: 18, badge: 'Gizli', badgeColor: 'default' },
            ].map((ticket, i) => (
              <Box key={i} sx={{
                display: 'grid', gridTemplateColumns: '1fr auto auto auto',
                gap: 2, alignItems: 'center', px: 2.5, py: 1.5,
                borderBottom: '1px solid', borderColor: 'divider',
                '&:last-child': { borderBottom: 'none' },
                '&:hover': { bgcolor: 'grey.50' },
              }}>
                <Box>
                  <Typography variant="body2" fontWeight={600}>{ticket.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{ticket.desc}</Typography>
                </Box>
                <Typography variant="subtitle1" fontWeight={800} fontFamily="JetBrains Mono, monospace" color="primary.main">
                  {ticket.price}
                </Typography>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="body2"><strong>{ticket.sold}</strong> satıldı</Typography>
                  <Typography variant="caption" color="text.secondary">{ticket.left} kaldı</Typography>
                </Box>
                <Chip label={ticket.badge} size="small" color={ticket.badgeColor as any} variant="outlined" sx={{ fontWeight: 600 }} />
              </Box>
            ))}
          </Box>
        )}

        {/* ─── SİPARİŞLER ─── */}
        {activeTab === 'siparisler' && (
          <Box sx={cardSx}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Box>
                <Typography variant="subtitle2" fontWeight={700}>Siparişler</Typography>
                <Typography variant="caption" color="text.secondary">4 sipariş · ₺700 toplam</Typography>
              </Box>
              <Button variant="outlined" size="small" startIcon={<DownloadIcon />} sx={{ textTransform: 'none', borderRadius: 2 }}>Dışa Aktar</Button>
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  {['Sipariş No', 'Alıcı', 'Bilet', 'Tutar', 'Tarih', 'Durum'].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary' }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {[
                  { id: '#ORD-0041', buyer: 'Ahmet Yılmaz', ticket: 'VIP Oturma × 1', amount: '₺250', date: '29 Mar 14:12', status: 'Ödendi', color: 'success' },
                  { id: '#ORD-0038', buyer: 'Fatma Demir', ticket: 'Standart × 2', amount: '₺200', date: '28 Mar 11:44', status: 'Ödendi', color: 'success' },
                  { id: '#ORD-0031', buyer: 'Kemal Aydın', ticket: 'VIP Oturma × 1', amount: '₺250', date: '27 Mar 09:30', status: 'Ödendi', color: 'success' },
                  { id: '#ORD-0027', buyer: 'Selin Öztürk', ticket: 'Ücretsiz × 2', amount: '₺0', date: '26 Mar 17:05', status: 'Davetli', color: 'info' },
                ].map((order, i) => (
                  <TableRow key={i} sx={{ '&:hover': { bgcolor: 'grey.50' } }}>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: 13 }}>{order.id}</TableCell>
                    <TableCell sx={{ fontSize: 13 }}>{order.buyer}</TableCell>
                    <TableCell sx={{ fontSize: 13 }}>{order.ticket}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13 }}>{order.amount}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: 13 }}>{order.date}</TableCell>
                    <TableCell><Chip label={order.status} size="small" color={order.color as any} variant="outlined" sx={{ fontWeight: 600, height: 22 }} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}

        {/* ─── KATILIMCILAR ─── */}
        {activeTab === 'katilimcilar' && (
          <Box sx={cardSx}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Box>
                <Typography variant="subtitle2" fontWeight={700}>Katılımcı Listesi</Typography>
                <Typography variant="caption" color="text.secondary">{event.currentParticipants || 0} kişi kayıtlı</Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" size="small" startIcon={<DownloadIcon />} sx={{ textTransform: 'none', borderRadius: 2 }}>CSV İndir</Button>
                <Button variant="outlined" size="small" startIcon={<EmailIcon />} sx={{ textTransform: 'none', borderRadius: 2 }}>Toplu Bildirim</Button>
              </Stack>
            </Box>
            {[
              { name: 'Ahmet Yılmaz', email: 'ahmetyilmaz@gmail.com', ticket: 'VIP Oturma', color: '#dbeafe', textColor: '#1d4ed8', badge: '✓ Onaylı', badgeColor: 'success' },
              { name: 'Fatma Demir', email: 'fatmademir@hotmail.com', ticket: 'Standart × 2', color: '#fce7f3', textColor: '#9d174d', badge: '✓ Onaylı', badgeColor: 'success' },
              { name: 'Kemal Aydın', email: 'kemalay@gmail.com', ticket: 'VIP Oturma', color: '#d1fae5', textColor: '#065f46', badge: '✓ Onaylı', badgeColor: 'success' },
              { name: 'Selin Öztürk', email: 'selinoz@gmail.com', ticket: 'Davetli × 2', color: '#ede9fe', textColor: '#5b21b6', badge: 'Davetli', badgeColor: 'info' },
            ].map((attendee, i) => (
              <Stack key={i} direction="row" spacing={1.5} alignItems="center"
                sx={{ px: 2.5, py: 1.2, borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 'none' } }}
              >
                <Avatar sx={{ width: 34, height: 34, bgcolor: attendee.color, color: attendee.textColor, fontSize: 13, fontWeight: 700 }}>
                  {attendee.name[0]}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" fontWeight={500}>{attendee.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{attendee.email} · {attendee.ticket}</Typography>
                </Box>
                <Chip label={attendee.badge} size="small" color={attendee.badgeColor as any} variant="outlined" sx={{ fontWeight: 600, height: 22 }} />
                <Typography variant="caption" fontFamily="monospace" color="text.secondary">—</Typography>
              </Stack>
            ))}
          </Box>
        )}

        {/* ─── DENETİM & GİRİŞ ─── */}
        {activeTab === 'denetim' && (
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <Box sx={cardSx}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Box>
                  <Typography variant="subtitle2" fontWeight={700}>Giriş Kontrolü</Typography>
                  <Typography variant="caption" color="text.secondary">Etkinlik günü için QR tarama durumu</Typography>
                </Box>
                <Chip label="Etkinlik başlamadı" size="small" variant="outlined" />
              </Box>
              <Box sx={{ p: 5, textAlign: 'center', color: 'text.secondary' }}>
                <Typography sx={{ fontSize: 40, mb: 1 }}>📱</Typography>
                <Typography variant="subtitle2" fontWeight={600} color="text.secondary">Giriş kontrolü henüz başlamadı</Typography>
                <Typography variant="caption" color="text.secondary">Etkinlik gününde QR tarama verileri burada görünecek.</Typography>
              </Box>
            </Box>
            <Box sx={cardSx}>
              <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle2" fontWeight={700}>Denetim Logları</Typography>
              </Box>
              <Stack sx={{ p: 2 }} spacing={1.5}>
                {[
                  { icon: '✅', text: 'Etkinlik yayına alındı', time: 'Admin · 28 Mar 14:25' },
                  { icon: '🎫', text: '3 bilet tipi eklendi', time: 'Admin · 28 Mar 14:23' },
                  { icon: '📅', text: 'Etkinlik oluşturuldu', time: 'Admin · 28 Mar 14:22' },
                ].map((log, i) => (
                  <Box key={i} sx={{ display: 'flex', gap: 1.5, p: 1.5, bgcolor: 'grey.50', borderRadius: 2 }}>
                    <Typography sx={{ fontSize: 16 }}>{log.icon}</Typography>
                    <Box>
                      <Typography variant="body2" fontWeight={500}>{log.text}</Typography>
                      <Typography variant="caption" color="text.secondary">{log.time}</Typography>
                    </Box>
                  </Box>
                ))}
              </Stack>
            </Box>
          </Box>
        )}

        {/* ─── AYARLAR ─── */}
        {activeTab === 'ayarlar' && (
          <Stack spacing={2}>
            <Box sx={cardSx}>
              <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle2" fontWeight={700}>Görünürlük & Satış</Typography>
              </Box>
              <Box sx={{ px: 2.5 }}>
                {[
                  { name: 'Etkinliği yayında göster', desc: 'Kapatırsanız kullanıcılar etkinliği göremez', on: true },
                  { name: 'Bilet satışına izin ver', desc: 'Kapatırsanız yeni satın alma yapılamaz', on: true },
                  { name: 'Bekleme listesi aktif', desc: 'Kapasite dolduğunda kayıt almaya devam et', on: false },
                  { name: 'Katılımcı listesini göster', desc: 'Diğer kullanıcılar katılımcıları görebilir', on: true },
                ].map((toggle, i) => (
                  <Stack key={i} direction="row" alignItems="center" justifyContent="space-between"
                    sx={{ py: 1.5, borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 'none' } }}
                  >
                    <Box>
                      <Typography variant="body2" fontWeight={500}>{toggle.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{toggle.desc}</Typography>
                    </Box>
                    <Switch defaultChecked={toggle.on} color="primary" />
                  </Stack>
                ))}
              </Box>
            </Box>

            {/* Danger Zone */}
            <Box sx={{
              border: '1.5px solid',
              borderColor: (t) => alpha(t.palette.error.main, 0.3),
              borderRadius: 3,
              p: 2.5,
              bgcolor: (t) => alpha(t.palette.error.main, 0.04),
            }}>
              <Typography variant="subtitle2" fontWeight={700} color="error.main" sx={{ mb: 0.5 }}>⚠ Tehlikeli Bölge</Typography>
              <Typography variant="body2" color="error.dark" sx={{ mb: 2 }}>
                Aşağıdaki aksiyonlar geri alınamaz. Onay adımı geçilmeden işlem yapılamaz.
              </Typography>
              <Stack direction="row" spacing={1.5} flexWrap="wrap">
                <Button variant="outlined" color="error" startIcon={<PauseIcon />}
                  onClick={() => setPauseOpen(true)}
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
                >Etkinliği Duraklat</Button>
                <Button variant="outlined" color="error" startIcon={<CancelIcon />}
                  onClick={() => setCancelOpen(true)}
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
                >Etkinliği İptal Et</Button>
                <Button variant="outlined" color="error" startIcon={<DeleteIcon />}
                  onClick={() => setDeleteOpen(true)}
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
                >Etkinliği Sil</Button>
              </Stack>
            </Box>
          </Stack>
        )}
      </Box>

      {/* ═══ MODALS ═══ */}
      <PauseModal open={pauseOpen} onClose={() => setPauseOpen(false)} onConfirm={handlePause} loading={actionLoading} />
      <CancelModal
        open={cancelOpen} onClose={() => setCancelOpen(false)} onConfirm={handleCancel}
        eventName={event.name} participantCount={event.currentParticipants || 0} loading={actionLoading}
      />
      <DeleteModal open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={handleDelete} loading={actionLoading} />
    </Box>
  );
}
