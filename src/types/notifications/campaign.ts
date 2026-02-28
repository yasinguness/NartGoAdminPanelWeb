import { NotificationPriority } from './notificationModel';
import { AudienceSegment } from './audience';
import { ScheduleConfig } from './scheduling';
import { CampaignAnalytics } from './analytics';

// ─── Campaign Status ──────────────────────────────────────
export enum CampaignStatus {
    DRAFT = 'DRAFT',
    SCHEDULED = 'SCHEDULED',
    SENDING = 'SENDING',
    SENT = 'SENT',
    FAILED = 'FAILED',
    CANCELLED = 'CANCELLED',
}

// ─── Campaign Type ────────────────────────────────────────
export enum CampaignType {
    CAMPAIGN = 'CAMPAIGN',           // Toplu — yeni özellik duyurusu, haftalık özet, etkinlik hatırlatma
    TRANSACTIONAL = 'TRANSACTIONAL', // Event-based — yeni mesaj, yeni ilan, yakındaki biri aktif
}

// ─── Notification Channel ──────────────────────────────────
export enum NotificationChannel {
    PUSH = 'PUSH',
    IN_APP = 'IN_APP',
    EMAIL = 'EMAIL',
    SMS = 'SMS',
}

// ─── Campaign Content ──────────────────────────────────────
export interface CampaignContent {
    title: string;
    body: string;
    imageUrl?: string;
    deepLink?: string;
    customPayload?: Record<string, unknown>;
}

// ─── Campaign ──────────────────────────────────────────────
export interface Campaign {
    id: string;
    name: string;
    type: CampaignType;
    status: CampaignStatus;
    channels: NotificationChannel[];
    content: CampaignContent;
    audience?: AudienceSegment;
    schedule?: ScheduleConfig;
    analytics?: CampaignAnalytics;
    priority: NotificationPriority;
    createdAt: string;
    updatedAt: string;
    sentAt?: string;
    createdBy?: string;
    tags?: string[];
}

// ─── Transactional Trigger ─────────────────────────────────
export enum TransactionalTrigger {
    NEW_MESSAGE = 'NEW_MESSAGE',
    NEW_LISTING = 'NEW_LISTING',
    NEARBY_ACTIVE = 'NEARBY_ACTIVE',
    SUBSCRIPTION_EXPIRED = 'SUBSCRIPTION_EXPIRED',
    NEW_EVENT = 'NEW_EVENT',
    NEW_FOLLOWER = 'NEW_FOLLOWER',
}

export interface TransactionalConfig {
    trigger: TransactionalTrigger;
    channels: NotificationChannel[];
    content: CampaignContent;
    isActive: boolean;
    priority: NotificationPriority;
}

// ─── Factory ───────────────────────────────────────────────
export const createCampaign = (data: Partial<Campaign> = {}): Campaign => ({
    id: '',
    name: '',
    type: CampaignType.CAMPAIGN,
    status: CampaignStatus.DRAFT,
    channels: [NotificationChannel.PUSH],
    content: { title: '', body: '' },
    priority: NotificationPriority.NORMAL,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...data,
});

export const createTransactionalConfig = (data: Partial<TransactionalConfig> = {}): TransactionalConfig => ({
    trigger: TransactionalTrigger.NEW_MESSAGE,
    channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
    content: { title: '', body: '' },
    isActive: true,
    priority: NotificationPriority.NORMAL,
    ...data,
});
