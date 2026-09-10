import { useState, useMemo } from 'react';
import {
  Box, Container, Typography, Stack, IconButton, Tooltip, Chip, Alert, Button,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  FiberManualRecord as DotIcon,
  Lock as LockIcon,
  CompareArrows as ReconIcon,
} from '@mui/icons-material';
import { Navigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { useRole } from '../../hooks/useRole';
import { useReconciliation } from './useReconciliation';
import SummaryCards from './components/SummaryCards';
import MismatchTable from './components/MismatchTable';
import ResolveDialog from './components/ResolveDialog';
import type { Mismatch, ResolveAction } from '../../services/reconciliation/reconciliationTypes';

export default function Reconciliation() {
  const { isAdmin } = useRole();
  const { enqueueSnackbar } = useSnackbar();
  const { mismatches, resolveMutation } = useReconciliation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<Mismatch | null>(null);

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const data = mismatches.data;
  const rows = data?.mismatches || [];

  const lastUpdated = useMemo(() => {
    if (!mismatches.dataUpdatedAt) return '—';
    const diff = Date.now() - mismatches.dataUpdatedAt;
    if (diff < 60_000) return `${Math.round(diff / 1000)}sn önce`;
    if (diff < 3_600_000) return `${Math.round(diff / 60_000)}dk önce`;
    return new Date(mismatches.dataUpdatedAt).toLocaleTimeString('tr-TR');
  }, [mismatches.dataUpdatedAt]);

  const handleResolveClick = (m: Mismatch) => {
    setSelected(m);
    setDialogOpen(true);
  };

  const handleConfirm = async (action: ResolveAction, reason: string) => {
    if (!selected) return;
    try {
      await resolveMutation.mutateAsync({
        paymentId: selected.paymentId,
        payload: { action, reason },
      });
      enqueueSnackbar('Uyumsuzluk çözüldü — audit log\'a kaydedildi', { variant: 'success' });
      setDialogOpen(false);
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || err?.message || 'Çözümleme başarısız', { variant: 'error' });
    }
  };

  return (
    <Box
      sx={{
        minHeight: 'calc(100vh - 64px)',
        bgcolor: '#FAFAFA',
        color: '#1E293B',
        mx: { xs: -2, sm: -3 },
        my: -3,
        py: 4,
      }}
    >
      <Container maxWidth="xl">
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2}>
            <Box>
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.5 }}>
                <LockIcon sx={{ fontSize: 16, color: '#C9A227' }} />
                <Typography sx={{ fontSize: 10, letterSpacing: 2, fontWeight: 800, color: '#C9A227', textTransform: 'uppercase' }}>
                  Reconciliation • Yalnızca Admin
                </Typography>
              </Stack>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{
                  width: 48, height: 48, borderRadius: 2,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  bgcolor: 'rgba(239,68,68,0.12)', color: '#ef4444',
                }}>
                  <ReconIcon sx={{ fontSize: 28 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontFamily: 'inherit', fontStyle: 'normal', fontSize: { xs: 28, md: 38 }, fontWeight: 700, lineHeight: 1, color: '#1E293B' }}>
                    Mutabakat Paneli
                  </Typography>
                  <Typography sx={{ mt: 0.5, fontSize: 13, color: 'rgba(30,41,59,0.70)' }}>
                    Iyzico ↔ iç DB — takılı ödemeler, provider-DB tutarsızlıkları, mükerrer işlemler
                  </Typography>
                </Box>
              </Stack>
            </Box>

            <Stack direction="row" spacing={1.5} alignItems="center">
              <Chip
                icon={<DotIcon sx={{ fontSize: '10px !important', color: `${mismatches.isFetching ? '#f59e0b' : '#22c55e'} !important` }} />}
                label={mismatches.isFetching ? 'taranıyor' : `son: ${lastUpdated}`}
                size="small"
                sx={{
                  bgcolor: 'rgba(0,0,0,0.03)',
                  color: 'rgba(30,41,59,0.80)',
                  fontSize: 11,
                  fontWeight: 600,
                  height: 26,
                  border: '1px solid rgba(0,0,0,0.06)',
                }}
              />
              <Tooltip title="Yeniden tara" arrow>
                <IconButton onClick={() => mismatches.refetch()} size="small" sx={{ color: '#C9A227', border: '1px solid rgba(201,162,39,0.2)' }}>
                  <RefreshIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        </Box>

        {/* Missing data warning */}
        {!mismatches.isLoading && !data && (
          <Alert
            severity="info"
            icon={false}
            sx={{
              mb: 3,
              bgcolor: 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.25)',
              color: 'rgba(30,41,59,0.85)',
            }}
            action={
              <Button size="small" onClick={() => mismatches.refetch()} sx={{ color: '#C9A227', fontSize: 11, fontWeight: 700 }}>
                Tekrar Dene
              </Button>
            }
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: '#f59e0b' }}>
                BACKEND YANIT VERMEDİ
              </Typography>
              <Typography sx={{ fontSize: 12 }}>
                <code style={{ fontFamily: 'monospace', fontSize: 11 }}>/finance/admin/reconciliation/mismatches</code> endpoint'ine ulaşılamadı.
              </Typography>
            </Stack>
          </Alert>
        )}

        {/* Summary */}
        <Box sx={{ mb: 3 }}>
          <SummaryCards
            summary={data?.summary}
            totalMismatches={data?.totalMismatches || 0}
            loading={mismatches.isLoading}
          />
        </Box>

        {/* Table */}
        <MismatchTable
          rows={rows}
          loading={mismatches.isLoading}
          onResolve={handleResolveClick}
        />

        {/* Footer */}
        <Box sx={{ mt: 5, pt: 3, borderTop: '1px solid rgba(0,0,0,0.05)', textAlign: 'center' }}>
          <Typography sx={{ fontSize: 10, letterSpacing: 2, fontWeight: 700, color: 'rgba(30,41,59,0.35)' }}>
            NARTGO RECONCILIATION • {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </Typography>
        </Box>

        <ResolveDialog
          open={dialogOpen}
          mismatch={selected}
          onClose={() => setDialogOpen(false)}
          onConfirm={handleConfirm}
          loading={resolveMutation.isPending}
        />
      </Container>
    </Box>
  );
}
