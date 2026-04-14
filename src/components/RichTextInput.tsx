/**
 * RichTextInput — Inline contentEditable editor with a mini formatting toolbar.
 * Outputs HTML string. Works as a drop-in replacement for plain TextField areas
 * where basic formatting (bold, italic, underline, link, strikethrough) is needed.
 */
import React, { useRef, useCallback, useEffect, useState } from 'react';
import {
  Box, IconButton, Tooltip, Divider, Stack, alpha, useTheme,
  TextField, Dialog, DialogTitle, DialogContent, DialogActions, Button,
} from '@mui/material';
import {
  FormatBold as BoldIcon,
  FormatItalic as ItalicIcon,
  FormatUnderlined as UnderlineIcon,
  StrikethroughS as StrikeIcon,
  Link as LinkIcon,
  LinkOff as LinkOffIcon,
  Code as CodeIcon,
  FormatClear as ClearIcon,
  Image as ImageIcon,
} from '@mui/icons-material';

interface RichTextInputProps {
  /** HTML string value */
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Minimum height in px */
  minHeight?: number;
  /** Font size */
  fontSize?: number;
  /** Line height */
  lineHeight?: number;
  /** Disable the toolbar (read-only text area feel) */
  hideToolbar?: boolean;
  /** Extra sx for the editable area */
  sx?: Record<string, unknown>;
  /** Show a compact single-row toolbar */
  compact?: boolean;
  /** Upload and insert an image into the HTML */
  onImageUpload?: (file: File) => Promise<string | null>;
}

const TOOLBAR_ACTIONS = [
  { cmd: 'bold', icon: <BoldIcon sx={{ fontSize: 18 }} />, title: 'Kalın (Ctrl+B)', key: 'bold' },
  { cmd: 'italic', icon: <ItalicIcon sx={{ fontSize: 18 }} />, title: 'İtalik (Ctrl+I)', key: 'italic' },
  { cmd: 'underline', icon: <UnderlineIcon sx={{ fontSize: 18 }} />, title: 'Altı Çizili (Ctrl+U)', key: 'underline' },
  { cmd: 'strikeThrough', icon: <StrikeIcon sx={{ fontSize: 18 }} />, title: 'Üstü Çizili', key: 'strikeThrough' },
] as const;

