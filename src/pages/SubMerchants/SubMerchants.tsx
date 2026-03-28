import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Button,
  MenuItem,
  Stack,
  TextField,
  Typography,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Add as AddIcon,
  Autorenew as SyncIcon,
  Visibility as VisibilityIcon,
  PublishedWithChanges as StatusIcon,
  AccountBalance as AccountBalanceIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { DataTable, StatusChip } from '../../components/Data';
import { ActionMenu, ConfirmDialog } from '../../components/Actions';
import { FilterBar } from '../../components/Filter';
import { PageContainer, PageHeader, PageSection } from '../../components/Page';
import {
  useSubMerchants,
  useSyncSubMerchantIyzico,
  useUpdateSubMerchantStatus,
} from '../../hooks/subMerchants/useSubMerchants';
import { SubMerchantOwnerType, SubMerchantStatus, SubMerchantSummary } from '../../types/subMerchant';
import { formatDate, formatDateTime } from './subMerchantUtils';

export default function SubMerchants() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [ownerType, setOwnerType] = useState<SubMerchantOwnerType | ''>('');
  const [status, setStatus] = useState<SubMerchantStatus | ''>('');
  const [statusTarget, setStatusTarget] = useState<SubMerchantSummary | null>(null);
  const syncMutation = useSyncSubMerchantIyzico();
  const statusMutation = useUpdateSubMerchantStatus();

  const query = useSubMerchants({
    page: page - 1,
    size: 10,
    search,
    ownerType,
    status,
  });

  const activeFilterCount = useMemo(
    () => [search, ownerType, status].filter(Boolean).length,
    [search, ownerType, status]
  );

  const handleSync = async (item: SubMerchantSummary) => {
    try {
      await syncMutation.mutateAsync({
        id: item.id,
        idempotencyKey: crypto.randomUUID(),
      });
      enqueueSnackbar('Iyzico sync tetiklendi.', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('Iyzico sync başarısız oldu.', { variant: 'error' });
    }
  };

  const handleStatusUpdate = async () => {
    if (!statusTarget) {
      return;
    }

    const nextStatus: SubMerchantStatus = statusTarget.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    try {
      await statusMutation.mutateAsync({
        id: statusTarget.id,
        status: nextStatus,
      });
      enqueueSnackbar(`Durum ${nextStatus} olarak güncellendi.`, { variant: 'success' });
      setStatusTarget(null);
    } catch (error) {
      enqueueSnackbar('Durum güncellenemedi.', { variant: 'error' });
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Alt Üye İşyeri"
        subtitle="Liste, durum yönetimi ve Iyzico operasyonları tek modülde."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Alt Üye İşyeri', active: true },
        ]}
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/sub-merchants/new')}>
            Alt Üye İşyeri Oluştur
          </Button>
        }
      />

      <PageSection title="Liste">
        <FilterBar
          search={{
            value: search,
            onChange: (value) => {
              setSearch(value);
              setPage(1);
            },
            placeholder: 'Ad, owner id veya iyzico key ile ara',
          }}
          filters={
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ minWidth: { md: 420 } }}>
              <TextField
                select
                size="small"
                label="Owner Type"
                value={ownerType}
                onChange={(event) => {
                  setOwnerType(event.target.value as SubMerchantOwnerType | '');
                  setPage(1);
                }}
                sx={{ minWidth: 180 }}
              >
                <MenuItem value="">Tümü</MenuItem>
                <MenuItem value="ASSOCIATION">ASSOCIATION</MenuItem>
                <MenuItem value="BUSINESS">BUSINESS</MenuItem>
                <MenuItem value="INDIVIDUAL">INDIVIDUAL</MenuItem>
              </TextField>
              <TextField
                select
                size="small"
                label="Status"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value as SubMerchantStatus | '');
                  setPage(1);
                }}
                sx={{ minWidth: 160 }}
              >
                <MenuItem value="">Tümü</MenuItem>
                <MenuItem value="ACTIVE">ACTIVE</MenuItem>
                <MenuItem value="DISABLED">DISABLED</MenuItem>
              </TextField>
            </Stack>
          }
          onClearFilters={() => {
            setSearch('');
            setOwnerType('');
            setStatus('');
            setPage(1);
          }}
          activeFilterCount={activeFilterCount}
        />

        {query.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Liste verisi alınamadı.
          </Alert>
        )}

        <DataTable
          columns={[
            { id: 'name', label: 'Ad', render: (row: SubMerchantSummary) => <Typography fontWeight={600}>{row.name}</Typography> },
            { id: 'ownerType', label: 'Owner Type', accessor: 'ownerType' },
            { id: 'ownerId', label: 'Owner ID', accessor: 'ownerId', minWidth: 220 },
            { id: 'email', label: 'Email', accessor: 'email' },
            { id: 'status', label: 'Status', render: (row: SubMerchantSummary) => <StatusChip status={row.status} /> },
            { id: 'iyzicoSubMerchantKey', label: 'Iyzico Key', accessor: 'iyzicoSubMerchantKey' },
            {
              id: 'iyzicoSubMerchantSyncedAt',
              label: 'Son Sync',
              render: (row: SubMerchantSummary) => formatDateTime(row.iyzicoSubMerchantSyncedAt),
            },
            {
              id: 'createdAt',
              label: 'Created',
              render: (row: SubMerchantSummary) => formatDate(row.createdAt),
            },
          ]}
          data={query.data?.content || []}
          loading={query.isLoading}
          onRowClick={(row) => navigate(`/sub-merchants/${row.id}`)}
          pagination={{
            page,
            pageSize: query.data?.size || 10,
            total: query.data?.totalElements || 0,
            onPageChange: setPage,
          }}
          emptyState={{
            title: 'Kayıt bulunamadı',
            description: 'Filtreleri temizleyin veya yeni alt üye işyeri oluşturun.',
          }}
          renderRowActions={(row) => (
            <ActionMenu>
              <MenuItem onClick={() => navigate(`/sub-merchants/${row.id}`)}>
                <ListItemIcon>
                  <VisibilityIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Detay</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => setStatusTarget(row)}>
                <ListItemIcon>
                  <StatusIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Durum Değiştir</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => navigate(`/sub-merchants/${row.id}#iyzico`)}>
                <ListItemIcon>
                  <AccountBalanceIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Iyzico Detay</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => handleSync(row)}>
                <ListItemIcon>
                  <SyncIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Iyzico Sync</ListItemText>
              </MenuItem>
            </ActionMenu>
          )}
        />
      </PageSection>

      <ConfirmDialog
        open={Boolean(statusTarget)}
        onClose={() => setStatusTarget(null)}
        onConfirm={handleStatusUpdate}
        title="Durumu güncelle"
        message={
          statusTarget
            ? `${statusTarget.name} için durum ${
                statusTarget.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'
              } yapılacak.`
            : ''
        }
        confirmText="Güncelle"
        loading={statusMutation.isPending}
      />
    </PageContainer>
  );
}
