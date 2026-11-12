import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert, Box, Button, Chip, CircularProgress, Paper, Stack, Tab, Table, TableBody, TableCell, TableHead, TableRow, Tabs, TextField, Typography,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { errorText } from '../../services/heritageReviewService';
import { heritageAdminRequestService, heritageEditorService, type AdminRequest, type EditorActionSummary } from '../../services/heritageEditorService';

/**
 * Köy Editörü masası (yalnız yönetici). Editörün yöneticiye gönderdiği kararlar ve editör hareketleri.
 * Talep, hedef başka yoldan karara bağlanınca (öneri onaylandı, çift birleştirildi, köy kaldırıldı) kendiliğinden kapanır.
 * Bkz. docs/plan/nartgo-koy-editoru.md, Faz 4.
 */
const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');

const KIND_LABEL: Record<AdminRequest['kind'], string> = {
  contribution: 'Teyitli Kaydı Kaldırma',
  family_merge: 'Halklar Arası Birleştirme',
  village_remove: 'Köyü Kaldırma',
};

const targetLink = (r: AdminRequest) => {
  if (r.kind === 'family_merge') return '/heritage/families?tab=3';
  if (!r.villageId) return null;
  return `/heritage/villages?village=${r.villageId}${r.kind === 'contribution' ? '&tab=katki' : ''}`;
};

/** Editör hareketinin yolu (ör. /village-desk/<id>/contributions/<id>) okunur bir eyleme çevrilir. */
const actionLabel = (method: string, path: string) => {
  const p = path.replace(/^\/api\/v1\/auth\/heritage\/admin/, '');
  if (/^\/village-desk\/?$/.test(p) && method === 'POST') return 'Yeni köy ekledi';
  if (/\/contributions\/[^/]+$/.test(p)) return 'Öneriye karar verdi';
  if (/\/community\//.test(p)) return 'Topluluk kaydına karar verdi';
  if (/\/tasks\//.test(p)) return 'Köy sorusuna karar verdi';
  if (/\/names/.test(p)) return method === 'DELETE' ? 'Ad kaldırdı' : 'Ad ekledi';
  if (/\/families\/merge/.test(p)) return 'Sülale birleştirme kararı';
  if (/\/families/.test(p) && /village-desk/.test(p)) return method === 'DELETE' ? 'Köyden sülale kaldırdı' : 'Köye sülale ekledi';
  if (/^\/village-desk\/[^/]+$/.test(p) && method === 'PUT') return 'Köy bilgisini düzenledi';
  if (/\/locations/.test(p)) return 'Konum kararı';
  if (/^\/requests/.test(p)) return 'Yöneticiye gönderdi';
  return `${method} ${p}`;
};

export default function HeritageEditorDesk() {
  const [tab, setTab] = useState(() => (new URLSearchParams(window.location.search).get('tab') === '1' ? 1 : 0));
  return (
    <Box>
      <Typography variant="h5" fontWeight={700}>Köy Editörü Masası</Typography>
      <Typography color="text.secondary" sx={{ mb: 2, maxWidth: 820 }}>
        Köy Editörünün yetkisi dışında kalıp size gönderdiği kararlar ve editörün Ortak Hafıza'da yaptığı değişiklikler.
        Kaydı açıp kararı verdiğinizde talep kendiliğinden kapanır.
      </Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Size gönderilenler" />
        <Tab label="Editör hareketleri" />
      </Tabs>
      {tab === 0 ? <RequestsPanel /> : <ActionsPanel />}
    </Box>
  );
}

function RequestsPanel() {
  const { enqueueSnackbar } = useSnackbar();
  const [status, setStatus] = useState<'open' | 'closed'>('open');
  const [data, setData] = useState<{ items: AdminRequest[]; open: number } | null>(null);
  const [error, setError] = useState('');
  const [declining, setDeclining] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setData(await heritageAdminRequestService.list(status)); setError(''); } catch (e) { setError(errorText(e)); }
  }, [status]);
  useEffect(() => { void load(); }, [load]);

  const resolve = async (r: AdminRequest, s: 'done' | 'declined') => {
    setBusy(true);
    try {
      await heritageAdminRequestService.resolve(r.id, s, s === 'declined' ? note.trim() : '');
      enqueueSnackbar(s === 'done' ? 'Talep kapatıldı.' : 'Geri çevrildi; editör nedeni görecek.', { variant: 'success' });
      setDeclining(null); setNote('');
      await load();
    } catch (e) { enqueueSnackbar(errorText(e), { variant: 'error' }); } finally { setBusy(false); }
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1}>
        <Chip label={`Açık${data ? ` (${data.open})` : ''}`} color={status === 'open' ? 'primary' : 'default'} onClick={() => setStatus('open')} />
        <Chip label="Kapananlar" color={status === 'closed' ? 'primary' : 'default'} onClick={() => setStatus('closed')} />
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      {!data && !error && <CircularProgress />}
      {data && data.items.length === 0 && (
        <Typography color="text.secondary">{status === 'open' ? 'Size gönderilmiş açık talep yok.' : 'Kapanmış talep yok.'}</Typography>
      )}
      {data?.items.map((r) => {
        const link = targetLink(r);
        return (
          <Paper key={r.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Chip size="small" variant="outlined" color={r.kind === 'village_remove' ? 'error' : 'warning'} label={KIND_LABEL[r.kind]} />
              <Typography fontWeight={700} sx={{ flex: 1 }}>{r.title}</Typography>
              {r.status !== 'open' && <Chip size="small" label={r.status === 'done' ? 'Kapandı' : 'Geri Çevrildi'} />}
              <Typography variant="caption" color="text.secondary">{fmt(r.createdAt)}</Typography>
            </Stack>
            <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>“{r.note}”</Typography>
            <Typography variant="caption" color="text.secondary">{r.requestedEmail ?? 'Köy Editörü'}</Typography>
            {r.kind === 'family_merge' && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Sülale numaraları: {r.target.replace(':', ' ve ')}. Birleştirme masasında bu çifti bulup karar verin.
              </Typography>
            )}
            {r.resolvedNote && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Sonuç: {r.resolvedNote} · {fmt(r.resolvedAt)}</Typography>}
            {r.status === 'open' && (declining === r.id ? (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1.5 }}>
                <TextField size="small" fullWidth autoFocus label="Neden geri çeviriyorsunuz? (editör görecek)" value={note} onChange={(e) => setNote(e.target.value)} />
                <Button size="small" variant="contained" color="error" disabled={busy || !note.trim()} onClick={() => void resolve(r, 'declined')}>Geri çevir</Button>
                <Button size="small" disabled={busy} onClick={() => { setDeclining(null); setNote(''); }}>Vazgeç</Button>
              </Stack>
            ) : (
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                {link && <Button size="small" variant="contained" component={RouterLink} to={link}>Kaydı aç</Button>}
                <Button size="small" disabled={busy} onClick={() => void resolve(r, 'done')}>Kapat</Button>
                <Button size="small" color="error" disabled={busy} onClick={() => setDeclining(r.id)}>Geri çevir</Button>
              </Stack>
            ))}
          </Paper>
        );
      })}
    </Stack>
  );
}

