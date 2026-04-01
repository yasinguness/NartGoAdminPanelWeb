/**
 * RichContentEditor — Blog-style block editor for notification content.
 * Produces ContentBlock[] JSON that can be rendered on mobile (React Native) and web.
 *
 * Blocks: heading, paragraph, image, divider, callout, quote
 * Each block is drag-reorderable, editable, and deletable.
 */
import React, { useState, useCallback, useRef } from 'react';
import {
  Box, Typography, TextField, IconButton, Button, Stack, Menu, MenuItem,
  ListItemIcon, ListItemText, Paper, Tooltip, Divider, Chip, alpha, useTheme,
  Select, FormControl, InputLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
  Title as HeadingIcon,
  Notes as ParagraphIcon,
  Image as ImageIcon,
  HorizontalRule as DividerIcon,
  Info as CalloutIcon,
  FormatQuote as QuoteIcon,
  ArrowUpward as MoveUpIcon,
  ArrowDownward as MoveDownIcon,
  CloudUpload as UploadIcon,
} from '@mui/icons-material';
import type { ContentBlock, ContentBlockType } from '../types/notification.types';

interface RichContentEditorProps {
  blocks: ContentBlock[];
  onChange: (blocks: ContentBlock[]) => void;
  compact?: boolean;
}

const BLOCK_OPTIONS: { type: ContentBlockType; label: string; icon: React.ReactNode; desc: string }[] = [
  { type: 'heading', label: 'Başlık', icon: <HeadingIcon />, desc: 'Kalın başlık metni' },
  { type: 'paragraph', label: 'Paragraf', icon: <ParagraphIcon />, desc: 'Normal metin bloğu' },
  { type: 'image', label: 'Görsel', icon: <ImageIcon />, desc: 'Fotoğraf veya ilustrasyon' },
  { type: 'callout', label: 'Bilgi Kutusu', icon: <CalloutIcon />, desc: 'Vurgulanan bilgi bloğu' },
  { type: 'quote', label: 'Alıntı', icon: <QuoteIcon />, desc: 'Alıntı bloğu' },
  { type: 'divider', label: 'Ayırıcı', icon: <DividerIcon />, desc: 'Yatay çizgi' },
];

function createBlock(type: ContentBlockType): ContentBlock {
  switch (type) {
    case 'heading': return { type: 'heading', text: '', level: 2 };
    case 'paragraph': return { type: 'paragraph', text: '' };
    case 'image': return { type: 'image', url: '', caption: '', width: 'full' };
    case 'divider': return { type: 'divider' };
    case 'callout': return { type: 'callout', text: '', variant: 'info' };
    case 'quote': return { type: 'quote', text: '', author: '' };
  }
}

