import React, { useState, useEffect, Dispatch, SetStateAction } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box,
    Typography,
    Alert,
    Chip,
    Divider,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Avatar,
    Checkbox,
    Pagination,
    CircularProgress,
    IconButton
} from '@mui/material';
import {
    Search as SearchIcon,
    Close as CloseIcon,
    PersonAdd as PersonAddIcon,
    Send as SendIcon
} from '@mui/icons-material';
import { useUsers } from '../../../hooks/useUsers';
import { useAdminNotificationActions } from '../../../hooks/notifications/useAdminNotificationActions';
import { UserStatusEnum } from '../../../types/users/userModel';
import { AdminBulkNotificationRequest } from '../../../types/notifications/adminBulkNotificationRequest';
import { createAdminBulkNotificationRequest } from '../../../types/notifications/adminBulkNotificationRequest';
import { NotificationPriority, NotificationType } from '../../../types/notifications/notificationModel';

interface UserSelectionDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    selectedUsers: string[];
    setSelectedUsers: Dispatch<SetStateAction<string[]>>;
    onSelectionComplete?: (selectedEmails: string[]) => void;
}

export default function UserSelectionDialog({
    open,
    onClose,
    onSuccess,
    selectedUsers,
    setSelectedUsers,
    onSelectionComplete
}: UserSelectionDialogProps) {
    // User search and pagination states
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [userPage, setUserPage] = useState(0);
    const [userPageSize] = useState(10);
    
    // User notification dialog states
    const [openUserNotificationDialog, setOpenUserNotificationDialog] = useState(false);
    const [userNotificationData, setUserNotificationData] = useState<Partial<AdminBulkNotificationRequest>>(
        createAdminBulkNotificationRequest({})
    );

    // Hooks
    const { data: usersData, isLoading: usersLoading, refetch: refetchUsers } = useUsers({
        page: userPage,
        size: userPageSize,
        keyword: userSearchTerm,
        status: UserStatusEnum.ACTIVE // Only active users
    });

    const adminActions = useAdminNotificationActions();

    // Debounced search effect for users
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (open) {
                refetchUsers();
            }
        }, 500); // 500ms debounce

        return () => clearTimeout(timeoutId);
    }, [userSearchTerm, userPage, open, refetchUsers]);

    // User selection handlers
    const handleUserSelect = (userId: string) => {
        setSelectedUsers((prev: string[]) => 
            prev.includes(userId) 
                ? prev.filter((id: string) => id !== userId)
                : [...prev, userId]
        );
    };

    const handleSelectAllUsers = () => {
        if (usersData?.content) {
            const currentPageUserIds = usersData.content.map(user => user.id);
            const allCurrentPageSelected = currentPageUserIds.every(id => selectedUsers.includes(id));
            
            if (allCurrentPageSelected) {
                // Remove all current page users from selection
                setSelectedUsers((prev: string[]) => prev.filter((id: string) => !currentPageUserIds.includes(id)));
            } else {
                // Add all current page users to selection
                setSelectedUsers((prev: string[]) => [...new Set([...prev, ...currentPageUserIds])]);
            }
        }
    };

    const handleUserSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setUserSearchTerm(event.target.value);
        setUserPage(0); // Reset to first page when searching
    };

    const handleUserPageChange = (_: React.ChangeEvent<unknown>, newPage: number) => {
        setUserPage(newPage - 1); // MUI Pagination is 1-based, but API is 0-based
    };

    const handleOpenUserNotificationDialog = () => {
        if (selectedUsers.length === 0) {
            return;
        }

        if (onSelectionComplete) {
            const selectedUserEmails = usersData?.content
                ?.filter(user => selectedUsers.includes(user.id))
                .map(user => user.email) || [];
            onSelectionComplete(selectedUserEmails);
            handleClose();
            return;
        }

        setOpenUserNotificationDialog(true);
    };

    const handleCloseUserNotificationDialog = () => {
        setOpenUserNotificationDialog(false);
        setUserNotificationData(createAdminBulkNotificationRequest({}));
    };

    const handleSendToSelectedUsers = async () => {
        try {
            if (selectedUsers.length === 0) {
                return;
            }

            // Get selected user emails
            const selectedUserEmails = usersData?.content
                ?.filter(user => selectedUsers.includes(user.id))
                .map(user => user.email) || [];

            if (selectedUserEmails.length === 0) {
                return;
            }

            // Send notification to selected users via email
            await adminActions.sendNotificationToEmails.mutateAsync({
                emails: selectedUserEmails,
                request: userNotificationData as AdminBulkNotificationRequest
            });

            handleCloseUserNotificationDialog();
            setSelectedUsers([]);
            onSuccess();
        } catch (error) {
            console.error('Error sending notification:', error);
        }
    };

    const handleClose = () => {
        setUserSearchTerm('');
        setUserPage(0);
        setSelectedUsers([]);
        onClose();
    };

    return (
        <>
            {/* User Selection Dialog */}
            <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
                <DialogTitle>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6">Select Users for Notification</Typography>
                        <Chip 
                            label={`${selectedUsers.length} selected`} 
                            color="primary" 
                            size="small"
                        />
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 2 }}>
                        {/* Search Bar */}
                        <TextField
                            fullWidth
                            placeholder="Search users by name or email..."
                            value={userSearchTerm}
                            onChange={handleUserSearchChange}
                            InputProps={{
                                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                                endAdornment: userSearchTerm && (
                                    <IconButton
                                        size="small"
                                        onClick={() => {
                                            setUserSearchTerm('');
                                            setUserPage(0);
                                        }}
                                    >
                                        <CloseIcon />
                                    </IconButton>
                                )
                            }}
                            sx={{ mb: 2 }}
                        />

                        {/* Selection Info */}
                        {selectedUsers.length > 0 && (
                            <Alert severity="info" sx={{ mb: 2 }}>
                                <Typography variant="body2">
                                    {selectedUsers.length} user{selectedUsers.length > 1 ? 's' : ''} selected across all pages
                                </Typography>
                            </Alert>
                        )}

                        {/* Select All Button and Info */}
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                            <Button
                                startIcon={<PersonAddIcon />}
                                onClick={handleSelectAllUsers}
                                variant="outlined"
                                size="small"
                                disabled={usersLoading || !usersData?.content?.length}
                            >
                                {usersData?.content?.every(user => selectedUsers.includes(user.id)) ? 'Deselect Page' : 'Select Page'}
                            </Button>
                            <Box textAlign="right">
                                <Typography variant="body2" color="text.secondary">
                                    {userSearchTerm 
                                        ? `${usersData?.totalElements || 0} users found` 
                                        : `${usersData?.totalElements || 0} total users`
                                    }
                                </Typography>
                                {usersData && usersData.totalPages > 1 && (
                                    <Typography variant="caption" color="text.secondary">
                                        Page {userPage + 1} of {usersData.totalPages}
                                    </Typography>
                                )}
                            </Box>
                        </Box>

                        <Divider sx={{ mb: 2 }} />

                        {/* User List */}
                        {usersLoading ? (
                            <Box display="flex" flexDirection="column" alignItems="center" p={3}>
                                <CircularProgress />
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                                    {userSearchTerm ? 'Searching users...' : 'Loading users...'}
                                </Typography>
                            </Box>
                        ) : (
                            <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                                {usersData?.content?.map((user) => (
                                    <ListItem key={user.id} button onClick={() => handleUserSelect(user.id)}>
                                        <ListItemIcon>
                                            <Checkbox
                                                edge="start"
                                                checked={selectedUsers.includes(user.id)}
                                                tabIndex={-1}
                                                disableRipple
                                            />
                                        </ListItemIcon>
                                        <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                                            {user.firstName?.charAt(0) || user.email?.charAt(0) || 'U'}
                                        </Avatar>
                                        <ListItemText
                                            primary={`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email}
                                            secondary={
                                                <Box>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {user.email}
                                                    </Typography>
                                                    <Box display="flex" gap={1} mt={0.5}>
                                                        <Chip 
                                                            label={user.userStatus} 
                                                            size="small" 
                                                            color={user.userStatus === 'ACTIVE' ? 'success' : 'default'}
                                                        />
                                                        <Chip 
                                                            label={user.accountType} 
                                                            size="small" 
                                                            variant="outlined"
                                                        />
                                                    </Box>
                                                </Box>
                                            }
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        )}

                        {usersData?.content?.length === 0 && !usersLoading && (
                            <Box textAlign="center" py={4}>
                                <Typography variant="body1" color="text.secondary">
                                    {userSearchTerm ? 'No users found matching your search' : 'No active users found'}
                                </Typography>
                            </Box>
                        )}

                        {/* Pagination */}
                        {usersData && usersData.totalPages > 1 && (
                            <Box display="flex" justifyContent="center" mt={2}>
                                <Pagination
                                    count={usersData.totalPages}
                                    page={userPage + 1} // MUI Pagination is 1-based
                                    onChange={handleUserPageChange}
                                    color="primary"
                                    showFirstButton
                                    showLastButton
                                    disabled={usersLoading}
                                />
                            </Box>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>Cancel</Button>
                    <Button 
                        onClick={handleOpenUserNotificationDialog}
                        variant="contained"
                        disabled={selectedUsers.length === 0}
                        startIcon={<SendIcon />}
                    >
                        {onSelectionComplete ? 'Select' : 'Continue'} ({selectedUsers.length} users)
                    </Button>
                </DialogActions>
            </Dialog>

            {/* User Notification Dialog */}
            <Dialog open={openUserNotificationDialog} onClose={handleCloseUserNotificationDialog} maxWidth="sm" fullWidth>
                <DialogTitle>Send Notification to Selected Users</DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 2 }}>
                        {/* Selected users summary */}
                        <Alert severity="info" sx={{ mb: 3 }}>
                            <Typography variant="body2">
                                Sending to {selectedUsers.length} selected users
                            </Typography>
                        </Alert>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <TextField
                                fullWidth
                                label="Notification Title"
                                value={userNotificationData.title || ''}
                                onChange={(e) => setUserNotificationData({ ...userNotificationData, title: e.target.value })}
                                required
                            />

                            <TextField
                                fullWidth
                                label="Content"
                                multiline
                                rows={4}
                                value={userNotificationData.content || ''}
                                onChange={(e) => setUserNotificationData({ ...userNotificationData, content: e.target.value })}
                                required
                            />

                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <TextField
                                    select
                                    fullWidth
                                    label="Type"
                                    value={userNotificationData.type || ''}
                                    onChange={(e) => setUserNotificationData({ ...userNotificationData, type: e.target.value })}
                                    SelectProps={{ native: true }}
                                >
                                    <option value="">Select Type</option>
                                    <option value={NotificationType.SYSTEM}>System</option>
                                    <option value={NotificationType.PROMOTION}>Promotion</option>
                                    <option value={NotificationType.ANNOUNCEMENT}>Announcement</option>
                                    <option value={NotificationType.ALERT}>Alert</option>
                                </TextField>

                                <TextField
                                    select
                                    fullWidth
                                    label="Priority"
                                    value={userNotificationData.priority || NotificationPriority.NORMAL}
                                    onChange={(e) => setUserNotificationData({ ...userNotificationData, priority: e.target.value as NotificationPriority })}
                                    SelectProps={{ native: true }}
                                >
                                    <option value={NotificationPriority.LOW}>Low</option>
                                    <option value={NotificationPriority.NORMAL}>Normal</option>
                                    <option value={NotificationPriority.HIGH}>High</option>
                                    <option value={NotificationPriority.URGENT}>Urgent</option>
                                </TextField>
                            </Box>

                            {/* Channel Selection */}
                            <Box>
                                <Typography variant="subtitle2" gutterBottom>
                                    Delivery Channels
                                </Typography>
                                <Box display="flex" flexWrap="wrap" gap={2}>
                                    <Chip
                                        label="Push Notification"
                                        color={userNotificationData.sendPush ? "primary" : "default"}
                                        variant={userNotificationData.sendPush ? "filled" : "outlined"}
                                        onClick={() => setUserNotificationData({ ...userNotificationData, sendPush: !userNotificationData.sendPush })}
                                        clickable
                                    />
                                    <Chip
                                        label="Email"
                                        color={userNotificationData.sendEmail ? "primary" : "default"}
                                        variant={userNotificationData.sendEmail ? "filled" : "outlined"}
                                        onClick={() => setUserNotificationData({ ...userNotificationData, sendEmail: !userNotificationData.sendEmail })}
                                        clickable
                                    />
                                    <Chip
                                        label="WebSocket"
                                        color={userNotificationData.sendWebSocket ? "primary" : "default"}
                                        variant={userNotificationData.sendWebSocket ? "filled" : "outlined"}
                                        onClick={() => setUserNotificationData({ ...userNotificationData, sendWebSocket: !userNotificationData.sendWebSocket })}
                                        clickable
                                    />
                                    <Chip
                                        label="Telegram"
                                        color={userNotificationData.sendTelegram ? "primary" : "default"}
                                        variant={userNotificationData.sendTelegram ? "filled" : "outlined"}
                                        onClick={() => setUserNotificationData({ ...userNotificationData, sendTelegram: !userNotificationData.sendTelegram })}
                                        clickable
                                    />
                                </Box>
                            </Box>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseUserNotificationDialog}>Cancel</Button>
                    <Button 
                        onClick={handleSendToSelectedUsers}
                        variant="contained"
                        disabled={!userNotificationData.title || !userNotificationData.content || !userNotificationData.type}
                        startIcon={<SendIcon />}
                    >
                        Send to {selectedUsers.length} Users
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
