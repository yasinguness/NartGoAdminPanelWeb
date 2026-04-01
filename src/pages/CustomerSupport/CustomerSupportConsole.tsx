import React, { useState, useEffect } from 'react';
import { customerSupportService } from '../../services/customer-support/customerSupport.service';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Stack,
  Button,
  TextField,
  InputAdornment,
  Avatar,
  Divider,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Search as SearchIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  History as HistoryIcon,
  Receipt as OrderIcon,
  ConfirmationNumber as TicketIcon,
  WarningAmber as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Send as SendIcon,
  Security as SecurityIcon,
  MoneyOff as RefundIcon,
  Autorenew as ResetIcon,
  EditNote as NoteIcon,
} from '@mui/icons-material';

const COLORS = {
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  primary: '#3b82f6',
  neutral: '#64748b',
  background: '#f8fafc',
};


export default function CustomerSupportConsole() {
  const [searchQuery, setSearchQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [customer, setCustomer] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [agentNote, setAgentNote] = useState('');

  const performSearch = async (query: string) => {
    if (!query.trim()) return;
    setLoading(true);
    setHasSearched(true);
    try {
      const results = await customerSupportService.searchCustomer(query);
      if (results && results.length > 0) {
        setCustomer(results[0]);
        const tl = await customerSupportService.getCustomerTimeline(results[0].id);
        setTimeline(tl || []);
      } else {
        setCustomer(null);
        setTimeline([]);
      }
    } catch (err) {
      // silently handled
      setCustomer(null);
      setTimeline([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      performSearch(searchQuery);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 'calc(100vh - 64px)', bgcolor: '#f1f5f9' }}>
      
      {/* 1. Omni-Search Top Bar */}
      <Box sx={{ p: 3, bgcolor: '#ffffff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'center' }}>
         <TextField 
            fullWidth
            placeholder="İsim, TC, E-Posta, Telefon, Sipariş ID (ORD-) veya Bilet ID (TCK-)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleSearch}
            sx={{ 
                maxWidth: 800, 
                bgcolor: '#f8fafc',
                '& .MuiOutlinedInput-root': { borderRadius: 4, pr: 1 },
                '& fieldset': { borderColor: '#cbd5e1' }
            }}
            InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon color="primary" sx={{ ml: 1, fontSize: 28 }} /></InputAdornment>,
                endAdornment: (
                  <InputAdornment position="end">
                    <Button variant="contained" disableElevation sx={{ borderRadius: 3, fontWeight: 700 }} onClick={() => {if(searchQuery.trim()) setHasSearched(true)}}>
                       SORGULA
                    </Button>
                  </InputAdornment>
                )
            }}
         />
      </Box>

      {loading ? (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <ResetIcon sx={{ fontSize: 60, color: COLORS.primary, animation: 'spin 2s linear infinite', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" fontWeight={700}>Aranıyor...</Typography>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </Box>
      ) : hasSearched && customer ? (
          <Box sx={{ display: 'flex', flex: 1, p: 3, gap: 3, overflow: 'hidden' }}>
            
            {/* LEFT PANEL: 360 Profile & Timeline */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, overflow: 'auto' }}>
                
                {/* 360 Customer Profile Header */}
                <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                    <Avatar sx={{ width: 80, height: 80, bgcolor: '#eff6ff', color: '#1e3a8a', fontSize: '2rem', fontWeight: 800 }}>
                        {customer?.name?.charAt(0) || '?'}
                    </Avatar>
                    <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h4" fontWeight={800} color="#0f172a">{customer?.name || ''}</Typography>
                        <Stack direction="row" spacing={3} sx={{ mt: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', color: '#64748b' }}>
                                <EmailIcon sx={{ fontSize: 18, mr: 0.5 }} /> <Typography variant="body2" fontWeight={600}>{customer?.email || ''}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', color: '#64748b' }}>
                                <PhoneIcon sx={{ fontSize: 18, mr: 0.5 }} /> <Typography variant="body2" fontWeight={600}>{customer?.phone || ''}</Typography>
                            </Box>
                            <Typography variant="body2" fontWeight={600} color="#94a3b8">Biletix ID: {customer?.id || ''}</Typography>
                        </Stack>
                    </Box>

                    <Divider orientation="vertical" flexItem />

                    <Box sx={{ textAlign: 'center', px: 2 }}>
                       <Typography variant="caption" color="text.secondary" fontWeight={700}>YAŞAM BOYU DEĞER</Typography>
                       <Typography variant="h5" fontWeight={800} color={COLORS.success}>{customer?.ltv || '-'}</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center', px: 2 }}>
                       <Typography variant="caption" color="text.secondary" fontWeight={700}>KATILIM</Typography>
                       <Typography variant="h5" fontWeight={800}>{customer?.eventsAttended || 0} <Typography component="span" variant="body2" color="text.secondary" fontWeight={600}>Etkinlik</Typography></Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center', pl: 2 }}>
                       <Typography variant="caption" color="text.secondary" fontWeight={700}>RİSK SKORU</Typography>
                       <Chip label={customer?.riskStatus === 'LOW' ? 'GÜVENİLİR' : customer?.riskStatus ? 'RİSKLİ' : '-'} color={customer?.riskStatus === 'LOW' ? 'success' : 'error'} size="small" sx={{ display: 'flex', fontWeight: 800, mt: 0.5 }} />
                    </Box>
                </Paper>

                {/* Unified Omnichannel Timeline */}
                <Paper elevation={0} sx={{ flex: 1, borderRadius: 4, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    
                    <Box sx={{ p: 3, borderBottom: '1px solid #f1f5f9', bgcolor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h6" fontWeight={800} display="flex" alignItems="center">
                            <HistoryIcon sx={{ mr: 1, color: COLORS.primary }} /> Birleştirilmiş Müşteri Geçmişi
                        </Typography>
                        <Stack direction="row" spacing={1}>
                            <Chip label="Tümü" size="small" sx={{ bgcolor: '#334155', color: 'white', fontWeight: 700 }} />
                            <Chip label="Siparişler" size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                            <Chip label="Destek Çağrıları" size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                            <Chip label="Kapı İşlemleri" size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                        </Stack>
                    </Box>
                    
                    <Box sx={{ p: 4, flex: 1, overflow: 'auto', position: 'relative' }}>
                        {/* Vertical Timeline Guide */}
                        <Box sx={{ position: 'absolute', top: 40, bottom: 40, left: 45, width: 2, bgcolor: '#e2e8f0' }} />

                        <Stack spacing={4}>
                            {timeline.length === 0 ? (
                                <Box sx={{ textAlign: 'center', color: 'text.secondary', mt: 4 }}>Zaman çizelgesi henüz yüklenmedi.</Box>
                            ) : timeline.map((item) => (
                                <Box key={item.id} sx={{ display: 'flex', position: 'relative' }}>
                                    <Box sx={{ 
                                        width: 32, height: 32, borderRadius: '50%', bgcolor: 'white', 
                                        border: `2px solid ${item.color || COLORS.primary}`, display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                        color: item.color || COLORS.primary, zIndex: 2, mt: 0.5, mr: 3
                                    }}>
                                        {item.icon || <HistoryIcon fontSize="small"/>}
                                    </Box>
                                    <Box sx={{ flex: 1 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                            <Typography variant="subtitle1" fontWeight={800}>{item.title}</Typography>
                                            <Typography variant="caption" fontWeight={700} color="text.secondary">{item.time}</Typography>
                                        </Box>
                                        <Typography variant="body2" color="#475569" sx={{ mb: 1, lineHeight: 1.6 }}>{item.desc}</Typography>
                                        {item.type === 'CALL' ? (
                                             <Chip label={`Ajan: ${item.actor}`} size="small" sx={{ bgcolor: '#fef3c7', color: '#b45309', fontWeight: 700, fontSize: '0.7rem' }} />
                                        ) : (
                                            <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'monospace' }}>KAYNAK: {item.actor}</Typography>
                                        )}
                                    </Box>
                                </Box>
                            ))}
                        </Stack>
                    </Box>
                </Paper>
            </Box>

            {/* RIGHT PANEL: Executive Operations Dashboard */}
            <Box sx={{ width: 380, display: 'flex', flexDirection: 'column', gap: 3 }}>
                
                {/* Son Sipariş Kartı (Quick Order Context) */}
                <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: '1px solid #e2e8f0' }}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary">AKTİF SİPARİŞ BAĞLAMI</Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1, mb: 3 }}>
                        <Typography variant="h5" fontWeight={800} sx={{ fontFamily: 'monospace' }}>{customer?.recentOrder || '-'}</Typography>
                        <Chip label="ÖDENDİ" size="small" sx={{ bgcolor: 'rgba(16,185,129,0.1)', color: COLORS.success, fontWeight: 800 }} />
                    </Box>
                    <Divider sx={{ mb: 3 }} />
                    <Stack spacing={2}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" color="text.secondary">Zorlu PSM Yaz Konseri</Typography>
                            <Typography variant="body2" fontWeight={700}>2x VIP</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" color="text.secondary">Tutar (Kredi Kartı)</Typography>
                            <Typography variant="body2" fontWeight={800}>₺900</Typography>
                        </Box>
                    </Stack>
                </Paper>

                {/* Acil Oprasyon Menüsü */}
                <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid #e2e8f0', bgcolor: '#ffffff', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="subtitle1" fontWeight={800} color="#0f172a" sx={{ mb: 3 }}>Operasyon & Karar Yüzeyi</Typography>
                    
                    <Stack spacing={1.5} sx={{ mb: 4 }}>
                        <Button variant="outlined" disableElevation startIcon={<SendIcon />} sx={{ justifyContent: 'flex-start', py: 1.5, borderColor: '#cbd5e1', color: '#334155', fontWeight: 700 }}>
                            BİLETİ (EMAIL/SMS) YENİDEN GÖNDER
                        </Button>
                        <Button variant="outlined" disableElevation startIcon={<ResetIcon />} sx={{ justifyContent: 'flex-start', py: 1.5, borderColor: '#cbd5e1', color: '#334155', fontWeight: 700 }}>
                            GİRİŞ DURUMUNU SIFIRLA
                        </Button>
                        <Button variant="outlined" disableElevation startIcon={<RefundIcon />} sx={{ justifyContent: 'flex-start', py: 1.5, borderColor: 'rgba(239, 68, 68, 0.3)', color: COLORS.error, fontWeight: 700, bgcolor: 'rgba(239, 68, 68, 0.05)' }}>
                            SİPARİŞİ İPTAL & İADE ET
                        </Button>
                        <Button variant="outlined" disableElevation startIcon={<SecurityIcon />} sx={{ justifyContent: 'flex-start', py: 1.5, borderColor: 'rgba(245, 158, 11, 0.3)', color: COLORS.warning, fontWeight: 700, bgcolor: 'rgba(245, 158, 11, 0.05)' }}>
                            MÜŞTERİYİ ŞÜPHELİ İŞARETLE
                        </Button>
                    </Stack>

                    <Box sx={{ mt: 'auto' }}>
                        <TextField 
                            fullWidth 
                            multiline 
                            rows={3} 
                            placeholder="Müşteri görüşme notu veya aksiyon sebebi girin..." 
                            value={agentNote}
                            onChange={(e) => setAgentNote(e.target.value)}
                            sx={{ bgcolor: '#f8fafc', '& fieldset': { borderColor: '#cbd5e1' }, mb: 2 }}
                        />
                        <Button variant="contained" fullWidth disableElevation sx={{ py: 1.5, fontWeight: 800, bgcolor: '#0f172a' }} startIcon={<NoteIcon />}>
                            AJAN NOTU KAYDET
                        </Button>
                    </Box>
                </Paper>

            </Box>
          </Box>
      ) : hasSearched && !customer ? (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
              <SearchIcon sx={{ fontSize: 80, color: '#94a3b8', mb: 3 }} />
              <Typography variant="h5" fontWeight={700} color="text.secondary">Sonuç Bulunamadı</Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>Arama kriterlerinize uygun müşteri bulunamadı. Farklı bir sorgu deneyin.</Typography>
          </Box>
      ) : (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
              <SecurityIcon sx={{ fontSize: 80, color: '#94a3b8', mb: 3 }} />
              <Typography variant="h5" fontWeight={700} color="text.secondary">Müşteri Destek & 360° Profil</Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>Yukarıdaki araç çubuğundan isim, e-posta veya ID ile sorgulama yapın.</Typography>
          </Box>
      )}
    </Box>
  );
}
