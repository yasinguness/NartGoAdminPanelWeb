import { useState, useMemo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
    AppBar,
    Box,
    CssBaseline,
    Collapse,
    Drawer,
    IconButton,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    ListSubheader,
    Toolbar,
    Typography,
    useTheme,
    Avatar,
    Divider,
    ListItemButton,
    alpha,
} from '@mui/material';
import {
    Menu as MenuIcon,
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
    AdminPanelSettings as AdminPanelSettingsIcon,
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
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    ConfirmationNumber as TicketIcon,
    Campaign as CampaignIcon,
    EventSeat as EventSeatIcon,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';

const drawerWidth = 272;

interface MenuItem {
    text: string;
    icon: React.ReactNode;
    path: string;
}

interface MenuSection {
    title: string;
    items: MenuItem[];
    defaultOpen?: boolean;
}

const menuSections: MenuSection[] = [
    {
        title: 'Genel',
        defaultOpen: true,
        items: [
            { text: 'Kontrol Paneli', icon: <DashboardIcon />, path: '/dashboard' },
        ],
    },
    {
        title: 'Etkinlik Yönetimi',
        defaultOpen: true,
        items: [
            { text: 'Etkinlikler', icon: <EventIcon />, path: '/events' },
            { text: 'Etkinlik Kategorileri', icon: <EventCategoryIcon />, path: '/event-categories' },
            { text: 'Bilet Oluşturucu', icon: <TicketIcon />, path: '/ticket-creation' },
            { text: 'Oturma Düzeni', icon: <EventSeatIcon />, path: '/seat-map' },
        ],
    },
    {
        title: 'İşletme Yönetimi',
        defaultOpen: true,
        items: [
            { text: 'İşletmeler', icon: <BusinessIcon />, path: '/businesses' },
            { text: 'İşletme Talepleri', icon: <FactCheckIcon />, path: '/business-claims' },
            { text: 'İşletme Kategorileri', icon: <CategoryIcon />, path: '/business-categories' },
        ],
    },
    {
        title: 'Satış & Finans',
        items: [
            { text: 'Satış Merkezi', icon: <TrendingUpIcon />, path: '/sales-command' },
            { text: 'Gişe', icon: <PointOfSaleIcon />, path: '/box-office' },
            { text: 'Mekan Envanteri', icon: <HomeWork />, path: '/venue-inventory' },
            { text: 'Ödeme & Mutabakat', icon: <AccountBalanceIcon />, path: '/settlement-finance' },
            { text: 'Alt Bayiler', icon: <AccountBalanceIcon />, path: '/sub-merchants' },
        ],
    },
    {
        title: 'Kullanıcılar & Topluluk',
        items: [
            { text: 'Kullanıcılar', icon: <PeopleIcon />, path: '/users' },
            { text: 'Dernekler', icon: <HomeWork />, path: '/associations' },
            { text: 'Federasyonlar', icon: <BusinessIcon />, path: '/federations' },
        ],
    },
    {
        title: 'İçerik & İletişim',
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
            { text: 'Kapı Operasyonları', icon: <SensorsIcon />, path: '/gate-ops' },
            { text: 'Müşteri Destek', icon: <SupportIcon />, path: '/customer-support' },
        ],
    },
    {
        title: 'Sistem',
        items: [
            { text: 'Cihazlar', icon: <DevicesIcon />, path: '/devices' },
            { text: 'Oyunlaştırma', icon: <EmojiEventsIcon />, path: '/gamification' },
            { text: 'Ayarlar', icon: <SettingsIcon />, path: '/settings' },
        ],
    },
];

