import { useEffect, useMemo, useState, useCallback } from 'react';
import {
    Box, Button, Card, Chip, Dialog, DialogActions, DialogContent,
    DialogTitle, Divider, Grid, MenuItem, Stack,
    Switch, TextField, Typography, alpha, useTheme,
    InputAdornment, IconButton,
} from '@mui/material';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    PushPin as PinIcon,
    Publish as PublishIcon,
    Inventory2 as ArchiveIcon,
    Article as BulletinIcon,
    Search as SearchIcon,
    Close as CloseIcon,
    Schedule as ScheduleIcon,
    CheckCircle as PublishedIcon,
    Campaign as CampaignIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';

import { PageContainer, PageHeader } from '../../components/Page';
import { DataTable } from '../../components/Data';
import { ActionMenu } from '../../components/Actions';
import { ConfirmDialog, ErrorState, LoadingState } from '../../components/Feedback';
import { ListItemIcon, ListItemText, MenuItem as ActionMenuItem } from '@mui/material';
import {
    BulletinCreateRequest, BulletinDto,
    BulletinStatus, BulletinUpdateRequest,
} from '../../types/bulletin/bulletinModel';
import { useBulletinStore } from '../../store/bulletins/bulletinStore';
import { useRole } from '../../hooks/useRole';

// ─── Status config ──────────────────────────────────────────────────────────
const STATUS_LABELS: Record<BulletinStatus, string> = {
    [BulletinStatus.DRAFT]: 'Taslak',
    [BulletinStatus.PUBLISHED]: 'Yayında',
    [BulletinStatus.ARCHIVED]: 'Arşiv',
    [BulletinStatus.ACTIVE]: 'Aktif',
    [BulletinStatus.PASSIVE]: 'Pasif',
};

