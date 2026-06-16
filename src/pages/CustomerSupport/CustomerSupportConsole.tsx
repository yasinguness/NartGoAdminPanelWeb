import { useState } from 'react';
import { customerSupportService } from '../../services/customer-support/customerSupport.service';
import {
  Box, Typography, Paper, Stack, Button, TextField, InputAdornment,
  Avatar, CircularProgress, Table, TableBody, TableCell,
  TableHead, TableRow, Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, alpha, useTheme,
} from '@mui/material';
import {
  Search as SearchIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Send as SendIcon,
  MoneyOff as RefundIcon,
  ConfirmationNumber as TicketIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useSnackbar } from 'notistack';
import { PageContainer } from '../../components/Page';

const STATUS: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Aktif', color: '#10b981' },
  CHECKED_IN: { label: 'Giriş Yaptı', color: '#3b82f6' },
  USED: { label: 'Kullanildi', color: '#64748b' },
  CANCELLED: { label: 'Iptal', color: '#ef4444' },
  REFUNDED: { label: 'Iade Edildi', color: '#f59e0b' },
  CREATED: { label: 'Oluşturuldu', color: '#64748b' },
};

const ORDER_STATUS: Record<string, { label: string; color: string }> = {
  PAID: { label: 'Odendi', color: '#10b981' },
  COMPLETED: { label: 'Tamamlandi', color: '#10b981' },
  REFUNDED: { label: 'Iade Edildi', color: '#f59e0b' },
  CANCELLED: { label: 'Iptal', color: '#ef4444' },
  PENDING: { label: 'Bekliyor', color: '#64748b' },
};

