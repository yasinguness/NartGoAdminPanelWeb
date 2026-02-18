import { useCallback, useEffect } from 'react';
import { useNotificationStore } from '../store/notifications/notificationStore';
import { useSnackbar } from 'notistack';
import { NotificationDto, EmailMessage } from '../types/notifications/notificationModel';

export const useNotification = () => {
    const { enqueueSnackbar } = useSnackbar();
    const {
        notifications,
        unreadCount,
        loading,
        error,
        currentPage,
        totalPages,
        pageSize,
        createNotification,
        createGroupedNotification,
        addToGroup,
        getGroupNotifications,
        getUserNotifications,
        getUserNotificationsPageable,
        getHighPriorityNotifications,
        markAsRead,
        getUnreadCount,
        sendEmail,
        sendSimpleEmail,
        sendBulkNotifications,
        sendBulkNotificationsFromTemplate,
        sendBulkPersonalizedNotifications,
    } = useNotificationStore();

    // Error handling effect
    useEffect(() => {
        if (error) {
            enqueueSnackbar(error, { variant: 'error' });
        }
    }, [error, enqueueSnackbar]);

    const handleCreateNotification = useCallback(async (notification: NotificationDto) => {
        try {
            await createNotification(notification);
            enqueueSnackbar('Notification created successfully', { variant: 'success' });
        } catch (error) {
            enqueueSnackbar('Failed to create notification', { variant: 'error' });
            throw error;
        }
    }, [createNotification, enqueueSnackbar]);

    const handleCreateGroupedNotification = useCallback(async (notification: NotificationDto) => {
        try {
            await createGroupedNotification(notification);
            enqueueSnackbar('Grouped notification created successfully', { variant: 'success' });
        } catch (error) {
            enqueueSnackbar('Failed to create grouped notification', { variant: 'error' });
            throw error;
        }
    }, [createGroupedNotification, enqueueSnackbar]);

    const handleAddToGroup = useCallback(async (parentId: number, notification: NotificationDto) => {
        try {
            await addToGroup(parentId, notification);
            enqueueSnackbar('Added to group successfully', { variant: 'success' });
        } catch (error) {
            enqueueSnackbar('Failed to add to group', { variant: 'error' });
            throw error;
        }
    }, [addToGroup, enqueueSnackbar]);

    const handleMarkAsRead = useCallback(async (notificationId: number) => {
        try {
            await markAsRead(notificationId);
            enqueueSnackbar('Notification marked as read', { variant: 'success' });
        } catch (error) {
            enqueueSnackbar('Failed to mark notification as read', { variant: 'error' });
            throw error;
        }
    }, [markAsRead, enqueueSnackbar]);

    const handleSendEmail = useCallback(async (emailMessage: EmailMessage) => {
        try {
            await sendEmail(emailMessage);
            enqueueSnackbar('Email sent successfully', { variant: 'success' });
        } catch (error) {
            enqueueSnackbar('Failed to send email', { variant: 'error' });
            throw error;
        }
    }, [sendEmail, enqueueSnackbar]);

    const handleSendSimpleEmail = useCallback(async (to: string, subject: string, content: string) => {
        try {
            await sendSimpleEmail(to, subject, content);
            enqueueSnackbar('Simple email sent successfully', { variant: 'success' });
        } catch (error) {
            enqueueSnackbar('Failed to send simple email', { variant: 'error' });
            throw error;
        }
    }, [sendSimpleEmail, enqueueSnackbar]);

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
        notifications,
        unreadCount,
        loading,
        error,
        currentPage,
        totalPages,
        pageSize,
        createNotification: handleCreateNotification,
        createGroupedNotification: handleCreateGroupedNotification,
        addToGroup: handleAddToGroup,
        getGroupNotifications,
        getUserNotifications,
        getUserNotificationsPageable,
        getHighPriorityNotifications,
        markAsRead: handleMarkAsRead,
        getUnreadCount,
        sendEmail: handleSendEmail,
        sendSimpleEmail: handleSendSimpleEmail,
        sendBulkNotifications: handleSendBulkNotifications,
        sendBulkNotificationsFromTemplate: handleSendBulkNotificationsFromTemplate,
        sendBulkPersonalizedNotifications: handleSendBulkPersonalizedNotifications,
    };
}; 