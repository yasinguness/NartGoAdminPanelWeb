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
    Edit as EditIcon,
    Rule as RuleIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';

import { PageContainer, PageHeader, PageSection } from '../../components/Page';
import { DataTable, StatusChip } from '../../components/Data';
import { ActionMenu } from '../../components/Actions';
import { ErrorState, LoadingState } from '../../components/Feedback';
import { ListItemIcon, ListItemText, MenuItem as ActionMenuItem } from '@mui/material';
import {
    FeedCreateRequest,
    FeedDto,
    FeedStatus,
    FeedUpdateRequest
} from '../../types/feed/feedModel';
import { useFeedStore } from '../../store/feeds/feedStore';

const initialForm: FeedCreateRequest = {
    title: '',
    summary: '',
    content: '',
    imageUrl: '',
    videoUrl: '',
    thumbnailUrl: '',
    status: FeedStatus.DRAFT,
    pinned: false
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

export default function Feeds() {
    const { enqueueSnackbar } = useSnackbar();
    const {
        feeds,
        loading,
        error,
        totalElements,
        fetchFeeds,
        createFeed,
        updateFeed,
        updateFeedStatus
    } = useFeedStore();

    const [page, setPage] = useState(1);
    const [size] = useState(10);
    const [keyword, setKeyword] = useState('');

    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedFeed, setSelectedFeed] = useState<FeedDto | null>(null);
    const [formData, setFormData] = useState<FeedCreateRequest>(initialForm);
    const [creatorEmail, setCreatorEmail] = useState('');

    const [statusDialogOpen, setStatusDialogOpen] = useState(false);
    const [statusTarget, setStatusTarget] = useState<FeedDto | null>(null);
    const [statusValue, setStatusValue] = useState<FeedStatus>(FeedStatus.PENDING);
    const [rejectionReason, setRejectionReason] = useState('');

    const loadFeeds = async () => {
        await fetchFeeds({
            keyword: keyword || undefined,
            page: page - 1,
            size
        });
    };

    useEffect(() => {
        void loadFeeds();
    }, [page]);

    const handleSearch = async () => {
        setPage(1);
        await fetchFeeds({ keyword: keyword || undefined, page: 0, size });
    };

    const handleOpenDialog = (feed?: FeedDto) => {
        if (feed) {
            setSelectedFeed(feed);
            setFormData({
                title: feed.title,
                summary: feed.summary || '',
                content: feed.content,
                imageUrl: feed.imageUrl || '',
                videoUrl: feed.videoUrl || '',
                thumbnailUrl: feed.thumbnailUrl || '',
                status: feed.status,
                pinned: feed.pinned
            });
        } else {
            setSelectedFeed(null);
            setFormData(initialForm);
            setCreatorEmail('');
        }
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setSelectedFeed(null);
        setFormData(initialForm);
        setCreatorEmail('');
    };

    const handleSubmit = async () => {
        try {
            if (selectedFeed) {
                await updateFeed(selectedFeed.id, formData as FeedUpdateRequest);
                enqueueSnackbar('Video içeriği güncellendi', { variant: 'success' });
            } else {
                if (!creatorEmail.trim()) {
                    enqueueSnackbar('creatorEmail zorunlu', { variant: 'warning' });
                    return;
                }
                await createFeed(formData, creatorEmail.trim());
                enqueueSnackbar('Video içeriği oluşturuldu', { variant: 'success' });
            }
            handleCloseDialog();
            await loadFeeds();
        } catch (_error) {
            enqueueSnackbar('Kayıt işlemi başarısız', { variant: 'error' });
        }
    };

    const openStatusDialog = (feed: FeedDto) => {
        setStatusTarget(feed);
        setStatusValue(feed.status || FeedStatus.PENDING);
        setRejectionReason(feed.rejectionReason || '');
        setStatusDialogOpen(true);
    };

    const closeStatusDialog = () => {
        setStatusDialogOpen(false);
        setStatusTarget(null);
        setStatusValue(FeedStatus.PENDING);
        setRejectionReason('');
    };

    const handleStatusSubmit = async () => {
        if (!statusTarget) {
            return;
        }

        if (statusValue === FeedStatus.REJECTED && !rejectionReason.trim()) {
            enqueueSnackbar('REJECTED için rejectionReason zorunlu', { variant: 'warning' });
            return;
        }

        try {
            await updateFeedStatus(statusTarget.id, {
                status: statusValue,
                rejectionReason: statusValue === FeedStatus.REJECTED ? rejectionReason.trim() : undefined
            });
            enqueueSnackbar('Video status güncellendi', { variant: 'success' });
            closeStatusDialog();
            await loadFeeds();
        } catch (_error) {
            enqueueSnackbar('Status güncellenemedi', { variant: 'error' });
        }
    };

    const columns = useMemo(() => [
        {
            id: 'title',
            label: 'Başlık',
            render: (row: FeedDto) => (
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
            render: (row: FeedDto) => (
                <StatusChip status={row.status?.toLowerCase() || 'inactive'} label={row.status} />
            )
        },
        {
            id: 'rejectionReason',
            label: 'Red Nedeni',
            render: (row: FeedDto) => row.rejectionReason || '-'
        },
        {
            id: 'moderatedAt',
            label: 'Modere Tarihi',
            render: (row: FeedDto) => formatDate(row.moderatedAt)
        },
        {
            id: 'updatedAt',
            label: 'Güncellendi',
            render: (row: FeedDto) => formatDate(row.updatedAt)
        }
    ], []);

    if (loading && feeds.length === 0) {
        return <LoadingState message="Video feed listesi yükleniyor..." />;
    }

    if (error && feeds.length === 0) {
        return (
            <PageContainer>
                <ErrorState title="Video feed listesi alınamadı" message={error} onRetry={loadFeeds} />
            </PageContainer>
        );
    }

    return (
        <PageContainer>
            <PageHeader
                title="Feed Videos"
                subtitle="Admin video feed içeriklerini yönetin"
                breadcrumbs={[
                    { label: 'Dashboard', href: '/dashboard' },
                    { label: 'Feed Videos', active: true }
                ]}
                actions={
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
                        Video Ekle
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
                    data={feeds}
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
                        </ActionMenu>
                    )}
                />
            </PageSection>

            <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                <DialogTitle>{selectedFeed ? 'Video Düzenle' : 'Yeni Video'}</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2} mt={1}>
                        {!selectedFeed && (
                            <TextField
                                label="Creator Email"
                                value={creatorEmail}
                                onChange={(event) => setCreatorEmail(event.target.value)}
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
                            minRows={4}
                            required
                            fullWidth
                        />
                        <TextField
                            label="Video URL"
                            value={formData.videoUrl || ''}
                            onChange={(event) => setFormData((prev) => ({ ...prev, videoUrl: event.target.value }))}
                            fullWidth
                        />
                        <TextField
                            label="Thumbnail URL"
                            value={formData.thumbnailUrl || ''}
                            onChange={(event) => setFormData((prev) => ({ ...prev, thumbnailUrl: event.target.value }))}
                            fullWidth
                        />
                        <TextField
                            label="Görsel URL"
                            value={formData.imageUrl || ''}
                            onChange={(event) => setFormData((prev) => ({ ...prev, imageUrl: event.target.value }))}
                            fullWidth
                        />
                        <Stack direction="row" alignItems="center" spacing={1}>
                            <Switch
                                checked={Boolean(formData.pinned)}
                                onChange={(event) => setFormData((prev) => ({ ...prev, pinned: event.target.checked }))}
                            />
                            <Typography variant="body2">Sabit içerik</Typography>
                        </Stack>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog} color="inherit">İptal</Button>
                    <Button onClick={handleSubmit} variant="contained">Kaydet</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={statusDialogOpen} onClose={closeStatusDialog} maxWidth="sm" fullWidth>
                <DialogTitle>Video Status Güncelle</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2} mt={1}>
                        <TextField
                            label="Status"
                            select
                            value={statusValue}
                            onChange={(event) => setStatusValue(event.target.value as FeedStatus)}
                            fullWidth
                        >
                            {Object.values(FeedStatus).map((status) => (
                                <MenuItem key={status} value={status}>{status}</MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            label="Rejection Reason"
                            value={rejectionReason}
                            onChange={(event) => setRejectionReason(event.target.value)}
                            multiline
                            minRows={3}
                            fullWidth
                            disabled={statusValue !== FeedStatus.REJECTED}
                            required={statusValue === FeedStatus.REJECTED}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeStatusDialog} color="inherit">İptal</Button>
                    <Button onClick={handleStatusSubmit} variant="contained">Güncelle</Button>
                </DialogActions>
            </Dialog>
        </PageContainer>
    );
}
