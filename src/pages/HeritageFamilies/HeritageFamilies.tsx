import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Divider, MenuItem, Paper, Stack, Tab, Tabs, TextField, Typography,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { errorText } from '../../services/heritageReviewService';
import {
  familyAtlasService, parseCommentFile,
  type CleanupReport, type IgComment, type NameSuggestion, type TrustItem, type ImportReport, type MergeItem, type MergeSide,
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
        <Tab label="Kaynak listesi" />
        <Tab label="Birleştirme" />
        <Tab label="Instagram yorumları" />
        <Tab label="Yeni ad önerileri" />
        <Tab label="Tartışmalı kayıtlar" />
      </Tabs>
      {tab === 0 && <ImportPanel />}
      {tab === 1 && <MergePanel />}
      {tab === 2 && <InstagramPanel />}
      {tab === 3 && <SuggestionPanel />}
      {tab === 4 && <TrustPanel />}
    </Box>
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

function CommentCard({ c, onDone }: { c: IgComment; onDone: () => void }) {
  const { enqueueSnackbar } = useSnackbar();
  const [family, setFamily] = useState<string>(c.familyCandidates[0] ? String(c.familyCandidates[0].id) : '');
  const [newName, setNewName] = useState('');
  const [race, setRace] = useState('adige');
  const [village, setVillage] = useState<string>(c.villageCandidates[0] ? String(c.villageCandidates[0].id) : '');
  const [villageId, setVillageId] = useState('');
  const [spelling, setSpelling] = useState('');
  const [busy, setBusy] = useState(false);
  const link = async () => {
    const vid = (villageId.trim() || village).trim();
    if (!vid) { enqueueSnackbar('Köy seç ya da köy kimliğini yapıştır.', { variant: 'warning' }); return; }
    setBusy(true);
    try {
      const r = await familyAtlasService.link(c.comment_id, family && family !== 'new' ? { familyId: Number(family), villageId: vid, spelling: spelling || undefined } : { newFamilyName: newName, race, villageId: vid, spelling: spelling || newName || undefined });
      enqueueSnackbar(r.linked ? 'Bağ eklendi.' : 'Bu bağ zaten vardı.', { variant: 'success', action: <Button color="inherit" size="small" href={SITE + r.slug} target="_blank">Sayfayı aç</Button> });
      onDone();
    } catch (e) { enqueueSnackbar(errorText(e), { variant: 'error' }); } finally { setBusy(false); }
  };
  const ignore = async () => { setBusy(true); try { await familyAtlasService.ignore(c.comment_id); onDone(); } catch (e) { enqueueSnackbar(errorText(e), { variant: 'error' }); } finally { setBusy(false); } };
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="body2" color="text.secondary">Instagram yorumu{c.commented_at ? ` · ${new Date(c.commented_at).toLocaleString('tr-TR')}` : ''}</Typography>
      <Typography sx={{ my: 1, whiteSpace: 'pre-wrap' }}>{c.text}</Typography>
      {c.status === 'pending' && (
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ md: 'center' }} flexWrap="wrap" useFlexGap>
          <TextField select size="small" label="Sülale" value={family} onChange={(e) => setFamily(e.target.value)} sx={{ minWidth: 200 }}>
            {c.familyCandidates.map((f) => <MenuItem key={f.id} value={String(f.id)}>{f.name} ({f.race})</MenuItem>)}
            <MenuItem value="new">Yeni sülale yaz…</MenuItem>
          </TextField>
          {(family === 'new' || !c.familyCandidates.length) && (
            <>
              <TextField size="small" label="Sülale adı" value={newName} onChange={(e) => setNewName(e.target.value)} />
              <TextField select size="small" label="Halk" value={race} onChange={(e) => setRace(e.target.value)} sx={{ minWidth: 150 }}>
                {RACES.map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
              </TextField>
            </>
          )}
          <TextField select size="small" label="Köy" value={village} onChange={(e) => setVillage(e.target.value)} sx={{ minWidth: 220 }}>
            {c.villageCandidates.map((v) => <MenuItem key={v.id} value={String(v.id)}>{v.name} · {v.province}/{v.district}</MenuItem>)}
            <MenuItem value="">Listede yok</MenuItem>
          </TextField>
          {!village && <TextField size="small" label="Köy kimliği (Köy Konumları'ndan)" value={villageId} onChange={(e) => setVillageId(e.target.value)} sx={{ minWidth: 280 }} />}
          <TextField size="small" label="Yorumdaki yazım (isteğe bağlı)" value={spelling} onChange={(e) => setSpelling(e.target.value)} />
          <Button variant="contained" size="small" disabled={busy} onClick={() => void link()}>Bağla</Button>
          <Button size="small" color="inherit" disabled={busy} onClick={() => void ignore()}>Yok say</Button>
        </Stack>
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
