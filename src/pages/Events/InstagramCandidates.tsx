/**
 * Instagram'dan etkinlik adayları.
 *
 * Takip edilen dernek hesapları taranır; etkinlik anlatan gönderiler aday
 * olur. Otomatik yayın YOK — her adayı admin kontrol eder. Sayfanın tasarım
 * önceliği bu: gönderinin kendisi (görsel + metin) kararın dayanağı olduğu
 * için öne çıkar, çıkarılan alanlar düzenlenebilir durur ve eksik olan
 * (çoğu zaman saat) yayınlamayı engeller.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, FormControlLabel, Grid, Link, Paper, Stack, Switch, Tab, Tabs, TextField, Tooltip, Typography,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RefreshIcon from '@mui/icons-material/Refresh';
import ImageNotSupportedIcon from '@mui/icons-material/ImageNotSupported';
import AddIcon from '@mui/icons-material/Add';
import { useSnackbar } from 'notistack';
import UserSearchAutocomplete from '../../components/UserSearchAutocomplete';
import GooglePlacesInput, { type AddressValue } from '../../components/GooglePlacesInput';
import type { UserDTO } from '../../types/users/userModel';
import {
  instagramCandidateService, candidateError,
  type CandidateStatus, type InstagramCandidate, type InstagramSource, type ScanReport,
} from '../../services/events/instagramCandidateService';

const TABS: { value: CandidateStatus; label: string }[] = [
  { value: 'pending', label: 'Bekleyen' },
  { value: 'published', label: 'Yayınlanan' },
  { value: 'rejected', label: 'Reddedilen' },
  { value: 'past', label: 'Tarihi geçmiş' },
  { value: 'duplicate', label: 'Kopya' },
];

const CONFIDENCE: Record<string, { label: string; color: 'success' | 'warning' | 'default' }> = {
  high: { label: 'Güçlü eşleşme', color: 'success' },
  medium: { label: 'Orta eşleşme', color: 'warning' },
  low: { label: 'Zayıf eşleşme', color: 'default' },
};

/** ISO → datetime-local girdisinin beklediği biçim (yerel saat). */
function toLocalInput(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function fmt(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('tr-TR');
}

export default function InstagramCandidates() {
  const { enqueueSnackbar } = useSnackbar();
  const [tab, setTab] = useState<CandidateStatus>('pending');
  const [items, setItems] = useState<InstagramCandidate[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [scan, setScan] = useState<ScanReport | null>(null);
  const [scanning, setScanning] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await instagramCandidateService.candidates(tab)); }
    catch (e) { enqueueSnackbar(candidateError(e), { variant: 'error' }); setItems([]); }
    finally { setLoading(false); }
  }, [tab, enqueueSnackbar]);

  useEffect(() => { void load(); }, [load]);

  const runScan = async () => {
    setScanning(true);
    try {
      const r = await instagramCandidateService.scan();
      setScan(r);
      enqueueSnackbar(`${r.added} yeni aday eklendi.`, { variant: 'success' });
      await load();
    } catch (e) { enqueueSnackbar(candidateError(e), { variant: 'error' }); }
    finally { setScanning(false); }
  };

  return (
    <Box sx={{ maxWidth: 1400 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'flex-end' }} spacing={2} sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Instagram etkinlik adayları</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5, maxWidth: 820 }}>
            Takip edilen dernek hesapları düzenli taranır; etkinlik anlatan gönderiler aday olur.
            Hiçbir aday kendiliğinden yayınlanmaz — her birini sen kontrol edip yayınlar ya da
            reddedersin. Yayınlanan aday normal etkinlik oluşturma akışından geçer.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => setSourcesOpen(true)}>Kaynak hesaplar</Button>
          <Button variant="contained" startIcon={<RefreshIcon />} disabled={scanning} onClick={() => void runScan()}>
            {scanning ? 'Taranıyor…' : 'Şimdi tara'}
          </Button>
        </Stack>
      </Stack>

      {scan?.stoppedBecause && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setScan({ ...scan, stoppedBecause: null })}>
          <b>Tarama yarıda kaldı:</b> {scan.stoppedBecause}
        </Alert>
      )}
      {scan && !scan.stoppedBecause && (
        <Alert severity="info" sx={{ mb: 2 }} onClose={() => setScan(null)}>
          {scan.scannedAccounts} hesap tarandı · {scan.posts} gönderi · <b>{scan.added} yeni aday</b>
          {scan.duplicates > 0 && ` · ${scan.duplicates} kopya`}
          {scan.past > 0 && ` · ${scan.past} tarihi geçmiş`}
          {scan.notProfessional > 0 && ` · ${scan.notProfessional} hesap incelenemedi`}
          {scan.errors > 0 && ` · ${scan.errors} hata`}
        </Alert>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        {TABS.map((t) => <Tab key={t.value} value={t.value} label={t.label} />)}
      </Tabs>

      {loading && !items ? <CircularProgress /> : !items?.length ? (
        <Typography color="text.secondary">Bu listede aday yok.</Typography>
      ) : (
        <Stack spacing={2}>
          {items.map((c) => <CandidateCard key={c.id} c={c} onDone={() => void load()} />)}
        </Stack>
      )}

      <SourcesDialog open={sourcesOpen} onClose={() => setSourcesOpen(false)} />
    </Box>
  );
}

