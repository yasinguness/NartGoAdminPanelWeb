import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Alert, Box, Button, Chip, CircularProgress, Divider, IconButton, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow,
  TextField, Typography,
} from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useSnackbar } from 'notistack';
import { errorText } from '../../services/heritageReviewService';
import { heritageVillageService, type GeoCandidate, type VillageRow } from '../../services/heritageVillageService';
import {
  heritageMigrationService, type MigrationEditorView, type MigrationQueueRow, type MigrationStop,
} from '../../services/heritageMigrationService';

/**
 * Göç yolu (yönetici ve Köy Editörü). Solda köyler, sağda seçilen köyün durakları. Üyelerin yazdığı tarihçe ve
 * ses kayıtları ipucu olarak görünür; durak yalnız kaynağıyla kaydedilir. Bkz. docs/plan/nartgo-goc-yolu.md
 */
const EMPTY: MigrationStop = { place: '', year: null, yearText: null, note: null, source: '', latitude: null, longitude: null };
const STATUS_LABEL = { draft: 'Taslak', published: 'Yayında' } as const;
const num = (v: string) => (v.trim() === '' || Number.isNaN(Number(v.replace(',', '.'))) ? null : Number(v.replace(',', '.')));

export default function HeritageMigration() {
  const { enqueueSnackbar } = useSnackbar();
  const [queue, setQueue] = useState<{ items: MigrationQueueRow[]; waiting: number; drafts: number } | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [found, setFound] = useState<VillageRow[]>([]);
  const [view, setView] = useState<MigrationEditorView | null>(null);
  const [stops, setStops] = useState<MigrationStop[]>([]);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [geo, setGeo] = useState<{ index: number; candidates: GeoCandidate[] } | null>(null);

  const loadQueue = useCallback(async () => {
    try { setQueue(await heritageMigrationService.queue()); setError(''); } catch (e) { setError(errorText(e)); }
  }, []);
  useEffect(() => { void loadQueue(); }, [loadQueue]);
  // Köy Masası'ndan gelen bağlantı köyü doğrudan açar.
  const [params] = useSearchParams();
  const preset = params.get('koy');
  useEffect(() => {
    if (!preset) return;
    heritageMigrationService.view(preset).then((v) => { setView(v); setStops(v.stops); setDirty(false); }).catch(() => undefined);
  }, [preset]);

  const open = async (villageId: string) => {
    if (dirty && !window.confirm('Kaydedilmemiş değişiklikler var. Başka köye geçilsin mi?')) return;
    try {
      const v = await heritageMigrationService.view(villageId);
      setView(v); setStops(v.stops); setDirty(false); setGeo(null);
    } catch (e) { enqueueSnackbar(errorText(e), { variant: 'error' }); }
  };

  const findVillage = async () => {
    if (search.trim().length < 2) return;
    try { setFound((await heritageVillageService.list({ q: search.trim(), size: 10 })).items); }
    catch (e) { enqueueSnackbar(errorText(e), { variant: 'error' }); }
  };

  const edit = (i: number, patch: Partial<MigrationStop>) => {
    setStops((s) => s.map((x, k) => (k === i ? { ...x, ...patch } : x)));
    setDirty(true);
  };
  const move = (i: number, by: number) => {
    setStops((s) => {
      const next = [...s];
      const j = i + by;
      if (j < 0 || j >= next.length) return s;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    setDirty(true);
  };

  const locate = async (i: number) => {
    const place = stops[i].place.trim();
    if (place.length < 2) { enqueueSnackbar('Önce yer adını yazın.', { variant: 'warning' }); return; }
    try {
      const r = await heritageVillageService.geocode(place);
      if (r.candidates.length === 0) enqueueSnackbar('Konum bulunamadı. Enlem ve boylamı elle girin.', { variant: 'info' });
      setGeo({ index: i, candidates: r.candidates });
    } catch (e) { enqueueSnackbar(errorText(e), { variant: 'error' }); }
  };

  const save = async (publish: boolean) => {
    if (!view) return;
    if (!publish && view.status === 'published'
      && !window.confirm('Bu yol yayında. Taslak olarak kaydederseniz üyeler görmez. Devam edilsin mi?')) return;
    setBusy(true);
    try {
      await heritageMigrationService.save(view.village.id, stops, publish);
      enqueueSnackbar(publish ? 'Göç yolu yayınlandı.' : 'Taslak kaydedildi.', { variant: 'success' });
      const v = await heritageMigrationService.view(view.village.id);
      setView(v); setStops(v.stops); setDirty(false);
      await loadQueue();
    } catch (e) {
      enqueueSnackbar(errorText(e), { variant: 'error' });
    } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!view || !window.confirm(`${view.village.name} köyünün göç yolu tümüyle silinecek. Devam edilsin mi?`)) return;
    setBusy(true);
    try {
      await heritageMigrationService.remove(view.village.id);
      enqueueSnackbar('Göç yolu silindi.', { variant: 'success' });
      setView(null); setStops([]); setDirty(false);
      await loadQueue();
    } catch (e) { enqueueSnackbar(errorText(e), { variant: 'error' }); } finally { setBusy(false); }
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700}>Göç Yolu</Typography>
      <Typography color="text.secondary" sx={{ mb: 2, maxWidth: 860 }}>
        Köyün Kafkasya'daki kökeninden bugünkü yerine uzanan durakları girin. İlk durak köken yeridir; son durak köyün
        kendisidir ve otomatik eklenir. Her durakta kaynak zorunludur. Emin olmadığınız durağı yazmayın: yanlış yol,
        eksik yoldan daha çok zarar verir. Yol siz yayınlayana kadar üyelere görünmez.
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems="flex-start">
        <Paper variant="outlined" sx={{ borderRadius: 2, p: 2, width: { xs: '100%', lg: 380 }, flexShrink: 0 }}>
          <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
            <TextField size="small" fullWidth placeholder="Köy ara" value={search}
              onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void findVillage(); }} />
            <Button variant="outlined" onClick={() => void findVillage()}>Ara</Button>
          </Stack>
          {found.map((v) => (
            <Button key={v.id} fullWidth sx={{ justifyContent: 'flex-start', textTransform: 'none' }} onClick={() => void open(v.id)}>
              {v.official_name} · {v.district}, {v.province}
            </Button>
          ))}
          <Divider sx={{ my: 1.5 }} />
          {!queue && !error && <CircularProgress size={22} />}
          {queue && (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Yol bekleyen {queue.waiting} köy · {queue.drafts} taslak
              </Typography>
              {queue.items.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  Henüz tarihçesi ya da ses kaydı olan köy yok. Yukarıdan köy arayarak başlayabilirsiniz.
                </Typography>
              )}
              {queue.items.map((q) => (
                <Box key={q.id} onClick={() => void open(q.id)}
                  sx={{ py: 1, px: 1, borderRadius: 1, cursor: 'pointer', bgcolor: view?.village.id === q.id ? 'action.selected' : undefined, '&:hover': { bgcolor: 'action.hover' } }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography fontWeight={700} sx={{ flex: 1 }}>{q.villageName}</Typography>
                    {q.status
                      ? <Chip size="small" color={q.status === 'published' ? 'success' : 'default'} label={STATUS_LABEL[q.status]} />
                      : <Chip size="small" color="warning" label="Yol Yok" />}
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {q.province} · {q.stops} durak · {q.histories} tarihçe · {q.voices} ses kaydı
                  </Typography>
                </Box>
              ))}
            </>
          )}
        </Paper>

        <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
          {!view && <Typography color="text.secondary">Soldan bir köy seçin.</Typography>}
          {view && (
            <Stack spacing={2}>
              <Paper variant="outlined" sx={{ borderRadius: 2, p: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="h6" fontWeight={700} sx={{ flex: 1 }}>
                    {view.village.name} · {view.village.district}, {view.village.province}
                  </Typography>
                  {view.status && <Chip size="small" color={view.status === 'published' ? 'success' : 'default'} label={STATUS_LABEL[view.status]} />}
                </Stack>
                {stops.length === 0 && (
                  <Typography color="text.secondary" sx={{ mb: 1 }}>Durak yok. İlk durak olarak köken yerini ekleyin.</Typography>
                )}
                {stops.length > 0 && (
                  <Box sx={{ overflowX: 'auto' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>#</TableCell>
                          <TableCell>Yer</TableCell>
                          <TableCell>Yıl</TableCell>
                          <TableCell>Kaynak (zorunlu)</TableCell>
                          <TableCell>Konum</TableCell>
                          <TableCell />
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {stops.map((s, i) => (
                          <TableRow key={i} sx={{ verticalAlign: 'top' }}>
                            <TableCell>{i + 1}</TableCell>
                            <TableCell sx={{ minWidth: 220 }}>
                              <TextField size="small" fullWidth placeholder={i === 0 ? 'Köken yeri (örnek: Kuban)' : 'Durak (örnek: Samsun limanı)'}
                                value={s.place} onChange={(e) => edit(i, { place: e.target.value })} sx={{ mb: 1 }} />
                              <TextField size="small" fullWidth multiline minRows={2} placeholder="Bir cümlelik bilgi (isteğe bağlı)"
                                value={s.note ?? ''} onChange={(e) => edit(i, { note: e.target.value || null })} />
                            </TableCell>
                            <TableCell sx={{ minWidth: 150 }}>
                              <TextField size="small" fullWidth placeholder="1864" value={s.year ?? ''}
                                onChange={(e) => edit(i, { year: num(e.target.value) })} sx={{ mb: 1 }} />
                              <TextField size="small" fullWidth placeholder="Yazılışı: 1864 ile 1867 arası"
                                value={s.yearText ?? ''} onChange={(e) => edit(i, { yearText: e.target.value || null })} />
                            </TableCell>
                            <TableCell sx={{ minWidth: 220 }}>
                              <TextField size="small" fullWidth multiline minRows={3} placeholder="Köyün büyükleri, kitap adı ve sayfa, arşiv belgesi"
                                value={s.source} error={s.source.trim().length < 3} onChange={(e) => edit(i, { source: e.target.value })} />
                            </TableCell>
                            <TableCell sx={{ minWidth: 190 }}>
                              <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                                <TextField size="small" placeholder="Enlem" value={s.latitude ?? ''} onChange={(e) => edit(i, { latitude: num(e.target.value) })} />
                                <TextField size="small" placeholder="Boylam" value={s.longitude ?? ''} onChange={(e) => edit(i, { longitude: num(e.target.value) })} />
                              </Stack>
                              <Button size="small" onClick={() => void locate(i)}>Yer adından konum bul</Button>
                              {geo?.index === i && geo.candidates.map((c, k) => (
                                <Button key={k} size="small" fullWidth sx={{ justifyContent: 'flex-start', textTransform: 'none', textAlign: 'left' }}
                                  onClick={() => { edit(i, { latitude: c.latitude, longitude: c.longitude }); setGeo(null); }}>
                                  {c.name} · {c.address || c.country} ({c.sourceLabel})
                                </Button>
                              ))}
                            </TableCell>
                            <TableCell sx={{ whiteSpace: 'nowrap' }}>
                              <IconButton size="small" aria-label="Yukarı taşı" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUpwardIcon fontSize="small" /></IconButton>
                              <IconButton size="small" aria-label="Aşağı taşı" disabled={i === stops.length - 1} onClick={() => move(i, 1)}><ArrowDownwardIcon fontSize="small" /></IconButton>
                              <IconButton size="small" aria-label="Durağı sil" onClick={() => { setStops((x) => x.filter((_, k) => k !== i)); setDirty(true); }}><DeleteOutlineIcon fontSize="small" /></IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                )}
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Son durak: {view.village.name} ({view.village.latitude.toFixed(3)}, {view.village.longitude.toFixed(3)}). Otomatik eklenir.
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
                  <Button variant="outlined" onClick={() => { setStops((s) => [...s, { ...EMPTY }]); setDirty(true); }}>Durak Ekle</Button>
                  <Box sx={{ flex: 1 }} />
                  {view.status && <Button color="error" disabled={busy} onClick={() => void remove()}>Yolu Sil</Button>}
                  <Button variant="outlined" disabled={busy} onClick={() => void save(false)}>Taslak Olarak Kaydet</Button>
                  <Button variant="contained" disabled={busy} onClick={() => void save(true)}>Yayınla</Button>
                </Stack>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                  Taslak konumsuz kaydedilebilir. Yayınlamak için her durakta konum gerekir: yol haritada çizilir.
                </Typography>
              </Paper>

              <Paper variant="outlined" sx={{ borderRadius: 2, p: 2 }}>
                <Typography fontWeight={700} sx={{ mb: 1 }}>Üyelerden gelen ipuçları</Typography>
                {view.histories.length === 0 && view.voices.length === 0 && (
                  <Typography color="text.secondary">Bu köy için tarihçe ya da ses kaydı yok.</Typography>
                )}
                {view.histories.map((h, i) => (
                  <Box key={i} sx={{ mb: 1.5 }}>
                    <Typography variant="body2" fontWeight={700}>Nereden: {h.origin} · Ne zaman: {h.period}</Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{h.narrative}</Typography>
                    <Typography variant="caption" color="text.secondary">Kaynak: {h.sourceNote}</Typography>
                  </Box>
                ))}
                {view.voices.map((v, i) => (
                  <Box key={i} sx={{ mb: 1.5 }}>
                    <Typography variant="body2" fontWeight={700}>
                      {v.title ?? (v.prompt === 'migration' ? 'Aile köye nereden gelmiş?' : 'Köy nasıl kuruldu?')} · Anlatan: {v.narratorName}
                    </Typography>
                    <audio controls preload="none" src={v.audioUrl} style={{ width: '100%', maxWidth: 420 }} />
                  </Box>
                ))}
              </Paper>
            </Stack>
          )}
        </Box>
      </Stack>
    </Box>
  );
}
