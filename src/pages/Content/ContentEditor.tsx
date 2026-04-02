import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  Box, Button, Card, CardContent, Chip, FormControl, Grid, InputLabel,
  MenuItem, Select, Stack, Switch, TextField, Typography, FormControlLabel,
  IconButton, LinearProgress, Divider, Avatar, Paper, alpha,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import {
  Save as SaveIcon, Publish as PublishIcon, ArrowBack as BackIcon,
  Delete as DeleteIcon, AddPhotoAlternate as AddPhotoIcon,
  Visibility as PreviewIcon, Close as CloseIcon,
  Edit as EditIcon, Check as CheckMarkIcon,
  FiberManualRecord as DotIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useArticleStore } from '../../store/article/articleStore';
import { articleService } from '../../services/article/articleService';
import { api } from '../../services/api';
import {
  ArticleCategory, ArticleType, ArticleStatus,
  CATEGORY_LABELS, TYPE_LABELS,
} from '../../types/article/articleModel';
import type { ArticleCreateRequest, ArticleDto, CoverMediaRequest } from '../../types/article/articleModel';
import RichContentEditor, { RichContentRenderer } from '../../components/RichContentEditor';
import CoverImageEditor from '../../components/CoverImageEditor';
import OptionalImageCropDialog from '../../components/OptionalImageCropDialog';
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

function sanitizeFileName(fileName: string): string {
  const dotIndex = fileName.lastIndexOf('.');
  const baseName = dotIndex >= 0 ? fileName.slice(0, dotIndex) : fileName;
  const extension = dotIndex >= 0 ? fileName.slice(dotIndex + 1).toLowerCase() : 'jpg';
  const safeBase = slugify(baseName) || 'image';
  return `${safeBase}.${extension.replace(/[^a-z0-9]/g, '') || 'jpg'}`;
}

function buildUploadPath(prefix: string, file: File): string {
  const timestamp = Date.now();
  return `${prefix}/${timestamp}-${sanitizeFileName(file.name)}`;
}

const initialForm: ArticleCreateRequest = {
  title: '', slug: '', summary: '', body: '',
  contentType: ArticleType.ARTICLE, category: ArticleCategory.CULTURE,
  coverMedia: undefined, author: '', tags: [],
  featured: false, breakingNews: false,
};

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

