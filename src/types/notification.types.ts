export type CampaignStatus = 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'SENT' | 'FAILED' | 'CANCELLED';
export type Priority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type Channel = 'PUSH' | 'IN_APP' | 'EMAIL' | 'SMS';
export type TargetType = 'ALL' | 'SEGMENT' | 'INDIVIDUAL' | 'CSV_UPLOAD';

export interface TargetingConfig {
  type: TargetType;
  countries: string[];
  cities: string[];
  categories: string[];
  userSegments: string[];
  behaviors: string[];
  specificUserIds: string[];
  minDaysSinceRegister?: number;
  maxDaysSinceRegister?: number;
  minDaysSinceLastLogin?: number;
  maxDaysSinceLastLogin?: number;
}

export interface CampaignStats {
  delivered: number;
  opened: number;
  clicked: number;
  optOut: number;
  failed: number;
  deliveryRate: number;
  openRate: number;
  ctr: number;
}

export interface Campaign {
  id: string;
  name: string;
  title: string;
  body: string;
  richContent?: ContentBlock[];
  imageUrl?: string;
  deepLink?: string;
  status: CampaignStatus;
  priority: Priority;
  channels: Channel[];
  targeting: TargetingConfig;
  estimatedReach: number;
  scheduledAt?: string;
  sentAt?: string;
  createdAt: string;
  createdBy: string;
  stats: CampaignStats;
}

// ─── Rich Content Blocks (Blog-style) ─────────────────
export type ContentBlockType = 'heading' | 'paragraph' | 'image' | 'divider' | 'callout' | 'quote';

export interface HeadingBlock { type: 'heading'; text: string; level: 1 | 2 | 3; }
export interface ParagraphBlock { type: 'paragraph'; text: string; }
export interface ImageBlock { type: 'image'; url: string; caption?: string; width?: 'full' | 'medium' | 'small'; }
export interface DividerBlock { type: 'divider'; }
export interface CalloutBlock { type: 'callout'; text: string; variant: 'info' | 'warning' | 'success'; }
export interface QuoteBlock { type: 'quote'; text: string; author?: string; }

export type ContentBlock = HeadingBlock | ParagraphBlock | ImageBlock | DividerBlock | CalloutBlock | QuoteBlock;

export interface CreateCampaignRequest {
  name: string;
  title: string;
  body: string;
  richContent?: ContentBlock[];
  imageUrl?: string;
  deepLink?: string;
  priority: Priority;
  channels: Channel[];
  targeting: TargetingConfig;
}

export interface ScheduleRequest {
  scheduledAt: string;
}

export interface AnalyticsOverview {
  totalCampaigns: number;
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  totalOptOut: number;
  avgDeliveryRate: number;
  avgOpenRate: number;
  avgCTR: number;
  channelBreakdown: Record<string, CampaignStats>;
  dailyStats: { date: string; sent: number; opened: number; clicked: number }[];
  topCampaigns: { id: string; name: string; ctr: number; sent: number }[];
}

export interface NotificationLog {
  id: string;
  campaignId: string;
  userId?: string;
  userEmail?: string;
  channel: Channel;
  status: string;
  sentAt: string;
  deliveredAt?: string;
  openedAt?: string;
  clickedAt?: string;
  failureReason?: string;
}

export const EMPTY_TARGETING: TargetingConfig = {
  type: 'ALL',
  countries: [],
  cities: [],
  categories: [],
  userSegments: [],
  behaviors: [],
  specificUserIds: [],
};

export const STATUS_COLORS: Record<CampaignStatus, { bg: string; text: string }> = {
  DRAFT: { bg: '#F3F4F6', text: '#6B7280' },
  SCHEDULED: { bg: '#E6F1FB', text: '#0C447C' },
  SENDING: { bg: '#FAEEDA', text: '#633806' },
  SENT: { bg: '#EAF3DE', text: '#27500A' },
  FAILED: { bg: '#FCEBEB', text: '#A32D2D' },
  CANCELLED: { bg: '#F3F4F6', text: '#6B7280' },
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  LOW: '#6B7280',
  NORMAL: '#1a5c28',
  HIGH: '#D97706',
  URGENT: '#DC2626',
};

export const CHANNEL_LABELS: Record<Channel, string> = {
  PUSH: 'Push',
  IN_APP: 'Uygulama İçi',
  EMAIL: 'E-posta',
  SMS: 'SMS',
};
