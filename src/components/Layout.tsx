import { useMemo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
    Box,
    CssBaseline,
    Drawer,
    Typography,
    useTheme,
    Avatar,
    Divider,
    alpha,
    Tooltip,
    IconButton,
    Stack,
} from '@mui/material';
import {
    Dashboard as DashboardIcon,
    Devices as DevicesIcon,
    Notifications as NotificationsIcon,
    People as PeopleIcon,
    ExitToApp as LogoutIcon,
    Business as BusinessIcon,
    Category as CategoryIcon,
    Settings as SettingsIcon,
    Event as EventIcon,
    EventNote as EventCategoryIcon,
    HomeWork,
    Feed as FeedIcon,
    EmojiEvents as EmojiEventsIcon,
    FactCheck as FactCheckIcon,
    AccountBalance as AccountBalanceIcon,
    TrendingUp as TrendingUpIcon,
    PointOfSale as PointOfSaleIcon,
    Sensors as SensorsIcon,
    SupportAgent as SupportIcon,
    LocalActivity as LocalActivityIcon,
    ConfirmationNumber as TicketIcon,
    Campaign as CampaignIcon,
    EventSeat as EventSeatIcon,
    Article as ArticleIcon,
    Menu as MenuIcon,
    Search as SearchIcon,
    ManageSearch as AuditIcon,
    Insights as ExecutiveIcon,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { usePageTracking } from '../hooks/analytics/useAnalytics';
import { useRole } from '../hooks/useRole';
import { useDefaultEvent } from '../hooks/useDefaultEvent';
import { useState } from 'react';

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
            { text: 'Executive', icon: <ExecutiveIcon />, path: '/executive', allowedRoles: ['ADMIN'] },
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
        ],
    },
    {
        title: 'Satış & Finans',
        allowedRoles: ['ADMIN', 'EVENT_ORGANIZATOR'],
        items: [
            { text: 'Satış Özeti', icon: <TrendingUpIcon />, path: '/sales-command' },
            { text: 'Finans Özeti (P&L)', icon: <AccountBalanceIcon />, path: '/finance/overview', allowedRoles: ['ADMIN'] },
            { text: 'Mutabakat', icon: <AccountBalanceIcon />, path: '/finance/reconciliation', allowedRoles: ['ADMIN'] },
            { text: 'Payouts', icon: <AccountBalanceIcon />, path: '/finance/payouts', allowedRoles: ['ADMIN'] },
            { text: 'İadeler', icon: <AccountBalanceIcon />, path: '/finance/refunds', allowedRoles: ['ADMIN'] },
            { text: 'Ödeme & Mutabakat', icon: <AccountBalanceIcon />, path: '/settlement-finance', allowedRoles: ['ADMIN'] },
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
        ],
    },
    {
        title: 'Kullanıcılar',
        allowedRoles: ['ADMIN', 'ASSOCIATION'],
        items: [
            { text: 'Kullanıcılar', icon: <PeopleIcon />, path: '/users', allowedRoles: ['ADMIN'] },
            { text: 'Dernekler', icon: <HomeWork />, path: '/associations' },
        ],
    },
    {
        title: 'Bildirim & İçerik Moderasyonu',
        allowedRoles: ['ADMIN'],
        items: [
            { text: 'Bildirimler', icon: <NotificationsIcon />, path: '/notifications' },
            { text: 'Bildirim Takvimi', icon: <NotificationsIcon />, path: '/notification-calendar' },
            { text: 'Video Akışı', icon: <FeedIcon />, path: '/feeds' },
            { text: 'Bültenler', icon: <CampaignIcon />, path: '/bulletins' },
            { text: 'Kampanya Motoru', icon: <LocalActivityIcon />, path: '/campaign-engine' },
        ],
    },
    {
        title: 'Growth',
        allowedRoles: ['ADMIN'],
        items: [
            { text: 'Segments', icon: <PeopleIcon />, path: '/growth/segments' },
            { text: 'Cohorts', icon: <TrendingUpIcon />, path: '/growth/cohorts' },
            { text: 'Funnel', icon: <TrendingUpIcon />, path: '/growth/funnel' },
            { text: 'Coupons', icon: <LocalActivityIcon />, path: '/growth/coupons' },
            { text: 'Referrals', icon: <PeopleIcon />, path: '/growth/referrals' },
            { text: 'Churn Risk', icon: <TrendingUpIcon />, path: '/growth/churn' },
        ],
    },
    {
        title: 'Güvenlik',
        allowedRoles: ['ADMIN'],
        items: [
            { text: 'RBAC Matrisi', icon: <AuditIcon />, path: '/security/rbac' },
            { text: 'Aktif Oturumlar', icon: <DevicesIcon />, path: '/security/sessions' },
            { text: 'Anomali Tarama', icon: <AuditIcon />, path: '/security/anomalies' },
            { text: 'Fraud Tespiti', icon: <AuditIcon />, path: '/security/fraud' },
        ],
    },
    {
        title: 'Operasyonlar',
        allowedRoles: ['ADMIN'],
        items: [
            { text: 'Müşteri Destek', icon: <SupportIcon />, path: '/customer-support' },
            { text: 'Dead Letter Queue', icon: <AuditIcon />, path: '/ops/dlq' },
            { text: 'Scheduled Jobs', icon: <AuditIcon />, path: '/ops/jobs' },
        ],
    },
    {
        title: 'Sistem',
        allowedRoles: ['ADMIN'],
        items: [
            { text: 'Cihazlar', icon: <DevicesIcon />, path: '/devices' },
            { text: 'Oyunlaştırma', icon: <EmojiEventsIcon />, path: '/gamification' },
            { text: 'Audit Log', icon: <AuditIcon />, path: '/audit-log' },
            { text: 'Panel Analitik', icon: <TrendingUpIcon />, path: '/analytics' },
            { text: 'Ayarlar', icon: <SettingsIcon />, path: '/settings' },
        ],
    },
];