export default function RichTextInput({
  value,
  onChange,
  placeholder = 'Metin yazın...',
  minHeight = 60,
  fontSize = 15,
  lineHeight = 1.8,
  hideToolbar = false,
  sx: sxProp,
  compact = false,
  onImageUpload,
}: RichTextInputProps) {
  const theme = useTheme();
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isInternalChange = useRef(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const savedRange = useRef<Range | null>(null);

  // Sync external value → contentEditable (only when not typing internally)
  useEffect(() => {
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    const el = editorRef.current;
    if (el && el.innerHTML !== value) {
      el.innerHTML = value;
    }
  }, [value]);

  const handleInput = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    isInternalChange.current = true;
    const html = el.innerHTML;
    // Treat <br> only or empty as ''
    const cleaned = html === '<br>' || html === '<div><br></div>' ? '' : html;
    onChange(cleaned);
  }, [onChange]);

  const execCommand = useCallback((cmd: string, val?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    handleInput();
  }, [handleInput]);

  const handleToolbarAction = useCallback((cmd: string) => {
    execCommand(cmd);
  }, [execCommand]);

  const saveSelection = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    }
  }, []);

  const restoreSelection = useCallback(() => {
    if (!savedRange.current) return;
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(savedRange.current);
  }, []);

  // Link insert
  const openLinkDialog = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    }
    // Check if current selection is already a link
    const anchor = sel?.anchorNode?.parentElement?.closest('a');
    setLinkUrl(anchor?.getAttribute('href') || 'https://');
    setLinkDialogOpen(true);
  }, []);

  const insertLink = useCallback(() => {
    setLinkDialogOpen(false);
    editorRef.current?.focus();
    restoreSelection();
    if (linkUrl.trim()) {
      execCommand('createLink', linkUrl.trim());
      // Make links open in new tab
      const el = editorRef.current;
      if (el) {
        el.querySelectorAll('a').forEach(a => {
          a.setAttribute('target', '_blank');
          a.setAttribute('rel', 'noopener noreferrer');
        });
      }
    }
    savedRange.current = null;
    handleInput();
  }, [linkUrl, execCommand, handleInput, restoreSelection]);

  const removeLink = useCallback(() => {
    execCommand('unlink');
  }, [execCommand]);

  const insertImage = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return;

    setUploadingImage(true);
    try {
      editorRef.current?.focus();
      restoreSelection();

      let imageUrl: string | null = null;
      if (onImageUpload) {
        imageUrl = await onImageUpload(file);
      } else {
        imageUrl = await new Promise<string | null>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(file);
        });
      }

      if (!imageUrl) return;

      restoreSelection();
      document.execCommand('insertHTML', false, `<img src="${imageUrl}" alt="${file.name.replace(/"/g, '&quot;')}" />`);
      handleInput();
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      savedRange.current = null;
    }
  }, [handleInput, onImageUpload, restoreSelection]);

  const handleImageFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await insertImage(file);
  }, [insertImage]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      openLinkDialog();
    }
  }, [openLinkDialog]);

  // Paste: strip formatting from non-html pastes, sanitize html pastes
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const html = e.clipboardData.getData('text/html');
    const plain = e.clipboardData.getData('text/plain');

    e.preventDefault();

    if (html) {
      // Sanitize and insert HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      doc.querySelectorAll('script, style, iframe, link, object, embed, form, input, button, noscript').forEach(el => el.remove());
      // Remove clipboard comment artifacts (<!--StartFragment--> etc.)
      const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_COMMENT);
      const comments: Comment[] = [];
      while (walker.nextNode()) comments.push(walker.currentNode as Comment);
      comments.forEach(c => c.remove());
      doc.querySelectorAll('*').forEach(el => {
        // Remove event handlers
        Array.from(el.attributes).forEach(attr => {
          if (attr.name.startsWith('on') || (attr.name === 'href' && attr.value.trim().toLowerCase().startsWith('javascript:'))) {
            el.removeAttribute(attr.name);
          }
        });
        // Keep only basic formatting attributes
        el.removeAttribute('class');
        el.removeAttribute('id');
        el.removeAttribute('style');
      });
      document.execCommand('insertHTML', false, doc.body.innerHTML);
    } else if (plain) {
      document.execCommand('insertText', false, plain);
    }

    handleInput();
  }, [handleInput]);

  const toolbarBtnSx = {
    width: compact ? 28 : 32,
    height: compact ? 28 : 32,
    borderRadius: 1,
    color: 'text.secondary',
    '&:hover': {
      bgcolor: alpha(theme.palette.primary.main, 0.08),
      color: 'primary.main',
    },
  };

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Toolbar */}
      {!hideToolbar && (
        <Stack
          direction="row"
          spacing={0.25}
          alignItems="center"
          sx={{
            px: 1,
            py: 0.5,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: alpha(theme.palette.background.default, 0.5),
            borderRadius: '8px 8px 0 0',
            flexWrap: 'wrap',
          }}
        >
          {TOOLBAR_ACTIONS.map(action => (
            <Tooltip key={action.key} title={action.title} arrow>
              <IconButton
                size="small"
                onMouseDown={(e) => { e.preventDefault(); handleToolbarAction(action.cmd); }}
                sx={toolbarBtnSx}
              >
                {action.icon}
              </IconButton>
            </Tooltip>
          ))}

          <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.5 }} />

          <Tooltip title="Bağlantı Ekle (Ctrl+K)" arrow>
            <IconButton size="small" onMouseDown={(e) => { e.preventDefault(); openLinkDialog(); }} sx={toolbarBtnSx}>
              <LinkIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Bağlantı Kaldır" arrow>
            <IconButton size="small" onMouseDown={(e) => { e.preventDefault(); removeLink(); }} sx={toolbarBtnSx}>
              <LinkOffIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>

          <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.5 }} />

          <Tooltip title={uploadingImage ? 'Görsel yükleniyor...' : 'Görsel Ekle'} arrow>
            <span>
              <IconButton
                size="small"
                disabled={uploadingImage}
                onMouseDown={(e) => {
                  e.preventDefault();
                  saveSelection();
                  fileInputRef.current?.click();
                }}
                sx={toolbarBtnSx}
              >
                <ImageIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title="Kod" arrow>
            <IconButton size="small" onMouseDown={(e) => {
              e.preventDefault();
              const sel = window.getSelection();
              if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
                const range = sel.getRangeAt(0);
                const code = document.createElement('code');
                range.surroundContents(code);
                handleInput();
              }
            }} sx={toolbarBtnSx}>
              <CodeIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Biçimlendirmeyi Temizle" arrow>
            <IconButton size="small" onMouseDown={(e) => { e.preventDefault(); execCommand('removeFormat'); }} sx={toolbarBtnSx}>
              <ClearIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Stack>
      )}

      {/* Editable Area */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageFileChange}
        style={{ display: 'none' }}
      />
      <Box
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onMouseUp={saveSelection}
        onKeyUp={saveSelection}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        data-placeholder={placeholder}
        sx={{
          minHeight,
          px: 2,
          py: 1.5,
          fontSize,
          lineHeight,
          color: 'text.primary',
          outline: 'none',
          border: '1px solid',
          borderColor: 'divider',
          borderTop: hideToolbar ? undefined : 'none',
          borderRadius: hideToolbar ? 2 : '0 0 8px 8px',
          transition: 'border-color 0.2s',
          '&:focus': {
            borderColor: 'primary.main',
          },
          '&:empty:before': {
            content: 'attr(data-placeholder)',
            color: 'text.disabled',
            pointerEvents: 'none',
          },
          '& a': {
            color: 'primary.main',
            textDecoration: 'underline',
          },
          '& img': {
            maxWidth: '100%',
            height: 'auto',
            display: 'block',
            margin: '12px auto',
            borderRadius: 8,
          },
          '& code': {
            fontFamily: 'monospace',
            bgcolor: alpha(theme.palette.text.primary, 0.06),
            borderRadius: 0.5,
            px: 0.5,
            fontSize: '0.9em',
          },
          '& b, & strong': { fontWeight: 700 },
          '& i, & em': { fontStyle: 'italic' },
          '& u': { textDecoration: 'underline' },
          '& s, & strike': { textDecoration: 'line-through' },
          ...sxProp,
        }}
      />

      {/* Link Dialog */}
      <Dialog
        open={linkDialogOpen}
        onClose={() => setLinkDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Bağlantı Ekle</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            size="small"
            label="URL"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); insertLink(); } }}
            placeholder="https://example.com"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setLinkDialogOpen(false)} sx={{ textTransform: 'none' }}>İptal</Button>
          <Button variant="contained" onClick={insertLink}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, bgcolor: '#1a5c28', '&:hover': { bgcolor: '#155220' } }}>
            Ekle
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
