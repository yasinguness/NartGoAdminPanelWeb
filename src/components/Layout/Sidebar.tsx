import { Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Box, Typography, Divider } from '@mui/material';
import { ReactNode } from 'react';

interface NavItem {
    icon: ReactNode;
    text: string;
    path?: string;
    onClick?: () => void;
    divider?: boolean;
}

interface SidebarProps {
    open: boolean;
    onClose?: () => void;
    items: NavItem[];
    width?: number;
}

export const Sidebar = ({ open, onClose, items, width = 240 }: SidebarProps) => {
    return (
        <Drawer
            variant="temporary"
            anchor="left"
            open={open}
            onClose={onClose}
            sx={{
                width,
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                    width,
                    boxSizing: 'border-box',
                },
            }}
            ModalProps={{
                keepMounted: true,
            }}
        >
            <Box sx={{ height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid rgba(0,0,0,0.12)' }}>
                <Typography variant="h6" noWrap component="div">
                    Nartgo Admin
                </Typography>
            </Box>
            <List>
                {items.map((item, index) => (
                    item.divider ? (
                        <Divider key={`divider-${index}`} sx={{ my: 1 }} />
                    ) : (
                        <ListItem key={index} disablePadding>
                            <ListItemButton onClick={item.onClick}>
                                {item.icon && (
                                    <ListItemIcon sx={{ minWidth: 40 }}>
                                        {item.icon}
                                    </ListItemIcon>
                                )}
                                <ListItemText primary={item.text} />
                            </ListItemButton>
                        </ListItem>
                    )
                ))}
            </List>
        </Drawer>
    );
};

export default Sidebar;
