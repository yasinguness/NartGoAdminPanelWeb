import { useEffect, useState } from 'react';
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, MenuItem, Select, TextField, Tooltip, Typography, InputLabel,
  FormControl, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, TablePagination, Avatar, Stack,
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  Star as StarIcon, StarBorder as StarBorderIcon,
  LocalFireDepartment as FireIcon, Visibility as ViewIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';
import { useArticleStore } from '../../store/article/articleStore';
import {
  ArticleCategory, ArticleStatus, ArticleType,
  CATEGORY_LABELS, STATUS_LABELS, TYPE_LABELS,
} from '../../types/article/articleModel';
import type { ArticleDto } from '../../types/article/articleModel';

const statusColors: Record<ArticleStatus, 'default' | 'success' | 'error'> = {
  [ArticleStatus.DRAFT]: 'default',
  [ArticleStatus.PUBLISHED]: 'success',
  [ArticleStatus.ARCHIVED]: 'error',
};

export default function ContentList() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { articles, totalElements, loading, fetchArticles, deleteArticle, publishArticle, archiveArticle, toggleFeatured, toggleBreaking } = useArticleStore();

  const [page, setPage] = useState(0);
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [search, setSearch] = useState('');
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchArticles({
        page,
        size: 10,
        ...(filterCategory && { category: filterCategory as ArticleCategory }),
        ...(filterStatus && { status: filterStatus as ArticleStatus }),
        ...(search && { keyword: search }),
      });
    }, search ? 400 : 0);
    return () => clearTimeout(timer);
  }, [page, filterCategory, filterStatus, search]);

  const handleDelete = async () => {
    if (!deleteDialog) return;
    try {
      await deleteArticle(deleteDialog);
      enqueueSnackbar('Icerik silindi', { variant: 'success' });
      setDeleteDialog(null);
    } catch {
      enqueueSnackbar('Silme hatasi', { variant: 'error' });
    }
  };

  const handlePublish = async (id: string, currentStatus: ArticleStatus) => {
    try {
      if (currentStatus === ArticleStatus.PUBLISHED) {
        await archiveArticle(id);
        enqueueSnackbar('Arsivlendi', { variant: 'info' });
      } else {
        await publishArticle(id);
        enqueueSnackbar('Yayinlandi', { variant: 'success' });
      }
    } catch {
      enqueueSnackbar('Islem hatasi', { variant: 'error' });
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Icerik Yonetimi</Typography>
          <Typography variant="body2" color="text.secondary">
            Makaleler, haberler ve galeri icerikleri
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/content/new')} sx={{ bgcolor: '#1A5C28' }}>
          Yeni Icerik
        </Button>
      </Stack>

      {/* Filters */}
      <Stack direction="row" spacing={2} mb={3}>
        <TextField
          size="small" placeholder="Ara..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
          sx={{ minWidth: 250 }}
        />
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Kategori</InputLabel>
          <Select value={filterCategory} label="Kategori" onChange={(e) => { setFilterCategory(e.target.value); setPage(0); }}>
            <MenuItem value="">Tumu</MenuItem>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <MenuItem key={k} value={k}>{v}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Durum</InputLabel>
          <Select value={filterStatus} label="Durum" onChange={(e) => { setFilterStatus(e.target.value); setPage(0); }}>
            <MenuItem value="">Tumu</MenuItem>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <MenuItem key={k} value={k}>{v}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {/* Table */}
      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Kapak</TableCell>
              <TableCell>Baslik</TableCell>
              <TableCell>Kategori</TableCell>
              <TableCell>Tur</TableCell>
              <TableCell>Durum</TableCell>
              <TableCell align="center">Goruntulenme</TableCell>
              <TableCell>Yayin Tarihi</TableCell>
              <TableCell align="right">Aksiyonlar</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {articles.map((article) => (
              <TableRow key={article.id} hover>
                <TableCell>
                  <Avatar variant="rounded" src={article.coverImageUrl} sx={{ width: 56, height: 40 }}>
                    {article.title[0]}
                  </Avatar>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 300 }}>
                    {article.title}
                  </Typography>
                  {article.summary && (
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 300, display: 'block' }}>
                      {article.summary}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip label={CATEGORY_LABELS[article.category]} size="small" />
                </TableCell>
                <TableCell>
                  <Typography variant="caption">{TYPE_LABELS[article.contentType]}</Typography>
                </TableCell>
                <TableCell>
                  <Chip label={STATUS_LABELS[article.status]} size="small" color={statusColors[article.status]} />
                </TableCell>
                <TableCell align="center">
                  <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5}>
                    <ViewIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="caption">{article.viewCount}</Typography>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Typography variant="caption">
                    {article.publishedAt ? new Date(article.publishedAt).toLocaleDateString('tr-TR') : '-'}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                    <Tooltip title={article.featured ? 'One cikarmayi kaldir' : 'One cikar'}>
                      <IconButton size="small" onClick={() => toggleFeatured(article.id)}>
                        {article.featured ? <StarIcon color="warning" /> : <StarBorderIcon />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={article.breakingNews ? 'Breaking kaldir' : 'Breaking yap'}>
                      <IconButton size="small" onClick={() => toggleBreaking(article.id)}>
                        <FireIcon color={article.breakingNews ? 'error' : 'disabled'} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Duzenle">
                      <IconButton size="small" onClick={() => navigate(`/content/${article.id}/edit`)}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={article.status === ArticleStatus.PUBLISHED ? 'Arsivle' : 'Yayinla'}>
                      <Chip
                        size="small" clickable
                        label={article.status === ArticleStatus.PUBLISHED ? 'Arsivle' : 'Yayinla'}
                        color={article.status === ArticleStatus.PUBLISHED ? 'default' : 'success'}
                        onClick={() => handlePublish(article.id, article.status)}
                      />
                    </Tooltip>
                    <Tooltip title="Sil">
                      <IconButton size="small" color="error" onClick={() => setDeleteDialog(article.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {!loading && articles.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary">Icerik bulunamadi</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div" count={totalElements} page={page} rowsPerPage={10}
          onPageChange={(_, p) => setPage(p)} rowsPerPageOptions={[10]}
        />
      </TableContainer>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteDialog} onClose={() => setDeleteDialog(null)}>
        <DialogTitle>Icerigi Sil</DialogTitle>
        <DialogContent>
          <Typography>Bu icerigi silmek istediginize emin misiniz?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(null)}>Iptal</Button>
          <Button onClick={handleDelete} color="error" variant="contained">Sil</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
