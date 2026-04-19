import { Box, Paper, Typography, Button, Stack } from '@mui/material';
import { OpenInNew as OpenIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { EventResponseDTO } from '../../../types/events/eventModel';

export default function SeatMapSection({ event }: { event: EventResponseDTO }) {
  const navigate = useNavigate();
  return (
    <Paper variant="outlined" sx={{ p: 4, borderRadius: 2, textAlign: 'center' }}>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>Canlı Koltuk Haritası</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Tam ekran koltuk haritası ve satış durumu
      </Typography>
      <Stack direction="row" spacing={2} justifyContent="center">
        <Button
          variant="contained"
          startIcon={<OpenIcon />}
          onClick={() => navigate(`/events/${event.id}/seat-map`)}
        >
          Canlı Haritayı Aç
        </Button>
        <Button
          variant="outlined"
          onClick={() => navigate(`/event-operations/${event.id}`)}
        >
          Koltuk Yönetimi
        </Button>
      </Stack>
    </Paper>
  );
}
