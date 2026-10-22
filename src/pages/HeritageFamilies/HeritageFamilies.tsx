import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Autocomplete, Box, Button, Chip, CircularProgress, Divider, Link, List, ListItemButton,
  MenuItem, Paper, Stack, Tab, Tabs, TextField, Typography,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { errorText } from '../../services/heritageReviewService';
import {
  familyAtlasService, parseCommentFile,
  type CleanupReport, type IgComment, type NameSuggestion, type TrustItem, type ImportReport, type FamilyDetail, type FamilyListItem, type VillageDetail, type MergeItem, type MergeSide, type MemberLinksReport, type ProfileCleanupReport, type VillageHit,
} from '../../services/familyAtlasService';

/**
 * Sülale atlası yönetimi. Kaynak listesi içe aktarma (önce kuru çalıştırma), birleştirme masası
 * (aynı / farklı, geri alınabilir, kabile görünür) ve Instagram yorumları. Bkz. docs/plan/nartgo-sulale-atlasi.md.
 */

const SITE = 'https://nartgo.net/harita/sulale/';
const RACES = [['adige', 'Çerkes (Adige)'], ['abhaz', 'Abhaz / Abaza'], ['cecen', 'Çeçen'], ['oset', 'Oset'], ['dagistan', 'Dağıstan'], ['karacay', 'Karaçay']];

export default function HeritageFamilies() {
  const [tab, setTab] = useState(0);
  return (
    <Box>
      <Typography variant="h5" fontWeight={700}>Sülale atlası</Typography>
      <Typography color="text.secondary" sx={{ mb: 2, maxWidth: 820 }}>
        Her sülalenin tek bir ana kaydı var; yazım çeşitleri ona bağlanır. Eşleştirme anahtarı yalnız aday önerir, birleştirme kararı burada verilir ve geri alınabilir.
        Açık sayfada kişi bilgisi ve Türkçe soyadı görünmez.
      </Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Sülaleler" />
        <Tab label="Köyler" />
        <Tab label="Kaynak listesi" />
        <Tab label="Birleştirme" />
        <Tab label="Instagram yorumları" />
        <Tab label="Yeni ad önerileri" />
        <Tab label="Tartışmalı kayıtlar" />
      </Tabs>
      {tab === 0 && <FamiliesPanel />}
      {tab === 1 && <VillagesPanel />}
      {tab === 2 && <ImportPanel />}
      {tab === 3 && <MergePanel />}
      {tab === 4 && <InstagramPanel />}
      {tab === 5 && <SuggestionPanel />}
      {tab === 6 && <TrustPanel />}
    </Box>
  );
}

// ── Sülaleler: gözatma ve yönetim ───────────────────────────────────

/**
 * Sülale kataloğu.
 *
 * Panelde bugüne kadar sülaleler yalnız kuyruklar üzerinden görülebiliyordu:
 * birleştirme adayı, ad önerisi, yorum eşleşmesi. "Bu sülale hangi köylerde?"
 * sorusunun karşılığı hiçbir ekranda yoktu. Burası o görünüm — soldan seç,
 * sağda köyleri kabileye göre gruplu gör.
 */
function FamiliesPanel() {
  const { enqueueSnackbar } = useSnackbar();
  const [q, setQ] = useState('');
  const [list, setList] = useState<FamilyListItem[] | null>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const [detail, setDetail] = useState<FamilyDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  /** Arama boşken "en çok köye yayılmış" listesi gösterilir. */
  const [mode, setMode] = useState<'top' | 'search'>('top');

  useEffect(() => {
    const query = q.trim();
    const t = setTimeout(async () => {
      try {
        if (query.length < 2) {
          setMode('top');
          setList(await familyAtlasService.topFamilies(50));
        } else {
          setMode('search');
          const r = await familyAtlasService.searchFamilies(query);
          // Tam eşleşenler önce; yakın yazımlar arkasından.
          setList([...r.exact, ...r.suggestions]);
        }
      } catch (e) { enqueueSnackbar(errorText(e), { variant: 'error' }); }
    }, 300);
    return () => clearTimeout(t);
  }, [q, enqueueSnackbar]);

  useEffect(() => {
    if (!slug) { setDetail(null); return; }
    let alive = true;
    setLoadingDetail(true);
    familyAtlasService.familyDetail(slug)
      .then((d) => { if (alive) setDetail(d); })
      .catch((e) => enqueueSnackbar(errorText(e), { variant: 'error' }))
      .finally(() => { if (alive) setLoadingDetail(false); });
    return () => { alive = false; };
  }, [slug, enqueueSnackbar]);

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-start">
      {/* Sol: arama + liste */}
      <Paper variant="outlined" sx={{ width: { xs: '100%', md: 340 }, flexShrink: 0, maxHeight: '75vh', overflow: 'auto' }}>
        <Box sx={{ p: 1.5, position: 'sticky', top: 0, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider', zIndex: 1 }}>
          <TextField
            size="small" fullWidth value={q} onChange={(e) => setQ(e.target.value)}
            label="Sülale ara" placeholder="Ad ya da yazım çeşidi"
            helperText={mode === 'top' ? 'En çok köye yayılmış sülaleler' : 'Arama sonuçları'}
          />
        </Box>
        {!list ? <Box sx={{ p: 3, textAlign: 'center' }}><CircularProgress size={22} /></Box> : list.length === 0 ? (
          <Typography color="text.secondary" sx={{ p: 2 }}>Eşleşen sülale yok.</Typography>
        ) : (
          <List disablePadding>
            {list.map((f) => (
              <ListItemButton key={f.slug} selected={f.slug === slug} onClick={() => setSlug(f.slug)} sx={{ display: 'block', py: 1.25 }}>
                <Typography variant="body2" fontWeight={600}>{f.name}</Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 0.25 }}>
                  {f.race && <Typography variant="caption" color="text.secondary">{raceLabel(f.race)}</Typography>}
                  <Typography variant="caption" color="text.secondary">
                    {f.villages} köy{f.provinces != null ? ` · ${f.provinces} il` : ''}
                  </Typography>
                </Stack>
              </ListItemButton>
            ))}
          </List>
        )}
      </Paper>

      {/* Sağ: detay */}
      <Paper variant="outlined" sx={{ flex: 1, p: 2.5, minHeight: 320, width: '100%' }}>
        {!slug ? (
          <Typography color="text.secondary">Soldan bir sülale seç.</Typography>
        ) : loadingDetail && !detail ? <CircularProgress size={24} /> : !detail ? (
          <Typography color="text.secondary">Sülale bulunamadı.</Typography>
        ) : (
          <FamilyDetailView d={detail} onChanged={() => setSlug((x) => x)} />
        )}
      </Paper>
    </Stack>
  );
}

/** Halk kodunu okunur ada çevir (adige → Çerkes (Adige)). */
function raceLabel(race?: string): string {
  if (!race) return '';
  return RACES.find(([v]) => v === race.toLowerCase())?.[1] ?? race;
}

