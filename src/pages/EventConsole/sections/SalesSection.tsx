import { Box, Paper, Typography, Button, Stack, Grid, alpha, useTheme } from '@mui/material';
import { OpenInNew as OpenIcon, TrendingUp as SalesIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { EventResponseDTO } from '../../../types/events/eventModel';

export default function SalesSection({ event }: { event: EventResponseDTO }) {
  const theme = useTheme();
  const navigate = useNavigate();
  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="caption" sx={{ letterSpacing: 1.5, fontSize: 10, fontWeight: 700, color: 'text.secondary' }}>
          SATIŞ RAPORU
        </Typography>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {[
            { label: 'Toplam Satış', value: event.currentParticipants || 0 },
            { label: 'Toplam Gelir', value: `${((event.currentParticipants || 0) * (event.ticketPrice || 0)).toLocaleString('tr-TR')} ₺` },
            { label: 'Ort. Bilet', value: `${(event.ticketPrice || 0).toLocaleString('tr-TR')} ₺` },
            { label: 'Doluluk', value: `%${event.maxParticipants ? Math.round(((event.currentParticipants || 0) / event.maxParticipants) * 100) : 0}` },
          ].map(s => (
            <Grid item xs={6} sm={3} key={s.label}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>{s.label}</Typography>
              <Typography variant="h6" fontWeight={700} sx={{ fontFamily: 'serif', fontStyle: 'italic' }}>
                {s.value}
              </Typography>
            </Grid>
          ))}
        </Grid>
      </Paper>

      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.03) }}>
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="subtitle2" fontWeight={700}>Detaylı Satış Paneli</Typography>
            <Typography variant="body2" color="text.secondary">
              Satış komuta merkezinde siparişleri, iade taleplerini, indirim kodlarını yönet
            </Typography>
          </Box>
          <Button variant="outlined" startIcon={<OpenIcon />} onClick={() => navigate('/sales-command')}>
            Aç
          </Button>
        </Stack>
      </Paper>
    </Stack>
  );
}
