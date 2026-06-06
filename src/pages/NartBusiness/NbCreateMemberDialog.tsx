import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  Link,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import CloseIcon from '@mui/icons-material/Close';
import { nbAdminService } from '../../services/nartbusiness/nbAdminService';
import type {
  AdminCreateMemberRequest,
  CompanyAddressRequest,
  MembershipTier,
  NbRace,
  Sector,
  TierConfig,
} from '../../services/nartbusiness/nbTypes';
import type {
  NbUserSearchResult,
  RaceFamily,
} from '../../services/nartbusiness/nbAdminService';
import { TR_CITIES } from '../../constants/trCities';
import {
  AuditNoteBlock,
  buildAuditNote,
  CatalogAutocomplete,
  CompanyPlacesAutocomplete,
  ConfirmationStep,
  FindOrCreateUser,
  isAuditNoteValid,
  isFindOrCreateValid,
  NbSectionPaper,
  PhoneTrInput,
  RadioCardGroup,
  SectorCheckboxGrid,
  SocialPrefixField,
  TierRadioCardGroup,
  type AuditCategoryOption,
  type CompanyPlaceResult,
  type FindOrCreateUserValue,
  type RadioCardOption,
} from '../../components/nartbusiness';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

type ActivationFlow = 'ACTIVE' | 'APPROVED_PENDING_PAYMENT';

const TARGET_STATUS_OPTIONS: RadioCardOption<ActivationFlow>[] = [
  {
    value: 'ACTIVE',
    title: 'Hemen aktive et',
    description:
      'Offline ödeme alındı veya ücretsiz üyelik. Üye anında NB_MEMBER rolünü alır, komite süreci atlanır.',
  },
  {
    value: 'APPROVED_PENDING_PAYMENT',
    title: 'Ödeme bekleyen yap',
    description:
      'Üyeye 7 gün penceresi açılır. Süresi içinde öderse aktif olur, ödemezse otomatik süresi dolar.',
  },
];

const TARGET_STATUS_LABEL: Record<ActivationFlow, string> = {
  ACTIVE: 'Hemen aktive et',
  APPROVED_PENDING_PAYMENT: 'Ödeme bekleyen',
};

const PAYMENT_OPTIONS: RadioCardOption<'OFFLINE_PAID' | 'FREE'>[] = [
  {
    value: 'OFFLINE_PAID',
    title: 'Offline tahsil edildi',
    description:
      'Üyelik ücreti dışarıdan alındı (banka / elden). Sistemde payment_id boş kalır.',
  },
  {
    value: 'FREE',
    title: 'Ücretsiz üyelik (0 TL)',
    description:
      'Sponsor / bedelsiz — period kaydı 0 TL ile açılır, ücret tahsil edilmez.',
  },
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

const AUDIT_CATEGORIES: AuditCategoryOption[] = [
  { value: 'SPONSOR', label: 'Sponsor / kurumsal anlaşma' },
  { value: 'KURUCU_MANUAL', label: 'Kurucu üye manuel ekleme' },
  { value: 'MIGRATION', label: 'Migration / eski kayıt taşıma' },
  { value: 'TEST', label: 'Test verisi (staging)' },
  { value: 'DIGER', label: 'Diğer (notta açıkla)' },
];

const STEPS = [
  'Kullanıcı',
  'İşletme',
  'Kimlik',
  'Sosyal',
  'Paket & Aktivasyon',
  'Onay',
];

const URL_RX = /^https?:\/\/.+/i;

const initialUser: FindOrCreateUserValue = {
  mode: 'existing',
  selectedUser: null,
  email: '',
  firstName: '',
  lastName: '',
  phone: '',
};

/** NartGo RaceEnum string → NB form race kodu. */
function normalizeRace(raw?: string | null): NbRace | null {
  if (!raw) return null;
  const t = raw.toLowerCase();
  if (t === 'dagestan') return 'dagistan';
  if (['adige', 'abhaz', 'cecen', 'karacay', 'dagistan', 'oset', 'other'].includes(t)) {
    return t as NbRace;
  }
  return 'other';
}

/** Google Places şehir adını TR_CITIES listesiyle eşleştirir. */
function matchTrCity(googleCity: string): string | undefined {
  if (!googleCity) return undefined;
  const norm = (s: string) =>
    s
      .trim()
      .toLowerCase()
      .replace(/i̇/g, 'i')
      .replace(/ı/g, 'i')
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/İ/g, 'i');
  const target = norm(googleCity);
  return (TR_CITIES as unknown as string[]).find((c) => norm(c) === target);
}

/**
 * Kullanıcı serbest format ("+90 5XX XXX XX XX", "905XXXXXXXXX", "5XXXXXXXXX")
 * girebilir → backend için `phoneCode + gsmNo` ayır.
 */
