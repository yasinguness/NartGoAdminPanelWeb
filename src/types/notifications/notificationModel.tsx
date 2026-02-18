export enum NotificationPriority {
    LOW = 'LOW',
    NORMAL = 'NORMAL',
    HIGH = 'HIGH',
    URGENT = 'URGENT'
}

export enum NotificationType {
    SYSTEM = 'SYSTEM',
    SYSTEM_MAINTENANCE = 'SISTEM_BAKIMI',
    PROMOTION = 'PROMOSYON',
    ANNOUNCEMENT = 'DUYURU',
    ALERT = 'UYARI',
    FEATURE_UPDATE = 'OZELLIK_GUNCELLEMESI',
    EVENT_REMINDER = 'ETKINLIK_HATIRLATMASI',
    URGENT = 'ACIL'
}

export enum NotificationTemplate {
    EVENT_REMINDER = 'etkinlik-hatirlatma.html',
    SYSTEM_MAINTENANCE = 'sistem-bakimi.html',
    PROMOTION = 'promosyon.html',
    FEATURE_UPDATE = 'ozellik-guncellemesi.html',
    URGENT_NOTIFICATION = 'acil-bildirim.html'
}

export interface AdditionalData {
    telegramButtons?: Array<{ [key: string]: string }>;
    fcmData?: { [key: string]: string };
    emailTemplateVariables?: { [key: string]: any };
    // Event reminder specific data
    eventTitle?: string;
    eventDescription?: string;
    eventTime?: string;
    organizerName?: string;
    // Promotion specific data
    discountCode?: string;
    validUntil?: string;
    discountPercentage?: number;
    // System maintenance specific data
    maintenanceStartTime?: string;
    maintenanceEndTime?: string;
    affectedServices?: string[];
    statusPageUrl?: string;
    [key: string]: any;
}

export interface NotificationDto {
    id: number;
    title: string;
    content: string;
    email: string;
    senderId: string;
    type: string;
    isRead: boolean;
    priority: NotificationPriority;
    groupId: string;
    groupOrder: number;
    parentNotificationId: number;
    childCount: number;
    createdAt: string;
    updatedAt: string;
    expiresAt: string;
    additionalData: AdditionalData;
}

export interface EmailMessage {
    to: string;
    subject: string;
    templateName: string;
    templateVariables: { [key: string]: any };
    retryCount: number;
    timestamp: number;
}

// Helper functions for NotificationDto
export const createNotificationDto = (data: Partial<NotificationDto>): NotificationDto => {
    return {
        id: 0,
        title: '',
        content: '',
        email: '',
        senderId: '',
        type: '',
        isRead: false,
        priority: NotificationPriority.NORMAL,
        groupId: '',
        groupOrder: 0,
        parentNotificationId: 0,
        childCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        expiresAt: new Date().toISOString(),
        additionalData: {},
        ...data
    };
};

export const createEmailMessage = (data: Partial<EmailMessage>): EmailMessage => {
    return {
        to: '',
        subject: '',
        templateName: '',
        templateVariables: {},
        retryCount: 0,
        timestamp: Date.now(),
        ...data
    };
}; 