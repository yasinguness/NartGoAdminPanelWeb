import { useCallback } from 'react';
import { adminNotificationService } from '../../services/notification/adminNotificationService';
import { useSnackbar } from 'notistack';
import { EmailMessage } from '../../types/notifications/notificationModel';

export const useEmailActions = () => {
    const { enqueueSnackbar } = useSnackbar();

    const sendEmail = useCallback(async (emailMessage: EmailMessage) => {
        try {
            const content = Object.entries(emailMessage.templateVariables || {})
                .map(([key, value]) => `${key}: ${value}`)
                .join('\n');

            const request: any = {
                title: emailMessage.subject || 'Email Notification',
                content: content || emailMessage.subject || '',
                sendEmail: true,
                sendPush: false,
                sendWebSocket: false,
                recipientType: 'REGISTERED',
                priority: 'NORMAL',
            };
            
            await adminNotificationService.sendBulkNotificationToRegistered(request);
            enqueueSnackbar('Email sent successfully', { variant: 'success' });
        } catch (error) {
            enqueueSnackbar('Failed to send email', { variant: 'error' });
            throw error;
        }
    }, [enqueueSnackbar]);

    return {
        sendEmail,
    };
}; 