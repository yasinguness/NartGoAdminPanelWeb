export interface ChannelStats {
    totalSent: number;
    successful: number;
    failed: number;
    successRate: number;
}

export interface DeliveryError {
    recipient: string;
    channel: string;
    errorMessage: string;
    errorCode: string;
}

export interface RecipientBreakdown {
    registeredUsers: number;
    anonymousUsers: number;
    specificEmails: number;
    totalDevices: number;
}

export interface AdminBulkNotificationResponse {
    requestId: string;
    sentAt: string; // ISO string format
    status: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED';
    
    // Recipient statistics
    totalRecipients: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    skippedDeliveries: number;
    
    // Channel statistics
    channelStats: { [key: string]: ChannelStats };
    
    // Error details
    errors: DeliveryError[];
    
    // Recipient breakdown
    recipientBreakdown: RecipientBreakdown;
}

// Helper functions
export const createChannelStats = (data: Partial<ChannelStats>): ChannelStats => {
    return {
        totalSent: 0,
        successful: 0,
        failed: 0,
        successRate: 0,
        ...data
    };
};

export const createDeliveryError = (data: Partial<DeliveryError>): DeliveryError => {
    return {
        recipient: '',
        channel: '',
        errorMessage: '',
        errorCode: '',
        ...data
    };
};

export const createRecipientBreakdown = (data: Partial<RecipientBreakdown>): RecipientBreakdown => {
    return {
        registeredUsers: 0,
        anonymousUsers: 0,
        specificEmails: 0,
        totalDevices: 0,
        ...data
    };
};

export const createAdminBulkNotificationResponse = (data: Partial<AdminBulkNotificationResponse>): AdminBulkNotificationResponse => {
    return {
        requestId: '',
        sentAt: new Date().toISOString(),
        status: 'SUCCESS',
        totalRecipients: 0,
        successfulDeliveries: 0,
        failedDeliveries: 0,
        skippedDeliveries: 0,
        channelStats: {},
        errors: [],
        recipientBreakdown: createRecipientBreakdown(),
        ...data
    };
};