export default function CustomerSupportConsole() {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();

  const [searchQuery, setSearchQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Iade dialog
  const [refundDialog, setRefundDialog] = useState(false);
  const [refundOrder, setRefundOrder] = useState<any>(null);
  const [refundNote, setRefundNote] = useState('');

  // Bilet yeniden gonderme dialog
  const [resendTicket, setResendTicket] = useState<any>(null);

  const performSearch = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setLoading(true);
    setHasSearched(true);
    setCustomer(null);
    try {
      const results = await customerSupportService.searchCustomer(q);
      const list = results?.data ?? results ?? [];
      if (Array.isArray(list) && list.length > 0) {
        setCustomer(list[0]);
      }
    } catch {
      enqueueSnackbar('Arama başarısız', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleResendTicket = async () => {
    if (!customer || !resendTicket) return;
    setActionLoading(true);
    try {
      await customerSupportService.resendTicketAction(customer.id, resendTicket.orderId);
      enqueueSnackbar('Bilet e-posta olarak yeniden gonderildi', { variant: 'success' });
      setResendTicket(null);
    } catch {
      enqueueSnackbar('Gönderim başarısız', { variant: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefund = async () => {
    if (!customer || !refundOrder) return;
    setActionLoading(true);
    try {
      await customerSupportService.refundOrder(customer.id, refundOrder.orderId, refundNote || undefined);
      enqueueSnackbar('İade işlemi başlatıldı', { variant: 'success' });
      setRefundDialog(false);
      setRefundOrder(null);
      setRefundNote('');
      // Profili yenile
      performSearch();
    } catch {
      enqueueSnackbar('İade başarısız', { variant: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const cardSx = { borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' };

  return (
    <PageContainer title="Müşteri Destek">
      {/* Baslik */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={800}>Müşteri Destek</Typography>
        <Typography variant="body2" color="text.secondary">
          E-posta, telefon veya sipariş numarası ile bilet sahibi arayın
        </Typography>
      </Box>

      {/* Arama */}
      <Paper sx={{ ...cardSx, p: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="E-posta adresi, telefon numarası veya sipariş no..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && performSearch()}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'text.secondary' }} /></InputAdornment>,
            endAdornment: (
              <InputAdornment position="end">
                <Button
                  variant="contained" disableElevation size="small"
                  onClick={performSearch}
                  disabled={loading || !searchQuery.trim()}
                  sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none', px: 3 }}
                >
                  {loading ? <CircularProgress size={18} color="inherit" /> : 'Ara'}
                </Button>
              </InputAdornment>
            ),
          }}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
        />
      </Paper>

      {/* Sonuc */}
      {loading ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <CircularProgress size={32} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Araniyor...</Typography>
        </Box>
      ) : hasSearched && !customer ? (
        <Paper sx={{ ...cardSx, p: 6, textAlign: 'center' }}>
          <Typography sx={{ fontSize: 40, mb: 1 }}>🔍</Typography>
          <Typography variant="h6" fontWeight={700} color="text.secondary">Sonuc Bulunamadi</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Farklı bir e-posta veya sipariş numarası deneyin.
          </Typography>
        </Paper>
      ) : customer ? (
        <Stack spacing={3}>
          {/* Müşteri Profili */}
          <Paper sx={{ ...cardSx, p: 3 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ sm: 'center' }}>
              <Avatar sx={{ width: 56, height: 56, bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main, fontWeight: 800, fontSize: 22 }}>
                {(customer.name || customer.email || '?')[0]?.toUpperCase()}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" fontWeight={800}>
                  {customer.name || customer.email?.split('@')[0] || 'Bilinmiyor'}
                </Typography>
                <Stack direction="row" spacing={3} sx={{ mt: 0.5 }} flexWrap="wrap">
                  {customer.email && (
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <EmailIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">{customer.email}</Typography>
                    </Stack>
                  )}
                  {customer.phone && (
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <PhoneIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">{customer.phone}</Typography>
                    </Stack>
                  )}
                </Stack>
              </Box>
              <Stack direction="row" spacing={2}>
                <Box sx={{ textAlign: 'center', px: 2 }}>
                  <Typography variant="h5" fontWeight={800} color="primary.main">
                    {customer.eventsAttended ?? customer.orderCount ?? 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>Etkinlik</Typography>
                </Box>
                <Box sx={{ textAlign: 'center', px: 2 }}>
                  <Typography variant="h5" fontWeight={800}>
                    {customer.ticketCount ?? 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>Bilet</Typography>
                </Box>
              </Stack>
            </Stack>
          </Paper>

          {/* Siparişler & Biletler */}
          <Paper sx={{ ...cardSx, overflow: 'hidden' }}>
            <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1" fontWeight={700}>Siparişler & Biletler</Typography>
            </Box>

            {(!customer.orders || customer.orders.length === 0) && (!customer.tickets || customer.tickets.length === 0) ? (
              <Box sx={{ p: 5, textAlign: 'center' }}>
                <Typography sx={{ fontSize: 36, mb: 1 }}>🎫</Typography>
                <Typography variant="body2" color="text.secondary">Bu müşteri için sipariş veya bilet bulunamadı.</Typography>
              </Box>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['Etkinlik', 'Bilet No', 'Bilet Türü', 'Koltuk', 'Durum', 'Tarih', 'İşlemler'].map(h => (
                      <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary', bgcolor: 'grey.50' }}>
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(customer.tickets || customer.orders || []).map((item: any, i: number) => {
                    const st = item.status || item.ticketStatus || '';
                    const statusInfo = STATUS[st] || ORDER_STATUS[st] || { label: st, color: '#64748b' };
                    const isCheckedIn = st === 'CHECKED_IN' || st === 'USED';
                    const isRefundable = st === 'ACTIVE' || st === 'PAID' || st === 'COMPLETED';

                    return (
                      <TableRow key={item.id || item.ticketId || i} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500} fontSize={13} sx={{ maxWidth: 200 }} noWrap>
                            {item.eventName || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" fontFamily="monospace" fontSize={11}>
                            {item.serialNo || item.ticketCode || item.orderReference || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">{item.ticketTypeName || item.ticketType || '—'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" fontFamily="monospace">
                            {item.seatInfo || item.seat || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: statusInfo.color }} />
                            <Typography variant="caption" fontWeight={600} sx={{ color: statusInfo.color }}>
                              {statusInfo.label}
                            </Typography>
                            {isCheckedIn && item.checkInTime && (
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                                ({format(new Date(item.checkInTime), 'HH:mm', { locale: tr })})
                              </Typography>
                            )}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {item.issuedAt || item.createdAt
                              ? format(new Date(item.issuedAt || item.createdAt), 'dd MMM yyyy', { locale: tr })
                              : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5}>
                            <Button
                              size="small" variant="text"
                              startIcon={<SendIcon sx={{ fontSize: 14 }} />}
                              onClick={() => setResendTicket(item)}
                              sx={{ textTransform: 'none', fontSize: 11, fontWeight: 600, minWidth: 0, px: 1 }}
                            >
                              Gönder
                            </Button>
                            {isRefundable && (
                              <Button
                                size="small" variant="text" color="error"
                                startIcon={<RefundIcon sx={{ fontSize: 14 }} />}
                                onClick={() => { setRefundOrder(item); setRefundDialog(true); }}
                                sx={{ textTransform: 'none', fontSize: 11, fontWeight: 600, minWidth: 0, px: 1 }}
                              >
                                Iade
                              </Button>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </Paper>
        </Stack>
      ) : (
        /* Bos state — ilk yukleme */
        <Paper sx={{ ...cardSx, p: 8, textAlign: 'center' }}>
          <TicketIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" fontWeight={700} color="text.secondary">Müşteri Destek</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Bilet sahibinin e-posta adresini girerek sipariş ve bilet bilgilerini görüntüleyebilirsiniz.
          </Typography>
        </Paper>
      )}

      {/* Bilet Yeniden Gönderme Dialog */}
      <Dialog open={!!resendTicket} onClose={() => setResendTicket(null)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700, pb: 0.5 }}>
          Bileti Yeniden Gönder
          <IconButton onClick={() => setResendTicket(null)} sx={{ position: 'absolute', right: 8, top: 8 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ bgcolor: alpha(theme.palette.info.main, 0.06), border: '1px solid', borderColor: alpha(theme.palette.info.main, 0.2), borderRadius: 2, p: 2, mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>{customer?.email}</strong> adresine bilet bilgileri ve QR kodu tekrar gönderilecek.
            </Typography>
            {resendTicket && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Bilet: {resendTicket.serialNo || resendTicket.ticketCode || resendTicket.orderReference}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setResendTicket(null)} variant="text" color="inherit">Vazgeç</Button>
          <Button onClick={handleResendTicket} variant="contained" disabled={actionLoading}
            startIcon={actionLoading ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
            sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 700 }}>
            Gönder
          </Button>
        </DialogActions>
      </Dialog>

      {/* Iade Dialog */}
      <Dialog open={refundDialog} onClose={() => { setRefundDialog(false); setRefundNote(''); }} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700, pb: 0.5 }}>
          Sipariş İade Et
          <IconButton onClick={() => { setRefundDialog(false); setRefundNote(''); }} sx={{ position: 'absolute', right: 8, top: 8 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ bgcolor: alpha(theme.palette.error.main, 0.06), border: '1px solid', borderColor: alpha(theme.palette.error.main, 0.2), borderRadius: 2, p: 2, mt: 1, mb: 2 }}>
            <Typography variant="body2" color="error.dark">
              <strong>Bu işlem geri alınamaz.</strong> Ödeme iyzico üzerinden iade edilecek ve bilet iptal olacak.
            </Typography>
          </Box>
          {refundOrder && (
            <Stack spacing={1} sx={{ mb: 2 }}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Müşteri</Typography>
                <Typography variant="body2" fontWeight={600}>{customer?.email}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Sipariş / Bilet</Typography>
                <Typography variant="body2" fontWeight={600} fontFamily="monospace">
                  {refundOrder.serialNo || refundOrder.orderReference || '—'}
                </Typography>
              </Stack>
              {refundOrder.totalAmount && (
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Tutar</Typography>
                  <Typography variant="body2" fontWeight={800} color="error.main">
                    ₺{Number(refundOrder.totalAmount).toLocaleString('tr-TR')}
                  </Typography>
                </Stack>
              )}
            </Stack>
          )}
          <TextField
            fullWidth multiline rows={2}
            label="İade Sebebi (Opsiyonel)"
            placeholder="Müşteri talebi, teknik sorun vs..."
            value={refundNote}
            onChange={e => setRefundNote(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => { setRefundDialog(false); setRefundNote(''); }} variant="text" color="inherit">Vazgeç</Button>
          <Button onClick={handleRefund} variant="contained" color="error" disabled={actionLoading}
            startIcon={actionLoading ? <CircularProgress size={16} color="inherit" /> : <RefundIcon />}
            sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 700 }}>
            Iade Et
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}
