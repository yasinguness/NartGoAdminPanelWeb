import { useState, useEffect, useMemo } from 'react';
import {
  Paper, Typography, Stack, Box, Chip, Grid, alpha, useTheme,
  Table, TableBody, TableCell, TableHead, TableRow, TextField, InputAdornment,
  ToggleButtonGroup, ToggleButton, TablePagination, IconButton, Collapse, Tooltip,
} from '@mui/material';
import {
  ShoppingCartCheckout as OrderIcon, Search as SearchIcon,
  KeyboardArrowDown as ExpandIcon, KeyboardArrowUp as CollapseIcon,
  ConfirmationNumber as TicketIcon, PersonOutline as PersonIcon,
  OpenInNew as OpenIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { EventResponseDTO } from '../../../types/events/eventModel';
import { ticketService } from '../../../services/ticket/ticketService';
import { SectionListSkeleton, SectionEmpty } from './_shared';

interface OrderItemRow {
  ticketTypeId?: string;
  ticketTypeName?: string;
  seatId?: string;
  quantity: number;
  unitPrice: number;
}

interface OrderRow {
  id: string;
  orderReference?: string;
  userId?: string;
  customerName?: string;
  userEmail?: string;
  totalAmount: number;
  currency: string;
  status: string;
  paymentMethod?: string;
  paidAt?: string;
  cancelledAt?: string;
  createdAt: string;
  items: OrderItemRow[];
  totalTickets: number;
}

const STATUS_COLORS: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  PAID: 'success',
  COMPLETED: 'success',
  PENDING: 'warning',
  CANCELLED: 'default',
  REFUNDED: 'error',
  PAYMENT_FAILED: 'error',
};

const STATUS_LABEL: Record<string, string> = {
  PAID: 'Ödendi',
  COMPLETED: 'Tamamlandı',
  PENDING: 'Beklemede',
  CANCELLED: 'İptal',
  REFUNDED: 'İade',
  PAYMENT_FAILED: 'Başarısız',
};

const FILTERS = [
  { key: 'ALL', label: 'Tümü' },
  { key: 'PAID', label: 'Ödenen' },
  { key: 'PENDING', label: 'Beklemede' },
  { key: 'REFUNDED', label: 'İade' },
  { key: 'CANCELLED', label: 'İptal' },
];

