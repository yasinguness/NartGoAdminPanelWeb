import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, MenuItem, Select, TextField, Tooltip, Typography,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Avatar, Stack, Checkbox, Grid, alpha,
  Pagination, PaginationItem, FormControl,
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  Visibility as ViewIcon, Search as SearchIcon,
  FileDownload as DownloadIcon, FilterList as FilterIcon,
  CheckCircle as CheckCircleIcon, Archive as ArchiveIcon,
  Close as CloseIcon, ArrowBackIosNew, ArrowForwardIos,
  TrendingUp, TrendingDown, AccessTime,
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
  const { enqueueSnackbar } = useSnackbar();
  const {
    articles, totalElements, loading, fetchArticles,
    deleteArticle, publishArticle, archiveArticle
  } = useArticleStore();
  const { isEditorOnly, isOwner, userEmail } = useRole();

  // Editor only sees their own articles
  const visibleArticles = useMemo(() => {
    if (!isEditorOnly) return articles;
    return articles.filter(a => a.author?.toLowerCase() === userEmail.toLowerCase());
  }, [articles, isEditorOnly, userEmail]);

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
        ...(search && { keyword: search }),
      });
    }, search ? 400 : 0);
    return () => clearTimeout(timer);
  }, [page, pageSize, filterCategory, filterStatus, search, fetchArticles]);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedIds(visibleArticles.map(a => a.id));
    } else {
      setSelectedIds([]);
    }
  }, [articles]);

  const handleSelectOne = useCallback((id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
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
      fetchArticles({ page, size: pageSize });
    } catch {
      enqueueSnackbar('İşlem sırasında hata oluştu', { variant: 'error' });
    }
  }, [selectedIds, page, pageSize, publishArticle, archiveArticle, deleteArticle, fetchArticles, enqueueSnackbar]);

  const stats = useMemo(() => [
    { label: 'Toplam İçerik', value: totalElements.toString(), detail: '+6 bu ay', trend: 'up', icon: <AddIcon /> },
    { label: 'Yayında', value: visibleArticles.filter(a => a.status === ArticleStatus.PUBLISHED).length.toString(), detail: '%75 yayın oranı', trend: 'neutral', icon: <CheckCircleIcon /> },
    { label: 'Toplam Görüntülenme', value: visibleArticles.reduce((acc, a) => acc + (a.viewCount || 0), 0).toLocaleString(), detail: '+%34 geçen aya göre', trend: 'up', icon: <ViewIcon /> },
    { label: 'Ort. Okuma Süresi', value: '4 dk', detail: 'İyi etkileşim', trend: 'up', icon: <TrendingUp /> },
  ], [totalElements, articles]);

  return (
    <Box sx={{ p: 4, minHeight: '100vh' }}>
      {/* Header & Breadcrumbs */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontWeight: 500 }}>
            İçerik & İletişim › <Box component="span" sx={{ color: 'text.primary', fontWeight: 700 }}>İçerik & Makaleler</Box>
          </Typography>
          <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.02em' }}>İçerik & Makaleler</Typography>
          <Typography variant="body2" color="text.secondary">Makaleler, haberler ve galeri içerikleri · Toplam {totalElements} içerik</Typography>
        </Box>
        
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
            {new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </Typography>
          <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40, fontSize: 14, fontWeight: 700 }}>YB</Avatar>
        </Stack>
      </Stack>

      <Stack direction="row" spacing={2} mb={4}>
        <Button variant="outlined" startIcon={<DownloadIcon />} sx={{ borderRadius: 2, textTransform: 'none', px: 3, py: 1, fontWeight: 600 }}>
          CSV İndir
        </Button>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />} 
          onClick={() => navigate('/content/new')}
          sx={{ borderRadius: 2, textTransform: 'none', px: 3, py: 1, boxShadow: 'none', fontWeight: 700 }}
        >
          + Yeni İçerik
        </Button>
      </Stack>

      {/* Stats Grid */}
      <Grid container spacing={3} mb={4}>
        {stats.map((s, i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 4 }}>
              <Typography variant="h3" fontWeight={800} sx={{ mb: 0.5 }}>{s.value}</Typography>
              <Typography variant="body2" fontWeight={700} color="text.primary" sx={{ mb: 1 }}>{s.label}</Typography>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                {s.trend === 'up' && <TrendingUp sx={{ fontSize: 16, color: '#10B981' }} />}
                <Typography variant="caption" sx={{ color: s.trend === 'up' ? '#10B981' : 'text.secondary', fontWeight: 700 }}>
                  {s.detail}
                </Typography>
              </Stack>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Filter Bar */}
      <Paper elevation={0} sx={{ p: 1.5, borderRadius: 4, mb: 3 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <TextField
            size="small"
            placeholder="Ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{ 
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />,
              sx: { borderRadius: 2 }
            }}
            sx={{ flexGrow: 1 }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <Select value={filterCategory} displayEmpty onChange={(e) => setFilterCategory(e.target.value)} sx={{ borderRadius: 2 }}>
              <MenuItem value="">Tüm Kategoriler</MenuItem>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <Select value={filterStatus} displayEmpty onChange={(e) => setFilterStatus(e.target.value)} sx={{ borderRadius: 2 }}>
              <MenuItem value="">Tüm Durumlar</MenuItem>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <Select value={filterType} displayEmpty onChange={(e) => setFilterType(e.target.value)} sx={{ borderRadius: 2 }}>
              <MenuItem value="">Tüm Türler</MenuItem>
              {Object.entries(TYPE_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
            </Select>
          </FormControl>
          <IconButton sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}><FilterIcon/></IconButton>
        </Stack>
      </Paper>

      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <Box 
          sx={{ 
            bgcolor: 'primary.dark', 
            color: 'white', 
            p: 2, 
            borderRadius: 3, 
            mb: 3, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.3)'
          }}
        >
          <Stack direction="row" spacing={3} alignItems="center">
            <Stack direction="row" spacing={1} alignItems="center">
              <CheckCircleIcon />
              <Typography fontWeight={700}>{selectedIds.length} içerik seçildi</Typography>
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="contained" startIcon={<CheckCircleIcon />} sx={{ bgcolor: 'rgba(255,255,255,0.1)', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }, textTransform: 'none', fontWeight: 600 }} onClick={() => handleBulkAction('publish')}>Yayınla</Button>
              <Button size="small" variant="contained" startIcon={<ArchiveIcon />} sx={{ bgcolor: 'rgba(255,255,255,0.1)', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }, textTransform: 'none', fontWeight: 600 }} onClick={() => handleBulkAction('archive')}>Arşive</Button>
              <Button size="small" variant="contained" startIcon={<CloseIcon />} sx={{ bgcolor: '#7F1D1D', '&:hover': { bgcolor: '#991B1B' }, textTransform: 'none', fontWeight: 600 }} onClick={() => handleBulkAction('delete')}>Sil</Button>
            </Stack>
          </Stack>
          <Button variant="text" sx={{ color: 'white', textTransform: 'none', fontWeight: 700 }} onClick={() => setSelectedIds([])}>Seçimi Temizle</Button>
        </Box>
      )}

      {/* Content Table */}
      <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 4, overflow: 'hidden' }}>
        <Table sx={{ minWidth: 1000 }}>
          <TableHead sx={{ bgcolor: '#F8FAFC' }}>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox 
                  checked={selectedIds.length === visibleArticles.length && visibleArticles.length > 0}
                  indeterminate={selectedIds.length > 0 && selectedIds.length < visibleArticles.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', color: 'text.secondary' }}>Kapak</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', color: 'text.secondary' }}>Başlık</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', color: 'text.secondary' }}>Kategori</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', color: 'text.secondary' }}>Tür</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', color: 'text.secondary' }}>Durum</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', color: 'text.secondary' }}>İletişim</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', color: 'text.secondary' }}>Aksiyon</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleArticles.map((article) => (
              <TableRow key={article.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                <TableCell padding="checkbox">
                  <Checkbox 
                    checked={selectedIds.includes(article.id)}
                    onChange={() => handleSelectOne(article.id)}
                  />
                </TableCell>
                <TableCell>
                  <Avatar 
                    variant="rounded" 
                    src={article.coverImageUrl} 
                    sx={{ width: 80, height: 50, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
                  >
                    {article.title[0]}
                  </Avatar>
                </TableCell>
                <TableCell sx={{ maxWidth: 400 }}>
                  <Typography variant="body1" fontWeight={700}>{article.title}</Typography>
                  <Stack direction="row" spacing={1} alignItems="center" mt={0.5}>
                    <Typography variant="caption" color="text.secondary" fontWeight={500}>
                      {article.author || 'NartGo Editör'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>•</Typography>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <AccessTime sx={{ fontSize: 12, color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary">{article.readTimeMinutes} dk okuma</Typography>
                    </Stack>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={CATEGORY_LABELS[article.category]} 
                    size="small" 
                    sx={{ fontWeight: 700, borderRadius: 1.5, bgcolor: '#F1F5F9', color: '#475569' }} 
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="caption" fontWeight={600} color="text.secondary">{TYPE_LABELS[article.contentType]}</Typography>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={STATUS_LABELS[article.status]} 
                    size="small" 
                    sx={{ 
                      fontWeight: 700, 
                      borderRadius: 1.5, 
                      bgcolor: statusBgColors[article.status], 
                      color: statusColors[article.status] 
                    }} 
                  />
                </TableCell>
                <TableCell align="center">
                  <Stack direction="row" spacing={2} justifyContent="center">
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <ViewIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="caption" fontWeight={700}>{article.viewCount}</Typography>
                    </Stack>
                  </Stack>
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => navigate(`/content/${article.id}/edit`)}>
                    <EditIcon sx={{ fontSize: 20 }} />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => setDeleteDialog(article.id)}>
                    <DeleteIcon sx={{ fontSize: 20 }} />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mt={3}>
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          Toplam {totalElements} içerik · {page * pageSize + 1}-{Math.min((page + 1) * pageSize, totalElements)} gösteriliyor
        </Typography>
        <Pagination 
          count={Math.ceil(totalElements / pageSize)} 
          page={page + 1}
          onChange={(_, p) => setPage(p - 1)}
          renderItem={(item) => (
            <PaginationItem
              slots={{ previous: ArrowBackIosNew, next: ArrowForwardIos }}
              {...item}
              sx={{
                borderRadius: 2,
                fontWeight: 700,
                '&.Mui-selected': { bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }
              }}
            />
          )}
        />
      </Stack>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteDialog} onClose={() => setDeleteDialog(null)} PaperProps={{ sx: { borderRadius: 4, p: 1 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>İçeriği Sil</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">Bu içeriği silmek istediğinize emin misiniz? Bu işlem geri alınamaz.</Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setDeleteDialog(null)} sx={{ textTransform: 'none', fontWeight: 700, color: 'text.secondary' }}>İptal</Button>
          <Button onClick={async () => {
            if (deleteDialog) {
              await deleteArticle(deleteDialog);
              enqueueSnackbar('Icerik silindi', { variant: 'success' });
              setDeleteDialog(null);
            }
          }} color="error" variant="contained" sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 700 }}>Sil</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