function FamilyDetailView({ d, onChanged }: { d: FamilyDetail; onChanged: () => void }) {
  const { enqueueSnackbar } = useSnackbar();
  const [cyr, setCyr] = useState(d.cyrillic ?? '');
  const [saving, setSaving] = useState(false);
  useEffect(() => { setCyr(d.cyrillic ?? ''); }, [d.slug, d.cyrillic]);

  // Kiril yazım, panelden düzenlenebilen tek sülale alanı; ad değişikliği
  // birleştirme kuyruğundan geçer, buradan serbest yeniden adlandırma yok.
  const saveCyrillic = async () => {
    if (!d.id) {
      enqueueSnackbar('Sunucu bu sülalenin kimliğini döndürmüyor (eski sürüm); Kiril yazım kaydedilemiyor.', { variant: 'warning' });
      return;
    }
    setSaving(true);
    try {
      await familyAtlasService.setCyrillic(d.id, cyr.trim());
      enqueueSnackbar('Kiril yazım kaydedildi.', { variant: 'success' });
      onChanged();
    } catch (e) { enqueueSnackbar(errorText(e), { variant: 'error' }); } finally { setSaving(false); }
  };

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h6" fontWeight={700}>{d.name}</Typography>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
          {d.race && <Chip size="small" label={raceLabel(d.race)} />}
          <Link href={`${SITE}${d.slug}`} target="_blank" rel="noreferrer" variant="body2">
            Açık sayfayı gör
          </Link>
        </Stack>
      </Box>

      <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
        <Stat n={d.villageCount} t="köy" />
        <Stat n={d.provinceCount} t="il" />
        <Stat n={d.mappedCount} t="haritada konumlu" />
        <Stat n={d.spellings?.length ?? 0} t="yazım çeşidi" />
      </Stack>

      {!!d.spellings?.length && (
        <Box>
          <Typography variant="body2" fontWeight={700} sx={{ mb: 0.75 }}>Yazım çeşitleri</Typography>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            {d.spellings.map((sp) => <Chip key={sp} size="small" variant="outlined" label={sp} />)}
          </Stack>
        </Box>
      )}

      <Box>
        <Typography variant="body2" fontWeight={700} sx={{ mb: 0.75 }}>Kiril yazım</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            size="small" value={cyr} onChange={(e) => setCyr(e.target.value)}
            placeholder="Örn. Къэнэкъо" sx={{ minWidth: 220 }} disabled={!d.id}
            helperText={d.id ? undefined : 'Sunucu eski sürüm — düzenleme kapalı'}
          />
          <Button size="small" variant="outlined" disabled={!d.id || saving || cyr.trim() === (d.cyrillic ?? '')} onClick={() => void saveCyrillic()}>
            Kaydet
          </Button>
        </Stack>
      </Box>

      <Divider />

      <Box>
        <Typography variant="body2" fontWeight={700} sx={{ mb: 1 }}>
          Köyler {d.villageCount > 0 && `· ${d.villageCount}`}
        </Typography>
        {!d.groups?.length ? (
          <Typography color="text.secondary" variant="body2">Bu sülale henüz hiçbir köye bağlanmamış.</Typography>
        ) : d.groups.map((g) => (
          <Box key={g.tribe || 'kabilesiz'} sx={{ mb: 1.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.4 }}>
              {(g.tribe || 'KABİLE BELİRTİLMEMİŞ').toLocaleUpperCase('tr')} · {g.villages.length}
            </Typography>
            <Stack spacing={0.5} sx={{ mt: 0.5 }}>
              {g.villages.map((v) => (
                <Stack key={v.id} direction="row" spacing={1} alignItems="baseline" sx={{ flexWrap: 'wrap' }} useFlexGap>
                  <Typography variant="body2" fontWeight={600}>{v.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {[v.province, v.district].filter(Boolean).join(' / ') || 'il/ilçe yok'}
                  </Typography>
                  {v.latitude == null && <Chip size="small" variant="outlined" label="konumsuz" />}
                  {v.sourceLabel && <Typography variant="caption" color="text.disabled">{v.sourceLabel}</Typography>}
                </Stack>
              ))}
            </Stack>
          </Box>
        ))}
      </Box>

      {!!d.unplaced?.length && (
        <Alert severity="info">
          {d.unplaced.length} kayıt bu sülalenin adını taşıyor ama henüz bir köye oturmamış.
          Instagram yorumları ve ad önerileri sekmelerinden köye bağlanabilirler.
        </Alert>
      )}
    </Stack>
  );
}

// ── Köyler: bilgi ve köydeki sülaleler ──────────────────────────────

/**
 * Köy kataloğu.
 *
 * "Köy Konumları" sayfası konum teyit kuyruğudur; tek tek köye bakıp
 * "burada hangi sülaleler var, adları teyitli mi" sorusunu soracak bir yer
 * yoktu. Burası o görünüm, ve köye sülale bağlamanın tek paneldeki yolu.
 */
function VillagesPanel() {
  const { enqueueSnackbar } = useSnackbar();
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<VillageHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<VillageHit | null>(null);
  const [detail, setDetail] = useState<VillageDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) { setHits([]); setSearching(false); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      try { setHits(await familyAtlasService.searchVillages(query)); }
      catch { setHits([]); } finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (!picked) { setDetail(null); return; }
    let alive = true;
    setLoading(true);
    familyAtlasService.villageDetail(picked.id)
      .then((d) => { if (alive) setDetail(d); })
      .catch((e) => enqueueSnackbar(errorText(e), { variant: 'error' }))
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [picked, reloadKey, enqueueSnackbar]);

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-start">
      <Paper variant="outlined" sx={{ width: { xs: '100%', md: 340 }, flexShrink: 0, maxHeight: '75vh', overflow: 'auto' }}>
        <Box sx={{ p: 1.5, position: 'sticky', top: 0, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider', zIndex: 1 }}>
          <TextField
            size="small" fullWidth value={q} onChange={(e) => setQ(e.target.value)}
            label="Köy ara" placeholder="Köy adı ya da eski adı"
            helperText={q.trim().length < 2 ? 'Aramak için en az 2 harf yaz' : searching ? 'Aranıyor…' : `${hits.length} sonuç`}
          />
        </Box>
        <List disablePadding>
          {hits.map((v) => (
            <ListItemButton key={v.id} selected={picked?.id === v.id} onClick={() => setPicked(v)} sx={{ display: 'block', py: 1.25 }}>
              <Typography variant="body2" fontWeight={600}>{v.name}</Typography>
              <Typography variant="caption" color="text.secondary">
                {[v.province, v.district].filter(Boolean).join(' / ') || 'il/ilçe yok'}
                {v.altName ? ` · ${v.altName}` : ''}
              </Typography>
            </ListItemButton>
          ))}
        </List>
      </Paper>

      <Paper variant="outlined" sx={{ flex: 1, p: 2.5, minHeight: 320, width: '100%' }}>
        {!picked ? (
          <Typography color="text.secondary">Köy ara ve soldan seç.</Typography>
        ) : loading && !detail ? <CircularProgress size={24} /> : !detail ? (
          <Typography color="text.secondary">Köy bulunamadı.</Typography>
        ) : (
          <VillageDetailView d={detail} onLinked={() => setReloadKey((k) => k + 1)} />
        )}
      </Paper>
    </Stack>
  );
}

