import { useEffect, useMemo, useState } from 'react';
import {
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    CardHeader,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    IconButton,
    MenuItem,
    Stack,
    Switch,
    Tab,
    Tabs,
    TextField,
    Typography
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Rule as RuleIcon,
    Delete as DeleteIcon,
    Image as ImageIcon
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
import { storyService } from '../../services/feed/storyService';
import { StoryFeedDto } from '../../types/feed/storyModel';

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
    
    // --- Tabs ---
    const [activeTab, setActiveTab] = useState(0);

    // --- Feeds State (Tab 0) ---
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

    // --- Stories State (Tab 1) ---
    const [storyGroups, setStoryGroups] = useState<StoryFeedDto[]>([]);
    const [loadingStories, setLoadingStories] = useState(false);
    const [storiesError, setStoriesError] = useState<string | null>(null);
    const [deletingStoryId, setDeletingStoryId] = useState<string | null>(null);

    // --- Feeds Functions ---
    const loadFeeds = async () => {
        await fetchFeeds({
            keyword: keyword || undefined,
            page: page - 1,
            size
        });
    };

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

    // --- Stories Functions ---
    const loadStories = async () => {
        setLoadingStories(true);
        setStoriesError(null);
        try {
            const data = await storyService.getStoryFeed();
            setStoryGroups(data || []);
        } catch (err: any) {
            setStoriesError(err?.message || 'Hikayeler yüklenemedi');
        } finally {
            setLoadingStories(false);
        }
    };

    const handleDeleteStory = async (storyId: string) => {
        if (!window.confirm('Bu story içeriğini kalıcı olarak silmek istediğinize emin misiniz?')) {
            return;
        }
        
        setDeletingStoryId(storyId);
        try {
            await storyService.deleteStoryAdmin(storyId);
            enqueueSnackbar('Story başarıyla silindi', { variant: 'success' });
            await loadStories();
        } catch (err) {
            enqueueSnackbar('Story silinirken bir hata oluştu', { variant: 'error' });
        } finally {
            setDeletingStoryId(null);
        }
    };

    // --- Effects ---
    useEffect(() => {
        if (activeTab === 0) {
            void loadFeeds();
        } else if (activeTab === 1) {
            void loadStories();
        }
    }, [activeTab, page]); // Fetch based on active tab

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

    return (
        <PageContainer>
            <PageHeader
                title="Feed ve Hikaye Yönetimi"
                subtitle="Kullanıcı içeriklerini (Video Feed ve Story) görüntüleyin ve yönetin"
                breadcrumbs={[
                    { label: 'Dashboard', href: '/dashboard' },
                    { label: 'Feed & Stories', active: true }
                ]}
                actions={
                    activeTab === 0 ? (
                        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
                            Video Ekle
                        </Button>
                    ) : (
                        <Button variant="outlined" onClick={loadStories} disabled={loadingStories}>
                            Yenile
                        </Button>
                    )
                }
            />

            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs value={activeTab} onChange={(_, nv) => setActiveTab(nv)}>
                    <Tab label="Feed Videoları" />
                    <Tab label="Kullanıcı Hikayeleri" />
                </Tabs>
            </Box>

            {/* TAB 0: FEED VIDEOS */}
            {activeTab === 0 && (
                <PageSection>
                    {loading && feeds.length === 0 ? (
                        <LoadingState message="Video feed listesi yükleniyor..." />
                    ) : error && feeds.length === 0 ? (
                        <ErrorState title="Video feed listesi alınamadı" message={error} onRetry={loadFeeds} />
                    ) : (
                        <>
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
                        </>
                    )}
                </PageSection>
            )}

            {/* TAB 1: USER STORIES */}
            {activeTab === 1 && (
                <PageSection>
                    {loadingStories ? (
                        <LoadingState message="Kullanıcı hikayeleri yükleniyor..." />
                    ) : storiesError ? (
                        <ErrorState title="Hikayeler alınamadı" message={storiesError} onRetry={loadStories} />
                    ) : storyGroups.length === 0 ? (
                        <Box textAlign="center" py={5}>
                            <Typography color="text.secondary">Aktif bir hikaye bulunamadı.</Typography>
                        </Box>
                    ) : (
                        <Grid container spacing={3}>
                            {storyGroups.map((group) => (
                                <Grid item xs={12} md={6} lg={4} key={group.userId}>
                                    <Card variant="outlined" sx={{ borderRadius: 3 }}>
                                        <CardHeader
                                            avatar={<Avatar src={group.avatarUrl || group.profileImageUrl}>{group.displayName?.[0] || 'U'}</Avatar>}
                                            title={<Typography fontWeight={600}>{group.displayName || group.username || group.userEmail}</Typography>}
                                            subheader={`${group.stories.length} Aktif Hikaye`}
                                        />
                                        <CardContent sx={{ pt: 0 }}>
                                            <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 1 }}>
                                                {group.stories.map((story) => (
                                                    <Box
                                                        key={story.id}
                                                        sx={{
                                                            position: 'relative',
                                                            minWidth: 100,
                                                            height: 140,
                                                            borderRadius: 2,
                                                            overflow: 'hidden',
                                                            bgcolor: 'grey.900',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            border: '2px solid',
                                                            borderColor: 'primary.main'
                                                        }}
                                                    >
                                                        {(story.mediaUrl || story.url) ? (
                                                            <Box
                                                                component="img"
                                                                src={story.mediaUrl || story.url}
                                                                sx={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }}
                                                            />
                                                        ) : (
                                                            <ImageIcon sx={{ color: 'grey.500' }} />
                                                        )}
                                                        
                                                        {/* Story Overlay Info */}
                                                        <Box sx={{ position: 'absolute', bottom: 4, left: 4, right: 4, display: 'flex', justifyContent: 'space-between' }}>
                                                            {story.mediaType === 'VIDEO' ? (
                                                                <Chip size="small" label="Video" sx={{ height: 16, fontSize: '0.6rem', bgcolor: 'rgba(0,0,0,0.6)', color: '#fff' }} />
                                                            ) : (
                                                                <Chip size="small" label="Görsel" sx={{ height: 16, fontSize: '0.6rem', bgcolor: 'rgba(0,0,0,0.6)', color: '#fff' }} />
                                                            )}
                                                        </Box>

                                                        {/* Admin Delete Action */}
                                                        <IconButton
                                                            size="small"
                                                            color="error"
                                                            disabled={deletingStoryId === story.id}
                                                            onClick={() => handleDeleteStory(story.id)}
                                                            sx={{
                                                                position: 'absolute',
                                                                top: 4,
                                                                right: 4,
                                                                bgcolor: 'rgba(255, 255, 255, 0.9)',
                                                                '&:hover': { bgcolor: 'error.main', color: 'white' }
                                                            }}
                                                        >
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    </Box>
                                                ))}
                                            </Stack>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    )}
                </PageSection>
            )}

            {/* Modal Components */}
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
