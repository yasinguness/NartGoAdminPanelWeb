import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import {
  Alert, Box, Button, Chip, CircularProgress, Link, Paper, Stack, Tab, Table, TableBody, TableCell, TableHead, TableRow,
  TableSortLabel, Tabs, TextField, Typography,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { errorText } from '../../services/heritageReviewService';
import { heritageDeskService, deskQueueTotal, type DeskActivity, type DeskSummary, type DeskVillage } from '../../services/heritageDeskService';
import { heritagePhotoService, type ArchivePhoto } from '../../services/heritagePhotoService';
import { heritageVillageService, type PendingSummary } from '../../services/heritageVillageService';
import { heritageVoiceService, VOICE_PROMPT_LABEL, type VoiceMemory } from '../../services/heritageVoiceService';
import { ANNOUNCEMENT_KIND_LABEL, heritageAnnouncementService, type ReportedAnnouncement } from '../../services/heritageAnnouncementService';

/**
 * Köy Masası (yönetici ve genel Köy Editörü). Ortak Hafıza'da karar bekleyen her şey tek kuyrukta: incelemedeki
 * fotoğraf ve ses kaydı, kaldırılması istenip gizlenen fotoğraf, şikâyetle gizlenen duyuru. Ayrıca köy bazında özet
 * ve son günlerin sayıları. Bkz. docs/plan/nartgo-koy-masasi.md
 */
type Kind = 'removal' | 'photo' | 'voice' | 'announcement';
type QueueItem =
  | { kind: 'removal' | 'photo'; id: string; at: string; village: string; photo: ArchivePhoto }
  | { kind: 'voice'; id: string; at: string; village: string; voice: VoiceMemory }
  | { kind: 'announcement'; id: string; at: string; village: string; announcement: ReportedAnnouncement };

const KIND_LABEL: Record<Kind, string> = {
  removal: 'Kaldırma İsteği',
  photo: 'Fotoğraf',
  voice: 'Ses Kaydı',
  announcement: 'Gizlenen Duyuru',
};
const KIND_COLOR: Record<Kind, 'error' | 'default' | 'warning'> = { removal: 'error', photo: 'default', voice: 'default', announcement: 'warning' };
/** Kaldırma isteği kişisel veri talebidir: her zaman en üstte. Sonra eskiden yeniye. */
const KIND_ORDER: Record<Kind, number> = { removal: 0, announcement: 1, photo: 2, voice: 2 };

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const age = (iso: string) => {
  const hours = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 3_600_000));
  return hours < 1 ? 'az önce' : hours < 48 ? `${hours} saat önce` : `${Math.round(hours / 24)} gün önce`;
};

const ACTIVITY_ROWS: { key: keyof DeskActivity; label: string }[] = [
  { key: 'photos', label: 'Eklenen eski fotoğraf' },
  { key: 'albumPhotos', label: 'Albüme eklenen fotoğraf' },
  { key: 'names', label: 'Fotoğrafa yazılan isim' },
  { key: 'voices', label: 'Eklenen ses kaydı' },
  { key: 'listens', label: 'Ses kaydı dinleyen kişi' },
  { key: 'histories', label: 'Yazılan tarihçe' },
  { key: 'announcements', label: 'Köy duyurusu' },
  { key: 'responses', label: 'Duyuruya karşılık' },
  { key: 'invites', label: 'Davet bağlantısı alan üye' },
  { key: 'inviteJoins', label: 'Davetle gelen yeni kayıt' },
];

type SortKey = 'name' | 'members' | 'families' | 'photos' | 'voices' | 'albums' | 'announcements30' | 'pending' | 'inviteJoins';

