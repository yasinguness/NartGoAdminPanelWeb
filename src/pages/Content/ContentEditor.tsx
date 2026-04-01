import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Box, Button, Card, CardContent, Chip, FormControl, Grid, InputLabel,
  MenuItem, Select, Stack, Switch, TextField, Typography, FormControlLabel,
  IconButton, LinearProgress, Divider, Tooltip, Avatar, alpha, Paper,
} from '@mui/material';
import {
  Save as SaveIcon, Publish as PublishIcon, ArrowBack as BackIcon,
  Delete as DeleteIcon, AddPhotoAlternate as AddPhotoIcon,
  FormatBold, FormatItalic, FormatListBulleted, FormatQuote,
  Title as TitleIcon, Link as LinkIcon, Image as ImageIcon,
  Visibility as PreviewIcon, Close as CloseIcon,
  FormatUnderlined, FormatAlignLeft, FormatAlignCenter,
  FormatAlignRight, FormatListNumbered, Undo, Redo,
  Abc as AbcIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useNavigate, useParams } from 'react-router-dom';
import { useArticleStore } from '../../store/article/articleStore';
import { articleService } from '../../services/article/articleService';
import {
  ArticleCategory, ArticleType, ArticleStatus,
  CATEGORY_LABELS, TYPE_LABELS,
} from '../../types/article/articleModel';
import type { ArticleCreateRequest, ArticleDto } from '../../types/article/articleModel';


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
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEdit && id) loadArticle(id);
  }, [id]);

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
      setLastSaved(new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));
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

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', p: 4 }}>
      {loading && <LinearProgress sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999 }} />}

      {/* Modern Toolbar */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Button 
            variant="outlined" 
            startIcon={<BackIcon />} 
            onClick={() => navigate('/content')} 
            sx={{ borderRadius: 3, textTransform: 'none', px: 2, borderColor: 'divider', color: 'text.primary', fontWeight: 600 }}
          >
            Geri
          </Button>
          <Box>
            <Typography variant="h6" fontWeight={800}>{isEdit ? 'İçeriği Düzenle' : 'Yeni İçerik'}</Typography>
            {lastSaved && <Typography variant="caption" color="text.secondary">Son kaydedildi: {lastSaved}</Typography>}
          </Box>
        </Stack>

        <Stack direction="row" spacing={1.5}>
          <Button 
            variant="outlined" 
            startIcon={<PreviewIcon />} 
            onClick={() => setShowPreview(!showPreview)}
            sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700, borderColor: 'divider', color: 'text.primary' }}
          >
            Önizle
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<SaveIcon />} 
            onClick={() => handleSave(false)} 
            sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700, borderColor: 'divider', color: 'text.primary' }}
          >
            Taslak Kaydet
          </Button>
          <Button 
            variant="contained" 
            color="primary"
            startIcon={<PublishIcon />} 
            onClick={() => handleSave(true)}
            sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700, px: 3 }}
          >
            Yayınla
          </Button>
        </Stack>
      </Stack>

      <Grid container spacing={3}>
        {/* Main Column */}
        <Grid item xs={12} md={8.5}>
          <Stack spacing={3}>
            <Paper elevation={0} sx={{ p: 4, borderRadius: 4 }}>
              {/* Title Section */}
              <TextField
                fullWidth
                value={form.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="Başlığı buraya girin..."
                variant="standard"
                InputProps={{ 
                  sx: { fontSize: 32, fontWeight: 800, '&:before': { borderBottom: 'none' } }, 
                  disableUnderline: true 
                }}
              />
              <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>nartgo.net/kesfet/</Typography>
                <TextField
                  variant="standard"
                  size="small"
                  value={form.slug}
                  onChange={(e) => { setAutoSlug(false); updateField('slug', e.target.value); }}
                  InputProps={{ sx: { fontSize: 13, color: 'primary.main', fontWeight: 600, borderBottom: '1px dashed' }, disableUnderline: true }}
                />
              </Box>

              {/* Summary */}
              <Box sx={{ mt: 4 }}>
                <Typography variant="caption" fontWeight={800} color="text.secondary" textTransform="uppercase">Özet</Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  value={form.summary}
                  onChange={(e) => updateField('summary', e.target.value)}
                  placeholder="Arama sonuçları ve önizlemelerde gösterilecek özet metin..."
                  sx={{ mt: 1, '& .MuiOutlinedInput-notchedOutline': { border: 'none' }, bgcolor: 'background.default', borderRadius: 2 }}
                />
              </Box>

              <Divider sx={{ my: 4 }} />

              {/* Cover Image Container */}
              <Box>
                <Typography variant="caption" fontWeight={800} color="text.secondary" textTransform="uppercase">Kapak Görseli</Typography>
                <Box 
                  sx={{ 
                    mt: 1.5, 
                    height: 240, 
                    bgcolor: 'background.default', 
                    borderRadius: 3, 
                    border: '2px dashed', 
                    borderColor: 'divider',
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  {form.coverImageUrl ? (
                    <>
                      <img src={form.coverImageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <Box sx={{ position: 'absolute', bottom: 12, right: 12, display: 'flex', gap: 1 }}>
                        <Button variant="contained" size="small" component="label" color="primary">Değiştir</Button>
                      </Box>
                    </>
                  ) : (
                    <>
                      <AddPhotoIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                      <Typography variant="caption" color="text.secondary" fontWeight={700}>Görsel linkini girin veya yükleyin</Typography>
                      <TextField 
                        size="small" sx={{ mt: 2, width: '80%' }} 
                        value={form.coverImageUrl} 
                        onChange={(e) => updateField('coverImageUrl', e.target.value)}
                        placeholder="https://..."
                      />
                    </>
                  )}
                </Box>
              </Box>

              {/* Editor Section */}
              <Box sx={{ mt: 5 }}>
                <Typography variant="caption" fontWeight={800} color="text.secondary" textTransform="uppercase">İçerik</Typography>
                <Paper elevation={0} sx={{ mt: 1.5, borderRadius: 3, overflow: 'hidden' }}>
                  <Stack direction="row" spacing={0.5} sx={{ p: 1, bgcolor: 'background.default', flexWrap: 'wrap', borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Tooltip title="Başlık 2"><IconButton onClick={() => insertHtml('<h2>', '</h2>')} size="small"><Typography variant="subtitle2" fontWeight={800}>H2</Typography></IconButton></Tooltip>
                    <Tooltip title="Başlık 3"><IconButton onClick={() => insertHtml('<h3>', '</h3>')} size="small"><Typography variant="subtitle2" fontWeight={800}>H3</Typography></IconButton></Tooltip>
                    <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                    <IconButton size="small" onClick={() => insertHtml('<strong>', '</strong>')}><FormatBold fontSize="small" /></IconButton>
                    <IconButton size="small" onClick={() => insertHtml('<em>', '</em>')}><FormatItalic fontSize="small" /></IconButton>
                    <IconButton size="small" onClick={() => insertHtml('<u>', '</u>')}><FormatUnderlined fontSize="small" /></IconButton>
                    <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                    <IconButton size="small"><FormatAlignLeft fontSize="small" /></IconButton>
                    <IconButton size="small"><FormatAlignCenter fontSize="small" /></IconButton>
                    <IconButton size="small"><FormatAlignRight fontSize="small" /></IconButton>
                    <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                    <IconButton size="small" onClick={() => insertHtml('<li>', '</li>')}><FormatListBulleted fontSize="small" /></IconButton>
                    <IconButton size="small"><FormatListNumbered fontSize="small" /></IconButton>
                    <IconButton size="small" onClick={() => insertHtml('<blockquote>', '</blockquote>')}><FormatQuote fontSize="small" /></IconButton>
                    <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                    <IconButton size="small" onClick={() => insertHtml('<a href="">', '</a>')}><LinkIcon fontSize="small" /></IconButton>
                    <IconButton size="small" onClick={() => insertHtml('<img src="" />')}><ImageIcon fontSize="small" /></IconButton>
                    <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                    <IconButton size="small"><Undo fontSize="small" /></IconButton>
                    <IconButton size="small"><Redo fontSize="small" /></IconButton>
                  </Stack>

                  {showPreview ? (
                    <Box sx={{ p: 3, minHeight: 400, bgcolor: 'white' }}>
                      <div dangerouslySetInnerHTML={{ __html: form.body || '' }} />
                    </Box>
                  ) : (
                    <textarea
                      ref={bodyRef}
                      value={form.body}
                      onChange={(e) => updateField('body', e.target.value)}
                      placeholder="İçeriği buraya yazın..."
                      style={{ 
                        width: '100%', 
                        minHeight: 400, 
                        border: 'none', 
                        outline: 'none', 
                        padding: 24, 
                        fontSize: 16, 
                        lineHeight: 1.8,
                        fontFamily: 'inherit'
                      }}
                    />
                  )}
                </Paper>
              </Box>

              {/* Tags */}
              <Box sx={{ mt: 5 }}>
                <Typography variant="caption" fontWeight={800} color="text.secondary" textTransform="uppercase">Etiketler</Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap', gap: 1 }}>
                  {form.tags?.map((tag) => (
                    <Chip 
                      key={tag} label={tag} 
                      onDelete={() => setForm({ ...form, tags: form.tags?.filter(t => t !== tag) })}
                      sx={{ borderRadius: 1.5, fontWeight: 700, bgcolor: 'background.default' }} 
                    />
                  ))}
                  <TextField 
                    size="small" variant="standard" placeholder="+ Ekle" 
                    value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                    InputProps={{ disableUnderline: true, sx: { fontSize: 13, borderBottom: '1px solid', borderColor: 'divider', width: 100 } }}
                  />
                </Stack>
              </Box>
            </Paper>
          </Stack>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={3.5}>
          <Stack spacing={3} sx={{ position: 'sticky', top: 24 }}>
            {/* Action Box */}
            <Paper elevation={0} sx={{ p: 3, borderRadius: 4 }}>
              <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: article?.status === ArticleStatus.PUBLISHED ? '#10B981' : '#F59E0B' }} />
                <Typography variant="subtitle2" fontWeight={800}>{article?.status === ArticleStatus.PUBLISHED ? 'Yayında' : 'Taslak'}</Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                {article?.status === ArticleStatus.PUBLISHED ? `Yayınlandı: ${new Date(article.publishedAt!).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}` : 'Son kaydedildi: 14:32'}
              </Typography>
              <Button fullWidth variant="outlined" sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, mb: 1, borderColor: 'divider', color: 'text.primary' }}>
                Taslağa Al
              </Button>
              <Button fullWidth variant="contained" color="primary" sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>
                Değişiklikleri Yayınla
              </Button>
            </Paper>

            {/* Settings Box */}
            <Paper elevation={0} sx={{ p: 3, borderRadius: 4 }}>
              <Typography variant="caption" fontWeight={800} color="text.secondary" textTransform="uppercase">İçerik Ayarları</Typography>
              <Stack spacing={2.5} sx={{ mt: 2 }}>
                <FormControl fullWidth size="small">
                  <InputLabel sx={{ fontWeight: 700, fontSize: 13 }}>İçerik Türü</InputLabel>
                  <Select 
                    value={form.contentType} 
                    label="İçerik Türü" 
                    onChange={(e) => updateField('contentType', e.target.value as ArticleType)}
                    sx={{ borderRadius: 2, fontWeight: 700 }}
                  >
                    {Object.entries(TYPE_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
                  </Select>
                </FormControl>

                <FormControl fullWidth size="small">
                  <InputLabel sx={{ fontWeight: 700, fontSize: 13 }}>Kategori</InputLabel>
                  <Select 
                    value={form.category} 
                    label="Kategori" 
                    onChange={(e) => updateField('category', e.target.value as ArticleCategory)}
                    sx={{ borderRadius: 2, fontWeight: 700 }}
                  >
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
                  </Select>
                </FormControl>

                <Box>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" mb={0.5} display="block">Yazar</Typography>
                  <TextField 
                    fullWidth size="small" value={form.author} 
                    onChange={(e) => updateField('author', e.target.value)}
                    InputProps={{ sx: { borderRadius: 2, bgcolor: '#F1F5F9', border: 'none', fontWeight: 700, '& fieldset': { border: 'none' } } }}
                  />
                </Box>
              </Stack>
            </Paper>

            {/* Properties Box */}
            <Paper elevation={0} sx={{ p: 3, borderRadius: 4 }}>
              <Typography variant="caption" fontWeight={800} color="text.secondary" textTransform="uppercase">Özellikler</Typography>
              <Stack spacing={1} mt={1}>
                <FormControlLabel
                  control={<Switch checked={form.featured} onChange={(e) => updateField('featured', e.target.checked)} color="primary" />}
                  label={<Box><Typography variant="body2" fontWeight={700}>Öne Çıkar</Typography><Typography variant="caption" color="text.secondary">Ana sayfada büyük göster</Typography></Box>}
                />
                <FormControlLabel
                  control={<Switch checked={form.breakingNews} onChange={(e) => updateField('breakingNews', e.target.checked)} color="error" />}
                  label={<Box><Typography variant="body2" fontWeight={700}>Son Dakika</Typography><Typography variant="caption" color="text.secondary">Kırmızı badge + banner</Typography></Box>}
                />
                <FormControlLabel
                  control={<Switch defaultChecked color="primary" />}
                  label={<Box><Typography variant="body2" fontWeight={700}>Yorumlara Kapat</Typography><Typography variant="caption" color="text.secondary">Kullanıcı yorum yapamaz</Typography></Box>}
                />
              </Stack>
            </Paper>

            {/* SEO Preview */}
            <Paper elevation={0} sx={{ p: 3, borderRadius: 4, bgcolor: 'background.default' }}>
              <Typography variant="caption" fontWeight={800} color="text.secondary" textTransform="uppercase">SEO Önizleme</Typography>
              <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <Typography color="primary" variant="body1" fontWeight={600} sx={{ lineClamp: 1, overflow: 'hidden' }}>{form.title || 'Başlık Alanı'}</Typography>
                <Typography color="success.main" variant="caption" sx={{ display: 'block', my: 0.5 }}>nartgo.net › kesfet › {form.slug}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrientation: 'vertical', overflow: 'hidden' }}>
                  {form.summary || 'Arama sonuçlarında görünecek açıklama metni buraya gelecektir.'}
                </Typography>
              </Box>
            </Paper>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
