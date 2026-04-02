import { useRef, useState, useCallback, useEffect } from 'react';
import {
  Box, Button, IconButton, LinearProgress, Stack, TextField,
  Tooltip, Typography, alpha, Chip,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Close as CloseIcon,
  SwapHoriz as SwapIcon,
  MyLocation as FocalIcon,
  InfoOutlined as InfoIcon,
} from '@mui/icons-material';
import type { CoverMediaRequest } from '../types/article/articleModel';

// ─── Crop preview contract ──────────────────────────────────────────────────
const PREVIEWS = [
  { kind: 'card',        label: 'Kart',         ratio: '4/3',  w: 4, h: 3, desc: 'Makale listesi' },
  { kind: 'mobileHero',  label: 'Mobil Hero',   ratio: '4/5',  w: 4, h: 5, desc: 'Mobil tam ekran' },
  { kind: 'desktopHero', label: 'Web Hero',      ratio: '16/9', w: 16, h: 9, desc: 'Web banner' },
] as const;

// ─── Props ──────────────────────────────────────────────────────────────────
interface CoverImageEditorProps {
  value: CoverMediaRequest | undefined;
  onChange: (value: CoverMediaRequest | undefined) => void;
  onUpload: (file: File, onProgress: (p: number) => void) => Promise<string>;
  onRequestCrop?: (file: File) => Promise<File | null>;
  disabled?: boolean;
}

