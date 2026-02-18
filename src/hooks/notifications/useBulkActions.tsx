import { useCallback } from 'react';
import { useNotificationStore } from '../../store/notifications/notificationStore';
import { useSnackbar } from 'notistack';
import { NotificationDto } from '../../types/notifications/notificationModel';

export const useBulkActions = () => {
    const { enqueueSnackbar } = useSnackbar();
    const {
        sendBulkNotifications,
        sendBulkNotificationsFromTemplate,
        sendBulkPersonalizedNotifications,
    } = useNotificationStore();

    const handleSendBulkNotifications = useCallback(async (recipientIds: string[], baseNotification: NotificationDto) => {
        try {
            await sendBulkNotifications(recipientIds, baseNotification);
            enqueueSnackbar('Bulk notifications sent successfully', { variant: 'success' });
        } catch (error) {
            enqueueSnackbar('Failed to send bulk notifications', { variant: 'error' });
            throw error;
        }
    }, [sendBulkNotifications, enqueueSnackbar]);

    const handleSendBulkNotificationsFromTemplate = useCallback(async (
        recipientIds: string[],
        templateCode: string,
        senderId: string,
        parameters: Record<string, any>
    ) => {
        try {
            await sendBulkNotificationsFromTemplate(recipientIds, templateCode, senderId, parameters);
            enqueueSnackbar('Bulk notifications from template sent successfully', { variant: 'success' });
        } catch (error) {
            enqueueSnackbar('Failed to send bulk notifications from template', { variant: 'error' });
            throw error;
        }
    }, [sendBulkNotificationsFromTemplate, enqueueSnackbar]);

    const handleSendBulkPersonalizedNotifications = useCallback(async (
        templateCode: string,
        senderId: string,
        recipientParameters: Record<string, Record<string, any>>
    ) => {
        try {
            await sendBulkPersonalizedNotifications(templateCode, senderId, recipientParameters);
            enqueueSnackbar('Bulk personalized notifications sent successfully', { variant: 'success' });
        } catch (error) {
            enqueueSnackbar('Failed to send bulk personalized notifications', { variant: 'error' });
            throw error;
        }
    }, [sendBulkPersonalizedNotifications, enqueueSnackbar]);

    return {
        sendBulkNotifications: handleSendBulkNotifications,
        sendBulkNotificationsFromTemplate: handleSendBulkNotificationsFromTemplate,
        sendBulkPersonalizedNotifications: handleSendBulkPersonalizedNotifications,
    };
}; 