import { useState } from 'react';
import { Paper, Typography, Button, Grid, Box } from '@mui/material';
import { FileDownload as ExportIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { api } from '../../../services/api';
import { EventResponseDTO } from '../../../types/events/eventModel';

interface Props { event: EventResponseDTO; }

const EXPORTS: { key: string; label: string; desc: string; endpoint: string; filename: string }[] = [
  { key: 'participants', label: 'Katılımcılar', desc: 'Tüm biletler, kullanıcı e-posta, koltuk bilgisi',
    endpoint: 'participants', filename: 'katilimcilar' },
  { key: 'orders', label: 'Siparişler', desc: 'Sipariş detayları, ödeme durumu, tutarlar',
    endpoint: 'orders', filename: 'siparisler' },
  { key: 'checkins', label: 'Check-in Kayıtları', desc: 'Kim, ne zaman, hangi görevli tarafından giriş yaptı',
    endpoint: 'checkins', filename: 'check_in' },
  { key: 'sales', label: 'Satış Raporu', desc: 'Günlük satış ve gelir verileri',
    endpoint: 'sales', filename: 'satis_raporu' },
  { key: 'seats', label: 'Koltuk Durumu', desc: 'Satılan, boş, bloklu koltuklar snapshot',
    endpoint: 'seats', filename: 'koltuk_durumu' },
];

export default function ExportSection({ event }: Props) {
  const { enqueueSnackbar } = useSnackbar();
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleExport = async (type: string, label: string, endpoint: string, filename: string) => {
    setDownloading(type);
    try {
      const response = await api.get(`/tickets/admin/events/${event.id}/export/${endpoint}`, {
        responseType: 'blob',
      });

      // Dosya adı ve tarih
      const date = new Date().toISOString().split('T')[0];
      const finalName = `${filename}_${event.id.slice(0, 8)}_${date}.csv`;

      // Blob'u indir
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = finalName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      enqueueSnackbar(`${label} indirildi`, { variant: 'success' });
    } catch (e: any) {
      const msg = e?.response?.status === 403
        ? 'Bu etkinliğe erişim yetkiniz yok'
        : 'İndirme hatası';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setDownloading(null);
    }
  };

  return (
    <Box>
      <Typography variant="caption" sx={{ letterSpacing: 1.5, fontSize: 10, fontWeight: 700, color: 'text.secondary' }}>
        CSV DIŞA AKTARIM
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>
        Etkinlik verilerini CSV formatında indir. Excel ile uyumlu UTF-8 BOM formatında.
      </Typography>

      <Grid container spacing={2}>
        {EXPORTS.map(ex => (
          <Grid item xs={12} sm={6} md={4} key={ex.key}>
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, height: '100%' }}>
              <Typography variant="subtitle2" fontWeight={700}>{ex.label}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, mb: 2, minHeight: 32 }}>
                {ex.desc}
              </Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<ExportIcon fontSize="small" />}
                onClick={() => handleExport(ex.key, ex.label, ex.endpoint, ex.filename)}
                disabled={downloading === ex.key}
                fullWidth
              >
                {downloading === ex.key ? 'İndiriliyor...' : 'İndir'}
              </Button>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
