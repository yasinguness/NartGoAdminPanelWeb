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

  const columns: DataTableColumn<AdminUserGamificationRewardItemDto>[] = useMemo(() => ([
    {
      id: 'points',
      label: 'Points',
      width: 110,
      render: (row) => (
        <Chip
          label={row.points}
          size="small"
          color={row.points > 0 ? 'success' : row.points < 0 ? 'error' : 'default'}
          variant={row.points === 0 ? 'outlined' : 'filled'}
        />
      ),
    },
    {
      id: 'reason',
      label: 'Reason',
      minWidth: 150,
      render: (row) => <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.reason || '-'}</Typography>,
    },
    {
      id: 'businessName',
      label: 'Business Name',
      minWidth: 150,
      render: (row) => <Typography variant="body2">{row.businessName || '-'}</Typography>,
    },
    {
      id: 'createdAt',
      label: 'Created At',
      minWidth: 180,
      render: (row) => formatDateTime(row.createdAt),
    },
    {
      id: 'referenceId',
      label: 'Reference ID',
      minWidth: 180,
      hideOnMobile: true,
      render: (row) => <Typography variant="caption">{row.referenceId || '-'}</Typography>,
    },
    {
      id: 'rewardId',
      label: 'Reward ID',
      minWidth: 200,
      hideOnMobile: true,
      render: (row) => <Typography variant="caption">{row.rewardId}</Typography>,
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
            <Stack spacing={2}>
              <Box>
                <Typography variant="caption" color="text.secondary">Reward ID</Typography>
                <Typography variant="body2">{selectedRewardDetail.rewardId || selectedRewardId}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">User</Typography>
                <Typography variant="body2">
                  {(selectedRewardDetail.userDisplayName || selectedRewardDetail.userEmail || selectedRewardDetail.userId) || '-'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Points</Typography>
                <Typography variant="body2">{selectedRewardDetail.points ?? 0}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Reason</Typography>
                <Typography variant="body2">{selectedRewardDetail.reason || '-'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Business Name</Typography>
                <Typography variant="body2">{selectedRewardDetail.businessName || '-'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Reference ID</Typography>
                <Typography variant="body2">{selectedRewardDetail.referenceId || '-'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Idempotency Key</Typography>
                <Typography variant="body2">{selectedRewardDetail.idempotencyKey || '-'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Created At</Typography>
                <Typography variant="body2">{formatDateTime(selectedRewardDetail.createdAt)}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Metadata</Typography>
                <Box
                  component="pre"
                  sx={{
                    mt: 0.5,
                    mb: 0,
                    p: 1.5,
                    borderRadius: 1,
                    fontSize: 12,
                    overflowX: 'auto',
                    bgcolor: 'grey.100',
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  {formatMetadata(selectedRewardDetail.metadata)}
                </Box>
              </Box>
            </Stack>
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
    </>
  );
}
