export type JobStatus =
    | 'PENDING_APPROVAL'
    | 'SCHEDULED'
    | 'PROCESSING'
    | 'COMPLETED'
    | 'FAILED'
    | 'CANCELLED';

export interface BulkNotificationJob {
    id: number;
    title: string;
    content?: string;
    type?: string;
    priority?: string;
    status: JobStatus;
    scheduledAt?: string;
    startedAt?: string;
    completedAt?: string;
    targetType?: string;
    channelConfig?: string;
    totalRecipients?: number;
    processedRecipients?: number;
    successfulDeliveries?: number;
    failedDeliveries?: number;
    createdBy?: string;
    approvedBy?: string;
    approvedAt?: string;
    deepLink?: string;
}
