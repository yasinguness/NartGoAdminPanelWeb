/**
 * AssociationCreatePage — 3-step guided wizard for creating associations.
 * Step 1: Account (create BUSINESS user or select existing)
 * Step 2: Association details (name, contact, images, membership)
 * Step 3: Preview & Create
 */
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import {
  Box, Typography, Button, TextField, Stack, Paper, Chip, Switch, Divider,
  IconButton, alpha, useTheme, styled, Fade, Avatar, CircularProgress,
  LinearProgress, Select, MenuItem, FormControl, InputLabel,
} from '@mui/material';
import {
  ArrowBack as BackIcon, ArrowForward as ForwardIcon,
  CheckCircle as CheckIcon, CelebrationOutlined as CelebrationIcon,
  ContentCopy as CopyIcon, Close as CloseIcon, Rocket as RocketIcon,
  Warning as WarningIcon, PersonAdd as PersonAddIcon, Search as SearchIcon,
  Groups as GroupsIcon,
} from '@mui/icons-material';
import { userService } from '../../services/user/userService';
import { associationService } from '../../services/association/associationService';
import type { UserDTO } from '../../types/users/userModel';
import type { AssociationCreateRequest } from '../../types/association/associationCreateRequest';

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

// ─── TYPES ─────────────────────────────────────────────
type AccountMode = 'new' | 'existing';

