import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  FormControlLabel,
  Grid,
  IconButton,
  Link,
  MenuItem,
  Stack,
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
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { theme as adminTheme } from '../../theme';
import { nb } from '../../theme/nbBrand';
import { nbAdminService } from '../../services/nartbusiness/nbAdminService';
import type { NbPartnerOrg } from '../../services/nartbusiness/nbAdminService';
import type {
  AdminCreateMemberRequest,
  CompanyAddressRequest,
  MembershipTier,
  NbRace,
  Sector,
  TierConfig,
} from '../../services/nartbusiness/nbTypes';
import type { RaceFamily } from '../../services/nartbusiness/nbAdminService';
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
  /**
   * Başarıda çağrılır. result.invited=true ise hesap yoktu → davet e-postası
   * gönderildi (üye listede HENÜZ görünmez); false ise üye anında oluşturuldu.
   */
  onCreated: (result?: import('../../services/nartbusiness/nbAdminService').CreateMemberResult) => void;
}

type ActivationFlow = 'ACTIVE' | 'APPROVED_PENDING_PAYMENT' | 'TRIAL';

/** Profesyonel üye için önceden tanımlı ünvan/pozisyonlar. Listede yoksa "Diğer". */
const NB_JOB_TITLES = [
  'Genel Müdür',
  'Genel Müdür Yardımcısı',
  'CEO',
  'CFO',
  'CTO',
  'COO',
  'Yönetim Kurulu Üyesi',
  'Direktör',
  'Bölüm Müdürü',
  'Satınalma Müdürü',
  'Operasyon Müdürü',
  'Finans Müdürü',
  'İnsan Kaynakları Müdürü',
  'Pazarlama Müdürü',
  'Satış Müdürü',
  'Takım Lideri',
  'Müdür',
  'Danışman',
] as const;
const JOB_TITLE_OTHER = '__OTHER__';
/** Serbest girilen ünvanı Türkçe-uyumlu büyük harfe çevirir (i→İ, ı→I). */
const toTrUpper = (s: string) => s.toLocaleUpperCase('tr-TR');

const MEMBER_TYPE_OPTIONS: RadioCardOption<'BUSINESS' | 'PROFESSIONAL'>[] = [
  {
    value: 'BUSINESS',
    title: 'İşletme',
    description: 'Şirket sahibi — arz tarafı. Dizin vitrini, arz/talep/teklif. (Varsayılan)',
  },
  {
    value: 'PROFESSIONAL',
    title: 'Profesyonel',
    description:
      'Kurumda yönetici/karar verici — talep tarafı. Dizinde "Profesyonel" rozeti, yalnız talep açar.',
  },
];

