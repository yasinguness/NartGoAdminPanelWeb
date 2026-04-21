/**
 * RichContentEditor — Blog-style block editor.
 * Blocks: heading, paragraph, bullet_list, ordered_list, image, divider, callout, quote
 * Supports paste from external sources with auto-block detection.
 */
import React, { useState, useCallback, useRef } from 'react';
import {
  Box, Typography, TextField, IconButton, Button, Stack, Menu, MenuItem,
  ListItemIcon, ListItemText, Paper, Tooltip, Divider, Chip, alpha, useTheme,
} from '@mui/material';
import {
  Add as AddIcon, Delete as DeleteIcon, Title as HeadingIcon,
  Notes as ParagraphIcon, Image as ImageIcon, HorizontalRule as DividerIcon,
  Info as CalloutIcon, FormatQuote as QuoteIcon, ArrowUpward as MoveUpIcon,
  ArrowDownward as MoveDownIcon, CloudUpload as UploadIcon,
  FormatListBulleted as BulletIcon, FormatListNumbered as NumberIcon,
  ContentPaste as PasteIcon,
} from '@mui/icons-material';
import type { ContentBlock, ContentBlockType } from '../types/notification.types';
import RichTextInput from './RichTextInput';

interface RichContentEditorProps {
  blocks: ContentBlock[];
  onChange: (blocks: ContentBlock[]) => void;
  compact?: boolean;
  onImageUpload?: (file: File) => Promise<string | null>;
}

const BLOCK_OPTIONS: { type: ContentBlockType; label: string; icon: React.ReactNode; desc: string }[] = [
  { type: 'heading', label: 'Başlık', icon: <HeadingIcon />, desc: 'Kalın başlık metni' },
  { type: 'paragraph', label: 'Paragraf', icon: <ParagraphIcon />, desc: 'Normal metin bloğu' },
  { type: 'bullet_list', label: 'Madde İşareti', icon: <BulletIcon />, desc: 'Noktalamalı liste' },
  { type: 'ordered_list', label: 'Numaralı Liste', icon: <NumberIcon />, desc: '1, 2, 3... sıralı liste' },
  { type: 'image', label: 'Görsel', icon: <ImageIcon />, desc: 'Fotoğraf veya ilustrasyon' },
  { type: 'callout', label: 'Bilgi Kutusu', icon: <CalloutIcon />, desc: 'Vurgulanan bilgi bloğu' },
  { type: 'quote', label: 'Alıntı', icon: <QuoteIcon />, desc: 'Alıntı bloğu' },
  { type: 'divider', label: 'Ayırıcı', icon: <DividerIcon />, desc: 'Yatay çizgi' },
];

function createBlock(type: ContentBlockType): ContentBlock {
  switch (type) {
    case 'heading': return { type: 'heading', text: '', level: 2 };
    case 'paragraph': return { type: 'paragraph', text: '' };
    case 'bullet_list': return { type: 'bullet_list', items: [''] };
    case 'ordered_list': return { type: 'ordered_list', items: [''] };
    case 'image': return { type: 'image', url: '', caption: '', width: 'full' };
    case 'divider': return { type: 'divider' };
    case 'callout': return { type: 'callout', text: '', variant: 'info' };
    case 'quote': return { type: 'quote', text: '', author: '' };
  }
}

/**
 * Parse pasted plain text into content blocks.
 * Detects headings (# ), bullets (- or * ), numbered lists (1. ), and paragraphs.
 */
