import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Alert,
    Box,
    Chip,
    CircularProgress,
    Divider,
    IconButton,
    InputAdornment,
    MenuItem,
    Pagination,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
    alpha,
    useTheme,
} from '@mui/material';
import {
    Block as BlockIcon,
    CheckCircle as CheckCircleIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    Notifications as NotifIcon,
    Person as PersonIcon,
    Search as SearchIcon,
    Security as SecurityIcon,
    Close as CloseIcon,
    Article as ArticleIcon,
    FilterList as FilterIcon,
} from '@mui/icons-material';
import { adminAuditService } from '../../services/admin/adminAuditService';
import type { AdminAuditAction, AdminAuditLogEntry } from '../../types/admin/adminAuditLog';
import { PageContainer, PageHeader } from '../../components/Page';

// ── Constants ──────────────────────────────────────────────────────────────

const ACTION_LABELS: Record<AdminAuditAction, string> = {
    USER_BLOCKED: 'Kullanıcı Engellendi',
    USER_UNBLOCKED: 'Engel Kaldırıldı',
    USER_DELETED: 'Kullanıcı Silindi',
    USER_ROLE_ADDED: 'Rol Eklendi',
    USER_ROLE_REMOVED: 'Rol Kaldırıldı',
    USER_NOTE_ADDED: 'Not Eklendi',
    USER_NOTE_DELETED: 'Not Silindi',
    USER_STATUS_CHANGED: 'Durum Değiştirildi',
    CONTENT_ARTICLE_CREATED: 'Makale Oluşturuldu',
    CONTENT_ARTICLE_PUBLISHED: 'Makale Yayınlandı',
    CONTENT_ARTICLE_UNPUBLISHED: 'Makale Yayından Kaldırıldı',
    CONTENT_ARTICLE_DELETED: 'Makale Silindi',
    CONTENT_ARTICLE_UPDATED: 'Makale Güncellendi',
    NOTIFICATION_BULK_SENT: 'Toplu Bildirim Gönderildi',
    NOTIFICATION_CAMPAIGN_CREATED: 'Kampanya Oluşturuldu',
    NOTIFICATION_CAMPAIGN_CANCELLED: 'Kampanya İptal Edildi',
    SETTLEMENT_APPROVED: 'Ödeme Onaylandı',
    SETTLEMENT_REJECTED: 'Ödeme Reddedildi',
    REFUND_ISSUED: 'İade Yapıldı',
    SUBMERCHANT_CREATED: 'Alt Bayi Oluşturuldu',
    SUBMERCHANT_UPDATED: 'Alt Bayi Güncellendi',
    SUBMERCHANT_STATUS_CHANGED: 'Alt Bayi Durumu Değişti',
    GAMIFICATION_RULE_CREATED: 'Kural Oluşturuldu',
    GAMIFICATION_RULE_UPDATED: 'Kural Güncellendi',
    GAMIFICATION_RULE_DELETED: 'Kural Silindi',
    SYSTEM_CONFIG_CHANGED: 'Sistem Ayarı Değişti',
};

const TARGET_TYPE_OPTIONS = [
    { value: '', label: 'Tümü' },
    { value: 'USER', label: 'Kullanıcı' },
    { value: 'USER_NOTE', label: 'Kullanıcı Notu' },
    { value: 'ARTICLE', label: 'Makale' },
    { value: 'NOTIFICATION', label: 'Bildirim' },
    { value: 'SETTLEMENT', label: 'Ödeme' },
    { value: 'SUBMERCHANT', label: 'Alt Bayi' },
];

const ACTION_OPTIONS: { value: string; label: string }[] = [
    { value: '', label: 'Tümü' },
    ...Object.entries(ACTION_LABELS).map(([value, label]) => ({ value, label })),
];

// ── Color helpers ──────────────────────────────────────────────────────────

const actionColor = (action: AdminAuditAction): 'error' | 'warning' | 'success' | 'info' | 'default' => {
    if (action.includes('DELETED') || action.includes('BLOCKED') || action.includes('REJECTED')) return 'error';
    if (action.includes('UPDATED') || action.includes('CHANGED') || action.includes('UNPUBLISHED')) return 'warning';
    if (action.includes('CREATED') || action.includes('PUBLISHED') || action.includes('APPROVED') || action.includes('UNBLOCKED')) return 'success';
    if (action.includes('SENT') || action.includes('NOTE')) return 'info';
    return 'default';
};