function ActionsPanel() {
  const [data, setData] = useState<EditorActionSummary | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { heritageEditorService.actions().then(setData).catch((e) => setError(errorText(e))); }, []);
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return <CircularProgress />;
  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1.5}>
        <Paper variant="outlined" sx={{ p: 1.5, minWidth: 180 }}>
          <Typography variant="body2" color="text.secondary">Son 24 saatte değişiklik</Typography>
          <Typography variant="h5" fontWeight={700}>{data.last24h}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 1.5, minWidth: 180 }}>
          <Typography variant="body2" color="text.secondary">Son 7 günde eklenen köy</Typography>
          <Typography variant="h5" fontWeight={700}>{data.newVillages7d}</Typography>
        </Paper>
      </Stack>
      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow><TableCell>Zaman</TableCell><TableCell>Editör</TableCell><TableCell>Eylem</TableCell><TableCell>Sonuç</TableCell></TableRow>
          </TableHead>
          <TableBody>
            {data.recent.length === 0 && <TableRow><TableCell colSpan={4} align="center" sx={{ py: 3, color: 'text.secondary' }}>Henüz editör hareketi yok.</TableCell></TableRow>}
            {data.recent.map((a, i) => (
              <TableRow key={i}>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmt(a.createdAt)}</TableCell>
                <TableCell>{a.actorEmail ?? '–'}</TableCell>
                <TableCell title={a.path}>{actionLabel(a.method, a.path)}</TableCell>
                <TableCell>{a.status < 400 ? 'Uygulandı' : <Typography variant="body2" color="error.main">Reddedildi ({a.status})</Typography>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
      <Typography variant="caption" color="text.secondary">Son 50 hareket gösterilir. Yöneticinin kendi kararları burada yer almaz.</Typography>
    </Stack>
  );
}
