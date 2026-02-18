import { NotificationPriority } from './notificationModel';

export enum RecipientType {
    ALL = 'ALL',                           // Tüm kullanıcılar (kayıtlı + anonim)
    REGISTERED = 'REGISTERED',             // Sadece kayıtlı kullanıcılar
    ANONYMOUS = 'ANONYMOUS',               // Sadece anonim kullanıcılar
    REGISTERED_AND_ANONYMOUS = 'REGISTERED_AND_ANONYMOUS', // Kayıtlı ve anonim ayrı ayrı
    SPECIFIC_USERS = 'SPECIFIC_USERS'      // Seçili özel kullanıcılar
}

export interface AdminBulkNotificationRequest {
    title: string;
    content: string;
    type: string;
    priority: NotificationPriority;
    senderId?: string;
    expiresAt?: string; // ISO string format
    additionalData?: { [key: string]: any };
    
    // System maintenance specific fields (API expects these at root level)
    startTime?: string; // ISO string format for maintenance start
    endTime?: string; // ISO string format for maintenance end
    
    // Recipient options - only one should be provided
    emailList?: string[]; // Specific email addresses
    recipientType?: RecipientType; // ALL, REGISTERED, ANONYMOUS, REGISTERED_AND_ANONYMOUS
    
    // Template options
    templateCode?: string;
    templateParameters?: { [key: string]: any };
    
    // Notification channels
    sendPush?: boolean;
    sendEmail?: boolean;
    sendTelegram?: boolean;
    sendWebSocket?: boolean;
}

// Helper function to create AdminBulkNotificationRequest
export const createAdminBulkNotificationRequest = (data: Partial<AdminBulkNotificationRequest>): AdminBulkNotificationRequest => {
    return {
        title: '',
        content: '',
        type: '',
        priority: NotificationPriority.MEDIUM,
        sendPush: true,
        sendEmail: false,
        sendTelegram: false,
        sendWebSocket: true,
        ...data
    };
};
