import { useState, useEffect } from 'react';
import {
    Avatar,
    Box,
    Button,
    Checkbox,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    MenuItem,
    Pagination,
    Stack,
    TextField,
    Typography,
    Alert,
} from '@mui/material';
import {
    Close as CloseIcon,
    PersonAdd as PersonAddIcon,
    Search as SearchIcon,
    Send as SendIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useUsers } from '../../../hooks/useUsers';
import { adminNotificationService } from '../../../services/notification/adminNotificationService';
import { UserStatusEnum } from '../../../types/users/userModel';
import { NotificationPriority, NotificationType } from '../../../types/notifications/notificationModel';
import type { BulkNotificationJob } from '../../../types/notifications/bulkNotificationJob';
import BulkSendProgressDialog from './BulkSendProgressDialog';

// ── Types ─────────────────────────────────────────────────────────

interface SelectedUser {
    id: string;
    email: string;
    displayName: string;
}

interface UserRow {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    userStatus?: string;
    accountType?: string;
}

interface Props {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    /** If provided, dialog acts as a picker — calls this with selected emails instead of sending */
    onSelectionComplete?: (emails: string[]) => void;
}

// ── Component ─────────────────────────────────────────────────────

export default function UserSelectionDialog({ open, onClose, onSuccess, onSelectionComplete }: Props) {
    // ── Search / pagination ────────────────────────────────────
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);

    // ── Selection — store full user objects so emails persist across page changes
    const [selected, setSelected] = useState<Map<string, SelectedUser>>(new Map());

    // ── Notification compose ───────────────────────────────────
    const [composeOpen, setComposeOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [type, setType] = useState<string>(NotificationType.ANNOUNCEMENT);
    const [priority, setPriority] = useState<NotificationPriority>(NotificationPriority.NORMAL);
    const [sendPush, setSendPush] = useState(true);
    const [sendEmail, setSendEmail] = useState(false);
    const [sending, setSending] = useState(false);

    // ── Progress tracking ──────────────────────────────────────
    const [activeJobId, setActiveJobId] = useState<number | null>(null);

    const { enqueueSnackbar } = useSnackbar();

    const { data: usersData, isLoading } = useUsers({
        page,
        size: 10,
        keyword: search || undefined,
        status: UserStatusEnum.ACTIVE,
    });

    // Reset on close
    useEffect(() => {
        if (!open) {
            setSearch('');
            setPage(0);
            setSelected(new Map());
            setComposeOpen(false);
            setTitle('');
            setContent('');
        }
    }, [open]);

    // ── Selection handlers ─────────────────────────────────────
    const toggle = (user: { id: string; email: string; firstName?: string; lastName?: string }) => {
        const displayName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
        setSelected(prev => {
            const next = new Map(prev);
            if (next.has(user.id)) next.delete(user.id);
            else next.set(user.id, { id: user.id, email: user.email, displayName });
            return next;
        });
    };

    const togglePage = () => {
        if (!usersData?.content) return;
        const pageIds = usersData.content.map((u: UserRow) => u.id);
        const allSelected = pageIds.every((id: string) => selected.has(id));
        setSelected(prev => {
            const next = new Map(prev);
            if (allSelected) {
                pageIds.forEach((id: string) => next.delete(id));
            } else {
                usersData.content.forEach((u: UserRow) => {
                    const displayName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email;
                    next.set(u.id, { id: u.id, email: u.email, displayName });
                });
            }
            return next;
        });
    };

    // ── Picker mode ───────────────────────────────────────────
    const handlePick = () => {
        onSelectionComplete?.(Array.from(selected.values()).map(u => u.email));
        onClose();
    };

    // ── Send flow ─────────────────────────────────────────────
    const handleSend = async () => {
        if (!title.trim() || !content.trim()) return;
        const emailList = Array.from(selected.values()).map(u => u.email);
        try {
            setSending(true);
            const job: BulkNotificationJob = await adminNotificationService.sendPushToSpecificUsers(
                emailList,
                {
                    title: title.trim(),
                    content: content.trim(),
                    type,
                    priority,
                    sendPush,
                    sendEmail,
                    sendTelegram: false,
                    sendWebSocket: false,
                }
            );
            setComposeOpen(false);
            setActiveJobId(job.id);
        } catch {
            enqueueSnackbar('Bildirim gönderilemedi', { variant: 'error' });
        } finally {
            setSending(false);
        }
    };

    const handleJobClose = () => {
        setActiveJobId(null);
        setSelected(new Map());
        onSuccess?.();
        onClose();
    };

    const selectedCount = selected.size;
    const pageAllSelected = usersData?.content?.every((u: UserRow) => selected.has(u.id)) ?? false;

    return (
        <>
            {/* ── User list dialog ───────────────────────────── */}
            <Dialog open={open && activeJobId === null} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
                <DialogTitle sx={{ pb: 1 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6" fontWeight={700}>Kullanıcı Seç</Typography>
                        <Chip label={`${selectedCount} seçildi`} color="primary" size="small" />
                    </Stack>
                </DialogTitle>

                <DialogContent sx={{ pt: 1 }}>
                    {/* Search */}
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="İsim veya e-posta ile ara..."
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(0); }}
                        InputProps={{
                            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} fontSize="small" />,
                            endAdornment: search && (
                                <IconButton size="small" onClick={() => { setSearch(''); setPage(0); }}>
                                    <CloseIcon fontSize="small" />
                                </IconButton>
                            ),
                        }}
                        sx={{ mb: 2 }}
                    />

                    {selectedCount > 0 && (
                        <Alert severity="info" sx={{ mb: 2 }}>
                            Tüm sayfalarda <strong>{selectedCount} kullanıcı</strong> seçildi.
                            Sayfa değiştiğinde seçimler korunur.
                        </Alert>
                    )}

                    {/* Page select + count */}
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                        <Button
                            size="small"
                            variant="outlined"
                            startIcon={<PersonAddIcon />}
                            onClick={togglePage}
                            disabled={isLoading || !usersData?.content?.length}
                        >
                            {pageAllSelected ? 'Sayfayı Kaldır' : 'Sayfayı Seç'}
                        </Button>
                        <Typography variant="caption" color="text.secondary">
                            {usersData?.totalElements ?? 0} kullanıcı · Sayfa {page + 1}/{usersData?.totalPages ?? 1}
                        </Typography>
                    </Stack>

                    <Divider sx={{ mb: 1 }} />

                    {/* User list */}
                    {isLoading ? (
                        <Box display="flex" justifyContent="center" py={4}>
                            <CircularProgress size={32} />
                        </Box>
                    ) : (
                        <List dense sx={{ maxHeight: 380, overflow: 'auto' }}>
                            {usersData?.content?.map((user: UserRow) => {
                                const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
                                return (
                                    <ListItem
                                        key={user.id}
                                        button
                                        onClick={() => toggle(user)}
                                        sx={{ borderRadius: 2, mb: 0.5, '&:hover': { bgcolor: 'action.hover' } }}
                                    >
                                        <ListItemIcon sx={{ minWidth: 40 }}>
                                            <Checkbox
                                                edge="start"
                                                checked={selected.has(user.id)}
                                                tabIndex={-1}
                                                disableRipple
                                                size="small"
                                            />
                                        </ListItemIcon>
                                        <Avatar sx={{ mr: 1.5, width: 32, height: 32, fontSize: 13, bgcolor: 'primary.main' }}>
                                            {name.charAt(0).toUpperCase()}
                                        </Avatar>
                                        <ListItemText
                                            primary={<Typography variant="body2" fontWeight={600}>{name}</Typography>}
                                            secondary={
                                                <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap">
                                                    <Typography variant="caption" color="text.secondary">{user.email}</Typography>
                                                    <Chip label={user.userStatus} size="small" color={user.userStatus === 'ACTIVE' ? 'success' : 'default'} sx={{ height: 16, fontSize: 9 }} />
                                                    <Chip label={user.accountType} size="small" variant="outlined" sx={{ height: 16, fontSize: 9 }} />
                                                </Stack>
                                            }
                                        />
                                    </ListItem>
                                );
                            })}
                        </List>
                    )}

                    {usersData?.content?.length === 0 && !isLoading && (
                        <Box textAlign="center" py={4}>
                            <Typography color="text.secondary">
                                {search ? 'Aramanızla eşleşen kullanıcı bulunamadı.' : 'Aktif kullanıcı bulunamadı.'}
                            </Typography>
                        </Box>
                    )}

                    {(usersData?.totalPages ?? 0) > 1 && (
                        <Box display="flex" justifyContent="center" mt={2}>
                            <Pagination
                                count={usersData!.totalPages}
                                page={page + 1}
                                onChange={(_, p) => setPage(p - 1)}
                                color="primary"
                                size="small"
                                showFirstButton
                                showLastButton
                                disabled={isLoading}
                            />
                        </Box>
                    )}
                </DialogContent>

                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={onClose} sx={{ textTransform: 'none' }}>İptal</Button>
                    <Button
                        variant="contained"
                        startIcon={<SendIcon />}
                        disabled={selectedCount === 0}
                        onClick={onSelectionComplete ? handlePick : () => setComposeOpen(true)}
                        sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
                    >
                        {onSelectionComplete ? `Seç (${selectedCount})` : `Devam (${selectedCount} kullanıcı)`}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ── Compose & send dialog ──────────────────────── */}
            <Dialog open={composeOpen} onClose={() => setComposeOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
                <DialogTitle sx={{ fontWeight: 700 }}>
                    {selectedCount} Kullanıcıya Bildirim Gönder
                </DialogTitle>
                <DialogContent>
                    <Alert severity="info" sx={{ mb: 2 }}>
                        Seçili <strong>{selectedCount} kullanıcıya</strong> gönderilecek.
                        Büyük listelerde gönderim arka planda yürütülür ve ilerleme gösterilir.
                    </Alert>

                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            fullWidth
                            label="Bildirim Başlığı"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            required
                            inputProps={{ maxLength: 100 }}
                            helperText={`${title.length}/100`}
                        />
                        <TextField
                            fullWidth
                            label="İçerik"
                            multiline
                            rows={3}
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            required
                            inputProps={{ maxLength: 500 }}
                            helperText={`${content.length}/500`}
                        />
                        <Stack direction="row" spacing={2}>
                            <TextField
                                select
                                fullWidth
                                size="small"
                                label="Tür"
                                value={type}
                                onChange={e => setType(e.target.value)}
                            >
                                <MenuItem value={NotificationType.ANNOUNCEMENT}>Duyuru</MenuItem>
                                <MenuItem value={NotificationType.ALERT}>Uyarı</MenuItem>
                                <MenuItem value={NotificationType.SYSTEM}>Sistem</MenuItem>
                                <MenuItem value={NotificationType.PROMOTION}>Promosyon</MenuItem>
                            </TextField>
                            <TextField
                                select
                                fullWidth
                                size="small"
                                label="Öncelik"
                                value={priority}
                                onChange={e => setPriority(e.target.value as NotificationPriority)}
                            >
                                <MenuItem value={NotificationPriority.LOW}>Düşük</MenuItem>
                                <MenuItem value={NotificationPriority.NORMAL}>Normal</MenuItem>
                                <MenuItem value={NotificationPriority.HIGH}>Yüksek</MenuItem>
                                <MenuItem value={NotificationPriority.URGENT}>Acil</MenuItem>
                            </TextField>
                        </Stack>

                        <Box>
                            <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" mb={0.5}>
                                Kanallar
                            </Typography>
                            <Stack direction="row" spacing={1} flexWrap="wrap">
                                <Chip
                                    label="Push"
                                    color={sendPush ? 'primary' : 'default'}
                                    variant={sendPush ? 'filled' : 'outlined'}
                                    onClick={() => setSendPush(p => !p)}
                                    clickable
                                    size="small"
                                />
                                <Chip
                                    label="E-posta"
                                    color={sendEmail ? 'primary' : 'default'}
                                    variant={sendEmail ? 'filled' : 'outlined'}
                                    onClick={() => setSendEmail(p => !p)}
                                    clickable
                                    size="small"
                                />
                            </Stack>
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setComposeOpen(false)} sx={{ textTransform: 'none' }}>İptal</Button>
                    <Button
                        variant="contained"
                        startIcon={sending ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
                        onClick={handleSend}
                        disabled={sending || !title.trim() || !content.trim() || (!sendPush && !sendEmail)}
                        sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
                    >
                        {sending ? 'Gönderiliyor...' : `${selectedCount} Kullanıcıya Gönder`}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ── Progress tracking dialog ───────────────────── */}
            <BulkSendProgressDialog jobId={activeJobId} onClose={handleJobClose} />
        </>
    );
}
