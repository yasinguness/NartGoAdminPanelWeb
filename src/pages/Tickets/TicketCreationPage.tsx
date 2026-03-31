/**
 * TicketCreationPage — 3-step wizard for creating events & tickets
 * Steps: (1) Event Info, (2) Ticket & Pricing, (3) Preview & Publish
 */
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import {
  Box,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Paper,
  Chip,
  Switch,
  Divider,
  IconButton,
  alpha,
  useTheme,
  styled,
  LinearProgress,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  ArrowForward as ForwardIcon,
  Add as AddIcon,
  Close as CloseIcon,
  DragIndicator as DragIcon,
  Rocket as RocketIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

// ─── STYLED COMPONENTS ──────────────────────────────────
const StepCircle = styled(Box)<{ active?: boolean; done?: boolean }>(({ theme, active, done }) => ({
  width: 32,
  height: 32,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 13,
  fontWeight: 700,
  flexShrink: 0,
  transition: 'all 0.2s',
  ...(active && {
    borderColor: theme.palette.primary.main,
    background: theme.palette.primary.main,
    color: '#fff',
    border: `2px solid ${theme.palette.primary.main}`,
  }),
  ...(done && {
    borderColor: theme.palette.primary.main,
    background: alpha(theme.palette.primary.main, 0.08),
    color: theme.palette.primary.main,
    border: `2px solid ${theme.palette.primary.main}`,
  }),
  ...(!active && !done && {
    border: `2px solid ${theme.palette.divider}`,
    background: '#fff',
    color: theme.palette.text.disabled,
  }),
}));

const StepConnector = styled(Box)<{ done?: boolean }>(({ theme, done }) => ({
  flex: 1,
  height: 2,
  background: done ? theme.palette.primary.main : theme.palette.divider,
  margin: '0 8px',
  transition: 'background 0.3s',
}));

// ─── TYPES ──────────────────────────────────────────────
interface TierItem {
  id: string;
  name: string;
  price: number;
  quota: number;
  color: string;
}

type TicketType = 'paid' | 'free' | 'invite';
type Visibility = 'public' | 'link' | 'draft';

// ─── COMPONENT ──────────────────────────────────────────
export default function TicketCreationPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

  // Step 1: Event Info
  const [eventName, setEventName] = useState('');
  const [eventCategory, setEventCategory] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventStart, setEventStart] = useState('');
  const [eventEnd, setEventEnd] = useState('');
  const [doorOpenTime, setDoorOpenTime] = useState('');
  const [capacity, setCapacity] = useState('');
  const [venueType, setVenueType] = useState('Kapalı Salon');
  const [visibility, setVisibility] = useState<Visibility>('public');

  // Step 2: Ticket & Pricing
  const [ticketType, setTicketType] = useState<TicketType>('paid');
  const [tiers, setTiers] = useState<TierItem[]>([
    { id: '1', name: 'Standart Giriş', price: 150, quota: 100, color: '#22c55e' },
    { id: '2', name: 'VIP', price: 400, quota: 30, color: '#f59e0b' },
  ]);
  const [currency, setCurrency] = useState('TRY');
  const [commission, setCommission] = useState(5);
  const [saleStart, setSaleStart] = useState('');
  const [saleEnd, setSaleEnd] = useState('');
  const [minTickets, setMinTickets] = useState(1);
  const [maxTickets, setMaxTickets] = useState(10);
  const [refundPolicy, setRefundPolicy] = useState(true);
  const [waitlist, setWaitlist] = useState(false);
  const [transferable, setTransferable] = useState(true);
  const [invoiceEnabled, setInvoiceEnabled] = useState(false);

  // Step 3: Published
  const [published, setPublished] = useState(false);

  const tierColors = ['#22c55e', '#f59e0b', '#3b82f6', '#a855f7', '#ef4444', '#ec4899'];

  // ─── STEP NAVIGATION ──────────────────────────────
  const goNext = () => {
    if (currentStep < totalSteps) setCurrentStep(currentStep + 1);
    else handlePublish();
  };
  const goBack = () => { if (currentStep > 1) setCurrentStep(currentStep - 1); };
  const goToStep = (n: number) => { if (n <= currentStep) setCurrentStep(n); };

  const handlePublish = () => {
    setPublished(true);
    enqueueSnackbar('🎉 Etkinlik başarıyla yayınlandı!', { variant: 'success' });
  };

  // ─── TIER MANAGEMENT ──────────────────────────────
  const addTier = () => {
    const newId = String(Date.now());
    const color = tierColors[tiers.length % tierColors.length];
    setTiers([...tiers, { id: newId, name: 'Yeni Kategori', price: 0, quota: 50, color }]);
  };

  const removeTier = (id: string) => {
    if (tiers.length <= 1) { enqueueSnackbar('⚠ En az 1 bilet kategorisi olmalı', { variant: 'warning' }); return; }
    setTiers(tiers.filter(t => t.id !== id));
  };

  const updateTier = (id: string, field: keyof TierItem, value: any) => {
    setTiers(tiers.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  // ─── STEP INFO ────────────────────────────────────
  const stepTitles = ['Adım 1 — Etkinlik Bilgileri', 'Adım 2 — Bilet & Fiyatlandırma', 'Adım 3 — Önizleme & Yayınla'];
  const stepSubs = ['Temel bilgileri, tarih ve kapasite bilgilerini girin', 'Bilet tiplerini, fiyatları ve satış takvimini belirleyin', 'Her şeyi kontrol edin ve etkinliğinizi yayınlayın'];

  const totalQuota = tiers.reduce((sum, t) => sum + t.quota, 0);
  const maxRevenue = tiers.reduce((sum, t) => sum + (t.price * t.quota), 0);

  // ─── RENDER ───────────────────────────────────────
  if (published) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8, textAlign: 'center' }}>
        <Box sx={{
          width: 80, height: 80, borderRadius: '50%',
          bgcolor: (t) => alpha(t.palette.primary.main, 0.08),
          border: '3px solid',
          borderColor: (t) => alpha(t.palette.primary.main, 0.3),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 36, mb: 2.5,
          animation: 'pop 0.4s ease',
          '@keyframes pop': { from: { transform: 'scale(0.5)', opacity: 0 }, to: { transform: 'scale(1)', opacity: 1 } },
        }}>🎉</Box>
        <Typography variant="h4" fontWeight={800} letterSpacing={-0.5} sx={{ mb: 1 }}>Etkinlik Yayınlandı!</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 400, lineHeight: 1.5, mb: 3.5 }}>
          <strong>{eventName || 'Etkinlik'}</strong> başarıyla oluşturuldu ve satışa açıldı. Katılımcılar artık bilet satın alabilir.
        </Typography>
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" onClick={() => { setPublished(false); setCurrentStep(1); }}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
          >+ Yeni Etkinlik Oluştur</Button>
          <Button variant="contained" onClick={() => navigate('/events')}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
          >Etkinlik Detayına Git →</Button>
        </Stack>
        <Box sx={{ mt: 3.5, p: 2, bgcolor: 'grey.50', border: '1px solid', borderColor: 'divider', borderRadius: 2.5, maxWidth: 400, width: '100%' }}>
          <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase" letterSpacing={0.5} sx={{ mb: 1, display: 'block' }}>Etkinlik Linki</Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Box sx={{ flex: 1, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1.5, px: 1.5, py: 1, fontFamily: 'monospace', fontSize: 12, color: 'text.secondary' }}>
              nartgo.com/e/{(eventName || 'etkinlik').toLowerCase().replace(/\s+/g, '-')}
            </Box>
            <Button size="small" variant="outlined" onClick={() => enqueueSnackbar('📋 Link kopyalandı!', { variant: 'success' })}
              sx={{ textTransform: 'none', borderRadius: 2 }}
            >Kopyala</Button>
          </Stack>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 64px)' }}>
      {/* ═══ WIZARD HEADER ═══ */}
      <Box sx={{ bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider', px: 4, py: 2.5, position: 'sticky', top: 64, zIndex: 5 }}>
        {/* Breadcrumb */}
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2, cursor: 'pointer' }} onClick={() => navigate('/events')}>
          <Typography variant="caption" color="text.secondary" sx={{ '&:hover': { color: 'primary.main' } }}>← Etkinliklere Dön</Typography>
          <Typography variant="caption" color="text.disabled">›</Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={500}>Yeni Etkinlik & Bilet Oluştur</Typography>
        </Stack>

        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2.5 }}>
          <Box>
            <Typography variant="h6" fontWeight={800}>{stepTitles[currentStep - 1]}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>{stepSubs[currentStep - 1]}</Typography>
          </Box>
          <Typography variant="caption" color="text.secondary">Taslak olarak kaydedildi ✓</Typography>
        </Stack>

        {/* Steps track */}
        <Stack direction="row" alignItems="center" sx={{ maxWidth: 700 }}>
          {[1, 2, 3].map((step, i) => (
            <Box key={step} sx={{ display: 'flex', alignItems: 'center', flex: i < 2 ? 1 : 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: step <= currentStep ? 'pointer' : 'default' }}
                onClick={() => goToStep(step)}
              >
                <StepCircle active={step === currentStep} done={step < currentStep}>
                  {step < currentStep ? '✓' : step}
                </StepCircle>
                <Typography variant="caption" fontWeight={600}
                  sx={{ color: step === currentStep ? 'primary.main' : step < currentStep ? 'text.secondary' : 'text.disabled' }}
                >
                  {['Etkinlik Bilgileri', 'Bilet & Fiyatlandırma', 'Önizleme & Yayınla'][i]}
                </Typography>
              </Box>
              {i < 2 && <StepConnector done={step < currentStep} />}
            </Box>
          ))}
        </Stack>
      </Box>

      {/* ═══ STEP CONTENT ═══ */}
      <Box sx={{ flex: 1, px: 4, py: 3.5, pb: 12, maxWidth: 800, animation: 'fadeUp 0.2s ease',
        '@keyframes fadeUp': { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'none' } },
      }}>

        {/* ─── STEP 1: ETKİNLİK BİLGİLERİ ─── */}
        {currentStep === 1 && (
          <Stack spacing={4}>
            <Box>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>Temel Bilgiler</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>Etkinliğinizin adı, açıklaması ve kategorisini belirleyin.</Typography>

              <TextField fullWidth label="Etkinlik Adı *" placeholder="Örn: Ankara Caz Festivali 2026"
                value={eventName} onChange={(e) => setEventName(e.target.value)} sx={{ mb: 2 }}
              />
              <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>Kategori *</InputLabel>
                  <Select value={eventCategory} label="Kategori *" onChange={(e) => setEventCategory(e.target.value)}>
                    <MenuItem value="">Seçin...</MenuItem>
                    {['Düğün & Nişan', 'Festival & Şenlikler', 'Spor & Aktif Yaşam', 'Eğitim & Gelişim', 'Teknoloji & Bilişim', 'Üniversite & Topluluk'].map(c => (
                      <MenuItem key={c} value={c}>{c}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField fullWidth label="Konum *" placeholder="Şehir veya mekan adı"
                  value={eventLocation} onChange={(e) => setEventLocation(e.target.value)}
                />
              </Stack>
              <TextField fullWidth multiline rows={3} label="Açıklama (opsiyonel)" placeholder="Etkinlik hakkında kısa bir açıklama..."
                value={eventDescription} onChange={(e) => setEventDescription(e.target.value)}
              />
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>Tarih & Saat</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>Etkinliğin ne zaman başlayıp biteceğini girin.</Typography>
              <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <TextField fullWidth label="Başlangıç *" type="datetime-local" InputLabelProps={{ shrink: true }}
                  value={eventStart} onChange={(e) => setEventStart(e.target.value)}
                />
                <TextField fullWidth label="Bitiş *" type="datetime-local" InputLabelProps={{ shrink: true }}
                  value={eventEnd} onChange={(e) => setEventEnd(e.target.value)}
                />
              </Stack>
              <TextField fullWidth label="Kapı Açılış Saati (opsiyonel)" type="time" InputLabelProps={{ shrink: true }}
                value={doorOpenTime} onChange={(e) => setDoorOpenTime(e.target.value)}
                helperText="Giriş kontrolü için kullanılır. Belirtilmezse başlangıç saati kullanılır."
              />
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>Kapasite & Mekan Tipi</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>Maksimum katılımcı sayısını ve mekan düzenini belirleyin.</Typography>
              <Stack direction="row" spacing={2}>
                <TextField fullWidth label="Toplam Kapasite *" type="number" placeholder="Örn: 500"
                  value={capacity} onChange={(e) => setCapacity(e.target.value)}
                  helperText="Tüm bilet tipleri dahil maksimum kişi sayısı"
                />
                <FormControl fullWidth>
                  <InputLabel>Mekan Tipi</InputLabel>
                  <Select value={venueType} label="Mekan Tipi" onChange={(e) => setVenueType(e.target.value)}>
                    {['Kapalı Salon', 'Açık Alan', 'Tiyatro / Sahne', 'Stadyum / Arena', 'Online / Hibrit'].map(v => (
                      <MenuItem key={v} value={v}>{v}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>Görünürlük</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>Etkinliğin platforma nasıl yayınlanacağını seçin.</Typography>
              <Stack spacing={1}>
                {([
                  { key: 'public' as Visibility, icon: '🌐', name: 'Herkese Açık', desc: 'Tüm kullanıcılar etkinliği arayıp bulabilir ve kayıt olabilir' },
                  { key: 'link' as Visibility, icon: '🔗', name: 'Sadece Link ile', desc: 'Listede görünmez, sadece linke sahip olanlar erişebilir' },
                  { key: 'draft' as Visibility, icon: '🔒', name: 'Taslak', desc: 'Henüz yayınlanmaz, sadece adminler görebilir' },
                ]).map(opt => (
                  <Box key={opt.key}
                    onClick={() => setVisibility(opt.key)}
                    sx={{
                      display: 'flex', alignItems: 'flex-start', gap: 1.5,
                      p: 1.5, border: '2px solid',
                      borderColor: visibility === opt.key ? 'primary.main' : 'divider',
                      bgcolor: visibility === opt.key ? (t) => alpha(t.palette.primary.main, 0.04) : 'transparent',
                      borderRadius: 2, cursor: 'pointer', transition: '0.12s',
                      '&:hover': { borderColor: visibility !== opt.key ? 'primary.light' : 'primary.main', bgcolor: (t) => alpha(t.palette.primary.main, 0.04) },
                    }}
                  >
                    <Box sx={{
                      width: 18, height: 18, borderRadius: '50%',
                      border: '2px solid',
                      borderColor: visibility === opt.key ? 'primary.main' : 'text.disabled',
                      bgcolor: visibility === opt.key ? 'primary.main' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 0.2, flexShrink: 0,
                    }}>
                      {visibility === opt.key && <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'white' }} />}
                    </Box>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>{opt.icon} {opt.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{opt.desc}</Typography>
                    </Box>
                  </Box>
                ))}
              </Stack>
            </Box>
          </Stack>
        )}

        {/* ─── STEP 2: BİLET & FİYATLANDIRMA ─── */}
        {currentStep === 2 && (
          <Stack spacing={4}>
            <Box>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>Bilet Tipi</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>Bu etkinlik için kullanmak istediğiniz bilet modelini seçin.</Typography>
              <Stack direction="row" spacing={1.5}>
                {([
                  { key: 'paid' as TicketType, icon: '🎟', name: 'Ücretli Bilet', desc: 'Fiyat belirlenen katmanlı bilet yapısı' },
                  { key: 'free' as TicketType, icon: '🎁', name: 'Ücretsiz Giriş', desc: 'Kayıt gerektiren bedava etkinlik' },
                  { key: 'invite' as TicketType, icon: '🔒', name: 'Davetiye', desc: 'Sadece davet kodu ile giriş' },
                ]).map(opt => (
                  <Box key={opt.key}
                    onClick={() => setTicketType(opt.key)}
                    sx={{
                      flex: 1, border: '2px solid',
                      borderColor: ticketType === opt.key ? 'primary.main' : 'divider',
                      bgcolor: ticketType === opt.key ? (t) => alpha(t.palette.primary.main, 0.04) : 'transparent',
                      borderRadius: 3, p: 2, textAlign: 'center', cursor: 'pointer', transition: '0.15s',
                      '&:hover': { borderColor: 'primary.light', bgcolor: (t) => alpha(t.palette.primary.main, 0.04) },
                    }}
                  >
                    <Typography sx={{ fontSize: 28, mb: 1 }}>{opt.icon}</Typography>
                    <Typography variant="body2" fontWeight={700} sx={{ mb: 0.5 }}>{opt.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{opt.desc}</Typography>
                  </Box>
                ))}
              </Stack>
            </Box>

            <Divider />

            {/* Paid tier builder */}
            {ticketType === 'paid' && (
              <>
                <Box>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>Bilet Kategorileri</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>Her kategori için isim, fiyat ve kontenjan belirleyin.</Typography>

                  <Paper variant="outlined" sx={{ borderRadius: 3 }}>
                    {/* Header */}
                    <Box sx={{
                      px: 2.5, py: 1, bgcolor: 'grey.50', borderBottom: '1px solid', borderColor: 'divider',
                      display: 'grid', gridTemplateColumns: '28px 1fr 130px 80px 32px', gap: 1.5,
                      fontSize: 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5,
                    }}>
                      <Box />
                      <Box>Bilet Adı</Box>
                      <Box>Fiyat</Box>
                      <Box>Kontenjan</Box>
                      <Box />
                    </Box>
                    {/* Tier items */}
                    {tiers.map((tier) => (
                      <Box key={tier.id} sx={{
                        display: 'grid', gridTemplateColumns: '28px 1fr 130px 80px 32px', gap: 1.5,
                        alignItems: 'center', px: 2.5, py: 1.5,
                        borderBottom: '1px solid', borderColor: 'divider',
                        '&:last-of-type': { borderBottom: 'none' },
                        '&:hover': { bgcolor: 'grey.50' },
                      }}>
                        <DragIcon sx={{ color: 'text.disabled', cursor: 'grab', fontSize: 16 }} />
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: tier.color, flexShrink: 0 }} />
                          <TextField variant="standard" value={tier.name} fullWidth
                            InputProps={{ disableUnderline: true, sx: { fontWeight: 600, fontSize: 14 } }}
                            onChange={(e) => updateTier(tier.id, 'name', e.target.value)}
                          />
                        </Stack>
                        <Box sx={{ display: 'flex', border: '1.5px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
                          <Box sx={{ px: 1.5, py: 0.75, bgcolor: 'grey.50', borderRight: '1.5px solid', borderColor: 'divider', fontSize: 13, fontWeight: 600, color: 'text.secondary' }}>₺</Box>
                          <TextField variant="standard" type="number" value={tier.price}
                            InputProps={{ disableUnderline: true, sx: { px: 1, fontFamily: 'monospace', fontWeight: 600, fontSize: 14 } }}
                            onChange={(e) => updateTier(tier.id, 'price', Number(e.target.value))}
                          />
                        </Box>
                        <TextField variant="standard" type="number" value={tier.quota}
                          InputProps={{ disableUnderline: true, sx: { textAlign: 'center', fontFamily: 'monospace', fontSize: 14, border: '1.5px solid', borderColor: 'divider', borderRadius: 2, px: 1, py: 0.5 } }}
                          onChange={(e) => updateTier(tier.id, 'quota', Number(e.target.value))}
                        />
                        <IconButton size="small" onClick={() => removeTier(tier.id)}
                          sx={{ '&:hover': { bgcolor: (t) => alpha(t.palette.error.main, 0.08), color: 'error.main' } }}
                        ><CloseIcon fontSize="small" /></IconButton>
                      </Box>
                    ))}
                    {/* Add tier button */}
                    <Button fullWidth startIcon={<AddIcon />} onClick={addTier}
                      sx={{
                        justifyContent: 'flex-start', px: 2.5, py: 1.5, textTransform: 'none',
                        fontWeight: 600, color: 'primary.main', borderTop: '1px solid', borderColor: 'divider',
                        borderRadius: 0, '&:hover': { bgcolor: (t) => alpha(t.palette.primary.main, 0.04) },
                      }}
                    >Yeni Kategori Ekle</Button>
                  </Paper>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>Para Birimi & Ödeme</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>Satış para birimi ve ödeme yöntemlerini belirleyin.</Typography>
                  <Stack direction="row" spacing={2}>
                    <FormControl fullWidth>
                      <InputLabel>Para Birimi *</InputLabel>
                      <Select value={currency} label="Para Birimi *" onChange={(e) => setCurrency(e.target.value)}>
                        <MenuItem value="TRY">₺ Türk Lirası (TRY)</MenuItem>
                        <MenuItem value="USD">$ Amerikan Doları (USD)</MenuItem>
                        <MenuItem value="EUR">€ Euro (EUR)</MenuItem>
                      </Select>
                    </FormControl>
                    <TextField fullWidth label="Komisyon Oranı %" type="number" value={commission}
                      onChange={(e) => setCommission(Number(e.target.value))}
                      helperText="Platform komisyonu (bilet fiyatına eklenir)"
                    />
                  </Stack>
                </Box>
              </>
            )}

            {/* Free section */}
            {ticketType === 'free' && (
              <Box>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>Kayıt Formu</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>Ücretsiz etkinliklerde katılımcıdan hangi bilgiler alınacak?</Typography>
                <Paper variant="outlined" sx={{ borderRadius: 3, px: 2.5 }}>
                  {[
                    { name: 'Ad Soyad', desc: 'Zorunlu alan', locked: true },
                    { name: 'E-posta', desc: 'Bilet ve bildirim için gerekli', locked: true },
                    { name: 'Telefon Numarası', desc: 'Opsiyonel', locked: false },
                    { name: 'Kurum / Okul', desc: 'Kurumsal etkinlikler için', locked: false },
                  ].map((field, i) => (
                    <Stack key={i} direction="row" alignItems="center" justifyContent="space-between"
                      sx={{ py: 1.5, borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 'none' } }}
                    >
                      <Box>
                        <Typography variant="body2" fontWeight={500}>{field.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{field.desc}</Typography>
                      </Box>
                      <Switch defaultChecked={field.locked} disabled={field.locked} color="primary" />
                    </Stack>
                  ))}
                </Paper>
              </Box>
            )}

            <Divider />

            <Box>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>Satış Takvimi</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>Bilet satışlarının ne zaman başlayıp biteceğini belirleyin.</Typography>
              <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <TextField fullWidth label="Satış Başlangıcı *" type="datetime-local" InputLabelProps={{ shrink: true }}
                  value={saleStart} onChange={(e) => setSaleStart(e.target.value)}
                />
                <TextField fullWidth label="Satış Bitişi (opsiyonel)" type="datetime-local" InputLabelProps={{ shrink: true }}
                  value={saleEnd} onChange={(e) => setSaleEnd(e.target.value)}
                  helperText="Boş bırakılırsa etkinlik başlangıcında otomatik kapanır"
                />
              </Stack>
              <Stack direction="row" spacing={2}>
                <TextField fullWidth label="Kişi Başı Min. Bilet" type="number" value={minTickets}
                  onChange={(e) => setMinTickets(Number(e.target.value))}
                />
                <TextField fullWidth label="Kişi Başı Max. Bilet" type="number" value={maxTickets}
                  onChange={(e) => setMaxTickets(Number(e.target.value))}
                  helperText="Tek siparişte alınabilecek maksimum bilet sayısı"
                />
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>Ek Ayarlar</Typography>
              <Paper variant="outlined" sx={{ borderRadius: 3, px: 2.5 }}>
                {[
                  { name: 'İade politikası aktif', desc: 'Etkinlikten X gün önce iade kabul edilir', value: refundPolicy, setter: setRefundPolicy },
                  { name: 'Bekleme listesi', desc: 'Kapasite dolduğunda bekleme listesi oluştur', value: waitlist, setter: setWaitlist },
                  { name: 'İsim transferine izin ver', desc: 'Alıcı bileti başkasına devredebilir', value: transferable, setter: setTransferable },
                  { name: 'Fatura oluştur', desc: 'Her satışta otomatik e-fatura gönder', value: invoiceEnabled, setter: setInvoiceEnabled },
                ].map((toggle, i) => (
                  <Stack key={i} direction="row" alignItems="center" justifyContent="space-between"
                    sx={{ py: 1.5, borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 'none' } }}
                  >
                    <Box>
                      <Typography variant="body2" fontWeight={500}>{toggle.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{toggle.desc}</Typography>
                    </Box>
                    <Switch checked={toggle.value} onChange={(e) => toggle.setter(e.target.checked)} color="primary" />
                  </Stack>
                ))}
              </Paper>
            </Box>
          </Stack>
        )}

        {/* ─── STEP 3: ÖNİZLEME & YAYINLA ─── */}
        {currentStep === 3 && (
          <Box sx={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 2.5 }}>
            {/* Left: Summary + Checklist */}
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>Etkinlik Özeti</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Yayınlamadan önce bilgileri gözden geçirin.</Typography>
              </Box>

              <Paper variant="outlined" sx={{ borderRadius: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="subtitle2" fontWeight={700}>Genel Bilgiler</Typography>
                  <Button size="small" onClick={() => goToStep(1)} sx={{ textTransform: 'none' }}>✏️ Düzenle</Button>
                </Box>
                {[
                  { label: 'Etkinlik Adı', value: eventName || '—' },
                  { label: 'Tarih', value: eventStart ? new Date(eventStart).toLocaleString('tr-TR') : '—' },
                  { label: 'Konum', value: eventLocation || '—' },
                  { label: 'Toplam Kapasite', value: capacity ? `${capacity} kişi` : '—' },
                  { label: 'Görünürlük', value: visibility === 'public' ? '🌐 Herkese Açık' : visibility === 'link' ? '🔗 Sadece Link' : '🔒 Taslak' },
                ].map((row, i) => (
                  <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', px: 2.5, py: 1.2, borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 'none' } }}>
                    <Typography variant="body2" color="text.secondary">{row.label}</Typography>
                    <Typography variant="body2" fontWeight={600}>{row.value}</Typography>
                  </Box>
                ))}
              </Paper>

              <Paper variant="outlined" sx={{ borderRadius: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="subtitle2" fontWeight={700}>Bilet Kategorileri</Typography>
                  <Button size="small" onClick={() => goToStep(2)} sx={{ textTransform: 'none' }}>✏️ Düzenle</Button>
                </Box>
                {tiers.map((tier, i) => (
                  <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', px: 2.5, py: 1.2, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>{tier.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{tier.quota} kontenjan</Typography>
                    </Box>
                    <Typography variant="body2" fontWeight={600} color="primary.main">₺{tier.price.toLocaleString()}</Typography>
                  </Box>
                ))}
                <Box sx={{ px: 2.5, py: 1.2, display: 'flex', justifyContent: 'space-between', bgcolor: 'grey.50', fontSize: 13, fontWeight: 600 }}>
                  <span>Tahmini Maks. Gelir</span>
                  <span style={{ color: theme.palette.primary.main }}>₺{maxRevenue.toLocaleString()}</span>
                </Box>
              </Paper>

              {/* Checklist */}
              <Paper variant="outlined" sx={{ borderRadius: 3 }}>
                <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="subtitle2" fontWeight={700}>Yayın Öncesi Kontrol</Typography>
                </Box>
                <Stack sx={{ p: 2 }} spacing={1.2}>
                  {[
                    { ok: !!eventName && !!eventStart, text: 'Etkinlik adı ve tarihi dolduruldu' },
                    { ok: tiers.length > 0, text: 'En az 1 bilet kategorisi tanımlandı' },
                    { ok: !!saleStart, text: 'Satış başlangıç tarihi belirlendi' },
                    { ok: false, text: 'Etkinlik görseli eklenmedi', optional: true },
                    { ok: !!eventDescription, text: eventDescription ? 'Açıklama eklendi' : 'Açıklama eklenmedi', optional: !eventDescription },
                  ].map((check, i) => (
                    <Stack key={i} direction="row" spacing={1.2} alignItems="center">
                      <Typography sx={{ fontSize: 16, color: check.ok ? 'success.main' : 'warning.main' }}>
                        {check.ok ? '✅' : '⚠️'}
                      </Typography>
                      <Typography variant="body2" sx={{ color: check.ok ? 'text.primary' : 'text.secondary' }}>
                        {check.text}
                        {check.optional && <Typography component="span" variant="caption" color="text.disabled" sx={{ ml: 0.5 }}>(opsiyonel)</Typography>}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </Paper>
            </Stack>

            {/* Right: Live Preview */}
            <Box sx={{ position: 'sticky', top: 180 }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>Canlı Önizleme</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Kullanıcıların göreceği bilet kartı</Typography>

              <Paper sx={{ borderRadius: 3.5, border: '2px dashed', borderColor: 'divider', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                <Box sx={{ bgcolor: 'primary.main', color: 'white', px: 3, py: 2.5 }}>
                  <Typography variant="caption" fontWeight={700} textTransform="uppercase" letterSpacing={1} sx={{ opacity: 0.7, mb: 1, display: 'block' }}>🎫 ETKİNLİK BİLETİ</Typography>
                  <Typography variant="h6" fontWeight={800} sx={{ mb: 0.5 }}>{eventName || 'Etkinlik Adı'}</Typography>
                  <Stack direction="row" spacing={2} sx={{ opacity: 0.8, fontSize: 13 }}>
                    <span>📅 {eventStart ? new Date(eventStart).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Tarih'}</span>
                    <span>📍 {eventLocation || 'Konum'}</span>
                  </Stack>
                </Box>
                <Box sx={{ px: 3, py: 2.5 }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase" letterSpacing={0.5} sx={{ mb: 1.5, display: 'block' }}>Bilet Seçenekleri</Typography>
                  <Stack spacing={1.2}>
                    {tiers.map((tier, i) => (
                      <Box key={i} sx={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        p: 1.5, border: '1.5px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'grey.50',
                      }}>
                        <Box>
                          <Typography variant="body2" fontWeight={700}>{tier.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{tier.quota} kontenjan kaldı</Typography>
                        </Box>
                        <Typography variant="h6" fontWeight={800} fontFamily="JetBrains Mono, monospace"
                          sx={{ color: tier.price > 0 ? 'primary.main' : 'text.secondary' }}
                        >
                          {tier.price > 0 ? `₺${tier.price}` : 'Ücretsiz'}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                  <Button fullWidth variant="contained" sx={{ mt: 2, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>
                    Bilet Satın Al
                  </Button>
                  <Stack direction="row" justifyContent="space-between" sx={{ mt: 1.5, fontSize: 12, color: 'text.secondary' }}>
                    <span>Toplam kapasite: <strong>{capacity || '—'}</strong></span>
                    <span>Satış bitiş: <strong>{saleEnd ? new Date(saleEnd).toLocaleDateString('tr-TR') : '—'}</strong></span>
                  </Stack>
                </Box>
              </Paper>

              <Box sx={{ mt: 1.5, p: 1.5, bgcolor: (t) => alpha(t.palette.warning.main, 0.08), border: '1px solid', borderColor: (t) => alpha(t.palette.warning.main, 0.3), borderRadius: 2, fontSize: 12.5, color: 'warning.dark' }}>
                💡 Gerçek görünüm platforma ve cihaza göre değişebilir. Bu bir önizlemedir.
              </Box>
            </Box>
          </Box>
        )}
      </Box>

      {/* ═══ WIZARD FOOTER ═══ */}
      <Box sx={{
        position: 'fixed', bottom: 0, right: 0,
        width: 'calc(100% - 272px)',
        bgcolor: 'background.paper', borderTop: '1px solid', borderColor: 'divider',
        px: 4, py: 1.5,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 -4px 12px rgba(0,0,0,0.06)', zIndex: 5,
      }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          {currentStep > 1 && (
            <Button variant="outlined" startIcon={<BackIcon />} onClick={goBack}
              sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}
            >Geri</Button>
          )}
          <Typography variant="body2" color="text.secondary">Adım {currentStep} / {totalSteps}</Typography>
          <Typography variant="caption" color="primary.main" sx={{ cursor: 'pointer' }}
            onClick={() => enqueueSnackbar('💾 Taslak olarak kaydedildi', { variant: 'info' })}
          >Taslak kaydedildi ✓</Typography>
        </Stack>
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" onClick={() => enqueueSnackbar('💾 Taslak olarak kaydedildi', { variant: 'info' })}
            sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}
          >Taslak Kaydet</Button>
          <Button variant="contained" onClick={goNext}
            endIcon={currentStep === totalSteps ? <RocketIcon /> : <ForwardIcon />}
            sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}
          >
            {currentStep === totalSteps ? '🚀 Yayınla' : 'Devam Et →'}
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}
