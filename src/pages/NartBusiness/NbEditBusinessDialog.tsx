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
  CompanyAddressRequest,
  NbMember,
  NbRace,
  Sector,
} from '../../services/nartbusiness/nbTypes';
import type { RaceFamily } from '../../services/nartbusiness/nbAdminService';
import { TR_CITIES } from '../../constants/trCities';
import {
  AuditNoteBlock,
  buildAuditNote,
  CatalogAutocomplete,
  CompanyPlacesAutocomplete,
  isAuditNoteValid,
  NbSectionPaper,
  SectorCheckboxGrid,
  SocialPrefixField,
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
  const [form, setForm] = useState<Partial<AdminUpdateBusinessRequest>>({});
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
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof AdminUpdateBusinessRequest>(
    k: K,
    v: AdminUpdateBusinessRequest[K] | undefined,
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
      race: member.race ?? 'adige',
      clanName: member.clanName ?? '',
      hometownDetail: member.hometownDetail ?? '',
      linkedinUrl: member.linkedinUrl ?? '',
      websiteUrl: member.websiteUrl ?? '',
      verifiedBusiness: !!member.verifiedBusiness,
    });
    setInstaHandle(instagramHandle(member.instagramUrl));
    setPlaceCityHint(null);
    setAuditCategory('CORRECTION');
    setAuditNoteBody('');
    setError(null);
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
    !!form.sectorCodes?.length &&
    !!form.city &&
    !!form.race &&
    !!form.clanName?.trim() &&
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
      const payload: AdminUpdateBusinessRequest = {
        companyName: form.companyName!.trim(),
        sectorCodes: form.sectorCodes!,
        city: form.city!,
        companyAddress: form.companyAddress,
        businessDescription: form.businessDescription?.trim() || undefined,
        race: form.race!,
        clanName: form.clanName!.trim(),
        hometownDetail: form.hometownDetail?.trim() || undefined,
        linkedinUrl: form.linkedinUrl?.trim() || undefined,
        websiteUrl: form.websiteUrl?.trim() || undefined,
        instagramUrl: instaHandle
          ? `https://instagram.com/${instaHandle}`
          : undefined,
        verifiedBusiness: !!form.verifiedBusiness,
        adminNote: buildAuditNote(auditCategory, auditNoteBody),
      };
      await nbAdminService.updateMemberBusiness(member.memberId, payload);
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
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pr: 6 }}>
        İşletme Bilgilerini Düzenle
        <Typography variant="body2" color="text.secondary">
          {member?.companyName ?? 'Şirket bilgisi eksik'}
        </Typography>
        <IconButton
          onClick={handleClose}
          disabled={submitting}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Stack spacing={2}>
          {/* Şirket */}
          <SectionPaper title="Şirket Bilgisi">
            <Grid container spacing={2.5}>
              <Grid item xs={12}>
                <CompanyPlacesAutocomplete
                  required
                  value={form.companyName ?? ''}
                  onChange={(v) => set('companyName', v)}
                  onPlaceSelect={handlePlaceSelect}
                  helperText="Google'dan seçebilir veya elle yazabilirsiniz."
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
                  helperText={`${form.businessDescription?.length ?? 0} / 300`}
                />
              </Grid>
            </Grid>
          </SectionPaper>

          {/* Kimlik */}
          <SectionPaper title="Kafkas Kimliği" hint="Halk seçimi sülale katalogunu filtreler.">
            <Grid container spacing={2.5}>
              <Grid item xs={12} md={6}>
                <CatalogAutocomplete<{ value: NbRace; label: string }>
                  label="Halk"
                  required
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
                      label="Sülale *"
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
                  value={instaHandle}
                  onChange={(v) => setInstaHandle(v)}
                  error={!instaValid}
                  helperText={
                    !instaValid ? 'Sadece harf/rakam/nokta/alt çizgi' : undefined
                  }
                />
              </Grid>
            </Grid>
          </SectionPaper>

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
