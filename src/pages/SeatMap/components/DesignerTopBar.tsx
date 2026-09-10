import { Box, Typography, Button, Chip, Stack, alpha, CircularProgress } from '@mui/material';
import { ArrowBack as BackIcon } from '@mui/icons-material';
import type { EventSummary } from './EventPicker';

interface Props {
  event: EventSummary;
  mode: 'edit' | 'preview';
  totalSeats: number;
  saving: boolean;
  publishing: boolean;
  onBack: () => void;
  onOpenDrawer: () => void;
  onSwitchMode: (m: 'edit' | 'preview') => void;
  onSave: () => void;
  onPublish: () => void;
}

export default function DesignerTopBar({ event, totalSeats, saving, publishing, onBack, onSave, onPublish }: Props) {
  return (
    <Box sx={{
      height: 52,
      display: 'flex',
      alignItems: 'center',
      px: 2,
      borderBottom: '1px solid',
      borderColor: 'divider',
      bgcolor: 'background.paper',
      gap: 2,
      flexShrink: 0
    }}>
      {/* Sol: Geri Butonu + Başlık + Taslak Badge */}
      <Stack direction="row" alignItems="center" spacing={1}>
        <Button size="small" onClick={onBack} startIcon={<BackIcon sx={{ fontSize: 16 }} />} sx={{ color: 'text.secondary', textTransform: 'none', minWidth: 0, px: 1 }}>
          Geri
        </Button>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, ml: 1 }}>
          {event.name} — Salon Planı
        </Typography>
        <Chip label="Taslak" size="small" sx={{ height: 20, fontSize: 10, fontWeight: 700, bgcolor: alpha('#10b981', 0.1), color: '#10b981', ml: 1 }} />
      </Stack>

      <Box sx={{ flex: 1 }} />

      {/* Orta: Toplam Koltuk */}
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {totalSeats} koltuk
        </Typography>
      </Box>

      <Box sx={{ flex: 1 }} />

      {/* Sağ: Butonlar */}
      <Stack direction="row" alignItems="center" spacing={1}>
        <Button size="small" variant="outlined" onClick={onSave} disabled={saving} sx={{ textTransform: 'none', borderRadius: 2 }}>
          {saving ? <CircularProgress size={16} sx={{ mr: 1 }} /> : null}
          Kaydet
        </Button>
        <Button size="small" variant="contained" color="success" onClick={onPublish} disabled={publishing || saving} sx={{ textTransform: 'none', borderRadius: 2 }}>
          {publishing ? <CircularProgress size={16} sx={{ mr: 1 }} /> : null}
          Kaydet & Devam →
        </Button>
      </Stack>
    </Box>
  );
}