function VillageDetailView({ d, onLinked }: { d: VillageDetail; onLinked: () => void }) {
  const { enqueueSnackbar } = useSnackbar();
  const [fq, setFq] = useState('');
  const [fOpts, setFOpts] = useState<FamilyListItem[]>([]);
  const [fPick, setFPick] = useState<FamilyListItem | null>(null);
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    const query = fq.trim();
    if (query.length < 2) { setFOpts([]); return; }
    const t = setTimeout(async () => {
      try { const r = await familyAtlasService.searchFamilies(query); setFOpts([...r.exact, ...r.suggestions]); }
      catch { setFOpts([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [fq]);

  const already = new Set((d.families ?? []).map((f) => f.familyId));

  const link = async () => {
    if (!fPick?.id) { enqueueSnackbar('Bu sülalenin kimliği arama sonucunda yok.', { variant: 'warning' }); return; }
    setLinking(true);
    try {
      await familyAtlasService.addVillageFamily(d.id, fPick.id);
      // Bu uç topluluk ucu: admin eklese de bağ "köylü teyidi bekliyor"
      // olarak giriyor ve onaylanana kadar aşağıdaki listede görünmüyor.
      // "Bağlandı" demek, olmamış bir şeyi olmuş gibi göstermek olurdu.
      enqueueSnackbar(
        `${fPick.name} önerildi — köylü teyidi bekliyor, onaylanınca listede görünecek.`,
        { variant: 'success' },
      );
      setFPick(null); setFq(''); onLinked();
    } catch (e) { enqueueSnackbar(errorText(e), { variant: 'error' }); } finally { setLinking(false); }
  };

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h6" fontWeight={700}>{d.name}</Typography>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5, flexWrap: 'wrap' }} useFlexGap>
          <Typography variant="body2" color="text.secondary">
            {[d.province, d.district].filter(Boolean).join(' / ') || 'il/ilçe yok'}
          </Typography>
          {d.confidenceLabel && (
            <Chip size="small" variant={d.verified ? 'filled' : 'outlined'}
              color={d.verified ? 'success' : 'default'} label={d.confidenceLabel} />
          )}
          {d.lat == null && <Chip size="small" variant="outlined" label="haritada gösterilmiyor" />}
        </Stack>
      </Box>

      <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
        <Stat n={d.families?.length ?? 0} t="kayıtlı sülale" />
        <Stat n={d.names?.length ?? 0} t="Çerkesçe / eski ad" />
        <Stat n={d.tribes?.length ?? 0} t="kabile" />
        {typeof d.memberCount === 'number' && <Stat n={d.memberCount} t="bu köyden üye" />}
      </Stack>

      {!!d.names?.length && (
        <Box>
          <Typography variant="body2" fontWeight={700} sx={{ mb: 0.75 }}>Çerkesçe / eski adlar</Typography>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            {d.names.map((n) => (
              <Chip
                key={n.id} size="small"
                variant={n.trust === 'verified' ? 'filled' : 'outlined'}
                color={n.trust === 'verified' ? 'success' : n.trust === 'disputed' ? 'warning' : 'default'}
                label={`${n.name}${n.trust === 'verified' ? '' : ` · ${n.confirms}/${d.trustNeeded ?? '?'} teyit`}`}
              />
            ))}
          </Stack>
        </Box>
      )}

      {!!d.tribes?.length && (
        <Box>
          <Typography variant="body2" fontWeight={700} sx={{ mb: 0.75 }}>Kabileler</Typography>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            {d.tribes.map((t) => <Chip key={t} size="small" variant="outlined" label={t} />)}
          </Stack>
        </Box>
      )}

      <Divider />

      <Box>
        <Typography variant="body2" fontWeight={700} sx={{ mb: 0.75 }}>
          Köydeki sülaleler {d.families?.length ? `· ${d.families.length}` : ''}
        </Typography>
        {!d.families?.length ? (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Bu köye henüz sülale bağlanmamış.
          </Typography>
        ) : (
          <Stack spacing={0.5} sx={{ mb: 1 }}>
            {d.families.map((f) => (
              <Stack key={f.familyId} direction="row" spacing={1} alignItems="baseline">
                <Typography variant="body2" fontWeight={600}>{f.name}</Typography>
                {typeof f.villages === 'number' && (
                  <Typography variant="caption" color="text.secondary">
                    toplam {f.villages} köyde
                  </Typography>
                )}
                {f.slug && (
                  <Link href={`${SITE}${f.slug}`} target="_blank" rel="noreferrer" variant="caption">
                    sülale sayfası
                  </Link>
                )}
              </Stack>
            ))}
          </Stack>
        )}
        {d.familySource && (
          <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 1 }}>
            Bağların kaynağı: {d.familySource}
          </Typography>
        )}

        {/* Yazma: köye sülale önerisi. Katalogda olmayan bir ad buradan
            yaratılmaz — yeni ad önerisi kendi kuyruğundan geçer. */}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
          Buradan eklenen bağ, admin eklese de <b>köylü teyidi bekleyen</b> olarak girer ve
          onaylanana kadar yukarıdaki listede görünmez. Teyit durumu “Tartışmalı kayıtlar”
          sekmesinden izlenir.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
          <Autocomplete
            size="small" sx={{ minWidth: 300 }}
            options={fOpts}
            value={fPick}
            onChange={(_, v) => setFPick(v)}
            inputValue={fq}
            onInputChange={(_, v) => setFq(v)}
            isOptionEqualToValue={(o, v) => o.slug === v.slug}
            getOptionLabel={(o) => `${o.name}${o.race ? ` · ${raceLabel(o.race)}` : ''}`}
            getOptionDisabled={(o) => !!o.id && already.has(o.id)}
            noOptionsText={fq.trim().length < 2 ? 'Aramak için en az 2 harf yaz' : 'Eşleşen sülale yok'}
            renderInput={(params) => <TextField {...params} label="Köye sülale öner" placeholder="Sülale adı" />}
          />
          <Button variant="contained" size="small" disabled={!fPick || linking} onClick={() => void link()}>
            Öner
          </Button>
        </Stack>
      </Box>

      {d.source && (
        <Typography variant="caption" color="text.secondary">Kaynak: {d.source}</Typography>
      )}
    </Stack>
  );
}

// ── Kaynak listesi ──────────────────────────────────────────────────

function ImportPanel() {
  const { enqueueSnackbar } = useSnackbar();
  const [report, setReport] = useState<ImportReport | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try { setReport(await familyAtlasService.dryRun()); } catch (e) { enqueueSnackbar(errorText(e), { variant: 'error' }); } finally { setBusy(false); }
  };
  const apply = async () => {
    if (!window.confirm(`${report?.links ?? 0} köy-sülale bağı "Kaynak listesinden" etiketiyle yayına girecek ve ${report?.newFamilies ?? 0} yeni sülale kaydı açılacak. Devam edilsin mi?`)) return;
    setBusy(true);
    try {
      const r = await familyAtlasService.apply();
      enqueueSnackbar(`${r.linked} bağ eklendi, ${r.newFamilies} yeni sülale açıldı.`, { variant: 'success' });
      setReport(await familyAtlasService.dryRun());
    } catch (e) { enqueueSnackbar(errorText(e), { variant: 'error' }); } finally { setBusy(false); }
  };
  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <Typography fontWeight={700}>Köy kaynak listesindeki sülaleler</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
          Önce kuru çalıştırma: hiçbir şey yazılmaz, ne olacağı listelenir. Yeniden çalıştırmak çoğaltmaz; köyü sonradan onaylanan kayıtlar bir sonraki çalıştırmada bağlanır.
          Kaynaktan toplu kabulü (Köy Konumları) önce uygulamak daha çok bağı haritaya taşır.
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => void run()} disabled={busy}>Kuru çalıştır</Button>
          <Button variant="contained" onClick={() => void apply()} disabled={busy || !report || report.links === 0}>Uygula</Button>
          {busy && <CircularProgress size={22} />}
        </Stack>
      </Paper>
      {report && (
        <>
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
              <Stat n={report.total} t="kaynaktaki kayıt" />
              <Stat n={report.links} t="köy-sülale bağı yayına girecek" />
              <Stat n={report.existingFamilies} t="katalogdaki sülaleye bağlanacak" />
              <Stat n={report.newFamilies} t="yeni sülale kaydı" />
              <Stat n={report.excluded.length} t="sülale değil, ayrıldı" />
              <Stat n={report.noVillage} t="köyü henüz sistemde yok" />
            </Stack>
          </Paper>
          <ListBlock title="Ayrılan kayıtlar (grup adı, parantez içi not)" rows={report.excluded.map((r) => `${r.name} · ${r.village} (${r.province}) · ${r.reason}`)} />
          <ListBlock title="Katalogda birden fazla eşleşme (ilkine bağlanır; birleştirme masasında temizlenir)" rows={report.ambiguous.map((a) => `${a.name} · ${a.village} → ${a.matches.join(', ')}`)} />
          <ListBlock title="Yeni açılacak sülaleler" rows={report.newFamilyList.map((n) => `${n.name} (${n.race})${n.otherRaceMatches.length ? ` · başka halkta aynı yazım: ${n.otherRaceMatches.join(', ')}` : ''}`)} />
          <ListBlock title="Köyü henüz sistemde olmayanlar (örnek)" rows={report.noVillageSample.map((r) => `${r.name} · ${r.village} (${r.province} / ${r.district})`)} />
        </>
      )}
    </Stack>
  );
}

function Stat({ n, t }: { n: number; t: string }) {
  return <Box><Typography variant="h5" fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>{n.toLocaleString('tr-TR')}</Typography><Typography variant="body2" color="text.secondary">{t}</Typography></Box>;
}

