import {
  Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody, Box, Skeleton,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import type { TopEvent } from '../../../services/financeOverview/financeOverviewTypes';
import { formatMoneyFull, formatCount } from './formatters';

interface Props {
  rows?: TopEvent[];
  currency?: string;
  loading?: boolean;
}

export default function TopEventsTable({ rows, currency = 'TRY', loading }: Props) {
  const navigate = useNavigate();

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, bgcolor: '#FFFFFF', borderColor: 'rgba(201,162,39,0.12)', overflow: 'hidden' }}>
      <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
        <Typography sx={{ fontSize: 11, letterSpacing: 1.5, fontWeight: 700, color: 'rgba(30,41,59,0.60)', textTransform: 'uppercase' }}>
          En Çok Kazandıran Etkinlikler
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ p: 2 }}>
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} variant="rectangular" height={36} sx={{ bgcolor: 'rgba(0,0,0,0.03)', mb: 1, borderRadius: 0.5 }} />
          ))}
        </Box>
      ) : !rows || rows.length === 0 ? (
        <Box sx={{ py: 5, textAlign: 'center' }}>
          <Typography sx={{ fontSize: 12, color: 'rgba(30,41,59,0.45)', fontStyle: 'normal' }}>
            Bu dönemde gelir üreten etkinlik yok
          </Typography>
        </Box>
      ) : (
        <Table size="small" sx={{
          '& .MuiTableCell-root': { borderBottomColor: 'rgba(0,0,0,0.05)', color: '#1E293B' },
        }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, color: 'rgba(30,41,59,0.55) !important', textTransform: 'uppercase' }}>#</TableCell>
              <TableCell sx={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, color: 'rgba(30,41,59,0.55) !important', textTransform: 'uppercase' }}>Etkinlik</TableCell>
              <TableCell align="right" sx={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, color: 'rgba(30,41,59,0.55) !important', textTransform: 'uppercase' }}>Sipariş</TableCell>
              <TableCell align="right" sx={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, color: 'rgba(30,41,59,0.55) !important', textTransform: 'uppercase' }}>Brüt</TableCell>
              <TableCell align="right" sx={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, color: 'rgba(30,41,59,0.55) !important', textTransform: 'uppercase' }}>Net</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r, idx) => (
              <TableRow
                key={r.eventId || idx}
                hover
                onClick={() => r.eventId && navigate(`/event-console/${r.eventId}`)}
                sx={{
                  cursor: r.eventId ? 'pointer' : 'default',
                  '&:hover': { bgcolor: 'rgba(201,162,39,0.05) !important' },
                }}
              >
                <TableCell sx={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(30,41,59,0.55)' }}>
                  {idx + 1}
                </TableCell>
                <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>
                  {r.eventName || (r.eventId ? `${r.eventId.slice(0, 8)}…` : '—')}
                </TableCell>
                <TableCell align="right" sx={{ fontSize: 12, fontFamily: 'monospace' }}>
                  {formatCount(r.orderCount)}
                </TableCell>
                <TableCell align="right" sx={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: '#22c55e' }}>
                  {formatMoneyFull(r.grossAmount, currency)}
                </TableCell>
                <TableCell align="right" sx={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: '#C9A227' }}>
                  {formatMoneyFull(r.netAmount, currency)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Paper>
  );
}
