import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Pagination,
  Paper,
  Select,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import BlockIcon from '@mui/icons-material/Block';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import RestoreIcon from '@mui/icons-material/Restore';
import EditIcon from '@mui/icons-material/Edit';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
} from '@mui/material';
import { nbAdminService } from '../../services/nartbusiness/nbAdminService';
import type {
  NbQuestionRow,
  NbQuestionStatus,
  NbQuestionAdminStats,
} from '../../services/nartbusiness/nbAdminService';

const STATUS_LABEL: Record<NbQuestionStatus, string> = {
  OPEN: 'Açık',
  ANSWERED: 'Cevaplandı',
  CLOSED: 'Çözüldü/Kapalı',
  EXPIRED: 'Süresi doldu',
  HIDDEN: 'Gizli',
};

const STATUS_COLOR: Record<NbQuestionStatus, 'success' | 'info' | 'default' | 'warning' | 'error'> = {
  OPEN: 'success',
  ANSWERED: 'info',
  CLOSED: 'default',
  EXPIRED: 'warning',
  HIDDEN: 'error',
};

function fmtDate(s?: string | null): string {
  if (!s) return '—';
  try {
    return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(s));
  } catch {
    return '—';
  }
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
      <Typography variant="h5" fontWeight={700}>{value.toLocaleString('tr-TR')}</Typography>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
    </Paper>
  );
}