function ListBlock({ title, rows }: { title: string; rows: string[] }) {
  const [open, setOpen] = useState(false);
  if (!rows.length) return null;
  const shown = open ? rows : rows.slice(0, 12);
  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Typography fontWeight={700} sx={{ mb: 1 }}>{title} · {rows.length}</Typography>
      <Box component="ul" sx={{ m: 0, pl: 2.5, columns: { md: 2 }, fontSize: 13.5 }}>{shown.map((r, i) => <li key={i}>{r}</li>)}</Box>
      {rows.length > 12 && <Button size="small" sx={{ mt: 1 }} onClick={() => setOpen((v) => !v)}>{open ? 'Daha az göster' : `Tümünü göster (${rows.length})`}</Button>}
    </Paper>
  );
}

// ── Birleştirme masası ──────────────────────────────────────────────

function MergePanel() {
  const { enqueueSnackbar } = useSnackbar();
  const [data, setData] = useState<{ total: number; items: MergeItem[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<{ id: string; summary: string } | null>(null);
  const load = useCallback(async () => {
    try { setData(await familyAtlasService.mergeQueue(100)); } catch (e) { enqueueSnackbar(errorText(e), { variant: 'error' }); }
  }, [enqueueSnackbar]);
  useEffect(() => { void load(); }, [load]);

  const decide = async (it: MergeItem, action: 'merge' | 'distinct', keep?: number) => {
    setBusy(true);
    try {
      const r = await familyAtlasService.decide(it.a.id, it.b.id, action, keep);
      setLast({ id: r.decisionId, summary: r.summary });
      setData((d) => d && { total: d.total - 1, items: d.items.filter((x) => x !== it) });
    } catch (e) { enqueueSnackbar(errorText(e), { variant: 'error' }); } finally { setBusy(false); }
  };
  const undo = async () => {
    if (!last) return;
    setBusy(true);
    try { await familyAtlasService.undo(last.id); setLast(null); enqueueSnackbar('Karar geri alındı', { variant: 'info' }); await load(); }
    catch (e) { enqueueSnackbar(errorText(e), { variant: 'error' }); } finally { setBusy(false); }
  };

  if (!data) return <CircularProgress />;
  return (
    <Stack spacing={2}>
      <CleanupBox onApplied={() => void load()} />
      <Alert severity="info">
        {data.total.toLocaleString('tr-TR')} aday çift. Köyü olan kayıtlar önce gelir. Farklı kabile ya da halktaki benzer adlar önerilmez; yazım anahtarı birebir aynıysa uyarıyla gelir.
        <b> Aynı adı taşımak aynı soydan gelmek demek değildir</b>: emin değilsen “Farklı” de ya da atla.
      </Alert>
      {last && (
        <Alert severity="success" action={<Button color="inherit" size="small" disabled={busy} onClick={() => void undo()}>Geri al</Button>}>{last.summary}</Alert>
      )}
      {data.items.map((it) => (
        <Paper key={`${it.a.id}-${it.b.id}`} variant="outlined" sx={{ p: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
            <Chip size="small" label={it.match} />
            {it.sharedVillages > 0 && <Chip size="small" color="success" variant="outlined" label={`${it.sharedVillages} ortak köy`} />}
            {it.warning && <Chip size="small" color="warning" label={it.warning} />}
          </Stack>
          <Box sx={{ display: 'grid', gridTemplateColumns: { md: '1fr 1fr' }, gap: 2 }}>
            <Side s={it.a} />
            <Side s={it.b} />
          </Box>
          <Divider sx={{ my: 1.5 }} />
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button size="small" variant="contained" disabled={busy} onClick={() => void decide(it, 'merge', it.a.id)}>Aynı sülale · “{it.a.name}” kalsın</Button>
            <Button size="small" variant="outlined" disabled={busy} onClick={() => void decide(it, 'merge', it.b.id)}>Aynı sülale · “{it.b.name}” kalsın</Button>
            <Button size="small" color="inherit" variant="outlined" disabled={busy} onClick={() => void decide(it, 'distinct')}>Farklı sülale</Button>
          </Stack>
        </Paper>
      ))}
      {data.items.length === 0 && <Typography color="text.secondary">Önerilecek çift kalmadı.</Typography>}
    </Stack>
  );
}

/**
 * Profil eşleştirme: üyelerin profiline serbest yazdığı sülale adlarını
 * katalogla eşler.
 *
 * Uç bugüne kadar yalnız API'de vardı; bir sülalenin kataloğa bağlanması için
 * birinin elle istek atması gerekiyordu. Kuru çalıştırma yazma yapmaz, sayıları
 * gösterir; uygula yalnız tek adaya oturanları bağlar, şüpheliler insana kalır.
 */
function ProfileMatchBox({ onApplied }: { onApplied: () => void }) {
  const { enqueueSnackbar } = useSnackbar();
  const [r, setR] = useState<ProfileCleanupReport | null>(null);
  /** Uygulama sonucu — köy bağları özeti burada gösterilir. */
  const [applied, setApplied] = useState<ProfileCleanupReport | null>(null);
  const [busy, setBusy] = useState(false);

  const dry = async () => {
    setBusy(true);
    setApplied(null);
    try { setR(await familyAtlasService.profileCleanupDryRun()); }
    catch (e) { enqueueSnackbar(errorText(e), { variant: 'error' }); } finally { setBusy(false); }
  };
  /**
   * Sunucu sürüm işareti.
   *
   * Canlıdaki eski auth-service bu uçlara CEVAP VERİYOR ama düzeltilmemiş
   * mantıkla: uygulanırsa binlerce profil "pending"e düşer ve bir kısmı
   * kurumsal / halk adlarına yanlış bağlanır. Düzeltilmiş backend
   * `raceResolved` alanını her zaman döndürüyor; alan yoksa yazma engellenir.
   * Kuru çalıştırma zararsız olduğu için açık kalır.
   */
  const serverOutdated = !!r && typeof r.raceResolved !== 'number';

  const apply = async () => {
    if (!r || serverOutdated) return;
    if (!window.confirm(
      `Yalnız ${r.autoLinked} bağ ve ${r.queuedForReview} öneri yazılır; ` +
      `${r.ambiguous} çakışma dokunulmadan kalır.\n\n` +
      'Bu işlem köy bağlarını da yeniden hesaplar (üye bildirimlerinden gelen bağlar açılır, ' +
      'yükselir ya da geri çekilir).\n\n' +
      'Çakışmalar birleştirme kuyruğu çözüldükçe tekrar çalıştırılabilir. Devam edilsin mi?',
    )) return;
    setBusy(true);
    try {
      const x = await familyAtlasService.profileCleanupApply();
      enqueueSnackbar(`${x.autoLinked} profil bağlandı, ${x.queuedForReview} öneri kuyruğa eklendi.`, { variant: 'success' });
      // Bu uygulama köy bağlarını da yazıyor. Sonucu göstermezsek admin
      // aşağıdaki kartta kuru çalıştırıp "0 yeni" görür ve işlemin
      // çalışmadığını sanır.
      setApplied(x); setR(null); onApplied();
    } catch (e) { enqueueSnackbar(errorText(e), { variant: 'error' }); } finally { setBusy(false); }
  };

  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Typography fontWeight={700}>Profil eşleştirme</Typography>
      <Typography color="text.secondary" sx={{ mt: 0.5, mb: 1.5 }}>
        Üyelerin profiline kendi yazdığı sülale adlarını katalogla eşler. Tek bir sülaleye oturan adlar
        doğrudan bağlanır; birden çok adaya uyanlara dokunulmaz, boş ve yer tutucu değerler atlanır.
        Kalanlar “Yeni ad önerileri” sekmesine düşer. Önce kuru çalıştır, sayıları gör, sonra uygula.
      </Typography>
      <Stack direction="row" spacing={1} alignItems="center">
        <Button variant="outlined" disabled={busy} onClick={() => void dry()}>Kuru çalıştır</Button>
        <Button
          variant="contained"
          disabled={busy || !r || serverOutdated || (r.autoLinked + r.queuedForReview === 0)}
          onClick={() => void apply()}
        >
          Uygula
        </Button>
        {busy && <CircularProgress size={22} />}
      </Stack>
      {applied && (
        <Alert severity="success" sx={{ mt: 2 }}>
          {applied.autoLinked} profil bağlandı, {applied.queuedForReview} öneri kuyruğa eklendi.
          {applied.memberLinks
            ? ` Köy bağları da yeniden hesaplandı: ${applied.memberLinks.created} yeni bağ` +
              ` (${applied.memberLinks.createdVerified} teyitli), ${applied.memberLinks.upgraded} yükseldi,` +
              ` ${applied.memberLinks.downgraded} düştü, ${applied.memberLinks.withdrawn} geri çekildi.`
            : ' Köy bağları da yeniden hesaplandı.'}
        </Alert>
      )}
      {serverOutdated && (
        <Alert severity="error" sx={{ mt: 2 }}>
          <b>Sunucu eski sürüm: önce auth-service yayını gerekli.</b> Bu uç canlıda cevap veriyor ama
          düzeltilmemiş mantıkla çalışıyor; uygulanırsa binlerce profil beklemeye düşer ve bir kısmı
          yanlış sülaleye bağlanır. Aşağıdaki sayılar yalnız önizlemedir, yazma yapılmadı.
        </Alert>
      )}
      {r && (
        <Box sx={{ mt: 2 }}>
          <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
            <Stat n={r.scanned} t="taranan profil" />
            <Stat n={r.autoLinked} t="doğrudan bağlanır" />
            <Stat n={r.queuedForReview} t="öneri kuyruğuna" />
            <Stat n={r.ambiguous} t="birden çok aday (dokunulmaz)" />
            {typeof r.skippedPlaceholder === 'number' && typeof r.skippedGroup === 'number' && (
              <Stat n={r.skippedPlaceholder + r.skippedGroup} t="atlanan (yer tutucu / halk adı)" />
            )}
          </Stack>
          {r.autoLinked + r.queuedForReview === 0 && (
            <Alert severity="info" sx={{ mt: 1.5 }}>Eşleşecek profil yok — katalog güncel.</Alert>
          )}
          {/* rows binlerce satır olabiliyor; hepsini basmak okunmaz bir duvar
              olurdu. Karar için gereken şey hangi adların nereye düştüğü,
              kimin yazdığı değil — kullanıcı kimliği bilerek gösterilmiyor. */}
          <ActionBreakdown rows={r.rows} />
        </Box>
      )}
    </Paper>
  );
}

/**
 * Üye bildirimlerinden köy–sülale bağları.
 *
 * Profil eşleştirmesi üyenin yazdığı adı katalogla eşler; bu adım bir sonraki
 * soruyu çözer: o üye hangi köyden? Üyelik + profil sülalesi olan her üye
 * kendi köyü için bir bildirim sayılır. Tek bildirim bağı teyit bekleyen
 * yapar, 7 günden eski iki ayrı üye teyitli yapar.
 *
 * Rapor bilerek yalnız sayı gösterir: kimin bildirdiği panelde de açık
 * sayfalarda da görünmez.
 */
function MemberLinksBox({ onApplied }: { onApplied: () => void }) {
  const { enqueueSnackbar } = useSnackbar();
  const [r, setR] = useState<MemberLinksReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [missing, setMissing] = useState(false);

  const fail = (e: unknown) => {
    // Uç yayınlanmadıysa 404 gelir; bunu ham hata olarak basmak yerine
    // ne yapılması gerektiğini söyle.
    const status = (e as { response?: { status?: number } })?.response?.status;
    if (status === 404) { setMissing(true); return; }
    enqueueSnackbar(errorText(e), { variant: 'error' });
  };

  const dry = async () => {
    setBusy(true); setMissing(false);
    try { setR(await familyAtlasService.memberLinksDryRun()); }
    catch (e) { fail(e); } finally { setBusy(false); }
  };

  const apply = async () => {
    if (!r) return;
    if (!window.confirm(
      `${r.created} yeni bağ açılacak (${r.createdVerified} doğrudan teyitli), ` +
      `${r.upgraded} bağ teyitliye yükselecek.\n\n` +
      `${r.downgraded} bağ teyit bekleyene düşecek, ${r.withdrawn} bağ geri çekilecek. Devam edilsin mi?`,
    )) return;
    setBusy(true);
    try {
      const x = await familyAtlasService.memberLinksApply();
      enqueueSnackbar(`${x.created} bağ açıldı, ${x.upgraded} bağ teyitliye yükseldi.`, { variant: 'success' });
      setR(null); onApplied();
    } catch (e) { fail(e); } finally { setBusy(false); }
  };

  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Typography fontWeight={700}>Üye bildirimlerinden köy bağları</Typography>
      <Typography color="text.secondary" sx={{ mt: 0.5, mb: 1.5 }}>
        Profilinde sülalesi olan her üye, kendi köyü için bir bildirim sayılır. Tek bildirim bağı
        “teyit bekleyen”, 7 günden eski iki ayrı üye “teyitli” yapar. Moderatörün kaldırdığı bağlar
        geri gelmez; kaynak listesinden gelen bağlara dokunulmaz. Profil ya da köy değiştikçe
        ilgili köyler kendiliğinden yeniden hesaplanır — bu düğme toplu bir tazeleme.
      </Typography>

      <Stack direction="row" spacing={1} alignItems="center">
        <Button variant="outlined" disabled={busy} onClick={() => void dry()}>Kuru çalıştır</Button>
        <Button
          variant="contained"
          disabled={busy || !r || (r.created + r.upgraded + r.downgraded + r.withdrawn === 0)}
          onClick={() => void apply()}
        >
          Uygula
        </Button>
        {busy && <CircularProgress size={22} />}
      </Stack>

      {missing && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          Bu uç sunucuda yok — auth-service yayını gerekiyor. Yayın sonrası düğme çalışır.
        </Alert>
      )}

      {r && (
        <Box sx={{ mt: 2 }}>
          <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
            <Stat n={r.pairs} t="değerlendirilen sülale–köy çifti" />
            <Stat n={r.villages} t="etkilenen köy" />
            <Stat n={r.created} t="yeni bağ" />
            <Stat n={r.createdVerified} t="doğrudan teyitli" />
            <Stat n={r.upgraded} t="teyitliye yükselir" />
            <Stat n={r.downgraded} t="teyit bekleyene düşer" />
            <Stat n={r.withdrawn} t="geri çekilir" />
            <Stat n={r.unchanged} t="değişmez" />
          </Stack>
          {r.blockedByModerator > 0 && (
            <Alert severity="info" sx={{ mt: 1.5 }}>
              {r.blockedByModerator} bağ moderatör kararıyla kaldırılmış; üye bildirimi olsa da
              yeniden açılmaz.
            </Alert>
          )}
          {r.created + r.upgraded + r.downgraded + r.withdrawn === 0 && (
            <Alert severity="info" sx={{ mt: 1.5 }}>Değişecek bağ yok — bildirimler güncel.</Alert>
          )}
        </Box>
      )}
    </Paper>
  );
}

/** Sonuçları eyleme göre grupla ve her grupta en sık geçen adları göster. */
function ActionBreakdown({ rows }: { rows: ProfileCleanupReport['rows'] }) {
  const LABEL: Record<string, string> = {
    link: 'Doğrudan bağlanır',
    suggest: 'Öneri kuyruğuna',
    ambiguous: 'Birden çok aday — dokunulmaz',
    skip_placeholder: 'Yer tutucu — atlanır',
    skip_group: 'Halk/kabile adı — atlanır',
    review_length: 'Uzunluk kontrolü — elde',
  };
  const groups = useMemo(() => {
    const by = new Map<string, Map<string, number>>();
    for (const r of rows) {
      const m = by.get(r.action) ?? new Map<string, number>();
      const name = (r.legacy || '—').trim();
      m.set(name, (m.get(name) ?? 0) + 1);
      by.set(r.action, m);
    }
    return [...by.entries()]
      .map(([action, names]) => ({
        action,
        total: [...names.values()].reduce((a, b) => a + b, 0),
        top: [...names.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8),
      }))
      .sort((a, b) => b.total - a.total);
  }, [rows]);

  if (!groups.length) return null;
  return (
    <Box sx={{ mt: 2 }}>
      {groups.map((g) => (
        <Box key={g.action} sx={{ mb: 1.5 }}>
          <Typography variant="body2" fontWeight={700}>
            {LABEL[g.action] ?? g.action} · {g.total.toLocaleString('tr-TR')}
          </Typography>
          <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap' }} useFlexGap>
            {g.top.map(([name, n]) => (
              <Chip key={name} size="small" variant="outlined" label={n > 1 ? `${name} ×${n}` : name} />
            ))}
            {g.total - g.top.reduce((a, [, n]) => a + n, 0) > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
                ve {(g.total - g.top.reduce((a, [, n]) => a + n, 0)).toLocaleString('tr-TR')} kayıt daha
              </Typography>
            )}
          </Stack>
        </Box>
      ))}
    </Box>
  );
}

