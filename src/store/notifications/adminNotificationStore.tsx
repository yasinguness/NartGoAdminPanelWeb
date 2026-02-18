import { create } from 'zustand';
import { adminNotificationService } from '../../services/notification/adminNotificationService';
import { AdminBulkNotificationRequest, RecipientType } from '../../types/notifications/adminBulkNotificationRequest';
import { AdminBulkNotificationResponse } from '../../types/notifications/adminBulkNotificationResponse';
import { AdminNotificationStats } from '../../types/notifications/adminNotificationStats';

interface AdminNotificationStore {
    // State
    stats: AdminNotificationStats | null;
    loading: boolean;
    error: string | null;
    lastResponse: AdminBulkNotificationResponse | null;

    // Actions
    getNotificationStats: () => Promise<void>;
    
    // Bulk notification actions
    sendBulkNotificationToAll: (request: AdminBulkNotificationRequest) => Promise<AdminBulkNotificationResponse>;
    sendBulkNotificationToRegistered: (request: AdminBulkNotificationRequest) => Promise<AdminBulkNotificationResponse>;
    sendBulkNotificationToAnonymous: (request: AdminBulkNotificationRequest) => Promise<AdminBulkNotificationResponse>;
    sendBulkNotificationToSpecificEmails: (request: AdminBulkNotificationRequest) => Promise<AdminBulkNotificationResponse>;
    sendBulkNotificationCustom: (request: AdminBulkNotificationRequest) => Promise<AdminBulkNotificationResponse>;
    
    // Channel-specific actions
    sendPushNotificationToAll: (request: AdminBulkNotificationRequest) => Promise<AdminBulkNotificationResponse>;
    sendEmailNotificationToAll: (request: AdminBulkNotificationRequest) => Promise<AdminBulkNotificationResponse>;
    sendTelegramNotificationToChannel: (request: AdminBulkNotificationRequest) => Promise<AdminBulkNotificationResponse>;
    sendWebSocketNotificationToAll: (request: AdminBulkNotificationRequest) => Promise<AdminBulkNotificationResponse>;
    
    // Special actions
    sendNotificationToEmails: (emails: string[], request: AdminBulkNotificationRequest) => Promise<AdminBulkNotificationResponse>;
    sendUrgentNotificationToAll: (request: AdminBulkNotificationRequest) => Promise<AdminBulkNotificationResponse>;
    
    // Convenience actions
    sendPushNotificationToRegistered: (request: AdminBulkNotificationRequest) => Promise<AdminBulkNotificationResponse>;
    sendPushNotificationToAnonymous: (request: AdminBulkNotificationRequest) => Promise<AdminBulkNotificationResponse>;
    sendEmailNotificationToRegistered: (request: AdminBulkNotificationRequest) => Promise<AdminBulkNotificationResponse>;
    sendMultiChannelNotification: (request: AdminBulkNotificationRequest, recipientType?: RecipientType) => Promise<AdminBulkNotificationResponse>;
}

