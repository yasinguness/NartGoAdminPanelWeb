import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminNotificationService } from '../../services/notification/adminNotificationService';
import { AdminBulkNotificationRequest, RecipientType } from '../../types/notifications/adminBulkNotificationRequest';
import type { BulkNotificationJob } from '../../types/notifications/bulkNotificationJob';

const TERMINAL = new Set(['COMPLETED', 'FAILED', 'CANCELLED']);

/** Polls a single bulk notification job until it reaches a terminal state. */
export const useJobStatus = (jobId: number | null) =>
    useQuery<BulkNotificationJob>({
        queryKey: ['bulkJob', jobId],
        queryFn: () => adminNotificationService.getJob(jobId!),
        enabled: jobId !== null,
        refetchInterval: (query) => {
            const status = query.state.data?.status;
            return status && TERMINAL.has(status) ? false : 2500;
        },
    });

export const useAdminNotificationActions = () => {
    const queryClient = useQueryClient();

    // Bulk notification mutations
    const sendBulkNotificationToAll = useMutation({
        mutationFn: (request: AdminBulkNotificationRequest) => 
            adminNotificationService.sendBulkNotificationToAll(request),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminNotificationStats'] });
        },
    });

    const sendBulkNotificationToRegistered = useMutation({
        mutationFn: (request: AdminBulkNotificationRequest) => 
            adminNotificationService.sendBulkNotificationToRegistered(request),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminNotificationStats'] });
        },
    });

    const sendBulkNotificationToAnonymous = useMutation({
        mutationFn: (request: AdminBulkNotificationRequest) => 
            adminNotificationService.sendBulkNotificationToAnonymous(request),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminNotificationStats'] });
        },
    });

    const sendBulkNotificationToSpecificEmails = useMutation({
        mutationFn: (request: AdminBulkNotificationRequest) => 
            adminNotificationService.sendBulkNotificationToSpecificEmails(request),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminNotificationStats'] });
        },
    });

    const sendBulkNotificationCustom = useMutation({
        mutationFn: (request: AdminBulkNotificationRequest) => 
            adminNotificationService.sendBulkNotificationCustom(request),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminNotificationStats'] });
        },
    });

    // Channel-specific mutations
    const sendPushNotificationToAll = useMutation({
        mutationFn: (request: AdminBulkNotificationRequest) => 
            adminNotificationService.sendPushNotificationToAll(request),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminNotificationStats'] });
        },
    });

    const sendEmailNotificationToAll = useMutation({
        mutationFn: (request: AdminBulkNotificationRequest) => 
            adminNotificationService.sendEmailNotificationToAll(request),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminNotificationStats'] });
        },
    });

    const sendTelegramNotificationToChannel = useMutation({
        mutationFn: (request: AdminBulkNotificationRequest) => 
            adminNotificationService.sendTelegramNotificationToChannel(request),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminNotificationStats'] });
        },
    });

    const sendWebSocketNotificationToAll = useMutation({
        mutationFn: (request: AdminBulkNotificationRequest) => 
            adminNotificationService.sendWebSocketNotificationToAll(request),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminNotificationStats'] });
        },
    });

    // Special mutations
    const sendNotificationToEmails = useMutation({
        mutationFn: ({ emails, request }: { emails: string[]; request: AdminBulkNotificationRequest }) => 
            adminNotificationService.sendNotificationToEmails(emails, request),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminNotificationStats'] });
        },
    });

    const sendNotificationToEmailsUrl = useMutation({
        mutationFn: ({ emails, request }: { emails: string[]; request: AdminBulkNotificationRequest }) => 
            adminNotificationService.sendNotificationToEmailsUrl(emails, request),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminNotificationStats'] });
        },
    });

    const sendUrgentNotificationToAll = useMutation({
        mutationFn: (request: AdminBulkNotificationRequest) => 
            adminNotificationService.sendUrgentNotificationToAll(request),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminNotificationStats'] });
        },
    });

    // Convenience mutations
    const sendPushNotificationToRegistered = useMutation({
        mutationFn: (request: AdminBulkNotificationRequest) => 
            adminNotificationService.sendPushNotificationToRegistered(request),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminNotificationStats'] });
        },
    });

    const sendPushNotificationToAnonymous = useMutation({
        mutationFn: (request: AdminBulkNotificationRequest) => 
            adminNotificationService.sendPushNotificationToAnonymous(request),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminNotificationStats'] });
        },
    });

    const sendEmailNotificationToRegistered = useMutation({
        mutationFn: (request: AdminBulkNotificationRequest) => 
            adminNotificationService.sendEmailNotificationToRegistered(request),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminNotificationStats'] });
        },
    });

    const sendMultiChannelNotification = useMutation({
        mutationFn: ({ request, recipientType }: { request: AdminBulkNotificationRequest; recipientType?: RecipientType }) =>
            adminNotificationService.sendMultiChannelNotification(request, recipientType),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminNotificationStats'] });
        },
    });

    // ── Async job-based mutations ──────────────────────────────
    const sendPushToSpecificUsers = useMutation({
        mutationFn: ({ emailList, request }: {
            emailList: string[];
            request: Omit<AdminBulkNotificationRequest, 'emailList' | 'recipientType'>;
        }) => adminNotificationService.sendPushToSpecificUsers(emailList, request),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bulkJobs'] });
        },
    });

    const submitBulkJob = useMutation({
        mutationFn: (request: AdminBulkNotificationRequest) =>
            adminNotificationService.submitBulkJob(request),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bulkJobs'] });
        },
    });

    return {
        // Bulk notifications
        sendBulkNotificationToAll,
        sendBulkNotificationToRegistered,
        sendBulkNotificationToAnonymous,
        sendBulkNotificationToSpecificEmails,
        sendBulkNotificationCustom,
        
        // Channel-specific
        sendPushNotificationToAll,
        sendEmailNotificationToAll,
        sendTelegramNotificationToChannel,
        sendWebSocketNotificationToAll,
        
        // Special
        sendNotificationToEmails,
        sendNotificationToEmailsUrl,
        sendUrgentNotificationToAll,
        
        // Convenience
        sendPushNotificationToRegistered,
        sendPushNotificationToAnonymous,
        sendEmailNotificationToRegistered,
        sendMultiChannelNotification,

        // Async job-based (submit-and-poll)
        sendPushToSpecificUsers,
        submitBulkJob,
    };
};
