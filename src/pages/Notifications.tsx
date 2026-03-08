import React, { useState, useEffect } from 'react';
import {
    Tabs,
    Tab,
    Box,
    Pagination,
    TextField,
    Button,
    MenuItem,
    Typography,
    Stack,
    Divider,
} from '@mui/material';
import {
    Notifications as NotificationsIcon,
    Warning as WarningIcon,
    VisibilityOff as VisibilityOffIcon,
    Send as SendIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';

import { PageContainer, PageHeader, PageSection } from '../components/Page';
import { FilterBar } from '../components/Filter';

import NotificationStats from './Notifications/components/NotificationStats';
import NotificationList from './Notifications/components/NotificationList';
import EnhancedNotificationDialog from './Notifications/components/EnhancedNotificationDialog';

import { useNotificationQueries } from '../hooks/notifications/useNotificationQueries';
import { useNotificationActions } from '../hooks/notifications/useNotificationActions';
import { useAdminNotificationStats } from '../hooks/notifications/useAdminNotificationQueries';
import { useAdminNotificationActions } from '../hooks/notifications/useAdminNotificationActions';
import { useAuthStore } from '../store/authStore';

import {
    NotificationDto,
    NotificationPriority,
} from '../types/notifications/notificationModel';
import { AdminBulkNotificationRequest, createAdminBulkNotificationRequest } from '../types/notifications/adminBulkNotificationRequest';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`notification-tabpanel-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ py: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

export default function Notifications() {
    const { enqueueSnackbar } = useSnackbar();

    // UI State
    const [tabValue, setTabValue] = useState(0);
    const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');
    const [filterPriority, setFilterPriority] = useState<NotificationPriority | 'all'>('all');
    const [searchTerm, setSearchTerm] = useState('');

    // Unified Dialog State
    const [openAdminDialog, setOpenAdminDialog] = useState(false);
    const [adminFormData, setAdminFormData] = useState<Partial<AdminBulkNotificationRequest>>(
        createAdminBulkNotificationRequest({})
    );

    // Hooks
    const {
        notifications,
        unreadCount,
        loading,
        error,
        currentPage,
        totalPages,
        getUserNotificationsPageable,
        getUnreadCount,
    } = useNotificationQueries();

    const { markAsRead } = useNotificationActions();
    const { data: statsResponse, isLoading: statsLoading, refetch: refetchStats } = useAdminNotificationStats();
    const adminActions = useAdminNotificationActions();
    const user = useAuthStore((state) => state.user);

    // Effects
    useEffect(() => {
        if (user?.id) {
            getUserNotificationsPageable(user.id);
            getUnreadCount(user.id);
        }
        refetchStats();
    }, [user?.id]);

    const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    const handleOpenAdminDialog = () => {
        setAdminFormData(createAdminBulkNotificationRequest({}));
        setOpenAdminDialog(true);
    };

    const handleCloseAdminDialog = () => {
        setOpenAdminDialog(false);
    };

    const handleOpenDialog = (notification?: NotificationDto) => {
        if (notification) {
            enqueueSnackbar(`${notification.title} - ${notification.content}`, { variant: 'info' });
        } else {
            handleOpenAdminDialog();
        }
    };

    const handleAdminSubmit = async (request: AdminBulkNotificationRequest) => {
        try {
            if (request.emailList && request.emailList.length > 0) {
                await adminActions.sendNotificationToEmails.mutateAsync({ emails: request.emailList, request });
            } else {
                await adminActions.sendMultiChannelNotification.mutateAsync({ request, recipientType: request.recipientType });
            }

            handleCloseAdminDialog();
            refetchStats();
            enqueueSnackbar('Bildirim başarıyla gönderildi!', { variant: 'success' });
        } catch (error) {
            enqueueSnackbar(`Hata: ${error instanceof Error ? error.message : 'Gönderim başarısız'}`, { variant: 'error' });
        }
    };

    const handlePageChange = (_: React.ChangeEvent<unknown>, value: number) => {
        if (user?.id) getUserNotificationsPageable(user.id, value - 1);
    };

    if (error) {
        return (
            <PageContainer>
                <Box p={3} textAlign="center">
                    <Typography color="error">Hata: {error}</Typography>
                    <Button variant="contained" onClick={() => refetchStats()} sx={{ mt: 2 }}>Tekrar Dene</Button>
                </Box>
            </PageContainer>
        );
    }

    return (
        <PageContainer>
            <PageHeader
                title="Bildirim ve Yayın Merkezi"
                subtitle="Kullanıcılara Push, Email, WebSocket kanallarından anında ulaşın"
                breadcrumbs={[
                    { label: 'Dashboard', href: '/' },
                    { label: 'Bildirimler', active: true },
                ]}
                actions={
                    <Button
                        variant="contained"
                        startIcon={<SendIcon />}
                        onClick={handleOpenAdminDialog}
                        size="large"
                        sx={{ borderRadius: 2, boxShadow: 3, fontWeight: 'bold' }}
                    >
                        Yeni Bildirim Gönder
                    </Button>
                }
            />

            <NotificationStats stats={statsResponse} loading={statsLoading} />

            <PageSection>
                <FilterBar
                    search={{
                        value: searchTerm,
                        onChange: setSearchTerm,
                        placeholder: "Başlık veya içeriğe göre ara...",
                    }}
                    sx={{ mb: 2 }}
                    filters={
                        <Stack direction="row" spacing={2} alignItems="center">
                            <TextField
                                select
                                size="small"
                                value={filterPriority}
                                onChange={(e) => setFilterPriority(e.target.value as any)}
                                sx={{ minWidth: 150 }}
                            >
                                <MenuItem value="all">Tüm Öncelikler</MenuItem>
                                {Object.values(NotificationPriority).map(p => (
                                    <MenuItem key={p} value={p}>{p}</MenuItem>
                                ))}
                            </TextField>
                            <Divider orientation="vertical" flexItem />
                            <Typography variant="body2" color="text.secondary">
                                <strong>{unreadCount || 0}</strong> okunmamış
                            </Typography>
                        </Stack>
                    }
                />

                <Tabs
                    value={tabValue}
                    onChange={handleTabChange}
                    sx={{
                        borderBottom: 1,
                        borderColor: 'divider',
                        mb: 0,
                        '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 }
                    }}
                >
                    <Tab label="Tüm Bildirimler" icon={<NotificationsIcon fontSize="small" />} iconPosition="start" />
                    <Tab label="Yüksek Öncelikli" icon={<WarningIcon fontSize="small" />} iconPosition="start" />
                    <Tab label="Okunmayanlar" icon={<VisibilityOffIcon fontSize="small" />} iconPosition="start" />
                </Tabs>

                <TabPanel value={tabValue} index={0}>
                    <NotificationList
                        notifications={notifications || []}
                        loading={loading}
                        viewMode={viewMode}
                        searchTerm={searchTerm}
                        filterPriority={filterPriority}
                        onMarkAsRead={markAsRead}
                        onOpenDialog={handleOpenDialog}
                    />
                </TabPanel>

                <TabPanel value={tabValue} index={1}>
                    <NotificationList
                        notifications={(notifications || []).filter((n: NotificationDto) => n.priority === NotificationPriority.HIGH || n.priority === NotificationPriority.URGENT)}
                        loading={loading}
                        viewMode={viewMode}
                        searchTerm={searchTerm}
                        filterPriority={filterPriority}
                        onMarkAsRead={markAsRead}
                        onOpenDialog={handleOpenDialog}
                    />
                </TabPanel>

                <TabPanel value={tabValue} index={2}>
                    <NotificationList
                        notifications={(notifications || []).filter((n: NotificationDto) => !n.isRead)}
                        loading={loading}
                        viewMode={viewMode}
                        searchTerm={searchTerm}
                        filterPriority={filterPriority}
                        onMarkAsRead={markAsRead}
                        onOpenDialog={handleOpenDialog}
                    />
                </TabPanel>

                {totalPages > 1 && (
                    <Box display="flex" justifyContent="center" sx={{ mt: 4, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                        <Pagination
                            count={totalPages}
                            page={currentPage + 1}
                            onChange={handlePageChange}
                            color="primary"
                            shape="rounded"
                        />
                    </Box>
                )}
            </PageSection>

            <EnhancedNotificationDialog
                open={openAdminDialog}
                onClose={handleCloseAdminDialog}
                initialData={adminFormData}
                onSubmit={handleAdminSubmit}
            />
        </PageContainer>
    );
}