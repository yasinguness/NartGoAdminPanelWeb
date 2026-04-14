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
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { usePageTracking } from '../hooks/analytics/useAnalytics';
import { useRole } from '../hooks/useRole';
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

const navSections: NavSection[] = [
    {
        title: 'Genel',
        items: [
            { text: 'Kontrol Paneli', icon: <DashboardIcon />, path: '/dashboard' },
        ],
    },
    {
        title: 'Etkinlik Yönetimi',
        items: [
            { text: 'Etkinlikler', icon: <EventIcon />, path: '/events' },
            { text: 'Etkinlik Kategorileri', icon: <EventCategoryIcon />, path: '/event-categories' },
            { text: 'Etkinlik Oluştur', icon: <TicketIcon />, path: '/event-creation' },
            { text: 'Bilet Yönetimi', icon: <TicketIcon />, path: '/tickets' },
            { text: 'Salon Planları', icon: <EventSeatIcon />, path: '/seat-templates' },
        ],
    },
    {
        title: 'İşletme Yönetimi',
        items: [
            { text: 'İşletmeler', icon: <BusinessIcon />, path: '/businesses' },
            { text: 'İşletme Talepleri', icon: <FactCheckIcon />, path: '/business-claims' },
            { text: 'İşletme Kategorileri', icon: <CategoryIcon />, path: '/business-categories' },
        ],
    },
    {
        title: 'Satış & Finans',
        items: [
            { text: 'Satış Özeti', icon: <TrendingUpIcon />, path: '/sales-command' },
            { text: 'Ödeme & Mutabakat', icon: <AccountBalanceIcon />, path: '/settlement-finance' },
            { text: 'Alt Bayiler', icon: <AccountBalanceIcon />, path: '/sub-merchants' },
        ],
    },
    {
        title: 'Kullanıcılar',
        items: [
            { text: 'Kullanıcılar', icon: <PeopleIcon />, path: '/users' },
            { text: 'Dernekler', icon: <HomeWork />, path: '/associations' },
        ],
    },
    {
        title: 'İçerik',
        items: [
            { text: 'İçerik & Makaleler', icon: <ArticleIcon />, path: '/content' },
        ],
    },
    {
        title: 'İçerik Yönetimi',
        items: [
            { text: 'Bildirimler', icon: <NotificationsIcon />, path: '/notifications' },
            { text: 'Video Akışı', icon: <FeedIcon />, path: '/feeds' },
            { text: 'Bültenler', icon: <CampaignIcon />, path: '/bulletins' },
            { text: 'Kampanya Motoru', icon: <LocalActivityIcon />, path: '/campaign-engine' },
        ],
    },
    {
        title: 'Operasyonlar',
        items: [
            { text: 'Müşteri Destek', icon: <SupportIcon />, path: '/customer-support' },
        ],
    },
    {
        title: 'Sistem',
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
    const { roles, userName, isEditorOnly, isAdmin, canAccess } = useRole();
    const { logout } = useAuth();

    // Analytics: track every page navigation
    usePageTracking();

    const visibleSections = useMemo(() => {
        return navSections
            .map((s) => ({
                ...s,
                items: s.items.filter((item) => canAccess(item.path)),
            }))
            .filter((s) => s.items.length > 0);
    }, [canAccess]);

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

    // ─── Sidebar content ─────────────────────────────
    const sidebar = (
        <Box sx={{
            height: '100%', display: 'flex', flexDirection: 'column',
            background: '#fafbfc',
        }}>
            {/* Brand */}
            <Box sx={{
                px: 2.5, py: 2, display: 'flex', alignItems: 'center', gap: 1.5,
                borderBottom: `1px solid ${theme.palette.divider}`,
            }}>
                <Box sx={{
                    width: 34, height: 34, borderRadius: 2,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 900, fontSize: 15,
                }}>
                    N
                </Box>
                <Box>
                    <Typography sx={{ fontWeight: 800, fontSize: 15, lineHeight: 1.2, color: theme.palette.text.primary }}>
                        NartGo
                    </Typography>
                    <Typography sx={{ fontSize: 10.5, color: theme.palette.text.secondary, fontWeight: 500 }}>
                        Yönetim Paneli
                    </Typography>
                </Box>
            </Box>

            {/* Navigation */}
            <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', py: 1 }}>
                {visibleSections.map((section) => (
                    <Box key={section.title} sx={{ mb: 0.5 }}>
                        {/* Section label */}
                        <Typography sx={{
                            px: 2.5, pt: 1.5, pb: 0.5,
                            fontSize: 10, fontWeight: 700, letterSpacing: 1,
                            textTransform: 'uppercase',
                            color: theme.palette.text.disabled,
                            userSelect: 'none',
                        }}>
                            {section.title}
                        </Typography>

                        {/* Items — always visible, no collapse */}
                        {section.items.map((item) => {
                            const isActive = location.pathname === item.path
                                || (item.path !== '/dashboard' && location.pathname.startsWith(item.path + '/'));

                            return (
                                <Box
                                    key={item.path}
                                    onClick={() => handleNav(item.path)}
                                    sx={{
                                        mx: 1, mb: '2px', px: 1.5, py: 0.75,
                                        display: 'flex', alignItems: 'center', gap: 1.25,
                                        borderRadius: 2,
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease',
                                        position: 'relative',
                                        ...(isActive ? {
                                            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
                                            '&::before': {
                                                content: '""',
                                                position: 'absolute',
                                                left: 0, top: '20%', bottom: '20%',
                                                width: 3, borderRadius: 2,
                                                background: theme.palette.primary.main,
                                            },
                                        } : {
                                            '&:hover': {
                                                background: alpha(theme.palette.action.hover, 0.5),
                                            },
                                        }),
                                    }}
                                >
                                    <Box sx={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        width: 28, height: 28,
                                        color: isActive ? theme.palette.primary.main : theme.palette.text.secondary,
                                        '& svg': { fontSize: 18 },
                                    }}>
                                        {item.icon}
                                    </Box>
                                    <Typography sx={{
                                        fontSize: 13,
                                        fontWeight: isActive ? 650 : 450,
                                        color: isActive ? theme.palette.primary.main : theme.palette.text.primary,
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
            <Box sx={{ borderTop: `1px solid ${theme.palette.divider}`, p: 1.5 }}>
                <Box sx={{
                    display: 'flex', alignItems: 'center', gap: 1.5,
                    p: 1, borderRadius: 2,
                    '&:hover': { background: alpha(theme.palette.action.hover, 0.5) },
                }}>
                    <Avatar sx={{
                        width: 34, height: 34, fontSize: 13, fontWeight: 700,
                        bgcolor: alpha(theme.palette.primary.main, 0.12),
                        color: theme.palette.primary.main,
                    }}>
                        {initials}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2 }} noWrap>
                            {userName || 'Admin'}
                        </Typography>
                        <Typography sx={{ fontSize: 10.5, color: theme.palette.text.secondary }} noWrap>
                            {roles.join(', ') || 'ADMIN'}
                        </Typography>
                    </Box>
                    <Tooltip title="Çıkış Yap">
                        <IconButton
                            size="small"
                            onClick={handleLogout}
                            sx={{
                                color: theme.palette.text.secondary,
                                '&:hover': { color: theme.palette.error.main, bgcolor: alpha(theme.palette.error.main, 0.08) },
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
                    height: 56,
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

                <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2, color: theme.palette.text.primary }}>
                        {currentPageTitle}
                    </Typography>
                    <Typography variant="caption" sx={{ color: theme.palette.text.disabled, fontSize: 11 }}>
                        NartGo Yönetim Paneli
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
                    mt: isZenMode ? 0 : '56px',
                    maxWidth: location.pathname.includes('seat-map') ? 'none' : '1600px',
                    overflowX: 'hidden',
                }}
            >
                <Outlet />
            </Box>
        </Box>
    );
}
