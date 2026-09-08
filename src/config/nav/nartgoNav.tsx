/**
 * NartGo workspace navigasyonu.
 *
 * Layout.tsx'ten olduğu gibi taşındı; NartBusiness bölümü buradan çıkarılıp
 * kendi workspace'ine (nartbusinessNav.tsx) alındı. Etkinlik, bilet, finans
 * ve platform yönetimi bu listede kalır.
 */

import {
    Dashboard as DashboardIcon,
    Devices as DevicesIcon,
    Notifications as NotificationsIcon,
    EmailOutlined as EmailIcon,
    People as PeopleIcon,
    Business as BusinessIcon,
    Category as CategoryIcon,
    Settings as SettingsIcon,
    Event as EventIcon,
    EventNote as EventCategoryIcon,
    HomeWork,
    Feed as FeedIcon,
    EmojiEvents as EmojiEventsIcon,
    Casino as CasinoIcon,
    LiveTv as LiveTvIcon,
    FactCheck as FactCheckIcon,
    AccountBalance as AccountBalanceIcon,
    TrendingUp as TrendingUpIcon,
    SupportAgent as SupportIcon,
    LocalActivity as LocalActivityIcon,
    ConfirmationNumber as TicketIcon,
    Campaign as CampaignIcon,
    Star as StarIcon,
    ToggleOn as ToggleOnIcon,
    Badge as BadgeIcon,
    EventSeat as EventSeatIcon,
    Article as ArticleIcon,
    CloudSync as CloudSyncIcon,
    ManageSearch as AuditIcon,
    Insights as ExecutiveIcon,
    PersonOff as PersonOffIcon,
    BarChart as BarChartIcon,
} from '@mui/icons-material';
import type { NavSection } from './types';

