import { useCallback } from 'react';
import { useAdminNotificationStore } from '../../store/notifications/adminNotificationStore';
import { useNotificationStore } from '../../store/notifications/notificationStore';
import { useSnackbar } from 'notistack';
import { AdminBulkNotificationRequest } from '../../types/notifications/adminBulkNotificationRequest';

export const useNotificationActions = () => {
    const { enqueueSnackbar } = useSnackbar();
    const {
        sendBulkNotificationToAll,
        sendBulkNotificationToRegistered,
        sendBulkNotificationToAnonymous,
        sendMultiChannelNotification,
    } = useAdminNotificationStore();
    const { markAsRead: markNotificationRead } = useNotificationStore();

    const createNotification = useCallback(async (request: AdminBulkNotificationRequest) => {
        try {
            const response = await sendMultiChannelNotification(request);
            enqueueSnackbar('Notification sent successfully', { variant: 'success' });
            return response;
        } catch (error) {
            enqueueSnackbar('Failed to send notification', { variant: 'error' });
            throw error;
        }
    }, [sendMultiChannelNotification, enqueueSnackbar]);

    const markAsRead = useCallback(async (notificationId: number) => {
        try {
            await markNotificationRead(notificationId);
        } catch (error) {
            enqueueSnackbar('Failed to mark as read', { variant: 'error' });
            throw error;
        }
    }, [markNotificationRead, enqueueSnackbar]);

    return {
        createNotification,
        markAsRead,
        sendBulkNotificationToAll: async (request: AdminBulkNotificationRequest) => {
            try {
                await sendBulkNotificationToAll(request);
                enqueueSnackbar('Bulk notification sent to all users', { variant: 'success' });
            } catch (error) {
                enqueueSnackbar('Failed to send bulk notification', { variant: 'error' });
                throw error;
            }
        },
        sendBulkNotificationToRegistered: async (request: AdminBulkNotificationRequest) => {
            try {
                await sendBulkNotificationToRegistered(request);
                enqueueSnackbar('Notification sent to registered users', { variant: 'success' });
            } catch (error) {
                enqueueSnackbar('Failed to send notification', { variant: 'error' });
                throw error;
            }
        },
        sendBulkNotificationToAnonymous: async (request: AdminBulkNotificationRequest) => {
            try {
                await sendBulkNotificationToAnonymous(request);
                enqueueSnackbar('Notification sent to anonymous users', { variant: 'success' });
            } catch (error) {
                enqueueSnackbar('Failed to send notification', { variant: 'error' });
                throw error;
            }
        },
    };
}; 