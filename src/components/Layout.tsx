import { useMemo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
    Box,
    CssBaseline,
    Drawer,
    Typography,
    useTheme,
    Avatar,
    alpha,
    Tooltip,
    IconButton,
} from '@mui/material';
import {
    Dashboard as DashboardIcon,
    Devices as DevicesIcon,
    Notifications as NotificationsIcon,
    EmailOutlined as EmailIcon,
    People as PeopleIcon,
    Gavel as GavelIcon,
    ExitToApp as LogoutIcon,
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
    Policy as PolicyIcon,
    AccountBalance as AccountBalanceIcon,
    TrendingUp as TrendingUpIcon,
    SupportAgent as SupportIcon,
    LocalActivity as LocalActivityIcon,
    ConfirmationNumber as TicketIcon,
    Campaign as CampaignIcon,
    Star as StarIcon,
    ToggleOn as ToggleOnIcon,
    Share as ShareIcon,
    Badge as BadgeIcon,
    EventSeat as EventSeatIcon,
    Article as ArticleIcon,
    CloudSync as CloudSyncIcon,
    Menu as MenuIcon,
    Search as SearchIcon,
    ManageSearch as AuditIcon,
    Insights as ExecutiveIcon,
    PersonOff as PersonOffIcon,
    BarChart as BarChartIcon,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { useAdminBadgeCounts } from '../hooks/useAdminBadgeCounts';
import { usePageTracking } from '../hooks/analytics/useAnalytics';
import { useRole } from '../hooks/useRole';
import { useDefaultEvent } from '../hooks/useDefaultEvent';
import { useState } from 'react';
import { nb } from '../theme/nbBrand';

const DRAWER_W = 260;

interface NavItem {
    text: string;
    icon: React.ReactNode;
    path: string;
    allowedRoles?: string[];
}

interface NavSection {
    title: string;
    items: NavItem[];
    allowedRoles?: string[];
}

// Role path'lerden otomatik türetilir — Layout item.allowedRoles'u kullanmaz,
// onun yerine canAccess(path) ROLE_ROUTE_MAP'e bakar.
// Ama yine de organizasyon/group başlığı için allowedRoles set edilir,
// böylece section tamamen gizlenir (tüm öğeleri filtrelense bile).
const navSections: NavSection[] = [
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
        title: 'NartBusiness',
        allowedRoles: ['ADMIN', 'NB_ADMIN', 'NB_CO_ADMIN', 'NB_COMMITTEE'],
        items: [
            { text: 'NB Dashboard', icon: <BusinessIcon />, path: '/nartbusiness/dashboard' },
            { text: 'NB Üyeler', icon: <PeopleIcon />, path: '/nartbusiness/members' },
            { text: 'Tanıştırmalar', icon: <PeopleIcon />, path: '/nartbusiness/introductions', allowedRoles: ['ADMIN', 'NB_ADMIN', 'NB_CO_ADMIN'] },
            { text: 'İhaleler', icon: <GavelIcon />, path: '/nartbusiness/tenders', allowedRoles: ['ADMIN', 'NB_ADMIN', 'NB_CO_ADMIN'] },
            { text: 'İşlem Kayıtları', icon: <FactCheckIcon />, path: '/nartbusiness/audit', allowedRoles: ['ADMIN', 'NB_ADMIN', 'NB_CO_ADMIN'] },
            { text: 'Doğrulama Kuyruğu', icon: <FactCheckIcon />, path: '/nartbusiness/verification' },
            { text: 'Belge Politikaları', icon: <PolicyIcon />, path: '/nartbusiness/verification-policies', allowedRoles: ['ADMIN', 'NB_ADMIN', 'NB_CO_ADMIN'] },
            { text: 'Üyelik Tipleri', icon: <CategoryIcon />, path: '/nartbusiness/tiers', allowedRoles: ['ADMIN', 'NB_ADMIN', 'NB_CO_ADMIN'] },
            { text: 'Sektör Katalogu', icon: <CategoryIcon />, path: '/nartbusiness/sectors', allowedRoles: ['ADMIN', 'NB_ADMIN', 'NB_CO_ADMIN'] },
            { text: 'Ünvan Katalogu', icon: <CategoryIcon />, path: '/nartbusiness/job-titles', allowedRoles: ['ADMIN', 'NB_ADMIN', 'NB_CO_ADMIN'] },
            { text: 'Sektör Değer Zinciri', icon: <CategoryIcon />, path: '/nartbusiness/value-chain', allowedRoles: ['ADMIN', 'NB_ADMIN', 'NB_CO_ADMIN'] },
            { text: 'Embedding & Matching', icon: <ToggleOnIcon />, path: '/nartbusiness/embedding-jobs', allowedRoles: ['ADMIN', 'NB_ADMIN', 'NB_CO_ADMIN'] },
            { text: 'Moderasyon Kuyruğu', icon: <FactCheckIcon />, path: '/nartbusiness/moderation', allowedRoles: ['ADMIN', 'NB_ADMIN', 'NB_CO_ADMIN', 'NB_COMMITTEE'] },
            { text: 'Üye Görüşleri', icon: <FactCheckIcon />, path: '/nartbusiness/market-opinions', allowedRoles: ['ADMIN', 'NB_ADMIN', 'NB_CO_ADMIN', 'NB_COMMITTEE'] },
            { text: 'Piyasa Haberleri', icon: <FactCheckIcon />, path: '/nartbusiness/market-news', allowedRoles: ['ADMIN', 'NB_ADMIN', 'NB_CO_ADMIN', 'NB_COMMITTEE'] },
            { text: 'İlanlar (Talep/Arz)', icon: <FactCheckIcon />, path: '/nartbusiness/listings', allowedRoles: ['ADMIN', 'NB_ADMIN', 'NB_CO_ADMIN', 'NB_COMMITTEE'] },
            { text: 'Yönlendirmeler', icon: <FactCheckIcon />, path: '/nartbusiness/referrals', allowedRoles: ['ADMIN', 'NB_ADMIN', 'NB_CO_ADMIN', 'NB_COMMITTEE'] },
            { text: 'Topluluk Soruları', icon: <FactCheckIcon />, path: '/nartbusiness/questions', allowedRoles: ['ADMIN', 'NB_ADMIN', 'NB_CO_ADMIN', 'NB_COMMITTEE'] },
            { text: 'Pozisyon İlanları', icon: <FactCheckIcon />, path: '/nartbusiness/jobs', allowedRoles: ['ADMIN', 'NB_ADMIN', 'NB_CO_ADMIN', 'NB_COMMITTEE'] },
            { text: 'NB DLQ', icon: <ToggleOnIcon />, path: '/nartbusiness/dlq', allowedRoles: ['ADMIN', 'NB_ADMIN', 'NB_CO_ADMIN'] },
            { text: 'Paylaşım Analitikleri', icon: <ShareIcon />, path: '/nartbusiness/share-analytics', allowedRoles: ['ADMIN', 'NB_ADMIN', 'NB_CO_ADMIN'] },
            { text: 'Referanslar', icon: <StarIcon />, path: '/nartbusiness/testimonials', allowedRoles: ['ADMIN', 'NB_ADMIN', 'NB_CO_ADMIN'] },
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

export default function Layout() {
    const [mobileOpen, setMobileOpen] = useState(false);

    // ── Navigasyon: arama + katlanabilir gruplar ──────────────────────────
    //
    // 79 menü öğesi tek düz listede duruyordu; hepsi aynı görsel ağırlıkta,
    // hepsi her zaman açık. Sorun uzunluk değil hiyerarşi yokluğuydu.
    // Çözüm iki katmanlı: yazarak filtrele (bilen kullanıcı) + yalnız içinde
    // bulunduğun grup açık (gezinen kullanıcı).
    const [navQuery, setNavQuery] = useState('');
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
        try {
            const raw = localStorage.getItem('nav.collapsed');
            return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
        } catch {
            return {};
        }
    });

    const toggleSection = (title: string) => {
        setCollapsed((prev) => {
            const next = { ...prev, [title]: !prev[title] };
            try {
                localStorage.setItem('nav.collapsed', JSON.stringify(next));
            } catch {
                /* storage kapalı olabilir — davranış bozulmasın */
            }
            return next;
        });
    };
    const theme = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const { roles, userName, isEditorOnly, isAdmin, isOrganizer, canAccess } = useRole();
    const { logout } = useAuth();
    // Sidebar "müdahale bekleyen" kuyruk sayıları (60sn polling).
    const badgeCounts = useAdminBadgeCounts();

    // Organizator için aktif etkinlik sayısı (sidebar context indicator)
    const { events, defaultEventId } = useDefaultEvent();
    const showEventContext = (isOrganizer || isAdmin) && !isEditorOnly;

    // Analytics: track every page navigation
    usePageTracking();

    const visibleSections = useMemo(() => {
        return navSections
            .filter((s) => {
                // Section-level rol kontrolü — tüm allowedRoles listesinden en az biri eşleşmeli
                if (s.allowedRoles && s.allowedRoles.length > 0) {
                    return isAdmin || s.allowedRoles.some(r => roles.map(x => x.toUpperCase()).includes(r.toUpperCase()));
                }
                return true;
            })
            .map((s) => ({
                ...s,
                items: s.items
                    .filter((item) => {
                        // Item-level allowedRoles varsa önce onu kontrol et
                        if (item.allowedRoles && item.allowedRoles.length > 0) {
                            if (!isAdmin && !item.allowedRoles.some(r => roles.map(x => x.toUpperCase()).includes(r.toUpperCase()))) {
                                return false;
                            }
                        }
                        // Sonra ROLE_ROUTE_MAP kontrolü (default-deny)
                        return canAccess(item.path);
                    }),
            }))
            .filter((s) => s.items.length > 0);
    }, [canAccess, isAdmin, roles]);

    const isZenMode = location.pathname.includes('seat-map') && new URLSearchParams(location.search).get('zen') === 'true';

    const currentPageTitle = useMemo(() => {
        for (const s of navSections) {
            const found = s.items.find((i) => location.pathname === i.path);
            if (found) return found.text;
        }
        return 'Kontrol Paneli';
    }, [location.pathname]);

    const initials = userName
        ? userName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
        : 'N';

    const handleNav = (path: string) => {
        navigate(path);
        setMobileOpen(false);
    };

    const handleLogout = async () => {
        try { await logout(); } catch { /* */ }
    };

    // ─── Sidebar content (EventConsole premium stili) ─────
    const sidebar = (
        <Box sx={{
            height: '100%', display: 'flex', flexDirection: 'column',
            bgcolor: '#0F1A14', // dark green-black (EventConsole ile tutarlı)
            color: 'white',
            overflow: 'hidden',
        }}>
            {/* Brand */}
            <Box sx={{
                px: 2.5, py: 2.5, display: 'flex', alignItems: 'center', gap: 1.5,
                borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}>
                <Box sx={{
                    width: 32, height: 32, borderRadius: '50%',
                    bgcolor: nb.goldSoft,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#0F1A14', fontWeight: 800, fontSize: 14,
                }}>
                    N
                </Box>
                <Box>
                    <Typography sx={{ fontWeight: 700, fontSize: 14, lineHeight: 1.2, color: 'white', letterSpacing: 0.3 }}>
                        NartGo Admin
                    </Typography>
                    <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
                        Yönetim Paneli
                    </Typography>
                </Box>
            </Box>

            {/* Context Indicator — aktif etkinlik sayısı */}
            {showEventContext && events.length > 0 && (
                <Box
                    onClick={() => {
                        if (defaultEventId) {
                            handleNav(`/event-console/${defaultEventId}`);
                        } else {
                            handleNav('/events');
                        }
                    }}
                    sx={{
                        mx: 1.5, mt: 1.5, px: 1.5, py: 1,
                        borderRadius: 1.5,
                        cursor: 'pointer',
                        bgcolor: 'rgba(201,162,39,0.08)',
                        border: '1px solid rgba(201,162,39,0.2)',
                        '&:hover': { bgcolor: 'rgba(201,162,39,0.14)' },
                    }}
                >
                    <Typography sx={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, fontWeight: 600 }}>
                        {events.length === 1 ? 'AKTİF ETKİNLİK' : `${events.length} ETKİNLİK`}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: nb.goldSoft, fontWeight: 600, mt: 0.3 }} noWrap>
                        {events.length === 1 ? events[0].name : 'Etkinlikleri Yönet →'}
                    </Typography>
                </Box>
            )}

            {/* Arama — bilen kullanıcı için en kısa yol */}
            <Box sx={{ px: 1.5, pt: 1.5, pb: 0.5 }}>
                <Box
                    component="input"
                    value={navQuery}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNavQuery(e.target.value)}
                    placeholder="Menüde ara"
                    aria-label="Menüde ara"
                    sx={{
                        width: '100%',
                        px: 1.5, py: 0.9,
                        borderRadius: 1.5,
                        border: `1px solid ${nb.onDarkLine}`,
                        bgcolor: 'rgba(255,255,255,0.04)',
                        color: nb.onDark,
                        fontSize: 13,
                        font: 'inherit',
                        fontFamily: 'inherit',
                        outline: 'none',
                        '&::placeholder': { color: nb.onDarkFaint },
                        '&:focus': {
                            borderColor: nb.goldSoft,
                            bgcolor: 'rgba(255,255,255,0.06)',
                        },
                    }}
                />
            </Box>

            {/* Navigation */}
            <Box
                component="nav"
                role="navigation"
                aria-label="Ana navigasyon"
                sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', pb: 2 }}
            >
                {visibleSections.map((section) => {
                    const q = navQuery.trim().toLocaleLowerCase('tr');
                    const items = q
                        ? section.items.filter((i) => i.text.toLocaleLowerCase('tr').includes(q))
                        : section.items;
                    if (items.length === 0) return null;

                    const hasActive = items.some(
                        (i) => location.pathname === i.path
                            || (i.path !== '/dashboard' && location.pathname.startsWith(i.path + '/')),
                    );
                    // Arama sırasında her şey açık; aksi hâlde yalnız içinde
                    // bulunduğun grup ve elle açtıkların.
                    const open = !!q || hasActive || collapsed[section.title] === false;
                    // Kapalıyken rozet sayısı kaybolmamalı — aciliyet gizlenmez.
                    const pending = items.reduce((acc, i) => acc + (badgeCounts[i.path] ?? 0), 0);

                    return (
                        <Box key={section.title} sx={{ mb: 0.5 }} role="group">
                            <Box
                                component="button"
                                type="button"
                                onClick={() => toggleSection(section.title)}
                                aria-expanded={open}
                                sx={{
                                    width: 'calc(100% - 24px)',
                                    mx: 1.5, px: 1, py: 0.75,
                                    display: 'flex', alignItems: 'center', gap: 0.75,
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    borderRadius: 1.5,
                                    color: nb.onDarkFaint,
                                    fontSize: 10, letterSpacing: 1.4, fontWeight: 700,
                                    textTransform: 'uppercase',
                                    fontFamily: 'inherit',
                                    '&:hover': { color: nb.onDarkMuted, bgcolor: 'rgba(255,255,255,0.03)' },
                                    '&:focus-visible': { outline: `2px solid ${nb.goldSoft}`, outlineOffset: 2 },
                                }}
                            >
                                <Box
                                    component="span"
                                    sx={{
                                        display: 'inline-flex', width: 10,
                                        transition: 'transform 0.15s',
                                        transform: open ? 'rotate(90deg)' : 'none',
                                    }}
                                >
                                    <svg viewBox="0 0 8 12" width={7} height={9} aria-hidden>
                                        <path d="M1 1l5 5-5 5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
                                    </svg>
                                </Box>
                                <Box component="span" sx={{ flex: 1, textAlign: 'left' }}>
                                    {section.title}
                                </Box>
                                {!open && pending > 0 && (
                                    <Box
                                        component="span"
                                        aria-label={`${pending} bekleyen`}
                                        sx={{
                                            minWidth: 16, height: 16, px: 0.5, borderRadius: 8,
                                            bgcolor: '#C0392B', color: 'white',
                                            fontSize: 10, fontWeight: 700, lineHeight: '16px',
                                            letterSpacing: 0,
                                        }}
                                    >
                                        {pending > 99 ? '99+' : pending}
                                    </Box>
                                )}
                            </Box>

                            {open && items.map((item) => {
                                const isActive = location.pathname === item.path
                                    || (item.path !== '/dashboard' && location.pathname.startsWith(item.path + '/'));

                                return (
                                    <Box
                                        key={item.path}
                                        component="button"
                                        onClick={() => handleNav(item.path)}
                                        aria-current={isActive ? 'page' : undefined}
                                        sx={{
                                            position: 'relative',
                                            background: 'none', border: 'none', font: 'inherit',
                                            fontFamily: 'inherit',
                                            textAlign: 'left',
                                            width: 'calc(100% - 24px)',
                                            mx: 1.5, mb: 0.2, pl: 2.5, pr: 1.5, py: 0.85,
                                            borderRadius: 1.5,
                                            cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', gap: 1,
                                            bgcolor: isActive ? nb.goldTint : 'transparent',
                                            color: isActive ? nb.goldSoft : nb.onDarkMuted,
                                            transition: 'background-color 0.15s, color 0.15s',
                                            '&:hover': {
                                                bgcolor: isActive ? nb.goldTintStrong : 'rgba(255,255,255,0.04)',
                                                color: isActive ? nb.goldSoft : nb.onDark,
                                            },
                                            '&:focus-visible': { outline: `2px solid ${nb.goldSoft}`, outlineOffset: 2 },
                                            // Aktif işareti: 79 satırda tekrarlanan nokta dekorasyondu.
                                            // Yalnız aktif satırda görünen kenar çubuğu daha sessiz ve net.
                                            '&::before': isActive ? {
                                                content: '""',
                                                position: 'absolute',
                                                left: 6, top: '50%', transform: 'translateY(-50%)',
                                                width: 3, height: 16, borderRadius: 2,
                                                bgcolor: nb.goldSoft,
                                            } : undefined,
                                        }}
                                    >
                                        <Typography sx={{
                                            fontSize: 13,
                                            fontWeight: isActive ? 600 : 400,
                                            lineHeight: 1.3,
                                            flex: 1,
                                        }}>
                                            {item.text}
                                        </Typography>
                                        {badgeCounts[item.path] > 0 && (
                                            <Box
                                                component="span"
                                                aria-label={`${badgeCounts[item.path]} bekleyen`}
                                                sx={{
                                                    flexShrink: 0, minWidth: 18, height: 18, px: 0.75,
                                                    borderRadius: 9, bgcolor: '#C0392B', color: 'white',
                                                    fontSize: 11, fontWeight: 700, lineHeight: '18px',
                                                    textAlign: 'center',
                                                }}
                                            >
                                                {badgeCounts[item.path] > 99 ? '99+' : badgeCounts[item.path]}
                                            </Box>
                                        )}
                                    </Box>
                                );
                            })}
                        </Box>
                    );
                })}

                {navQuery.trim() && visibleSections.every((sec) =>
                    sec.items.every((i) => !i.text.toLocaleLowerCase('tr')
                        .includes(navQuery.trim().toLocaleLowerCase('tr')))) && (
                    <Typography sx={{ px: 3, py: 2, fontSize: 12, color: nb.onDarkFaint }}>
                        Eşleşen menü yok.
                    </Typography>
                )}
            </Box>

            {/* User footer */}
            <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.08)', p: 1.5 }}>
                <Box sx={{
                    display: 'flex', alignItems: 'center', gap: 1.5,
                    p: 1, borderRadius: 1.5,
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
                }}>
                    <Avatar sx={{
                        width: 34, height: 34, fontSize: 13, fontWeight: 700,
                        bgcolor: 'rgba(201,162,39,0.15)',
                        color: nb.goldSoft,
                    }}>
                        {initials}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2, color: 'white' }} noWrap>
                            {userName || 'Admin'}
                        </Typography>
                        <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: 0.3 }} noWrap>
                            {roles.length > 0 ? roles[0].toUpperCase() : 'ADMIN'}
                        </Typography>
                    </Box>
                    <Tooltip title="Çıkış Yap">
                        <IconButton
                            size="small"
                            onClick={handleLogout}
                            aria-label="Çıkış yap"
                            sx={{
                                color: 'rgba(255,255,255,0.6)',
                                '&:hover': { color: theme.palette.error.light, bgcolor: 'rgba(239,68,68,0.1)' },
                            }}
                        >
                            <LogoutIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>
        </Box>
    );

    // ─── Layout ──────────────────────────────────────
    return (
        <Box sx={{ display: 'flex' }}>
            <CssBaseline />

            {/* Top bar — minimal, no page title duplication */}
            <Box
                component="header"
                sx={{
                    position: 'fixed',
                    top: 0,
                    left: isZenMode ? 0 : { xs: 0, sm: DRAWER_W },
                    right: 0,
                    height: 64,
                    zIndex: theme.zIndex.appBar,
                    display: isZenMode ? 'none' : 'flex',
                    alignItems: 'center',
                    px: 2.5,
                    gap: 2,
                    background: theme.palette.background.paper,
                    borderBottom: `1px solid ${theme.palette.divider}`,
                }}
            >
                {/* Mobile hamburger */}
                <IconButton
                    onClick={() => setMobileOpen(!mobileOpen)}
                    sx={{ display: { sm: 'none' }, color: theme.palette.text.primary }}
                >
                    <MenuIcon />
                </IconButton>

                <Box sx={{ minWidth: 0 }}>
                    {/* Breadcrumb (EventConsole stili) */}
                    <Typography sx={{
                        color: theme.palette.text.secondary,
                        letterSpacing: 1.5, fontSize: 9.5, fontWeight: 600,
                        lineHeight: 1,
                        mb: 0.3,
                    }}>
                        NARTGO · {currentPageTitle.toUpperCase()}
                    </Typography>
                    <Typography sx={{
                        fontWeight: 700, lineHeight: 1.2,
                        color: theme.palette.text.primary,
                        fontFamily: 'Georgia, "Times New Roman", serif',
                        fontStyle: 'italic',
                        fontSize: 18,
                    }}>
                        {currentPageTitle}
                    </Typography>
                </Box>

                <Box sx={{ flex: 1 }} />

                {/* Search hint */}
                <Box sx={{
                    display: { xs: 'none', md: 'flex' },
                    alignItems: 'center', gap: 1,
                    px: 1.5, py: 0.625,
                    borderRadius: 2,
                    border: `1px solid ${theme.palette.divider}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    '&:hover': { borderColor: theme.palette.primary.main, bgcolor: alpha(theme.palette.primary.main, 0.02) },
                }}>
                    <SearchIcon sx={{ fontSize: 15, color: theme.palette.text.disabled }} />
                    <Typography sx={{ fontSize: 12, color: theme.palette.text.disabled, userSelect: 'none' }}>Ara...</Typography>
                    <Box sx={{
                        px: 0.75, py: 0.125, borderRadius: 1,
                        border: `1px solid ${theme.palette.divider}`,
                        fontSize: 10, fontWeight: 700, fontFamily: 'monospace',
                        color: theme.palette.text.disabled,
                    }}>
                        ⌘K
                    </Box>
                </Box>

                {/* Notifications shortcut */}
                {canAccess('/notifications') && (
                    <Tooltip title="Bildirimler">
                        <IconButton size="small" onClick={() => navigate('/notifications')}
                            sx={{ color: theme.palette.text.secondary, '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.06) } }}>
                            <NotificationsIcon sx={{ fontSize: 20 }} />
                        </IconButton>
                    </Tooltip>
                )}

                {/* Settings shortcut */}
                {canAccess('/settings') && (
                    <Tooltip title="Ayarlar">
                        <IconButton size="small" onClick={() => navigate('/settings')}
                            sx={{ color: theme.palette.text.secondary, '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.06) } }}>
                            <SettingsIcon sx={{ fontSize: 20 }} />
                        </IconButton>
                    </Tooltip>
                )}
            </Box>

            {/* Sidebar */}
            <Box
                sx={{
                    width: isZenMode ? 0 : { sm: DRAWER_W },
                    flexShrink: { sm: 0 },
                    ...(isZenMode && { display: 'none' }),
                }}
            >
                {/* Mobile */}
                <Drawer
                    variant="temporary"
                    open={mobileOpen}
                    onClose={() => setMobileOpen(false)}
                    ModalProps={{ keepMounted: true }}
                    sx={{
                        display: { xs: 'block', sm: 'none' },
                        '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_W, borderRight: 'none' },
                    }}
                >
                    {sidebar}
                </Drawer>

                {/* Desktop */}
                <Drawer
                    variant="permanent"
                    sx={{
                        display: { xs: 'none', sm: 'block' },
                        '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_W, borderRight: `1px solid ${theme.palette.divider}` },
                    }}
                    open
                >
                    {sidebar}
                </Drawer>
            </Box>

            {/* Main content */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: location.pathname.includes('seat-map') ? 0 : 3,
                    width: isZenMode ? '100vw' : { sm: `calc(100% - ${DRAWER_W}px)` },
                    minHeight: isZenMode ? '100vh' : 'calc(100vh - 56px)',
                    mt: isZenMode ? 0 : '64px',
                    maxWidth: location.pathname.includes('seat-map') ? 'none' : '1600px',
                    overflowX: 'hidden',
                }}
            >
                <Outlet />
            </Box>
        </Box>
    );
}