// ─── Component ──────────────────────────────────────────────────────────────
export default function CoverImageEditor({
  value,
  onChange,
  onUpload,
  onRequestCrop,
  disabled = false,
}: CoverImageEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [focalHint, setFocalHint] = useState(false); // show pulse after upload

  const fx = value?.focalPointX ?? 0.5;
  const fy = value?.focalPointY ?? 0.33;
  const hasImage = !!value?.originalUrl;

  // Pulse the focal point indicator briefly after a new image is set
  useEffect(() => {
    if (hasImage) {
      setFocalHint(true);
      const t = setTimeout(() => setFocalHint(false), 2000);
      return () => clearTimeout(t);
    }
  }, [value?.originalUrl]);

  // ─── Upload ───────────────────────────────────────────────────────────────
  const processFile = useCallback(async (raw: File) => {
    if (!raw.type.startsWith('image/')) return;
    if (raw.size > 10 * 1024 * 1024) return;

    let file = raw;
    if (onRequestCrop) {
      const cropped = await onRequestCrop(raw);
      if (!cropped) return;
      file = cropped;
    }

    setUploading(true);
    setProgress(0);
    try {
      const url = await onUpload(file, setProgress);
      onChange({ originalUrl: url, focalPointX: 0.5, focalPointY: 0.33 });
    } catch {
      // Fallback: local blob preview
      const url = URL.createObjectURL(file);
      onChange({ originalUrl: url, focalPointX: 0.5, focalPointY: 0.33 });
    } finally {
      setUploading(false);
      setProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [onChange, onUpload, onRequestCrop]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) processFile(f);
  }, [processFile]);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);

  // ─── Focal point ─────────────────────────────────────────────────────────
  const handleFocalClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!value) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = parseFloat(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)).toFixed(3));
    const y = parseFloat(Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)).toFixed(3));
    onChange({ ...value, focalPointX: x, focalPointY: y });
  }, [value, onChange]);

  // ─── Render ──────────────────────────────────────────────────────────────
  if (uploading) {
    return (
      <Box sx={{
        borderRadius: 3, border: '1px solid', borderColor: 'divider',
        p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5,
      }}>
        <UploadIcon sx={{ fontSize: 32, color: 'text.disabled' }} />
        <LinearProgress variant="determinate" value={progress}
          sx={{ width: '50%', borderRadius: 4, height: 6 }} />
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          Yükleniyor… %{progress}
        </Typography>
      </Box>
    );
  }

  if (!hasImage) {
    return (
      <>
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp"
          style={{ display: 'none' }} onChange={handleFileInput} />
        <Box
          onClick={() => !disabled && fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          sx={{
            borderRadius: 3,
            border: '2px dashed',
            borderColor: dragOver ? '#1a5c28' : 'divider',
            bgcolor: dragOver ? alpha('#1a5c28', 0.04) : 'transparent',
            transition: 'all 0.15s',
            cursor: disabled ? 'default' : 'pointer',
            p: 5,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1,
            '&:hover': disabled ? {} : {
              borderColor: '#1a5c28',
              bgcolor: alpha('#1a5c28', 0.02),
            },
          }}
        >
          <Box sx={{
            width: 52, height: 52, borderRadius: '50%',
            bgcolor: alpha('#1a5c28', 0.08),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            mb: 0.5,
          }}>
            <UploadIcon sx={{ fontSize: 26, color: '#1a5c28' }} />
          </Box>
          <Typography variant="body2" fontWeight={700} color="text.primary">
            {dragOver ? 'Bırak!' : 'Görsel yükle veya sürükle bırak'}
          </Typography>
          <Typography variant="caption" color="text.disabled">
            JPG, PNG, WEBP · Maks 10 MB · Önerilen: 1600 × 900 px
          </Typography>
        </Box>
      </>
    );
  }

  // ─── Loaded state ─────────────────────────────────────────────────────────
  return (
    <>
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }} onChange={handleFileInput} />

      <Box sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>

        {/* ── Focal point editor ── */}
        <Box sx={{ position: 'relative' }}>
          {/* Instruction badge */}
          <Box sx={{
            position: 'absolute', top: 10, left: 10, zIndex: 2,
            display: 'flex', alignItems: 'center', gap: 0.6,
            bgcolor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            px: 1.25, py: 0.5, borderRadius: 2,
          }}>
            <FocalIcon sx={{ fontSize: 13, color: 'rgba(255,255,255,0.9)' }} />
            <Typography sx={{ fontSize: 11, color: 'white', fontWeight: 600, lineHeight: 1 }}>
              Odak noktası
            </Typography>
            <Tooltip title="Görselin en önemli alanını işaretle. Her kullanım alanı (kart, mobil, web) bu noktayı merkez alarak otomatik kırpılır." arrow placement="bottom">
              <InfoIcon sx={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', cursor: 'help' }} />
            </Tooltip>
          </Box>

          {/* Action buttons — top right */}
          <Box sx={{ position: 'absolute', top: 10, right: 10, zIndex: 2, display: 'flex', gap: 0.75 }}>
            <Tooltip title="Görseli değiştir" arrow>
              <IconButton size="small" onClick={() => fileInputRef.current?.click()}
                sx={{ bgcolor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', color: 'white', '&:hover': { bgcolor: 'rgba(0,0,0,0.75)' } }}>
                <SwapIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Görseli kaldır" arrow>
              <IconButton size="small" onClick={() => onChange(undefined)}
                sx={{ bgcolor: 'rgba(220,38,38,0.75)', backdropFilter: 'blur(4px)', color: 'white', '&:hover': { bgcolor: 'rgba(220,38,38,0.9)' } }}>
                <CloseIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Box>

          {/* The editor surface */}
          <Box
            ref={editorRef}
            onClick={handleFocalClick}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            sx={{
              position: 'relative',
              cursor: 'crosshair',
              userSelect: 'none',
              lineHeight: 0,
              '&:hover .focal-crosshair': { opacity: 1 },
            }}
          >
            <Box
              component="img"
              src={value.originalUrl}
              draggable={false}
              sx={{ width: '100%', height: 260, objectFit: 'cover', display: 'block' }}
            />

            {/* Crosshair lines — visible on hover */}
            <Box className="focal-crosshair" sx={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              opacity: 0, transition: 'opacity 0.15s',
            }}>
              <Box sx={{
                position: 'absolute',
                left: `${fx * 100}%`, top: 0, bottom: 0,
                width: 1, bgcolor: 'rgba(255,255,255,0.4)',
              }} />
              <Box sx={{
                position: 'absolute',
                top: `${fy * 100}%`, left: 0, right: 0,
                height: 1, bgcolor: 'rgba(255,255,255,0.4)',
              }} />
            </Box>

            {/* Focal dot */}
            <Box sx={{
              position: 'absolute',
              left: `${fx * 100}%`,
              top: `${fy * 100}%`,
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              zIndex: 3,
            }}>
              {/* Pulse ring on first appearance */}
              {focalHint && (
                <Box sx={{
                  position: 'absolute',
                  inset: -8,
                  borderRadius: '50%',
                  border: '2px solid rgba(26,92,40,0.5)',
                  animation: 'focalPulse 1.5s ease-out 2',
                  '@keyframes focalPulse': {
                    '0%': { transform: 'scale(1)', opacity: 1 },
                    '100%': { transform: 'scale(2.2)', opacity: 0 },
                  },
                }} />
              )}
              <Box sx={{
                width: 22, height: 22, borderRadius: '50%',
                bgcolor: '#1a5c28',
                border: '2.5px solid white',
                boxShadow: '0 1px 6px rgba(0,0,0,0.5)',
                transition: 'left 0.08s, top 0.08s',
              }} />
            </Box>
          </Box>

          {/* Focal position readout */}
          <Box sx={{
            position: 'absolute', bottom: 8, right: 10,
            bgcolor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
            px: 1, py: 0.25, borderRadius: 1,
          }}>
            <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', fontFamily: 'monospace' }}>
              {Math.round(fx * 100)}% · {Math.round(fy * 100)}%
            </Typography>
          </Box>
        </Box>

        {/* ── Live crop previews ── */}
        <Box sx={{ bgcolor: '#F8FAFC', borderTop: '1px solid', borderColor: 'divider', p: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Kullanım önizlemeleri
            </Typography>
            <Chip label="Odak noktasına göre güncellenir" size="small"
              sx={{ height: 18, fontSize: 9, fontWeight: 600, bgcolor: alpha('#1a5c28', 0.08), color: '#1a5c28' }} />
          </Stack>

          <Stack direction="row" spacing={1.5} sx={{ overflowX: 'auto', pb: 0.5 }}>
            {PREVIEWS.map(({ kind, label, ratio, w, h, desc }) => (
              <Box key={kind} sx={{ flexShrink: 0, textAlign: 'center' }}>
                <Box sx={{
                  width: kind === 'mobileHero' ? 80 : kind === 'desktopHero' ? 160 : 108,
                  aspectRatio: ratio,
                  overflow: 'hidden',
                  borderRadius: 1.5,
                  border: '1.5px solid',
                  borderColor: 'divider',
                  position: 'relative',
                  bgcolor: 'background.paper',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
                }}>
                  <Box
                    component="img"
                    src={value.originalUrl}
                    draggable={false}
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      objectPosition: `${Math.round(fx * 100)}% ${Math.round(fy * 100)}%`,
                      pointerEvents: 'none',
                    }}
                  />
                </Box>
                <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'text.primary', mt: 0.5, display: 'block' }}>
                  {label}
                </Typography>
                <Typography sx={{ fontSize: 9, color: 'text.disabled', display: 'block' }}>
                  {w}:{h} · {desc}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>

        {/* ── Alt text ── */}
        <Box sx={{ borderTop: '1px solid', borderColor: 'divider', px: 2, py: 1.5 }}>
          <TextField
            fullWidth
            size="small"
            value={value.alt ?? ''}
            onChange={(e) => onChange({ ...value, alt: e.target.value })}
            placeholder="Görsel açıklaması (erişilebilirlik ve SEO için önerilir)"
            label="Alt metin"
            InputProps={{ sx: { fontSize: 13, borderRadius: 1.5 } }}
            InputLabelProps={{ sx: { fontSize: 13 } }}
          />
        </Box>

      </Box>
    </>
  );
}
