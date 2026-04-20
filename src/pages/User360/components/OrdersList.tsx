import {
  Paper, Box, Typography, Stack, Chip, Skeleton,
  Table, TableHead, TableRow, TableCell, TableBody,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import type { OrderSummary } from '../../../services/user360/user360Types';
import { formatMoney, safeDate } from './helpers';

interface Props {
  rows?: OrderSummary[];
  currency?: string;
  loading?: boolean;
}

const STATUS_COLORS: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  PAID: 'success',
  COMPLETED: 'success',
  PENDING: 'warning',
  CHECKOUT_CREATED: 'warning',
  CANCELLED: 'default',
  REFUNDED: 'error',
  PAYMENT_FAILED: 'error',
  EXPIRED: 'default',
};

const STATUS_LABEL: Record<string, string> = {
  PAID: 'Ödendi',
  COMPLETED: 'Tamamlandı',
  PENDING: 'Beklemede',
  CHECKOUT_CREATED: 'Ödemede',
  CANCELLED: 'İptal',
  REFUNDED: 'İade',
  PAYMENT_FAILED: 'Başarısız',
  EXPIRED: 'Süresi Doldu',
};

export default function OrdersList({ rows, currency = 'TRY', loading }: Props) {
  const navigate = useNavigate();

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, bgcolor: '#0A130F', borderColor: 'rgba(201,162,39,0.12)', overflow: 'hidden' }}>
      <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="baseline">
          <Typography sx={{ fontSize: 11, letterSpacing: 1.5, fontWeight: 700, color: 'rgba(243,238,224,0.6)', textTransform: 'uppercase' }}>
            Son Siparişler
          </Typography>
          {rows && rows.length > 0 && (
            <Typography sx={{ fontSize: 10, color: 'rgba(243,238,224,0.4)' }}>
              {rows.length} kayıt
            </Typography>
          )}
        </Stack>
      </Box>

      {loading ? (
        <Box sx={{ p: 2 }}>
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} variant="rectangular" height={36} sx={{ bgcolor: 'rgba(255,255,255,0.04)', mb: 1, borderRadius: 0.5 }} />
          ))}
        </Box>
      ) : !rows || rows.length === 0 ? (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography sx={{ fontSize: 12, color: 'rgba(243,238,224,0.4)', fontStyle: 'italic' }}>
            Sipariş geçmişi yok
          </Typography>
        </Box>
      ) : (
        <Table size="small" sx={{
          '& .MuiTableCell-root': { borderBottomColor: 'rgba(255,255,255,0.05)', color: '#F3EEE0' },
        }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, color: 'rgba(243,238,224,0.5) !important', textTransform: 'uppercase' }}>Tarih</TableCell>
              <TableCell sx={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, color: 'rgba(243,238,224,0.5) !important', textTransform: 'uppercase' }}>Etkinlik</TableCell>
              <TableCell align="center" sx={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, color: 'rgba(243,238,224,0.5) !important', textTransform: 'uppercase' }}>Durum</TableCell>
              <TableCell align="right" sx={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, color: 'rgba(243,238,224,0.5) !important', textTransform: 'uppercase' }}>Tutar</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(o => (
              <TableRow
                key={o.id}
                hover
                onClick={() => o.eventId && navigate(`/event-console/${o.eventId}`)}
                sx={{
                  cursor: o.eventId ? 'pointer' : 'default',
                  '&:hover': { bgcolor: 'rgba(201,162,39,0.05) !important' },
                }}
              >
                <TableCell sx={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(243,238,224,0.7)' }}>
                  {safeDate(o.createdAt)}
                </TableCell>
                <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>
                  {o.eventName || (o.eventId ? `${o.eventId.slice(0, 8)}…` : (o.orderReference || '—'))}
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={STATUS_LABEL[o.status] || o.status}
                    size="small"
                    color={STATUS_COLORS[o.status] || 'default'}
                    sx={{ fontSize: 9, fontWeight: 700, height: 20 }}
                  />
                </TableCell>
                <TableCell align="right" sx={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700 }}>
                  {formatMoney(o.totalAmount, o.currency || currency)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Paper>
  );
}
