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
import RestoreIcon from '@mui/icons-material/Restore';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import StarIcon from '@mui/icons-material/Star';
import { nbAdminService } from '../../services/nartbusiness/nbAdminService';
import type {
  NbListingRow,
  NbListingStatus,
  NbListingType,
  NbListingAdminStats,
} from '../../services/nartbusiness/nbAdminService';

const STATUS_LABEL: Record<NbListingStatus, string> = {
  ACTIVE: 'Aktif',
  CLOSED: 'Kapalı',
  EXPIRED: 'Süresi doldu',
  DELETED: 'Silinmiş',
};

const STATUS_COLOR: Record<NbListingStatus, 'success' | 'default' | 'warning' | 'error'> = {
  ACTIVE: 'success',
  CLOSED: 'default',
  EXPIRED: 'warning',
  DELETED: 'error',
};

const TYPE_LABEL: Record<NbListingType, string> = { REQUEST: 'Talep', OFFER: 'Arz' };

function fmtDate(s?: string | null): string {
  if (!s) return '—';
  try {
    return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(s));
  } catch {
    return '—';
  }
}

function fmtBudget(r: NbListingRow): string {
  const cur = r.currency === 'TRY' || !r.currency ? '₺' : r.currency;
  if (r.budgetMin != null && r.budgetMax != null) return `${r.budgetMin.toLocaleString('tr-TR')}–${r.budgetMax.toLocaleString('tr-TR')} ${cur}`;
  if (r.budgetMax != null) return `${r.budgetMax.toLocaleString('tr-TR')} ${cur}`;
  if (r.budgetMin != null) return `${r.budgetMin.toLocaleString('tr-TR')} ${cur}`;
  return '—';
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
      <Typography variant="h5" fontWeight={700}>{value.toLocaleString('tr-TR')}</Typography>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
    </Paper>
  );
}