export default function AssociationCreatePage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const logoRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const TOTAL = 3;
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step 1: Account
  const [accountMode, setAccountMode] = useState<AccountMode | null>(null);
  const [newAccount, setNewAccount] = useState({ email: '', password: '', firstName: '', lastName: '', companyName: '', gsmNo: '' });
  const [existingSearch, setExistingSearch] = useState('');
  const [searchResults, setSearchResults] = useState<UserDTO[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserDTO | null>(null);
  const [createdUser, setCreatedUser] = useState<UserDTO | null>(null);

  // Step 2: Association details
  const [assocName, setAssocName] = useState('');
  const [assocShortDesc, setAssocShortDesc] = useState('');
  const [assocDescription, setAssocDescription] = useState('');
  const [assocTaxNumber, setAssocTaxNumber] = useState('');
  const [assocEmail, setAssocEmail] = useState('');
  const [assocPhone, setAssocPhone] = useState('');
  const [assocWhatsapp, setAssocWhatsapp] = useState('');
  const [assocWebsite, setAssocWebsite] = useState('');
  const [assocCity, setAssocCity] = useState('');
  const [assocDistrict, setAssocDistrict] = useState('');
  const [membershipFee, setMembershipFee] = useState<number>(0);
  const [membershipDuration, setMembershipDuration] = useState<number>(12);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  // ─── HELPERS ─────────────────────────────────────────
  const clearError = (key: string) => { if (errors[key]) setErrors(p => { const n = { ...p }; delete n[key]; return n; }); };

  const ownerUser = accountMode === 'new' ? createdUser : selectedUser;

  const validate = (s: number): boolean => {
    const e: Record<string, string> = {};
    if (s === 1) {
      if (!accountMode) { e.accountMode = 'Hesap turunu secin'; }
      else if (accountMode === 'new') {
        if (!newAccount.email.trim()) e.email = 'E-posta zorunludur';
        if (!newAccount.password || newAccount.password.length < 6) e.password = 'Sifre en az 6 karakter olmalidir';
        if (!newAccount.firstName.trim()) e.firstName = 'Ad zorunludur';
      } else {
        if (!selectedUser) e.selectedUser = 'Bir kullanici secmelisiniz';
      }
    }
    if (s === 2) {
      if (!assocName.trim()) e.assocName = 'Dernek adi zorunludur';
    }
    setErrors(e);
    if (Object.keys(e).length > 0) {
      enqueueSnackbar('Lutfen zorunlu alanlari doldurun', { variant: 'warning' });
      return false;
    }
    return true;
  };

  const goNext = async () => {
    if (!validate(step)) return;

    // Step 1 → 2: Create new user if needed
    if (step === 1 && accountMode === 'new' && !createdUser) {
      setPublishing(true);
      try {
        const user = await userService.createUserAsAdmin({
          email: newAccount.email,
          password: newAccount.password,
          firstName: newAccount.firstName,
          lastName: newAccount.lastName || undefined,
          displayName: newAccount.companyName || `${newAccount.firstName} ${newAccount.lastName || ''}`.trim(),
          gsmNo: newAccount.gsmNo || undefined,
          accountType: 'BUSINESS' as any,
          companyName: newAccount.companyName || undefined,
        });
        setCreatedUser(user);
        enqueueSnackbar(`Hesap olusturuldu: ${user.email}`, { variant: 'success' });
        setStep(2);
      } catch (err: any) {
        enqueueSnackbar(err?.response?.data?.message || 'Hesap olusturulamadi', { variant: 'error' });
      } finally {
        setPublishing(false);
      }
      return;
    }

    if (step < TOTAL) setStep(step + 1);
    else handlePublish();
  };

  const goBack = () => { if (step > 1) setStep(step - 1); };
  const goToStep = (n: number) => { if (n <= step) setStep(n); };

  // ─── SEARCH EXISTING USERS ───────────────────────────
  const searchUsers = async () => {
    if (!existingSearch.trim()) return;
    setSearchLoading(true);
    try {
      const res = await userService.getAllUsers({ keyword: existingSearch, size: 10 });
      setSearchResults(res.data?.content || []);
    } catch {
      enqueueSnackbar('Kullanici aranamadi', { variant: 'error' });
    } finally { setSearchLoading(false); }
  };

  // ─── IMAGE HANDLERS ──────────────────────────────────
  const handleImage = (type: 'logo' | 'cover', file: File) => {
    if (!file.type.startsWith('image/')) return;
    if (file.size > 10 * 1024 * 1024) { enqueueSnackbar('Dosya 10MB\'i asamaz', { variant: 'warning' }); return; }
    const url = URL.createObjectURL(file);
    if (type === 'logo') { setLogoFile(file); setLogoPreview(url); }
    else { setCoverFile(file); setCoverPreview(url); }
  };

  // ─── PUBLISH ─────────────────────────────────────────
  const handlePublish = async () => {
    if (!validate(1) || !validate(2)) { setStep(1); return; }
    if (!ownerUser) { enqueueSnackbar('Hesap sahibi bulunamadi', { variant: 'error' }); setStep(1); return; }

    setPublishing(true);
    try {
      const request: AssociationCreateRequest = {
        name: assocName,
        ownerId: ownerUser.id,
        shortDescription: assocShortDesc || undefined,
        description: assocDescription || undefined,
        taxNumber: assocTaxNumber || undefined,
        email: assocEmail || undefined,
        phoneNumber: assocPhone || undefined,
        whatsappNumber: assocWhatsapp || undefined,
        website: assocWebsite || undefined,
        membershipFee: membershipFee > 0 ? membershipFee : undefined,
        membershipDurationMonths: membershipDuration,
        hasSubscriptionSystem: hasSubscription,
        address: (assocCity || assocDistrict) ? {
          id: '',
          city: assocCity,
          district: assocDistrict,
          country: 'Turkiye',
          isDefault: true,
        } as any : undefined,
      };

      await associationService.createAssociation(request, logoFile || undefined, coverFile || undefined);
      setPublished(true);
      enqueueSnackbar('Dernek basariyla olusturuldu!', { variant: 'success' });
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Dernek olusturulamadi', { variant: 'error' });
    } finally {
      setPublishing(false);
    }
  };

  const stepLabels = ['Hesap Tanimlama', 'Dernek Bilgileri', 'Onizleme'];

  // ─── SUCCESS ─────────────────────────────────────────
  if (published) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 10, textAlign: 'center' }}>
        <Fade in timeout={500}>
          <Box>
            <Box sx={{ width: 88, height: 88, borderRadius: '50%', mx: 'auto', mb: 3, bgcolor: alpha(theme.palette.success.main, 0.1), border: '3px solid', borderColor: 'success.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CelebrationIcon sx={{ fontSize: 40, color: 'success.main' }} />
            </Box>
            <Typography variant="h4" fontWeight={800} letterSpacing={-0.5} sx={{ mb: 1 }}>Dernek Olusturuldu!</Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 420, mx: 'auto', mb: 4 }}>
              <strong>{assocName}</strong> basariyla olusturuldu ve <strong>{ownerUser?.email}</strong> hesabina tanimlandi.
            </Typography>
            <Stack direction="row" spacing={2} justifyContent="center">
              <Button variant="outlined" onClick={() => navigate('/associations')} sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 600, px: 3 }}>
                Derneklere Don
              </Button>
              <Button variant="contained" onClick={() => { setPublished(false); setStep(1); setAccountMode(null); setCreatedUser(null); setSelectedUser(null); setAssocName(''); setAssocDescription(''); }}
                sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 600, px: 3 }}>
                + Yeni Dernek Olustur
              </Button>
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
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 1.5, cursor: 'pointer' }} onClick={() => navigate('/associations')}>
          <BackIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
          <Typography variant="caption" color="text.secondary" sx={{ '&:hover': { color: 'primary.main' } }}>Derneklere Don</Typography>
        </Stack>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h6" fontWeight={800}>{stepLabels[step - 1]}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
              {step === 1 ? 'Dernek icin bir isletme hesabi tanimlayin veya mevcut bir hesap secin'
                : step === 2 ? 'Dernegin temel bilgilerini, iletisim ve uyelik ayarlarini girin'
                : 'Bilgileri gozden gecirin ve dernegi olusturun'}
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

        {/* ─── STEP 1: HESAP ─── */}
        {step === 1 && (
          <Stack spacing={3}>
            <SH title="Dernek hesabi nasil tanimlanacak?" subtitle="Yeni bir isletme hesabi olusturabilir veya mevcut bir kullaniciyi secebilirsiniz." />

            <Stack spacing={2}>
              {([
                { key: 'new' as AccountMode, icon: <PersonAddIcon sx={{ fontSize: 28 }} />, name: 'Yeni Hesap Olustur', desc: 'Dernek icin yeni bir isletme (BUSINESS) hesabi tanimla. E-posta, sifre ve temel bilgiler girilir.', color: theme.palette.primary.main },
                { key: 'existing' as AccountMode, icon: <SearchIcon sx={{ fontSize: 28 }} />, name: 'Mevcut Hesap Sec', desc: 'Zaten kayitli olan bir kullaniciyi dernegin sahibi olarak ata.', color: theme.palette.info.main },
              ]).map(opt => {
                const sel = accountMode === opt.key;
                return (
                  <Paper key={opt.key} variant="outlined"
                    onClick={() => { setAccountMode(opt.key); clearError('accountMode'); }}
                    sx={{
                      p: 3, borderRadius: 3, cursor: 'pointer', transition: 'all 0.15s',
                      border: '2px solid', borderColor: sel ? opt.color : 'divider',
                      bgcolor: sel ? alpha(opt.color, 0.04) : 'transparent',
                      boxShadow: sel ? `0 0 0 3px ${alpha(opt.color, 0.12)}` : 'none',
                      '&:hover': { borderColor: sel ? opt.color : alpha(opt.color, 0.4) },
                    }}>
                    <Stack direction="row" spacing={2.5} alignItems="flex-start">
                      <Box sx={{ width: 56, height: 56, borderRadius: 3, bgcolor: alpha(opt.color, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', color: opt.color, flexShrink: 0 }}>
                        {opt.icon}
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                          <Typography variant="subtitle1" fontWeight={700}>{opt.name}</Typography>
                          {sel && <Chip label="Secildi" size="small" sx={{ height: 22, fontWeight: 700, bgcolor: opt.color, color: '#fff' }} />}
                        </Stack>
                        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>{opt.desc}</Typography>
                      </Box>
                      <Box sx={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid', borderColor: sel ? opt.color : 'text.disabled', display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 0.5, flexShrink: 0 }}>
                        {sel && <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: opt.color }} />}
                      </Box>
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>
            {errors.accountMode && <Typography variant="caption" color="error">{errors.accountMode}</Typography>}

            {/* New account form */}
            {accountMode === 'new' && (
              <>
                <Divider />
                <SH title="Yeni Isletme Hesabi" subtitle="Bu bilgilerle Keycloak + veritabaninda yeni bir BUSINESS hesap olusturulur." />
                {createdUser ? (
                  <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, bgcolor: alpha(theme.palette.success.main, 0.04), borderColor: alpha(theme.palette.success.main, 0.3) }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Avatar sx={{ width: 44, height: 44, bgcolor: alpha(theme.palette.success.main, 0.15), color: 'success.main', fontWeight: 700 }}>
                        {createdUser.firstName?.[0] || '?'}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight={700}>{createdUser.displayName || createdUser.firstName}</Typography>
                        <Typography variant="caption" color="text.secondary">{createdUser.email}</Typography>
                      </Box>
                      <Chip label="Hesap Olusturuldu" size="small" color="success" variant="outlined" sx={{ fontWeight: 600 }} />
                    </Stack>
                  </Paper>
                ) : (
                  <Stack spacing={2}>
                    <Stack direction="row" spacing={2}>
                      <TextField fullWidth label="Ad" required value={newAccount.firstName}
                        onChange={e => { setNewAccount(p => ({ ...p, firstName: e.target.value })); clearError('firstName'); }}
                        error={!!errors.firstName} helperText={errors.firstName} />
                      <TextField fullWidth label="Soyad" value={newAccount.lastName}
                        onChange={e => setNewAccount(p => ({ ...p, lastName: e.target.value }))} />
                    </Stack>
                    <TextField fullWidth label="E-posta" required type="email" value={newAccount.email}
                      onChange={e => { setNewAccount(p => ({ ...p, email: e.target.value })); clearError('email'); }}
                      error={!!errors.email} helperText={errors.email} placeholder="dernek@ornek.com" />
                    <TextField fullWidth label="Sifre" required type="password" value={newAccount.password}
                      onChange={e => { setNewAccount(p => ({ ...p, password: e.target.value })); clearError('password'); }}
                      error={!!errors.password} helperText={errors.password || 'En az 6 karakter'} />
                    <Stack direction="row" spacing={2}>
                      <TextField fullWidth label="Kurum / Dernek Adi (opsiyonel)" value={newAccount.companyName}
                        onChange={e => setNewAccount(p => ({ ...p, companyName: e.target.value }))} placeholder="Ornek Spor Dernegi" />
                      <TextField fullWidth label="Telefon (opsiyonel)" value={newAccount.gsmNo}
                        onChange={e => setNewAccount(p => ({ ...p, gsmNo: e.target.value }))} placeholder="+90 5XX..." />
                    </Stack>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: alpha(theme.palette.info.main, 0.04), borderColor: alpha(theme.palette.info.main, 0.2) }}>
                      <Typography variant="body2" color="info.dark" sx={{ fontSize: 13 }}>
                        💡 Bu hesap <strong>BUSINESS</strong> tipinde olusturulacak. Keycloak'ta da kullanici ve role_business rolu tanimlanir.
                      </Typography>
                    </Paper>
                  </Stack>
                )}
              </>
            )}

            {/* Existing user search */}
            {accountMode === 'existing' && (
              <>
                <Divider />
                <SH title="Mevcut Kullanici Sec" subtitle="Kullanici adina veya e-postasina gore arayin." />
                <Stack direction="row" spacing={1}>
                  <TextField fullWidth placeholder="E-posta veya isim ile ara..." value={existingSearch}
                    onChange={e => setExistingSearch(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') searchUsers(); }}
                    size="small" />
                  <Button variant="contained" onClick={searchUsers} disabled={searchLoading}
                    sx={{ textTransform: 'none', borderRadius: 2, px: 3, whiteSpace: 'nowrap' }}>
                    {searchLoading ? <CircularProgress size={20} color="inherit" /> : 'Ara'}
                  </Button>
                </Stack>
                {errors.selectedUser && <Typography variant="caption" color="error">{errors.selectedUser}</Typography>}

                {searchResults.length > 0 && (
                  <SectionCard>
                    {searchResults.map(user => {
                      const sel = selectedUser?.id === user.id;
                      return (
                        <Stack key={user.id} direction="row" spacing={1.5} alignItems="center"
                          onClick={() => { setSelectedUser(user); clearError('selectedUser'); }}
                          sx={{
                            px: 2.5, py: 1.5, cursor: 'pointer', borderBottom: '1px solid', borderColor: 'divider',
                            bgcolor: sel ? alpha(theme.palette.primary.main, 0.06) : 'transparent',
                            '&:last-child': { borderBottom: 'none' }, '&:hover': { bgcolor: sel ? undefined : 'grey.50' },
                          }}>
                          <Avatar src={user.imageUrl} sx={{ width: 36, height: 36, fontSize: 14, fontWeight: 700 }}>
                            {(user.firstName || user.email)?.[0]}
                          </Avatar>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" fontWeight={600}>{user.displayName || `${user.firstName || ''} ${user.lastName || ''}`}</Typography>
                            <Typography variant="caption" color="text.secondary">{user.email}</Typography>
                          </Box>
                          <Chip label={user.accountType || 'INDIVIDUAL'} size="small" variant="outlined" sx={{ fontSize: 10, height: 20 }} />
                          {sel && <CheckIcon sx={{ fontSize: 20, color: 'primary.main' }} />}
                        </Stack>
                      );
                    })}
                  </SectionCard>
                )}

                {selectedUser && (
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: alpha(theme.palette.success.main, 0.04), borderColor: alpha(theme.palette.success.main, 0.3) }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Avatar src={selectedUser.imageUrl} sx={{ width: 40, height: 40 }}>
                        {selectedUser.firstName?.[0]}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight={700}>{selectedUser.displayName || selectedUser.firstName}</Typography>
                        <Typography variant="caption" color="text.secondary">{selectedUser.email}</Typography>
                      </Box>
                      <IconButton size="small" onClick={() => setSelectedUser(null)}>
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Paper>
                )}
              </>
            )}
          </Stack>
        )}

        {/* ─── STEP 2: DERNEK BİLGİLERİ ─── */}
        {step === 2 && (
          <Stack spacing={3.5}>
            {/* Owner reminder */}
            {ownerUser && (
              <Paper variant="outlined" sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, borderRadius: 2.5, bgcolor: 'grey.50' }}>
                <Avatar sx={{ width: 36, height: 36, fontSize: 14 }}>{ownerUser.firstName?.[0]}</Avatar>
                <Box>
                  <Typography variant="body2" fontWeight={700}>Hesap Sahibi: {ownerUser.displayName || ownerUser.firstName}</Typography>
                  <Typography variant="caption" color="text.secondary">{ownerUser.email}</Typography>
                </Box>
              </Paper>
            )}

            {/* Basic info */}
            <Box>
              <SH title="Dernek Bilgileri" subtitle="Dernegin adi, aciklamasi ve resmi bilgilerini girin." />
              <Stack spacing={2}>
                <TextField fullWidth label="Dernek Adi" required value={assocName}
                  onChange={e => { setAssocName(e.target.value); clearError('assocName'); }}
                  error={!!errors.assocName} helperText={errors.assocName} placeholder="Orn: Amatour Spor Dernegi" />
                <TextField fullWidth label="Vergi Numarasi (opsiyonel)" value={assocTaxNumber}
                  onChange={e => setAssocTaxNumber(e.target.value)} placeholder="Resmi vergi kimlik numarasi" />
                <TextField fullWidth label="Kisa Aciklama" value={assocShortDesc}
                  onChange={e => setAssocShortDesc(e.target.value)} placeholder="Dernegi kisaca tanitin" />
                <TextField fullWidth multiline rows={3} label="Detayli Aciklama (opsiyonel)" value={assocDescription}
                  onChange={e => setAssocDescription(e.target.value)} placeholder="Kurulus amaclari, faaliyetler..." />
              </Stack>
            </Box>

            <Divider />

            {/* Contact */}
            <Box>
              <SH title="Iletisim Bilgileri" />
              <Stack spacing={2}>
                <Stack direction="row" spacing={2}>
                  <TextField fullWidth label="E-posta" value={assocEmail} onChange={e => setAssocEmail(e.target.value)} placeholder="info@dernek.org" />
                  <TextField fullWidth label="Telefon" value={assocPhone} onChange={e => setAssocPhone(e.target.value)} placeholder="+90 XXX..." />
                </Stack>
                <Stack direction="row" spacing={2}>
                  <TextField fullWidth label="WhatsApp" value={assocWhatsapp} onChange={e => setAssocWhatsapp(e.target.value)} />
                  <TextField fullWidth label="Website" value={assocWebsite} onChange={e => setAssocWebsite(e.target.value)} placeholder="https://" />
                </Stack>
              </Stack>
            </Box>

            <Divider />

            {/* Location */}
            <Box>
              <SH title="Konum" />
              <Stack direction="row" spacing={2}>
                <TextField fullWidth label="Sehir" value={assocCity} onChange={e => setAssocCity(e.target.value)} />
                <TextField fullWidth label="Ilce" value={assocDistrict} onChange={e => setAssocDistrict(e.target.value)} />
              </Stack>
            </Box>

            <Divider />

            {/* Images */}
            <Box>
              <SH title="Gorseller" subtitle="Logo ve kapak gorseli yukleyin (opsiyonel)." />
              <input type="file" accept="image/*" ref={logoRef} onChange={e => { if (e.target.files?.[0]) handleImage('logo', e.target.files[0]); }} style={{ display: 'none' }} />
              <input type="file" accept="image/*" ref={coverRef} onChange={e => { if (e.target.files?.[0]) handleImage('cover', e.target.files[0]); }} style={{ display: 'none' }} />
              <Stack direction="row" spacing={2}>
                {/* Logo */}
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 1, display: 'block' }}>LOGO</Typography>
                  {logoPreview ? (
                    <Box sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                      <Box component="img" src={logoPreview} sx={{ width: '100%', height: 120, objectFit: 'cover' }} />
                      <IconButton size="small" onClick={() => { setLogoFile(null); setLogoPreview(null); }}
                        sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(0,0,0,0.5)', color: 'white', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' } }}>
                        <CloseIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Box>
                  ) : (
                    <Button fullWidth variant="outlined" onClick={() => logoRef.current?.click()}
                      sx={{ py: 4, borderStyle: 'dashed', borderRadius: 2, textTransform: 'none', color: 'text.secondary' }}>
                      Logo Yukle
                    </Button>
                  )}
                </Box>
                {/* Cover */}
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 1, display: 'block' }}>KAPAK</Typography>
                  {coverPreview ? (
                    <Box sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                      <Box component="img" src={coverPreview} sx={{ width: '100%', height: 120, objectFit: 'cover' }} />
                      <IconButton size="small" onClick={() => { setCoverFile(null); setCoverPreview(null); }}
                        sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(0,0,0,0.5)', color: 'white', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' } }}>
                        <CloseIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Box>
                  ) : (
                    <Button fullWidth variant="outlined" onClick={() => coverRef.current?.click()}
                      sx={{ py: 4, borderStyle: 'dashed', borderRadius: 2, textTransform: 'none', color: 'text.secondary' }}>
                      Kapak Yukle
                    </Button>
                  )}
                </Box>
              </Stack>
            </Box>

            <Divider />

            {/* Membership settings */}
            <Box>
              <SH title="Uyelik Ayarlari" subtitle="Dernek uyelik ucretini ve suresini belirleyin." />
              <Stack spacing={2}>
                <Stack direction="row" spacing={2}>
                  <TextField fullWidth label="Uyelik Ucreti (TL)" type="number" value={membershipFee}
                    onChange={e => setMembershipFee(Number(e.target.value))} />
                  <TextField fullWidth label="Uyelik Suresi (Ay)" type="number" value={membershipDuration}
                    onChange={e => setMembershipDuration(Number(e.target.value))} />
                </Stack>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="body2" fontWeight={500}>Otomatik abonelik sistemi</Typography>
                    <Typography variant="caption" color="text.secondary">Uyeler donem sonunda otomatik faturalanir</Typography>
                  </Box>
                  <Switch checked={hasSubscription} onChange={e => setHasSubscription(e.target.checked)} />
                </Stack>
              </Stack>
            </Box>
          </Stack>
        )}

        {/* ─── STEP 3: ÖNİZLEME ─── */}
        {step === 3 && (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
            <Stack spacing={2}>
              <SH title="Dernek Ozeti" subtitle="Bilgileri gozden gecirin ve olusturun." />

              {/* Account info */}
              <SectionCard>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="subtitle2" fontWeight={700}>Hesap Bilgileri</Typography>
                  <Button size="small" onClick={() => goToStep(1)} sx={{ textTransform: 'none', fontSize: 12 }}>Duzenle</Button>
                </Box>
                {[
                  { label: 'Hesap', value: ownerUser?.displayName || ownerUser?.firstName || '—' },
                  { label: 'E-posta', value: ownerUser?.email || '—' },
                  { label: 'Tur', value: accountMode === 'new' ? 'Yeni BUSINESS hesap' : 'Mevcut kullanici' },
                ].map((r, i) => (
                  <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', px: 2.5, py: 1.2, borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 'none' } }}>
                    <Typography variant="body2" color="text.secondary">{r.label}</Typography>
                    <Typography variant="body2" fontWeight={600}>{r.value}</Typography>
                  </Box>
                ))}
              </SectionCard>

              {/* Association info */}
              <SectionCard>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="subtitle2" fontWeight={700}>Dernek Bilgileri</Typography>
                  <Button size="small" onClick={() => goToStep(2)} sx={{ textTransform: 'none', fontSize: 12 }}>Duzenle</Button>
                </Box>
                {[
                  { label: 'Dernek Adi', value: assocName || '—' },
                  { label: 'Vergi No', value: assocTaxNumber || '—' },
                  { label: 'E-posta', value: assocEmail || '—' },
                  { label: 'Telefon', value: assocPhone || '—' },
                  { label: 'Konum', value: [assocCity, assocDistrict].filter(Boolean).join(', ') || '—' },
                  { label: 'Website', value: assocWebsite || '—' },
                  { label: 'Uyelik Ucreti', value: membershipFee > 0 ? `${membershipFee} TL / ${membershipDuration} ay` : 'Ucretsiz' },
                ].map((r, i) => (
                  <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', px: 2.5, py: 1.2, borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 'none' } }}>
                    <Typography variant="body2" color="text.secondary">{r.label}</Typography>
                    <Typography variant="body2" fontWeight={600}>{r.value}</Typography>
                  </Box>
                ))}
              </SectionCard>

              {/* Checklist */}
              <SectionCard>
                <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="subtitle2" fontWeight={700}>Kontrol Listesi</Typography>
                </Box>
                <Stack sx={{ p: 2 }} spacing={1}>
                  {[
                    { ok: !!ownerUser, text: 'Hesap sahibi tanimli' },
                    { ok: !!assocName, text: 'Dernek adi girildi' },
                    { ok: !!assocEmail || !!assocPhone, text: 'Iletisim bilgisi eklendi', opt: !assocEmail && !assocPhone },
                    { ok: !!logoFile, text: logoFile ? 'Logo yuklendi' : 'Logo yuklenmedi', opt: !logoFile },
                    { ok: !!assocDescription, text: assocDescription ? 'Aciklama eklendi' : 'Aciklama eklenmedi', opt: !assocDescription },
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

            {/* Preview card */}
            <Box sx={{ position: 'sticky', top: 200, alignSelf: 'start' }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>Dernek Karti Onizleme</Typography>
              <SectionCard>
                <Box sx={{ bgcolor: 'primary.main', color: 'white', px: 3, py: 2.5, textAlign: 'center' }}>
                  {logoPreview ? (
                    <Avatar src={logoPreview} sx={{ width: 64, height: 64, mx: 'auto', mb: 1.5, border: '3px solid rgba(255,255,255,0.3)' }} />
                  ) : (
                    <Avatar sx={{ width: 64, height: 64, mx: 'auto', mb: 1.5, bgcolor: 'rgba(255,255,255,0.2)', fontSize: 24 }}>
                      <GroupsIcon sx={{ fontSize: 32 }} />
                    </Avatar>
                  )}
                  <Typography variant="h6" fontWeight={800}>{assocName || 'Dernek Adi'}</Typography>
                  {assocShortDesc && <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>{assocShortDesc}</Typography>}
                </Box>
                <Box sx={{ px: 3, py: 2.5 }}>
                  {[
                    assocCity && `📍 ${assocCity}${assocDistrict ? ', ' + assocDistrict : ''}`,
                    assocEmail && `✉️ ${assocEmail}`,
                    assocPhone && `📞 ${assocPhone}`,
                    assocWebsite && `🌐 ${assocWebsite}`,
                  ].filter(Boolean).map((line, i) => (
                    <Typography key={i} variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>{line}</Typography>
                  ))}
                  {membershipFee > 0 && (
                    <Chip label={`${membershipFee} TL / ${membershipDuration} ay`} size="small" color="primary" variant="outlined" sx={{ mt: 1.5, fontWeight: 600 }} />
                  )}
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
        <Button variant="contained" onClick={goNext} disabled={publishing}
          endIcon={step === TOTAL ? <RocketIcon /> : <ForwardIcon />}
          sx={{ textTransform: 'none', borderRadius: 2.5, fontWeight: 600, px: 3 }}>
          {publishing ? 'Olusturuluyor...' : step === 1 && accountMode === 'new' && !createdUser ? 'Hesap Olustur & Devam Et' : step === TOTAL ? 'Dernegi Olustur' : 'Devam Et'}
        </Button>
      </Box>
    </Box>
  );
}
