import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { salesCommandService } from '../../services/sales/salesCommand.service';
import { useDefaultEvent } from '../../hooks/useDefaultEvent';
import { parseDate, formatDateTime, formatDate } from '../../utils/dateUtils';
import {
  Box, Typography, Paper, Stack, Button, Chip, TextField, MenuItem,
  InputAdornment, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, IconButton, CircularProgress, LinearProgress, alpha, useTheme,
  Drawer, Divider, Grid, Tooltip,
} from '@mui/material';
import {
  Search as SearchIcon, Refresh as RefreshIcon, Close as CloseIcon,
  TrendingUp as RevenueIcon, ConfirmationNumber as TicketIcon,
  ShoppingCart as OrderIcon, SwapHoriz as RefundIcon,
  CheckCircle as PaidIcon, Cancel as CancelIcon, Pending as PendingIcon,
  WarningAmber as WarningIcon, ArrowForward as ArrowIcon,
  Download as DownloadIcon, OpenInNew as OpenIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { PageContainer } from '../../components/Page';

// ─── Sabitler ────────────────────────────────────────────────

const STATUS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PAID:             { label: 'Ödendi',            color: '#10b981', icon: <PaidIcon sx={{ fontSize: 14 }} /> },
  COMPLETED:        { label: 'Tamamlandı',        color: '#10b981', icon: <PaidIcon sx={{ fontSize: 14 }} /> },
  REFUNDED:         { label: 'İade Edildi',        color: '#f59e0b', icon: <RefundIcon sx={{ fontSize: 14 }} /> },
  CANCELLED:        { label: 'İptal',             color: '#ef4444', icon: <CancelIcon sx={{ fontSize: 14 }} /> },
  PENDING:          { label: 'Bekliyor',          color: '#64748b', icon: <PendingIcon sx={{ fontSize: 14 }} /> },
  CHECKOUT_CREATED: { label: 'Ödeme Bekleniyor',  color: '#64748b', icon: <PendingIcon sx={{ fontSize: 14 }} /> },
  PAYMENT_FAILED:   { label: 'Ödeme Başarısız',   color: '#ef4444', icon: <WarningIcon sx={{ fontSize: 14 }} /> },
};

const LIFECYCLE_TR: Record<string, string> = {
  ORDER_CREATED: 'Sipariş oluşturuldu',
  ORDER_PAID: 'Ödeme tamamlandı',
  ORDER_CANCELLED: 'Sipariş iptal edildi',
  ORDER_REFUNDED: 'İade işlemi yapıldı',
  TICKET_ISSUED: 'Bilet oluşturuldu',
  TICKET_CHECKED_IN: 'Giriş yapıldı',
  REFUND_REQUESTED: 'İade talep edildi',
  REFUND_COMPLETED: 'İade tamamlandı',
  ADMIN_ACTION: 'Admin işlemi',
};

const fmt = (v: number) => `₺${Number(v || 0).toLocaleString('tr-TR', { minimumFractionDigits: 0 })}`;

function StatusChip({ status }: { status: string }) {
  const s = STATUS[status] || { label: status || '—', color: '#64748b', icon: null };
  return (
    <Chip
      icon={s.icon as React.ReactElement | undefined}
      label={s.label} size="small"
      sx={{
        bgcolor: alpha(s.color, 0.1), color: s.color, fontWeight: 700,
        borderRadius: 1.5, fontSize: 11, height: 24,
        '& .MuiChip-icon': { color: s.color, ml: 0.5 },
      }}
    />
  );
}

// ─── Component ───────────────────────────────────────────────

