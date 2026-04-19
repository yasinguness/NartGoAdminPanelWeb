import { Paper, Typography, Box } from '@mui/material';
import { EventResponseDTO } from '../../../types/events/eventModel';
import CheckInStaffPanel from '../../Events/components/CheckInStaffPanel';

export default function StaffSection({ event }: { event: EventResponseDTO }) {
  return (
    <Box>
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, mb: 2 }}>
        <Typography variant="caption" sx={{ letterSpacing: 1.5, fontSize: 10, fontWeight: 700, color: 'text.secondary' }}>
          KAPI GÖREVLİLERİ
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Etkinlik günü kapıda check-in yapacak kişileri yönet. Sadece atanan görevliler QR tarayabilir ve giriş kaydı oluşturabilir.
        </Typography>
      </Paper>

      <CheckInStaffPanel eventId={event.id} />
    </Box>
  );
}