/** Otomatik temizlik: aynı halkta birebir aynı yazım birleşir, parantezler düzelir, iki halklı adlar listelenir. */
function CleanupBox({ onApplied }: { onApplied: () => void }) {
  const { enqueueSnackbar } = useSnackbar();
  const [r, setR] = useState<CleanupReport | null>(null);
  const [busy, setBusy] = useState(false);
  const dry = async () => { setBusy(true); try { setR(await familyAtlasService.cleanupDryRun()); } catch (e) { enqueueSnackbar(errorText(e), { variant: 'error' }); } finally { setBusy(false); } };
  const apply = async () => {
    if (!r || !window.confirm(`${r.merges.length} birleştirme ve ${r.renames.length} parantez düzeltmesi uygulanacak. Her biri sonradan geri alınabilir. Devam edilsin mi?`)) return;
    setBusy(true);
    try { const x = await familyAtlasService.cleanupApply(); enqueueSnackbar(`${x.merged ?? 0} birleştirme, ${x.renamed ?? 0} düzeltme uygulandı.`, { variant: 'success' }); setR(null); onApplied(); }
    catch (e) { enqueueSnackbar(errorText(e), { variant: 'error' }); } finally { setBusy(false); }
  };
  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Typography fontWeight={700}>Otomatik temizlik</Typography>
      <Typography color="text.secondary" sx={{ mt: 0.5, mb: 1.5 }}>
        Aynı halk ve kabilede yazımı birebir aynı kayıtlar birleşir; kabilesi farklıysa birleşmez. Kapanmamış ya da sona kaçmış parantezler düzelir (parantezden sonrası Kiril ise Kiril yazım olur). Hem adige hem abhaz altındaki adlar birleştirilmez, aşağıda listelenir.
      </Typography>
      <Stack direction="row" spacing={1} alignItems="center">
        <Button variant="outlined" disabled={busy} onClick={() => void dry()}>Kuru çalıştır</Button>
        <Button variant="contained" disabled={busy || !r || (r.merges.length + r.renames.length === 0)} onClick={() => void apply()}>Uygula</Button>
        {busy && <CircularProgress size={22} />}
      </Stack>
      {r && (
        <Box sx={{ mt: 2 }}>
          <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
            <Stat n={r.merges.length} t="birleştirme" />
            <Stat n={r.renames.length} t="parantez düzeltme" />
            <Stat n={r.crossRaceForModerator.length} t="iki halklı ad (moderatöre)" />
            {r.candidatesBefore != null && <Stat n={r.candidatesAfter ?? 0} t={`aday kalır (şimdi ${r.candidatesBefore})`} />}
          </Stack>
          <ListBlock title="Parantez düzeltmeleri" rows={r.renames.map((x) => `${x.from} → ${x.to}${x.alternate ? ` (diğer yazım: ${x.alternate})` : ''}`)} />
          <ListBlock title="Birleşecekler" rows={r.merges.map((x) => `${x.name} (${x.race}) · kalan #${x.keep} (${x.keepLinks} köy), katılan #${x.gone} (${x.goneLinks} köy)`)} />
          <ListBlock title="Hem adige hem abhaz altında (birleştirilmez)" rows={r.crossRaceForModerator.map((x) => `${x.name} · ${x.families.map((f) => `#${f.id} ${f.race} (${f.links} köy)`).join(', ')}`)} />
          <ListBlock title="Kabilesi farklı, birleştirilmedi" rows={r.skippedDifferentTribe.map((x) => `${x.name} · ${x.reason}`)} />
        </Box>
      )}
    </Paper>
  );
}

function Side({ s }: { s: MergeSide }) {
  const { enqueueSnackbar } = useSnackbar();
  const [cyr, setCyr] = useState(s.cyrillic ?? '');
  const save = async () => {
    try { await familyAtlasService.setCyrillic(s.id, cyr); enqueueSnackbar('Kiril yazım kaydedildi', { variant: 'success' }); }
    catch (e) { enqueueSnackbar(errorText(e), { variant: 'error' }); }
  };
  return (
    <Box>
      <Typography fontWeight={700}>{s.name} <Typography component="span" variant="body2" color="text.secondary">#{s.id} · {s.race || 'halk yok'}</Typography></Typography>
      <Typography variant="body2" sx={{ mt: 0.5 }}><b>Kabile:</b> {s.tribes.length ? s.tribes.join(', ') : 'bilinmiyor'}</Typography>
      <Typography variant="body2"><b>{s.villageCount} köy:</b> {s.villages.map((v) => `${v.name} (${v.province})`).join(', ') || 'köy bağı yok'}</Typography>
      {s.spellings.length > 0 && <Typography variant="body2" color="text.secondary">Yazımlar: {s.spellings.join(', ')}</Typography>}
      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
        <TextField size="small" label="Kiril yazım (dili bilen moderatör)" value={cyr} onChange={(e) => setCyr(e.target.value)} sx={{ minWidth: 240 }} />
        <Button size="small" onClick={() => void save()}>Kaydet</Button>
      </Stack>
    </Box>
  );
}

// ── Instagram yorumları ─────────────────────────────────────────────

function InstagramPanel() {
  const { enqueueSnackbar } = useSnackbar();
  const [status, setStatus] = useState<'pending' | 'used' | 'ignored'>('pending');
  const [data, setData] = useState<{ items: IgComment[]; counts: Record<string, number> } | null>(null);
  const [media, setMedia] = useState('DemZBirDmdb');
  const [postedOn, setPostedOn] = useState('2026-10-16');
  const load = useCallback(async () => {
    try { setData(await familyAtlasService.instagram(status)); } catch (e) { enqueueSnackbar(errorText(e), { variant: 'error' }); }
  }, [status, enqueueSnackbar]);
  useEffect(() => { void load(); }, [load]);

  const onFile = async (file: File) => {
    try {
      const comments = parseCommentFile(file.name, await file.text());
      if (!comments.length) { enqueueSnackbar('Dosyada yorum bulunamadı.', { variant: 'warning' }); return; }
      const r = await familyAtlasService.importInstagram(media.trim(), postedOn, comments);
      enqueueSnackbar(`${r.received} yorumdan ${r.added} yenisi eklendi.`, { variant: 'success' });
      await load();
    } catch (e) { enqueueSnackbar(errorText(e), { variant: 'error' }); }
  };

  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <Typography fontWeight={700}>Yorumları içe aktar</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5, mb: 1.5 }}>
          CSV (sütunlar: <code>id,text,timestamp</code>) ya da JSON yüklenebilir. Yorum yazanın kullanıcı adı, profili ve fotoğrafı hiçbir yere kaydedilmez; dosyada olsa da okunmaz. Aynı yorum iki kez eklenmez. Açık sayfada kaynak “Instagram yorumu · gönderi tarihi” yazar.
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField size="small" label="Gönderi kodu" value={media} onChange={(e) => setMedia(e.target.value)} />
          <TextField size="small" type="date" label="Gönderi tarihi" value={postedOn} onChange={(e) => setPostedOn(e.target.value)} InputLabelProps={{ shrink: true }} />
          <Button variant="outlined" component="label">Dosya seç (CSV / JSON)<input hidden type="file" accept=".csv,text/csv,application/json,.json" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); e.target.value = ''; }} /></Button>
        </Stack>
      </Paper>
      <Tabs value={status} onChange={(_, v) => setStatus(v)}>
        <Tab value="pending" label={`Bekleyen ${data?.counts.pending ?? ''}`} />
        <Tab value="used" label={`Bağlanan ${data?.counts.used ?? ''}`} />
        <Tab value="ignored" label={`Yok sayılan ${data?.counts.ignored ?? ''}`} />
      </Tabs>
      {!data ? <CircularProgress /> : data.items.map((c) => <CommentCard key={c.comment_id} c={c} onDone={() => void load()} />)}
      {data && data.items.length === 0 && <Typography color="text.secondary">Bu listede yorum yok.</Typography>}
    </Stack>
  );
}

