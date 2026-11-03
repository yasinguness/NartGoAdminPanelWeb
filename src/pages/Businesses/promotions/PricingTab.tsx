import { useMemo, useState } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider,
  InputAdornment, Stack, Switch, Table, TableBody, TableCell, TableHead, TableRow,
  TextField, Typography,
} from '@mui/material';
import {
  CITY_SLOT_LIMIT, DEFAULT_SLOT_LIMIT, SCOPES, SCOPE_HINT, SCOPE_LABEL, STORY_SLOT_LIMIT,
  VIEWER_SPONSORED_CAP, enabledKey, normalizeSettingChanges, priceKey, settingLabel,
  slotLimitKey, storyKey, supportsEnabledFlags, supportsScopeSlots, supportsViewerCap,
  type PromotionScope,
} from '../../../services/business/promotionAdminService';
import { SectionCard, TONE, fmtDateShort, tl } from './shared';

type Settings = Record<string, number | null>;

const num = (v: number | null | undefined) => (v == null || v <= 0 ? null : v);

/** "günlük 50 ₺ · %30 avantaj" — 30 günün 7 güne göre günlük kazancı. */
function dailyNote(p7: number | null, p30: number | null): string | null {
  if (p30 == null) return null;
  const daily = Math.round(p30 / 30);
  if (p7 == null) return `günlük ${daily.toLocaleString('tr-TR')} ₺`;
  const d7 = p7 / 7;
  const adv = Math.round((1 - p30 / 30 / d7) * 100);
  return adv > 0
    ? `günlük ${daily.toLocaleString('tr-TR')} ₺ · %${adv} avantaj`
    : `günlük ${daily.toLocaleString('tr-TR')} ₺`;
}

/**
 * Fiyatlar ve kurallar.
 *
 * Satış durumu türetilmiş bir değer: sunucuda "bu kapsam açık mı" diye bir
 * bayrak yok, fiyatı girilmemiş seçenek satılmıyor (`PromotionSettings.price`
 * sıfır/boş olanı null sayıyor). Bu yüzden anahtar kapatıldığında fiyatlar
 * siliniyor ve kullanıcıya bunun geri alınamayacağı söyleniyor.
 */