function parsePastedText(text: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  const lines = text.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trimEnd();

    // Skip empty lines
    if (!line.trim()) { i++; continue; }

    // Heading: starts with # or ##
    if (/^#{1,3}\s/.test(line)) {
      const level = (line.match(/^#+/)![0].length) as 1 | 2 | 3;
      blocks.push({ type: 'heading', text: line.replace(/^#+\s*/, ''), level: Math.min(level, 3) as 1 | 2 | 3 });
      i++; continue;
    }

    // Bullet list: lines starting with - or * or •
    if (/^\s*[-*•]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*•]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*•]\s*/, '').trim());
        i++;
      }
      blocks.push({ type: 'bullet_list', items });
      continue;
    }

    // Ordered list: lines starting with number.
    if (/^\s*\d+[.)]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+[.)]\s*/, '').trim());
        i++;
      }
      blocks.push({ type: 'ordered_list', items });
      continue;
    }

    // Divider: --- or ***
    if (/^[-*_]{3,}\s*$/.test(line)) {
      blocks.push({ type: 'divider' });
      i++; continue;
    }

    // Quote: starts with >
    if (/^>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      blocks.push({ type: 'quote', text: quoteLines.join('\n'), author: '' });
      continue;
    }

    // Paragraph: collect consecutive non-empty lines
    const paraLines: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^#{1,3}\s/.test(lines[i]) && !/^\s*[-*•]\s/.test(lines[i]) && !/^\s*\d+[.)]\s/.test(lines[i]) && !/^[-*_]{3,}\s*$/.test(lines[i]) && !/^>\s?/.test(lines[i])) {
      paraLines.push(lines[i].trimEnd());
      i++;
    }
    if (paraLines.length) {
      blocks.push({ type: 'paragraph', text: paraLines.join('\n') });
    }
  }

  return blocks.length ? blocks : [{ type: 'paragraph', text: text }];
}