export const useAdminNotificationStore = create<AdminNotificationStore>((set, get) => ({
    // Initial state
    stats: null,
    loading: false,
    error: null,
    lastResponse: null,

    // Get notification statistics
    getNotificationStats: async () => {
        try {
            set({ loading: true, error: null });
            const stats = await adminNotificationService.getNotificationStats();
            set({ stats });
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to fetch notification stats' });
        } finally {
            set({ loading: false });
        }
    },

    // Bulk notification actions
    sendBulkNotificationToAll: async (request) => {
        try {
            set({ loading: true, error: null });
            const response = await adminNotificationService.sendBulkNotificationToAll(request);
            set({ lastResponse: response });
            await get().getNotificationStats(); // Refresh stats
            return response;
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to send bulk notification to all users' });
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    sendBulkNotificationToRegistered: async (request) => {
        try {
            set({ loading: true, error: null });
            const response = await adminNotificationService.sendBulkNotificationToRegistered(request);
            set({ lastResponse: response });
            await get().getNotificationStats();
            return response;
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to send bulk notification to registered users' });
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    sendBulkNotificationToAnonymous: async (request) => {
        try {
            set({ loading: true, error: null });
            const response = await adminNotificationService.sendBulkNotificationToAnonymous(request);
            set({ lastResponse: response });
            await get().getNotificationStats();
            return response;
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to send bulk notification to anonymous users' });
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    sendBulkNotificationToSpecificEmails: async (request) => {
        try {
            set({ loading: true, error: null });
            const response = await adminNotificationService.sendBulkNotificationToSpecificEmails(request);
            set({ lastResponse: response });
            await get().getNotificationStats();
            return response;
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to send bulk notification to specific emails' });
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    sendBulkNotificationCustom: async (request) => {
        try {
            set({ loading: true, error: null });
            const response = await adminNotificationService.sendBulkNotificationCustom(request);
            set({ lastResponse: response });
            await get().getNotificationStats();
            return response;
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to send custom bulk notification' });
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    // Channel-specific actions
    sendPushNotificationToAll: async (request) => {
        try {
            set({ loading: true, error: null });
            const response = await adminNotificationService.sendPushNotificationToAll(request);
            set({ lastResponse: response });
            await get().getNotificationStats();
            return response;
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to send push notification to all users' });
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    sendEmailNotificationToAll: async (request) => {
        try {
            set({ loading: true, error: null });
            const response = await adminNotificationService.sendEmailNotificationToAll(request);
            set({ lastResponse: response });
            await get().getNotificationStats();
            return response;
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to send email notification to all users' });
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    sendTelegramNotificationToChannel: async (request) => {
        try {
            set({ loading: true, error: null });
            const response = await adminNotificationService.sendTelegramNotificationToChannel(request);
            set({ lastResponse: response });
            await get().getNotificationStats();
            return response;
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to send telegram notification to channel' });
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    sendWebSocketNotificationToAll: async (request) => {
        try {
            set({ loading: true, error: null });
            const response = await adminNotificationService.sendWebSocketNotificationToAll(request);
            set({ lastResponse: response });
            await get().getNotificationStats();
            return response;
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to send WebSocket notification to all users' });
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    // Special actions
    sendNotificationToEmails: async (emails, request) => {
        try {
            set({ loading: true, error: null });
            const response = await adminNotificationService.sendNotificationToEmails(emails, request);
            set({ lastResponse: response });
            await get().getNotificationStats();
            return response;
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to send notification to specific emails' });
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    sendUrgentNotificationToAll: async (request) => {
        try {
            set({ loading: true, error: null });
            const response = await adminNotificationService.sendUrgentNotificationToAll(request);
            set({ lastResponse: response });
            await get().getNotificationStats();
            return response;
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to send urgent notification to all users' });
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    // Convenience actions
    sendPushNotificationToRegistered: async (request) => {
        try {
            set({ loading: true, error: null });
            const response = await adminNotificationService.sendPushNotificationToRegistered(request);
            set({ lastResponse: response });
            await get().getNotificationStats();
            return response;
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to send push notification to registered users' });
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    sendPushNotificationToAnonymous: async (request) => {
        try {
            set({ loading: true, error: null });
            const response = await adminNotificationService.sendPushNotificationToAnonymous(request);
            set({ lastResponse: response });
            await get().getNotificationStats();
            return response;
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to send push notification to anonymous users' });
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    sendEmailNotificationToRegistered: async (request) => {
        try {
            set({ loading: true, error: null });
            const response = await adminNotificationService.sendEmailNotificationToRegistered(request);
            set({ lastResponse: response });
            await get().getNotificationStats();
            return response;
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to send email notification to registered users' });
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    sendMultiChannelNotification: async (request, recipientType) => {
        try {
            set({ loading: true, error: null });
            const response = await adminNotificationService.sendMultiChannelNotification(request, recipientType);
            set({ lastResponse: response });
            await get().getNotificationStats();
            return response;
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to send multi-channel notification' });
            throw error;
        } finally {
            set({ loading: false });
        }
    },
}));
