import { useState, useMemo } from 'react';
import {
  Box, Container, Typography, Stack, IconButton, Tooltip, Chip, Alert, Button, Skeleton, TextField, InputAdornment,
  ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  FiberManualRecord as DotIcon,
  Lock as LockIcon,
  AccountBalanceWallet as PayoutIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { Navigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { useRole } from '../../hooks/useRole';
import { usePayouts } from './usePayouts';
import SummaryCards from './components/SummaryCards';
import OrganizerRow from './components/OrganizerRow';
import BulkActionBar from './components/BulkActionBar';
import { toNumber } from './components/helpers';

const FILTERS = [
  { key: 'ALL', label: 'Tümü' },
  { key: 'PENDING', label: 'Bekleyen' },
  { key: 'FAILED', label: 'Başarısız Olan' },
];

export default function Payouts() {
  const { isAdmin } = useRole();
  const { enqueueSnackbar } = useSnackbar();
  const { byOrganizer, approveMutation, retryMutation } = usePayouts();
  const [selectedBatches, setSelectedBatches] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const data = byOrganizer.data;
  const organizers = data?.organizers || [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return organizers.filter(o => {
      if (filter === 'PENDING' && o.pendingBatches === 0) return false;
      if (filter === 'FAILED' && o.failedBatches === 0) return false;
      if (q && !o.displayName.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [organizers, filter, search]);

  const lastUpdated = useMemo(() => {
    if (!byOrganizer.dataUpdatedAt) return '—';
    const diff = Date.now() - byOrganizer.dataUpdatedAt;
    if (diff < 60_000) return `${Math.round(diff / 1000)}sn önce`;
    if (diff < 3_600_000) return `${Math.round(diff / 60_000)}dk önce`;
    return new Date(byOrganizer.dataUpdatedAt).toLocaleTimeString('tr-TR');
  }, [byOrganizer.dataUpdatedAt]);

  const handleToggleBatch = (batchId: string) => {
    setSelectedBatches(prev => {
      const next = new Set(prev);
      if (next.has(batchId)) next.delete(batchId);
      else next.add(batchId);
      return next;
    });
  };

  const handleSelectAllOrganizerBatches = (ids: string[], selectAll: boolean) => {
    setSelectedBatches(prev => {
      const next = new Set(prev);
      if (selectAll) ids.forEach(id => next.add(id));
      else ids.forEach(id => next.delete(id));
      return next;
    });
  };

  const clearSelection = () => setSelectedBatches(new Set());

  const handleBulkApprove = async () => {
    const ids = Array.from(selectedBatches);
    if (ids.length === 0) return;
    try {
      const result = await approveMutation.mutateAsync({ batchIds: ids, note: 'Bulk approve from Payouts panel' });
      enqueueSnackbar(`${result?.succeeded ?? 0}/${ids.length} batch onaylandı`, { variant: 'success' });
      clearSelection();
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Toplu onay başarısız', { variant: 'error' });
    }
  };

  const handleBulkRetry = async () => {
    const ids = Array.from(selectedBatches);
    if (ids.length === 0) return;
    try {
      const result = await retryMutation.mutateAsync({ batchIds: ids });
      enqueueSnackbar(`${result?.succeeded ?? 0}/${ids.length} batch retry başlatıldı`, { variant: 'success' });
      clearSelection();
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Retry başarısız', { variant: 'error' });
    }
  };

  const anyMutating = approveMutation.isPending || retryMutation.isPending;
  const totalPendingOrgs = data?.summary?.organizersWithPending ?? 0;

  return (
    <Box
      sx={{
        minHeight: 'calc(100vh - 64px)',
        bgcolor: '#060C09',
        color: '#F3EEE0',
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
                  Payouts • Yalnızca Admin
                </Typography>
              </Stack>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{ width: 48, height: 48, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>
                  <PayoutIcon sx={{ fontSize: 28 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: { xs: 28, md: 38 }, fontWeight: 700, lineHeight: 1, color: '#F3EEE0' }}>
                    Organizatör Payouts
                  </Typography>
                  <Typography sx={{ mt: 0.5, fontSize: 13, color: 'rgba(243,238,224,0.65)' }}>
                    Bekleyen ödemeler • toplu onay • retry • SLA takibi
                  </Typography>
                </Box>
              </Stack>
            </Box>

            <Stack direction="row" spacing={1.5} alignItems="center">
              <Chip
                icon={<DotIcon sx={{ fontSize: '10px !important', color: `${byOrganizer.isFetching ? '#f59e0b' : '#22c55e'} !important` }} />}
                label={byOrganizer.isFetching ? 'güncelleniyor' : `son: ${lastUpdated}`}
                size="small"
                sx={{ bgcolor: 'rgba(255,255,255,0.04)', color: 'rgba(243,238,224,0.8)', fontSize: 11, fontWeight: 600, height: 26, border: '1px solid rgba(255,255,255,0.08)' }}
              />
              <Tooltip title="Yenile" arrow>
                <IconButton onClick={() => byOrganizer.refetch()} size="small" sx={{ color: '#C9A227', border: '1px solid rgba(201,162,39,0.2)' }}>
                  <RefreshIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        </Box>

        {!byOrganizer.isLoading && !data && (
          <Alert severity="info" icon={false} sx={{ mb: 3, bgcolor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: 'rgba(243,238,224,0.85)' }}
            action={<Button size="small" onClick={() => byOrganizer.refetch()} sx={{ color: '#C9A227', fontSize: 11, fontWeight: 700 }}>Tekrar Dene</Button>}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: '#f59e0b' }}>BACKEND YANIT VERMEDİ</Typography>
              <Typography sx={{ fontSize: 12 }}>
                <code style={{ fontFamily: 'monospace', fontSize: 11 }}>/finance/admin/payouts/by-organizer</code> endpoint'ine ulaşılamadı.
              </Typography>
            </Stack>
          </Alert>
        )}

        <Box sx={{ mb: 3 }}>
          <SummaryCards summary={data?.summary} loading={byOrganizer.isLoading} />
        </Box>

        <BulkActionBar
          selectedCount={selectedBatches.size}
          onApprove={handleBulkApprove}
          onRetry={handleBulkRetry}
          onClear={clearSelection}
          loading={anyMutating}
        />

        {/* Filter bar */}
        <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <ToggleButtonGroup
            size="small"
            value={filter}
            exclusive
            onChange={(_, v) => v && setFilter(v)}
            sx={{
              bgcolor: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              '& .MuiToggleButton-root': {
                color: 'rgba(243,238,224,0.6)',
                fontSize: 11, fontWeight: 700, px: 1.5, py: 0.5, border: 'none', textTransform: 'none',
                '&.Mui-selected': { bgcolor: 'rgba(201,162,39,0.18)', color: '#C9A227' },
              },
            }}
          >
            {FILTERS.map(f => <ToggleButton key={f.key} value={f.key}>{f.label}</ToggleButton>)}
          </ToggleButtonGroup>
          <Box sx={{ flex: 1 }} />
          <TextField
            size="small"
            placeholder="Organizatör ara..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16, color: 'rgba(243,238,224,0.4)' }} /></InputAdornment>,
            }}
            sx={{
              minWidth: 260,
              '& .MuiOutlinedInput-root': {
                bgcolor: 'rgba(255,255,255,0.03)', fontSize: 12, color: '#F3EEE0',
                '& fieldset': { borderColor: 'rgba(255,255,255,0.08)' },
              },
            }}
          />
        </Stack>

        {/* Organizer list */}
        {byOrganizer.isLoading ? (
          <Stack spacing={1.5}>
            {[1, 2, 3, 4].map(i => <Skeleton key={i} variant="rectangular" height={72} sx={{ bgcolor: 'rgba(255,255,255,0.04)', borderRadius: 2 }} />)}
          </Stack>
        ) : organizers.length === 0 ? (
          <Box sx={{ py: 8, textAlign: 'center' }}>
            <Typography sx={{ fontSize: 14, color: '#22c55e', fontWeight: 700 }}>✓ Bekleyen payout yok</Typography>
            <Typography sx={{ fontSize: 12, color: 'rgba(243,238,224,0.5)', mt: 0.5 }}>Tüm organizatörler güncel</Typography>
          </Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography sx={{ fontSize: 12, color: 'rgba(243,238,224,0.4)', fontStyle: 'italic' }}>
              Filtreyle eşleşen organizatör yok
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1.5}>
            {filtered.map(org => (
              <OrganizerRow
                key={org.businessId}
                organizer={org}
                selectedBatches={selectedBatches}
                onToggleBatch={handleToggleBatch}
                onSelectAllOrganizerBatches={handleSelectAllOrganizerBatches}
              />
            ))}
          </Stack>
        )}

        {/* Footer info */}
        <Box sx={{ mt: 5, pt: 3, borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
          <Typography sx={{ fontSize: 10, letterSpacing: 2, fontWeight: 700, color: 'rgba(243,238,224,0.3)' }}>
            NARTGO PAYOUTS • {totalPendingOrgs} organizatör · {toNumber(data?.summary?.totalPendingBatches)} bekleyen batch
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
