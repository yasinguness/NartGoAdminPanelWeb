import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  Stack,
  Typography,
} from '@mui/material';

type AspectPreset = 'original' | '16:9' | '4:3' | '1:1';

interface OptionalImageCropDialogProps {
  open: boolean;
  file: File | null;
  title?: string;
  onCancel: () => void;
  onUseOriginal: (file: File) => void;
  onConfirmCrop: (file: File) => void;
}

const PREVIEW_WIDTH = 420;
const PREVIEW_HEIGHT = 260;

function getImageSize(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error('image-load-failed'));
    image.src = src;
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('image-load-failed'));
    image.src = src;
  });
}

function getAspectRatio(preset: AspectPreset, width: number, height: number) {
  switch (preset) {
    case '16:9':
      return 16 / 9;
    case '4:3':
      return 4 / 3;
    case '1:1':
      return 1;
    case 'original':
    default:
      return width / height;
  }
}

function getCropRect(
  width: number,
  height: number,
  preset: AspectPreset,
  zoom: number,
  offsetX: number,
  offsetY: number,
) {
  const aspectRatio = getAspectRatio(preset, width, height);
  let baseWidth = width;
  let baseHeight = width / aspectRatio;

  if (baseHeight > height) {
    baseHeight = height;
    baseWidth = height * aspectRatio;
  }

  const cropWidth = baseWidth / zoom;
  const cropHeight = baseHeight / zoom;
  const maxOffsetX = Math.max(0, (width - cropWidth) / 2);
  const maxOffsetY = Math.max(0, (height - cropHeight) / 2);
  const centerX = width / 2;
  const centerY = height / 2;
  const appliedOffsetX = (offsetX / 100) * maxOffsetX;
  const appliedOffsetY = (offsetY / 100) * maxOffsetY;

  return {
    x: Math.min(width - cropWidth, Math.max(0, centerX - cropWidth / 2 + appliedOffsetX)),
    y: Math.min(height - cropHeight, Math.max(0, centerY - cropHeight / 2 + appliedOffsetY)),
    width: cropWidth,
    height: cropHeight,
  };
}

async function buildCroppedFile(
  file: File,
  imageUrl: string,
  preset: AspectPreset,
  zoom: number,
  offsetX: number,
  offsetY: number,
) {
  const image = await loadImage(imageUrl);
  const cropRect = getCropRect(image.naturalWidth, image.naturalHeight, preset, zoom, offsetX, offsetY);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(cropRect.width);
  canvas.height = Math.round(cropRect.height);

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('canvas-context-unavailable');
  }

  context.drawImage(
    image,
    cropRect.x,
    cropRect.y,
    cropRect.width,
    cropRect.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  const fileType = file.type || 'image/jpeg';
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, fileType, fileType === 'image/png' ? undefined : 0.92);
  });

  if (!blob) {
    throw new Error('crop-export-failed');
  }

  return new File([blob], file.name, { type: blob.type || fileType, lastModified: Date.now() });
}

