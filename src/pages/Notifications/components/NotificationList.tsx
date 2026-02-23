import { motion, AnimatePresence } from 'framer-motion';
import { 
    CircularProgress,
    Stack,
    Paper,
    Tooltip,
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Grid,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Notifications as NotificationsIcon,
    Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon,
    SearchOff as SearchOffIcon,
    Warning as WarningIcon
} from '@mui/icons-material';
import { 
    Bell, 
    BellOff, 
    MoreVertical, 
    ArrowRight,
    SearchX
} from 'lucide-react';
import { format } from 'date-fns';
import { NotificationDto, NotificationPriority } from '../../../types/notifications/notificationModel';
import { StatusChip, EmptyState } from '../../../components/Data';
import React from 'react';

interface NotificationListProps {
    notifications: NotificationDto[];
    loading: boolean;
    viewMode: 'table' | 'cards';
    searchTerm: string;
    filterPriority: NotificationPriority | 'all';
    onOpenDialog: (notification?: NotificationDto) => void;
    onMarkAsRead: (id: number) => Promise<void>;
}

export default function NotificationList({
    notifications,
    loading,
    viewMode,
    searchTerm,
    filterPriority,
    onOpenDialog,
    onMarkAsRead
}: NotificationListProps) {
    // Filter notifications based on search and priority
    const filteredNotifications = React.useMemo(() => {
        return notifications?.filter(notification => {
            const matchesSearch = searchTerm === '' || 
                notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                notification.content.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesPriority = filterPriority === 'all' || notification.priority === filterPriority;
            
            return matchesSearch && matchesPriority;
        }) || [];
    }, [notifications, searchTerm, filterPriority]);

    const getPriorityStyles = (priority: NotificationPriority) => {
        switch (priority) {
            case NotificationPriority.URGENT: 
                return { color: 'error', gradient: 'linear-gradient(135deg, #FF4B2B 0%, #FF416C 100%)', icon: <WarningIcon /> };
            case NotificationPriority.HIGH: 
                return { color: 'warning', gradient: 'linear-gradient(135deg, #F2994A 0%, #F2C94C 100%)', icon: <NotificationsIcon /> };
            case NotificationPriority.NORMAL: 
                return { color: 'info', gradient: 'linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)', icon: <NotificationsIcon /> };
            case NotificationPriority.LOW: 
                return { color: 'default', gradient: 'linear-gradient(135deg, #bdc3c7 0%, #2c3e50 100%)', icon: <NotificationsIcon /> };
            default: 
                return { color: 'default', gradient: 'none', icon: <NotificationsIcon /> };
        }
    };

    const LoadingCards = () => (
        <Grid container spacing={3}>
            {[1, 2, 3, 4, 5, 6].map((item) => (
                <Grid item xs={12} md={6} lg={4} key={item}>
                    <Card sx={{ 
                        borderRadius: 3, 
                        height: '100%',
                        border: '1px solid',
                        borderColor: 'grey.200',
                        overflow: 'hidden'
                    }}>
                        <CardContent>
                            <Stack spacing={2}>
                                <Stack direction="row" spacing={2} alignItems="center">
                                    <CircularProgress size={20} />
                                    <Box sx={{ width: '60%', height: 20, bgcolor: 'grey.100', borderRadius: 1 }} />
                                </Stack>
                                <Box sx={{ width: '100%', height: 40, bgcolor: 'grey.50', borderRadius: 1 }} />
                                <Stack direction="row" justifyContent="space-between">
                                    <Box sx={{ width: '30%', height: 24, bgcolor: 'grey.100', borderRadius: 4 }} />
                                    <Box sx={{ width: '40%', height: 24, bgcolor: 'grey.100', borderRadius: 4 }} />
                                </Stack>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            ))}
        </Grid>
    );

    const NotificationCard = ({ notification, index }: { notification: NotificationDto, index: number }) => {
        const styles = getPriorityStyles(notification.priority);
        
        return (
            <Grid item xs={12} md={6} lg={4}>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    whileHover={{ y: -6 }}
                >
                    <Card 
                        elevation={0}
                        sx={{ 
                            borderRadius: 4,
                            border: '1px solid',
                            borderColor: notification.isRead ? 'divider' : 'primary.light',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            position: 'relative',
                            overflow: 'hidden',
                            background: notification.isRead 
                                ? 'rgba(255, 255, 255, 0.8)' 
                                : 'linear-gradient(to bottom right, rgba(255, 255, 255, 1), rgba(240, 247, 255, 0.8))',
                            backdropFilter: 'blur(10px)',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                boxShadow: '0 20px 40px -12px rgba(0,0,0,0.12)',
                                borderColor: 'primary.main',
                                '& .card-bg-icon': { transform: 'scale(1.2) rotate(-10deg)', opacity: 0.08 }
                            }
                        }}
                    >
                        {/* Decorative background icon */}
                        <Box className="card-bg-icon" sx={{
                            position: 'absolute',
                            right: -20,
                            top: -20,
                            fontSize: 120,
                            opacity: 0.03,
                            color: 'primary.main',
                            transition: 'all 0.4s ease',
                            pointerEvents: 'none'
                        }}>
                            <NotificationsIcon fontSize="inherit" />
                        </Box>

                        <CardContent sx={{ p: 3, flexGrow: 1, position: 'relative', zIndex: 1 }} onClick={() => onOpenDialog(notification)} style={{ cursor: 'pointer' }}>
                            <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={2.5}>
                                <Box flex={1}>
                                    <Typography variant="subtitle1" fontWeight={800} gutterBottom noWrap color="text.primary" sx={{ letterSpacing: '-0.3px' }}>
                                        {notification.title}
                                    </Typography>
                                    <Typography 
                                        variant="body2" 
                                        color="text.secondary" 
                                        sx={{ 
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden',
                                            lineHeight: 1.6,
                                            fontWeight: 500
                                        }}
                                    >
                                        {notification.content}
                                    </Typography>
                                </Box>
                            </Box>
                            
                            <Stack direction="row" alignItems="center" justifyContent="space-between" mt={4}>
                                <Stack direction="row" spacing={1.5}>
                                    <Tooltip title={`Priority: ${notification.priority}`}>
                                        <Box>
                                             <StatusChip 
                                                status={notification.priority} 
                                                color={styles.color as any}
                                                size="small"
                                                sx={{ 
                                                    fontWeight: 700, 
                                                    height: 24, 
                                                    borderRadius: '8px',
                                                    boxShadow: !notification.isRead ? `0 4px 8px ${alpha('#000', 0.1)}` : 'none'
                                                }}
                                            />
                                        </Box>
                                    </Tooltip>
                                    {!notification.isRead && (
                                        <StatusChip 
                                            status="Unread" 
                                            color="primary"
                                            size="small"
                                            sx={{ fontWeight: 700, height: 24, borderRadius: '8px' }}
                                        />
                                    )}
                                </Stack>
                                <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    {format(new Date(notification.createdAt), 'MMM dd, HH:mm')}
                                </Typography>
                            </Stack>
                        </CardContent>
                        
                        <Box sx={{ 
                            borderTop: '1px solid', 
                            borderColor: alpha('#000', 0.03), 
                            px: 2, 
                            py: 1.5, 
                            bgcolor: alpha('#fff', 0.4),
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                             <Button 
                                size="small" 
                                endIcon={<ArrowRight size={14} />} 
                                onClick={(e) => { e.stopPropagation(); onOpenDialog(notification); }}
                                sx={{ 
                                    textTransform: 'none', 
                                    fontWeight: 600, 
                                    color: 'primary.main',
                                    '&:hover': { bgcolor: 'primary.50' }
                                }}
                            >
                                Details
                            </Button>

                            <Stack direction="row" spacing={0.5}>
                                <IconButton 
                                    size="small"
                                    onClick={(e) => { e.stopPropagation(); onMarkAsRead(notification.id); }}
                                    sx={{ 
                                        color: notification.isRead ? 'text.disabled' : 'primary.main',
                                        transition: 'all 0.2s',
                                        '&:hover': { 
                                            bgcolor: notification.isRead ? 'grey.100' : 'primary.50',
                                            transform: 'scale(1.1)'
                                        }
                                    }}
                                >
                                    {notification.isRead ? <BellOff size={18} /> : <Bell size={18} />}
                                </IconButton>
                                <IconButton 
                                    size="small" 
                                    onClick={(e) => { e.stopPropagation(); onOpenDialog(notification); }}
                                    sx={{ 
                                        color: 'text.disabled',
                                        '&:hover': { color: 'primary.main', bgcolor: 'primary.50' }
                                    }}
                                >
                                    <MoreVertical size={18} />
                                </IconButton>
                            </Stack>
                        </Box>
                    </Card>
                </motion.div>
            </Grid>
        );
    };

    const NotificationTableContent = () => {
        if (loading) {
            return (
                <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                        <Stack spacing={2} alignItems="center">
                            <CircularProgress size={32} />
                            <Typography variant="body2" color="text.secondary">Loading notifications...</Typography>
                        </Stack>
                    </TableCell>
                </TableRow>
            );
        }

        if (filteredNotifications.length === 0) {
            return (
                <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                        <EmptyState 
                            icon={<SearchOffIcon sx={{ fontSize: 48 }} />}
                            title={searchTerm ? "No matches found" : "No notifications yet"}
                            description={searchTerm 
                                ? `No notifications match "${searchTerm}". Try a different term.`
                                : "Broadcast alerts and system updates to your users."
                            }
                            action={!searchTerm && (
                                <Button startIcon={<AddIcon />} variant="contained" onClick={() => onOpenDialog()}>
                                    Create Notification
                                </Button>
                            )}
                            compact
                        />
                    </TableCell>
                </TableRow>
            );
        }

        return filteredNotifications.map((notification) => (
            <TableRow 
                key={notification.id}
                hover
                sx={{ 
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'primary.50' },
                    transition: 'background-color 0.2s'
                }}
                onClick={() => onOpenDialog(notification)}
            >
                <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>{notification.title}</TableCell>
                <TableCell>
                    <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{ 
                            maxWidth: 300,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {notification.content}
                    </Typography>
                </TableCell>
                <TableCell>
                    <StatusChip 
                        status={notification.priority} 
                        color={getPriorityStyles(notification.priority).color as any}
                    />
                </TableCell>
                <TableCell>
                    <StatusChip 
                        status={notification.isRead ? 'read' : 'unread'} 
                        color={notification.isRead ? 'default' : 'primary'}
                        variant={notification.isRead ? 'outlined' : 'filled'}
                    />
                </TableCell>
                <TableCell color="text.secondary">
                    {format(new Date(notification.createdAt), 'MMM dd, yyyy HH:mm')}
                </TableCell>
                <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <IconButton 
                            size="small" 
                            onClick={(e) => { e.stopPropagation(); onOpenDialog(notification); }}
                            sx={{ '&:hover': { color: 'primary.main' } }}
                        >
                            <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton 
                            size="small"
                            onClick={(e) => { e.stopPropagation(); onMarkAsRead(notification.id); }}
                            sx={{ '&:hover': { color: 'primary.main' } }}
                        >
                            {notification.isRead ? <VisibilityIcon fontSize="small" /> : <VisibilityOffIcon fontSize="small" />}
                        </IconButton>
                    </Stack>
                </TableCell>
            </TableRow>
        ));
    };

    if (viewMode === 'cards') {
        return (
            <Box sx={{ p: 1 }}>
                {loading ? (
                    <LoadingCards />
                ) : filteredNotifications.length === 0 ? (
                    <EmptyState 
                        icon={<SearchX size={64} strokeWidth={1.5} color={alpha('#000', 0.1)} />}
                        title={searchTerm ? "No matches found" : "Inbox is empty"}
                        description={searchTerm 
                            ? `We couldn't find anything matching "${searchTerm}". Try a different term.`
                            : "Broadcast alerts and system updates to your users to keep them informed."
                        }
                        action={!searchTerm && (
                            <Button startIcon={<AddIcon />} variant="contained" onClick={() => onOpenDialog()}>
                                Create Notification
                            </Button>
                        )}
                    />
                ) : (
                    <Grid container spacing={3}>
                        <AnimatePresence mode="popLayout">
                            {filteredNotifications.map((notification, index) => (
                                <NotificationCard key={notification.id} notification={notification} index={index} />
                            ))}
                        </AnimatePresence>
                    </Grid>
                )}
            </Box>
        );
    }

    return (
        <Paper 
            elevation={0} 
            sx={{ 
                border: '1px solid', 
                borderColor: 'divider', 
                borderRadius: 4, 
                overflow: 'hidden',
                background: 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(10px)'
            }}
        >
            <TableContainer>
                <Table sx={{ minWidth: 800 }}>
                    <TableHead sx={{ bgcolor: alpha('#f8fafc', 0.8) }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 800, color: 'text.primary', fontSize: '0.8rem', textTransform: 'uppercase' }}>Title</TableCell>
                            <TableCell sx={{ fontWeight: 800, color: 'text.primary', fontSize: '0.8rem', textTransform: 'uppercase' }}>Content</TableCell>
                            <TableCell sx={{ fontWeight: 800, color: 'text.primary', fontSize: '0.8rem', textTransform: 'uppercase' }}>Priority</TableCell>
                            <TableCell sx={{ fontWeight: 800, color: 'text.primary', fontSize: '0.8rem', textTransform: 'uppercase' }}>Status</TableCell>
                            <TableCell sx={{ fontWeight: 800, color: 'text.primary', fontSize: '0.8rem', textTransform: 'uppercase' }}>Created At</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 800, color: 'text.primary', fontSize: '0.8rem', textTransform: 'uppercase' }}>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        <NotificationTableContent />
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );
}