function CandidateCard({ c, onDone }: { c: InstagramCandidate; onDone: () => void }) {
  const { enqueueSnackbar } = useSnackbar();
  const [name, setName] = useState(c.title ?? '');
  const [when, setWhen] = useState(toLocalInput(c.eventTime));
  /**
   * Konum artık serbest metin değil, Google Places'ten geliyor.
   *
   * Önceden "İl" ve "Yer" iki ayrı serbest alandı; yazım farkları sunucuda
   * çözülemiyordu ve arama Türkiye'ye sabitliydi. Şimdi tek seçici: il,
   * ilçe ve yer adı seçilen yerden türetiliyor, yurt dışı da bulunuyor.
   *
   * Adayda il varsa ön bilgi olarak gösterilir ama seçim yapılmadan
   * yayınlanamaz — sunucunun "İl bulunamadı" hatasına düşmemek için.
   */
  const [addr, setAddr] = useState<AddressValue | null>(
    c.latitude != null && c.longitude != null
      ? {
          city: c.city ?? undefined,
          district: c.district ?? undefined,
          country: c.country ?? undefined,
          countryCode: c.countryCode ?? undefined,
          latitude: c.latitude,
          longitude: c.longitude,
          description: c.formattedAddress ?? c.placeName ?? undefined,
        }
      : null,
  );
  const [busy, setBusy] = useState(false);
  const [imgBroken, setImgBroken] = useState(false);

  const editable = c.status === 'pending';
  const keywords = useMemo(
    () => (c.matchedKeywords ?? '').split(',').map((k) => k.trim()).filter(Boolean),
    [c.matchedKeywords],
  );
  // Gönderide saat bulunamadıysa alan boş gelir ve yayınlamayı engeller:
  // sunucu da "Gönderide saat yok; saati girin." diyerek reddediyor.
  const missing: string[] = [];
  if (!name.trim()) missing.push('başlık');
  if (!when) missing.push('tarih ve saat');
  // Sunucu ili, ülkeyi ve koordinatı istiyor; biri eksikse "haritadan yer
  // seçin" diyerek reddediyor. Aynı kontrolü burada yapıp 400'e düşmüyoruz.
  if (!addr?.latitude || !addr?.city || !addr?.country) missing.push('konum');

  const publish = async () => {
    setBusy(true);
    try {
      const r = await instagramCandidateService.publish(c.id, {
        name: name.trim() || undefined,
        eventTime: when ? new Date(when).toISOString() : undefined,
        address: addr
          ? {
              city: addr.city || undefined,
              district: addr.district || undefined,
              country: addr.country || undefined,
              countryCode: addr.countryCode || undefined,
              latitude: addr.latitude,
              longitude: addr.longitude,
              description: addr.description || undefined,
            }
          : undefined,
      });
      enqueueSnackbar(`“${r.name}” yayınlandı.`, { variant: 'success' });
      onDone();
    } catch (e) { enqueueSnackbar(candidateError(e), { variant: 'error' }); }
    finally { setBusy(false); }
  };

  const reject = async () => {
    setBusy(true);
    try { await instagramCandidateService.reject(c.id); onDone(); }
    catch (e) { enqueueSnackbar(candidateError(e), { variant: 'error' }); }
    finally { setBusy(false); }
  };

  const conf = CONFIDENCE[c.confidence ?? 'low'] ?? CONFIDENCE.low;

  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Grid container spacing={2.5}>
        {/* Görsel — kararın yarısı. Instagram bağlantısı kırılırsa yer tutucu. */}
        <Grid item xs={12} sm={4} md={3}>
          <Box sx={{
            width: '100%', aspectRatio: '1 / 1', borderRadius: 2, overflow: 'hidden',
            bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {c.mediaUrl && !imgBroken ? (
              <Box component="img" src={c.mediaUrl} alt="" onError={() => setImgBroken(true)}
                sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <Stack alignItems="center" spacing={0.5} sx={{ color: 'text.disabled', p: 2, textAlign: 'center' }}>
                <ImageNotSupportedIcon />
                <Typography variant="caption">
                  {c.mediaUrl ? 'Görsel bağlantısı artık geçerli değil' : 'Görsel yok'}
                </Typography>
              </Stack>
            )}
          </Box>
        </Grid>

        <Grid item xs={12} sm={8} md={9}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', mb: 1 }} useFlexGap>
            <Typography variant="body2" fontWeight={700}>@{c.username}</Typography>
            {c.displayName && <Typography variant="body2" color="text.secondary">{c.displayName}</Typography>}
            <Chip size="small" color={conf.color} label={conf.label} />
            {c.hasNartgoAccount === false && (
              <Tooltip title="Kuruluşun NartGo hesabı tanımlı değil; etkinlik NartGo adına açılır, açıklamada düzenleyen ve kaynak belirtilir.">
                <Chip size="small" variant="outlined" label="NartGo adına açılır" />
              </Tooltip>
            )}
            <Box sx={{ flex: 1 }} />
            <Typography variant="caption" color="text.secondary">Gönderi: {fmt(c.postedAt)}</Typography>
            {c.permalink && (
              <Link href={c.permalink} target="_blank" rel="noreferrer" variant="caption"
                sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}>
                Gönderiyi aç <OpenInNewIcon sx={{ fontSize: 13 }} />
              </Link>
            )}
          </Stack>

          {c.caption && (
            <Typography sx={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.6, mb: 1,
              maxHeight: 132, overflow: 'auto', color: 'text.secondary' }}>
              {c.caption}
            </Typography>
          )}

          {!!keywords.length && (
            <Stack direction="row" spacing={0.5} sx={{ mb: 1.5, flexWrap: 'wrap' }} useFlexGap>
              {keywords.map((k) => <Chip key={k} size="small" variant="outlined" label={k} />)}
            </Stack>
          )}

          {c.status === 'duplicate' && (
            <Alert severity="warning" sx={{ mb: 1.5 }}>
              Bu gönderi başka bir adayla aynı etkinliği anlatıyor; kopya olarak işaretlendi.
            </Alert>
          )}
          {c.status === 'past' && (
            <Alert severity="info" sx={{ mb: 1.5 }}>Etkinlik tarihi geçmiş.</Alert>
          )}
          {c.status === 'published' && (
            <Alert severity="success" sx={{ mb: 1.5 }}>
              Yayınlandı{c.reviewedAt ? ` · ${fmt(c.reviewedAt)}` : ''}
              {c.reviewedBy ? ` · ${c.reviewedBy}` : ''}
            </Alert>
          )}
          {c.status === 'rejected' && (
            <Alert severity="info" sx={{ mb: 1.5 }}>
              Reddedildi{c.reviewedAt ? ` · ${fmt(c.reviewedAt)}` : ''}
            </Alert>
          )}

          {editable && (
            <>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25} sx={{ mb: 1.5 }} useFlexGap flexWrap="wrap">
                <TextField size="small" label="Etkinlik adı *" value={name} onChange={(e) => setName(e.target.value)} sx={{ minWidth: 260, flex: 1 }} />
                <TextField
                  size="small" type="datetime-local" label="Tarih ve saat *" value={when}
                  onChange={(e) => setWhen(e.target.value)} InputLabelProps={{ shrink: true }}
                  sx={{ minWidth: 230 }}
                  helperText={c.timeFound === false ? 'Gönderide saat yok — elle gir' : undefined}
                  error={c.timeFound === false && !when}
                />
              </Stack>

              <Box sx={{ mb: 1.5, maxWidth: 560 }}>
                <GooglePlacesInput
                  value={addr}
                  onChange={setAddr}
                  label="Konum *"
                  placeholder="Mekan adı veya adres yaz (yurt dışı dahil)"
                  showDetails
                  helperText={
                    addr
                      ? undefined
                      : c.placeName || c.city
                        ? `Önerilen yer bulunamadı ya da eksik (${c.placeName ?? c.city}) — haritadan seç`
                        : 'Etkinliğin yerini ara ve seç — yurt dışı dahil'
                  }
                />
              </Box>

              <Stack direction="row" spacing={1} alignItems="center">
                <Button variant="contained" size="small" disabled={busy || missing.length > 0} onClick={() => void publish()}>
                  Yayınla
                </Button>
                <Button size="small" color="inherit" disabled={busy} onClick={() => void reject()}>Reddet</Button>
                {missing.length > 0 && (
                  <Typography variant="caption" color="text.secondary">
                    Yayınlamak için {missing.join(', ')} gerekli.
                  </Typography>
                )}
              </Stack>
            </>
          )}
        </Grid>
      </Grid>
    </Paper>
  );
}

