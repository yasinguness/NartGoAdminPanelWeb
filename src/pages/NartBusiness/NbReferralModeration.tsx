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
  NbReferralRow,
  NbReferralStatus,
  NbReferralAdminStats,
} from '../../services/nartbusiness/nbAdminService';

const STATUS_LABEL: Record<NbReferralStatus, string> = {
  PROPOSED: 'Önerildi',
  ACCEPTED: 'Kabul edildi',
  DECLINED: 'Reddedildi',
  CLOSED_WON: 'Kazanıldı',
  CLOSED_LOST: 'Kaybedildi',
  CANCELLED: 'İptal',
};

const STATUS_COLOR: Record<NbReferralStatus, 'default' | 'info' | 'success' | 'error' | 'warning'> = {
  PROPOSED: 'info',
  ACCEPTED: 'warning',
  DECLINED: 'default',
  CLOSED_WON: 'success',
  CLOSED_LOST: 'error',
  CANCELLED: 'default',
};

function fmtDate(s?: string | null): string {
  if (!s) return '—';
  try {
    return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(s));
  } catch {
    return '—';
  }
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
      <Typography variant="h5" fontWeight={700}>
        {typeof value === 'number' ? value.toLocaleString('tr-TR') : value}
      </Typography>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
    </Paper>
  );
}

// Henüz kapanmamış/iptal olmamış → admin iptal edebilir.
const CANCELLABLE: NbReferralStatus[] = ['PROPOSED', 'ACCEPTED'];

