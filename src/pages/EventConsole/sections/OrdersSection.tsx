import { useState, useEffect, useMemo } from 'react';
import {
  Paper, Typography, Stack, Box, Chip, Grid, alpha, useTheme,
  Table, TableBody, TableCell, TableHead, TableRow, TextField, InputAdornment,
  ToggleButtonGroup, ToggleButton, TablePagination,
} from '@mui/material';
import { ShoppingCartCheckout as OrderIcon, Search as SearchIcon } from '@mui/icons-material';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { EventResponseDTO } from '../../../types/events/eventModel';
import { ticketService } from '../../../services/ticket/ticketService';
import { SectionListSkeleton, SectionEmpty } from './_shared';

interface OrderRow {
  id: string;
  customerName?: string;
  userEmail?: string;
  totalAmount: number;
  currency: string;
  status: string;
  createdAt: string;
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
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  useEffect(() => {
    setLoading(true);
    ticketService.getEventOrders(event.id)
      .then(res => {
        if (res.success && res.data) {
          setOrders(res.data.map((o: any) => ({
            id: o.id,
            customerName: o.customerName,
            userEmail: o.userEmail,
            totalAmount: Number(o.totalAmount) || 0,
            currency: o.currency || 'TRY',
            status: o.status || 'PENDING',
            createdAt: o.createdAt,
          })));
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
        const haystack = [o.id, o.customerName, o.userEmail].filter(Boolean).join(' ').toLowerCase();
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
  }), [orders]);

  // Filtre değişince sayfalama sıfırla
  useEffect(() => { setPage(0); }, [filter, search]);

  if (loading) return <SectionListSkeleton rows={6} />;
  if (orders.length === 0) {
    return <SectionEmpty icon={<OrderIcon sx={{ fontSize: 40 }} />} title="Henüz sipariş yok" message="İlk bilet satışında burada görünecek" />;
  }

  const paginated = filteredOrders.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  return (
    <Stack spacing={2}>
      {/* Özet kartlar */}
      <Grid container spacing={2}>
        {[
          { label: 'Toplam Sipariş', value: stats.total, color: 'text.primary' },
          { label: 'Ödenen', value: stats.paid, color: 'success.main' },
          { label: 'Beklemede', value: stats.pending, color: 'warning.main' },
          { label: 'Toplam Gelir', value: `${stats.revenue.toLocaleString('tr-TR')} ₺`, color: 'primary.main' },
        ].map(s => (
          <Grid item xs={6} md={3} key={s.label}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700 }}>
                {s.label}
              </Typography>
              <Typography sx={{ fontFamily: 'serif', fontStyle: 'italic', fontSize: 24, fontWeight: 700, color: s.color, mt: 0.5 }}>
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
            placeholder="ID, müşteri, e-posta ara..."
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
                  <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Tarih</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Müşteri</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>E-posta</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 11 }} align="right">Tutar</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 11 }} align="center">Durum</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginated.map(o => (
                  <TableRow key={o.id} hover>
                    <TableCell sx={{ fontSize: 12 }}>
                      {o.createdAt ? format(new Date(o.createdAt), 'dd MMM HH:mm', { locale: tr }) : '—'}
                    </TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{o.customerName || 'Anonim'}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{o.userEmail || '—'}</TableCell>
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
                  </TableRow>
                ))}
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
