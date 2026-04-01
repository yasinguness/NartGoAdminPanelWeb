import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Chip, FormControl, Grid, InputLabel,
  MenuItem, Select, Stack, Switch, TextField, Typography, FormControlLabel,
  IconButton, LinearProgress, Divider, Tooltip,
} from '@mui/material';
import {
  Save as SaveIcon, Publish as PublishIcon, ArrowBack as BackIcon,
  Delete as DeleteIcon, AddPhotoAlternate as AddPhotoIcon,
  FormatBold, FormatItalic, FormatListBulleted, FormatQuote,
  Title as TitleIcon, Link as LinkIcon, Image as ImageIcon,
  Visibility as PreviewIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useNavigate, useParams } from 'react-router-dom';
import { useArticleStore } from '../../store/article/articleStore';
import { articleService } from '../../services/article/articleService';
import {
  ArticleCategory, ArticleType, ArticleStatus,
  CATEGORY_LABELS, TYPE_LABELS,
} from '../../types/article/articleModel';
import type { ArticleCreateRequest, ArticleDto, ArticleMediaDto } from '../../types/article/articleModel';

const initialForm: ArticleCreateRequest = {
  title: '',
  slug: '',
  summary: '',
  body: '',
  contentType: ArticleType.ARTICLE,
  category: ArticleCategory.CULTURE,
  coverImageUrl: '',
  author: '',
  tags: [],
  featured: false,
  breakingNews: false,
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
    .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/İ/g, 'i').replace(/Ğ/g, 'g').replace(/Ü/g, 'u')
    .replace(/Ş/g, 's').replace(/Ö/g, 'o').replace(/Ç/g, 'c')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function wordCount(html: string): number {
  const text = html.replace(/<[^>]*>/g, '').trim();
  if (!text) return 0;
  return text.split(/\s+/).length;
}

function readTime(html: string): number {
  return Math.max(1, Math.ceil(wordCount(html) / 200));
}

