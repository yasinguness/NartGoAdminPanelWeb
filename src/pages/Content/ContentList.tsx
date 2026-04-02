import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, MenuItem, Select, TextField, Tooltip, Typography,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Avatar, Stack, Checkbox, Grid, alpha,
  Pagination, PaginationItem, FormControl, Divider, InputAdornment,
  useTheme, Card,
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  Visibility as ViewIcon, Search as SearchIcon,
  FileDownload as DownloadIcon, FilterList as FilterIcon,
  CheckCircle as CheckCircleIcon, Archive as ArchiveIcon,
  Close as CloseIcon, ArrowBackIosNew, ArrowForwardIos,
  TrendingUp, AccessTime, Article as ArticleIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';
import { useArticleStore } from '../../store/article/articleStore';
import {
  ArticleCategory, ArticleStatus, ArticleType,
  CATEGORY_LABELS, STATUS_LABELS, TYPE_LABELS,
} from '../../types/article/articleModel';
import type { ArticleDto } from '../../types/article/articleModel';
import { useRole } from '../../hooks/useRole';
import { PageContainer, PageHeader } from '../../components/Page';

const statusColors: Record<ArticleStatus, string> = {
  [ArticleStatus.DRAFT]: '#94A3B8',
  [ArticleStatus.PUBLISHED]: '#10B981',
  [ArticleStatus.ARCHIVED]: '#EF4444',
};

const statusBgColors: Record<ArticleStatus, string> = {
  [ArticleStatus.DRAFT]: '#F1F5F9',
  [ArticleStatus.PUBLISHED]: '#ECFDF5',
  [ArticleStatus.ARCHIVED]: '#FEF2F2',
};