function sanitizeHtml(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  // Remove unsafe tags entirely
  doc.querySelectorAll('script, style, iframe, link, object, embed, form, input, button, noscript').forEach(el => el.remove());
  // Strip event handlers and javascript: hrefs from every element
  doc.querySelectorAll('*').forEach(el => {
    Array.from(el.attributes).forEach(attr => {
      if (attr.name.startsWith('on') || (attr.name === 'href' && attr.value.trim().toLowerCase().startsWith('javascript:'))) {
        el.removeAttribute(attr.name);
      }
    });
  });
  // Return just the body content (strips <html>/<head> if user pasted full page)
  return doc.body.innerHTML;
}

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
  if (!html?.trim()) return [];

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const nodes = Array.from(doc.body.children);
  const blocks: ContentBlock[] = [];

  for (const node of nodes) {
    const tag = node.tagName.toLowerCase();

    if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
      blocks.push({
        type: 'heading',
        level: Number(tag[1]) as 1 | 2 | 3,
        text: (node.textContent || '').trim(),
      });
      continue;
    }

    if (tag === 'p') {
      const text = stripHtmlToText(node.innerHTML);
      if (text) blocks.push({ type: 'paragraph', text });
      continue;
    }

    if (tag === 'ul' || tag === 'ol') {
      const items = Array.from(node.querySelectorAll('li'))
        .map((li) => (li.textContent || '').trim())
        .filter(Boolean);
      if (items.length) {
        blocks.push({
          type: tag === 'ul' ? 'bullet_list' : 'ordered_list',
          items,
        });
      }
      continue;
    }

    if (tag === 'figure') {
      const img = node.querySelector('img');
      if (img?.getAttribute('src')) {
        blocks.push({
          type: 'image',
          url: img.getAttribute('src') || '',
          caption: node.querySelector('figcaption')?.textContent?.trim() || '',
          width: 'full',
        });
      }
      continue;
    }

    if (tag === 'img') {
      const src = node.getAttribute('src');
      if (src) {
        blocks.push({ type: 'image', url: src, caption: node.getAttribute('alt') || '', width: 'full' });
      }
      continue;
    }

    if (tag === 'hr') {
      blocks.push({ type: 'divider' });
      continue;
    }

    if (tag === 'blockquote') {
      const variant = node.getAttribute('data-callout');
      const footer = node.querySelector('footer');
      const footerText = footer?.textContent?.trim() || '';
      if (variant === 'info' || variant === 'warning' || variant === 'success') {
        blocks.push({ type: 'callout', text: stripHtmlToText(node.innerHTML), variant });
      } else {
        const quoteText = stripHtmlToText(node.innerHTML.replace(footer?.outerHTML || '', ''));
        blocks.push({ type: 'quote', text: quoteText, author: footerText });
      }
      continue;
    }

    const fallbackText = stripHtmlToText(node.innerHTML);
    if (fallbackText) {
      blocks.push({ type: 'paragraph', text: fallbackText });
    }
  }

  if (blocks.length > 0) return blocks;

  const text = stripHtmlToText(html);
  return text ? [{ type: 'paragraph', text }] : [];
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
  const location = useLocation();
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
  const [cropDialogState, setCropDialogState] = useState<{ file: File; title: string } | null>(null);
  const [editorMode, setEditorMode] = useState<'blocks' | 'html'>('blocks');
  const initialFormRef = useRef<string>('');
  const cropResolveRef = useRef<((file: File | null) => void) | null>(null);

  const useBlockEditor = form.contentType !== ArticleType.GALLERY;
  const locationArticle = (location.state as { article?: ArticleDto } | null)?.article;

  const applyArticleToForm = useCallback((found: ArticleDto) => {
    if (isEditorOnly && !isOwner(found.author)) {
      enqueueSnackbar('Bu içeriği düzenleme yetkiniz yok', { variant: 'error' });
      navigate('/content');
      return false;
    }

    setArticle(found);
    const formData: ArticleCreateRequest = {
      title: found.title, slug: found.slug, summary: found.summary || '',
      body: found.body || '', contentType: found.contentType,
      category: found.category,
      coverMedia: found.coverMedia
        ? {
            originalUrl: found.coverMedia.originalUrl,
            width: found.coverMedia.width,
            height: found.coverMedia.height,
            mimeType: found.coverMedia.mimeType,
            alt: found.coverMedia.alt,
            focalPointX: found.coverMedia.focalPointX,
            focalPointY: found.coverMedia.focalPointY,
          }
        : undefined,
      author: found.author || '', tags: found.tags || [],
      featured: found.featured, breakingNews: found.breakingNews,
    };
    const nextBlocks = htmlToBlocks(found.body);
    setForm(formData);
    setRichBlocks(nextBlocks);
    // If body looks like raw HTML from an external paste (more than 500 chars, no rich content), open in HTML mode
    if (found.body && found.body.length > 500 && !found.richContent?.length) {
      setEditorMode('html');
    }
    setAutoSlug(false);
    initialFormRef.current = JSON.stringify({ form: formData, richBlocks: nextBlocks });
    return true;
  }, [enqueueSnackbar, isEditorOnly, isOwner, navigate]);

  // ─── LIFECYCLE ────────────────────────────────────
  useEffect(() => {
    if (isEdit && id) {
      if (locationArticle?.id === id && applyArticleToForm(locationArticle)) {
        return;
      }
      loadArticle(id);
    }
    initialFormRef.current = JSON.stringify({ form: { ...initialForm, author: userName || '' }, richBlocks: [] });
  }, [applyArticleToForm, id, isEdit, locationArticle, userName]);

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
  const loadArticle = useCallback(async (articleId: string) => {
    try {
      setLoading(true);
      const found = await articleService.getArticle(articleId);
      if (found) {
        applyArticleToForm(found);
      }
    } catch {
      enqueueSnackbar('İçerik yüklenemedi', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [applyArticleToForm, enqueueSnackbar]);

  // ─── SAVE ─────────────────────────────────────────
  const handleSave = async (publish = false) => {
    if (!form.title.trim()) {
      enqueueSnackbar('Başlık zorunludur', { variant: 'warning' });
      return;
    }
    if (useBlockEditor && editorMode === 'blocks' && richBlocks.length === 0) {
      enqueueSnackbar('İçerik alanı boş bırakılamaz', { variant: 'warning' });
      return;
    }
    if (useBlockEditor && editorMode === 'html' && !form.body?.trim()) {
      enqueueSnackbar('HTML içerik alanı boş bırakılamaz', { variant: 'warning' });
      return;
    }
    try {
      setLoading(true);
      const payload = {
        ...form,
        body: useBlockEditor && editorMode === 'blocks' ? blocksToHtml(richBlocks) : form.body,
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
  const closeCropDialog = useCallback((file: File | null) => {
    cropResolveRef.current?.(file);
    cropResolveRef.current = null;
    setCropDialogState(null);
  }, []);

  const requestOptionalCrop = useCallback((file: File) => {
    return new Promise<File | null>((resolve) => {
      cropResolveRef.current = resolve;
      setCropDialogState({ file, title: 'Kapak görseli' });
    });
  }, []);

  // Cover upload handler passed to CoverImageEditor
  const handleCoverUpload = useCallback(async (file: File, onProgress: (p: number) => void) => {
    const url = await uploadCoverImage(file, onProgress);
    enqueueSnackbar('Görsel yüklendi', { variant: 'success' });
    return url;
  }, [enqueueSnackbar]); // eslint-disable-line

  // ─── BACK HANDLER ─────────────────────────────────
  const handleBack = () => {
    if (isDirty) { setLeaveDialogOpen(true); return; }
    navigate('/content');
  };

  const updateField = useCallback(<K extends keyof ArticleCreateRequest>(key: K, value: ArticleCreateRequest[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const uploadImage = useCallback(async (file: File, pathPrefix: string, onProgress?: (progress: number) => void) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', buildUploadPath(pathPrefix, file));
    const response = await api.post('/media/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (event) => {
        if (event.total && onProgress) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      },
    });
    const url = response.data?.data?.url || response.data?.data?.mediaUrl;
    if (!url) throw new Error('Upload response missing url');
    return url as string;
  }, []);

  // Passed to CoverImageEditor as onUpload prop
  const handleCoverUpload = useCallback(async (file: File, onProgress: (p: number) => void) => {
    const url = await uploadImage(file, 'articles/covers', onProgress);
    enqueueSnackbar('Görsel yüklendi', { variant: 'success' });
    return url;
  }, [uploadImage, enqueueSnackbar]);

  const handleBlockImageUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/') || file.size > MAX_IMAGE_SIZE_BYTES) return null;

    const preparedFile = await requestOptionalCrop(file);
    if (!preparedFile) return null;

    try {
      const url = await uploadImage(preparedFile, 'articles/content');
      enqueueSnackbar('İçerik görseli yüklendi', { variant: 'success' });
      return url;
    } catch {
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          enqueueSnackbar('Sunucuya yüklenemedi, yerel önizleme kullanılıyor', { variant: 'info' });
          resolve(event.target?.result as string);
        };
        reader.onerror = () => reject(new Error('file-read-failed'));
        reader.readAsDataURL(preparedFile);
      });
    }
  }, [enqueueSnackbar, requestOptionalCrop, uploadImage]);

  // ─── COMPUTED ─────────────────────────────────────
  const wordCount = useMemo(() => {
    const sourceText = useBlockEditor && editorMode === 'blocks'
      ? blocksToPlainText(richBlocks)
      : (form.body || '').replace(/<[^>]*>/g, ' ');
    const text = sourceText.split(/\s+/).filter(w => w.length > 0);
    return text.length;
  }, [form.body, richBlocks, form.contentType, editorMode]);
  const readTime = Math.max(1, Math.ceil(wordCount / 200));
  const titleLen = form.title?.length || 0;
  const summaryLen = form.summary?.length || 0;
  const seoTitleOk = titleLen >= 30 && titleLen <= 60;
  const seoDescOk = summaryLen >= 50 && summaryLen <= 160;
  // ─── RENDER ───────────────────────────────────────
  return (
    <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh', pb: 8 }}>
      {loading && <LinearProgress sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999 }} />

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
                  <Stack direction="row" justifyContent="space-between" alignItems="baseline" mb={1.5}>
                    <Typography variant="caption" fontWeight={800} color="text.secondary" textTransform="uppercase">
                      Kapak Görseli
                    </Typography>
                    {form.coverMedia?.originalUrl && (
                      <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10 }}>
                        Görsele tıklayarak odak noktasını ayarla
                      </Typography>
                    )}
                  </Stack>
                  <CoverImageEditor
                    value={form.coverMedia}
                    onChange={(v) => updateField('coverMedia', v)}
                    onUpload={handleCoverUpload}
                    onRequestCrop={requestOptionalCrop}
                  />
                </Box>

                <Divider sx={{ my: 4 }} />

                {/* ═══ EDITOR ═══ */}
                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                    <Typography variant="caption" fontWeight={800} color="text.secondary" textTransform="uppercase">İçerik</Typography>
                    {useBlockEditor && (
                      <Stack direction="row" spacing={0.5} sx={{
                        bgcolor: '#F3F4F6', borderRadius: 2, p: 0.5,
                      }}>
                        <Button
                          size="small"
                          onClick={() => setEditorMode('blocks')}
                          sx={{
                            borderRadius: 1.5, textTransform: 'none', fontWeight: 700, fontSize: 11, px: 1.5, py: 0.5,
                            bgcolor: editorMode === 'blocks' ? 'white' : 'transparent',
                            color: editorMode === 'blocks' ? 'text.primary' : 'text.secondary',
                            boxShadow: editorMode === 'blocks' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                            minWidth: 0,
                            '&:hover': { bgcolor: editorMode === 'blocks' ? 'white' : alpha('#000', 0.04) },
                          }}
                        >
                          Blok Editör
                        </Button>
                        <Button
                          size="small"
                          onClick={() => setEditorMode('html')}
                          sx={{
                            borderRadius: 1.5, textTransform: 'none', fontWeight: 700, fontSize: 11, px: 1.5, py: 0.5,
                            bgcolor: editorMode === 'html' ? 'white' : 'transparent',
                            color: editorMode === 'html' ? 'text.primary' : 'text.secondary',
                            boxShadow: editorMode === 'html' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                            minWidth: 0,
                            '&:hover': { bgcolor: editorMode === 'html' ? 'white' : alpha('#000', 0.04) },
                          }}
                        >
                          HTML Yapıştır
                        </Button>
                      </Stack>
                    )}
                  </Stack>

                  {useBlockEditor && editorMode === 'blocks' && (
                    <Paper elevation={0} sx={{ borderRadius: 3, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                      {showPreview ? (
                        <Box sx={{ p: 4, minHeight: 500, bgcolor: '#FFFFFF' }}>
                          {form.coverMedia?.originalUrl && (
                            <Box
                              component="img"
                              src={form.coverMedia.originalUrl}
                              alt={form.coverMedia.alt || form.title}
                              sx={{ width: '100%', maxHeight: 320, objectFit: 'cover', borderRadius: 3, mb: 3 }}
                            />
                          )}
                          <Typography variant="h3" fontWeight={800} sx={{ mb: 1.5 }}>
                            {form.title || 'Başlıksız içerik'}
                          </Typography>
                          {form.summary && (
                            <Typography color="text.secondary" sx={{ mb: 3, fontSize: 16, lineHeight: 1.7 }}>
                              {form.summary}
                            </Typography>
                          )}
                          <RichContentRenderer blocks={richBlocks} />
                        </Box>
                      ) : (
                        <Box>
                          <Box sx={{ p: { xs: 2, md: 4 }, minHeight: 500 }}>
                            <RichContentEditor blocks={richBlocks} onChange={setRichBlocks} onImageUpload={handleBlockImageUpload} />
                          </Box>
                          <Box sx={{ px: 2.5, py: 1, borderTop: '0.5px solid #E5E7EB', bgcolor: '#F9FAFB' }}>
                            <Typography variant="caption" sx={{ fontSize: 11, color: '#9CA3AF' }}>
                              {wordCount} kelime · ~{readTime} dk okuma
                            </Typography>
                          </Box>
                        </Box>
                      )}
                    </Paper>
                  )}

                  {useBlockEditor && editorMode === 'html' && (
                    <Paper elevation={0} sx={{ borderRadius: 3, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                      {/* Info bar */}
                      <Box sx={{ px: 2.5, py: 1.25, bgcolor: alpha('#1a5c28', 0.04), borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="caption" fontWeight={600} color="#1a5c28" sx={{ fontSize: 11 }}>
                          Sayfayı tarayıcıda aç → Tüm metni seç (Ctrl+A) → Kopyala (Ctrl+C) → Buraya yapıştır
                        </Typography>
                      </Box>

                      {showPreview ? (
                        /* HTML Preview */
                        <Box sx={{ p: 3, minHeight: 500, bgcolor: '#FFFFFF' }}>
                          <Box
                            sx={{
                              '& h1,& h2,& h3,& h4': { fontWeight: 700, lineHeight: 1.3, mt: 3, mb: 1.5 },
                              '& h1': { fontSize: '2em' }, '& h2': { fontSize: '1.5em' }, '& h3': { fontSize: '1.25em' },
                              '& p': { mb: 1.5, lineHeight: 1.8 },
                              '& ul,& ol': { pl: 3, mb: 1.5 },
                              '& li': { mb: 0.5, lineHeight: 1.8 },
                              '& blockquote': { borderLeft: '4px solid #1a5c28', pl: 2, ml: 0, color: 'text.secondary', my: 2 },
                              '& img': { maxWidth: '100%', borderRadius: 2, my: 1 },
                              '& a': { color: '#1a5c28' },
                              '& strong,& b': { fontWeight: 700 },
                              '& em,& i': { fontStyle: 'italic' },
                              '& pre,& code': { fontFamily: 'monospace', bgcolor: '#F3F4F6', borderRadius: 1, p: 0.5 },
                              '& hr': { border: 'none', borderTop: '1px solid', borderColor: 'divider', my: 3 },
                              '& table': { width: '100%', borderCollapse: 'collapse', mb: 2 },
                              '& th,& td': { border: '1px solid', borderColor: 'divider', p: 1 },
                            }}
                            dangerouslySetInnerHTML={{ __html: form.body || '' }}
                          />
                          <Box sx={{ mt: 2, pt: 2, borderTop: '0.5px solid #E5E7EB' }}>
                            <Typography variant="caption" sx={{ fontSize: 11, color: '#9CA3AF' }}>
                              {wordCount} kelime · ~{readTime} dk okuma
                            </Typography>
                          </Box>
                        </Box>
                      ) : (
                        /* HTML Input */
                        <Box>
                          <TextField
                            fullWidth
                            multiline
                            minRows={20}
                            value={form.body || ''}
                            onChange={(e) => updateField('body', e.target.value)}
                            onPaste={(e) => {
                              const pasted = e.clipboardData.getData('text/plain') || e.clipboardData.getData('text/html');
                              if (pasted.trim().startsWith('<')) {
                                e.preventDefault();
                                updateField('body', sanitizeHtml(pasted));
                              }
                            }}
                            placeholder={`Buraya HTML yapıştırın.\n\nÖrnek:\n<h2>Başlık</h2>\n<p>Paragraf metni buraya gelir.</p>`}
                            InputProps={{
                              sx: {
                                fontFamily: 'monospace',
                                fontSize: 12,
                                lineHeight: 1.6,
                                bgcolor: '#FAFAFA',
                                borderRadius: 0,
                                '& fieldset': { border: 'none' },
                                alignItems: 'flex-start',
                              },
                            }}
                          />
                          <Box sx={{ px: 2.5, py: 1, borderTop: '0.5px solid #E5E7EB', bgcolor: '#F9FAFB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="caption" sx={{ fontSize: 11, color: '#9CA3AF' }}>
                              {wordCount} kelime · ~{readTime} dk okuma
                            </Typography>
                            <Typography variant="caption" sx={{ fontSize: 11, color: '#9CA3AF' }}>
                              {(form.body || '').length} karakter
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

      <OptionalImageCropDialog
        open={!!cropDialogState}
        file={cropDialogState?.file || null}
        title={cropDialogState?.title}
        onCancel={() => closeCropDialog(null)}
        onUseOriginal={(file) => closeCropDialog(file)}
        onConfirmCrop={(file) => closeCropDialog(file)}
      />
    </Box>
  );
}
