import { useCallback, useEffect } from 'react';
import { useNotificationStore } from '../../store/notifications/notificationStore';
import { useSnackbar } from 'notistack';

export const useNotificationQueries = () => {
    const { enqueueSnackbar } = useSnackbar();
    const {
        notifications,
        unreadCount,
        loading,
        error,
        currentPage,
        totalPages,
        pageSize,
        getGroupNotifications,
        getUserNotifications,
        getUserNotificationsPageable,
        getHighPriorityNotifications,
        getUnreadCount,
    } = useNotificationStore();

    // Error handling effect
    useEffect(() => {
        if (error) {
            enqueueSnackbar(error, { variant: 'error' });
        }
    }, [error, enqueueSnackbar]);

    const handleGetGroupNotifications = useCallback(async (groupId: string) => {
        try {
            await getGroupNotifications(groupId);
        } catch (error) {
            enqueueSnackbar('Failed to fetch group notifications', { variant: 'error' });
        }
    }, [getGroupNotifications, enqueueSnackbar]);

    const handleGetUserNotifications = useCallback(async (email: string) => {
        try {
            await getUserNotifications(email);
        } catch (error) {
            enqueueSnackbar('Failed to fetch user notifications', { variant: 'error' });
        }
    }, [getUserNotifications, enqueueSnackbar]);

    const handleGetUserNotificationsPageable = useCallback(async (
        userId: string,
        page: number = 0,
        size: number = 10
    ) => {
        try {
            await getUserNotificationsPageable(userId, page, size);
        } catch (error) {
            enqueueSnackbar('Failed to fetch user notifications', { variant: 'error' });
        }
    }, [getUserNotificationsPageable, enqueueSnackbar]);

    const handleGetHighPriorityNotifications = useCallback(async (userId: string) => {
        try {
            await getHighPriorityNotifications(userId);
        } catch (error) {
            enqueueSnackbar('Failed to fetch high priority notifications', { variant: 'error' });
        }
    }, [getHighPriorityNotifications, enqueueSnackbar]);

    const handleGetUnreadCount = useCallback(async (userId: string) => {
        try {
            await getUnreadCount(userId);
        } catch (error) {
            enqueueSnackbar('Failed to fetch unread count', { variant: 'error' });
        }
    }, [getUnreadCount, enqueueSnackbar]);

    return {
        notifications,
        unreadCount,
        loading,
        error,
        currentPage,
        totalPages,
        pageSize,
        getGroupNotifications: handleGetGroupNotifications,
        getUserNotifications: handleGetUserNotifications,
        getUserNotificationsPageable: handleGetUserNotificationsPageable,
        getHighPriorityNotifications: handleGetHighPriorityNotifications,
        getUnreadCount: handleGetUnreadCount,
    };
}; 