export const nartgoNavSections: NavSection[] = [
    {
        title: 'Genel',
        items: [
            { text: 'Kontrol Paneli', icon: <DashboardIcon />, path: '/dashboard' },
            { text: 'Stratejik Panel', icon: <ExecutiveIcon />, path: '/executive', allowedRoles: ['ADMIN'] },
        ],
    },
    {
        title: 'Etkinlik Yönetimi',
        allowedRoles: ['ADMIN', 'EVENT_ORGANIZATOR'],
        items: [
            { text: 'Etkinlikler', icon: <EventIcon />, path: '/events' },
            { text: 'Etkinlik Oluştur', icon: <TicketIcon />, path: '/event-creation' },
            { text: 'Bilet Yönetimi', icon: <TicketIcon />, path: '/tickets' },
            { text: 'Salon Planları', icon: <EventSeatIcon />, path: '/seat-templates' },
            { text: 'Etkinlik Kategorileri', icon: <EventCategoryIcon />, path: '/event-categories', allowedRoles: ['ADMIN'] },
        ],
    },
    {
        title: 'İçerik',
        allowedRoles: ['ADMIN', 'EDITOR'],
        items: [
            { text: 'İçerik & Makaleler', icon: <ArticleIcon />, path: '/content' },
            { text: 'İçerik Toplama', icon: <CloudSyncIcon />, path: '/content/ingest' },
        ],
    },
    {
        title: 'Satış & Finans',
        allowedRoles: ['ADMIN', 'EVENT_ORGANIZATOR'],
        items: [
            { text: 'Satış Özeti', icon: <TrendingUpIcon />, path: '/sales-command' },
            { text: 'Gelir & Gider Raporu', icon: <AccountBalanceIcon />, path: '/finance/overview', allowedRoles: ['ADMIN'] },
            { text: 'Mutabakat', icon: <AccountBalanceIcon />, path: '/finance/reconciliation', allowedRoles: ['ADMIN'] },
            { text: 'Organizatör Ödemeleri', icon: <AccountBalanceIcon />, path: '/finance/payouts', allowedRoles: ['ADMIN'] },
            { text: 'İadeler', icon: <AccountBalanceIcon />, path: '/finance/refunds', allowedRoles: ['ADMIN'] },
            { text: 'Ödeme & Mutabakat Detayı', icon: <AccountBalanceIcon />, path: '/settlement-finance', allowedRoles: ['ADMIN'] },
            { text: 'Alt Bayiler', icon: <AccountBalanceIcon />, path: '/sub-merchants', allowedRoles: ['ADMIN'] },
        ],
    },
    {
        title: 'İşletme Yönetimi',
        allowedRoles: ['ADMIN'],
        items: [
            { text: 'İşletmeler', icon: <BusinessIcon />, path: '/businesses' },
            { text: 'İşletme Talepleri', icon: <FactCheckIcon />, path: '/business-claims' },
            { text: 'İşletme Kategorileri', icon: <CategoryIcon />, path: '/business-categories' },
            { text: 'Öne Çıkan Hikayeler', icon: <StarIcon />, path: '/featured-stories' },
            { text: 'Üye Kartları', icon: <BadgeIcon />, path: '/user-cards' },
            { text: 'Özellik Görünürlüğü', icon: <ToggleOnIcon />, path: '/feature-flags' },
        ],
    },
    {
        title: 'Kullanıcılar',
        allowedRoles: ['ADMIN', 'ASSOCIATION'],
        items: [
            { text: 'Kullanıcılar', icon: <PeopleIcon />, path: '/users', allowedRoles: ['ADMIN'] },
            { text: 'Kullanıcı Aktivitesi', icon: <PeopleIcon />, path: '/user-activity', allowedRoles: ['ADMIN'] },
            { text: 'NartLive Haritası', icon: <PeopleIcon />, path: '/nartlive/users', allowedRoles: ['ADMIN'] },
            { text: 'Dernekler', icon: <HomeWork />, path: '/associations' },
        ],
    },
    {
        title: 'Bildirim & İçerik Moderasyonu',
        allowedRoles: ['ADMIN'],
        items: [
            { text: 'Bildirimler', icon: <NotificationsIcon />, path: '/notifications' },
            { text: 'Hazır Mail Gönder', icon: <EmailIcon />, path: '/manual-email' },
            { text: 'E-posta Şablonları', icon: <EmailIcon />, path: '/email-templates' },
            { text: 'E-posta Logları', icon: <EmailIcon />, path: '/email-logs' },
            { text: 'Bildirim Takvimi', icon: <NotificationsIcon />, path: '/notification-calendar' },
            { text: 'Video Akışı', icon: <FeedIcon />, path: '/feeds' },
            { text: 'Bültenler', icon: <CampaignIcon />, path: '/bulletins' },
            { text: 'Kampanya Motoru', icon: <LocalActivityIcon />, path: '/campaign-engine' },
        ],
    },
    {
        title: 'Büyüme & Pazarlama',
        allowedRoles: ['ADMIN'],
        items: [
            { text: 'Kullanıcı Grupları', icon: <PeopleIcon />, path: '/growth/segments' },
            { text: 'Kullanıcı Tutunma', icon: <TrendingUpIcon />, path: '/growth/cohorts' },
            { text: 'Dönüşüm Hunisi', icon: <TrendingUpIcon />, path: '/growth/funnel' },
            { text: 'Kuponlar', icon: <LocalActivityIcon />, path: '/growth/coupons' },
            { text: 'Davet Programı', icon: <PeopleIcon />, path: '/growth/referrals' },
            { text: 'Kayıp Riski', icon: <TrendingUpIcon />, path: '/growth/churn' },
        ],
    },
    {
        title: 'Güvenlik',
        allowedRoles: ['ADMIN'],
        items: [
            { text: 'Yetki Matrisi', icon: <AuditIcon />, path: '/security/rbac' },
            { text: 'Aktif Oturumlar', icon: <DevicesIcon />, path: '/security/sessions' },
            { text: 'Şüpheli Davranış', icon: <AuditIcon />, path: '/security/anomalies' },
            { text: 'Dolandırıcılık Tespiti', icon: <AuditIcon />, path: '/security/fraud' },
        ],
    },
    {
        title: 'Kullanıcı Etkileşimi',
        allowedRoles: ['ADMIN'],
        items: [
            { text: 'İnaktif Kullanıcılar', icon: <PersonOffIcon />, path: '/engagement/inactive-users' },
            { text: 'Login Sıklığı', icon: <TrendingUpIcon />, path: '/engagement/login-frequency' },
            { text: 'Ürün Kullanım Analitiği', icon: <BarChartIcon />, path: '/engagement/product-analytics' },
        ],
    },
    {
        title: 'Operasyonlar',
        allowedRoles: ['ADMIN'],
        items: [
            { text: 'Müşteri Destek', icon: <SupportIcon />, path: '/customer-support' },
            { text: 'Başarısız Mesajlar', icon: <AuditIcon />, path: '/ops/dlq' },
            { text: 'Zamanlanmış Görevler', icon: <AuditIcon />, path: '/ops/jobs' },
        ],
    },
    {
        title: 'Sistem',
        allowedRoles: ['ADMIN'],
        items: [
            { text: 'Cihazlar', icon: <DevicesIcon />, path: '/devices' },
            { text: 'Oyunlaştırma', icon: <EmojiEventsIcon />, path: '/gamification' },
            { text: 'Çekiliş', icon: <CasinoIcon />, path: '/raffle' },
            { text: 'Audit Log', icon: <AuditIcon />, path: '/audit-log' },
            { text: 'Panel Analitik', icon: <TrendingUpIcon />, path: '/analytics' },
            { text: 'Ayarlar', icon: <SettingsIcon />, path: '/settings' },
            { text: 'Çekiliş Ekranı', icon: <LiveTvIcon />, path: '/event/raffle-live' },
        ],
    },
];