const ActionIcon = ({ action }: { action: AdminAuditAction }) => {
    if (action.includes('BLOCKED') || action.includes('DELETED')) return <BlockIcon fontSize="small" />;
    if (action.includes('UNBLOCKED') || action.includes('APPROVED')) return <CheckCircleIcon fontSize="small" />;
    if (action.includes('USER') || action.includes('ROLE')) return <PersonIcon fontSize="small" />;
    if (action.includes('ARTICLE') || action.includes('CONTENT')) return <ArticleIcon fontSize="small" />;
    if (action.includes('NOTIFICATION')) return <NotifIcon fontSize="small" />;
    if (action.includes('UPDATED') || action.includes('CHANGED')) return <EditIcon fontSize="small" />;
    if (action.includes('DELETED')) return <DeleteIcon fontSize="small" />;
    return <SecurityIcon fontSize="small" />;
};

function formatDate(iso: string) {
    return new Date(iso).toLocaleString('tr-TR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
}

// ── Component ──────────────────────────────────────────────────────────────

export default function AuditLog() {
    const theme = useTheme();

    const [page, setPage] = useState(0);
    const [actorEmail, setActorEmail] = useState('');
    const [actorEmailInput, setActorEmailInput] = useState('');
    const [action, setAction] = useState('');
    const [targetType, setTargetType] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    const { data, isLoading, isError } = useQuery({
        queryKey: ['adminAudit', page, actorEmail, action, targetType, fromDate, toDate],
        queryFn: () => adminAuditService.getLogs({
            page,
            size: 25,
            actorEmail: actorEmail || undefined,
            action: (action || undefined) as AdminAuditAction | undefined,
            targetType: targetType || undefined,
            from: fromDate ? new Date(fromDate).toISOString() : undefined,
            to: toDate ? new Date(toDate).toISOString() : undefined,
        }),
    });

    const applySearch = useCallback(() => {
        setActorEmail(actorEmailInput);
        setPage(0);
    }, [actorEmailInput]);

    const clearFilters = () => {
        setActorEmail('');
        setActorEmailInput('');
        setAction('');
        setTargetType('');
        setFromDate('');
        setToDate('');
        setPage(0);
    };

    const hasFilters = actorEmail || action || targetType || fromDate || toDate;

    return (
        <PageContainer>
            <PageHeader
                title="Audit Log"
                subtitle="Admin panel işlem geçmişi — kim, ne zaman, ne yaptı"
                breadcrumbs={[{ label: 'Kontrol Paneli', href: '/dashboard' }, { label: 'Audit Log' }]}
            />

            {/* ── Filter bar ──────────────────────────────────────── */}
            <Paper
                sx={{
                    p: 2.5,
                    mb: 3,
                    borderRadius: 3,
                    background: alpha(theme.palette.primary.main, 0.03),
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                }}
            >
                <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                    <FilterIcon fontSize="small" color="primary" />
                    <Typography variant="subtitle2" fontWeight={700}>Filtreler</Typography>
                    {hasFilters && (
                        <Chip
                            label="Temizle"
                            size="small"
                            onDelete={clearFilters}
                            color="primary"
                            variant="outlined"
                        />
                    )}
                </Stack>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap">
                    {/* Actor email */}
                    <TextField
                        size="small"
                        label="Admin e-posta"
                        value={actorEmailInput}
                        onChange={e => setActorEmailInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && applySearch()}
                        sx={{ minWidth: 200 }}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton size="small" onClick={applySearch}>
                                        <SearchIcon fontSize="small" />
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />

                    {/* Action */}
                    <TextField
                        select
                        size="small"
                        label="İşlem"
                        value={action}
                        onChange={e => { setAction(e.target.value); setPage(0); }}
                        sx={{ minWidth: 200 }}
                    >
                        {ACTION_OPTIONS.map(o => (
                            <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                        ))}
                    </TextField>

                    {/* Target type */}
                    <TextField
                        select
                        size="small"
                        label="Hedef Türü"
                        value={targetType}
                        onChange={e => { setTargetType(e.target.value); setPage(0); }}
                        sx={{ minWidth: 150 }}
                    >
                        {TARGET_TYPE_OPTIONS.map(o => (
                            <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                        ))}
                    </TextField>

                    {/* Date range */}
                    <TextField
                        size="small"
                        label="Başlangıç"
                        type="datetime-local"
                        value={fromDate}
                        onChange={e => { setFromDate(e.target.value); setPage(0); }}
                        InputLabelProps={{ shrink: true }}
                        sx={{ minWidth: 190 }}
                        InputProps={{
                            endAdornment: fromDate ? (
                                <InputAdornment position="end">
                                    <IconButton size="small" onClick={() => setFromDate('')}>
                                        <CloseIcon fontSize="small" />
                                    </IconButton>
                                </InputAdornment>
                            ) : null,
                        }}
                    />
                    <TextField
                        size="small"
                        label="Bitiş"
                        type="datetime-local"
                        value={toDate}
                        onChange={e => { setToDate(e.target.value); setPage(0); }}
                        InputLabelProps={{ shrink: true }}
                        sx={{ minWidth: 190 }}
                        InputProps={{
                            endAdornment: toDate ? (
                                <InputAdornment position="end">
                                    <IconButton size="small" onClick={() => setToDate('')}>
                                        <CloseIcon fontSize="small" />
                                    </IconButton>
                                </InputAdornment>
                            ) : null,
                        }}
                    />
                </Stack>
            </Paper>

            {/* ── Table ──────────────────────────────────────────── */}
            {isLoading && (
                <Box display="flex" justifyContent="center" py={6}>
                    <CircularProgress />
                </Box>
            )}

            {isError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    Audit log yüklenemedi.
                </Alert>
            )}

            {!isLoading && !isError && (
                <>
                    <TableContainer
                        component={Paper}
                        sx={{
                            borderRadius: 3,
                            border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                            mb: 2,
                        }}
                    >
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
                                    <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Tarih / Saat</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Admin</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>İşlem</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Hedef</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Açıklama</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>IP</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {data?.content?.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                                            Kayıt bulunamadı.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {data?.content?.map((entry: AdminAuditLogEntry) => (
                                    <AuditRow key={entry.id} entry={entry} />
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {/* ── Pagination ─────────────────────────────── */}
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="caption" color="text.secondary">
                            Toplam {data?.totalElements ?? 0} kayıt
                        </Typography>
                        {(data?.totalPages ?? 0) > 1 && (
                            <Pagination
                                count={data!.totalPages}
                                page={page + 1}
                                onChange={(_, p) => setPage(p - 1)}
                                color="primary"
                                size="small"
                                showFirstButton
                                showLastButton
                            />
                        )}
                    </Stack>
                </>
            )}
        </PageContainer>
    );
}

// ── Row ────────────────────────────────────────────────────────────────────

function AuditRow({ entry }: { entry: AdminAuditLogEntry }) {
    const color = actionColor(entry.action);

    return (
        <TableRow
            hover
            sx={{
                '&:last-child td': { borderBottom: 0 },
            }}
        >
            {/* Date */}
            <TableCell sx={{ whiteSpace: 'nowrap', fontSize: 12 }}>
                {formatDate(entry.createdAt)}
            </TableCell>

            {/* Actor */}
            <TableCell>
                <Tooltip title={entry.actorDisplayName || entry.actorEmail} placement="top">
                    <Typography variant="body2" noWrap sx={{ maxWidth: 160, fontSize: 13 }}>
                        {entry.actorEmail}
                    </Typography>
                </Tooltip>
            </TableCell>

            {/* Action chip */}
            <TableCell>
                <Chip
                    icon={<ActionIcon action={entry.action} />}
                    label={ACTION_LABELS[entry.action] ?? entry.action}
                    color={color}
                    size="small"
                    variant="outlined"
                    sx={{ fontWeight: 600, fontSize: 11 }}
                />
            </TableCell>

            {/* Target */}
            <TableCell>
                <Stack spacing={0.2}>
                    {entry.targetType && (
                        <Chip label={entry.targetType} size="small" variant="outlined" sx={{ height: 18, fontSize: 10, width: 'fit-content' }} />
                    )}
                    {entry.targetId && (
                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: 11 }}>
                            {entry.targetId.length > 20 ? entry.targetId.slice(0, 18) + '…' : entry.targetId}
                        </Typography>
                    )}
                </Stack>
            </TableCell>

            {/* Description */}
            <TableCell sx={{ maxWidth: 260 }}>
                <Typography variant="body2" fontSize={12} sx={{ wordBreak: 'break-word' }}>
                    {entry.targetDescription}
                </Typography>
            </TableCell>

            {/* IP */}
            <TableCell>
                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                    {entry.ipAddress ?? '—'}
                </Typography>
            </TableCell>
        </TableRow>
    );
}
