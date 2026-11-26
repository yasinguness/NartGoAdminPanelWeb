import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel,
  IconButton, MenuItem, Paper, Stack, Switch, TextField, Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useSnackbar } from 'notistack';
import { errorText } from '../../services/heritageReviewService';
import {
  groupRoomService, type AdminComment, type AdminRoom, type AdminTopic, type ResolveAction, type RoomMedia,
  type TopicAction, type TopicReportItem, type TopicRequest,
} from '../../services/groupRoomService';

/**
 * Odalarda konu ve yorum (docs/plan/nartgo-sohbet-odalari.md v0.5). Konuyu yönetici buradan açar; varsayılan
 * olarak "NartGo" adıyla görünür. Haftanın Sorusu oda başına tektir, yenisi seçilince eskisi düşer.
 */

const fmt = (iso: string | null) => (iso
  ? new Date(iso).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  : '');

/** datetime-local alanı yerel saat ister; sunucu ISO (UTC) bekler. */
const toLocalInput = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function RoomFilter({ rooms, value, onChange, allLabel = 'Bütün odalar' }: {
  rooms: AdminRoom[]; value: number | ''; onChange: (v: number | '') => void; allLabel?: string;
}) {
  return (
    <TextField select size="small" label="Oda" value={value} sx={{ minWidth: 220 }}
      onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}>
      <MenuItem value="">{allLabel}</MenuItem>
      {rooms.map((r) => <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>)}
    </TextField>
  );
}

function MediaRow({ media, size = 96 }: { media: RoomMedia[]; size?: number }) {
  if (media.length === 0) return null;
  return (
    <Stack direction="row" gap={1} flexWrap="wrap" sx={{ my: 1 }}>
      {media.map((m) => (m.kind === 'IMAGE'
        ? <Box key={m.id} component="img" src={m.url} alt="" sx={{ width: size, height: size, objectFit: 'cover', borderRadius: 1 }} />
        : <Box key={m.id} component="video" src={m.url} controls sx={{ width: size * 2, borderRadius: 1 }} />))}
    </Stack>
  );
}

// ── Konular ──────────────────────────────────────────────────────

