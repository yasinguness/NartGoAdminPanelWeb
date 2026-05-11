import { useEffect, useMemo, useState } from 'react';
import {
    Avatar,
    Badge,
    Box,
    Button,
    Card,
    CardContent,
    CardHeader,
    Checkbox,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    IconButton,
    MenuItem,
    Pagination,
    Stack,
    Switch,
    Tab,
    Tabs,
    TextField,
    Tooltip,
    Typography
} from '@mui/material';
import {
    Add as AddIcon,
    Check as CheckIcon,
    Close as CloseIcon,
    Edit as EditIcon,
    Rule as RuleIcon,
    Delete as DeleteIcon,
    DeleteSweep as DeleteSweepIcon,
    Image as ImageIcon,
    Visibility as VisibilityIcon,
    Flag as FlagIcon
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
import {
    AdminStoryDto,
    AdminStoryListFilters,
    AdminStoryReportDto,
    StoryModerationStatus,
} from '../../types/feed/storyModel';

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
    const [storySubTab, setStorySubTab] = useState(0); // 0 = all, 1 = reports queue
    const [adminStories, setAdminStories] = useState<AdminStoryDto[]>([]);
    const [storyTotalElements, setStoryTotalElements] = useState(0);
    const [storyPage, setStoryPage] = useState(0); // zero-based
    const [storySize] = useState(20);
    const [loadingStories, setLoadingStories] = useState(false);
    const [storiesError, setStoriesError] = useState<string | null>(null);
    const [storyFilters, setStoryFilters] = useState<AdminStoryListFilters>({});
    const [storyFilterDraft, setStoryFilterDraft] = useState<AdminStoryListFilters>({});
    const [selectedStoryIds, setSelectedStoryIds] = useState<Set<string>>(new Set());
    const [storyActionPending, setStoryActionPending] = useState(false);

    // Reports queue state
    const [reports, setReports] = useState<AdminStoryReportDto[]>([]);
    const [loadingReports, setLoadingReports] = useState(false);
    const [reportsError, setReportsError] = useState<string | null>(null);

    // Reject dialog
    const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState('');

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
    const loadAdminStories = async () => {
        setLoadingStories(true);
        setStoriesError(null);
        try {
            const data = await storyService.listStoriesAdmin(storyFilters, storyPage, storySize);
            setAdminStories(data.content || []);
            setStoryTotalElements(data.totalElements || 0);
            setSelectedStoryIds(new Set()); // reset selection on reload
        } catch (err: any) {
            setStoriesError(err?.message || 'Hikayeler yüklenemedi');
        } finally {
            setLoadingStories(false);
        }
    };

    const loadReports = async () => {
        setLoadingReports(true);
        setReportsError(null);
        try {
            const data = await storyService.getReportedStories(0, 50);
            setReports(data || []);
        } catch (err: any) {
            setReportsError(err?.message || 'Raporlar yüklenemedi');
        } finally {
            setLoadingReports(false);
        }
    };

    const applyStoryFilters = () => {
        setStoryFilters(storyFilterDraft);
        setStoryPage(0);
    };

    const clearStoryFilters = () => {
        setStoryFilterDraft({});
        setStoryFilters({});
        setStoryPage(0);
    };

    const toggleStorySelection = (storyId: string) => {
        setSelectedStoryIds((prev) => {
            const next = new Set(prev);
            if (next.has(storyId)) next.delete(storyId);
            else next.add(storyId);
            return next;
        });
    };

    const toggleSelectAll = () => {
        setSelectedStoryIds((prev) => {
            if (prev.size === adminStories.length) return new Set();
            return new Set(adminStories.map((s) => s.id));
        });
    };

    const handleApproveStory = async (storyId: string) => {
        setStoryActionPending(true);
        try {
            await storyService.approveStory(storyId);
            enqueueSnackbar('Hikaye onaylandı', { variant: 'success' });
            await Promise.all([loadAdminStories(), storySubTab === 1 ? loadReports() : Promise.resolve()]);
        } catch {
            enqueueSnackbar('Onaylama başarısız', { variant: 'error' });
        } finally {
            setStoryActionPending(false);
        }
    };

    const handleOpenRejectDialog = (storyId: string) => {
        setRejectTargetId(storyId);
        setRejectReason('');
    };

    const handleSubmitReject = async () => {
        if (!rejectTargetId) return;
        setStoryActionPending(true);
        try {
            await storyService.rejectStory(rejectTargetId, rejectReason.trim() || undefined);
            enqueueSnackbar('Hikaye reddedildi ve silindi', { variant: 'success' });
            setRejectTargetId(null);
            setRejectReason('');
            await Promise.all([loadAdminStories(), storySubTab === 1 ? loadReports() : Promise.resolve()]);
        } catch {
            enqueueSnackbar('Reddetme başarısız', { variant: 'error' });
        } finally {
            setStoryActionPending(false);
        }
    };

    const handleDeleteStory = async (storyId: string) => {
        if (!window.confirm('Bu hikayeyi kalıcı olarak silmek istediğinize emin misiniz?')) {
            return;
        }
        setStoryActionPending(true);
        try {
            await storyService.deleteStoryAdmin(storyId);
            enqueueSnackbar('Hikaye silindi', { variant: 'success' });
            await loadAdminStories();
        } catch {
            enqueueSnackbar('Silme işlemi başarısız', { variant: 'error' });
        } finally {
            setStoryActionPending(false);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedStoryIds.size === 0) return;
        if (!window.confirm(`${selectedStoryIds.size} hikayeyi kalıcı olarak silmek istediğinize emin misiniz?`)) {
            return;
        }
        setStoryActionPending(true);
        try {
            const deleted = await storyService.batchDeleteStories(Array.from(selectedStoryIds));
            enqueueSnackbar(`${deleted.length} / ${selectedStoryIds.size} hikaye silindi`, { variant: 'success' });
            await loadAdminStories();
        } catch {
            enqueueSnackbar('Toplu silme başarısız', { variant: 'error' });
        } finally {
            setStoryActionPending(false);
        }
    };

    // --- Effects ---
    useEffect(() => {
        if (activeTab === 0) {
            void loadFeeds();
        } else if (activeTab === 1) {
            if (storySubTab === 0) void loadAdminStories();
            else void loadReports();
        }
    }, [activeTab, page, storySubTab, storyPage, storyFilters]); // eslint-disable-line react-hooks/exhaustive-deps

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
                        <Button
                            variant="outlined"
                            onClick={() => (storySubTab === 0 ? loadAdminStories() : loadReports())}
                            disabled={loadingStories || loadingReports}
                        >
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

            {/* TAB 1: USER STORIES — admin moderation grid */}
            {activeTab === 1 && (
                <PageSection>
                    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                        <Tabs value={storySubTab} onChange={(_, nv) => setStorySubTab(nv)}>
                            <Tab label="Tüm Hikayeler" />
                            <Tab
                                label={
                                    <Badge badgeContent={reports.length} color="warning" sx={{ '& .MuiBadge-badge': { right: -16 } }}>
                                        <span>Rapor Kuyruğu</span>
                                    </Badge>
                                }
                            />
                        </Tabs>
                    </Box>

                    {/* SUB-TAB 0: ALL STORIES */}
                    {storySubTab === 0 && (
                        <>
                            {/* Filter bar */}
                            <Stack
                                direction={{ xs: 'column', md: 'row' }}
                                spacing={2}
                                mb={2}
                                alignItems={{ md: 'center' }}
                            >
                                <TextField
                                    label="Kullanıcı (e-posta)"
                                    size="small"
                                    value={storyFilterDraft.userId || ''}
                                    onChange={(e) => setStoryFilterDraft((f) => ({ ...f, userId: e.target.value }))}
                                    sx={{ minWidth: 220 }}
                                />
                                <TextField
                                    label="Durum"
                                    select
                                    size="small"
                                    value={storyFilterDraft.status || ''}
                                    onChange={(e) =>
                                        setStoryFilterDraft((f) => ({
                                            ...f,
                                            status: (e.target.value as StoryModerationStatus) || undefined,
                                        }))
                                    }
                                    sx={{ minWidth: 180 }}
                                >
                                    <MenuItem value="">Hepsi</MenuItem>
                                    <MenuItem value="APPROVED">Onaylı</MenuItem>
                                    <MenuItem value="PENDING_REVIEW">İncelemede</MenuItem>
                                    <MenuItem value="REJECTED">Reddedildi</MenuItem>
                                </TextField>
                                <TextField
                                    label="Başlangıç"
                                    type="datetime-local"
                                    size="small"
                                    InputLabelProps={{ shrink: true }}
                                    value={storyFilterDraft.from?.slice(0, 16) || ''}
                                    onChange={(e) =>
                                        setStoryFilterDraft((f) => ({
                                            ...f,
                                            from: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                                        }))
                                    }
                                />
                                <TextField
                                    label="Bitiş"
                                    type="datetime-local"
                                    size="small"
                                    InputLabelProps={{ shrink: true }}
                                    value={storyFilterDraft.to?.slice(0, 16) || ''}
                                    onChange={(e) =>
                                        setStoryFilterDraft((f) => ({
                                            ...f,
                                            to: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                                        }))
                                    }
                                />
                                <Button variant="outlined" onClick={applyStoryFilters}>
                                    Filtrele
                                </Button>
                                <Button onClick={clearStoryFilters} color="inherit">
                                    Temizle
                                </Button>
                            </Stack>

                            {/* Bulk action bar */}
                            <Stack
                                direction="row"
                                spacing={2}
                                alignItems="center"
                                mb={2}
                                sx={{
                                    bgcolor: selectedStoryIds.size > 0 ? 'action.selected' : 'transparent',
                                    px: 2,
                                    py: 1,
                                    borderRadius: 1,
                                }}
                            >
                                <Checkbox
                                    checked={adminStories.length > 0 && selectedStoryIds.size === adminStories.length}
                                    indeterminate={selectedStoryIds.size > 0 && selectedStoryIds.size < adminStories.length}
                                    onChange={toggleSelectAll}
                                />
                                <Typography variant="body2" color="text.secondary">
                                    {selectedStoryIds.size > 0
                                        ? `${selectedStoryIds.size} seçili`
                                        : `${storyTotalElements} hikaye`}
                                </Typography>
                                <Box sx={{ flexGrow: 1 }} />
                                {selectedStoryIds.size > 0 && (
                                    <Button
                                        startIcon={<DeleteSweepIcon />}
                                        color="error"
                                        variant="contained"
                                        size="small"
                                        disabled={storyActionPending}
                                        onClick={handleBulkDelete}
                                    >
                                        Seçilenleri Sil ({selectedStoryIds.size})
                                    </Button>
                                )}
                            </Stack>

                            {loadingStories ? (
                                <LoadingState message="Hikayeler yükleniyor..." />
                            ) : storiesError ? (
                                <ErrorState
                                    title="Hikayeler alınamadı"
                                    message={storiesError}
                                    onRetry={loadAdminStories}
                                />
                            ) : adminStories.length === 0 ? (
                                <Box textAlign="center" py={5}>
                                    <Typography color="text.secondary">Bu filtrelerle hikaye bulunamadı.</Typography>
                                </Box>
                            ) : (
                                <>
                                    <Grid container spacing={2}>
                                        {adminStories.map((story) => (
                                            <Grid item xs={12} sm={6} md={4} lg={3} key={story.id}>
                                                <StoryAdminCard
                                                    story={story}
                                                    selected={selectedStoryIds.has(story.id)}
                                                    onToggleSelect={() => toggleStorySelection(story.id)}
                                                    onApprove={() => handleApproveStory(story.id)}
                                                    onReject={() => handleOpenRejectDialog(story.id)}
                                                    onDelete={() => handleDeleteStory(story.id)}
                                                    disabled={storyActionPending}
                                                />
                                            </Grid>
                                        ))}
                                    </Grid>
                                    <Stack direction="row" justifyContent="center" mt={3}>
                                        <Pagination
                                            page={storyPage + 1}
                                            count={Math.max(1, Math.ceil(storyTotalElements / storySize))}
                                            onChange={(_, p) => setStoryPage(p - 1)}
                                            color="primary"
                                        />
                                    </Stack>
                                </>
                            )}
                        </>
                    )}

                    {/* SUB-TAB 1: REPORTS QUEUE */}
                    {storySubTab === 1 && (
                        <>
                            {loadingReports ? (
                                <LoadingState message="Rapor kuyruğu yükleniyor..." />
                            ) : reportsError ? (
                                <ErrorState title="Raporlar alınamadı" message={reportsError} onRetry={loadReports} />
                            ) : reports.length === 0 ? (
                                <Box textAlign="center" py={5}>
                                    <Typography color="text.secondary">Bekleyen rapor yok.</Typography>
                                </Box>
                            ) : (
                                <Stack spacing={2}>
                                    {reports.map((entry) => (
                                        <ReportEntryCard
                                            key={entry.story.id}
                                            entry={entry}
                                            disabled={storyActionPending}
                                            onApprove={() => handleApproveStory(entry.story.id)}
                                            onReject={() => handleOpenRejectDialog(entry.story.id)}
                                        />
                                    ))}
                                </Stack>
                            )}
                        </>
                    )}
                </PageSection>
            )}

            {/* Reject dialog */}
            <Dialog
                open={rejectTargetId !== null}
                onClose={() => !storyActionPending && setRejectTargetId(null)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Hikayeyi Reddet</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2} mt={1}>
                        <Typography variant="body2" color="text.secondary">
                            Bu hikaye reddedilip silinecek. İsteğe bağlı olarak bir sebep ekleyebilirsiniz (audit kaydında saklanır).
                        </Typography>
                        <TextField
                            label="Sebep (opsiyonel)"
                            multiline
                            minRows={3}
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            fullWidth
                            inputProps={{ maxLength: 500 }}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRejectTargetId(null)} disabled={storyActionPending} color="inherit">
                        İptal
                    </Button>
                    <Button
                        onClick={handleSubmitReject}
                        disabled={storyActionPending}
                        variant="contained"
                        color="error"
                    >
                        Reddet ve Sil
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modal Components */}
            <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                <DialogTitle>{selectedFeed ? 'Video Düzenle' : 'Yeni Video'}</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2} mt={1}>
                        {!selectedFeed && (
                            <TextField
                                label="Oluşturucu E-postası"
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

// ─── Helper components ──────────────────────────────────────

interface StoryAdminCardProps {
    story: AdminStoryDto;
    selected: boolean;
    onToggleSelect: () => void;
    onApprove: () => void;
    onReject: () => void;
    onDelete: () => void;
    disabled: boolean;
}

function StoryAdminCard({
    story,
    selected,
    onToggleSelect,
    onApprove,
    onReject,
    onDelete,
    disabled,
}: StoryAdminCardProps) {
    const statusColor: Record<StoryModerationStatus, 'success' | 'warning' | 'error' | 'default'> = {
        APPROVED: 'success',
        PENDING_REVIEW: 'warning',
        REJECTED: 'error',
    };

    return (
        <Card
            variant="outlined"
            sx={{
                borderRadius: 2,
                position: 'relative',
                outline: selected ? '2px solid' : 'none',
                outlineColor: 'primary.main',
            }}
        >
            <Box
                sx={{
                    position: 'relative',
                    height: 220,
                    bgcolor: 'grey.900',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                {story.mediaUrl ? (
                    <Box
                        component="img"
                        src={story.mediaUrl}
                        sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        alt={story.id}
                    />
                ) : (
                    <ImageIcon sx={{ color: 'grey.500', fontSize: 48 }} />
                )}

                <Checkbox
                    checked={selected}
                    onChange={onToggleSelect}
                    sx={{
                        position: 'absolute',
                        top: 4,
                        left: 4,
                        bgcolor: 'rgba(255,255,255,0.85)',
                        borderRadius: 1,
                        p: 0.5,
                        '&:hover': { bgcolor: 'rgba(255,255,255,1)' },
                    }}
                />

                <Chip
                    size="small"
                    label={story.moderationStatus}
                    color={statusColor[story.moderationStatus] || 'default'}
                    sx={{ position: 'absolute', top: 8, right: 8 }}
                />

                {(story.type === 'VIDEO') && (
                    <Chip
                        size="small"
                        label="Video"
                        sx={{
                            position: 'absolute',
                            bottom: 8,
                            left: 8,
                            bgcolor: 'rgba(0,0,0,0.6)',
                            color: '#fff',
                        }}
                    />
                )}
            </Box>

            <CardContent sx={{ pb: 1 }}>
                <Typography variant="body2" fontWeight={600} noWrap>
                    {story.userId}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    {story.createdAt ? new Date(story.createdAt).toLocaleString() : '-'}
                </Typography>

                <Stack direction="row" spacing={1.5} mt={1} alignItems="center">
                    <Tooltip title="Görüntülenme">
                        <Stack direction="row" spacing={0.5} alignItems="center">
                            <VisibilityIcon fontSize="inherit" />
                            <Typography variant="caption">{story.viewCount}</Typography>
                        </Stack>
                    </Tooltip>
                    <Tooltip title="Rapor">
                        <Stack direction="row" spacing={0.5} alignItems="center">
                            <FlagIcon
                                fontSize="inherit"
                                color={story.reportCount > 0 ? 'error' : 'inherit'}
                            />
                            <Typography
                                variant="caption"
                                color={story.reportCount > 0 ? 'error' : 'text.secondary'}
                            >
                                {story.reportCount}
                            </Typography>
                        </Stack>
                    </Tooltip>
                </Stack>

                {story.rejectionReason && (
                    <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                        Sebep: {story.rejectionReason}
                    </Typography>
                )}
            </CardContent>

            <Stack direction="row" spacing={0.5} px={1} pb={1.5} justifyContent="flex-end">
                {story.moderationStatus !== 'APPROVED' && (
                    <Tooltip title="Onayla">
                        <span>
                            <IconButton size="small" color="success" disabled={disabled} onClick={onApprove}>
                                <CheckIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>
                )}
                <Tooltip title="Reddet (sil)">
                    <span>
                        <IconButton size="small" color="warning" disabled={disabled} onClick={onReject}>
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </span>
                </Tooltip>
                <Tooltip title="Sil">
                    <span>
                        <IconButton size="small" color="error" disabled={disabled} onClick={onDelete}>
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </span>
                </Tooltip>
            </Stack>
        </Card>
    );
}

interface ReportEntryCardProps {
    entry: AdminStoryReportDto;
    disabled: boolean;
    onApprove: () => void;
    onReject: () => void;
}

function ReportEntryCard({ entry, disabled, onApprove, onReject }: ReportEntryCardProps) {
    const { story, reports } = entry;

    return (
        <Card variant="outlined">
            <CardHeader
                avatar={
                    story.mediaUrl ? (
                        <Avatar src={story.mediaUrl} sx={{ width: 56, height: 56 }} variant="rounded" />
                    ) : (
                        <Avatar sx={{ width: 56, height: 56 }} variant="rounded">
                            <ImageIcon />
                        </Avatar>
                    )
                }
                title={
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Typography fontWeight={600}>{story.userId}</Typography>
                        <Chip size="small" label={`${reports.length} rapor`} color="warning" />
                        <Chip size="small" label={story.moderationStatus} variant="outlined" />
                    </Stack>
                }
                subheader={story.createdAt ? new Date(story.createdAt).toLocaleString() : ''}
                action={
                    <Stack direction="row" spacing={1} pt={1} pr={1}>
                        <Button
                            size="small"
                            startIcon={<CheckIcon />}
                            color="success"
                            variant="outlined"
                            disabled={disabled}
                            onClick={onApprove}
                        >
                            Onayla
                        </Button>
                        <Button
                            size="small"
                            startIcon={<CloseIcon />}
                            color="error"
                            variant="outlined"
                            disabled={disabled}
                            onClick={onReject}
                        >
                            Reddet
                        </Button>
                    </Stack>
                }
            />
            <CardContent sx={{ pt: 0 }}>
                <Stack spacing={1}>
                    {reports.map((r) => (
                        <Box key={r.id} sx={{ pl: 1, borderLeft: '3px solid', borderColor: 'warning.main' }}>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Chip size="small" label={r.reason} />
                                <Typography variant="caption" color="text.secondary">
                                    {r.reporterEmail} · {new Date(r.createdAt).toLocaleString()}
                                </Typography>
                            </Stack>
                            {r.description && (
                                <Typography variant="body2" sx={{ mt: 0.5 }}>
                                    {r.description}
                                </Typography>
                            )}
                        </Box>
                    ))}
                </Stack>
            </CardContent>
        </Card>
    );
}
