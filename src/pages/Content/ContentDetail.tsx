import { useEffect, useState, useMemo } from 'react';
import {
  Box, Button, Chip, Card, Grid, Stack, Typography,
  Avatar, Divider, Skeleton, Dialog, DialogTitle,
  DialogContent, DialogActions, alpha, useTheme, IconButton, Tooltip,
} from '@mui/material';
import {
  ArrowBack as BackIcon, Edit as EditIcon, Delete as DeleteIcon,
  Publish as PublishIcon, Archive as ArchiveIcon,
  Visibility as ViewIcon, AccessTime, CalendarToday,
  Person as PersonIcon, Category as CategoryIcon,
  Star as StarIcon, Campaign as BreakingIcon,
  Link as LinkIcon, LocalOffer as TagIcon,
  Article as ArticleIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useNavigate, useParams } from 'react-router-dom';
import { useArticleStore } from '../../store/article/articleStore';
import {
  ArticleStatus,
  CATEGORY_LABELS, STATUS_LABELS, TYPE_LABELS,
} from '../../types/article/articleModel';
import { RichContentRenderer } from '../../components/RichContentEditor';
import type { ContentBlock } from '../../types/notification.types';
import { PageContainer, PageHeader } from '../../components/Page';
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

function htmlToBlocks(html?: string): ContentBlock[] {
  if (!html?.trim()) return [];

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const nodes = Array.from(doc.body.children);
  const blocks: ContentBlock[] = [];

  for (const node of nodes) {
    const tag = node.tagName.toLowerCase();

    if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
      blocks.push({ type: 'heading', level: Number(tag[1]) as 1 | 2 | 3, text: (node.textContent || '').trim() });
      continue;
    }
    if (tag === 'p') {
      const text = node.textContent?.trim();
      if (text) blocks.push({ type: 'paragraph', text });
      continue;
    }
    if (tag === 'ul' || tag === 'ol') {
      const items = Array.from(node.querySelectorAll('li')).map((li) => (li.textContent || '').trim()).filter(Boolean);
      if (items.length) blocks.push({ type: tag === 'ul' ? 'bullet_list' : 'ordered_list', items });
      continue;
    }
    if (tag === 'figure') {
      const img = node.querySelector('img');
      if (img?.getAttribute('src')) {
        blocks.push({ type: 'image', url: img.getAttribute('src') || '', caption: node.querySelector('figcaption')?.textContent?.trim() || '', width: 'full' });
      }
      continue;
    }
    if (tag === 'img') {
      const src = node.getAttribute('src');
      if (src) blocks.push({ type: 'image', url: src, caption: node.getAttribute('alt') || '', width: 'full' });
      continue;
    }
    if (tag === 'hr') { blocks.push({ type: 'divider' }); continue; }
    if (tag === 'blockquote') {
      const variant = node.getAttribute('data-callout');
      const footer = node.querySelector('footer');
      if (variant === 'info' || variant === 'warning' || variant === 'success') {
        blocks.push({ type: 'callout', text: node.textContent?.trim() || '', variant });
      } else {
        blocks.push({ type: 'quote', text: node.textContent?.trim() || '', author: footer?.textContent?.trim() || '' });
      }
      continue;
    }
    const fallbackText = node.textContent?.trim();
    if (fallbackText) blocks.push({ type: 'paragraph', text: fallbackText });
  }

  if (blocks.length > 0) return blocks;
  const text = html.replace(/<[^>]*>/g, '').trim();
  return text ? [{ type: 'paragraph', text }] : [];
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('tr-TR', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export default function ContentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const {
    currentArticle, loading, fetchArticle,
    deleteArticle, publishArticle, archiveArticle,
    toggleFeatured, toggleBreaking,
  } = useArticleStore();
  const { isEditorOnly, isOwner } = useRole();

  const [deleteDialog, setDeleteDialog] = useState(false);

  useEffect(() => {
    if (id) {
      fetchArticle(id);
    }
  }, [id, fetchArticle]);

  const article = currentArticle;

  // Editor can only view their own articles
  const canEdit = !isEditorOnly || isOwner(article?.author);

  useEffect(() => {
    if (article && isEditorOnly && !isOwner(article.author)) {
      enqueueSnackbar('Bu içeriği görüntüleme yetkiniz yok', { variant: 'error' });
      navigate('/content');
    }
  }, [article, isEditorOnly, isOwner, enqueueSnackbar, navigate]);

  const blocks = useMemo(() => htmlToBlocks(article?.body), [article?.body]);

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteArticle(id);
      enqueueSnackbar('İçerik silindi', { variant: 'success' });
      navigate('/content');
    } catch {
      enqueueSnackbar('Silme işlemi başarısız', { variant: 'error' });
    }
    setDeleteDialog(false);
  };

  const handlePublish = async () => {
    if (!id) return;
    try {
      await publishArticle(id);
      await fetchArticle(id);
      enqueueSnackbar('İçerik yayınlandı', { variant: 'success' });
    } catch {
      enqueueSnackbar('Yayınlama başarısız', { variant: 'error' });
    }
  };

  const handleArchive = async () => {
    if (!id) return;
    try {
      await archiveArticle(id);
      await fetchArticle(id);
      enqueueSnackbar('İçerik arşivlendi', { variant: 'success' });
    } catch {
      enqueueSnackbar('Arşivleme başarısız', { variant: 'error' });
    }
  };

  const handleToggleFeatured = async () => {
    if (!id) return;
    try {
      await toggleFeatured(id);
      await fetchArticle(id);
      enqueueSnackbar(article?.featured ? 'Öne çıkarma kaldırıldı' : 'Öne çıkarıldı', { variant: 'success' });
    } catch {
      enqueueSnackbar('İşlem başarısız', { variant: 'error' });
    }
  };

  const handleToggleBreaking = async () => {
    if (!id) return;
    try {
      await toggleBreaking(id);
      await fetchArticle(id);
      enqueueSnackbar(article?.breakingNews ? 'Son dakika kaldırıldı' : 'Son dakika olarak işaretlendi', { variant: 'success' });
    } catch {
      enqueueSnackbar('İşlem başarısız', { variant: 'error' });
    }
  };

  // Loading skeleton
  if (loading && !article) {
    return (
      <PageContainer>
        <Stack spacing={3}>
          <Skeleton variant="rectangular" height={48} sx={{ borderRadius: 2 }} />
          <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 3 }} />
          <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 3 }} />
        </Stack>
      </PageContainer>
    );
  }

  if (!article) {
    return (
      <PageContainer>
        <Stack alignItems="center" spacing={2} sx={{ py: 8 }}>
          <ArticleIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
          <Typography variant="h6" color="text.secondary">İçerik bulunamadı</Typography>
          <Button variant="outlined" startIcon={<BackIcon />} onClick={() => navigate('/content')}>
            Listeye Dön
          </Button>
        </Stack>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title={article.title}
        subtitle={`${CATEGORY_LABELS[article.category]} · ${TYPE_LABELS[article.contentType]}`}
        breadcrumbs={[
          { label: 'Kontrol Paneli', href: '/dashboard' },
          { label: 'İçerik & Makaleler', href: '/content' },
          { label: article.title },
        ]}
        actions={
          canEdit ? (
            <Stack direction="row" spacing={1}>
              {article.status === ArticleStatus.DRAFT && (
                <Button
                  variant="contained"
                  startIcon={<PublishIcon />}
                  onClick={handlePublish}
                  sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, bgcolor: '#1a5c28', '&:hover': { bgcolor: '#155220' } }}
                >
                  Yayınla
                </Button>
              )}
              {article.status === ArticleStatus.PUBLISHED && (
                <Button
                  variant="outlined"
                  startIcon={<ArchiveIcon />}
                  onClick={handleArchive}
                  sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                >
                  Arşivle
                </Button>
              )}
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                onClick={() => navigate(`/content/${id}/edit`)}
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
              >
                Düzenle
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => setDeleteDialog(true)}
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
              >
                Sil
              </Button>
            </Stack>
          ) : undefined
        }
      />

      <Grid container spacing={3}>
        {/* Main Content */}
        <Grid item xs={12} md={8}>
          {/* Cover Image */}
          {article.coverMedia?.originalUrl && (
            <Card
              elevation={0}
              sx={{
                borderRadius: 3,
                overflow: 'hidden',
                mb: 3,
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Box
                component="img"
                src={article.coverMedia.originalUrl}
                alt={article.coverMedia.alt || article.title}
                sx={{
                  width: '100%',
                  height: 'auto',
                  maxHeight: 400,
                  objectFit: 'cover',
                  objectPosition: article.coverMedia.focalPointX != null && article.coverMedia.focalPointY != null
                    ? `${Math.round(article.coverMedia.focalPointX * 100)}% ${Math.round(article.coverMedia.focalPointY * 100)}%`
                    : 'center',
                  display: 'block',
                }}
              />
            </Card>
          )}

          {/* Article Body */}
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              p: 4,
              border: `1px solid ${theme.palette.divider}`,
            }}
          >
            {article.summary && (
              <>
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 600, color: 'text.secondary', lineHeight: 1.7, mb: 2 }}
                >
                  {article.summary}
                </Typography>
                <Divider sx={{ mb: 3 }} />
              </>
            )}

            {blocks.length > 0 ? (
              <RichContentRenderer blocks={blocks} />
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'normal' }}>
                İçerik gövdesi henüz eklenmemiş.
              </Typography>
            )}
          </Card>

          {/* Media Gallery */}
          {article.media && article.media.length > 0 && (
            <Card
              elevation={0}
              sx={{ borderRadius: 3, p: 3, mt: 3, border: `1px solid ${theme.palette.divider}` }}
            >
              <Typography variant="subtitle2" fontWeight={700} mb={2}>
                Medya ({article.media.length})
              </Typography>
              <Grid container spacing={1.5}>
                {article.media.map((m) => (
                  <Grid item xs={6} sm={4} md={3} key={m.id}>
                    <Box
                      component="img"
                      src={m.mediaUrl}
                      alt={m.caption || ''}
                      sx={{
                        width: '100%',
                        height: 120,
                        objectFit: 'cover',
                        borderRadius: 2,
                        border: `1px solid ${theme.palette.divider}`,
                      }}
                    />
                    {m.caption && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                        {m.caption}
                      </Typography>
                    )}
                  </Grid>
                ))}
              </Grid>
            </Card>
          )}
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          {/* Status Card */}
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              p: 3,
              mb: 3,
              border: `1px solid ${theme.palette.divider}`,
            }}
          >
            <Typography variant="subtitle2" fontWeight={700} mb={2}>
              Durum Bilgisi
            </Typography>

            <Stack spacing={2}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="text.secondary">Durum</Typography>
                <Chip
                  label={STATUS_LABELS[article.status]}
                  size="small"
                  sx={{
                    fontWeight: 700, borderRadius: 1.5, fontSize: 11,
                    bgcolor: statusBgColors[article.status],
                    color: statusColors[article.status],
                  }}
                />
              </Stack>

              {!isEditorOnly && (
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" color="text.secondary">Öne Çıkan</Typography>
                  <Tooltip title={article.featured ? 'Öne çıkarmayı kaldır' : 'Öne çıkar'}>
                    <IconButton size="small" onClick={handleToggleFeatured}>
                      <StarIcon sx={{ fontSize: 20, color: article.featured ? '#f59e0b' : 'text.disabled' }} />
                    </IconButton>
                  </Tooltip>
                </Stack>
              )}

              {!isEditorOnly && (
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" color="text.secondary">Son Dakika</Typography>
                  <Tooltip title={article.breakingNews ? 'Son dakika kaldır' : 'Son dakika yap'}>
                    <IconButton size="small" onClick={handleToggleBreaking}>
                      <BreakingIcon sx={{ fontSize: 20, color: article.breakingNews ? '#EF4444' : 'text.disabled' }} />
                    </IconButton>
                  </Tooltip>
                </Stack>
              )}
            </Stack>
          </Card>

          {/* Meta Card */}
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              p: 3,
              mb: 3,
              border: `1px solid ${theme.palette.divider}`,
            }}
          >
            <Typography variant="subtitle2" fontWeight={700} mb={2}>
              Detaylar
            </Typography>

            <Stack spacing={2}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar sx={{ width: 32, height: 32, bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main' }}>
                  <PersonIcon sx={{ fontSize: 18 }} />
                </Avatar>
                <Box>
                  <Typography variant="caption" color="text.secondary">Yazar</Typography>
                  <Typography variant="body2" fontWeight={600}>{article.author || 'NartGo Editör'}</Typography>
                </Box>
              </Stack>

              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar sx={{ width: 32, height: 32, bgcolor: alpha('#3b82f6', 0.1), color: '#3b82f6' }}>
                  <CategoryIcon sx={{ fontSize: 18 }} />
                </Avatar>
                <Box>
                  <Typography variant="caption" color="text.secondary">Kategori</Typography>
                  <Typography variant="body2" fontWeight={600}>{CATEGORY_LABELS[article.category]}</Typography>
                </Box>
              </Stack>

              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar sx={{ width: 32, height: 32, bgcolor: alpha('#8b5cf6', 0.1), color: '#8b5cf6' }}>
                  <ArticleIcon sx={{ fontSize: 18 }} />
                </Avatar>
                <Box>
                  <Typography variant="caption" color="text.secondary">Tür</Typography>
                  <Typography variant="body2" fontWeight={600}>{TYPE_LABELS[article.contentType]}</Typography>
                </Box>
              </Stack>

              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar sx={{ width: 32, height: 32, bgcolor: alpha('#10B981', 0.1), color: '#10B981' }}>
                  <ViewIcon sx={{ fontSize: 18 }} />
                </Avatar>
                <Box>
                  <Typography variant="caption" color="text.secondary">Görüntülenme</Typography>
                  <Typography variant="body2" fontWeight={600}>{(article.viewCount || 0).toLocaleString('tr-TR')}</Typography>
                </Box>
              </Stack>

              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar sx={{ width: 32, height: 32, bgcolor: alpha('#f59e0b', 0.1), color: '#f59e0b' }}>
                  <AccessTime sx={{ fontSize: 18 }} />
                </Avatar>
                <Box>
                  <Typography variant="caption" color="text.secondary">Okuma Süresi</Typography>
                  <Typography variant="body2" fontWeight={600}>{article.readTimeMinutes} dakika</Typography>
                </Box>
              </Stack>

              {article.slug && (
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Avatar sx={{ width: 32, height: 32, bgcolor: alpha('#6366f1', 0.1), color: '#6366f1' }}>
                    <LinkIcon sx={{ fontSize: 18 }} />
                  </Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary">Slug</Typography>
                    <Typography variant="body2" fontWeight={600} noWrap>{article.slug}</Typography>
                  </Box>
                </Stack>
              )}
            </Stack>
          </Card>

          {/* Dates Card */}
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              p: 3,
              mb: 3,
              border: `1px solid ${theme.palette.divider}`,
            }}
          >
            <Typography variant="subtitle2" fontWeight={700} mb={2}>
              Tarihler
            </Typography>
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <CalendarToday sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">Oluşturulma</Typography>
                  <Typography variant="body2" fontWeight={500}>{formatDate(article.createdAt)}</Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <CalendarToday sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">Son Güncelleme</Typography>
                  <Typography variant="body2" fontWeight={500}>{formatDate(article.updatedAt)}</Typography>
                </Box>
              </Stack>
              {article.publishedAt && (
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <PublishIcon sx={{ fontSize: 16, color: '#10B981' }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Yayın Tarihi</Typography>
                    <Typography variant="body2" fontWeight={500}>{formatDate(article.publishedAt)}</Typography>
                  </Box>
                </Stack>
              )}
            </Stack>
          </Card>

          {/* Tags Card */}
          {article.tags && article.tags.length > 0 && (
            <Card
              elevation={0}
              sx={{
                borderRadius: 3,
                p: 3,
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                <TagIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Typography variant="subtitle2" fontWeight={700}>
                  Etiketler
                </Typography>
              </Stack>
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {article.tags.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    size="small"
                    sx={{
                      fontWeight: 600,
                      borderRadius: 1.5,
                      fontSize: 12,
                      bgcolor: alpha(theme.palette.primary.main, 0.06),
                      color: 'text.primary',
                    }}
                  />
                ))}
              </Stack>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog}
        onClose={() => setDeleteDialog(false)}
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>İçeriği Sil</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            "<strong>{article.title}</strong>" başlıklı içeriği silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setDeleteDialog(false)}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
          >
            İptal
          </Button>
          <Button
            onClick={handleDelete}
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
