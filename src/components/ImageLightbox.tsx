import { useEffect, useState } from 'react';
import { Box, Dialog, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

/**
 * Görsel büyütme penceresi.
 *
 * Detay sayfalarındaki küçük profil fotoğrafları tek başına işe yaramıyordu:
 * 112 pikselde yüzün seçilip seçilmediği, fotoğrafın uygun olup olmadığı
 * anlaşılmıyor — oysa yönetici tam da buna bakıyor. Tıklanınca görsel kendi
 * boyutunda açılıyor.
 *
 * Esc ve dışına tıklama kapatır (MUI Dialog'un kendi davranışı). Görsel
 * yüklenemezse pencere boş bir kutu göstermek yerine bunu söyler.
 */
export default function ImageLightbox({ src, alt, open, onClose }: {
  src?: string | null;
  alt?: string;
  open: boolean;
  onClose: () => void;
}) {
  const [failed, setFailed] = useState(false);

  // Her açılışta hata durumunu sıfırla; aynı pencere başka görselle açılabilir.
  useEffect(() => { if (open) setFailed(false); }, [open, src]);

  if (!src) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      aria-label={alt || 'Görsel önizleme'}
      PaperProps={{
        sx: {
          bgcolor: 'transparent', boxShadow: 'none', overflow: 'visible',
          m: 2, maxWidth: '92vw', maxHeight: '92vh',
        },
      }}
      slotProps={{ backdrop: { sx: { bgcolor: 'rgba(0,0,0,0.82)' } } }}
    >
      <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
        <IconButton
          onClick={onClose}
          aria-label="Kapat"
          sx={{
            position: 'absolute', top: -8, right: -8, zIndex: 1,
            bgcolor: 'rgba(0,0,0,0.6)', color: '#fff',
            '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
          }}
        >
          <CloseIcon />
        </IconButton>

        {failed ? (
          <Box sx={{ px: 4, py: 6, borderRadius: 2, bgcolor: 'background.paper', textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">Görsel yüklenemedi.</Typography>
          </Box>
        ) : (
          <Box
            component="img"
            src={src}
            alt={alt || ''}
            onError={() => setFailed(true)}
            sx={{
              display: 'block',
              maxWidth: '92vw', maxHeight: '84vh',
              // Küçük bir görsel kendi boyutunda açılırsa pencere boş görünür
              // ve "hiçbir şey olmadı" hissi verir. Taban boyut, düşük
              // çözünürlüklü profil fotoğraflarının da görülebilmesi için.
              minWidth: 240, minHeight: 240,
              objectFit: 'contain', borderRadius: 2, bgcolor: '#000',
            }}
          />
        )}

        <Box
          component="a"
          href={src}
          target="_blank"
          rel="noreferrer"
          sx={{
            display: 'inline-flex', alignItems: 'center', gap: 0.75,
            color: 'rgba(255,255,255,0.85)', fontSize: 13, textDecoration: 'none',
            '&:hover': { color: '#fff', textDecoration: 'underline' },
          }}
        >
          Yeni sekmede aç <OpenInNewIcon sx={{ fontSize: 14 }} />
        </Box>
      </Box>
    </Dialog>
  );
}
