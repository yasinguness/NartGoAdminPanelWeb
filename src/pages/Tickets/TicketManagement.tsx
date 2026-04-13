/**
 * TicketManagement — Bilet yönetim sayfası (atomic architecture)
 * Orchestrates: TicketStats, TicketFilters, TicketTable, TicketDistribution, SeatMapOverview
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSnackbar } from 'notistack';
import { useRole } from '../../hooks/useRole';
import { useAuthStore } from '../../store/authStore';
import {
  Box, Typography, Stack, Paper, Button, FormControl, InputLabel,
  Select, MenuItem, useTheme,
} from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';
import { TicketStatus } from '../../types/tickets/ticketTypes';
import type { TicketListItem, OrderDetailResponse } from '../../types/tickets/ticketManagementTypes';
import { ticketManagementService } from '../../services/ticket/ticketManagementService';
import { eventService } from '../../services/event/eventService';
import type { EventResponseDTO } from '../../types/events/eventModel';
import TicketDetailDrawer from './TicketDetailDrawer';
import SeatMapOverview from './components/SeatMapOverview';
import TicketStats from './components/TicketStats';
import TicketFilters from './components/TicketFilters';
import TicketTable from './components/TicketTable';
import TicketDistribution from './components/TicketDistribution';

const cardSx = { bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' };

export default function TicketManagement() {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const { isAdmin } = useRole();
  const currentUser = useAuthStore((state) => state.user);

  // ── State ──────────────────────────────────────────
  const [events, setEvents] = useState<EventResponseDTO[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [orders, setOrders] = useState<OrderDetailResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | ''>('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<TicketListItem | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [refundLoading, setRefundLoading] = useState(false);

  // ── Fetch Events ───────────────────────────────────
  useEffect(() => {
    (async () => {
      setEventsLoading(true);
      try {
        if (isAdmin) {
          const res = await eventService.getAllEvents({ size: 100 });
          setEvents(res.data?.content || []);
        } else if (currentUser?.id) {
          const res = await eventService.getEventsByOrganizerId(currentUser.id);
          const data = res.data;
          const mapped = [...(data?.upcomingEvents || []), ...(data?.completedEvents || [])].map((e: any) => ({ ...e, name: e.name || e.title || '' }));
          setEvents(mapped as EventResponseDTO[]);
        }
      } catch (err: any) {
        console.error('Etkinlikler yüklenemedi:', err);
        enqueueSnackbar(err?.response?.status === 401 ? 'Oturum süresi doldu' : 'Etkinlikler yüklenemedi', { variant: 'error' });
      } finally { setEventsLoading(false); }
    })();
  }, [isAdmin, currentUser?.id, enqueueSnackbar]);

  // ── Fetch Tickets ──────────────────────────────────
  const fetchTickets = useCallback(async () => {
    if (!selectedEventId) { setTickets([]); setOrders([]); return; }
    setLoading(true);
    try {
      const res = await ticketManagementService.getEventOrders(selectedEventId);
      const orderList = res.data || [];
      setOrders(orderList);
      const flat: TicketListItem[] = [];
      for (const order of orderList) {
        if (order.tickets) {
          for (const t of order.tickets) {
            flat.push({
              id: t.id, orderId: order.id,
              ticketTypeName: t.ticketTypeName || order.items?.find(i => i.ticketTypeId === t.ticketTypeId)?.ticketTypeName || 'Bilet',
              status: (t.status as TicketStatus) || TicketStatus.ACTIVE,
              serialNo: t.serialNo, issuedAt: t.issuedAt,
              canBeCheckedIn: t.status === 'ACTIVE', canBeRefunded: t.status === 'ACTIVE' || t.status === 'RESERVED',
              isCheckedIn: t.status === 'CHECKED_IN' || t.status === 'USED',
              userEmail: order.userEmail || '', userName: order.customerName || '', userPhone: order.customerPhone || '',
              eventId: selectedEventId,
              eventName: events.find(e => e.id === selectedEventId)?.name || '',
              eventPrice: t.pricePaid || order.items?.find(i => i.ticketTypeId === t.ticketTypeId)?.unitPrice,
              eventCurrency: order.currency,
              seatInfo: t.seatRow ? { rowLabel: t.seatRow, seatNumber: t.seatNumber, categoryName: t.seatCategoryName } : t.seatInfo,
            });
          }
        }
      }
      setTickets(flat);
    } catch (err: any) {
      console.error('Biletler yüklenemedi:', err);
      enqueueSnackbar(err?.response?.status === 401 ? 'Oturum süresi doldu' : err?.response?.status === 403 ? 'Erişim yetkiniz yok' : 'Biletler yüklenemedi', { variant: 'error' });
    } finally { setLoading(false); }
  }, [selectedEventId, events, enqueueSnackbar]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  // ── Filtered ───────────────────────────────────────
  const filteredTickets = useMemo(() => {
    let result = tickets;
    if (statusFilter) result = result.filter(t => t.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(t => t.serialNo?.toLowerCase().includes(q) || t.userEmail?.toLowerCase().includes(q) || t.id?.toLowerCase().includes(q) || t.orderId?.toLowerCase().includes(q));
    }
    return result;
  }, [tickets, statusFilter, search]);

  // ── Stats ──────────────────────────────────────────
  const stats = useMemo(() => ({
    total: tickets.length,
    active: tickets.filter(t => t.status === TicketStatus.ACTIVE).length,
    checkedIn: tickets.filter(t => t.status === TicketStatus.CHECKED_IN || t.status === TicketStatus.USED).length,
    cancelled: tickets.filter(t => t.status === TicketStatus.CANCELLED).length,
    refunded: tickets.filter(t => t.status === TicketStatus.REFUNDED).length,
    revenue: orders.filter(o => o.status === 'PAID' || o.status === 'COMPLETED').reduce((s, o) => s + (o.totalAmount || 0), 0),
    currency: orders[0]?.currency || 'TRY',
  }), [tickets, orders]);

  // ── Handlers ───────────────────────────────────────
  const handleSelect = (id: string) => { const s = new Set(selected); if (s.has(id)) s.delete(id); else s.add(id); setSelected(s); };
  const handleSelectAll = (checked: boolean) => {
    setSelected(checked ? new Set(filteredTickets.slice(page * rowsPerPage, (page + 1) * rowsPerPage).map(t => t.id)) : new Set());
  };
  const handleTicketClick = (ticket: TicketListItem) => { setSelectedTicket(ticket); setDrawerOpen(true); };

  const handleCancel = async (ticketId: string, reason: string) => {
    setCancelLoading(true);
    try { await ticketManagementService.cancelTicket(ticketId, reason); enqueueSnackbar('Bilet iptal edildi', { variant: 'success' }); fetchTickets(); setDrawerOpen(false); }
    catch { enqueueSnackbar('İptal başarısız', { variant: 'error' }); }
    finally { setCancelLoading(false); }
  };

  const handleRefund = async (ticketId: string, reason: string) => {
    setRefundLoading(true);
    try { await ticketManagementService.refundTicket(ticketId, reason); enqueueSnackbar('İade başlatıldı', { variant: 'success' }); fetchTickets(); setDrawerOpen(false); }
    catch { enqueueSnackbar('İade başarısız', { variant: 'error' }); }
    finally { setRefundLoading(false); }
  };

  const handleBulkCancel = async () => {
    if (selected.size === 0) return;
    if (!window.confirm(`${selected.size} bileti iptal etmek istediğinize emin misiniz?`)) return;
    setCancelLoading(true);
    try {
      const results = await Promise.allSettled(Array.from(selected).map(id => ticketManagementService.cancelTicket(id, 'Toplu admin iptali')));
      const failed = results.filter(r => r.status === 'rejected').length;
      if (failed === 0) enqueueSnackbar(`${selected.size} bilet iptal edildi`, { variant: 'success' });
      else if (failed === selected.size) enqueueSnackbar('Tüm iptaller başarısız', { variant: 'error' });
      else enqueueSnackbar(`${selected.size - failed} başarılı, ${failed} başarısız`, { variant: 'warning' });
      setSelected(new Set()); fetchTickets();
    } catch { enqueueSnackbar('Toplu iptal başarısız', { variant: 'error' }); }
    finally { setCancelLoading(false); }
  };

  // ── Render ─────────────────────────────────────────
  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={800} letterSpacing={-0.5}>Bilet Yönetimi</Typography>
          <Typography variant="body2" color="text.secondary">Tüm biletleri görüntüleyin, yönetin ve işlem yapın</Typography>
        </Box>
        <Button variant="outlined" size="small" startIcon={<DownloadIcon />} disabled={tickets.length === 0}
          sx={{ textTransform: 'none', borderRadius: 2 }}>Dışa Aktar</Button>
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
      {selectedEventId && tickets.length > 0 && <TicketStats stats={stats} />}

      {/* Seat Map Overview */}
      {selectedEventId && <SeatMapOverview eventId={selectedEventId} eventName={events.find(e => e.id === selectedEventId)?.name || ''} />}

      {/* Distribution */}
      {selectedEventId && tickets.length > 0 && <TicketDistribution tickets={tickets} totalCount={stats.total} />}

      {/* Filters + Table */}
      {selectedEventId && (
        <Box sx={cardSx}>
          <TicketFilters search={search} onSearchChange={v => { setSearch(v); setPage(0); }}
            statusFilter={statusFilter} onStatusChange={v => { setStatusFilter(v); setPage(0); }}
            onRefresh={fetchTickets} loading={loading} selectedCount={selected.size}
            onBulkCancel={handleBulkCancel} cancelLoading={cancelLoading} totalCount={filteredTickets.length} />
          <TicketTable tickets={filteredTickets} loading={loading} page={page} rowsPerPage={rowsPerPage}
            onPageChange={setPage} onRowsPerPageChange={v => { setPage(0); }} selected={selected}
            onSelect={handleSelect} onSelectAll={handleSelectAll} onTicketClick={handleTicketClick} />
        </Box>
      )}

      {/* Empty state */}
      {!selectedEventId && (
        <Paper sx={{ ...cardSx, p: 8, textAlign: 'center' }}>
          <Typography sx={{ fontSize: 48, mb: 1.5, opacity: 0.3 }}>🎫</Typography>
          <Typography variant="h6" color="text.secondary" fontWeight={600}>Etkinlik Seçin</Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>Biletleri görüntülemek için yukarıdan bir etkinlik seçin</Typography>
        </Paper>
      )}

      {/* Detail Drawer */}
      <TicketDetailDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} ticket={selectedTicket}
        order={selectedTicket ? orders.find(o => o.id === selectedTicket.orderId) : null}
        onCancel={handleCancel} onRefund={handleRefund} cancelLoading={cancelLoading} refundLoading={refundLoading} />
    </Box>
  );
}