export default function HeritageDesk() {
  const { enqueueSnackbar } = useSnackbar();
  const [params, setParams] = useSearchParams();
  const tab = params.get('sekme') ?? 'bekleyenler';
  const filter = (params.get('tur') as Kind | null) ?? null;

  const [summary, setSummary] = useState<DeskSummary | null>(null);
  // Köy Kayıtları, Konum İncelemesi ve Sülale Atlası'nın kendi kuyrukları: burada sayıları ve bağlantıları durur.
  const [other, setOther] = useState<PendingSummary | null>(null);
  const [queue, setQueue] = useState<QueueItem[] | null>(null);
  const [villages, setVillages] = useState<DeskVillage[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'pending', dir: 'desc' });

  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v === null ? next.delete(k) : next.set(k, v)));
    setParams(next, { replace: true });
  };

  const loadSummary = useCallback(async () => {
    try { setSummary(await heritageDeskService.summary()); } catch (e) { setError(errorText(e)); }
  }, []);

  const loadQueue = useCallback(async () => {
    // Dört kuyruk ayrı uçlardan gelir; biri hata verirse diğerleri yine gösterilir.
    const [pending, removals, voices, announcements] = await Promise.allSettled([
      heritagePhotoService.queue('pending'),
      heritagePhotoService.queue('requested'),
      heritageVoiceService.queue('pending'),
      heritageAnnouncementService.queue(),
    ]);
    const items: QueueItem[] = [];
    if (removals.status === 'fulfilled') removals.value.items.forEach((p) => items.push({ kind: 'removal', id: p.id, at: p.createdAt, village: p.villageName, photo: p }));
    if (pending.status === 'fulfilled') pending.value.items.forEach((p) => items.push({ kind: 'photo', id: p.id, at: p.createdAt, village: p.villageName, photo: p }));
    if (voices.status === 'fulfilled') voices.value.items.forEach((v) => items.push({ kind: 'voice', id: v.id, at: v.createdAt, village: v.villageName, voice: v }));
    if (announcements.status === 'fulfilled') {
      announcements.value.items.filter((a) => a.status === 'hidden')
        .forEach((a) => items.push({ kind: 'announcement', id: a.id, at: a.createdAt, village: a.villageName, announcement: a }));
    }
    items.sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || new Date(a.at).getTime() - new Date(b.at).getTime());
    setQueue(items);
    const failed = [pending, removals, voices, announcements].filter((r) => r.status === 'rejected').length;
    setError(failed === 4 ? 'Kuyruk yüklenemedi. Sayfayı yenileyin.' : failed > 0 ? 'Kuyruğun bir bölümü yüklenemedi; liste eksik olabilir.' : '');
  }, []);

  useEffect(() => { void loadSummary(); void loadQueue(); }, [loadSummary, loadQueue]);
  useEffect(() => { heritageVillageService.pendingSummary().then(setOther).catch(() => undefined); }, []);
  useEffect(() => {
    if (tab !== 'koyler' || villages) return;
    heritageDeskService.villages().then(setVillages).catch((e) => setError(errorText(e)));
  }, [tab, villages]);

  const act = async (item: QueueItem, label: string, action: (note?: string) => Promise<void>, confirm?: string) => {
    if (confirm && !window.confirm(confirm)) return;
    setBusy(item.id);
    try {
      await action(notes[item.id]?.trim() || undefined);
      enqueueSnackbar(label, { variant: 'success' });
      // Karar verilen kayıt listeden hemen düşer; sayılar arkadan yenilenir.
      setQueue((q) => (q ?? []).filter((x) => !(x.id === item.id && x.kind === item.kind)));
      void loadSummary();
    } catch (e) {
      enqueueSnackbar(errorText(e), { variant: 'error' });
      void loadQueue();
    } finally { setBusy(null); }
  };

  const shown = useMemo(() => (queue ?? []).filter((i) => !filter || i.kind === filter), [queue, filter]);
  const countOf = (k: Kind) => (queue ?? []).filter((i) => i.kind === k).length;

  const villageRows = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('tr');
    const rows = (villages ?? []).filter((v) => !q || `${v.name} ${v.province} ${v.district}`.toLocaleLowerCase('tr').includes(q));
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => (sort.key === 'name' ? a.name.localeCompare(b.name, 'tr') : a[sort.key] - b[sort.key]) * dir);
  }, [villages, search, sort]);

  const tile = (label: string, value: number, hint: string, onClick: (() => void) | null, to?: string, urgent = false) => {
    const body = (
      <Paper variant="outlined" onClick={onClick ?? undefined}
        sx={{ p: 1.5, borderRadius: 2, minWidth: 150, flex: '1 1 150px', cursor: onClick || to ? 'pointer' : 'default',
          borderColor: urgent && value > 0 ? 'error.main' : undefined, '&:hover': onClick || to ? { bgcolor: 'action.hover' } : undefined }}>
        <Typography variant="h5" fontWeight={800} color={urgent && value > 0 ? 'error.main' : 'text.primary'}>{value}</Typography>
        <Typography variant="body2" fontWeight={700}>{label}</Typography>
        <Typography variant="caption" color="text.secondary">{hint}</Typography>
      </Paper>
    );
    return to ? <Box component={RouterLink} to={to} sx={{ textDecoration: 'none', color: 'inherit', flex: '1 1 150px', display: 'flex' }}>{body}</Box> : body;
  };

  const noteField = (id: string) => (
    <TextField size="small" fullWidth placeholder="Not (isteğe bağlı)" value={notes[id] ?? ''}
      onChange={(e) => setNotes((n) => ({ ...n, [id]: e.target.value }))} sx={{ mb: 1 }} />
  );

  const renderItem = (item: QueueItem) => {
    const disabled = busy === item.id;
    let preview: JSX.Element; let info: JSX.Element; let actions: JSX.Element;
    if ('photo' in item) {
      const p = item.photo;
      preview = (
        <a href={p.imageUrl} target="_blank" rel="noreferrer">
          <Box component="img" src={p.imageUrl} alt={p.caption ?? 'Arşiv fotoğrafı'} loading="lazy"
            sx={{ width: 150, height: 150, objectFit: 'cover', borderRadius: 1, bgcolor: 'action.hover', display: 'block' }} />
        </a>
      );
      info = (
        <>
          <Typography fontWeight={700}>{p.caption ?? (p.albumTitle ? p.albumTitle : 'Eski fotoğraf')}</Typography>
          <Typography variant="body2" color="text.secondary">
            {[p.albumTitle ? `Albüm: ${p.albumTitle}` : 'Eski fotoğraf', p.year ? `yaklaşık ${p.year}` : null].filter(Boolean).join(' · ')}
          </Typography>
          {p.names && <Typography variant="body2" sx={{ mt: 0.5 }}><b>Yazılan isimler:</b> {p.names}</Typography>}
          {item.kind === 'removal' && (
            <Alert severity="warning" sx={{ mt: 1, py: 0 }}>
              {p.removalRequests} kişi kaldırılmasını istedi{p.removalReasons ? `: ${p.removalReasons}` : ''}. Fotoğraf şu an gizli.
            </Alert>
          )}
        </>
      );
      actions = item.kind === 'photo' ? (
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="contained" disabled={disabled}
            onClick={() => void act(item, 'Fotoğraf yayınlandı.', (n) => heritagePhotoService.decide(p.id, 'approve', n))}>Yayınla</Button>
          <Button size="small" color="error" variant="outlined" disabled={disabled}
            onClick={() => void act(item, 'Fotoğraf reddedildi, dosya silindi.', (n) => heritagePhotoService.decide(p.id, 'reject', n), 'Fotoğraf dosyası kalıcı olarak silinecek. Devam edilsin mi?')}>Reddet</Button>
        </Stack>
      ) : (
        <Stack direction="row" spacing={1}>
          <Button size="small" color="error" variant="contained" disabled={disabled}
            onClick={() => void act(item, 'Fotoğraf kaldırıldı, dosya silindi.', (n) => heritagePhotoService.decide(p.id, 'remove', n), 'Fotoğraf dosyası kalıcı olarak silinecek. Devam edilsin mi?')}>Kaldır</Button>
          <Button size="small" variant="outlined" disabled={disabled}
            onClick={() => void act(item, 'Fotoğraf yeniden yayında.', (n) => heritagePhotoService.decide(p.id, 'keep', n))}>Yeniden Yayınla</Button>
        </Stack>
      );
    } else if ('voice' in item) {
      const v = item.voice;
      preview = <audio controls preload="none" src={v.audioUrl} style={{ width: '100%' }} />;
      info = (
        <>
          <Typography fontWeight={700}>{v.title ?? VOICE_PROMPT_LABEL[v.prompt] ?? v.prompt}</Typography>
          <Typography variant="body2" color="text.secondary">
            {[v.title ? VOICE_PROMPT_LABEL[v.prompt] : null, `Anlatan: ${v.narratorName}`, clock(v.durationSeconds)].filter(Boolean).join(' · ')}
          </Typography>
        </>
      );
      actions = (
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="contained" disabled={disabled}
            onClick={() => void act(item, 'Ses kaydı yayınlandı.', (n) => heritageVoiceService.decide(v.id, 'approve', n))}>Yayınla</Button>
          <Button size="small" color="error" variant="outlined" disabled={disabled}
            onClick={() => void act(item, 'Ses kaydı reddedildi, dosya silindi.', (n) => heritageVoiceService.decide(v.id, 'reject', n), 'Ses dosyası kalıcı olarak silinecek. Devam edilsin mi?')}>Reddet</Button>
        </Stack>
      );
    } else {
      const a = item.announcement;
      preview = <Chip label={ANNOUNCEMENT_KIND_LABEL[a.kind] ?? a.kind} />;
      info = (
        <>
          <Typography fontWeight={700}>{a.title}</Typography>
          {a.body && <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{a.body}</Typography>}
          <Typography variant="body2" color="text.secondary">
            {[a.eventDate ? a.eventDate.slice(0, 10) : null, a.eventTime, a.place].filter(Boolean).join(' · ')}
          </Typography>
          <Alert severity="warning" sx={{ mt: 1, py: 0 }}>{a.reports} şikâyet{a.reasons ? `: ${a.reasons}` : ''}. Duyuru şu an gizli.</Alert>
        </>
      );
      actions = (
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="outlined" disabled={disabled}
            onClick={() => void act(item, 'Duyuru yeniden yayında.', (n) => heritageAnnouncementService.decide(a.id, 'restore', n))}>Yeniden Yayınla</Button>
          <Button size="small" color="error" variant="contained" disabled={disabled}
            onClick={() => void act(item, 'Duyuru kaldırıldı.', (n) => heritageAnnouncementService.decide(a.id, 'remove', n))}>Kaldır</Button>
        </Stack>
      );
    }
    const author = 'voice' in item ? item.voice : 'announcement' in item ? item.announcement : item.photo;
    return (
      <Paper key={`${item.kind}-${item.id}`} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-start">
          <Box sx={{ flexShrink: 0, width: { xs: '100%', md: 264 } }}>{preview}</Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }} flexWrap="wrap" useFlexGap>
              <Chip size="small" color={KIND_COLOR[item.kind]} label={KIND_LABEL[item.kind]} />
              <Typography variant="body2" fontWeight={700}>{item.village}</Typography>
              <Typography variant="caption" color="text.secondary">
                {author.authorName ?? 'Silinmiş hesap'}{author.authorEmail ? ` · ${author.authorEmail}` : ''} · {age(item.at)}
              </Typography>
            </Stack>
            {info}
          </Box>
          <Box sx={{ width: { xs: '100%', md: 250 }, flexShrink: 0 }}>
            {noteField(item.id)}
            {actions}
          </Box>
        </Stack>
      </Paper>
    );
  };

  const p = summary?.pending;
  const header = (key: SortKey, label: string, numeric = true) => (
    <TableCell align={numeric ? 'right' : 'left'} sortDirection={sort.key === key ? sort.dir : false}>
      <TableSortLabel active={sort.key === key} direction={sort.key === key ? sort.dir : 'desc'}
        onClick={() => setSort((s) => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }))}>{label}</TableSortLabel>
    </TableCell>
  );

  return (
    <Box>
      <Typography variant="h5" fontWeight={700}>Köy Masası</Typography>
      <Typography color="text.secondary" sx={{ mb: 2, maxWidth: 860 }}>
        Ortak Hafıza'da kararınızı bekleyen her şey burada. Kaldırma istekleri en üstte durur: fotoğraftaki kişi ya da
        yakını istemiştir ve fotoğraf siz karar verene kadar gizlidir.
        {summary?.oldestPendingHours != null && summary.oldestPendingHours >= 24
          ? ` En eski kayıt ${Math.round(summary.oldestPendingHours / 24)} gündür bekliyor.` : ''}
      </Typography>

      <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
        {tile('Kaldırma İsteği', p?.removals ?? 0, 'fotoğraf gizli, karar bekliyor', () => set({ sekme: 'bekleyenler', tur: 'removal' }), undefined, true)}
        {tile('Fotoğraf', p?.photos ?? 0, 'yayın öncesi inceleme', () => set({ sekme: 'bekleyenler', tur: 'photo' }))}
        {tile('Ses Kaydı', p?.voices ?? 0, 'dinleyin, yayınlayın', () => set({ sekme: 'bekleyenler', tur: 'voice' }))}
        {tile('Gizlenen Duyuru', p?.announcements ?? 0, 'üç şikâyetle gizlendi', () => set({ sekme: 'bekleyenler', tur: 'announcement' }))}
        {tile('Göç Yolu', p?.migration ?? 0, 'ipucu var, yol girilmemiş', null, '/heritage/migration')}
        {tile('Editör Başvurusu', p?.editorRequests ?? 0, 'yalnız yönetici karar verir', null, '/heritage/village-editors')}
      </Stack>

      {other && (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Ortak Hafıza'nın diğer kuyrukları</Typography>
          <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
            {tile('Köy Katkıları', other.villageContributions + other.decidableTasks, 'ad, sülale, tarihçe, düzeltme', null, '/heritage/villages')}
            {tile('Köy Konumu', other.locationQueue, 'konum inceleme kuyruğu', null, '/heritage/locations')}
            {tile('Tartışmalı Kayıt', other.communityDisputed, 'köylü itiraz etti', null, '/heritage/families')}
            {tile('Yeni Sülale Önerisi', other.familySuggestions, 'atlasta olmayan ad', null, '/heritage/families')}
            {tile('Instagram Yorumu', other.instagramComments, 'sülale adı içeren yorum', null, '/heritage/families')}
          </Stack>
        </>
      )}

      <Tabs value={tab} onChange={(_, v: string) => set({ sekme: v })} sx={{ mb: 2 }}>
        <Tab value="bekleyenler" label={p ? `Bekleyenler · ${deskQueueTotal(p)}` : 'Bekleyenler'} />
        <Tab value="koyler" label="Köyler" />
        <Tab value="sayilar" label="Sayılar" />
      </Tabs>
      {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}

      {tab === 'bekleyenler' && (
        <>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }} alignItems="center">
            <Chip label={`Tümü · ${queue?.length ?? 0}`} color={!filter ? 'primary' : 'default'} onClick={() => set({ tur: null })} />
            {(['removal', 'photo', 'voice', 'announcement'] as Kind[]).map((k) => (
              <Chip key={k} label={`${KIND_LABEL[k]} · ${countOf(k)}`} color={filter === k ? 'primary' : 'default'} onClick={() => set({ tur: k })} />
            ))}
            <Box sx={{ flex: 1 }} />
            <Typography variant="body2" color="text.secondary">
              Yayındakiler:{' '}
              <Link component={RouterLink} to="/heritage/photos">fotoğraflar</Link>{' · '}
              <Link component={RouterLink} to="/heritage/voices">ses kayıtları</Link>{' · '}
              <Link component={RouterLink} to="/heritage/announcements">şikâyet alan duyurular</Link>
            </Typography>
          </Stack>
          {!queue && <CircularProgress size={24} />}
          {queue && shown.length === 0 && (
            <Typography color="text.secondary">{filter ? 'Bu türde bekleyen kayıt yok.' : 'Bekleyen iş yok.'}</Typography>
          )}
          <Stack spacing={1.5}>{shown.map(renderItem)}</Stack>
        </>
      )}

      {tab === 'koyler' && (
        <>
          <TextField size="small" placeholder="Köy, ilçe ya da il ara" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ mb: 2, width: 320, maxWidth: '100%' }} />
          {!villages && <CircularProgress size={24} />}
          {villages && villageRows.length === 0 && <Typography color="text.secondary">Köy bulunamadı.</Typography>}
          {villages && villageRows.length > 0 && (
            <Paper variant="outlined" sx={{ borderRadius: 2, overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {header('name', 'Köy', false)}
                    {header('pending', 'Bekleyen')}
                    {header('members', 'Üye')}
                    {header('families', 'Sülale')}
                    {header('photos', 'Fotoğraf')}
                    {header('voices', 'Ses')}
                    {header('albums', 'Albüm')}
                    {header('announcements30', 'Duyuru (30 gün)')}
                    {header('inviteJoins', 'Davetle Gelen')}
                    <TableCell>Köy Editörü</TableCell>
                    <TableCell>Göç Yolu</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {villageRows.map((v) => (
                    <TableRow key={v.id} hover>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        <Typography variant="body2" fontWeight={700}>{v.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{v.district}, {v.province}</Typography>
                      </TableCell>
                      <TableCell align="right">{v.pending > 0 ? <Chip size="small" color="warning" label={v.pending} /> : 0}</TableCell>
                      <TableCell align="right">{v.members}</TableCell>
                      <TableCell align="right">{v.families}</TableCell>
                      <TableCell align="right">{v.photos}</TableCell>
                      <TableCell align="right">{v.voices}</TableCell>
                      <TableCell align="right">{v.albums}</TableCell>
                      <TableCell align="right">{v.announcements30}</TableCell>
                      <TableCell align="right">{v.inviteJoins}</TableCell>
                      <TableCell>{v.editors ?? <Typography variant="caption" color="text.secondary">Yok</Typography>}</TableCell>
                      <TableCell>
                        <Link component={RouterLink} to={`/heritage/migration?koy=${v.id}`}>
                          {v.routeStatus === 'published' ? 'Yayında' : v.routeStatus === 'draft' ? 'Taslak' : 'Gir'}
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          )}
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            Üyesi, arşivi, duyurusu ya da bekleyen kaydı olan köyler listelenir (en çok 500). Başlığa tıklayarak sıralayın.
          </Typography>
        </>
      )}

      {tab === 'sayilar' && (
        !summary ? <CircularProgress size={24} /> : (
          <Stack spacing={2}>
            <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
              {tile('Arşivi Olan Köy', summary.totals.villagesWithArchive, 'yayında fotoğraf ya da ses kaydı', null)}
              {tile('Eski Fotoğraf', summary.totals.photos, 'yayında, toplam', null)}
              {tile('Albüm Fotoğrafı', summary.totals.albumPhotos, 'yayında, toplam', null)}
              {tile('Ses Kaydı', summary.totals.voices, 'yayında, toplam', null)}
              {tile('Köy Editörü', summary.totals.villageEditors, 'köye bağlı, etkin', null)}
              {tile('Göç Yolu', summary.totals.routesPublished, 'yayında', null)}
            </Stack>
            <Paper variant="outlined" sx={{ borderRadius: 2, overflowX: 'auto', maxWidth: 620 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell />
                    <TableCell align="right">Son 7 gün</TableCell>
                    <TableCell align="right">Son 30 gün</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ACTIVITY_ROWS.map((r) => (
                    <TableRow key={r.key}>
                      <TableCell>{r.label}</TableCell>
                      <TableCell align="right">{summary.last7[r.key]}</TableCell>
                      <TableCell align="right">{summary.last30[r.key]}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
            <Typography variant="caption" color="text.secondary">
              Eklenen fotoğraf ve ses kaydı sayıları incelemedeki ve reddedilen kayıtları da içerir. "Davetle gelen yeni kayıt" yalnız
              uygulaması yüklü olup bağlantıyı açan yeni hesapları sayar; gerçek etki daha büyüktür.
            </Typography>
          </Stack>
        )
      )}
    </Box>
  );
}
