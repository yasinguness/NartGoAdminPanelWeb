import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Switch,
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
  NbListingRow,
  NbListingStatus,
  NbListingType,
  NbListingAdminStats,
  NbListingViewStats,
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
  const [views, setViews] = useState<Record<string, NbListingViewStats>>({});
  const [editing, setEditing] = useState<NbListingRow | null>(null);

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
        // Sayfadaki ilanlar için görüntülenme (mobil/web) sayılarını çek.
        nbAdminService
          .listingViewStats(p.content.map((r) => r.id))
          .then((list) => setViews(Object.fromEntries(list.map((v) => [v.listingId, v]))))
          .catch(() => {});
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

  // Görünürlük toggle: true → web'de blur yok + paylaşılabilir (public detay).
  const togglePublic = async (row: NbListingRow, value: boolean) => {
    setBusyId(row.id);
    try {
      await nbAdminService.setListingPublic(row.id, value);
      setMsg(value ? 'İlan herkese açıldı (public).' : 'İlan üyeye özel yapıldı.');
      load();
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
                  <TableCell align="center">Görüntülenme</TableCell>
                  <TableCell>Tarih</TableCell>
                  <TableCell>Durum</TableCell>
                  <TableCell align="center">Herkese Açık</TableCell>
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
                    <TableCell align="center">
                      {(() => {
                        const v = views[r.id];
                        if (!v || v.total === 0) return <span style={{ color: '#999' }}>0</span>;
                        return (
                          <Tooltip title={`Mobil: ${v.mobile} · Web: ${v.web}${v.unknown ? ` · Diğer: ${v.unknown}` : ''}`}>
                            <span style={{ fontWeight: 600 }}>
                              {v.total}
                              <span style={{ color: '#888', fontWeight: 400, fontSize: 12 }}>
                                {' '}({v.mobile}m/{v.web}w)
                              </span>
                            </span>
                          </Tooltip>
                        );
                      })()}
                    </TableCell>
                    <TableCell>{fmtDate(r.createdAt)}</TableCell>
                    <TableCell>
                      <Chip size="small" variant="outlined"
                        color={STATUS_COLOR[r.status] ?? 'default'}
                        label={STATUS_LABEL[r.status] ?? r.status} />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title={r.isPublic ? 'Herkese açık — web\'de blur yok, paylaşılabilir' : 'Üyeye özel — non-member maskeli teaser görür'}>
                        <span>
                          <Switch
                            size="small"
                            checked={!!r.isPublic}
                            disabled={busyId === r.id}
                            onChange={(e) => togglePublic(r, e.target.checked)}
                          />
                        </span>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                        <Tooltip title="Detay / Düzenle">
                          <IconButton size="small" onClick={() => setEditing(r)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
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

      {editing && (
        <_ListingEditDialog
          row={editing}
          onClose={() => setEditing(null)}
          onSaved={(updatedMsg) => {
            setEditing(null);
            setMsg(updatedMsg);
            load();
          }}
        />
      )}
    </Box>
  );
}

function _ListingEditDialog({
  row,
  onClose,
  onSaved,
}: {
  row: NbListingRow;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const [title, setTitle] = useState(row.title ?? '');
  const [description, setDescription] = useState(row.description ?? '');
  const [city, setCity] = useState(row.city ?? '');
  const [sectorCode, setSectorCode] = useState(row.sectorCode ?? '');
  const [budgetMin, setBudgetMin] = useState(row.budgetMin?.toString() ?? '');
  const [budgetMax, setBudgetMax] = useState(row.budgetMax?.toString() ?? '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setErr(null);
    try {
      await nbAdminService.updateListing(row.id, {
        title: title.trim(),
        description: description.trim() || null,
        city: city.trim() || null,
        sectorCode: sectorCode.trim() || null,
        budgetMin: budgetMin.trim() ? Number(budgetMin) : null,
        budgetMax: budgetMax.trim() ? Number(budgetMax) : null,
      });
      onSaved('İlan güncellendi.');
    } catch (e: any) {
      setErr(e?.response?.data?.error?.message ?? 'Kaydedilemedi');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>İlanı Düzenle</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            {TYPE_LABEL[row.type]} · {row.ownerCompanyName || row.ownerDisplayName || '—'} · {STATUS_LABEL[row.status]}
          </Typography>
          <TextField label="Başlık" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth size="small" />
          <TextField label="Açıklama" value={description} onChange={(e) => setDescription(e.target.value)}
            fullWidth size="small" multiline minRows={3} />
          <Stack direction="row" spacing={2}>
            <TextField label="Şehir" value={city} onChange={(e) => setCity(e.target.value)} size="small" fullWidth />
            <TextField label="Sektör kodu" value={sectorCode} onChange={(e) => setSectorCode(e.target.value)} size="small" fullWidth />
          </Stack>
          <Stack direction="row" spacing={2}>
            <TextField label="Bütçe min (₺)" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)}
              size="small" fullWidth type="number" />
            <TextField label="Bütçe max (₺)" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)}
              size="small" fullWidth type="number" />
          </Stack>
          {err && <Alert severity="error">{err}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Kapat</Button>
        <Button onClick={save} variant="contained" disabled={saving || !title.trim()}>
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
