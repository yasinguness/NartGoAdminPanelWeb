import React, { useState, useEffect, useMemo } from 'react';
import {
    Tabs,
    Tab,
    Box,
    Pagination,
    Grid,
    TextField,
    Button,
    Menu,
    MenuItem,
    ListItemIcon,
    Typography,
    Stack,
    Divider,
} from '@mui/material';
import {
    Add as AddIcon,
    Email as EmailIcon,
    Notifications as NotificationsIcon,
    People as PeopleIcon,
    Warning as WarningIcon,
    Schedule as ScheduleIcon,
    Dashboard as DashboardIcon,
    VisibilityOff as VisibilityOffIcon,
    KeyboardArrowDown as KeyboardArrowDownIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';

// Standardized components
import { PageContainer, PageHeader, PageSection } from '../../components/Page';
import { FilterBar } from '../../components/Filter';

// Local Components
import NotificationStats from './components/NotificationStats';
import NotificationList from './components/NotificationList';
import NotificationDialogs from './components/NotificationDialogs';
import EnhancedNotificationDialog from './components/EnhancedNotificationDialog';

// Hooks
import { useNotificationQueries } from '../../hooks/notifications/useNotificationQueries';
import { useNotificationActions } from '../../hooks/notifications/useNotificationActions';
import { useEmailActions } from '../../hooks/notifications/useEmailActions';
import { useAdminNotificationStats } from '../../hooks/notifications/useAdminNotificationQueries';
import { useAdminNotificationActions } from '../../hooks/notifications/useAdminNotificationActions';
import { useAuthStore } from '../../store/authStore';

// Types
import { 
    NotificationDto, 
    NotificationPriority, 
    NotificationType,
    NotificationTemplate,
    EmailMessage 
} from '../../types/notifications/notificationModel';
import { AdminBulkNotificationRequest, RecipientType } from '../../types/notifications/adminBulkNotificationRequest';
import { createAdminBulkNotificationRequest } from '../../types/notifications/adminBulkNotificationRequest';

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
            aria-labelledby={`notification-tab-${index}`}
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

export default function NotificationsRefactored() {
    const { enqueueSnackbar } = useSnackbar();
    
    // UI State
    const [tabValue, setTabValue] = useState(0);
    const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');
    const [filterPriority, setFilterPriority] = useState<NotificationPriority | 'all'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    // Dialog States
    const [openDialog, setOpenDialog] = useState(false);
    const [openEmailDialog, setOpenEmailDialog] = useState(false);
    const [openAdminDialog, setOpenAdminDialog] = useState(false);
    const [showPriorityInfo, setShowPriorityInfo] = useState(false);
    // const [openUserDialog, setOpenUserDialog] = useState(false); // Removed as per instruction

    // Form Data States
    const [selectedNotification, setSelectedNotification] = useState<NotificationDto | null>(null);
    const [formData, setFormData] = useState<Partial<NotificationDto>>({});
    const [emailData, setEmailData] = useState<Partial<EmailMessage>>({});
    const [adminFormData, setAdminFormData] = useState<Partial<AdminBulkNotificationRequest>>(
        createAdminBulkNotificationRequest({})
    );

    // Template and Priority States
    const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | ''>('');
    const [additionalFormData, setAdditionalFormData] = useState<any>({});
    const [useUrlEndpoint, setUseUrlEndpoint] = useState(false);
    const [selectedPriorityScenario, setSelectedPriorityScenario] = useState<any>(null);

    // User Selection States
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

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

    const { createNotification, markAsRead } = useNotificationActions();
    const { sendEmail } = useEmailActions();
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

    // Handlers
    const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    const handleOpenDialog = (notification?: NotificationDto) => {
        if (notification) {
            setSelectedNotification(notification);
            setFormData(notification);
        } else {
            setSelectedNotification(null);
            setFormData({});
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setSelectedNotification(null);
        setFormData({});
    };

    const handleSubmit = async () => {
        try {
            await createNotification(formData as NotificationDto);
            handleCloseDialog();
            enqueueSnackbar('Notification created successfully', { variant: 'success' });
        } catch (error) {
            enqueueSnackbar('Error creating notification', { variant: 'error' });
        }
    };

    const handleOpenEmailDialog = () => {
        setOpenEmailDialog(true);
    };

    const handleCloseEmailDialog = () => {
        setOpenEmailDialog(false);
        setEmailData({});
    };

    const handleSendEmail = async () => {
        try {
            await sendEmail(emailData as EmailMessage);
            handleCloseEmailDialog();
            enqueueSnackbar('Email sent successfully', { variant: 'success' });
        } catch (error) {
            enqueueSnackbar('Error sending email', { variant: 'error' });
        }
    };

    const handleOpenAdminDialog = () => {
        setAdminFormData(createAdminBulkNotificationRequest({}));
        setOpenAdminDialog(true);
    };

    const handleCloseAdminDialog = () => {
        setOpenAdminDialog(false);
        setAdminFormData(createAdminBulkNotificationRequest({}));
        setSelectedTemplate('');
        setAdditionalFormData({});
        setUseUrlEndpoint(false);
        setSelectedPriorityScenario(null);
        setShowPriorityInfo(false);
    };

    const handleAdminSubmit = async (action: string) => {
        try {
            const convertToISO = (dateTimeString: string) => {
                if (!dateTimeString) return undefined;
                try {
                    const date = new Date(dateTimeString);
                    if (isNaN(date.getTime())) return undefined;
                    return date.toISOString();
                } catch (error) {
                    return undefined;
                }
            };

            const formattedAdditionalData = {
                ...additionalFormData,
                eventTime: convertToISO(additionalFormData.eventTime),
                validUntil: convertToISO(additionalFormData.validUntil)
            };

            const request = {
                ...adminFormData,
                templateCode: selectedTemplate || adminFormData.templateCode,
                additionalData: selectedTemplate ? formattedAdditionalData : undefined,
                startTime: selectedTemplate === NotificationTemplate.SYSTEM_MAINTENANCE 
                    ? convertToISO(additionalFormData.maintenanceStartTime)
                    : undefined,
                endTime: selectedTemplate === NotificationTemplate.SYSTEM_MAINTENANCE 
                    ? convertToISO(additionalFormData.maintenanceEndTime)
                    : undefined
            } as AdminBulkNotificationRequest;

            if (selectedTemplate === NotificationTemplate.SYSTEM_MAINTENANCE) {
                if (!request.startTime || !request.endTime) {
                    enqueueSnackbar('System maintenance requires both start and end times', { variant: 'error' });
                    return;
                }
            }
            
            if (action === 'sendBulkNotificationCustom') {
                if (adminFormData.emailList && adminFormData.emailList.length > 0) {
                    if (useUrlEndpoint) {
                        await adminActions.sendNotificationToEmailsUrl.mutateAsync({ emails: adminFormData.emailList, request });
                    } else {
                        await adminActions.sendNotificationToEmails.mutateAsync({ emails: adminFormData.emailList, request });
                    }
                } else {
                    await adminActions.sendMultiChannelNotification.mutateAsync({ request, recipientType: adminFormData.recipientType });
                }
            }
            
            handleCloseAdminDialog();
            refetchStats();
            enqueueSnackbar('Notification sent successfully', { variant: 'success' });
        } catch (error) {
            enqueueSnackbar(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, { variant: 'error' });
        }
    };

    // User Selection Handlers
    const handleOpenUserDialog = () => {
        // setOpenUserDialog(true); // Removed as per instruction
        setSelectedUsers([]);
        // This action will now open the EnhancedNotificationDialog with recipientType set to specific users
        setAdminFormData(createAdminBulkNotificationRequest({ recipientType: RecipientType.SPECIFIC_USERS }));
        setOpenAdminDialog(true);
    };

    const handleUserSelectionSuccess = () => {
        refetchStats();
        enqueueSnackbar('Notification sent successfully to selected users', { variant: 'success' });
    };

    const renderTemplateFields = () => {
        // Helper function to format datetime for display
        const formatDateTimeForDisplay = (dateTimeString: string) => {
            if (!dateTimeString) return '';
            // If it's already in ISO format, convert to datetime-local format
            if (dateTimeString.includes('T') && dateTimeString.length > 16) {
                return dateTimeString.slice(0, 16);
            }
            return dateTimeString;
        };

        switch (selectedTemplate) {
            case NotificationTemplate.EVENT_REMINDER:
                return (
                    <>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Event Title"
                                value={additionalFormData.eventTitle || ''}
                                onChange={(e) => setAdditionalFormData({ ...additionalFormData, eventTitle: e.target.value })}
                                margin="normal"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Organizer Name"
                                value={additionalFormData.organizerName || ''}
                                onChange={(e) => setAdditionalFormData({ ...additionalFormData, organizerName: e.target.value })}
                                margin="normal"
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Event Description"
                                multiline
                                rows={2}
                                value={additionalFormData.eventDescription || ''}
                                onChange={(e) => setAdditionalFormData({ ...additionalFormData, eventDescription: e.target.value })}
                                margin="normal"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Event Date"
                                type="datetime-local"
                                value={formatDateTimeForDisplay(additionalFormData.eventTime || '')}
                                onChange={(e) => setAdditionalFormData({ ...additionalFormData, eventTime: e.target.value })}
                                margin="normal"
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                    </>
                );

            case NotificationTemplate.SYSTEM_MAINTENANCE:
                return (
                    <>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Start Time"
                                type="datetime-local"
                                value={formatDateTimeForDisplay(additionalFormData.maintenanceStartTime || '')}
                                onChange={(e) => setAdditionalFormData({ ...additionalFormData, maintenanceStartTime: e.target.value })}
                                margin="normal"
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="End Time"
                                type="datetime-local"
                                value={formatDateTimeForDisplay(additionalFormData.maintenanceEndTime || '')}
                                onChange={(e) => setAdditionalFormData({ ...additionalFormData, maintenanceEndTime: e.target.value })}
                                margin="normal"
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Affected Services"
                                value={additionalFormData.affectedServices?.join(', ') || ''}
                                onChange={(e) => setAdditionalFormData({ 
                                    ...additionalFormData, 
                                    affectedServices: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                                })}
                                margin="normal"
                                placeholder="API, Web Uygulaması, Mobil Uygulama"
                            />
                        </Grid>
                    </>
                );

            case NotificationTemplate.PROMOTION:
                return (
                    <>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Discount Code"
                                value={additionalFormData.discountCode || ''}
                                onChange={(e) => setAdditionalFormData({ ...additionalFormData, discountCode: e.target.value })}
                                margin="normal"
                                placeholder="SAVE20"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Discount Percentage"
                                type="number"
                                value={additionalFormData.discountPercentage || ''}
                                onChange={(e) => setAdditionalFormData({ ...additionalFormData, discountPercentage: Number(e.target.value) })}
                                margin="normal"
                                InputProps={{ endAdornment: '%' }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Validity Date"
                                type="datetime-local"
                                value={formatDateTimeForDisplay(additionalFormData.validUntil || '')}
                                onChange={(e) => setAdditionalFormData({ ...additionalFormData, validUntil: e.target.value })}
                                margin="normal"
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                    </>
                );

            default:
                return null;
        }
    };

    // Template handlers
    const handleSystemMaintenanceTemplate = () => {
        // Set default times (next hour for start, 2 hours later for end)
        const now = new Date();
        const startTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
        const endTime = new Date(now.getTime() + 3 * 60 * 60 * 1000); // 3 hours from now
        
        setAdminFormData(createAdminBulkNotificationRequest({
            title: 'System Maintenance',
            content: 'Planned maintenance work.',
            type: NotificationType.SYSTEM_MAINTENANCE,
            priority: NotificationPriority.HIGH,
            sendPush: true,
            sendEmail: true,
            sendWebSocket: true,
            recipientType: RecipientType.ALL
        }));
        setSelectedTemplate(NotificationTemplate.SYSTEM_MAINTENANCE);
        setAdditionalFormData({
            maintenanceStartTime: startTime.toISOString().slice(0, 16), // Format for datetime-local
            maintenanceEndTime: endTime.toISOString().slice(0, 16), // Format for datetime-local
            affectedServices: [],
            statusPageUrl: ''
        });
        setOpenAdminDialog(true);
    };

    const handleEventReminderTemplate = () => {
        // Set default time (tomorrow at 10 AM)
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(10, 0, 0, 0);
        
        setAdminFormData(createAdminBulkNotificationRequest({
            title: 'Event Reminder',
            content: 'Don\'t forget our upcoming event!',
            type: NotificationType.EVENT_REMINDER,
            priority: NotificationPriority.NORMAL,
            sendPush: true,
            sendEmail: true,
            recipientType: RecipientType.REGISTERED
        }));
        setSelectedTemplate(NotificationTemplate.EVENT_REMINDER);
        setAdditionalFormData({
            eventTitle: '',
            eventDescription: '',
            eventTime: tomorrow.toISOString().slice(0, 16), // Format for datetime-local
            organizerName: ''
        });
        setOpenAdminDialog(true);
    };

    const handlePageChange = (_: React.ChangeEvent<unknown>, value: number) => {
        if (user?.id) getUserNotificationsPageable(user.id, value - 1);
    };

    const quickActions = [
        { label: 'Target Specific Users', icon: <PeopleIcon fontSize="small" />, onClick: handleOpenUserDialog },
        { label: 'System Maintenance', icon: <WarningIcon fontSize="small" />, onClick: handleSystemMaintenanceTemplate },
        { label: 'Event Reminder', icon: <ScheduleIcon fontSize="small" />, onClick: handleEventReminderTemplate },
        { label: 'Admin Dashboard', icon: <DashboardIcon fontSize="small" />, onClick: handleOpenAdminDialog },
        { label: 'Direct Email', icon: <EmailIcon fontSize="small" />, onClick: handleOpenEmailDialog },
    ];

    if (error) {
        return (
            <PageContainer>
                <Box p={3} textAlign="center">
                    <Typography color="error">Error: {error}</Typography>
                    <Button onClick={() => refetchStats()} sx={{ mt: 2 }}>Retry</Button>
                </Box>
            </PageContainer>
        );
    }

    return (
        <PageContainer>
            <PageHeader
                title="Notification Center"
                subtitle="Manage and broadcast system-wide alerts, push notifications, and emails"
                breadcrumbs={[
                    { label: 'Dashboard', path: '/' },
                    { label: 'Notifications', active: true },
                ]}
                actions={
                    <Stack direction="row" spacing={2}>
                        <Button
                            variant="outlined"
                            endIcon={<KeyboardArrowDownIcon />}
                            onClick={(e) => setAnchorEl(e.currentTarget)}
                        >
                            Quick Actions
                        </Button>
                        <Menu
                            anchorEl={anchorEl}
                            open={Boolean(anchorEl)}
                            onClose={() => setAnchorEl(null)}
                            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                        >
                            {quickActions.map((action, i) => (
                                <MenuItem key={i} onClick={() => { action.onClick(); setAnchorEl(null); }}>
                                    <ListItemIcon>{action.icon}</ListItemIcon>
                                    <Typography variant="body2">{action.label}</Typography>
                                </MenuItem>
                            ))}
                        </Menu>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => handleOpenDialog()}
                        >
                            Create Priority Alert
                        </Button>
                    </Stack>
                }
            />

            <NotificationStats stats={statsResponse} loading={statsLoading} />

            <PageSection>
                <FilterBar
                    search={{
                        value: searchTerm,
                        onChange: setSearchTerm,
                        placeholder: "Search by title or content...",
                    }}
                    sx={{ mb: 2 }}
                >
                    <Stack direction="row" spacing={2} alignItems="center">
                        <TextField
                            select
                            size="small"
                            value={filterPriority}
                            onChange={(e) => setFilterPriority(e.target.value as any)}
                            sx={{ minWidth: 150 }}
                        >
                            <MenuItem value="all">All Priorities</MenuItem>
                            {Object.values(NotificationPriority).map(p => (
                                <MenuItem key={p} value={p}>{p}</MenuItem>
                            ))}
                        </TextField>
                        <Divider orientation="vertical" flexItem />
                        <Typography variant="body2" color="text.secondary">
                            <strong>{unreadCount || 0}</strong> unread
                        </Typography>
                    </Stack>
                </FilterBar>

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
                    <Tab label="All Inbox" icon={<NotificationsIcon fontSize="small" />} iconPosition="start" />
                    <Tab label="Urgent & High" icon={<WarningIcon fontSize="small" />} iconPosition="start" />
                    <Tab label="Unread Only" icon={<VisibilityOffIcon fontSize="small" />} iconPosition="start" />
                </Tabs>

                <TabPanel value={tabValue} index={0}>
                    <NotificationList
                        notifications={notifications || []}
                        loading={loading}
                        viewMode={viewMode}
                        searchTerm={searchTerm}
                        filterPriority={filterPriority}
                        onOpenDialog={handleOpenDialog}
                        onMarkAsRead={markAsRead}
                    />
                </TabPanel>

                <TabPanel value={tabValue} index={1}>
                    <NotificationList
                        notifications={(notifications || []).filter((n: NotificationDto) => n.priority === NotificationPriority.HIGH || n.priority === NotificationPriority.URGENT)}
                        loading={loading}
                        viewMode={viewMode}
                        searchTerm={searchTerm}
                        filterPriority={filterPriority}
                        onOpenDialog={handleOpenDialog}
                        onMarkAsRead={markAsRead}
                    />
                </TabPanel>

                <TabPanel value={tabValue} index={2}>
                    <NotificationList
                        notifications={(notifications || []).filter((n: NotificationDto) => !n.isRead)}
                        loading={loading}
                        viewMode={viewMode}
                        searchTerm={searchTerm}
                        filterPriority={filterPriority}
                        onOpenDialog={handleOpenDialog}
                        onMarkAsRead={markAsRead}
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

            {/* Dialogs */}
            <NotificationDialogs
                // Basic Dialog
                openDialog={openDialog}
                selectedNotification={selectedNotification}
                formData={formData}
                setFormData={setFormData}
                handleCloseDialog={handleCloseDialog}
                handleSubmit={handleSubmit}

                // Email Dialog
                openEmailDialog={openEmailDialog}
                emailData={emailData}
                setEmailData={setEmailData}
                handleCloseEmailDialog={handleCloseEmailDialog}
                handleSendEmail={handleSendEmail}

                // Admin Dialog (Note: This is now handled by EnhancedNotificationDialog, but props are kept for NotificationDialogs if it's still used for other purposes)
                openAdminDialog={false} // This should be false as EnhancedNotificationDialog is used
                adminFormData={adminFormData}
                setAdminFormData={setAdminFormData}
                selectedTemplate={selectedTemplate}
                setSelectedTemplate={setSelectedTemplate}
                additionalFormData={additionalFormData}
                setAdditionalFormData={setAdditionalFormData}
                useUrlEndpoint={useUrlEndpoint}
                setUseUrlEndpoint={setUseUrlEndpoint}
                handleCloseAdminDialog={handleCloseAdminDialog}
                handleAdminSubmit={handleAdminSubmit}
                renderTemplateFields={renderTemplateFields}

                // Priority Scenario
                showPriorityInfo={showPriorityInfo}
                setShowPriorityInfo={setShowPriorityInfo}
                selectedPriorityScenario={selectedPriorityScenario}
            />

            {/* Enhanced Admin Notification Dialog */}
            <EnhancedNotificationDialog
                open={openAdminDialog}
                onClose={handleCloseAdminDialog}
                initialData={adminFormData}
                onSubmit={async (request) => {
                    // Update adminFormData with the final request before submitting
                    setAdminFormData(request);
                    await handleAdminSubmit('sendBulkNotificationCustom');
                }}
            />
        </PageContainer>
    );
}
