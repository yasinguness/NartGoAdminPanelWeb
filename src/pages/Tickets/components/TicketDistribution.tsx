/**
 * TicketDistribution — Bilet dağılım kartı (bölge/tip bazında)
 */
import { Box, Typography, Paper, Stack, Chip, alpha, useTheme } from '@mui/material';
import { TicketStatus } from '../../../types/tickets/ticketTypes';
import type { TicketListItem } from '../../../types/tickets/ticketManagementTypes';

interface Props {
  tickets: TicketListItem[];
  totalCount: number;
}

const cardSx = {
  bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider',
  borderRadius: 3, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
};

export default function TicketDistribution({ tickets, totalCount }: Props) {
  const theme = useTheme();

  if (tickets.length === 0) return null;

  const byType: Record<string, { count: number; active: number; used: number; cancelled: number }> = {};
  tickets.forEach(t => {
    const key = t.seatInfo?.sectionName || t.ticketTypeName || 'Genel';
    if (!byType[key]) byType[key] = { count: 0, active: 0, used: 0, cancelled: 0 };
    byType[key].count++;
    if (t.status === TicketStatus.ACTIVE) byType[key].active++;
    if (t.status === TicketStatus.CHECKED_IN || t.status === TicketStatus.USED) byType[key].used++;
    if (t.status === TicketStatus.CANCELLED || t.status === TicketStatus.REFUNDED) byType[key].cancelled++;
  });

  return (
    <Paper sx={{ ...cardSx, p: 2.5, mb: 3 }}>
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>Bilet Dağılımı</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 1.5 }}>
        {Object.entries(byType).map(([name, data]) => {
          const pct = totalCount > 0 ? Math.round((data.count / totalCount) * 100) : 0;
          return (
            <Box key={name} sx={{ p: 1.5, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="body2" fontWeight={700}>{name}</Typography>
                <Chip label={`${data.count} bilet`} size="small" sx={{ height: 20, fontSize: 10, fontWeight: 600 }} />
              </Stack>
              <Box sx={{ height: 6, borderRadius: 3, bgcolor: alpha(theme.palette.divider, 0.3), overflow: 'hidden', mb: 1 }}>
                <Box sx={{ height: '100%', borderRadius: 3, width: `${pct}%`, bgcolor: theme.palette.primary.main, transition: 'width 0.3s' }} />
              </Box>
              <Stack direction="row" spacing={1}>
                <Typography variant="caption" sx={{ color: theme.palette.success.main, fontWeight: 600 }}>● {data.active} aktif</Typography>
                <Typography variant="caption" sx={{ color: theme.palette.info.main, fontWeight: 600 }}>● {data.used} kullanıldı</Typography>
                {data.cancelled > 0 && <Typography variant="caption" sx={{ color: theme.palette.error.main, fontWeight: 600 }}>● {data.cancelled} iptal</Typography>}
              </Stack>
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
}
