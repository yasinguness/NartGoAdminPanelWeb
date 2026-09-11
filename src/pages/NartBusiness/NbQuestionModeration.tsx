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
import AddIcon from '@mui/icons-material/Add';
import Autocomplete from '@mui/material/Autocomplete';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
} from '@mui/material';
import { nbAdminService } from '../../services/nartbusiness/nbAdminService';
import { NbPageHeader } from '../../components/nartbusiness/ui';
import type {
  NbQuestionRow,
  NbQuestionStatus,
  NbQuestionAdminStats,
} from '../../services/nartbusiness/nbAdminService';
import { nbErrorMessage } from '../../services/nartbusiness/nbErrorMessage';
import type { NbMember } from '../../services/nartbusiness/nbTypes';

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

  // Soru açma — ilan oluşturmadaki modelin aynısı: üye seçilirse onun adına,
  // seçilmezse küratör hesabı adına (ortak pano).
  const [createOpen, setCreateOpen] = useState(false);
  const [cTitle, setCTitle] = useState('');
  const [cBody, setCBody] = useState('');
  const [cCity, setCCity] = useState('');
  const [cSource, setCSource] = useState('');
  const [cDays, setCDays] = useState(30);
  const [cOwnerMode, setCOwnerMode] = useState<'curated' | 'member'>('curated');
  const [cOwner, setCOwner] = useState<NbMember | null>(null);
  const [memberOptions, setMemberOptions] = useState<NbMember[]>([]);
  const [cBusy, setCBusy] = useState(false);
  const [cError, setCError] = useState<string | null>(null);
  const [editing, setEditing] = useState<NbQuestionRow | null>(null);

  useEffect(() => { setPage(0); }, [status, q]);
  useEffect(() => {
    const t = setTimeout(() => setQ(qInput.trim()), 350);
    return () => clearTimeout(t);
  }, [qInput]);

  // Üye adına soru açmak için erişimi açık üyeler. Diyalog ilk açıldığında
  // çekilir; sayfa açılışında çekmek her ziyarette gereksiz bir sorgu olurdu.
  useEffect(() => {
    if (!createOpen || memberOptions.length > 0) return;
    nbAdminService
      .listMembers({ size: 100 })
      .then((p) => setMemberOptions(p?.content ?? []))
      .catch(() => setMemberOptions([]));
  }, [createOpen, memberOptions.length]);

  const submitQuestion = async () => {
    setCBusy(true);
    setCError(null);
    try {
      await nbAdminService.createQuestion({
        askerMemberId: cOwnerMode === 'member' ? cOwner?.memberId : undefined,
        title: cTitle.trim(),
        body: cBody.trim(),
        city: cCity.trim() || null,
        durationDays: cDays || null,
        source: cSource.trim() || null,
      });
      setCreateOpen(false);
      setCTitle('');
      setCBody('');
      setCCity('');
      setCSource('');
      setCOwner(null);
      setMsg('Soru yayımlandı.');
      load();
    } catch (e) {
      setCError(nbErrorMessage(e, 'Soru açılamadı.'));
    } finally {
      setCBusy(false);
    }
  };

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    nbAdminService
      .listQuestions({ status: status || undefined, q: q || undefined, page })
      .then((p) => {
        setRows(p.content);
        setTotalPages(Math.max(1, p.totalPages));
      })
      .catch((e) => setError(nbErrorMessage(e) ?? 'Yüklenemedi'))
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
      setMsg(nbErrorMessage(e) ?? 'İşlem başarısız');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Box sx={{ maxWidth: 1400 }}>
      <NbPageHeader
        eyebrow="NartBusiness"
        title="Topluluk Soruları — Yönetim"
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
            Soru Aç
          </Button>
        }
      />
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

      {/* Soru açma — ilan oluşturmadaki modelin aynısı. */}
      <Dialog open={createOpen} onClose={() => !cBusy && setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Topluluk Sorusu Aç</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <FormControl size="small">
              <InputLabel>Kimin adına</InputLabel>
              <Select
                label="Kimin adına"
                value={cOwnerMode}
                onChange={(e) => setCOwnerMode(e.target.value as 'curated' | 'member')}
                disabled={cBusy}
              >
                <MenuItem value="curated">Ortak pano (NartBusiness)</MenuItem>
                <MenuItem value="member">Bir işletme adına</MenuItem>
              </Select>
            </FormControl>

            {cOwnerMode === 'member' ? (
              <Autocomplete
                options={memberOptions}
                value={cOwner}
                onChange={(_, v) => setCOwner(v)}
                getOptionLabel={(o) => o.companyName ?? o.memberId}
                isOptionEqualToValue={(a, b) => a.memberId === b.memberId}
                renderInput={(params) => (
                  <TextField {...params} size="small" label="İşletme seç" />
                )}
                disabled={cBusy}
              />
            ) : (
              <Alert severity="info" sx={{ '& .MuiAlert-message': { fontSize: 13 } }}>
                Soru küratör hesabı adına yayımlanır ve uygulamada "ortak pano"
                olarak görünür. Küratör hesabı yapılandırılmamışsa gönderim
                sebebiyle birlikte reddedilir.
              </Alert>
            )}

            <TextField
              label="Başlık"
              value={cTitle}
              onChange={(e) => setCTitle(e.target.value)}
              size="small"
              fullWidth
              inputProps={{ maxLength: 255 }}
              disabled={cBusy}
            />
            <TextField
              label="Soru metni"
              value={cBody}
              onChange={(e) => setCBody(e.target.value)}
              size="small"
              fullWidth
              multiline
              minRows={4}
              inputProps={{ maxLength: 5000 }}
              disabled={cBusy}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Şehir (opsiyonel)"
                value={cCity}
                onChange={(e) => setCCity(e.target.value)}
                size="small"
                fullWidth
                disabled={cBusy}
              />
              <TextField
                label="Açık kalacağı gün"
                type="number"
                value={cDays}
                onChange={(e) => setCDays(Number(e.target.value))}
                size="small"
                inputProps={{ min: 1, max: 365 }}
                sx={{ minWidth: 160 }}
                disabled={cBusy}
              />
            </Stack>
            <TextField
              label="Kaynak notu (opsiyonel)"
              value={cSource}
              onChange={(e) => setCSource(e.target.value)}
              size="small"
              fullWidth
              helperText="Örn. WhatsApp grubu. Yalnız yöneticiler görür."
              disabled={cBusy}
            />
            {cError && <Alert severity="error">{cError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)} disabled={cBusy}>Vazgeç</Button>
          <Button
            variant="contained"
            onClick={() => void submitQuestion()}
            disabled={
              cBusy ||
              !cTitle.trim() ||
              !cBody.trim() ||
              (cOwnerMode === 'member' && !cOwner)
            }
          >
            {cBusy ? 'Yayımlanıyor…' : 'Yayımla'}
          </Button>
        </DialogActions>
      </Dialog>

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
      setErr(nbErrorMessage(e) ?? 'Kaydedilemedi');
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
