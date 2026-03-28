import React, { useState, useEffect } from 'react';
import { salesCommandService } from '../../services/sales/salesCommand.service';
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
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Drawer,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  WarningAmber as WarningIcon,
  CreditCard as PaymentIcon,
  LocalActivity as TicketIcon,
  Computer as WebIcon,
  Storefront as RetailIcon,
  PhoneIphone as AppIcon,
  Timeline as TimelineIcon,
  AdminPanelSettings as AdminIcon,
  SwapHoriz as RefundIcon,
  VerifiedUser as SuccessIcon,
} from '@mui/icons-material';

import { PageContainer } from '../../components/Page';

// Color language as requested: success green, risk amber, fraud/error red, admin mutation blue
const COLORS = {
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  admin: '#3b82f6',
  neutral: '#64748b'
};

const mockChannels = [
  { name: 'Web', percent: 55, color: '#3b82f6', icon: <WebIcon fontSize="small" /> },
  { name: 'Mobile App', percent: 30, color: '#8b5cf6', icon: <AppIcon fontSize="small" /> },
  { name: 'Box Office (Gişe)', percent: 15, color: '#10b981', icon: <RetailIcon fontSize="small" /> },
];

const mockRecentOrders = [
  { id: 'ORD-991A', time: '14:25', customer: 'Can Y.', amount: 450, status: 'PAID', channel: 'Web', tickets: 2, risk: 'LOW' },
  { id: 'ORD-442B', time: '14:21', customer: 'Ayşe K.', amount: 150, status: 'PAID', channel: 'Mobile App', tickets: 1, risk: 'LOW' },
  { id: 'ORD-115C', time: '14:10', customer: 'Bilinmeyen', amount: 900, status: 'FRAUD_ALERT', channel: 'Web', tickets: 4, risk: 'HIGH' },
  { id: 'ORD-882D', time: '13:55', customer: 'Gişe Müşteri', amount: 300, status: 'PAID', channel: 'Box Office', tickets: 2, risk: 'LOW' },
  { id: 'ORD-332E', time: '13:42', customer: 'Mehmet Y.', amount: 600, status: 'REFUNDED', channel: 'Mobile App', tickets: 3, risk: 'LOW' },
  { id: 'ORD-901F', time: '13:15', customer: 'Admin', amount: 0, status: 'ADMIN_HOLD', channel: 'Backend', tickets: 10, risk: 'LOW' },
  { id: 'ORD-451G', time: '13:00', customer: 'Ahmet D.', amount: 750, status: 'PAID', channel: 'Web', tickets: 5, risk: 'MEDIUM' },
];

const mockTimeline = [
  { time: '14:26:00', action: 'Bilet Email Gönderildi', actor: 'System', color: COLORS.neutral },
  { time: '14:25:05', action: 'Ödeme Onaylandı (Iyzico)', actor: 'Payment Gateway', color: COLORS.success },
  { time: '14:24:10', action: 'Koltuklar Kilitlendi (Hold 5 dk)', actor: 'Can Y.', color: COLORS.neutral },
  { time: '14:22:30', action: 'Kategori Seçimi (VIP: 2 Adet)', actor: 'Can Y.', color: COLORS.neutral },
];

