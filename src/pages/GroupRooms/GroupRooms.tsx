import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Alert, Avatar, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, MenuItem, Paper, Stack, Switch, Tab, Tabs, TextField, Typography,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import UserSearchAutocomplete from '../../components/UserSearchAutocomplete';
import { errorText } from '../../services/heritageReviewService';
import {
  groupRoomService, type AdminRoom, type BlockedWord, type ChocolateStats, type AdminRoomRequest, type ResolveAction, type RoomReportItem, type WeekDay,
} from '../../services/groupRoomService';
import type { UserDTO } from '../../types/users/userModel';

/**
 * Sohbet odaları (yalnız yönetici). Odalar: ad, kurallar, sabit mesaj, haftalık sohbet saati,
 * moderatörler. Şikâyetler: üç farklı kişiden şikâyet alan mesaj kendiliğinden gizlenir, karar burada.
 * Bkz. docs/plan/nartgo-sohbet-odalari.md
 */
type TabKey = 'rooms' | 'reports' | 'words' | 'chocolate';
const TAB_PARAM: Record<TabKey, string | null> = { rooms: null, reports: 'sikayet', words: 'kelime', chocolate: 'cikolata' };

const DAYS: { value: WeekDay; label: string }[] = [
  { value: 'MONDAY', label: 'Pazartesi' }, { value: 'TUESDAY', label: 'Salı' }, { value: 'WEDNESDAY', label: 'Çarşamba' },
  { value: 'THURSDAY', label: 'Perşembe' }, { value: 'FRIDAY', label: 'Cuma' }, { value: 'SATURDAY', label: 'Cumartesi' },
  { value: 'SUNDAY', label: 'Pazar' },
];
const dayLabel = (d: WeekDay) => DAYS.find((x) => x.value === d)?.label ?? d;
const fmt = (iso: string | null) => (iso
  ? new Date(iso).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  : '');

