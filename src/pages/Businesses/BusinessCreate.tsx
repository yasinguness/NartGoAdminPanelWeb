/**
 * BusinessCreate — 3-step guided wizard for creating businesses.
 * Step 1: Owner selection (search existing user)
 * Step 2: Business details (name, category, contact, location, images)
 * Step 3: Preview & Create
 */
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import {
  Box, Typography, Button, TextField, Stack, Paper, Chip, Divider,
  IconButton, alpha, useTheme, styled, Fade, Avatar, CircularProgress,
  LinearProgress, Select, MenuItem, FormControl, InputLabel,
} from '@mui/material';
import {
  ArrowBack as BackIcon, ArrowForward as ForwardIcon,
  CheckCircle as CheckIcon, CelebrationOutlined as CelebrationIcon,
  Close as CloseIcon, Rocket as RocketIcon, Warning as WarningIcon,
  Search as SearchIcon, Business as BusinessIcon,
} from '@mui/icons-material';
import { userService } from '../../services/user/userService';
import { useBusinessStore } from '../../store/businesses/businessStore';
import { useBusinessCategory } from '../../hooks/useBusinessCategory';
import { BusinessStatus } from '../../types/businesses/businessModel';
import type { UserDTO } from '../../types/users/userModel';

// ─── STYLED ────────────────────────────────────────────
const StepDot = styled(Box)<{ $active?: boolean; $done?: boolean }>(({ theme, $active, $done }) => ({
  width: 36, height: 36, borderRadius: '50%',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 14, fontWeight: 700, flexShrink: 0, transition: 'all 0.25s',
  ...($active && { background: theme.palette.primary.main, color: '#fff', border: `2px solid ${theme.palette.primary.main}`, boxShadow: `0 0 0 4px ${alpha(theme.palette.primary.main, 0.15)}` }),
  ...($done && { background: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main, border: `2px solid ${theme.palette.primary.main}` }),
  ...(!$active && !$done && { border: `2px solid ${theme.palette.divider}`, background: '#fff', color: theme.palette.text.disabled }),
}));

const StepLine = styled(Box)<{ $done?: boolean }>(({ theme, $done }) => ({
  flex: 1, height: 2, margin: '0 10px', transition: 'background 0.3s',
  background: $done ? theme.palette.primary.main : theme.palette.divider,
}));

