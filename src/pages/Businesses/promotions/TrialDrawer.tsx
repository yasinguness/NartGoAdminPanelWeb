import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Autocomplete, Box, Button, Checkbox, CircularProgress, Divider, Drawer, FormControlLabel,
  IconButton, Paper, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { businessService } from '../../../services/business/businessService';
import type { BusinessDto } from '../../../types/businesses/businessModel';
import {
  promotionAdminService, regionLabel, SCOPES, SCOPE_LABEL,
  type PromotionOffer, type PromotionScope,
} from '../../../services/business/promotionAdminService';
import EligibilityFixer from './EligibilityFixer';
import { CheckChips, TONE, fmtDate, locative } from './shared';

/** Sunucu 1-90 gün kabul ediyor (`grant`); panelde üç hazır süre. */
const DURATIONS = [7, 14, 30] as const;

/**
 * Deneme tanımlama paneli.
 *
 * İşletme seçilince `GET /businesses/{id}/promotion` çağrılıyor. O uç işletme
 * sahibinin teklif ekranını besliyor ama admin de çağırabiliyor, ve tam olarak
 * burada gereken üç şeyi veriyor: uygunluk eksikleri (fotoğraf/kategori/il),
 * ildeki yer doluluğu ve hikâye eki doluluğu. Böylece "yer var mı" sorusunu
 * tahmin etmek yerine, tanımla butonuna basmadan önce gösterebiliyoruz —
 * sunucu zaten yer doluysa 409 ile reddediyor.
 */
