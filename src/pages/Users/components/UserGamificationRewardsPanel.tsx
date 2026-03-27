import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Delete as DeleteIcon, Refresh as RefreshIcon, Visibility as VisibilityIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { PageSection } from '../../../components/Page';
import { DataTable, DataTableColumn } from '../../../components/Data';
import ConfirmDialog from '../../../components/Actions/ConfirmDialog';
import { userService } from '../../../services/user/userService';
import {
  AdminUserGamificationRewardDetailDto,
  AdminUserGamificationRewardItemDto,
  AdminUserGamificationRewardsPage,
} from '../../../types/gamification/adminUserGamification';
import { 
  Storefront as BusinessIcon,
  Info as InfoIcon,
  Link as LinkIcon,
  TrendingUp as PointsIcon,
  Event as EventIcon,
  Description as SummaryIcon,
} from '@mui/icons-material';
import { Divider, Grid } from '@mui/material';

interface UserGamificationRewardsPanelProps {
  userId: string;
  onRewardsChanged?: () => Promise<void> | void;
}

const extractErrorMessage = (error: any, fallback: string): string => {
  const payload = error?.response?.data;

  if (typeof payload?.message === 'string' && payload.message.trim()) {
    return payload.message;
  }

  if (typeof payload?.statusMessage === 'string' && payload.statusMessage.trim()) {
    return payload.statusMessage;
  }

  if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
    return payload.errors.filter(Boolean).join(', ');
  }

  if (typeof error?.message === 'string' && error.message.trim()) {
    return error.message;
  }

  return fallback;
};

const formatDateTime = (value?: string | null): string => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(date);
};

const formatMetadata = (metadata?: string | null): string => {
  if (!metadata) {
    return '-';
  }

  try {
    const parsed = JSON.parse(metadata);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return metadata;
  }
};