export default function SalesCommandCenter() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    const fetchSalesData = async () => {
      try {
        setLoading(true);
        const data = await salesCommandService.getOrderFeed('e-28haz');
        if (data && data.length > 0) {
          setOrders(data);
        } else {
          setOrders(mockRecentOrders);
        }
      } catch (err) {
        setOrders(mockRecentOrders);
      } finally {
        setLoading(false);
      }
    };
    fetchSalesData();
  }, []);

  const handleRowClick = (order: any) => {
    setSelectedOrder(order);
    setDrawerOpen(true);
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 'calc(100vh - 64px)', bgcolor: '#f1f5f9' }}>
      
      {/* 1. Yoğun veri odaklı üst bar (Data-heavy top bar) */}
      <Box sx={{ p: 2, bgcolor: '#ffffff', borderBottom: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
        <Typography variant="h6" fontWeight={800} sx={{ mr: 4 }}>Sales Command</Typography>
        
        <TextField select size="small" label="Event" value="e-28haz" sx={{ minWidth: 200 }}>
           <MenuItem value="e-28haz">Zorlu PSM - Yaz Konseri</MenuItem>
           <MenuItem value="e-15tem">Harbiye - Akustik Gece</MenuItem>
        </TextField>
        
        <TextField type="date" size="small" label="Tarih" defaultValue="2026-06-28" sx={{ minWidth: 150 }} InputLabelProps={{ shrink: true }} />
        
        <TextField select size="small" label="Kanal" value="ALL" sx={{ minWidth: 150 }}>
           <MenuItem value="ALL">Tüm Kanallar</MenuItem>
           <MenuItem value="WEB">Web</MenuItem>
           <MenuItem value="APP">Mobile App</MenuItem>
           <MenuItem value="BOX">Gişe (Box Office)</MenuItem>
        </TextField>

        <TextField select size="small" label="Status" value="ALL" sx={{ minWidth: 150 }}>
           <MenuItem value="ALL">Tüm Durumlar</MenuItem>
           <MenuItem value="PAID">Ödendi</MenuItem>
           <MenuItem value="REFUND">İade/İptal</MenuItem>
           <MenuItem value="FRAUD">Riskli (Fraud)</MenuItem>
        </TextField>

        <Box sx={{ flexGrow: 1 }} />
        
        <Button variant="outlined" startIcon={<RefreshIcon />} size="small" sx={{ borderColor: '#cbd5e1', color: 'text.primary', fontWeight: 600 }}>
          Last updated: Just now
        </Button>
      </Box>

      {/* 2. Sticky KPI Bandı */}
      <Box sx={{ p: 2, bgcolor: '#0f172a', color: 'white', position: 'sticky', top: 64, zIndex: 10, display: 'flex', justifyContent: 'space-between', gap: 2, overflowX: 'auto' }}>
        <KpiItem label="Gross Sales" value="₺452,100" subValue="+12% v yesterday" color={COLORS.success} />
        <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
        <KpiItem label="Occupancy" value="72.5%" subValue="1,450 / 2,000 Tickets" color={COLORS.success} />
        <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
        <KpiItem label="Sales Velocity" value="14 / hr" subValue="Peak expected in 2h" color={COLORS.success} />
        <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
        <KpiItem label="Refund Rate" value="2.7%" subValue="₺12,500 Total Ref." color={COLORS.warning} />
        <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
        <KpiItem label="Fraud Alerts" value="3" subValue="Requires manual review" color={COLORS.error} />
      </Box>

      {/* 3. Split-view çalışma (Left: Grid/Charts, Right: Drawer) */}
      <Box sx={{ display: 'flex', flex: 1, p: 3, gap: 3, overflow: 'hidden' }}>
        
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, overflow: 'auto' }}>
          
          {/* Quick Metrics Layer */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Paper elevation={0} sx={{ p: 3, borderRadius: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Kanal Bazlı Satış (Channel Split)</Typography>
                <Box sx={{ display: 'flex', height: 40, bgcolor: '#f1f5f9', borderRadius: 2, overflow: 'hidden', mb: 2 }}>
                  {mockChannels.map(ch => (
                    <Tooltip key={ch.name} title={`${ch.name}: %${ch.percent}`}>
                      <Box sx={{ width: `${ch.percent}%`, bgcolor: ch.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: '0.8rem' }}>
                        {ch.percent > 10 && `${ch.percent}%`}
                      </Box>
                    </Tooltip>
                  ))}
                </Box>
                <Stack direction="row" spacing={3} sx={{ mt: 'auto', flexWrap: 'wrap' }}>
                  {mockChannels.map(ch => (
                     <Box key={ch.name} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 12, height: 12, borderRadius: 1, bgcolor: ch.color }} />
                        <Typography variant="body2" color="text.secondary" fontWeight={600}>{ch.name}</Typography>
                     </Box>
                  ))}
                </Stack>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper elevation={0} sx={{ p: 3, borderRadius: 3, height: '100%' }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Canlı Aksiyon (Live Stream)</Typography>
                <Stack spacing={1.5}>
                   <LiveStreamItem text="VIP 1. Sıra Satıldı (ORD-991A)" time="2 sn önce" color={COLORS.success} />
                   <LiveStreamItem text="Fraud Yakalandı (ORD-115C)" time="11 dk önce" color={COLORS.error} />
                   <LiveStreamItem text="Admin kapasite +20 (e-28haz)" time="1 sa önce" color={COLORS.admin} />
                   <LiveStreamItem text="Gişe iade (ORD-332E)" time="1.5 sa önce" color={COLORS.warning} />
                </Stack>
              </Paper>
            </Grid>
          </Grid>

          {/* Powerful Table Experience */}
          <Paper elevation={0} sx={{ borderRadius: 3, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Contextual Toolbar */}
            <Box sx={{ p: 2, bgcolor: selectedIds.length > 0 ? '#e0f2fe' : 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s' }}>
              {selectedIds.length > 0 ? (
                <>
                  <Typography variant="subtitle1" fontWeight={700} color="#0369a1">{selectedIds.length} Sipariş Seçili</Typography>
                  <Stack direction="row" spacing={1}>
                    <Button variant="contained" size="small" disableElevation sx={{ bgcolor: COLORS.admin }}>Toplu İade (Bulk Refund)</Button>
                    <Button variant="outlined" size="small" sx={{ color: COLORS.neutral, borderColor: COLORS.neutral }}>Etiket Ver</Button>
                  </Stack>
                </>
              ) : (
                <>
                  <Typography variant="h6" fontWeight={700}>Sipariş Akışı (Order Feed)</Typography>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <TextField 
                      size="small" 
                      placeholder="Sipariş Seç, Ara..." 
                      sx={{ bgcolor: '#f8fafc', width: 250, '& fieldset': { border: 'none' } }}
                      InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
                    />
                    <IconButton size="small"><FilterIcon /></IconButton>
                  </Stack>
                </>
              )}
            </Box>
            
            <TableContainer sx={{ flex: 1 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox" sx={{ bgcolor: '#f8fafc' }}>
                      <Checkbox 
                        indeterminate={selectedIds.length > 0 && selectedIds.length < orders.length}
                        checked={selectedIds.length === orders.length}
                        onChange={(e) => setSelectedIds(e.target.checked ? orders.map(o => o.id) : [])}
                      />
                    </TableCell>
                    <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 700 }}>Order ID</TableCell>
                    <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 700 }}>Time</TableCell>
                    <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 700 }}>Customer</TableCell>
                    <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 700, align: 'center' }}>Qty</TableCell>
                    <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 700 }}>Amount</TableCell>
                    <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 700 }}>Channel</TableCell>
                    <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 700 }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {orders.map(order => {
                    const isSelected = selectedIds.includes(order.id);
                    let rowColor = 'transparent';
                    if (order.status === 'FRAUD_ALERT') rowColor = '#fef2f2'; // light red
                    if (order.status === 'ADMIN_HOLD') rowColor = '#eff6ff'; // light blue
                    if (order.status === 'REFUNDED') rowColor = '#fffbeb'; // light amber
                    
                    return (
                      <TableRow 
                        key={order.id} 
                        hover
                        selected={isSelected}
                        onClick={() => handleRowClick(order)}
                        sx={{ cursor: 'pointer', bgcolor: isSelected ? '#e0f2fe !important' : rowColor, '& td': { borderColor: '#f1f5f9' } }}
                      >
                        <TableCell padding="checkbox">
                           <Checkbox checked={isSelected} onClick={(e) => toggleSelect(order.id, e)} />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600, fontFamily: 'monospace' }}>{order.id}</TableCell>
                        <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>{order.time}</TableCell>
                        <TableCell>{order.customer}</TableCell>
                        <TableCell align="center">
                           <Chip size="small" label={order.tickets} sx={{ height: 20, bgcolor: '#f1f5f9', fontWeight: 600 }} />
                        </TableCell>
                        <TableCell fontWeight={600}>₺{order.amount}</TableCell>
                        <TableCell>
                           {order.channel === 'Web' && <WebIcon fontSize="small" sx={{ color: '#3b82f6', verticalAlign: 'middle', mr: 0.5 }} />}
                           {order.channel === 'Mobile App' && <AppIcon fontSize="small" sx={{ color: '#8b5cf6', verticalAlign: 'middle', mr: 0.5 }} />}
                           {order.channel === 'Box Office' && <RetailIcon fontSize="small" sx={{ color: '#10b981', verticalAlign: 'middle', mr: 0.5 }} />}
                           <Typography variant="caption" color="text.secondary">{order.channel}</Typography>
                        </TableCell>
                        <TableCell>
                           <StatusChip status={order.status} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
        
        {/* RIGHT DRAWER: Split View Detailed Drawer */}
        <Drawer
          anchor="right"
          variant="persistent"
          open={isDrawerOpen}
          sx={{ '& .MuiDrawer-paper': { width: 420, position: 'relative', borderLeft: '1px solid #e2e8f0', boxShadow: '-4px 0 20px rgba(0,0,0,0.05)' } }}
        >
          {selectedOrder ? (
            <Box sx={{ p: 4, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                 <Box>
                    <Typography variant="h5" fontWeight={800} sx={{ fontFamily: 'monospace' }}>{selectedOrder.id}</Typography>
                    <Typography variant="body2" color="text.secondary">Order Details & Timeline</Typography>
                 </Box>
                 <IconButton onClick={() => setDrawerOpen(false)} size="small" sx={{ bgcolor: '#f1f5f9' }}>
                    <CloseIcon fontSize="small" />
                 </IconButton>
              </Box>
              
              <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
                <StatusChip status={selectedOrder.status} />
                {selectedOrder.risk === 'HIGH' && <Chip size="small" label="HIGH RISK" color="error" variant="outlined" />}
              </Box>

              <Grid container spacing={2} sx={{ mb: 4 }}>
                 <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">CUSTOMER</Typography>
                    <Typography variant="body2" fontWeight={600}>{selectedOrder.customer}</Typography>
                 </Grid>
                 <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">TOTAL AMOUNT</Typography>
                    <Typography variant="body2" fontWeight={800} color={COLORS.success}>₺{selectedOrder.amount}</Typography>
                 </Grid>
                 <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">CHANNEL</Typography>
                    <Typography variant="body2" fontWeight={600}>{selectedOrder.channel}</Typography>
                 </Grid>
                 <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">TICKETS</Typography>
                    <Typography variant="body2" fontWeight={600}>{selectedOrder.tickets} x VIP Category</Typography>
                 </Grid>
              </Grid>

              <Divider sx={{ mb: 4 }} />

              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 3 }}>Sipariş Yaşam Döngüsü (Timeline)</Typography>

              <Box sx={{ flex: 1, position: 'relative' }}>
                 {/* Timeline Line */}
                 <Box sx={{ position: 'absolute', top: 10, bottom: 20, left: 11, width: 2, bgcolor: '#e2e8f0' }} />
                 
                 <Stack spacing={3}>
                   {mockTimeline.map((ev, i) => (
                     <Box key={i} sx={{ position: 'relative', display: 'flex', pl: 4 }}>
                        <Box sx={{ position: 'absolute', left: 7, top: 4, width: 10, height: 10, borderRadius: '50%', bgcolor: ev.color, border: '2px solid white', boxShadow: '0 0 0 1px #e2e8f0' }} />
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{ev.action}</Typography>
                          <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                            <Typography variant="caption" color="text.disabled" fontWeight={600}>{ev.time}</Typography>
                            <Typography variant="caption" color="text.secondary">· {ev.actor}</Typography>
                          </Stack>
                        </Box>
                     </Box>
                   ))}
                 </Stack>
              </Box>

              {/* Action Bar Bottom */}
              <Box sx={{ mt: 'auto', display: 'flex', gap: 2, pt: 3, borderTop: '1px solid #f1f5f9' }}>
                 <Button variant="contained" fullWidth disableElevation sx={{ bgcolor: COLORS.admin }} startIcon={<AdminIcon />}>
                   Yönet/Override
                 </Button>
                 {selectedOrder.status !== 'REFUNDED' && (
                   <Button variant="outlined" color="error" fullWidth>
                     İade Et (Refund)
                   </Button>
                 )}
              </Box>
            </Box>
          ) : null}
        </Drawer>
      </Box>
    </Box>
  );

  function KpiItem({ label, value, subValue, color }: { label: string, value: string, subValue: string, color: string }) {
    return (
      <Box sx={{ minWidth: 200, display: 'flex', flexDirection: 'column' }}>
        <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>{label}</Typography>
        <Typography variant="h4" sx={{ color: 'white', fontWeight: 800, mt: 0.5, mb: 0.5 }}>{value}</Typography>
        <Typography variant="caption" sx={{ color, fontWeight: 700 }}>{subValue}</Typography>
      </Box>
    );
  }

  function LiveStreamItem({ text, time, color }: { text: string, time: string, color: string }) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
        <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }}>{text}</Typography>
        <Typography variant="caption" sx={{ color: '#94a3b8', whiteSpace: 'nowrap' }}>{time}</Typography>
      </Box>
    );
  }

  function StatusChip({ status }: { status: string }) {
    let color = COLORS.neutral;
    let label = status;
    let icon = null;

    if (status === 'PAID') { color = COLORS.success; label = 'YÖNLENDİRİLDİ (PAID)'; icon = <SuccessIcon sx={{ fontSize: 14 }} />; }
    if (status === 'REFUNDED') { color = COLORS.warning; icon = <RefundIcon sx={{ fontSize: 14 }} />; }
    if (status === 'FRAUD_ALERT') { color = COLORS.error; label = 'FRAUD RISK'; icon = <WarningIcon sx={{ fontSize: 14 }} />; }
    if (status === 'ADMIN_HOLD') { color = COLORS.admin; icon = <AdminIcon sx={{ fontSize: 14 }} />; }

    return (
      <Chip 
        icon={icon}
        label={label} 
        size="small" 
        sx={{ 
          bgcolor: color + '15', 
          color: color, 
          fontWeight: 700, 
          borderRadius: 1, 
          fontSize: '0.7rem',
          '& .MuiChip-icon': { color: color, ml: 1 }
        }} 
      />
    );
  }
}
