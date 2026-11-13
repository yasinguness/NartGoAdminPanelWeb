import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, Paper, Stack, Tab, Table, TableBody, TableCell, TableHead, TableRow, Tabs, TextField, Typography,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { errorText } from '../../services/heritageReviewService';
import {
  VOICE_PROMPT_LABEL, heritageVoiceService, type VoiceDecision, type VoiceMemory, type VoiceStatus,
} from '../../services/heritageVoiceService';

/**
 * Büyüklerden ses kaydı inceleme (yönetici ve Köy Editörü). Kayıt onaylanmadan köy sayfasında görünmez.
 * Reddedilen ve kaldırılan kaydın ses dosyası silinir. Bkz. docs/plan/nartgo-koy-geri-gelme.md
 */
const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

const DONE: Record<VoiceDecision, string> = {
  approve: 'Kayıt yayınlandı.',
  reject: 'Kayıt reddedildi, ses dosyası silindi.',
  remove: 'Kayıt kaldırıldı, ses dosyası silindi.',
};

export default function HeritageVoices() {
  const { enqueueSnackbar } = useSnackbar();
  const [status, setStatus] = useState<VoiceStatus>('pending');
  const [data, setData] = useState<{ items: VoiceMemory[]; pending: number } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try { setData(await heritageVoiceService.queue(status)); setError(''); } catch (e) { setError(errorText(e)); }
  }, [status]);
  useEffect(() => { setData(null); void load(); }, [load]);

  const decide = async (v: VoiceMemory, decision: VoiceDecision) => {
    if (decision !== 'approve' && !window.confirm('Ses dosyası kalıcı olarak silinecek. Devam edilsin mi?')) return;
    setBusy(v.id);
    try {
      await heritageVoiceService.decide(v.id, decision, notes[v.id]?.trim() || undefined);
      enqueueSnackbar(DONE[decision], { variant: 'success' });
      await load();
    } catch (e) {
      enqueueSnackbar(errorText(e), { variant: 'error' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700}>Ses Kayıtları</Typography>
      <Typography color="text.secondary" sx={{ mb: 1, maxWidth: 820 }}>
        Üyelerin köy sayfasına eklediği, büyüklerin anlattığı ses kayıtları. Kayıt siz onaylamadan yayınlanmaz.
        Kaydı dinleyin; köyle ilgili değilse, anlatanın izni şüpheliyse ya da uygunsuz içerik varsa reddedin.
      </Typography>
      <Tabs value={status} onChange={(_, v: VoiceStatus) => setStatus(v)} sx={{ mb: 2 }}>
        <Tab value="pending" label={data && status === 'pending' ? `İnceleme Bekleyen · ${data.pending}` : 'İnceleme Bekleyen'} />
        <Tab value="published" label="Yayındakiler" />
      </Tabs>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {!data && !error && <CircularProgress size={24} />}
      {data && data.items.length === 0 && (
        <Typography color="text.secondary">
          {status === 'pending' ? 'İnceleme bekleyen kayıt yok.' : 'Yayında kayıt yok.'}
        </Typography>
      )}
      {data && data.items.length > 0 && (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Kayıt</TableCell>
                <TableCell>Köy</TableCell>
                <TableCell>Ekleyen</TableCell>
                <TableCell>Karar</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.items.map((v) => (
                <TableRow key={v.id} sx={{ verticalAlign: 'top' }}>
                  <TableCell sx={{ minWidth: 340 }}>
                    <Typography fontWeight={700}>{v.title ?? VOICE_PROMPT_LABEL[v.prompt] ?? v.prompt}</Typography>
                    {v.title && (
                      <Typography variant="body2" color="text.secondary">{VOICE_PROMPT_LABEL[v.prompt] ?? v.prompt}</Typography>
                    )}
                    <Typography variant="body2">Anlatan: {v.narratorName}</Typography>
                    <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 0.5 }}>
                      {clock(v.durationSeconds)}{status === 'published' ? ` · ${v.listens} kişi dinledi` : ''}
                    </Typography>
                    <audio controls preload="none" src={v.audioUrl} style={{ width: '100%', maxWidth: 360 }} />
                  </TableCell>
                  <TableCell>{v.villageName}</TableCell>
                  <TableCell>
                    <Typography variant="body2">{v.authorName ?? 'Silinmiş hesap'}</Typography>
                    {v.authorEmail && <Typography variant="caption" color="text.secondary">{v.authorEmail}</Typography>}
                    <Typography variant="caption" display="block" color="text.secondary">{fmt(v.createdAt)}</Typography>
                  </TableCell>
                  <TableCell sx={{ minWidth: 220 }}>
                    <TextField
                      size="small" fullWidth placeholder="Not (isteğe bağlı)"
                      value={notes[v.id] ?? ''}
                      onChange={(e) => setNotes((n) => ({ ...n, [v.id]: e.target.value }))}
                      sx={{ mb: 1 }}
                    />
                    {status === 'pending' ? (
                      <Stack direction="row" spacing={1}>
                        <Button size="small" variant="contained" disabled={busy === v.id} onClick={() => decide(v, 'approve')}>
                          Yayınla
                        </Button>
                        <Button size="small" color="error" variant="outlined" disabled={busy === v.id} onClick={() => decide(v, 'reject')}>
                          Reddet
                        </Button>
                      </Stack>
                    ) : (
                      <Button size="small" color="error" variant="outlined" disabled={busy === v.id} onClick={() => decide(v, 'remove')}>
                        Kaldır
                      </Button>
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
