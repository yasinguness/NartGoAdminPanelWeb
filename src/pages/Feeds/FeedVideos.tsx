import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Typography, Button, TextField, InputAdornment, Chip, Stack,
  IconButton, Tooltip, Menu, MenuItem, Paper, Skeleton, Snackbar, Alert,
  Fade, Pagination, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
} from '@mui/material';
import {
  Search, LayoutGrid, List, ChevronDown,
  Bookmark, CheckCircle2, XCircle, Archive, Trash2, X, Keyboard,
  Video, Filter, Instagram,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { PageContainer, PageHeader } from '../../components/Page';
import { useFeedStore } from '../../store/feeds/feedStore';
import { FeedDto, FeedStatus } from '../../types/feed/feedModel';
import { STATUS_CONFIG, SAVED_VIEWS, SORT_OPTIONS } from './feedConfig';
import FeedVideoCard from './FeedVideoCard';
import FeedVideoTable from './FeedVideoTable';
import FeedSlideOver from './FeedSlideOver';

interface Toast {
  id: string;
  message: string;
  severity: 'success' | 'info' | 'warning';
  undoAction?: () => void;
}

const getApiErrorMessage = (error: unknown): string => {
  const maybeResponseMessage = (error as any)?.response?.data?.message;
  if (typeof maybeResponseMessage === 'string' && maybeResponseMessage.trim()) {
    return maybeResponseMessage;
  }
  return 'Instagram videosu iceri aktarilamadi';
};

export default function FeedVideos() {
  const { 
    feeds, 
    loading, 
    fetchFeeds, 
    importFromInstagram,
    updateFeedStatus,
    deleteFeed,
    totalElements,
    totalPages,
    currentPage
  } = useFeedStore();

  // View state
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [pageSize, setPageSize] = useState(12);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilters, setStatusFilters] = useState<FeedStatus[]>([]);
  const [sortBy, setSortBy] = useState('newest');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [savedView, setSavedView] = useState('Tüm Videolar');
  
  // Anchors
  const [sortAnchor, setSortAnchor] = useState<null | HTMLElement>(null);
  const [viewAnchor, setViewAnchor] = useState<null | HTMLElement>(null);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Confirmation Dialog
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; videoIds: string[] }>({ open: false, videoIds: [] });

  // Slide-over
  const [slideOverVideo, setSlideOverVideo] = useState<FeedDto | null>(null);
  const [slideOverOpen, setSlideOverOpen] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Reject Dialog
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; videoIds: string[]; reason: string }>({ open: false, videoIds: [], reason: '' });

  // Keyboard shortcut visibility
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [instagramDialogOpen, setInstagramDialogOpen] = useState(false);
  const [instagramUrl, setInstagramUrl] = useState('');
  const [instagramCreatorEmail, setInstagramCreatorEmail] = useState('');
  const [instagramTitle, setInstagramTitle] = useState('');
  const [instagramDescription, setInstagramDescription] = useState('');

  // Data fetching
  const loadData = useCallback(async (page: number = 0) => {
    await fetchFeeds({
      keyword: searchQuery || undefined,
      status: statusFilters.length === 1 ? statusFilters[0] : undefined, // API currently might only support single status
      page,
      size: pageSize
    });
  }, [fetchFeeds, searchQuery, statusFilters, pageSize]);

  useEffect(() => {
    loadData(0);
  }, [searchQuery, statusFilters, pageSize]);

  const handlePageChange = (_: any, page: number) => {
    loadData(page - 1);
  };

  // Toast management
  const addToast = useCallback((message: string, severity: Toast['severity'] = 'success', undoAction?: () => void) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, severity, undoAction }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleInstagramImport = useCallback(async () => {
    const trimmedUrl = instagramUrl.trim();
    const trimmedEmail = instagramCreatorEmail.trim();
    const trimmedTitle = instagramTitle.trim();
    const trimmedDescription = instagramDescription.trim();

    if (!trimmedUrl) {
      addToast('Instagram link zorunlu', 'warning');
      return;
    }
    try {
      const result = await importFromInstagram({
        instagramUrl: trimmedUrl,
        creatorEmail: trimmedEmail || undefined,
        title: trimmedTitle || undefined,
        description: trimmedDescription || undefined,
        priority: 5,
      });

      const okMessage = result.message || `Instagram videosu aktarildi (${result.status})`;
      addToast(okMessage, 'success');

      setInstagramDialogOpen(false);
      setInstagramUrl('');
      setInstagramCreatorEmail('');
      setInstagramTitle('');
      setInstagramDescription('');
      await loadData(0);
    } catch (error) {
      addToast(getApiErrorMessage(error), 'warning');
    }
  }, [instagramUrl, instagramCreatorEmail, instagramTitle, instagramDescription, importFromInstagram, addToast, loadData]);

  // Status change
  const handleStatusChange = useCallback(async (videoId: string, newStatus: FeedStatus, reason?: string) => {
    try {
      const video = feeds.find(f => f.id === videoId);
      if (!video) return;
      
        const oldStatus = video.status;
      await updateFeedStatus(videoId, { status: newStatus, rejectionReason: reason });
      
      addToast(
        `"${video.title}" → ${STATUS_CONFIG[newStatus].label}`,
        'success',
        () => {
          updateFeedStatus(videoId, { status: oldStatus });
        }
      );

      if (slideOverVideo?.id === videoId) {
        setSlideOverVideo({ ...video, status: newStatus, rejectionReason: reason || video.rejectionReason });
      }
    } catch (error) {
      addToast('Status update failed', 'warning');
    }
  }, [feeds, updateFeedStatus, addToast, slideOverVideo]);

  const requestStatusChange = useCallback((videoId: string, status: FeedStatus) => {
    if (status === FeedStatus.REJECTED) {
      setRejectDialog({ open: true, videoIds: [videoId], reason: '' });
    } else {
      handleStatusChange(videoId, status);
    }
  }, [handleStatusChange]);

  const handleDelete = useCallback(async (videoIds: string[]) => {
    setDeleteConfirm({ open: true, videoIds });
  }, []);

  const confirmDelete = useCallback(async () => {
    try {
      for (const id of deleteConfirm.videoIds) {
        await deleteFeed(id);
      }
      addToast(`${deleteConfirm.videoIds.length} video silindi`, 'success');
      setSelectedIds(new Set());
      setDeleteConfirm({ open: false, videoIds: [] });
    } catch (error) {
      addToast('Silme işlemi başarısız oldu', 'warning');
    }
  }, [deleteConfirm, deleteFeed, addToast]);
  // Selection
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === feeds.length) return new Set();
      return new Set(feeds.map((v) => v.id));
    });
  }, [feeds]);

  // Bulk actions
  const handleBulkAction = useCallback(async (action: string) => {
    const ids = Array.from(selectedIds);
    const count = ids.length;
    if (count === 0) return;

    if (action === 'delete') {
      handleDelete(ids);
      return;
    }

    if (action === 'reject') {
      setRejectDialog({ open: true, videoIds: ids, reason: '' });
      return;
    }

    const statusMap: Record<string, FeedStatus> = {
      approve: FeedStatus.APPROVED, 
    };
    
    const newStatus = statusMap[action];
    if (newStatus) {
      for (const id of ids) {
        await handleStatusChange(id, newStatus);
      }
    }
    
    setSelectedIds(new Set());
  }, [selectedIds, handleStatusChange, handleDelete]);

  const confirmReject = useCallback(async () => {
    if (!rejectDialog.reason.trim()) {
      addToast('Rejection reason cannot be empty', 'warning');
      return;
    }
    setRejectDialog(prev => ({ ...prev, open: false }));
    for (const id of rejectDialog.videoIds) {
      await handleStatusChange(id, FeedStatus.REJECTED, rejectDialog.reason);
    }
    if (rejectDialog.videoIds.length > 1) {
      setSelectedIds(new Set());
    }
  }, [rejectDialog, handleStatusChange, addToast]);

  // Toggle status filter
  const toggleStatusFilter = useCallback((status: FeedStatus) => {
    setStatusFilters((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [status] // Single select for now as API might prefer it
    );
    setSavedView('');
  }, []);

  // Saved views
  const applySavedView = useCallback((view: typeof SAVED_VIEWS[0]) => {
    setSavedView(view.label);
    setStatusFilters(view.filter ? [view.filter] : []);
    setSearchQuery('');
    setViewAnchor(null);
  }, []);

  // Sort handler
  const handleSort = useCallback((field: string) => {
    if (sortBy === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
  }, [sortBy]);

  const activeFilterCount = statusFilters.length + (searchQuery ? 1 : 0);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === '?') { setShowShortcuts((s) => !s); return; }
      if (e.key === 'Escape') { setSlideOverOpen(false); setShowShortcuts(false); return; }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <PageContainer>
      <PageHeader
        title="Feed Videos"
        subtitle="Video feed içeriklerini yönetin"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Feed Videos', active: true },
        ]}
        actions={
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              variant="outlined"
              startIcon={<Instagram size={16} />}
              onClick={() => setInstagramDialogOpen(true)}
              sx={{
                textTransform: 'none', fontWeight: 600, fontSize: '0.82rem',
                borderRadius: 2,
              }}
            >
              Instagram'dan Al
            </Button>
            <Tooltip title="Keyboard Shortcuts (?)" arrow>
              <IconButton size="small" onClick={() => setShowShortcuts((s) => !s)} sx={{ border: '1px solid', borderColor: 'divider' }}>
                <Keyboard size={16} />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<Video size={16} />}
              sx={{
                textTransform: 'none', fontWeight: 600, fontSize: '0.82rem',
                bgcolor: 'primary.main', borderRadius: 2,
                boxShadow: '0 2px 8px rgba(22, 70, 28, 0.25)',
              }}
            >
              Video Ekle
            </Button>
          </Stack>
        }
      />

      {/* Keyboard shortcuts hint */}
      <AnimatePresence>
        {showShortcuts && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <Paper elevation={0} sx={{ p: 2, mb: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: '#fafafa' }}>
              <Stack direction="row" spacing={3} flexWrap="wrap">
                {[['?', 'Toggle shortcuts'], ['Esc', 'Close panel'], ['j/k', 'Navigate'], ['a', 'Approve'], ['r', 'Reject']].map(([key, desc]) => (
                  <Stack key={key} direction="row" alignItems="center" spacing={0.75}>
                    <Box sx={{ px: 0.75, py: 0.25, bgcolor: '#e5e7eb', borderRadius: 0.75, fontSize: '0.7rem', fontWeight: 700, fontFamily: 'monospace' }}>{key}</Box>
                    <Typography variant="caption" color="text.secondary">{desc}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Paper>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toolbar */}
      <Box sx={{ mb: 2.5 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
          <TextField
            placeholder="Search videos…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            sx={{
              width: 300,
              '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: '0.85rem' },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={16} color="#9ca3af" />
                </InputAdornment>
              ),
              endAdornment: searchQuery ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchQuery('')}><X size={14} /></IconButton>
                </InputAdornment>
              ) : null,
            }}
          />

          <Button
            size="small"
            variant="outlined"
            endIcon={<ChevronDown size={14} />}
            onClick={(e) => setViewAnchor(e.currentTarget)}
            sx={{
              textTransform: 'none', fontWeight: 500, fontSize: '0.8rem',
              borderColor: '#e5e7eb', color: 'text.primary', borderRadius: 2,
            }}
          >
            <Bookmark size={14} style={{ marginRight: 6 }} />
            {savedView || 'Views'}
          </Button>
          <Menu
            anchorEl={viewAnchor}
            open={Boolean(viewAnchor)}
            onClose={() => setViewAnchor(null)}
            PaperProps={{ sx: { minWidth: 180, borderRadius: 2, mt: 0.5 } }}
          >
            {SAVED_VIEWS.map((v) => (
              <MenuItem key={v.label} selected={savedView === v.label} onClick={() => applySavedView(v)} sx={{ fontSize: '0.82rem' }}>
                {v.label}
              </MenuItem>
            ))}
          </Menu>

          <Button
            size="small"
            variant="outlined"
            endIcon={<ChevronDown size={14} />}
            onClick={(e) => setSortAnchor(e.currentTarget)}
            sx={{
              textTransform: 'none', fontWeight: 500, fontSize: '0.8rem',
              borderColor: '#e5e7eb', color: 'text.primary', borderRadius: 2,
            }}
          >
            {SORT_OPTIONS.find((s) => s.value === sortBy)?.label || 'Sort'}
          </Button>
          <Menu
            anchorEl={sortAnchor}
            open={Boolean(sortAnchor)}
            onClose={() => setSortAnchor(null)}
            PaperProps={{ sx: { minWidth: 150, borderRadius: 2, mt: 0.5 } }}
          >
            {SORT_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} selected={sortBy === opt.value} onClick={() => { setSortBy(opt.value); setSortAnchor(null); }} sx={{ fontSize: '0.82rem' }}>
                {opt.label}
              </MenuItem>
            ))}
          </Menu>

          <Box sx={{ ml: 'auto !important' }}>
            <Stack direction="row" spacing={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
              <IconButton
                size="small"
                onClick={() => setViewMode('grid')}
                sx={{
                  borderRadius: 0, px: 1.25,
                  bgcolor: viewMode === 'grid' ? 'primary.main' : 'transparent',
                  color: viewMode === 'grid' ? '#fff' : 'text.secondary',
                }}
              >
                <LayoutGrid size={16} />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => setViewMode('table')}
                sx={{
                  borderRadius: 0, px: 1.25,
                  bgcolor: viewMode === 'table' ? 'primary.main' : 'transparent',
                  color: viewMode === 'table' ? '#fff' : 'text.secondary',
                }}
              >
                <List size={16} />
              </IconButton>
            </Stack>
          </Box>
        </Stack>

        <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, mr: 0.5 }}>
            <Filter size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            Status:
          </Typography>
          {(Object.values(FeedStatus)).map((s) => {
            const sc = STATUS_CONFIG[s];
            if (!sc) return null;
            const active = statusFilters.includes(s);
            return (
              <Chip
                key={s}
                label={sc.label}
                size="small"
                onClick={() => toggleStatusFilter(s)}
                sx={{
                  height: 26, fontSize: '0.72rem', fontWeight: 600,
                  color: active ? sc.color : '#6b7280',
                  bgcolor: active ? sc.bg : 'transparent',
                  border: `1px solid ${active ? sc.border : '#e5e7eb'}`,
                  cursor: 'pointer',
                }}
              />
            );
          })}
          {activeFilterCount > 0 && (
            <Chip
              label={`Clear (${activeFilterCount})`}
              size="small"
              onClick={() => { setStatusFilters([]); setSearchQuery(''); setSavedView('Tüm Videolar'); }}
              sx={{ height: 26, fontSize: '0.7rem', ml: 0.5 }}
            />
          )}
          <Box sx={{ ml: 'auto' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
              {totalElements} videos found
            </Typography>
          </Box>
        </Stack>
      </Box>

      {/* Loading & Empty States */}
      {loading && feeds.length === 0 ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 2.5 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} variant="rectangular" height={220} sx={{ borderRadius: 2.5 }} />
          ))}
        </Box>
      ) : feeds.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Box sx={{ width: 64, height: 64, borderRadius: 3, bgcolor: '#f3f4f6', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
            <Video size={28} color="#9ca3af" />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>Video bulunamadı</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Filtreleri değiştirmeyi veya farklı bir arama yapmayı deneyin
          </Typography>
          <Button variant="outlined" size="small" onClick={() => { setStatusFilters([]); setSearchQuery(''); setSavedView('Tüm Videolar'); }}
            sx={{ textTransform: 'none', borderRadius: 2 }}>
            Filtreleri Temizle
          </Button>
        </Box>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 2.5 }}>
              <AnimatePresence mode="popLayout">
                {feeds.map((video) => (
                  <FeedVideoCard
                    key={video.id}
                    video={video}
                    selected={selectedIds.has(video.id)}
                    onSelect={toggleSelect}
                    onClick={(v) => { setSlideOverVideo(v); setSlideOverOpen(true); }}
                    onStatusChange={requestStatusChange}
                    onDelete={(id) => handleDelete([id])}
                    statusConfig={STATUS_CONFIG}
                  />
                ))}
              </AnimatePresence>
            </Box>
          ) : (
            <FeedVideoTable
              videos={feeds}
              selectedIds={selectedIds}
              onSelect={toggleSelect}
              onSelectAll={toggleSelectAll}
              onClick={(v) => { setSlideOverVideo(v); setSlideOverOpen(true); }}
              onStatusChange={requestStatusChange}
              onDelete={(id) => handleDelete([id])}
              sortField={sortBy}
              sortDir={sortDir}
              onSort={handleSort}
              statusConfig={STATUS_CONFIG}
            />
          )}

          {totalPages > 1 && (
            <Stack direction="row" justifyContent="center" sx={{ mt: 4 }}>
              <Pagination 
                count={totalPages} 
                page={currentPage + 1} 
                onChange={handlePageChange} 
                color="primary"
                shape="rounded"
              />
            </Stack>
          )}
        </>
      )}

      {/* Bulk Action Bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
            style={{ position: 'fixed', bottom: 24, left: '50%', translateX: '-50%', zIndex: 1100 }}>
            <Paper elevation={3} sx={{ px: 3, py: 1.5, borderRadius: 3, bgcolor: '#1a1a1a', color: '#fff', display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedIds.size} selected</Typography>
              <Box sx={{ width: 1, height: 24, bgcolor: 'rgba(255,255,255,0.15)' }} />
              
               <Button size="small" startIcon={<CheckCircle2 size={14} />} onClick={() => handleBulkAction('approve')} sx={{ color: '#4ade80' }}>Approve</Button>
               <Button size="small" startIcon={<XCircle size={14} />} onClick={() => handleBulkAction('reject')} sx={{ color: '#f87171' }}>Reject</Button>
               <Button size="small" startIcon={<Trash2 size={14} />} onClick={() => handleBulkAction('delete')} sx={{ color: '#f87171' }}>Delete</Button>
               <IconButton size="small" onClick={() => setSelectedIds(new Set())} sx={{ color: 'rgba(255,255,255,0.5)' }}><X size={16} /></IconButton>
             </Paper>
           </motion.div>
         )}
       </AnimatePresence>

      <FeedSlideOver
        video={slideOverVideo}
        open={slideOverOpen}
        onClose={() => setSlideOverOpen(false)}
        onStatusChange={requestStatusChange}
        onDelete={(id) => handleDelete([id])}
        statusConfig={STATUS_CONFIG}
      />

      <Dialog
        open={instagramDialogOpen}
        onClose={() => setInstagramDialogOpen(false)}
        PaperProps={{ sx: { borderRadius: 3, p: 1, minWidth: 440 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Instagram Videosu Al</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Instagram video linkini girin. Sistem videoyu indirip NartGo&apos;ya yükleme isteğini başlatır.
          </DialogContentText>
          <Stack spacing={1.5}>
            <TextField
              autoFocus
              fullWidth
              label="Instagram Linki"
              placeholder="https://www.instagram.com/reel/..."
              value={instagramUrl}
              onChange={(e) => setInstagramUrl(e.target.value)}
            />
            <TextField
              fullWidth
              label="Creator Email (opsiyonel)"
              placeholder="creator@nartgo.com"
              value={instagramCreatorEmail}
              onChange={(e) => setInstagramCreatorEmail(e.target.value)}
            />
            <TextField
              fullWidth
              label="Video Basligi"
              placeholder="Video basligi"
              value={instagramTitle}
              onChange={(e) => setInstagramTitle(e.target.value)}
            />
            <TextField
              fullWidth
              multiline
              minRows={2}
              label="Video Aciklamasi (opsiyonel)"
              placeholder="Video aciklamasi"
              value={instagramDescription}
              onChange={(e) => setInstagramDescription(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setInstagramDialogOpen(false)} color="inherit" sx={{ fontWeight: 600 }}>
            Vazgeç
          </Button>
          <Button onClick={handleInstagramImport} variant="contained" sx={{ fontWeight: 600 }}>
            İçe Aktar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog 
        open={rejectDialog.open} 
        onClose={() => setRejectDialog(prev => ({ ...prev, open: false }))}
        PaperProps={{ sx: { borderRadius: 3, p: 1, minWidth: 400 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Reject Video{rejectDialog.videoIds.length > 1 ? 's' : ''}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Please provide a reason for rejecting the content. The creator will be notified of this reason.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Rejection Reason"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={rejectDialog.reason}
            onChange={(e) => setRejectDialog(prev => ({ ...prev, reason: e.target.value }))}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRejectDialog(prev => ({ ...prev, open: false }))} color="inherit" sx={{ fontWeight: 600 }}>
            Cancel
          </Button>
          <Button onClick={confirmReject} variant="contained" color="error" sx={{ fontWeight: 600 }}>
            Submit Rejection
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteConfirm.open} 
        onClose={() => setDeleteConfirm(prev => ({ ...prev, open: false }))}
        PaperProps={{ sx: { borderRadius: 3, p: 1, minWidth: 400 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Videoları Sil</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {deleteConfirm.videoIds.length} videoyu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteConfirm(prev => ({ ...prev, open: false }))} color="inherit" sx={{ fontWeight: 600 }}>
            Vazgeç
          </Button>
          <Button onClick={confirmDelete} variant="contained" color="error" sx={{ fontWeight: 600 }}>
            Sil
          </Button>
        </DialogActions>
      </Dialog>

      {toasts.map((toast, i) => (
        <Snackbar key={toast.id} open anchorOrigin={{ vertical: 'top', horizontal: 'right' }} sx={{ top: `${72 + i * 60}px !important` }}>
          <Alert severity={toast.severity} variant="filled" sx={{ borderRadius: 2 }} action={
            <Stack direction="row" spacing={0.5}>
              {toast.undoAction && <Button size="small" sx={{ color: '#fff' }} onClick={() => { toast.undoAction!(); removeToast(toast.id); }}>Undo</Button>}
              <IconButton size="small" sx={{ color: '#fff' }} onClick={() => removeToast(toast.id)}><X size={14} /></IconButton>
            </Stack>
          }>
            {toast.message}
          </Alert>
        </Snackbar>
      ))}
    </PageContainer>
  );
}