export default function ContentEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { createArticle, updateArticle } = useArticleStore();

  const isEdit = !!id;
  const [form, setForm] = useState<ArticleCreateRequest>(initialForm);
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [article, setArticle] = useState<ArticleDto | null>(null);
  const [autoSlug, setAutoSlug] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEdit && id) loadArticle(id);
  }, [id]);

  // Auto-save draft every 30 seconds
  useEffect(() => {
    if (!isEdit || !article || article.status === ArticleStatus.PUBLISHED) return;
    autoSaveRef.current = setInterval(async () => {
      if (!form.title.trim()) return;
      try {
        await articleService.updateArticle(id!, form);
        setLastSaved(new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));
      } catch { /* silent */ }
    }, 30000);
    return () => { if (autoSaveRef.current) clearInterval(autoSaveRef.current); };
  }, [isEdit, article, form]);

  // Auto-slug from title
  useEffect(() => {
    if (autoSlug && !isEdit) {
      setForm(prev => ({ ...prev, slug: slugify(prev.title) }));
    }
  }, [form.title, autoSlug, isEdit]);

  const loadArticle = async (articleId: string) => {
    try {
      setLoading(true);
      const res = await articleService.getArticles({ page: 0, size: 100 });
      const found = res.content?.find((a: ArticleDto) => a.id === articleId);
      if (found) {
        setArticle(found);
        setForm({
          title: found.title,
          slug: found.slug,
          summary: found.summary || '',
          body: found.body || '',
          contentType: found.contentType,
          category: found.category,
          coverImageUrl: found.coverImageUrl || '',
          author: found.author || '',
          tags: found.tags || [],
          featured: found.featured,
          breakingNews: found.breakingNews,
        });
        setAutoSlug(false);
      }
    } catch {
      enqueueSnackbar('Icerik yuklenemedi', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (publish = false) => {
    if (!form.title.trim()) {
      enqueueSnackbar('Baslik zorunludur', { variant: 'warning' });
      return;
    }
    try {
      setLoading(true);
      if (isEdit && id) {
        await updateArticle(id, form);
        if (publish) await articleService.publishArticle(id);
        enqueueSnackbar(publish ? 'Yayinlandi' : 'Kaydedildi', { variant: 'success' });
      } else {
        const created = await createArticle(form);
        if (publish && created?.id) await articleService.publishArticle(created.id);
        enqueueSnackbar(publish ? 'Olusturuldu ve yayinlandi' : 'Taslak kaydedildi', { variant: 'success' });
      }
      navigate('/content');
    } catch {
      enqueueSnackbar('Kaydetme hatasi', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const insertHtml = (before: string, after: string = '') => {
    const textarea = bodyRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = form.body?.substring(start, end) || '';
    const newBody = (form.body || '').substring(0, start) + before + selected + after + (form.body || '').substring(end);
    setForm(prev => ({ ...prev, body: newBody }));
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = start + before.length;
      textarea.selectionEnd = start + before.length + selected.length;
    }, 0);
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !form.tags?.includes(tag)) {
      setForm({ ...form, tags: [...(form.tags || []), tag] });
      setTagInput('');
    }
  };

  const updateField = useCallback(<K extends keyof ArticleCreateRequest>(key: K, value: ArticleCreateRequest[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const words = wordCount(form.body || '');
  const estimatedReadTime = readTime(form.body || '');

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      {loading && <LinearProgress sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999 }} />}

      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Button startIcon={<BackIcon />} onClick={() => navigate('/content')} color="inherit">
            Geri
          </Button>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              {isEdit ? 'Icerigi Duzenle' : 'Yeni Icerik'}
            </Typography>
            {lastSaved && (
              <Typography variant="caption" color="text.secondary">
                Son kaydedildi: {lastSaved}
              </Typography>
            )}
          </Box>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Onizleme">
            <IconButton onClick={() => setShowPreview(!showPreview)}>
              <PreviewIcon color={showPreview ? 'primary' : 'inherit'} />
            </IconButton>
          </Tooltip>
          <Button variant="outlined" startIcon={<SaveIcon />} onClick={() => handleSave(false)} disabled={loading}>
            Taslak Kaydet
          </Button>
          <Button variant="contained" startIcon={<PublishIcon />} onClick={() => handleSave(true)} disabled={loading}
            sx={{ bgcolor: '#1A5C28', '&:hover': { bgcolor: '#15491F' } }}>
            Yayinla
          </Button>
        </Stack>
      </Stack>

      <Grid container spacing={3}>
        {/* Left Column - Content */}
        <Grid item xs={12} md={8}>
          <Stack spacing={2.5}>
            {/* Title */}
            <TextField
              fullWidth value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="Makale basligini girin..."
              variant="standard"
              InputProps={{ sx: { fontSize: 26, fontWeight: 700, '&:before': { borderBottom: 'none' } }, disableUnderline: true }}
            />

            {/* Slug */}
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="caption" color="text.secondary" sx={{ minWidth: 40 }}>URL:</Typography>
              <TextField
                size="small" fullWidth value={form.slug}
                onChange={(e) => { setAutoSlug(false); updateField('slug', e.target.value); }}
                sx={{ '& .MuiInputBase-input': { fontSize: 13, color: 'text.secondary' } }}
              />
            </Stack>

            {/* Summary */}
            <TextField
              label="Ozet" fullWidth multiline rows={2} value={form.summary}
              onChange={(e) => updateField('summary', e.target.value)}
              inputProps={{ maxLength: 300 }}
              helperText={`${form.summary?.length || 0}/300 karakter`}
            />

            {/* Cover Image */}
            <Card variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>Kapak Gorseli</Typography>
              <TextField
                size="small" fullWidth value={form.coverImageUrl} placeholder="https://..."
                onChange={(e) => updateField('coverImageUrl', e.target.value)}
              />
              {form.coverImageUrl && (
                <Box sx={{ mt: 1.5, borderRadius: 2, overflow: 'hidden', maxHeight: 200, position: 'relative' }}>
                  <img src={form.coverImageUrl} alt="cover" style={{ width: '100%', objectFit: 'cover', maxHeight: 200 }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </Box>
              )}
            </Card>

            {/* Rich Text Toolbar */}
            <Card variant="outlined">
              <Stack direction="row" spacing={0.5} sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider', flexWrap: 'wrap' }}>
                <Tooltip title="Baslik (H2)"><IconButton size="small" onClick={() => insertHtml('<h2>', '</h2>')}><TitleIcon fontSize="small" /></IconButton></Tooltip>
                <Tooltip title="Kalin"><IconButton size="small" onClick={() => insertHtml('<strong>', '</strong>')}><FormatBold fontSize="small" /></IconButton></Tooltip>
                <Tooltip title="Italik"><IconButton size="small" onClick={() => insertHtml('<em>', '</em>')}><FormatItalic fontSize="small" /></IconButton></Tooltip>
                <Tooltip title="Liste"><IconButton size="small" onClick={() => insertHtml('<ul>\n<li>', '</li>\n</ul>')}><FormatListBulleted fontSize="small" /></IconButton></Tooltip>
                <Tooltip title="Alinti"><IconButton size="small" onClick={() => insertHtml('<blockquote>', '</blockquote>')}><FormatQuote fontSize="small" /></IconButton></Tooltip>
                <Tooltip title="Link"><IconButton size="small" onClick={() => insertHtml('<a href="">', '</a>')}><LinkIcon fontSize="small" /></IconButton></Tooltip>
                <Tooltip title="Gorsel"><IconButton size="small" onClick={() => insertHtml('<img src="" alt="" />')}><ImageIcon fontSize="small" /></IconButton></Tooltip>
                <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
                <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
                  {words} kelime | ~{estimatedReadTime} dk okuma
                </Typography>
              </Stack>
              {/* Body editor */}
              {showPreview ? (
                <Box sx={{ p: 2, minHeight: 400, '& h2': { mt: 3, mb: 1 }, '& p': { mb: 1.5, lineHeight: 1.7 }, '& blockquote': { borderLeft: '3px solid #ccc', pl: 2, ml: 0, color: 'text.secondary' }, '& img': { maxWidth: '100%', borderRadius: 2 } }}>
                  <div dangerouslySetInnerHTML={{ __html: form.body || '<p style="color: #999">Onizleme icin icerik girin...</p>' }} />
                </Box>
              ) : (
                <textarea
                  ref={bodyRef}
                  value={form.body || ''}
                  onChange={(e) => updateField('body', e.target.value)}
                  placeholder="<p>Makale icerigini buraya yazin...</p>"
                  style={{
                    width: '100%', minHeight: 400, border: 'none', outline: 'none', padding: 16,
                    fontFamily: '"JetBrains Mono", "Fira Code", monospace', fontSize: 14, lineHeight: 1.6,
                    resize: 'vertical', background: 'transparent',
                  }}
                />
              )}
            </Card>

            {/* Tags */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>Etiketler</Typography>
              <Stack direction="row" spacing={1} mb={1}>
                <TextField
                  size="small" placeholder="Etiket ekle..." value={tagInput} fullWidth
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                />
                <Button size="small" variant="outlined" onClick={handleAddTag} sx={{ minWidth: 70 }}>Ekle</Button>
              </Stack>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                {form.tags?.map((tag) => (
                  <Chip key={tag} label={tag} size="small" onDelete={() => setForm({ ...form, tags: form.tags?.filter(t => t !== tag) })} />
                ))}
              </Stack>
            </Box>
          </Stack>
        </Grid>

        {/* Right Column - Settings */}
        <Grid item xs={12} md={4}>
          <Stack spacing={2.5} sx={{ position: 'sticky', top: 24 }}>
            {/* Status */}
            {article && (
              <Alert
                severity={article.status === ArticleStatus.PUBLISHED ? 'success' : article.status === ArticleStatus.ARCHIVED ? 'error' : 'info'}
                variant="outlined"
              >
                Durum: <strong>{article.status === ArticleStatus.PUBLISHED ? 'Yayinda' : article.status === ArticleStatus.ARCHIVED ? 'Arsivde' : 'Taslak'}</strong>
              </Alert>
            )}

            {/* Content Settings */}
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>Icerik Ayarlari</Typography>
                <Stack spacing={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Icerik Turu</InputLabel>
                    <Select value={form.contentType} label="Icerik Turu" onChange={(e) => updateField('contentType', e.target.value as ArticleType)}>
                      {Object.entries(TYPE_LABELS).map(([k, v]) => (
                        <MenuItem key={k} value={k}>{v}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl fullWidth size="small">
                    <InputLabel>Kategori</InputLabel>
                    <Select value={form.category} label="Kategori" onChange={(e) => updateField('category', e.target.value as ArticleCategory)}>
                      {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                        <MenuItem key={k} value={k}>{v}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <TextField
                    label="Yazar" fullWidth size="small" value={form.author}
                    onChange={(e) => updateField('author', e.target.value)}
                  />
                </Stack>
              </CardContent>
            </Card>

            {/* Features */}
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>Ozellikler</Typography>
                <Stack spacing={0.5}>
                  <FormControlLabel
                    control={<Switch checked={form.featured} onChange={(e) => updateField('featured', e.target.checked)} color="warning" />}
                    label={<Typography variant="body2">One Cikar</Typography>}
                  />
                  <FormControlLabel
                    control={<Switch checked={form.breakingNews} onChange={(e) => updateField('breakingNews', e.target.checked)} color="error" />}
                    label={<Typography variant="body2" color={form.breakingNews ? 'error' : 'inherit'}>Son Dakika Haberi</Typography>}
                  />
                </Stack>
              </CardContent>
            </Card>

            {/* Stats */}
            {article && (
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" fontWeight={700} gutterBottom>Istatistikler</Typography>
                  <Stack spacing={1}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">Okuma suresi</Typography>
                      <Typography variant="body2" fontWeight={600}>~{article.readTimeMinutes} dk</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">Goruntulenme</Typography>
                      <Typography variant="body2" fontWeight={600}>{article.viewCount?.toLocaleString()}</Typography>
                    </Stack>
                    {article.publishedAt && (
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">Yayin tarihi</Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {new Date(article.publishedAt).toLocaleDateString('tr-TR')}
                        </Typography>
                      </Stack>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            )}

            {/* Help */}
            <Card variant="outlined" sx={{ bgcolor: 'action.hover' }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>HTML Yardim</Typography>
                <Typography variant="caption" color="text.secondary" component="div" sx={{ fontFamily: 'monospace', lineHeight: 1.8 }}>
                  {'<h2>Baslik</h2>'}<br />
                  {'<p>Paragraf</p>'}<br />
                  {'<strong>Kalin</strong>'}<br />
                  {'<em>Italik</em>'}<br />
                  {'<a href="url">Link</a>'}<br />
                  {'<img src="url" />'}<br />
                  {'<blockquote>Alinti</blockquote>'}
                </Typography>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
