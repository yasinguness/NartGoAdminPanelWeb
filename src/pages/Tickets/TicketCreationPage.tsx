/**
 * EventCreationPage — 5-step guided wizard for creating events & tickets
 * Steps: (1) Organizer, (2) Event Type, (3) Event Info, (4) Ticket Config, (5) Preview
 */
import { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { ticketService } from '../../services/ticket/ticketService';
import { userService } from '../../services/user/userService';
import { api } from '../../services/api';
import {
  Box, Typography, Button, TextField, Select, MenuItem, FormControl, InputLabel,
  Stack, Paper, Chip, Switch, Divider, IconButton, alpha, useTheme, styled,
  LinearProgress, Fade, Avatar, CircularProgress,
} from '@mui/material';
import {
  ArrowBack as BackIcon, ArrowForward as ForwardIcon, Add as AddIcon,
  Close as CloseIcon, Rocket as RocketIcon, CheckCircle as CheckIcon,
  Warning as WarningIcon, CelebrationOutlined as CelebrationIcon,
  ContentCopy as CopyIcon, Search as SearchIcon, Link as LinkIcon,
} from '@mui/icons-material';
import type { UserDTO } from '../../types/users/userModel';

// ─── STYLED ────────────────────────────────────────────
const StepDot = styled(Box)<{ $active?: boolean; $done?: boolean }>(({ theme, $active, $done }) => ({
  width: 32, height: 32, borderRadius: '50%',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 13, fontWeight: 700, flexShrink: 0, transition: 'all 0.25s',
  ...($active && { background: theme.palette.primary.main, color: '#fff', border: `2px solid ${theme.palette.primary.main}`, boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.15)}` }),
  ...($done && { background: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main, border: `2px solid ${theme.palette.primary.main}` }),
  ...(!$active && !$done && { border: `2px solid ${theme.palette.divider}`, background: '#fff', color: theme.palette.text.disabled }),
}));
const StepLine = styled(Box)<{ $done?: boolean }>(({ theme, $done }) => ({
  flex: 1, height: 2, margin: '0 8px', transition: 'background 0.3s',
  background: $done ? theme.palette.primary.main : theme.palette.divider,
}));
const SC = styled(Paper)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`, borderRadius: 16, overflow: 'hidden',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
}));
const SH = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <Box sx={{ mb: 2.5 }}>
    <Typography variant="subtitle1" fontWeight={700}>{title}</Typography>
    {subtitle && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>{subtitle}</Typography>}
  </Box>
);

// ─── TYPES ─────────────────────────────────────────────
interface TierItem { id: string; name: string; price: number; quota: number; color: string; }
type EventType = 'paid' | 'free' | 'invite';
type Visibility = 'public' | 'link' | 'draft';
const TIER_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#a855f7', '#ef4444', '#ec4899'];
const CURRENCY_SYMBOLS: Record<string, string> = { TRY: '₺', USD: '$', EUR: '€' };