const TARGET_STATUS_OPTIONS: RadioCardOption<ActivationFlow>[] = [
  {
    value: 'TRIAL',
    title: 'Ücretsiz deneme',
    description: 'Tam üyelik erişimi. Ödeme penceresi deneme bitince başlar. KAFSİAD için 60 gün seçin.',
  },
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
  TRIAL: 'Ücretsiz deneme',
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

/**
 * Premium palet artık burada TANIMLANMIYOR — `theme/nbBrand` tek kaynak.
 *
 * Bu sabitler daha önce yalnız bu modalın içinde yaşıyordu: dışarıda panel
 * NartGo yeşiline dönüyordu, yani NartBusiness kimliği tek bir diyaloğa
 * hapsolmuştu. Artık sidebar, liste ve bu modal aynı token'ları okuyor.
 */
const ELITE = {
  navy: nb.navy,
  navyDeep: nb.navyDeep,
  gold: nb.gold,
  goldSoft: nb.goldSoft,
  cream: '#FAF6E8',
  line: 'rgba(184,134,11,0.28)',
} as const;

const SERIF = '"Playfair Display", Georgia, "Times New Roman", serif';

/**
 * Modal'a özel "elite" MUI teması — admin temasını (yeşil) lacivert/altın/krem
 * ile genişletir. Böylece form mantığına dokunmadan içteki tüm kontroller de
 * (textfield, checkbox, radio card, buton) premium tona geçer.
 */
const eliteTheme = createTheme(adminTheme, {
  palette: {
    primary: { main: ELITE.navy, dark: ELITE.navyDeep, contrastText: '#FFFFFF' },
    secondary: { main: ELITE.gold, dark: '#8C6608', contrastText: '#FFFFFF' },
    background: { default: ELITE.cream, paper: '#FFFFFF' },
  },
  shape: { borderRadius: 10 },
});

/** Sağ kolondaki "Curation" bilgi kartının adıma göre içeriği. */
type SidebarBullet = { label: string; desc: string };
type SidebarContent = {
  eyebrow: string;
  title: string;
  panelTitle: string;
  body: string;
  bullets: SidebarBullet[];
};

const STEP_SIDEBAR: SidebarContent[] = [
  {
    eyebrow: 'Üyelik Protokolü',
    title: 'Kimlik Doğrulama',
    panelTitle: 'Kimlik Bütünlüğü',
    body: 'Üyeyi mevcut NartGo hesabına bağla veya yeni bir kayıt oluştur. Ağın bütünlüğü için her üye tekil bir kimliğe bağlanır.',
    bullets: [
      { label: 'Tekil Hesap', desc: 'E-posta zaten varsa mevcut kullanıcı seçilir; çift kayıt önlenir.' },
      { label: 'Güvenli Bağ', desc: 'Kimlik auth-service tarafından doğrulanır.' },
    ],
  },
  {
    eyebrow: 'Kurumsal Hizalama',
    title: 'İşletme Profili',
    panelTitle: 'Kurumsal Hizalama',
    body: 'Üyenin şirketinin temel bilgileri. Bu veriler komitenin ağ uyumunu değerlendirmesinde kritik rol oynar.',
    bullets: [
      { label: 'Sektör Eşleşmesi', desc: 'En fazla 3 sektör; eşleştirme motoru bunları kullanır.' },
      { label: 'Konum', desc: 'Şehir bilgisi dizin ve bölgesel filtrelerde kullanılır.' },
    ],
  },
  {
    eyebrow: 'Köken & Mensubiyet',
    title: 'Diaspora Kimliği',
    panelTitle: 'Kültürel Bağ',
    body: 'Kafkas kökeni ve aile bilgisi. Ağın kültürel dokusunu ve mensubiyet bağlarını oluşturur.',
    bullets: [
      { label: 'Köken', desc: 'Adige, Abhaz, Çeçen… mensubiyet kodu.' },
      { label: 'Aile', desc: 'Soy / aile bağı opsiyonel olarak ilişkilendirilir.' },
    ],
  },
  {
    eyebrow: 'Dijital Varlık',
    title: 'Sosyal & Ağ Profili',
    panelTitle: 'Dijital İz',
    body: 'Üyenin profesyonel dijital ayak izi. Stratejik eşleştirmede ve güven skorunda kullanılır.',
    bullets: [
      { label: 'Bağlantılar', desc: 'LinkedIn / web / sosyal — opsiyonel.' },
      { label: 'Görünürlük', desc: 'Profil zenginliği ağ değerini artırır.' },
    ],
  },
  {
    eyebrow: 'Paket & Aktivasyon',
    title: 'Üyelik Tahsisi',
    panelTitle: 'Yönetişim & Erişim',
    body: 'Üyenin paketini ve aktivasyon yolunu belirle. Bu seçim yönetişim seviyesini ve erişim haklarını tanımlar.',
    bullets: [
      { label: 'Aktivasyon', desc: 'Hemen aktive et ya da ödeme penceresi aç.' },
      { label: 'Tahsilat', desc: 'Offline tahsil veya ücretsiz / sponsor üyelik.' },
    ],
  },
  {
    eyebrow: 'Komite Onayı',
    title: 'Son Kontrol',
    panelTitle: 'Komite İncelemesi',
    body: 'Girilen tüm bilgileri gözden geçir ve üyeliği oluştur. Denetim notu kalıcı kayda işlenir.',
    bullets: [
      { label: 'Denetim İzi', desc: 'Manuel ekleme gerekçesi audit-log’a yazılır.' },
      { label: 'Geri Dönülemez', desc: 'Oluşturma sonrası üye dizine düşer.' },
    ],
  },
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
  const navigate = useNavigate();
  const [createdMember, setCreatedMember] = useState<{ id: string; name: string; existing: boolean } | null>(null);
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const [step, setStep] = useState(0);

  const [user, setUser] = useState<FindOrCreateUserValue>(initialUser);

  const [form, setForm] = useState<Partial<AdminCreateMemberRequest>>({
    targetStatus: 'ACTIVE',
    grantFreeMembership: false,
    verifiedBusiness: false,
    memberType: 'BUSINESS',
  });
  const isProfessional = form.memberType === 'PROFESSIONAL';
  // Ünvan "Diğer" modu: serbest metin girişi açık mı (UPPERCASE normalize edilir).
  const [titleOther, setTitleOther] = useState(false);

  // Katalog state'leri
  const [sectors, setSectors] = useState<Sector[]>([]);
  // Kurum kataloğu — üyenin ağa hangi kuruluş aracılığıyla geldiği.
  const [partnerOrgs, setPartnerOrgs] = useState<NbPartnerOrg[]>([]);
  const [sectorsLoading, setSectorsLoading] = useState(false);
  // Ünvan katalogu (DB-config; fetch boşsa hardcoded fallback)
  const [jobTitles, setJobTitles] = useState<string[]>([]);
  const jobTitleOptions: readonly string[] = jobTitles.length ? jobTitles : NB_JOB_TITLES;
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

  // Kurum kataloğu — yalnız aktif kurumlar. Katalog boşsa alan hiç çizilmez.
  useEffect(() => {
    if (!open) return;
    nbAdminService
      .listPartnerOrgs()
      .then((rows) => setPartnerOrgs(rows.filter((o) => o.active)))
      .catch(() => setPartnerOrgs([]));
  }, [open]);

  // ------------------------------------------------------------------
  // Ünvan katalogu (DB-config) — aktif ünvanları çek
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!open) return;
    nbAdminService
      .listJobTitles()
      .then((rows) =>
        setJobTitles(rows.filter((t) => t.active).map((t) => t.label)),
      )
      .catch(() => setJobTitles([]));
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

  const businessValid = isProfessional
    ? // Profesyonel: şirket/kurum + ünvan + uzmanlık + sektör (şehir opsiyonel)
      !!form.companyName?.trim() &&
      !!form.personJobTitle?.trim() &&
      !!form.expertise?.trim() &&
      !!form.sectorCodes?.length && !!form.city
    : !!form.companyName?.trim() && !!form.sectorCodes?.length && !!form.city;
  const identityValid = true;
  // Profesyonel üyede sosyal/ağ profili zorunlu değil; girilirse format yine doğrulanır.
  const socialValid = (isProfessional || hasSocial) && linkedinValid && websiteValid && instagramValid;
  const tierValid = !!form.requestedTier && !!form.targetStatus &&
    (form.targetStatus !== 'TRIAL' || (Number.isInteger(form.trialDurationDays) &&
      form.trialDurationDays! >= 1 && form.trialDurationDays! <= 365)) &&
    (form.targetStatus !== 'APPROVED_PENDING_PAYMENT' ||
      (Number.isInteger(form.paymentWindowDays) &&
        form.paymentWindowDays! >= 1 && form.paymentWindowDays! <= 365));
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
      if (!form.companyName?.trim()) missing.push(isProfessional ? 'Şirket/Kurum' : 'Şirket Adı');
      if (isProfessional && !form.personJobTitle?.trim()) missing.push('Ünvan');
      if (isProfessional && !form.expertise?.trim()) missing.push('Uzmanlık');
      if (!form.sectorCodes?.length) missing.push('Sektör');
      if (!form.city) missing.push('Şehir');
      return missing.length ? `Eksik: ${missing.join(', ')}` : null;
    }
    if (step === 2) {
      return null;
    }
    if (step === 3) {
      if (!isProfessional && !hasSocial) return 'En az bir sosyal bağlantı gerekli';
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
    isProfessional,
    form.companyName,
    form.personJobTitle,
    form.expertise,
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
      const phoneParts = splitPhone(
        user.mode === 'new' ? user.phone : user.selectedUser?.phone ?? undefined,
      );

      const baseForm: Partial<AdminCreateMemberRequest> = {
        ...form,
        race: form.race || undefined,
        clanName: form.clanName?.trim() || undefined,
        companyAddress: form.companyAddress ? { ...form.companyAddress, city: form.city } : undefined,
        trialDurationDays: form.targetStatus === 'TRIAL' ? form.trialDurationDays : undefined,
        paymentWindowDays:
          form.targetStatus === 'APPROVED_PENDING_PAYMENT' ? form.paymentWindowDays : undefined,
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
              // NB üyeliği Keycloak UUID (JWT sub) ile anahtarlanır — auth iç id'sini (userId) DEĞİL
              // keycloakUserId'yi gönder. Null ise (kullanıcı hiç login olmamış) email-lookup'a düşer.
              userId: user.selectedUser!.keycloakUserId ?? undefined,
              email: user.selectedUser!.email,
              createIfMissing: false,
            };

      const payload = {
        ...baseForm,
        ...userPart,
        ...phoneParts,
      } as AdminCreateMemberRequest;

      const result = await nbAdminService.createMemberManually(payload);
      if (result.member?.memberId) {
        setCreatedMember({ id: result.member.memberId, name: form.companyName ?? '', existing: user.mode === 'existing' });
      }
      reset();
      onCreated(result);
      if (!result.member?.memberId) onClose();
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
        set('city', undefined);
        setPlaceCityHint(result.address.city);
      }
    } else {
      set('city', undefined);
      setPlaceCityHint(null);
    }

    const addr: CompanyAddressRequest = {
      placeId: result.placeId,
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

        <SectionPaper title="Üye Tipi">
          <RadioCardGroup
            options={MEMBER_TYPE_OPTIONS}
            value={(form.memberType as 'BUSINESS' | 'PROFESSIONAL') ?? 'BUSINESS'}
            onChange={(v) => {
              setForm((f) => {
                // Profesyonel → PROFESYONEL'e kilitle. İşletmeye dönerken kademe
                // PROFESYONEL kalmışsa (artık business listesinde yok) ilk business
                // kademesine resetle ki seçim boş/çakışık kalmasın.
                const firstBusinessTier = tiers.find((t) => t.code !== 'PROFESYONEL')?.code as
                  | MembershipTier
                  | undefined;
                const requestedTier =
                  v === 'PROFESSIONAL'
                    ? ('PROFESYONEL' as MembershipTier)
                    : f.requestedTier === 'PROFESYONEL'
                      ? firstBusinessTier
                      : f.requestedTier;
                return { ...f, memberType: v, requestedTier };
              });
            }}
          />
          {isProfessional && (
            <Grid container spacing={2.5} sx={{ mt: 0.5 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  label="Ünvan / Pozisyon"
                  value={
                    titleOther
                      ? JOB_TITLE_OTHER
                      : jobTitleOptions.includes(form.personJobTitle ?? '')
                        ? form.personJobTitle
                        : ''
                  }
                  onChange={(e) => {
                    if (e.target.value === JOB_TITLE_OTHER) {
                      setTitleOther(true);
                      set('personJobTitle', '');
                    } else {
                      setTitleOther(false);
                      set('personJobTitle', e.target.value);
                    }
                  }}
                  fullWidth
                  required
                  size="small"
                >
                  {jobTitleOptions.map((t) => (
                    <MenuItem key={t} value={t}>{t}</MenuItem>
                  ))}
                  <MenuItem value={JOB_TITLE_OTHER}>Diğer…</MenuItem>
                </TextField>
                {titleOther && (
                  <TextField
                    label="Ünvan (serbest)"
                    placeholder="örn. Tedarik Zinciri Lideri"
                    value={form.personJobTitle ?? ''}
                    onChange={(e) => set('personJobTitle', toTrUpper(e.target.value))}
                    fullWidth
                    required
                    size="small"
                    sx={{ mt: 1 }}
                    helperText="Büyük harfe çevrilerek kaydedilir."
                  />
                )}
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Uzmanlık Alanları"
                  placeholder="Tedarik zinciri, finans, dış ticaret…"
                  value={form.expertise ?? ''}
                  onChange={(e) => set('expertise', e.target.value)}
                  fullWidth
                  required
                  size="small"
                />
              </Grid>
            </Grid>
          )}
        </SectionPaper>

        <SectionPaper title={isProfessional ? 'Mevcut Şirket / Kurum' : 'Şirket Bilgisi'}>
          <Grid container spacing={2.5}>
            <Grid item xs={12}>
              <CompanyPlacesAutocomplete
                required
                value={form.companyName ?? ''}
                onChange={(v) => {
                  set('companyName', v);
                  set('companyAddress', undefined);
                }}
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
              <Grid item xs={12}>
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
                      {addr.placeId ? 'Google’dan alındı' : 'Elle girilen adres'}
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

            <Grid item xs={12}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
                Sektör(ler) * <Typography component="span" variant="caption" color="text.secondary">— en fazla 3</Typography>
              </Typography>
              <SectorCheckboxGrid
                sectors={sectors}
                loading={sectorsLoading}
                value={form.sectorCodes ?? []}
                onChange={(codes) => set('sectorCodes', codes)}
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                Ana kategoriyi seçmek yeterli; alt kategoriler üyelik sonrası profilden eklenir.
                Kategori listede yoksa en yakınını ya da “Diğer”i seçin.
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Açık adres (opsiyonel)"
                value={addr?.description ?? ''}
                onChange={(event) => set('companyAddress', { city: form.city, district: addr?.district, description: event.target.value })}
                helperText="Google’da bulunamıyorsa adresi elle yazın ve ili seçin." />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" label="İlçe (opsiyonel)"
                value={addr?.district ?? ''}
                onChange={(event) => set('companyAddress', { city: form.city, description: addr?.description, district: event.target.value })} />
            </Grid>
            <Grid item xs={12} md={6}>
              <CatalogAutocomplete<string>
                label="Şehir"
                required
                disabled={lockedFields.has('city') && !!form.city}
                options={TR_CITIES as unknown as string[]}
                value={form.city ?? null}
                onChange={(v) => {
                  set('city', v ?? undefined);
                  if (addr) set('companyAddress', { city: v ?? undefined, description: addr.description });
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

            <Grid item xs={12}>
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
        hint="Bu alanlar opsiyoneldir; boş geçebilirsiniz. Üye isterse profilinden doldurabilir. Bilgi girmeden önce üyenin açık rızasını alın."
      >
        <Grid container spacing={2.5}>
          <Grid item xs={12} md={6}>
            <CatalogAutocomplete<{ value: NbRace; label: string }>
              label="Halk (opsiyonel)"
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
          <Grid item xs={12} md={6}>
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
                  label="Sülale (opsiyonel)"
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
          <Grid item xs={12}>
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
          <Grid item xs={12}>
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
          <Grid item xs={12} md={6}>
            <SocialPrefixField
              kind="website"
              value={form.websiteUrl ?? ''}
              onChange={(v) => set('websiteUrl', v || undefined)}
              error={!websiteValid}
              helperText={!websiteValid ? 'Geçersiz URL' : undefined}
            />
          </Grid>
          <Grid item xs={12} md={6}>
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
  const renderPackageStep = () => {
    // Kurum adı sayfaya sabit yazılmaz: bugün KAFSİAD, yarın başka bir kurum.
    // Kurum seçilmediyse nötr metin gösterilir.
    const selectedOrg = partnerOrgs.find((o) => o.id === form.partnerOrgId) ?? null;
    const orgLabel = selectedOrg ? (selectedOrg.shortName || selectedOrg.name) : null;
    return (
    <Stack spacing={2}>
      <Alert severity="info">
        {orgLabel
          ? `${orgLabel} karşılama mailini hesabı oluşturmadan önce gönderin.`
          : 'Kurum karşılamasını hesabı oluşturmadan önce gönderin.'}
        {' '}
        Sıra önemli: önce davet, sonra hesap. Yeni hesap açılırsa sistem giriş bilgilerini
        otomatik gönderir; mevcut kullanıcıyı elle bilgilendirin.
      </Alert>
      <SectionPaper
        title="Kademe"
        hint={
          isProfessional
            ? 'Profesyonel üye yalnız Profesyonel kademede yer alır.'
            : 'Üyenin paket seviyesi — kaynak: tier katalog.'
        }
      >
        <TierRadioCardGroup
          // İşletme üyesine Profesyonel kademe gösterilmez; profesyonel ise
          // tüm kartlar görünür ama PROFESYONEL'e kilitlidir (diğerleri muted).
          tiers={isProfessional ? tiers : tiers.filter((t) => t.code !== 'PROFESYONEL')}
          loading={tiersLoading}
          value={form.requestedTier}
          onChange={(code) => set('requestedTier', code)}
          lockedTo={isProfessional ? ('PROFESYONEL' as MembershipTier) : undefined}
        />
      </SectionPaper>

      <SectionPaper
        title="Aktivasyon Akışı"
        hint="Üyenin sistemde nasıl bir başlangıç yapacağı."
      >
        <RadioCardGroup
          options={TARGET_STATUS_OPTIONS}
          value={form.targetStatus as ActivationFlow | undefined}
          onChange={(v) => {
            set('targetStatus', v);
            set('trialDurationDays', v === 'TRIAL' ? 60 : undefined);
            set('paymentWindowDays', v === 'APPROVED_PENDING_PAYMENT' ? 7 : undefined);
          }}
        />
        {form.targetStatus === 'TRIAL' && (
          <TextField
            label="Deneme süresi (gün)"
            type="number"
            value={form.trialDurationDays ?? 60}
            onChange={(event) => set('trialDurationDays', Number(event.target.value))}
            inputProps={{ min: 1, max: 365, step: 1 }}
            helperText="KAFSİAD: 60 gün ücretsiz erişim, ardından ödeme penceresi."
            sx={{ mt: 2 }}
          />
        )}
        {form.targetStatus === 'APPROVED_PENDING_PAYMENT' && (
          <TextField
            label="Ödeme penceresi (gün)"
            type="number"
            value={form.paymentWindowDays ?? 7}
            onChange={(event) => set('paymentWindowDays', Number(event.target.value))}
            inputProps={{ min: 1, max: 365, step: 1 }}
            helperText="Varsayılan 7 gün. Uzun bir tanıtım dönemi sözü verdiysen mutlaka uzat — süre dolunca üye 'onay süresi doldu'ya düşer."
            sx={{ mt: 2 }}
          />
        )}
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

      {partnerOrgs.length > 0 && (
        <SectionPaper
          title="Kurum"
          hint="Üye ağa hangi kuruluş aracılığıyla geliyor. Boş bırakılabilir."
        >
          <TextField
            select
            label="Geldiği kurum"
            value={form.partnerOrgId ?? ''}
            onChange={(e) => set('partnerOrgId', e.target.value || null)}
            fullWidth
            size="small"
            helperText="Seçilirse profilde kurum rozeti görünür ve üye dizinde kuruma göre süzülebilir."
          >
            <MenuItem value="">Kurum yok</MenuItem>
            {partnerOrgs.map((o) => (
              <MenuItem key={o.id} value={o.id}>
                {o.shortName}
              </MenuItem>
            ))}
          </TextField>
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
  };

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
                      : form.targetStatus === 'TRIAL'
                        ? `${form.trialDurationDays} gün ücretsiz deneme; ödeme penceresi deneme sonunda başlar`
                        : `Üye kendi ödeyecek (${form.paymentWindowDays ?? 7} gün penceresi)`,
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

  const sidebar = STEP_SIDEBAR[step] ?? STEP_SIDEBAR[0];

  if (createdMember) {
    const closeSuccess = () => {
      setCreatedMember(null);
      onClose();
    };
    return (
      <Dialog open={open} onClose={closeSuccess} maxWidth="sm" fullWidth>
        <DialogContent>
          <Stack spacing={2}>
            <Typography variant="h6">Üye oluşturuldu: {createdMember.name}</Typography>
            <Typography>Şimdi profilini zenginleştirmek ister misin? Logo, açıklama, hizmetler ve adres ekleyebilirsin.</Typography>
            <Alert severity="info">
              {createdMember.existing
                ? 'Mevcut NartGo hesabına otomatik giriş maili gönderilmez. Üyeyi elle bilgilendirin.'
                : 'Yeni hesap açıldıysa sistem giriş bilgilerini e-posta ile gönderir. Mevcut hesap bulunduysa üyeyi elle bilgilendirin.'}
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeSuccess}>Sonra / Kapat</Button>
          <Button variant="contained" onClick={() => {
            const memberId = createdMember.id;
            closeSuccess();
            navigate(`/nartbusiness/members/${memberId}?edit=business`);
          }}>Profili Zenginleştir →</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <ThemeProvider theme={eliteTheme}>
      <Dialog
        open={open}
        onClose={handleCloseRequest}
        maxWidth="lg"
        fullWidth
        fullScreen={fullScreen}
        PaperProps={{
          sx: {
            borderRadius: fullScreen ? 0 : 3,
            display: 'flex',
            flexDirection: 'column',
            bgcolor: ELITE.cream,
            overflow: 'hidden',
          },
        }}
      >
        {/* ---- Lacivert marka başlığı ---- */}
        <Box
          sx={{
            bgcolor: ELITE.navy,
            color: '#fff',
            px: { xs: 2.5, sm: 4 },
            py: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={1.5}
            sx={{ flexGrow: 1, minWidth: 0 }}
          >
            <Typography
              sx={{
                fontFamily: SERIF,
                fontWeight: 700,
                fontSize: '1.25rem',
                letterSpacing: 0.3,
              }}
            >
              NartBusiness
            </Typography>
            <Box sx={{ width: '1px', height: 22, bgcolor: ELITE.line }} />
            <Typography
              sx={{
                color: ELITE.goldSoft,
                fontSize: '0.66rem',
                fontWeight: 600,
                letterSpacing: 2,
                textTransform: 'uppercase',
              }}
            >
              Elite Application
            </Typography>
          </Stack>
          <Typography
            sx={{
              color: 'rgba(255,255,255,0.6)',
              fontSize: '0.72rem',
              fontWeight: 600,
              letterSpacing: 1,
              display: { xs: 'none', sm: 'block' },
            }}
          >
            ADIM {step + 1} / {STEPS.length}
          </Typography>
          <IconButton
            onClick={handleCloseRequest}
            disabled={submitting}
            sx={{ color: 'rgba(255,255,255,0.8)', ml: 0.5 }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        {/* ---- Numaralı adım rayı ---- */}
        <Box
          sx={{
            px: { xs: 2, sm: 4 },
            py: 1.75,
            bgcolor: '#fff',
            borderBottom: `1px solid ${ELITE.line}`,
            overflowX: 'auto',
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={0}
            sx={{ minWidth: 'max-content' }}
          >
            {STEPS.map((label, i) => {
              const done = i < step;
              const active = i === step;
              return (
                <Box key={label} sx={{ display: 'flex', alignItems: 'center' }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Box
                      sx={{
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        flexShrink: 0,
                        bgcolor: active ? ELITE.gold : done ? ELITE.navy : 'transparent',
                        color: active || done ? '#fff' : 'text.disabled',
                        border: active || done ? 'none' : '1.5px solid',
                        borderColor: 'divider',
                      }}
                    >
                      {done ? '✓' : i + 1}
                    </Box>
                    <Typography
                      sx={{
                        fontSize: '0.7rem',
                        fontWeight: active ? 700 : 500,
                        letterSpacing: 0.4,
                        textTransform: 'uppercase',
                        color: active
                          ? ELITE.navy
                          : done
                          ? 'text.primary'
                          : 'text.disabled',
                        whiteSpace: 'nowrap',
                        display: { xs: active ? 'block' : 'none', md: 'block' },
                      }}
                    >
                      {label}
                    </Typography>
                  </Stack>
                  {i < STEPS.length - 1 && (
                    <Box
                      sx={{
                        width: { xs: 16, md: 28 },
                        height: '1.5px',
                        mx: { xs: 1, md: 1.5 },
                        bgcolor: i < step ? ELITE.navy : 'divider',
                        flexShrink: 0,
                      }}
                    />
                  )}
                </Box>
              );
            })}
          </Stack>
        </Box>

        {/* ---- İki kolonlu gövde ---- */}
        <DialogContent
          sx={{ p: 0, flex: 1, overflowY: 'auto', bgcolor: ELITE.cream }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: 'minmax(0, 1.65fr) minmax(0, 1fr)',
              },
              minHeight: '100%',
            }}
          >
            {/* sol: form */}
            <Box sx={{ px: { xs: 2.5, sm: 4 }, py: { xs: 2.5, sm: 3.5 } }}>
              <Stack spacing={2.5}>
                <Box>
                  <Typography
                    sx={{
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      letterSpacing: 1.5,
                      textTransform: 'uppercase',
                      color: ELITE.gold,
                    }}
                  >
                    {sidebar.eyebrow}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: SERIF,
                      fontSize: { xs: '1.6rem', sm: '2rem' },
                      fontWeight: 600,
                      color: ELITE.navy,
                      lineHeight: 1.1,
                      mt: 0.25,
                    }}
                  >
                    {sidebar.title}
                  </Typography>
                </Box>
                {error && <Alert severity="error">{error}</Alert>}
                {stepBody()}
              </Stack>
            </Box>

            {/* sağ: curation kartı */}
            <Box
              sx={{
                color: 'rgba(255,255,255,0.85)',
                px: { xs: 2.5, sm: 3.5 },
                py: { xs: 3, sm: 4 },
                display: 'flex',
                flexDirection: 'column',
                gap: 2.5,
                backgroundImage: `linear-gradient(160deg, ${ELITE.navy} 0%, ${ELITE.navyDeep} 100%)`,
              }}
            >
              <Box sx={{ width: 38, height: 3, bgcolor: ELITE.gold, borderRadius: 2 }} />
              <Box>
                <Typography
                  sx={{
                    color: ELITE.goldSoft,
                    fontSize: '0.64rem',
                    fontWeight: 700,
                    letterSpacing: 2,
                    textTransform: 'uppercase',
                  }}
                >
                  Komite Notu
                </Typography>
                <Typography
                  sx={{
                    fontFamily: SERIF,
                    fontSize: '1.5rem',
                    fontWeight: 600,
                    color: '#fff',
                    mt: 0.75,
                    lineHeight: 1.15,
                  }}
                >
                  {sidebar.panelTitle}
                </Typography>
              </Box>
              <Typography
                sx={{
                  fontSize: '0.83rem',
                  lineHeight: 1.7,
                  color: 'rgba(255,255,255,0.75)',
                }}
              >
                {sidebar.body}
              </Typography>
              <Stack spacing={2} sx={{ mt: 0.5 }}>
                {sidebar.bullets.map((b) => (
                  <Stack
                    key={b.label}
                    direction="row"
                    spacing={1.5}
                    alignItems="flex-start"
                  >
                    <Box
                      sx={{
                        color: ELITE.goldSoft,
                        fontSize: '0.7rem',
                        mt: '3px',
                        lineHeight: 1,
                      }}
                    >
                      ◆
                    </Box>
                    <Box>
                      <Typography
                        sx={{ color: '#fff', fontSize: '0.82rem', fontWeight: 700 }}
                      >
                        {b.label}
                      </Typography>
                      <Typography
                        sx={{
                          color: 'rgba(255,255,255,0.6)',
                          fontSize: '0.76rem',
                          lineHeight: 1.5,
                          mt: 0.25,
                        }}
                      >
                        {b.desc}
                      </Typography>
                    </Box>
                  </Stack>
                ))}
              </Stack>
              <Box sx={{ flexGrow: 1 }} />
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{ pt: 2, borderTop: `1px solid ${ELITE.line}` }}
              >
                <LockOutlinedIcon sx={{ fontSize: 15, color: ELITE.goldSoft }} />
                <Typography
                  sx={{
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.55)',
                  }}
                >
                  Heritage &amp; Trust Standard
                </Typography>
              </Stack>
            </Box>
          </Box>
        </DialogContent>

        {/* ---- Alt aksiyonlar ---- */}
        <DialogActions
          sx={{
            px: { xs: 2.5, sm: 4 },
            py: 2,
            bgcolor: '#fff',
            borderTop: `1px solid ${ELITE.line}`,
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
                  color="primary"
                  onClick={() => setStep((s) => s + 1)}
                  disabled={!stepValid[step] || submitting}
                  sx={{ minWidth: 120, px: 3 }}
                >
                  Devam Et
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
                  color="secondary"
                  disabled={!canSubmit || submitting}
                  onClick={submit}
                  startIcon={
                    submitting ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : undefined
                  }
                  sx={{ minWidth: 150, px: 3 }}
                >
                  {submitting ? 'Oluşturuluyor…' : 'Üyeyi Oluştur'}
                </Button>
              </Box>
            </Tooltip>
          )}
        </DialogActions>
      </Dialog>
    </ThemeProvider>
  );
}