export default function TrialDrawer({ open, onClose, onDone }: {
  open: boolean; onClose: () => void; onDone: (message: string) => void;
}) {
  const [business, setBusiness] = useState<BusinessDto | null>(null);
  const [offer, setOffer] = useState<PromotionOffer | null>(null);
  const [offerLoading, setOfferLoading] = useState(false);
  const [scope, setScope] = useState<PromotionScope>('CITY');
  const [days, setDays] = useState<number>(30);
  const [includeStory, setIncludeStory] = useState(false);
  const [overrideSlot, setOverrideSlot] = useState(false);
  const [note, setNote] = useState('NartBusiness üyesi, ilk ay deneme');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setBusiness(null); setOffer(null); setScope('CITY'); setDays(30);
    setIncludeStory(false); setOverrideSlot(false);
    setNote('NartBusiness üyesi, ilk ay deneme'); setError(null);
  }, []);

  useEffect(() => { if (open) reset(); }, [open, reset]);

  /** Uygunluk ve yer durumunu sunucudan tazele. */
  const refreshOffer = useCallback(async () => {
    if (!business) return;
    try {
      setOffer(await promotionAdminService.offerFor(business.id));
    } catch {
      setOffer(null);
    }
  }, [business]);

  // İşletme seçildiğinde uygunluk ve yer durumunu çek.
  useEffect(() => {
    if (!business) { setOffer(null); return; }
    let alive = true;
    setOfferLoading(true);
    promotionAdminService.offerFor(business.id)
      .then((o) => { if (alive) setOffer(o); })
      .catch(() => { if (alive) setOffer(null); })
      .finally(() => { if (alive) setOfferLoading(false); });
    return () => { alive = false; };
  }, [business]);

  const endsAt = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString();
  }, [days]);

  /**
   * Seçilen kapsamın yer durumu.
   *
   * Sunucu 3 Kasım 2026'dan beri kapsam başına ayrı yer tutuyor ve `slots`
   * alanını döndürüyor; eski `slot` alanı il yeri olarak kalıyor. Panel
   * kapsamı değiştirince doğru sayıyı göstermeli — yoksa "Bölge" seçiliyken
   * ilin doluluğu gösterilir ve admin yanlış karar verir.
   */
  const activeSlot = offer ? (offer.slots?.[scope] ?? offer.slot) : null;
  const scopedSlots = !!offer?.slots;
  const slotFull = !!activeSlot && !activeSlot.available;
  const storyFull = !!offer && !offer.storySlot.available;
  const blockedByEligibility = !!offer && !offer.eligibility.ok;
  const canSubmit = !!business && note.trim().length > 0 && !blockedByEligibility
    && (!slotFull || overrideSlot) && !saving;

  const submit = async () => {
    if (!business) return;
    setSaving(true); setError(null);
    try {
      await promotionAdminService.grant({
        businessId: business.id, scope, days, includeStory, overrideSlot, note: note.trim(),
      });
      onDone(`${business.name} için ${days} günlük deneme başladı.`);
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Deneme tanımlanamadı.');
    } finally { setSaving(false); }
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 440 }, display: 'flex', flexDirection: 'column' } }}>
      <Stack direction="row" alignItems="flex-start" sx={{ px: 3, pt: 2.5, pb: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography fontWeight={700} sx={{ fontSize: 18 }}>Deneme tanımla</Typography>
          <Typography variant="body2" color="text.secondary">
            Ödeme alınmaz, gerçek görüntülenme ve tıklama toplanır.
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
      </Stack>
      <Divider />

      <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2.5 }}>
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>İşletme</Typography>
            <BusinessPicker value={business} onChange={setBusiness} />
            {offerLoading && (
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5 }}>
                <CircularProgress size={14} />
                <Typography variant="caption" color="text.secondary">Uygunluk kontrol ediliyor…</Typography>
              </Stack>
            )}
            {offer && (
              <Paper variant="outlined" sx={{ mt: 1.5, p: 1.5, borderRadius: 2, borderColor: TONE.goBg, bgcolor: '#fbfcfb' }}>
                <Typography variant="body2" fontWeight={600}>{offer.businessName}</Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                  {[offer.city, regionLabel(offer.region)].filter(Boolean).join(' · ') || 'konum yok'}
                </Typography>
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                  <CheckChips missing={offer.eligibility.missing} />
                </Stack>
                {offer.current && (
                  <Typography variant="caption" sx={{ color: TONE.warn, display: 'block', mt: 1 }}>
                    Bu işletme zaten yayında ({SCOPE_LABEL[offer.current.scope]}),
                    {' '}{offer.current.remainingDays} gün kaldı. Yeni tanım sıraya girer.
                  </Typography>
                )}
              </Paper>
            )}
            {blockedByEligibility && offer && (
              <EligibilityFixer
                businessId={offer.businessId}
                missing={offer.eligibility.missing}
                onFixed={refreshOffer}
              />
            )}
          </Box>

          <Box>
            <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>Kapsam</Typography>
            <ToggleButtonGroup exclusive fullWidth size="small" value={scope}
              onChange={(_, v) => v && setScope(v as PromotionScope)}>
              {SCOPES.map((s) => (
                <ToggleButton key={s} value={s} sx={{ textTransform: 'none', fontWeight: 600 }}>
                  {SCOPE_LABEL[s]}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            {activeSlot && (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75 }}>
                {scopeWhere(scope, offer!, scopedSlots)} {activeSlot.used}/{activeSlot.limit} yer dolu.
              </Typography>
            )}
          </Box>

          <Box>
            <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>Süre</Typography>
            <ToggleButtonGroup exclusive size="small" value={days} onChange={(_, v) => v && setDays(v)}>
              {DURATIONS.map((d) => (
                <ToggleButton key={d} value={d} sx={{ textTransform: 'none', fontWeight: 600, px: 2 }}>
                  {d} gün
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
              Bugün başlar, <b>{fmtDate(endsAt)}</b> tarihinde biter.
            </Typography>
          </Box>

          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
            <Stack direction="row" alignItems="center">
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" fontWeight={600}>Hikâye eki</Typography>
                <Typography variant="caption" color="text.secondary">
                  Akıştaki hikâye alanı
                  {offer ? ` · ${offer.storySlot.used}/${offer.storySlot.limit} dolu` : ''}
                </Typography>
              </Box>
              <Checkbox checked={includeStory} onChange={(e) => setIncludeStory(e.target.checked)} />
            </Stack>
            {includeStory && storyFull && (
              <Typography variant="caption" sx={{ color: TONE.warn }}>
                Hikâye alanı dolu; eklenirse görünürlük daha fazla kişiye bölünür.
              </Typography>
            )}
          </Paper>

          <Box>
            <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>Neden ücretsiz?</Typography>
            <TextField fullWidth multiline minRows={2} size="small" value={note}
              onChange={(e) => setNote(e.target.value)} error={note.trim().length === 0}
              helperText="Kayıtta görünür, zorunlu." />
          </Box>

          {slotFull && offer && activeSlot && (
            <Paper variant="outlined"
              sx={{ p: 1.75, borderRadius: 2, bgcolor: TONE.warnBg, borderColor: TONE.warnBorder }}>
              <Typography variant="body2" fontWeight={700} sx={{ color: TONE.warn }}>
                {scopeWhere(scope, offer, scopedSlots)} {activeSlot.used}/{activeSlot.limit} yer dolu.
              </Typography>
              <Typography variant="caption" sx={{ color: TONE.warn, display: 'block', mt: 0.25 }}>
                Deneme başlarsa ücretli satın alma için yer kalmaz.
                {activeSlot.nextFreeAt ? ` İlk boşalma: ${fmtDate(activeSlot.nextFreeAt)}.` : ''}
              </Typography>
              <FormControlLabel sx={{ mt: 0.5 }}
                control={<Checkbox size="small" checked={overrideSlot}
                  onChange={(e) => setOverrideSlot(e.target.checked)} />}
                label={<Typography variant="body2">Yer sınırını aşmaya izin ver (kayda geçer)</Typography>} />
            </Paper>
          )}

          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </Box>

      <Divider />
      <Stack direction="row" spacing={1.5} justifyContent="flex-end" sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={saving}>Vazgeç</Button>
        <Button variant="contained" onClick={submit} disabled={!canSubmit}
          sx={{ bgcolor: TONE.go, '&:hover': { bgcolor: '#17402a' } }}>
          {saving ? 'Başlatılıyor…' : 'Denemeyi başlat'}
        </Button>
      </Stack>
    </Drawer>
  );
}

/** İşletmeyi adıyla arar; gönderilen değer `business.id`. */
function BusinessPicker({ value, onChange }: {
  value: BusinessDto | null; onChange: (b: BusinessDto | null) => void;
}) {
  const [input, setInput] = useState('');
  const [options, setOptions] = useState<BusinessDto[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = input.trim();
    if (q.length < 2) { setOptions([]); setLoading(false); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await businessService.getAllBusinesses({ keyword: q, page: 0, size: 10 });
        const page = (res as { data?: { content?: BusinessDto[] } })?.data;
        setOptions(page?.content ?? []);
      } catch { setOptions([]); } finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [input]);

  return (
    <Autocomplete
      size="small" options={options} value={value} loading={loading}
      onChange={(_, v) => onChange(v)}
      inputValue={input} onInputChange={(_, v) => setInput(v)}
      isOptionEqualToValue={(o, v) => o.id === v.id}
      getOptionLabel={(o) => o.name}
      filterOptions={(x) => x}
      noOptionsText={input.trim().length < 2 ? 'Aramak için en az 2 harf yaz' : 'Eşleşen işletme yok'}
      renderOption={(props, o) => (
        <li {...props} key={o.id}>
          <Box>
            <Typography variant="body2">{o.name}</Typography>
            <Typography variant="caption" color="text.secondary">
              {[o.address?.city, o.address?.district].filter(Boolean).join(' · ') || 'konum yok'}
            </Typography>
          </Box>
        </li>
      )}
      renderInput={(params) => (
        <TextField {...params} placeholder="İşletme adıyla ara"
          InputProps={{
            ...params.InputProps,
            endAdornment: (<>{loading ? <CircularProgress size={16} /> : null}{params.InputProps.endAdornment}</>),
          }} />
      )}
    />
  );
}

/**
 * Yer sayısının hangi alana ait olduğunu söyle: "Samsun'da", "Karadeniz'de",
 * "Tüm Türkiye'de". Sunucu kapsam ayrımını desteklemiyorsa sayı her zaman ilin
 * yeridir, o yüzden kapsamdan bağımsız olarak il yazılır.
 */
function scopeWhere(scope: PromotionScope, offer: PromotionOffer, scoped: boolean): string {
  if (!scoped) return offer.city ? locative(offer.city) : 'Bu ilde';
  if (scope === 'COUNTRY') return "Tüm Türkiye'de";
  const region = regionLabel(offer.region);
  if (scope === 'REGION') return region ? locative(region) : 'Bu bölgede';
  return offer.city ? locative(offer.city) : 'Bu ilde';
}
