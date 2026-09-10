import { useMemo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
    Box,
    CssBaseline,
    Drawer,
    Typography,
    useTheme,
    ThemeProvider,
    Avatar,
    alpha,
    Tooltip,
    IconButton,
} from '@mui/material';
import {
    Notifications as NotificationsIcon,
    ExitToApp as LogoutIcon,
    Settings as SettingsIcon,
    Menu as MenuIcon,
    Search as SearchIcon,
    SwapHoriz as SwapIcon,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { useAdminBadgeCounts } from '../hooks/useAdminBadgeCounts';
import { usePageTracking } from '../hooks/analytics/useAnalytics';
import { useRole } from '../hooks/useRole';
import { useDefaultEvent } from '../hooks/useDefaultEvent';
import { useState } from 'react';
import { nb } from '../theme/nbBrand';
import { theme as baseTheme } from '../theme/index';
import { nbTheme } from '../theme/nbTheme';
import { workspaceForPath, workspacesForRoles, WORKSPACES, type Workspace } from '../config/workspaces';
import { useWorkspaceStore } from '../store/workspaceStore';

const DRAWER_W = 260;

interface LayoutShellProps {
    workspace: Workspace;
    /** Kullanıcı birden fazla panele girebiliyorsa üstte değiştirici çıkar. */
    canSwitch: boolean;
}

/**
 * Kabuk, hangi panelde olduğunu adresten öğrenir ve navigasyonunu
 * workspace'ten alır. Eskiden 160 satırlık nav dizisi bu dosyanın içindeydi
 * ve iki dünyanın menüsü tek listede iç içeydi.
 */
export default function Layout() {
    const location = useLocation();
    const { roles } = useRole();

    const workspace = useMemo(
        () => workspaceForPath(location.pathname),
        [location.pathname],
    );
    const canSwitch = useMemo(
        () => workspacesForRoles(roles).length > 1,
        [roles],
    );

    return (
        <ThemeProvider theme={workspace.id === 'nartbusiness' ? nbTheme : baseTheme}>
            <LayoutShell workspace={workspace} canSwitch={canSwitch} />
        </ThemeProvider>
    );
}

function LayoutShell({ workspace, canSwitch }: LayoutShellProps) {

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

    // Anahtar workspace ile birlikte: "Genel" iki panelde de var, ortak
    // anahtarla birini katlamak diğerini de katlıyordu.
    const sectionKey = (title: string) => `${workspace.id}:${title}`;

    const toggleSection = (title: string) => {
        const key = sectionKey(title);
        setCollapsed((prev) => {
            const next = { ...prev, [key]: !prev[key] };
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
    const setLastWorkspace = useWorkspaceStore((st) => st.setLastWorkspace);

    // Organizator için aktif etkinlik sayısı (sidebar context indicator)
    // Etkinlik bağlamı yalnız NartGo'da anlamlı; NB'de istek bile atılmaz.
    const { events, defaultEventId } = useDefaultEvent({ enabled: workspace.id === 'nartgo' });
    const showEventContext = workspace.id === 'nartgo' && (isOrganizer || isAdmin) && !isEditorOnly;

    // Analytics: track every page navigation
    usePageTracking();

    const visibleSections = useMemo(() => {
        return workspace.nav
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
    }, [canAccess, isAdmin, roles, workspace.nav]);

    const isZenMode = location.pathname.includes('seat-map') && new URLSearchParams(location.search).get('zen') === 'true';

    const currentPageTitle = useMemo(() => {
        for (const s of workspace.nav) {
            const found = s.items.find((i) => location.pathname === i.path);
            if (found) return found.text;
        }
        return 'Kontrol Paneli';
    }, [location.pathname, workspace.nav]);

    const initials = userName
        ? userName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
        : 'N';

    const handleNav = (path: string) => {
        navigate(path);
        setMobileOpen(false);
    };

    // Değiştirici iki panel varsayar; ikiden fazlası olursa burası
    // bir menüye dönüşmeli.
    const otherWorkspace = WORKSPACES.find((w) => w.id !== workspace.id) ?? workspace;

    const handleWorkspaceSwitch = () => {
        setLastWorkspace(otherWorkspace.id);
        navigate(otherWorkspace.defaultPath);
        setMobileOpen(false);
    };

    const handleLogout = async () => {
        try { await logout(); } catch { /* */ }
    };

    // ─── Sidebar content (EventConsole premium stili) ─────
    const sidebar = (
        <Box sx={{
            height: '100%', display: 'flex', flexDirection: 'column',
            bgcolor: workspace.sidebarBg,
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
                    color: workspace.sidebarBg, fontWeight: 800,
                    fontSize: workspace.monogram.length > 1 ? 12 : 14,
                }}>
                    {workspace.monogram}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: 14, lineHeight: 1.2, color: 'white', letterSpacing: 0.3 }} noWrap>
                        {workspace.name}
                    </Typography>
                    <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }} noWrap>
                        {workspace.tagline}
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
                        px: 1.5, py: 1,
                        borderRadius: 2,
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
                    const open = !!q || hasActive || collapsed[sectionKey(section.title)] === false;
                    // Kapalıyken rozet sayısı kaybolmamalı — aciliyet gizlenmez.
                    const pending = items.reduce((acc, i) => acc + (badgeCounts[i.path] ?? 0), 0);

                    return (
                        <Box key={section.title} sx={{ mb: 1.25 }} role="group">
                            <Box
                                component="button"
                                type="button"
                                onClick={() => toggleSection(section.title)}
                                aria-expanded={open}
                                sx={{
                                    width: 'calc(100% - 24px)',
                                    mx: 1.5, px: 1, py: 0.85,
                                    display: 'flex', alignItems: 'center', gap: 0.75,
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    borderRadius: 1.5,
                                    color: nb.onDarkFaint,
                                    fontSize: 10, letterSpacing: 1.3, fontWeight: 700,
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
                                            mx: 1.5, mb: 0.25, pl: 1.75, pr: 1.5, py: 0.8,
                                            borderRadius: 1.5,
                                            cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', gap: 1.25,
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
                                                left: 2, top: '50%', transform: 'translateY(-50%)',
                                                width: 3, height: 16, borderRadius: 2,
                                                bgcolor: nb.goldSoft,
                                            } : undefined,
                                        }}
                                    >
                                        <Box
                                            aria-hidden
                                            sx={{
                                                display: 'flex', flexShrink: 0,
                                                color: isActive ? nb.goldSoft : 'rgba(255,255,255,0.45)',
                                                transition: 'color 0.15s',
                                                '& svg': { fontSize: 17 },
                                            }}
                                        >
                                            {item.icon}
                                        </Box>
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
                        {workspace.breadcrumbLabel} · {currentPageTitle.toUpperCase()}
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

                {/* Workspace değiştirici — yalnız iki panele de yetkisi olanda.
                    Tek yetkisi olan için anlamsız bir kontrol olurdu. */}
                {canSwitch && (
                    <Tooltip title={`${otherWorkspace.name} paneline geç`}>
                        <Box
                            component="button"
                            type="button"
                            onClick={handleWorkspaceSwitch}
                            aria-label={`${otherWorkspace.name} paneline geç`}
                            sx={{
                                display: { xs: 'none', sm: 'flex' },
                                alignItems: 'center', gap: 0.75,
                                px: 1.25, py: 0.625,
                                borderRadius: 2,
                                cursor: 'pointer',
                                font: 'inherit', fontFamily: 'inherit',
                                bgcolor: 'transparent',
                                border: `1px solid ${theme.palette.divider}`,
                                color: theme.palette.text.secondary,
                                transition: 'all 0.15s',
                                '&:hover': {
                                    borderColor: theme.palette.primary.main,
                                    color: theme.palette.primary.main,
                                    bgcolor: alpha(theme.palette.primary.main, 0.04),
                                },
                                '&:focus-visible': {
                                    outline: `2px solid ${theme.palette.primary.main}`,
                                    outlineOffset: 2,
                                },
                            }}
                        >
                            <SwapIcon sx={{ fontSize: 15 }} />
                            <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
                                {otherWorkspace.name}
                            </Typography>
                        </Box>
                    </Tooltip>
                )}

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
