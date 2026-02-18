import { api } from '../api';
import { 
    AdminBulkNotificationRequest, 
    RecipientType 
} from '../../types/notifications/adminBulkNotificationRequest';
import { AdminBulkNotificationResponse } from '../../types/notifications/adminBulkNotificationResponse';
import { AdminNotificationStats } from '../../types/notifications/adminNotificationStats';
import { NotificationPriority } from '../../types/notifications/notificationModel';
import { ApiResponse } from '../../types/api';



export const adminNotificationService = {
    // Bulk notification endpoints for different recipient types
    
    /**
     * Send bulk notification to all users (registered + anonymous)
     */
    sendBulkNotificationToAll: async (request: AdminBulkNotificationRequest): Promise<AdminBulkNotificationResponse> => {
        const modifiedRequest = {
            ...request,
            recipientType: RecipientType.ALL
        };
        const response = await api.post<ApiResponse<AdminBulkNotificationResponse>>(
            '/notifications/admin/bulk/send-all',
            modifiedRequest
        );
        return response.data.data;
    },

    /**
     * Send bulk notification to registered users only
     */
    sendBulkNotificationToRegistered: async (request: AdminBulkNotificationRequest): Promise<AdminBulkNotificationResponse> => {
        const modifiedRequest = {
            ...request,
            recipientType: RecipientType.REGISTERED
        };
        const response = await api.post<ApiResponse<AdminBulkNotificationResponse>>(
            '/notifications/admin/bulk/send-registered',
            modifiedRequest
        );
        return response.data.data;
    },

    /**
     * Send bulk notification to anonymous users only
     */
    sendBulkNotificationToAnonymous: async (request: AdminBulkNotificationRequest): Promise<AdminBulkNotificationResponse> => {
        const modifiedRequest = {
            ...request,
            recipientType: RecipientType.ANONYMOUS
        };
        const response = await api.post<ApiResponse<AdminBulkNotificationResponse>>(
            '/notifications/admin/bulk/send-anonymous',
            modifiedRequest
        );
        return response.data.data;
    },

    /**
     * Send bulk notification to specific email addresses
     */
    sendBulkNotificationToSpecificEmails: async (request: AdminBulkNotificationRequest): Promise<AdminBulkNotificationResponse> => {
        if (!request.emailList || request.emailList.length === 0) {
            throw new Error('Email list is required for specific email notification');
        }
        const response = await api.post<ApiResponse<AdminBulkNotificationResponse>>(
            '/notifications/admin/bulk/send-specific',
            request
        );
        return response.data.data;
    },

    /**
     * Send bulk notification with custom recipient type
     */
    sendBulkNotificationCustom: async (request: AdminBulkNotificationRequest): Promise<AdminBulkNotificationResponse> => {
        const response = await api.post<ApiResponse<AdminBulkNotificationResponse>>(
            '/notifications/admin/bulk/send-custom',
            request
        );
        return response.data.data;
    },

    // Channel-specific notification endpoints

    /**
     * Send push notification only to all users
     */
    sendPushNotificationToAll: async (request: AdminBulkNotificationRequest): Promise<AdminBulkNotificationResponse> => {
        const modifiedRequest = {
            ...request,
            recipientType: RecipientType.ALL,
            sendPush: true,
            sendEmail: false,
            sendTelegram: false,
            sendWebSocket: false
        };
        const response = await api.post<ApiResponse<AdminBulkNotificationResponse>>(
            '/notifications/admin/push/send-all',
            modifiedRequest
        );
        return response.data.data;
    },

    /**
     * Send email notification only to all users
     */
    sendEmailNotificationToAll: async (request: AdminBulkNotificationRequest): Promise<AdminBulkNotificationResponse> => {
        const modifiedRequest = {
            ...request,
            recipientType: RecipientType.ALL,
            sendPush: false,
            sendEmail: true,
            sendTelegram: false,
            sendWebSocket: false
        };
        const response = await api.post<ApiResponse<AdminBulkNotificationResponse>>(
            '/notifications/admin/email/send-all',
            modifiedRequest
        );
        return response.data.data;
    },

    /**
     * Send telegram notification to channel
     */
    sendTelegramNotificationToChannel: async (request: AdminBulkNotificationRequest): Promise<AdminBulkNotificationResponse> => {
        const modifiedRequest = {
            ...request,
            recipientType: RecipientType.ALL,
            sendPush: false,
            sendEmail: false,
            sendTelegram: true,
            sendWebSocket: false
        };
        const response = await api.post<ApiResponse<AdminBulkNotificationResponse>>(
            '/notifications/admin/telegram/send-channel',
            modifiedRequest
        );
        return response.data.data;
    },

    /**
     * Send WebSocket notification to all users
     */
    sendWebSocketNotificationToAll: async (request: AdminBulkNotificationRequest): Promise<AdminBulkNotificationResponse> => {
        const modifiedRequest = {
            ...request,
            recipientType: RecipientType.ALL,
            sendPush: false,
            sendEmail: false,
            sendTelegram: false,
            sendWebSocket: true
        };
        const response = await api.post<ApiResponse<AdminBulkNotificationResponse>>(
            '/notifications/admin/websocket/send-all',
            modifiedRequest
        );
        return response.data.data;
    },

    /**
     * Send notification to specific email addresses
     */
    sendNotificationToEmails: async (
        emails: string[], 
        request: AdminBulkNotificationRequest
    ): Promise<AdminBulkNotificationResponse> => {
        const modifiedRequest = {
            ...request,
            emailList: emails
        };
        const response = await api.post<ApiResponse<AdminBulkNotificationResponse>>(
            '/notifications/admin/send-to-emails',
            modifiedRequest
        );
        return response.data.data;
    },

    /**
     * Send notification to specific email addresses via URL parameter
     */
    sendNotificationToEmailsUrl: async (
        emails: string[], 
        request: AdminBulkNotificationRequest
    ): Promise<AdminBulkNotificationResponse> => {
        const emailParam = emails.join(',');
        const response = await api.post<ApiResponse<AdminBulkNotificationResponse>>(
            `/notifications/admin/send-to-emails-url?emails=${encodeURIComponent(emailParam)}`,
            request
        );
        return response.data.data;
    },

    /**
     * Send urgent notification to all users
     */
    sendUrgentNotificationToAll: async (request: AdminBulkNotificationRequest): Promise<AdminBulkNotificationResponse> => {
        const modifiedRequest = {
            ...request,
            recipientType: RecipientType.ALL,
            priority: NotificationPriority.URGENT,
            sendPush: true,
            sendEmail: true,
            sendWebSocket: true
        };
        const response = await api.post<ApiResponse<AdminBulkNotificationResponse>>(
            '/notifications/admin/urgent/send-all',
            modifiedRequest
        );
        return response.data.data;
    },

    /**
     * Get notification statistics for admin panel
     */
    getNotificationStats: async (): Promise<AdminNotificationStats> => {
        const response = await api.get<ApiResponse<AdminNotificationStats>>(
            '/notifications/admin/stats'
        );
        return response.data.data;
    },

    // Convenience methods for common use cases

    /**
     * Send push notification to registered users only
     */
    sendPushNotificationToRegistered: async (request: AdminBulkNotificationRequest): Promise<AdminBulkNotificationResponse> => {
        const modifiedRequest = {
            ...request,
            recipientType: RecipientType.REGISTERED,
            sendPush: true,
            sendEmail: false,
            sendTelegram: false,
            sendWebSocket: false
        };
        return adminNotificationService.sendBulkNotificationCustom(modifiedRequest);
    },

    /**
     * Send push notification to anonymous users only
     */
    sendPushNotificationToAnonymous: async (request: AdminBulkNotificationRequest): Promise<AdminBulkNotificationResponse> => {
        const modifiedRequest = {
            ...request,
            recipientType: RecipientType.ANONYMOUS,
            sendPush: true,
            sendEmail: false,
            sendTelegram: false,
            sendWebSocket: false
        };
        return adminNotificationService.sendBulkNotificationCustom(modifiedRequest);
    },

    /**
     * Send email notification to registered users only
     */
    sendEmailNotificationToRegistered: async (request: AdminBulkNotificationRequest): Promise<AdminBulkNotificationResponse> => {
        const modifiedRequest = {
            ...request,
            recipientType: RecipientType.REGISTERED,
            sendPush: false,
            sendEmail: true,
            sendTelegram: false,
            sendWebSocket: false
        };
        return adminNotificationService.sendBulkNotificationCustom(modifiedRequest);
    },

    /**
     * Send multi-channel notification (push + email + websocket)
     */
    sendMultiChannelNotification: async (
        request: AdminBulkNotificationRequest,
        recipientType: RecipientType = RecipientType.ALL
    ): Promise<AdminBulkNotificationResponse> => {
        const modifiedRequest = {
            ...request,
            recipientType,
            sendPush: true,
            sendEmail: true,
            sendTelegram: false,
            sendWebSocket: true
        };
        return adminNotificationService.sendBulkNotificationCustom(modifiedRequest);
    }
};
