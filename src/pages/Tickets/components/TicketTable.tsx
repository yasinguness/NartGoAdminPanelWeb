/**
 * TicketTable — Bilet tablosu + pagination
 */
import {
  Table, TableHead, TableRow, TableCell, TableBody, TablePagination,
  Checkbox, Chip, Typography, Tooltip, IconButton, Skeleton, Box,
} from '@mui/material';
import { QrCode as QrIcon } from '@mui/icons-material';
import type { TicketListItem } from '../../../types/tickets/ticketManagementTypes';

const STATUS_CHIP: Record<string, { color: 'success' | 'warning' | 'error' | 'info' | 'default'; label: string }> = {
  CREATED: { color: 'default', label: 'Oluşturuldu' },
  RESERVED: { color: 'warning', label: 'Rezerve' },
  ACTIVE: { color: 'success', label: 'Aktif' },
  USED: { color: 'info', label: 'Kullanıldı' },
  CHECKED_IN: { color: 'info', label: 'Giriş Yapıldı' },
  CANCELLED: { color: 'error', label: 'İptal' },
  REFUNDED: { color: 'warning', label: 'İade' },
};

interface Props {
  tickets: TicketListItem[];
  loading: boolean;
  page: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rows: number) => void;
  selected: Set<string>;
  onSelect: (id: string) => void;
  onSelectAll: (checked: boolean) => void;
  onTicketClick: (ticket: TicketListItem) => void;
}

export default function TicketTable({
  tickets, loading, page, rowsPerPage, onPageChange, onRowsPerPageChange,
  selected, onSelect, onSelectAll, onTicketClick,
}: Props) {
  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} variant="text" height={48} sx={{ mb: 1 }} />)}
      </Box>
    );
  }

  if (tickets.length === 0) {
    return (
      <Box sx={{ p: 6, textAlign: 'center' }}>
        <Typography sx={{ fontSize: 40, mb: 1 }}>🎫</Typography>
        <Typography variant="body2" color="text.secondary">Filtre sonucu bulunamadı</Typography>
      </Box>
    );
  }

  const pageTickets = tickets.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  return (
    <>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: 'grey.50' }}>
            <TableCell padding="checkbox">
              <Checkbox size="small"
                indeterminate={selected.size > 0 && selected.size < pageTickets.length}
                checked={selected.size > 0 && selected.size === pageTickets.length}
                onChange={e => onSelectAll(e.target.checked)} />
            </TableCell>
            {['Bilet No', 'Koltuk', 'Sipariş', 'Tür', 'Fiyat', 'Tarih', 'Durum', ''].map(h => (
              <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary' }}>{h}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {pageTickets.map(ticket => {
            const sc = STATUS_CHIP[ticket.status] || STATUS_CHIP.CREATED;
            return (
              <TableRow key={ticket.id} hover sx={{ cursor: 'pointer' }} onClick={() => onTicketClick(ticket)}>
                <TableCell padding="checkbox" onClick={e => e.stopPropagation()}>
                  <Checkbox size="small" checked={selected.has(ticket.id)} onChange={() => onSelect(ticket.id)} />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontFamily="monospace" fontSize={12} fontWeight={600}>
                    {ticket.serialNo || ticket.id?.slice(0, 10).toUpperCase()}
                  </Typography>
                </TableCell>
                <TableCell>
                  {ticket.seatInfo ? (
                    <Chip size="small" variant="outlined"
                      label={`${ticket.seatInfo.sectionName || ''} ${ticket.seatInfo.rowLabel || ''}${ticket.seatInfo.seatNumber || ''}`}
                      sx={{ fontWeight: 600, fontSize: 10, height: 22, fontFamily: 'monospace' }} />
                  ) : <Typography variant="caption" color="text.disabled">—</Typography>}
                </TableCell>
                <TableCell><Typography variant="caption" fontFamily="monospace" color="text.secondary">{ticket.orderId?.slice(0, 8).toUpperCase()}</Typography></TableCell>
                <TableCell><Typography variant="body2" fontSize={13}>{ticket.ticketTypeName}</Typography></TableCell>
                <TableCell>
                  <Typography variant="body2" fontFamily="monospace" fontWeight={700} fontSize={13}>
                    {ticket.eventPrice ? `${ticket.eventCurrency || '₺'}${ticket.eventPrice}` : '—'}
                  </Typography>
                </TableCell>
                <TableCell><Typography variant="caption" color="text.secondary">{ticket.issuedAt ? new Date(ticket.issuedAt).toLocaleDateString('tr-TR') : '—'}</Typography></TableCell>
                <TableCell><Chip label={sc.label} size="small" color={sc.color} variant="outlined" sx={{ fontWeight: 600, height: 22, fontSize: 11 }} /></TableCell>
                <TableCell align="right" onClick={e => e.stopPropagation()}>
                  <Tooltip title="Detay"><IconButton size="small" onClick={() => onTicketClick(ticket)}><QrIcon fontSize="small" /></IconButton></Tooltip>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <TablePagination
        component="div" count={tickets.length} page={page}
        onPageChange={(_, p) => onPageChange(p)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={e => onRowsPerPageChange(parseInt(e.target.value, 10))}
        rowsPerPageOptions={[10, 25, 50, 100]}
        labelRowsPerPage="Sayfa başı:"
        labelDisplayedRows={({ from, to, count }) => `${from}–${to} / ${count}`}
      />
    </>
  );
}
