import { Campaign, CampaignType, CampaignStatus, NotificationChannel } from '../../types/notifications/campaign';
import { NotificationPriority } from '../../types/notifications/notificationModel';
import { AnalyticsDashboardData, AnalyticsTimeframe } from '../../types/notifications/analytics';
import { AudienceSegment, SegmentFilterType, FilterOperator } from '../../types/notifications/audience';
import { RateLimitConfig } from '../../types/notifications/rateLimit';
import { ScheduleType } from '../../types/notifications/scheduling';

export const mockCampaigns: Campaign[] = [
    {
        id: 'cmp-1',
        name: 'Hoşgelden İndirimi',
        type: CampaignType.CAMPAIGN,
        status: CampaignStatus.SENT,
        channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
        priority: NotificationPriority.HIGH,
        content: {
            title: '🔥 %50 İndirim Seni Bekliyor!',
            body: 'Aramıza hoş geldin! İlk alışverişinde geçerli %50 indirimi kaçırma.',
            deepLink: '/explore'
        },
        tags: ['welcome', 'promo'],
        audience: {
            id: 'seg-xyz',
            name: 'Yeni Kullanıcılar',
            estimatedReach: 4500,
            filters: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        schedule: {
            type: ScheduleType.IMMEDIATE
        },
        analytics: {
            campaignId: 'cmp-1',
            sent: 4500,
            delivered: 4200,
            opened: 2100,
            clicked: 850,
            ctr: 20.2,
            conversion: 140,
            conversionRate: 3.3,
            unsubscribeRate: 0.1,
            platformBreakdown: { android: 2500, ios: 1500, web: 500 }
        },
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
        id: 'cmp-2',
        name: 'Hafta Sonu Etkinlikleri',
        type: CampaignType.CAMPAIGN,
        status: CampaignStatus.SCHEDULED,
        channels: [NotificationChannel.PUSH],
        priority: NotificationPriority.NORMAL,
        content: {
            title: '🎉 Bu Hafta Sonu Neler Var?',
            body: 'Şehrindeki en popüler etkinlikler ve çekilişler listelendi. Hemen göz at!',
            deepLink: '/events'
        },
        tags: ['weekly', 'events'],
        audience: {
            id: 'seg-abc',
            name: 'Aktif Kullanıcılar',
            estimatedReach: 12500,
            filters: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        schedule: {
            type: ScheduleType.SCHEDULED,
            scheduledAt: new Date(Date.now() + 86400000).toISOString(),
            timezone: 'Europe/Istanbul'
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: 'cmp-3',
        name: 'Sepette Unutulanlar',
        type: CampaignType.TRANSACTIONAL,
        status: CampaignStatus.SENDING,
        channels: [NotificationChannel.EMAIL, NotificationChannel.PUSH],
        priority: NotificationPriority.HIGH,
        content: {
            title: '🛒 Sepetindeki Ürünler Tükenebilir',
            body: 'Sepetinde bıraktığın ürünler stokta azalıyor. Siparişini tamamlamak için tıkla.',
            deepLink: '/cart'
        },
        tags: ['retention', 'cart'],
        audience: {
            id: 'seg-123',
            name: 'Sepeti Terk Edenler',
            estimatedReach: 320,
            filters: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        schedule: {
            type: ScheduleType.IMMEDIATE
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: 'cmp-4',
        name: 'Yeni Sezon Duyurusu',
        type: CampaignType.CAMPAIGN,
        status: CampaignStatus.DRAFT,
        channels: [NotificationChannel.IN_APP],
        priority: NotificationPriority.LOW,
        content: {
            title: '✨ Yeni Sezon Geldi!',
            body: 'En yeni trendleri incelemek için profilini güncelle.',
            deepLink: '/profile'
        },
        tags: ['update'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    }
];

export const mockDashboardData: AnalyticsDashboardData = {
    timeframe: AnalyticsTimeframe.LAST_7D,
    totalSent: 124500,
    totalDelivered: 118200,
    totalOpened: 45600,
    averageCtr: 18.5,
    averageConversion: 4.2,
    averageUnsubscribeRate: 0.8,
    platformBreakdown: { android: 65000, ios: 42000, web: 11200 },
    dailyData: [
        { date: 'Pzt', sent: 12000, delivered: 11500, opened: 5000, clicked: 800 },
        { date: 'Sal', sent: 15400, delivered: 14200, opened: 6200, clicked: 1100 },
        { date: 'Çar', sent: 21000, delivered: 20100, opened: 8400, clicked: 1500 },
        { date: 'Per', sent: 18500, delivered: 17800, opened: 7100, clicked: 1250 },
        { date: 'Cum', sent: 28000, delivered: 26500, opened: 11000, clicked: 2100 },
        { date: 'Cmt', sent: 16000, delivered: 15200, opened: 4800, clicked: 850 },
        { date: 'Paz', sent: 13600, delivered: 12900, opened: 3100, clicked: 500 }
    ],
    topCampaigns: []
};

export const mockRateLimit: RateLimitConfig = {
    maxPushPerUserPerDay: 5,
    quietHours: {
        enabled: true,
        startHour: 23,
        endHour: 8,
        timezone: 'Europe/Istanbul'
    },
    frequencyCap: 3,
    spamDetectionEnabled: true,
    autoThrottleEnabled: false
};

export const mockSegments: AudienceSegment[] = [
    {
        id: 'seg-1',
        name: 'Aktif Premium Kullanıcılar',
        description: 'Son 7 günde giriş yapmış premium hesaplar.',
        estimatedReach: 12500,
        filters: [
            { id: 'f1', type: SegmentFilterType.PREMIUM_STATUS, operator: FilterOperator.EQUALS, value: 'true' },
            { id: 'f2', type: SegmentFilterType.LAST_ACTIVE, operator: FilterOperator.LESS_THAN, value: 7 }
        ],
        isPreset: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'seg-2',
        name: 'İstanbul iOS Kullanıcıları',
        description: 'İstanbul\'da yaşayan ve iPhone kullananlar.',
        estimatedReach: 45200,
        filters: [
            { id: 'f3', type: SegmentFilterType.CITY, operator: FilterOperator.EQUALS, value: 'İstanbul' },
            { id: 'f4', type: SegmentFilterType.PLATFORM, operator: FilterOperator.EQUALS, value: 'ios' }
        ],
        isPreset: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }
];
