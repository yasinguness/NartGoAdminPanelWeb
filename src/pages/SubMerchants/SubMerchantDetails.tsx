import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import {
  Autorenew as SyncIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { DataTable, StatusChip } from '../../components/Data';
import { PageContainer, PageHeader, PageSection } from '../../components/Page';
import {
  useSubMerchantAuditLogs,
  useSubMerchantById,
  useSubMerchantIyzicoDetail,
  useSyncSubMerchantIyzico,
} from '../../hooks/subMerchants/useSubMerchants';
import { formatDateTime } from './subMerchantUtils';

const DetailItem = ({ label, value }: { label: string; value?: string }) => (
  <Box>
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="body1" fontWeight={500}>
      {value || '-'}
    </Typography>
  </Box>
);

export default function SubMerchantDetails() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { enqueueSnackbar } = useSnackbar();
  const detailQuery = useSubMerchantById(id);
  const iyzicoQuery = useSubMerchantIyzicoDetail(id);
  const auditQuery = useSubMerchantAuditLogs(id);
  const syncMutation = useSyncSubMerchantIyzico();

  const detail = detailQuery.data;
  const iyzico = iyzicoQuery.data;

  const syncStatus = useMemo(() => {
    if (iyzico?.syncedAt || detail?.iyzicoSubMerchantSyncedAt) {
      return 'SYNCED';
    }
    return 'PENDING';
  }, [detail?.iyzicoSubMerchantSyncedAt, iyzico?.syncedAt]);

  const handleSync = async () => {
    if (!id) {
      return;
    }

    try {
      await syncMutation.mutateAsync({
        id,
        idempotencyKey: crypto.randomUUID(),
      });
      enqueueSnackbar('Iyzico sync tetiklendi.', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('Iyzico sync başarısız oldu.', { variant: 'error' });
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title={detail?.name || 'Alt Üye İşyeri Detayı'}
        subtitle="Create ile sync ayrışık tutulur; sync işlemi bu ekrandan ayrıca tetiklenir."
        showBackButton
        backPath="/sub-merchants"
        breadcrumbs={[
          { label: 'Kontrol Paneli', href: '/dashboard' },
          { label: 'Alt Üye İşyeri', href: '/sub-merchants' },
          { label: detail?.name || 'Detay', active: true },
        ]}
        actions={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={() => navigate('/sub-merchants')}>
              Listeye Dön
            </Button>
            <Button
              variant="contained"
              startIcon={<SyncIcon />}
              onClick={handleSync}
              disabled={syncMutation.isPending || !id}
            >
              {syncMutation.isPending ? 'Sync Ediliyor...' : 'Iyzico Sync'}
            </Button>
          </Stack>
        }
      />

      {(detailQuery.error || iyzicoQuery.error || auditQuery.error) && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Bazı detay verileri alınamadı. Ekran kısmi veriyle render edildi.
        </Alert>
      )}

      <PageSection title="Alt Üye İşyeri Bilgileri">
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <DetailItem label="Sahip Türü" value={detail?.ownerType} />
          </Grid>
          <Grid item xs={12} md={3}>
            <DetailItem label="Sahip ID" value={detail?.ownerId} />
          </Grid>
          <Grid item xs={12} md={3}>
            <DetailItem label="Durum" value={undefined} />
            {detail?.status && <StatusChip status={detail.status} />}
          </Grid>
          <Grid item xs={12} md={3}>
            <DetailItem label="Oluşturulma Tarihi" value={formatDateTime(detail?.createdAt)} />
          </Grid>
          <Grid item xs={12} md={4}>
            <DetailItem label="E-posta" value={detail?.email} />
          </Grid>
          <Grid item xs={12} md={4}>
            <DetailItem label="Telefon" value={detail?.contactPhone} />
          </Grid>
          <Grid item xs={12} md={4}>
            <DetailItem label="IBAN" value={detail?.iban} />
          </Grid>
          <Grid item xs={12}>
            <DetailItem label="Adres" value={detail?.address} />
          </Grid>
          <Grid item xs={12} md={4}>
            <DetailItem label="Yetkili Adı" value={detail?.contactName} />
          </Grid>
          <Grid item xs={12} md={4}>
            <DetailItem label="Yetkili Soyadı" value={detail?.contactSurname} />
          </Grid>
          <Grid item xs={12} md={4}>
            <DetailItem label="Kimlik No" value={detail?.identityNumber} />
          </Grid>
          <Grid item xs={12} md={4}>
            <DetailItem label="Vergi No" value={detail?.taxNumber} />
          </Grid>
          <Grid item xs={12} md={4}>
            <DetailItem label="Vergi Dairesi" value={detail?.taxOffice} />
          </Grid>
          <Grid item xs={12} md={4}>
            <DetailItem label="Şirket Ünvanı" value={detail?.legalCompanyTitle} />
          </Grid>
        </Grid>
      </PageSection>

      <PageSection
        title="Iyzico Detayı"
        subtitle="Sync butonu create akışından ayrıdır."
        headerActions={
          <Chip
            color={syncStatus === 'SYNCED' ? 'success' : 'warning'}
            label={syncStatus === 'SYNCED' ? 'Sync tamamlandı' : 'Sync bekliyor'}
          />
        }
        id="iyzico"
      >
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <DetailItem label="Iyzico Türü" value={detail?.iyzicoSubMerchantType} />
          </Grid>
          <Grid item xs={12} md={4}>
            <DetailItem label="Sub Merchant Key" value={iyzico?.iyzicoSubMerchantKey || detail?.iyzicoSubMerchantKey} />
          </Grid>
          <Grid item xs={12} md={4}>
            <DetailItem
              label="Harici ID"
              value={iyzico?.iyzicoSubMerchantExternalId || detail?.iyzicoSubMerchantExternalId}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <DetailItem label="Son Sync Zamanı" value={formatDateTime(iyzico?.syncedAt || detail?.iyzicoSubMerchantSyncedAt)} />
          </Grid>
          <Grid item xs={12} md={4}>
            <DetailItem label="Iyzico Durumu" value={iyzico?.status} />
          </Grid>
          <Grid item xs={12} md={4}>
            <Button
              variant="text"
              endIcon={<ArrowForwardIcon />}
              onClick={handleSync}
              disabled={syncMutation.isPending || !id}
            >
              Tekrar Sync Et
            </Button>
          </Grid>
        </Grid>
      </PageSection>

      <PageSection title="Audit Log">
        <DataTable
          columns={[
            { id: 'action', label: 'Aksiyon', accessor: 'action' },
            {
              id: 'actorName',
              label: 'Aktör',
              render: (row) => row.actorName || row.actorId || '-',
            },
            { id: 'details', label: 'Detay', accessor: 'details' },
            {
              id: 'createdAt',
              label: 'Tarih',
              render: (row) => formatDateTime(row.createdAt),
            },
          ]}
          data={auditQuery.data || []}
          loading={auditQuery.isLoading}
          emptyState={{
            title: 'Audit log bulunamadı',
            description: 'Bu kayıt için henüz log oluşmamış olabilir.',
          }}
        />
      </PageSection>
    </PageContainer>
  );
}