/**
 * Köy seçici — katalogun tamamında arar.
 *
 * Önceden burada iki ayrı kontrol vardı: yalnız yorumdan tahmin edilen
 * adayları listeleyen bir açılır ve aday çıkmadığında beliren ham bir
 * "Köy kimliği" metin kutusu. İkincisi admin'i Köy Konumları sayfasına
 * gidip UUID kopyalamaya zorluyordu. Artık tek alan: öneriler üstte,
 * yazınca katalog aranıyor.
 */
function VillagePicker({
  candidates,
  value,
  onChange,
}: {
  candidates: IgComment['villageCandidates'];
  value: VillageHit | null;
  onChange: (v: VillageHit | null) => void;
}) {
  // Yorumdan çıkan adaylar listenin başında durur; "öneri" olarak işaretli
  // çünkü bunlar tahmin, teyit değil.
  const suggested: VillageHit[] = useMemo(
    () => candidates.map((v) => ({
      id: String(v.id), name: v.name, province: v.province, district: v.district,
    })),
    [candidates],
  );
  const [input, setInput] = useState('');
  const [options, setOptions] = useState<VillageHit[]>(suggested);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = input.trim();
    if (q.length < 2) { setOptions(suggested); setLoading(false); return; }
    // Her tuşta istek atmamak için kısa bir bekleme.
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const hits = await familyAtlasService.searchVillages(q);
        // Öneriler sonuçlarda tekrar etmesin.
        const ids = new Set(hits.map((h) => String(h.id)));
        setOptions([...suggested.filter((sv) => !ids.has(sv.id)), ...hits]);
      } catch { setOptions(suggested); } finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [input, suggested]);

  const suggestedIds = useMemo(() => new Set(suggested.map((v) => v.id)), [suggested]);

  return (
    <Autocomplete
      size="small"
      sx={{ minWidth: 320, flex: 1 }}
      options={options}
      value={value}
      loading={loading}
      onChange={(_, v) => onChange(v)}
      inputValue={input}
      onInputChange={(_, v) => setInput(v)}
      isOptionEqualToValue={(o, v) => String(o.id) === String(v.id)}
      getOptionLabel={(o) => [o.name, [o.province, o.district].filter(Boolean).join('/')].filter(Boolean).join(' · ')}
      groupBy={(o) => (suggestedIds.has(String(o.id)) ? 'Yorumdan çıkan öneriler' : 'Katalogda bulunanlar')}
      noOptionsText={input.trim().length < 2 ? 'Aramak için en az 2 harf yaz' : 'Eşleşen köy yok'}
      renderInput={(params) => (
        <TextField
          {...params}
          label="2. Köy *"
          placeholder="Köy adı yaz ya da listeden seç"
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress size={16} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
}

function CommentCard({ c, onDone }: { c: IgComment; onDone: () => void }) {
  const { enqueueSnackbar } = useSnackbar();
  // Aday varsa seçili gelir ama kartta "öneri" olduğu yazılı; admin onaylamadan
  // bağlamasın diye gizli bir varsayılan bırakılmıyor.
  const [family, setFamily] = useState<string>(c.familyCandidates[0] ? String(c.familyCandidates[0].id) : '');
  const [newName, setNewName] = useState('');
  const [race, setRace] = useState('adige');
  const [village, setVillage] = useState<VillageHit | null>(
    c.villageCandidates[0]
      ? {
          id: String(c.villageCandidates[0].id),
          name: c.villageCandidates[0].name,
          province: c.villageCandidates[0].province,
          district: c.villageCandidates[0].district,
        }
      : null,
  );
  const [spelling, setSpelling] = useState('');
  const [busy, setBusy] = useState(false);

  const creatingNew = family === 'new' || !c.familyCandidates.length;
  // Eksik olanı buton basılmadan önce söyle; snackbar ile uyarmak geç kalıyordu.
  const missing: string[] = [];
  if (creatingNew ? !newName.trim() : !family) missing.push('sülale');
  if (!village) missing.push('köy');

  const link = async () => {
    if (!village) return;
    setBusy(true);
    try {
      const r = await familyAtlasService.link(
        c.comment_id,
        creatingNew
          ? { newFamilyName: newName.trim(), race, villageId: village.id, spelling: spelling || newName.trim() || undefined }
          : { familyId: Number(family), villageId: village.id, spelling: spelling || undefined },
      );
      enqueueSnackbar(r.linked ? 'Bağ eklendi.' : 'Bu bağ zaten vardı.', {
        variant: 'success',
        action: <Button color="inherit" size="small" href={SITE + r.slug} target="_blank">Sayfayı aç</Button>,
      });
      onDone();
    } catch (e) { enqueueSnackbar(errorText(e), { variant: 'error' }); } finally { setBusy(false); }
  };

  const ignore = async () => {
    setBusy(true);
    try { await familyAtlasService.ignore(c.comment_id); onDone(); }
    catch (e) { enqueueSnackbar(errorText(e), { variant: 'error' }); } finally { setBusy(false); }
  };

  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: 0.4 }}>
        INSTAGRAM YORUMU{c.commented_at ? ` · ${new Date(c.commented_at).toLocaleString('tr-TR')}` : ''}
      </Typography>

      {/* Kararın dayanağı yorum metni; kontrollerle aynı ağırlıkta durmamalı. */}
      <Typography sx={{ my: 1.25, whiteSpace: 'pre-wrap', fontSize: 15, lineHeight: 1.6 }}>{c.text}</Typography>

      {!!c.groupMentions?.length && (
        <Alert severity="info" sx={{ mb: 1.5, py: 0.25 }}>
          Yorumda geçen halk / kabile adları: <b>{c.groupMentions.join(', ')}</b> — bunlar sülale değil, seçme.
        </Alert>
      )}

      {c.status === 'pending' && (
        <>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Bu yorumdaki sülaleyi bir köye bağla. İkisi de zorunlu; emin değilsen <b>Yok say</b>.
          </Typography>

          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1.25} alignItems={{ lg: 'flex-start' }} useFlexGap flexWrap="wrap">
            <TextField
              select size="small" label="1. Sülale *" value={family}
              onChange={(e) => setFamily(e.target.value)} sx={{ minWidth: 220 }}
              helperText={c.familyCandidates.length ? 'Yorumdan çıkan öneri' : 'Aday bulunamadı, yeni yaz'}
            >
              {c.familyCandidates.map((f) => (
                <MenuItem key={f.id} value={String(f.id)}>{f.name} ({f.race})</MenuItem>
              ))}
              <MenuItem value="new">Yeni sülale yaz…</MenuItem>
            </TextField>

            {creatingNew && (
              <>
                <TextField size="small" label="Yeni sülale adı *" value={newName} onChange={(e) => setNewName(e.target.value)} />
                <TextField select size="small" label="Halk" value={race} onChange={(e) => setRace(e.target.value)} sx={{ minWidth: 150 }}>
                  {RACES.map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
                </TextField>
              </>
            )}

            <VillagePicker candidates={c.villageCandidates} value={village} onChange={setVillage} />

            <TextField
              size="small" label="Yorumdaki yazım" value={spelling}
              onChange={(e) => setSpelling(e.target.value)}
              helperText="İsteğe bağlı"
            />
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5 }}>
            <Button variant="contained" size="small" disabled={busy || missing.length > 0} onClick={() => void link()}>
              Bağla
            </Button>
            <Button size="small" color="inherit" disabled={busy} onClick={() => void ignore()}>Yok say</Button>
            {missing.length > 0 && (
              <Typography variant="caption" color="text.secondary">
                Bağlamak için {missing.join(' ve ')} seç.
              </Typography>
            )}
          </Stack>
        </>
      )}
    </Paper>
  );
}