export default function ContentList() {
  const navigate = useNavigate();
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const {
    articles, totalElements, loading, fetchArticles,
    deleteArticle, publishArticle, archiveArticle,
  } = useArticleStore();
  const { isEditorOnly, userName, userEmail } = useRole();

  const visibleArticles = useMemo(() => articles, [articles]);

  const [page, setPage] = useState(0);
  const [pageSize] = useState(10);
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchArticles({
        page,
        size: pageSize,
        ...(filterCategory && { category: filterCategory as ArticleCategory }),
        ...(filterStatus && { status: filterStatus as ArticleStatus }),
        ...(filterType && { contentType: filterType as ArticleType }),
        ...(isEditorOnly && { author: userName || userEmail }),
        ...(search && { keyword: search }),
      });
    }, search ? 400 : 0);
    return () => clearTimeout(timer);
  }, [page, pageSize, filterCategory, filterStatus, filterType, search, fetchArticles, isEditorOnly, userName, userEmail]);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedIds(visibleArticles.map(a => a.id));
    } else {
      setSelectedIds([]);
    }
  }, [visibleArticles]);

  const handleSelectOne = useCallback((id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id],
    );
  }, []);

  const handleBulkAction = useCallback(async (action: 'publish' | 'archive' | 'delete') => {
    try {
      for (const id of selectedIds) {
        if (action === 'publish') await publishArticle(id);
        if (action === 'archive') await archiveArticle(id);
        if (action === 'delete') await deleteArticle(id);
      }
      enqueueSnackbar(`${selectedIds.length} icerik güncellendi`, { variant: 'success' });
      setSelectedIds([]);
      fetchArticles({ page, size: pageSize, ...(isEditorOnly && { author: userName || userEmail }) });
    } catch {
      enqueueSnackbar('İşlem sırasında hata oluştu', { variant: 'error' });
    }
  }, [selectedIds, page, pageSize, publishArticle, archiveArticle, deleteArticle, fetchArticles, enqueueSnackbar, isEditorOnly, userName, userEmail]);

  const stats = useMemo(() => [
    { label: 'Toplam İçerik', value: totalElements, detail: '+6 bu ay', color: theme.palette.primary.main, icon: <ArticleIcon /> },
    { label: 'Yayında', value: visibleArticles.filter(a => a.status === ArticleStatus.PUBLISHED).length, detail: '%75 yayın oranı', color: '#10B981', icon: <CheckCircleIcon /> },
    { label: 'Toplam Görüntülenme', value: visibleArticles.reduce((acc, a) => acc + (a.viewCount || 0), 0), detail: '+%34 geçen ay', color: '#3b82f6', icon: <ViewIcon /> },
    { label: 'Ort. Okuma Süresi', value: '4 dk', detail: 'İyi etkileşim', color: '#f59e0b', icon: <AccessTime /> },
  ], [totalElements, visibleArticles, theme]);

  return (
    <PageContainer>
      <PageHeader
        title="İçerik & Makaleler"
        subtitle={`Makaleler, haberler ve galeri içerikleri · Toplam ${totalElements} içerik`}
        breadcrumbs={[
          { label: 'Kontrol Paneli', href: '/dashboard' },
          { label: 'İçerik & Makaleler' },
        ]}
        actions={
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            >
              CSV İndir
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/content/new')}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
            >
              Yeni İçerik
            </Button>
          </Stack>
        }
      />

      {/* Stats Grid */}
      <Grid container spacing={2} mb={3}>
        {stats.map((s, i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <Card
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 3,
                background: `linear-gradient(135deg, ${alpha(s.color, 0.06)} 0%, ${alpha(s.color, 0.02)} 100%)`,
                border: `1px solid ${alpha(s.color, 0.12)}`,
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: alpha(s.color, 0.25),
                  boxShadow: `0 8px 24px ${alpha(s.color, 0.12)}`,
                },
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 11 }}
                  >
                    {s.label}
                  </Typography>
                  <Typography variant="h4" fontWeight={800} sx={{ mt: 0.75, color: s.color }}>
                    {typeof s.value === 'number' ? s.value.toLocaleString('tr-TR') : s.value}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: alpha(s.color, 0.12), color: s.color, width: 48, height: 48, borderRadius: 2.5 }}>
                  {s.icon}
                </Avatar>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={0.5} mt={1.5}>
                <TrendingUp sx={{ fontSize: 14, color: '#10B981' }} />
                <Typography variant="caption" sx={{ color: '#10B981', fontWeight: 600, fontSize: 11 }}>
                  {s.detail}
                </Typography>
              </Stack>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Filter Bar */}
      <Card
        elevation={0}
        sx={{
          p: 2,
          borderRadius: 3,
          mb: 3,
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <TextField
            size="small"
            placeholder="İçerik ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{
              flexGrow: 1,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                bgcolor: 'background.default',
                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.02) },
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                </InputAdornment>
              ),
              ...(search && {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearch('')}>
                      <CloseIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </InputAdornment>
                ),
              }),
            }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <Select
              value={filterCategory}
              displayEmpty
              onChange={(e) => setFilterCategory(e.target.value)}
              sx={{ borderRadius: 2 }}
            >
              <MenuItem value="">Tüm Kategoriler</MenuItem>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <MenuItem key={k} value={k}>{v}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <Select
              value={filterStatus}
              displayEmpty
              onChange={(e) => setFilterStatus(e.target.value)}
              sx={{ borderRadius: 2 }}
            >
              <MenuItem value="">Tüm Durumlar</MenuItem>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <MenuItem key={k} value={k}>{v}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <Select
              value={filterType}
              displayEmpty
              onChange={(e) => setFilterType(e.target.value)}
              sx={{ borderRadius: 2 }}
            >
              <MenuItem value="">Tüm Türler</MenuItem>
              {Object.entries(TYPE_LABELS).map(([k, v]) => (
                <MenuItem key={k} value={k}>{v}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Card>

      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <Box
          sx={{
            background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
            color: 'white',
            p: 1.5,
            borderRadius: 3,
            mb: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: `0 10px 30px ${alpha(theme.palette.primary.main, 0.3)}`,
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {selectedIds.length} içerik seçildi
            </Typography>
            <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />
            <Button
              size="small"
              color="inherit"
              startIcon={<CheckCircleIcon />}
              onClick={() => handleBulkAction('publish')}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Yayınla
            </Button>
            <Button
              size="small"
              color="inherit"
              startIcon={<ArchiveIcon />}
              onClick={() => handleBulkAction('archive')}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Arşive
            </Button>
            <Button
              size="small"
              color="inherit"
              startIcon={<DeleteIcon />}
              onClick={() => handleBulkAction('delete')}
              sx={{ textTransform: 'none', fontWeight: 600, bgcolor: 'rgba(239,68,68,0.2)', '&:hover': { bgcolor: 'rgba(239,68,68,0.3)' } }}
            >
              Sil
            </Button>
          </Stack>
          <Button
            size="small"
            color="inherit"
            onClick={() => setSelectedIds([])}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Temizle
          </Button>
        </Box>
      )}

      {/* Content Table */}
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          borderRadius: 3,
          overflow: 'hidden',
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Table sx={{ minWidth: 1000 }}>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={selectedIds.length === visibleArticles.length && visibleArticles.length > 0}
                  indeterminate={selectedIds.length > 0 && selectedIds.length < visibleArticles.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </TableCell>
              {['Kapak', 'Başlık', 'Kategori', 'Tür', 'Durum', 'Görüntülenme', 'Aksiyon'].map((h) => (
                <TableCell
                  key={h}
                  align={h === 'Aksiyon' ? 'right' : h === 'Görüntülenme' ? 'center' : 'left'}
                  sx={{ fontWeight: 700, fontSize: 12, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}
                >
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleArticles.map((article) => (
                <TableRow
                key={article.id}
                hover
                sx={{
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                  '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.03) },
                  '&:last-child td': { border: 0 },
                }}
                onClick={() => navigate(`/content/${article.id}`)}
              >
                <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.includes(article.id)}
                    onChange={() => handleSelectOne(article.id)}
                  />
                </TableCell>
                <TableCell>
                  <Avatar
                    variant="rounded"
                    src={article.coverMedia?.originalUrl}
                    sx={{
                      width: 72,
                      height: 48,
                      borderRadius: 2,
                      border: `1px solid ${theme.palette.divider}`,
                      bgcolor: alpha(theme.palette.primary.main, 0.06),
                      color: 'primary.main',
                      fontSize: 16,
                      fontWeight: 700,
                    }}
                  >
                    {article.title[0]}
                  </Avatar>
                </TableCell>
                <TableCell sx={{ maxWidth: 400 }}>
                  <Typography variant="body2" fontWeight={700}>{article.title}</Typography>
                  <Stack direction="row" spacing={1} alignItems="center" mt={0.5}>
                    <Typography variant="caption" color="text.secondary" fontWeight={500}>
                      {article.author || 'NartGo Editör'}
                    </Typography>
                    <Typography variant="caption" color="text.disabled">&middot;</Typography>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <AccessTime sx={{ fontSize: 12, color: 'text.disabled' }} />
                      <Typography variant="caption" color="text.secondary">{article.readTimeMinutes} dk</Typography>
                    </Stack>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Chip
                    label={CATEGORY_LABELS[article.category]}
                    size="small"
                    sx={{ fontWeight: 600, borderRadius: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.06), color: 'text.primary', fontSize: 11 }}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="caption" fontWeight={600} color="text.secondary">
                    {TYPE_LABELS[article.contentType]}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={STATUS_LABELS[article.status]}
                    size="small"
                    sx={{
                      fontWeight: 700,
                      borderRadius: 1.5,
                      fontSize: 11,
                      bgcolor: statusBgColors[article.status],
                      color: statusColors[article.status],
                    }}
                  />
                </TableCell>
                <TableCell align="center">
                  <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center">
                    <ViewIcon sx={{ fontSize: 15, color: 'text.disabled' }} />
                    <Typography variant="caption" fontWeight={700}>
                      {(article.viewCount || 0).toLocaleString('tr-TR')}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                  <Tooltip title="Düzenle">
                    <IconButton size="small" onClick={() => navigate(`/content/${article.id}/edit`, { state: { article } })}>
                      <EditIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Sil">
                    <IconButton size="small" color="error" onClick={() => setDeleteDialog(article.id)}>
                      <DeleteIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {visibleArticles.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                  <ArticleIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                  <Typography variant="body1" fontWeight={600} color="text.secondary">
                    İçerik bulunamadı
                  </Typography>
                  <Typography variant="body2" color="text.disabled" mt={0.5}>
                    Filtreleri değiştirerek veya yeni içerik ekleyerek başlayın.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mt={3}>
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          Toplam {totalElements} içerik &middot; {page * pageSize + 1}-{Math.min((page + 1) * pageSize, totalElements)} gösteriliyor
        </Typography>
        <Pagination
          count={Math.ceil(totalElements / pageSize)}
          page={page + 1}
          onChange={(_, p) => setPage(p - 1)}
          color="primary"
          renderItem={(item) => (
            <PaginationItem
              slots={{ previous: ArrowBackIosNew, next: ArrowForwardIos }}
              {...item}
              sx={{
                borderRadius: 2,
                fontWeight: 700,
                '&.Mui-selected': { bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } },
              }}
            />
          )}
        />
      </Stack>

      {/* Delete Confirmation */}
      <Dialog
        open={!!deleteDialog}
        onClose={() => setDeleteDialog(null)}
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>İçeriği Sil</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            Bu içeriği silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setDeleteDialog(null)}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
          >
            İptal
          </Button>
          <Button
            onClick={async () => {
              if (deleteDialog) {
                await deleteArticle(deleteDialog);
                enqueueSnackbar('İçerik silindi', { variant: 'success' });
                setDeleteDialog(null);
              }
            }}
            color="error"
            variant="contained"
            sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 700 }}
          >
            Sil
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}