export function TopicsPanel({ rooms, roomId, onRoomChange, onShowComments }: {
  rooms: AdminRoom[];
  roomId: number | '';
  onRoomChange: (v: number | '') => void;
  onShowComments: (topic: AdminTopic) => void;
}) {
  const { enqueueSnackbar } = useSnackbar();
  const [topics, setTopics] = useState<AdminTopic[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminTopic | 'new' | null>(null);

  const load = useCallback(async () => {
    try {
      setTopics(await groupRoomService.topics(roomId === '' ? undefined : roomId));
      setError('');
    } catch (e) { setError(errorText(e)); }
  }, [roomId]);
  useEffect(() => { setTopics(null); void load(); }, [load]);

  const act = async (t: AdminTopic, action: TopicAction, done: string) => {
    if (action === 'DELETE' && !window.confirm(`"${t.title}" konusu ve yorumları uygulamadan kalkacak. Silinsin mi?`)) return;
    setBusy(`${t.id}-${action}`);
    try { await groupRoomService.topicAction(t.id, action); enqueueSnackbar(done, { variant: 'success' }); await load(); }
    catch (e) { enqueueSnackbar(errorText(e), { variant: 'error' }); }
    finally { setBusy(null); }
  };

  const roomName = (id: number) => rooms.find((r) => r.id === id)?.name ?? '';

  return (
    <Stack gap={2}>
      <Stack direction="row" gap={1.5} alignItems="center" flexWrap="wrap">
        <RoomFilter rooms={rooms} value={roomId} onChange={onRoomChange} />
        <Button variant="contained" onClick={() => setEditing('new')} disabled={rooms.length === 0}>Konu Ekle</Button>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 860 }}>
        Odaya giren kişi önce Haftanın Sorusu'nu, sonra konuları görür. Hiç konusu olmayan bir odayı açmadan önce en az
        bir konu ekleyin. Konu varsayılan olarak "NartGo" adıyla yayınlanır.
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {topics === null && !error ? <CircularProgress size={24} /> : (topics ?? []).length === 0 ? (
        <Typography color="text.secondary">{roomId === '' ? 'Henüz konu yok.' : `${roomName(roomId)} odasında henüz konu yok.`}</Typography>
      ) : (
        <Stack gap={1.5}>
          {(topics ?? []).map((t) => (
            <Paper key={t.id} variant="outlined" sx={{ p: 2, borderRadius: 2, opacity: t.status === 'HIDDEN' ? 0.6 : 1 }}>
              <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap" sx={{ mb: 0.5 }}>
                <Typography fontWeight={700}>{t.title}</Typography>
                {t.featuredUntil && <Chip size="small" color="primary" label={`Haftanın Sorusu · ${fmt(t.featuredUntil)} Bitiyor`} />}
                {t.pinned && <Chip size="small" label="Sabit" />}
                {t.commentsClosed && <Chip size="small" label="Yoruma Kapalı" />}
                {t.status === 'HIDDEN' && <Chip size="small" color="warning" label="Gizli" />}
                {t.status === 'SCHEDULED' && <Chip size="small" color="info" label={`Yayın ${fmt(t.publishAt)}`} />}
              </Stack>
              <Typography variant="caption" color="text.secondary">
                {t.roomName} · {t.authorLabel ?? t.author?.name ?? ''} · {fmt(t.createdAt)} · {t.commentCount} yorum
              </Typography>
              {t.body && (
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 1, display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {t.body}
                </Typography>
              )}
              <MediaRow media={t.media} size={80} />
              {t.lastCommentPreview && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Son yorum: {t.lastCommentPreview}</Typography>
              )}
              <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 1.5 }}>
                <Button size="small" variant="outlined" onClick={() => setEditing(t)}>Düzenle</Button>
                <Button size="small" onClick={() => onShowComments(t)}>Yorumlar ({t.commentCount})</Button>
                {t.featuredUntil
                  ? <Button size="small" disabled={!!busy} onClick={() => void act(t, 'UNFEATURE', 'Haftanın Sorusu kaldırıldı.')}>Haftanın Sorusu Olmasın</Button>
                  : <Button size="small" disabled={!!busy} onClick={() => void act(t, 'FEATURE', 'Konu 7 gün Haftanın Sorusu.')}>Haftanın Sorusu Yap</Button>}
                <Button size="small" disabled={!!busy} onClick={() => void act(t, t.pinned ? 'UNPIN' : 'PIN', t.pinned ? 'Sabitleme kaldırıldı.' : 'Konu sabitlendi.')}>
                  {t.pinned ? 'Sabitlemeyi Kaldır' : 'Sabitle'}
                </Button>
                <Button size="small" disabled={!!busy} onClick={() => void act(t, t.commentsClosed ? 'OPEN' : 'CLOSE', t.commentsClosed ? 'Konu yoruma açıldı.' : 'Konu yoruma kapatıldı.')}>
                  {t.commentsClosed ? 'Yoruma Aç' : 'Yoruma Kapat'}
                </Button>
                <Button size="small" disabled={!!busy} onClick={() => void act(t, t.status === 'HIDDEN' ? 'UNHIDE' : 'HIDE', t.status === 'HIDDEN' ? 'Konu yeniden görünür.' : 'Konu gizlendi.')}>
                  {t.status === 'HIDDEN' ? 'Göster' : 'Gizle'}
                </Button>
                <Button size="small" color="error" disabled={!!busy} onClick={() => void act(t, 'DELETE', 'Konu silindi.')}>Sil</Button>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
      {editing && (
        <TopicDialog rooms={rooms} topic={editing === 'new' ? null : editing}
          defaultRoomId={roomId === '' ? rooms[0]?.id : roomId}
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await load(); }} />
      )}
    </Stack>
  );
}

