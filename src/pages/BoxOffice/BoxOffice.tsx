import React, { useState, useEffect } from 'react';
import { boxOfficeService } from '../../services/box-office/boxOffice.service';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Stack,
  Button,
  TextField,
  Divider,
  MenuItem,
  InputAdornment,
  Avatar,
  IconButton,
  Chip,
  RadioGroup,
  FormControlLabel,
  Radio,
  Badge,
} from '@mui/material';
import {
  Search as SearchIcon,
  PointOfSale as PosIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  ShoppingCart as CartIcon,
  CreditCard as CardIcon,
  Money as CashIcon,
  HistoryToggleOff as ReserveIcon,
  CardGiftcard as PromoIcon,
  LocalPrintshop as PrintIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Person as PersonIcon,
  AccountCircle as OperatorIcon,
} from '@mui/icons-material';


export default function BoxOffice() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerMode, setCustomerMode] = useState<'GUEST' | 'SEARCH'>('GUEST');
  const [customerPhone, setCustomerPhone] = useState('');
  
  const [cart, setCart] = useState<Record<string, number>>({});
  
  const [paymentType, setPaymentType] = useState('CREDIT');
  const [deliveryType, setDeliveryType] = useState('PRINT');
  const [promoCode, setPromoCode] = useState('');

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const data = await boxOfficeService.getAvailableCategories('e-28haz');
        setCategories(data || []);
      } catch (err) {
        console.error('Failed to fetch categories', err);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  const updateCart = (catId: string, delta: number) => {
    setCart(prev => {
      const current = prev[catId] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[catId];
        return copy;
      }
      return { ...prev, [catId]: next };
    });
  };

  const currentCategories = categories;
  const totalTickets = Object.values(cart).reduce((a, b) => a + b, 0);
  const subtotal = Object.entries(cart).reduce((acc, [catId, qty]) => {
    const cat = currentCategories.find(c => c.id === catId);
    return acc + (cat ? cat.price * qty : 0);
  }, 0);

  const isPromoType = paymentType === 'COMPLIMENTARY';
  const total = isPromoType ? 0 : subtotal;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 'calc(100vh - 64px)', bgcolor: '#f1f5f9' }}>
      
      {/* 1. POS Top Bar (Operator & Mode) */}
      <Box sx={{ p: 2, bgcolor: '#ffffff', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 3, alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: '#334155', color: 'white', px: 2, py: 1, borderRadius: 2 }}>
          <OperatorIcon sx={{ mr: 1, fontSize: 20 }} />
          <Typography variant="subtitle2" fontWeight={700}>Gişe: G-04 (Terminal)</Typography>
        </Box>
        <Divider orientation="vertical" flexItem sx={{ borderRightWidth: 2 }} />
        
        <Box sx={{ flex: 1, display: 'flex', gap: 2 }}>
          <TextField select size="small" label="Satış Modu" defaultValue="NEW" sx={{ minWidth: 200 }}>
             <MenuItem value="NEW">Yeni Bilet Satışı</MenuItem>
             <MenuItem value="PICKUP">Rezervasyon / Teslimat</MenuItem>
          </TextField>
          <TextField select size="small" label="Etkinlik Kapsamı" defaultValue="e-28haz" sx={{ minWidth: 300 }}>
             <MenuItem value="e-28haz">28 Haziran - Zorlu PSM Yaz Konseri</MenuItem>
             <MenuItem value="e-15tem">15 Temmuz - Harbiye Akustik Gece</MenuItem>
          </TextField>
        </Box>
        
        <Typography variant="h6" fontWeight={800} color="text.secondary" sx={{ letterSpacing: 1 }}>GİŞE</Typography>
      </Box>

      {/* 2. Split-view çalışma (Left: POS Operations, Right: Cart/Summary) */}
      <Box sx={{ display: 'flex', flex: 1, p: 3, gap: 3, overflow: 'hidden' }}>
        
        {/* LEFT PANEL: Customer & Inventory */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, overflow: 'auto' }}>
          
          {/* Müşteri Bul / Guest */}
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight={700} sx={{ display: 'flex', alignItems: 'center' }}>
                    <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    Müşteri Bağlantısı
                </Typography>
                <RadioGroup row value={customerMode} onChange={(e) => setCustomerMode(e.target.value as any)}>
                    <FormControlLabel value="GUEST" control={<Radio size="small" />} label={<Typography variant="body2" fontWeight={600}>Hızlı Misafir (Gişe)</Typography>} />
                    <FormControlLabel value="SEARCH" control={<Radio size="small" />} label={<Typography variant="body2" fontWeight={600}>Kayıtlı Bul / Üye Yap</Typography>} />
                </RadioGroup>
            </Box>
            
            <Divider sx={{ mb: 3 }} />

            {customerMode === 'SEARCH' ? (
                <Grid container spacing={2}>
                    <Grid item xs={12} md={5}>
                        <TextField 
                            fullWidth 
                            size="small" 
                            label="Telefon Numarası veya E-Posta" 
                            placeholder="05XX VEYA ornek@ornek.com"
                            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
                        />
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <Button variant="outlined" fullWidth sx={{ height: 40, fontWeight: 600 }}>SORGULA</Button>
                    </Grid>
                    <Grid item xs={12} md={4}>
                         <Box sx={{ height: 40, bgcolor: '#f8fafc', borderRadius: 1, border: '1px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Typography variant="body2" color="text.secondary">Müşteri Seçilmedi</Typography>
                         </Box>
                    </Grid>
                </Grid>
            ) : (
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <TextField 
                            fullWidth 
                            size="small" 
                            label="Opsiyonel İletişim (SMS / E-Posta)" 
                            placeholder="Bilet gönderimi için (isteğe bağlı)"
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                         <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            Kayıtsız peşin müşteri. E-bilet yerine fiziksel basım (print) zorunludur (eğer iletişim bilgisi yoksa).
                         </Typography>
                    </Grid>
                </Grid>
            )}
          </Paper>

          {/* Bilet/Kategori Seçimi */}
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>Bilet & Kategori Seçimi (Kapasite)</Typography>
            <Grid container spacing={2}>
                {currentCategories.map((cat) => {
                    const qtyInCart = cart[cat.id] || 0;
                    return (
                        <Grid item xs={12} md={6} lg={6} key={cat.id}>
                            <Box sx={{ p: 2, border: '2px solid', borderColor: qtyInCart > 0 ? '#3b82f6' : '#f1f5f9', borderRadius: 2, bgcolor: qtyInCart > 0 ? '#eff6ff' : 'white', transition: 'all 0.2s', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box>
                                    <Typography variant="subtitle1" fontWeight={700} color={qtyInCart > 0 ? '#1e3a8a' : 'text.primary'}>{cat.name}</Typography>
                                    <Typography variant="h6" fontWeight={800} color="text.primary">₺{cat.price}</Typography>
                                    <Typography variant="caption" color={cat.available < 20 ? 'error.main' : 'text.secondary'} fontWeight={600}>
                                        Kalan: {cat.available}
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: 'white', borderRadius: 8, border: '1px solid #cbd5e1', p: 0.5 }}>
                                    <IconButton size="small" onClick={() => updateCart(cat.id, -1)} disabled={qtyInCart === 0} sx={{ bgcolor: '#f1f5f9' }}>
                                        <RemoveIcon fontSize="small" />
                                    </IconButton>
                                    <Typography variant="h6" sx={{ width: 30, textAlign: 'center', fontWeight: 800 }}>{qtyInCart}</Typography>
                                    <IconButton size="small" onClick={() => updateCart(cat.id, 1)} disabled={qtyInCart >= cat.available} sx={{ bgcolor: '#f1f5f9' }}>
                                        <AddIcon fontSize="small" />
                                    </IconButton>
                                </Box>
                            </Box>
                        </Grid>
                    );
                })}
            </Grid>
          </Paper>
        </Box>
        
        {/* RIGHT DRAWER: Cart & Payment Checkout */}
        <Paper elevation={0} sx={{ width: 400, borderRadius: 3, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', bgcolor: 'white' }}>
            
            {/* Cart Header */}
            <Box sx={{ p: 3, borderBottom: '1px solid #f1f5f9', bgcolor: '#f8fafc', borderTopLeftRadius: 12, borderTopRightRadius: 12 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="h6" fontWeight={800}>Sepet</Typography>
                    <Badge badgeContent={totalTickets} color="primary">
                        <CartIcon color="action" />
                    </Badge>
                </Box>
            </Box>

            {/* Cart Items */}
            <Box sx={{ flex: 1, p: 3, overflow: 'auto' }}>
                {totalTickets === 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'text.disabled' }}>
                        <CartIcon sx={{ fontSize: 60, mb: 2, opacity: 0.3 }} />
                        <Typography variant="subtitle1" fontWeight={600}>Sepet Boş</Typography>
                        <Typography variant="body2">Sol panelden bilet ekleyin</Typography>
                    </Box>
                ) : (
                    <Stack spacing={2}>
                        {Object.entries(cart).map(([catId, qty]) => {
                            const cat = currentCategories.find(c => c.id === catId);
                            if (!cat) return null;
                            return (
                                <Box key={catId} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Box>
                                        <Typography variant="body2" fontWeight={700}>{cat.name}</Typography>
                                        <Typography variant="caption" color="text.secondary">{qty} x ₺{cat.price}</Typography>
                                    </Box>
                                    <Typography variant="subtitle2" fontWeight={800}>₺{cat.price * qty}</Typography>
                                </Box>
                            );
                        })}
                        <Divider sx={{ my: 1 }} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2" color="text.secondary" fontWeight={600}>Ara Toplam</Typography>
                            <Typography variant="subtitle2" fontWeight={700}>₺{subtotal}</Typography>
                        </Box>
                        {isPromoType && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', color: '#10b981' }}>
                                <Typography variant="body2" fontWeight={700}>Gişe İndirimi (%100)</Typography>
                                <Typography variant="subtitle2" fontWeight={700}>- ₺{subtotal}</Typography>
                            </Box>
                        )}
                    </Stack>
                )}
            </Box>

            {/* Action Meta (Payment & Delivery) */}
            <Box sx={{ p: 3, bgcolor: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
                
                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ mb: 1, display: 'block' }}>ÖDEME METODU</Typography>
                <Grid container spacing={1} sx={{ mb: 3 }}>
                    <PaymentMethodButton label="KREDİ KARTI" icon={<CardIcon fontSize="small"/>} val="CREDIT" current={paymentType} set={setPaymentType}/>
                    <PaymentMethodButton label="NAKİT" icon={<CashIcon fontSize="small"/>} val="CASH" current={paymentType} set={setPaymentType}/>
                    <PaymentMethodButton label="REZERV." icon={<ReserveIcon fontSize="small"/>} val="RESERVE" current={paymentType} set={setPaymentType}/>
                    <PaymentMethodButton label="PROMO/DAVET" icon={<PromoIcon fontSize="small"/>} val="COMPLIMENTARY" current={paymentType} set={setPaymentType}/>
                </Grid>

                {isPromoType && (
                     <TextField 
                        fullWidth 
                        size="small" 
                        label="Promosyon/Davet Nedeni (Zorunlu)" 
                        sx={{ mb: 3, bgcolor: 'white' }} 
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                    />
                )}

                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ mb: 1, display: 'block' }}>TESLİMAT FORMU</Typography>
                <Grid container spacing={1} sx={{ mb: 3 }}>
                    <DeliveryMethodButton label="YAZDIR" icon={<PrintIcon fontSize="small"/>} val="PRINT" current={deliveryType} set={setDeliveryType} disabled={customerMode === 'GUEST' && !customerPhone && deliveryType !== 'PRINT'}/>
                    <DeliveryMethodButton label="E-MAIL/SMS" icon={<EmailIcon fontSize="small"/>} val="DIGITAL" current={deliveryType} set={setDeliveryType} disabled={customerMode === 'GUEST' && !customerPhone} />
                </Grid>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 2 }}>
                    <Typography variant="h6" color="text.secondary" fontWeight={700}>TOPLAM</Typography>
                    <Typography variant="h3" fontWeight={900} color={totalTickets === 0 ? 'text.disabled' : paymentType === 'RESERVE' ? '#f59e0b' : '#10b981'}>
                        ₺{total}
                    </Typography>
                </Box>
                
                <Button 
                    variant="contained" 
                    fullWidth 
                    size="large" 
                    disableElevation
                    disabled={totalTickets === 0 || (isPromoType && !promoCode.trim())}
                    sx={{ 
                        py: 2, 
                        fontWeight: 800, 
                        fontSize: '1.1rem',
                        bgcolor: paymentType === 'RESERVE' ? '#f59e0b' : '#334155',
                        '&:hover': {
                            bgcolor: paymentType === 'RESERVE' ? '#d97706' : '#0f172a'
                        }
                    }}
                >
                    {paymentType === 'RESERVE' ? 'REZERVASYONU KAYDET' : 'SATIŞI TAMAMLA'}
                </Button>
            </Box>
        </Paper>
      </Box>
    </Box>
  );

  function PaymentMethodButton({ label, icon, val, current, set }: { label: string, icon: any, val: string, current: string, set: any }) {
      const active = val === current;
      return (
          <Grid item xs={6}>
              <Box 
                  onClick={() => set(val)}
                  sx={{ 
                      p: 1.5, 
                      borderRadius: 1.5, 
                      border: '2px solid',
                      borderColor: active ? '#334155' : '#e2e8f0',
                      bgcolor: active ? 'white' : 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 0.5,
                      transition: 'all 0.1s'
                  }}
              >
                  <Box sx={{ color: active ? '#334155' : 'text.disabled' }}>{icon}</Box>
                  <Typography variant="caption" fontWeight={700} color={active ? '#334155' : 'text.disabled'} textAlign="center">{label}</Typography>
              </Box>
          </Grid>
      );
  }

  function DeliveryMethodButton({ label, icon, val, current, set, disabled = false }: { label: string, icon: any, val: string, current: string, set: any, disabled?: boolean }) {
      const active = val === current;
      return (
          <Grid item xs={6}>
              <Box 
                  onClick={() => !disabled && set(val)}
                  sx={{ 
                      p: 1.5, 
                      borderRadius: 1.5, 
                      border: '2px solid',
                      borderColor: disabled ? '#f1f5f9' : active ? '#3b82f6' : '#e2e8f0',
                      bgcolor: disabled ? '#f8fafc' : active ? '#eff6ff' : 'transparent',
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 0.5,
                      opacity: disabled ? 0.5 : 1,
                  }}
              >
                  <Box sx={{ color: active ? '#3b82f6' : 'text.disabled' }}>{icon}</Box>
                  <Typography variant="caption" fontWeight={700} color={active ? '#3b82f6' : 'text.disabled'} textAlign="center">{label}</Typography>
              </Box>
          </Grid>
      );
  }
}
