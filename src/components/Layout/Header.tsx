import { AppBar, Toolbar, Typography, IconButton, Box, Avatar, Menu, MenuItem } from '@mui/material';
import { Menu as MenuIcon, Logout } from '@mui/icons-material';
import { useState } from 'react';

interface HeaderProps {
    title: string;
    onMenuClick?: () => void;
    user?: {
        name?: string;
        avatar?: string;
    };
    onLogout?: () => void;
}

export const Header = ({ title, onMenuClick, user, onLogout }: HeaderProps) => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    return (
        <AppBar position="sticky" elevation={0}>
            <Toolbar>
                {onMenuClick && (
                    <IconButton
                        edge="start"
                        color="inherit"
                        aria-label="open drawer"
                        onClick={onMenuClick}
                        sx={{ mr: 2 }}
                    >
                        <MenuIcon />
                    </IconButton>
                )}
                <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                    {title}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {user && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }} onClick={handleMenu}>
                            <Typography variant="body1" sx={{ display: { xs: 'none', sm: 'block' } }}>
                                {user.name}
                            </Typography>
                            <Avatar sx={{ width: 32, height: 32 }} src={user.avatar}>
                                {user.name?.charAt(0)}
                            </Avatar>
                        </Box>
                    )}
                    {user && onLogout && (
                        <Menu
                            anchorEl={anchorEl}
                            anchorOrigin={{
                                vertical: 'top',
                                horizontal: 'right',
                            }}
                            keepMounted
                            transformOrigin={{
                                vertical: 'top',
                                horizontal: 'right',
                            }}
                            open={Boolean(anchorEl)}
                            onClose={handleClose}
                        >
                            <MenuItem onClick={onLogout}>
                                <Logout fontSize="small" sx={{ mr: 1 }} />
                                Logout
                            </MenuItem>
                        </Menu>
                    )}
                </Box>
            </Toolbar>
        </AppBar>
    );
};

export default Header;