export default function NbQuestionModeration() {
  const [status, setStatus] = useState<'' | NbQuestionStatus>('');
  const [q, setQ] = useState('');
  const [qInput, setQInput] = useState('');
  const [rows, setRows] = useState<NbQuestionRow[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [stats, setStats] = useState<NbQuestionAdminStats | null>(null);
  const [editing, setEditing] = useState<NbQuestionRow | null>(null);

  useEffect(() => { setPage(0); }, [status, q]);
  useEffect(() => {
    const t = setTimeout(() => setQ(qInput.trim()), 350);
    return () => clearTimeout(t);
  }, [qInput]);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    nbAdminService
      .listQuestions({ status: status || undefined, q: q || undefined, page })
      .then((p) => {
        setRows(p.content);
        setTotalPages(Math.max(1, p.totalPages));
      })
      .catch((e) => setError(e?.response?.data?.error?.message ?? 'Yüklenemedi'))
      .finally(() => setLoading(false));
  }, [status, q, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { nbAdminService.questionStats().then(setStats).catch(() => {}); }, []);

  const act = async (row: NbQuestionRow, next: NbQuestionStatus, label: string) => {
    setBusyId(row.id);
    try {
      await nbAdminService.setQuestionStatus(row.id, next);
      setMsg(`Soru ${label}.`);
      load();
      nbAdminService.questionStats().then(setStats).catch(() => {});
    } catch (e: any) {
      setMsg(e?.response?.data?.error?.message ?? 'İşlem başarısız');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h4" fontWeight={600} mb={2}>
        Topluluk Soruları — Yönetim
      </Typography>

      {stats && (
        <Grid container spacing={1.5} mb={2}>
          <Grid item xs={6} sm={4} md={2}><StatCard label="Toplam" value={stats.total} /></Grid>
          <Grid item xs={6} sm={4} md={2}><StatCard label="Açık" value={stats.open} /></Grid>
          <Grid item xs={6} sm={4} md={2}><StatCard label="Cevaplandı" value={stats.answered} /></Grid>
          <Grid item xs={6} sm={4} md={2}><StatCard label="Çözüldü" value={stats.closed} /></Grid>
          <Grid item xs={6} sm={4} md={2}><StatCard label="Süresi doldu" value={stats.expired} /></Grid>
          <Grid item xs={6} sm={4} md={2}><StatCard label="Gizli" value={stats.hidden} /></Grid>
        </Grid>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={2}>
        <TextField
          size="small"
          label="Ara (başlık, içerik, sektör…)"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          sx={{ minWidth: 240, flexGrow: 1 }}
        />
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Durum</InputLabel>
          <Select label="Durum" value={status} onChange={(e) => setStatus(e.target.value as '' | NbQuestionStatus)}>
            <MenuItem value="">Tümü</MenuItem>
            <MenuItem value="OPEN">Açık</MenuItem>
            <MenuItem value="ANSWERED">Cevaplandı</MenuItem>
            <MenuItem value="CLOSED">Çözüldü/Kapalı</MenuItem>
            <MenuItem value="EXPIRED">Süresi doldu</MenuItem>
            <MenuItem value="HIDDEN">Gizli</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper variant="outlined">
        {loading ? (
          <Stack alignItems="center" py={5}><CircularProgress size={26} /></Stack>
        ) : rows.length === 0 ? (
          <Typography color="text.secondary" sx={{ p: 3 }}>Kayıt yok.</Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Soru</TableCell>
                  <TableCell>Soran</TableCell>
                  <TableCell>Sektör / Şehir</TableCell>
                  <TableCell align="center">Cevap</TableCell>
                  <TableCell>Tarih</TableCell>
                  <TableCell>Durum</TableCell>
                  <TableCell align="right">İşlem</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell sx={{ maxWidth: 300 }}>
                      <Typography variant="body2" fontWeight={600} noWrap>{r.title}</Typography>
                      {r.body && (
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', maxWidth: 300 }}>
                          {r.body}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 160 }}>
                      <Typography variant="body2" noWrap>
                        {r.anonymous ? 'Anonim' : (r.askerCompanyName || r.askerDisplayName || '—')}
                      </Typography>
                    </TableCell>
                    <TableCell>{[r.sectorCode, r.city].filter(Boolean).join(' · ') || '—'}</TableCell>
                    <TableCell align="center">{r.answerCount ?? 0}</TableCell>
                    <TableCell>{fmtDate(r.createdAt)}</TableCell>
                    <TableCell>
                      <Chip size="small" variant="outlined"
                        color={STATUS_COLOR[r.status] ?? 'default'}
                        label={STATUS_LABEL[r.status] ?? r.status} />
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                        <Tooltip title="Detay / Düzenle">
                          <IconButton size="small" onClick={() => setEditing(r)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {(r.status === 'HIDDEN' || r.status === 'CLOSED' || r.status === 'EXPIRED') && (
                          <Tooltip title="Yeniden aç (OPEN)">
                            <span>
                              <Button size="small" startIcon={<RestoreIcon />} disabled={busyId === r.id}
                                onClick={() => act(r, 'OPEN', 'yeniden açıldı')}>Aç</Button>
                            </span>
                          </Tooltip>
                        )}
                        {(r.status === 'OPEN' || r.status === 'ANSWERED') && (
                          <Tooltip title="Kapat (CLOSED)">
                            <span>
                              <Button size="small" color="warning" startIcon={<BlockIcon />} disabled={busyId === r.id}
                                onClick={() => act(r, 'CLOSED', 'kapatıldı')}>Kapat</Button>
                            </span>
                          </Tooltip>
                        )}
                        {r.status !== 'HIDDEN' && (
                          <Tooltip title="Gizle / kaldır (HIDDEN)">
                            <span>
                              <Button size="small" color="error" startIcon={<VisibilityOffIcon />} disabled={busyId === r.id}
                                onClick={() => act(r, 'HIDDEN', 'gizlendi')}>Gizle</Button>
                            </span>
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {totalPages > 1 && (
        <Stack alignItems="center" sx={{ mt: 2 }}>
          <Pagination count={totalPages} page={page + 1} onChange={(_, p) => setPage(p - 1)} color="primary" />
        </Stack>
      )}

      <Snackbar open={!!msg} autoHideDuration={4000} onClose={() => setMsg(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {msg ? <Alert severity="success" variant="filled" onClose={() => setMsg(null)}>{msg}</Alert> : undefined}
      </Snackbar>

      {editing && (
        <_QuestionEditDialog
          row={editing}
          onClose={() => setEditing(null)}
          onSaved={(m) => {
            setEditing(null);
            setMsg(m);
            load();
          }}
        />
      )}
    </Box>
  );
}

function _QuestionEditDialog({
  row,
  onClose,
  onSaved,
}: {
  row: NbQuestionRow;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const [title, setTitle] = useState(row.title ?? '');
  const [body, setBody] = useState(row.body ?? '');
  const [sectorCode, setSectorCode] = useState(row.sectorCode ?? '');
  const [city, setCity] = useState(row.city ?? '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setErr(null);
    try {
      await nbAdminService.updateQuestion(row.id, {
        title: title.trim(),
        body: body.trim(),
        sectorCode: sectorCode.trim() || null,
        city: city.trim() || null,
      });
      onSaved('Soru güncellendi.');
    } catch (e: any) {
      setErr(e?.response?.data?.error?.message ?? 'Kaydedilemedi');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Soruyu Düzenle</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            Soran: {row.anonymous ? 'Anonim' : (row.askerCompanyName || row.askerDisplayName || '—')} · Durum: {STATUS_LABEL[row.status] ?? row.status}
          </Typography>
          <TextField label="Başlık" value={title} onChange={(e) => setTitle(e.target.value)} size="small" fullWidth />
          <TextField label="İçerik" value={body} onChange={(e) => setBody(e.target.value)}
            size="small" fullWidth multiline minRows={4} />
          <Stack direction="row" spacing={2}>
            <TextField label="Sektör kodu" value={sectorCode} onChange={(e) => setSectorCode(e.target.value)} size="small" fullWidth />
            <TextField label="Şehir" value={city} onChange={(e) => setCity(e.target.value)} size="small" fullWidth />
          </Stack>
          {err && <Alert severity="error">{err}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Kapat</Button>
        <Button onClick={save} variant="contained" disabled={saving || !title.trim() || !body.trim()}>
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
