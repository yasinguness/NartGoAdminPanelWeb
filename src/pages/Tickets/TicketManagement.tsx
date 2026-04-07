/**
 * TicketManagement — Ana bilet yönetim sayfası
 * Tüm biletleri listeleme, filtreleme, arama, detay drawer, toplu işlem
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSnackbar } from 'notistack';
import {
  Box, Typography, Stack, Paper, TextField, Button, Chip, IconButton,
  Table, TableHead, TableRow, TableCell, TableBody, TablePagination,
  InputAdornment, Select, MenuItem, FormControl, InputLabel, Checkbox,
  Tooltip, alpha, useTheme, Skeleton, Avatar, CircularProgress,
} from '@mui/material';
import {
  Search as SearchIcon, Refresh as RefreshIcon, Download as DownloadIcon,
  FilterList as FilterIcon, CheckCircle as CheckIcon,
  Cancel as CancelIcon, QrCode as QrIcon,
  ConfirmationNumber as TicketIcon, MoreVert as MoreIcon,
} from '@mui/icons-material';
import { TicketStatus } from '../../types/tickets/ticketTypes';
import type { TicketListItem, OrderDetailResponse } from '../../types/tickets/ticketManagementTypes';
import { ticketManagementService } from '../../services/ticket/ticketManagementService';
import { eventService } from '../../services/event/eventService';
import type { EventResponseDTO } from '../../types/events/eventModel';
import TicketDetailDrawer from './TicketDetailDrawer';

// ─── Status Config ──────────────────────────────────────────
const STATUS_OPTIONS: { value: TicketStatus | ''; label: string }[] = [
  { value: '', label: 'Tümü' },
  { value: TicketStatus.ACTIVE, label: 'Aktif' },
  { value: TicketStatus.CHECKED_IN, label: 'Giriş Yapıldı' },
  { value: TicketStatus.USED, label: 'Kullanıldı' },
  { value: TicketStatus.CANCELLED, label: 'İptal' },
  { value: TicketStatus.REFUNDED, label: 'İade Edildi' },
  { value: TicketStatus.RESERVED, label: 'Rezerve' },
];

const STATUS_CHIP: Record<string, { color: 'success' | 'warning' | 'error' | 'info' | 'default'; label: string }> = {
  CREATED: { color: 'default', label: 'Oluşturuldu' },
  RESERVED: { color: 'warning', label: 'Rezerve' },
  ACTIVE: { color: 'success', label: 'Aktif' },
  USED: { color: 'info', label: 'Kullanıldı' },
  CHECKED_IN: { color: 'info', label: 'Giriş Yapıldı' },
  CANCELLED: { color: 'error', label: 'İptal' },
  REFUNDED: { color: 'warning', label: 'İade' },
};

// ─── Styles ─────────────────────────────────────────────────
const cardSx = {
  bgcolor: 'background.paper',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 3,
  overflow: 'hidden',
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
};

export default function TicketManagement() {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();

  // ── State ──────────────────────────────────────────────
  const [events, setEvents] = useState<EventResponseDTO[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [orders, setOrders] = useState<OrderDetailResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | ''>('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<TicketListItem | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [refundLoading, setRefundLoading] = useState(false);

  // ── Fetch Events ────────────────────────────────────────
  useEffect(() => {
    const loadEvents = async () => {
      setEventsLoading(true);
      try {
        const res = await eventService.getAllEvents({ size: 100 });
        setEvents(res.data?.content || []);
      } catch { /* silently fail */ }
      finally { setEventsLoading(false); }
    };
    loadEvents();
  }, []);

  // ── Fetch Tickets (via orders) ──────────────────────────
  const fetchTickets = useCallback(async () => {
    if (!selectedEventId) { setTickets([]); setOrders([]); return; }
    setLoading(true);
    try {
      const res = await ticketManagementService.getEventOrders(selectedEventId);
      const orderList = res.data || [];
      setOrders(orderList);

      // Flatten orders → tickets
      const flatTickets: TicketListItem[] = [];
      for (const order of orderList) {
        if (order.tickets) {
          for (const t of order.tickets) {
            // Find matching ticket type name from items
            const matchingItem = order.items?.find(i => i.ticketTypeId === t.ticketTypeId);
            flatTickets.push({
              id: t.id,
              orderId: order.id,
              ticketTypeName: matchingItem ? `Bilet` : 'Bilet',
              status: (t.status as TicketStatus) || TicketStatus.ACTIVE,
              serialNo: t.serialNo,
              issuedAt: t.issuedAt,
              canBeCheckedIn: t.status === 'ACTIVE',
              canBeRefunded: t.status === 'ACTIVE' || t.status === 'RESERVED',
              isCheckedIn: t.status === 'CHECKED_IN' || t.status === 'USED',
              userEmail: '',
              eventId: selectedEventId,
              eventName: events.find(e => e.id === selectedEventId)?.name || '',
              eventPrice: matchingItem?.unitPrice,
              eventCurrency: order.currency,
            });
          }
        }
      }
      setTickets(flatTickets);
    } catch {
      enqueueSnackbar('Biletler yüklenemedi', { variant: 'error' });
    } finally { setLoading(false); }
  }, [selectedEventId, events, enqueueSnackbar]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  // ── Filtered tickets ────────────────────────────────────
  const filteredTickets = useMemo(() => {
    let result = tickets;
    if (statusFilter) {
      result = result.filter(t => t.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(t =>
        t.serialNo?.toLowerCase().includes(q) ||
        t.userEmail?.toLowerCase().includes(q) ||
        t.userName?.toLowerCase().includes(q) ||
        t.id?.toLowerCase().includes(q) ||
        t.orderId?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [tickets, statusFilter, search]);

  // ── Stats ───────────────────────────────────────────────
  const stats = useMemo(() => ({
    total: tickets.length,
    active: tickets.filter(t => t.status === TicketStatus.ACTIVE).length,
    checkedIn: tickets.filter(t => t.status === TicketStatus.CHECKED_IN || t.status === TicketStatus.USED).length,
    cancelled: tickets.filter(t => t.status === TicketStatus.CANCELLED).length,
    refunded: tickets.filter(t => t.status === TicketStatus.REFUNDED).length,
  }), [tickets]);

  // ── Handlers ────────────────────────────────────────────
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelected(new Set(filteredTickets.slice(page * rowsPerPage, (page + 1) * rowsPerPage).map(t => t.id)));
    } else {
      setSelected(new Set());
    }
  };

  const handleSelect = (id: string) => {
    const newSet = new Set(selected);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setSelected(newSet);
  };

  const handleTicketClick = (ticket: TicketListItem) => {
    setSelectedTicket(ticket);
    setDrawerOpen(true);
  };

  const handleCancel = async (ticketId: string, reason: string) => {
    setCancelLoading(true);
    try {
      await ticketManagementService.cancelTicket(ticketId, reason);
      enqueueSnackbar('Bilet iptal edildi', { variant: 'success' });
      fetchTickets();
      setDrawerOpen(false);
    } catch { enqueueSnackbar('İptal başarısız', { variant: 'error' }); }
    finally { setCancelLoading(false); }
  };

  const handleRefund = async (ticketId: string, reason: string) => {
    setRefundLoading(true);
    try {
      await ticketManagementService.refundTicket(ticketId, reason);
      enqueueSnackbar('İade başlatıldı', { variant: 'success' });
      fetchTickets();
      setDrawerOpen(false);
    } catch { enqueueSnackbar('İade başarısız', { variant: 'error' }); }
    finally { setRefundLoading(false); }
  };

  const handleBulkCancel = async () => {
    if (selected.size === 0) return;
    const confirmed = window.confirm(`${selected.size} bileti iptal etmek istediğinize emin misiniz?`);
    if (!confirmed) return;
    setCancelLoading(true);
    try {
      await Promise.allSettled(
        Array.from(selected).map(id => ticketManagementService.cancelTicket(id, 'Toplu admin iptali'))
      );
      enqueueSnackbar(`${selected.size} bilet iptal edildi`, { variant: 'success' });
      setSelected(new Set());
      fetchTickets();
    } catch { enqueueSnackbar('Toplu iptal başarısız', { variant: 'error' }); }
    finally { setCancelLoading(false); }
  };

  // ── Render ──────────────────────────────────────────────
  return (
    <Box sx={{ p: 4 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={800} letterSpacing={-0.5}>Bilet Yönetimi</Typography>
          <Typography variant="body2" color="text.secondary">Tüm biletleri görüntüleyin, yönetin ve işlem yapın</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" size="small" startIcon={<DownloadIcon />}
            disabled={tickets.length === 0}
            sx={{ textTransform: 'none', borderRadius: 2 }}>
            Dışa Aktar
          </Button>
        </Stack>
      </Stack>

      {/* Event Selector */}
      <Paper sx={{ ...cardSx, p: 2.5, mb: 3 }}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>Etkinlik Seçin</Typography>
        <FormControl fullWidth size="small">
          <InputLabel>Etkinlik</InputLabel>
          <Select value={selectedEventId} label="Etkinlik"
            onChange={e => { setSelectedEventId(e.target.value); setPage(0); setSelected(new Set()); }}>
            <MenuItem value="">— Seçin —</MenuItem>
            {events.map(ev => (
              <MenuItem key={ev.id} value={ev.id}>
                {ev.name} {ev.eventTime ? `(${new Date(ev.eventTime).toLocaleDateString('tr-TR')})` : ''}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>

      {/* Stats */}
      {selectedEventId && tickets.length > 0 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 2, mb: 3 }}>
          {[
            { label: 'Toplam', value: stats.total, color: theme.palette.text.primary },
            { label: 'Aktif', value: stats.active, color: theme.palette.success.main },
            { label: 'Giriş Yapan', value: stats.checkedIn, color: theme.palette.info.main },
            { label: 'İptal', value: stats.cancelled, color: theme.palette.error.main },
            { label: 'İade', value: stats.refunded, color: theme.palette.warning.main },
          ].map((s, i) => (
            <Paper key={i} sx={{ ...cardSx, p: 2, textAlign: 'center' }}>
              <Typography variant="h5" fontWeight={800} fontFamily="JetBrains Mono, monospace" sx={{ color: s.color }}>
                {s.value}
              </Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
                {s.label}
              </Typography>
            </Paper>
          ))}
        </Box>
      )}

      {/* Filters + Table */}
      {selectedEventId && (
        <Box sx={cardSx}>
          {/* Filter Bar */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
            <TextField size="small" placeholder="Bilet no, e-posta veya sipariş no ara..."
              value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18 }} /></InputAdornment> }}
              sx={{ flex: 1, maxWidth: 360, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <Select value={statusFilter} displayEmpty
                onChange={e => { setStatusFilter(e.target.value as TicketStatus | ''); setPage(0); }}
                sx={{ borderRadius: 2, fontSize: 13 }}>
                {STATUS_OPTIONS.map(o => <MenuItem key={o.value} value={o.value} sx={{ fontSize: 13 }}>{o.label}</MenuItem>)}
              </Select>
            </FormControl>
            <Tooltip title="Yenile">
              <IconButton size="small" onClick={fetchTickets} disabled={loading}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {selected.size > 0 && (
              <Button size="small" variant="outlined" color="error" startIcon={<CancelIcon />}
                onClick={handleBulkCancel} disabled={cancelLoading}
                sx={{ textTransform: 'none', borderRadius: 2, fontSize: 12 }}>
                {cancelLoading ? <CircularProgress size={14} /> : `${selected.size} Bilet İptal Et`}
              </Button>
            )}
            <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
              {filteredTickets.length} bilet
            </Typography>
          </Box>

          {/* Table */}
          {loading ? (
            <Box sx={{ p: 3 }}>
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} variant="text" height={48} sx={{ mb: 1 }} />
              ))}
            </Box>
          ) : filteredTickets.length === 0 ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <Typography sx={{ fontSize: 40, mb: 1 }}>🎫</Typography>
              <Typography variant="body2" color="text.secondary">
                {tickets.length === 0 ? 'Bu etkinlik için henüz bilet yok' : 'Filtre sonucu bulunamadı'}
              </Typography>
            </Box>
          ) : (
            <>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell padding="checkbox">
                      <Checkbox size="small"
                        indeterminate={selected.size > 0 && selected.size < filteredTickets.slice(page * rowsPerPage, (page + 1) * rowsPerPage).length}
                        checked={selected.size > 0 && selected.size === filteredTickets.slice(page * rowsPerPage, (page + 1) * rowsPerPage).length}
                        onChange={e => handleSelectAll(e.target.checked)} />
                    </TableCell>
                    {['Bilet No', 'Sipariş', 'Tür', 'Fiyat', 'Oluşturulma', 'Durum', ''].map(h => (
                      <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary' }}>
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredTickets.slice(page * rowsPerPage, (page + 1) * rowsPerPage).map(ticket => {
                    const statusChip = STATUS_CHIP[ticket.status] || STATUS_CHIP.CREATED;
                    return (
                      <TableRow key={ticket.id} hover sx={{ cursor: 'pointer' }}
                        onClick={() => handleTicketClick(ticket)}>
                        <TableCell padding="checkbox" onClick={e => e.stopPropagation()}>
                          <Checkbox size="small" checked={selected.has(ticket.id)}
                            onChange={() => handleSelect(ticket.id)} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace" fontSize={12} fontWeight={600}>
                            {ticket.serialNo || ticket.id?.slice(0, 10).toUpperCase()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" fontFamily="monospace" color="text.secondary">
                            {ticket.orderId?.slice(0, 8).toUpperCase()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontSize={13}>{ticket.ticketTypeName}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace" fontWeight={700} fontSize={13}>
                            {ticket.eventPrice ? `${ticket.eventCurrency || '₺'}${ticket.eventPrice}` : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {ticket.issuedAt ? new Date(ticket.issuedAt).toLocaleDateString('tr-TR') : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={statusChip.label} size="small" color={statusChip.color}
                            variant="outlined" sx={{ fontWeight: 600, height: 22, fontSize: 11 }} />
                        </TableCell>
                        <TableCell align="right" onClick={e => e.stopPropagation()}>
                          <Tooltip title="Detay">
                            <IconButton size="small" onClick={() => handleTicketClick(ticket)}>
                              <QrIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <TablePagination
                component="div"
                count={filteredTickets.length}
                page={page}
                onPageChange={(_, p) => setPage(p)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                rowsPerPageOptions={[10, 25, 50, 100]}
                labelRowsPerPage="Sayfa başı:"
                labelDisplayedRows={({ from, to, count }) => `${from}–${to} / ${count}`}
              />
            </>
          )}
        </Box>
      )}

      {/* Empty state when no event selected */}
      {!selectedEventId && (
        <Paper sx={{ ...cardSx, p: 8, textAlign: 'center' }}>
          <Typography sx={{ fontSize: 48, mb: 1.5, opacity: 0.3 }}>🎫</Typography>
          <Typography variant="h6" color="text.secondary" fontWeight={600}>Etkinlik Seçin</Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>
            Biletleri görüntülemek için yukarıdan bir etkinlik seçin
          </Typography>
        </Paper>
      )}

      {/* Detail Drawer */}
      <TicketDetailDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        ticket={selectedTicket}
        order={selectedTicket ? orders.find(o => o.id === selectedTicket.orderId) : null}
        onCancel={handleCancel}
        onRefund={handleRefund}
        cancelLoading={cancelLoading}
        refundLoading={refundLoading}
      />
    </Box>
  );
}
