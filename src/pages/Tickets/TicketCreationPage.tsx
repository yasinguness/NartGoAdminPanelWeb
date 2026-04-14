/**
 * EventCreationPage — 7-step guided wizard for creating events & tickets
 * Steps: (1) Organizer, (2) Event Type, (3) Event Info, (4) Seat Plan, (5) Ticket Config, (6) Refund Policy, (7) Preview
 */
import { useState, useRef, useMemo, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { ticketService } from '../../services/ticket/ticketService';
import { userService } from '../../services/user/userService';
import { api } from '../../services/api';
import {
  Box, Typography, Button, TextField, Select, MenuItem, FormControl, InputLabel,
  Stack, Paper, Chip, Switch, Divider, IconButton, alpha, useTheme, styled,
  Fade, Avatar, CircularProgress, RadioGroup, FormControlLabel, Radio, Tooltip,
} from '@mui/material';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  ArrowBack as BackIcon, ArrowForward as ForwardIcon, Add as AddIcon,
  Close as CloseIcon, Rocket as RocketIcon, CheckCircle as CheckIcon,
  Warning as WarningIcon, CelebrationOutlined as CelebrationIcon,
  ContentCopy as CopyIcon, Search as SearchIcon, Link as LinkIcon,
  ImageNotSupported as NoImageIcon, CalendarMonth as CalendarIcon,
  Send as SendIcon, PhoneIphone as MobileIcon, DesktopWindows as DesktopIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import type { UserDTO } from '../../types/users/userModel';
import { VenueTemplate, RefundPolicy, DEFAULT_REFUND_POLICY, EventFormat, TicketCategory, type SeatSection } from '../../types/tickets/ticketTypes';
import SeatPlanStep from './steps/SeatPlanStep';
import GooglePlacesInput from '../../components/GooglePlacesInput';
import RefundPolicyStep from './steps/RefundPolicyStep';
import { useRole } from '../../hooks/useRole';
import { useAuthStore } from '../../store/authStore';
// Google Places now handled by GooglePlacesInput component
import CoverImageEditor from '../../components/CoverImageEditor';
import type { CoverMediaRequest } from '../../types/article/articleModel';

// ─── STYLED ────────────────────────────────────────────
const StepDot = styled(Box, { shouldForwardProp: (p) => p !== '$active' && p !== '$done' })<{ $active?: boolean; $done?: boolean }>(({ theme, $active, $done }) => ({
  width: 32, height: 32, borderRadius: '50%',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 13, fontWeight: 700, flexShrink: 0, transition: 'all 0.25s',
  ...($active && { background: theme.palette.primary.main, color: '#fff', border: `2px solid ${theme.palette.primary.main}`, boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.15)}` }),
  ...($done && { background: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main, border: `2px solid ${theme.palette.primary.main}` }),
  ...(!$active && !$done && { border: `2px solid ${theme.palette.divider}`, background: '#fff', color: theme.palette.text.disabled }),
}));
const StepLine = styled(Box, { shouldForwardProp: (p) => p !== '$done' })<{ $done?: boolean }>(({ theme, $done }) => ({
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
interface TierItem { id: string; name: string; price: number; quota: number; color: string; category: TicketCategory; }
type EventType = 'paid' | 'free' | 'invite';
type Visibility = 'public' | 'link' | 'draft';
const TIER_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#a855f7', '#ef4444', '#ec4899'];
const CURRENCY_SYMBOLS: Record<string, string> = { TRY: '₺', USD: '$', EUR: '€' };
const CATEGORY_TR: Record<string, string> = {
  VIP: 'VIP', PREMIUM: 'Premium', STANDARD: 'Standart', ECONOMY: 'Ekonomi',
  EARLY_BIRD: 'Erken Kuş', STUDENT: 'Öğrenci', GROUP: 'Grup', FREE: 'Ücretsiz', DONATION: 'Bağış',
};
const TICKET_CATEGORIES: { value: TicketCategory; label: string }[] = [
  { value: TicketCategory.STANDARD, label: 'Standart' },
  { value: TicketCategory.VIP, label: 'VIP' },
  { value: TicketCategory.EARLY_BIRD, label: 'Erken Kuş' },
  { value: TicketCategory.STUDENT, label: 'Öğrenci' },
  { value: TicketCategory.GROUP, label: 'Grup (5+)' },
  { value: TicketCategory.FREE, label: 'Ücretsiz' },
  { value: TicketCategory.DONATION, label: 'Bağış' },
];

export default function TicketCreationPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { eventId } = useParams<{ eventId?: string }>();
  const [searchParams] = useSearchParams();
  const isConvertMode = searchParams.get('convert') === 'true' && !!eventId;
  const { enqueueSnackbar } = useSnackbar();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isAdmin } = useRole();
  const currentUser = useAuthStore((state) => state.user);

  const [step, setStep] = useState(1);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [savedAsDraft, setSavedAsDraft] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [convertLoading, setConvertLoading] = useState(false);

  // Step 1 (admin only): Organizer search
  const [orgSearch, setOrgSearch] = useState('');
  const [orgResults, setOrgResults] = useState<UserDTO[]>([]);
  const [orgLoading, setOrgLoading] = useState(false);
  const [organizer, setOrganizer] = useState<UserDTO | null>(null);

  // For non-admin users, auto-set organizer from current user
  const effectiveOrganizer: UserDTO | null = isAdmin
    ? organizer
    : currentUser
      ? {
          id: currentUser.id,
          firstName: currentUser.firstName,
          lastName: currentUser.lastName,
          email: currentUser.email,
          displayName: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim(),
          imageUrl: currentUser.imageUrl,
        } as UserDTO
      : null;

  // URL import
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);

  // Step 2: Event type
  const [eventType, setEventType] = useState<EventType | null>(null);

  // Ucretsiz etkinlik tespiti — step sayisi ve akis buna gore degisir
  const isFreeEvent = eventType === 'free';
  // Ucretli: admin=7, org=6 | Ucretsiz: admin=5, org=4
  const TOTAL = (isAdmin ? 7 : 6) - (isFreeEvent ? 2 : 0);

  // Logical step: visible step → internal step number (her zaman 1-7 arasi)
  const logicalStep = (() => {
    let ls = isAdmin ? step : step + 1;
    if (isFreeEvent && ls > 4) ls = 7; // ucretsiz: step 5,6 atlanir
    return ls;
  })();

  // Step 3: Event info
  const [eventName, setEventName] = useState('');
  const [eventCategoryId, setEventCategoryId] = useState<string>('');
  const [eventCategories, setEventCategories] = useState<{ id: string; name: string }[]>([]);
  const [eventAddress, setEventAddress] = useState<import('../../components/GooglePlacesInput').AddressValue | null>(null);
  const [eventDescription, setEventDescription] = useState('');
  const [eventStartDate, setEventStartDate] = useState<Date | null>(null);
  const [eventEndDate, setEventEndDate] = useState<Date | null>(null);
  const [capacity, setCapacity] = useState('');
  const [venueType, setVenueType] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [eventImage, setEventImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [coverMedia, setCoverMedia] = useState<CoverMediaRequest | undefined>(undefined);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  // Step 3 extended: Event format, age limit, language
  const [eventFormat, setEventFormat] = useState<EventFormat>(EventFormat.PHYSICAL);
  const [ageLimit, setAgeLimit] = useState('');
  const [eventLanguage, setEventLanguage] = useState('');

  // Step 4: Seat plan (NEW)
  const [isSeated, setIsSeated] = useState<boolean | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<VenueTemplate | null>(null);
  const [customSections, setCustomSections] = useState<SeatSection[]>([]);
  const [seatEditorMode, setSeatEditorMode] = useState(false);

  // Step 5: Ticket config (was Step 4)
  const [tiers, setTiers] = useState<TierItem[]>([
    { id: '1', name: 'Standart', price: 150, quota: 100, color: '#22c55e', category: TicketCategory.STANDARD },
  ]);
  const [currency, setCurrency] = useState('TRY');
  const [saleStartDate, setSaleStartDate] = useState<Date | null>(null);
  const [saleEndDate, setSaleEndDate] = useState<Date | null>(null);
  const [minTickets, setMinTickets] = useState(1);
  const [maxTickets, setMaxTickets] = useState(10);
  const [waitlist, setWaitlist] = useState(false);
  const [transferable, setTransferable] = useState(true);

  // Step 6: Refund policy (NEW)
  const [refundPolicyConfig, setRefundPolicyConfig] = useState<RefundPolicy>({ ...DEFAULT_REFUND_POLICY });

  // Step 7: Preview
  const [previewMode, setPreviewMode] = useState<'mobile' | 'desktop'>('mobile');

  // ─── FETCH EVENT CATEGORIES ──────────────────────────
  useEffect(() => {
    api.get('/events/event-categories?language=tr')
      .then(res => {
        const cats = res.data?.data || [];
        setEventCategories(cats);
      })
      .catch(() => {});
  }, []);

  // ─── CONVERT MODE: Mevcut etkinliği fetch et ve pre-fill et ──
  useEffect(() => {
    if (!isConvertMode || !eventId) return;
    setConvertLoading(true);
    api.get(`/events/${eventId}`)
      .then(res => {
        const ev = res.data?.data;
        if (!ev) return;

        // Pre-fill: Step 2 → ücretli
        setEventType('paid');

        // Pre-fill: Step 3 — etkinlik bilgileri
        setEventName(ev.name || '');
        setEventDescription(ev.description || '');
        if (ev.eventTime) setEventStartDate(new Date(ev.eventTime));
        if (ev.endTime) setEventEndDate(new Date(ev.endTime));
        if (ev.category?.id) setEventCategoryId(ev.category.id);
        setCapacity(String(ev.maxParticipants || ''));
        if (ev.isPrivate) setVisibility('link');

        // Pre-fill: Step 4 — mekan
        if (ev.address) {
          setEventAddress({
            description: ev.address.description || ev.address.street || '',
            city: ev.address.city || '',
            district: ev.address.district || '',
            country: ev.address.country || 'Türkiye',
            countryCode: ev.address.countryCode || 'TR',
            street: ev.address.street || '',
            postalCode: ev.address.postalCode || '',
            latitude: ev.address.latitude,
            longitude: ev.address.longitude,
          });
        }

        // Serbest giriş default (ücretsiz etkinlik numaralı koltuk olmaz)
        setIsSeated(false);

        // Kapak görseli
        const thumb = ev.thumbnailUrl || ev.image;
        if (thumb) {
          setCoverMedia({ originalUrl: thumb, mediaType: 'IMAGE' } as any);
        }

        // Organizatör (admin için)
        if (isAdmin && ev.organizerId) {
          setOrganizer({
            id: ev.organizerId,
            displayName: ev.organizerName || '',
            email: ev.organizerEmail || '',
            firstName: ev.organizerName?.split(' ')[0] || '',
            lastName: ev.organizerName?.split(' ').slice(1).join(' ') || '',
          } as any);
        }

        // Convert modunda Step 4'ten başla (salon planı + bilet ayarları)
        // Admin: step 4, non-admin: step 3 (çünkü step=logicalStep - 1)
        setStep(isAdmin ? 4 : 3);

        enqueueSnackbar('Etkinlik bilgileri yüklendi — salon planı ve bilet ayarlarını tamamlayın', { variant: 'info' });
      })
      .catch(() => {
        enqueueSnackbar('Etkinlik bilgileri yüklenemedi', { variant: 'error' });
        navigate('/events');
      })
      .finally(() => setConvertLoading(false));
  }, [isConvertMode, eventId]);

  // ─── HELPERS ─────────────────────────────────────────
  /** Detect gibberish/test names like "asdasd", "asfasd" */
  const isSuspiciousName = (name: string): boolean => {
    if (!name || name.length < 3) return true;
    const lower = name.toLowerCase().trim();
    // All same char repeated
    if (/^(.)\1+$/.test(lower)) return true;
    // No vowels (Turkish vowels included)
    if (!/[aeıioöuüAEIİOÖUÜ]/i.test(lower)) return true;
    // Common test patterns
    if (/^(asd|qwe|zxc|test|xxx|yyy|abc|asdf|jkl|fgh)+/i.test(lower)) return true;
    return false;
  };

  const clr = (k: string) => { if (errors[k]) setErrors(p => { const n = { ...p }; delete n[k]; return n; }); };

  const isFreeCategory = (cat: TicketCategory) => cat === TicketCategory.FREE || cat === TicketCategory.DONATION;

  // ─── CHECKLIST LOGIC ─────────────────────────────────
  const checks = useMemo(() => [
    { ok: !!effectiveOrganizer, t: 'Organizatör seçildi', blocker: true },
    { ok: !!eventName && !!eventStartDate, t: 'Etkinlik adı ve tarihi girildi', blocker: true },
    { ok: !!eventAddress?.description, t: eventAddress?.description ? 'Mekan seçildi' : 'Mekan belirlenmedi', blocker: true },
    { ok: isSeated !== null, t: isSeated ? 'Numaralı koltuk seçildi' : isSeated === false ? 'Serbest giriş seçildi' : 'Salon planı belirlenmedi', blocker: true },
    { ok: eventType === 'paid' ? tiers.length > 0 && tiers.every(t => !isFreeCategory(t.category) ? t.price > 0 : true) : true, t: eventType === 'paid' ? 'Bilet kategorileri tanımlandı' : 'Kayıt formu hazır', blocker: true },
    ...(eventType === 'paid'
      ? [{ ok: !!saleStartDate, t: 'Satış tarihi belirlendi', blocker: true }]
      : []),
    ...(eventType === 'paid'
      ? [{ ok: refundPolicyConfig.isRefundable, t: refundPolicyConfig.isRefundable ? 'İade politikası aktif' : 'İade politikası belirlenmedi (opsiyonel)', blocker: false }]
      : []),
    { ok: !!coverMedia?.originalUrl, t: (coverMedia?.originalUrl ? 'Kapak görseli yüklendi' : 'Kapak görseli yüklenmedi'), blocker: false },
    ...(!isConvertMode && eventType === 'paid' && capacity && tiers.reduce((s,t)=>s+t.quota,0) !== Number(capacity) ? [{ ok: false, t: `Kontenjan uyuşmazlığı: ${tiers.reduce((s,t)=>s+t.quota,0)} bilet / ${capacity} kapasite`, blocker: false, action: () => setStep(5), actionLabel: 'Düzelt' }] : []),
    ...(eventType === 'paid' && tiers.some(t => isSuspiciousName(t.name)) ? [{ ok: false, t: 'Bazı bilet kategorilerinde anlamsız isimler var', blocker: false, action: () => setStep(5), actionLabel: 'Düzelt' }] : []),
  ], [effectiveOrganizer, eventName, eventStartDate, eventAddress, isSeated, eventType, tiers, refundPolicyConfig, coverMedia, capacity, saleStartDate]);

  const blockers = useMemo(() => checks.filter(c => !c.ok && c.blocker), [checks]);
  const warnings = useMemo(() => checks.filter(c => !c.ok && !c.blocker), [checks]);
  const hasBlockers = blockers.length > 0;

  // Validate by logical step number (1-7)
  const validate = (s: number): boolean => {
    const e: Record<string, string> = {};
    if (s === 1 && isAdmin && !organizer) e.organizer = 'Organizatör seçmelisiniz';
    if (s === 2 && !eventType) e.eventType = 'Etkinlik türünü seçiniz';
    if (s === 3) {
      if (!eventName.trim()) e.eventName = 'Etkinlik adı zorunludur';
      if (!eventStartDate) e.eventStart = 'Başlangıç tarihi zorunludur';
      else if (eventStartDate <= new Date()) e.eventStart = 'Başlangıç tarihi gelecekte olmalı';
      if (eventStartDate && eventEndDate && eventStartDate >= eventEndDate) e.eventEnd = 'Bitiş başlangıçtan sonra olmalı';
    }
    if (s === 4) {
      if (!eventAddress?.description) e.location = 'Mekan seçimi zorunludur';
      if (isFreeEvent) {
        // Ucretsiz etkinlikte koltuk duzeni secimi yok — serbest giris default
        if (!capacity || Number(capacity) <= 0) e.capacity = 'Katılımcı kapasitesi belirlenmelidir';
      } else if (isSeated === null) e.seatPlan = 'Oturma düzeni seçmelisiniz';
      else if (isSeated === false && eventType !== 'paid' && (!capacity || Number(capacity) <= 0)) e.capacity = 'Serbest giriş için kapasite belirlenmelidir';
      else if (isSeated === true && !selectedTemplate) e.seatPlan = 'Numaralı koltuk için bir salon şablonu seçmelisiniz';
      else if (isSeated === true && selectedTemplate?.id === '__custom__' && customSections.length === 0) e.seatPlan = 'En az bir bölge eklemelisiniz';
    }
    if (s === 5 && eventType === 'paid') {
      if (tiers.length === 0) e.tiers = 'En az 1 bilet kategorisi ekleyin';
      if (tiers.some(t => !t.name.trim())) e.tierName = 'Tüm kategorilerin adı olmalı';
      if (tiers.some(t => !isFreeCategory(t.category) && t.price <= 0)) e.tierPrice = 'Ücretli bilet fiyatları 0\'dan büyük olmalı';
      if (tiers.some(t => t.quota <= 0)) e.tierQuota = 'Tüm kontenjanlar 0\'dan büyük olmalı';
      if (!saleStartDate) e.saleStart = 'Satış başlangıcı zorunludur';
      else if (saleStartDate < new Date()) e.saleStart = 'Satış başlangıcı bugünden önce olamaz';
      else if (eventStartDate && saleStartDate > eventStartDate) e.saleStart = 'Satış başlangıcı etkinlik tarihinden sonra olamaz';
      if (minTickets < 1) e.minTickets = 'Minimum en az 1 olmalı';
      if (maxTickets < minTickets) e.maxTickets = 'Maksimum minimumdan küçük olamaz';
    }
    if (s === 5 && eventType === 'free') {
      if (!saleStartDate) e.saleStart = 'Kayıt başlangıcı zorunludur';
      else if (saleStartDate < new Date()) e.saleStart = 'Kayıt başlangıcı bugünden önce olamaz';
      else if (eventStartDate && saleStartDate > eventStartDate) e.saleStart = 'Kayıt başlangıcı etkinlik tarihinden sonra olamaz';
    }
    // Step 6 (refund policy) — no required validation, defaults are fine
    setErrors(e);
    if (Object.keys(e).length > 0) { enqueueSnackbar('Lütfen zorunlu alanları doldurun', { variant: 'warning' }); return false; }
    return true;
  };

  const goNext = () => {
    if (!validate(logicalStep)) return;
    // Numaralı koltuk: Step 4 → Step 5 geçişinde salon planından tiers sync et
    if (logicalStep === 4 && isSeated && seatPlanSections.length > 0) {
      setTiers(prev => {
        const synced = seatPlanSections.map(sec => {
          const existing = prev.find(t => t.id === sec.id);
          return {
            id: sec.id,
            name: sec.name,
            price: existing?.price || 0,
            quota: sec.seatCount,
            color: sec.color,
            category: TicketCategory.STANDARD,
          };
        });
        return synced;
      });
    }
    // Ucretsiz etkinlik secildiyse serbest giris otomatik set et
    if (isFreeEvent && isSeated === null) setIsSeated(false);

    if (step < TOTAL) setStep(step + 1); else handlePublish(false);
  };
  const goBack = () => { if (step > 1) setStep(step - 1); };
  const goTo = (n: number) => { if (n <= step) setStep(n); };

  // ─── ORGANIZER SEARCH ────────────────────────────────
  const searchOrganizers = async () => {
    if (!orgSearch.trim()) return;
    setOrgLoading(true);
    try {
      const res = await userService.getAllUsers({ keyword: orgSearch, size: 10 });
      setOrgResults(res.data?.content || []);
    } catch { enqueueSnackbar('Arama başarısız', { variant: 'error' }); }
    finally { setOrgLoading(false); }
  };



  // ─── IMAGE ───────────────────────────────────────────
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { enqueueSnackbar('Sadece görsel dosyaları yüklenebilir', { variant: 'warning' }); return; }
    if (file.size > 10 * 1024 * 1024) { enqueueSnackbar('Dosya boyutu 10MB\'ı aşamaz', { variant: 'warning' }); return; }
    setEventImage(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  // ─── COVER IMAGE UPLOAD (deferred — sadece publish sirasinda) ──────
  const uploadCoverImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const ts = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    formData.append('path', `events/covers/${ts}_${safeName}`);
    const response = await api.post('/media/upload', formData, {
      headers: { 'Content-Type': undefined },
    });
    return response.data?.data?.cdnUrl || response.data?.data?.originalUrl || response.data?.data?.url || response.data?.data?.mediaUrl || '';
  };

  // ─── TIER OPS ────────────────────────────────────────
  const getCategoryLabel = (cat: TicketCategory) => TICKET_CATEGORIES.find(c => c.value === cat)?.label || '';

  const addTier = () => {
    const nextCat = TicketCategory.STANDARD;
    setTiers([...tiers, {
      id: String(Date.now()),
      name: getCategoryLabel(nextCat),
      price: 0,
      quota: 50,
      color: TIER_COLORS[tiers.length % TIER_COLORS.length],
      category: nextCat,
    }]);
  };
  const removeTier = (id: string) => { if (tiers.length <= 1) { enqueueSnackbar('En az 1 kategori olmalı', { variant: 'warning' }); return; } setTiers(tiers.filter(t => t.id !== id)); };
  const updateTier = (id: string, field: keyof TierItem, value: string | number) => {
    setTiers(tiers.map(t => {
      if (t.id !== id) return t;
      const updated = { ...t, [field]: value };
      // Kategori değiştiğinde: ismi otomatik güncelle (eğer isim eski kategori adıysa veya boşsa)
      if (field === 'category') {
        const newCat = value as TicketCategory;
        const oldLabel = getCategoryLabel(t.category);
        if (!t.name.trim() || t.name === oldLabel) {
          updated.name = getCategoryLabel(newCat);
        }
        // FREE/DONATION → fiyatı 0 yap
        if (isFreeCategory(newCat)) {
          updated.price = 0;
        }
      }
      return updated;
    }));
  };

  // ─── PUBLISH ─────────────────────────────────────────
  const handlePublish = async (asDraft = false) => {
    const isDraft = asDraft;

    if (!isDraft) {
      // Yayinlama: tum adimlar validate edilmeli
      const startStep = isAdmin ? 1 : 2;
      const endStep = isFreeEvent ? 4 : 6;
      for (let s = startStep; s <= endStep; s++) {
        if (!validate(s)) {
          setStep(isAdmin ? s : s - 1);
          return;
        }
      }
    } else {
      // Taslak: sadece isim zorunlu
      if (!eventName.trim()) {
        enqueueSnackbar('Taslak kaydetmek için en az etkinlik adı gerekli', { variant: 'warning' });
        return;
      }
    }
    if (!effectiveOrganizer) return;
    setPublishing(true);
    try {
      // Kapak gorseli varsa simdi upload et
      let uploadedCoverUrl = coverMedia?.originalUrl;
      if (coverFile) {
        try {
          uploadedCoverUrl = await uploadCoverImage(coverFile);
        } catch {
          enqueueSnackbar('Gorsel yuklenemedi, etkinlik gorselsiz olusturulacak', { variant: 'warning' });
          uploadedCoverUrl = undefined;
        }
      }

      const isPaid = eventType === 'paid';
      const payload = {
        name: eventName,
        description: eventDescription,
        eventTime: eventStartDate!.toISOString(),
        endTime: eventEndDate ? eventEndDate.toISOString() : undefined,
        maxParticipants: computedCapacity,
        isPaid,
        status: isDraft ? 'PASSIVE' : 'ACTIVE',
        isPrivate: !isDraft && visibility === 'link',
        isRegistrationOpen: true,
        ticketPrice: isPaid && tiers.length > 0 ? Math.min(...tiers.map(t => t.price)) : 0,
        categoryId: eventCategoryId || undefined,
        currency: currency || 'TRY',
        address: eventAddress ? {
          city: eventAddress.city || '',
          district: eventAddress.district || '',
          country: eventAddress.country || 'Türkiye',
          countryCode: eventAddress.countryCode || 'TR',
          street: eventAddress.street || eventAddress.description || '',
          postalCode: eventAddress.postalCode || '',
          description: eventAddress.description || '',
          latitude: eventAddress.latitude,
          longitude: eventAddress.longitude,
        } : undefined,
        organizerId: effectiveOrganizer.id,
        organizerName: effectiveOrganizer.displayName || `${effectiveOrganizer.firstName || ''} ${effectiveOrganizer.lastName || ''}`.trim(),
        organizerEmail: effectiveOrganizer.email,
        // New fields
        eventFormat,
        ageLimit: ageLimit ? Number(ageLimit) : undefined,
        language: eventLanguage || undefined,
        isSeated: isSeated ?? false,
        seatMapTemplateId: selectedTemplate?.id,
        isRefundable: refundPolicyConfig.isRefundable,
        isTransferable: transferable,
        thumbnailUrl: uploadedCoverUrl || undefined,
        coverMedia: uploadedCoverUrl ? { ...coverMedia, originalUrl: uploadedCoverUrl } : undefined,
        // Bilet tiplerini event ile birlikte gönder (ticket-service Kafka ile alacak)
        ticketTypes: isPaid ? tiers.map(t => ({
          name: t.name,
          basePrice: t.price,
          capacityTotal: t.quota,
          currency,
          saleStartAt: saleStartDate ? saleStartDate.toISOString() : undefined,
          saleEndAt: saleEndDate ? saleEndDate.toISOString() : (eventStartDate ? eventStartDate.toISOString() : undefined),
        })) : undefined,
        // Seating config — koltuk düzeni bilgisi
        seating: isSeated ? {
          enabled: true,
          stagePosition: 'front',
          layoutStyle: selectedTemplate?.id === '__custom__' ? 'straight' : (selectedTemplate?.style || 'straight'),
          corridorType: 'center',
          rowLabelOrder: (() => {
            const labels: string[] = [];
            seatPlanSections.forEach(sec => {
              const rowCount = selectedTemplate?.id === '__custom__'
                ? customSections.find(cs => cs.id === sec.id)?.rows.length || 3
                : selectedTemplate?.layout?.sections?.find((s: any) => s.id === sec.id)?.rows.length || 3;
              for (let i = 0; i < rowCount; i++) labels.push(String.fromCharCode(65 + i));
            });
            return [...new Set(labels)];
          })(),
          rowLabelToCategoryId: (() => {
            const map: Record<string, string> = {};
            seatPlanSections.forEach(sec => {
              const rowCount = selectedTemplate?.id === '__custom__'
                ? customSections.find(cs => cs.id === sec.id)?.rows.length || 3
                : selectedTemplate?.layout?.sections?.find((s: any) => s.id === sec.id)?.rows.length || 3;
              for (let i = 0; i < rowCount; i++) map[String.fromCharCode(65 + i)] = sec.id;
            });
            return map;
          })(),
          categoryIdToColor: (() => {
            const map: Record<string, string> = {};
            seatPlanSections.forEach(sec => { map[sec.id] = sec.color; });
            return map;
          })(),
          categories: seatPlanSections.map(sec => {
            const secData = customSections.find(cs => cs.id === sec.id);
            return {
              categoryId: sec.id,
              name: sec.name,
              color: sec.color,
              basePrice: tiers.find(t => t.id === sec.id)?.price || 0,
              rows: secData ? secData.rows.map(r => ({
                label: r.label,
                seats: r.seats.length,
              })) : [{ label: 'A', seats: sec.seatCount }],
            };
          }),
        } : isSeated === false ? { enabled: false } : undefined,
      };

      if (isConvertMode && eventId) {
        // ── CONVERT MODE: Mevcut ücretsiz etkinliği ücretliye dönüştür ──
        // Kapasite = bilet kontenjanları toplamı (eski etkinlik kapasitesi değil)
        const convertCapacity = isPaid ? tiers.reduce((s, t) => s + t.quota, 0) : computedCapacity;

        // 1) Etkinliği güncelle (isPaid=true) — endpoint: PUT /events/{id}
        await api.put(`/events/${eventId}`, {
          isPaid: true,
          maxParticipants: convertCapacity,
          ticketPrice: isPaid && tiers.length > 0 ? Math.min(...tiers.map(t => t.price)) : 0,
          isSeated: isSeated ?? false,
          isRegistrationOpen: true,
          status: 'ACTIVE',
        });

        // 2) Bilet türlerini oluştur
        if (isPaid && tiers.length > 0) {
          for (const t of tiers) {
            await ticketService.createTicketType({
              eventId,
              name: t.name,
              basePrice: t.price,
              capacityTotal: t.quota,
              currency,
              saleStartAt: saleStartDate ? saleStartDate.toISOString() : undefined,
              saleEndAt: saleEndDate ? saleEndDate.toISOString() : (eventStartDate ? eventStartDate.toISOString() : undefined),
            } as any);
          }
        }

        // 3) Salon planı varsa seating config gönder
        if (isSeated && payload.seating) {
          try {
            await api.post(`/tickets/admin/events/${eventId}/seating/backfill`, null, { params: { force: true } });
          } catch { /* seating config opsiyonel */ }
        }

        setPublished(true);
        enqueueSnackbar('Etkinlik biletli etkinliğe dönüştürüldü!', { variant: 'success' });
      } else {
        // ── NORMAL MODE: Yeni etkinlik oluştur ──
        const formData = new FormData();
        formData.append('request', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
        if (eventImage) formData.append('image', eventImage);

        await api.post('/events/admin', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        setSavedAsDraft(isDraft);
        setPublished(true);
        enqueueSnackbar(isDraft ? 'Etkinlik taslak olarak kaydedildi' : 'Etkinlik başarıyla yayınlandı!', { variant: 'success' });
      }
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Etkinlik oluşturulamadı', { variant: 'error' });
    } finally { setPublishing(false); }
  };

  // ─── DERIVED ─────────────────────────────────────────
  const maxRevenue = tiers.reduce((s, t) => s + t.price * t.quota, 0);
  const totalQuota = tiers.reduce((s, t) => s + t.quota, 0);

  // Salon planından gelen bölgeler (numaralı koltuk akışında)
  const seatPlanSections = (() => {
    if (!isSeated) return [];
    // customSections dolu ise her zaman onu kullan (şablon yüklendiyse veya özel düzense)
    if (customSections.length > 0) {
      return customSections.map(s => ({
        id: s.id,
        name: s.name,
        color: s.color,
        category: s.category,
        seatCount: s.rows.reduce((a, r) => a + r.seats.length, 0),
      }));
    }
    // Fallback: şablon layout sections (eski format — SectionConfig)
    const layoutSections = selectedTemplate?.layout?.sections || [];
    return layoutSections.map((s: any) => ({
      id: s.id,
      name: s.name,
      color: s.color || '#4CAF50',
      category: s.defaultCategory || s.category || 'STANDARD',
      seatCount: s.rows?.reduce((a: number, r: any) => a + (r.seatCount || r.seats?.length || 0), 0) || 0,
    }));
  })();

  // Kapasite: numaralı koltuk → salon planından, serbest giriş + ücretli → bilet kontenjanından
  // Convert modunda bilet kontenjanı her zaman öncelikli
  const computedCapacity = (() => {
    if (isSeated) return seatPlanSections.reduce((s, sec) => s + sec.seatCount, 0);
    if (eventType === 'paid' && totalQuota > 0) return totalQuota;
    if (isConvertMode && totalQuota > 0) return totalQuota;
    return Number(capacity) || 0;
  })();

  // Numaralı koltuk akışında gelir hesabı: tiers fiyatları × salon planı koltuk sayıları
  const seatedMaxRevenue = isSeated
    ? seatPlanSections.reduce((s, sec) => {
        const tier = tiers.find(t => t.id === sec.id);
        return s + (tier?.price || 0) * sec.seatCount;
      }, 0)
    : 0;
  // Step labels — eventType'a gore dinamik
  const allLabels = isFreeEvent
    ? ['Organizatör', 'Etkinlik Türü', 'Bilgiler', 'Mekan & Kapasite', 'Önizleme']
    : ['Organizatör', 'Etkinlik Türü', 'Bilgiler', 'Mekan & Salon', 'Bilet & Kayıt', 'İade Politikası', 'Önizleme'];
  const allSubs = isFreeEvent
    ? [
        'Etkinliği kimin adına oluşturuyorsunuz?',
        'Nasıl bir etkinlik oluşturmak istiyorsunuz?',
        'Temel bilgileri, tarih ve açıklama bilgilerini girin',
        'Etkinlik mekanını ve katılımcı kapasitesini belirleyin',
        'Her şeyi kontrol edin ve yayınlayın',
      ]
    : [
        'Etkinliği kimin adına oluşturuyorsunuz?',
        'Nasıl bir etkinlik oluşturmak istiyorsunuz?',
        'Temel bilgileri, tarih ve kapasite bilgilerini girin',
        'Etkinlik mekanını ve oturma düzenini belirleyin',
        'Bilet fiyatlarını ve satış takvimini belirleyin',
        'Bilet iade kurallarını belirleyin',
        'Her şeyi kontrol edin ve yayınlayın',
      ];
  // Visible labels: admin sees all, non-admin skips Organizatör (index 0)
  const labels = isAdmin ? allLabels : allLabels.slice(1);
  const subs = isAdmin ? allSubs : allSubs.slice(1);

  // ─── SUCCESS ─────────────────────────────────────────
  if (published) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 10, textAlign: 'center' }}>
        <Fade in timeout={500}><Box>
          <Box sx={{ width: 88, height: 88, borderRadius: '50%', mx: 'auto', mb: 3, bgcolor: alpha(theme.palette.success.main, 0.1), border: '3px solid', borderColor: 'success.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CelebrationIcon sx={{ fontSize: 40, color: 'success.main' }} />
          </Box>
          <Typography variant="h4" fontWeight={800} sx={{ mb: 1 }}>
            {isConvertMode ? 'Etkinlik Dönüştürüldü!' : savedAsDraft ? 'Taslak Kaydedildi!' : 'Etkinlik Yayınlandı!'}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 480, mx: 'auto', mb: 1 }}>
            {isConvertMode
              ? <><strong>{eventName}</strong> etkinliği biletli etkinliğe dönüştürüldü. Bilet satışı başlatılabilir.</>
              : <><strong>{eventName}</strong> etkinliği <strong>{effectiveOrganizer?.displayName || effectiveOrganizer?.email}</strong> adına oluşturuldu.</>
            }
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            {isConvertMode ? `${tiers.length} bilet türü oluşturuldu.` : eventType === 'paid' ? 'Bilet satışı başladı.' : eventType === 'free' ? 'Kayıtlara açıldı.' : ''}
          </Typography>
          <Stack direction="row" spacing={2} justifyContent="center">
            {isConvertMode ? (
              <Button variant="contained" onClick={() => navigate(`/events/${eventId}`)}
                sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 600, px: 3 }}>Etkinlik Detayına Git</Button>
            ) : (
              <>
                <Button variant="outlined" onClick={() => { setPublished(false); setStep(1); setOrganizer(null); setEventType(null); setEventName(''); setEventDescription(''); setEventStartDate(null); setEventEndDate(null); setCapacity(''); setTiers([{ id: '1', name: 'Standart', price: 150, quota: 100, color: '#22c55e', category: TicketCategory.STANDARD }]); setSaleStartDate(null); setSaleEndDate(null); setEventImage(null); setImagePreview(null); setCoverMedia(undefined); setCoverFile(null); setIsSeated(null); setSelectedTemplate(null); setCustomSections([]); setSeatEditorMode(false); setRefundPolicyConfig({ ...DEFAULT_REFUND_POLICY }); setAgeLimit(''); setEventLanguage(''); setEventFormat(EventFormat.PHYSICAL); setEventAddress(null); }}
                  sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 600, px: 3 }}>+ Yeni Etkinlik</Button>
                <Button variant="contained" onClick={() => navigate('/events')}
                  sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 600, px: 3 }}>Etkinliklere Git</Button>
              </>
            )}
          </Stack>
        </Box></Fade>
      </Box>
    );
  }

  // ─── CONVERT LOADING ─────────────────────────────────
  if (convertLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 15, textAlign: 'center' }}>
        <CircularProgress size={48} sx={{ mb: 3 }} />
        <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>Etkinlik Bilgileri Yükleniyor</Typography>
        <Typography variant="body2" color="text.secondary">
          Mevcut etkinlik bilgileri alınıyor ve form dolduruluyor...
        </Typography>
      </Box>
    );
  }

  // ─── RENDER ──────────────────────────────────────────
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(10vh - 56px)' }}>
      {/* Header */}
      <Box sx={{ bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', position:  'inherit', top: 56, zIndex: 10 }}>
        {/* Top row: back + title + step counter */}
        <Box sx={{ px: { xs: 2, sm: 4 }, pt: 1.5, pb: 1 }}>
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.5, cursor: 'pointer' }} onClick={() => isConvertMode ? navigate(`/events/${eventId}`) : navigate('/events')}>
            <BackIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary" sx={{ '&:hover': { color: 'primary.main' } }}>
              {isConvertMode ? 'Etkinlik Detayına Dön' : 'Etkinliklere Dön'}
            </Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              {isConvertMode && (
                <Chip label="🎫 Biletli Etkinliğe Dönüştürme" size="small" color="primary" variant="outlined"
                  sx={{ fontWeight: 700, fontSize: 10, height: 22, mb: 0.5 }} />
              )}
              <Typography variant="subtitle1" fontWeight={800} sx={{ lineHeight: 1.3 }}>{labels[step - 1]}</Typography>
              <Typography variant="caption" color="text.secondary">{subs[step - 1]}</Typography>
            </Box>
            <Chip label={`${step} / ${TOTAL}`} size="small" variant="outlined" sx={{ fontWeight: 700, fontFamily: 'monospace', ml: 2, flexShrink: 0 }} />
          </Stack>
        </Box>

        {/* Stepper — horizontal scroll, compact */}
        <Box sx={{ overflowX: 'auto', overflowY: 'hidden', px: { xs: 2, sm: 4 }, py: 1, '&::-webkit-scrollbar': { display: 'none' }, scrollbarWidth: 'none' }}>
          <Stack direction="row" alignItems="center" sx={{ minWidth: 'max-content' }}>
            {labels.map((label, i) => {
              const s = i + 1;
              const isActive = s === step;
              const isDone = s < step;
              return (
                <Box key={s} sx={{ display: 'flex', alignItems: 'center', flex: i < TOTAL - 1 ? 1 : '0 0 auto' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, cursor: s <= step ? 'pointer' : 'default', flexShrink: 0 }} onClick={() => goTo(s)}>
                    <StepDot $active={isActive} $done={isDone}>{isDone ? <CheckIcon sx={{ fontSize: 14 }} /> : s}</StepDot>
                    <Typography
                      variant="caption"
                      fontWeight={isActive ? 700 : 500}
                      sx={{
                        color: isActive ? 'primary.main' : isDone ? 'text.secondary' : 'text.disabled',
                        whiteSpace: 'nowrap',
                        fontSize: { xs: 10, sm: 11 },
                        transition: 'all 0.2s',
                      }}
                    >
                      {label}
                    </Typography>
                  </Box>
                  {i < TOTAL - 1 && (
                    <StepLine $done={isDone} sx={{ minWidth: { xs: 12, sm: 20, md: 32 }, mx: { xs: 0.5, sm: 1 } }} />
                  )}
                </Box>
              );
            })}
          </Stack>
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, px: { xs: 2, sm: 4 }, py: 3, pb: 14, maxWidth: 820, width: '100%' }}>

        {/* ── CONVERT MODE: Mevcut etkinlik bilgileri özet bandı ── */}
        {isConvertMode && logicalStep >= 4 && (
          <Paper variant="outlined" sx={{
            mb: 3, p: 2, borderRadius: 2.5,
            border: '1px solid', borderColor: t => alpha(t.palette.info.main, 0.3),
            bgcolor: t => alpha(t.palette.info.main, 0.04),
          }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography fontSize={20}>🎫</Typography>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" fontWeight={700}>
                  {eventName} — Biletli Etkinliğe Dönüştürülüyor
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {eventStartDate ? format(eventStartDate, 'dd MMM yyyy HH:mm', { locale: tr }) : ''} · {eventAddress?.description || ''} · Kapasite: {capacity || '?'}
                </Typography>
              </Box>
              <Chip label="Ücretli" size="small" color="primary" sx={{ fontWeight: 700 }} />
            </Stack>
          </Paper>
        )}

        {/* ─── STEP 1: ORGANİZATÖR (admin only) ─── */}
        {logicalStep === 1 && isAdmin && (
          <Stack spacing={3}>
            <SH title="Etkinliği kim oluşturuyor?" subtitle="Etkinliğin sahibi olarak görünecek kullanıcıyı seçin. Etkinlik bu kişi adına oluşturulur." />

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

            {orgResults.length > 0 && !organizer && (
              <SC>
                {orgResults.map(u => {
                  return (
                    <Stack key={u.id} direction="row" spacing={1.5} alignItems="center"
                      onClick={() => { setOrganizer(u); clr('organizer'); }}
                      sx={{ px: 2.5, py: 1.5, cursor: 'pointer', borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 'none' }, '&:hover': { bgcolor: 'grey.50' } }}>
                      <Avatar src={u.imageUrl} sx={{ width: 36, height: 36, fontSize: 14 }}>{(u.firstName || u.email)?.[0]}</Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight={600}>{u.displayName || `${u.firstName || ''} ${u.lastName || ''}`}</Typography>
                        <Typography variant="caption" color="text.secondary">{u.email}</Typography>
                      </Box>
                      <Chip label={u.accountType || 'INDIVIDUAL'} size="small" variant="outlined" sx={{ fontSize: 10, height: 20 }} />
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
                  <Chip label="Organizatör" size="small" color="success" variant="outlined" sx={{ fontWeight: 600 }} />
                  <IconButton size="small" onClick={() => { setOrganizer(null); setOrgResults([]); }}><CloseIcon fontSize="small" /></IconButton>
                </Stack>
              </Paper>
            )}
          </Stack>
        )}

        {/* ─── STEP 2: ETKİNLİK TÜRÜ ─── */}
        {logicalStep === 2 && (
          <Stack spacing={3}>
            <SH title="Ne tür bir etkinlik oluşturmak istiyorsunuz?" subtitle="Seçiminize göre sonraki adımlar otomatik şekillenir." />
            <Stack spacing={2}>
              {([
                { key: 'paid' as EventType, icon: '🎟️', name: 'Ücretli Etkinlik', desc: 'Bilet satışı yapılacak. Farklı fiyat kategorileri tanımlayabilirsiniz.', features: ['Katmanlı fiyatlandırma', 'Online ödeme', 'QR bilet'], color: theme.palette.primary.main },
                { key: 'free' as EventType, icon: '🎁', name: 'Ücretsiz Etkinlik', desc: 'Katılım bedava. Kayıt formu ile katılımcı bilgileri toplanır.', features: ['Ücretsiz kayıt', 'Kapasite kontrolü', 'Katılımcı listesi'], color: theme.palette.success.main },
                { key: 'invite' as EventType, icon: '🔒', name: 'Davetiye ile Giriş', desc: 'Sadece davet edilen kişiler katılabilir.', features: ['Özel davet kodları', 'Kontrollü erişim', 'VIP etkinlikler'], color: theme.palette.warning.main },
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
                          {sel && <Chip label="Seçildi" size="small" sx={{ height: 22, fontWeight: 700, bgcolor: opt.color, color: '#fff' }} />}
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
        {logicalStep === 3 && (
          <Stack spacing={3.5}>
            {/* Organizer reminder */}
            {effectiveOrganizer && (
              <Paper variant="outlined" sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, borderRadius: 2.5, bgcolor: 'grey.50' }}>
                <Avatar src={effectiveOrganizer.imageUrl} sx={{ width: 32, height: 32, fontSize: 13 }}>{effectiveOrganizer.firstName?.[0]}</Avatar>
                <Typography variant="body2" fontWeight={600}>{effectiveOrganizer.displayName || effectiveOrganizer.firstName} <Typography component="span" variant="caption" color="text.secondary">adına oluşturuluyor</Typography></Typography>
              </Paper>
            )}

            <Box>
              <SH title="Temel Bilgiler" />
              <Stack spacing={2}>
                <TextField fullWidth label="Etkinlik Adı" required value={eventName}
                  onChange={e => { setEventName(e.target.value); clr('eventName'); }}
                  error={!!errors.eventName} helperText={errors.eventName} placeholder="Örn: Ankara Caz Festivali 2026" />
                <FormControl fullWidth>
                  <InputLabel>Kategori</InputLabel>
                  <Select value={eventCategoryId} label="Kategori" onChange={e => setEventCategoryId(e.target.value)}>
                    <MenuItem value="">Seçin...</MenuItem>
                    {eventCategories.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                  </Select>
                </FormControl>
                <TextField fullWidth multiline rows={4} label="Açıklama (opsiyonel)" value={eventDescription} onChange={e => setEventDescription(e.target.value)} placeholder="Etkinliğin detaylarını, içeriğini ve katılımcıların bilmesi gerekenleri yazın..." />
              </Stack>
            </Box>
            <Divider />
            <Box>
              <SH title="Tarih & Saat" />
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
              <Stack direction="row" spacing={2}>
                <DateTimePicker
                  label="Başlangıç *"
                  value={eventStartDate}
                  onChange={(date) => { setEventStartDate(date); clr('eventStart'); }}
                  minDateTime={new Date()}
                  ampm={false}
                  slotProps={{
                    textField: { fullWidth: true, error: !!errors.eventStart, helperText: errors.eventStart },
                  }}
                />
                <DateTimePicker
                  label="Bitiş (opsiyonel)"
                  value={eventEndDate}
                  onChange={(date) => { setEventEndDate(date); clr('eventEnd'); }}
                  minDateTime={eventStartDate || new Date()}
                  ampm={false}
                  slotProps={{
                    textField: { fullWidth: true, error: !!errors.eventEnd, helperText: errors.eventEnd },
                  }}
                />
              </Stack>
              </LocalizationProvider>
            </Box>
            <Divider />
            <Box>
              <SH title="Kapak Görseli" subtitle="Etkinliğin kapak görseli. Odak noktası ve kırpma ayarlarıyla farklı cihazlarda nasıl görüneceğini kontrol edin." />
              <CoverImageEditor
                value={coverMedia}
                onChange={(v) => {
                  setCoverMedia(v);
                  if (v?.originalUrl) {
                    setImagePreview(v.originalUrl);
                  } else {
                    setImagePreview(null);
                    setEventImage(null);
                    setCoverFile(null);
                  }
                }}
                onFileSelect={(file) => {
                  setCoverFile(file);
                  if (file) setEventImage(file);
                }}
              />
            </Box>
            <Divider />
            <Box>
              <SH title="Görünürlük" />
              <Stack spacing={1}>
                <Paper variant="outlined"
                  sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, border: '2px solid', borderRadius: 2.5, borderColor: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
                  <Box sx={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid', borderColor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main' }} />
                  </Box>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>🌐 Herkese Açık</Typography>
                    <Typography variant="caption" color="text.secondary">Tüm kullanıcılar etkinliği bulabilir</Typography>
                  </Box>
                </Paper>
              </Stack>
            </Box>
          </Stack>
        )}

        {/* ─── STEP 4: MEKAN & SALON PLANI / MEKAN & KAPASİTE ─── */}
        {logicalStep === 4 && (
          <Stack spacing={3}>
            {isFreeEvent ? (
              /* Ucretsiz etkinlik: sadece adres + kapasite */
              <Box>
                <SH title="Etkinlik Mekanı" subtitle="Etkinliğin yapılacağı konumu veya mekan adını yazarak seçin" />
                <SC>
                  <Box sx={{ px: 2.5, py: 3 }}>
                    <GooglePlacesInput
                      value={eventAddress}
                      onChange={setEventAddress}
                      label="Mekan Ara"
                      placeholder="Örn: Kadıköy Sahne, ATO Congresium, Harbiye Cemil Topuzlu..."
                      size="medium"
                      fullWidth
                      showDetails
                    />
                  </Box>
                </SC>
                <Box sx={{ mt: 3 }}>
                  <SH title="Katılımcı Kapasitesi" subtitle="Etkinliğe maksimum kaç kişi katılabilir?" />
                  <SC>
                    <Box sx={{ px: 2.5, py: 2 }}>
                      <TextField
                        fullWidth
                        label="Toplam Kapasite *"
                        type="number"
                        value={capacity}
                        onChange={e => { setCapacity(e.target.value); clr('capacity'); }}
                        error={!!errors.capacity}
                        helperText={errors.capacity || 'Kapasite dolunca kayıt kapanır'}
                        placeholder="Örn: 200"
                        InputProps={{ inputProps: { min: 1 } }}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                      />
                    </Box>
                  </SC>
                </Box>
              </Box>
            ) : (
              /* Ucretli etkinlik: tam SeatPlanStep */
              <SeatPlanStep
                isSeated={isSeated}
                onSeatedChange={setIsSeated}
                selectedTemplate={selectedTemplate}
                onTemplateSelect={setSelectedTemplate}
                capacity={Number(capacity) || 0}
                addressValue={eventAddress}
                onAddressChange={setEventAddress}
                customSections={customSections}
                onCustomSectionsChange={setCustomSections}
                capacityValue={capacity}
                onCapacityChange={(v) => { setCapacity(v); clr('capacity'); }}
                capacityError={errors.capacity}
                editorMode={seatEditorMode}
                onEditorModeChange={setSeatEditorMode}
              />
            )}
            {errors.location && <Typography variant="caption" color="error">{errors.location}</Typography>}
            {errors.seatPlan && <Typography variant="caption" color="error">{errors.seatPlan}</Typography>}
          </Stack>
        )}

        {/* ─── STEP 5: BİLET & KAYIT ─── */}
        {logicalStep === 5 && (
          <Stack spacing={3.5}>
            <Paper variant="outlined" sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, borderRadius: 2.5, bgcolor: 'grey.50' }}>
              <Typography sx={{ fontSize: 24 }}>{eventType === 'paid' ? '🎟️' : eventType === 'free' ? '🎁' : '🔒'}</Typography>
              <Box>
                <Typography variant="body2" fontWeight={700}>{eventType === 'paid' ? 'Ücretli Etkinlik' : eventType === 'free' ? 'Ücretsiz Etkinlik' : 'Davetiye ile Giriş'}</Typography>
                <Typography variant="caption" color="text.secondary">Değiştirmek için <Typography component="span" variant="caption" color="primary.main" sx={{ cursor: 'pointer', fontWeight: 600 }} onClick={() => goTo(2)}>2. adıma dönün</Typography></Typography>
              </Box>
            </Paper>

            {eventType === 'paid' && (
              <>
                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.5 }}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={700}>
                        {isSeated ? 'Bölge Fiyatlandırması' : 'Bilet Kategorileri'}
                      </Typography>
                      {isSeated && (
                        <Typography variant="caption" color="text.secondary">
                          Bölgeler ve kapasiteler salon planından gelir — sadece fiyat belirleyin.
                        </Typography>
                      )}
                    </Box>
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                      <Select value={currency} onChange={e => setCurrency(e.target.value)} displayEmpty
                        sx={{ fontSize: 13, fontWeight: 600, '& .MuiOutlinedInput-notchedOutline': { borderRadius: 2 } }}>
                        <MenuItem value="TRY">₺ Türk Lirası</MenuItem><MenuItem value="USD">$ USD</MenuItem><MenuItem value="EUR">€ EUR</MenuItem>
                      </Select>
                    </FormControl>
                  </Stack>

                  {/* ── NUMARALI KOLTUK: salon planından gelen bölgeler ── */}
                  {isSeated && seatPlanSections.length > 0 ? (
                    <Stack spacing={1.5}>
                      {/* Tablo başlığı */}
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 1 }}>
                        <Box sx={{ width: 14 }} />
                        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ flex: 1.5 }}>Bölge</Typography>
                        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ width: 100, textAlign: 'center' }}>Sıralar</Typography>
                        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ width: 80, textAlign: 'center' }}>Koltuk</Typography>
                        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ flex: 1 }}>Fiyat</Typography>
                      </Stack>

                      {seatPlanSections.map((sec) => {
                        const tier = tiers.find(t => t.id === sec.id);
                        const price = tier?.price || 0;
                        // Sıra etiketlerini bul
                        const sectionRows = (sec as any).rows || [];
                        const rowLabels = sectionRows.map?.((r: any) => r.label || r.rowLabel || '') || [];
                        const rowRange = rowLabels.length > 1
                          ? `${rowLabels[0]}–${rowLabels[rowLabels.length - 1]}`
                          : rowLabels[0] || '';
                        return (
                          <Paper key={sec.id} variant="outlined" sx={{
                            borderRadius: 2.5, overflow: 'hidden',
                            border: '1px solid', borderColor: 'divider',
                            transition: 'border-color 0.2s',
                            '&:hover': { borderColor: sec.color },
                          }}>
                            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ px: 2, py: 1.5 }}>
                              {/* Renk + isim */}
                              <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: sec.color, flexShrink: 0 }} />
                              <Box sx={{ flex: 1.5, minWidth: 0 }}>
                                <Typography variant="subtitle2" fontWeight={700} noWrap>{sec.name}</Typography>
                                <Chip size="small" label={CATEGORY_TR[sec.category] || sec.category} variant="outlined"
                                  sx={{ fontWeight: 600, fontSize: 9, height: 18, mt: 0.3 }} />
                              </Box>

                              {/* Sıralar */}
                              <Box sx={{ width: 100, textAlign: 'center' }}>
                                {rowRange ? (
                                  <Chip label={rowRange} size="small"
                                    sx={{ height: 22, fontSize: 11, fontWeight: 700, fontFamily: 'monospace', bgcolor: alpha(sec.color, 0.1) }} />
                                ) : (
                                  <Typography variant="caption" color="text.disabled">—</Typography>
                                )}
                              </Box>

                              {/* Koltuk sayısı */}
                              <Box sx={{ width: 80, textAlign: 'center' }}>
                                <Typography variant="body2" fontWeight={800} fontFamily="monospace">
                                  {sec.seatCount}
                                </Typography>
                              </Box>

                              {/* Fiyat input */}
                              <Box sx={{ flex: 1 }}>
                                <TextField
                                  type="number"
                                  size="small"
                                  fullWidth
                                  value={price || ''}
                                  placeholder="0"
                                  InputProps={{
                                    startAdornment: <Typography sx={{ mr: 0.5, color: 'text.secondary', fontSize: 13, fontWeight: 600 }}>{CURRENCY_SYMBOLS[currency] || currency}</Typography>,
                                    inputProps: { min: 0, step: 1 },
                                  }}
                                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 }, '& .MuiOutlinedInput-input': { fontWeight: 700, fontFamily: 'monospace' } }}
                                  onFocus={e => e.target.select()}
                                  onChange={e => {
                                    const newPrice = e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0;
                                    if (tier) {
                                      updateTier(tier.id, 'price', newPrice);
                                    } else {
                                      setTiers(prev => [...prev, { id: sec.id, name: sec.name, price: newPrice, quota: sec.seatCount, color: sec.color, category: TicketCategory.STANDARD }]);
                                    }
                                  }}
                                />
                              </Box>
                            </Stack>
                          </Paper>
                        );
                      })}
                      {errors.tierPrice && <Typography variant="caption" color="error">{errors.tierPrice}</Typography>}

                      {/* Özet — tek satır, kompakt */}
                      <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: 'hidden', mt: 1 }}>
                        <Stack direction="row" divider={<Divider orientation="vertical" flexItem />}>
                          <Box sx={{ flex: 1, py: 1.5, textAlign: 'center' }}>
                            <Typography variant="h6" fontWeight={800} fontFamily="monospace" color="info.main">{computedCapacity}</Typography>
                            <Typography variant="caption" color="text.secondary" fontWeight={600}>Toplam Koltuk</Typography>
                          </Box>
                          <Box sx={{ flex: 1, py: 1.5, textAlign: 'center' }}>
                            <Typography variant="h6" fontWeight={800} fontFamily="monospace" color="success.main">{CURRENCY_SYMBOLS[currency] || currency}{seatedMaxRevenue.toLocaleString('tr-TR')}</Typography>
                            <Typography variant="caption" color="text.secondary" fontWeight={600}>Maks. Gelir</Typography>
                          </Box>
                          <Box sx={{ flex: 1, py: 1.5, textAlign: 'center' }}>
                            <Typography variant="h6" fontWeight={800} fontFamily="monospace" color="warning.main">{seatPlanSections.length}</Typography>
                            <Typography variant="caption" color="text.secondary" fontWeight={600}>Bölge</Typography>
                          </Box>
                        </Stack>
                      </Paper>
                    </Stack>
                  ) : (
                    /* ── SERBEST GİRİŞ: tam düzenlenebilir bilet kartları ── */
                    <>
                      <Paper elevation={0} sx={{ p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.info.main, 0.06), border: `1px solid ${alpha(theme.palette.info.main, 0.15)}`, mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Etkinlik kapasitesi, bilet kontenjanlarınızın toplamından otomatik hesaplanır. Aşağıda her bilet kategorisi için kontenjan belirleyin.
                        </Typography>
                      </Paper>
                      <Stack spacing={2}>
                        {tiers.map((t, idx) => (
                          <Paper key={t.id} variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', border: '1px solid', borderColor: 'divider', '&:hover': { borderColor: alpha(t.color, 0.5) }, transition: 'border-color 0.2s' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5, py: 1.5, bgcolor: alpha(t.color, 0.06), borderBottom: '1px solid', borderColor: 'divider' }}>
                              <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: t.color, flexShrink: 0, border: '2px solid white', boxShadow: `0 0 0 1px ${t.color}` }} />
                              <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mr: 'auto' }}>Bilet {idx + 1}</Typography>
                              <IconButton size="small" onClick={() => removeTier(t.id)} sx={{ '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.08), color: 'error.main' } }}>
                                <CloseIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Box>
                            <Box sx={{ px: 2.5, py: 2 }}>
                              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
                                <TextField fullWidth label="Bilet Adı" value={t.name} onChange={e => updateTier(t.id, 'name', e.target.value)} error={!t.name.trim()}
                                  helperText={!t.name.trim() ? 'İsim zorunlu' : 'Biletinizin görünen adı — istediğiniz gibi değiştirebilirsiniz'} placeholder="Örn: VIP, Öğrenci Bileti..." size="small"
                                  InputProps={{ endAdornment: isSuspiciousName(t.name) ? <Tooltip title="Bu isim anlamsız görünüyor"><WarningIcon sx={{ fontSize: 16, color: 'warning.main' }} /></Tooltip> : null }}
                                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                                <FormControl size="small" sx={{ minWidth: 160 }}>
                                  <InputLabel>Kategori</InputLabel>
                                  <Select value={t.category} label="Kategori" onChange={e => updateTier(t.id, 'category', e.target.value)} sx={{ borderRadius: 2 }}>
                                    {TICKET_CATEGORIES.map(c => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
                                  </Select>
                                </FormControl>
                              </Stack>
                              <Stack direction="row" spacing={2}>
                                <TextField label={isFreeCategory(t.category) ? 'Fiyat (ücretsiz)' : `Fiyat (${CURRENCY_SYMBOLS[currency] || currency})`} type="number" size="small" fullWidth
                                  value={isFreeCategory(t.category) ? 0 : (t.price || '')} placeholder="0" disabled={isFreeCategory(t.category)} error={!!errors.tierPrice && !isFreeCategory(t.category) && t.price <= 0}
                                  InputProps={{ startAdornment: <Typography sx={{ mr: 0.5, color: 'text.secondary', fontSize: 13 }}>{isFreeCategory(t.category) ? '—' : (CURRENCY_SYMBOLS[currency] || currency)}</Typography>, inputProps: { min: 0, step: 1 } }}
                                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} onFocus={e => e.target.select()} onChange={e => updateTier(t.id, 'price', e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0)} />
                                <TextField label="Kontenjan" type="number" size="small" fullWidth value={t.quota} error={!!errors.tierQuota && t.quota <= 0}
                                  InputProps={{ inputProps: { min: 1, step: 1 } }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} onFocus={e => e.target.select()}
                                  onChange={e => updateTier(t.id, 'quota', e.target.value === '' ? 0 : Number(e.target.value))} />
                              </Stack>
                            </Box>
                          </Paper>
                        ))}
                        <Button fullWidth variant="outlined" startIcon={<AddIcon />} onClick={addTier}
                          sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 3, borderStyle: 'dashed', py: 1.5, color: 'primary.main' }}>
                          Yeni Bilet Kategorisi Ekle
                        </Button>
                      </Stack>
                      {errors.tiers && <Typography variant="caption" color="error">{errors.tiers}</Typography>}
                      {errors.tierName && <Typography variant="caption" color="error">{errors.tierName}</Typography>}
                      {errors.tierPrice && <Typography variant="caption" color="error">{errors.tierPrice}</Typography>}
                      {errors.tierQuota && <Typography variant="caption" color="error">{errors.tierQuota}</Typography>}
                      <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                        <Paper variant="outlined" sx={{ flex: 1, p: 1.5, borderRadius: 2, textAlign: 'center' }}>
                          <Typography variant="h6" fontWeight={800} fontFamily="JetBrains Mono, monospace" color="info.main">{totalQuota}</Typography>
                          <Typography variant="caption" color="text.secondary" fontWeight={600}>Etkinlik Kapasitesi</Typography>
                        </Paper>
                        <Paper variant="outlined" sx={{ flex: 1, p: 1.5, borderRadius: 2, textAlign: 'center' }}>
                          <Typography variant="h6" fontWeight={800} fontFamily="JetBrains Mono, monospace" color="success.main">{CURRENCY_SYMBOLS[currency] || currency}{maxRevenue.toLocaleString('tr-TR')}</Typography>
                          <Typography variant="caption" color="text.secondary" fontWeight={600}>Maks. Gelir</Typography>
                        </Paper>
                        <Paper variant="outlined" sx={{ flex: 1, p: 1.5, borderRadius: 2, textAlign: 'center' }}>
                          <Typography variant="h6" fontWeight={800} fontFamily="JetBrains Mono, monospace" color="warning.main">{tiers.length}</Typography>
                          <Typography variant="caption" color="text.secondary" fontWeight={600}>Bilet Kategorisi</Typography>
                        </Paper>
                      </Stack>
                    </>
                  )}
                </Box>
              </>
            )}
            {eventType === 'free' && (
              <Box>
                <SH title="Kayıt Formu" subtitle="Katılımcıdan hangi bilgiler alınacak?" />
                <SC><Box sx={{ px: 2.5 }}>
                  {[{ name: 'Ad Soyad', desc: 'Zorunlu', locked: true }, { name: 'E-posta', desc: 'Bilet ve bildirim için', locked: true }, { name: 'Telefon', desc: 'Opsiyonel', locked: false }, { name: 'Kurum / Okul', desc: 'Kurumsal etkinlikler için', locked: false }].map((f, i) => (
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
                <SH title="Davet Ayarları" />
                <SC><Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 40, mb: 1, opacity: 0.3 }}>🔒</Typography>
                  <Typography variant="body2" color="text.secondary">Etkinlik yayınlandıktan sonra davet kodları oluşturabilirsiniz.</Typography>
                </Box></SC>
              </Box>
            )}
            <Divider />
            <Box>
              <SH
                title={eventType === 'paid' ? 'Satış Takvimi' : eventType === 'free' ? 'Kayıt Takvimi' : 'Etkinlik Takvimi (Opsiyonel)'}
                subtitle={eventType === 'invite' ? 'Davetiye etkinliklerinde takvim opsiyoneldir.' : undefined}
              />
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
              <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <DateTimePicker
                  label={eventType === 'paid' ? 'Satış Başlangıcı *' : eventType === 'free' ? 'Kayıt Başlangıcı *' : 'Başlangıç (opsiyonel)'}
                  value={saleStartDate}
                  onChange={(date) => { setSaleStartDate(date); clr('saleStart'); }}
                  minDateTime={new Date()}
                  maxDateTime={eventStartDate || undefined}
                  ampm={false}
                  slotProps={{
                    textField: { fullWidth: true, error: !!errors.saleStart, helperText: errors.saleStart },
                  }}
                />
                <DateTimePicker
                  label={eventType === 'paid' ? 'Satış Bitişi (opsiyonel)' : 'Bitiş (opsiyonel)'}
                  value={saleEndDate}
                  onChange={(date) => { setSaleEndDate(date); }}
                  minDateTime={saleStartDate || undefined}
                  ampm={false}
                  slotProps={{
                    textField: { fullWidth: true, helperText: 'Boş bırakılırsa etkinlik başlangıcında kapanır' },
                  }}
                />
              </Stack>
              </LocalizationProvider>
              {eventType === 'paid' && (
                <Stack direction="row" spacing={2}>
                  <TextField fullWidth label="Kişi Başı Min. Bilet" type="number" value={minTickets}
                    error={!!errors.minTickets} helperText={errors.minTickets}
                    InputProps={{ inputProps: { min: 1 } }}
                    onChange={e => { setMinTickets(Number(e.target.value)); clr('minTickets'); clr('maxTickets'); }} />
                  <TextField fullWidth label="Kişi Başı Max. Bilet" type="number" value={maxTickets}
                    error={!!errors.maxTickets} helperText={errors.maxTickets}
                    InputProps={{ inputProps: { min: 1 } }}
                    onChange={e => { setMaxTickets(Number(e.target.value)); clr('maxTickets'); }} />
                </Stack>
              )}
            </Box>
            {/* Ek Ayarlar kaldırıldı */}
          </Stack>
        )}

        {/* ─── STEP 6: İADE POLİTİKASI (NEW) ─── */}
        {logicalStep === 6 && (
          <Stack spacing={3}>
            <RefundPolicyStep policy={refundPolicyConfig} onChange={setRefundPolicyConfig} />
          </Stack>
        )}

        {/* ─── STEP 7: ÖNİZLEME ─── */}
        {logicalStep === 7 && (() => {
          const totalQuotaCount = tiers.reduce((s, t) => s + t.quota, 0);
          const quotaMismatch = !isConvertMode && eventType === 'paid' && capacity && totalQuotaCount !== Number(capacity);
          
          // Build checklist items
          const checks = [
            { ok: !!effectiveOrganizer, t: 'Organizatör seçildi', blocker: true },
            { ok: !!eventName && !!eventStartDate, t: 'Etkinlik adı ve tarihi girildi', blocker: true },
            { ok: isSeated !== null, t: isSeated ? 'Numaralı koltuk seçildi' : isSeated === false ? 'Serbest giriş seçildi' : 'Salon planı belirlenmedi', blocker: true },
            { ok: eventType === 'paid' ? tiers.length > 0 && tiers.every(t => !isFreeCategory(t.category) ? t.price > 0 : true) : true, t: eventType === 'paid' ? 'Bilet kategorileri tanımlandı' : 'Kayıt formu hazır', blocker: true },
            ...(eventType === 'paid' ? [{ ok: !!saleStartDate, t: 'Satış tarihi belirlendi', blocker: true }] : []),
            ...(eventType === 'paid' ? [{ ok: refundPolicyConfig.isRefundable, t: refundPolicyConfig.isRefundable ? 'İade politikası aktif' : 'İade politikası belirlenmedi (opsiyonel)', blocker: false }] : []),
            { ok: !!coverMedia?.originalUrl, t: coverMedia?.originalUrl ? 'Kapak görseli yüklendi' : 'Kapak görseli yüklenmedi', blocker: false },
            ...(!isConvertMode && eventType === 'paid' && capacity && totalQuotaCount !== Number(capacity) ? [{ ok: false, t: `Kontenjan uyuşmazlığı: ${totalQuotaCount} bilet / ${capacity} kapasite`, blocker: false, action: () => goTo(5), actionLabel: 'Düzelt' }] : []),
            ...(eventType === 'paid' && tiers.some(t => isSuspiciousName(t.name)) ? [{ ok: false, t: 'Bazı bilet kategorilerinde anlamsız isimler var', blocker: false, action: () => goTo(5), actionLabel: 'Düzelt' }] : []),
          ];
          const blockers = checks.filter(c => !c.ok && c.blocker);
          const warnings = checks.filter(c => !c.ok && !c.blocker);
          const hasBlockers = blockers.length > 0;

          return (
          <Box>
            {/* Blocker banner */}
            {quotaMismatch && (
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, mb: 3, bgcolor: alpha(theme.palette.warning.main, 0.06), borderColor: alpha(theme.palette.warning.main, 0.3) }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <WarningIcon sx={{ color: 'warning.main' }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight={700} color="warning.main">Kontenjan uyuşmazlığı</Typography>
                    <Typography variant="caption" color="text.secondary">Bilet kontenjanı toplamı ({totalQuotaCount}) etkinlik kapasitesinden ({capacity}) az. {Number(capacity) - totalQuotaCount} koltuk boş kalacak.</Typography>
                  </Box>
                  <Button size="small" variant="outlined" color="warning" onClick={() => goTo(5)} sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}>Düzelt</Button>
                </Stack>
              </Paper>
            )}

            {/* Stats Row */}
            <Stack direction="row" spacing={1.5} sx={{ mb: 3 }}>
              {[
                { label: 'Toplam kontenjan', value: totalQuotaCount, color: theme.palette.info.main },
                { label: 'Maks. gelir', value: `${CURRENCY_SYMBOLS[currency]}${maxRevenue.toLocaleString('tr-TR')}`, color: theme.palette.success.main },
                { label: 'Bilet kategorisi', value: tiers.length, color: theme.palette.warning.main },
                { label: 'Etkinlik tarihi', value: eventStartDate ? eventStartDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) : '—', color: theme.palette.primary.main },
              ].map((s, i) => (
                <Paper key={i} variant="outlined" sx={{ flex: 1, p: 1.5, borderRadius: 2, textAlign: 'center' }}>
                  <Typography variant="subtitle2" fontWeight={800} sx={{ color: s.color }}>{s.value}</Typography>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>{s.label}</Typography>
                </Paper>
              ))}
            </Stack>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
              {/* LEFT: Summary */}
              <Stack spacing={2}>
                {/* Section: Organizatör & Genel */}
                <SC>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 1.2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'grey.50' }}>
                    <Typography variant="subtitle2" fontWeight={700}>Organizatör & Genel</Typography>
                    <Button size="small" startIcon={<EditIcon sx={{ fontSize: '14px !important' }} />} onClick={() => goTo(1)} sx={{ textTransform: 'none', fontSize: 11, color: 'primary.main' }}>Adım 1'i düzenle</Button>
                  </Box>
                  {[
                    { l: 'Organizatör', v: effectiveOrganizer?.displayName || effectiveOrganizer?.email || '—' },
                    { l: 'E-posta', v: effectiveOrganizer?.email || '—' },
                    { l: 'Tür', v: eventType === 'paid' ? 'Ücretli' : eventType === 'free' ? 'Ücretsiz' : 'Davetiye', chip: true },
                    { l: 'Görünürlük', v: visibility === 'public' ? 'Herkese Açık' : visibility === 'draft' ? 'Taslak (yayınlanmayacak)' : 'Bağlantı Paylaşımı', icon: '🌐' },
                  ].map((r, i) => (
                    <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2.5, py: 1, borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 'none' } }}>
                      <Typography variant="body2" color="text.secondary">{r.l}</Typography>
                      {r.chip ? <Chip label={r.v} size="small" variant="outlined" sx={{ fontWeight: 600, fontSize: 11, height: 22 }} /> : <Typography variant="body2" fontWeight={600}>{r.icon ? `${r.icon} ` : ''}{r.v}</Typography>}
                    </Box>
                  ))}
                </SC>

                {/* Section: Etkinlik Bilgileri */}
                <SC>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 1.2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'grey.50' }}>
                    <Typography variant="subtitle2" fontWeight={700}>Etkinlik Bilgileri</Typography>
                    <Button size="small" startIcon={<EditIcon sx={{ fontSize: '14px !important' }} />} onClick={() => goTo(3)} sx={{ textTransform: 'none', fontSize: 11, color: 'primary.main' }}>Adım 3'ü düzenle</Button>
                  </Box>
                  {([
                    { l: 'Etkinlik Adı', v: eventName || '—' },
                    { l: 'Tarih & Saat', v: eventStartDate ? format(eventStartDate, 'dd MMMM yyyy, HH:mm', { locale: tr }) : '—' },
                    { l: 'Konum', v: eventAddress?.description || '—', warn: !eventAddress, action: !eventAddress ? () => goTo(4) : undefined, actionLabel: 'Belirle' },
                    { l: 'Kapasite', v: computedCapacity > 0 ? `${computedCapacity} kişi` : '—' },
                    { l: 'Kapak Görseli', v: coverMedia?.originalUrl ? 'Yüklendi' : 'Yüklenmedi', warn: !coverMedia?.originalUrl, action: !coverMedia?.originalUrl ? () => goTo(3) : undefined, actionLabel: 'Yükle' },
                  ] as { l: string; v: string; warn?: boolean; action?: () => void; actionLabel?: string; }[]).map((r, i) => (
                    <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2.5, py: 1, borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 'none' } }}>
                      <Typography variant="body2" color="text.secondary">{r.l}</Typography>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        {r.warn && <WarningIcon sx={{ fontSize: 14, color: 'warning.main' }} />}
                        <Typography variant="body2" fontWeight={600} sx={{ color: r.warn ? 'warning.main' : 'text.primary' }}>{r.v}</Typography>
                        {r.action && <Button size="small" onClick={r.action} sx={{ textTransform: 'none', fontSize: 11, minWidth: 0, p: 0, ml: 0.5, color: 'primary.main' }}>{r.actionLabel}</Button>}
                      </Stack>
                    </Box>
                  ))}
                </SC>

                {/* Section: Bilet Kategorileri */}
                {eventType === 'paid' && (
                  <SC>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 1.2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'grey.50' }}>
                      <Typography variant="subtitle2" fontWeight={700}>Bilet Kategorileri</Typography>
                      <Button size="small" startIcon={<EditIcon sx={{ fontSize: '14px !important' }} />} onClick={() => goTo(5)} sx={{ textTransform: 'none', fontSize: 11, color: 'primary.main' }}>Adım 5'i düzenle</Button>
                    </Box>
                    {tiers.map((t, i) => {
                      const suspicious = isSuspiciousName(t.name);
                      return (
                        <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2.5, py: 1.2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: suspicious ? alpha('#f59e0b', 0.04) : 'transparent' }}>
                          <Box>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: t.color }} />
                              <Typography variant="body2" fontWeight={600} sx={{ color: suspicious ? 'warning.main' : 'text.primary' }}>{t.name || '—'}</Typography>
                              {suspicious && <Chip label="Anlamsız isim?" size="small" color="warning" variant="outlined" sx={{ height: 18, fontSize: 9, fontWeight: 700 }} />}
                            </Stack>
                            <Typography variant="caption" color="text.secondary">{t.quota} kontenjan</Typography>
                          </Box>
                          <Typography variant="body2" fontWeight={700} color="primary.main">{isFreeCategory(t.category) ? 'Ücretsiz' : `${CURRENCY_SYMBOLS[currency]}${t.price.toLocaleString('tr-TR')}`}</Typography>
                        </Box>
                      );
                    })}
                    <Box sx={{ px: 2.5, py: 1.2, display: 'flex', justifyContent: 'space-between', bgcolor: 'grey.50', fontWeight: 600, fontSize: 13 }}>
                      <span>Maks. Gelir</span><span style={{ color: theme.palette.primary.main }}>{CURRENCY_SYMBOLS[currency]}{maxRevenue.toLocaleString('tr-TR')}</span>
                    </Box>
                  </SC>
                )}

                {/* Section: Kontrol Listesi */}
                <SC>
                  <Box sx={{ px: 2.5, py: 1.2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'grey.50', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle2" fontWeight={700}>Kontrol Listesi</Typography>
                    <Typography variant="caption" fontWeight={700} sx={{ color: hasBlockers ? 'error.main' : 'success.main' }}>{checks.filter(c => c.ok).length}/{checks.length} hazır</Typography>
                  </Box>
                  <Stack sx={{ p: 2 }} spacing={0.75}>
                    {checks.map((c, i) => (
                      <Stack key={i} direction="row" spacing={1} alignItems="center">
                        {c.ok
                          ? <CheckIcon sx={{ fontSize: 18, color: 'success.main' }} />
                          : c.blocker
                            ? <CloseIcon sx={{ fontSize: 18, color: 'error.main' }} />
                            : <WarningIcon sx={{ fontSize: 18, color: 'warning.main' }} />}
                        <Typography variant="body2" fontWeight={c.ok ? 500 : 600} sx={{ flex: 1, color: c.ok ? 'text.primary' : c.blocker ? 'error.main' : 'text.secondary' }}>
                          {c.t}
                          {!c.ok && !c.blocker && !c.t.includes('(opsiyonel)') && <Typography component="span" variant="caption" color="text.disabled" sx={{ ml: 0.5 }}>(opsiyonel)</Typography>}
                        </Typography>
                        {c.action && <Button size="small" onClick={c.action} sx={{ textTransform: 'none', fontSize: 11, minWidth: 0, color: 'primary.main' }}>{c.actionLabel}</Button>}
                      </Stack>
                    ))}
                  </Stack>
                </SC>
              </Stack>

              {/* RIGHT: Live Preview & Options */}
              <Box sx={{ position: 'sticky', top: 130, alignSelf: 'start' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                  <Typography variant="subtitle2" fontWeight={700}>Canlı Önizleme</Typography>
                  <Stack direction="row" spacing={0.5}>
                    <Chip icon={<MobileIcon sx={{ fontSize: '16px !important' }} />} label="Mobil" size="small" variant={previewMode === 'mobile' ? 'filled' : 'outlined'}
                      onClick={() => setPreviewMode('mobile')} sx={{ fontWeight: 600, fontSize: 11, cursor: 'pointer' }} />
                    <Chip icon={<DesktopIcon sx={{ fontSize: '16px !important' }} />} label="Masaüstü" size="small" variant={previewMode === 'desktop' ? 'filled' : 'outlined'}
                      onClick={() => setPreviewMode('desktop')} sx={{ fontWeight: 600, fontSize: 11, cursor: 'pointer' }} />
                  </Stack>
                </Stack>

                <SC sx={{ maxWidth: previewMode === 'mobile' ? 360 : '100%', mx: previewMode === 'mobile' ? 'auto' : 0, transition: 'max-width 0.3s', mb: 3 }}>
                  {/* Image area */}
                  {imagePreview ? (
                    <Box component="img" src={imagePreview} sx={{ width: '100%', height: previewMode === 'mobile' ? 160 : 180, objectFit: 'cover', display: 'block' }} />
                  ) : (
                    <Box sx={{ width: '100%', height: previewMode === 'mobile' ? 160 : 180, bgcolor: 'grey.100', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                      <NoImageIcon sx={{ fontSize: 32, color: 'text.disabled' }} />
                      <Typography variant="caption" color="text.disabled">Görsel eklenmedi</Typography>
                    </Box>
                  )}

                  {/* Card header */}
                  <Box sx={{ bgcolor: 'primary.main', color: 'white', px: 2.5, py: 2 }}>
                    <Typography variant="h6" fontWeight={800} sx={{ mb: 0.5, fontSize: previewMode === 'mobile' ? 16 : 18 }}>{eventName || 'Etkinlik Adı'}</Typography>
                    <Stack direction="row" spacing={1.5} sx={{ opacity: 0.8, fontSize: 12 }}>
                      <Stack direction="row" spacing={0.5} alignItems="center"><CalendarIcon sx={{ fontSize: 14 }} /><span>{eventStartDate ? eventStartDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Tarih'}</span></Stack>
                      <span>○ {eventAddress?.description || 'Belirsiz konum'}</span>
                    </Stack>
                    <Typography variant="caption" sx={{ opacity: 0.6, mt: 0.5, display: 'block' }}>{effectiveOrganizer?.displayName || effectiveOrganizer?.firstName || '—'} tarafından</Typography>
                  </Box>

                  {/* Ticket list */}
                  <Box sx={{ px: 2.5, py: 2 }}>
                    {eventType === 'paid' ? (
                      <Stack spacing={1}>
                        {tiers.map((t, i) => {
                          const suspicious = isSuspiciousName(t.name);
                          return (
                            <Box key={i} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, border: '1.5px solid', borderColor: suspicious ? 'warning.main' : 'divider', borderRadius: 2, bgcolor: suspicious ? alpha('#f59e0b', 0.04) : 'grey.50' }}>
                              <Box>
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: t.color }} />
                                  <Typography variant="body2" fontWeight={700}>{t.name || 'Kategori'}</Typography>
                                  {suspicious && <WarningIcon sx={{ fontSize: 14, color: 'warning.main' }} />}
                                </Stack>
                                <Typography variant="caption" color="text.secondary">{t.quota} kontenjan</Typography>
                              </Box>
                              <Typography variant="subtitle1" fontWeight={800} fontFamily="JetBrains Mono, monospace" color="primary.main">{isFreeCategory(t.category) ? 'Ücretsiz' : `${CURRENCY_SYMBOLS[currency]}${t.price.toLocaleString('tr-TR')}`}</Typography>
                            </Box>
                          );
                        })}
                        <Button fullWidth variant="contained" sx={{ mt: 1, borderRadius: 2, textTransform: 'none', fontWeight: 600, pointerEvents: 'none' }}>Bilet Satın Al</Button>
                      </Stack>
                    ) : eventType === 'free' ? (
                      <Box sx={{ textAlign: 'center', py: 2 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Bu etkinlik ücretsizdir</Typography>
                        <Button fullWidth variant="contained" color="success" sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, pointerEvents: 'none' }}>Hemen Kayıt Ol</Button>
                      </Box>
                    ) : (
                      <Box sx={{ textAlign: 'center', py: 2 }}><Typography sx={{ fontSize: 32 }}>🔒</Typography><Typography variant="body2" color="text.secondary">Sadece davet kodu ile katılım</Typography></Box>
                    )}
                  </Box>
                </SC>

                {/* Publish Options Card */}
                <SC sx={{ p: 2.5 }}>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>Yayınlama Seçenekleri</Typography>
                  <RadioGroup value={visibility} onChange={(e) => setVisibility(e.target.value as any)}>
                    <FormControlLabel value="public" control={<Radio size="small" />} label={
                      <Box>
                        <Typography variant="body2" fontWeight={600}>Hemen Yayınla</Typography>
                        <Typography variant="caption" color="text.secondary">Etkinlik anında tüm platformlarda görünür olur.</Typography>
                      </Box>
                    } sx={{ alignItems: 'flex-start', mb: 1.5 }} />
                    <FormControlLabel value="draft" control={<Radio size="small" />} label={
                      <Box>
                        <Typography variant="body2" fontWeight={600}>Taslak Kaydet</Typography>
                        <Typography variant="caption" color="text.secondary">Sadece siz görebilirsiniz, daha sonra düzenleyebilirsiniz.</Typography>
                      </Box>
                    } sx={{ alignItems: 'flex-start' }} />
                  </RadioGroup>

                  {/* Warning feedback above button */}
                  {warnings.length > 0 && !hasBlockers && (
                    <Box sx={{ mt: 3, p: 1.5, bgcolor: alpha(theme.palette.warning.main, 0.06), borderRadius: 2, border: '1px solid', borderColor: alpha(theme.palette.warning.main, 0.2) }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <WarningIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                        <Typography variant="caption" fontWeight={700} color="warning.main">
                          {warnings.length} uyarı var • Yine de devam edebilirsiniz
                        </Typography>
                      </Stack>
                    </Box>
                  )}

                  {hasBlockers && (
                    <Box sx={{ mt: 3, p: 1.5, bgcolor: alpha(theme.palette.error.main, 0.06), borderRadius: 2, border: '1px solid', borderColor: alpha(theme.palette.error.main, 0.2) }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <CloseIcon sx={{ fontSize: 16, color: 'error.main' }} />
                        <Typography variant="caption" fontWeight={700} color="error.main">
                          {blockers.length} kritik eksik var • Yayınlamak için düzeltin
                        </Typography>
                      </Stack>
                    </Box>
                  )}
                </SC>
              </Box>
            </Box>
          </Box>
          );
        })()}
      </Box>

      {/* Footer */}
      <Box sx={{
        position: 'fixed',
        bottom: 0,
        right: 0,
        left: { xs: 0, sm: 260 },
        bgcolor: 'background.paper',
        borderTop: '1px solid',
        borderColor: 'divider',
        px: { xs: 2, sm: 4 },
        py: 1.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 -4px 12px rgba(0,0,0,0.05)',
        zIndex: 10
      }}>
        <Button variant="outlined" startIcon={<BackIcon />} onClick={goBack} disabled={step === 1}
          sx={{ textTransform: 'none', borderRadius: 2.5, fontWeight: 600, visibility: step === 1 ? 'hidden' : 'visible' }}>Geri</Button>
        <Typography variant="caption" color="text.disabled" sx={{ display: { xs: 'none', sm: 'block' } }}>
          {step === TOTAL ? (hasBlockers ? `${blockers.length} zorunlu alan eksik` : (isConvertMode ? 'Dönüştürmeden önce bilgileri kontrol edin' : 'Yayınlamadan önce bilgileri kontrol edin')) : 'Tüm * alanları zorunlu'}
        </Typography>
        <Stack direction="row" spacing={1.5}>
          {step === TOTAL && !isConvertMode && (
            <Button variant="outlined" onClick={() => handlePublish(true)} disabled={publishing}
              sx={{ textTransform: 'none', borderRadius: 2.5, fontWeight: 600, px: 2.5 }}>Taslak Kaydet</Button>
          )}
          <Button variant="contained" onClick={goNext} disabled={publishing || (step === TOTAL && hasBlockers)}
            endIcon={step === TOTAL ? <SendIcon /> : <ForwardIcon />}
            sx={{ textTransform: 'none', borderRadius: 2.5, fontWeight: 600, px: 3, bgcolor: (step === TOTAL && !hasBlockers) ? theme.palette.primary.main : undefined }}>
            {publishing ? (isConvertMode ? 'Dönüştürülüyor...' : 'Yayınlanıyor...') : step === TOTAL ? (isConvertMode ? 'Biletli Etkinliğe Dönüştür' : 'Etkinliği Yayınla') : 'Devam Et'}
          </Button>
        </Stack>
      </Box>
    </Box>
  )
  ;
}