export default function GroupRooms() {
  const { enqueueSnackbar } = useSnackbar();
  const [params, setParams] = useSearchParams();
  const sekme = params.get('sekme');
  const tab: TabKey = sekme === 'sikayet' ? 'reports' : sekme === 'kelime' ? 'words' : sekme === 'cikolata' ? 'chocolate' : 'rooms';
  const [rooms, setRooms] = useState<AdminRoom[] | null>(null);
  const [reports, setReports] = useState<RoomReportItem[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminRoom | 'new' | null>(null);
  const [addingTo, setAddingTo] = useState<AdminRoom | null>(null);

  const load = useCallback(async () => {
    try {
      if (tab === 'rooms') setRooms(await groupRoomService.rooms());
      else if (tab === 'reports') setReports(await groupRoomService.reports());
      setError('');
    } catch (e) { setError(errorText(e)); }
  }, [tab]);
  useEffect(() => { void load(); }, [load]);

  const run = async (key: string, action: () => Promise<unknown>, done: string) => {
    setBusy(key);
    try { await action(); enqueueSnackbar(done, { variant: 'success' }); await load(); }
    catch (e) { enqueueSnackbar(errorText(e), { variant: 'error' }); }
    finally { setBusy(null); }
  };

  const resolve = (item: RoomReportItem, action: ResolveAction) => run(
    `r-${item.messageId}`,
    () => groupRoomService.resolve(item.messageId, action, action === 'HIDE_AND_SILENCE' ? 24 : undefined),
    action === 'DISMISS' ? 'Mesaj yeniden görünür, şikâyetler kapandı.'
      : action === 'HIDE' ? 'Mesaj gizlendi.' : 'Mesaj gizlendi, kişi bu odada 24 saat yazamayacak.',
  );

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2} flexWrap="wrap">
        <Typography variant="h5" fontWeight={700}>Sohbet Odaları</Typography>
        {tab === 'rooms' && <Button variant="contained" onClick={() => setEditing('new')}>Oda Ekle</Button>}
      </Stack>
      <Typography color="text.secondary" sx={{ mb: 1, maxWidth: 860 }}>
        Odalar herkese açık; yazmak için 18 yaş, ad ve soyad gerekiyor. Moderatör yalnız kendi odasında mesaj gizler
        ve kişiyi susturur. Üç farklı kişiden şikâyet alan mesaj siz bakana kadar gizli kalır. Oda adına halk, köken
        ya da bölge adı yazmayın.
      </Typography>
      <Tabs value={tab} onChange={(_, v: TabKey) => setParams(TAB_PARAM[v] ? { sekme: TAB_PARAM[v]! } : {})} sx={{ mb: 2 }}>
        <Tab value="rooms" label="Odalar" />
        <Tab value="reports" label={`Şikâyetler${reports ? ` · ${reports.length}` : ''}`} />
        <Tab value="words" label="Yasaklı Kelimeler" />
        <Tab value="chocolate" label="Çikolata" />
      </Tabs>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {tab === 'rooms' && (rooms === null && !error ? <CircularProgress size={24} /> : (
        <Stack gap={1.5}>
          {(rooms ?? []).map((r) => (
            <Paper key={r.id} variant="outlined" sx={{ p: 2, borderRadius: 2, opacity: r.archived ? 0.6 : 1 }}>
              <Stack direction={{ xs: 'column', md: 'row' }} gap={2} justifyContent="space-between">
                <Box sx={{ minWidth: 0 }}>
                  <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
                    <Typography fontWeight={700}>{r.name}</Typography>
                    <Typography variant="caption" color="text.secondary">/{r.slug}</Typography>
                    {r.archived && <Chip size="small" label="Arşivde" />}
                  </Stack>
                  {r.description && <Typography variant="body2" color="text.secondary">{r.description}</Typography>}
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {r.memberCount} üye · son 7 gün: {r.lastWeek.messages ?? 0} mesaj, {r.lastWeek.writers ?? 0} kişi yazdı,
                    {' '}{r.lastWeek.reports ?? 0} şikâyet
                  </Typography>
                  {r.weeklyHour && (
                    <Typography variant="body2" color="text.secondary">
                      Sohbet saati: {dayLabel(r.weeklyHour.day)} {r.weeklyHour.time.slice(0, 5)}
                      {r.weeklyHour.topic ? ` · ${r.weeklyHour.topic}` : ''}
                    </Typography>
                  )}
                  <Stack direction="row" gap={0.75} flexWrap="wrap" alignItems="center" sx={{ mt: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>Moderatörler:</Typography>
                    {r.moderators.length === 0 && <Typography variant="caption" color="warning.main">henüz yok</Typography>}
                    {r.moderators.map((m) => (
                      <Chip key={m.userId ?? m.name} size="small" label={m.name}
                        avatar={<Avatar src={m.avatarUrl ?? undefined}>{m.name.slice(0, 1)}</Avatar>}
                        disabled={busy === `m-${r.id}-${m.userId}`}
                        onDelete={m.userId ? () => void run(`m-${r.id}-${m.userId}`,
                          () => groupRoomService.removeModerator(r.id, m.userId!), `${m.name} artık moderatör değil.`) : undefined} />
                    ))}
                    <Button size="small" onClick={() => setAddingTo(r)}>Moderatör Ekle</Button>
                  </Stack>
                </Box>
                <Stack direction="row" gap={1} alignItems="flex-start">
                  <Button size="small" variant="outlined" onClick={() => setEditing(r)}>Düzenle</Button>
                  <Button size="small" disabled={busy === `a-${r.id}`}
                    onClick={() => void run(`a-${r.id}`, () => groupRoomService.update(r.id, { archived: !r.archived }),
                      r.archived ? 'Oda yeniden açıldı.' : 'Oda arşive alındı, artık listede görünmüyor.')}>
                    {r.archived ? 'Yeniden Aç' : 'Arşive Al'}
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Stack>
      ))}

      {tab === 'reports' && (reports === null && !error ? <CircularProgress size={24} /> : (
        (reports ?? []).length === 0
          ? <Typography color="text.secondary">Açık şikâyet yok.</Typography>
          : (
            <Stack gap={1.5}>
              {(reports ?? []).map((it) => (
                <Paper key={it.messageId} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap" sx={{ mb: 0.5 }}>
                    <Typography fontWeight={700}>{it.sender?.name ?? 'Adsız'}</Typography>
                    <Typography variant="caption" color="text.secondary">{it.roomName} · {fmt(it.sentAt)}</Typography>
                    <Chip size="small" color={it.reporterCount >= 3 ? 'error' : 'default'}
                      label={`${it.reporterCount} kişi şikâyet etti`} />
                    {it.hidden && <Chip size="small" label="Şu An Gizli" />}
                  </Stack>
                  {it.content && <Typography sx={{ whiteSpace: 'pre-wrap', mb: 1 }}>{it.content}</Typography>}
                  {it.media.length > 0 && (
                    <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 1 }}>
                      {it.media.map((m) => (m.kind === 'IMAGE'
                        ? <Box key={m.id} component="img" src={m.url} alt="" sx={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 1 }} />
                        : <Box key={m.id} component="video" src={m.url} controls sx={{ width: 200, borderRadius: 1 }} />))}
                    </Stack>
                  )}
                  {it.reasons.length > 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Gerekçe: {it.reasons.join(' · ')}</Typography>
                  )}
                  <Stack direction="row" gap={1} flexWrap="wrap">
                    <Button size="small" variant="outlined" disabled={busy === `r-${it.messageId}`}
                      onClick={() => void resolve(it, 'DISMISS')}>Sorun Yok</Button>
                    <Button size="small" variant="contained" disabled={busy === `r-${it.messageId}`}
                      onClick={() => void resolve(it, 'HIDE')}>Gizle</Button>
                    <Button size="small" variant="contained" color="error" disabled={busy === `r-${it.messageId}`}
                      onClick={() => void resolve(it, 'HIDE_AND_SILENCE')}>Gizle ve 24 Saat Sustur</Button>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )
      ))}

      {tab === 'words' && <BlockedWordsPanel />}
      {tab === 'chocolate' && <ChocolatePanel />}

      {editing && (
        <RoomDialog room={editing === 'new' ? null : editing} onClose={() => setEditing(null)}
          onSave={async (req) => {
            try {
              if (editing === 'new') await groupRoomService.create(req);
              else await groupRoomService.update(editing.id, req);
              enqueueSnackbar('Oda kaydedildi.', { variant: 'success' });
              setEditing(null);
              await load();
            } catch (e) { enqueueSnackbar(errorText(e), { variant: 'error' }); }
          }} />
      )}
      {addingTo && (
        <ModeratorDialog room={addingTo} onClose={() => setAddingTo(null)}
          onAdd={async (user) => {
            try {
              await groupRoomService.addModerator(addingTo.id, user.email || user.id);
              enqueueSnackbar(`${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() + ' artık moderatör.', { variant: 'success' });
              setAddingTo(null);
              await load();
            } catch (e) { enqueueSnackbar(errorText(e), { variant: 'error' }); }
          }} />
      )}
    </Box>
  );
}

/**
 * Odalarda yazılamayan kelimeler. Eşleşme tam kelimedir: "sikke" gibi masum kelimeler etkilenmez.
 * Rakamla yazım (s1kt1r), harf uzatma ve araya nokta koyma da yakalanır. Fotoğraflar ayrıca
 * otomatik taranır; uygunsuz görünen fotoğraf odaya hiç düşmez.
 */
function BlockedWordsPanel() {
  const { enqueueSnackbar } = useSnackbar();
  const [words, setWords] = useState<BlockedWord[] | null>(null);
  const [error, setError] = useState('');
  const [input, setInput] = useState('');
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    groupRoomService.blockedWords().then(setWords).catch((e) => setError(errorText(e)));
  }, []);

  const add = async () => {
    if (!input.trim()) return;
    setBusy('add');
    try {
      const before = words?.length ?? 0;
      const next = await groupRoomService.addBlockedWords(input);
      setWords(next);
      setInput('');
      const added = next.length - before;
      enqueueSnackbar(added > 0 ? `${added} kelime eklendi.` : 'Bu kelimeler zaten listede.', { variant: added > 0 ? 'success' : 'info' });
    } catch (e) { enqueueSnackbar(errorText(e), { variant: 'error' }); }
    finally { setBusy(null); }
  };

  const remove = async (w: BlockedWord) => {
    setBusy(`d-${w.id}`);
    try { setWords(await groupRoomService.removeBlockedWord(w.id)); }
    catch (e) { enqueueSnackbar(errorText(e), { variant: 'error' }); }
    finally { setBusy(null); }
  };

  const q = filter.trim().toLocaleLowerCase('tr-TR');
  const shown = (words ?? []).filter((w) => !q || w.word.includes(q));

  return (
    <Stack gap={2} sx={{ maxWidth: 860 }}>
      <Typography variant="body2" color="text.secondary">
        Listedeki bir kelimeyi içeren mesaj gönderilmez, yazan kişiye nedeni söylenir. Yalnız kelimenin kendisi
        yakalanır; içinde geçtiği başka kelimeler etkilenmez. Rakamla yazılışı (s1kt1r), harf uzatma (siktirrr) ve
        harflerin arasına nokta koyma da yakalanır, bunları ayrıca eklemeniz gerekmez. Değişiklik bir dakika içinde
        geçerli olur.
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} alignItems={{ sm: 'flex-start' }}>
        <TextField size="small" fullWidth multiline maxRows={6} label="Eklenecek kelimeler"
          helperText="Virgülle ayırın ya da her satıra bir kelime yazın. İki kelimelik ifade de olur."
          value={input} onChange={(e) => setInput(e.target.value)} />
        <Button variant="contained" disabled={!input.trim() || busy === 'add'} onClick={() => void add()}>Ekle</Button>
      </Stack>
      {words === null && !error ? <CircularProgress size={24} /> : (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2} sx={{ mb: 1.5 }} flexWrap="wrap">
            <Typography fontWeight={700}>{(words ?? []).length} kelime</Typography>
            <TextField size="small" placeholder="Listede ara" value={filter} onChange={(e) => setFilter(e.target.value)} />
          </Stack>
          {shown.length === 0
            ? <Typography color="text.secondary">{q ? 'Bu aramaya uyan kelime yok.' : 'Liste boş.'}</Typography>
            : (
              <Stack direction="row" gap={0.75} flexWrap="wrap">
                {shown.map((w) => (
                  <Chip key={w.id} label={w.word} size="small" disabled={busy === `d-${w.id}`}
                    onDelete={() => void remove(w)} />
                ))}
              </Stack>
            )}
        </Paper>
      )}
    </Stack>
  );
}

/**
 * Çikolata (docs/plan/nartgo-cikolata.md): yalnız toplu sayı, kişi listesi yok. Bağı olmayan
 * birine yazmanın tek yolu çikolata; kabul oranı ve odadan gelen pay bu özelliğin işleyip
 * işlemediğini gösterir.
 */
function ChocolatePanel() {
  const [days, setDays] = useState(7);
  const [stats, setStats] = useState<ChocolateStats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setStats(null);
    groupRoomService.chocolateStats(days).then(setStats).catch((e) => setError(errorText(e)));
  }, [days]);

  const pct = (v: number | null) => (v == null ? '-' : `%${Math.round(v * 100)}`);
  const cells: { label: string; value: string; note?: string }[] = stats ? [
    { label: 'Gönderilen', value: String(stats.sent) },
    { label: 'Kabul edildi', value: String(stats.accepted) },
    { label: 'Kabul edilmedi', value: String(stats.declined) },
    { label: 'Cevapsız kaldı', value: String(stats.expired), note: '14 gün içinde cevap gelmedi' },
    { label: 'Bekliyor', value: String(stats.pending) },
    { label: 'Kabul oranı', value: pct(stats.acceptanceRate), note: 'cevaplananlar içinde' },
    { label: 'Odadan gelen', value: String(stats.fromRoom), note: 'odadan özele geçiş' },
    { label: 'Sık geri çevrilen', value: String(stats.brakedSenders), note: 'son 30 günde 3+ kez' },
  ] : [];

  return (
    <Stack gap={2} sx={{ maxWidth: 860 }}>
      <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
        <Typography variant="body2" color="text.secondary">Dönem:</Typography>
        {[7, 30, 90].map((d) => (
          <Chip key={d} label={`Son ${d} gün`} size="small" color={d === days ? 'primary' : 'default'}
            onClick={() => setDays(d)} />
        ))}
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      {stats === null && !error ? <CircularProgress size={24} /> : stats && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 1.5 }}>
          {cells.map((c) => (
            <Paper key={c.label} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary">{c.label}</Typography>
              <Typography variant="h5" fontWeight={700}>{c.value}</Typography>
              {c.note && <Typography variant="caption" color="text.secondary">{c.note}</Typography>}
            </Paper>
          ))}
        </Box>
      )}
      <Typography variant="body2" color="text.secondary">
        Haftalık hak 3. Son 30 günde 3 kez geri çevrilen ve hakkında şikâyet ya da silinen istek olan kişinin hakkı
        kendiliğinden 1'e iner. Kişi adları burada gösterilmez.
      </Typography>
    </Stack>
  );
}

function RoomDialog({ room, onClose, onSave }: {
  room: AdminRoom | null; onClose: () => void; onSave: (req: AdminRoomRequest) => Promise<void>;
}) {
  const [name, setName] = useState(room?.name ?? '');
  const [slug, setSlug] = useState(room?.slug ?? '');
  const [description, setDescription] = useState(room?.description ?? '');
  const [icon, setIcon] = useState(room?.icon ?? 'chat');
  const [rules, setRules] = useState((room?.rules ?? []).join('\n'));
  const [pinned, setPinned] = useState(room?.pinnedText ?? '');
  const [sortOrder, setSortOrder] = useState(String(room?.sortOrder ?? 60));
  const [hourOn, setHourOn] = useState(!!room?.weeklyHour);
  const [day, setDay] = useState<WeekDay>(room?.weeklyHour?.day ?? 'THURSDAY');
  const [time, setTime] = useState(room?.weeklyHour?.time.slice(0, 5) ?? '21:00');
  const [topic, setTopic] = useState(room?.weeklyHour?.topic ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await onSave({
      name: name.trim(),
      slug: slug.trim(),
      description: description.trim(),
      icon,
      rules: rules.split('\n').map((s) => s.trim()).filter(Boolean),
      pinnedText: pinned.trim(),
      sortOrder: Number(sortOrder) || 0,
      weeklyDay: hourOn ? day : null,
      weeklyTime: hourOn ? `${time}:00` : null,
      weeklyTopic: topic.trim(),
    });
    setSaving(false);
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{room ? `${room.name} odasını düzenle` : 'Yeni oda'}</DialogTitle>
      <DialogContent>
        <Stack gap={2} sx={{ mt: 1 }}>
          <TextField label="Oda adı" value={name} onChange={(e) => setName(e.target.value)} required inputProps={{ maxLength: 80 }} />
          <TextField label="Kısa ad (bağlantıda görünür)" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())}
            helperText="Küçük harf, rakam ve tire. Örnek: muzik-ve-dans" required />
          <TextField label="Kısa açıklama" value={description} onChange={(e) => setDescription(e.target.value)} inputProps={{ maxLength: 300 }} />
          <TextField select label="Simge" value={icon} onChange={(e) => setIcon(e.target.value)}>
            <MenuItem value="chat">Sohbet balonu</MenuItem>
            <MenuItem value="lamp">Lamba</MenuItem>
            <MenuItem value="book">Kitap</MenuItem>
            <MenuItem value="language">Dil</MenuItem>
            <MenuItem value="music">Müzik</MenuItem>
          </TextField>
          <TextField label="Kurallar (her satıra bir kural)" value={rules} onChange={(e) => setRules(e.target.value)} multiline minRows={4} />
          <TextField label="Sabit mesaj" value={pinned} onChange={(e) => setPinned(e.target.value)}
            helperText="Boş bırakırsanız ilk kural sabit mesaj olur." />
          <TextField label="Listedeki sıra" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
          <FormControlLabel control={<Switch checked={hourOn} onChange={(e) => setHourOn(e.target.checked)} />} label="Haftalık sohbet saati" />
          {hourOn && (
            <Stack direction="row" gap={1.5}>
              <TextField select label="Gün" value={day} onChange={(e) => setDay(e.target.value as WeekDay)} sx={{ minWidth: 150 }}>
                {DAYS.map((d) => <MenuItem key={d.value} value={d.value}>{d.label}</MenuItem>)}
              </TextField>
              <TextField label="Saat (Türkiye)" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              <TextField label="Bu haftanın konusu" value={topic} onChange={(e) => setTopic(e.target.value)} sx={{ flex: 1 }} />
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Vazgeç</Button>
        <Button variant="contained" disabled={saving || !name.trim() || !slug.trim()} onClick={() => void save()}>Kaydet</Button>
      </DialogActions>
    </Dialog>
  );
}

function ModeratorDialog({ room, onClose, onAdd }: {
  room: AdminRoom; onClose: () => void; onAdd: (user: UserDTO) => Promise<void>;
}) {
  const [user, setUser] = useState<UserDTO | null>(null);
  const [saving, setSaving] = useState(false);
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{room.name} odasına moderatör ekle</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Moderatör bu odada mesaj gizleyebilir ve kişiyi susturabilir. Adı oda bilgisinde herkese görünür.
          Odaların bir grubun yeri gibi görünmemesi için farklı çevrelerden kişiler seçin.
        </Typography>
        <UserSearchAutocomplete value={user} onChange={setUser} label="Kişi" />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Vazgeç</Button>
        <Button variant="contained" disabled={!user || saving}
          onClick={async () => { if (!user) return; setSaving(true); await onAdd(user); setSaving(false); }}>
          Moderatör Yap
        </Button>
      </DialogActions>
    </Dialog>
  );
}
