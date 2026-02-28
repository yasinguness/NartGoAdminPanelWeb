// ─── Analytics Timeframe ───────────────────────────────────
export enum AnalyticsTimeframe {
    LAST_24H = 'LAST_24H',
    LAST_7D = 'LAST_7D',
    LAST_30D = 'LAST_30D',
    ALL_TIME = 'ALL_TIME',
}

// ─── Platform Breakdown ────────────────────────────────────
export interface PlatformBreakdown {
    android: number;
    ios: number;
    web: number;
}

// ─── Campaign Analytics ────────────────────────────────────
export interface CampaignAnalytics {
    campaignId: string;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    ctr: number;            // click-through rate (%)
    conversion: number;     // conversion count
    conversionRate: number; // conversion rate (%)
    unsubscribeRate: number;
    platformBreakdown: PlatformBreakdown;
    timeSeriesData?: AnalyticsDataPoint[];
}

// ─── Time Series Data ──────────────────────────────────────
export interface AnalyticsDataPoint {
    date: string;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
}

// ─── Dashboard Overview ────────────────────────────────────
export interface AnalyticsDashboardData {
    timeframe: AnalyticsTimeframe;
    totalSent: number;
    totalDelivered: number;
    totalOpened: number;
    averageCtr: number;
    averageConversion: number;
    averageUnsubscribeRate: number;
    platformBreakdown: PlatformBreakdown;
    dailyData: AnalyticsDataPoint[];
    topCampaigns: CampaignAnalytics[];
}

// ─── Factory ───────────────────────────────────────────────
export const createCampaignAnalytics = (data: Partial<CampaignAnalytics> = {}): CampaignAnalytics => ({
    campaignId: '',
    sent: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
    ctr: 0,
    conversion: 0,
    conversionRate: 0,
    unsubscribeRate: 0,
    platformBreakdown: { android: 0, ios: 0, web: 0 },
    ...data,
});
