import { useEffect, useMemo, useState } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    MenuItem,
    Stack,
    Switch,
    TextField,
    Typography
} from '@mui/material';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    Rule as RuleIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';

import { PageContainer, PageHeader, PageSection } from '../../components/Page';
import { DataTable, StatusChip } from '../../components/Data';
import { ActionMenu } from '../../components/Actions';
import { ConfirmDialog, ErrorState, LoadingState } from '../../components/Feedback';
import { ListItemIcon, ListItemText, MenuItem as ActionMenuItem } from '@mui/material';
import {
    BulletinCreateRequest,
    BulletinDto,
    BulletinStatus,
    BulletinUpdateRequest
} from '../../types/bulletin/bulletinModel';
import { useBulletinStore } from '../../store/bulletins/bulletinStore';

const initialForm: BulletinCreateRequest = {
    title: '',
    summary: '',
    content: '',
    status: BulletinStatus.DRAFT,
    pinned: false,
    startAt: '',
    endAt: ''
};

const formatDate = (value?: string) => {
    if (!value) {
        return '-';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '-';
    }

    return date.toLocaleString();
};

const toDateTimeLocal = (value?: string) => {
    if (!value) {
        return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '';
    }

    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export default function Bulletins() {
    const { enqueueSnackbar } = useSnackbar();
    const {
        bulletins,
        loading,
        error,
        totalElements,
        fetchBulletins,
        createBulletin,
        updateBulletin,
        updateBulletinStatus,
        deleteBulletin
    } = useBulletinStore();

    const [page, setPage] = useState(1);
    const [size] = useState(10);
    const [keyword, setKeyword] = useState('');

    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedBulletin, setSelectedBulletin] = useState<BulletinDto | null>(null);
    const [formData, setFormData] = useState<BulletinCreateRequest>(initialForm);
    const [publisherEmail, setPublisherEmail] = useState('');

    const [statusDialogOpen, setStatusDialogOpen] = useState(false);
    const [statusTarget, setStatusTarget] = useState<BulletinDto | null>(null);
    const [statusValue, setStatusValue] = useState<BulletinStatus>(BulletinStatus.DRAFT);

    const [deleteId, setDeleteId] = useState<string | null>(null);

    const loadBulletins = async () => {
        await fetchBulletins({
            keyword: keyword || undefined,
            page: page - 1,
            size
        });
    };

    useEffect(() => {
        void loadBulletins();
    }, [page]);

    const handleSearch = async () => {
        setPage(1);
        await fetchBulletins({ keyword: keyword || undefined, page: 0, size });
    };

    const handleOpenDialog = (bulletin?: BulletinDto) => {
        if (bulletin) {
            setSelectedBulletin(bulletin);
            setFormData({
                title: bulletin.title,
                summary: bulletin.summary || '',
                content: bulletin.content,
                status: bulletin.status,
                pinned: bulletin.pinned,
                startAt: toDateTimeLocal(bulletin.startAt),
                endAt: toDateTimeLocal(bulletin.endAt)
            });
        } else {
            setSelectedBulletin(null);
            setFormData(initialForm);
            setPublisherEmail('');
        }
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setSelectedBulletin(null);
        setFormData(initialForm);
        setPublisherEmail('');
    };

    const handleSubmit = async () => {
        const payload: BulletinCreateRequest = {
            ...formData,
            startAt: formData.startAt ? new Date(formData.startAt).toISOString() : undefined,
            endAt: formData.endAt ? new Date(formData.endAt).toISOString() : undefined
        };

        try {
            if (selectedBulletin) {
                await updateBulletin(selectedBulletin.id, payload as BulletinUpdateRequest);
                enqueueSnackbar('Bülten güncellendi', { variant: 'success' });
            } else {
                if (!publisherEmail.trim()) {
                    enqueueSnackbar('publisherEmail zorunlu', { variant: 'warning' });
                    return;
                }
                await createBulletin(payload, publisherEmail.trim());
                enqueueSnackbar('Bülten oluşturuldu', { variant: 'success' });
            }
            handleCloseDialog();
            await loadBulletins();
        } catch (_error) {
            enqueueSnackbar('Bülten kaydedilemedi', { variant: 'error' });
        }
    };

    const openStatusDialog = (bulletin: BulletinDto) => {
        setStatusTarget(bulletin);
        setStatusValue(bulletin.status || BulletinStatus.DRAFT);
        setStatusDialogOpen(true);
    };

    const closeStatusDialog = () => {
        setStatusDialogOpen(false);
        setStatusTarget(null);
        setStatusValue(BulletinStatus.DRAFT);
    };

    const handleStatusSubmit = async () => {
        if (!statusTarget) {
            return;
        }

        try {
            await updateBulletinStatus(statusTarget.id, { status: statusValue });
            enqueueSnackbar('Bülten status güncellendi', { variant: 'success' });
            closeStatusDialog();
            await loadBulletins();
        } catch (_error) {
            enqueueSnackbar('Status güncellenemedi', { variant: 'error' });
        }
    };

    const handleDelete = async () => {
        if (!deleteId) {
            return;
        }

        try {
            await deleteBulletin(deleteId);
            enqueueSnackbar('Bülten silindi', { variant: 'success' });
            setDeleteId(null);
            await loadBulletins();
        } catch (_error) {
            enqueueSnackbar('Bülten silinemedi', { variant: 'error' });
        }
    };

    const columns = useMemo(() => [
        {
            id: 'title',
            label: 'Başlık',
            render: (row: BulletinDto) => (
                <Box>
                    <Typography fontWeight={600}>{row.title}</Typography>
                    <Typography variant="caption" color="text.secondary">
                        {row.summary || '-'}
                    </Typography>
                </Box>
            )
        },
        {
            id: 'status',
            label: 'Durum',
            render: (row: BulletinDto) => (
                <StatusChip status={row.status?.toLowerCase() || 'inactive'} label={row.status} />
            )
        },
        {
            id: 'dateRange',
            label: 'Geçerlilik',
            render: (row: BulletinDto) => `${formatDate(row.startAt)} - ${formatDate(row.endAt)}`
        },
        {
            id: 'publishedAt',
            label: 'Yayın Tarihi',
            render: (row: BulletinDto) => formatDate(row.publishedAt)
        },
        {
            id: 'pinned',
            label: 'Sabit',
            align: 'center' as const,
            render: (row: BulletinDto) => (
                <StatusChip status={row.pinned ? 'active' : 'inactive'} label={row.pinned ? 'Evet' : 'Hayır'} />
            )
        }
    ], []);

    if (loading && bulletins.length === 0) {
        return <LoadingState message="Bülten listesi yükleniyor..." />;
    }

    if (error && bulletins.length === 0) {
        return (
            <PageContainer>
                <ErrorState title="Bülten listesi alınamadı" message={error} onRetry={loadBulletins} />
            </PageContainer>
        );
    }

    return (
        <PageContainer>
            <PageHeader
                title="Bulletins"
                subtitle="Admin bülten içeriklerini yönetin"
                breadcrumbs={[
                    { label: 'Dashboard', href: '/dashboard' },
                    { label: 'Bulletins', active: true }
                ]}
                actions={
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
                        Bülten Ekle
                    </Button>
                }
            />

            <PageSection>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} mb={2}>
                    <TextField
                        label="Ara"
                        value={keyword}
                        onChange={(event) => setKeyword(event.target.value)}
                        fullWidth
                        placeholder="Başlık veya özet"
                    />
                    <Button variant="outlined" onClick={handleSearch}>
                        Filtrele
                    </Button>
                </Stack>

                <DataTable
                    columns={columns}
                    data={bulletins}
                    loading={loading}
                    pagination={{
                        page,
                        pageSize: size,
                        total: totalElements,
                        onPageChange: setPage
                    }}
                    renderRowActions={(row) => (
                        <ActionMenu>
                            <ActionMenuItem onClick={() => handleOpenDialog(row)}>
                                <ListItemIcon>
                                    <EditIcon fontSize="small" />
                                </ListItemIcon>
                                <ListItemText>Düzenle</ListItemText>
                            </ActionMenuItem>
                            <ActionMenuItem onClick={() => openStatusDialog(row)}>
                                <ListItemIcon>
                                    <RuleIcon fontSize="small" />
                                </ListItemIcon>
                                <ListItemText>Status Güncelle</ListItemText>
                            </ActionMenuItem>
                            <ActionMenuItem onClick={() => setDeleteId(row.id)} sx={{ color: 'error.main' }}>
                                <ListItemIcon>
                                    <DeleteIcon fontSize="small" color="error" />
                                </ListItemIcon>
                                <ListItemText>Sil</ListItemText>
                            </ActionMenuItem>
                        </ActionMenu>
                    )}
                />
            </PageSection>

            <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                <DialogTitle>{selectedBulletin ? 'Bülten Düzenle' : 'Yeni Bülten'}</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2} mt={1}>
                        {!selectedBulletin && (
                            <TextField
                                label="Publisher Email"
                                value={publisherEmail}
                                onChange={(event) => setPublisherEmail(event.target.value)}
                                required
                                fullWidth
                            />
                        )}
                        <TextField
                            label="Başlık"
                            value={formData.title}
                            onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))}
                            required
                            fullWidth
                        />
                        <TextField
                            label="Özet"
                            value={formData.summary || ''}
                            onChange={(event) => setFormData((prev) => ({ ...prev, summary: event.target.value }))}
                            fullWidth
                        />
                        <TextField
                            label="İçerik"
                            value={formData.content}
                            onChange={(event) => setFormData((prev) => ({ ...prev, content: event.target.value }))}
                            multiline
                            minRows={6}
                            required
                            fullWidth
                        />
                        <TextField
                            label="Durum"
                            select
                            value={formData.status || BulletinStatus.DRAFT}
                            onChange={(event) => setFormData((prev) => ({ ...prev, status: event.target.value as BulletinStatus }))}
                            fullWidth
                        >
                            {Object.values(BulletinStatus).map((status) => (
                                <MenuItem key={status} value={status}>{status}</MenuItem>
                            ))}
                        </TextField>
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                            <TextField
                                label="Başlangıç"
                                type="datetime-local"
                                value={formData.startAt || ''}
                                onChange={(event) => setFormData((prev) => ({ ...prev, startAt: event.target.value }))}
                                InputLabelProps={{ shrink: true }}
                                fullWidth
                            />
                            <TextField
                                label="Bitiş"
                                type="datetime-local"
                                value={formData.endAt || ''}
                                onChange={(event) => setFormData((prev) => ({ ...prev, endAt: event.target.value }))}
                                InputLabelProps={{ shrink: true }}
                                fullWidth
                            />
                        </Stack>
                        <Stack direction="row" alignItems="center" spacing={1}>
                            <Switch
                                checked={Boolean(formData.pinned)}
                                onChange={(event) => setFormData((prev) => ({ ...prev, pinned: event.target.checked }))}
                            />
                            <Typography variant="body2">Sabit bülten</Typography>
                        </Stack>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog} color="inherit">İptal</Button>
                    <Button onClick={handleSubmit} variant="contained">Kaydet</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={statusDialogOpen} onClose={closeStatusDialog} maxWidth="sm" fullWidth>
                <DialogTitle>Bülten Status Güncelle</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2} mt={1}>
                        <TextField
                            label="Status"
                            select
                            value={statusValue}
                            onChange={(event) => setStatusValue(event.target.value as BulletinStatus)}
                            fullWidth
                        >
                            {Object.values(BulletinStatus).map((status) => (
                                <MenuItem key={status} value={status}>{status}</MenuItem>
                            ))}
                        </TextField>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeStatusDialog} color="inherit">İptal</Button>
                    <Button onClick={handleStatusSubmit} variant="contained">Güncelle</Button>
                </DialogActions>
            </Dialog>

            <ConfirmDialog
                open={Boolean(deleteId)}
                onClose={() => setDeleteId(null)}
                onConfirm={handleDelete}
                title="Bülten silinsin mi?"
                message="Bu işlem geri alınamaz."
                severity="error"
                confirmText="Sil"
            />
        </PageContainer>
    );
}