const SectionCard = styled(Paper)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`, borderRadius: 16, overflow: 'hidden',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
}));

const SH = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <Box sx={{ mb: 2.5 }}>
    <Typography variant="subtitle1" fontWeight={700}>{title}</Typography>
    {subtitle && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>{subtitle}</Typography>}
  </Box>
);

export default function BusinessCreate() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { createBusinessAsAdmin, loading } = useBusinessStore();
  const { categories } = useBusinessCategory();
  const profileRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const TOTAL = 3;
  const [published, setPublished] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step 1: Owner
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserDTO[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [owner, setOwner] = useState<UserDTO | null>(null);

  // Step 2: Business details
  const [form, setForm] = useState({
    name: '', shortDescription: '', description: '', categoryId: '',
    phoneNumber: '', email: '', website: '',
    city: '', district: '', country: 'Turkiye',
  });
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  // ─── HELPERS ─────────────────────────────────────────
  const updateForm = (field: string, value: string) => setForm(p => ({ ...p, [field]: value }));
  const clearError = (key: string) => { if (errors[key]) setErrors(p => { const n = { ...p }; delete n[key]; return n; }); };

  const validate = (s: number): boolean => {
    const e: Record<string, string> = {};
    if (s === 1) {
      if (!owner) e.owner = 'Isletme sahibi secmelisiniz';
    }
    if (s === 2) {
      if (!form.name.trim()) e.name = 'Isletme adi zorunludur';
      if (!form.categoryId) e.categoryId = 'Kategori secimi zorunludur';
    }
    setErrors(e);
    if (Object.keys(e).length > 0) {
      enqueueSnackbar('Lutfen zorunlu alanlari doldurun', { variant: 'warning' });
      return false;
    }
    return true;
  };

  const goNext = () => {
    if (!validate(step)) return;
    if (step < TOTAL) setStep(step + 1);
    else handleSubmit();
  };
  const goBack = () => { if (step > 1) setStep(step - 1); };
  const goToStep = (n: number) => { if (n <= step) setStep(n); };

  const searchUsers = async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      const res = await userService.getAllUsers({ keyword: searchQuery, size: 10 });
      setSearchResults(res.data?.content || []);
    } catch { enqueueSnackbar('Arama basarisiz', { variant: 'error' }); }
    finally { setSearchLoading(false); }
  };

  const handleImage = (type: 'profile' | 'cover', file: File) => {
    if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) return;
    const url = URL.createObjectURL(file);
    if (type === 'profile') { setProfileImage(file); setProfilePreview(url); }
    else { setCoverImage(file); setCoverPreview(url); }
  };

  const handleSubmit = async () => {
    if (!validate(1) || !validate(2)) { setStep(1); return; }
    if (!owner) return;
    try {
      await createBusinessAsAdmin(owner.id, {
        name: form.name,
        shortDescription: form.shortDescription,
        description: form.description,
        categoryId: form.categoryId,
        phoneNumber: form.phoneNumber || undefined,
        email: form.email || undefined,
        website: form.website || undefined,
        status: BusinessStatus.ACTIVE,
        address: { id: '', city: form.city, district: form.district, country: form.country, isDefault: true },
      }, profileImage || undefined, coverImage || undefined);
      setPublished(true);
      enqueueSnackbar(`"${form.name}" isletmesi olusturuldu`, { variant: 'success' });
    } catch {
      enqueueSnackbar('Isletme olusturulamadi', { variant: 'error' });
    }
  };

  const stepLabels = ['Isletme Sahibi', 'Isletme Bilgileri', 'Onizleme'];
  const categoryName = categories.find(c => c.id === form.categoryId)?.name || '—';

  // ─── SUCCESS ─────────────────────────────────────────
  if (published) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 10, textAlign: 'center' }}>
        <Fade in timeout={500}>
          <Box>
            <Box sx={{ width: 88, height: 88, borderRadius: '50%', mx: 'auto', mb: 3, bgcolor: alpha(theme.palette.success.main, 0.1), border: '3px solid', borderColor: 'success.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CelebrationIcon sx={{ fontSize: 40, color: 'success.main' }} />
            </Box>
            <Typography variant="h4" fontWeight={800} sx={{ mb: 1 }}>Isletme Olusturuldu!</Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 420, mx: 'auto', mb: 4 }}>
              <strong>{form.name}</strong> isletmesi <strong>{owner?.displayName || owner?.email}</strong> adina basariyla olusturuldu.
            </Typography>
            <Stack direction="row" spacing={2} justifyContent="center">
              <Button variant="outlined" onClick={() => navigate('/businesses')} sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 600, px: 3 }}>Isletmelere Don</Button>
              <Button variant="contained" onClick={() => { setPublished(false); setStep(1); setOwner(null); setForm({ name: '', shortDescription: '', description: '', categoryId: '', phoneNumber: '', email: '', website: '', city: '', district: '', country: 'Turkiye' }); setProfileImage(null); setProfilePreview(null); setCoverImage(null); setCoverPreview(null); }}
                sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 600, px: 3 }}>+ Yeni Isletme</Button>
            </Stack>
          </Box>
        </Fade>
      </Box>
    );
  }

  // ─── MAIN ────────────────────────────────────────────
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 64px)' }}>
      {/* Header */}
      <Box sx={{ bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider', px: 4, py: 2, position: 'sticky', top: 64, zIndex: 5 }}>
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 1.5, cursor: 'pointer' }} onClick={() => navigate('/businesses')}>
          <BackIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
          <Typography variant="caption" color="text.secondary" sx={{ '&:hover': { color: 'primary.main' } }}>Isletmelere Don</Typography>
        </Stack>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h6" fontWeight={800}>{stepLabels[step - 1]}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
              {step === 1 ? 'Isletmenin sahibi olacak kullaniciyi secin'
                : step === 2 ? 'Isletmenin temel bilgilerini, iletisim ve konum detaylarini girin'
                : 'Bilgileri gozden gecirin ve isletmeyi olusturun'}
            </Typography>
          </Box>
          <Chip label={`${step} / ${TOTAL}`} size="small" variant="outlined" sx={{ fontWeight: 700, fontFamily: 'monospace' }} />
        </Stack>
        <Stack direction="row" alignItems="center" sx={{ maxWidth: 500 }}>
          {[1, 2, 3].map((s, i) => (
            <Box key={s} sx={{ display: 'flex', alignItems: 'center', flex: i < 2 ? 1 : 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: s <= step ? 'pointer' : 'default' }} onClick={() => goToStep(s)}>
                <StepDot $active={s === step} $done={s < step}>{s < step ? <CheckIcon sx={{ fontSize: 16 }} /> : s}</StepDot>
                <Typography variant="caption" fontWeight={600} sx={{ display: { xs: 'none', md: 'block' }, color: s === step ? 'primary.main' : s < step ? 'text.secondary' : 'text.disabled', whiteSpace: 'nowrap' }}>{stepLabels[i]}</Typography>
              </Box>
              {i < 2 && <StepLine $done={s < step} />}
            </Box>
          ))}
        </Stack>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, px: 4, py: 3.5, pb: 12, maxWidth: 820, width: '100%', animation: 'fadeUp 0.2s ease',
        '@keyframes fadeUp': { from: { opacity: 0, transform: 'translateY(6px)' }, to: { opacity: 1, transform: 'none' } },
      }}>

        {/* ─── STEP 1: SAHİP ─── */}
        {step === 1 && (
          <Stack spacing={3}>
            <SH title="Isletme sahibini secin" subtitle="Kullanici adina veya e-postasina gore arayin. Bu kullanici isletmenin sahibi olarak atanacak." />

            <Stack direction="row" spacing={1}>
              <TextField fullWidth placeholder="E-posta veya isim ile ara..." value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') searchUsers(); }}
                size="small" />
              <Button variant="contained" onClick={searchUsers} disabled={searchLoading}
                sx={{ textTransform: 'none', borderRadius: 2, px: 3, whiteSpace: 'nowrap' }}>
                {searchLoading ? <CircularProgress size={20} color="inherit" /> : 'Ara'}
              </Button>
            </Stack>
            {errors.owner && <Typography variant="caption" color="error">{errors.owner}</Typography>}

            {searchResults.length > 0 && (
              <SectionCard>
                {searchResults.map(user => {
                  const sel = owner?.id === user.id;
                  return (
                    <Stack key={user.id} direction="row" spacing={1.5} alignItems="center"
                      onClick={() => { setOwner(user); clearError('owner'); }}
                      sx={{
                        px: 2.5, py: 1.5, cursor: 'pointer', borderBottom: '1px solid', borderColor: 'divider',
                        bgcolor: sel ? alpha(theme.palette.primary.main, 0.06) : 'transparent',
                        '&:last-child': { borderBottom: 'none' }, '&:hover': { bgcolor: sel ? undefined : 'grey.50' },
                      }}>
                      <Avatar src={user.imageUrl} sx={{ width: 36, height: 36, fontSize: 14 }}>
                        {(user.firstName || user.email)?.[0]}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight={600}>{user.displayName || `${user.firstName || ''} ${user.lastName || ''}`}</Typography>
                        <Typography variant="caption" color="text.secondary">{user.email}</Typography>
                      </Box>
                      {sel && <CheckIcon sx={{ fontSize: 20, color: 'primary.main' }} />}
                    </Stack>
                  );
                })}
              </SectionCard>
            )}

            {owner && (
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, bgcolor: alpha(theme.palette.success.main, 0.04), borderColor: alpha(theme.palette.success.main, 0.3) }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar src={owner.imageUrl} sx={{ width: 44, height: 44, bgcolor: alpha('#10b981', 0.15), color: '#10b981', fontWeight: 700 }}>
                    {owner.firstName?.[0]}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight={700}>{owner.displayName || `${owner.firstName} ${owner.lastName}`}</Typography>
                    <Typography variant="caption" color="text.secondary">{owner.email}</Typography>
                  </Box>
                  <Chip label="Sahip" size="small" color="success" variant="outlined" sx={{ fontWeight: 600 }} />
                  <IconButton size="small" onClick={() => setOwner(null)}><CloseIcon fontSize="small" /></IconButton>
                </Stack>
              </Paper>
            )}

            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: alpha(theme.palette.info.main, 0.04), borderColor: alpha(theme.palette.info.main, 0.2) }}>
              <Typography variant="body2" color="info.dark" sx={{ fontSize: 13 }}>
                💡 <strong>Ipucu:</strong> Kullanici bulunamazsa once <strong>Dernekler → Yeni Dernek Olustur</strong> sayfasindan yeni hesap tanimlayabilirsiniz.
              </Typography>
            </Paper>
          </Stack>
        )}

        {/* ─── STEP 2: İŞLETME BİLGİLERİ ─── */}
        {step === 2 && (
          <Stack spacing={3.5}>
            {owner && (
              <Paper variant="outlined" sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, borderRadius: 2.5, bgcolor: 'grey.50' }}>
                <Avatar src={owner.imageUrl} sx={{ width: 36, height: 36 }}>{owner.firstName?.[0]}</Avatar>
                <Box>
                  <Typography variant="body2" fontWeight={700}>Sahip: {owner.displayName || owner.firstName}</Typography>
                  <Typography variant="caption" color="text.secondary">{owner.email}</Typography>
                </Box>
              </Paper>
            )}

            <Box>
              <SH title="Temel Bilgiler" subtitle="Isletmenin adi, aciklamasi ve kategorisini belirleyin." />
              <Stack spacing={2}>
                <TextField fullWidth label="Isletme Adi" required value={form.name}
                  onChange={e => { updateForm('name', e.target.value); clearError('name'); }}
                  error={!!errors.name} helperText={errors.name} />
                <TextField fullWidth label="Kisa Aciklama" value={form.shortDescription}
                  onChange={e => updateForm('shortDescription', e.target.value)} placeholder="Tek cumlelik aciklama" />
                <TextField fullWidth multiline rows={3} label="Detayli Aciklama" value={form.description}
                  onChange={e => updateForm('description', e.target.value)} />
                <FormControl fullWidth>
                  <InputLabel>Kategori *</InputLabel>
                  <Select value={form.categoryId} label="Kategori *"
                    onChange={e => { updateForm('categoryId', e.target.value); clearError('categoryId'); }}
                    error={!!errors.categoryId}>
                    {categories.map(cat => <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>)}
                  </Select>
                  {errors.categoryId && <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>{errors.categoryId}</Typography>}
                </FormControl>
              </Stack>
            </Box>

            <Divider />

            <Box>
              <SH title="Iletisim & Konum" />
              <Stack spacing={2}>
                <Stack direction="row" spacing={2}>
                  <TextField fullWidth label="Telefon" value={form.phoneNumber} onChange={e => updateForm('phoneNumber', e.target.value)} placeholder="+90 5XX..." />
                  <TextField fullWidth label="E-posta" value={form.email} onChange={e => updateForm('email', e.target.value)} />
                </Stack>
                <TextField fullWidth label="Web Sitesi" value={form.website} onChange={e => updateForm('website', e.target.value)} placeholder="https://" />
                <Divider />
                <Stack direction="row" spacing={2}>
                  <TextField fullWidth label="Ulke" value={form.country} onChange={e => updateForm('country', e.target.value)} />
                  <TextField fullWidth label="Sehir" value={form.city} onChange={e => updateForm('city', e.target.value)} />
                  <TextField fullWidth label="Ilce" value={form.district} onChange={e => updateForm('district', e.target.value)} />
                </Stack>
              </Stack>
            </Box>

            <Divider />

            <Box>
              <SH title="Gorseller" subtitle="Profil ve kapak gorseli yukleyin (opsiyonel)." />
              <input type="file" accept="image/*" ref={profileRef} onChange={e => { if (e.target.files?.[0]) handleImage('profile', e.target.files[0]); }} style={{ display: 'none' }} />
              <input type="file" accept="image/*" ref={coverRef} onChange={e => { if (e.target.files?.[0]) handleImage('cover', e.target.files[0]); }} style={{ display: 'none' }} />
              <Stack direction="row" spacing={2}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 1, display: 'block' }}>PROFIL</Typography>
                  {profilePreview ? (
                    <Box sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                      <Box component="img" src={profilePreview} sx={{ width: '100%', height: 120, objectFit: 'cover' }} />
                      <IconButton size="small" onClick={() => { setProfileImage(null); setProfilePreview(null); }}
                        sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(0,0,0,0.5)', color: 'white' }}>
                        <CloseIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Box>
                  ) : (
                    <Button fullWidth variant="outlined" onClick={() => profileRef.current?.click()}
                      sx={{ py: 4, borderStyle: 'dashed', borderRadius: 2, textTransform: 'none', color: 'text.secondary' }}>
                      Profil Gorseli
                    </Button>
                  )}
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 1, display: 'block' }}>KAPAK</Typography>
                  {coverPreview ? (
                    <Box sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                      <Box component="img" src={coverPreview} sx={{ width: '100%', height: 120, objectFit: 'cover' }} />
                      <IconButton size="small" onClick={() => { setCoverImage(null); setCoverPreview(null); }}
                        sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(0,0,0,0.5)', color: 'white' }}>
                        <CloseIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Box>
                  ) : (
                    <Button fullWidth variant="outlined" onClick={() => coverRef.current?.click()}
                      sx={{ py: 4, borderStyle: 'dashed', borderRadius: 2, textTransform: 'none', color: 'text.secondary' }}>
                      Kapak Gorseli
                    </Button>
                  )}
                </Box>
              </Stack>
            </Box>
          </Stack>
        )}

        {/* ─── STEP 3: ÖNİZLEME ─── */}
        {step === 3 && (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
            <Stack spacing={2}>
              <SH title="Isletme Ozeti" subtitle="Bilgileri gozden gecirin ve isletmeyi olusturun." />

              <SectionCard>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="subtitle2" fontWeight={700}>Sahip</Typography>
                  <Button size="small" onClick={() => goToStep(1)} sx={{ textTransform: 'none', fontSize: 12 }}>Degistir</Button>
                </Box>
                <Box sx={{ px: 2.5, py: 1.5 }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar src={owner?.imageUrl} sx={{ width: 36, height: 36 }}>{owner?.firstName?.[0]}</Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>{owner?.displayName || owner?.firstName}</Typography>
                      <Typography variant="caption" color="text.secondary">{owner?.email}</Typography>
                    </Box>
                  </Stack>
                </Box>
              </SectionCard>

              <SectionCard>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="subtitle2" fontWeight={700}>Isletme Bilgileri</Typography>
                  <Button size="small" onClick={() => goToStep(2)} sx={{ textTransform: 'none', fontSize: 12 }}>Duzenle</Button>
                </Box>
                {[
                  { label: 'Isletme Adi', value: form.name || '—' },
                  { label: 'Kategori', value: categoryName },
                  { label: 'Telefon', value: form.phoneNumber || '—' },
                  { label: 'E-posta', value: form.email || '—' },
                  { label: 'Website', value: form.website || '—' },
                  { label: 'Konum', value: [form.city, form.district, form.country].filter(Boolean).join(', ') || '—' },
                ].map((r, i) => (
                  <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', px: 2.5, py: 1.2, borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 'none' } }}>
                    <Typography variant="body2" color="text.secondary">{r.label}</Typography>
                    <Typography variant="body2" fontWeight={600}>{r.value}</Typography>
                  </Box>
                ))}
              </SectionCard>

              <SectionCard>
                <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="subtitle2" fontWeight={700}>Kontrol Listesi</Typography>
                </Box>
                <Stack sx={{ p: 2 }} spacing={1}>
                  {[
                    { ok: !!owner, text: 'Isletme sahibi secildi' },
                    { ok: !!form.name, text: 'Isletme adi girildi' },
                    { ok: !!form.categoryId, text: 'Kategori secildi' },
                    { ok: !!profileImage, text: profileImage ? 'Profil gorseli yuklendi' : 'Profil gorseli yuklenmedi', opt: !profileImage },
                    { ok: !!form.description, text: form.description ? 'Aciklama eklendi' : 'Aciklama eklenmedi', opt: !form.description },
                  ].map((c, i) => (
                    <Stack key={i} direction="row" spacing={1} alignItems="center">
                      {c.ok ? <CheckIcon sx={{ fontSize: 18, color: 'success.main' }} /> : <WarningIcon sx={{ fontSize: 18, color: 'warning.main' }} />}
                      <Typography variant="body2" sx={{ color: c.ok ? 'text.primary' : 'text.secondary' }}>
                        {c.text}
                        {c.opt && <Typography component="span" variant="caption" color="text.disabled" sx={{ ml: 0.5 }}>(opsiyonel)</Typography>}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </SectionCard>
            </Stack>

            {/* Preview */}
            <Box sx={{ position: 'sticky', top: 200, alignSelf: 'start' }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>Isletme Karti</Typography>
              <SectionCard>
                {coverPreview && <Box component="img" src={coverPreview} sx={{ width: '100%', height: 120, objectFit: 'cover' }} />}
                <Box sx={{ px: 3, py: 2.5, textAlign: 'center' }}>
                  {profilePreview ? (
                    <Avatar src={profilePreview} sx={{ width: 64, height: 64, mx: 'auto', mb: 1.5, mt: coverPreview ? -4 : 0, border: '3px solid white', boxShadow: 1 }} />
                  ) : (
                    <Avatar sx={{ width: 64, height: 64, mx: 'auto', mb: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main' }}>
                      <BusinessIcon sx={{ fontSize: 32 }} />
                    </Avatar>
                  )}
                  <Typography variant="h6" fontWeight={800}>{form.name || 'Isletme Adi'}</Typography>
                  {form.shortDescription && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{form.shortDescription}</Typography>}
                  <Chip label={categoryName} size="small" color="primary" variant="outlined" sx={{ mt: 1.5, fontWeight: 600 }} />
                </Box>
                <Divider />
                <Box sx={{ px: 3, py: 2 }}>
                  {[
                    form.city && `📍 ${form.city}${form.district ? ', ' + form.district : ''}`,
                    form.email && `✉️ ${form.email}`,
                    form.phoneNumber && `📞 ${form.phoneNumber}`,
                    form.website && `🌐 ${form.website}`,
                  ].filter(Boolean).map((line, i) => (
                    <Typography key={i} variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>{line}</Typography>
                  ))}
                </Box>
              </SectionCard>
            </Box>
          </Box>
        )}
      </Box>

      {/* Footer */}
      <Box sx={{
        position: 'fixed', bottom: 0, right: 0, width: 'calc(100% - 272px)',
        bgcolor: 'background.paper', borderTop: '1px solid', borderColor: 'divider',
        px: 4, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 -4px 12px rgba(0,0,0,0.05)', zIndex: 5,
      }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          {step > 1 && <Button variant="outlined" startIcon={<BackIcon />} onClick={goBack} sx={{ textTransform: 'none', borderRadius: 2.5, fontWeight: 600 }}>Geri</Button>}
          <LinearProgress variant="determinate" value={(step / TOTAL) * 100} sx={{ width: 120, height: 6, borderRadius: 3, bgcolor: 'grey.200', '& .MuiLinearProgress-bar': { borderRadius: 3 } }} />
          <Typography variant="caption" color="text.secondary" fontWeight={600}>Adim {step} / {TOTAL}</Typography>
        </Stack>
        <Button variant="contained" onClick={goNext} disabled={loading}
          endIcon={step === TOTAL ? <RocketIcon /> : <ForwardIcon />}
          sx={{ textTransform: 'none', borderRadius: 2.5, fontWeight: 600, px: 3 }}>
          {loading ? 'Olusturuluyor...' : step === TOTAL ? 'Isletmeyi Olustur' : 'Devam Et'}
        </Button>
      </Box>
    </Box>
  );
}