function TopicDialog({ rooms, topic, defaultRoomId, onClose, onSaved }: {
  rooms: AdminRoom[]; topic: AdminTopic | null; defaultRoomId: number | undefined; onClose: () => void; onSaved: () => Promise<void>;
}) {
  const { enqueueSnackbar } = useSnackbar();
  const [roomId, setRoomId] = useState<number | ''>(topic?.roomId ?? defaultRoomId ?? '');
  const [title, setTitle] = useState(topic?.title ?? '');
  const [body, setBody] = useState(topic?.body ?? '');
  const [media, setMedia] = useState<RoomMedia[]>(topic?.media ?? []);
  const [showAuthor, setShowAuthor] = useState(topic ? topic.authorLabel === null : false);
  const [authorLabel, setAuthorLabel] = useState(topic?.authorLabel ?? 'NartGo');
  const [pinned, setPinned] = useState(topic?.pinned ?? false);
  const [featured, setFeatured] = useState(!!topic?.featuredUntil);
  const [featuredDays, setFeaturedDays] = useState('7');
  const [commentsClosed, setCommentsClosed] = useState(topic?.commentsClosed ?? false);
  const [publishAt, setPublishAt] = useState(toLocalInput(topic?.publishAt ?? null));
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = async (files: FileList | null) => {
    if (!files || roomId === '') return;
    setUploading(true);
    try {
      for (const f of Array.from(files).slice(0, 10 - media.length)) {
        const m = await groupRoomService.uploadTopicImage(roomId, f);
        setMedia((cur) => [...cur, { id: m.id, kind: 'IMAGE', url: m.url }]);
      }
    } catch (e) { enqueueSnackbar(errorText(e), { variant: 'error' }); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const save = async () => {
    if (roomId === '') return;
    setSaving(true);
    const req: TopicRequest = {
      title: title.trim(),
      body: body.trim(),
      mediaIds: media.map((m) => m.id),
      pinned,
      commentsClosed,
      showAuthor,
      authorLabel: authorLabel.trim(),
      publishAt: publishAt ? new Date(publishAt).toISOString() : null,
    };
    // Haftanın Sorusu: açılırsa gün sayısı, kapatılırsa 0; dokunulmadıysa gönderilmez (bitiş tarihi korunur).
    if (featured && !topic?.featuredUntil) req.featuredDays = Number(featuredDays) || 7;
    if (!featured && topic?.featuredUntil) req.featuredDays = 0;
    try {
      if (topic) await groupRoomService.updateTopic(topic.id, req);
      else await groupRoomService.createTopic(roomId, req);
      enqueueSnackbar(topic ? 'Konu kaydedildi.' : 'Konu eklendi.', { variant: 'success' });
      await onSaved();
    } catch (e) { enqueueSnackbar(errorText(e), { variant: 'error' }); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{topic ? 'Konuyu düzenle' : 'Yeni konu'}</DialogTitle>
      <DialogContent>
        <Stack gap={2} sx={{ mt: 1 }}>
          <TextField select label="Oda" value={roomId} disabled={!!topic} required
            onChange={(e) => { setRoomId(Number(e.target.value)); setMedia([]); }}>
            {rooms.map((r) => <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>)}
          </TextField>
          <TextField label="Başlık" value={title} onChange={(e) => setTitle(e.target.value)} required
            inputProps={{ maxLength: 120 }} helperText={`${title.length}/120 · Soru biçiminde başlık daha çok yorum alır.`} />
          <TextField label="Metin" value={body} onChange={(e) => setBody(e.target.value)} multiline minRows={5}
            inputProps={{ maxLength: 4000 }} helperText={`${body.length}/4.000`} />
          <Box>
            <Stack direction="row" gap={1} alignItems="center">
              <Button size="small" variant="outlined" disabled={uploading || media.length >= 10 || roomId === ''}
                onClick={() => fileRef.current?.click()}>
                {uploading ? 'Yükleniyor' : 'Fotoğraf Ekle'}
              </Button>
              <Typography variant="caption" color="text.secondary">{media.length}/10 fotoğraf</Typography>
              <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => void upload(e.target.files)} />
            </Stack>
            {media.length > 0 && (
              <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 1 }}>
                {media.map((m) => (
                  <Box key={m.id} sx={{ position: 'relative' }}>
                    <Box component="img" src={m.url} alt="" sx={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 1 }} />
                    <IconButton size="small" aria-label="Fotoğrafı kaldır"
                      onClick={() => setMedia((cur) => cur.filter((x) => x.id !== m.id))}
                      sx={{ position: 'absolute', top: 2, right: 2, bgcolor: 'background.paper', '&:hover': { bgcolor: 'background.paper' } }}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
          <FormControlLabel control={<Switch checked={showAuthor} onChange={(e) => setShowAuthor(e.target.checked)} />}
            label="Kendi adımla yayınla" />
          {!showAuthor && (
            <TextField label="Görünecek ad" value={authorLabel} onChange={(e) => setAuthorLabel(e.target.value)}
              inputProps={{ maxLength: 60 }} helperText="Boş bırakırsanız NartGo yazar." />
          )}
          <Stack direction="row" gap={2} alignItems="center" flexWrap="wrap">
            <FormControlLabel control={<Switch checked={featured} onChange={(e) => setFeatured(e.target.checked)} />}
              label="Haftanın Sorusu" />
            {featured && !topic?.featuredUntil && (
              <TextField size="small" type="number" label="Kaç gün" value={featuredDays}
                onChange={(e) => setFeaturedDays(e.target.value)} sx={{ width: 120 }} inputProps={{ min: 1, max: 60 }} />
            )}
          </Stack>
          {featured && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: -1.5 }}>
              Odanın en üstünde durur. Odada başka bir Haftanın Sorusu varsa o düşer.
            </Typography>
          )}
          <FormControlLabel control={<Switch checked={pinned} onChange={(e) => setPinned(e.target.checked)} />} label="Konuyu sabitle" />
          <FormControlLabel control={<Switch checked={commentsClosed} onChange={(e) => setCommentsClosed(e.target.checked)} />} label="Yoruma kapalı" />
          <TextField label="Yayın zamanı" type="datetime-local" value={publishAt} onChange={(e) => setPublishAt(e.target.value)}
            InputLabelProps={{ shrink: true }} helperText="Boş bırakırsanız hemen yayınlanır." />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Vazgeç</Button>
        <Button variant="contained" disabled={saving || uploading || !title.trim() || roomId === ''} onClick={() => void save()}>
          {topic ? 'Kaydet' : 'Yayınla'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Yorumlar ─────────────────────────────────────────────────────

export function CommentsPanel({ rooms, roomId, onRoomChange, topic, onClearTopic }: {
  rooms: AdminRoom[];
  roomId: number | '';
  onRoomChange: (v: number | '') => void;
  topic: { id: number; title: string } | null;
  onClearTopic: () => void;
}) {
  const { enqueueSnackbar } = useSnackbar();
  const [items, setItems] = useState<AdminComment[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await groupRoomService.comments(topic ? { topicId: topic.id } : { roomId: roomId === '' ? undefined : roomId }));
      setError('');
    } catch (e) { setError(errorText(e)); }
  }, [roomId, topic]);
  useEffect(() => { setItems(null); void load(); }, [load]);

  const toggle = async (c: AdminComment) => {
    setBusy(c.id);
    try {
      if (c.hidden) await groupRoomService.unhideComment(c.id); else await groupRoomService.hideComment(c.id);
      enqueueSnackbar(c.hidden ? 'Yorum yeniden görünür.' : 'Yorum gizlendi.', { variant: 'success' });
      await load();
    } catch (e) { enqueueSnackbar(errorText(e), { variant: 'error' }); }
    finally { setBusy(null); }
  };

  return (
    <Stack gap={2}>
      <Stack direction="row" gap={1.5} alignItems="center" flexWrap="wrap">
        {topic
          ? <Chip label={`Konu: ${topic.title}`} onDelete={onClearTopic} />
          : <RoomFilter rooms={rooms} value={roomId} onChange={onRoomChange} />}
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      {items === null && !error ? <CircularProgress size={24} /> : (items ?? []).length === 0 ? (
        <Typography color="text.secondary">Henüz yorum yok.</Typography>
      ) : (
        <Stack gap={1}>
          {(items ?? []).map((c) => (
            <Paper key={c.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2, opacity: c.hidden ? 0.6 : 1 }}>
              <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
                <Typography fontWeight={700} variant="body2">{c.sender?.name ?? 'Adsız'}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {c.roomName} · {c.topicTitle} · {fmt(c.createdAt)}{c.replyToId ? ' · yanıt' : ''}
                </Typography>
                {c.hidden && <Chip size="small" color="warning" label="Gizli" />}
                <Box sx={{ flex: 1 }} />
                <Button size="small" disabled={busy === c.id} onClick={() => void toggle(c)}>{c.hidden ? 'Göster' : 'Gizle'}</Button>
              </Stack>
              {c.content && <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 0.5 }}>{c.content}</Typography>}
              <MediaRow media={c.media} size={72} />
            </Paper>
          ))}
        </Stack>
      )}
    </Stack>
  );
}

