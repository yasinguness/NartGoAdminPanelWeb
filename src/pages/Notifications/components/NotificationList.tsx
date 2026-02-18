import React from 'react';
import {
    Box,
    Grid,
    Card,
    CardContent,
    CardActions,
    Typography,
    Button,
    IconButton,
    Fade,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    CircularProgress,
    Stack,
    Paper,
    Tooltip,
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Notifications as NotificationsIcon,
    Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon,
    SearchOff as SearchOffIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { NotificationDto, NotificationPriority } from '../../../types/notifications/notificationModel';
import { StatusChip, EmptyState } from '../../../components/Data';

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

    const getPriorityColor = (priority: NotificationPriority) => {
        switch (priority) {
            case NotificationPriority.URGENT: return 'error';
            case NotificationPriority.HIGH: return 'warning';
            case NotificationPriority.NORMAL: return 'info';
            case NotificationPriority.LOW: return 'default';
            default: return 'default';
        }
    };

    const LoadingCards = () => (
        <Grid container spacing={3}>
            {[1, 2, 3, 4, 5, 6].map((item) => (
                <Grid item xs={12} md={6} lg={4} key={item}>
                    <Card sx={{ borderRadius: 2, height: '100%' }}>
                        <CardContent>
                            <Stack spacing={2}>
                                <Stack direction="row" spacing={2} alignItems="center">
                                    <CircularProgress size={20} thickness={5} />
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

    const NotificationCard = ({ notification }: { notification: NotificationDto }) => (
        <Grid item xs={12} md={6} lg={4} key={notification.id}>
            <Fade in timeout={300}>
                <Card 
                    elevation={0}
                    sx={{ 
                        borderRadius: 3,
                        border: '1px solid',
                        borderColor: 'divider',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: '0 12px 24px -10px rgba(0,0,0,0.1)',
                            borderColor: 'primary.main',
                            '& .action-buttons': { opacity: 1 }
                        }
                    }}
                >
                    <CardContent sx={{ p: 3, flexGrow: 1 }} onClick={() => onOpenDialog(notification)} style={{ cursor: 'pointer' }}>
                        <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={2}>
                            <Box flex={1}>
                                <Typography variant="subtitle1" fontWeight={700} gutterBottom noWrap color="text.primary">
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
                                        lineHeight: 1.6
                                    }}
                                >
                                    {notification.content}
                                </Typography>
                            </Box>
                        </Box>
                        
                        <Stack direction="row" alignItems="center" justifyContent="space-between" mt={3}>
                            <Stack direction="row" spacing={1}>
                                <StatusChip 
                                    status={notification.priority} 
                                    color={getPriorityColor(notification.priority)}
                                    size="small"
                                />
                                <StatusChip 
                                    status={notification.isRead ? 'read' : 'unread'} 
                                    color={notification.isRead ? 'default' : 'primary'}
                                    variant={notification.isRead ? 'outlined' : 'filled'}
                                    size="small"
                                />
                            </Stack>
                            <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 500 }}>
                                {format(new Date(notification.createdAt), 'MMM dd, HH:mm')}
                            </Typography>
                        </Stack>
                    </CardContent>
                    
                    <Box sx={{ borderTop: '1px solid', borderColor: 'grey.50', px: 2, py: 1.5, bgcolor: 'grey.25' }}>
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Tooltip title="Edit Notification">
                                <IconButton 
                                    size="small" 
                                    onClick={(e) => { e.stopPropagation(); onOpenDialog(notification); }}
                                    sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main', bgcolor: 'primary.50' } }}
                                >
                                    <EditIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title={notification.isRead ? 'Mark as Unread' : 'Mark as Read'}>
                                <IconButton 
                                    size="small"
                                    onClick={(e) => { e.stopPropagation(); onMarkAsRead(notification.id); }}
                                    sx={{ 
                                        color: notification.isRead ? 'text.secondary' : 'primary.main',
                                        '&:hover': { bgcolor: notification.isRead ? 'grey.100' : 'primary.50' }
                                    }}
                                >
                                    {notification.isRead ? <VisibilityIcon fontSize="small" /> : <VisibilityOffIcon fontSize="small" />}
                                </IconButton>
                            </Tooltip>
                        </Stack>
                    </Box>
                </Card>
            </Fade>
        </Grid>
    );

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
                        color={getPriorityColor(notification.priority)}
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
                        icon={<SearchOffIcon sx={{ fontSize: 64 }} />}
                        title={searchTerm ? "No matches found" : "No notifications found"}
                        description={searchTerm 
                            ? `We couldn't find anything matching "${searchTerm}". Try adjusting your filters.`
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
                        {filteredNotifications.map((notification) => (
                            <NotificationCard key={notification.id} notification={notification} />
                        ))}
                    </Grid>
                )}
            </Box>
        );
    }

    return (
        <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
            <TableContainer>
                <Table sx={{ minWidth: 800 }}>
                    <TableHead sx={{ bgcolor: 'grey.50' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 700 }}>Title</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Content</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Priority</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Created At</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
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