function splitPhone(input: string | undefined): { phoneCode?: string; gsmNo?: string } {
  if (!input) return {};
  const trimmed = input.trim();
  if (!trimmed) return {};
  // "+" ile başlıyorsa ilk 1-3 rakamı ülke kodu yap
  if (trimmed.startsWith('+')) {
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length < 7) return {};
    // Türkiye için tipik: 90 + 10 hane = 12. Ülke kodu 1-3 hane olabilir.
    // Pratik kural: son 10 haneyi gsm, başını ülke kodu kabul et.
    const gsm = digits.slice(-10);
    const code = digits.slice(0, digits.length - 10);
    return { phoneCode: `+${code || '90'}`, gsmNo: gsm };
  }
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) return { phoneCode: '+90', gsmNo: digits };
  if (digits.length === 12 && digits.startsWith('90')) {
    return { phoneCode: '+90', gsmNo: digits.slice(2) };
  }
  if (digits.length >= 7) return { phoneCode: '+90', gsmNo: digits.slice(-10) };
  return {};
}

// Local SectionPaper — shared NbSectionPaper'a alias (typo riskini azalt)
const SectionPaper = NbSectionPaper;

export default function NbCreateMemberDialog({ open, onClose, onCreated }: Props) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const [step, setStep] = useState(0);

  const [user, setUser] = useState<FindOrCreateUserValue>(initialUser);

  const [form, setForm] = useState<Partial<AdminCreateMemberRequest>>({
    race: 'adige',
    targetStatus: 'ACTIVE',
    grantFreeMembership: false,
    verifiedBusiness: false,
  });

  // Katalog state'leri
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [sectorsLoading, setSectorsLoading] = useState(false);
  const [families, setFamilies] = useState<RaceFamily[]>([]);
  const [familiesLoading, setFamiliesLoading] = useState(false);
  const [tiers, setTiers] = useState<TierConfig[]>([]);
  const [tiersLoading, setTiersLoading] = useState(false);

  // Auto-fill takibi — kullanıcı seçilince hangi alanlar NartGo profilinden yüklendi
  const [prefilledFields, setPrefilledFields] = useState<string[]>([]);
  const lastPrefilledUserIdRef = useRef<string | null>(null);

  // Kilitli alanlar — NartGo'dan otomatik doldurulan alanlar başlangıçta kilitli gelir.
  // Admin "Değiştir" ile kilidi açabilir.
  const [lockedFields, setLockedFields] = useState<Set<string>>(new Set());
  const unlock = (field: string) =>
    setLockedFields((prev) => {
      const s = new Set(prev);
      s.delete(field);
      return s;
    });

  // Audit
  const [auditCategory, setAuditCategory] = useState('SPONSOR');
  const [auditNoteBody, setAuditNoteBody] = useState('');

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Google Places'tan gelen şehir TR_CITIES ile eşleşmediyse orijinali sakla
  const [placeCityHint, setPlaceCityHint] = useState<string | null>(null);

  // Sülale kataloga ekleme
  const [familyCreating, setFamilyCreating] = useState(false);
  const [familyCreateError, setFamilyCreateError] = useState<string | null>(null);

  const set = <K extends keyof AdminCreateMemberRequest>(
    k: K,
    v: AdminCreateMemberRequest[K] | undefined,
  ) => setForm((prev) => ({ ...prev, [k]: v }));

  const reset = () => {
    setStep(0);
    setUser(initialUser);
    setForm({
      race: 'adige',
      targetStatus: 'ACTIVE',
      grantFreeMembership: false,
      verifiedBusiness: false,
    });
    setPlaceCityHint(null);
    setAuditCategory('SPONSOR');
    setAuditNoteBody('');
    setPrefilledFields([]);
    lastPrefilledUserIdRef.current = null;
    setLockedFields(new Set());
    setError(null);
  };

  // ------------------------------------------------------------------
  // Sektör katalogu
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
  // Tier katalogu (Sprint 26 — DB-driven, apply form ile aynı kaynak)
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!open) return;
    setTiersLoading(true);
    nbAdminService
      .listTiers()
      .then((rows) => {
        const active = rows
          .filter((t) => t.active && t.code !== 'PATRON')
          .sort((a, b) => a.sortOrder - b.sortOrder);
        setTiers(active);
        // Henüz seçilmediyse ilkini ön-seç (sortOrder'a göre)
        setForm((prev) =>
          prev.requestedTier ? prev : { ...prev, requestedTier: active[0]?.code as MembershipTier },
        );
      })
      .catch(() => setTiers([]))
      .finally(() => setTiersLoading(false));
  }, [open]);

  // ------------------------------------------------------------------
  // Sülale katalogu — race değişince yeniden yükle
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!open || !form.race) {
      setFamilies([]);
      return;
    }
    setFamiliesLoading(true);
    nbAdminService
      .listFamiliesByRace(form.race)
      .then((rows) => {
        const seen = new Set<string>();
        const deduped: RaceFamily[] = [];
        for (const f of rows) {
          const key = (f.familyName ?? '').trim().toLowerCase();
          if (!key || seen.has(key)) continue;
          seen.add(key);
          deduped.push(f);
        }
        setFamilies(deduped);
      })
      .catch(() => setFamilies([]))
      .finally(() => setFamiliesLoading(false));
  }, [open, form.race]);

  // ------------------------------------------------------------------
  // Auto-fill from selectedUser (NartGo profili)
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!open) return;
    const u = user.selectedUser;
    if (!u) {
      if (lastPrefilledUserIdRef.current) {
        setPrefilledFields([]);
        setLockedFields(new Set());
        lastPrefilledUserIdRef.current = null;
      }
      return;
    }
    if (lastPrefilledUserIdRef.current === u.userId) return;

    const filled: string[] = [];
    const newLocked = new Set<string>();

    setForm((prev) => {
      const next = { ...prev };
      const normalizedRace = normalizeRace(u.race);
      if (normalizedRace) {
        next.race = normalizedRace;
        filled.push('Halk');
        newLocked.add('race');
      }
      if (u.family && u.family.trim()) {
        next.clanName = u.family.trim();
        filled.push('Sülale');
        newLocked.add('clanName');
      }
      if (u.currentCity && u.currentCity.trim()) {
        next.city = u.currentCity.trim();
        filled.push('Şehir');
        newLocked.add('city');
      }
      if (u.companyName && u.companyName.trim() && !next.companyName) {
        next.companyName = u.companyName.trim();
        filled.push('Şirket adı');
      }
      // Hometown — backend tek alan (city + village " / " ile birleşik) saklıyor.
      const homeParts = [u.hometownCity?.trim(), u.hometownVillage?.trim()].filter(Boolean);
      if (homeParts.length > 0) {
        next.hometownDetail = homeParts.join(' / ');
        filled.push('Memleket');
        newLocked.add('hometownDetail');
      }
      return next;
    });

    setPrefilledFields(filled);
    setLockedFields(newLocked);
    lastPrefilledUserIdRef.current = u.userId;
  }, [open, user.selectedUser]);

  // ------------------------------------------------------------------
  // Validation
  // ------------------------------------------------------------------
  const linkedinValid = !form.linkedinUrl || URL_RX.test(form.linkedinUrl);
  const websiteValid = !form.websiteUrl || URL_RX.test(form.websiteUrl);
  const instagramValid = !form.instagramUrl || /^[A-Za-z0-9._]{1,30}$/.test(form.instagramUrl);
  const hasSocial = !!(form.linkedinUrl || form.websiteUrl || form.instagramUrl);

  const businessValid =
    !!form.companyName?.trim() &&
    !!form.sectorCodes?.length &&
    !!form.city;
  const identityValid = !!form.race && !!form.clanName?.trim();
  const socialValid = hasSocial && linkedinValid && websiteValid && instagramValid;
  const tierValid = !!form.requestedTier && !!form.targetStatus;
  const auditValid = isAuditNoteValid(auditNoteBody);

  const stepValid: Record<number, boolean> = {
    0: isFindOrCreateValid(user),
    1: businessValid,
    2: identityValid,
    3: socialValid,
    4: tierValid,
    5: auditValid,
  };

  const canSubmit = Object.values(stepValid).every(Boolean);

  /** Mevcut adımdaki "İleri" disabled olduğunda neden disabled olduğunu açıklayan tooltip. */
  const stepBlockerHint = useMemo(() => {
    if (step === 0) {
      if (!isFindOrCreateValid(user)) {
        if (user.mode === 'existing') {
          return user.selectedUser?.nbMemberConflict
            ? 'Seçilen kullanıcı zaten NB üyesi — başka birini seç'
            : 'NartGo kullanıcısı seç';
        }
        return 'Geçerli email + Ad + Soyad gerekli';
      }
      return null;
    }
    if (step === 1) {
      const missing: string[] = [];
      if (!form.companyName?.trim()) missing.push('Şirket Adı');
      if (!form.sectorCodes?.length) missing.push('Sektör');
      if (!form.city) missing.push('Şehir');
      return missing.length ? `Eksik: ${missing.join(', ')}` : null;
    }
    if (step === 2) {
      const missing: string[] = [];
      if (!form.race) missing.push('Halk');
      if (!form.clanName?.trim()) missing.push('Sülale');
      return missing.length ? `Eksik: ${missing.join(', ')}` : null;
    }
    if (step === 3) {
      if (!hasSocial) return 'En az bir sosyal bağlantı gerekli';
      const missing: string[] = [];
      if (!linkedinValid) missing.push('Geçerli LinkedIn URL');
      if (!websiteValid) missing.push('Geçerli Web URL');
      if (!instagramValid) missing.push('Geçerli Instagram kullanıcı adı');
      return missing.length ? `Eksik: ${missing.join(', ')}` : null;
    }
    if (step === 4) {
      const missing: string[] = [];
      if (!form.requestedTier) missing.push('Kademe');
      if (!form.targetStatus) missing.push('Aktivasyon Akışı');
      return missing.length ? `Eksik: ${missing.join(', ')}` : null;
    }
    return null;
  }, [
    step,
    user,
    form.companyName,
    form.sectorCodes,
    form.city,
    form.race,
    form.clanName,
    form.requestedTier,
    form.targetStatus,
    hasSocial,
    linkedinValid,
    websiteValid,
    instagramValid,
  ]);

  // ------------------------------------------------------------------
  // Submit
  // ------------------------------------------------------------------
  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const adminNote = buildAuditNote(auditCategory, auditNoteBody);
      const phoneParts = splitPhone(user.mode === 'new' ? user.phone : user.selectedUser?.phone);

      const baseForm: Partial<AdminCreateMemberRequest> = {
        ...form,
        adminNote,
        // Instagram alanı handle olarak saklanıyor — backend full URL bekliyor
        instagramUrl: form.instagramUrl
          ? `https://instagram.com/${form.instagramUrl}`
          : undefined,
      };

      const userPart: Partial<AdminCreateMemberRequest> =
        user.mode === 'new'
          ? {
              userId: undefined,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              createIfMissing: true,
            }
          : {
              userId: user.selectedUser!.userId,
              email: user.selectedUser!.email,
              createIfMissing: false,
            };

      const payload = {
        ...baseForm,
        ...userPart,
        ...phoneParts,
      } as AdminCreateMemberRequest;

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
  // Google Places şirket seçimi — companyAddress payload'ı doldurur
  // ------------------------------------------------------------------
  const handlePlaceSelect = (result: CompanyPlaceResult) => {
    set('companyName', result.companyName || result.address.displayName || '');

    if (result.address.city) {
      const matched = matchTrCity(result.address.city);
      if (matched) {
        set('city', matched);
        setPlaceCityHint(null);
      } else {
        setPlaceCityHint(result.address.city);
      }
    }

    const addr: CompanyAddressRequest = {
      city: result.address.city ?? undefined,
      district: result.address.district ?? undefined,
      country: result.address.country ?? undefined,
      postalCode: result.address.postalCode ?? undefined,
      description: result.address.description ?? undefined,
      latitude: result.address.latitude ?? undefined,
      longitude: result.address.longitude ?? undefined,
    };
    set('companyAddress', addr);
  };

  // ------------------------------------------------------------------
  // Sülale kataloga ekleme
  // ------------------------------------------------------------------
  const handleCreateFamily = async () => {
    const name = form.clanName?.trim();
    if (!form.race || !name) return;
    setFamilyCreating(true);
    setFamilyCreateError(null);
    try {
      const created = await nbAdminService.createFamily(name, form.race);
      if (created) {
        setFamilies((prev) =>
          prev.some((f) => f.id === created.id) ? prev : [...prev, created],
        );
      } else {
        const refreshed = await nbAdminService.listFamiliesByRace(form.race);
        setFamilies(refreshed);
      }
    } catch (e: any) {
      if (e?.response?.status === 409) {
        const refreshed = await nbAdminService.listFamiliesByRace(form.race);
        setFamilies(refreshed);
      } else {
        setFamilyCreateError(
          e?.response?.data?.error?.message ?? e?.message ?? 'Sülale eklenemedi',
        );
      }
    } finally {
      setFamilyCreating(false);
    }
  };

  const clanInCatalog = useMemo(() => {
    const name = form.clanName?.trim().toLowerCase();
    if (!name) return true;
    return families.some((f) => f.familyName.toLowerCase() === name);
  }, [families, form.clanName]);

  // ------------------------------------------------------------------
  // Auto-fill banner
  // ------------------------------------------------------------------
  const prefillBanner = useMemo(() => {
    if (!user.selectedUser || prefilledFields.length === 0) return null;
    const u = user.selectedUser;
    const name = [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email;
    return (
      <Alert severity="info" variant="outlined" icon={false}>
        <Typography variant="body2">
          <b>{name}</b> kullanıcısının NartGo profilinden{' '}
          <b>{prefilledFields.length}</b> alan dolduruldu:{' '}
          <Typography component="span" variant="caption" color="text.secondary">
            {prefilledFields.join(', ')}
          </Typography>
        </Typography>
        <Typography variant="caption" color="text.secondary">
          NartGo profilinden alınan alanlar kilitlidir. Değiştirmek için ilgili
          alanın altındaki <b>Değiştir</b> linkine tıkla.
        </Typography>
      </Alert>
    );
  }, [user.selectedUser, prefilledFields]);

  // ------------------------------------------------------------------
  // Lock helper
  // ------------------------------------------------------------------
  const lockedHelper = (field: string) => {
    if (!lockedFields.has(field)) return undefined;
    return (
      <Box component="span" sx={{ display: 'inline-flex', gap: 0.5, alignItems: 'center' }}>
        <LockOutlinedIcon sx={{ fontSize: 12, verticalAlign: 'middle', color: 'text.disabled' }} />
        <Typography component="span" variant="caption" color="text.secondary">
          NartGo&apos;dan alındı ·{' '}
        </Typography>
        <Link
          component="button"
          type="button"
          underline="hover"
          sx={{ fontSize: 'inherit', verticalAlign: 'baseline' }}
          onClick={() => unlock(field)}
        >
          Değiştir
        </Link>
      </Box>
    );
  };

  // ------------------------------------------------------------------
  // Step 0 — Kullanıcı + Telefon
  // ------------------------------------------------------------------
  const renderUserStep = () => {
    const phoneDigits = (user.phone || '').replace(/\D/g, '').slice(-10);
    return (
      <Stack spacing={2}>
        <FindOrCreateUser value={user} onChange={setUser} />
        {user.mode === 'new' && (
          <SectionPaper title="İletişim" hint="Üyeyle iletişim için telefon — opsiyonel.">
            <PhoneTrInput
              value={phoneDigits}
              onChange={(digits) =>
                setUser({ ...user, phone: digits ? `+90 ${digits}` : '' })
              }
              helperText="WhatsApp veya arama için kullanılabilir."
            />
          </SectionPaper>
        )}
      </Stack>
    );
  };

  // ------------------------------------------------------------------
  // Step 1 — İşletme (apply step 1)
  // ------------------------------------------------------------------
  const renderBusinessStep = () => {
    const addr = form.companyAddress;
    return (
      <Stack spacing={2}>
        {prefillBanner}

        <SectionPaper title="Şirket Bilgisi">
          <Grid container spacing={2.5}>
            <Grid size={12}>
              <CompanyPlacesAutocomplete
                required
                value={form.companyName ?? ''}
                onChange={(v) => set('companyName', v)}
                onPlaceSelect={handlePlaceSelect}
                helperText={(() => {
                  const nartgoCompany = user.selectedUser?.companyName?.trim();
                  if (!nartgoCompany) return ' ';
                  const currentVal = form.companyName?.trim() ?? '';
                  if (currentVal === nartgoCompany) {
                    return `NartGo profilinden alındı: ${nartgoCompany}`;
                  }
                  return (
                    <Box component="span">
                      NartGo&apos;da kayıtlı: <b>{nartgoCompany}</b>{' · '}
                      <Link
                        component="button"
                        type="button"
                        underline="hover"
                        onClick={() => set('companyName', nartgoCompany)}
                      >
                        Kullan
                      </Link>
                    </Box>
                  );
                })()}
              />
            </Grid>

            {addr?.description && (
              <Grid size={12}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 1.5,
                    py: 1,
                    bgcolor: 'action.hover',
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <LocationOnOutlinedIcon fontSize="small" color="action" />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ lineHeight: 1.3 }}>
                      {addr.description}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Google&apos;dan alındı
                    </Typography>
                  </Box>
                  <Tooltip title="Adresi temizle">
                    <IconButton
                      size="small"
                      onClick={() => set('companyAddress', undefined)}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Grid>
            )}

            <Grid size={12}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
                Sektör(ler) * <Typography component="span" variant="caption" color="text.secondary">— en fazla 3</Typography>
              </Typography>
              <SectorCheckboxGrid
                sectors={sectors}
                loading={sectorsLoading}
                value={form.sectorCodes ?? []}
                onChange={(codes) => set('sectorCodes', codes)}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <CatalogAutocomplete<string>
                label="Şehir"
                required
                disabled={lockedFields.has('city')}
                options={TR_CITIES as unknown as string[]}
                value={form.city ?? null}
                onChange={(v) => {
                  set('city', v ?? undefined);
                  setPlaceCityHint(null);
                }}
                placeholder="81 il listesi"
                helperText={
                  lockedFields.has('city')
                    ? lockedHelper('city')
                    : placeCityHint && !form.city
                    ? `"${placeCityHint}" listede bulunamadı — manuel seç`
                    : undefined
                }
              />
            </Grid>

            <Grid size={12}>
              <TextField
                label="İşletme Tanıtımı (opsiyonel)"
                fullWidth
                multiline
                rows={3}
                size="small"
                value={form.businessDescription ?? ''}
                onChange={(e) => set('businessDescription', e.target.value)}
                inputProps={{ maxLength: 300 }}
                placeholder="Ne iş yaptığınızı kısaca anlatın"
                helperText={`${form.businessDescription?.length ?? 0} / 300`}
              />
            </Grid>
          </Grid>
        </SectionPaper>
      </Stack>
    );
  };

  // ------------------------------------------------------------------
  // Step 2 — Kimlik (apply step 2)
  // ------------------------------------------------------------------
  const renderIdentityStep = () => (
    <Stack spacing={2}>
      {prefillBanner}
      <SectionPaper
        title="Kafkas Kimliği"
        hint="Halk seçimi sülale katalogunu filtreler."
      >
        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, md: 6 }}>
            <CatalogAutocomplete<{ value: NbRace; label: string }>
              label="Halk"
              required
              disabled={lockedFields.has('race')}
              options={RACES}
              value={RACES.find((r) => r.value === form.race) ?? null}
              onChange={(v) => {
                set('race', v?.value);
                set('clanName', undefined);
              }}
              getOptionLabel={(r) => r.label}
              isOptionEqualToValue={(a, b) => a.value === b.value}
              helperText={lockedHelper('race')}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Autocomplete<RaceFamily, false, false, true>
              size="small"
              fullWidth
              freeSolo
              disabled={
                !form.race ||
                lockedFields.has('clanName') ||
                form.clanName?.toLowerCase() === 'bilmiyorum'
              }
              loading={familiesLoading}
              options={families}
              value={
                families.find(
                  (f) =>
                    f.familyName.toLowerCase() ===
                    (form.clanName ?? '').toLowerCase(),
                ) ??
                form.clanName ??
                null
              }
              onChange={(_, v) => {
                if (v == null) set('clanName', undefined);
                else if (typeof v === 'string') set('clanName', v);
                else set('clanName', v.familyName);
              }}
              onInputChange={(_, v, reason) => {
                if (reason === 'input') set('clanName', v);
              }}
              getOptionLabel={(opt) =>
                typeof opt === 'string' ? opt : opt.familyName
              }
              isOptionEqualToValue={(a, b) =>
                typeof a !== 'string' && typeof b !== 'string' && a.id === b.id
              }
              renderOption={(props, opt) => {
                const key = typeof opt === 'string' ? `str:${opt}` : `id:${opt.id}`;
                const label = typeof opt === 'string' ? opt : opt.familyName;
                const { key: _k, ...rest } = props as React.HTMLAttributes<HTMLLIElement> & {
                  key?: React.Key;
                };
                return (
                  <li {...rest} key={key}>
                    {label}
                  </li>
                );
              }}
              noOptionsText={
                familiesLoading
                  ? 'Yükleniyor…'
                  : !form.race
                  ? 'Önce halk seç'
                  : families.length === 0
                  ? `${form.race} için katalogda kayıt yok — yine de yazabilirsin`
                  : 'Eşleşme yok — "Kataloga ekle" ile saklayabilirsin'
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Sülale *"
                  placeholder={form.race ? 'Katalogdan seç veya yeni yaz' : 'Önce halk seç'}
                  helperText={
                    lockedFields.has('clanName')
                      ? lockedHelper('clanName')
                      : !form.clanName?.trim()
                      ? ' '
                      : clanInCatalog
                      ? 'Katalogtan seçildi'
                      : 'Bu sülale katalogda yok'
                  }
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {familiesLoading ? <CircularProgress size={16} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={form.clanName?.toLowerCase() === 'bilmiyorum'}
                  disabled={lockedFields.has('clanName')}
                  onChange={(e) =>
                    set('clanName', e.target.checked ? 'bilmiyorum' : undefined)
                  }
                />
              }
              label="Sülale bilinmiyor"
              sx={{ mt: 0.5 }}
            />
            {!clanInCatalog &&
              form.clanName?.trim() &&
              form.clanName?.toLowerCase() !== 'bilmiyorum' &&
              form.race && (
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ mt: 1 }}
              >
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={
                    familyCreating ? (
                      <CircularProgress size={14} />
                    ) : (
                      <AddCircleOutlineIcon />
                    )
                  }
                  disabled={familyCreating}
                  onClick={handleCreateFamily}
                >
                  &quot;{form.clanName.trim()}&quot; sülalesini {form.race} katalogüna ekle
                </Button>
                {familyCreateError && (
                  <Typography variant="caption" color="error">
                    {familyCreateError}
                  </Typography>
                )}
              </Stack>
            )}
          </Grid>
          <Grid size={12}>
            <TextField
              label="Memleket (opsiyonel)"
              fullWidth
              size="small"
              disabled={lockedFields.has('hometownDetail')}
              value={form.hometownDetail ?? ''}
              onChange={(e) => set('hometownDetail', e.target.value)}
              placeholder="örn. Uzunyayla / Maykop"
              helperText={
                lockedFields.has('hometownDetail')
                  ? lockedHelper('hometownDetail')
                  : 'Köy / şehir / cumhuriyet — serbest format'
              }
            />
          </Grid>
        </Grid>
      </SectionPaper>
    </Stack>
  );

  // ------------------------------------------------------------------
  // Step 3 — Sosyal (apply step 3)
  // ------------------------------------------------------------------
  const renderSocialStep = () => (
    <Stack spacing={2}>
      <SectionPaper
        title="Sosyal Kanıt"
        hint="Komite doğrulaması için yardımcı. En az biri zorunlu."
      >
        <Grid container spacing={2.5}>
          <Grid size={12}>
            <SocialPrefixField
              kind="linkedin"
              value={form.linkedinUrl ?? ''}
              onChange={(v) => set('linkedinUrl', v || undefined)}
              error={!linkedinValid}
              helperText={
                !linkedinValid
                  ? 'Geçersiz LinkedIn URL'
                  : 'Şirket profili için company/sirketadi kullan'
              }
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <SocialPrefixField
              kind="website"
              value={form.websiteUrl ?? ''}
              onChange={(v) => set('websiteUrl', v || undefined)}
              error={!websiteValid}
              helperText={!websiteValid ? 'Geçersiz URL' : undefined}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <SocialPrefixField
              kind="instagram"
              value={form.instagramUrl ?? ''}
              onChange={(v) => set('instagramUrl', v || undefined)}
              error={!instagramValid}
              helperText={
                !instagramValid
                  ? 'Sadece harf/rakam/nokta/alt çizgi'
                  : 'Sadece kullanıcı adı — @ veya URL otomatik temizlenir'
              }
            />
          </Grid>
        </Grid>

        {!hasSocial && (
          <Alert severity="warning" sx={{ mt: 1 }}>
            Devam edebilmek için en az bir bağlantı eklemen gerekiyor.
          </Alert>
        )}
      </SectionPaper>
    </Stack>
  );

  // ------------------------------------------------------------------
  // Step 4 — Paket & Aktivasyon (apply step 4 + admin-only options)
  // ------------------------------------------------------------------
  const renderPackageStep = () => (
    <Stack spacing={2}>
      <SectionPaper title="Kademe" hint="Üyenin paket seviyesi — kaynak: tier katalog.">
        <TierRadioCardGroup
          tiers={tiers}
          loading={tiersLoading}
          value={form.requestedTier}
          onChange={(code) => set('requestedTier', code)}
        />
      </SectionPaper>

      <SectionPaper
        title="Aktivasyon Akışı"
        hint="Üyenin sistemde nasıl bir başlangıç yapacağı."
      >
        <RadioCardGroup
          options={TARGET_STATUS_OPTIONS}
          value={form.targetStatus as ActivationFlow | undefined}
          onChange={(v) => set('targetStatus', v)}
        />
      </SectionPaper>

      {form.targetStatus === 'ACTIVE' && (
        <SectionPaper
          title="Ödeme Tipi"
          hint="Hemen aktif üyelikte ücretin nasıl alındığı — period kaydına işlenir."
        >
          <RadioCardGroup
            options={PAYMENT_OPTIONS}
            value={form.grantFreeMembership ? 'FREE' : 'OFFLINE_PAID'}
            onChange={(v) => set('grantFreeMembership', v === 'FREE')}
          />
        </SectionPaper>
      )}

      <SectionPaper
        title="Ek Ayrıcalıklar"
        hint="Üyenin profilinde gözükecek opsiyonel rozetler."
      >
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
                <b>&quot;Doğrulanmış İşletme&quot; rozeti</b>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Admin VIP / referansla doğrulamış sayılır; profilde rozet gözükür.
              </Typography>
            </Box>
          }
        />
      </SectionPaper>
    </Stack>
  );

  // ------------------------------------------------------------------
  // Step 5 — Onay + Audit
  // ------------------------------------------------------------------
  const renderConfirmStep = () => {
    const tier = tiers.find((t) => t.code === form.requestedTier);
    const raceLabel = RACES.find((r) => r.value === form.race)?.label;
    const sectorLabels = (form.sectorCodes ?? [])
      .map((code) => {
        const s = sectors.find((x) => x.code === code);
        return s ? s.nameTr : code;
      })
      .join(', ');

    const userLine =
      user.mode === 'new'
        ? `Yeni kullanıcı: ${user.firstName} ${user.lastName} <${user.email}> (Keycloak'ta oluşturulacak)`
        : user.selectedUser
        ? `Mevcut kullanıcı: ${user.selectedUser.email}`
        : '—';

    return (
      <Stack spacing={2}>
        <ConfirmationStep
          intro={
            <>
              Bu form self-service apply akışını <b>atlar</b>. Komite kararı yok,
              mobil onay akışı yok. KVKK onaylarının offline alınmış olduğu
              varsayılır. Audit notu kalıcı log&apos;a yazılır.
            </>
          }
          sections={[
            {
              title: 'Kullanıcı',
              rows: [{ label: 'Kayıt', value: userLine }],
            },
            {
              title: 'İşletme',
              rows: [
                { label: 'Şirket', value: form.companyName },
                { label: 'Sektör', value: sectorLabels || '—' },
                { label: 'Şehir', value: form.city },
                {
                  label: 'Adres',
                  value: form.companyAddress?.description,
                },
                {
                  label: 'Tanıtım',
                  value: form.businessDescription,
                },
              ],
            },
            {
              title: 'Kimlik',
              rows: [
                { label: 'Halk', value: raceLabel },
                { label: 'Sülale', value: form.clanName },
                { label: 'Memleket', value: form.hometownDetail },
              ],
            },
            {
              title: 'Sosyal',
              rows: [
                { label: 'LinkedIn', value: form.linkedinUrl },
                { label: 'Web', value: form.websiteUrl },
                {
                  label: 'Instagram',
                  value: form.instagramUrl
                    ? `@${form.instagramUrl}`
                    : undefined,
                },
              ],
            },
            {
              title: 'Üyelik & Aktivasyon',
              rows: [
                { label: 'Kademe', value: tier?.displayName ?? form.requestedTier },
                {
                  label: 'Aktivasyon',
                  value: form.targetStatus
                    ? TARGET_STATUS_LABEL[form.targetStatus as ActivationFlow]
                    : undefined,
                },
                {
                  label: 'Ödeme',
                  value:
                    form.targetStatus === 'ACTIVE'
                      ? form.grantFreeMembership
                        ? 'Ücretsiz (0 TL)'
                        : 'Offline tahsil edildi'
                      : 'Üye kendi ödeyecek (7 gün penceresi)',
                },
                {
                  label: 'Doğrulanmış İşletme rozeti',
                  value: form.verifiedBusiness ? '✓ Aktif' : null,
                },
              ],
            },
          ]}
          warning={
            user.mode === 'new'
              ? "Bu işlem Keycloak'ta yeni kullanıcı oluşturacak — kullanıcı email adresinde doğrulama linki alacak ve geçici şifreyle giriş yapması istenecek."
              : undefined
          }
        />

        <SectionPaper
          title="Audit Notu *"
          hint="Kategori + en az 30 karakter açıklama — log'a kalıcı yazılır."
        >
          <AuditNoteBlock
            categories={AUDIT_CATEGORIES}
            category={auditCategory}
            onCategoryChange={setAuditCategory}
            note={auditNoteBody}
            onNoteChange={setAuditNoteBody}
            placeholder="Neden manuel oluşturuluyor? (örn. 'X şirketi ile sponsor anlaşması, fatura no #1234')"
          />
        </SectionPaper>
      </Stack>
    );
  };

  const stepBody = () => {
    switch (step) {
      case 0:
        return renderUserStep();
      case 1:
        return renderBusinessStep();
      case 2:
        return renderIdentityStep();
      case 3:
        return renderSocialStep();
      case 4:
        return renderPackageStep();
      case 5:
        return renderConfirmStep();
      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleCloseRequest}
      maxWidth="md"
      fullWidth
      fullScreen={fullScreen}
      PaperProps={{
        sx: {
          borderRadius: fullScreen ? 0 : 2,
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <DialogTitle
        sx={{
          px: { xs: 2.5, sm: 3 },
          py: 2,
          fontWeight: 700,
          fontSize: '1.1rem',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        Manuel Üye Oluştur
      </DialogTitle>

      <DialogContent
        sx={{
          px: { xs: 2.5, sm: 3 },
          py: 3,
          overflowY: 'auto',
          flex: 1,
        }}
      >
        <Stack spacing={3}>
          <Stepper
            activeStep={step}
            alternativeLabel
            sx={{
              '& .MuiStepLabel-label': { fontSize: '0.74rem', mt: 0.5 },
              '& .MuiStepConnector-line': { borderColor: 'divider' },
            }}
          >
            {STEPS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          {error && <Alert severity="error">{error}</Alert>}
          {stepBody()}
        </Stack>
      </DialogContent>

      <DialogActions
        sx={{
          px: { xs: 2.5, sm: 3 },
          py: 2,
          borderTop: '1px solid',
          borderColor: 'divider',
          gap: 1,
        }}
      >
        <Button onClick={handleCloseRequest} disabled={submitting} color="inherit">
          İptal
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        {step > 0 && (
          <Button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={submitting}
            color="inherit"
          >
            Geri
          </Button>
        )}
        {step < STEPS.length - 1 ? (
          <Tooltip
            title={stepBlockerHint ?? ''}
            disableHoverListener={!stepBlockerHint}
            disableFocusListener={!stepBlockerHint}
            arrow
            placement="top"
          >
            <Box component="span">
              <Button
                variant="contained"
                onClick={() => setStep((s) => s + 1)}
                disabled={!stepValid[step] || submitting}
                sx={{ minWidth: 88 }}
              >
                İleri
              </Button>
            </Box>
          </Tooltip>
        ) : (
          <Tooltip
            title={!canSubmit ? 'Önceki adımlarda eksikler var' : ''}
            disableHoverListener={canSubmit}
            disableFocusListener={canSubmit}
            arrow
            placement="top"
          >
            <Box component="span">
              <Button
                variant="contained"
                color="primary"
                disabled={!canSubmit || submitting}
                onClick={submit}
                sx={{ minWidth: 130 }}
              >
                {submitting ? 'Oluşturuluyor…' : 'Üyeyi Oluştur'}
              </Button>
            </Box>
          </Tooltip>
        )}
      </DialogActions>
    </Dialog>
  );
}
