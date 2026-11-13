import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { errorText } from '../../services/heritageReviewService';
import {
  ANNOUNCEMENT_KIND_LABEL, heritageAnnouncementService, type ReportedAnnouncement,
} from '../../services/heritageAnnouncementService';

/**
 * Köy duyuruları inceleme (yönetici ve Köy Editörü). Şikâyet alan duyurular; 3 ayrı şikâyette duyuru
 * kendiliğinden gizlenir ve burada en üstte görünür. Bkz. docs/plan/nartgo-koy-geri-gelme.md
 */
const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');

/** Köyün yerel günü ve saati: saat dilimine çevrilmeden yazılır. */
const when = (a: ReportedAnnouncement) => {
  if (!a.eventDate) return '';
  const [y, m, d] = a.eventDate.slice(0, 10).split('-').map(Number);
  const day = new Date(y, m - 1, d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });
  return a.eventTime ? `${day} · ${a.eventTime}` : day;
};

export default function HeritageAnnouncements() {
  const { enqueueSnackbar } = useSnackbar();
  const [data, setData] = useState<{ items: ReportedAnnouncement[]; hidden: number } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try { setData(await heritageAnnouncementService.queue()); setError(''); } catch (e) { setError(errorText(e)); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const decide = async (a: ReportedAnnouncement, decision: 'restore' | 'remove') => {
    setBusy(a.id);
    try {
      await heritageAnnouncementService.decide(a.id, decision, notes[a.id]?.trim() || undefined);
      enqueueSnackbar(decision === 'restore' ? 'Duyuru yeniden yayında.' : 'Duyuru kaldırıldı.', { variant: 'success' });
      await load();
    } catch (e) {
      enqueueSnackbar(errorText(e), { variant: 'error' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700}>Köy Duyuruları</Typography>
      <Typography color="text.secondary" sx={{ mb: 2, maxWidth: 820 }}>
        Şikâyet alan düğün, taziye, mevlit ve şenlik duyuruları. Üç ayrı şikâyet alan duyuru kendiliğinden gizlenir.
        Uygunsa yeniden yayına alın, değilse kaldırın.
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {!data && !error && <CircularProgress size={24} />}
      {data && data.items.length === 0 && (
        <Typography color="text.secondary">Şikâyet alan duyuru yok.</Typography>
      )}
      {data && data.items.length > 0 && (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Duyuru</TableCell>
                <TableCell>Köy</TableCell>
                <TableCell>Ekleyen</TableCell>
                <TableCell>Şikâyet</TableCell>
                <TableCell>Karar</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.items.map((a) => (
                <TableRow key={a.id} sx={{ verticalAlign: 'top' }}>
                  <TableCell sx={{ maxWidth: 360 }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                      <Chip size="small" label={ANNOUNCEMENT_KIND_LABEL[a.kind] ?? a.kind} />
                      {a.status === 'hidden' && <Chip size="small" color="warning" label="Gizlendi" />}
                    </Stack>
                    <Typography fontWeight={700}>{a.title}</Typography>
                    {when(a) && <Typography variant="body2" color="text.secondary">{when(a)}</Typography>}
                    {a.place && <Typography variant="body2" color="text.secondary">{a.place}</Typography>}
                    {a.body && <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>{a.body}</Typography>}
                  </TableCell>
                  <TableCell>{a.villageName}</TableCell>
                  <TableCell>
                    <Typography variant="body2">{a.authorName ?? 'Silinmiş hesap'}</Typography>
                    {a.authorEmail && <Typography variant="caption" color="text.secondary">{a.authorEmail}</Typography>}
                    <Typography variant="caption" display="block" color="text.secondary">{fmt(a.createdAt)}</Typography>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 240 }}>
                    <Typography fontWeight={700}>{a.reports}</Typography>
                    {a.reasons && <Typography variant="body2" color="text.secondary">{a.reasons}</Typography>}
                  </TableCell>
                  <TableCell sx={{ minWidth: 220 }}>
                    <TextField
                      size="small" fullWidth placeholder="Not (isteğe bağlı)"
                      value={notes[a.id] ?? ''}
                      onChange={(e) => setNotes((n) => ({ ...n, [a.id]: e.target.value }))}
                      sx={{ mb: 1 }}
                    />
                    <Stack direction="row" spacing={1}>
                      <Button size="small" variant="outlined" disabled={busy === a.id} onClick={() => decide(a, 'restore')}>
                        Yayına al
                      </Button>
                      <Button size="small" color="error" variant="contained" disabled={busy === a.id} onClick={() => decide(a, 'remove')}>
                        Kaldır
                      </Button>
                    </Stack>
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
