import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, Paper, Stack, Tab, Table, TableBody, TableCell, TableHead, TableRow, Tabs, TextField, Typography,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { errorText } from '../../services/heritageReviewService';
import {
  heritagePhotoService, type ArchivePhoto, type PhotoDecision, type PhotoQueue,
} from '../../services/heritagePhotoService';

/**
 * Eski fotoğraf arşivi inceleme (yönetici ve Köy Editörü). Fotoğraf onaylanmadan köy sayfasında görünmez.
 * Reddedilen ve kaldırılan fotoğrafın dosyası silinir. Bkz. docs/plan/nartgo-koy-geri-gelme.md
 */
const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');

const DONE: Record<PhotoDecision, string> = {
  approve: 'Fotoğraf yayınlandı.',
  reject: 'Fotoğraf reddedildi, dosya silindi.',
  remove: 'Fotoğraf kaldırıldı, dosya silindi.',
  keep: 'Fotoğraf yeniden yayında.',
  clear_names: 'İsim önerileri silindi.',
};
const DESTRUCTIVE: Partial<Record<PhotoDecision, string>> = {
  reject: 'Fotoğraf dosyası kalıcı olarak silinecek. Devam edilsin mi?',
  remove: 'Fotoğraf dosyası kalıcı olarak silinecek. Devam edilsin mi?',
  clear_names: 'Bu fotoğrafın bütün isim önerileri silinecek. Devam edilsin mi?',
};

export default function HeritagePhotos() {
  const { enqueueSnackbar } = useSnackbar();
  const [status, setStatus] = useState<PhotoQueue>('pending');
  const [data, setData] = useState<{ items: ArchivePhoto[]; pending: number; requested: number } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try { setData(await heritagePhotoService.queue(status)); setError(''); } catch (e) { setError(errorText(e)); }
  }, [status]);
  useEffect(() => { setData(null); void load(); }, [load]);

  const decide = async (p: ArchivePhoto, decision: PhotoDecision) => {
    const warning = DESTRUCTIVE[decision];
    if (warning && !window.confirm(warning)) return;
    setBusy(p.id);
    try {
      await heritagePhotoService.decide(p.id, decision, notes[p.id]?.trim() || undefined);
      enqueueSnackbar(DONE[decision], { variant: 'success' });
      await load();
    } catch (e) {
      enqueueSnackbar(errorText(e), { variant: 'error' });
    } finally {
      setBusy(null);
    }
  };

  const empty: Record<PhotoQueue, string> = {
    pending: 'İnceleme bekleyen fotoğraf yok.',
    requested: 'Kaldırma talebi alan fotoğraf yok.',
    published: 'Yayında fotoğraf yok.',
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700}>Arşiv Fotoğrafları</Typography>
      <Typography color="text.secondary" sx={{ mb: 1, maxWidth: 820 }}>
        Üyelerin köy arşivine eklediği eski fotoğraflar ile düğün, şenlik ve bayram albümü fotoğrafları. Fotoğraf siz
        onaylamadan yayınlanmaz; yalnız güvenilir katkıcının albüm fotoğrafı doğrudan yayınlanır ve "Yayındakiler" sekmesinde görünür. Köyle ilgili değilse,
        yaşayan kişilerin izni şüpheliyse ya da uygunsuzsa reddedin. Fotoğraftaki kişi ya da yakını kaldırılmasını
        isterse fotoğraf hemen gizlenir ve "Kaldırma Talebi" sekmesine düşer; kaldırın ya da yeniden yayına alın.
      </Typography>
      <Tabs value={status} onChange={(_, v: PhotoQueue) => setStatus(v)} sx={{ mb: 2 }}>
        <Tab value="pending" label={data ? `İnceleme Bekleyen · ${data.pending}` : 'İnceleme Bekleyen'} />
        <Tab value="requested" label={data ? `Kaldırma Talebi · ${data.requested}` : 'Kaldırma Talebi'} />
        <Tab value="published" label="Yayındakiler" />
      </Tabs>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {!data && !error && <CircularProgress size={24} />}
      {data && data.items.length === 0 && <Typography color="text.secondary">{empty[status]}</Typography>}
      {data && data.items.length > 0 && (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Fotoğraf</TableCell>
                <TableCell>Bilgi</TableCell>
                <TableCell>Ekleyen</TableCell>
                <TableCell>Karar</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.items.map((p) => (
                <TableRow key={p.id} sx={{ verticalAlign: 'top' }}>
                  <TableCell sx={{ width: 240 }}>
                    <a href={p.imageUrl} target="_blank" rel="noreferrer">
                      <Box component="img" src={p.imageUrl} alt={p.caption ?? 'Eski fotoğraf'} loading="lazy"
                        sx={{ width: 220, maxHeight: 220, objectFit: 'contain', borderRadius: 1, bgcolor: 'action.hover', display: 'block' }} />
                    </a>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 340 }}>
                    <Typography fontWeight={700}>{p.villageName}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {p.albumTitle ? `Albüm: ${p.albumTitle}` : 'Eski fotoğraf'}{p.status === 'hidden' ? ' · şu an gizli' : ''}
                    </Typography>
                    {p.caption && <Typography variant="body2">{p.caption}</Typography>}
                    {p.year && <Typography variant="body2" color="text.secondary">Yaklaşık {p.year}</Typography>}
                    {p.names && (
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        <b>İsim önerileri:</b> {p.names}
                      </Typography>
                    )}
                    {p.removalRequests > 0 && (
                      <Alert severity="warning" sx={{ mt: 1, py: 0 }}>
                        {p.removalRequests} kaldırma talebi{p.removalReasons ? `: ${p.removalReasons}` : ''}
                      </Alert>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{p.authorName ?? 'Silinmiş hesap'}</Typography>
                    {p.authorEmail && <Typography variant="caption" color="text.secondary">{p.authorEmail}</Typography>}
                    <Typography variant="caption" display="block" color="text.secondary">{fmt(p.createdAt)}</Typography>
                  </TableCell>
                  <TableCell sx={{ minWidth: 240 }}>
                    <TextField
                      size="small" fullWidth placeholder="Not (isteğe bağlı)"
                      value={notes[p.id] ?? ''}
                      onChange={(e) => setNotes((n) => ({ ...n, [p.id]: e.target.value }))}
                      sx={{ mb: 1 }}
                    />
                    {p.status === 'pending' ? (
                      <Stack direction="row" spacing={1}>
                        <Button size="small" variant="contained" disabled={busy === p.id} onClick={() => decide(p, 'approve')}>Yayınla</Button>
                        <Button size="small" color="error" variant="outlined" disabled={busy === p.id} onClick={() => decide(p, 'reject')}>Reddet</Button>
                      </Stack>
                    ) : (
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Button size="small" color="error" variant="outlined" disabled={busy === p.id} onClick={() => decide(p, 'remove')}>Kaldır</Button>
                        {p.removalRequests > 0 && (
                          <Button size="small" variant="outlined" disabled={busy === p.id} onClick={() => decide(p, 'keep')}>Yeniden Yayınla</Button>
                        )}
                        {p.names && (
                          <Button size="small" variant="text" disabled={busy === p.id} onClick={() => decide(p, 'clear_names')}>İsimleri Sil</Button>
                        )}
                      </Stack>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
  );
}
