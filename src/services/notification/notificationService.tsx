import { api } from '../api';
import { NotificationDto, EmailMessage } from '../../types/notifications/notificationModel';

export interface BulkNotificationRequest {
    recipientIds: string[];
    baseNotification: NotificationDto;
}

export interface PageableResponse<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
}

export const notificationService = {
    // Notification endpoints
    createNotification: async (notification: NotificationDto): Promise<NotificationDto> => {
        const response = await api.post<NotificationDto>('/notifications', notification);
        return response.data;
    },

    createGroupedNotification: async (notification: NotificationDto): Promise<NotificationDto> => {
        const response = await api.post<NotificationDto>('/notifications/group', notification);
        return response.data;
    },

    addToGroup: async (parentId: number, notification: NotificationDto): Promise<NotificationDto> => {
        const response = await api.post<NotificationDto>(`/notifications/group/${parentId}`, notification);
        return response.data;
    },

    getGroupNotifications: async (groupId: string): Promise<NotificationDto[]> => {
        const response = await api.get<NotificationDto[]>(`/notifications/group/${groupId}`);
        return response.data;
    },

    getUserNotifications: async (email: string): Promise<NotificationDto[]> => {
        const response = await api.get<NotificationDto[]>(`/notifications/user/${email}`);
        return response.data;
    },

    getUserNotificationsPageable: async (
        userId: string,
        page: number = 0,
        size: number = 10
    ): Promise<PageableResponse<NotificationDto>> => {
        const response = await api.get<PageableResponse<NotificationDto>>(
            `/notifications/user/${userId}/pageable?page=${page}&size=${size}`
        );
        return response.data;
    },

    getHighPriorityNotifications: async (userId: string): Promise<NotificationDto[]> => {
        const response = await api.get<NotificationDto[]>(`/notifications/user/${userId}/high-priority`);
        return response.data;
    },

    markAsRead: async (notificationId: number): Promise<NotificationDto> => {
        const response = await api.put<NotificationDto>(`/notifications/${notificationId}/read`);
        return response.data;
    },

    getUnreadCount: async (userId: string): Promise<number> => {
        const response = await api.get<number>(`/notifications/user/${userId}/unread-count`);
        return response.data;
    },

    // Email endpoints
    sendEmail: async (emailMessage: EmailMessage): Promise<void> => {
        await api.post('/notifications/emails/send', emailMessage);
    },

    sendSimpleEmail: async (to: string, subject: string, content: string): Promise<void> => {
        await api.post('/notifications/emails/send-simple', null, {
            params: { to, subject, content }
        });
    },

    // Bulk notification endpoints
    sendBulkNotifications: async (request: BulkNotificationRequest): Promise<NotificationDto[]> => {
        const response = await api.post<NotificationDto[]>('/notifications/bulk-notifications/send', request);
        return response.data;
    },

    sendBulkNotificationsFromTemplate: async (
        recipientIds: string[],
        templateCode: string,
        senderId: string,
        parameters: Record<string, any>
    ): Promise<NotificationDto[]> => {
        const response = await api.post<NotificationDto[]>(
            '/notifications/bulk-notifications/send-template',
            parameters,
            {
                params: { recipientIds, templateCode, senderId }
            }
        );
        return response.data;
    },

    sendBulkPersonalizedNotifications: async (
        templateCode: string,
        senderId: string,
        recipientParameters: Record<string, Record<string, any>>
    ): Promise<NotificationDto[]> => {
        const response = await api.post<NotificationDto[]>(
            '/notifications/bulk-notifications/send-personalized',
            recipientParameters,
            {
                params: { templateCode, senderId }
            }
        );
        return response.data;
    }
}; 