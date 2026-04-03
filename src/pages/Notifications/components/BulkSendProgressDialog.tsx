import { useEffect } from 'react';
import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogContent,
    DialogTitle,
    Divider,
    LinearProgress,
    Stack,
    Typography,
} from '@mui/material';
import {
    CheckCircle as SuccessIcon,
    Error as ErrorIcon,
    HourglassEmpty as ProcessingIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { adminNotificationService } from '../../../services/notification/adminNotificationService';
import type { BulkNotificationJob } from '../../../types/notifications/bulkNotificationJob';

interface Props {
    jobId: number | null;
    onClose: () => void;
}

const TERMINAL = new Set(['COMPLETED', 'FAILED', 'CANCELLED']);

export default function BulkSendProgressDialog({ jobId, onClose }: Props) {
    const { data: job } = useQuery<BulkNotificationJob>({
        queryKey: ['bulkJob', jobId],
        queryFn: () => adminNotificationService.getJob(jobId!),
        enabled: jobId !== null,
        refetchInterval: (query) => {
            const status = query.state.data?.status;
            return status && TERMINAL.has(status) ? false : 2500;
        },
    });

    // Auto-close 3 s after COMPLETED
    useEffect(() => {
        if (job?.status === 'COMPLETED') {
            const t = setTimeout(onClose, 3000);
            return () => clearTimeout(t);
        }
    }, [job?.status, onClose]);

    const total = job?.totalRecipients ?? 0;
    const processed = job?.processedRecipients ?? 0;
    const successful = job?.successfulDeliveries ?? 0;
    const failed = job?.failedDeliveries ?? 0;
    const pct = total > 0 ? Math.round((processed / total) * 100) : 0;
    const isDone = job ? TERMINAL.has(job.status) : false;

    return (
        <Dialog
            open={jobId !== null}
            onClose={isDone ? onClose : undefined}
            maxWidth="xs"
            fullWidth
            PaperProps={{ sx: { borderRadius: 4 } }}
        >
            <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
                {job?.status === 'COMPLETED'
                    ? 'Bildirimler Gönderildi'
                    : job?.status === 'FAILED'
                    ? 'Gönderim Başarısız'
                    : 'Bildirimler Gönderiliyor...'}
            </DialogTitle>

            <DialogContent>
                <Stack spacing={2.5}>
                    {/* Status badge */}
                    <Stack direction="row" spacing={1} alignItems="center">
                        {job?.status === 'COMPLETED' ? (
                            <SuccessIcon color="success" />
                        ) : job?.status === 'FAILED' ? (
                            <ErrorIcon color="error" />
                        ) : (
                            <ProcessingIcon color="primary" sx={{ animation: 'spin 2s linear infinite', '@keyframes spin': { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } } }} />
                        )}
                        <Typography variant="body2" fontWeight={700}>
                            {job?.title ?? '—'}
                        </Typography>
                        <Chip
                            size="small"
                            label={job?.status ?? 'PROCESSING'}
                            color={
                                job?.status === 'COMPLETED' ? 'success' :
                                job?.status === 'FAILED' ? 'error' : 'primary'
                            }
                        />
                    </Stack>

                    {/* Progress bar */}
                    <Box>
                        <Stack direction="row" justifyContent="space-between" mb={0.5}>
                            <Typography variant="caption" color="text.secondary">
                                {processed} / {total} alıcı
                            </Typography>
                            <Typography variant="caption" fontWeight={700}>
                                {pct}%
                            </Typography>
                        </Stack>
                        <LinearProgress
                            variant={total > 0 ? 'determinate' : 'indeterminate'}
                            value={pct}
                            color={job?.status === 'FAILED' ? 'error' : job?.status === 'COMPLETED' ? 'success' : 'primary'}
                            sx={{ height: 8, borderRadius: 4 }}
                        />
                    </Box>

                    {/* Stats */}
                    {total > 0 && (
                        <>
                            <Divider />
                            <Stack direction="row" spacing={2} justifyContent="space-around">
                                <Box textAlign="center">
                                    <Typography variant="h6" fontWeight={800} color="success.main">
                                        {successful}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">Başarılı</Typography>
                                </Box>
                                <Box textAlign="center">
                                    <Typography variant="h6" fontWeight={800} color="error.main">
                                        {failed}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">Başarısız</Typography>
                                </Box>
                                <Box textAlign="center">
                                    <Typography variant="h6" fontWeight={800}>
                                        {total}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">Toplam</Typography>
                                </Box>
                            </Stack>
                        </>
                    )}

                    {job?.status === 'COMPLETED' && (
                        <Typography variant="caption" color="text.secondary" textAlign="center">
                            3 saniye içinde kapanacak...
                        </Typography>
                    )}
                </Stack>
            </DialogContent>

            {isDone && (
                <Box sx={{ px: 3, pb: 2, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button onClick={onClose} variant="contained" sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>
                        Kapat
                    </Button>
                </Box>
            )}
        </Dialog>
    );
}