export default function RichContentEditor({ blocks, onChange, compact, onImageUpload }: RichContentEditorProps) {
  const theme = useTheme();
  const [addMenuAnchor, setAddMenuAnchor] = useState<{ el: HTMLElement; index: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetIndex, setUploadTargetIndex] = useState<number>(-1);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  const updateBlock = useCallback((index: number, updated: ContentBlock) => {
    const next = [...blocks]; next[index] = updated; onChange(next);
  }, [blocks, onChange]);

  const removeBlock = useCallback((index: number) => {
    onChange(blocks.filter((_, i) => i !== index));
  }, [blocks, onChange]);

  const moveBlock = useCallback((index: number, direction: -1 | 1) => {
    const ni = index + direction;
    if (ni < 0 || ni >= blocks.length) return;
    const next = [...blocks]; [next[index], next[ni]] = [next[ni], next[index]]; onChange(next);
  }, [blocks, onChange]);

  const insertBlock = useCallback((afterIndex: number, type: ContentBlockType) => {
    const next = [...blocks]; next.splice(afterIndex + 1, 0, createBlock(type)); onChange(next); setAddMenuAnchor(null);
  }, [blocks, onChange]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || uploadTargetIndex < 0 || !file.type.startsWith('image/')) return;
    try {
      setUploadingIndex(uploadTargetIndex);
      if (onImageUpload) {
        const url = await onImageUpload(file);
        const block = blocks[uploadTargetIndex];
        if (block.type === 'image' && url) updateBlock(uploadTargetIndex, { ...block, url });
      } else {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const block = blocks[uploadTargetIndex];
          if (block.type === 'image') updateBlock(uploadTargetIndex, { ...block, url: ev.target?.result as string });
        };
        reader.readAsDataURL(file);
      }
    } finally {
      setUploadingIndex(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle paste from clipboard — parse into blocks
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text/plain');
    if (!text || text.length < 20) return; // Short texts handled by TextField natively

    // Check if pasting into an empty editor or at the end
    const hasContent = blocks.some(b => {
      if (b.type === 'paragraph' && b.text) return true;
      if (b.type === 'heading' && b.text) return true;
      if (b.type === 'bullet_list' && b.items.some(i => i)) return true;
      if (b.type === 'ordered_list' && b.items.some(i => i)) return true;
      return false;
    });

    if (!hasContent && text.includes('\n')) {
      e.preventDefault();
      const parsed = parsePastedText(text);
      onChange(parsed);
    }
  }, [blocks, onChange]);

  // List item helpers
  const updateListItem = (blockIndex: number, itemIndex: number, value: string) => {
    const block = blocks[blockIndex];
    if (block.type !== 'bullet_list' && block.type !== 'ordered_list') return;
    const items = [...block.items];
    items[itemIndex] = value;
    updateBlock(blockIndex, { ...block, items });
  };

  const addListItem = (blockIndex: number, afterItemIndex: number) => {
    const block = blocks[blockIndex];
    if (block.type !== 'bullet_list' && block.type !== 'ordered_list') return;
    const items = [...block.items];
    items.splice(afterItemIndex + 1, 0, '');
    updateBlock(blockIndex, { ...block, items });
  };

  const removeListItem = (blockIndex: number, itemIndex: number) => {
    const block = blocks[blockIndex];
    if (block.type !== 'bullet_list' && block.type !== 'ordered_list') return;
    if (block.items.length <= 1) { removeBlock(blockIndex); return; }
    const items = block.items.filter((_, i) => i !== itemIndex);
    updateBlock(blockIndex, { ...block, items });
  };

  // Block actions bar
  const blockActions = (index: number) => (
    <Stack direction="row" spacing={0.25} sx={{ opacity: 0, transition: '0.15s', '.block-wrap:hover &': { opacity: 1 } }}>
      <Tooltip title="Yukarı"><IconButton size="small" onClick={() => moveBlock(index, -1)} disabled={index === 0}><MoveUpIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
      <Tooltip title="Aşağı"><IconButton size="small" onClick={() => moveBlock(index, 1)} disabled={index === blocks.length - 1}><MoveDownIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
      <Tooltip title="Sil"><IconButton size="small" onClick={() => removeBlock(index)} sx={{ '&:hover': { color: 'error.main' } }}><DeleteIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
    </Stack>
  );

  const renderBlock = (block: ContentBlock, index: number) => {
    switch (block.type) {
      case 'heading':
        return (
          <Stack spacing={0.5}>
            <Stack direction="row" spacing={1} alignItems="center">
              <HeadingIcon sx={{ color: 'text.disabled', fontSize: 18 }} />
              <Chip label={`H${block.level}`} size="small" sx={{ height: 20, fontSize: 10 }}
                onClick={() => updateBlock(index, { ...block, level: ((block.level % 3) + 1) as 1 | 2 | 3 })} />
              {blockActions(index)}
            </Stack>
            <TextField fullWidth variant="standard" placeholder="Başlık yazın..."
              value={block.text} onChange={(e) => updateBlock(index, { ...block, text: e.target.value })}
              InputProps={{ disableUnderline: true, sx: { fontSize: block.level === 1 ? 28 : block.level === 2 ? 22 : 18, fontWeight: 700, lineHeight: 1.3 } }}
            />
          </Stack>
        );

      case 'paragraph':
        return (
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
              <ParagraphIcon sx={{ color: 'text.disabled', fontSize: 16 }} />
              {blockActions(index)}
            </Stack>
            <RichTextInput
              value={block.text}
              onChange={(html) => updateBlock(index, { ...block, text: html })}
              placeholder="Metin yazın..."
              minHeight={60}
              fontSize={15}
              lineHeight={1.8}
              compact
            />
          </Box>
        );

      case 'bullet_list':
      case 'ordered_list': {
        const isBullet = block.type === 'bullet_list';
        return (
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                {isBullet ? <BulletIcon sx={{ color: 'text.disabled', fontSize: 18 }} /> : <NumberIcon sx={{ color: 'text.disabled', fontSize: 18 }} />}
                <Typography sx={{ fontSize: 11, color: 'text.disabled', fontWeight: 600 }}>
                  {isBullet ? 'Madde İşaretli Liste' : 'Numaralı Liste'}
                </Typography>
                {/* Toggle between bullet and ordered */}
                <Chip size="small" sx={{ height: 20, fontSize: 10, cursor: 'pointer' }}
                  label={isBullet ? '→ Numaralı' : '→ Madde'}
                  onClick={() => {
                    const newType = isBullet ? 'ordered_list' : 'bullet_list';
                    updateBlock(index, { ...block, type: newType } as ContentBlock);
                  }}
                />
              </Stack>
              {blockActions(index)}
            </Stack>
            <Box sx={{ pl: 1 }}>
              {block.items.map((item, ii) => (
                <Stack key={ii} direction="row" alignItems="flex-start" spacing={1} sx={{ mb: 0.5 }}>
                  <Typography sx={{
                    minWidth: 20, pt: 0.75, fontSize: 14, fontWeight: 600,
                    color: 'text.disabled', textAlign: 'right', userSelect: 'none',
                  }}>
                    {isBullet ? '•' : `${ii + 1}.`}
                  </Typography>
                  <TextField
                    fullWidth variant="standard" placeholder={`${isBullet ? 'Madde' : 'Sıra ' + (ii + 1)} yazın...`}
                    value={item}
                    onChange={(e) => updateListItem(index, ii, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addListItem(index, ii);
                        // Focus next item after render
                        setTimeout(() => {
                          const inputs = (e.target as HTMLElement).closest('.block-wrap')?.querySelectorAll('input');
                          if (inputs && inputs[ii + 1]) (inputs[ii + 1] as HTMLElement).focus();
                        }, 50);
                      }
                      if (e.key === 'Backspace' && !item && block.items.length > 1) {
                        e.preventDefault();
                        removeListItem(index, ii);
                      }
                    }}
                    InputProps={{ disableUnderline: true, sx: { fontSize: 15, lineHeight: 1.7 } }}
                  />
                  {block.items.length > 1 && (
                    <IconButton size="small" onClick={() => removeListItem(index, ii)}
                      sx={{ opacity: 0.3, '&:hover': { opacity: 1, color: 'error.main' }, mt: 0.25 }}>
                      <DeleteIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  )}
                </Stack>
              ))}
              <Button size="small" startIcon={<AddIcon sx={{ fontSize: 14 }} />}
                onClick={() => addListItem(index, block.items.length - 1)}
                sx={{ textTransform: 'none', fontSize: 12, color: 'text.secondary', mt: 0.5, fontWeight: 600 }}>
                Madde ekle
              </Button>
            </Box>
          </Box>
        );
      }

      case 'image':
        return (
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <ImageIcon sx={{ color: 'text.disabled', fontSize: 16 }} />
                <Stack direction="row" spacing={0.5}>
                  {(['full', 'medium', 'small'] as const).map(w => (
                    <Chip key={w} label={w === 'full' ? 'Tam' : w === 'medium' ? 'Orta' : 'Küçük'}
                      size="small" sx={{ height: 20, fontSize: 10 }}
                      color={block.width === w ? 'primary' : 'default'}
                      onClick={() => updateBlock(index, { ...block, width: w })} />
                  ))}
                </Stack>
              </Stack>
              {blockActions(index)}
            </Stack>
            {block.url ? (
              <Box sx={{ position: 'relative', borderRadius: 3, overflow: 'hidden', maxWidth: block.width === 'small' ? 240 : block.width === 'medium' ? 400 : '100%', mx: block.width !== 'full' ? 'auto' : 0, border: '1px solid', borderColor: 'divider', '&:hover .img-actions': { opacity: 1 } }}>
                <Box component="img" src={block.url} alt={block.caption || ''} sx={{ width: '100%', height: 'auto', maxHeight: 400, objectFit: 'cover', display: 'block' }} />
                <Box className="img-actions" sx={{ position: 'absolute', top: 8, right: 8, opacity: 0, transition: '0.2s', display: 'flex', gap: 0.5 }}>
                  <Button size="small" variant="contained" onClick={() => { setUploadTargetIndex(index); fileInputRef.current?.click(); }}
                    sx={{ bgcolor: 'rgba(255,255,255,0.9)', color: 'text.primary', fontSize: 11, '&:hover': { bgcolor: 'white' } }}>Değiştir</Button>
                  <Button size="small" variant="contained" color="error" onClick={() => updateBlock(index, { ...block, url: '' })} sx={{ fontSize: 11 }}>Kaldır</Button>
                </Box>
              </Box>
            ) : (
              <Box onClick={() => { setUploadTargetIndex(index); fileInputRef.current?.click(); }}
                sx={{ border: '2px dashed', borderColor: 'divider', borderRadius: 3, p: 4, textAlign: 'center', cursor: 'pointer', transition: '0.15s', '&:hover': { borderColor: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.02) } }}>
                {uploadingIndex === index ? (
                  <>
                    <Typography variant="body2" color="text.secondary" fontWeight={600}>Görsel yükleniyor...</Typography>
                    <Typography variant="caption" color="text.disabled">Lütfen bekleyin</Typography>
                  </>
                ) : (
                  <>
                    <UploadIcon sx={{ fontSize: 36, color: 'text.disabled', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary" fontWeight={600}>Görsel yüklemek için tıklayın</Typography>
                    <Typography variant="caption" color="text.disabled">JPG, PNG, WebP — Maks 10MB</Typography>
                  </>
                )}
              </Box>
            )}
            {block.url && (
              <TextField fullWidth variant="standard" placeholder="Görsel açıklaması..." value={block.caption || ''}
                onChange={(e) => updateBlock(index, { ...block, caption: e.target.value })}
                InputProps={{ disableUnderline: true, sx: { fontSize: 13, color: 'text.secondary', fontStyle: 'normal', mt: 1 } }} />
            )}
            {!block.url && (
              <TextField fullWidth size="small" placeholder="veya görsel URL'si yapıştırın..." sx={{ mt: 1 }}
                onBlur={(e) => { if (e.target.value) updateBlock(index, { ...block, url: e.target.value }); }} />
            )}
          </Box>
        );

      case 'divider':
        return <Stack direction="row" alignItems="center" spacing={1}><Divider sx={{ flex: 1 }} />{blockActions(index)}</Stack>;

      case 'callout':
        return (
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
              <Stack direction="row" spacing={0.5}>
                {(['info', 'warning', 'success'] as const).map(v => (
                  <Chip key={v} size="small" sx={{ height: 20, fontSize: 10 }}
                    label={v === 'info' ? 'Bilgi' : v === 'warning' ? 'Uyarı' : 'Başarı'}
                    color={block.variant === v ? (v as any) : 'default'}
                    onClick={() => updateBlock(index, { ...block, variant: v })} />
                ))}
              </Stack>
              {blockActions(index)}
            </Stack>
            <Box sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: block.variant === 'info' ? 'info.main' : block.variant === 'warning' ? 'warning.main' : 'success.main', bgcolor: alpha(block.variant === 'info' ? theme.palette.info.main : block.variant === 'warning' ? theme.palette.warning.main : theme.palette.success.main, 0.06), borderLeft: '4px solid', borderLeftColor: block.variant === 'info' ? 'info.main' : block.variant === 'warning' ? 'warning.main' : 'success.main' }}>
              <RichTextInput
                value={block.text}
                onChange={(html) => updateBlock(index, { ...block, text: html })}
                placeholder="Bilgi kutusu içeriği..."
                minHeight={40}
                fontSize={14}
                lineHeight={1.6}
                compact
                sx={{ border: 'none', borderRadius: 0, '&:focus': { borderColor: 'transparent' } }}
              />
            </Box>
          </Box>
        );

      case 'quote':
        return (
          <Box>
            <Stack direction="row" justifyContent="flex-end">{blockActions(index)}</Stack>
            <Box sx={{ pl: 3, borderLeft: '4px solid', borderColor: 'primary.main', py: 1 }}>
              <RichTextInput
                value={block.text}
                onChange={(html) => updateBlock(index, { ...block, text: html })}
                placeholder="Alıntı metni..."
                minHeight={40}
                fontSize={16}
                lineHeight={1.6}
                compact
                sx={{ border: 'none', borderRadius: 0, fontStyle: 'normal' }}
              />
              <TextField fullWidth variant="standard" placeholder="— Yazar"
                value={block.author || ''} onChange={(e) => updateBlock(index, { ...block, author: e.target.value })}
                InputProps={{ disableUnderline: true, sx: { fontSize: 13, color: 'text.secondary', mt: 0.5 } }} />
            </Box>
          </Box>
        );
    }
  };

  return (
    <Box onPaste={handlePaste}>
      <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} style={{ display: 'none' }} />

      {blocks.length === 0 && (
        <Box sx={{ border: '2px dashed', borderColor: 'divider', borderRadius: 3, p: 5, textAlign: 'center' }}>
          <PasteIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
          <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ mb: 0.5 }}>
            İçerik oluşturmaya başlayın
          </Typography>
          <Typography variant="caption" color="text.disabled" sx={{ mb: 2, display: 'block' }}>
            Aşağıdaki bloklardan seçin veya başka sayfadan metin yapıştırın — otomatik algılanır
          </Typography>
          <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" gap={0.5}>
            {BLOCK_OPTIONS.slice(0, 4).map(opt => (
              <Button key={opt.type} size="small" variant="outlined" startIcon={opt.icon}
                onClick={() => insertBlock(-1, opt.type)}
                sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600, fontSize: 12 }}>
                {opt.label}
              </Button>
            ))}
          </Stack>
        </Box>
      )}

      <Stack spacing={0.5}>
        {blocks.map((block, index) => (
          <Paper key={index} className="block-wrap" elevation={0}
            sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'transparent', transition: '0.15s', '&:hover': { borderColor: 'divider', bgcolor: alpha(theme.palette.background.paper, 0.8) } }}>
            {renderBlock(block, index)}
          </Paper>
        ))}
      </Stack>

      {blocks.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Button size="small" variant="outlined" startIcon={<AddIcon />}
            onClick={(e) => setAddMenuAnchor({ el: e.currentTarget, index: blocks.length - 1 })}
            sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600, borderStyle: 'dashed' }}>
            Blok Ekle
          </Button>
        </Box>
      )}

      <Menu anchorEl={addMenuAnchor?.el} open={!!addMenuAnchor} onClose={() => setAddMenuAnchor(null)}
        slotProps={{ paper: { sx: { borderRadius: 3, minWidth: 240 } } }}>
        {BLOCK_OPTIONS.map(opt => (
          <MenuItem key={opt.type} onClick={() => insertBlock(addMenuAnchor?.index ?? blocks.length - 1, opt.type)}>
            <ListItemIcon>{opt.icon}</ListItemIcon>
            <ListItemText primary={opt.label} secondary={opt.desc}
              primaryTypographyProps={{ fontWeight: 600, fontSize: 13 }}
              secondaryTypographyProps={{ fontSize: 11 }} />
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}

// ─── HELPERS ────────────────────────────────────────────
/** Check if text contains HTML tags — if so, render with dangerouslySetInnerHTML */
function hasHtml(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text);
}

/** Shared sx for sanitized inline-HTML rendering */
const inlineHtmlSx = {
  '& a': { color: 'primary.main', textDecoration: 'underline' },
  '& code': { fontFamily: 'monospace', bgcolor: 'action.hover', borderRadius: 0.5, px: 0.5, fontSize: '0.9em' },
  '& b, & strong': { fontWeight: 700 },
  '& i, & em': { fontStyle: 'normal' },
  '& u': { textDecoration: 'underline' },
  '& s, & strike': { textDecoration: 'line-through' },
};

/** Render text that may contain inline HTML (bold, italic, links, etc.) */
function HtmlText({ text, sx, ...rest }: { text: string; sx?: Record<string, unknown>; [k: string]: unknown }) {
  if (hasHtml(text)) {
    return <Box component="span" dangerouslySetInnerHTML={{ __html: text }} sx={{ ...inlineHtmlSx, ...sx }} {...rest} />;
  }
  return <>{text}</>;
}

// ─── CONTENT RENDERER ───────────────────────────────────
export function RichContentRenderer({ blocks, mobile }: { blocks: ContentBlock[]; mobile?: boolean }) {
  const theme = useTheme();

  return (
    <Box sx={{ maxWidth: mobile ? 340 : '100%', mx: 'auto' }}>
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'heading':
            return (
              <Typography key={i} variant={block.level === 1 ? 'h5' : block.level === 2 ? 'h6' : 'subtitle1'} fontWeight={700} sx={{ mt: i > 0 ? 2 : 0, mb: 1, lineHeight: 1.3 }}>
                <HtmlText text={block.text} />
              </Typography>
            );
          case 'paragraph':
            return hasHtml(block.text) ? (
              <Box key={i} dangerouslySetInnerHTML={{ __html: block.text }}
                sx={{ mb: 1.5, lineHeight: 1.8, color: 'text.primary', fontSize: mobile ? 14 : 15, ...inlineHtmlSx }} />
            ) : (
              <Typography key={i} variant="body2" sx={{ mb: 1.5, lineHeight: 1.8, color: 'text.primary', fontSize: mobile ? 14 : 15, whiteSpace: 'pre-wrap' }}>{block.text}</Typography>
            );
          case 'bullet_list':
            return (
              <Box key={i} component="ul" sx={{ pl: 3, mb: 1.5, '& li': { mb: 0.5, fontSize: mobile ? 14 : 15, lineHeight: 1.7, color: 'text.primary' }, ...inlineHtmlSx }}>
                {block.items.map((item, j) => hasHtml(item)
                  ? <li key={j} dangerouslySetInnerHTML={{ __html: item }} />
                  : <li key={j}>{item}</li>
                )}
              </Box>
            );
          case 'ordered_list':
            return (
              <Box key={i} component="ol" sx={{ pl: 3, mb: 1.5, '& li': { mb: 0.5, fontSize: mobile ? 14 : 15, lineHeight: 1.7, color: 'text.primary' }, ...inlineHtmlSx }}>
                {block.items.map((item, j) => hasHtml(item)
                  ? <li key={j} dangerouslySetInnerHTML={{ __html: item }} />
                  : <li key={j}>{item}</li>
                )}
              </Box>
            );
          case 'image':
            return (
              <Box key={i} sx={{ my: 2, borderRadius: 2, overflow: 'hidden', maxWidth: block.width === 'small' ? 200 : block.width === 'medium' ? 320 : '100%', mx: block.width !== 'full' ? 'auto' : 0 }}>
                {block.url && <Box component="img" src={block.url} alt={block.caption || ''} sx={{ width: '100%', height: 'auto', display: 'block', borderRadius: 2 }} />}
                {block.caption && <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', textAlign: 'center', fontStyle: 'normal' }}>{block.caption}</Typography>}
              </Box>
            );
          case 'divider':
            return <Divider key={i} sx={{ my: 2 }} />;
          case 'callout':
            return (
              <Box key={i} sx={{ p: 2, my: 1.5, borderRadius: 2, borderLeft: '4px solid', borderLeftColor: block.variant === 'info' ? 'info.main' : block.variant === 'warning' ? 'warning.main' : 'success.main', bgcolor: alpha(block.variant === 'info' ? theme.palette.info.main : block.variant === 'warning' ? theme.palette.warning.main : theme.palette.success.main, 0.06) }}>
                {hasHtml(block.text) ? (
                  <Box dangerouslySetInnerHTML={{ __html: block.text }}
                    sx={{ fontSize: mobile ? 13 : 14, fontWeight: 500, ...inlineHtmlSx }} />
                ) : (
                  <Typography variant="body2" fontWeight={500} sx={{ fontSize: mobile ? 13 : 14, whiteSpace: 'pre-wrap' }}>{block.text}</Typography>
                )}
              </Box>
            );
          case 'quote':
            return (
              <Box key={i} sx={{ pl: 2.5, borderLeft: '3px solid', borderColor: 'primary.main', my: 2 }}>
                {hasHtml(block.text) ? (
                  <Box dangerouslySetInnerHTML={{ __html: block.text }}
                    sx={{ fontStyle: 'normal', lineHeight: 1.6, fontSize: mobile ? 14 : 15, ...inlineHtmlSx }} />
                ) : (
                  <Typography variant="body2" sx={{ fontStyle: 'normal', lineHeight: 1.6, fontSize: mobile ? 14 : 15, whiteSpace: 'pre-wrap' }}>{block.text}</Typography>
                )}
                {block.author && <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>— {block.author}</Typography>}
              </Box>
            );
          default: return null;
        }
      })}
    </Box>
  );
}