const STATUS_COLORS: Record<BulletinStatus, { bg: string; color: string }> = {
    [BulletinStatus.DRAFT]: { bg: '#F1F5F9', color: '#64748B' },
    [BulletinStatus.PUBLISHED]: { bg: '#ECFDF5', color: '#10B981' },
    [BulletinStatus.ARCHIVED]: { bg: '#FEF2F2', color: '#EF4444' },
    [BulletinStatus.ACTIVE]: { bg: '#ECFDF5', color: '#10B981' },
    [BulletinStatus.PASSIVE]: { bg: '#F1F5F9', color: '#64748B' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDate(value?: string) {
    if (!value) return '—';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(value?: string) {
    if (!value) return '—';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function toDateTimeLocal(value?: string) {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

const initialForm: BulletinCreateRequest = {
    title: '', summary: '', content: '',
    status: BulletinStatus.DRAFT, pinned: false, startAt: '', endAt: '',
};

// ─── Component ───────────────────────────────────────────────────────────────
export default function Bulletins() {
    const theme = useTheme();
    const { enqueueSnackbar } = useSnackbar();
    const { userEmail } = useRole();
    const {
        bulletins, loading, error, totalElements,
        fetchBulletins, createBulletin, updateBulletin,
        updateBulletinStatus, deleteBulletin,
    } = useBulletinStore();

    const [page, setPage] = useState(1);
    const [size] = useState(10);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('');

    const [dialogOpen, setDialogOpen] = useState(false);
    const [selected, setSelected] = useState<BulletinDto | null>(null);
    const [form, setForm] = useState<BulletinCreateRequest>(initialForm);

    const [statusDialogOpen, setStatusDialogOpen] = useState(false);
    const [statusTarget] = useState<BulletinDto | null>(null);
    const [statusValue, setStatusValue] = useState<BulletinStatus>(BulletinStatus.DRAFT);

    const [deleteId, setDeleteId] = useState<string | null>(null);

    const load = useCallback(async (p = page, kw = search) => {
        await fetchBulletins({ keyword: kw || undefined, page: p - 1, size });
    }, [page, search, size, fetchBulletins]);

    useEffect(() => { void load(); }, [page]);

    // Debounced search
    useEffect(() => {
        const t = setTimeout(() => { setPage(1); void load(1, search); }, 400);
        return () => clearTimeout(t);
    }, [search]);

    // ─── Stats ───────────────────────────────────────────────────────────────
    const stats = useMemo(() => {
        const published = bulletins.filter(b => b.status === BulletinStatus.PUBLISHED).length;
        const pinned = bulletins.filter(b => b.pinned).length;
        const scheduled = bulletins.filter(b => b.startAt && new Date(b.startAt) > new Date()).length;
        return [
            { label: 'Toplam', value: totalElements, color: theme.palette.primary.main, icon: <BulletinIcon /> },
            { label: 'Yayında', value: published, color: '#10B981', icon: <PublishedIcon /> },
            { label: 'Planlanmış', value: scheduled, color: '#3B82F6', icon: <ScheduleIcon /> },
            { label: 'Sabit', value: pinned, color: '#F59E0B', icon: <PinIcon /> },
        ];
    }, [bulletins, totalElements, theme]);

    // ─── Dialog helpers ───────────────────────────────────────────────────────
    const openDialog = (bulletin?: BulletinDto) => {
        if (bulletin) {
            setSelected(bulletin);
            setForm({
                title: bulletin.title,
                summary: bulletin.summary || '',
                content: bulletin.content,
                status: bulletin.status,
                pinned: bulletin.pinned,
                startAt: toDateTimeLocal(bulletin.startAt),
                endAt: toDateTimeLocal(bulletin.endAt),
            });
        } else {
            setSelected(null);
            setForm(initialForm);
        }
        setDialogOpen(true);
    };

    const closeDialog = () => { setDialogOpen(false); setSelected(null); setForm(initialForm); };

    const handleSubmit = async () => {
        if (!form.title.trim()) { enqueueSnackbar('Başlık zorunlu', { variant: 'warning' }); return; }
        if (!form.content.trim()) { enqueueSnackbar('İçerik zorunlu', { variant: 'warning' }); return; }

        const payload: BulletinCreateRequest = {
            ...form,
            startAt: form.startAt ? new Date(form.startAt).toISOString() : undefined,
            endAt: form.endAt ? new Date(form.endAt).toISOString() : undefined,
        };

        try {
            if (selected) {
                await updateBulletin(selected.id, payload as BulletinUpdateRequest);
                enqueueSnackbar('Bülten güncellendi', { variant: 'success' });
            } else {
                await createBulletin(payload, userEmail);
                enqueueSnackbar('Bülten oluşturuldu', { variant: 'success' });
            }
            closeDialog();
            void load(1);
        } catch {
            enqueueSnackbar('Kaydetme başarısız', { variant: 'error' });
        }
    };

    const handleStatusSubmit = async () => {
        if (!statusTarget) return;
        try {
            await updateBulletinStatus(statusTarget.id, { status: statusValue });
            enqueueSnackbar('Durum güncellendi', { variant: 'success' });
            setStatusDialogOpen(false);
            void load();
        } catch {
            enqueueSnackbar('Durum güncellenemedi', { variant: 'error' });
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await deleteBulletin(deleteId);
            enqueueSnackbar('Bülten silindi', { variant: 'success' });
            setDeleteId(null);
            void load();
        } catch {
            enqueueSnackbar('Silme başarısız', { variant: 'error' });
        }
    };

    // ─── Quick status action ──────────────────────────────────────────────────
    const quickStatus = async (bulletin: BulletinDto, status: BulletinStatus) => {
        try {
            await updateBulletinStatus(bulletin.id, { status });
            enqueueSnackbar(`${STATUS_LABELS[status]} olarak güncellendi`, { variant: 'success' });
            void load();
        } catch {
            enqueueSnackbar('Güncelleme başarısız', { variant: 'error' });
        }
    };

    // ─── Columns ─────────────────────────────────────────────────────────────
    const columns = useMemo(() => [
        {
            id: 'title', label: 'Başlık',
            render: (row: BulletinDto) => (
                <Box>
                    <Stack direction="row" spacing={0.75} alignItems="center">
                        {row.pinned && <PinIcon sx={{ fontSize: 14, color: '#F59E0B' }} />}
                        <Typography variant="body2" fontWeight={700}>{row.title}</Typography>
                    </Stack>
                    {row.summary && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                            {row.summary.length > 80 ? row.summary.slice(0, 80) + '…' : row.summary}
                        </Typography>
                    )}
                </Box>
            ),
        },
        {
            id: 'status', label: 'Durum', width: 120,
            render: (row: BulletinDto) => {
                const cfg = STATUS_COLORS[row.status as BulletinStatus] ?? STATUS_COLORS[BulletinStatus.DRAFT];
                return (
                    <Chip
                        label={STATUS_LABELS[row.status as BulletinStatus] ?? row.status}
                        size="small"
                        sx={{ fontWeight: 700, fontSize: 11, borderRadius: 1.5, bgcolor: cfg.bg, color: cfg.color }}
                    />
                );
            },
        },
        {
            id: 'validity', label: 'Geçerlilik', width: 200,
            render: (row: BulletinDto) => (
                <Typography variant="caption" color="text.secondary">
                    {row.startAt || row.endAt
                        ? `${formatDate(row.startAt)} – ${formatDate(row.endAt)}`
                        : 'Süresiz'}
                </Typography>
            ),
        },
        {
            id: 'publishedAt', label: 'Yayın', width: 160,
            render: (row: BulletinDto) => (
                <Typography variant="caption" color="text.secondary">{formatDateTime(row.publishedAt)}</Typography>
            ),
        },
    ], []);

    const filteredBulletins = useMemo(() =>
        statusFilter ? bulletins.filter(b => b.status === statusFilter) : bulletins,
        [bulletins, statusFilter],
    );

    // ─── Early returns ────────────────────────────────────────────────────────
    if (loading && bulletins.length === 0) return <LoadingState message="Bültenler yükleniyor..." />;
    if (error && bulletins.length === 0) {
        return (
            <PageContainer>
                <ErrorState title="Bültenler alınamadı" message={error} onRetry={() => load()} />
            </PageContainer>
        );
    }

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <PageContainer>
            <PageHeader
                title="Bültenler"
                subtitle={`Platforma özel duyuru ve bildirim bültenleri · ${totalElements} bülten`}
                breadcrumbs={[
                    { label: 'Kontrol Paneli', href: '/dashboard' },
                    { label: 'Bültenler' },
                ]}
                actions={
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => openDialog()}
                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>
                        Yeni Bülten
                    </Button>
                }
            />

            {/* Stats */}
            <Grid container spacing={2} mb={3}>
                {stats.map((s) => (
                    <Grid item xs={6} sm={3} key={s.label}>
                        <Card elevation={0} sx={{
                            p: 2.5, borderRadius: 3,
                            background: `linear-gradient(135deg, ${alpha(s.color, 0.07)} 0%, ${alpha(s.color, 0.02)} 100%)`,
                            border: `1px solid ${alpha(s.color, 0.12)}`,
                            cursor: 'default',
                        }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Box>
                                    <Typography variant="caption" color="text.secondary" fontWeight={600}
                                        sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 10 }}>
                                        {s.label}
                                    </Typography>
                                    <Typography variant="h4" fontWeight={800} sx={{ color: s.color, mt: 0.5 }}>
                                        {s.value}
                                    </Typography>
                                </Box>
                                <Box sx={{
                                    width: 44, height: 44, borderRadius: 2.5,
                                    bgcolor: alpha(s.color, 0.12), color: s.color,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    {s.icon}
                                </Box>
                            </Stack>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Filters */}
            <Card elevation={0} sx={{ p: 2, borderRadius: 3, mb: 3, border: `1px solid ${theme.palette.divider}` }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="center">
                    <TextField
                        size="small" placeholder="Bülten ara..." value={search}
                        onChange={e => setSearch(e.target.value)}
                        sx={{ flexGrow: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} /></InputAdornment>,
                            endAdornment: search && (
                                <InputAdornment position="end">
                                    <IconButton size="small" onClick={() => setSearch('')}>
                                        <CloseIcon sx={{ fontSize: 15 }} />
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />
                    <TextField
                        select size="small" value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        sx={{ minWidth: 150, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        SelectProps={{ displayEmpty: true }}
                    >
                        <MenuItem value="">Tüm Durumlar</MenuItem>
                        {Object.entries(STATUS_LABELS).map(([k, v]) => (
                            <MenuItem key={k} value={k}>{v}</MenuItem>
                        ))}
                    </TextField>
                </Stack>
            </Card>

            {/* Table */}
            <DataTable
                columns={columns}
                data={filteredBulletins}
                loading={loading}
                pagination={{ page, pageSize: size, total: totalElements, onPageChange: setPage }}
                renderRowActions={(row: BulletinDto) => (
                    <ActionMenu>
                        <ActionMenuItem onClick={() => openDialog(row)}>
                            <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
                            <ListItemText>Düzenle</ListItemText>
                        </ActionMenuItem>
                        {row.status !== BulletinStatus.PUBLISHED && (
                            <ActionMenuItem onClick={() => quickStatus(row, BulletinStatus.PUBLISHED)}>
                                <ListItemIcon><PublishIcon fontSize="small" color="success" /></ListItemIcon>
                                <ListItemText>Yayınla</ListItemText>
                            </ActionMenuItem>
                        )}
                        {row.status === BulletinStatus.PUBLISHED && (
                            <ActionMenuItem onClick={() => quickStatus(row, BulletinStatus.ARCHIVED)}>
                                <ListItemIcon><ArchiveIcon fontSize="small" /></ListItemIcon>
                                <ListItemText>Arşive Al</ListItemText>
                            </ActionMenuItem>
                        )}
                        <Divider sx={{ my: 0.5 }} />
                        <ActionMenuItem onClick={() => setDeleteId(row.id)} sx={{ color: 'error.main' }}>
                            <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
                            <ListItemText>Sil</ListItemText>
                        </ActionMenuItem>
                    </ActionMenu>
                )}
            />

            {/* ─── Create / Edit Dialog ─── */}
            <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="md" fullWidth
                PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Box sx={{
                            width: 36, height: 36, borderRadius: 2,
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: theme.palette.primary.main,
                        }}>
                            <CampaignIcon sx={{ fontSize: 20 }} />
                        </Box>
                        <Box>
                            <Typography variant="subtitle1" fontWeight={800}>
                                {selected ? 'Bülten Düzenle' : 'Yeni Bülten'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {selected ? 'Mevcut bülteni güncelleyin' : 'Platforma yeni bir duyuru bülteni ekleyin'}
                            </Typography>
                        </Box>
                    </Stack>
                </DialogTitle>
                <Divider />
                <DialogContent sx={{ pt: 3 }}>
                    <Stack spacing={2.5}>
                        {/* Title + Status in a row */}
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <TextField
                                label="Başlık *" value={form.title} fullWidth
                                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                                InputProps={{ sx: { borderRadius: 2 } }}
                                inputProps={{ maxLength: 120 }}
                                helperText={`${form.title.length}/120`}
                            />
                            <TextField
                                select label="Durum" value={form.status} sx={{ minWidth: 160 }}
                                onChange={e => setForm(p => ({ ...p, status: e.target.value as BulletinStatus }))}
                                InputProps={{ sx: { borderRadius: 2 } }}
                            >
                                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                                    <MenuItem key={k} value={k}>{v}</MenuItem>
                                ))}
                            </TextField>
                        </Stack>

                        <TextField
                            label="Kısa Özet" value={form.summary || ''} fullWidth
                            onChange={e => setForm(p => ({ ...p, summary: e.target.value }))}
                            placeholder="Bülteni özetleyen 1-2 cümle (opsiyonel)"
                            InputProps={{ sx: { borderRadius: 2 } }}
                        />

                        <TextField
                            label="İçerik *" value={form.content} fullWidth multiline minRows={6}
                            onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                            placeholder="Bülten içeriğini buraya yazın..."
                            InputProps={{ sx: { borderRadius: 2, alignItems: 'flex-start' } }}
                        />

                        <Divider>
                            <Typography variant="caption" color="text.disabled" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 10 }}>
                                Yayın Zamanlaması
                            </Typography>
                        </Divider>

                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <TextField
                                label="Başlangıç Tarihi" type="datetime-local"
                                value={form.startAt || ''} fullWidth
                                onChange={e => setForm(p => ({ ...p, startAt: e.target.value }))}
                                InputLabelProps={{ shrink: true }}
                                InputProps={{ sx: { borderRadius: 2 } }}
                                helperText="Boş bırakılırsa hemen yayınlanır"
                            />
                            <TextField
                                label="Bitiş Tarihi" type="datetime-local"
                                value={form.endAt || ''} fullWidth
                                onChange={e => setForm(p => ({ ...p, endAt: e.target.value }))}
                                InputLabelProps={{ shrink: true }}
                                InputProps={{ sx: { borderRadius: 2 } }}
                                helperText="Boş bırakılırsa süresiz görünür"
                            />
                        </Stack>

                        <Box sx={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            p: 2, borderRadius: 2, border: `1px solid ${theme.palette.divider}`,
                            bgcolor: form.pinned ? alpha('#F59E0B', 0.04) : 'transparent',
                        }}>
                            <Box>
                                <Typography variant="body2" fontWeight={700}>Sabit Bülten</Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Listenin en üstünde sabit gösterilir
                                </Typography>
                            </Box>
                            <Switch
                                checked={Boolean(form.pinned)}
                                onChange={e => setForm(p => ({ ...p, pinned: e.target.checked }))}
                                color="warning"
                            />
                        </Box>
                    </Stack>
                </DialogContent>
                <Divider />
                <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
                    <Button onClick={closeDialog} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }} color="inherit">
                        İptal
                    </Button>
                    <Button onClick={handleSubmit} variant="contained"
                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, px: 3 }}>
                        {selected ? 'Güncelle' : 'Oluştur'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ─── Status Dialog ─── */}
            <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)}
                maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle sx={{ fontWeight: 800 }}>Durum Güncelle</DialogTitle>
                <DialogContent>
                    <TextField
                        select label="Yeni Durum" value={statusValue} fullWidth sx={{ mt: 1 }}
                        onChange={e => setStatusValue(e.target.value as BulletinStatus)}
                        InputProps={{ sx: { borderRadius: 2 } }}
                    >
                        {Object.entries(STATUS_LABELS).map(([k, v]) => (
                            <MenuItem key={k} value={k}>{v}</MenuItem>
                        ))}
                    </TextField>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setStatusDialogOpen(false)} color="inherit" sx={{ borderRadius: 2, textTransform: 'none' }}>İptal</Button>
                    <Button onClick={handleStatusSubmit} variant="contained" sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>Güncelle</Button>
                </DialogActions>
            </Dialog>

            <ConfirmDialog
                open={Boolean(deleteId)} onClose={() => setDeleteId(null)}
                onConfirm={handleDelete} title="Bülten silinsin mi?"
                message="Bu işlem geri alınamaz. Bülten kalıcı olarak silinecektir."
                severity="error" confirmText="Sil"
            />
        </PageContainer>
    );
}