const SOURCE_STATUS: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'default' }> = {
  ok: { label: 'Taranabiliyor', color: 'success' },
  not_professional: { label: 'İşletme/Üretici hesabı değil, incelenemiyor', color: 'warning' },
  error: { label: 'Hata', color: 'error' },
  unknown: { label: 'Henüz taranmadı', color: 'default' },
};

function SourcesDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { enqueueSnackbar } = useSnackbar();
  const [rows, setRows] = useState<InstagramSource[] | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setRows(await instagramCandidateService.sources()); }
    catch (e) { enqueueSnackbar(candidateError(e), { variant: 'error' }); setRows([]); }
  }, [enqueueSnackbar]);

  useEffect(() => { if (open) void load(); }, [open, load]);

  const toggle = async (s: InstagramSource) => {
    setBusy(true);
    try { await instagramCandidateService.saveSource({ ...s, enabled: !s.enabled }); await load(); }
    catch (e) { enqueueSnackbar(candidateError(e), { variant: 'error' }); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Kaynak hesaplar</DialogTitle>
      <DialogContent>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Taranan dernek hesapları. Kapatılan hesap taramaya girmez. Instagram yalnız
          işletme/üretici hesaplarının gönderilerini okumaya izin verir; diğerleri incelenemez.
        </Typography>
        {!rows ? <CircularProgress size={24} /> : rows.length === 0 ? (
          <Typography color="text.secondary">Tanımlı kaynak hesap yok.</Typography>
        ) : (
          <Stack divider={<Divider />}>
            {rows.map((s) => {
              const st = SOURCE_STATUS[s.status ?? 'unknown'] ?? SOURCE_STATUS.unknown;
              return (
                <Stack key={s.username} direction="row" spacing={1.5} alignItems="center" sx={{ py: 1.25, flexWrap: 'wrap' }} useFlexGap>
                  <Box sx={{ minWidth: 200, flex: 1 }}>
                    <Typography variant="body2" fontWeight={700}>@{s.username}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {[s.displayName, s.defaultCity].filter(Boolean).join(' · ') || 'ad girilmemiş'}
                      {s.organizerName ? ` · düzenleyen: ${s.organizerName}` : ' · NartGo adına'}
                    </Typography>
                    {(s.placeName || s.formattedAddress) && (
                      <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>
                        Bulunan yer: {s.placeName ?? s.formattedAddress}
                      </Typography>
                    )}
                  </Box>
                  <Chip size="small" color={st.color} variant={st.color === 'default' ? 'outlined' : 'filled'} label={st.label} />
                  {!!s.pending && <Chip size="small" variant="outlined" label={`${s.pending} bekleyen`} />}
                  <Typography variant="caption" color="text.disabled" sx={{ minWidth: 120 }}>
                    {s.lastCheckedAt ? fmt(s.lastCheckedAt) : 'hiç taranmadı'}
                  </Typography>
                  <FormControlLabel
                    control={<Switch size="small" checked={s.enabled} disabled={busy} onChange={() => void toggle(s)} />}
                    label={<Typography variant="caption">{s.enabled ? 'Açık' : 'Kapalı'}</Typography>}
                  />
                  {s.lastError && (
                    <Typography variant="caption" color="error" sx={{ flexBasis: '100%' }}>{s.lastError}</Typography>
                  )}
                </Stack>
              );
            })}
          </Stack>
        )}
        <Divider sx={{ my: 2 }} />
        <SourceForm onSaved={() => void load()} />
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Kapat</Button></DialogActions>
    </Dialog>
  );
}