export default function NbListingModeration() {
  const [type, setType] = useState<'' | NbListingType>('');
  const [status, setStatus] = useState<'' | NbListingStatus>('');
  const [q, setQ] = useState('');
  const [qInput, setQInput] = useState('');
  const [rows, setRows] = useState<NbListingRow[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [stats, setStats] = useState<NbListingAdminStats | null>(null);

  useEffect(() => { setPage(0); }, [type, status, q]);

  // Arama debounce.
  useEffect(() => {
    const t = setTimeout(() => setQ(qInput.trim()), 350);
    return () => clearTimeout(t);
  }, [qInput]);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    nbAdminService
      .listListings({
        type: type || undefined,
        status: status || undefined,
        q: q || undefined,
        page,
      })
      .then((p) => {
        setRows(p.content);
        setTotalPages(Math.max(1, p.totalPages));
      })
      .catch((e) => setError(e?.response?.data?.error?.message ?? 'Yüklenemedi'))
      .finally(() => setLoading(false));
  }, [type, status, q, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { nbAdminService.listingStats().then(setStats).catch(() => {}); }, []);

  const act = async (row: NbListingRow, next: NbListingStatus, label: string) => {
    setBusyId(row.id);
    try {
      await nbAdminService.setListingStatus(row.id, next);
      setMsg(`İlan ${label}.`);
      load();
      nbAdminService.listingStats().then(setStats).catch(() => {});
    } catch (e: any) {
      setMsg(e?.response?.data?.error?.message ?? 'İşlem başarısız');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h4" fontWeight={600} mb={2}>
        İlanlar (Talep / Arz) — Yönetim
      </Typography>

      {stats && (
        <Grid container spacing={1.5} mb={2}>
          <Grid item xs={6} sm={3} md={1.5}><StatCard label="Toplam" value={stats.total} /></Grid>
          <Grid item xs={6} sm={3} md={1.5}><StatCard label="Aktif" value={stats.active} /></Grid>
          <Grid item xs={6} sm={3} md={1.5}><StatCard label="Kapalı" value={stats.closed} /></Grid>
          <Grid item xs={6} sm={3} md={1.5}><StatCard label="Süresi doldu" value={stats.expired} /></Grid>
          <Grid item xs={6} sm={3} md={1.5}><StatCard label="Silinmiş" value={stats.deleted} /></Grid>
          <Grid item xs={6} sm={3} md={1.5}><StatCard label="Talep" value={stats.requests} /></Grid>
          <Grid item xs={6} sm={3} md={1.5}><StatCard label="Arz" value={stats.offers} /></Grid>
          <Grid item xs={6} sm={3} md={1.5}><StatCard label="Son 7 gün" value={stats.openedLast7d} /></Grid>
        </Grid>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={2}>
        <TextField
          size="small"
          label="Ara (başlık, şirket, şehir…)"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          sx={{ minWidth: 240, flexGrow: 1 }}
        />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Tür</InputLabel>
          <Select label="Tür" value={type} onChange={(e) => setType(e.target.value as '' | NbListingType)}>
            <MenuItem value="">Tümü</MenuItem>
            <MenuItem value="REQUEST">Talep</MenuItem>
            <MenuItem value="OFFER">Arz</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Durum</InputLabel>
          <Select label="Durum" value={status} onChange={(e) => setStatus(e.target.value as '' | NbListingStatus)}>
            <MenuItem value="">Tümü</MenuItem>
            <MenuItem value="ACTIVE">Aktif</MenuItem>
            <MenuItem value="CLOSED">Kapalı</MenuItem>
            <MenuItem value="EXPIRED">Süresi doldu</MenuItem>
            <MenuItem value="DELETED">Silinmiş</MenuItem>
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
                  <TableCell>İlan</TableCell>
                  <TableCell>Tür</TableCell>
                  <TableCell>Sahip</TableCell>
                  <TableCell>Sektör / Şehir</TableCell>
                  <TableCell>Bütçe</TableCell>
                  <TableCell align="center">İlgi</TableCell>
                  <TableCell>Tarih</TableCell>
                  <TableCell>Durum</TableCell>
                  <TableCell align="right">İşlem</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell sx={{ maxWidth: 260 }}>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        {r.ownerSpotlight && (
                          <Tooltip title="Öne çıkan (Patron/Kurucu)">
                            <StarIcon sx={{ fontSize: 15, color: 'warning.main' }} />
                          </Tooltip>
                        )}
                        <Typography variant="body2" fontWeight={600} noWrap>{r.title}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" variant="outlined"
                        color={r.type === 'REQUEST' ? 'warning' : 'success'}
                        label={TYPE_LABEL[r.type] ?? r.type} />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 180 }}>
                      <Typography variant="body2" noWrap>
                        {r.ownerCompanyName || r.ownerDisplayName || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {[r.sectorCode, r.city].filter(Boolean).join(' · ') || '—'}
                    </TableCell>
                    <TableCell>{fmtBudget(r)}</TableCell>
                    <TableCell align="center">{r.interestCount ?? 0}</TableCell>
                    <TableCell>{fmtDate(r.createdAt)}</TableCell>
                    <TableCell>
                      <Chip size="small" variant="outlined"
                        color={STATUS_COLOR[r.status] ?? 'default'}
                        label={STATUS_LABEL[r.status] ?? r.status} />
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        {r.status !== 'ACTIVE' && (
                          <Tooltip title="Yeniden aç (ACTIVE)">
                            <span>
                              <Button size="small" startIcon={<RestoreIcon />} disabled={busyId === r.id}
                                onClick={() => act(r, 'ACTIVE', 'yeniden açıldı')}>Aç</Button>
                            </span>
                          </Tooltip>
                        )}
                        {r.status === 'ACTIVE' && (
                          <Tooltip title="Kapat (CLOSED)">
                            <span>
                              <Button size="small" color="warning" startIcon={<BlockIcon />} disabled={busyId === r.id}
                                onClick={() => act(r, 'CLOSED', 'kapatıldı')}>Kapat</Button>
                            </span>
                          </Tooltip>
                        )}
                        {r.status !== 'DELETED' && (
                          <Tooltip title="Sil (soft, DELETED)">
                            <span>
                              <Button size="small" color="error" startIcon={<DeleteOutlineIcon />} disabled={busyId === r.id}
                                onClick={() => act(r, 'DELETED', 'silindi')}>Sil</Button>
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
    </Box>
  );
}
