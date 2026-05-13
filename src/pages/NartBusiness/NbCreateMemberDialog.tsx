import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormLabel,
  Grid,
  InputLabel,
  Link,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material';
import {
  nbAdminService,
  type NbUserSearchResult,
} from '../../services/nartbusiness/nbAdminService';
import type {
  AdminCreateMemberRequest,
  MembershipTier,
  NbRace,
  Sector,
} from '../../services/nartbusiness/nbTypes';
import { TR_CITIES } from '../../constants/trCities';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const TIERS: { value: MembershipTier; label: string; sub: string }[] = [
  { value: 'KURUCU', label: 'Kurucu', sub: '10.000 TL / yıl' },
  { value: 'STANDART', label: 'Standart', sub: '15.000 TL / yıl' },
  { value: 'GENC_GIRISIMCI', label: 'Genç Girişimci', sub: '5.000 TL / yıl' },
];

const RACES: { value: NbRace; label: string }[] = [
  { value: 'adige', label: 'Adige' },
  { value: 'abhaz', label: 'Abhaz' },
  { value: 'cecen', label: 'Çeçen' },
  { value: 'karacay', label: 'Karaçay' },
  { value: 'dagistan', label: 'Dağıstan' },
  { value: 'oset', label: 'Oset' },
  { value: 'other', label: 'Diğer' },
];

type AuditCategory =
  | 'SPONSOR'
  | 'KURUCU_MANUAL'
  | 'MIGRATION'
  | 'TEST'
  | 'DIGER';

const AUDIT_CATEGORIES: { value: AuditCategory; label: string }[] = [
  { value: 'SPONSOR', label: 'Sponsor / kurumsal anlaşma' },
  { value: 'KURUCU_MANUAL', label: 'Kurucu üye manuel ekleme' },
  { value: 'MIGRATION', label: 'Migration / eski kayıt taşıma' },
  { value: 'TEST', label: 'Test verisi (staging)' },
  { value: 'DIGER', label: 'Diğer (notta açıkla)' },
];

const STEPS = ['Kullanıcı', 'Şirket & Kimlik', 'Üyelik & Ödeme', 'Onay'];

const NB_STATUS_LABEL: Record<string, string> = {
  SUBMITTED: 'Başvuru alındı',
  NEEDS_INFO: 'Belge bekliyor',
  REJECTED: 'Reddedildi',
  APPROVED_PENDING_PAYMENT: 'Ödeme bekliyor',
  APPROVED_EXPIRED: 'Süresi doldu',
  ACTIVE: 'Aktif üye',
  EXPIRED: 'Süresi doldu',
  SUSPENDED: 'Askıya alındı',
  CANCELLED: 'İptal etti',
  PENDING_VERIFICATION: 'Eski (pending)',
};

const EMAIL_RX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const URL_RX = /^https?:\/\/.+/i;

function formatTrDate(iso?: string | null): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' });
  } catch {
    return null;
  }
}

function userInitial(u: NbUserSearchResult): string {
  const name = (u.firstName ?? u.displayName ?? u.email ?? '?').trim();
  return name.charAt(0).toUpperCase();
}

function userDisplayName(u: NbUserSearchResult): string {
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  return name || u.displayName || u.email;
}

