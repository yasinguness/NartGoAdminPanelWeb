import { useEffect, useMemo, useState } from 'react';
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
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import CloseIcon from '@mui/icons-material/Close';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import { nbAdminService } from '../../services/nartbusiness/nbAdminService';
import type {
  AdminUpdateBusinessRequest,
  AdminUpdateDirectoryProfileRequest,
  CompanyAddressRequest,
  NbMember,
  NbRace,
  Sector,
} from '../../services/nartbusiness/nbTypes';
import { ImageUploader } from '../../components/ImageUploader';
import type { RaceFamily } from '../../services/nartbusiness/nbAdminService';
import { TR_CITIES } from '../../constants/trCities';
import {
  COMPANY_SIZE_OPTIONS,
  COMPANY_TYPE_OPTIONS,
  PHONE_VISIBILITY_OPTIONS,
  companySizeLabel,
  companyTypeLabel,
  phoneVisibilityLabel,
  formatTrPhone,
  normalizeTrPhone,
  isTrPhoneComplete,
  FOUNDED_YEAR_MIN,
  foundedYearMax,
} from './nbEnumLabels';
import {
  AuditNoteBlock,
  buildAuditNote,
  CatalogAutocomplete,
  CompanyPlacesAutocomplete,
  isAuditNoteValid,
  NbSectionPaper,
  SectorCheckboxGrid,
  SocialPrefixField,
  useNbMobile,
  type AuditCategoryOption,
  type CompanyPlaceResult,
} from '../../components/nartbusiness';

interface Props {
  open: boolean;
  member: NbMember | null;
  onClose: () => void;
  onSaved: () => void;
}

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
  { value: 'CORRECTION', label: 'Bilgi düzeltme (hatalı/eksik veri)' },
  { value: 'MEMBER_REQUEST', label: 'Üye talebi üzerine güncelleme' },
  { value: 'REBRAND', label: 'Şirket adı / marka değişikliği' },
  { value: 'MIGRATION', label: 'Migration / eski kayıt taşıma' },
  { value: 'DIGER', label: 'Diğer (notta açıkla)' },
];

const URL_RX = /^https?:\/\/.+/i;
const SectionPaper = NbSectionPaper;