export default function RichContentEditor({ blocks, onChange, compact }: RichContentEditorProps) {
  const theme = useTheme();
  const [addMenuAnchor, setAddMenuAnchor] = useState<{ el: HTMLElement; index: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetIndex, setUploadTargetIndex] = useState<number>(-1);

  const updateBlock = useCallback((index: number, updated: ContentBlock) => {
    const next = [...blocks];
    next[index] = updated;
    onChange(next);
  }, [blocks, onChange]);

  const removeBlock = useCallback((index: number) => {
    onChange(blocks.filter((_, i) => i !== index));
  }, [blocks, onChange]);

  const moveBlock = useCallback((index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[newIndex]] = [next[newIndex], next[index]];
    onChange(next);
  }, [blocks, onChange]);

  const insertBlock = useCallback((afterIndex: number, type: ContentBlockType) => {
    const next = [...blocks];
    next.splice(afterIndex + 1, 0, createBlock(type));
    onChange(next);
    setAddMenuAnchor(null);
  }, [blocks, onChange]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || uploadTargetIndex < 0) return;
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      const block = blocks[uploadTargetIndex];
      if (block.type === 'image') {
        updateBlock(uploadTargetIndex, { ...block, url });
      }
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ─── BLOCK RENDERERS ────────────────────────────
  const renderBlock = (block: ContentBlock, index: number) => {
    const blockActions = (
      <Stack direction="row" spacing={0.25} sx={{ opacity: 0, transition: '0.15s', '.block-wrap:hover &': { opacity: 1 } }}>
        <Tooltip title="Yukarı"><IconButton size="small" onClick={() => moveBlock(index, -1)} disabled={index === 0}><MoveUpIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
        <Tooltip title="Aşağı"><IconButton size="small" onClick={() => moveBlock(index, 1)} disabled={index === blocks.length - 1}><MoveDownIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
        <Tooltip title="Sil"><IconButton size="small" onClick={() => removeBlock(index)} sx={{ '&:hover': { color: 'error.main' } }}><DeleteIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
      </Stack>
    );

    switch (block.type) {
      case 'heading':
        return (
          <Stack spacing={1}>
            <Stack direction="row" spacing={1} alignItems="center">
              <HeadingIcon sx={{ color: 'text.disabled', fontSize: 18 }} />
              <Chip label={`H${block.level}`} size="small" sx={{ height: 20, fontSize: 10 }}
                onClick={() => updateBlock(index, { ...block, level: ((block.level % 3) + 1) as 1 | 2 | 3 })} />
              {blockActions}
            </Stack>
            <TextField
              fullWidth variant="standard" placeholder="Başlık yazın..."
              value={block.text}
              onChange={(e) => updateBlock(index, { ...block, text: e.target.value })}
              InputProps={{
                disableUnderline: true,
                sx: {
                  fontSize: block.level === 1 ? 28 : block.level === 2 ? 22 : 18,
                  fontWeight: 700, lineHeight: 1.3,
                },
              }}
            />
          </Stack>
        );

      case 'paragraph':
        return (
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
              <ParagraphIcon sx={{ color: 'text.disabled', fontSize: 16 }} />
              {blockActions}
            </Stack>
            <TextField
              fullWidth variant="standard" placeholder="Metin yazın..."
              multiline minRows={2} value={block.text}
              onChange={(e) => updateBlock(index, { ...block, text: e.target.value })}
              InputProps={{
                disableUnderline: true,
                sx: { fontSize: 15, lineHeight: 1.7, color: 'text.primary' },
              }}
            />
          </Box>
        );

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
              {blockActions}
            </Stack>
            {block.url ? (
              <Box sx={{
                position: 'relative', borderRadius: 3, overflow: 'hidden',
                maxWidth: block.width === 'small' ? 240 : block.width === 'medium' ? 400 : '100%',
                mx: block.width !== 'full' ? 'auto' : 0,
                border: '1px solid', borderColor: 'divider',
                '&:hover .img-actions': { opacity: 1 },
              }}>
                <Box component="img" src={block.url} alt={block.caption || ''} sx={{
                  width: '100%', height: 'auto', maxHeight: 400, objectFit: 'cover', display: 'block',
                }} />
                <Box className="img-actions" sx={{
                  position: 'absolute', top: 8, right: 8, opacity: 0, transition: '0.2s',
                  display: 'flex', gap: 0.5,
                }}>
                  <Button size="small" variant="contained"
                    onClick={() => { setUploadTargetIndex(index); fileInputRef.current?.click(); }}
                    sx={{ bgcolor: 'rgba(255,255,255,0.9)', color: 'text.primary', fontSize: 11, '&:hover': { bgcolor: 'white' } }}>
                    Değiştir
                  </Button>
                  <Button size="small" variant="contained" color="error"
                    onClick={() => updateBlock(index, { ...block, url: '' })}
                    sx={{ fontSize: 11 }}>
                    Kaldır
                  </Button>
                </Box>
              </Box>
            ) : (
              <Box
                onClick={() => { setUploadTargetIndex(index); fileInputRef.current?.click(); }}
                sx={{
                  border: '2px dashed', borderColor: 'divider', borderRadius: 3,
                  p: 4, textAlign: 'center', cursor: 'pointer', transition: '0.15s',
                  '&:hover': { borderColor: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.02) },
                }}>
                <UploadIcon sx={{ fontSize: 36, color: 'text.disabled', mb: 1 }} />
                <Typography variant="body2" color="text.secondary" fontWeight={600}>
                  Görsel yüklemek için tıklayın
                </Typography>
                <Typography variant="caption" color="text.disabled">JPG, PNG, WebP — Maks 5MB</Typography>
              </Box>
            )}
            {block.url && (
              <TextField
                fullWidth variant="standard" placeholder="Görsel açıklaması (opsiyonel)..."
                value={block.caption || ''}
                onChange={(e) => updateBlock(index, { ...block, caption: e.target.value })}
                InputProps={{ disableUnderline: true, sx: { fontSize: 13, color: 'text.secondary', fontStyle: 'italic', mt: 1 } }}
              />
            )}
            {!block.url && (
              <TextField
                fullWidth size="small" placeholder="veya görsel URL'si yapıştırın..."
                sx={{ mt: 1 }}
                onBlur={(e) => { if (e.target.value) updateBlock(index, { ...block, url: e.target.value }); }}
              />
            )}
          </Box>
        );

      case 'divider':
        return (
          <Stack direction="row" alignItems="center" spacing={1}>
            <Divider sx={{ flex: 1 }} />
            {blockActions}
          </Stack>
        );

      case 'callout':
        return (
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
              <Stack direction="row" spacing={0.5}>
                {(['info', 'warning', 'success'] as const).map(v => (
                  <Chip key={v} size="small" sx={{ height: 20, fontSize: 10 }}
                    label={v === 'info' ? 'Bilgi' : v === 'warning' ? 'Uyarı' : 'Başarı'}
                    color={block.variant === v ? (v === 'info' ? 'info' : v === 'warning' ? 'warning' : 'success') : 'default'}
                    onClick={() => updateBlock(index, { ...block, variant: v })} />
                ))}
              </Stack>
              {blockActions}
            </Stack>
            <Box sx={{
              p: 2, borderRadius: 2, border: '1px solid',
              borderColor: block.variant === 'info' ? 'info.main' : block.variant === 'warning' ? 'warning.main' : 'success.main',
              bgcolor: alpha(
                block.variant === 'info' ? theme.palette.info.main : block.variant === 'warning' ? theme.palette.warning.main : theme.palette.success.main,
                0.06
              ),
              borderLeft: '4px solid',
              borderLeftColor: block.variant === 'info' ? 'info.main' : block.variant === 'warning' ? 'warning.main' : 'success.main',
            }}>
              <TextField
                fullWidth variant="standard" placeholder="Bilgi kutusu içeriği..."
                multiline value={block.text}
                onChange={(e) => updateBlock(index, { ...block, text: e.target.value })}
                InputProps={{ disableUnderline: true, sx: { fontSize: 14, fontWeight: 500 } }}
              />
            </Box>
          </Box>
        );

      case 'quote':
        return (
          <Box>
            <Stack direction="row" justifyContent="flex-end">{blockActions}</Stack>
            <Box sx={{ pl: 3, borderLeft: '4px solid', borderColor: 'primary.main', py: 1 }}>
              <TextField
                fullWidth variant="standard" placeholder="Alıntı metni..."
                multiline value={block.text}
                onChange={(e) => updateBlock(index, { ...block, text: e.target.value })}
                InputProps={{ disableUnderline: true, sx: { fontSize: 16, fontStyle: 'italic', lineHeight: 1.6 } }}
              />
              <TextField
                fullWidth variant="standard" placeholder="— Yazar"
                value={block.author || ''}
                onChange={(e) => updateBlock(index, { ...block, author: e.target.value })}
                InputProps={{ disableUnderline: true, sx: { fontSize: 13, color: 'text.secondary', mt: 0.5 } }}
              />
            </Box>
          </Box>
        );
    }
  };

  return (
    <Box>
      <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} style={{ display: 'none' }} />

      {blocks.length === 0 && (
        <Box sx={{
          border: '2px dashed', borderColor: 'divider', borderRadius: 3,
          p: 5, textAlign: 'center',
        }}>
          <ParagraphIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
          <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ mb: 2 }}>
            İçerik oluşturmaya başlayın
          </Typography>
          <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" gap={0.5}>
            {BLOCK_OPTIONS.slice(0, 3).map(opt => (
              <Button key={opt.type} size="small" variant="outlined" startIcon={opt.icon}
                onClick={() => insertBlock(-1, opt.type)}
                sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600, fontSize: 12 }}>
                {opt.label}
              </Button>
            ))}
          </Stack>
        </Box>
      )}

      <Stack spacing={1.5}>
        {blocks.map((block, index) => (
          <Paper
            key={index}
            className="block-wrap"
            elevation={0}
            sx={{
              p: 2, borderRadius: 3,
              border: '1px solid', borderColor: 'transparent',
              transition: '0.15s',
              '&:hover': { borderColor: 'divider', bgcolor: alpha(theme.palette.background.paper, 0.8) },
            }}
          >
            {renderBlock(block, index)}
          </Paper>
        ))}
      </Stack>

      {/* Add Block Button */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
        <Button
          size="small" variant="outlined" startIcon={<AddIcon />}
          onClick={(e) => setAddMenuAnchor({ el: e.currentTarget, index: blocks.length - 1 })}
          sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600, borderStyle: 'dashed' }}>
          Blok Ekle
        </Button>
      </Box>

      <Menu
        anchorEl={addMenuAnchor?.el}
        open={Boolean(addMenuAnchor)}
        onClose={() => setAddMenuAnchor(null)}
        slotProps={{ paper: { sx: { borderRadius: 3, minWidth: 220 } } }}
      >
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

