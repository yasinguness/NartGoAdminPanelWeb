import { useEffect, useState, type ReactNode } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Divider,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useNbMobile } from '../../components/nartbusiness';
import { Edit as EditIcon } from '@mui/icons-material';
import { nbAdminService } from '../../services/nartbusiness/nbAdminService';
import type { NbEntitlements, TierConfig, TierConfigUpdate } from '../../services/nartbusiness/nbTypes';
import { nb } from '../../theme/nbBrand';

const DEFAULT_ENT: NbEntitlements = {
  directoryBoost: false,
  weeklySpotlight: false,
  goldBadge: false,
  searchPriority: false,
  mediaSlots: 3,
  matchPriority: false,
  profileAnalytics: false,
  conciergeSupport: false,
  teamSeats: 1,
  jobPostingEnabled: false,
  rfqEarlyAccess: false,
};

/**
 * Düzenlenebilir boolean ayrıcalıklar — net Türkçe etiket (jargon yok) + açıklama.
 * Açık toggle = bu kademedeki üyeye uygulanan teknik yetki.
 */
const ENT_TOGGLES: { key: keyof NbEntitlements; label: string; desc: string }[] = [
  { key: 'directoryBoost', label: 'Dizinde üst sırada gösterim', desc: 'Üye dizininde diğer üyelerin önünde listelenir.' },
  { key: 'weeklySpotlight', label: 'Her hafta garantili öne çıkarma', desc: 'Her hafta belirli bir süre vitrinde öne çıkarılır.' },
  { key: 'goldBadge', label: 'Profilde altın rozet', desc: 'Üst kademe üyelik rozeti profilde görünür.' },
  { key: 'searchPriority', label: 'Arama sonuçlarında öncelik', desc: 'Arama sonuçlarında üst sıralarda çıkar.' },
  { key: 'matchPriority', label: 'Akıllı eşleştirmede öncelik', desc: 'Eşleştirme önerilerinde önce gösterilir.' },
  { key: 'profileAnalytics', label: 'Profil görüntülenme istatistikleri', desc: 'Profilini kimlerin/kaç kez görüntülediğini görür.' },
  { key: 'conciergeSupport', label: 'Öncelikli (özel) destek', desc: 'Destek taleplerinde öncelikli, kişiye özel yanıt.' },
  { key: 'jobPostingEnabled', label: 'İşe alım ilanı yayınlama', desc: 'Ağda işe alım ilanı yayımlayabilir.' },
  { key: 'rfqEarlyAccess', label: 'Tekliflere erken erişim', desc: 'Yeni talepleri/teklif fırsatlarını diğerlerinden önce görür.' },
];

/** Modal içi bölüm başlığı — uzun formu görsel gruplara ayırır. */
function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <Divider textAlign="left" sx={{ mt: 1 }}>
      <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.5 }}>
        {children}
      </Typography>
    </Divider>
  );
}

const CURRENCY_OPTIONS = ['TL', 'USD', 'EUR'] as const;
const CURRENCY_SYMBOL: Record<string, string> = { TL: '₺', USD: '$', EUR: '€' };

/** "24000" → "24.000" (binlik ayraçlı, tr-TR). */
function fmtMoney(amount: number, currency: string): string {
  const n = Number.isFinite(amount) ? amount : 0;
  return `${n.toLocaleString('tr-TR')} ${currency}`;
}

const EMPTY_UPDATE: TierConfigUpdate = {
  displayName: '',
  priceAmount: 0,
  currency: 'TL',
  pricePeriod: 'yıl',
  shortDescription: '',
  features: [],
  sortOrder: 0,
  active: true,
  entitlements: DEFAULT_ENT,
};