/** Tam Instagram URL'inden kullanıcı adını ayıkla (form handle ile çalışır). */
function instagramHandle(url?: string): string {
  if (!url) return '';
  const m = url.match(/instagram\.com\/([^/?#]+)/i);
  if (m) return m[1];
  return url.replace(/^@/, '');
}

/** Üyenin mevcut adres alanlarından CompanyAddressRequest kur. */
function seedAddress(m: NbMember): CompanyAddressRequest | undefined {
  if (
    !m.city &&
    !m.companyFormattedAddress
  ) {
    return undefined;
  }
  return {
    city: m.city ?? undefined,
    description: m.companyFormattedAddress ?? undefined,
  };
}

/** Google Places şehir adını TR_CITIES ile eşleştir. */
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
      .replace(/ç/g, 'c');
  const target = norm(googleCity);
  return (TR_CITIES as unknown as string[]).find((c) => norm(c) === target);
}

/**
 * Admin — mevcut bir NB üyesinin işletme bilgilerini düzenler (CRUD-Update).
 * Tek-sayfa form; lifecycle (tier/status/ödeme) buraya dahil değil.
 */
export default function NbEditBusinessDialog({ open, member, onClose, onSaved }: Props) {
  const fullScreen = useNbMobile();
  const [form, setForm] = useState<Partial<AdminUpdateBusinessRequest & AdminUpdateDirectoryProfileRequest>>({});
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [instaHandle, setInstaHandle] = useState('');
  const [placeCityHint, setPlaceCityHint] = useState<string | null>(null);

  const [sectors, setSectors] = useState<Sector[]>([]);
  const [sectorsLoading, setSectorsLoading] = useState(false);
  const [families, setFamilies] = useState<RaceFamily[]>([]);
  const [familiesLoading, setFamiliesLoading] = useState(false);
  const [familyCreating, setFamilyCreating] = useState(false);
  const [familyCreateError, setFamilyCreateError] = useState<string | null>(null);

  const [auditCategory, setAuditCategory] = useState('CORRECTION');
  const [auditNoteBody, setAuditNoteBody] = useState('');

  const [submitting, setSubmitting] = useState(false);
  /// Dizin profili yükleniyor; form alanları henüz güncel değil.
  const [dirLoading, setDirLoading] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);

  /// Taslak üret ve alana yaz. Mevcut metnin üzerine yazmadan önce sorar:
  /// admin'in yazdığı bir metni sessizce silmek kabul edilemez.
  const handleGenerateDraft = async () => {
    if (!member) return;
    const existing = (form.businessDescription ?? '').trim();
    if (existing && !window.confirm('Mevcut tanıtım metni taslakla değiştirilsin mi?')) {
      return;
    }
    setDrafting(true);
    setDraftError(null);
    const res = await nbAdminService.generateDescriptionDraft(member.memberId);
    setDrafting(false);
    if ('draft' in res) {
      set('businessDescription', res.draft.slice(0, 300));
    } else {
      setDraftError(res.message);
    }
  };
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof (AdminUpdateBusinessRequest & AdminUpdateDirectoryProfileRequest)>(
    k: K,
    v: (AdminUpdateBusinessRequest & AdminUpdateDirectoryProfileRequest)[K] | undefined,
  ) => setForm((prev) => ({ ...prev, [k]: v }));

  // Üye değişince / dialog açılınca formu mevcut değerlerle doldur.
  useEffect(() => {
    if (!open || !member) return;
    setForm({
      companyName: member.companyName ?? '',
      sectorCodes: member.sectorCodes?.length
        ? member.sectorCodes
        : member.sectorCode
        ? [member.sectorCode]
        : [],
      city: member.city ?? '',
      companyAddress: seedAddress(member),
      businessDescription: member.businessDescription ?? '',
      race: member.race ?? undefined,
      clanName: member.clanName ?? '',
      hometownDetail: member.hometownDetail ?? '',
      linkedinUrl: member.linkedinUrl ?? '',
      websiteUrl: member.websiteUrl ?? '',
      verifiedBusiness: !!member.verifiedBusiness,
      logoUrl: member.logoUrl ?? '',
      displayName: member.displayName ?? '',
      personRole: member.personRole ?? '',
      companySize: member.companySize,
      foundedYear: member.foundedYear,
      phoneNumber: member.phoneNumber ?? '',
      whatsappEnabled: !!member.whatsappEnabled,
      phoneVisibility: member.phoneVisibility ?? 'VERIFIED_MEMBERS',
      expertise: member.expertise ?? '',
      facebookUrl: member.facebookUrl ?? '',
      twitterUrl: member.twitterUrl ?? '',
      tiktokUrl: member.tiktokUrl ?? '',
      youtubeUrl: member.youtubeUrl ?? '',
      companyType: member.companyType,
    });
    setInstaHandle(instagramHandle(member.instagramUrl));
    setLogoFile(null);
    setPlaceCityHint(null);
    setAuditCategory('CORRECTION');
    setAuditNoteBody('');
    setError(null);
  }, [open, member]);

  // Dizin profilini oku ve dizine AİT alanları üzerine yaz.
  //
  // Üyelik servisinin MemberView'ü bu alanları taşımıyor (yalnız logo
  // geliyor); telefon, şirket türü, büyüklük, kuruluş yılı ve sosyal
  // hesaplar dizin profilinin alanları. Bunlar okunmadığında form boş
  // açılıyor, admin yazıp kaydediyor ve tekrar açtığında yine boş görüyor;
  // dışarıdan "kaydetmiyor" gibi görünen şey aslında hiç okunmamasıydı.
  useEffect(() => {
    if (!open || !member) return;
    let cancelled = false;
    setDirLoading(true);
    nbAdminService
      .getDirectoryProfile(member.memberId)
      .then((p) => {
        if (cancelled || !p) return;
        setForm((prev) => ({
          ...prev,
          // Boş string değil undefined kontrolü: sunucuda bilerek
          // boşaltılmış bir alanı eski değerle geri doldurmayalım.
          logoUrl: p.logoUrl ?? prev.logoUrl,
          displayName: p.displayName ?? prev.displayName,
          personRole: p.personRole ?? prev.personRole,
          expertise: p.expertise ?? prev.expertise,
          phoneNumber: p.phoneNumber ?? prev.phoneNumber,
          whatsappEnabled: p.whatsappEnabled ?? prev.whatsappEnabled,
          phoneVisibility: p.phoneVisibility ?? prev.phoneVisibility,
          companyType: p.companyType ?? prev.companyType,
          companySize: p.companySize ?? prev.companySize,
          foundedYear: p.foundedYear ?? prev.foundedYear,
          facebookUrl: p.facebookUrl ?? prev.facebookUrl,
          twitterUrl: p.twitterUrl ?? prev.twitterUrl,
          tiktokUrl: p.tiktokUrl ?? prev.tiktokUrl,
          youtubeUrl: p.youtubeUrl ?? prev.youtubeUrl,
          websiteUrl: p.websiteUrl ?? prev.websiteUrl,
          linkedinUrl: p.linkedinUrl ?? prev.linkedinUrl,
        }));
        if (p.instagramUrl) setInstaHandle(instagramHandle(p.instagramUrl));
      })
      .catch(() => {
        // Okuma başarısızsa form üyelik verisiyle açılmaya devam eder;
        // düzenlemeyi tamamen engellemek daha kötü olurdu.
      })
      .finally(() => {
        if (!cancelled) setDirLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, member]);

  // Sektör katalogu
  useEffect(() => {
    if (!open) return;
    setSectorsLoading(true);
    nbAdminService
      .listSectors()
      .then((rows) => setSectors(rows.filter((s) => s.active)))
      .catch(() => setSectors([]))
      .finally(() => setSectorsLoading(false));
  }, [open]);

  // Sülale katalogu — race değişince yeniden yükle
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

  const linkedinValid = !form.linkedinUrl || URL_RX.test(form.linkedinUrl);
  const websiteValid = !form.websiteUrl || URL_RX.test(form.websiteUrl);
  const instaValid = !instaHandle || /^[A-Za-z0-9._]{1,30}$/.test(instaHandle);

  const valid =
    !!form.companyName?.trim() &&
    !!form.displayName?.trim() &&
    !!form.sectorCodes?.length &&
    !!form.city &&
    linkedinValid &&
    websiteValid &&
    instaValid &&
    isAuditNoteValid(auditNoteBody);

  const clanInCatalog = useMemo(() => {
    const name = form.clanName?.trim().toLowerCase();
    if (!name) return true;
    return families.some((f) => f.familyName.toLowerCase() === name);
  }, [families, form.clanName]);

  const handlePlaceSelect = (result: CompanyPlaceResult) => {
    if (result.companyName) set('companyName', result.companyName);
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
        setFamilies(await nbAdminService.listFamiliesByRace(form.race));
      }
    } catch (e: any) {
      if (e?.response?.status === 409) {
        setFamilies(await nbAdminService.listFamiliesByRace(form.race));
      } else {
        setFamilyCreateError(
          e?.response?.data?.error?.message ?? e?.message ?? 'Sülale eklenemedi',
        );
      }
    } finally {
      setFamilyCreating(false);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    onClose();
  };

  const submit = async () => {
    if (!valid || !member) return;
    setSubmitting(true);
    setError(null);
    try {
      const adminNote = buildAuditNote(auditCategory, auditNoteBody);
      const payload: AdminUpdateBusinessRequest = {
        companyName: form.companyName!.trim(),
        sectorCodes: form.sectorCodes!,
        city: form.city!,
        companyAddress: form.companyAddress,
        businessDescription: form.businessDescription?.trim() || undefined,
        race: form.race,
        clanName: form.clanName?.trim(),
        hometownDetail: form.hometownDetail?.trim() || undefined,
        linkedinUrl: form.linkedinUrl?.trim() || undefined,
        websiteUrl: form.websiteUrl?.trim() || undefined,
        instagramUrl: instaHandle
          ? `https://instagram.com/${instaHandle}`
          : undefined,
        verifiedBusiness: !!form.verifiedBusiness,
        adminNote,
      };
      await nbAdminService.updateMemberBusiness(member.memberId, payload);

      // Logo yükleme
      let newLogoUrl = form.logoUrl;
      if (logoFile) {
        const { uploadUrl, publicUrl } = await nbAdminService.getPresignedProfileUpload(
          member.memberId,
          'avatar',
          logoFile.type,
          logoFile.size,
        );
        await nbAdminService.uploadFileToPresigned(uploadUrl, logoFile, logoFile.type);
        // Okunacak adres backend'in verdiği publicUrl'dir (CDN alan adı).
        // uploadUrl'in query'sini kırpmak İŞE YARAMAZ: geriye R2'nin özel S3
        // API adresi kalır, o adres herkese açık değildir ve logo kırık görünür.
        newLogoUrl = publicUrl;
      }

      // Directory Profile Güncelleme
      // Alanlar TEK TEK yazılıyor; `...payload` yaymak cazip ama yanlış:
      // üyelik payload'ının alan adları dizin DTO'sununkilerle birebir aynı
      // değil (`companyAddress` ↔ `address`, ayrıca dizinde karşılığı olmayan
      // `city`/`verifiedBusiness`). Yayma yapıldığında backend bilinmeyen
      // alanları sessizce yutuyor ve adres dizin profiline hiç yazılmıyordu.
      const dirPayload: import('../../services/nartbusiness/nbTypes').AdminUpdateDirectoryProfileRequest = {
        adminNote,
        logoUrl: newLogoUrl,
        companyName: payload.companyName,
        sectorCodes: payload.sectorCodes,
        address: payload.companyAddress,
        summary: payload.businessDescription,
        race: payload.race,
        clanName: payload.clanName,
        hometownDetail: payload.hometownDetail,
        linkedinUrl: payload.linkedinUrl,
        websiteUrl: payload.websiteUrl,
        instagramUrl: payload.instagramUrl,
        displayName: form.displayName?.trim() || undefined,
        personRole: form.personRole?.trim() || undefined,
        expertise: form.expertise?.trim() || undefined,
        companySize: form.companySize,
        foundedYear: form.foundedYear,
        phoneNumber: form.phoneNumber?.trim() || undefined,
        whatsappEnabled: !!form.whatsappEnabled,
        phoneVisibility: form.phoneVisibility,
        facebookUrl: form.facebookUrl?.trim() || undefined,
        twitterUrl: form.twitterUrl?.trim() || undefined,
        tiktokUrl: form.tiktokUrl?.trim() || undefined,
        youtubeUrl: form.youtubeUrl?.trim() || undefined,
        companyType: form.companyType,
        // verifiedBusiness BİLEREK yok — rozetin doğruluk kaynağı üyelik
        // servisi; yukarıdaki updateMemberBusiness çağrısı onu zaten
        // gönderiyor. Dizine yazılsaydı reconciler geri alırdı.
      };
      await nbAdminService.updateDirectoryProfile(member.memberId, dirPayload);

      onSaved();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? e?.message ?? 'Güncellenemedi');
    } finally {
      setSubmitting(false);
    }
  };

  const addr = form.companyAddress;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth fullScreen={fullScreen}>
      <DialogTitle sx={{ pr: 6 }}>
        İşletme Bilgilerini Düzenle
        <Typography variant="body2" color="text.secondary">
          {member?.companyName ?? 'Şirket bilgisi eksik'}
        </Typography>
        {/* Dizin alanları bir istek sonrası doluyor. Bunu söylemezsek admin
            boş bir alan görüp yazmaya başlıyor, sonra üzerine gelen değer
            yazdığını siliyormuş gibi görünüyor. */}
        {dirLoading && (
          <Typography variant="caption" color="text.secondary"
                      sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.5 }}>
            <CircularProgress size={12} thickness={5} />
            Mevcut bilgiler yükleniyor…
          </Typography>
        )}
        <IconButton
          onClick={handleClose}
          disabled={submitting}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2, bgcolor: 'background.paper', position: 'sticky', top: 0, zIndex: 10 }}
        >
          <Tab label="Genel Bilgiler" />
          <Tab label="İletişim & Sosyal" />
          <Tab label="Yönetim & Durum" />
        </Tabs>

        <Box sx={{ p: { xs: 2, md: 3 } }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Stack spacing={2}>
            {/* TAB 0 */}
            <Box sx={{ display: activeTab === 0 ? 'block' : 'none' }}>
              <Stack spacing={2}>
                {/* Şirket */}
                <SectionPaper title="Şirket Bilgisi">
            <Grid container spacing={2.5}>
              <Grid item xs={12}>
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
                  Firma Logosu
                </Typography>
                <ImageUploader
                  currentImage={form.logoUrl || undefined}
                  onImageSelect={(file) => {
                    if (Array.isArray(file)) {
                      setLogoFile(file[0] || null);
                    } else {
                      setLogoFile(file as File);
                    }
                  }}
                  multiple={false}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="Profil Görünen Adı (DisplayName) *"
                  fullWidth
                  size="small"
                  value={form.displayName ?? ''}
                  onChange={(e) => set('displayName', e.target.value)}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <CompanyPlacesAutocomplete
                  required
                  value={form.companyName ?? ''}
                  onChange={(v) => set('companyName', v)}
                  onPlaceSelect={handlePlaceSelect}
                  helperText="Google'dan seçebilir veya elle yazabilirsiniz."
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <CatalogAutocomplete<string>
                  label="Şirket Türü"
                  options={[...COMPANY_TYPE_OPTIONS]}
                  getOptionLabel={companyTypeLabel}
                  value={form.companyType ?? null}
                  onChange={(v) => set('companyType', v as import('../../services/nartbusiness/nbTypes').AdminUpdateDirectoryProfileRequest['companyType'])}
                  placeholder="Örn. Limited Şirket"
                  helperText="Tüzel kişilik biçimi."
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <CatalogAutocomplete<string>
                  label="Şirket Büyüklüğü"
                  options={[...COMPANY_SIZE_OPTIONS]}
                  getOptionLabel={companySizeLabel}
                  helperText="Çalışan sayısına göre."
                  value={form.companySize ?? null}
                  onChange={(v) => set('companySize', v as import('../../services/nartbusiness/nbTypes').AdminUpdateDirectoryProfileRequest['companySize'])}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  label="Kuruluş Yılı"
                  fullWidth
                  size="small"
                  type="number"
                  value={form.foundedYear ?? ''}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    set('foundedYear', isNaN(val) ? undefined : val);
                  }}
                  inputProps={{ min: FOUNDED_YEAR_MIN, max: foundedYearMax() }}
                  error={
                    form.foundedYear != null &&
                    (form.foundedYear < FOUNDED_YEAR_MIN ||
                      form.foundedYear > foundedYearMax())
                  }
                  helperText={
                    form.foundedYear != null &&
                    (form.foundedYear < FOUNDED_YEAR_MIN ||
                      form.foundedYear > foundedYearMax())
                      ? `${FOUNDED_YEAR_MIN} ile ${foundedYearMax()} arasında olmalı.`
                      : 'Örn. 1998'
                  }
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
                  Sektör(ler) *{' '}
                  <Typography component="span" variant="caption" color="text.secondary">
                    — en fazla 3
                  </Typography>
                </Typography>
                <SectorCheckboxGrid
                  sectors={sectors}
                  loading={sectorsLoading}
                  value={form.sectorCodes ?? []}
                  onChange={(codes) => set('sectorCodes', codes)}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <CatalogAutocomplete<string>
                  label="Şehir"
                  required
                  options={TR_CITIES as unknown as string[]}
                  value={form.city ?? null}
                  onChange={(v) => {
                    set('city', v ?? undefined);
                    setPlaceCityHint(null);
                  }}
                  placeholder="81 il listesi"
                  helperText={
                    placeCityHint && !form.city
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
                  helperText={
                    draftError ??
                    `${form.businessDescription?.length ?? 0} / 300`
                  }
                  error={!!draftError}
                />
                {/* Taslak üretimi. Metin KAYDEDİLMEZ, alana yazılır; admin
                    okuyup düzenledikten sonra kaydeder. Otomatik yayınlamak,
                    kimsenin okumadığı bir metnin üyenin ağzından çıkmış gibi
                    görünmesi olurdu. */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={drafting || !member}
                    onClick={handleGenerateDraft}
                    startIcon={
                      drafting ? <CircularProgress size={14} thickness={5} /> : undefined
                    }
                  >
                    {drafting ? 'Taslak hazırlanıyor…' : 'Taslak metin öner'}
                  </Button>
                  <Typography variant="caption" color="text.secondary">
                    Profildeki bilgilerden üretilir; kaydetmeden önce gözden geçirin.
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="Kişinin Şirketteki Rolü"
                  fullWidth
                  size="small"
                  value={form.personRole ?? ''}
                  onChange={(e) => set('personRole', e.target.value)}
                  placeholder="Örn: Kurucu, Genel Müdür"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="Uzmanlık Alanı / Deneyim"
                  fullWidth
                  size="small"
                  value={form.expertise ?? ''}
                  onChange={(e) => set('expertise', e.target.value)}
                  placeholder="Örn: E-ticaret, B2B Pazarlama"
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  label="Telefon Numarası"
                  fullWidth
                  size="small"
                  // Yazarken boşluklu gösteriliyor, saklanırken yalnız
                  // rakamlar gidiyor. Boşluklu biçimde eksik hane gözle
                  // hemen fark ediliyor.
                  value={formatTrPhone(form.phoneNumber ?? '')}
                  onChange={(e) =>
                    set('phoneNumber', normalizeTrPhone(e.target.value))
                  }
                  placeholder="0532 123 45 67"
                  error={
                    !!form.phoneNumber &&
                    !isTrPhoneComplete(form.phoneNumber)
                  }
                  helperText={
                    form.phoneNumber && !isTrPhoneComplete(form.phoneNumber)
                      ? 'Numara 11 haneli olmalı ve 0 ile başlamalı.'
                      : 'Görünürlüğünü yandaki ayardan belirleyin.'
                  }
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={form.whatsappEnabled ?? false}
                      onChange={(e) => set('whatsappEnabled', e.target.checked)}
                      size="small"
                    />
                  }
                  label="WhatsApp Aktif"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <CatalogAutocomplete<string>
                  label="Telefon Görünürlüğü"
                  options={[...PHONE_VISIBILITY_OPTIONS]}
                  getOptionLabel={phoneVisibilityLabel}
                  helperText="Telefonu dizinde kim görebilir."
                  value={form.phoneVisibility ?? null}
                  onChange={(v) => set('phoneVisibility', v as import('../../services/nartbusiness/nbTypes').AdminUpdateDirectoryProfileRequest['phoneVisibility'])}
                />
              </Grid>
            </Grid>
          </SectionPaper>
              </Stack>
            </Box>

            {/* TAB 1 */}
            <Box sx={{ display: activeTab === 1 ? 'block' : 'none' }}>
              <Stack spacing={2}>
                {/* Kimlik */}
                <SectionPaper title="Kafkas Kimliği" hint="Halk seçimi sülale katalogunu filtreler.">
            <Grid container spacing={2.5}>
              <Grid item xs={12} md={6}>
                <CatalogAutocomplete<{ value: NbRace; label: string }>
                  label="Halk (opsiyonel)"
                  options={RACES}
                  value={RACES.find((r) => r.value === form.race) ?? null}
                  onChange={(v) => {
                    set('race', v?.value);
                    set('clanName', undefined);
                  }}
                  getOptionLabel={(r) => r.label}
                  isOptionEqualToValue={(a, b) => a.value === b.value}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Autocomplete<RaceFamily, false, false, true>
                  size="small"
                  fullWidth
                  freeSolo
                  disabled={!form.race}
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
                      ? 'Katalogda kayıt yok — yine de yazabilirsin'
                      : 'Eşleşme yok — "Kataloga ekle" ile saklayabilirsin'
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Sülale (opsiyonel)"
                      placeholder={form.race ? 'Katalogdan seç veya yeni yaz' : 'Önce halk seç'}
                      helperText={
                        !form.clanName?.trim()
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
                {!clanInCatalog &&
                  form.clanName?.trim() &&
                  form.race && (
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
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
                        &quot;{form.clanName.trim()}&quot; sülalesini kataloga ekle
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
                  value={form.hometownDetail ?? ''}
                  onChange={(e) => set('hometownDetail', e.target.value)}
                  placeholder="örn. Uzunyayla / Maykop"
                />
              </Grid>
            </Grid>
          </SectionPaper>

          {/* Sosyal */}
          <SectionPaper title="Sosyal Bağlantılar" hint="Hepsi opsiyonel.">
            <Grid container spacing={2.5}>
              <Grid item xs={12}>
                <SocialPrefixField
                  kind="linkedin"
                  value={form.linkedinUrl ?? ''}
                  onChange={(v) => set('linkedinUrl', v || undefined)}
                  error={!linkedinValid}
                  helperText={!linkedinValid ? 'Geçersiz LinkedIn URL' : undefined}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <SocialPrefixField
                  kind="instagram"
                  value={instaHandle}
                  onChange={setInstaHandle}
                  error={!instaValid}
                  helperText={!instaValid ? 'Geçersiz kullanıcı adı formatı' : undefined}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="Facebook URL (opsiyonel)"
                  fullWidth
                  size="small"
                  value={form.facebookUrl ?? ''}
                  onChange={(e) => set('facebookUrl', e.target.value)}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="Twitter / X URL (opsiyonel)"
                  fullWidth
                  size="small"
                  value={form.twitterUrl ?? ''}
                  onChange={(e) => set('twitterUrl', e.target.value)}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="TikTok URL (opsiyonel)"
                  fullWidth
                  size="small"
                  value={form.tiktokUrl ?? ''}
                  onChange={(e) => set('tiktokUrl', e.target.value)}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="YouTube URL (opsiyonel)"
                  fullWidth
                  size="small"
                  value={form.youtubeUrl ?? ''}
                  onChange={(e) => set('youtubeUrl', e.target.value)}
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
            </Grid>
          </SectionPaper>
              </Stack>
            </Box>

            {/* TAB 2 */}
            <Box sx={{ display: activeTab === 2 ? 'block' : 'none' }}>
              <Stack spacing={2}>
                {/* Rozet */}
                <SectionPaper title="Doğrulanmış İşletme Rozeti">
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
                    Profil ve dizinde rozet gösterilir. Kapatırsanız rozet kaldırılır.
                  </Typography>
                </Box>
              }
            />
          </SectionPaper>

          {/* Audit */}
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
              placeholder="Ne değişti ve neden? (örn. 'Üye talebiyle şirket adı güncellendi, fatura no #1234')"
            />
          </SectionPaper>
              </Stack>
            </Box>
          </Stack>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} disabled={submitting} color="inherit">
          İptal
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        <Tooltip
          title={!valid ? 'Zorunlu alanlar eksik veya geçersiz' : ''}
          disableHoverListener={valid}
          arrow
          placement="top"
        >
          <Box component="span">
            <Button
              variant="contained"
              disabled={!valid || submitting}
              onClick={submit}
              startIcon={
                submitting ? <CircularProgress size={16} color="inherit" /> : undefined
              }
              sx={{ minWidth: 150 }}
            >
              {submitting ? 'Kaydediliyor…' : 'Değişiklikleri Kaydet'}
            </Button>
          </Box>
        </Tooltip>
      </DialogActions>
    </Dialog>
  );
}
