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
import { nbAdminService } from '../../services/nartbusiness/nbAdminService';
import type {
  AdminCreateMemberRequest,
  MembershipTier,
  NbRace,
  Sector,
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
  RadioCardGroup,
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

const TIER_OPTIONS: RadioCardOption<MembershipTier>[] = [
  { value: 'KURUCU', title: 'Kurucu', description: '10.000 TL / yıl' },
  { value: 'STANDART', title: 'Standart', description: '15.000 TL / yıl' },
  { value: 'GENC_GIRISIMCI', title: 'Genç Girişimci', description: '5.000 TL / yıl' },
];

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

const STEPS = ['Kullanıcı', 'Şirket & Kimlik', 'Üyelik & Ödeme', 'Onay'];

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
    s.trim().toLowerCase()
      .replace(/i̇/g, 'i').replace(/ı/g, 'i')
      .replace(/ğ/g, 'g').replace(/ü/g, 'u')
      .replace(/ş/g, 's').replace(/ö/g, 'o')
      .replace(/ç/g, 'c').replace(/İ/g, 'i');
  const target = norm(googleCity);
  return (TR_CITIES as unknown as string[]).find((c) => norm(c) === target);
}

/** Form alanı string olarak hometownCity + hometownVillage'i birleştirir. */
function composeHometown(city: string, village: string): string | undefined {
  const c = city.trim();
  const v = village.trim();
  if (!c && !v) return undefined;
  if (!c) return v;
  if (!v) return c;
  return `${c} / ${v}`;
}

// Local SectionPaper — shared NbSectionPaper'a alias (typo riskini azalt)
const SectionPaper = NbSectionPaper;

