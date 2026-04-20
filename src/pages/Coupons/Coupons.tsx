import { useState, useMemo } from 'react';
import {
  Box, Container, Typography, Stack, IconButton, Tooltip, Chip, Alert, Button, Grid, Paper, Skeleton,
  Table, TableHead, TableRow, TableCell, TableBody, LinearProgress, Switch,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  FiberManualRecord as DotIcon,
  Lock as LockIcon,
  LocalActivity as CouponIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import { Navigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { useRole } from '../../hooks/useRole';
import { useCoupons } from './useCoupons';
import CouponForm from './components/CouponForm';
import type { Coupon, CouponRequest } from '../../services/coupons/couponTypes';

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: '#22c55e',
  INACTIVE: '#64748b',
  EXPIRED: '#ef4444',
  SCHEDULED: '#3b82f6',
  EXHAUSTED: '#f59e0b',
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Aktif',
  INACTIVE: 'Pasif',
  EXPIRED: 'Süresi Doldu',
  SCHEDULED: 'Zamanlanmış',
  EXHAUSTED: 'Tükendi',
};

function safeDate(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

export default function Coupons() {
  const { isAdmin } = useRole();
  const { enqueueSnackbar } = useSnackbar();
  const { list, createMutation, updateMutation, removeMutation, toggleMutation } = useCoupons();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const data = list.data;
  const coupons = data?.coupons || [];

  const lastUpdated = useMemo(() => {
    if (!list.dataUpdatedAt) return '—';
    const diff = Date.now() - list.dataUpdatedAt;
    if (diff < 60_000) return `${Math.round(diff / 1000)}sn önce`;
    if (diff < 3_600_000) return `${Math.round(diff / 60_000)}dk önce`;
    return new Date(list.dataUpdatedAt).toLocaleTimeString('tr-TR');
  }, [list.dataUpdatedAt]);

  const handleCreate = () => { setEditing(null); setFormOpen(true); };
  const handleEdit = (c: Coupon) => { setEditing(c); setFormOpen(true); };

  const handleSubmit = async (payload: CouponRequest) => {
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, payload });
        enqueueSnackbar('Kupon güncellendi', { variant: 'success' });
      } else {
        await createMutation.mutateAsync(payload);
        enqueueSnackbar('Kupon oluşturuldu', { variant: 'success' });
      }
      setFormOpen(false);
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || err?.message || 'İşlem başarısız', { variant: 'error' });
    }
  };

  const handleDelete = async (c: Coupon) => {
    if (!window.confirm(`"${c.code}" kuponu silinsin mi?`)) return;
    try {
      await removeMutation.mutateAsync(c.id);
      enqueueSnackbar('Kupon silindi', { variant: 'success' });
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Silme başarısız', { variant: 'error' });
    }
  };

  const handleToggle = async (c: Coupon) => {
    try {
      await toggleMutation.mutateAsync(c.id);
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Toggle başarısız', { variant: 'error' });
    }
  };

  const busy = createMutation.isPending || updateMutation.isPending;

  return (
    <Box sx={{ minHeight: 'calc(100vh - 64px)', bgcolor: '#060C09', color: '#F3EEE0', mx: { xs: -2, sm: -3 }, my: -3, py: 4 }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2}>
            <Box>
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.5 }}>
                <LockIcon sx={{ fontSize: 16, color: '#C9A227' }} />
                <Typography sx={{ fontSize: 10, letterSpacing: 2, fontWeight: 800, color: '#C9A227', textTransform: 'uppercase' }}>
                  Coupons • Growth • Yalnızca Admin
                </Typography>
              </Stack>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{ width: 48, height: 48, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                  <CouponIcon sx={{ fontSize: 28 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: { xs: 28, md: 38 }, fontWeight: 700, lineHeight: 1, color: '#F3EEE0' }}>
                    Kuponlar
                  </Typography>
                  <Typography sx={{ mt: 0.5, fontSize: 13, color: 'rgba(243,238,224,0.65)' }}>
                    İndirim kodları · kullanım takibi · aktif/pasif yönetimi
                  </Typography>
                </Box>
              </Stack>
            </Box>

            <Stack direction="row" spacing={1.5} alignItems="center">
              <Chip
                icon={<DotIcon sx={{ fontSize: '10px !important', color: `${list.isFetching ? '#f59e0b' : '#22c55e'} !important` }} />}
                label={list.isFetching ? 'güncelleniyor' : `son: ${lastUpdated}`}
                size="small"
                sx={{ bgcolor: 'rgba(255,255,255,0.04)', color: 'rgba(243,238,224,0.8)', fontSize: 11, fontWeight: 600, height: 26, border: '1px solid rgba(255,255,255,0.08)' }}
              />
              <Tooltip title="Yenile" arrow>
                <IconButton onClick={() => list.refetch()} size="small" sx={{ color: '#C9A227', border: '1px solid rgba(201,162,39,0.2)' }}>
                  <RefreshIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
              <Button
                variant="contained" size="small" startIcon={<AddIcon />}
                onClick={handleCreate}
                sx={{ bgcolor: '#C9A227', color: '#0A130F', fontWeight: 800, '&:hover': { bgcolor: '#b58f1f' } }}
              >
                Yeni Kupon
              </Button>
            </Stack>
          </Stack>
        </Box>

        {!list.isLoading && !data && (
          <Alert severity="info" icon={false} sx={{ mb: 3, bgcolor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: 'rgba(243,238,224,0.85)' }}
            action={<Button size="small" onClick={() => list.refetch()} sx={{ color: '#C9A227', fontSize: 11, fontWeight: 700 }}>Tekrar Dene</Button>}>
            <Typography sx={{ fontSize: 12 }}>
              <code style={{ fontFamily: 'monospace', fontSize: 11 }}>/tickets/admin/coupons</code> endpoint'ine ulaşılamadı.
            </Typography>
          </Alert>
        )}

        {/* Summary */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Aktif', value: data?.summary?.activeCount ?? 0, color: '#22c55e' },
            { label: 'Süresi Dolmuş', value: data?.summary?.expiredCount ?? 0, color: '#ef4444' },
            { label: 'Tükenmiş', value: data?.summary?.exhaustedCount ?? 0, color: '#f59e0b' },
            { label: 'Toplam Kullanım', value: data?.summary?.totalUsage ?? 0, color: '#C9A227' },
          ].map(c => (
            <Grid item xs={6} md={3} key={c.label}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#0F1A14', borderColor: 'rgba(201,162,39,0.18)' }}>
                <Typography sx={{ fontSize: 10, letterSpacing: 1.2, fontWeight: 700, color: 'rgba(243,238,224,0.6)', textTransform: 'uppercase' }}>
                  {c.label}
                </Typography>
                {list.isLoading ? (
                  <Skeleton variant="text" width="60%" height={32} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
                ) : (
                  <Typography sx={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 26, fontWeight: 700, color: c.color, lineHeight: 1.1, mt: 0.5 }}>
                    {c.value.toLocaleString('tr-TR')}
                  </Typography>
                )}
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Table */}
        <Paper variant="outlined" sx={{ borderRadius: 2, bgcolor: '#0A130F', borderColor: 'rgba(201,162,39,0.12)', overflow: 'hidden' }}>
          {list.isLoading ? (
            <Box sx={{ p: 2 }}>
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} variant="rectangular" height={44} sx={{ bgcolor: 'rgba(255,255,255,0.04)', mb: 1, borderRadius: 0.5 }} />)}
            </Box>
          ) : coupons.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography sx={{ fontSize: 13, color: 'rgba(243,238,224,0.5)' }}>
                Henüz kupon yok
              </Typography>
              <Button startIcon={<AddIcon />} onClick={handleCreate} sx={{ mt: 2, color: '#C9A227', fontWeight: 700 }}>
                İlk Kuponu Oluştur
              </Button>
            </Box>
          ) : (
            <Table size="small" sx={{ '& .MuiTableCell-root': { borderBottomColor: 'rgba(255,255,255,0.05)', color: '#F3EEE0' } }}>
              <TableHead>
                <TableRow>
                  <HeaderCell>Kod</HeaderCell>
                  <HeaderCell>Durum</HeaderCell>
                  <HeaderCell align="right">İndirim</HeaderCell>
                  <HeaderCell align="center">Kullanım</HeaderCell>
                  <HeaderCell>Geçerlilik</HeaderCell>
                  <HeaderCell align="center">Aktif</HeaderCell>
                  <HeaderCell align="center">Aksiyon</HeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {coupons.map(c => {
                  const usage = c.usedCount ?? 0;
                  const usagePct = c.maxUsage > 0 ? Math.min(100, (usage / c.maxUsage) * 100) : 0;
                  return (
                    <TableRow key={c.id} hover sx={{ '&:hover': { bgcolor: 'rgba(201,162,39,0.05) !important' } }}>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <Typography sx={{ fontFamily: 'monospace', fontWeight: 800, color: '#C9A227', fontSize: 13 }}>
                            {c.code}
                          </Typography>
                          <Tooltip title="Kopyala" arrow>
                            <IconButton size="small" onClick={() => navigator.clipboard?.writeText(c.code)} sx={{ p: 0.25 }}>
                              <CopyIcon sx={{ fontSize: 12, color: 'rgba(243,238,224,0.4)' }} />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={STATUS_LABEL[c.status] || c.status}
                          size="small"
                          sx={{
                            bgcolor: `${STATUS_COLOR[c.status] || '#64748b'}22`,
                            color: STATUS_COLOR[c.status] || '#64748b',
                            fontSize: 9, fontWeight: 800, letterSpacing: 0.5, height: 20,
                          }}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12 }}>
                        {c.discountType === 'RATE' ? `%${Number(c.discountValue)}` : `${Number(c.discountValue).toLocaleString('tr-TR')} ₺`}
                      </TableCell>
                      <TableCell align="center" sx={{ minWidth: 140 }}>
                        <Stack spacing={0.5}>
                          <Typography sx={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700 }}>
                            {usage}/{c.maxUsage}
                          </Typography>
                          <LinearProgress
                            variant="determinate" value={usagePct}
                            sx={{
                              height: 4, borderRadius: 2,
                              bgcolor: 'rgba(255,255,255,0.05)',
                              '& .MuiLinearProgress-bar': { bgcolor: usagePct >= 100 ? '#ef4444' : usagePct > 80 ? '#f59e0b' : '#22c55e' },
                            }}
                          />
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(243,238,224,0.6)' }}>
                        {safeDate(c.validFrom)} → {safeDate(c.validTo)}
                      </TableCell>
                      <TableCell align="center">
                        <Switch
                          size="small"
                          checked={c.active}
                          onChange={() => handleToggle(c)}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" justifyContent="center" spacing={0.5}>
                          <Tooltip title="Düzenle" arrow>
                            <IconButton size="small" onClick={() => handleEdit(c)} sx={{ color: '#C9A227' }}>
                              <EditIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Sil" arrow>
                            <IconButton size="small" onClick={() => handleDelete(c)} sx={{ color: 'rgba(239,68,68,0.7)' }}>
                              <DeleteIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Paper>

        <Box sx={{ mt: 5, pt: 3, borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
          <Typography sx={{ fontSize: 10, letterSpacing: 2, fontWeight: 700, color: 'rgba(243,238,224,0.3)' }}>
            NARTGO COUPONS • {coupons.length} kupon · {data?.summary?.totalUsage ?? 0} toplam kullanım
          </Typography>
        </Box>

        <CouponForm
          open={formOpen}
          editing={editing}
          onClose={() => setFormOpen(false)}
          onSubmit={handleSubmit}
          loading={busy}
        />
      </Container>
    </Box>
  );
}

function HeaderCell({ children, align }: { children: React.ReactNode; align?: 'right' | 'center' }) {
  return (
    <TableCell align={align} sx={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, color: 'rgba(243,238,224,0.5) !important', textTransform: 'uppercase' }}>
      {children}
    </TableCell>
  );
}