export default function OptionalImageCropDialog({
  open,
  file,
  title = 'Görseli düzenle',
  onCancel,
  onUseOriginal,
  onConfirmCrop,
}: OptionalImageCropDialogProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [aspectPreset, setAspectPreset] = useState<AspectPreset>('16:9');
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [croppedPreviewUrl, setCroppedPreviewUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!file || !open) {
      setPreviewUrl(null);
      setImageSize(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setAspectPreset('16:9');
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);

    getImageSize(objectUrl)
      .then(setImageSize)
      .catch(() => setImageSize(null));

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file, open]);

  const cropRect = useMemo(() => {
    if (!imageSize) return null;
    return getCropRect(imageSize.width, imageSize.height, aspectPreset, zoom, offsetX, offsetY);
  }, [aspectPreset, imageSize, offsetX, offsetY, zoom]);

  useEffect(() => {
    let active = true;
    let nextPreviewUrl: string | null = null;

    if (!file || !previewUrl || !cropRect || !open) {
      setCroppedPreviewUrl(null);
      return () => undefined;
    }

    buildCroppedFile(file, previewUrl, aspectPreset, zoom, offsetX, offsetY)
      .then((croppedFile) => {
        if (!active) return;
        nextPreviewUrl = URL.createObjectURL(croppedFile);
        setCroppedPreviewUrl(nextPreviewUrl);
      })
      .catch(() => {
        if (active) setCroppedPreviewUrl(null);
      });

    return () => {
      active = false;
      if (nextPreviewUrl) URL.revokeObjectURL(nextPreviewUrl);
    };
  }, [aspectPreset, cropRect, file, offsetX, offsetY, open, previewUrl, zoom]);

  const handleConfirmCrop = async () => {
    if (!file || !previewUrl) return;
    try {
      setProcessing(true);
      const croppedFile = await buildCroppedFile(file, previewUrl, aspectPreset, zoom, offsetX, offsetY);
      onConfirmCrop(croppedFile);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onClose={processing ? undefined : onCancel} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>{title}</DialogTitle>
      <DialogContent dividers sx={{ px: { xs: 2, md: 3 }, py: 3 }}>
        <Stack spacing={3}>
          <Typography variant="body2" color="text.secondary">
            Görseli olduğu gibi kullanabilir veya isteğe bağlı olarak kırpıp devam edebilirsiniz.
          </Typography>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="flex-start">
            <Box sx={{ flex: 1, width: '100%' }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block', fontWeight: 700 }}>
                Kırpılmış önizleme
              </Typography>
              <Box
                sx={{
                  width: '100%',
                  minHeight: PREVIEW_HEIGHT,
                  maxWidth: PREVIEW_WIDTH,
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: '#F8FAFC',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {croppedPreviewUrl ? (
                  <Box component="img" src={croppedPreviewUrl} alt="Crop preview" sx={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
                ) : (
                  <Typography variant="caption" color="text.disabled">Önizleme hazırlanıyor...</Typography>
                )}
              </Box>
            </Box>

            <Stack spacing={2.5} sx={{ width: '100%', maxWidth: 320 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Oran</InputLabel>
                <Select
                  label="Oran"
                  value={aspectPreset}
                  onChange={(event) => setAspectPreset(event.target.value as AspectPreset)}
                >
                  <MenuItem value="original">Orijinal</MenuItem>
                  <MenuItem value="16:9">16:9</MenuItem>
                  <MenuItem value="4:3">4:3</MenuItem>
                  <MenuItem value="1:1">1:1</MenuItem>
                </Select>
              </FormControl>

              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  Zoom
                </Typography>
                <Slider value={zoom} min={1} max={3} step={0.05} onChange={(_, value) => setZoom(value as number)} />
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  Yatay konum
                </Typography>
                <Slider value={offsetX} min={-100} max={100} step={1} onChange={(_, value) => setOffsetX(value as number)} />
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  Dikey konum
                </Typography>
                <Slider value={offsetY} min={-100} max={100} step={1} onChange={(_, value) => setOffsetY(value as number)} />
              </Box>

              {imageSize && cropRect && (
                <Typography variant="caption" color="text.secondary">
                  Kaynak: {imageSize.width} x {imageSize.height}px
                  <br />
                  Kırpım: {Math.round(cropRect.width)} x {Math.round(cropRect.height)}px
                </Typography>
              )}
            </Stack>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onCancel} disabled={processing} sx={{ textTransform: 'none', fontWeight: 600 }}>
          İptal
        </Button>
        <Button onClick={() => file && onUseOriginal(file)} disabled={!file || processing} variant="outlined" sx={{ textTransform: 'none', fontWeight: 700 }}>
          Orijinal ile devam
        </Button>
        <Button onClick={handleConfirmCrop} disabled={!file || processing} variant="contained" sx={{ textTransform: 'none', fontWeight: 700 }}>
          Kırp ve devam et
        </Button>
      </DialogActions>
    </Dialog>
  );
}