export default function NbReferralModeration() {
  const [status, setStatus] = useState<'' | NbReferralStatus>('');
  const [q, setQ] = useState('');
  const [qInput, setQInput] = useState('');
  const [rows, setRows] = useState<NbReferralRow[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [stats, setStats] = useState<NbReferralAdminStats | null>(null);
  const [editing, setEditing] = useState<NbReferralRow | null>(null);

  useEffect(() => { setPage(0); }, [status, q]);
  useEffect(() => {
    const t = setTimeout(() => setQ(qInput.trim()), 350);
    return () => clearTimeout(t);
  }, [qInput]);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    nbAdminService
      .listReferrals({ status: status || undefined, q: q || undefined, page })
      .then((p) => {
        setRows(p.content);
        setTotalPages(Math.max(1, p.totalPages));
      })
      .catch((e) => setError(e?.response?.data?.error?.message ?? 'Yüklenemedi'))
      .finally(() => setLoading(false));
  }, [status, q, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { nbAdminService.referralStats().then(setStats).catch(() => {}); }, []);

  const cancel = async (row: NbReferralRow) => {
    setBusyId(row.id);
    try {
      await nbAdminService.setReferralStatus(row.id, 'CANCELLED');
      setMsg('Yönlendirme iptal edildi.');
      load();
      nbAdminService.referralStats().then(setStats).catch(() => {});
    } catch (e: any) {
      setMsg(e?.response?.data?.error?.message ?? 'İşlem başarısız');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h4" fontWeight={600} mb={2}>
        Yönlendirmeler — Yönetim
      </Typography>

      {stats && (
        <Grid container spacing={1.5} mb={2}>
          <Grid item xs={6} sm={3} md={1.5}><StatCard label="Toplam" value={stats.total} /></Grid>
          <Grid item xs={6} sm={3} md={1.5}><StatCard label="Önerildi" value={stats.proposed} /></Grid>
          <Grid item xs={6} sm={3} md={1.5}><StatCard label="Kabul" value={stats.accepted} /></Grid>
          <Grid item xs={6} sm={3} md={1.5}><StatCard label="Red" value={stats.declined} /></Grid>
          <Grid item xs={6} sm={3} md={1.5}><StatCard label="Kazanıldı" value={stats.closedWon} /></Grid>
          <Grid item xs={6} sm={3} md={1.5}><StatCard label="Kaybedildi" value={stats.closedLost} /></Grid>
          <Grid item xs={6} sm={3} md={1.5}><StatCard label="Kazanma %" value={`%${stats.winRatePct}`} /></Grid>
          <Grid item xs={6} sm={3} md={1.5}><StatCard label="Toplam İş (₺)" value={stats.totalDealValueTry} /></Grid>
        </Grid>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={2}>
        <TextField
          size="small"
          label="Ara (müşteri, bağlam, sektör…)"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          sx={{ minWidth: 240, flexGrow: 1 }}
        />
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Durum</InputLabel>
          <Select label="Durum" value={status} onChange={(e) => setStatus(e.target.value as '' | NbReferralStatus)}>
            <MenuItem value="">Tümü</MenuItem>
            <MenuItem value="PROPOSED">Önerildi</MenuItem>
            <MenuItem value="ACCEPTED">Kabul edildi</MenuItem>
            <MenuItem value="DECLINED">Reddedildi</MenuItem>
            <MenuItem value="CLOSED_WON">Kazanıldı</MenuItem>
            <MenuItem value="CLOSED_LOST">Kaybedildi</MenuItem>
            <MenuItem value="CANCELLED">İptal</MenuItem>
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
                  <TableCell>Müşteri</TableCell>
                  <TableCell>Bağlam / Sektör</TableCell>
                  <TableCell>Durum</TableCell>
                  <TableCell align="right">İş Değeri (₺)</TableCell>
                  <TableCell>Tarih</TableCell>
                  <TableCell align="right">İşlem</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell sx={{ maxWidth: 220 }}>
                      <Typography variant="body2" fontWeight={600} noWrap>{r.customerName}</Typography>
                      {r.customerPhone && (
                        <Typography variant="caption" color="text.secondary">{r.customerPhone}</Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 280 }}>
                      <Typography variant="body2" noWrap>
                        {[r.sectorCode, r.customerContext].filter(Boolean).join(' · ') || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" variant="outlined"
                        color={STATUS_COLOR[r.status] ?? 'default'}
                        label={STATUS_LABEL[r.status] ?? r.status} />
                    </TableCell>
                    <TableCell align="right">
                      {r.dealValueTry != null ? r.dealValueTry.toLocaleString('tr-TR') : '—'}
                    </TableCell>
                    <TableCell>{fmtDate(r.proposedAt)}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                      <Tooltip title="Detay / Düzenle">
                        <IconButton size="small" onClick={() => setEditing(r)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {CANCELLABLE.includes(r.status) ? (
                        <Tooltip title="İptal et (CANCELLED)">
                          <span>
                            <Button size="small" color="error" startIcon={<BlockIcon />} disabled={busyId === r.id}
                              onClick={() => cancel(r)}>İptal</Button>
                          </span>
                        </Tooltip>
                      ) : (
                        <Typography variant="caption" color="text.secondary">—</Typography>
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
        <_ReferralEditDialog
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

function _ReferralEditDialog({
  row,
  onClose,
  onSaved,
}: {
  row: NbReferralRow;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const [customerName, setCustomerName] = useState(row.customerName ?? '');
  const [customerPhone, setCustomerPhone] = useState(row.customerPhone ?? '');
  const [customerContext, setCustomerContext] = useState(row.customerContext ?? '');
  const [sectorCode, setSectorCode] = useState(row.sectorCode ?? '');
  const [dealValue, setDealValue] = useState(row.dealValueTry?.toString() ?? '');
  const [outcomeNote, setOutcomeNote] = useState(row.outcomeNote ?? '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setErr(null);
    try {
      await nbAdminService.updateReferral(row.id, {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || null,
        customerContext: customerContext.trim() || null,
        sectorCode: sectorCode.trim() || null,
        dealValueTry: dealValue.trim() ? Number(dealValue) : null,
        outcomeNote: outcomeNote.trim() || null,
      });
      onSaved('Yönlendirme güncellendi.');
    } catch (e: any) {
      setErr(e?.response?.data?.error?.message ?? 'Kaydedilemedi');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Yönlendirmeyi Düzenle</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            Durum: {STATUS_LABEL[row.status] ?? row.status}
          </Typography>
          <TextField label="Müşteri adı" value={customerName} onChange={(e) => setCustomerName(e.target.value)} size="small" fullWidth />
          <TextField label="Telefon" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} size="small" fullWidth />
          <TextField label="Bağlam / not" value={customerContext} onChange={(e) => setCustomerContext(e.target.value)}
            size="small" fullWidth multiline minRows={2} />
          <Stack direction="row" spacing={2}>
            <TextField label="Sektör kodu" value={sectorCode} onChange={(e) => setSectorCode(e.target.value)} size="small" fullWidth />
            <TextField label="İş değeri (₺)" value={dealValue} onChange={(e) => setDealValue(e.target.value)}
              size="small" fullWidth type="number" />
          </Stack>
          <TextField label="Sonuç notu" value={outcomeNote} onChange={(e) => setOutcomeNote(e.target.value)}
            size="small" fullWidth multiline minRows={2} />
          {err && <Alert severity="error">{err}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Kapat</Button>
        <Button onClick={save} variant="contained" disabled={saving || !customerName.trim()}>
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