export default function NbCreateMemberDialog({ open, onClose, onCreated }: Props) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const [step, setStep] = useState(0);

  const [user, setUser] = useState<FindOrCreateUserValue>(initialUser);

  // Step 2 form state — hometownCity/Village ayrı tutulup submit'te birleştirilir
  const [form, setForm] = useState<Partial<AdminCreateMemberRequest>>({
    requestedTier: 'STANDART',
    race: 'adige',
    targetStatus: 'ACTIVE',
    grantFreeMembership: false,
    verifiedBusiness: false,
  });
  const [hometownCity, setHometownCity] = useState('');
  const [hometownVillage, setHometownVillage] = useState('');

  // Katalog state'leri
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [sectorsLoading, setSectorsLoading] = useState(false);
  const [families, setFamilies] = useState<RaceFamily[]>([]);
  const [familiesLoading, setFamiliesLoading] = useState(false);

  // Auto-fill takibi — kullanıcı seçilince hangi alanlar NartGo profilinden yüklendi
  const [prefilledFields, setPrefilledFields] = useState<string[]>([]);
  const lastPrefilledUserIdRef = useRef<string | null>(null);

  // Kilitli alanlar — NartGo'dan otomatik doldurulan alanlar başlangıçta kilitli gelir.
  // Admin "Değiştir" ile kilidi açabilir.
  const [lockedFields, setLockedFields] = useState<Set<string>>(new Set());
  const unlock = (field: string) =>
    setLockedFields((prev) => { const s = new Set(prev); s.delete(field); return s; });

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
      requestedTier: 'STANDART',
      race: 'adige',
      targetStatus: 'ACTIVE',
      grantFreeMembership: false,
      verifiedBusiness: false,
    });
    setHometownCity('');
    setHometownVillage('');
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
        // Backend bazen aynı race için aynı familyName'i farklı id ile dönebiliyor —
        // MUI Autocomplete default key getOptionLabel'i kullandığı için duplicate
        // React key uyarısı atıyor. Aynı isimleri (case-insensitive) ilk gelen id
        // ile sakla, kullanıcı tekrar tekrar aynı seçeneği görmesin.
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
      // Kullanıcı seçimi kaldırıldı — son prefill'i ve kilitleri temizle
      if (lastPrefilledUserIdRef.current) {
        setPrefilledFields([]);
        setLockedFields(new Set());
        lastPrefilledUserIdRef.current = null;
      }
      return;
    }
    if (lastPrefilledUserIdRef.current === u.userId) return; // tekrar pre-fill'leme

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
      return next;
    });
    if (u.hometownCity && u.hometownCity.trim()) {
      setHometownCity(u.hometownCity.trim());
      filled.push('Memleket şehir');
      newLocked.add('hometownCity');
    }
    if (u.hometownVillage && u.hometownVillage.trim()) {
      setHometownVillage(u.hometownVillage.trim());
      filled.push('Memleket köy');
      newLocked.add('hometownVillage');
    }
    setPrefilledFields(filled);
    setLockedFields(newLocked);
    lastPrefilledUserIdRef.current = u.userId;
  }, [open, user.selectedUser]);

  // ------------------------------------------------------------------
  // Validation
  // ------------------------------------------------------------------
  const linkedinValid = !form.linkedinUrl || URL_RX.test(form.linkedinUrl);
  const websiteValid = !form.websiteUrl || URL_RX.test(form.websiteUrl);
  const instagramValid = !form.instagramUrl || URL_RX.test(form.instagramUrl);

  const companyValid =
    !!form.companyName?.trim() &&
    !!form.sectorCodes?.length &&
    !!form.city &&
    !!form.race &&
    !!form.clanName?.trim() &&
    linkedinValid &&
    websiteValid &&
    instagramValid;

  const statusValid = !!form.requestedTier && !!form.targetStatus;
  const auditValid = isAuditNoteValid(auditNoteBody);

  const stepValid: Record<number, boolean> = {
    0: isFindOrCreateValid(user),
    1: companyValid,
    2: statusValid && auditValid,
    3: true,
  };
  const canSubmit = stepValid[0] && stepValid[1] && stepValid[2];

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
      if (!form.race) missing.push('Halk');
      if (!form.clanName?.trim()) missing.push('Sülale');
      if (!linkedinValid) missing.push('Geçerli LinkedIn URL');
      if (!websiteValid) missing.push('Geçerli Web URL');
      if (!instagramValid) missing.push('Geçerli Instagram URL');
      return missing.length ? `Eksik: ${missing.join(', ')}` : null;
    }
    if (step === 2) {
      const missing: string[] = [];
      if (!form.requestedTier) missing.push('Kademe');
      if (!form.targetStatus) missing.push('Aktivasyon Akışı');
      if (!auditValid) missing.push('Audit notu (min 30 karakter)');
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
    linkedinValid,
    websiteValid,
    instagramValid,
    form.requestedTier,
    form.targetStatus,
    auditValid,
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
      const hometownDetail = composeHometown(hometownCity, hometownVillage);
      const baseForm = {
        ...form,
        hometownDetail,
        adminNote,
      } as AdminCreateMemberRequest;
      const payload: AdminCreateMemberRequest =
        user.mode === 'new'
          ? {
              ...baseForm,
              userId: undefined,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              phone: user.phone.trim() || undefined,
              createIfMissing: true,
            }
          : {
              ...baseForm,
              userId: user.selectedUser!.userId,
              email: user.selectedUser!.email,
              phone: user.selectedUser!.phone?.trim() || undefined,
              createIfMissing: false,
            };
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
  // Google Places şirket seçimi
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
        // 409 ya da boş yanıt — refresh ederek bulmaya çalış
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

  // Şu anda girilen clan adı katalogda var mı?
  const clanInCatalog = useMemo(() => {
    const name = form.clanName?.trim().toLowerCase();
    if (!name) return true; // boşken "yok" göstermeye gerek yok
    return families.some((f) => f.familyName.toLowerCase() === name);
  }, [families, form.clanName]);

  // ------------------------------------------------------------------
  // Auto-fill banner — Step 2 + Step 3 üst kısmında kullanıcıyı bilgilendir
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
          NartGo profilinden alınan alanlar kilitlidir. Değiştirmek için ilgili alanın altındaki{' '}
          <b>Değiştir</b> linkine tıkla.
        </Typography>
      </Alert>
    );
  }, [user.selectedUser, prefilledFields]);

  // ------------------------------------------------------------------
  // Lock helper — NartGo'dan gelen alan kilidi + "Değiştir" linki
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
  // Steps
  // ------------------------------------------------------------------
  const renderUserStep = () => <FindOrCreateUser value={user} onChange={setUser} />;

  const renderCompanyStep = () => (
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
                    NartGo'da kayıtlı: <b>{nartgoCompany}</b>{' · '}
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
          <Grid size={{ xs: 12, md: 6 }}>
            <Autocomplete<Sector, true>
              multiple
              size="small"
              fullWidth
              loading={sectorsLoading}
              options={sectors}
              value={sectors.filter((s) => form.sectorCodes?.includes(s.code))}
              onChange={(_, v) => set('sectorCodes', v.map((s) => s.code))}
              getOptionLabel={(s) => `${s.nameTr} (${s.code})`}
              isOptionEqualToValue={(a, b) => a.code === b.code}
              noOptionsText={sectorsLoading ? 'Yükleniyor…' : 'Sektör bulunamadı'}
              getOptionDisabled={() => (form.sectorCodes?.length ?? 0) >= 3}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={<>Sektör(ler) *</>}
                  placeholder="Sektör katalogundan seç (maks. 3)"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {sectorsLoading ? <CircularProgress size={16} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <CatalogAutocomplete<string>
              label="Şehir"
              required
              disabled={lockedFields.has('city')}
              options={TR_CITIES as unknown as string[]}
              value={form.city ?? null}
              onChange={(v) => { set('city', v ?? undefined); setPlaceCityHint(null); }}
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
        </Grid>
      </SectionPaper>

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
                // Halk değişince eski sülale geçersiz olabilir — temizle
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
              disabled={!form.race || lockedFields.has('clanName')}
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
                // MUI default key = getOptionLabel — aynı isim duplicate key uyarısı atıyor.
                // Kendi key'imizi id (object) veya string-value ile ver.
                const key = typeof opt === 'string' ? `str:${opt}` : `id:${opt.id}`;
                const label = typeof opt === 'string' ? opt : opt.familyName;
                // props.key'i çıkar ki ESLint "key spread" hatası atmasın
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
                  : 'Eşleşme yok — yazdığın değer aşağıdaki "Kataloga ekle" ile saklanabilir'
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Sülale *"
                  placeholder={
                    form.race
                      ? 'Katalogdan seç veya yeni yaz'
                      : 'Önce halk seç'
                  }
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
            {!clanInCatalog && form.clanName?.trim() && form.race && (
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
                  "{form.clanName.trim()}" sülalesini {form.race} katalogüna ekle
                </Button>
                {familyCreateError && (
                  <Typography variant="caption" color="error">
                    {familyCreateError}
                  </Typography>
                )}
              </Stack>
            )}
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              label="Memleket — Şehir (opsiyonel)"
              fullWidth
              size="small"
              disabled={lockedFields.has('hometownCity')}
              value={hometownCity}
              onChange={(e) => setHometownCity(e.target.value)}
              placeholder="örn. Kayseri / Maykop"
              helperText={lockedHelper('hometownCity')}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              label="Memleket — Köy (opsiyonel)"
              fullWidth
              size="small"
              disabled={lockedFields.has('hometownVillage')}
              value={hometownVillage}
              onChange={(e) => setHometownVillage(e.target.value)}
              placeholder="örn. Uzunyayla"
              helperText={lockedHelper('hometownVillage')}
            />
          </Grid>
        </Grid>
      </SectionPaper>

      <SectionPaper
        title="Sosyal Bağlantılar"
        hint="Komite doğrulaması için yardımcı — opsiyonel."
      >
        <Grid container spacing={2.5}>
          <Grid size={12}>
            <TextField
              label="LinkedIn"
              fullWidth
              size="small"
              value={form.linkedinUrl ?? ''}
              onChange={(e) => set('linkedinUrl', e.target.value)}
              error={!linkedinValid}
              helperText={
                !linkedinValid ? 'Geçersiz URL — https:// ile başlamalı' : ' '
              }
              placeholder="https://linkedin.com/in/…"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              label="Web Sitesi"
              fullWidth
              size="small"
              value={form.websiteUrl ?? ''}
              onChange={(e) => set('websiteUrl', e.target.value)}
              error={!websiteValid}
              helperText={!websiteValid ? 'Geçersiz URL' : ' '}
              placeholder="https://…"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              label="Instagram"
              fullWidth
              size="small"
              value={form.instagramUrl ?? ''}
              onChange={(e) => set('instagramUrl', e.target.value)}
              error={!instagramValid}
              helperText={!instagramValid ? 'Geçersiz URL' : ' '}
              placeholder="https://instagram.com/…"
            />
          </Grid>
        </Grid>
      </SectionPaper>
    </Stack>
  );

  const renderStatusStep = () => (
    <Stack spacing={2}>
      <SectionPaper
        title="Kademe"
        hint="Üyenin paket seviyesi — yıllık ücret ve faydalar buna bağlıdır."
      >
        <RadioCardGroup
          label={null}
          options={TIER_OPTIONS}
          value={form.requestedTier}
          onChange={(v) => set('requestedTier', v)}
        />
      </SectionPaper>

      <SectionPaper
        title="Aktivasyon Akışı"
        hint="Üyenin sistemde nasıl bir başlangıç yapacağı."
      >
        <RadioCardGroup
          label={null}
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
            label={null}
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
                <b>"Doğrulanmış İşletme" rozeti</b>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Admin VIP / referansla doğrulamış sayılır; profilde rozet gözükür.
              </Typography>
            </Box>
          }
        />
      </SectionPaper>

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

  const renderConfirmStep = () => {
    const tierLabel = TIER_OPTIONS.find((t) => t.value === form.requestedTier)?.title;
    const raceLabel = RACES.find((r) => r.value === form.race)?.label;
    const sectorLabels = (form.sectorCodes ?? [])
      .map((code) => { const s = sectors.find((x) => x.code === code); return s ? s.nameTr : code; })
      .join(', ');
    const hometownDetail = composeHometown(hometownCity, hometownVillage);

    const userLine =
      user.mode === 'new'
        ? `Yeni kullanıcı: ${user.firstName} ${user.lastName} <${user.email}> (Keycloak'ta oluşturulacak)`
        : user.selectedUser
        ? `Mevcut kullanıcı: ${user.selectedUser.email}`
        : '—';

    return (
      <ConfirmationStep
        intro={
          <>
            Bu form self-service apply akışını <b>atlar</b>. Komite kararı yok, mobil
            onay akışı yok. KVKK onaylarının offline alınmış olduğu varsayılır.
            Audit notu kalıcı log'a yazılır.
          </>
        }
        sections={[
          {
            title: 'Kullanıcı',
            rows: [{ label: 'Kayıt', value: userLine }],
          },
          {
            title: 'Şirket & Kimlik',
            rows: [
              { label: 'Şirket', value: form.companyName },
              { label: 'Sektör', value: sectorLabels || '—' },
              { label: 'Şehir', value: form.city },
              { label: 'Halk', value: raceLabel },
              { label: 'Sülale', value: form.clanName },
              { label: 'Memleket', value: hometownDetail },
              { label: 'LinkedIn', value: form.linkedinUrl },
              { label: 'Web', value: form.websiteUrl },
              { label: 'Instagram', value: form.instagramUrl },
            ],
          },
          {
            title: 'Üyelik & Aktivasyon',
            rows: [
              { label: 'Kademe', value: tierLabel },
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
          {
            title: 'Audit Notu',
            content: (
              <Box
                sx={{
                  backgroundColor: 'action.hover',
                  p: 1,
                  borderRadius: 1,
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace',
                  fontSize: 12,
                }}
              >
                {buildAuditNote(auditCategory, auditNoteBody)}
              </Box>
            ),
          },
        ]}
        warning={
          user.mode === 'new'
            ? "Bu işlem Keycloak'ta yeni kullanıcı oluşturacak — kullanıcı email adresinde doğrulama linki alacak ve geçici şifreyle giriş yapması istenecek."
            : undefined
        }
      />
    );
  };

  const stepBody = () => {
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
              '& .MuiStepLabel-label': { fontSize: '0.78rem', mt: 0.5 },
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
            {/* span wrapper: disabled Button MUI Tooltip event'leri yakalamaz */}
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
