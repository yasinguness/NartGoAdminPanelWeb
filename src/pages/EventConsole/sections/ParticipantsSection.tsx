import { useState, useEffect } from 'react';
import { Paper, Typography, Stack, Avatar, Chip, Box } from '@mui/material';
import { PeopleOutlined as PeopleIcon } from '@mui/icons-material';
import { EventResponseDTO } from '../../../types/events/eventModel';
import { eventService } from '../../../services/event/eventService';
import { SectionEmpty, SectionListSkeleton } from './_shared';

export default function ParticipantsSection({ event }: { event: EventResponseDTO }) {
  const [participants, setParticipants] = useState<any[]>(event.participants || []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Event detay zaten participants döndürüyor, ama refresh gerekebilir
    if (!event.participants || event.participants.length === 0) {
      setLoading(true);
      eventService.getEventById(event.id)
        .then(res => {
          if (res.success && res.data?.participants) setParticipants(res.data.participants);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [event.id]);

  if (loading) return <SectionListSkeleton rows={6} />;

  if (!participants || participants.length === 0) {
    return (
      <SectionEmpty
        icon={<PeopleIcon sx={{ fontSize: 40 }} />}
        title="Henüz katılımcı yok"
        message="İlk bilet alındığında burada görünecek"
      />
    );
  }

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
      <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="caption" sx={{ letterSpacing: 1.5, fontSize: 10, fontWeight: 700, color: 'text.secondary' }}>
          KATILIMCILAR
        </Typography>
        <Chip label={`${participants.length} kişi`} size="small" />
      </Box>

      <Stack divider={<Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }} />}>
        {participants.map((p: any) => (
          <Stack key={p.id} direction="row" spacing={2} alignItems="center" sx={{ px: 3, py: 1.5 }}>
            <Avatar src={p.userImage} sx={{ width: 36, height: 36 }}>{(p.userName || '?')[0]}</Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" fontWeight={600}>{p.userName || 'Anonim'}</Typography>
              {p.ticketCode && (
                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: 10 }}>
                  {p.ticketCode}
                </Typography>
              )}
            </Box>
            {p.status && <Chip label={p.status} size="small" variant="outlined" />}
          </Stack>
        ))}
      </Stack>
    </Paper>
  );
}
