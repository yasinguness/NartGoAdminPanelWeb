import { useState, useMemo } from 'react';
import {
  Box, Container, Typography, Stack, IconButton, Tooltip, Chip, Alert, Button,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  FiberManualRecord as DotIcon,
  Lock as LockIcon,
  Replay as RefundIcon,
} from '@mui/icons-material';
import { Navigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { useRole } from '../../hooks/useRole';
import { useRefunds } from './useRefunds';
import RefundSummaryCards from './components/RefundSummary';
import RefundTable from './components/RefundTable';
import RefundActionDialog from './components/RefundActionDialog';
import type { RefundItem, RefundAction } from '../../services/refunds/refundTypes';

export default function Refunds() {
  const { isAdmin } = useRole();
  const { enqueueSnackbar } = useSnackbar();
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const { refunds, actMutation } = useRefunds({ status: statusFilter });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<RefundItem | null>(null);

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const data = refunds.data;
  const rows = data?.refunds || [];

  const lastUpdated = useMemo(() => {
    if (!refunds.dataUpdatedAt) return '—';
    const diff = Date.now() - refunds.dataUpdatedAt;
    if (diff < 60_000) return `${Math.round(diff / 1000)}sn önce`;
    if (diff < 3_600_000) return `${Math.round(diff / 60_000)}dk önce`;
    return new Date(refunds.dataUpdatedAt).toLocaleTimeString('tr-TR');
  }, [refunds.dataUpdatedAt]);

  const handleActionClick = (item: RefundItem) => {
    setSelected(item);
    setDialogOpen(true);
  };

  const handleConfirm = async (action: RefundAction, note: string) => {
    if (!selected) return;
    try {
      await actMutation.mutateAsync({ refundId: selected.refundId, payload: { action, note } });
      enqueueSnackbar('İade aksiyonu uygulandı — audit log\'a kaydedildi', { variant: 'success' });
      setDialogOpen(false);
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || err?.message || 'Aksiyon başarısız', { variant: 'error' });
    }
  };

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
                  Refunds • Yalnızca Admin
                </Typography>
              </Stack>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{ width: 48, height: 48, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
                  <RefundIcon sx={{ fontSize: 28 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: { xs: 28, md: 38 }, fontWeight: 700, lineHeight: 1, color: '#F3EEE0' }}>
                    İade Yönetimi
                  </Typography>
                  <Typography sx={{ mt: 0.5, fontSize: 13, color: 'rgba(243,238,224,0.65)' }}>
                    Bekleyen iadeler · SLA takibi · approve / retry / reject
                  </Typography>
                </Box>
              </Stack>
            </Box>

            <Stack direction="row" spacing={1.5} alignItems="center">
              <Chip
                icon={<DotIcon sx={{ fontSize: '10px !important', color: `${refunds.isFetching ? '#f59e0b' : '#22c55e'} !important` }} />}
                label={refunds.isFetching ? 'güncelleniyor' : `son: ${lastUpdated}`}
                size="small"
                sx={{ bgcolor: 'rgba(255,255,255,0.04)', color: 'rgba(243,238,224,0.8)', fontSize: 11, fontWeight: 600, height: 26, border: '1px solid rgba(255,255,255,0.08)' }}
              />
              <Tooltip title="Yenile" arrow>
                <IconButton onClick={() => refunds.refetch()} size="small" sx={{ color: '#C9A227', border: '1px solid rgba(201,162,39,0.2)' }}>
                  <RefreshIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        </Box>

        {!refunds.isLoading && !data && (
          <Alert severity="info" icon={false} sx={{ mb: 3, bgcolor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: 'rgba(243,238,224,0.85)' }}
            action={<Button size="small" onClick={() => refunds.refetch()} sx={{ color: '#C9A227', fontSize: 11, fontWeight: 700 }}>Tekrar Dene</Button>}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: '#f59e0b' }}>BACKEND YANIT VERMEDİ</Typography>
              <Typography sx={{ fontSize: 12 }}>
                <code style={{ fontFamily: 'monospace', fontSize: 11 }}>/finance/admin/refunds</code> endpoint'ine ulaşılamadı.
              </Typography>
            </Stack>
          </Alert>
        )}

        {/* SLA warning */}
        {(data?.summary?.slaBreachCount ?? 0) > 0 && (
          <Alert
            severity="error"
            icon={false}
            sx={{ mb: 3, bgcolor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#F3EEE0' }}
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: '#ef4444' }}>
                SLA İHLALİ
              </Typography>
              <Typography sx={{ fontSize: 12 }}>
                {data!.summary!.slaBreachCount} iade 48 saattir bekliyor. Hemen inceleyin.
              </Typography>
            </Stack>
          </Alert>
        )}

        <Box sx={{ mb: 3 }}>
          <RefundSummaryCards summary={data?.summary} loading={refunds.isLoading} />
        </Box>

        <RefundTable
          rows={rows}
          loading={refunds.isLoading}
          onAction={handleActionClick}
          statusFilter={statusFilter}
          onStatusFilter={setStatusFilter}
        />

        <Box sx={{ mt: 5, pt: 3, borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
          <Typography sx={{ fontSize: 10, letterSpacing: 2, fontWeight: 700, color: 'rgba(243,238,224,0.3)' }}>
            NARTGO REFUNDS • {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </Typography>
        </Box>

        <RefundActionDialog
          open={dialogOpen}
          item={selected}
          onClose={() => setDialogOpen(false)}
          onConfirm={handleConfirm}
          loading={actMutation.isPending}
        />
      </Container>
    </Box>
  );
}