// ── Konu ve yorum şikâyetleri ────────────────────────────────────

export function TopicReportsPanel({ onCount }: { onCount?: (n: number) => void }) {
  const { enqueueSnackbar } = useSnackbar();
  const [items, setItems] = useState<TopicReportItem[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const list = await groupRoomService.topicReports();
      setItems(list);
      onCount?.(list.length);
      setError('');
    } catch (e) { setError(errorText(e)); }
  }, [onCount]);
  useEffect(() => { void load(); }, [load]);

  const resolve = async (it: TopicReportItem, action: ResolveAction) => {
    const key = `${it.kind}-${it.targetId}`;
    setBusy(key);
    try {
      await groupRoomService.resolveTopicReport(it.kind, it.targetId, action, action === 'HIDE_AND_SILENCE' ? 24 : undefined);
      enqueueSnackbar(action === 'DISMISS' ? 'Yeniden görünür, şikâyetler kapandı.'
        : action === 'HIDE' ? 'Gizlendi.' : 'Gizlendi, kişi bu odada 24 saat yazamayacak.', { variant: 'success' });
      await load();
    } catch (e) { enqueueSnackbar(errorText(e), { variant: 'error' }); }
    finally { setBusy(null); }
  };

  if (error) return <Alert severity="error">{error}</Alert>;
  if (items === null) return <CircularProgress size={24} />;
  if (items.length === 0) return <Typography color="text.secondary">Konu ve yorumlarda açık şikâyet yok.</Typography>;
  return (
    <Stack gap={1.5}>
      {items.map((it) => {
        const key = `${it.kind}-${it.targetId}`;
        return (
          <Paper key={key} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap" sx={{ mb: 0.5 }}>
              <Chip size="small" label={it.kind === 'TOPIC' ? 'Konu' : 'Yorum'} />
              <Typography fontWeight={700}>{it.sender?.name ?? 'Adsız'}</Typography>
              <Typography variant="caption" color="text.secondary">{it.roomName} · {it.topicTitle} · {fmt(it.createdAt)}</Typography>
              <Chip size="small" color={it.reporterCount >= 3 ? 'error' : 'default'} label={`${it.reporterCount} kişi şikâyet etti`} />
              {it.hidden && <Chip size="small" label="Şu An Gizli" />}
            </Stack>
            {it.content && <Typography sx={{ whiteSpace: 'pre-wrap', mb: 1 }}>{it.content}</Typography>}
            <MediaRow media={it.media} size={120} />
            {it.reasons.length > 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Gerekçe: {it.reasons.join(' · ')}</Typography>
            )}
            <Stack direction="row" gap={1} flexWrap="wrap">
              <Button size="small" variant="outlined" disabled={busy === key} onClick={() => void resolve(it, 'DISMISS')}>Sorun Yok</Button>
              <Button size="small" variant="contained" disabled={busy === key} onClick={() => void resolve(it, 'HIDE')}>Gizle</Button>
              <Button size="small" variant="contained" color="error" disabled={busy === key}
                onClick={() => void resolve(it, 'HIDE_AND_SILENCE')}>Gizle ve 24 Saat Sustur</Button>
            </Stack>
          </Paper>
        );
      })}
    </Stack>
  );
}
