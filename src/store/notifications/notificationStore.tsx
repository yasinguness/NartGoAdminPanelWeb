import { create } from 'zustand';
import { notificationService } from '../../services/notification/notificationService';
import { NotificationDto } from '../../types/notifications/notificationModel';

interface NotificationStore {
    notifications: NotificationDto[];
    unreadCount: number;
    loading: boolean;
    error: string | null;
    currentPage: number;
    totalPages: number;
    pageSize: number;

    getGroupNotifications: (groupId: string, page?: number) => Promise<void>;
    getUserNotifications: (userId: string) => Promise<void>;
    getUserNotificationsPageable: (userId: string, page?: number, size?: number) => Promise<void>;
    getHighPriorityNotifications: (userId: string) => Promise<void>;
    getUnreadCount: (userId: string) => Promise<number>;
    markAsRead: (notificationId: number) => Promise<void>;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
    notifications: [],
    unreadCount: 0,
    loading: false,
    error: null,
    currentPage: 0,
    totalPages: 0,
    pageSize: 10,

    getGroupNotifications: async (groupId: string, page: number = 0) => {
        set({ loading: true, error: null });
        try {
            const response = await notificationService.getGroupNotifications(groupId, page);
            set({
                notifications: response.data || [],
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
            const response = await notificationService.getUserNotifications(userId);
            set({
                notifications: response.data || [],
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
            const response = await notificationService.getUserNotificationsPageable(userId, page, size);
            set({
                notifications: response.data?.content || [],
                currentPage: response.data?.number || 0,
                totalPages: response.data?.totalPages || 0,
                pageSize: response.data?.size || size,
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
            const response = await notificationService.getHighPriorityNotifications(userId);
            set({
                notifications: response.data || [],
                loading: false
            });
        } catch (error) {
            set({ error: 'Failed to fetch high priority notifications', loading: false });
            throw error;
        }
    },

    getUnreadCount: async (userId: string) => {
        try {
            const response = await notificationService.getUnreadCount(userId);
            set({ unreadCount: response.data || 0 });
            return response.data || 0;
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
}));
