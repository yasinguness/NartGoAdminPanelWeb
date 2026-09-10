import { create } from 'zustand';
import { notificationService } from '../../services/notification/notificationService';
import { NotificationDto, EmailMessage } from '../../types/notifications/notificationModel';

interface NotificationStore {
    notifications: NotificationDto[];
    unreadCount: number;
    loading: boolean;
    error: string | null;
    currentPage: number;
    totalPages: number;
    pageSize: number;

    createNotification: (notification: NotificationDto) => Promise<NotificationDto>;
    createGroupedNotification: (notification: NotificationDto) => Promise<NotificationDto>;
    addToGroup: (parentId: number, notification: NotificationDto) => Promise<NotificationDto>;
    getGroupNotifications: (groupId: string, page?: number) => Promise<void>;
    getUserNotifications: (userId: string) => Promise<void>;
    getUserNotificationsPageable: (userId: string, page?: number, size?: number) => Promise<void>;
    getHighPriorityNotifications: (userId: string) => Promise<void>;
    getUnreadCount: (userId: string) => Promise<number>;
    markAsRead: (notificationId: number) => Promise<void>;
    sendEmail: (emailMessage: EmailMessage) => Promise<void>;
    sendSimpleEmail: (to: string, subject: string, content: string) => Promise<void>;
    sendBulkNotifications: (recipientIds: string[], baseNotification: NotificationDto) => Promise<NotificationDto[]>;
    sendBulkNotificationsFromTemplate: (
        recipientIds: string[],
        templateCode: string,
        senderId: string,
        parameters: Record<string, any>
    ) => Promise<NotificationDto[]>;
    sendBulkPersonalizedNotifications: (
        templateCode: string,
        senderId: string,
        recipientParameters: Record<string, Record<string, any>>
    ) => Promise<NotificationDto[]>;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
    notifications: [],
    unreadCount: 0,
    loading: false,
    error: null,
    currentPage: 0,
    totalPages: 0,
    pageSize: 10,

    createNotification: async (notification: NotificationDto) => {
        return await notificationService.createNotification(notification);
    },

    createGroupedNotification: async (notification: NotificationDto) => {
        return await notificationService.createGroupedNotification(notification);
    },

    addToGroup: async (parentId: number, notification: NotificationDto) => {
        return await notificationService.addToGroup(parentId, notification);
    },

    getGroupNotifications: async (groupId: string) => {
        set({ loading: true, error: null });
        try {
            const data = await notificationService.getGroupNotifications(groupId);
            set({
                notifications: data || [],
                loading: false
            });
        } catch (error) {
            set({ error: 'Failed to fetch group notifications', loading: false });
            throw error;
        }
    },

    getUserNotifications: async (userId: string) => {
        set({ loading: true, error: null });
        try {
            const data = await notificationService.getUserNotifications(userId);
            set({
                notifications: data || [],
                loading: false
            });
        } catch (error) {
            set({ error: 'Failed to fetch notifications', loading: false });
            throw error;
        }
    },

    getUserNotificationsPageable: async (userId: string, page: number = 0, size: number = 10) => {
        set({ loading: true, error: null });
        try {
            const data = await notificationService.getUserNotificationsPageable(userId, page, size);
            set({
                notifications: data?.content || [],
                currentPage: data?.number || 0,
                totalPages: data?.totalPages || 0,
                pageSize: data?.size || size,
                loading: false
            });
        } catch (error) {
            set({ error: 'Failed to fetch notifications', loading: false });
            throw error;
        }
    },

    getHighPriorityNotifications: async (userId: string) => {
        set({ loading: true, error: null });
        try {
            const data = await notificationService.getHighPriorityNotifications(userId);
            set({
                notifications: data || [],
                loading: false
            });
        } catch (error) {
            set({ error: 'Failed to fetch high priority notifications', loading: false });
            throw error;
        }
    },

    getUnreadCount: async (userId: string) => {
        try {
            const count = await notificationService.getUnreadCount(userId);
            set({ unreadCount: count || 0 });
            return count || 0;
        } catch (error) {
            set({ error: 'Failed to fetch unread count' });
            return 0;
        }
    },

    markAsRead: async (notificationId: number) => {
        set({ loading: true, error: null });
        try {
            await notificationService.markAsRead(notificationId);
            set((state) => ({
                notifications: state.notifications.map(n =>
                    n.id === notificationId ? { ...n, isRead: true } : n
                ),
                unreadCount: Math.max(0, state.unreadCount - 1),
                loading: false
            }));
        } catch (error) {
            set({ error: 'Failed to mark notification as read', loading: false });
            throw error;
        }
    },

    sendEmail: async (emailMessage: EmailMessage) => {
        await notificationService.sendEmail(emailMessage);
    },

    sendSimpleEmail: async (to: string, subject: string, content: string) => {
        await notificationService.sendSimpleEmail(to, subject, content);
    },

    sendBulkNotifications: async (recipientIds: string[], baseNotification: NotificationDto) => {
        return await notificationService.sendBulkNotifications({ recipientIds, baseNotification });
    },

    sendBulkNotificationsFromTemplate: async (
        recipientIds: string[],
        templateCode: string,
        senderId: string,
        parameters: Record<string, any>
    ) => {
        return await notificationService.sendBulkNotificationsFromTemplate(recipientIds, templateCode, senderId, parameters);
    },

    sendBulkPersonalizedNotifications: async (
        templateCode: string,
        senderId: string,
        recipientParameters: Record<string, Record<string, any>>
    ) => {
        return await notificationService.sendBulkPersonalizedNotifications(templateCode, senderId, recipientParameters);
    },
}));