export default function Layout() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const theme = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const { logout } = useAuth();

    // Initialize expanded sections
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {};
        menuSections.forEach((section) => {
            initial[section.title] = section.defaultOpen ?? false;
        });
        // Auto-expand the section containing the current route
        menuSections.forEach((section) => {
            if (section.items.some((item) => location.pathname === item.path)) {
                initial[section.title] = true;
            }
        });
        return initial;
    });

    const toggleSection = (title: string) => {
        setExpandedSections((prev) => ({ ...prev, [title]: !prev[title] }));
    };

    const handleNavigation = (path: string) => {
        navigate(path);
        setMobileOpen(false);
    };

    const handleLogout = async () => {
        try {
            await logout();
        } catch {
            // silently handle
        }
    };

    // Memoize current page title
    const currentPageTitle = useMemo(() => {
        for (const section of menuSections) {
            const found = section.items.find((item) => location.pathname === item.path);
            if (found) return found.text;
        }
        return 'Kontrol Paneli';
    }, [location.pathname]);

    const drawer = (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Brand Header */}
            <Toolbar
                sx={{
                    px: 2.5,
                    py: 2.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    background: theme.palette.primary.main,
                    color: theme.palette.primary.contrastText,
                    minHeight: '72px !important',
                }}
            >
                <Avatar
                    sx={{
                        width: 38,
                        height: 38,
                        bgcolor: alpha(theme.palette.primary.contrastText, 0.2),
                        color: theme.palette.primary.contrastText,
                        fontWeight: 800,
                        fontSize: '1rem',
                    }}
                >
                    N
                </Avatar>
                <Box>
                    <Typography variant="subtitle1" noWrap sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                        Nartgo
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.7, fontSize: '0.7rem' }}>
                        Yönetim Paneli
                    </Typography>
                </Box>
            </Toolbar>
            <Divider />

            {/* Navigation Sections */}
            <Box sx={{ flex: 1, overflowY: 'auto', py: 1 }}>
                {menuSections.map((section) => {
                    const isExpanded = expandedSections[section.title] ?? false;
                    const hasActiveItem = section.items.some((item) => location.pathname === item.path);

                    return (
                        <Box key={section.title}>
                            {/* Section Header */}
                            <ListItemButton
                                onClick={() => toggleSection(section.title)}
                                sx={{
                                    px: 2.5,
                                    py: 0.75,
                                    minHeight: 36,
                                    '&:hover': {
                                        bgcolor: alpha(theme.palette.primary.main, 0.04),
                                    },
                                }}
                            >
                                <Typography
                                    variant="overline"
                                    sx={{
                                        flex: 1,
                                        fontSize: '0.68rem',
                                        fontWeight: 700,
                                        letterSpacing: 1,
                                        color: hasActiveItem
                                            ? theme.palette.primary.main
                                            : theme.palette.text.secondary,
                                    }}
                                >
                                    {section.title}
                                </Typography>
                                {isExpanded ? (
                                    <ExpandLessIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                                ) : (
                                    <ExpandMoreIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                                )}
                            </ListItemButton>

                            {/* Section Items */}
                            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                <List disablePadding sx={{ px: 1 }}>
                                    {section.items.map((item) => {
                                        const isActive = location.pathname === item.path;
                                        return (
                                            <ListItem key={item.path} disablePadding sx={{ mb: 0.25 }}>
                                                <ListItemButton
                                                    selected={isActive}
                                                    onClick={() => handleNavigation(item.path)}
                                                    sx={{
                                                        borderRadius: 1.5,
                                                        py: 0.75,
                                                        pl: 2.5,
                                                        minHeight: 40,
                                                        '&.Mui-selected': {
                                                            backgroundColor: theme.palette.primary.main,
                                                            color: theme.palette.primary.contrastText,
                                                            '&:hover': {
                                                                backgroundColor: theme.palette.primary.dark,
                                                            },
                                                            '& .MuiListItemIcon-root': {
                                                                color: theme.palette.primary.contrastText,
                                                            },
                                                        },
                                                    }}
                                                >
                                                    <ListItemIcon sx={{ minWidth: 36, '& svg': { fontSize: 20 } }}>
                                                        {item.icon}
                                                    </ListItemIcon>
                                                    <ListItemText
                                                        primary={item.text}
                                                        primaryTypographyProps={{
                                                            fontSize: '0.84rem',
                                                            fontWeight: isActive ? 600 : 400,
                                                        }}
                                                    />
                                                </ListItemButton>
                                            </ListItem>
                                        );
                                    })}
                                </List>
                            </Collapse>
                        </Box>
                    );
                })}
            </Box>

            {/* Logout */}
            <Divider />
            <List sx={{ px: 1, py: 1 }}>
                <ListItem disablePadding>
                    <ListItemButton
                        onClick={handleLogout}
                        sx={{
                            borderRadius: 1.5,
                            py: 1,
                            color: theme.palette.error.main,
                            '&:hover': {
                                backgroundColor: alpha(theme.palette.error.main, 0.08),
                            },
                        }}
                    >
                        <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
                            <LogoutIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                            primary="Çıkış Yap"
                            primaryTypographyProps={{
                                fontSize: '0.84rem',
                                fontWeight: 500,
                            }}
                        />
                    </ListItemButton>
                </ListItem>
            </List>
        </Box>
    );

    return (
        <Box sx={{ display: 'flex' }}>
            <CssBaseline />
            <AppBar
                position="fixed"
                sx={{
                    width: { sm: `calc(100% - ${drawerWidth}px)` },
                    ml: { sm: `${drawerWidth}px` },
                    background: theme.palette.background.paper,
                    boxShadow: 'none',
                    borderBottom: `1px solid ${theme.palette.divider}`,
                }}
            >
                <Toolbar>
                    <IconButton
                        color="inherit"
                        aria-label="menüyü aç"
                        aria-expanded={mobileOpen}
                        edge="start"
                        onClick={() => setMobileOpen(!mobileOpen)}
                        sx={{
                            mr: 2,
                            display: { sm: 'none' },
                            color: theme.palette.text.primary,
                        }}
                    >
                        <MenuIcon />
                    </IconButton>
                    <Typography
                        variant="h6"
                        noWrap
                        component="div"
                        sx={{
                            color: theme.palette.text.primary,
                            fontWeight: 600,
                            fontSize: '1.1rem',
                        }}
                    >
                        {currentPageTitle}
                    </Typography>
                </Toolbar>
            </AppBar>
            <Box
                component="nav"
                sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
                aria-label="Ana navigasyon"
            >
                <Drawer
                    variant="temporary"
                    open={mobileOpen}
                    onClose={() => setMobileOpen(false)}
                    ModalProps={{ keepMounted: true }}
                    sx={{
                        display: { xs: 'block', sm: 'none' },
                        '& .MuiDrawer-paper': {
                            boxSizing: 'border-box',
                            width: drawerWidth,
                            borderRight: `1px solid ${theme.palette.divider}`,
                        },
                    }}
                >
                    {drawer}
                </Drawer>
                <Drawer
                    variant="permanent"
                    sx={{
                        display: { xs: 'none', sm: 'block' },
                        '& .MuiDrawer-paper': {
                            boxSizing: 'border-box',
                            width: drawerWidth,
                            borderRight: `1px solid ${theme.palette.divider}`,
                        },
                    }}
                    open
                >
                    {drawer}
                </Drawer>
            </Box>
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: 3,
                    width: { sm: `calc(100% - ${drawerWidth}px)` },
                    mt: '64px',
                    maxWidth: '1600px',
                }}
            >
                <Outlet />
            </Box>
        </Box>
    );
}