export default function OrdersSection({ event }: { event: EventResponseDTO }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    ticketService.getEventOrders(event.id)
      .then(res => {
        if (res.success && res.data) {
          setOrders(res.data.map((o: any) => {
            const items: OrderItemRow[] = Array.isArray(o.items) ? o.items.map((it: any) => ({
              ticketTypeId: it.ticketTypeId,
              ticketTypeName: it.ticketTypeName,
              seatId: it.seatId,
              quantity: Number(it.quantity) || 0,
              unitPrice: Number(it.unitPrice) || 0,
            })) : [];
            return {
              id: o.id,
              orderReference: o.orderReference,
              userId: o.userId,
              customerName: o.customerName,
              userEmail: o.userEmail,
              totalAmount: Number(o.totalAmount) || 0,
              currency: o.currency || 'TRY',
              status: o.status || 'PENDING',
              paymentMethod: o.paymentMethod,
              paidAt: o.paidAt,
              cancelledAt: o.cancelledAt,
              createdAt: o.createdAt,
              items,
              totalTickets: items.reduce((s, it) => s + it.quantity, 0),
            };
          }));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [event.id]);

  // Filtre + arama
  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter(o => {
      // Durum filtresi
      if (filter !== 'ALL') {
        if (filter === 'PAID' && !['PAID', 'COMPLETED'].includes(o.status)) return false;
        if (filter !== 'PAID' && o.status !== filter) return false;
      }
      // Arama
      if (q) {
        const haystack = [o.id, o.orderReference, o.customerName, o.userEmail].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [orders, filter, search]);

  const stats = useMemo(() => ({
    total: orders.length,
    paid: orders.filter(o => ['PAID', 'COMPLETED'].includes(o.status)).length,
    pending: orders.filter(o => o.status === 'PENDING').length,
    revenue: orders.filter(o => ['PAID', 'COMPLETED'].includes(o.status)).reduce((s, o) => s + o.totalAmount, 0),
    totalAttendees: orders.filter(o => ['PAID', 'COMPLETED'].includes(o.status)).reduce((s, o) => s + o.totalTickets, 0),
  }), [orders]);

  // Filtre değişince sayfalama sıfırla
  useEffect(() => { setPage(0); }, [filter, search]);

  if (loading) return <SectionListSkeleton rows={6} />;
  if (orders.length === 0) {
    return <SectionEmpty icon={<OrderIcon sx={{ fontSize: 40 }} />} title="Henüz sipariş yok" message="İlk bilet satışında burada görünecek. Bir sipariş = bir veya daha fazla katılımcı." />;
  }

  const paginated = filteredOrders.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  return (
    <Stack spacing={2}>
      {/* Info banner — Participants neden yok */}
      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(theme.palette.info.main, 0.04), borderColor: alpha(theme.palette.info.main, 0.2) }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <PersonIcon sx={{ fontSize: 18, color: 'info.main' }} />
          <Typography variant="caption" sx={{ flex: 1 }}>
            <strong>Sipariş = Katılım.</strong> Bir siparişi genişleterek içindeki bilet tiplerini ve katılımcı sayısını görebilirsiniz. Bireysel check-in kayıtları için <strong>Giriş Kayıtları</strong> sekmesini kullanın.
          </Typography>
        </Stack>
      </Paper>

      {/* Özet kartlar — 5'li (katılımcı sayısı eklendi) */}
      <Grid container spacing={2}>
        {[
          { label: 'Toplam Sipariş', value: stats.total, color: 'text.primary' },
          { label: 'Ödenen', value: stats.paid, color: 'success.main' },
          { label: 'Toplam Katılımcı', value: stats.totalAttendees, color: 'info.main' },
          { label: 'Beklemede', value: stats.pending, color: 'warning.main' },
          { label: 'Toplam Gelir', value: `${stats.revenue.toLocaleString('tr-TR')} ₺`, color: 'primary.main' },
        ].map(s => (
          <Grid item xs={6} md={s.label === 'Toplam Gelir' ? 4 : 2} key={s.label}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700 }}>
                {s.label}
              </Typography>
              <Typography sx={{ fontFamily: 'serif', fontStyle: 'normal', fontSize: 22, fontWeight: 700, color: s.color, mt: 0.5 }}>
                {s.value}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Filtre + Arama */}
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
          <ToggleButtonGroup
            value={filter}
            exclusive
            onChange={(_, v) => v && setFilter(v)}
            size="small"
          >
            {FILTERS.map(f => {
              const count = f.key === 'ALL'
                ? orders.length
                : f.key === 'PAID'
                  ? stats.paid
                  : orders.filter(o => o.status === f.key).length;
              return (
                <ToggleButton key={f.key} value={f.key} sx={{ textTransform: 'none', fontSize: 12, px: 1.5 }}>
                  {f.label}
                  <Chip label={count} size="small" sx={{ ml: 0.8, height: 18, fontSize: 10 }} />
                </ToggleButton>
              );
            })}
          </ToggleButtonGroup>

          <Box sx={{ flex: 1 }} />

          <TextField
            size="small"
            placeholder="Sipariş ref, müşteri, e-posta ara..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
            }}
            sx={{ minWidth: 280 }}
          />
        </Box>

        {/* Tablo */}
        {paginated.length === 0 ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.disabled">
              Filtreyle eşleşen sipariş yok
            </Typography>
          </Box>
        ) : (
          <>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: alpha(theme.palette.action.hover, 0.3) }}>
                  <TableCell sx={{ width: 36 }} />
                  <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Tarih</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Müşteri / Ref</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 11 }} align="center">Bilet</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 11 }} align="right">Tutar</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 11 }} align="center">Durum</TableCell>
                  <TableCell sx={{ width: 60 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {paginated.map(o => {
                  const isOpen = expanded === o.id;
                  return (
                    <>
                      <TableRow key={o.id} hover sx={{ cursor: 'pointer' }} onClick={() => setExpanded(isOpen ? null : o.id)}>
                        <TableCell padding="none" sx={{ pl: 1 }}>
                          <IconButton size="small">
                            {isOpen ? <CollapseIcon fontSize="small" /> : <ExpandIcon fontSize="small" />}
                          </IconButton>
                        </TableCell>
                        <TableCell sx={{ fontSize: 12 }}>
                          {o.createdAt ? format(new Date(o.createdAt), 'dd MMM HH:mm', { locale: tr }) : '—'}
                        </TableCell>
                        <TableCell sx={{ fontSize: 12 }}>
                          <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
                            {o.customerName || 'Anonim'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, fontFamily: 'monospace' }}>
                            {o.userEmail || '—'}
                            {o.orderReference && <> · {o.orderReference.slice(0, 12)}…</>}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
                            <TicketIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                            <Typography sx={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}>
                              {o.totalTickets}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell sx={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700 }} align="right">
                          {o.totalAmount.toLocaleString('tr-TR')} {o.currency === 'TRY' ? '₺' : o.currency}
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={STATUS_LABEL[o.status] || o.status}
                            size="small"
                            color={STATUS_COLORS[o.status] || 'default'}
                            sx={{ fontSize: 10, height: 20 }}
                          />
                        </TableCell>
                        <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                          {o.userId && (
                            <Tooltip title="Kullanıcı 360° bakışı" arrow>
                              <IconButton size="small" onClick={() => navigate(`/users/${o.userId}/360`)}>
                                <OpenIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={7} sx={{ py: 0, borderBottom: isOpen ? undefined : 'none' }}>
                          <Collapse in={isOpen} timeout="auto" unmountOnExit>
                            <Box sx={{ py: 2, px: 3, bgcolor: alpha(theme.palette.action.hover, 0.15) }}>
                              <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ mb: 2 }}>
                                <Box>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700 }}>
                                    Sipariş No
                                  </Typography>
                                  <Typography sx={{ fontSize: 12, fontFamily: 'monospace' }}>
                                    {o.orderReference || o.id.slice(0, 16)}
                                  </Typography>
                                </Box>
                                {o.paymentMethod && (
                                  <Box>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700 }}>
                                      Ödeme
                                    </Typography>
                                    <Typography sx={{ fontSize: 12 }}>{o.paymentMethod}</Typography>
                                  </Box>
                                )}
                                {o.paidAt && (
                                  <Box>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700 }}>
                                      Ödendi
                                    </Typography>
                                    <Typography sx={{ fontSize: 12, fontFamily: 'monospace' }}>
                                      {format(new Date(o.paidAt), 'dd MMM yyyy HH:mm', { locale: tr })}
                                    </Typography>
                                  </Box>
                                )}
                                {o.cancelledAt && (
                                  <Box>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700 }}>
                                      İptal
                                    </Typography>
                                    <Typography sx={{ fontSize: 12, fontFamily: 'monospace', color: 'error.main' }}>
                                      {format(new Date(o.cancelledAt), 'dd MMM yyyy HH:mm', { locale: tr })}
                                    </Typography>
                                  </Box>
                                )}
                              </Stack>

                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700, mb: 1, display: 'block' }}>
                                Bilet Kalemleri ({o.totalTickets} katılımcı)
                              </Typography>
                              {o.items.length === 0 ? (
                                <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'normal' }}>
                                  Bilet kalemi detayı yok
                                </Typography>
                              ) : (
                                <Table size="small" sx={{ '& .MuiTableCell-root': { py: 0.5, fontSize: 11 } }}>
                                  <TableHead>
                                    <TableRow>
                                      <TableCell sx={{ color: 'text.secondary', fontWeight: 700 }}>Bilet Tipi</TableCell>
                                      <TableCell align="center" sx={{ color: 'text.secondary', fontWeight: 700 }}>Adet</TableCell>
                                      <TableCell align="right" sx={{ color: 'text.secondary', fontWeight: 700 }}>Birim</TableCell>
                                      <TableCell align="right" sx={{ color: 'text.secondary', fontWeight: 700 }}>Ara Toplam</TableCell>
                                      <TableCell sx={{ color: 'text.secondary', fontWeight: 700 }}>Koltuk</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {o.items.map((it, i) => (
                                      <TableRow key={i}>
                                        <TableCell>
                                          <Stack direction="row" spacing={0.5} alignItems="center">
                                            <TicketIcon sx={{ fontSize: 13, color: 'primary.main' }} />
                                            <Typography variant="body2" sx={{ fontSize: 11, fontWeight: 600 }}>
                                              {it.ticketTypeName || '—'}
                                            </Typography>
                                          </Stack>
                                        </TableCell>
                                        <TableCell align="center" sx={{ fontFamily: 'monospace' }}>{it.quantity}</TableCell>
                                        <TableCell align="right" sx={{ fontFamily: 'monospace' }}>
                                          {it.unitPrice.toLocaleString('tr-TR')} ₺
                                        </TableCell>
                                        <TableCell align="right" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                                          {(it.unitPrice * it.quantity).toLocaleString('tr-TR')} ₺
                                        </TableCell>
                                        <TableCell sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                                          {it.seatId || '—'}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              )}
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </>
                  );
                })}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={filteredOrders.length}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
              rowsPerPageOptions={[25, 50, 100]}
              labelRowsPerPage="Sayfa başı"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
            />
          </>
        )}
      </Paper>
    </Stack>
  );
}
