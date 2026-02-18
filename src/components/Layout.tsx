import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
    AppBar,
    Box,
    CssBaseline,
    Drawer,
    IconButton,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Toolbar,
    Typography,
    useTheme,
    Avatar,
    Divider,
    ListItemButton,
    Tooltip,
    Badge,
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
    HomeWork,
    Feed as FeedIcon,
    Campaign as CampaignIcon,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';

const drawerWidth = 280;

const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Businesses', icon: <BusinessIcon />, path: '/businesses' },
    { text: 'Business Categories', icon: <CategoryIcon />, path: '/business-categories' },
    { text: 'Events', icon: <EventIcon />, path: '/events' },
    { text: 'Event Categories', icon: <EventCategoryIcon />, path: '/event-categories' },
    { text: 'Users', icon: <PeopleIcon />, path: '/users' },
    { text: 'Ticket Creator', icon: <CategoryIcon />, path: '/ticket-creation' },
    { text: 'Notifications', icon: <NotificationsIcon />, path: '/notifications' },
    { text: 'Feeds', icon: <FeedIcon />, path: '/feeds' },
    { text: 'Bulletins', icon: <CampaignIcon />, path: '/bulletins' },
    { text: 'Associations', icon: <HomeWork />, path: '/associations' },
    { text: 'Federations', icon: <BusinessIcon />, path: '/federations' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
];

export default function Layout() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const theme = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const { logout } = useAuth();

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    const handleNavigation = (path: string) => {
        navigate(path);
        setMobileOpen(false);
    };

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
        }
    };

    const drawer = (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Toolbar sx={{ 
                px: 2,
                py: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                background: theme.palette.primary.main,
                color: theme.palette.primary.contrastText,
            }}>
                <Avatar 
                    sx={{ 
                        width: 40, 
                        height: 40,
                        bgcolor: theme.palette.primary.contrastText,
                        color: theme.palette.primary.main,
                    }}
                >
                    X
                </Avatar>
                <Box>
                    <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 600 }}>
                        Nartgo Admin
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.8 }}>
                        Admin Panel
                    </Typography>
                </Box>
            </Toolbar>
            <Divider />
            <List sx={{ flex: 1, px: 1 }}>
                {menuItems.map((item) => (
                    <ListItem key={item.text} disablePadding>
                        <ListItemButton
                            selected={location.pathname === item.path}
                            onClick={() => handleNavigation(item.path)}
                            sx={{
                                borderRadius: 1,
                                mb: 0.5,
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
                            <ListItemIcon sx={{ minWidth: 40 }}>
                                {item.text === 'Notifications' ? (
                                    <Badge badgeContent={4} color="error">
                                        {item.icon}
                                    </Badge>
                                ) : (
                                    item.icon
                                )}
                            </ListItemIcon>
                            <ListItemText 
                                primary={item.text}
                                primaryTypographyProps={{
                                    fontSize: '0.9rem',
                                    fontWeight: location.pathname === item.path ? 600 : 400,
                                }}
                            />
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>
            <Divider />
            <List sx={{ px: 1 }}>
                <ListItem disablePadding>
                    <ListItemButton
                        onClick={handleLogout}
                        sx={{
                            borderRadius: 1,
                            color: theme.palette.error.main,
                            '&:hover': {
                                backgroundColor: theme.palette.error.light,
                                color: theme.palette.error.contrastText,
                            },
                        }}
                    >
                        <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
                            <LogoutIcon />
                        </ListItemIcon>
                        <ListItemText 
                            primary="Logout"
                            primaryTypographyProps={{
                                fontSize: '0.9rem',
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
                        aria-label="open drawer"
                        edge="start"
                        onClick={handleDrawerToggle}
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
                            fontWeight: 500,
                        }}
                    >
                        {menuItems.find(item => item.path === location.pathname)?.text || 'Dashboard'}
                    </Typography>
                </Toolbar>
            </AppBar>
            <Box
                component="nav"
                sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
            >
                <Drawer
                    variant="temporary"
                    open={mobileOpen}
                    onClose={handleDrawerToggle}
                    ModalProps={{
                        keepMounted: true,
                    }}
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
                }}
            >
                <Outlet />
            </Box>
        </Box>
    );
} 
