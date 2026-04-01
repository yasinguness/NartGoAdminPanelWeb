import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Stack,
  Button,
  Chip,
  TextField,
  Divider,
  MenuItem,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  IconButton,
  Skeleton,
  Alert,
} from '@mui/material';
import { adminOperationsService } from '../../../services/admin/adminOperationsService';
import {
  Search as SearchIcon,
  WarningAmber as WarningIcon,
  ReceiptLong as ReceiptIcon,
  ConfirmationNumber as TicketIcon,
  Category as CategoryIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import { AdminTicketOverrideAction } from '../../../types/admin/adminOperations';

export interface InteractiveOrderManagementProps {
  eventId: string;
  eventName: string;
  onBulkCancelRefund?: (orderIds: string[], reason: string) => Promise<void>;
  onCancelAll?: (reason: string) => Promise<void>;
  onRefundOrder?: (orderId: string, reason: string) => Promise<void>;
  onTicketOverride?: (ticketId: string, action: AdminTicketOverrideAction, reason: string) => Promise<void>;
  onUpdateCategoryCapacity?: (categoryId: string, capacity: number, reason: string) => Promise<void>;
}

interface OrderData {
  id: string;
  customerName: string;
  date: string;
  amount: number;
  status: 'PAID' | 'REFUNDED' | 'CANCELLED';
  ticketCount: number;
}

export default function InteractiveOrderManagement({
  eventId,
  eventName,
  onBulkCancelRefund,
  onCancelAll,
  onRefundOrder,
  onTicketOverride,
  onUpdateCategoryCapacity,
}: InteractiveOrderManagementProps) {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    let cancelled = false;
    const fetchOrders = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await adminOperationsService.getOrders(eventId);
        if (!cancelled) {
          const data = (response.data as any[]) ?? [];
          setOrders(data.map((o: any) => ({
            id: o.id ?? o.orderId ?? '',
            customerName: o.customerName ?? o.buyerName ?? '',
            date: o.date ?? o.createdAt ?? '',
            amount: o.amount ?? o.totalAmount ?? 0,
            status: o.status ?? 'PAID',
            ticketCount: o.ticketCount ?? o.tickets?.length ?? 0,
          })));
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message ?? 'Siparişler yüklenirken hata oluştu');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchOrders();
    return () => { cancelled = true; };
  }, [eventId]);

  // Dialog state
  const [cancelAllOpen, setCancelAllOpen] = useState(false);
  const [cancelAllReason, setCancelAllReason] = useState('');

  // Right Panel specific states
  const [singleTicketId, setSingleTicketId] = useState('');
  const [ticketAction, setTicketAction] = useState<AdminTicketOverrideAction>('REFUND');
  const [ticketReason, setTicketReason] = useState('');

  const [categoryId, setCategoryId] = useState('');
  const [categoryCapacity, setCategoryCapacity] = useState<number>(0);
  const [categoryReason, setCategoryReason] = useState('');

  const filteredOrders = orders.filter(
    (o) =>
      o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedOrders(filteredOrders.map((o) => o.id));
    } else {
      setSelectedOrders([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedOrders((prev) =>
      prev.includes(id) ? prev.filter((o) => o !== id) : [...prev, id]
    );
  };

  const handleBulkAction = async () => {
    if (selectedOrders.length === 0 || !reason.trim()) return;
    if (selectedOrders.length === 1 && onRefundOrder) {
      await onRefundOrder(selectedOrders[0], reason);
    } else if (onBulkCancelRefund) {
      await onBulkCancelRefund(selectedOrders, reason);
    }
    setSelectedOrders([]);
    setReason('');
  };

  const handleCancelAll = async () => {
    if (!cancelAllReason.trim()) return;
    if (onCancelAll) {
      await onCancelAll(cancelAllReason);
    }
    setCancelAllOpen(false);
    setCancelAllReason('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'success';
      case 'REFUNDED':
        return 'warning';
      case 'CANCELLED':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ p: 1, backgroundColor: 'background.default', minHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Meta Bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, p: 2, bgcolor: 'white', borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
        <Box>
          <Typography variant="h6" fontWeight={700} color="primary.main">{eventName || 'Event Orders'}</Typography>
          <Typography variant="body2" color="text.secondary">Satış ve Sipariş Yönetimi</Typography>
        </Box>
        <Stack direction="row" spacing={3} alignItems="center">
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="caption" color="text.secondary">Toplam Ciro</Typography>
            <Typography variant="subtitle1" fontWeight={700} color="success.main">{orders.reduce((sum, o) => sum + o.amount, 0).toLocaleString('tr-TR')} ₺</Typography>
          </Box>
          <Divider orientation="vertical" flexItem />
          <Button 
            variant="outlined" 
            color="error" 
            startIcon={<WarningIcon />}
            onClick={() => setCancelAllOpen(true)}
            sx={{ fontWeight: 600, borderWidth: 2, '&:hover': { borderWidth: 2 } }}
          >
            TÜMÜNÜ İPTAL ET
          </Button>
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>
      )}

      <Grid container spacing={3} sx={{ flex: 1 }}>

        {/* LEFT PANEL: DATA TABLE */}
        <Grid item xs={12} lg={8}>
          <Paper elevation={0} sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'white', borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
            
            {/* Table Toolbar */}
            <Box sx={{ p: 3, borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: selectedOrders.length > 0 ? '#e3f2fd' : 'transparent', transition: 'background-color 0.2s' }}>
              {selectedOrders.length > 0 ? (
                <>
                  <Typography variant="subtitle1" color="primary.main" fontWeight={600}>
                    {selectedOrders.length} sipariş seçili
                  </Typography>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <TextField 
                      size="small" 
                      placeholder="Neden? (Zorunlu)" 
                      value={reason} 
                      onChange={(e) => setReason(e.target.value)} 
                      sx={{ bgcolor: 'white', '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                    <Button 
                      variant="contained" 
                      color="primary" 
                      disableElevation 
                      disabled={!reason.trim()}
                      onClick={handleBulkAction}
                    >
                      SEÇİLİLERİ İADE ET
                    </Button>
                  </Stack>
                </>
              ) : (
                <>
                  <Typography variant="subtitle1" fontWeight={600}>Son Siparişler</Typography>
                  <TextField
                    size="small"
                    placeholder="İsim veya Sipariş ID Ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" />
                        </InputAdornment>
                      ),
                      sx: { borderRadius: 2, bgcolor: '#f5f7f9', '& fieldset': { border: 'none' } }
                    }}
                    sx={{ width: 300 }}
                  />
                </>
              )}
            </Box>

            {/* Table Area */}
            <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
              <Table stickyHeader size="medium">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox" sx={{ bgcolor: '#f8fafc' }}>
                      <Checkbox
                        indeterminate={selectedOrders.length > 0 && selectedOrders.length < filteredOrders.length}
                        checked={filteredOrders.length > 0 && selectedOrders.length === filteredOrders.length}
                        onChange={handleSelectAll}
                      />
                    </TableCell>
                    <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 600, color: 'text.secondary' }}>Sipariş ID</TableCell>
                    <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 600, color: 'text.secondary' }}>Müşteri</TableCell>
                    <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 600, color: 'text.secondary' }}>Tarih</TableCell>
                    <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 600, color: 'text.secondary', align: 'center' }}>Biletler</TableCell>
                    <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 600, color: 'text.secondary' }}>Tutar</TableCell>
                    <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 600, color: 'text.secondary' }}>Durum</TableCell>
                    <TableCell sx={{ bgcolor: '#f8fafc' }}></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={`skeleton-${i}`}>
                        <TableCell padding="checkbox"><Skeleton variant="rectangular" width={20} height={20} /></TableCell>
                        <TableCell><Skeleton width={80} /></TableCell>
                        <TableCell><Skeleton width={120} /></TableCell>
                        <TableCell><Skeleton width={100} /></TableCell>
                        <TableCell><Skeleton width={30} /></TableCell>
                        <TableCell><Skeleton width={60} /></TableCell>
                        <TableCell><Skeleton width={70} /></TableCell>
                        <TableCell><Skeleton width={24} /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 8, color: 'text.secondary' }}>
                        Hiçbir sipariş bulunamadı.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((order) => {
                      const isSelected = selectedOrders.includes(order.id);
                      return (
                        <TableRow key={order.id} hover selected={isSelected} sx={{ '&.Mui-selected': { bgcolor: '#e3f2fd33' } }}>
                          <TableCell padding="checkbox">
                            <Checkbox checked={isSelected} onChange={() => handleSelectOne(order.id)} />
                          </TableCell>
                          <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600, color: '#1976d2' }}>{order.id}</TableCell>
                          <TableCell>{order.customerName}</TableCell>
                          <TableCell sx={{ color: 'text.secondary' }}>{order.date}</TableCell>
                          <TableCell align="center">
                            <Box sx={{ display: 'inline-flex', alignItems: 'center', bgcolor: '#f1f5f9', px: 1.5, py: 0.5, borderRadius: 2 }}>
                              <ReceiptIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                              <Typography variant="body2" fontWeight={600}>{order.ticketCount}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell fontWeight={600}>{order.amount} ₺</TableCell>
                          <TableCell>
                            <Chip 
                              label={order.status} 
                              color={getStatusColor(order.status) as any} 
                              size="small" 
                              sx={{ fontWeight: 600, letterSpacing: 0.5 }} 
                            />
                          </TableCell>
                          <TableCell align="right">
                            <IconButton size="small"><MoreVertIcon fontSize="small" /></IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* RIGHT PANEL: ACTIONS */}
        <Grid item xs={12} lg={4}>
          <Stack spacing={3} sx={{ height: '100%' }}>
            
            {/* Ticket Override Tool */}
            <Paper elevation={0} sx={{ p: 4, borderRadius: 3, bgcolor: 'white', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <TicketIcon color="primary" sx={{ mr: 1.5 }} />
                <Typography variant="subtitle1" fontWeight={700}>Bilet Aksiyonu (Münferit)</Typography>
              </Box>
              <Stack spacing={2.5}>
                <TextField 
                  fullWidth 
                  size="small" 
                  label="Bilet ID" 
                  placeholder="TCK-..." 
                  value={singleTicketId}
                  onChange={(e) => setSingleTicketId(e.target.value)}
                />
                <TextField select fullWidth size="small" label="Aksiyon Tipi" value={ticketAction} onChange={(e) => setTicketAction(e.target.value as AdminTicketOverrideAction)}>
                   <MenuItem value="REFUND">İade Et (Refund)</MenuItem>
                   <MenuItem value="CANCEL">İptal Et (Cancel)</MenuItem>
                   <MenuItem value="REISSUE">Yeniden Düzenle (Reissue)</MenuItem>
                   <MenuItem value="CHECK_IN_RESET">Giriş Sıfırla (Check-in Reset)</MenuItem>
                </TextField>
                <TextField 
                  fullWidth 
                  size="small" 
                  label="Neden?" 
                  multiline 
                  rows={2}
                  value={ticketReason}
                  onChange={(e) => setTicketReason(e.target.value)}
                />
                <Button 
                  variant="contained" 
                  color="primary" 
                  fullWidth 
                  disableElevation
                  disabled={!singleTicketId || !ticketReason.trim()}
                  onClick={async () => {
                    if (onTicketOverride) await onTicketOverride(singleTicketId, ticketAction, ticketReason);
                    setSingleTicketId('');
                    setTicketReason('');
                  }}
                >
                  AKSİYONU UYGULA
                </Button>
              </Stack>
            </Paper>

            {/* Category Capacity Tool */}
            <Paper elevation={0} sx={{ p: 4, borderRadius: 3, bgcolor: 'white', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <CategoryIcon color="secondary" sx={{ mr: 1.5 }} />
                <Typography variant="subtitle1" fontWeight={700}>Kategori Kapasite Güncelleme</Typography>
              </Box>
              <Stack spacing={2.5}>
                <Grid container spacing={2}>
                  <Grid item xs={8}>
                    <TextField 
                      fullWidth 
                      size="small" 
                      label="Kategori ID" 
                      placeholder="CAT-..." 
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField 
                      fullWidth 
                      type="number" 
                      size="small" 
                      label="Kapasite" 
                      value={categoryCapacity}
                      onChange={(e) => setCategoryCapacity(Number(e.target.value))}
                    />
                  </Grid>
                </Grid>
                <TextField 
                  fullWidth 
                  size="small" 
                  label="Neden?" 
                  value={categoryReason}
                  onChange={(e) => setCategoryReason(e.target.value)}
                />
                <Button 
                  variant="outlined" 
                  color="secondary" 
                  fullWidth 
                  disabled={!categoryId || !categoryReason.trim()}
                  onClick={async () => {
                    if (onUpdateCategoryCapacity) await onUpdateCategoryCapacity(categoryId, categoryCapacity, categoryReason);
                    setCategoryId('');
                    setCategoryReason('');
                    setCategoryCapacity(0);
                  }}
                >
                  KAPASİTEYİ GÜNCELLE
                </Button>
              </Stack>
            </Paper>

          </Stack>
        </Grid>
      </Grid>

      {/* Cancel All Dialog */}
      <Dialog open={cancelAllOpen} onClose={() => setCancelAllOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: 'error.main', fontWeight: 700, display: 'flex', alignItems: 'center' }}>
          <WarningIcon sx={{ mr: 1 }} /> Kritik İşlem Uyarısı
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2, fontWeight: 600, color: 'text.primary' }}>
            Etkinlikteki TÜM SİPARİŞLERİ İPTAL EDİYORSUNUZ!
          </DialogContentText>
          <DialogContentText sx={{ mb: 3 }}>
            Bu işlem geri alınamaz. Etkinliğe bağlı bütün müşteri siparişleri ve biletleri iptal edilmek üzere kuyruğa alınacaktır. Eğer eminseniz "Neden" belirterek işlemi onaylayın.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Tümünü İptal Nedeniniz (Zorunlu)"
            fullWidth
            variant="outlined"
            required
            value={cancelAllReason}
            onChange={(e) => setCancelAllReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => setCancelAllOpen(false)} color="inherit" sx={{ fontWeight: 600 }}>Vazgeç</Button>
          <Button 
            onClick={handleCancelAll} 
            color="error" 
            variant="contained" 
            disableElevation 
            disabled={!cancelAllReason.trim()}
            sx={{ fontWeight: 600 }}
          >
            TÜMÜNÜ İPTAL ET
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
