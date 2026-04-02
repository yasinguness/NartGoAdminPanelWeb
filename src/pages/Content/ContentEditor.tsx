import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  Box, Button, Card, CardContent, Chip, FormControl, Grid, InputLabel,
  MenuItem, Select, Stack, Switch, TextField, Typography, FormControlLabel,
  IconButton, LinearProgress, Divider, Avatar, alpha, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import {
  Save as SaveIcon, Publish as PublishIcon, ArrowBack as BackIcon,
  Delete as DeleteIcon, AddPhotoAlternate as AddPhotoIcon,
  Visibility as PreviewIcon, Close as CloseIcon,
  Edit as EditIcon, Check as CheckMarkIcon, CloudUpload as UploadIcon,
  FiberManualRecord as DotIcon,
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
import RichContentEditor, { RichContentRenderer } from '../../components/RichContentEditor';
import type { ContentBlock } from '../../types/notification.types';
import { useRole } from '../../hooks/useRole';

// ─── UTILS ──────────────────────────────────────────
function slugify(text: string): string {
  const trMap: Record<string, string> = {
    'ç': 'c', 'Ç': 'c', 'ğ': 'g', 'Ğ': 'g', 'ı': 'i', 'İ': 'i',
    'ö': 'o', 'Ö': 'o', 'ş': 's', 'Ş': 's', 'ü': 'u', 'Ü': 'u',
  };
  return text
    .split('').map(c => trMap[c] || c).join('')
    .toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const initialForm: ArticleCreateRequest = {
  title: '', slug: '', summary: '', body: '',
  contentType: ArticleType.ARTICLE, category: ArticleCategory.CULTURE,
  coverImageUrl: '', author: '', tags: [],
  featured: false, breakingNews: false,
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripHtmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function htmlToBlocks(html?: string): ContentBlock[] {
  const text = stripHtmlToText(html || '');
  if (!text) return [];

  return text
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk, index) => {
      if (index === 0) {
        return { type: 'paragraph' as const, text: chunk };
      }
      return { type: 'paragraph' as const, text: chunk };
    });
}

function blocksToHtml(blocks: ContentBlock[]): string {
  return blocks
    .map((block) => {
      switch (block.type) {
        case 'heading':
          return `<h${block.level}>${escapeHtml(block.text || '')}</h${block.level}>`;
        case 'paragraph':
          return `<p>${escapeHtml(block.text || '').replace(/\n/g, '<br />')}</p>`;
        case 'bullet_list':
          return `<ul>${block.items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
        case 'ordered_list':
          return `<ol>${block.items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ol>`;
        case 'image':
          if (!block.url) return '';
          return `<figure><img src="${escapeHtml(block.url)}" alt="${escapeHtml(block.caption || '')}" />${
            block.caption ? `<figcaption>${escapeHtml(block.caption)}</figcaption>` : ''
          }</figure>`;
        case 'divider':
          return '<hr />';
        case 'callout':
          return `<blockquote data-callout="${block.variant}">${escapeHtml(block.text || '').replace(/\n/g, '<br />')}</blockquote>`;
        case 'quote':
          return `<blockquote><p>${escapeHtml(block.text || '').replace(/\n/g, '<br />')}</p>${
            block.author ? `<footer>${escapeHtml(block.author)}</footer>` : ''
          }</blockquote>`;
        default:
          return '';
      }
    })
    .filter(Boolean)
    .join('\n');
}

function blocksToPlainText(blocks: ContentBlock[]): string {
  return blocks
    .map((block) => {
      switch (block.type) {
        case 'heading':
        case 'paragraph':
        case 'callout':
        case 'quote':
          return [block.text, block.type === 'quote' ? block.author : ''].filter(Boolean).join(' ');
        case 'bullet_list':
        case 'ordered_list':
          return block.items.join(' ');
        case 'image':
          return block.caption || '';
        default:
          return '';
      }
    })
    .filter(Boolean)
    .join(' ');
}

// ─── COMPONENT ──────────────────────────────────────
export default function ContentEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { createArticle, updateArticle } = useArticleStore();
  const { isEditorOnly, isOwner, userName, userEmail } = useRole();

  const isEdit = !!id;
  const [form, setForm] = useState<ArticleCreateRequest>({ ...initialForm, author: userName || '' });
  const [richBlocks, setRichBlocks] = useState<ContentBlock[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [article, setArticle] = useState<ArticleDto | null>(null);
  const [autoSlug, setAutoSlug] = useState(true);
  const [editingSlug, setEditingSlug] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const coverFileRef = useRef<HTMLInputElement>(null);
  const initialFormRef = useRef<string>('');

  const useBlockEditor = form.contentType !== ArticleType.GALLERY;

  // ─── LIFECYCLE ────────────────────────────────────
  useEffect(() => {
    if (isEdit && id) loadArticle(id);
    initialFormRef.current = JSON.stringify(initialForm);
  }, [id]);

  useEffect(() => {
    if (autoSlug && !isEdit) {
      setForm(prev => ({ ...prev, slug: slugify(prev.title) }));
    }
  }, [form.title, autoSlug, isEdit]);

  // Dirty tracking
  useEffect(() => {
    const current = JSON.stringify({ form, richBlocks });
    setIsDirty(current !== initialFormRef.current);
  }, [form, richBlocks]);

  // Browser close warning
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // ─── LOAD ─────────────────────────────────────────
  const loadArticle = async (articleId: string) => {
    try {
      setLoading(true);
      const res = await articleService.getArticles({ page: 0, size: 100 });
      const found = res.content?.find((a: ArticleDto) => a.id === articleId);
      if (found) {
        // Editor role — ownership check
        if (isEditorOnly && !isOwner(found.author)) {
          enqueueSnackbar('Bu içeriği düzenleme yetkiniz yok', { variant: 'error' });
          navigate('/content');
          return;
        }
        setArticle(found);
        const formData: ArticleCreateRequest = {
          title: found.title, slug: found.slug, summary: found.summary || '',
          body: found.body || '', contentType: found.contentType,
          category: found.category, coverImageUrl: found.coverImageUrl || '',
          author: found.author || '', tags: found.tags || [],
          featured: found.featured, breakingNews: found.breakingNews,
        };
        setForm(formData);
        setRichBlocks(htmlToBlocks(found.body));
        setAutoSlug(false);
        initialFormRef.current = JSON.stringify({ form: formData, richBlocks: htmlToBlocks(found.body) });
      }
    } catch {
      enqueueSnackbar('İçerik yüklenemedi', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // ─── SAVE ─────────────────────────────────────────
  const handleSave = async (publish = false) => {
    if (!form.title.trim()) {
      enqueueSnackbar('Başlık zorunludur', { variant: 'warning' });
      return;
    }
    if (useBlockEditor && richBlocks.length === 0) {
      enqueueSnackbar('İçerik alanı boş bırakılamaz', { variant: 'warning' });
      return;
    }
    try {
      setLoading(true);
      const payload = {
        ...form,
        body: useBlockEditor ? blocksToHtml(richBlocks) : form.body,
      };
      if (isEdit && id) {
        await updateArticle(id, payload);
        if (publish) await articleService.publishArticle(id);
        enqueueSnackbar(publish ? 'Yayınlandı' : 'Kaydedildi', { variant: 'success' });
      } else {
        const created = await createArticle(payload);
        if (publish && created?.id) await articleService.publishArticle(created.id);
        enqueueSnackbar(publish ? 'Oluşturuldu ve yayınlandı' : 'Taslak kaydedildi', { variant: 'success' });
      }
      setLastSaved(new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));
      setIsDirty(false);
      initialFormRef.current = JSON.stringify({ form: payload, richBlocks });
      navigate('/content');
    } catch {
      enqueueSnackbar('Kaydetme hatası', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // ─── TAGS ─────────────────────────────────────────
  const handleAddTag = (input?: string) => {
    const tag = (input || tagInput).trim();
    if (tag && !form.tags?.includes(tag) && (form.tags?.length || 0) < 10) {
      setForm({ ...form, tags: [...(form.tags || []), tag] });
      setTagInput('');
    }
  };

  // ─── IMAGE UPLOAD ─────────────────────────────────
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { enqueueSnackbar('Sadece görsel dosyaları yüklenebilir', { variant: 'warning' }); return; }
    if (file.size > 10 * 1024 * 1024) { enqueueSnackbar('Dosya boyutu 10MB\'ı aşamaz', { variant: 'warning' }); return; }

    setUploading(true);
    setUploadProgress(0);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('path', 'articles/covers');
      const { api } = await import('../../services/api');
      const response = await api.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => { if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100)); },
      });
      const url = response.data?.data?.url || response.data?.data?.mediaUrl;
      if (url) {
        setForm(prev => ({ ...prev, coverImageUrl: url }));
        enqueueSnackbar('Görsel yüklendi', { variant: 'success' });
      }
    } catch {
      // Fallback: use base64 for preview
      const reader = new FileReader();
      reader.onload = (ev) => setForm(prev => ({ ...prev, coverImageUrl: ev.target?.result as string }));
      reader.readAsDataURL(file);
      enqueueSnackbar('Sunucuya yüklenemedi, yerel önizleme kullanılıyor', { variant: 'info' });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (coverFileRef.current) coverFileRef.current.value = '';
    }
  };

  // ─── BACK HANDLER ─────────────────────────────────
  const handleBack = () => {
    if (isDirty) { setLeaveDialogOpen(true); return; }
    navigate('/content');
  };

  const updateField = useCallback(<K extends keyof ArticleCreateRequest>(key: K, value: ArticleCreateRequest[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  // ─── COMPUTED ─────────────────────────────────────
  const wordCount = useMemo(() => {
    const sourceText = useBlockEditor ? blocksToPlainText(richBlocks) : (form.body || '').replace(/<[^>]*>/g, ' ');
    const text = sourceText.split(/\s+/).filter(w => w.length > 0);
    return text.length;
  }, [form.body, richBlocks, form.contentType]);
  const readTime = Math.max(1, Math.ceil(wordCount / 200));
  const titleLen = form.title?.length || 0;
  const summaryLen = form.summary?.length || 0;
  const seoTitleOk = titleLen >= 30 && titleLen <= 60;
  const seoDescOk = summaryLen >= 50 && summaryLen <= 160;
  // ─── RENDER ───────────────────────────────────────
  return (
    <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh', pb: 8 }}>
      {loading && <LinearProgress sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999 }} />}
      <input type="file" accept="image/*" ref={coverFileRef} onChange={handleCoverUpload} style={{ display: 'none' }} />

      {/* ═══ TOP BAR ═══ */}
      <Box sx={{ bgcolor: 'background.paper', borderBottom: '0.5px solid', borderColor: 'divider', px: 4, py: 1.5, position: 'sticky', top: 0, zIndex: 10 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={2} alignItems="center">
            <Button variant="outlined" startIcon={<BackIcon />} onClick={handleBack}
              sx={{ borderRadius: 2, textTransform: 'none', px: 2, borderColor: 'divider', color: 'text.primary', fontWeight: 600, fontSize: 13 }}>
              Geri
            </Button>
            <Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="subtitle1" fontWeight={800}>{isEdit ? 'İçeriği Düzenle' : 'Yeni İçerik'}</Typography>
                {isDirty && (
                  <Typography variant="caption" sx={{ color: '#D97706', fontWeight: 600, fontSize: 11, display: 'flex', alignItems: 'center', gap: 0.3 }}>
                    <DotIcon sx={{ fontSize: 8 }} /> Kaydedilmemiş değişiklikler
                  </Typography>
                )}
              </Stack>
              {lastSaved && <Typography variant="caption" color="text.secondary">Son kayıt: {lastSaved}</Typography>}
            </Box>
          </Stack>

          <Stack direction="row" spacing={1.5}>
            <Button variant="outlined" startIcon={<PreviewIcon />} onClick={() => setShowPreview(!showPreview)}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, fontSize: 13, borderColor: '#D1D5DB', color: '#374151' }}>
              {showPreview ? 'Düzenle' : 'Önizle'}
            </Button>
            <Button variant="outlined" startIcon={<SaveIcon />} onClick={() => handleSave(false)}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, fontSize: 13, bgcolor: '#F3F4F6', color: '#374151', borderColor: '#D1D5DB' }}>
              Taslak Kaydet
            </Button>
            <Button variant="contained" startIcon={<PublishIcon />} onClick={() => handleSave(true)}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, fontSize: 13, px: 3, bgcolor: '#1a5c28', '&:hover': { bgcolor: '#155220' } }}>
              Yayınla
            </Button>
          </Stack>
        </Stack>
      </Box>

      {/* ═══ MAIN CONTENT ═══ */}
      <Box sx={{ p: 4 }}>
        <Grid container spacing={3}>
          {/* ═══ LEFT COLUMN ═══ */}
          <Grid item xs={12} lg={9}>
            <Stack spacing={3}>
              <Paper elevation={0} sx={{ p: 4, borderRadius: 4 }}>
                {/* Title */}
                <TextField fullWidth value={form.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  placeholder="Başlığı buraya girin..."
                  variant="standard"
                  InputProps={{ sx: { fontSize: 32, fontWeight: 800, '&:before': { borderBottom: 'none' } }, disableUnderline: true }}
                />
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 0.5 }}>
                  {/* Slug */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="caption" color="text.disabled" fontWeight={600}>nartgo.net/kesfet/</Typography>
                    {editingSlug ? (
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <TextField variant="standard" size="small" value={form.slug}
                          onChange={(e) => { setAutoSlug(false); updateField('slug', slugify(e.target.value)); }}
                          InputProps={{ sx: { fontSize: 12, fontWeight: 600, color: '#1a5c28' }, disableUnderline: true }}
                          autoFocus
                        />
                        <IconButton size="small" onClick={() => setEditingSlug(false)}><CheckMarkIcon sx={{ fontSize: 14, color: 'success.main' }} /></IconButton>
                        <IconButton size="small" onClick={() => { setEditingSlug(false); setAutoSlug(true); }}><CloseIcon sx={{ fontSize: 14 }} /></IconButton>
                      </Stack>
                    ) : (
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Typography variant="caption" sx={{ color: '#1a5c28', fontWeight: 500 }}>{form.slug || '...'}</Typography>
                        <IconButton size="small" onClick={() => setEditingSlug(true)}><EditIcon sx={{ fontSize: 12 }} /></IconButton>
                        {autoSlug && <Chip label="Otomatik" size="small" sx={{ height: 18, fontSize: 9, fontWeight: 700 }} />}
                      </Stack>
                    )}
                  </Box>
                  {/* Title char count */}
                  <Typography variant="caption" sx={{
                    fontSize: 11,
                    color: titleLen > 60 ? '#DC2626' : titleLen > 50 ? '#D97706' : '#9CA3AF',
                  }}>
                    {titleLen} / 60 karakter
                  </Typography>
                </Stack>

                {/* Summary */}
                <Box sx={{ mt: 4 }}>
                  <Typography variant="caption" fontWeight={800} color="text.secondary" textTransform="uppercase">Özet</Typography>
                  <TextField fullWidth multiline rows={2} value={form.summary}
                    onChange={(e) => updateField('summary', e.target.value)}
                    placeholder="Arama sonuçları ve önizlemelerde gösterilecek özet metin..."
                    sx={{ mt: 1, '& .MuiOutlinedInput-notchedOutline': { border: 'none' }, bgcolor: '#F9FAFB', borderRadius: 2 }}
                  />
                  <Typography variant="caption" sx={{
                    display: 'block', textAlign: 'right', mt: 0.5, fontSize: 11,
                    color: summaryLen > 300 ? '#DC2626' : summaryLen > 250 ? '#D97706' : '#9CA3AF',
                  }}>
                    {summaryLen} / 300 karakter
                  </Typography>
                </Box>

                <Divider sx={{ my: 4 }} />

                {/* Cover Image */}
                <Box>
                  <Typography variant="caption" fontWeight={800} color="text.secondary" textTransform="uppercase">Kapak Görseli</Typography>
                  <Box sx={{ mt: 1.5, borderRadius: 3, overflow: 'hidden', border: form.coverImageUrl ? '1px solid' : '2px dashed', borderColor: 'divider', position: 'relative' }}>
                    {uploading ? (
                      <Box sx={{ height: 140, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                        <LinearProgress variant="determinate" value={uploadProgress} sx={{ width: '60%', borderRadius: 2 }} />
                        <Typography variant="caption" color="text.secondary">Yükleniyor... %{uploadProgress}</Typography>
                      </Box>
                    ) : form.coverImageUrl ? (
                      <Box sx={{ position: 'relative', '&:hover .cover-actions': { opacity: 1 } }}>
                        <Box component="img" src={form.coverImageUrl} sx={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }} />
                        <Box className="cover-actions" sx={{ position: 'absolute', bottom: 8, right: 8, display: 'flex', gap: 1, opacity: 0, transition: '0.2s' }}>
                          <Button size="small" variant="contained" onClick={() => coverFileRef.current?.click()}
                            sx={{ bgcolor: 'rgba(255,255,255,0.9)', color: 'text.primary', fontSize: 11, '&:hover': { bgcolor: 'white' } }}>Değiştir</Button>
                          <Button size="small" variant="contained" color="error" sx={{ fontSize: 11 }}
                            onClick={() => updateField('coverImageUrl', '')}>Kaldır</Button>
                        </Box>
                      </Box>
                    ) : (
                      <Box onClick={() => coverFileRef.current?.click()} sx={{ height: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', '&:hover': { bgcolor: alpha('#1a5c28', 0.02) } }}>
                        <UploadIcon sx={{ fontSize: 36, color: 'text.disabled', mb: 1 }} />
                        <Typography variant="body2" color="text.secondary" fontWeight={600}>Görsel yükle veya sürükle</Typography>
                        <Typography variant="caption" color="text.disabled">JPG, PNG, WEBP · Maks 10 MB</Typography>
                      </Box>
                    )}
                  </Box>
                </Box>

                <Divider sx={{ my: 4 }} />

                {/* ═══ EDITOR ═══ */}
                <Box>
                  <Typography variant="caption" fontWeight={800} color="text.secondary" textTransform="uppercase">İçerik</Typography>
                  <Typography variant="caption" color="text.disabled" display="block" sx={{ mt: 0.75, mb: 1.5 }}>
                    Tek editör kullanılır. İçerik bloklarıyla yazın; sistem bunu yayın için makale gövdesine dönüştürür.
                  </Typography>

                  {useBlockEditor && (
                    <Paper elevation={0} sx={{ mt: 1.5, borderRadius: 3, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                      {showPreview ? (
                        <Box sx={{ p: 4, minHeight: 500, bgcolor: '#FFFFFF' }}>
                          <RichContentRenderer blocks={richBlocks} />
                        </Box>
                      ) : (
                        <Box>
                          <Box sx={{ p: { xs: 2, md: 4 }, minHeight: 500 }}>
                            <RichContentEditor blocks={richBlocks} onChange={setRichBlocks} />
                          </Box>
                          {/* Word count bar */}
                          <Box sx={{ px: 2.5, py: 1, borderTop: '0.5px solid #E5E7EB', bgcolor: '#F9FAFB' }}>
                            <Typography variant="caption" sx={{ fontSize: 11, color: '#9CA3AF' }}>
                              {wordCount} kelime · ~{readTime} dk okuma
                            </Typography>
                          </Box>
                        </Box>
                      )}
                    </Paper>
                  )}

                  {/* Gallery mode */}
                  {form.contentType === ArticleType.GALLERY && (
                    <Paper elevation={0} sx={{ mt: 1.5, p: 3, borderRadius: 3, border: '2px dashed', borderColor: 'divider', textAlign: 'center' }}>
                      <AddPhotoIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                      <Typography variant="body2" fontWeight={600} color="text.secondary">Galeri görseli ekle</Typography>
                      <Typography variant="caption" color="text.disabled">Birden fazla görsel seçebilirsiniz</Typography>
                    </Paper>
                  )}

                </Box>

                {/* Tags */}
                <Box sx={{ mt: 5 }}>
                  <Typography variant="caption" fontWeight={800} color="text.secondary" textTransform="uppercase">Etiketler</Typography>
                  <Typography variant="caption" color="text.disabled" display="block" sx={{ mb: 1 }}>Virgül veya Enter ile etiket ekleyin (maks 10)</Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
                    {form.tags?.map((tag) => (
                      <Chip key={tag} label={tag}
                        onDelete={() => setForm({ ...form, tags: form.tags?.filter(t => t !== tag) })}
                        sx={{ borderRadius: 1.5, fontWeight: 700, bgcolor: '#F1F5F9' }}
                      />
                    ))}
                    <TextField size="small" variant="standard" placeholder="+ Ekle"
                      value={tagInput} onChange={(e) => {
                        if (e.target.value.includes(',')) { handleAddTag(e.target.value.replace(',', '')); return; }
                        setTagInput(e.target.value);
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                      InputProps={{ disableUnderline: true, sx: { fontSize: 13, borderBottom: '1px solid', borderColor: 'divider', width: 100 } }}
                    />
                  </Stack>
                </Box>
              </Paper>
            </Stack>
          </Grid>

          {/* ═══ RIGHT SIDEBAR ═══ */}
          <Grid item xs={12} lg={3}>
            <Stack spacing={3} sx={{ position: 'sticky', top: 72 }}>
              {/* Status + Actions */}
              <Paper elevation={0} sx={{ p: 3, borderRadius: 4 }}>
                <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: article?.status === ArticleStatus.PUBLISHED ? '#10B981' : '#F59E0B' }} />
                  <Typography variant="subtitle2" fontWeight={800}>{article?.status === ArticleStatus.PUBLISHED ? 'Yayında' : 'Taslak'}</Typography>
                </Stack>
                <Button fullWidth variant="outlined" onClick={() => handleSave(false)}
                  sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, mb: 1, bgcolor: '#F3F4F6', color: '#374151', borderColor: '#D1D5DB' }}>
                  Taslağa Al
                </Button>
                <Button fullWidth variant="contained" onClick={() => handleSave(true)}
                  sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, bgcolor: '#1a5c28', '&:hover': { bgcolor: '#155220' } }}>
                  Değişiklikleri Yayınla
                </Button>
              </Paper>

              {/* Settings */}
              <Paper elevation={0} sx={{ p: 3, borderRadius: 4 }}>
                <Typography variant="caption" fontWeight={800} color="text.secondary" textTransform="uppercase">İçerik Ayarları</Typography>
                <Stack spacing={2.5} sx={{ mt: 2 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ fontWeight: 700, fontSize: 13 }}>İçerik Türü</InputLabel>
                    <Select value={form.contentType} label="İçerik Türü"
                      onChange={(e) => updateField('contentType', e.target.value as ArticleType)}
                      sx={{ borderRadius: 2, fontWeight: 700 }}>
                      {Object.entries(TYPE_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ fontWeight: 700, fontSize: 13 }}>Kategori</InputLabel>
                    <Select value={form.category} label="Kategori"
                      onChange={(e) => updateField('category', e.target.value as ArticleCategory)}
                      sx={{ borderRadius: 2, fontWeight: 700 }}>
                      {Object.entries(CATEGORY_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <Box>
                    <Typography variant="caption" fontWeight={700} color="text.secondary" mb={0.5} display="block">Yazar</Typography>
                    <TextField fullWidth size="small" value={form.author}
                      onChange={(e) => updateField('author', e.target.value)}
                      placeholder="Yazar seçin..."
                      InputProps={{ sx: { borderRadius: 2, bgcolor: '#F1F5F9', border: 'none', fontWeight: 700, '& fieldset': { border: 'none' } } }}
                    />
                  </Box>
                </Stack>
              </Paper>

              {/* Properties */}
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
                </Stack>
              </Paper>

              {/* SEO Preview */}
              <Paper elevation={0} sx={{ p: 3, borderRadius: 4, bgcolor: '#F9FAFB' }}>
                <Typography variant="caption" fontWeight={800} color="text.secondary" textTransform="uppercase">SEO Önizleme</Typography>
                <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                  <Typography color="primary" variant="body2" fontWeight={600} sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {form.title?.slice(0, 60) || 'Başlık Alanı'}
                  </Typography>
                  <Typography color="success.main" variant="caption" sx={{ display: 'block', my: 0.5 }}>
                    nartgo.net › kesfet › {form.slug || '...'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {form.summary?.slice(0, 160) || 'Arama sonuçlarında görünecek açıklama metni...'}
                  </Typography>
                </Box>
                <Stack spacing={0.5} sx={{ mt: 1.5 }}>
                  <Typography variant="caption" sx={{ fontSize: 10, color: seoTitleOk ? '#059669' : titleLen > 60 ? '#DC2626' : '#D97706' }}>
                    Başlık: {titleLen}/60 {titleLen > 60 ? '⚠ Çok uzun' : titleLen < 30 ? '⚠ Çok kısa' : '✓'}
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: 10, color: seoDescOk ? '#059669' : summaryLen > 160 ? '#DC2626' : '#D97706' }}>
                    Açıklama: {summaryLen}/160 {summaryLen > 160 ? '⚠ Çok uzun' : ''}
                  </Typography>
                </Stack>
              </Paper>
            </Stack>
          </Grid>
        </Grid>
      </Box>

      {/* ═══ LEAVE DIALOG ═══ */}
      <Dialog open={leaveDialogOpen} onClose={() => setLeaveDialogOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Kaydedilmemiş değişiklikler var</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Yaptığınız değişiklikler kaydedilmedi. Sayfadan çıkmak istediğinize emin misiniz?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setLeaveDialogOpen(false); navigate('/content'); }}
            sx={{ textTransform: 'none', color: '#DC2626', fontWeight: 600 }}>
            Çık (kaydetme)
          </Button>
          <Button variant="contained" onClick={() => setLeaveDialogOpen(false)}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, bgcolor: '#1a5c28', '&:hover': { bgcolor: '#155220' } }}>
            Sayfada Kal
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