// ── Üyelerin önerdiği yeni sülale adları ────────────────────────────

/** Profildeki seçicide listede olmayan ad. Öneren tutulmaz; aynı ad + köy kaç kez önerildi görünür. */
function SuggestionPanel() {
  const { enqueueSnackbar } = useSnackbar();
  const [rows, setRows] = useState<NameSuggestion[] | null>(null);
  const load = useCallback(async () => {
    try { setRows(await familyAtlasService.nameSuggestions()); } catch (e) { enqueueSnackbar(errorText(e), { variant: 'error' }); }
  }, [enqueueSnackbar]);
  useEffect(() => { void load(); }, [load]);
  const resolve = async (s: NameSuggestion, action: 'link' | 'create' | 'reject', familyId?: number, race?: string) => {
    try { await familyAtlasService.resolveName(s.id, action, familyId, race); setRows((r) => r && r.filter((x) => x.id !== s.id)); }
    catch (e) { enqueueSnackbar(errorText(e), { variant: 'error' }); }
  };
  if (!rows) return <CircularProgress />;
  return (
    <Stack spacing={2}>
      {/* Profil eşleştirme bu kuyruğu besler: "öneri" sonucu buraya düşer.
          Kuyruğu işleyen kişi aracı da burada bulsun. */}
      <ProfileMatchBox onApplied={() => void load()} />
      <MemberLinksBox onApplied={() => void load()} />
      <Alert severity="info">Üyeler sülale seçerken listede olmayan bir ad yazınca buraya düşer; profile serbest metin yazılmaz. Mevcut bir sülalenin yazımıysa bağla, gerçekten yeni bir sülaleyse ekle. Köy belirtildiyse bağ o köye “Topluluk katkısı” olarak eklenir.</Alert>
      {rows.length === 0 && <Typography color="text.secondary">Bekleyen öneri yok.</Typography>}
      {rows.map((s) => <SuggestionCard key={s.id} s={s} onResolve={resolve} />)}
    </Stack>
  );
}

