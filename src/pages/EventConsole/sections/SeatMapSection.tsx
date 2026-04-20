import { useState } from 'react';
import { Box, Paper, Typography, Button, Stack, Alert, CircularProgress } from '@mui/material';
import { OpenInFull as FullscreenIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { EventResponseDTO } from '../../../types/events/eventModel';

export default function SeatMapSection({ event }: { event: EventResponseDTO }) {
  const navigate = useNavigate();
  const [iframeKey, setIframeKey] = useState(0);
  const [iframeLoading, setIframeLoading] = useState(true);

  const seatingEnabled = Boolean((event as any)?.seatingConfig?.enabled) || (event as any)?.seatingEnabled !== false;

  // SeatMap iframe URL — Layout'suz standalone route, EventConsole sidebar korunur
  const seatMapUrl = `/admin/events/${event.id}/seat-map/embed`;
  // Tam ekran için normal Layout'lu route (geri dönüş için)
  const seatMapFullUrl = `/admin/events/${event.id}/seat-map`;

  if (!seatingEnabled) {
    return (
      <Alert severity="info" sx={{ borderRadius: 2 }}>
        Bu etkinlik için koltuk düzeni tanımlanmamış. Koltuk haritası özelliği, kapasiteli etkinliklerde <strong>Salon Planı</strong> atandığında aktif olur.
        <Button size="small" sx={{ mt: 1 }} onClick={() => navigate('/seat-templates')}>
          Salon Planı Yönet →
        </Button>
      </Alert>
    );
  }

  return (
    <Stack spacing={2} sx={{ height: 'calc(100vh - 160px)', minHeight: 600 }}>
      {/* Üst action bar — kompakt */}
      <Paper variant="outlined" sx={{ px: 2, py: 1, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" sx={{ fontSize: 10, letterSpacing: 1.5, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>
            Canlı Koltuk Düzeni
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: 11 }}>
            Koltukları yönet · satış durumunu izle · manuel satış + blok işlemleri
          </Typography>
        </Box>
        <Button
          size="small" variant="outlined" startIcon={<RefreshIcon sx={{ fontSize: 16 }} />}
          onClick={() => { setIframeLoading(true); setIframeKey(k => k + 1); }}
        >
          Yenile
        </Button>
        <Button
          size="small" variant="outlined" startIcon={<FullscreenIcon sx={{ fontSize: 16 }} />}
          onClick={() => window.open(seatMapFullUrl, '_blank', 'noopener,noreferrer')}
        >
          Tam Ekran
        </Button>
      </Paper>

      {/* Inline iframe — harita burada açılır, sidebar EventConsole'da kalır */}
      <Paper variant="outlined" sx={{ flex: 1, borderRadius: 2, overflow: 'hidden', position: 'relative', bgcolor: 'background.default' }}>
        {iframeLoading && (
          <Box sx={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: 'background.paper', zIndex: 1,
          }}>
            <Stack spacing={1.5} alignItems="center">
              <CircularProgress size={32} />
              <Typography variant="caption" color="text.secondary">Koltuk haritası yükleniyor…</Typography>
            </Stack>
          </Box>
        )}
        <Box
          component="iframe"
          key={iframeKey}
          src={seatMapUrl}
          onLoad={() => setIframeLoading(false)}
          sx={{
            width: '100%', height: '100%',
            border: 'none', display: 'block',
          }}
          title="Koltuk Haritası"
        />
      </Paper>
    </Stack>
  );
}
