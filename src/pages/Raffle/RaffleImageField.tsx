import { useRef, useState } from 'react';
import { Box, Button, CircularProgress, IconButton, Stack, TextField, Tooltip, Typography } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloseIcon from '@mui/icons-material/Close';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import { useSnackbar } from 'notistack';
import { api } from '../../services/api';
import { buildUploadPath } from '../Content/contentEditorUtils';

const ACCEPT = 'image/jpeg,image/png,image/webp';

/**
 * Görsel alanı: önizleme + "Yükle" (medya servisine) ya da adres yapıştır.
 * Çekiliş formundaki kapak, hediye ve açılış penceresi görselleri bunu
 * kullanır; eskiden yalnız URL kutusu vardı ve görsel görünmüyordu.
 */
export default function RaffleImageField({
  label,
  value,
  onChange,
  helperText,
  pathPrefix = 'raffles',
  compact = false,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  helperText?: string;
  pathPrefix?: string;
  /** Hediye satırı: küçük önizleme, adres kutusu yok. */
  compact?: boolean;
  disabled?: boolean;
}) {
  const { enqueueSnackbar } = useSnackbar();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [broken, setBroken] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('path', buildUploadPath(pathPrefix, file));
      const res = await api.post('/media/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const data = res.data?.data;
      const url = data?.cdnUrl || data?.originalUrl || data?.url || data?.mediaUrl;
      if (!url) throw new Error('missing url');
      setBroken(false);
      onChange(url);
    } catch {
      enqueueSnackbar('Görsel yüklenemedi. JPG, PNG ya da WebP dene.', { variant: 'error' });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const size = compact ? 56 : 96;
  const preview = (
    <Box
      sx={{
        width: size,
        height: size,
        flex: 'none',
        borderRadius: 1.5,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'action.hover',
        overflow: 'hidden',
        display: 'grid',
        placeItems: 'center',
        position: 'relative',
      }}
    >
      {uploading ? (
        <CircularProgress size={20} />
      ) : value && !broken ? (
        <Box component="img" src={value} alt="" onError={() => setBroken(true)}
          sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <ImageOutlinedIcon color={broken ? 'error' : 'disabled'} />
      )}
      {value && !disabled && !uploading && (
        <IconButton size="small" aria-label="Görseli kaldır" onClick={() => { setBroken(false); onChange(''); }}
          sx={{ position: 'absolute', top: 2, right: 2, bgcolor: 'background.paper', p: 0.25,
            '&:hover': { bgcolor: 'background.paper' } }}>
          <CloseIcon sx={{ fontSize: 14 }} />
        </IconButton>
      )}
    </Box>
  );

  const fileInput = (
    <input ref={inputRef} type="file" accept={ACCEPT} hidden
      onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
  );

  if (compact) {
    return (
      <Tooltip title={value ? 'Görseli değiştir' : `${label} yükle`}>
        <Box component="span" sx={{ cursor: disabled ? 'default' : 'pointer' }}
          onClick={() => !disabled && !uploading && inputRef.current?.click()}>
          {preview}
          {fileInput}
        </Box>
      </Tooltip>
    );
  }

  return (
    <Stack direction="row" spacing={2} alignItems="flex-start">
      {preview}
      <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body2" fontWeight={600}>{label}</Typography>
          <Button size="small" variant="outlined" startIcon={<CloudUploadIcon />} disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()}>
            {value ? 'Değiştir' : 'Yükle'}
          </Button>
        </Stack>
        <TextField size="small" fullWidth placeholder="ya da görsel adresini yapıştır" value={value} disabled={disabled}
          error={broken}
          helperText={broken ? 'Bu adresteki görsel açılmıyor.' : helperText}
          onChange={(e) => { setBroken(false); onChange(e.target.value); }} />
      </Stack>
      {fileInput}
    </Stack>
  );
}