/**
 * Yeni kaynak hesap ekle.
 *
 * Düzenleyen seçilmezse etkinlik NartGo adına açılır — bu bilinçli bir
 * seçenek, zorunlu alan değil. Kullanıcı adı "@hesap" ya da profil
 * bağlantısı olarak yapıştırılabilir; sunucu temizliyor.
 */
function SourceForm({ onSaved }: { onSaved: () => void }) {
  const { enqueueSnackbar } = useSnackbar();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [defaultCity, setDefaultCity] = useState('');
  const [organizer, setOrganizer] = useState<UserDTO | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!username.trim()) return;
    setBusy(true);
    try {
      await instagramCandidateService.saveSource({
        username: username.trim(),
        displayName: displayName.trim() || undefined,
        defaultCity: defaultCity.trim() || undefined,
        // Boş bırakılırsa etkinlik NartGo adına açılır.
        organizerUserId: organizer?.id,
        organizerName: organizer ? `${organizer.firstName} ${organizer.lastName}`.trim() : undefined,
        organizerEmail: organizer?.email,
        enabled: true,
      });
      enqueueSnackbar(`@${username.trim().replace(/^@/, '')} eklendi.`, { variant: 'success' });
      setUsername(''); setDisplayName(''); setDefaultCity(''); setOrganizer(null);
      onSaved();
    } catch (e) { enqueueSnackbar(candidateError(e), { variant: 'error' }); }
    finally { setBusy(false); }
  };

  return (
    <Box>
      <Typography variant="body2" fontWeight={700} sx={{ mb: 1 }}>Hesap ekle</Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25} sx={{ mb: 1 }} useFlexGap flexWrap="wrap">
        <TextField
          size="small" label="Instagram kullanıcı adı *" value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="@kafkasdernegi"
          helperText="Profil bağlantısı da yapıştırılabilir"
          sx={{ minWidth: 240 }}
        />
        <TextField size="small" label="Görünen ad" value={displayName} onChange={(e) => setDisplayName(e.target.value)} sx={{ minWidth: 200 }} />
        <TextField size="small" label="Varsayılan il" value={defaultCity} onChange={(e) => setDefaultCity(e.target.value)} sx={{ minWidth: 160 }} />
      </Stack>
      <Box sx={{ maxWidth: 480, mb: 1 }}>
        <UserSearchAutocomplete
          value={organizer}
          onChange={setOrganizer}
          label="Düzenleyen (isteğe bağlı)"
          placeholder="Kuruluşun NartGo hesabını ara"
          helperText="Boş bırakılırsa etkinlikler NartGo adına açılır"
        />
      </Box>
      <Button variant="contained" size="small" startIcon={<AddIcon />} disabled={busy || !username.trim()} onClick={() => void save()}>
        Ekle
      </Button>
    </Box>
  );
}
