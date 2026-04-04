export type AdminAuditAction =
    | 'USER_BLOCKED'
    | 'USER_UNBLOCKED'
    | 'USER_DELETED'
    | 'USER_ROLE_ADDED'
    | 'USER_ROLE_REMOVED'
    | 'USER_NOTE_ADDED'
    | 'USER_NOTE_DELETED'
    | 'USER_STATUS_CHANGED'
    | 'CONTENT_ARTICLE_CREATED'
    | 'CONTENT_ARTICLE_PUBLISHED'
    | 'CONTENT_ARTICLE_UNPUBLISHED'
    | 'CONTENT_ARTICLE_DELETED'
    | 'CONTENT_ARTICLE_UPDATED'
    | 'NOTIFICATION_BULK_SENT'
    | 'NOTIFICATION_CAMPAIGN_CREATED'
    | 'NOTIFICATION_CAMPAIGN_CANCELLED'
    | 'SETTLEMENT_APPROVED'
    | 'SETTLEMENT_REJECTED'
    | 'REFUND_ISSUED'
    | 'SUBMERCHANT_CREATED'
    | 'SUBMERCHANT_UPDATED'
    | 'SUBMERCHANT_STATUS_CHANGED'
    | 'GAMIFICATION_RULE_CREATED'
    | 'GAMIFICATION_RULE_UPDATED'
    | 'GAMIFICATION_RULE_DELETED'
    | 'SYSTEM_CONFIG_CHANGED';

export interface AdminAuditLogEntry {
    id: string;
    actorEmail: string;
    actorDisplayName?: string;
    action: AdminAuditAction;
    targetType?: string;
    targetId?: string;
    targetDescription?: string;
    detailsJson?: string;
    ipAddress?: string;
    createdAt: string;
}

export interface AdminAuditLogFilter {
    actorEmail?: string;
    action?: AdminAuditAction;
    targetType?: string;
    targetId?: string;
    from?: string;
    to?: string;
    page?: number;
    size?: number;
}