export default function TicketCreationPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { eventId } = useParams<{ eventId?: string }>();
  const { enqueueSnackbar } = useSnackbar();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const TOTAL = 5;
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step 1: Organizer
  const [orgSearch, setOrgSearch] = useState('');
  const [orgResults, setOrgResults] = useState<UserDTO[]>([]);
  const [orgLoading, setOrgLoading] = useState(false);
  const [organizer, setOrganizer] = useState<UserDTO | null>(null);

  // URL import
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);

  // Step 2: Event type
  const [eventType, setEventType] = useState<EventType | null>(null);

  // Step 3: Event info
  const [eventName, setEventName] = useState('');
  const [eventCategory, setEventCategory] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventStart, setEventStart] = useState('');
  const [eventEnd, setEventEnd] = useState('');
  const [capacity, setCapacity] = useState('');
  const [venueType, setVenueType] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [eventImage, setEventImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Step 4: Ticket config
  const [tiers, setTiers] = useState<TierItem[]>([
    { id: '1', name: 'Standart', price: 150, quota: 100, color: '#22c55e' },
  ]);
  const [currency, setCurrency] = useState('TRY');
  const [saleStart, setSaleStart] = useState('');
  const [saleEnd, setSaleEnd] = useState('');
  const [minTickets, setMinTickets] = useState(1);
  const [maxTickets, setMaxTickets] = useState(10);
  const [refundPolicy, setRefundPolicy] = useState(true);
  const [waitlist, setWaitlist] = useState(false);
  const [transferable, setTransferable] = useState(true);

  // ─── HELPERS ─────────────────────────────────────────
  const clr = (k: string) => { if (errors[k]) setErrors(p => { const n = { ...p }; delete n[k]; return n; }); };

  const validate = (s: number): boolean => {
    const e: Record<string, string> = {};
    if (s === 1 && !organizer) e.organizer = 'Organizator secmelisiniz';
    if (s === 2 && !eventType) e.eventType = 'Etkinlik turunu seciniz';
    if (s === 3) {
      if (!eventName.trim()) e.eventName = 'Etkinlik adi zorunludur';
      if (!eventStart) e.eventStart = 'Baslangic tarihi zorunludur';
      else if (new Date(eventStart) <= new Date()) e.eventStart = 'Baslangic tarihi gelecekte olmali';
      if (!eventEnd) e.eventEnd = 'Bitis tarihi zorunludur';
      if (eventStart && eventEnd && new Date(eventStart) >= new Date(eventEnd)) e.eventEnd = 'Bitis baslangictan sonra olmali';
      if (!capacity || Number(capacity) <= 0) e.capacity = 'Kapasite 0\'dan buyuk olmali';
    }
    if (s === 4 && eventType === 'paid') {
      if (tiers.length === 0) e.tiers = 'En az 1 bilet kategorisi ekleyin';
      if (tiers.some(t => !t.name.trim())) e.tierName = 'Tum kategorilerin adi olmali';
      if (tiers.some(t => t.price <= 0)) e.tierPrice = 'Tum bilet fiyatlari 0\'dan buyuk olmali';
      if (tiers.some(t => t.quota <= 0)) e.tierQuota = 'Tum kontenjanlar 0\'dan buyuk olmali';
      if (!saleStart) e.saleStart = 'Satis baslangici zorunludur';
      if (minTickets < 1) e.minTickets = 'Minimum en az 1 olmali';
      if (maxTickets < minTickets) e.maxTickets = 'Maksimum minimumdan kucuk olamaz';
    }
    if (s === 4 && eventType === 'free' && !saleStart) e.saleStart = 'Kayit baslangici zorunludur';
    setErrors(e);
    if (Object.keys(e).length > 0) { enqueueSnackbar('Lutfen zorunlu alanlari doldurun', { variant: 'warning' }); return false; }
    return true;
  };

  const goNext = () => { if (!validate(step)) return; if (step < TOTAL) setStep(step + 1); else handlePublish(); };
  const goBack = () => { if (step > 1) setStep(step - 1); };
  const goTo = (n: number) => { if (n <= step) setStep(n); };

  // ─── ORGANIZER SEARCH ────────────────────────────────
  const searchOrganizers = async () => {
    if (!orgSearch.trim()) return;
    setOrgLoading(true);
    try {
      const res = await userService.getAllUsers({ keyword: orgSearch, size: 10 });
      setOrgResults(res.data?.content || []);
    } catch { enqueueSnackbar('Arama basarisiz', { variant: 'error' }); }
    finally { setOrgLoading(false); }
  };

  // ─── URL IMPORT ──────────────────────────────────────
  const handleImportUrl = async () => {
    if (!importUrl.trim()) return;
    setImporting(true);
    try {
      // Try fetching OG metadata via a simple proxy/CORS approach
      // For Instagram, direct fetch won't work due to CORS, but we try anyway
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(importUrl)}`;
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });
      const html = await res.text();

      // Parse OG tags from HTML
      const getOg = (prop: string): string => {
        const match = html.match(new RegExp(`<meta[^>]*property=["']og:${prop}["'][^>]*content=["']([^"']*)["']`, 'i'))
          || html.match(new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:${prop}["']`, 'i'));
        return match?.[1] || '';
      };
      const title = getOg('title') || html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || '';
      const desc = getOg('description');
      const image = getOg('image');
      const siteName = getOg('site_name');

      let filled = 0;
      if (title && !eventName) { setEventName(title.trim()); filled++; }
      if (desc && !eventDescription) { setEventDescription(desc.trim()); filled++; }
      if (image && !imagePreview) {
        setImagePreview(image);
        filled++;
      }

      if (filled > 0) {
        enqueueSnackbar(`${filled} alan otomatik dolduruldu${siteName ? ` (${siteName})` : ''}`, { variant: 'success' });
      } else {
        enqueueSnackbar('Bilgi cikarilacak icerik bulunamadi. Linklerin cogu CORS nedeniyle dogrudan okunamaz.', { variant: 'info' });
      }
    } catch {
      enqueueSnackbar('Link okunamadi. Cogu sosyal medya linki dogrudan desteklenmez — bilgileri manuel girin.', { variant: 'info' });
    } finally { setImporting(false); }
  };

  // ─── IMAGE ───────────────────────────────────────────
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { enqueueSnackbar('Sadece gorsel dosyalari yuklenebilir', { variant: 'warning' }); return; }
    if (file.size > 10 * 1024 * 1024) { enqueueSnackbar('Dosya boyutu 10MB\'i asamaz', { variant: 'warning' }); return; }
    setEventImage(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  // ─── TIER OPS ────────────────────────────────────────
  const addTier = () => setTiers([...tiers, { id: String(Date.now()), name: '', price: 0, quota: 50, color: TIER_COLORS[tiers.length % TIER_COLORS.length] }]);
  const removeTier = (id: string) => { if (tiers.length <= 1) { enqueueSnackbar('En az 1 kategori olmali', { variant: 'warning' }); return; } setTiers(tiers.filter(t => t.id !== id)); };
  const updateTier = (id: string, field: keyof TierItem, value: string | number) => setTiers(tiers.map(t => t.id === id ? { ...t, [field]: value } : t));

  // ─── PUBLISH ─────────────────────────────────────────
  const handlePublish = async () => {
    for (let s = 1; s <= 4; s++) { if (!validate(s)) { setStep(s); return; } }
    if (!organizer) return;
    setPublishing(true);
    try {
      const isPaid = eventType === 'paid';
      const payload = {
        name: eventName,
        description: eventDescription,
        eventTime: new Date(eventStart).toISOString(),
        endTime: new Date(eventEnd).toISOString(),
        maxParticipants: Number(capacity),
        isPaid,
        status: visibility === 'draft' ? 'PASSIVE' : 'ACTIVE',
        isPrivate: visibility === 'link',
        isRegistrationOpen: visibility !== 'draft',
        ticketPrice: isPaid && tiers.length > 0 ? Math.min(...tiers.map(t => t.price)) : 0,
        category: eventCategory || undefined,
        address: eventLocation ? { city: eventLocation } : undefined,
        organizerId: organizer.id,
        organizerName: organizer.displayName || `${organizer.firstName || ''} ${organizer.lastName || ''}`.trim(),
        organizerEmail: organizer.email,
      };

      const formData = new FormData();
      formData.append('request', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
      if (eventImage) formData.append('image', eventImage);

      const eventRes = await api.post('/events/admin', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const createdId = eventRes.data?.data?.id || eventId;

      if (createdId && isPaid) {
        for (const tier of tiers) {
          try {
            await ticketService.createTicketType({
              eventId: createdId, name: tier.name, basePrice: tier.price,
              capacityTotal: tier.quota, currency,
              saleStartAt: saleStart ? new Date(saleStart).toISOString() : undefined,
              saleEndAt: saleEnd ? new Date(saleEnd).toISOString() : (eventStart ? new Date(eventStart).toISOString() : undefined),
            } as any);
          } catch { enqueueSnackbar(`"${tier.name}" bileti olusturulamadi`, { variant: 'warning' }); }
        }
      }
      setPublished(true);
      enqueueSnackbar('Etkinlik basariyla olusturuldu!', { variant: 'success' });
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Etkinlik olusturulamadi', { variant: 'error' });
    } finally { setPublishing(false); }
  };

  // ─── DERIVED ─────────────────────────────────────────
  const maxRevenue = tiers.reduce((s, t) => s + t.price * t.quota, 0);
  const totalQuota = tiers.reduce((s, t) => s + t.quota, 0);
  const labels = ['Organizator', 'Etkinlik Turu', 'Bilgiler', 'Bilet & Kayit', 'Onizleme'];
  const subs = [
    'Etkinligi kimin adina olusturuyorsunuz?',
    'Nasil bir etkinlik olusturmak istiyorsunuz?',
    'Temel bilgileri, tarih ve kapasite bilgilerini girin',
    eventType === 'paid' ? 'Bilet fiyatlarini ve satis takvimini belirleyin' : 'Kayit ayarlarini belirleyin',
    'Her seyi kontrol edin ve yayinlayin',
  ];

  // ─── SUCCESS ─────────────────────────────────────────
  if (published) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 10, textAlign: 'center' }}>
        <Fade in timeout={500}><Box>
          <Box sx={{ width: 88, height: 88, borderRadius: '50%', mx: 'auto', mb: 3, bgcolor: alpha(theme.palette.success.main, 0.1), border: '3px solid', borderColor: 'success.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CelebrationIcon sx={{ fontSize: 40, color: 'success.main' }} />
          </Box>
          <Typography variant="h4" fontWeight={800} sx={{ mb: 1 }}>Etkinlik Yayinlandi!</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 420, mx: 'auto', mb: 1 }}>
            <strong>{eventName}</strong> etkinligi <strong>{organizer?.displayName || organizer?.email}</strong> adina olusturuldu.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            {eventType === 'paid' ? 'Bilet satisi basladi.' : eventType === 'free' ? 'Kayitlara acildi.' : ''}
          </Typography>
          <Stack direction="row" spacing={2} justifyContent="center">
            <Button variant="outlined" onClick={() => { setPublished(false); setStep(1); setOrganizer(null); setEventType(null); setEventName(''); setEventDescription(''); setEventStart(''); setEventEnd(''); setCapacity(''); setTiers([{ id: '1', name: 'Standart', price: 150, quota: 100, color: '#22c55e' }]); setSaleStart(''); setSaleEnd(''); setEventImage(null); setImagePreview(null); }}
              sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 600, px: 3 }}>+ Yeni Etkinlik</Button>
            <Button variant="contained" onClick={() => navigate('/events')}
              sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 600, px: 3 }}>Etkinliklere Git</Button>
          </Stack>
        </Box></Fade>
      </Box>
    );
  }

  // ─── RENDER ──────────────────────────────────────────
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 64px)' }}>
      {/* Header */}
      <Box sx={{ bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider', px: 4, py: 2, position: 'sticky', top: 64, zIndex: 5 }}>
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 1.5, cursor: 'pointer' }} onClick={() => navigate('/events')}>
          <BackIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
          <Typography variant="caption" color="text.secondary" sx={{ '&:hover': { color: 'primary.main' } }}>Etkinliklere Don</Typography>
        </Stack>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h6" fontWeight={800}>{labels[step - 1]}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>{subs[step - 1]}</Typography>
          </Box>
          <Chip label={`${step} / ${TOTAL}`} size="small" variant="outlined" sx={{ fontWeight: 700, fontFamily: 'monospace' }} />
        </Stack>
        <Stack direction="row" alignItems="center" sx={{ maxWidth: 680 }}>
          {[1, 2, 3, 4, 5].map((s, i) => (
            <Box key={s} sx={{ display: 'flex', alignItems: 'center', flex: i < 4 ? 1 : 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, cursor: s <= step ? 'pointer' : 'default' }} onClick={() => goTo(s)}>
                <StepDot $active={s === step} $done={s < step}>{s < step ? <CheckIcon sx={{ fontSize: 14 }} /> : s}</StepDot>
                <Typography variant="caption" fontWeight={600} sx={{ display: { xs: 'none', lg: 'block' }, color: s === step ? 'primary.main' : s < step ? 'text.secondary' : 'text.disabled', whiteSpace: 'nowrap', fontSize: 11 }}>
                  {labels[i]}
                </Typography>
              </Box>
              {i < 4 && <StepLine $done={s < step} />}
            </Box>
          ))}
        </Stack>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, px: 4, py: 3.5, pb: 12, maxWidth: 820, width: '100%' }}>

        {/* ─── STEP 1: ORGANİZATÖR ─── */}
        {step === 1 && (
          <Stack spacing={3}>
            <SH title="Etkinligi kim olusturuyor?" subtitle="Etkinligin sahip olarak gorunecegi kullaniciyi secin. Etkinlik bu kisi adina olusturulur." />

            <Stack direction="row" spacing={1}>
              <TextField fullWidth placeholder="E-posta veya isim ile ara..." value={orgSearch}
                onChange={e => setOrgSearch(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') searchOrganizers(); }}
                size="small" />
              <Button variant="contained" onClick={searchOrganizers} disabled={orgLoading}
                sx={{ textTransform: 'none', borderRadius: 2, px: 3, whiteSpace: 'nowrap' }}>
                {orgLoading ? <CircularProgress size={20} color="inherit" /> : 'Ara'}
              </Button>
            </Stack>
            {errors.organizer && <Typography variant="caption" color="error">{errors.organizer}</Typography>}

            {orgResults.length > 0 && (
              <SC>
                {orgResults.map(u => {
                  const sel = organizer?.id === u.id;
                  return (
                    <Stack key={u.id} direction="row" spacing={1.5} alignItems="center"
                      onClick={() => { setOrganizer(u); clr('organizer'); }}
                      sx={{ px: 2.5, py: 1.5, cursor: 'pointer', borderBottom: '1px solid', borderColor: 'divider', bgcolor: sel ? alpha(theme.palette.primary.main, 0.06) : 'transparent', '&:last-child': { borderBottom: 'none' }, '&:hover': { bgcolor: sel ? undefined : 'grey.50' } }}>
                      <Avatar src={u.imageUrl} sx={{ width: 36, height: 36, fontSize: 14 }}>{(u.firstName || u.email)?.[0]}</Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight={600}>{u.displayName || `${u.firstName || ''} ${u.lastName || ''}`}</Typography>
                        <Typography variant="caption" color="text.secondary">{u.email}</Typography>
                      </Box>
                      <Chip label={u.accountType || 'INDIVIDUAL'} size="small" variant="outlined" sx={{ fontSize: 10, height: 20 }} />
                      {sel && <CheckIcon sx={{ fontSize: 20, color: 'primary.main' }} />}
                    </Stack>
                  );
                })}
              </SC>
            )}

            {organizer && (
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, bgcolor: alpha(theme.palette.success.main, 0.04), borderColor: alpha(theme.palette.success.main, 0.3) }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar src={organizer.imageUrl} sx={{ width: 44, height: 44, bgcolor: alpha('#10b981', 0.15), color: '#10b981', fontWeight: 700 }}>{organizer.firstName?.[0]}</Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight={700}>{organizer.displayName || `${organizer.firstName} ${organizer.lastName}`}</Typography>
                    <Typography variant="caption" color="text.secondary">{organizer.email}</Typography>
                  </Box>
                  <Chip label="Organizator" size="small" color="success" variant="outlined" sx={{ fontWeight: 600 }} />
                  <IconButton size="small" onClick={() => setOrganizer(null)}><CloseIcon fontSize="small" /></IconButton>
                </Stack>
              </Paper>
            )}

            <Divider />

            {/* URL Import */}
            <Box>
              <SH title="Linkten bilgi cek (opsiyonel)" subtitle="Instagram, web sitesi veya etkinlik sayfasi linkinden etkinlik bilgilerini otomatik doldurmaya calisin. Cogu sosyal medya linki CORS kisitlamasi nedeniyle dogrudan okunamayabilir." />
              <Stack direction="row" spacing={1}>
                <TextField fullWidth placeholder="https://instagram.com/p/... veya herhangi bir URL" value={importUrl}
                  onChange={e => setImportUrl(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleImportUrl(); }}
                  size="small"
                  InputProps={{ startAdornment: <LinkIcon sx={{ mr: 1, fontSize: 18, color: 'text.disabled' }} /> }}
                />
                <Button variant="outlined" onClick={handleImportUrl} disabled={importing || !importUrl.trim()}
                  sx={{ textTransform: 'none', borderRadius: 2, px: 3, whiteSpace: 'nowrap' }}>
                  {importing ? <CircularProgress size={20} /> : 'Bilgi Cek'}
                </Button>
              </Stack>
              <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: 'block' }}>
                Desteklenen: OG meta etiketi iceren web sayfalari. Instagram, Twitter vb. dogrudan desteklenmeyebilir.
              </Typography>
            </Box>
          </Stack>
        )}

        {/* ─── STEP 2: ETKİNLİK TÜRÜ ─── */}
        {step === 2 && (
          <Stack spacing={3}>
            <SH title="Ne tur bir etkinlik olusturmak istiyorsunuz?" subtitle="Seciminize gore sonraki adimlar otomatik sekillenir." />
            <Stack spacing={2}>
              {([
                { key: 'paid' as EventType, icon: '🎟️', name: 'Ucretli Etkinlik', desc: 'Bilet satisi yapilacak. Farkli fiyat kategorileri tanimlayabilirsiniz.', features: ['Katmanli fiyatlandirma', 'Online odeme', 'QR bilet'], color: theme.palette.primary.main },
                { key: 'free' as EventType, icon: '🎁', name: 'Ucretsiz Etkinlik', desc: 'Katilim bedava. Kayit formu ile katilimci bilgileri toplanir.', features: ['Ucretsiz kayit', 'Kapasite kontrolu', 'Katilimci listesi'], color: theme.palette.success.main },
                { key: 'invite' as EventType, icon: '🔒', name: 'Davetiye ile Giris', desc: 'Sadece davet edilen kisiler katilabilir.', features: ['Ozel davet kodlari', 'Kontrollu erisim', 'VIP etkinlikler'], color: theme.palette.warning.main },
              ]).map(opt => {
                const sel = eventType === opt.key;
                return (
                  <Paper key={opt.key} variant="outlined" onClick={() => { setEventType(opt.key); clr('eventType'); }}
                    sx={{ p: 3, borderRadius: 3, cursor: 'pointer', transition: 'all 0.15s', border: '2px solid', borderColor: sel ? opt.color : 'divider', bgcolor: sel ? alpha(opt.color, 0.04) : 'transparent', boxShadow: sel ? `0 0 0 3px ${alpha(opt.color, 0.12)}` : 'none', '&:hover': { borderColor: sel ? opt.color : alpha(opt.color, 0.4), bgcolor: alpha(opt.color, 0.02) } }}>
                    <Stack direction="row" spacing={2.5} alignItems="flex-start">
                      <Box sx={{ width: 56, height: 56, borderRadius: 3, bgcolor: alpha(opt.color, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>{opt.icon}</Box>
                      <Box sx={{ flex: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                          <Typography variant="subtitle1" fontWeight={700}>{opt.name}</Typography>
                          {sel && <Chip label="Secildi" size="small" sx={{ height: 22, fontWeight: 700, bgcolor: opt.color, color: '#fff' }} />}
                        </Stack>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, lineHeight: 1.5 }}>{opt.desc}</Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          {opt.features.map(f => <Chip key={f} label={f} size="small" variant="outlined" sx={{ height: 24, fontSize: 11, fontWeight: 600, borderColor: alpha(opt.color, 0.3), color: sel ? opt.color : 'text.secondary' }} />)}
                        </Stack>
                      </Box>
                      <Box sx={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid', borderColor: sel ? opt.color : 'text.disabled', display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 0.5, flexShrink: 0 }}>
                        {sel && <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: opt.color }} />}
                      </Box>
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>
            {errors.eventType && <Typography variant="caption" color="error">{errors.eventType}</Typography>}
          </Stack>
        )}

        {/* ─── STEP 3: ETKİNLİK BİLGİLERİ ─── */}
        {step === 3 && (
          <Stack spacing={3.5}>
            {/* Organizer reminder */}
            {organizer && (
              <Paper variant="outlined" sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, borderRadius: 2.5, bgcolor: 'grey.50' }}>
                <Avatar src={organizer.imageUrl} sx={{ width: 32, height: 32, fontSize: 13 }}>{organizer.firstName?.[0]}</Avatar>
                <Typography variant="body2" fontWeight={600}>{organizer.displayName || organizer.firstName} <Typography component="span" variant="caption" color="text.secondary">adina olusturuluyor</Typography></Typography>
              </Paper>
            )}

            <Box>
              <SH title="Temel Bilgiler" />
              <Stack spacing={2}>
                <TextField fullWidth label="Etkinlik Adi" required value={eventName}
                  onChange={e => { setEventName(e.target.value); clr('eventName'); }}
                  error={!!errors.eventName} helperText={errors.eventName} placeholder="Orn: Ankara Caz Festivali 2026" />
                <Stack direction="row" spacing={2}>
                  <FormControl fullWidth>
                    <InputLabel>Kategori</InputLabel>
                    <Select value={eventCategory} label="Kategori" onChange={e => setEventCategory(e.target.value)}>
                      <MenuItem value="">Secin...</MenuItem>
                      {['Dugun & Nisan', 'Festival & Senlikler', 'Spor & Aktif Yasam', 'Egitim & Gelisim', 'Teknoloji & Bilisim', 'Universite & Topluluk', 'Konser & Muzik', 'Tiyatro & Gosteri'].map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <TextField fullWidth label="Konum / Sehir" value={eventLocation} onChange={e => setEventLocation(e.target.value)} />
                </Stack>
                <TextField fullWidth multiline rows={3} label="Aciklama (opsiyonel)" value={eventDescription} onChange={e => setEventDescription(e.target.value)} />
              </Stack>
            </Box>
            <Divider />
            <Box>
              <SH title="Tarih & Saat" />
              <Stack direction="row" spacing={2}>
                <TextField fullWidth label="Baslangic" type="datetime-local" required InputLabelProps={{ shrink: true }}
                  value={eventStart} onChange={e => { setEventStart(e.target.value); clr('eventStart'); }} error={!!errors.eventStart} helperText={errors.eventStart} />
                <TextField fullWidth label="Bitis" type="datetime-local" required InputLabelProps={{ shrink: true }}
                  value={eventEnd} onChange={e => { setEventEnd(e.target.value); clr('eventEnd'); }} error={!!errors.eventEnd} helperText={errors.eventEnd} />
              </Stack>
            </Box>
            <Divider />
            <Box>
              <SH title="Kapasite & Mekan" />
              <Stack direction="row" spacing={2}>
                <TextField fullWidth label="Toplam Kapasite" type="number" required value={capacity}
                  onChange={e => { setCapacity(e.target.value); clr('capacity'); }} error={!!errors.capacity} helperText={errors.capacity} />
                <FormControl fullWidth>
                  <InputLabel>Mekan Tipi</InputLabel>
                  <Select value={venueType} label="Mekan Tipi" onChange={e => setVenueType(e.target.value)}>
                    <MenuItem value="">Belirtilmemis</MenuItem>
                    {['Kapali Salon', 'Acik Alan', 'Tiyatro / Sahne', 'Stadyum / Arena', 'Online / Hibrit'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                  </Select>
                </FormControl>
              </Stack>
            </Box>
            <Divider />
            <Box>
              <SH title="Kapak Gorseli" />
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageSelect} style={{ display: 'none' }} />
              {imagePreview ? (
                <Box sx={{ position: 'relative', borderRadius: 3, overflow: 'hidden', border: '2px solid', borderColor: 'divider', '&:hover .ov': { opacity: 1 } }}>
                  <Box component="img" src={imagePreview} sx={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }} />
                  <Box className="ov" sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, opacity: 0, transition: '0.2s' }}>
                    <Button size="small" variant="contained" onClick={() => fileInputRef.current?.click()} sx={{ bgcolor: 'rgba(255,255,255,0.95)', color: 'text.primary', '&:hover': { bgcolor: 'white' } }}>Degistir</Button>
                    <Button size="small" variant="contained" color="error" onClick={() => { setEventImage(null); setImagePreview(null); }}>Kaldir</Button>
                  </Box>
                </Box>
              ) : (
                <Box onClick={() => fileInputRef.current?.click()} sx={{ border: '2px dashed', borderColor: 'divider', borderRadius: 3, p: 4, textAlign: 'center', cursor: 'pointer', '&:hover': { borderColor: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.02) } }}>
                  <Typography sx={{ fontSize: 32, mb: 0.5, opacity: 0.3 }}>📷</Typography>
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>Gorsel yuklemek icin tiklayin</Typography>
                </Box>
              )}
            </Box>
            <Divider />
            <Box>
              <SH title="Gorunurluk" />
              <Stack spacing={1}>
                {([
                  { key: 'public' as Visibility, icon: '🌐', name: 'Herkese Acik', desc: 'Tum kullanicilar etkinligi bulabilir' },
                  { key: 'link' as Visibility, icon: '🔗', name: 'Sadece Link ile', desc: 'Listede gorunmez, sadece linke sahip olanlar erisebilir' },
                  { key: 'draft' as Visibility, icon: '🔒', name: 'Taslak', desc: 'Henuz yayinlanmaz, sadece adminler gorebilir' },
                ]).map(opt => (
                  <Paper key={opt.key} variant="outlined" onClick={() => setVisibility(opt.key)}
                    sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, cursor: 'pointer', border: '2px solid', borderRadius: 2.5, borderColor: visibility === opt.key ? 'primary.main' : 'divider', bgcolor: visibility === opt.key ? alpha(theme.palette.primary.main, 0.04) : 'transparent', '&:hover': { borderColor: 'primary.light' } }}>
                    <Box sx={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid', borderColor: visibility === opt.key ? 'primary.main' : 'text.disabled', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {visibility === opt.key && <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main' }} />}
                    </Box>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>{opt.icon} {opt.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{opt.desc}</Typography>
                    </Box>
                  </Paper>
                ))}
              </Stack>
            </Box>
          </Stack>
        )}

        {/* ─── STEP 4: BİLET & KAYIT ─── */}
        {step === 4 && (
          <Stack spacing={3.5}>
            <Paper variant="outlined" sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, borderRadius: 2.5, bgcolor: 'grey.50' }}>
              <Typography sx={{ fontSize: 24 }}>{eventType === 'paid' ? '🎟️' : eventType === 'free' ? '🎁' : '🔒'}</Typography>
              <Box>
                <Typography variant="body2" fontWeight={700}>{eventType === 'paid' ? 'Ucretli Etkinlik' : eventType === 'free' ? 'Ucretsiz Etkinlik' : 'Davetiye ile Giris'}</Typography>
                <Typography variant="caption" color="text.secondary">Degistirmek icin <Typography component="span" variant="caption" color="primary.main" sx={{ cursor: 'pointer', fontWeight: 600 }} onClick={() => goTo(2)}>2. adima donun</Typography></Typography>
              </Box>
            </Paper>

            {eventType === 'paid' && (
              <>
                <Box>
                  <SH title="Bilet Kategorileri" />
                  <SC>
                    <Box sx={{ px: 2.5, py: 1, bgcolor: 'grey.50', borderBottom: '1px solid', borderColor: 'divider', display: 'grid', gridTemplateColumns: '1fr 140px 100px 40px', gap: 1.5, fontSize: 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      <Box>Bilet Adi</Box><Box>Fiyat ({CURRENCY_SYMBOLS[currency] || currency})</Box><Box>Kontenjan</Box><Box />
                    </Box>
                    {tiers.map(t => (
                      <Box key={t.id} sx={{ display: 'grid', gridTemplateColumns: '1fr 140px 100px 40px', gap: 1.5, alignItems: 'center', px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', '&:last-of-type': { borderBottom: 'none' }, '&:hover': { bgcolor: 'grey.50' } }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: t.color, flexShrink: 0 }} />
                          <TextField variant="standard" value={t.name} fullWidth placeholder="Kategori adi"
                            InputProps={{ disableUnderline: true, sx: { fontWeight: 600, fontSize: 14 } }}
                            onChange={e => updateTier(t.id, 'name', e.target.value)} />
                        </Stack>
                        <TextField variant="outlined" size="small" type="number" value={t.price}
                          error={!!errors.tierPrice && t.price <= 0}
                          InputProps={{ startAdornment: <Typography sx={{ mr: 0.5, color: 'text.secondary', fontSize: 13 }}>{CURRENCY_SYMBOLS[currency] || currency}</Typography>, inputProps: { min: 1, step: 1 } }}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                          onFocus={e => e.target.select()}
                          onChange={e => updateTier(t.id, 'price', e.target.value === '' ? 0 : Number(e.target.value))} />
                        <TextField variant="outlined" size="small" type="number" value={t.quota}
                          error={!!errors.tierQuota && t.quota <= 0}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                          InputProps={{ inputProps: { min: 1, step: 1 } }}
                          onFocus={e => e.target.select()}
                          onChange={e => updateTier(t.id, 'quota', e.target.value === '' ? 0 : Number(e.target.value))} />
                        <IconButton size="small" onClick={() => removeTier(t.id)} sx={{ '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.08), color: 'error.main' } }}><CloseIcon fontSize="small" /></IconButton>
                      </Box>
                    ))}
                    <Button fullWidth startIcon={<AddIcon />} onClick={addTier} sx={{ justifyContent: 'flex-start', px: 2.5, py: 1.5, textTransform: 'none', fontWeight: 600, color: 'primary.main', borderTop: '1px solid', borderColor: 'divider', borderRadius: 0 }}>Yeni Kategori Ekle</Button>
                  </SC>
                  {errors.tiers && <Typography variant="caption" color="error">{errors.tiers}</Typography>}
                  {errors.tierPrice && <Typography variant="caption" color="error">{errors.tierPrice}</Typography>}
                  {errors.tierQuota && <Typography variant="caption" color="error">{errors.tierQuota}</Typography>}
                  <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                    <Paper variant="outlined" sx={{ flex: 1, p: 1.5, borderRadius: 2, textAlign: 'center' }}>
                      <Typography variant="h6" fontWeight={800} fontFamily="JetBrains Mono, monospace" color="info.main">{totalQuota}</Typography>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>Toplam Kontenjan</Typography>
                    </Paper>
                    <Paper variant="outlined" sx={{ flex: 1, p: 1.5, borderRadius: 2, textAlign: 'center' }}>
                      <Typography variant="h6" fontWeight={800} fontFamily="JetBrains Mono, monospace" color="success.main">{CURRENCY_SYMBOLS[currency] || currency}{maxRevenue.toLocaleString('tr-TR')}</Typography>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>Maks. Gelir</Typography>
                    </Paper>
                  </Stack>
                </Box>
                <Divider />
                <Box>
                  <SH title="Para Birimi" />
                  <FormControl sx={{ minWidth: 200 }}>
                    <InputLabel>Para Birimi</InputLabel>
                    <Select value={currency} label="Para Birimi" onChange={e => setCurrency(e.target.value)}>
                      <MenuItem value="TRY">₺ Turk Lirasi</MenuItem><MenuItem value="USD">$ USD</MenuItem><MenuItem value="EUR">€ EUR</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </>
            )}
            {eventType === 'free' && (
              <Box>
                <SH title="Kayit Formu" subtitle="Katilimcidan hangi bilgiler alinacak?" />
                <SC><Box sx={{ px: 2.5 }}>
                  {[{ name: 'Ad Soyad', desc: 'Zorunlu', locked: true }, { name: 'E-posta', desc: 'Bilet ve bildirim icin', locked: true }, { name: 'Telefon', desc: 'Opsiyonel', locked: false }, { name: 'Kurum / Okul', desc: 'Kurumsal etkinlikler icin', locked: false }].map((f, i) => (
                    <Stack key={i} direction="row" alignItems="center" justifyContent="space-between" sx={{ py: 1.5, borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 'none' } }}>
                      <Box><Typography variant="body2" fontWeight={500}>{f.name}</Typography><Typography variant="caption" color="text.secondary">{f.desc}</Typography></Box>
                      <Switch defaultChecked={f.locked} disabled={f.locked} color="primary" />
                    </Stack>
                  ))}
                </Box></SC>
              </Box>
            )}
            {eventType === 'invite' && (
              <Box>
                <SH title="Davet Ayarlari" />
                <SC><Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 40, mb: 1, opacity: 0.3 }}>🔒</Typography>
                  <Typography variant="body2" color="text.secondary">Etkinlik yayinlandiktan sonra davet kodlari olusturabilirsiniz.</Typography>
                </Box></SC>
              </Box>
            )}
            <Divider />
            <Box>
              <SH
                title={eventType === 'paid' ? 'Satis Takvimi' : eventType === 'free' ? 'Kayit Takvimi' : 'Etkinlik Takvimi (Opsiyonel)'}
                subtitle={eventType === 'invite' ? 'Davetiye etkinliklerinde takvim opsiyoneldir.' : undefined}
              />
              <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <TextField fullWidth label={eventType === 'paid' ? 'Satis Baslangici' : eventType === 'free' ? 'Kayit Baslangici' : 'Baslangic (opsiyonel)'} type="datetime-local" required={eventType !== 'invite'} InputLabelProps={{ shrink: true }}
                  value={saleStart} onChange={e => { setSaleStart(e.target.value); clr('saleStart'); }} error={!!errors.saleStart} helperText={errors.saleStart} />
                <TextField fullWidth label={eventType === 'paid' ? 'Satis Bitisi (opsiyonel)' : 'Bitis (opsiyonel)'} type="datetime-local" InputLabelProps={{ shrink: true }}
                  value={saleEnd} onChange={e => setSaleEnd(e.target.value)} helperText="Bos birakilirsa etkinlik baslangicinda kapanir" />
              </Stack>
              {eventType === 'paid' && (
                <Stack direction="row" spacing={2}>
                  <TextField fullWidth label="Kisi Basi Min. Bilet" type="number" value={minTickets}
                    error={!!errors.minTickets} helperText={errors.minTickets}
                    InputProps={{ inputProps: { min: 1 } }}
                    onChange={e => { setMinTickets(Number(e.target.value)); clr('minTickets'); clr('maxTickets'); }} />
                  <TextField fullWidth label="Kisi Basi Max. Bilet" type="number" value={maxTickets}
                    error={!!errors.maxTickets} helperText={errors.maxTickets}
                    InputProps={{ inputProps: { min: 1 } }}
                    onChange={e => { setMaxTickets(Number(e.target.value)); clr('maxTickets'); }} />
                </Stack>
              )}
            </Box>
            <Divider />
            <Box>
              <SH title="Ek Ayarlar" />
              <SC><Box sx={{ px: 2.5 }}>
                {[
                  ...(eventType === 'paid' ? [
                    { name: 'Iade politikasi aktif', desc: 'Etkinlikten once iade kabul edilir', value: refundPolicy, setter: setRefundPolicy },
                    { name: 'Isim transferine izin ver', desc: 'Bileti baskasina devredebilir', value: transferable, setter: setTransferable },
                  ] : []),
                  { name: 'Bekleme listesi', desc: 'Kapasite doldugunda bekleme listesi', value: waitlist, setter: setWaitlist },
                ].map((t, i) => (
                  <Stack key={i} direction="row" alignItems="center" justifyContent="space-between" sx={{ py: 1.5, borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 'none' } }}>
                    <Box><Typography variant="body2" fontWeight={500}>{t.name}</Typography><Typography variant="caption" color="text.secondary">{t.desc}</Typography></Box>
                    <Switch checked={t.value} onChange={e => t.setter(e.target.checked)} color="primary" />
                  </Stack>
                ))}
              </Box></SC>
            </Box>
          </Stack>
        )}

        {/* ─── STEP 5: ÖNİZLEME ─── */}
        {step === 5 && (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
            <Stack spacing={2}>
              <SH title="Etkinlik Ozeti" subtitle="Yayinlamadan once bilgileri gozden gecirin." />
              <SC>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="subtitle2" fontWeight={700}>Organizator & Genel</Typography>
                  <Button size="small" onClick={() => goTo(1)} sx={{ textTransform: 'none', fontSize: 12 }}>Duzenle</Button>
                </Box>
                {[
                  { l: 'Organizator', v: organizer?.displayName || organizer?.email || '—' },
                  { l: 'E-posta', v: organizer?.email || '—' },
                  { l: 'Tur', v: eventType === 'paid' ? '🎟️ Ucretli' : eventType === 'free' ? '🎁 Ucretsiz' : '🔒 Davetiye' },
                  { l: 'Etkinlik Adi', v: eventName || '—' },
                  { l: 'Tarih', v: eventStart ? new Date(eventStart).toLocaleString('tr-TR') : '—' },
                  { l: 'Konum', v: eventLocation || '—' },
                  { l: 'Kapasite', v: capacity ? `${capacity} kisi` : '—' },
                  { l: 'Gorunurluk', v: visibility === 'public' ? '🌐 Herkese Acik' : visibility === 'link' ? '🔗 Link' : '🔒 Taslak' },
                ].map((r, i) => (
                  <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', px: 2.5, py: 1.2, borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 'none' } }}>
                    <Typography variant="body2" color="text.secondary">{r.l}</Typography>
                    <Typography variant="body2" fontWeight={600}>{r.v}</Typography>
                  </Box>
                ))}
              </SC>
              {eventType === 'paid' && (
                <SC>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="subtitle2" fontWeight={700}>Bilet Kategorileri</Typography>
                    <Button size="small" onClick={() => goTo(4)} sx={{ textTransform: 'none', fontSize: 12 }}>Duzenle</Button>
                  </Box>
                  {tiers.map((t, i) => (
                    <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2.5, py: 1.2, borderBottom: '1px solid', borderColor: 'divider' }}>
                      <Box><Stack direction="row" spacing={1} alignItems="center"><Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: t.color }} /><Typography variant="body2" fontWeight={600}>{t.name}</Typography></Stack><Typography variant="caption" color="text.secondary">{t.quota} kontenjan</Typography></Box>
                      <Typography variant="body2" fontWeight={700} color="primary.main">{CURRENCY_SYMBOLS[currency] || currency}{t.price.toLocaleString('tr-TR')}</Typography>
                    </Box>
                  ))}
                  <Box sx={{ px: 2.5, py: 1.2, display: 'flex', justifyContent: 'space-between', bgcolor: 'grey.50', fontWeight: 600, fontSize: 13 }}>
                    <span>Maks. Gelir</span><span style={{ color: theme.palette.primary.main }}>{CURRENCY_SYMBOLS[currency] || currency}{maxRevenue.toLocaleString('tr-TR')}</span>
                  </Box>
                </SC>
              )}
              <SC>
                <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}><Typography variant="subtitle2" fontWeight={700}>Kontrol</Typography></Box>
                <Stack sx={{ p: 2 }} spacing={1}>
                  {[
                    { ok: !!organizer, t: 'Organizator secildi' },
                    { ok: !!eventName && !!eventStart, t: 'Etkinlik adi ve tarihi girildi' },
                    { ok: eventType === 'paid' ? tiers.length > 0 && tiers.every(t => t.price > 0) : true, t: eventType === 'paid' ? 'Bilet kategorileri tanimlandi' : 'Kayit formu hazir' },
                    { ok: eventType === 'invite' ? true : !!saleStart, t: eventType === 'paid' ? 'Satis tarihi belirlendi' : eventType === 'free' ? 'Kayit tarihi belirlendi' : 'Takvim (opsiyonel)', opt: eventType === 'invite' },
                    { ok: !!eventImage, t: eventImage ? 'Gorsel yuklendi' : 'Gorsel yuklenmedi', opt: !eventImage },
                    ...(eventType === 'paid' && capacity && totalQuota !== Number(capacity) ? [{ ok: false, t: `Bilet kontenjan (${totalQuota}) etkinlik kapasitesi (${capacity}) ile eslesmiyor`, opt: true }] : []),
                  ].map((c, i) => (
                    <Stack key={i} direction="row" spacing={1} alignItems="center">
                      {c.ok ? <CheckIcon sx={{ fontSize: 18, color: 'success.main' }} /> : <WarningIcon sx={{ fontSize: 18, color: 'warning.main' }} />}
                      <Typography variant="body2" sx={{ color: c.ok ? 'text.primary' : 'text.secondary' }}>{c.t}{c.opt && <Typography component="span" variant="caption" color="text.disabled" sx={{ ml: 0.5 }}>(opsiyonel)</Typography>}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </SC>
            </Stack>
            <Box sx={{ position: 'sticky', top: 200, alignSelf: 'start' }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>Canli Onizleme</Typography>
              <SC>
                <Box sx={{ bgcolor: 'primary.main', color: 'white', px: 3, py: 2.5 }}>
                  <Typography variant="caption" fontWeight={700} textTransform="uppercase" letterSpacing={1} sx={{ opacity: 0.7, mb: 0.5, display: 'block' }}>
                    {eventType === 'paid' ? '🎟️ Etkinlik Bileti' : eventType === 'free' ? '🎁 Ucretsiz Etkinlik' : '🔒 Ozel Davet'}
                  </Typography>
                  <Typography variant="h6" fontWeight={800} sx={{ mb: 0.5 }}>{eventName || 'Etkinlik Adi'}</Typography>
                  <Stack direction="row" spacing={2} sx={{ opacity: 0.8, fontSize: 13 }}>
                    <span>{eventStart ? new Date(eventStart).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Tarih'}</span>
                    <span>{eventLocation || 'Konum'}</span>
                  </Stack>
                  <Typography variant="caption" sx={{ opacity: 0.6, mt: 1, display: 'block' }}>by {organizer?.displayName || organizer?.firstName || '—'}</Typography>
                </Box>
                <Box sx={{ px: 3, py: 2.5 }}>
                  {eventType === 'paid' ? (
                    <Stack spacing={1}>
                      {tiers.map((t, i) => (
                        <Box key={i} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, border: '1.5px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'grey.50' }}>
                          <Box><Typography variant="body2" fontWeight={700}>{t.name || 'Kategori'}</Typography><Typography variant="caption" color="text.secondary">{t.quota} kontenjan</Typography></Box>
                          <Typography variant="h6" fontWeight={800} fontFamily="JetBrains Mono, monospace" color="primary.main">{CURRENCY_SYMBOLS[currency] || currency}{t.price.toLocaleString('tr-TR')}</Typography>
                        </Box>
                      ))}
                      <Button fullWidth variant="contained" sx={{ mt: 1, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>Bilet Satin Al</Button>
                    </Stack>
                  ) : eventType === 'free' ? (
                    <Box sx={{ textAlign: 'center', py: 2 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Bu etkinlik ucretsizdir</Typography>
                      <Button fullWidth variant="contained" color="success" sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>Hemen Kayit Ol</Button>
                    </Box>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 2 }}><Typography sx={{ fontSize: 32 }}>🔒</Typography><Typography variant="body2" color="text.secondary">Sadece davet kodu ile katilim</Typography></Box>
                  )}
                </Box>
              </SC>
            </Box>
          </Box>
        )}
      </Box>

      {/* Footer */}
      <Box sx={{ position: 'fixed', bottom: 0, right: 0, width: 'calc(100% - 272px)', bgcolor: 'background.paper', borderTop: '1px solid', borderColor: 'divider', px: 4, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 -4px 12px rgba(0,0,0,0.05)', zIndex: 5 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          {step > 1 && <Button variant="outlined" startIcon={<BackIcon />} onClick={goBack} sx={{ textTransform: 'none', borderRadius: 2.5, fontWeight: 600 }}>Geri</Button>}
          <LinearProgress variant="determinate" value={(step / TOTAL) * 100} sx={{ width: 120, height: 6, borderRadius: 3, bgcolor: 'grey.200', '& .MuiLinearProgress-bar': { borderRadius: 3 } }} />
          <Typography variant="caption" color="text.secondary" fontWeight={600}>Adim {step} / {TOTAL}</Typography>
        </Stack>
        <Button variant="contained" onClick={goNext} disabled={publishing}
          endIcon={step === TOTAL ? <RocketIcon /> : <ForwardIcon />}
          sx={{ textTransform: 'none', borderRadius: 2.5, fontWeight: 600, px: 3 }}>
          {publishing ? 'Yayinlaniyor...' : step === TOTAL ? 'Yayinla' : 'Devam Et'}
        </Button>
      </Box>
    </Box>
  );
}
