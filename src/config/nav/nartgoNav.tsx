/**
 * NartGo workspace navigasyonu.
 *
 * Layout.tsx'ten taşındı; NartBusiness bölümü kendi workspace'ine
 * (nartbusinessNav.tsx) alındı.
 *
 * Bölüm başlıkları ve öğe adları, içeriğe göre yeniden adlandırıldı. Önceki
 * listede başlık ile içerik birkaç yerde birbirini tutmuyordu:
 *
 *  - "Kullanıcılar" bölümünde köyler, köy konumları, sülale atlası ve dernekler
 *    vardı; hiçbiri kullanıcı kaydı değil. Köy/sülale kendi bölümüne alındı
 *    ("Ortak Hafıza"), dernekler kullanıcı bölümünde kaldı çünkü ASSOCIATION
 *    rolünün tek erişimi orası.
 *  - "Bildirim & İçerik Moderasyonu" başlığının altında hiç moderasyon yoktu;
 *    yedi öğenin tamamı bildirim ve e-posta gönderimiydi. Video akışı
 *    moderasyonu ise içerik bölümüne taşındı.
 *  - "Sistem" bölümünde oyunlaştırma ve çekiliş duruyordu; bunlar ürün
 *    özelliği, altyapı ayarı değil.
 *  - "Alt Bayiler" sayfanın kendi başlığıyla çelişiyordu ("Alt Üye İşyeri" —
 *    iyzico terimi). "Audit Log" tek İngilizce öğeydi; NartBusiness tarafında
 *    aynı şey "İşlem Kayıtları" diye geçiyor.
 *  - "Mutabakat" ile "Ödeme & Mutabakat Detayı" menüde ayırt edilemiyordu.
 *    İlki sağlayıcı–veritabanı uyuşmazlıklarını (takılı, mükerrer, drift)
 *    listeler, ikincisi hesap defteri ve düzeltmelerdir; adlar buna göre.
 *
 * Rol filtreleri birebir korundu: taşınan her öğe, taşındığı bölümün başlık
 * kısıtı daha geniş olduğunda kendi `allowedRoles` değerini aldı (ör. video
 * akışı ROLE_ROUTE_MAP'te ADMIN_ONLY, bölüm ise EDITOR'a açık). Yol (`path`)
 * değerlerine dokunulmadı — RBAC eşlemesi ve rozet sayaçları yola bakar.
 */

import {
    Dashboard as DashboardIcon,
    Insights as ExecutiveIcon,
    Event as EventIcon,
    EventAvailable as EventCreateIcon,
    ConfirmationNumber as TicketIcon,
    EventSeat as EventSeatIcon,
    EventNote as EventCategoryIcon,
    CameraAlt as InstagramIcon,
    Article as ArticleIcon,
    CloudSync as CloudSyncIcon,
    EditNote as EditorsDeskIcon,
    Feed as FeedIcon,
    TrendingUp as TrendingUpIcon,
    AccountBalanceWallet as WalletIcon,
    Payments as PayoutIcon,
    AssignmentReturn as RefundIcon,
    CompareArrows as MismatchIcon,
    ReceiptLong as LedgerIcon,
    AccountBalance as AccountBalanceIcon,
    Storefront as StorefrontIcon,
    Inventory2 as SellerIcon,
    WhatsApp as WhatsAppNavIcon,
    LocalOffer as CampaignOfferIcon,
    Business as BusinessIcon,
    FactCheck as FactCheckIcon,
    Star as StarIcon,
    Category as CategoryIcon,
    AutoAwesome as FeaturedStoryIcon,
    People as PeopleIcon,
    History as HistoryIcon,
    Badge as BadgeIcon,
    Map as MapIcon,
    HomeWork as AssociationIcon,
    Cottage as VillageIcon,
    Place as PlaceIcon,
    Diversity3 as FamilyIcon,
    Notifications as NotificationsIcon,
    Schedule as ScheduleIcon,
    Drafts as DraftsIcon,
    EmailOutlined as EmailIcon,
    MarkEmailRead as EmailLogIcon,
    Campaign as CampaignIcon,
    LocalActivity as LocalActivityIcon,
    Groups as GroupsIcon,
    Discount as CouponIcon,
    CardGiftcard as ReferralIcon,
    FilterAlt as FunnelIcon,
    Timeline as CohortIcon,
    TrendingDown as ChurnIcon,
    PersonOff as PersonOffIcon,
    BarChart as BarChartIcon,
    AdminPanelSettings as RbacIcon,
    VpnKey as SessionIcon,
    Shield as ShieldIcon,
    Gavel as FraudIcon,
    SupportAgent as SupportIcon,
    Autorenew as JobIcon,
    ReportProblem as DlqIcon,
    EmojiEvents as EmojiEventsIcon,
    Casino as CasinoIcon,
    LiveTv as LiveTvIcon,
    ToggleOn as ToggleOnIcon,
    Devices as DevicesIcon,
    ManageSearch as AuditIcon,
    Analytics as AnalyticsIcon,
    Settings as SettingsIcon,
} from '@mui/icons-material';
import type { NavSection } from './types';