export default function SalesCommandCenter() {
  const theme = useTheme();
  const navigate = useNavigate();

  const { events, defaultEventId, mustSelect } = useDefaultEvent();
  const [eventId, setEventId] = useState('');

  // Tek aktif etkinlik varsa otomatik seç
  useEffect(() => {
    if (!eventId && defaultEventId) {
      setEventId(defaultEventId);
    }
  }, [defaultEventId, eventId]);
  const [dashboard, setDashboard] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [lifecycle, setLifecycle] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lifecycleLoading, setLifecycleLoading] = useState(false);

  // Events useDefaultEvent hook'undan geliyor, mustSelect: çoklu aktif etkinlik varsa true

  // Veri çek
  const fetchData = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const [d, o] = await Promise.allSettled([
        salesCommandService.getSalesDashboard(eventId),
        salesCommandService.getOrderFeed(eventId, statusFilter === 'ALL' ? undefined : statusFilter, 200),
      ]);
      if (d.status === 'fulfilled') setDashboard(d.value);
      if (o.status === 'fulfilled') setOrders(o.value ?? []);
    } catch { /* */ }
    finally { setLoading(false); }
  }, [eventId, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Sipariş detay
  const openOrder = async (order: any) => {
    setSelectedOrder(order);
    setDrawerOpen(true);
    setLifecycleLoading(true);
    try {
      const lc = await salesCommandService.getOrderLifecycle(order.orderId);
      setLifecycle(lc?.events ?? []);
    } catch { setLifecycle([]); }
    finally { setLifecycleLoading(false); }
  };

  // Arama
  const filtered = orders.filter(o => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return o.orderReference?.toLowerCase().includes(q) || o.userEmail?.toLowerCase().includes(q);
  });

  // KPI
  const gross = dashboard?.grossRevenue ?? 0;
  const net = dashboard?.netRevenue ?? 0;
  const paid = dashboard?.paidOrders ?? 0;
  const tickets = dashboard?.ticketsIssued ?? 0;
  const checkedIn = dashboard?.ticketsCheckedIn ?? 0;
  const total = dashboard?.totalOrders ?? 0;
  const refundedCount = dashboard?.refundedOrders ?? 0;
  const cancelledCount = dashboard?.cancelledOrders ?? 0;
  const pendingCount = dashboard?.pendingOrders ?? 0;
  const refundedRev = dashboard?.refundedRevenue ?? 0;

  const selectedEvent = events.find((e: any) => e.id === eventId);
  const cardSx = { borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' };

  // CSV
  const exportCSV = () => {
    const headers = ['Sipariş No', 'Tarih', 'Müşteri', 'Adet', 'Tutar', 'Durum'];
    const rows = filtered.map((o: any) => [
      o.orderReference || o.orderId?.substring(0, 13),
      o.createdAt ? formatDateTime(o.createdAt) : '',
      o.userEmail || '', o.quantity ?? 1, o.totalAmount || 0,
      STATUS[o.status]?.label || o.status,
    ]);
    const csv = [headers.join(';'), ...rows.map(r => r.map(c => `"${c}"`).join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `satislar_${selectedEvent?.name?.replace(/\s+/g, '_') || 'etkinlik'}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <PageContainer title="Satış Özeti">
      {loading && <LinearProgress sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999 }} />}

      {/* Başlık */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={800}>Satış Özeti</Typography>
          <Typography variant="body2" color="text.secondary">Etkinlik bazlı gelir, sipariş ve bilet takibi</Typography>
        </Box>
        <Stack direction="row" spacing={1.5} alignItems="center">
          {/* Tek aktif etkinlik varsa chip olarak göster, çoklu ise dropdown */}
          {!mustSelect && selectedEvent ? (
            <Chip
              label={`${selectedEvent.name}${selectedEvent.eventTime ? ' · ' + formatDate(selectedEvent.eventTime) : ''}`}
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
          ) : (
            <TextField
              select size="small" value={eventId}
              onChange={e => { setEventId(e.target.value); setSearch(''); setStatusFilter('ALL'); }}
              sx={{ minWidth: 280, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              label="Etkinlik Seç"
            >
              {events.map((ev: any) => (
                <MenuItem key={ev.id} value={ev.id}>
                  <Stack>
                    <Typography variant="body2" fontWeight={600}>{ev.name}</Typography>
                    {ev.eventTime && (
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(ev.eventTime)}
                      </Typography>
                    )}
                  </Stack>
                </MenuItem>
              ))}
            </TextField>
          )}
          <Tooltip title="Yenile">
            <IconButton size="small" onClick={fetchData} disabled={loading}>
              {loading ? <CircularProgress size={18} /> : <RefreshIcon />}
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* KPI Kartları */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' }, gap: 2, mb: 3 }}>
        {[
          { label: 'Net Gelir', value: fmt(net), sub: `Brüt: ${fmt(gross)}`, icon: <RevenueIcon />, color: '#10b981' },
          { label: 'Başarılı Sipariş', value: String(paid), sub: `${total} toplam`, icon: <OrderIcon />, color: theme.palette.primary.main },
          { label: 'Satılan Bilet', value: String(tickets), sub: `${checkedIn} giriş yaptı`, icon: <TicketIcon />, color: '#3b82f6' },
          { label: 'İade / İptal', value: `${refundedCount} / ${cancelledCount}`, sub: fmt(refundedRev), icon: <RefundIcon />, color: refundedCount > 0 ? '#ef4444' : '#64748b' },
          { label: 'Bekleyen', value: String(pendingCount), sub: 'Tamamlanmamış', icon: <PendingIcon />, color: pendingCount > 0 ? '#f59e0b' : '#64748b' },
        ].map((kpi, i) => (
          <Paper key={i} sx={{ ...cardSx, p: 2.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 10 }}>
                  {kpi.label}
                </Typography>
                <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5, mb: 0.5, lineHeight: 1.2 }}>
                  {loading ? '—' : kpi.value}
                </Typography>
                <Typography variant="caption" color="text.secondary" fontSize={11}>{loading ? '' : kpi.sub}</Typography>
              </Box>
              <Box sx={{ width: 38, height: 38, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: alpha(kpi.color, 0.08), color: kpi.color }}>
                {kpi.icon}
              </Box>
            </Stack>
          </Paper>
        ))}
      </Box>

      {/* Durum Dağılımı — mini bar */}
      {dashboard?.statusBreakdown && !loading && (
        <Paper sx={{ ...cardSx, p: 2, mb: 3 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 10 }}>
            Sipariş Durumu Dağılımı
          </Typography>
          <Box sx={{ display: 'flex', height: 8, borderRadius: 1, overflow: 'hidden', bgcolor: 'grey.100' }}>
            {Object.entries(dashboard.statusBreakdown as Record<string, number>).map(([status, count]) => {
              const pct = total > 0 ? (count / total) * 100 : 0;
              const color = STATUS[status]?.color || '#94a3b8';
              return pct > 0 ? (
                <Tooltip key={status} title={`${STATUS[status]?.label || status}: ${count} (%${pct.toFixed(0)})`}>
                  <Box sx={{ width: `${pct}%`, bgcolor: color, transition: 'width 0.3s' }} />
                </Tooltip>
              ) : null;
            })}
          </Box>
          <Stack direction="row" spacing={2.5} sx={{ mt: 1.5 }} flexWrap="wrap">
            {Object.entries(dashboard.statusBreakdown as Record<string, number>).map(([status, count]) => (
              <Stack key={status} direction="row" spacing={0.75} alignItems="center">
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: STATUS[status]?.color || '#94a3b8' }} />
                <Typography variant="caption" color="text.secondary" fontWeight={500}>
                  {STATUS[status]?.label || status} ({count})
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Paper>
      )}

      {/* Sipariş Tablosu */}
      <Paper sx={{ ...cardSx, overflow: 'hidden' }}>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider', flexWrap: 'wrap', gap: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="subtitle1" fontWeight={700}>Siparişler</Typography>
            <Chip label={filtered.length} size="small" variant="outlined" sx={{ fontWeight: 600, height: 22 }} />
          </Stack>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <TextField
              size="small" placeholder="Sipariş no veya e-posta..."
              value={search} onChange={e => setSearch(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18 }} /></InputAdornment> }}
              sx={{ width: 240, '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: 'grey.50' } }}
            />
            <TextField
              select size="small" value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              sx={{ minWidth: 140, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            >
              <MenuItem value="ALL">Tüm Durumlar</MenuItem>
              <MenuItem value="PAID">Ödendi</MenuItem>
              <MenuItem value="REFUNDED">İade</MenuItem>
              <MenuItem value="CANCELLED">İptal</MenuItem>
              <MenuItem value="PENDING">Bekliyor</MenuItem>
            </TextField>
            <Tooltip title="CSV İndir">
              <IconButton size="small" onClick={exportCSV} disabled={filtered.length === 0}>
                <DownloadIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>

        <TableContainer sx={{ maxHeight: 'calc(100vh - 460px)' }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                {['Sipariş No', 'Tarih', 'Müşteri', 'Adet', 'Tutar', 'Durum', ''].map(h => (
                  <TableCell key={h} sx={{ bgcolor: 'grey.50', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary' }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: 'center', py: 8 }}>
                    {loading ? <CircularProgress size={24} /> : (
                      <Box>
                        <Typography sx={{ fontSize: 36, mb: 1 }}>📦</Typography>
                        <Typography variant="subtitle2" color="text.secondary">
                          {orders.length === 0 ? 'Bu etkinlikte henüz sipariş yok' : 'Arama sonucu bulunamadı'}
                        </Typography>
                      </Box>
                    )}
                  </TableCell>
                </TableRow>
              ) : filtered.map((order: any) => {
                const st = order.status?.toString() || '';
                return (
                  <TableRow
                    key={order.orderId} hover onClick={() => openOrder(order)}
                    sx={{
                      cursor: 'pointer',
                      bgcolor: st === 'REFUNDED' ? alpha('#f59e0b', 0.03) : st === 'CANCELLED' ? alpha('#ef4444', 0.03) : 'transparent',
                      '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) },
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} fontFamily="monospace" fontSize={12}>
                        {order.orderReference || order.orderId?.substring(0, 13)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {formatDateTime(order.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontSize={13}>{order.userEmail?.split('@')[0] || '—'}</Typography>
                      <Typography variant="caption" color="text.secondary" fontSize={10}>{order.userEmail}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={order.quantity ?? 1} size="small" sx={{ height: 20, fontWeight: 600, bgcolor: 'grey.100', fontSize: 11 }} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700} fontSize={13}>{fmt(order.totalAmount)}</Typography>
                    </TableCell>
                    <TableCell><StatusChip status={st} /></TableCell>
                    <TableCell align="right">
                      <ArrowIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* ─── Sipariş Detay Drawer ─── */}
      <Drawer
        anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 440 }, borderRadius: '16px 0 0 16px' } }}
      >
        {selectedOrder && (
          <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Başlık */}
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>SİPARİŞ DETAYI</Typography>
                <Typography variant="h6" fontWeight={800} fontFamily="monospace">
                  {selectedOrder.orderReference || selectedOrder.orderId?.substring(0, 13)}
                </Typography>
              </Box>
              <IconButton onClick={() => setDrawerOpen(false)} size="small" sx={{ bgcolor: 'grey.100' }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>

            <Box sx={{ mb: 3 }}><StatusChip status={selectedOrder.status?.toString() || ''} /></Box>

            {/* Bilgiler */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
              {[
                { label: 'Müşteri', value: selectedOrder.userEmail || '—' },
                { label: 'Tutar', value: fmt(selectedOrder.totalAmount), bold: true },
                { label: 'Bilet Adedi', value: `${selectedOrder.quantity ?? 1} bilet` },
                { label: 'Oluşturulma', value: formatDateTime(selectedOrder.createdAt) },
                { label: 'Ödeme Tarihi', value: selectedOrder.paidAt ? formatDateTime(selectedOrder.paidAt) : 'Ödenmedi' },
                ...(selectedOrder.refunded ? [{ label: 'İade Tarihi', value: selectedOrder.refundedAt ? formatDateTime(selectedOrder.refundedAt) : '—' }] : []),
              ].map((item: any, i: number) => (
                <Box key={i}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 10, display: 'block' }}>
                    {item.label}
                  </Typography>
                  <Typography variant="body2" fontWeight={item.bold ? 800 : 500} sx={{ mt: 0.25, color: item.bold ? '#10b981' : 'text.primary', fontSize: 13 }}>
                    {item.value}
                  </Typography>
                </Box>
              ))}
            </Box>

            <Divider sx={{ mb: 2.5 }} />

            {/* Yaşam döngüsü */}
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>Sipariş Geçmişi</Typography>

            <Box sx={{ flex: 1, overflow: 'auto', position: 'relative' }}>
              {lifecycleLoading ? (
                <Stack alignItems="center" sx={{ py: 4 }}>
                  <CircularProgress size={20} />
                </Stack>
              ) : lifecycle.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                  Geçmiş verisi bulunamadı
                </Typography>
              ) : (
                <>
                  <Box sx={{ position: 'absolute', top: 6, bottom: 12, left: 11, width: 2, bgcolor: 'divider' }} />
                  <Stack spacing={2}>
                    {lifecycle.map((ev: any, i: number) => {
                      const color =
                        ev.type?.includes('PAID') || ev.type?.includes('COMPLETED') ? '#10b981' :
                        ev.type?.includes('CANCEL') ? '#ef4444' :
                        ev.type?.includes('REFUND') ? '#f59e0b' : '#3b82f6';
                      return (
                        <Box key={i} sx={{ position: 'relative', pl: 4 }}>
                          <Box sx={{
                            position: 'absolute', left: 5, top: 3, width: 14, height: 14,
                            borderRadius: '50%', bgcolor: color, border: '3px solid white',
                            boxShadow: `0 0 0 1px ${alpha(color, 0.25)}`,
                          }} />
                          <Typography variant="body2" fontWeight={600} fontSize={13}>
                            {LIFECYCLE_TR[ev.type] || ev.label || ev.type}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {ev.occurredAt ? formatDateTime(ev.occurredAt) : ''}
                            {ev.actorEmail ? ` · ${ev.actorEmail.split('@')[0]}` : ''}
                          </Typography>
                          {ev.reason && (
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25, fontStyle: 'italic' }}>
                              {ev.reason}
                            </Typography>
                          )}
                        </Box>
                      );
                    })}
                  </Stack>
                </>
              )}
            </Box>

            {/* Alt aksiyonlar */}
            <Stack spacing={1.5} sx={{ mt: 'auto', pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Button
                fullWidth variant="outlined" size="small" startIcon={<OpenIcon />}
                onClick={() => { setDrawerOpen(false); navigate(`/events/${eventId}`); }}
                sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}
              >
                Etkinlik Detayına Git
              </Button>
            </Stack>
          </Box>
        )}
      </Drawer>
    </PageContainer>
  );
}