export default function NbTierManagement() {
  const fullScreen = useNbMobile();
  const [items, setItems] = useState<TierConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TierConfigUpdate>(EMPTY_UPDATE);
  const [featuresRaw, setFeaturesRaw] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    nbAdminService
      .listTiers()
      .then((data) => { setItems(data); setLoading(false); })
      .catch((err) => { setError(err?.message ?? 'Veri yüklenemedi'); setLoading(false); });
  };

  useEffect(load, []);

  const openEdit = (tier: TierConfig) => {
    setEditingId(tier.id);
    setForm({
      displayName: tier.displayName,
      priceAmount: tier.priceAmount,
      currency: tier.currency,
      pricePeriod: tier.pricePeriod,
      shortDescription: tier.shortDescription ?? '',
      features: tier.features,
      sortOrder: tier.sortOrder,
      active: tier.active,
      entitlements: tier.entitlements ?? DEFAULT_ENT,
    });
    setFeaturesRaw(tier.features.join('\n'));
  };

  const closeEdit = () => { setEditingId(null); setForm(EMPTY_UPDATE); setFeaturesRaw(''); };

  const isEditing = editingId !== null;
  const editingTier = items.find((t) => t.id === editingId);

  const willDeactivate =
    isEditing && !form.active && !!editingTier?.active;

  const formValid =
    form.displayName.trim().length > 0 &&
    form.priceAmount >= 0 &&
    form.currency.trim().length > 0 &&
    form.pricePeriod.trim().length > 0;

  const save = async () => {
    if (!editingId || !formValid) return;
    setSubmitting(true);
    const features = featuresRaw
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      await nbAdminService.upsertTier(editingId, { ...form, features });
      closeEdit();
      load();
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? e?.message ?? 'Kaydetme başarısız');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box p={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            NartBusiness — Üyelik Tipleri
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Mobil uygulamada görünen üyelik tiplerini buradan yönetin.
            Pasif tipler başvuru formunda gösterilmez; mevcut üyelikleri etkilemez.
          </Typography>
        </Box>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Kod</TableCell>
                <TableCell>İsim</TableCell>
                <TableCell>Fiyat</TableCell>
                <TableCell>Kısa Açıklama</TableCell>
                <TableCell>Sıra</TableCell>
                <TableCell>Durum</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((t) => (
                <TableRow key={t.id} hover>
                  <TableCell>
                    <Typography fontFamily="monospace">{t.code}</Typography>
                  </TableCell>
                  <TableCell>{t.displayName}</TableCell>
                  <TableCell>
                    {t.priceAmount.toLocaleString('tr-TR')} {t.currency} / {t.pricePeriod}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 240 }}>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {t.shortDescription ?? '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>{t.sortOrder}</TableCell>
                  <TableCell>
                    {t.active ? (
                      <Chip size="small" color="success" label="Aktif" />
                    ) : (
                      <Chip size="small" variant="outlined" label="Pasif" />
                    )}
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => openEdit(t)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={isEditing} onClose={closeEdit} maxWidth="sm" fullWidth fullScreen={fullScreen}>
        <DialogTitle>
          Kademe Düzenle — <Typography component="span" fontFamily="monospace">{editingTier?.code}</Typography>
        </DialogTitle>
        <DialogContent dividers>
          {(() => {
            const ent = form.entitlements ?? DEFAULT_ENT;
            const setEnt = (patch: Partial<NbEntitlements>) =>
              setForm({ ...form, entitlements: { ...ent, ...patch } });
            const previewFeatures = featuresRaw
              .split('\n')
              .map((s) => s.trim())
              .filter(Boolean);
            // Açık toggle'lardan + slot/koltuk'tan özellik listesi üret.
            const fillFromToggles = () => {
              const lines = ENT_TOGGLES.filter((t) => Boolean(ent[t.key])).map((t) => t.label);
              if ((ent.mediaSlots ?? 0) > 0) lines.push(`${ent.mediaSlots} görsel/video yükleme hakkı`);
              if ((ent.teamSeats ?? 1) > 1) lines.push(`${ent.teamSeats} kullanıcı koltuğu`);
              setFeaturesRaw(lines.join('\n'));
            };
            const nameError = form.displayName.trim().length === 0;
            return (
              <Stack spacing={2}>
                {/* Değişikliğin mevcut üyelere etkisi */}
                <Alert severity="info" sx={{ '& .MuiAlert-message': { fontSize: 13 } }}>
                  Fiyat ve ayrıcalık değişiklikleri yalnız <b>yeni üyelikler ve yenilemeler</b> için
                  geçerlidir; mevcut üyelerin aktif dönemi etkilenmez.
                </Alert>

                {/* ── Temel Bilgiler ── */}
                <SectionLabel>Temel Bilgiler</SectionLabel>
                <TextField
                  label="İsim *"
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  fullWidth
                  error={nameError}
                  helperText={nameError ? 'İsim zorunlu' : ' '}
                />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <TextField
                    label="Fiyat *"
                    type="number"
                    value={form.priceAmount}
                    onChange={(e) =>
                      setForm({ ...form, priceAmount: Math.max(0, parseFloat(e.target.value) || 0) })
                    }
                    error={form.priceAmount < 0}
                    helperText={fmtMoney(form.priceAmount, form.currency)}
                    sx={{ flex: 2 }}
                  />
                  <TextField
                    select
                    label="Para Birimi"
                    value={CURRENCY_OPTIONS.includes(form.currency as never) ? form.currency : 'TL'}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                    sx={{ flex: 1 }}
                  >
                    {CURRENCY_OPTIONS.map((c) => (
                      <MenuItem key={c} value={c}>{c}</MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label="Periyot"
                    value={form.pricePeriod}
                    onChange={(e) => setForm({ ...form, pricePeriod: e.target.value })}
                    InputProps={{ startAdornment: <InputAdornment position="start">/</InputAdornment> }}
                    sx={{ flex: 1 }}
                    helperText="Örn: yıl, ay"
                  />
                </Stack>
                <TextField
                  label="Sıra"
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm({ ...form, sortOrder: parseInt(e.target.value, 10) || 0 })
                  }
                  helperText="Listede düşük değer önce gösterilir. En üste sabitlemek için negatif değer kullan (örn. -1)."
                  sx={{ maxWidth: 220 }}
                />

                {/* ── Üyeye Gösterilen ── */}
                <SectionLabel>Üyeye Gösterilen</SectionLabel>
                <TextField
                  label="Kısa Açıklama"
                  value={form.shortDescription ?? ''}
                  onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
                  fullWidth
                  helperText="Mobil/web kademe kartının altında tek satır olarak gösterilir."
                />
                <Box>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      Özellikler — üyeye gösterilen tanıtım listesi (her satır bir madde).
                    </Typography>
                    <Button size="small" onClick={fillFromToggles}>
                      Ayrıcalıklardan doldur
                    </Button>
                  </Stack>
                  <TextField
                    value={featuresRaw}
                    onChange={(e) => setFeaturesRaw(e.target.value)}
                    multiline
                    rows={4}
                    fullWidth
                    placeholder={'Dizinde üst sırada gösterim\nTekliflere erken erişim\n…'}
                  />
                  <Typography variant="caption" color="text.secondary">
                    Bu liste yalnız tanıtım amaçlıdır. Üyenin gerçek yetkileri aşağıdaki
                    <b> Ayrıcalıklar</b>'dan gelir — ikisini tutarlı tutmak için "Ayrıcalıklardan doldur"u kullanabilirsin.
                  </Typography>
                </Box>

                {/* ── Yetkiler (Ayrıcalıklar) ── */}
                <SectionLabel>Yetkiler (Ayrıcalıklar)</SectionLabel>
                <Typography variant="caption" color="text.secondary">
                  Bu kademedeki üyeye uygulanan gerçek teknik yetkiler. Açık = etkin.
                </Typography>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                    gap: 1,
                  }}
                >
                  {ENT_TOGGLES.map((t) => (
                    <Box key={t.key} sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                      <Switch
                        size="small"
                        checked={Boolean(ent[t.key])}
                        onChange={(e) => setEnt({ [t.key]: e.target.checked } as Partial<NbEntitlements>)}
                      />
                      <Box sx={{ minWidth: 0, pt: 0.4 }}>
                        <Typography variant="body2" fontWeight={Boolean(ent[t.key]) ? 600 : 400}>
                          {t.label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.3, display: 'block' }}>
                          {t.desc}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
                <Stack direction="row" spacing={1}>
                  <TextField
                    label="Görsel/video hakkı"
                    type="number"
                    size="small"
                    value={ent.mediaSlots}
                    onChange={(e) => setEnt({ mediaSlots: parseInt(e.target.value, 10) || 0 })}
                    helperText="Üyenin yükleyebileceği maksimum görsel/video sayısı."
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label="Ek kullanıcı koltuğu"
                    type="number"
                    size="small"
                    value={ent.teamSeats}
                    onChange={(e) => setEnt({ teamSeats: parseInt(e.target.value, 10) || 1 })}
                    helperText="İşletme hesabına eklenebilecek ek kullanıcı sayısı."
                    sx={{ flex: 1 }}
                  />
                </Stack>

                {/* ── Üye Önizlemesi ── */}
                <SectionLabel>Üye Bunu Böyle Görecek</SectionLabel>
                <Paper
                  variant="outlined"
                  sx={{ p: 2, borderColor: 'rgba(201,168,76,0.5)', bgcolor: 'rgba(27,42,74,0.03)' }}
                >
                  <Stack direction="row" alignItems="baseline" justifyContent="space-between">
                    <Typography variant="subtitle1" fontWeight={700} sx={{ color: nb.navy }}>
                      {form.displayName || 'Kademe adı'}
                    </Typography>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#C9A84C' }}>
                      {CURRENCY_SYMBOL[form.currency] ?? ''}{(form.priceAmount || 0).toLocaleString('tr-TR')} / {form.pricePeriod}
                    </Typography>
                  </Stack>
                  {form.shortDescription && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {form.shortDescription}
                    </Typography>
                  )}
                  {previewFeatures.length > 0 && (
                    <Stack spacing={0.5} sx={{ mt: 1.5 }}>
                      {previewFeatures.map((f, i) => (
                        <Stack key={i} direction="row" spacing={0.75} alignItems="flex-start">
                          <Box component="span" sx={{ color: '#C9A84C', fontWeight: 700, lineHeight: 1.4 }}>✓</Box>
                          <Typography variant="body2">{f}</Typography>
                        </Stack>
                      ))}
                    </Stack>
                  )}
                </Paper>

                {/* ── Durum ── */}
                <SectionLabel>Durum</SectionLabel>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={form.active}
                      onChange={(e) => setForm({ ...form, active: e.target.checked })}
                    />
                  }
                  label="Aktif"
                />
                {willDeactivate && (
                  <Alert severity="warning">
                    Bu kademeyi pasifleştiriyorsun. Başvuru formunda <b>artık gösterilmez</b>.
                    Mevcut üyelerin kademesi değişmez.
                  </Alert>
                )}
              </Stack>
            );
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEdit}>Vazgeç</Button>
          <Button
            variant="contained"
            onClick={save}
            disabled={!formValid || submitting}
          >
            {submitting ? 'Kaydediliyor…' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
