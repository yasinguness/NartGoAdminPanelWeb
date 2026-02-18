import { api } from './api';

// const API_URL = 'https://api.nartgo.net/api/v1'; // Using proxy instead

export interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    userId?: string;
    deviceId?: string;
    createdAt: string;
    status: 'pending' | 'sent' | 'failed';
    recipients?: number;
}

export interface SendNotificationRequest {
    title: string;
    message: string;
    type: string;
    userId?: string;
    deviceId?: string;
    topic?: string;
}

export interface BulkNotificationRequest {
    title: string;
    message: string;
    type: string;
    userIds?: string[];
    deviceIds?: string[];
    topics?: string[];
}

export interface NotificationStats {
    total: number;
    sent: number;
    failed: number;
    pending: number;
    byType: {
        info: number;
        success: number;
        warning: number;
        error: number;
    };
    byHour: Array<{
        hour: number;
        count: number;
    }>;
    byDay: Array<{
        date: string;
        count: number;
    }>;
}

export const notificationService = {
    // Fetch all notifications
    getAll: async (): Promise<Notification[]> => {
        const response = await api.get('/notifications/history');
        return response.data;
    },

    // Send a new notification
    send: async (notification: SendNotificationRequest): Promise<Notification> => {
        const response = await api.post('/notifications/send', notification);
        return response.data;
    },

    // Get notification statistics
    getStats: async () => {
        const response = await api.get('/notifications/stats');
        return response.data;
    },

    // Get notifications by user
    getByUser: async (userId: string): Promise<Notification[]> => {
        const response = await api.get(`/notifications/user/${userId}`);
        return response.data;
    },

    // Get notifications by device
    getByDevice: async (deviceId: string): Promise<Notification[]> => {
        const response = await api.get(`/notifications/device/${deviceId}`);
        return response.data;
    },

    // Cancel a pending notification
    cancel: async (notificationId: string): Promise<void> => {
        await api.post(`/notifications/${notificationId}/cancel`);
    },

    // Resend a failed notification
    resend: async (notificationId: string): Promise<Notification> => {
        const response = await api.post(`/notifications/${notificationId}/resend`);
        return response.data;
    },

    // Get notification templates
    getTemplates: async () => {
        const response = await api.get('/notifications/templates');
        return response.data;
    },

    // Create notification template
    createTemplate: async (template: {
        name: string;
        title: string;
        message: string;
        type: string;
    }) => {
        const response = await api.post('/notifications/templates', template);
        return response.data;
    },

    // Send bulk notifications
    sendBulk: async (request: BulkNotificationRequest): Promise<Notification[]> => {
        const response = await api.post('/notifications/send/bulk', request);
        return response.data;
    },

    // Get available topics
    getTopics: async (): Promise<string[]> => {
        const response = await api.get('/notifications/topics');
        return response.data;
    },

    // Get detailed notification statistics
    getDetailedStats: async (): Promise<NotificationStats> => {
        const response = await api.get('/notifications/stats/detailed');
        return response.data;
    },
}; 