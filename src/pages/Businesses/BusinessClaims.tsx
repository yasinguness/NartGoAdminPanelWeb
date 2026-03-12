import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Close as RejectIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { DataTable, DataTableColumn, StatusChip } from '../../components/Data';
import { FilterBar, FilterSelect } from '../../components/Filter';
import { PageContainer, PageHeader, PageSection } from '../../components/Page';
import { businessClaimService } from '../../services/business/businessClaimService';
import {
  BusinessClaimDecision,
  BusinessClaimResponse,
  BusinessClaimStatus,
} from '../../types/businesses/businessClaimModel';

const STATUS_OPTIONS: { value: BusinessClaimStatus; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
];

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('tr-TR');
};

const formatText = (value?: string) => value?.trim() || '-';

interface ReviewDialogState {
  open: boolean;
  decision: BusinessClaimDecision;
}

const initialReviewState: ReviewDialogState = {
  open: false,
  decision: 'APPROVE',
};

export default function BusinessClaims() {
  const { enqueueSnackbar } = useSnackbar();

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<BusinessClaimStatus | ''>('PENDING');
  const [selectedClaim, setSelectedClaim] = useState<BusinessClaimResponse | null>(null);

  const [reviewDialog, setReviewDialog] = useState<ReviewDialogState>(initialReviewState);
  const [verificationMethod, setVerificationMethod] = useState('');
  const [verificationNotes, setVerificationNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const queryParams = useMemo(
    () => ({
      page: page - 1,
      size: 10,
      status: statusFilter || undefined,
    }),
    [page, statusFilter],
  );

  const claimsQuery = useQuery({
    queryKey: ['business-claims', queryParams],
    queryFn: () => businessClaimService.getClaims(queryParams),
  });

  useEffect(() => {
    if (!claimsQuery.data?.content?.length) {
      setSelectedClaim(null);
      return;
    }
    if (!selectedClaim) {
      setSelectedClaim(claimsQuery.data.content[0]);
      return;
    }
    const updated = claimsQuery.data.content.find((claim) => claim.claimId === selectedClaim.claimId);
    if (updated) {
      setSelectedClaim(updated);
    }
  }, [claimsQuery.data, selectedClaim]);

  const reviewMutation = useMutation({
    mutationFn: ({
      claimId,
      decision,
      verificationMethodValue,
      verificationNotesValue,
      rejectionReasonValue,
    }: {
      claimId: string;
      decision: BusinessClaimDecision;
      verificationMethodValue: string;
      verificationNotesValue: string;
      rejectionReasonValue: string;
    }) =>
      businessClaimService.reviewClaim(claimId, {
        decision,
        verificationMethod: verificationMethodValue || undefined,
        verificationNotes: verificationNotesValue || undefined,
        rejectionReason: rejectionReasonValue || undefined,
      }),
    onSuccess: async (updatedClaim, variables) => {
      setSelectedClaim(updatedClaim);
      setReviewDialog(initialReviewState);
      setVerificationMethod('');
      setVerificationNotes('');
      setRejectionReason('');
      await claimsQuery.refetch();

      enqueueSnackbar(
        variables.decision === 'APPROVE' ? 'Talep onaylandı.' : 'Talep reddedildi.',
        { variant: 'success' },
      );
    },
    onError: () => {
      enqueueSnackbar('Talep değerlendirme işlemi başarısız oldu.', { variant: 'error' });
    },
  });

  const columns: DataTableColumn<BusinessClaimResponse>[] = [
    {
      id: 'businessName',
      label: 'İşletme',
      minWidth: 170,
      render: (row) => (
        <Stack spacing={0.5}>
          <Typography variant="body2" fontWeight={600}>
            {row.businessName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {row.businessId}
          </Typography>
        </Stack>
      ),
    },
    {
      id: 'requesterEmail',
      label: 'Talep Eden',
      minWidth: 200,
      render: (row) => (
        <Stack spacing={0.5}>
          <Typography variant="body2">{row.requesterEmail}</Typography>
          <Typography variant="caption" color="text.secondary">
            {row.requesterUserId}
          </Typography>
        </Stack>
      ),
    },
    {
      id: 'verificationMethod',
      label: 'Doğrulama Yöntemi',
      minWidth: 170,
      render: (row) => formatText(row.verificationMethod),
    },
    {
      id: 'createdAt',
      label: 'Tarih',
      minWidth: 140,
      render: (row) => formatDateTime(row.createdAt),
    },
    {
      id: 'status',
      label: 'Durum',
      minWidth: 120,
      render: (row) => <StatusChip status={row.status.toLowerCase()} label={row.status} />,
    },
  ];

  const openReviewDialog = (decision: BusinessClaimDecision) => {
    if (!selectedClaim) return;
    setReviewDialog({ open: true, decision });
    setVerificationMethod(selectedClaim.verificationMethod || '');
    setVerificationNotes(selectedClaim.verificationNotes || '');
    setRejectionReason('');
  };

  const handleSubmitReview = async () => {
    if (!selectedClaim) return;
    if (reviewDialog.decision === 'REJECT' && !rejectionReason.trim()) {
      enqueueSnackbar('Ret sebebi zorunludur.', { variant: 'warning' });
      return;
    }

    await reviewMutation.mutateAsync({
      claimId: selectedClaim.claimId,
      decision: reviewDialog.decision,
      verificationMethodValue: verificationMethod.trim(),
      verificationNotesValue: verificationNotes.trim(),
      rejectionReasonValue: rejectionReason.trim(),
    });
  };

  const isPending = selectedClaim?.status === 'PENDING';

  return (
    <PageContainer>
      <PageHeader
        title="Business Claims"
        subtitle="İşletme sahiplik taleplerini görüntüleyin, detaylarını inceleyin ve onaylayın/reddedin."
        actions={
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => claimsQuery.refetch()}
            disabled={claimsQuery.isFetching}
          >
            Yenile
          </Button>
        }
      />

      <FilterBar
        filters={
          <FilterSelect
            label="Durum"
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value as BusinessClaimStatus | '');
              setPage(1);
            }}
            showAllOption
            allOptionLabel="Tümü"
            options={STATUS_OPTIONS}
          />
        }
        activeFilterCount={statusFilter ? 1 : 0}
        onClearFilters={() => {
          setStatusFilter('');
          setPage(1);
        }}
      />

      {claimsQuery.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Talepler yüklenirken hata oluştu.
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <PageSection title="Talep Listesi" noPadding>
            <DataTable
              columns={columns}
              data={claimsQuery.data?.content || []}
              loading={claimsQuery.isLoading || claimsQuery.isFetching}
              getRowKey={(row) => row.claimId}
              onRowClick={(row) => setSelectedClaim(row)}
              pagination={{
                page,
                pageSize: claimsQuery.data?.size || 10,
                total: claimsQuery.data?.totalElements || 0,
                onPageChange: setPage,
              }}
              emptyState={{
                title: 'Talep bulunamadı',
                description: 'Seçili filtrelere göre sonuç yok.',
              }}
              minWidth={760}
            />
          </PageSection>
        </Grid>

        <Grid item xs={12} md={5}>
          <PageSection title="Talep Detayı">
            {!selectedClaim ? (
              <Alert severity="info">Detayları görmek için listeden bir talep seçin.</Alert>
            ) : (
              <Stack spacing={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    İşletme
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {selectedClaim.businessName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {selectedClaim.businessId}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Talep Eden Kullanıcı
                  </Typography>
                  <Typography variant="body2">{selectedClaim.requesterEmail}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {selectedClaim.requesterUserId}
                  </Typography>
                </Box>

                <Stack direction="row" spacing={1} alignItems="center">
                  <StatusChip status={selectedClaim.status.toLowerCase()} label={selectedClaim.status} />
                  <Typography variant="caption" color="text.secondary">
                    Oluşturma: {formatDateTime(selectedClaim.createdAt)}
                  </Typography>
                </Stack>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Doğrulama Yöntemi
                  </Typography>
                  <Typography variant="body2">{formatText(selectedClaim.verificationMethod)}</Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Doğrulama Notları
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {formatText(selectedClaim.verificationNotes)}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Ret Sebebi
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {formatText(selectedClaim.rejectionReason)}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    İnceleyen Admin
                  </Typography>
                  <Typography variant="body2">{formatText(selectedClaim.reviewedByEmail)}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatText(selectedClaim.reviewedByUserId)}
                  </Typography>
                  <Typography variant="caption" display="block" color="text.secondary">
                    İnceleme Tarihi: {formatDateTime(selectedClaim.reviewedAt)}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Ödüller
                  </Typography>
                  <Typography variant="body2">
                    Puan: {selectedClaim.pointsAwarded ?? 0}
                  </Typography>
                  <Typography variant="body2">
                    Rozetler: {selectedClaim.badgesAwarded?.join(', ') || '-'}
                  </Typography>
                </Box>

                <Stack direction="row" spacing={1}>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<ApproveIcon />}
                    onClick={() => openReviewDialog('APPROVE')}
                    disabled={!isPending}
                    fullWidth
                  >
                    Onayla
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<RejectIcon />}
                    onClick={() => openReviewDialog('REJECT')}
                    disabled={!isPending}
                    fullWidth
                  >
                    Reddet
                  </Button>
                </Stack>
              </Stack>
            )}
          </PageSection>
        </Grid>
      </Grid>

      <Dialog
        open={reviewDialog.open}
        onClose={() => setReviewDialog(initialReviewState)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {reviewDialog.decision === 'APPROVE' ? 'Talebi Onayla' : 'Talebi Reddet'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Doğrulama Yöntemi"
              value={verificationMethod}
              onChange={(event) => setVerificationMethod(event.target.value)}
              fullWidth
              inputProps={{ maxLength: 100 }}
            />
            <TextField
              label="Doğrulama Notları"
              value={verificationNotes}
              onChange={(event) => setVerificationNotes(event.target.value)}
              fullWidth
              multiline
              minRows={3}
              inputProps={{ maxLength: 2000 }}
            />
            {reviewDialog.decision === 'REJECT' && (
              <TextField
                label="Ret Sebebi"
                value={rejectionReason}
                onChange={(event) => setRejectionReason(event.target.value)}
                fullWidth
                required
                multiline
                minRows={2}
                inputProps={{ maxLength: 1000 }}
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewDialog(initialReviewState)}>İptal</Button>
          <Button
            onClick={handleSubmitReview}
            variant="contained"
            color={reviewDialog.decision === 'APPROVE' ? 'success' : 'error'}
            disabled={reviewMutation.isPending}
          >
            {reviewDialog.decision === 'APPROVE' ? 'Onayı Kaydet' : 'Reddi Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}