export default function PricingTab({ settings, changes, onSave, saving }: {
  settings: Settings;
  /** Sunucudan gelen ham `settingChanges`; şekli belirsiz olduğu için çözümleniyor. */
  changes?: unknown;
  onSave: (c: Settings) => Promise<void>;
  saving: boolean;
}) {
  const history = useMemo(() => normalizeSettingChanges(changes), [changes]);
  const [editScopes, setEditScopes] = useState(false);
  const [editStory, setEditStory] = useState(false);
  const [confirmOff, setConfirmOff] = useState<PromotionScope | 'STORY' | null>(null);

  const citySlot = settings[CITY_SLOT_LIMIT] ?? DEFAULT_SLOT_LIMIT;
  const storySlot = settings[STORY_SLOT_LIMIT] ?? DEFAULT_SLOT_LIMIT;

  // Sunucu kapsam başına sınırı/bayrağı destekliyor mu (anahtarın varlığından).
  const hasScopeSlots = supportsScopeSlots(settings);
  const hasFlags = supportsEnabledFlags(settings);
  const hasCap = supportsViewerCap(settings);

  const slotOf = (s: PromotionScope) =>
    (hasScopeSlots ? settings[slotLimitKey(s)] : settings[CITY_SLOT_LIMIT]) ?? DEFAULT_SLOT_LIMIT;

  /** Bayrak girilmemişse açık sayılır; 0 ise fiyat girilse de satışa kapalı. */
  const flagOn = (k: string) => settings[k] !== 0;

  const hasPrice = (s: PromotionScope) =>
    num(settings[priceKey(s, 7)]) != null || num(settings[priceKey(s, 30)]) != null;
  const scopeOpen = (s: PromotionScope) =>
    hasPrice(s) && (!hasFlags || flagOn(enabledKey(s)));
  const storyHasPrice = num(settings[storyKey(7)]) != null || num(settings[storyKey(30)]) != null;
  const storyOpen = storyHasPrice && (!hasFlags || flagOn(enabledKey('STORY')));

  const anyOpen = useMemo(() => SCOPES.some(scopeOpen) || storyOpen, [settings]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Satışa kapat.
   *
   * Sunucu `*_ENABLED` bayrağını destekliyorsa fiyatlar yerinde kalır, sadece
   * bayrak 0 olur — kapatıp açmak artık fiyatları kaybettirmiyor. Desteklemeyen
   * sürümde tek yol fiyatı boşaltmak; o durumda onay soruluyor.
   */
  const closeScope = async (s: PromotionScope | 'STORY') => {
    const changes: Settings = hasFlags
      ? { [enabledKey(s)]: 0 }
      : s === 'STORY'
        ? { [storyKey(7)]: null, [storyKey(30)]: null }
        : { [priceKey(s, 7)]: null, [priceKey(s, 30)]: null };
    await onSave(changes);
    setConfirmOff(null);
  };

  /** Bayrağı tekrar aç; fiyat yoksa düzenleme diyaloğuna yönlendir. */
  const openScope = async (s: PromotionScope | 'STORY') => {
    const priced = s === 'STORY' ? storyHasPrice : hasPrice(s);
    if (hasFlags && priced) { await onSave({ [enabledKey(s)]: 1 }); return; }
    if (s === 'STORY') setEditStory(true); else setEditScopes(true);
  };

  return (
    <Box sx={{ pt: 2.5 }}>
      {!anyOpen && (
        <Alert severity="warning" sx={{ mb: 2.5 }}>
          Hiçbir fiyat girilmemiş — ücretli öne çıkarma şu an <b>tamamen kapalı</b>, hiçbir işletme satın alamaz.
        </Alert>
      )}

      <SectionCard
        title="Kapsamlar"
        description="İşletmenin kartı hangi kullanıcılara öne çıkarılır."
        action={<Button variant="outlined" size="small"
          onClick={(e) => { (e.currentTarget as HTMLElement).blur(); setEditScopes(true); }}>
          Düzenle
        </Button>}
        dense
      >
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 760 }}>
            <TableHead>
              <TableRow>
                <TableCell>Kapsam</TableCell>
                <TableCell align="right">7 gün</TableCell>
                <TableCell align="right">30 gün</TableCell>
                <TableCell>Yer sınırı</TableCell>
                <TableCell align="right">Satış</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {SCOPES.map((s) => {
                const p7 = num(settings[priceKey(s, 7)]);
                const p30 = num(settings[priceKey(s, 30)]);
                const note = dailyNote(p7, p30);
                const open = scopeOpen(s);
                return (
                  <TableRow key={s}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{SCOPE_LABEL[s]}</Typography>
                      <Typography variant="caption" color="text.secondary">{SCOPE_HINT[s]}</Typography>
                    </TableCell>
                    <TableCell align="right">{tl(p7, 'kapalı')}</TableCell>
                    <TableCell align="right">
                      {tl(p30, 'kapalı')}
                      {note && (
                        <Typography variant="caption" sx={{ display: 'block', color: TONE.go }}>{note}</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {hasScopeSlots
                          ? { CITY: `Her ilde aynı anda ${slotOf('CITY')}`,
                              REGION: `Her bölgede aynı anda ${slotOf('REGION')}`,
                              COUNTRY: `Aynı anda ${slotOf('COUNTRY')}` }[s]
                          : `Her ilde aynı anda ${citySlot}`}
                      </Typography>
                      {hasFlags && hasPrice(s) && !flagOn(enabledKey(s)) && (
                        <Typography variant="caption" sx={{ color: TONE.warn }}>
                          Fiyat duruyor, satış kapalı
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Switch
                        checked={open}
                        onChange={(e) => {
                          (e.currentTarget as HTMLElement).blur();
                          if (open) setConfirmOff(s); else void openScope(s);
                        }}
                        color="success"
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
        <Box sx={{ px: 2.5, py: 1.5, bgcolor: 'action.hover' }}>
          <Typography variant="caption" color="text.secondary">
            {hasScopeSlots ? (
              <>
                Her kapsamın kendi yeri var; Tüm Türkiye alan bir işletme ilin sınırından yer kaplamaz.
                {hasCap && ` Bir kullanıcıya aynı anda en fazla ${settings[VIEWER_SPONSORED_CAP] ?? DEFAULT_SLOT_LIMIT} sponsorlu kart gösterilir.`}
              </>
            ) : (
              <>
                Yer sınırı tek ve ortaktır: bir ilde aynı anda en fazla {citySlot} işletme sponsorlu görünür,
                kapsamı ne olursa olsun. Tüm Türkiye alan bir işletme de bulunduğu ilin sınırından yer kaplar.
              </>
            )}
          </Typography>
        </Box>
      </SectionCard>

      <SectionCard
        title="Ek ürünler"
        description="Bir kapsama ek olarak satılır, tek başına alınamaz."
        action={<Button variant="outlined" size="small"
          onClick={(e) => { (e.currentTarget as HTMLElement).blur(); setEditStory(true); }}>
          Düzenle
        </Button>}
        dense
      >
        <Divider />
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}
          sx={{ px: 2.5, py: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" fontWeight={600}>Hikâye eki</Typography>
            <Typography variant="caption" color="text.secondary">
              Akıştaki hikâye alanında görünür. Birden fazla varsa her kullanıcıya günde biri gösterilir.
            </Typography>
          </Box>
          <Stack direction="row" spacing={3} alignItems="center">
            <Figure label="7 gün" value={tl(num(settings[storyKey(7)]), 'kapalı')} />
            <Figure label="30 gün" value={tl(num(settings[storyKey(30)]), 'kapalı')} />
            <Figure label="Yer sınırı" value={`Aynı anda ${storySlot}`} />
            <Switch checked={storyOpen} color="success"
              onChange={(e) => {
                (e.currentTarget as HTMLElement).blur();
                if (storyOpen) setConfirmOff('STORY'); else void openScope('STORY');
              }} />
          </Stack>
        </Stack>
      </SectionCard>

      <SectionCard title="Kurallar" dense>
        <Divider />
        <Rule title="Ödeme"
          body="Ödeme alınır alınmaz öne çıkarma başlar; ayrı bir onay adımı yoktur. Yer bulunamazsa kayıt
                'iade bekliyor' olur ve bekleyen işler sekmesinde görünür." />
        <Rule title="Yer sınırı"
          body={`Bir ilde aynı anda en fazla ${citySlot} işletme sponsorlu görünür. Tüm Türkiye kapsamı da
                 işletmenin ilinin sınırından yer kaplar; kapsam başına ayrı sınır yoktur.`} />
        <Rule title="Ölçüm"
          body="Görüntülenme kart ekranda görününce sayılır. Aynı kişinin aynı kayda etkisi günde bir kez sayılır." />
        <Rule title="Etiket"
          body="Ücretli ve deneme kayıtlar kullanıcıya 'Sponsorlu' etiketiyle gösterilir." last />
      </SectionCard>

      {history.length > 0 && (
        <SectionCard title="Son değişiklikler"
          description="Her ayarın en son kim tarafından ne zaman değiştirildiği. Eski değer saklanmadığı için gösterilemiyor."
          dense>
          <Divider />
          {history.slice(0, 8).map((h) => (
            <Stack key={h.key} direction="row" spacing={2} alignItems="baseline"
              sx={{ px: 2.5, py: 1.25, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="caption" color="text.secondary" sx={{ minWidth: 90 }}>
                {fmtDateShort(h.at)}
              </Typography>
              <Typography variant="body2" sx={{ flex: 1 }}>{settingLabel(h.key)}</Typography>
              <Typography variant="caption" color="text.secondary">{h.by ?? '—'}</Typography>
            </Stack>
          ))}
        </SectionCard>
      )}

      <ScopePricesDialog
        open={editScopes} settings={settings} saving={saving}
        hasScopeSlots={hasScopeSlots} hasCap={hasCap}
        onClose={() => setEditScopes(false)}
        onSave={async (c) => { await onSave(c); setEditScopes(false); }}
      />
      <StoryPricesDialog
        open={editStory} settings={settings} saving={saving}
        onClose={() => setEditStory(false)}
        onSave={async (c) => { await onSave(c); setEditStory(false); }}
      />

      <Dialog open={confirmOff !== null} onClose={() => setConfirmOff(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Satışa kapatılsın mı?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {confirmOff === 'STORY' ? 'Hikâye eki' : confirmOff && SCOPE_LABEL[confirmOff]} satışa kapatılacak.
            {hasFlags
              ? ' Fiyatlar yerinde kalır, istediğinde aynı fiyatlarla tekrar açabilirsin.'
              : ' Sunucuda ayrı bir açık/kapalı bayrağı yok: fiyatlar silinir, tekrar açarken yeniden girmen gerekir.'}
            {' '}Yayındaki kayıtlar süreleri dolana kadar devam eder.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOff(null)}>Vazgeç</Button>
          <Button color="error" variant="contained" disabled={saving}
            onClick={() => confirmOff && closeScope(confirmOff)}>
            Satışa kapat
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ textAlign: 'right', minWidth: 76 }}>
      <Typography variant="caption" color="text.secondary" display="block"
        sx={{ textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.5 }}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={700}>{value}</Typography>
    </Box>
  );
}

function Rule({ title, body, last }: { title: string; body: string; last?: boolean }) {
  return (
    <Box sx={{ px: 2.5, py: 1.75, borderBottom: last ? 0 : 1, borderColor: 'divider' }}>
      <Typography variant="body2" fontWeight={600}>{title}</Typography>
      <Typography variant="body2" color="text.secondary">{body}</Typography>
    </Box>
  );
}

/** Boş = satışa kapalı. Geçersiz değer kaydedilemez (sunucuya NaN gitmez). */
function priceError(v: string): boolean {
  const t = v.trim();
  if (t === '') return false;
  const n = Number(t.replace(',', '.'));
  return !Number.isFinite(n) || n < 0 || n > 100000;
}

function toChange(v: string): number | null {
  const t = v.trim();
  return t === '' ? null : Number(t.replace(',', '.'));
}

function ScopePricesDialog({ open, settings, saving, hasScopeSlots, hasCap, onClose, onSave }: {
  open: boolean; settings: Settings; saving: boolean;
  hasScopeSlots: boolean; hasCap: boolean;
  onClose: () => void; onSave: (c: Settings) => Promise<void>;
}) {
  // Yalnız sunucunun tanıdığı anahtarlar düzenlenir; tanımadığı anahtar
  // gönderilirse `update()` "Bilinmeyen ayar" ile reddeder.
  const limitKeys = hasScopeSlots
    ? SCOPES.map((x) => slotLimitKey(x))
    : [CITY_SLOT_LIMIT];
  const extraKeys = hasCap ? [VIEWER_SPONSORED_CAP] : [];

  const initial = () => {
    const d: Record<string, string> = {};
    SCOPES.forEach((s) => {
      d[priceKey(s, 7)] = settings[priceKey(s, 7)] == null ? '' : String(settings[priceKey(s, 7)]);
      d[priceKey(s, 30)] = settings[priceKey(s, 30)] == null ? '' : String(settings[priceKey(s, 30)]);
    });
    [...limitKeys, ...extraKeys].forEach((k) => {
      d[k] = settings[k] == null ? '' : String(settings[k]);
    });
    return d;
  };
  const [draft, setDraft] = useState<Record<string, string>>(initial);

  const invalid = SCOPES.some((s) => priceError(draft[priceKey(s, 7)] ?? '') || priceError(draft[priceKey(s, 30)] ?? ''));
  const limitBad = (k: string) => {
    const v = (draft[k] ?? '').trim();
    return v !== '' && !(Number(v) >= 1 && Number(v) <= 100);
  };
  const slotInvalid = [...limitKeys, ...extraKeys].some(limitBad);

  const submit = async () => {
    const changes: Settings = {};
    SCOPES.forEach((s) => {
      changes[priceKey(s, 7)] = toChange(draft[priceKey(s, 7)] ?? '');
      changes[priceKey(s, 30)] = toChange(draft[priceKey(s, 30)] ?? '');
    });
    [...limitKeys, ...extraKeys].forEach((k) => { changes[k] = toChange((draft[k] ?? '').trim()); });
    await onSave(changes);
  };

  const set = (k: string, v: string) => setDraft({ ...draft, [k]: v });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      TransitionProps={{ onEntering: () => setDraft(initial()) }}>
      <DialogTitle>Kapsam fiyatları</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Boş bırakılan süre satışa kapalıdır. En fazla 100.000 ₺.
        </Typography>
        <Stack spacing={2}>
          {SCOPES.map((s) => (
            <Box key={s}>
              <Typography variant="body2" fontWeight={600}>{SCOPE_LABEL[s]}</Typography>
              <Typography variant="caption" color="text.secondary">{SCOPE_HINT[s]}</Typography>
              <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                {([7, 30] as const).map((d) => (
                  <TextField key={d} size="small" label={`${d} gün`} sx={{ width: 160 }}
                    value={draft[priceKey(s, d)] ?? ''} placeholder="kapalı"
                    onChange={(e) => set(priceKey(s, d), e.target.value)}
                    error={priceError(draft[priceKey(s, d)] ?? '')}
                    inputProps={{ inputMode: 'decimal', style: { textAlign: 'right' } }}
                    InputProps={{ endAdornment: <InputAdornment position="end">₺</InputAdornment> }} />
                ))}
              </Stack>
            </Box>
          ))}
          <Divider />
          <Typography variant="body2" fontWeight={600}>Yer sınırı</Typography>
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
            {limitKeys.map((k) => (
              <TextField key={k} size="small" sx={{ width: 190 }}
                label={hasScopeSlots
                  ? `${SCOPE_LABEL[SCOPES.find((x) => slotLimitKey(x) === k) as PromotionScope]} yeri`
                  : 'İl başına yer sınırı'}
                value={draft[k] ?? ''} error={limitBad(k)}
                onChange={(e) => set(k, e.target.value)}
                inputProps={{ inputMode: 'numeric' }} />
            ))}
          </Stack>
          <Typography variant="caption" color="text.secondary">
            1–100 arası. Boşsa {DEFAULT_SLOT_LIMIT}.
            {hasScopeSlots
              ? ' Her kapsam kendi yerini kullanır.'
              : ' Tüm kapsamlar için ortak.'}
          </Typography>
          {hasCap && (
            <TextField size="small" sx={{ width: 300 }} label="Kişi başına en fazla sponsorlu kart"
              value={draft[VIEWER_SPONSORED_CAP] ?? ''} error={limitBad(VIEWER_SPONSORED_CAP)}
              onChange={(e) => set(VIEWER_SPONSORED_CAP, e.target.value)}
              helperText={`Bir kullanıcı akışta aynı anda en fazla kaç sponsorlu kart görür. Boşsa ${DEFAULT_SLOT_LIMIT}.`}
              inputProps={{ inputMode: 'numeric' }} />
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Vazgeç</Button>
        <Button variant="contained" onClick={submit} disabled={invalid || slotInvalid || saving}>
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function StoryPricesDialog({ open, settings, saving, onClose, onSave }: {
  open: boolean; settings: Settings; saving: boolean;
  onClose: () => void; onSave: (c: Settings) => Promise<void>;
}) {
  const initial = () => ({
    [storyKey(7)]: settings[storyKey(7)] == null ? '' : String(settings[storyKey(7)]),
    [storyKey(30)]: settings[storyKey(30)] == null ? '' : String(settings[storyKey(30)]),
    [STORY_SLOT_LIMIT]: settings[STORY_SLOT_LIMIT] == null ? '' : String(settings[STORY_SLOT_LIMIT]),
  });
  const [draft, setDraft] = useState<Record<string, string>>(initial);

  const invalid = priceError(draft[storyKey(7)] ?? '') || priceError(draft[storyKey(30)] ?? '');
  const slotRaw = (draft[STORY_SLOT_LIMIT] ?? '').trim();
  const slotInvalid = slotRaw !== '' && !(Number(slotRaw) >= 1 && Number(slotRaw) <= 100);

  const submit = async () => {
    await onSave({
      [storyKey(7)]: toChange(draft[storyKey(7)] ?? ''),
      [storyKey(30)]: toChange(draft[storyKey(30)] ?? ''),
      [STORY_SLOT_LIMIT]: toChange(slotRaw),
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth
      TransitionProps={{ onEntering: () => setDraft(initial()) }}>
      <DialogTitle>Hikâye eki</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Stack direction="row" spacing={2}>
            {([7, 30] as const).map((d) => (
              <TextField key={d} size="small" label={`${d} gün`} sx={{ width: 150 }}
                value={draft[storyKey(d)] ?? ''} placeholder="kapalı"
                onChange={(e) => setDraft({ ...draft, [storyKey(d)]: e.target.value })}
                error={priceError(draft[storyKey(d)] ?? '')}
                inputProps={{ inputMode: 'decimal', style: { textAlign: 'right' } }}
                InputProps={{ endAdornment: <InputAdornment position="end">₺</InputAdornment> }} />
            ))}
          </Stack>
          <TextField size="small" label="Aynı anda en fazla hikâye eki" value={draft[STORY_SLOT_LIMIT] ?? ''}
            error={slotInvalid}
            onChange={(e) => setDraft({ ...draft, [STORY_SLOT_LIMIT]: e.target.value })}
            helperText={`1–100 arası. Boşsa ${DEFAULT_SLOT_LIMIT}. Birden fazlaysa her kişiye günde biri gösterilir.`}
            inputProps={{ inputMode: 'numeric' }} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Vazgeç</Button>
        <Button variant="contained" onClick={submit} disabled={invalid || slotInvalid || saving}>
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