/**
 * Köylü teyidi kuyruğu. Topluluğun eklediği sülale bağı ve Çerkesçe köy adı onay beklemeden görünür;
 * köyden iki kişi teyit edince kendiliğinden "köylü teyitli" olur. Buraya yalnız itiraz alanlar düşer.
 * "Teyit bekleyen" sekmesi düşük öncelikli: kayıtlar görünür kalır, bakmak zorunlu değil.
 */
function TrustPanel() {
  const { enqueueSnackbar } = useSnackbar();
  const [state, setState] = useState<'disputed' | 'pending'>('disputed');
  const [rows, setRows] = useState<TrustItem[] | null>(null);
  const load = useCallback(async () => {
    setRows(null);
    try { setRows(await familyAtlasService.trustQueue(state)); } catch (e) { enqueueSnackbar(errorText(e), { variant: 'error' }); setRows([]); }
  }, [state, enqueueSnackbar]);
  useEffect(() => { void load(); }, [load]);
  const decide = async (item: TrustItem, action: 'keep' | 'remove') => {
    try {
      await familyAtlasService.trustDecide(item.type, item.id, action);
      setRows((r) => r && r.filter((x) => x.id !== item.id));
      enqueueSnackbar(action === 'keep' ? 'Kayıt doğru olarak işaretlendi; itirazlar kapandı.' : 'Kayıt köyden kaldırıldı.', { variant: 'success' });
    } catch (e) { enqueueSnackbar(errorText(e), { variant: 'error' }); }
  };
  return (
    <Stack spacing={2}>
      <Tabs value={state} onChange={(_, v) => setState(v)}>
        <Tab value="disputed" label="Tartışmalı (bakılmalı)" />
        <Tab value="pending" label="Teyit bekleyen" />
      </Tabs>
      <Alert severity="info">
        {state === 'disputed'
          ? 'Birisi “Bu yanlış” dedi. Gerekçeyi oku: kayıt doğruysa “Doğru, kalsın” (itirazlar kapanır), yanlışsa “Köyden kaldır”. İtiraz edenin ve ekleyenin kim olduğu gösterilmez.'
          : 'Topluluğun eklediği ve henüz iki köylü teyidi almamış kayıtlar. Görünür durumdalar; bakmak zorunlu değil. Bildiğin bir kaydı buradan da kabul edebilirsin.'}
      </Alert>
      {!rows && <CircularProgress />}
      {rows && rows.length === 0 && <Typography color="text.secondary">{state === 'disputed' ? 'Tartışmalı kayıt yok.' : 'Teyit bekleyen kayıt yok.'}</Typography>}
      {rows?.map((item) => (
        <Paper key={item.id} variant="outlined" sx={{ p: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Chip size="small" label={item.type === 'family' ? 'Sülale' : 'Çerkesçe ad'} />
            <Typography fontWeight={700}>{item.label}</Typography>
            <Typography variant="body2" color="text.secondary">
              · {item.villageName} ({item.district}, {item.province}) · {item.confirms} köylü teyidi · {item.source === 'community' ? 'Topluluk ekledi' : 'Kaynak listesinden'}
            </Typography>
          </Stack>
          {item.disputes.length > 0 && (
            <Box component="ul" sx={{ m: 0, mt: 1, pl: 3 }}>
              {item.disputes.map((d, i) => <li key={i}><Typography variant="body2">“{d.reason}”</Typography></li>)}
            </Box>
          )}
          <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
            <Button size="small" variant="contained" onClick={() => decide(item, 'keep')}>Doğru, kalsın</Button>
            <Button size="small" color="error" onClick={() => decide(item, 'remove')}>Köyden kaldır</Button>
            {item.villageSlug && <Button size="small" color="inherit" href={`https://nartgo.net/harita?koy=${encodeURIComponent(item.villageSlug)}`} target="_blank">Köy sayfası</Button>}
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}

type Candidate = { id: number; slug: string; name: string; race: string; villages: number };

function SuggestionCard({ s, onResolve }: { s: NameSuggestion; onResolve: (s: NameSuggestion, a: 'link' | 'create' | 'reject', familyId?: number, race?: string) => void }) {
  const [race, setRace] = useState('adige');
  const cands = [...s.candidates.exact, ...s.candidates.suggestions].slice(0, 6);
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography fontWeight={700}>{s.name} <Typography component="span" variant="body2" color="text.secondary">· {s.times} kez önerildi{s.village ? ` · ${s.village} (${s.district}, ${s.province})` : ''}</Typography></Typography>
      <Typography variant="body2" sx={{ mt: 1 }}>Atlastaki yakın yazımlar (dokununca bağlar):</Typography>
      <LinkRow s={s} cands={cands} onResolve={onResolve} />
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
        <TextField select size="small" label="Halk" value={race} onChange={(e) => setRace(e.target.value)} sx={{ minWidth: 150 }}>
          {RACES.map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
        </TextField>
        <Button size="small" variant="contained" onClick={() => onResolve(s, 'create', undefined, race)}>Yeni sülale olarak ekle</Button>
        <Button size="small" color="inherit" onClick={() => onResolve(s, 'reject')}>Reddet</Button>
      </Stack>
    </Paper>
  );
}

/** Aday sülaleye tek dokunuşla bağla; sülale sayfası yeni sekmede açılarak kontrol edilebilir. */
function LinkRow({ s, cands, onResolve }: { s: NameSuggestion; cands: Candidate[]; onResolve: (s: NameSuggestion, a: 'link', familyId?: number) => void }) {
  if (!cands.length) return <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Yakın yazım yok.</Typography>;
  return (
    <Stack direction="row" spacing={1} sx={{ mt: 0.5 }} flexWrap="wrap" useFlexGap>
      {cands.map((c) => (
        <Stack key={c.slug} direction="row" spacing={0.5} alignItems="center">
          <Button size="small" variant="outlined" onClick={() => onResolve(s, 'link', c.id)}>{c.name} · {c.race} · {c.villages} köy</Button>
          <Button size="small" href={`https://nartgo.net/harita/sulale/${c.slug}`} target="_blank" rel="noreferrer">Sayfa</Button>
        </Stack>
      ))}
    </Stack>
  );
}