export default function Layout() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const theme = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const { roles, userName, isEditorOnly, isAdmin, isOrganizer, canAccess } = useRole();
    const { logout } = useAuth();

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
                    bgcolor: '#C9A227',
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
                    <Typography sx={{ fontSize: 12, color: '#C9A227', fontWeight: 600, mt: 0.3 }} noWrap>
                        {events.length === 1 ? events[0].name : 'Etkinlikleri Yönet →'}
                    </Typography>
                </Box>
            )}

            {/* Navigation */}
            <Box
                component="nav"
                role="navigation"
                aria-label="Ana navigasyon"
                sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', py: 2 }}
            >
                {visibleSections.map((section) => (
                    <Box key={section.title} sx={{ mb: 2 }} role="group" aria-labelledby={`sec-${section.title}`}>
                        {/* Section label */}
                        <Typography
                            id={`sec-${section.title}`}
                            sx={{
                                px: 2.5, mb: 1, display: 'block',
                                color: 'rgba(255,255,255,0.4)',
                                fontSize: 10, letterSpacing: 1.5, fontWeight: 600,
                                textTransform: 'uppercase',
                                userSelect: 'none',
                            }}
                        >
                            {section.title}
                        </Typography>

                        {section.items.map((item) => {
                            const isActive = location.pathname === item.path
                                || (item.path !== '/dashboard' && location.pathname.startsWith(item.path + '/'));

                            return (
                                <Box
                                    key={item.path}
                                    component="button"
                                    onClick={() => handleNav(item.path)}
                                    aria-current={isActive ? 'page' : undefined}
                                    sx={{
                                        background: 'none',
                                        border: 'none',
                                        font: 'inherit',
                                        textAlign: 'left',
                                        width: 'calc(100% - 24px)',
                                        mx: 1.5, mb: 0.3, px: 1.5, py: 1,
                                        borderRadius: 1.5,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1.25,
                                        bgcolor: isActive ? 'rgba(201,162,39,0.12)' : 'transparent',
                                        color: isActive ? '#C9A227' : 'rgba(255,255,255,0.75)',
                                        transition: 'all 0.15s',
                                        '&:hover': {
                                            bgcolor: isActive ? 'rgba(201,162,39,0.16)' : 'rgba(255,255,255,0.04)',
                                            color: isActive ? '#C9A227' : 'white',
                                        },
                                        '&:focus-visible': {
                                            outline: '2px solid #C9A227',
                                            outlineOffset: 2,
                                        },
                                    }}
                                >
                                    <Box sx={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        width: 6, flexShrink: 0,
                                        '& svg': {
                                            fontSize: 6,
                                            fill: 'currentColor',
                                            opacity: isActive ? 1 : 0.4,
                                        },
                                    }}>
                                        {/* Dot indicator (EventConsole stiliyle) */}
                                        <svg viewBox="0 0 10 10" width={6} height={6}>
                                            <circle cx={5} cy={5} r={5} />
                                        </svg>
                                    </Box>
                                    <Typography sx={{
                                        fontSize: 13,
                                        fontWeight: isActive ? 600 : 400,
                                        lineHeight: 1.3,
                                    }}>
                                        {item.text}
                                    </Typography>
                                </Box>
                            );
                        })}
                    </Box>
                ))}
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
                        color: '#C9A227',
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
