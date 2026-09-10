import { useState, useMemo } from 'react';
import {
  Box, Container, Typography, Stack, IconButton, Tooltip, Chip, Alert, Button, Grid, Paper,
  Table, TableHead, TableRow, TableCell, TableBody, TablePagination, Skeleton,
  ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  FiberManualRecord as DotIcon,
  Lock as LockIcon,
  Inbox as DlqIcon,
  Replay as RetryIcon,
  Close as DismissIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { Navigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { useRole } from '../../hooks/useRole';
import { useDlq } from './useDlq';
import PayloadDialog from './components/PayloadDialog';
import type { DeadLetterEntry } from '../../services/dlq/dlqTypes';

const STATUS_FILTERS = [
  { key: 'PENDING', label: 'Bekleyen', color: '#f59e0b' },
  { key: 'RETRIED', label: 'Tekrar Denenmiş', color: '#3b82f6' },
  { key: 'DISMISSED', label: 'Kapatılmış', color: '#64748b' },
];

const STATUS_COLOR: Record<string, string> = {
  PENDING: '#f59e0b',
  RETRIED: '#3b82f6',
  DISMISSED: '#64748b',
};

export default function DeadLetterQueue() {
  const { isAdmin } = useRole();
  const { enqueueSnackbar } = useSnackbar();
  const [status, setStatus] = useState('PENDING');
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(25);
  const { list, stats, retryMutation, dismissMutation } = useDlq(status, page, size);
  const [selected, setSelected] = useState<DeadLetterEntry | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const pageData = list.data;
  const statsData = stats.data;
  const rows = pageData?.content || [];

  const lastUpdated = useMemo(() => {
    if (!list.dataUpdatedAt) return '—';
    const diff = Date.now() - list.dataUpdatedAt;
    if (diff < 60_000) return `${Math.round(diff / 1000)}sn önce`;
    if (diff < 3_600_000) return `${Math.round(diff / 60_000)}dk önce`;
    return new Date(list.dataUpdatedAt).toLocaleTimeString('tr-TR');
  }, [list.dataUpdatedAt]);

  const openDialog = (entry: DeadLetterEntry) => {
    setSelected(entry);
    setDialogOpen(true);
  };

  const handleRetry = async (id: string) => {
    try {
      await retryMutation.mutateAsync(id);
      enqueueSnackbar('Yeniden deneme başlatıldı', { variant: 'success' });
      setDialogOpen(false);
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Retry başarısız', { variant: 'error' });
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await dismissMutation.mutateAsync(id);
      enqueueSnackbar('Dead letter kapatıldı', { variant: 'success' });
      setDialogOpen(false);
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Dismiss başarısız', { variant: 'error' });
    }
  };

  const anyMutating = retryMutation.isPending || dismissMutation.isPending;

  return (
    <Box sx={{ minHeight: 'calc(100vh - 64px)', bgcolor: '#FAFAFA', color: '#1E293B', mx: { xs: -2, sm: -3 }, my: -3, py: 4 }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2}>
            <Box>
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.5 }}>
                <LockIcon sx={{ fontSize: 16, color: '#C9A227' }} />
                <Typography sx={{ fontSize: 10, letterSpacing: 2, fontWeight: 800, color: '#C9A227', textTransform: 'uppercase' }}>
                  Dead Letter Queue • Yalnızca Admin
                </Typography>
              </Stack>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{ width: 48, height: 48, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                  <DlqIcon sx={{ fontSize: 28 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontFamily: 'inherit', fontStyle: 'normal', fontSize: { xs: 28, md: 38 }, fontWeight: 700, lineHeight: 1, color: '#1E293B' }}>
                    Dead Letter Queue
                  </Typography>
                  <Typography sx={{ mt: 0.5, fontSize: 13, color: 'rgba(30,41,59,0.70)' }}>
                    Kafka'da işlenemeyen mesajlar · retry / dismiss / payload incele
                  </Typography>
                </Box>
              </Stack>
            </Box>

            <Stack direction="row" spacing={1.5} alignItems="center">
              <Chip
                icon={<DotIcon sx={{ fontSize: '10px !important', color: `${list.isFetching ? '#f59e0b' : '#22c55e'} !important` }} />}
                label={list.isFetching ? 'güncelleniyor' : `son: ${lastUpdated}`}
                size="small"
                sx={{ bgcolor: 'rgba(0,0,0,0.03)', color: 'rgba(30,41,59,0.80)', fontSize: 11, fontWeight: 600, height: 26, border: '1px solid rgba(0,0,0,0.06)' }}
              />
              <Tooltip title="Yenile" arrow>
                <IconButton onClick={() => { list.refetch(); stats.refetch(); }} size="small" sx={{ color: '#C9A227', border: '1px solid rgba(201,162,39,0.2)' }}>
                  <RefreshIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        </Box>

        {!list.isLoading && !pageData && (
          <Alert severity="info" icon={false} sx={{ mb: 3, bgcolor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: 'rgba(30,41,59,0.85)' }}
            action={<Button size="small" onClick={() => list.refetch()} sx={{ color: '#C9A227', fontSize: 11, fontWeight: 700 }}>Tekrar Dene</Button>}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: '#f59e0b' }}>BACKEND YANIT VERMEDİ</Typography>
              <Typography sx={{ fontSize: 12 }}>
                <code style={{ fontFamily: 'monospace', fontSize: 11 }}>/notifications/admin/dead-letters</code> endpoint'ine ulaşılamadı.
              </Typography>
            </Stack>
          </Alert>
        )}

        {/* Stats cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Bekleyen', key: 'pending', color: '#f59e0b' },
            { label: 'Tekrar Denenmiş', key: 'retried', color: '#3b82f6' },
            { label: 'Kapatılmış', key: 'dismissed', color: '#64748b' },
            { label: 'Toplam', key: 'total', color: '#C9A227' },
          ].map(c => (
            <Grid item xs={6} md={3} key={c.key}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#F8FAFC', borderColor: 'rgba(201,162,39,0.18)' }}>
                <Typography sx={{ fontSize: 10, letterSpacing: 1.2, fontWeight: 700, color: 'rgba(30,41,59,0.60)', textTransform: 'uppercase' }}>
                  {c.label}
                </Typography>
                {stats.isLoading ? (
                  <Skeleton variant="text" width="60%" height={32} sx={{ bgcolor: 'rgba(0,0,0,0.06)' }} />
                ) : (
                  <Typography sx={{
                    fontFamily: 'inherit', fontStyle: 'normal',
                    fontSize: 26, fontWeight: 700, color: c.color, lineHeight: 1.1, mt: 0.5,
                  }}>
                    {(statsData as any)?.[c.key]?.toLocaleString?.('tr-TR') ?? 0}
                  </Typography>
                )}
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Status filter */}
        <Stack direction="row" spacing={2} sx={{ mb: 2, alignItems: 'center' }}>
          <ToggleButtonGroup
            size="small"
            value={status}
            exclusive
            onChange={(_, v) => { if (v) { setStatus(v); setPage(0); } }}
            sx={{
              bgcolor: 'rgba(0,0,0,0.02)',
              border: '1px solid rgba(0,0,0,0.06)',
              '& .MuiToggleButton-root': {
                color: 'rgba(30,41,59,0.60)', fontSize: 11, fontWeight: 700, px: 1.5, py: 0.5, border: 'none', textTransform: 'none',
                '&.Mui-selected': { bgcolor: 'rgba(201,162,39,0.18)', color: '#C9A227' },
              },
            }}
          >
            {STATUS_FILTERS.map(f => <ToggleButton key={f.key} value={f.key}>{f.label}</ToggleButton>)}
          </ToggleButtonGroup>
        </Stack>

        {/* Table */}
        <Paper variant="outlined" sx={{ borderRadius: 2, bgcolor: '#FFFFFF', borderColor: 'rgba(201,162,39,0.12)', overflow: 'hidden' }}>
          {list.isLoading ? (
            <Box sx={{ p: 2 }}>
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} variant="rectangular" height={44} sx={{ bgcolor: 'rgba(0,0,0,0.03)', mb: 1, borderRadius: 0.5 }} />
              ))}
            </Box>
          ) : rows.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography sx={{ fontSize: 14, color: '#22c55e', fontWeight: 700 }}>
                ✓ {status === 'PENDING' ? 'Bekleyen dead letter yok' : 'Kayıt yok'}
              </Typography>
              {status === 'PENDING' && (
                <Typography sx={{ fontSize: 12, color: 'rgba(30,41,59,0.55)', mt: 0.5 }}>
                  Tüm mesajlar başarıyla işleniyor
                </Typography>
              )}
            </Box>
          ) : (
            <>
              <Table size="small" sx={{ '& .MuiTableCell-root': { borderBottomColor: 'rgba(0,0,0,0.05)', color: '#1E293B' } }}>
                <TableHead>
                  <TableRow>
                    <HeaderCell>Topic</HeaderCell>
                    <HeaderCell>Key</HeaderCell>
                    <HeaderCell>Hata</HeaderCell>
                    <HeaderCell align="center">Retry</HeaderCell>
                    <HeaderCell>Başarısız Oldu</HeaderCell>
                    <HeaderCell align="center">Aksiyon</HeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map(entry => (
                    <TableRow key={entry.id} hover sx={{ '&:hover': { bgcolor: 'rgba(201,162,39,0.05) !important' } }}>
                      <TableCell sx={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: '#C9A227' }}>
                        {entry.topic}
                      </TableCell>
                      <TableCell sx={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(30,41,59,0.60)' }}>
                        {entry.messageKey ? `${entry.messageKey.slice(0, 12)}…` : '—'}
                      </TableCell>
                      <TableCell sx={{ fontSize: 11, maxWidth: 400 }}>
                        <Typography sx={{ fontSize: 11, color: '#ef4444', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {entry.errorMessage || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        {entry.retryCount > 0 ? (
                          <Chip label={entry.retryCount} size="small" sx={{ fontSize: 10, fontWeight: 700, height: 20, bgcolor: 'rgba(59,130,246,0.15)', color: '#3b82f6' }} />
                        ) : (
                          <Typography sx={{ fontSize: 11, color: 'rgba(30,41,59,0.45)' }}>—</Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(30,41,59,0.60)' }}>
                        {entry.failedAt ? new Date(entry.failedAt).toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" justifyContent="center" spacing={0.5}>
                          <Tooltip title="Payload incele" arrow>
                            <IconButton size="small" onClick={() => openDialog(entry)} sx={{ color: 'rgba(30,41,59,0.70)' }}>
                              <ViewIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Tooltip>
                          {entry.status === 'PENDING' && (
                            <>
                              <Tooltip title="Yeniden dene" arrow>
                                <IconButton size="small" onClick={() => handleRetry(entry.id)} disabled={anyMutating} sx={{ color: '#C9A227' }}>
                                  <RetryIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Kapat" arrow>
                                <IconButton size="small" onClick={() => handleDismiss(entry.id)} disabled={anyMutating} sx={{ color: 'rgba(239,68,68,0.7)' }}>
                                  <DismissIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                component="div"
                count={pageData?.totalElements ?? 0}
                page={page}
                onPageChange={(_, p) => setPage(p)}
                rowsPerPage={size}
                onRowsPerPageChange={(e) => { setSize(parseInt(e.target.value, 10)); setPage(0); }}
                rowsPerPageOptions={[25, 50, 100]}
                labelRowsPerPage="Sayfa başı"
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
                sx={{
                  color: 'rgba(30,41,59,0.70)',
                  borderTop: '1px solid rgba(0,0,0,0.05)',
                  '& .MuiSelect-icon': { color: 'rgba(30,41,59,0.55)' },
                }}
              />
            </>
          )}
        </Paper>

        <PayloadDialog
          open={dialogOpen}
          entry={selected}
          onClose={() => setDialogOpen(false)}
          onRetry={handleRetry}
          onDismiss={handleDismiss}
          loading={anyMutating}
        />

        <Box sx={{ mt: 5, pt: 3, borderTop: '1px solid rgba(0,0,0,0.05)', textAlign: 'center' }}>
          <Typography sx={{ fontSize: 10, letterSpacing: 2, fontWeight: 700, color: 'rgba(30,41,59,0.35)' }}>
            NARTGO DLQ • {STATUS_COLOR[status] && status}
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}

function HeaderCell({ children, align }: { children: React.ReactNode; align?: 'right' | 'center' }) {
  return (
    <TableCell align={align} sx={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, color: 'rgba(30,41,59,0.55) !important', textTransform: 'uppercase' }}>
      {children}
    </TableCell>
  );
}