export const nartgoNavSections: NavSection[] = [
    {
        title: 'Genel Bakış',
        items: [
            // ROLE_ROUTE_MAP'te /dashboard bu dört role açık. Kısıt yazılmazsa
            // köy editörü gibi başka roller bağlantıyı görüp 403 alıyor.
            { text: 'Kontrol Paneli', icon: <DashboardIcon />, path: '/dashboard',
              allowedRoles: ['ADMIN', 'EVENT_ORGANIZATOR', 'EDITOR', 'ASSOCIATION'] },
            { text: 'Yönetici Özeti', icon: <ExecutiveIcon />, path: '/executive', allowedRoles: ['ADMIN'] },
        ],
    },
    {
        title: 'Etkinlik & Bilet',
        allowedRoles: ['ADMIN', 'EVENT_ORGANIZATOR'],
        items: [
            { text: 'Etkinlikler', icon: <EventIcon />, path: '/events' },
            { text: 'Yeni Etkinlik Oluştur', icon: <EventCreateIcon />, path: '/event-creation' },
            { text: 'Bilet Yönetimi', icon: <TicketIcon />, path: '/tickets' },
            { text: 'Salon & Koltuk Planları', icon: <EventSeatIcon />, path: '/seat-templates' },
            { text: 'Etkinlik Kategorileri', icon: <EventCategoryIcon />, path: '/event-categories', allowedRoles: ['ADMIN'] },
            { text: "Instagram'dan Etkinlik Adayları", icon: <InstagramIcon />, path: '/events/instagram-candidates', allowedRoles: ['ADMIN'] },
        ],
    },
    {
        title: 'İçerik & Yayın',
        allowedRoles: ['ADMIN', 'EDITOR'],
        items: [
            { text: 'Makaleler & İçerikler', icon: <ArticleIcon />, path: '/content' },
            { text: 'Dış Kaynaktan İçerik Çek', icon: <CloudSyncIcon />, path: '/content/ingest' },
            // Editör Masası: Desk + Instagram paylaşım kuyruğu + performans + hesap analizi (sekmeli tek sayfa).
            { text: 'Editör Masası', icon: <EditorsDeskIcon />, path: '/editor-masasi', allowedRoles: ['ADMIN', 'EDITOR'] },
            // ROLE_ROUTE_MAP'te ADMIN_ONLY; bölüm EDITOR'a açık olduğu için
            // öğe seviyesinde kısıtlı kalmalı, yoksa editör 403 alır.
            { text: 'Video Akışı Moderasyonu', icon: <FeedIcon />, path: '/feeds', allowedRoles: ['ADMIN'] },
        ],
    },
    {
        title: 'Satış & Finans',
        allowedRoles: ['ADMIN', 'EVENT_ORGANIZATOR'],
        items: [
            { text: 'Satış Özeti', icon: <TrendingUpIcon />, path: '/sales-command' },
            { text: 'Gelir & Gider Raporu', icon: <WalletIcon />, path: '/finance/overview', allowedRoles: ['ADMIN'] },
            { text: 'Organizatör Ödemeleri', icon: <PayoutIcon />, path: '/finance/payouts', allowedRoles: ['ADMIN'] },
            { text: 'İade İşlemleri', icon: <RefundIcon />, path: '/finance/refunds', allowedRoles: ['ADMIN'] },
            { text: 'Ödeme Uyuşmazlıkları', icon: <MismatchIcon />, path: '/finance/reconciliation', allowedRoles: ['ADMIN'] },
            { text: 'Hesap Defteri & Düzeltmeler', icon: <LedgerIcon />, path: '/settlement-finance', allowedRoles: ['ADMIN'] },
            { text: 'Alt Üye İşyerleri (iyzico)', icon: <AccountBalanceIcon />, path: '/sub-merchants', allowedRoles: ['ADMIN'] },
        ],
    },
    {
        title: 'NartStore',
        allowedRoles: ['ADMIN'],
        items: [
            { text: 'Mağaza Hareketleri', icon: <StorefrontIcon />, path: '/nartstore/activity' },
            { text: 'Satıcı Başvuruları', icon: <SellerIcon />, path: '/nartstore-interest' },
            { text: 'Satıcı Daveti', icon: <WhatsAppNavIcon />, path: '/nartstore/outreach' },
            { text: 'Kampanyalar', icon: <CampaignOfferIcon />, path: '/nartstore/campaigns' },
        ],
    },
    {
        title: 'İşletme Rehberi',
        allowedRoles: ['ADMIN'],
        items: [
            { text: 'İşletmeler', icon: <BusinessIcon />, path: '/businesses' },
            { text: 'Sahiplenme Talepleri', icon: <FactCheckIcon />, path: '/business-claims' },
            { text: 'Ücretli Öne Çıkarma', icon: <StarIcon />, path: '/businesses/promotions' },
            { text: 'İşletme Kategorileri', icon: <CategoryIcon />, path: '/business-categories' },
            { text: 'Öne Çıkan Hikâyeler', icon: <FeaturedStoryIcon />, path: '/featured-stories' },
        ],
    },
    {
        title: 'Kullanıcılar & Dernekler',
        allowedRoles: ['ADMIN', 'ASSOCIATION'],
        items: [
            { text: 'Kullanıcılar', icon: <PeopleIcon />, path: '/users', allowedRoles: ['ADMIN'] },
            { text: 'Kullanıcı Hareketleri', icon: <HistoryIcon />, path: '/user-activity', allowedRoles: ['ADMIN'] },
            { text: 'Üye Kartları', icon: <BadgeIcon />, path: '/user-cards', allowedRoles: ['ADMIN'] },
            { text: 'NartLive Konum Haritası', icon: <MapIcon />, path: '/nartlive/users', allowedRoles: ['ADMIN'] },
            { text: 'Dernekler', icon: <AssociationIcon />, path: '/associations' },
        ],
    },
    {
        // Köy ve sülale kayıtları; panelin başka yerlerinde de (ana sayfadaki
        // "Bugün ilgilenmen gerekenler" kartı) bu ad kullanılıyor.
        title: 'Ortak Hafıza · Köy & Sülale',
        allowedRoles: ['ADMIN', 'NART_VILLAGE_EDITOR'],
        items: [
            { text: 'Köy Kayıtları', icon: <VillageIcon />, path: '/heritage/villages' },
            { text: 'Köy Konum İncelemesi', icon: <PlaceIcon />, path: '/heritage/locations' },
            { text: 'Sülale Atlası', icon: <FamilyIcon />, path: '/heritage/families' },
            { text: 'Köy Editörü Masası', icon: <FactCheckIcon />, path: '/heritage/editor-desk', allowedRoles: ['ADMIN'] },
        ],
    },
    {
        title: 'Bildirim & E-posta',
        allowedRoles: ['ADMIN'],
        items: [
            { text: 'Push Bildirimleri', icon: <NotificationsIcon />, path: '/notifications' },
            { text: 'Otomatik Bildirim Takvimi', icon: <ScheduleIcon />, path: '/notification-calendar' },
            { text: 'Şablonla E-posta Gönder', icon: <DraftsIcon />, path: '/manual-email' },
            { text: 'E-posta Şablonları', icon: <EmailIcon />, path: '/email-templates' },
            { text: 'E-posta Gönderim Kayıtları', icon: <EmailLogIcon />, path: '/email-logs' },
            { text: 'Bültenler', icon: <CampaignIcon />, path: '/bulletins' },
            { text: 'Kampanya & Promosyon Kuralları', icon: <LocalActivityIcon />, path: '/campaign-engine' },
        ],
    },
    {
        // Yapılan işler: kitle tanımla, kupon ver, davet programını işlet.
        title: 'Büyüme & Kampanyalar',
        allowedRoles: ['ADMIN'],
        items: [
            { text: 'Kullanıcı Grupları (Segment)', icon: <GroupsIcon />, path: '/growth/segments' },
            { text: 'Kuponlar', icon: <CouponIcon />, path: '/growth/coupons' },
            { text: 'Davet Programı', icon: <ReferralIcon />, path: '/growth/referrals' },
        ],
    },
    {
        // Okunan işler. Eskiden bu altı ekran "Büyüme & Pazarlama" ile
        // "Kullanıcı Etkileşimi" arasında bölünmüştü; ikisi de aynı soruyu
        // soruyordu, bu yüzden hangi raporun nerede olduğu kestirilemiyordu.
        title: 'Kullanım & Tutunma Analitiği',
        allowedRoles: ['ADMIN'],
        items: [
            { text: 'Dönüşüm Hunisi', icon: <FunnelIcon />, path: '/growth/funnel' },
            { text: 'Kullanıcı Tutunma (Kohort)', icon: <CohortIcon />, path: '/growth/cohorts' },
            { text: 'Kayıp Riski Taşıyanlar', icon: <ChurnIcon />, path: '/growth/churn' },
            { text: 'Uzun Süre Giriş Yapmayanlar', icon: <PersonOffIcon />, path: '/engagement/inactive-users' },
            { text: 'Giriş Sıklığı', icon: <TrendingUpIcon />, path: '/engagement/login-frequency' },
            { text: 'Ürün Kullanım Analitiği', icon: <BarChartIcon />, path: '/engagement/product-analytics' },
        ],
    },
    {
        title: 'Güvenlik & Risk',
        allowedRoles: ['ADMIN'],
        items: [
            { text: 'Rol & Yetki Matrisi', icon: <RbacIcon />, path: '/security/rbac' },
            { text: 'Aktif Oturumlar', icon: <SessionIcon />, path: '/security/sessions' },
            { text: 'Şüpheli Hareket Tespiti', icon: <ShieldIcon />, path: '/security/anomalies' },
            { text: 'Dolandırıcılık Tespiti', icon: <FraudIcon />, path: '/security/fraud' },
        ],
    },
    {
        title: 'Operasyon & Destek',
        allowedRoles: ['ADMIN'],
        items: [
            { text: 'Müşteri Destek Talepleri', icon: <SupportIcon />, path: '/customer-support' },
            { text: 'Zamanlanmış Görevler', icon: <JobIcon />, path: '/ops/jobs' },
            { text: 'İşlenemeyen Mesajlar (DLQ)', icon: <DlqIcon />, path: '/ops/dlq' },
        ],
    },
    {
        // Ürün özellikleri; altyapı ayarı değil, bu yüzden "Sistem"den çıktı.
        title: 'Oyunlaştırma & Çekiliş',
        allowedRoles: ['ADMIN'],
        items: [
            { text: 'Puan & Rozet Ayarları', icon: <EmojiEventsIcon />, path: '/gamification' },
            { text: 'Çekiliş Yönetimi', icon: <CasinoIcon />, path: '/raffle' },
            { text: 'Çekiliş Yayın Ekranı', icon: <LiveTvIcon />, path: '/event/raffle-live' },
        ],
    },
    {
        title: 'Sistem',
        allowedRoles: ['ADMIN'],
        items: [
            { text: 'Özellik Açma / Kapama', icon: <ToggleOnIcon />, path: '/feature-flags' },
            { text: 'Kayıtlı Cihazlar', icon: <DevicesIcon />, path: '/devices' },
            { text: 'Panel İşlem Geçmişi', icon: <AuditIcon />, path: '/audit-log' },
            { text: 'Panel Kullanım Analitiği', icon: <AnalyticsIcon />, path: '/analytics' },
            { text: 'Ayarlar', icon: <SettingsIcon />, path: '/settings' },
        ],
    },
];