export default function UserGamificationRewardsPanel({ userId, onRewardsChanged }: UserGamificationRewardsPanelProps) {
  const { enqueueSnackbar } = useSnackbar();
  const [rewardsPage, setRewardsPage] = useState<AdminUserGamificationRewardsPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [reasonFilter, setReasonFilter] = useState('');
  const [appliedReasonFilter, setAppliedReasonFilter] = useState('');

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedRewardId, setSelectedRewardId] = useState<string | null>(null);
  const [selectedRewardDetail, setSelectedRewardDetail] = useState<AdminUserGamificationRewardDetailDto | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteReward, setPendingDeleteReward] = useState<AdminUserGamificationRewardItemDto | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  const fetchRewards = useCallback(async () => {
    if (!userId) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await userService.getUserGamificationRewards(userId, {
        reason: appliedReasonFilter || undefined,
        page: page - 1,
        size: pageSize,
      });
      setRewardsPage(response.data);
    } catch (fetchError: any) {
      const message = extractErrorMessage(fetchError, 'Failed to fetch gamification rewards.');
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [appliedReasonFilter, page, pageSize, userId]);

  useEffect(() => {
    void fetchRewards();
  }, [fetchRewards]);

  const openRewardDetail = useCallback(async (rewardId: string) => {
    try {
      setDetailOpen(true);
      setSelectedRewardId(rewardId);
      setDetailLoading(true);
      setSelectedRewardDetail(null);

      const response = await userService.getUserGamificationRewardDetail(userId, rewardId);
      setSelectedRewardDetail(response.data);
    } catch (fetchError: any) {
      const message = extractErrorMessage(fetchError, 'Failed to fetch reward detail.');
      enqueueSnackbar(message, { variant: 'error' });
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  }, [enqueueSnackbar, userId]);

  const openDeleteConfirm = useCallback((reward: AdminUserGamificationRewardItemDto) => {
    setPendingDeleteReward(reward);
    setConfirmOpen(true);
  }, []);

  const closeDeleteConfirm = useCallback(() => {
    if (deleteLoading) {
      return;
    }

    setConfirmOpen(false);
    setPendingDeleteReward(null);
  }, [deleteLoading]);

  const handleDeleteReward = useCallback(async () => {
    if (!pendingDeleteReward) {
      return;
    }

    try {
      setDeleteLoading(true);
      await userService.deleteUserGamificationReward(userId, pendingDeleteReward.rewardId);

      if (selectedRewardId === pendingDeleteReward.rewardId) {
        setDetailOpen(false);
        setSelectedRewardId(null);
        setSelectedRewardDetail(null);
      }

      await fetchRewards();
      await onRewardsChanged?.();

      enqueueSnackbar('Reward kaydi silindi. Kullanici puani geri alindi.', { variant: 'success' });
      setConfirmOpen(false);
      setPendingDeleteReward(null);
    } catch (deleteError: any) {
      const message = extractErrorMessage(deleteError, 'Reward kaydi silinemedi.');
      enqueueSnackbar(message, { variant: 'error' });
      setError(message);
    } finally {
      setDeleteLoading(false);
    }
  }, [enqueueSnackbar, fetchRewards, onRewardsChanged, pendingDeleteReward, selectedRewardId, userId]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.length === 0) return;

    try {
      setBulkDeleteLoading(true);
      
      // Perform deletions sequentially or in parallel
      // We'll do them in parallel for better performance since they are independent
      const deletePromises = selectedIds.map(id => 
        userService.deleteUserGamificationReward(userId, String(id))
      );
      
      await Promise.all(deletePromises);

      await fetchRewards();
      await onRewardsChanged?.();
      
      enqueueSnackbar(`${selectedIds.length} adet ödül kaydı silindi.`, { variant: 'success' });
      setBulkConfirmOpen(false);
      setSelectedIds([]);
    } catch (bulkError: any) {
      const message = extractErrorMessage(bulkError, 'Bazı ödül kayıtları silinemedi.');
      enqueueSnackbar(message, { variant: 'error' });
    } finally {
      setBulkDeleteLoading(false);
    }
  }, [selectedIds, userId, fetchRewards, onRewardsChanged, enqueueSnackbar]);

  const columns: DataTableColumn<AdminUserGamificationRewardItemDto>[] = useMemo(() => ([
    {
      id: 'points',
      label: 'Points',
      width: 120,
      render: (row) => (
        <Stack direction="row" spacing={1} alignItems="center">
          <PointsIcon sx={{ fontSize: 18, color: row.points > 0 ? 'success.main' : 'error.main' }} />
          <Chip
            label={`${row.points > 0 ? '+' : ''}${row.points}`}
            size="small"
            color={row.points > 0 ? 'success' : row.points < 0 ? 'error' : 'default'}
            variant={row.points === 0 ? 'outlined' : 'filled'}
            sx={{ fontWeight: 700, minWidth: 45 }}
          />
        </Stack>
      ),
    },
    {
      id: 'action',
      label: 'Action & Context',
      minWidth: 350,
      render: (row) => (
        <Stack spacing={0.5} py={1}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
              {row.actionLabel || row.reason || '-'}
            </Typography>
            {row.category && (
              <Chip 
                label={row.category} 
                size="small" 
                variant="outlined"
                sx={{ 
                  height: 18, 
                  fontSize: '10px', 
                  textTransform: 'uppercase',
                  borderColor: row.category === 'PENALTY' ? 'error.light' : row.category === 'CONTRIBUTION' ? 'success.light' : 'divider',
                  color: row.category === 'PENALTY' ? 'error.main' : row.category === 'CONTRIBUTION' ? 'success.main' : 'text.secondary'
                }} 
              />
            )}
          </Stack>
          
          {row.descriptionSummary && (
            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              "{row.descriptionSummary}"
            </Typography>
          )}

          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ gap: 1, mt: 0.5 }}>
            {row.businessName && (
              <Chip 
                label={row.businessName} 
                size="small" 
                variant="outlined" 
                icon={<BusinessIcon sx={{ fontSize: '14px !important' }} />}
                sx={{ height: 20, bgcolor: 'rgba(25, 118, 210, 0.04)' }}
              />
            )}
            {row.referenceName && (
              <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'primary.main' }}>
                <LinkIcon sx={{ fontSize: 12 }} />
                {row.referenceName}
              </Typography>
            )}
          </Stack>
        </Stack>
      ),
    },
    {
      id: 'createdAt',
      label: 'Time',
      width: 180,
      render: (row) => (
        <Typography variant="caption" display="block">
          {formatDateTime(row.createdAt)}
        </Typography>
      ),
    },
    {
      id: 'ids',
      label: 'Tracing Keys',
      width: 150,
      hideOnMobile: true,
      render: (row) => (
        <Stack spacing={0.25}>
          <Typography variant="caption" color="text.disabled" sx={{ fontSize: '10px' }}>
            REF: {row.referenceId?.slice(0, 8) || '-'}
          </Typography>
          <Typography variant="caption" color="text.disabled" sx={{ fontSize: '10px' }}>
            ID: {row.rewardId.slice(0, 8)}
          </Typography>
        </Stack>
      ),
    },
  ]), []);

  return (
    <>
      <PageSection
        title="Gamification Rewards"
        subtitle="Kullanıcının kazandığı ödül geçmişi ve detayları"
        headerActions={
          <>
            <TextField
              size="small"
              label="Reason"
              value={reasonFilter}
              onChange={(event) => setReasonFilter(event.target.value)}
              sx={{ minWidth: 160 }}
            />
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel id="rewards-page-size-label">Size</InputLabel>
              <Select
                labelId="rewards-page-size-label"
                label="Size"
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
              >
                {[10, 20, 50].map((size) => (
                  <MenuItem key={size} value={size}>{size}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                setAppliedReasonFilter(reasonFilter.trim());
                setPage(1);
              }}
            >
              Apply
            </Button>
            {selectedIds.length > 0 && (
              <Button
                size="small"
                variant="contained"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => setBulkConfirmOpen(true)}
              >
                Seçilenleri Sil ({selectedIds.length})
              </Button>
            )}
            <Button size="small" variant="outlined" startIcon={<RefreshIcon />} onClick={() => void fetchRewards()}>
              Refresh
            </Button>
          </>
        }
      >
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <DataTable
          columns={columns}
          data={rewardsPage?.content || []}
          loading={loading}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          getRowKey={(row) => row.rewardId}
          onRowClick={(row) => void openRewardDetail(row.rewardId)}
          pagination={{
            page,
            pageSize: rewardsPage?.size || pageSize,
            total: rewardsPage?.totalElements || 0,
            onPageChange: setPage,
          }}
          emptyState={{
            title: 'No rewards found',
            description: 'Bu kullanıcı için henüz gamification ödülü yok.',
          }}
          renderRowActions={(row) => (
            <Stack direction="row" spacing={1} className="row-actions">
              <Button
                size="small"
                startIcon={<VisibilityIcon />}
                onClick={() => void openRewardDetail(row.rewardId)}
              >
                Detail
              </Button>
              <Button
                size="small"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => openDeleteConfirm(row)}
              >
                Sil
              </Button>
            </Stack>
          )}
        />
      </PageSection>

      <Dialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Gamification Reward Detail</DialogTitle>
        <DialogContent dividers>
          {detailLoading ? (
            <Typography variant="body2">Loading detail...</Typography>
          ) : !selectedRewardDetail ? (
            <Typography variant="body2" color="text.secondary">Reward detail not found.</Typography>
          ) : (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="overline" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PointsIcon fontSize="small" /> Puan ve Aksiyon
                    </Typography>
                    <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 1 }}>
                      <Chip 
                        label={`${selectedRewardDetail.points > 0 ? '+' : ''}${selectedRewardDetail.points} XP`}
                        color={selectedRewardDetail.points >= 0 ? 'success' : 'error'}
                        sx={{ fontWeight: 'bold' }}
                      />
                      <Typography variant="body1" fontWeight={600}>
                        {selectedRewardDetail.actionLabel || selectedRewardDetail.reason}
                      </Typography>
                    </Stack>
                  </Box>

                  <Box>
                    <Typography variant="overline" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <SummaryIcon fontSize="small" /> Özet
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5, bgcolor: 'action.hover', p: 1.5, borderRadius: 1 }}>
                      {selectedRewardDetail.descriptionSummary || 'Aksiyon için bir özet açıklaması bulunmuyor.'}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="overline" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <BusinessIcon fontSize="small" /> İlgili İşletme / Etki
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      {selectedRewardDetail.businessName || '-'}
                    </Typography>
                    {selectedRewardDetail.businessId && (
                      <Typography variant="caption" color="text.secondary">ID: {selectedRewardDetail.businessId}</Typography>
                    )}
                  </Box>
                </Stack>
              </Grid>

              <Grid item xs={12} md={6}>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="overline" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <EventIcon fontSize="small" /> Tarih ve Kullanıcı
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      {formatDateTime(selectedRewardDetail.createdAt)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {(selectedRewardDetail.userDisplayName || selectedRewardDetail.userEmail || selectedRewardDetail.userId) || '-'}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="overline" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinkIcon fontSize="small" /> Referanslar
                    </Typography>
                    <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="caption">Referans:</Typography>
                        <Typography variant="caption" fontWeight={600}>{selectedRewardDetail.referenceName || selectedRewardDetail.referenceId || '-'}</Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="caption">Tür:</Typography>
                        <Typography variant="caption" fontWeight={600}>{selectedRewardDetail.referenceType || '-'}</Typography>
                      </Box>
                    </Stack>
                  </Box>

                  <Box>
                    <Typography variant="overline" color="text.secondary">Tranzaksiyon Kimliği</Typography>
                    <Typography variant="body2" sx={{ fontSize: 11, color: 'text.secondary', wordBreak: 'break-all' }}>
                      {selectedRewardDetail.rewardId}
                    </Typography>
                  </Box>
                </Stack>
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ mb: 1 }} />
                <Typography variant="overline" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <InfoIcon fontSize="small" /> Teknik Metadata
                </Typography>
                <Box
                  component="pre"
                  sx={{
                    mt: 1,
                    p: 2,
                    borderRadius: 1.5,
                    fontSize: 12,
                    overflowX: 'auto',
                    bgcolor: '#1e1e1e',
                    color: '#e0e0e0',
                    border: '1px solid',
                    borderColor: 'divider',
                    maxHeight: 200
                  }}
                >
                  {formatMetadata(selectedRewardDetail.metadata)}
                </Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>Kapat</Button>
          <Button
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => {
              const reward = rewardsPage?.content.find((r) => r.rewardId === (selectedRewardDetail?.rewardId || selectedRewardId));
              if (reward) {
                openDeleteConfirm(reward);
              }
            }}
          >
            Sil
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onClose={closeDeleteConfirm}
        onConfirm={() => void handleDeleteReward()}
        title="Reward Kaydini Sil"
        message="Bu kayıt silinirse kullanıcının kazandığı puan geri alınır. Uygunsa devam et."
        confirmText="Sil ve Puani Geri Al"
        cancelText="Vazgec"
        severity="warning"
        loading={deleteLoading}
      />

      <ConfirmDialog
        open={bulkConfirmOpen}
        onClose={() => !bulkDeleteLoading && setBulkConfirmOpen(false)}
        onConfirm={() => void handleBulkDelete()}
        title="Toplu Ödül Sil"
        message={`Seçilen ${selectedIds.length} adet ödül kaydı silinecektir. Bu işlem geri alınamaz ve kullanıcı puanları düşülecektir. Devam etmek istiyor musunuz?`}
        confirmText="Seçilenleri Sil"
        cancelText="Vazgeç"
        severity="error"
        loading={bulkDeleteLoading}
      />
    </>
  );
}