// ─── CONTENT RENDERER (for preview & mobile) ─────────
export function RichContentRenderer({ blocks, mobile }: { blocks: ContentBlock[]; mobile?: boolean }) {
  const theme = useTheme();

  return (
    <Box sx={{ maxWidth: mobile ? 340 : '100%', mx: 'auto' }}>
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'heading':
            return (
              <Typography key={i} variant={block.level === 1 ? 'h5' : block.level === 2 ? 'h6' : 'subtitle1'}
                fontWeight={700} sx={{ mt: i > 0 ? 2 : 0, mb: 1, lineHeight: 1.3 }}>
                {block.text}
              </Typography>
            );
          case 'paragraph':
            return (
              <Typography key={i} variant="body2" sx={{ mb: 1.5, lineHeight: 1.7, color: 'text.primary', fontSize: mobile ? 14 : 15 }}>
                {block.text}
              </Typography>
            );
          case 'image':
            return (
              <Box key={i} sx={{
                my: 2, borderRadius: 2, overflow: 'hidden',
                maxWidth: block.width === 'small' ? 200 : block.width === 'medium' ? 320 : '100%',
                mx: block.width !== 'full' ? 'auto' : 0,
              }}>
                {block.url && (
                  <Box component="img" src={block.url} alt={block.caption || ''}
                    sx={{ width: '100%', height: 'auto', display: 'block', borderRadius: 2 }} />
                )}
                {block.caption && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', textAlign: 'center', fontStyle: 'italic' }}>
                    {block.caption}
                  </Typography>
                )}
              </Box>
            );
          case 'divider':
            return <Divider key={i} sx={{ my: 2 }} />;
          case 'callout':
            return (
              <Box key={i} sx={{
                p: 2, my: 1.5, borderRadius: 2,
                borderLeft: '4px solid',
                borderLeftColor: block.variant === 'info' ? 'info.main' : block.variant === 'warning' ? 'warning.main' : 'success.main',
                bgcolor: alpha(
                  block.variant === 'info' ? theme.palette.info.main : block.variant === 'warning' ? theme.palette.warning.main : theme.palette.success.main,
                  0.06
                ),
              }}>
                <Typography variant="body2" fontWeight={500} sx={{ fontSize: mobile ? 13 : 14 }}>{block.text}</Typography>
              </Box>
            );
          case 'quote':
            return (
              <Box key={i} sx={{ pl: 2.5, borderLeft: '3px solid', borderColor: 'primary.main', my: 2 }}>
                <Typography variant="body2" sx={{ fontStyle: 'italic', lineHeight: 1.6, fontSize: mobile ? 14 : 15 }}>{block.text}</Typography>
                {block.author && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>— {block.author}</Typography>
                )}
              </Box>
            );
          default:
            return null;
        }
      })}
    </Box>
  );
}