export default function NbCreateMemberDialog({ open, onClose, onCreated }: Props) {
  // ------------------------------------------------------------------
  // Form state
  // ------------------------------------------------------------------
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Partial<AdminCreateMemberRequest>>({
    requestedTier: 'STANDART',
    race: 'adige',
    targetStatus: 'ACTIVE',
    grantFreeMembership: false,
    verifiedBusiness: false,
    createIfMissing: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Kullanıcı arama (mevcut user modu)
  const [userSearchInput, setUserSearchInput] = useState('');
  const [userOptions, setUserOptions] = useState<NbUserSearchResult[]>([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<NbUserSearchResult | null>(null);

  // Yeni-user modunda email blur duplicate check
  const [emailLookupLoading, setEmailLookupLoading] = useState(false);
  const [emailDuplicate, setEmailDuplicate] = useState<NbUserSearchResult | null>(null);

  // Sektör katalogu (mount'ta tek seferlik)
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [sectorsLoading, setSectorsLoading] = useState(false);

  // Audit kategorisi (notun başına eklenir)
  const [auditCategory, setAuditCategory] = useState<AuditCategory>('SPONSOR');
  const [auditNoteBody, setAuditNoteBody] = useState('');

  const set = useCallback(
    <K extends keyof AdminCreateMemberRequest>(
      k: K,
      v: AdminCreateMemberRequest[K] | undefined,
    ) => setForm((prev) => ({ ...prev, [k]: v })),
    [],
  );

  // ------------------------------------------------------------------
  // Reset
  // ------------------------------------------------------------------
  const reset = useCallback(() => {
    setStep(0);
    setForm({
      requestedTier: 'STANDART',
      race: 'adige',
      targetStatus: 'ACTIVE',
      grantFreeMembership: false,
      verifiedBusiness: false,
      createIfMissing: false,
    });
    setSelectedUser(null);
    setUserSearchInput('');
    setUserOptions([]);
    setEmailDuplicate(null);
    setAuditCategory('SPONSOR');
    setAuditNoteBody('');
    setError(null);
  }, []);

  // ------------------------------------------------------------------
  // Sektör katalogunu yükle
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!open) return;
    setSectorsLoading(true);
    nbAdminService
      .listSectors()
      .then((rows) => setSectors(rows.filter((s) => s.active)))
      .catch(() => setSectors([]))
      .finally(() => setSectorsLoading(false));
  }, [open]);

  // ------------------------------------------------------------------
  // Kullanıcı arama (debounced 300ms, min 3 char)
  // ------------------------------------------------------------------
  useEffect(() => {
    if (form.createIfMissing) return;
    const q = userSearchInput.trim();
    if (q.length < 3) {
      setUserOptions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setUserSearchLoading(true);
      try {
        const results = await nbAdminService.searchUsers(q, 20);
        setUserOptions(results);
      } catch (_) {
        setUserOptions([]);
      } finally {
        setUserSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearchInput, form.createIfMissing]);

  // ------------------------------------------------------------------
  // Email blur duplicate check (yeni-user modu)
  // ------------------------------------------------------------------
  const checkEmailDuplicate = useCallback(async () => {
    if (!form.createIfMissing) return;
    const email = form.email?.trim().toLowerCase();
    if (!email || !EMAIL_RX.test(email)) {
      setEmailDuplicate(null);
      return;
    }
    setEmailLookupLoading(true);
    try {
      const existing = await nbAdminService.lookupUserByEmail(email);
      setEmailDuplicate(existing);
    } catch {
      setEmailDuplicate(null);
    } finally {
      setEmailLookupLoading(false);
    }
  }, [form.createIfMissing, form.email]);

  // Tek-tıkla "mevcut kullanıcı" moduna geç (duplicate uyarısı tıklanırsa)
  const switchToExistingUser = useCallback(() => {
    if (!emailDuplicate) return;
    setSelectedUser(emailDuplicate);
    setUserSearchInput(emailDuplicate.email);
    set('createIfMissing', false);
    set('firstName', undefined);
    set('lastName', undefined);
    setEmailDuplicate(null);
  }, [emailDuplicate, set]);

  // ------------------------------------------------------------------
  // Validation
  // ------------------------------------------------------------------
  const emailValid = !!form.email && EMAIL_RX.test(form.email);
  const newUserDataValid =
    !!form.email &&
    emailValid &&
    !!form.firstName?.trim() &&
    !!form.lastName?.trim() &&
    !emailDuplicate; // duplicate varsa step ilerletme

  const userIdentifierValid = form.createIfMissing
    ? newUserDataValid
    : !!selectedUser && !selectedUser.nbMemberConflict;

  const linkedinValid = !form.linkedinUrl || URL_RX.test(form.linkedinUrl);
  const websiteValid = !form.websiteUrl || URL_RX.test(form.websiteUrl);
  const instagramValid = !form.instagramUrl || URL_RX.test(form.instagramUrl);

  const companyValid =
    !!form.companyName?.trim() &&
    !!form.sectorCode &&
    !!form.city &&
    !!form.race &&
    !!form.clanName?.trim() &&
    linkedinValid &&
    websiteValid &&
    instagramValid;

  const statusValid =
    !!form.requestedTier &&
    !!form.targetStatus;

  const auditNoteFull = useMemo(() => {
    const note = auditNoteBody.trim();
    if (!note) return '';
    return `[KATEGORI: ${auditCategory}] ${note}`;
  }, [auditCategory, auditNoteBody]);

  const AUDIT_MIN_CHARS = 30;
  const auditNoteValid = auditNoteBody.trim().length >= AUDIT_MIN_CHARS;

  const stepValid: Record<number, boolean> = {
    0: userIdentifierValid,
    1: companyValid,
    2: statusValid && auditNoteValid,
    3: true,
  };

  const canGoNext = stepValid[step];

  // ------------------------------------------------------------------
  // Submit
  // ------------------------------------------------------------------
  const submit = async () => {
    if (!stepValid[0] || !stepValid[1] || !stepValid[2]) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload: AdminCreateMemberRequest = form.createIfMissing
        ? ({
            ...(form as AdminCreateMemberRequest),
            userId: undefined,
            createIfMissing: true,
            adminNote: auditNoteFull,
          } as AdminCreateMemberRequest)
        : ({
            ...(form as AdminCreateMemberRequest),
            userId: selectedUser!.userId,
            email: selectedUser!.email,
            createIfMissing: false,
            adminNote: auditNoteFull,
          } as AdminCreateMemberRequest);
      await nbAdminService.createMemberManually(payload);
      reset();
      onCreated();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? e?.message ?? 'Oluşturulamadı');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseRequest = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  // ------------------------------------------------------------------
  // Step content renderers
  // ------------------------------------------------------------------
  const renderUserStep = () => (
    <Stack spacing={2}>
      <FormControl>
        <FormLabel>Kullanıcı kaynağı</FormLabel>
        <RadioGroup
          row
          value={form.createIfMissing ? 'new' : 'existing'}
          onChange={(e) => {
            const newUser = e.target.value === 'new';
            set('createIfMissing', newUser);
            if (newUser) {
              setSelectedUser(null);
              setUserSearchInput('');
            } else {
              set('email', undefined);
              set('firstName', undefined);
              set('lastName', undefined);
              setEmailDuplicate(null);
            }
          }}
        >
          <FormControlLabel
            value="existing"
            control={<Radio />}
            label="NartGo'da kayıtlı kullanıcı"
          />
          <FormControlLabel
            value="new"
            control={<Radio />}
            label="Yeni kullanıcı oluştur (Keycloak + email doğrulama)"
          />
        </RadioGroup>
      </FormControl>

      {!form.createIfMissing ? (
        <>
          <Autocomplete<NbUserSearchResult>
            size="small"
            fullWidth
            options={userOptions}
            loading={userSearchLoading}
            value={selectedUser}
            onChange={(_, v) => setSelectedUser(v)}
            inputValue={userSearchInput}
            onInputChange={(_, v) => setUserSearchInput(v)}
            getOptionLabel={userDisplayName}
            isOptionEqualToValue={(a, b) => a.userId === b.userId}
            filterOptions={(x) => x}
            getOptionDisabled={(opt) => !!opt.nbMemberConflict}
            noOptionsText={
              userSearchInput.trim().length < 3
                ? 'En az 3 karakter yaz'
                : userSearchLoading
                ? 'Aranıyor…'
                : 'Eşleşme yok — yukarıdan "Yeni kullanıcı oluştur"u seç'
            }
            renderOption={(props, opt) => {
              const tenureLabel = formatTrDate(opt.createdAt);
              const statusLabel = opt.nbMemberStatus
                ? NB_STATUS_LABEL[opt.nbMemberStatus] ?? opt.nbMemberStatus
                : null;
              return (
                <Box
                  component="li"
                  {...props}
                  key={opt.userId}
                  sx={{ alignItems: 'flex-start !important', gap: 1.5, py: 1 }}
                >
                  <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.light' }}>
                    {userInitial(opt)}
                  </Avatar>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography variant="body2" noWrap>
                      <b>{userDisplayName(opt)}</b>{' '}
                      <Typography
                        component="span"
                        variant="caption"
                        color="text.secondary"
                      >
                        &lt;{opt.email}&gt;
                      </Typography>
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {opt.phone ? `☎ ${opt.phone} · ` : ''}
                      {tenureLabel ? `NartGo üye: ${tenureLabel}` : 'Kayıt tarihi yok'}
                    </Typography>
                  </Box>
                  <Box sx={{ ml: 'auto', textAlign: 'right', flexShrink: 0 }}>
                    {opt.nbMemberConflict ? (
                      <Chip
                        size="small"
                        color="warning"
                        label={`⚠ ${statusLabel}`}
                      />
                    ) : opt.nbMemberStatus ? (
                      <Chip size="small" variant="outlined" label={statusLabel} />
                    ) : (
                      <Chip size="small" variant="outlined" label="NB üyesi değil" />
                    )}
                  </Box>
                </Box>
              );
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="NartGo Kullanıcısı Ara"
                placeholder="Email, ad veya soyad — en az 3 karakter"
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {userSearchLoading ? <CircularProgress size={18} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
          />

          {selectedUser?.nbMemberConflict && (
            <Alert severity="warning">
              Bu kullanıcı zaten NB üyesi (
              <b>
                {NB_STATUS_LABEL[selectedUser.nbMemberStatus!] ??
                  selectedUser.nbMemberStatus}
              </b>
              ). Yeni manuel üyelik oluşturulamaz. Lütfen başka bir kullanıcı seç.
            </Alert>
          )}
        </>
      ) : (
        <>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Email *"
                fullWidth
                size="small"
                type="email"
                value={form.email ?? ''}
                onChange={(e) => {
                  set('email', e.target.value.trim().toLowerCase());
                  setEmailDuplicate(null);
                }}
                onBlur={checkEmailDuplicate}
                error={!!form.email && !emailValid}
                helperText={
                  emailLookupLoading
                    ? 'Email kayıtlı mı kontrol ediliyor…'
                    : form.email && !emailValid
                    ? 'Geçerli bir email adresi gir'
                    : 'Email odaktan çıkınca duplicate kontrol yapılır'
                }
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Ad *"
                fullWidth
                size="small"
                value={form.firstName ?? ''}
                onChange={(e) => set('firstName', e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Soyad *"
                fullWidth
                size="small"
                value={form.lastName ?? ''}
                onChange={(e) => set('lastName', e.target.value)}
              />
            </Grid>
          </Grid>

          {emailDuplicate && (
            <Alert
              severity={emailDuplicate.nbMemberConflict ? 'error' : 'warning'}
              action={
                !emailDuplicate.nbMemberConflict && (
                  <Button color="inherit" size="small" onClick={switchToExistingUser}>
                    Mevcut kullanıcıyı seç
                  </Button>
                )
              }
            >
              <Typography variant="body2">
                Bu email zaten NartGo'da kayıtlı:{' '}
                <b>{userDisplayName(emailDuplicate)}</b>
                {emailDuplicate.nbMemberStatus && (
                  <>
                    {' '}
                    — NB durumu:{' '}
                    <b>
                      {NB_STATUS_LABEL[emailDuplicate.nbMemberStatus] ??
                        emailDuplicate.nbMemberStatus}
                    </b>
                  </>
                )}
              </Typography>
              {emailDuplicate.nbMemberConflict ? (
                <Typography variant="caption">
                  Aktif NB üyelik var — duplicate üye oluşturulamaz.
                </Typography>
              ) : (
                <Typography variant="caption">
                  Duplicate Keycloak hesabı oluşturmamak için "Mevcut kullanıcıyı seç"
                  butonuna tıkla.
                </Typography>
              )}
            </Alert>
          )}
        </>
      )}
    </Stack>
  );

  const renderCompanyStep = () => (
    <Stack spacing={2}>
      <Typography variant="subtitle2">Şirket Bilgisi</Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label="Şirket Adı *"
            fullWidth
            size="small"
            value={form.companyName ?? ''}
            onChange={(e) => set('companyName', e.target.value)}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Autocomplete<Sector>
            size="small"
            options={sectors}
            loading={sectorsLoading}
            value={sectors.find((s) => s.code === form.sectorCode) ?? null}
            onChange={(_, v) => set('sectorCode', v?.code ?? undefined)}
            getOptionLabel={(s) => `${s.nameTr} (${s.code})`}
            isOptionEqualToValue={(a, b) => a.code === b.code}
            noOptionsText={sectorsLoading ? 'Yükleniyor…' : 'Sektör bulunamadı'}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Sektör *"
                placeholder="Sektör katalogundan seç"
              />
            )}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Autocomplete<string>
            size="small"
            options={TR_CITIES as unknown as string[]}
            value={form.city ?? null}
            onChange={(_, v) => set('city', v ?? undefined)}
            renderInput={(params) => (
              <TextField {...params} label="Şehir *" placeholder="81 il listesi" />
            )}
          />
        </Grid>
      </Grid>

      <Typography variant="subtitle2">Kafkas Kimliği</Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Halk *</InputLabel>
            <Select
              label="Halk *"
              value={form.race ?? 'adige'}
              onChange={(e) => set('race', e.target.value as NbRace)}
            >
              {RACES.map((r) => (
                <MenuItem key={r.value} value={r.value}>
                  {r.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            label="Sülale *"
            fullWidth
            size="small"
            value={form.clanName ?? ''}
            onChange={(e) => set('clanName', e.target.value)}
            helperText="Serbest yazım (sülale katalogu henüz yok)"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            label="Memleket (opsiyonel)"
            fullWidth
            size="small"
            value={form.hometownDetail ?? ''}
            onChange={(e) => set('hometownDetail', e.target.value)}
          />
        </Grid>
      </Grid>

      <Typography variant="subtitle2">Sosyal Bağlantılar (opsiyonel)</Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            label="LinkedIn"
            fullWidth
            size="small"
            value={form.linkedinUrl ?? ''}
            onChange={(e) => set('linkedinUrl', e.target.value)}
            error={!linkedinValid}
            helperText={linkedinValid ? 'https://… ile başlamalı' : 'Geçersiz URL'}
            placeholder="https://linkedin.com/in/…"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            label="Web Sitesi"
            fullWidth
            size="small"
            value={form.websiteUrl ?? ''}
            onChange={(e) => set('websiteUrl', e.target.value)}
            error={!websiteValid}
            helperText={websiteValid ? 'https:// önerilir' : 'Geçersiz URL'}
            placeholder="https://…"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            label="Instagram"
            fullWidth
            size="small"
            value={form.instagramUrl ?? ''}
            onChange={(e) => set('instagramUrl', e.target.value)}
            error={!instagramValid}
            helperText={instagramValid ? '' : 'Geçersiz URL'}
            placeholder="https://instagram.com/…"
          />
        </Grid>
      </Grid>
    </Stack>
  );

  const renderStatusStep = () => (
    <Stack spacing={3}>
      <FormControl>
        <FormLabel>Kademe *</FormLabel>
        <RadioGroup
          value={form.requestedTier ?? 'STANDART'}
          onChange={(e) => set('requestedTier', e.target.value as MembershipTier)}
        >
          {TIERS.map((t) => (
            <FormControlLabel
              key={t.value}
              value={t.value}
              control={<Radio />}
              label={
                <Box>
                  <Typography variant="body2">
                    <b>{t.label}</b>
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t.sub}
                  </Typography>
                </Box>
              }
            />
          ))}
        </RadioGroup>
      </FormControl>

      <Divider />

      <FormControl>
        <FormLabel>Hedef Durum *</FormLabel>
        <RadioGroup
          value={form.targetStatus ?? 'ACTIVE'}
          onChange={(e) =>
            set(
              'targetStatus',
              e.target.value as 'ACTIVE' | 'APPROVED_PENDING_PAYMENT',
            )
          }
        >
          <FormControlLabel
            value="ACTIVE"
            control={<Radio />}
            label={
              <Box>
                <Typography variant="body2">
                  <b>ACTIVE</b> — Hemen aktif üye
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Komite süreci atlanır; üye anında NB_MEMBER rolü alır.
                </Typography>
              </Box>
            }
          />
          <FormControlLabel
            value="APPROVED_PENDING_PAYMENT"
            control={<Radio />}
            label={
              <Box>
                <Typography variant="body2">
                  <b>APPROVED_PENDING_PAYMENT</b> — Ödeme bekleyen
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Üye 7 gün içinde ödeme yaparsa ACTIVE; yapmazsa
                  APPROVED_EXPIRED'a düşer.
                </Typography>
              </Box>
            }
          />
        </RadioGroup>
      </FormControl>

      <Divider />

      <FormControl disabled={form.targetStatus !== 'ACTIVE'}>
        <FormLabel>Ödeme Tipi *</FormLabel>
        <RadioGroup
          value={form.grantFreeMembership ? 'FREE' : 'OFFLINE_PAID'}
          onChange={(e) => set('grantFreeMembership', e.target.value === 'FREE')}
        >
          <FormControlLabel
            value="OFFLINE_PAID"
            control={<Radio />}
            label={
              <Box>
                <Typography variant="body2">
                  <b>Offline tahsil edildi</b>
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Period ACTIVE oluşturulur, payment_id null (banka/elden tahsilat).
                </Typography>
              </Box>
            }
          />
          <FormControlLabel
            value="FREE"
            control={<Radio />}
            label={
              <Box>
                <Typography variant="body2">
                  <b>Ücretsiz üyelik (0 TL)</b>
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Sponsor / bedelsiz üyelik — period 0 TL kaydedilir.
                </Typography>
              </Box>
            }
          />
        </RadioGroup>
        {form.targetStatus !== 'ACTIVE' && (
          <FormHelperText>
            Sadece "Hemen aktif üye" hedefinde anlamlı.
          </FormHelperText>
        )}
      </FormControl>

      <Divider />

      <FormControlLabel
        control={
          <Checkbox
            checked={!!form.verifiedBusiness}
            onChange={(e) => set('verifiedBusiness', e.target.checked)}
          />
        }
        label={
          <Box>
            <Typography variant="body2">
              <b>"Doğrulanmış İşletme" rozeti</b>
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Admin VIP / referansla doğrulamış sayılır; profilde rozet gözükür.
            </Typography>
          </Box>
        }
      />

      <Divider />

      <Stack spacing={1}>
        <FormControl size="small" fullWidth>
          <InputLabel>Audit Kategorisi *</InputLabel>
          <Select
            label="Audit Kategorisi *"
            value={auditCategory}
            onChange={(e) => setAuditCategory(e.target.value as AuditCategory)}
          >
            {AUDIT_CATEGORIES.map((c) => (
              <MenuItem key={c.value} value={c.value}>
                {c.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label="Audit Notu *"
          fullWidth
          size="small"
          multiline
          minRows={3}
          value={auditNoteBody}
          onChange={(e) => setAuditNoteBody(e.target.value)}
          placeholder="Neden manuel oluşturuluyor? (örn. 'X şirketi ile sponsor anlaşması, fatura no #1234, anlaşma tarihi 12.05.2026')"
          error={auditNoteBody.length > 0 && !auditNoteValid}
          helperText={
            <Box component="span" sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>
                {auditNoteValid
                  ? "Notun tamamı audit log'a yazılır."
                  : `En az ${AUDIT_MIN_CHARS} karakter — şu an ${auditNoteBody.length}`}
              </span>
              <span>
                {auditNoteBody.length} / 1000
              </span>
            </Box>
          }
          inputProps={{ maxLength: 1000 }}
        />
      </Stack>
    </Stack>
  );

  const renderConfirmStep = () => {
    const userLine = form.createIfMissing
      ? `Yeni kullanıcı: ${form.firstName} ${form.lastName} <${form.email}> (Keycloak'ta oluşturulacak)`
      : selectedUser
      ? `Mevcut kullanıcı: ${userDisplayName(selectedUser)} <${selectedUser.email}>`
      : '—';
    const tierLabel = TIERS.find((t) => t.value === form.requestedTier)?.label;
    const raceLabel = RACES.find((r) => r.value === form.race)?.label;
    const sector = sectors.find((s) => s.code === form.sectorCode);

    return (
      <Stack spacing={2}>
        <Alert severity="info">
          Bu form self-service apply akışını <b>atlar</b>. Komite kararı yok,
          mobil onay akışı yok. KVKK onaylarının offline alınmış olduğu varsayılır.
          Audit notu kalıcı log'a yazılır.
        </Alert>

        <Stack spacing={0.5}>
          <Typography variant="subtitle2">Kullanıcı</Typography>
          <Typography variant="body2">{userLine}</Typography>
        </Stack>
        <Divider />
        <Stack spacing={0.5}>
          <Typography variant="subtitle2">Şirket & Kimlik</Typography>
          <Typography variant="body2">
            <b>Şirket:</b> {form.companyName} ·{' '}
            <b>Sektör:</b> {sector ? `${sector.nameTr} (${sector.code})` : form.sectorCode} ·{' '}
            <b>Şehir:</b> {form.city}
          </Typography>
          <Typography variant="body2">
            <b>Halk:</b> {raceLabel} · <b>Sülale:</b> {form.clanName}
            {form.hometownDetail ? ` · Memleket: ${form.hometownDetail}` : ''}
          </Typography>
          {(form.linkedinUrl || form.websiteUrl || form.instagramUrl) && (
            <Typography variant="caption" color="text.secondary">
              {form.linkedinUrl && (
                <>
                  LinkedIn: <Link href={form.linkedinUrl} target="_blank" rel="noreferrer">{form.linkedinUrl}</Link>{'  '}
                </>
              )}
              {form.websiteUrl && (
                <>
                  Web: <Link href={form.websiteUrl} target="_blank" rel="noreferrer">{form.websiteUrl}</Link>{'  '}
                </>
              )}
              {form.instagramUrl && (
                <>
                  IG: <Link href={form.instagramUrl} target="_blank" rel="noreferrer">{form.instagramUrl}</Link>
                </>
              )}
            </Typography>
          )}
        </Stack>
        <Divider />
        <Stack spacing={0.5}>
          <Typography variant="subtitle2">Üyelik & Ödeme</Typography>
          <Typography variant="body2">
            <b>Kademe:</b> {tierLabel} · <b>Hedef Durum:</b> {form.targetStatus}
          </Typography>
          {form.targetStatus === 'ACTIVE' && (
            <Typography variant="body2">
              <b>Ödeme:</b>{' '}
              {form.grantFreeMembership
                ? 'Ücretsiz üyelik (0 TL)'
                : 'Offline tahsil edildi'}
            </Typography>
          )}
          {form.verifiedBusiness && (
            <Typography variant="body2" color="success.main">
              ✓ "Doğrulanmış İşletme" rozeti aktif
            </Typography>
          )}
        </Stack>
        <Divider />
        <Stack spacing={0.5}>
          <Typography variant="subtitle2">Audit Notu</Typography>
          <Typography
            variant="body2"
            sx={{
              backgroundColor: 'action.hover',
              p: 1,
              borderRadius: 1,
              whiteSpace: 'pre-wrap',
              fontFamily: 'monospace',
              fontSize: 12,
            }}
          >
            {auditNoteFull}
          </Typography>
        </Stack>

        {form.createIfMissing && (
          <Alert severity="warning">
            Bu işlem Keycloak'ta yeni kullanıcı oluşturacak — kullanıcı email
            adresinde doğrulama linki alacak ve geçici şifreyle giriş yapması
            istenecek.
          </Alert>
        )}
      </Stack>
    );
  };

  const renderStepBody = () => {
    switch (step) {
      case 0:
        return renderUserStep();
      case 1:
        return renderCompanyStep();
      case 2:
        return renderStatusStep();
      case 3:
        return renderConfirmStep();
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onClose={handleCloseRequest} maxWidth="md" fullWidth>
      <DialogTitle>Manuel Üye Oluştur</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3}>
          <Stepper activeStep={step} alternativeLabel>
            {STEPS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && <Alert severity="error">{error}</Alert>}

          {renderStepBody()}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCloseRequest} disabled={submitting}>
          İptal
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        {step > 0 && (
          <Button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={submitting}
          >
            Geri
          </Button>
        )}
        {step < STEPS.length - 1 ? (
          <Button
            variant="contained"
            onClick={() => setStep((s) => s + 1)}
            disabled={!canGoNext || submitting}
          >
            İleri
          </Button>
        ) : (
          <Button
            variant="contained"
            color="primary"
            disabled={submitting || !(stepValid[0] && stepValid[1] && stepValid[2])}
            onClick={submit}
          >
            {submitting ? 'Oluşturuluyor…' : 'Üyeyi Oluştur'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
