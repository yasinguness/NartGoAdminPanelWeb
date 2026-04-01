import React, { useState, useEffect } from 'react';
import { campaignService } from '../../services/campaign/campaign.service';
import {
  Box,
  Typography,
  Paper,
  Stack,
  Button,
  TextField,
  InputAdornment,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemButton,
  IconButton,
  Switch,
  MenuItem,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Add as AddIcon,
  LocalOffer as PromoIcon,
  ElectricBolt as AutoIcon,
  AccountBalance as BankIcon,
  CheckCircle as ValidIcon,
  Cancel as InvalidIcon,
  Layers as StackIcon,
  Warning as WarningIcon,
  Rule as RuleIcon,
  Settings as SettingIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';

// --- Domain Models from Specification ---
export type CampaignStatus = 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'ARCHIVED';
export type CampaignType = 'PROMO_CODE' | 'AUTO_DISCOUNT' | 'EARLY_BIRD' | 'BUNDLE' | 'BANK_PROMO' | 'AFFILIATE' | 'LOYALTY' | 'COMP';
export type StackPolicy = 'EXCLUSIVE' | 'STACKABLE' | 'STACKABLE_WITH_RESTRICTIONS';

interface CampaignMock {
  id: string;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  stackPolicy: StackPolicy;
  redemptions: number;
  quota: number;
  uplift: string;
  fractionUsed: number;
  fraudFlags: number;
}


const COLORS = {
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  primary: '#3b82f6',
  brand: '#8b5cf6', // purple
  neutral: '#64748b',
  surface: '#f8fafc',
  border: '#e2e8f0',
};

// --- Component ---
export default function CampaignPromoEngine() {
  const { enqueueSnackbar } = useSnackbar();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ACTIVE');
  const [selectedCamp, setSelectedCamp] = useState<any | null>(null);
  const [evaluationLoading, setEvaluationLoading] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<any | null>(null);

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        setLoading(true);
        const data = await campaignService.getCampaigns({ status: activeTab });
        setCampaigns(data || []);
        if (data && data.length > 0) {
          setSelectedCamp(data[0]);
        } else {
          setSelectedCamp(null);
        }
        setEvaluationResult(null);
      } catch (err) {
        console.error('Failed to fetch campaigns', err);
        setCampaigns([]);
        setSelectedCamp(null);
        setEvaluationResult(null);
      } finally {
        setLoading(false);
      }
    };
    fetchCampaigns();
  }, [activeTab]);

  // Preview form state
  const [previewBasket, setPreviewBasket] = useState(400);
  const [previewCode, setPreviewCode] = useState('YAZ20');
  const [previewMethod, setPreviewMethod] = useState('CREDIT_CARD');
  const [previewUserFlagged, setPreviewUserFlagged] = useState(false);

  useEffect(() => {
    setEvaluationResult(null);
  }, [selectedCamp, previewBasket, previewCode, previewMethod, previewUserFlagged]);

  if (loading && campaigns.length === 0) {
      return (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', bgcolor: '#f1f5f9' }}>
              <Typography variant="h6" color="text.secondary">Kampanya Motoru Yükleniyor...</Typography>
          </Box>
      );
  }

  if (!selectedCamp) return null;

  const handleEvaluate = async () => {
    if (!selectedCamp?.id) {
      return;
    }

    try {
      setEvaluationLoading(true);
      const result = await campaignService.evaluateEligibility(selectedCamp.id, {
        amount: previewBasket,
        promoCode: previewCode,
        paymentMethod: previewMethod,
        userFlagged: previewUserFlagged,
      });
      setEvaluationResult(result);
      enqueueSnackbar('Kampanya değerlendirmesi tamamlandı', { variant: 'success' });
    } catch (error) {
      console.error('Campaign evaluation failed, falling back to local simulation', error);
      setEvaluationResult(null);
      enqueueSnackbar('Sunucu değerlendirmesi kullanılamıyor, yerel simülasyon gösteriliyor', { variant: 'warning' });
    } finally {
      setEvaluationLoading(false);
    }
  };

  // Simulation Logic (Calculated locally but could be a service call)
  let isEligible = false;
  let rejections: string[] = [];
  let benefitAmount = 0;

  if (selectedCamp.id === 'CMP-101') {
      if (previewCode.toUpperCase() !== 'YAZ20') rejections.push('Geçersiz promosyon kodu (YAZ20 bekleniyor).');
      if (previewBasket < 500) rejections.push('Sepet tutarı ₺500 altında olamaz (BasketAmountCondition).');
      if (previewUserFlagged) rejections.push('Kullanıcı fraud kara listesinde (AntiAbuseConstraint).');
      if (rejections.length === 0) { isEligible = true; benefitAmount = previewBasket * 0.15; }
  } else if (selectedCamp.id === 'CMP-102') {
      if (previewMethod !== 'GARANTI_PAY' && previewMethod !== 'GARANTI_CC') rejections.push('Ödeme yöntemi Garanti BBVA olmalı (PaymentMethodCondition).');
      if (previewUserFlagged) rejections.push('Kullanıcı fraud kara listesinde (AntiAbuseConstraint).');
      if (rejections.length === 0) { isEligible = true; benefitAmount = previewBasket * 0.20; }
  } else {
      rejections.push('Simülasyon motoru kural setini tanımıyor veya sunucu yanıtı bekliyor.');
  }

  if (evaluationResult) {
      isEligible = Boolean(
          evaluationResult.isEligible ??
          evaluationResult.eligible ??
          evaluationResult.isValid ??
          evaluationResult.success
      );

      const rejectionSource = evaluationResult.rejections
          ?? evaluationResult.reasons
          ?? evaluationResult.rejectionReasons
          ?? evaluationResult.messages;

      if (Array.isArray(rejectionSource)) {
          rejections = rejectionSource.map((item) => String(item));
      } else if (!isEligible && typeof rejectionSource === 'string') {
          rejections = [rejectionSource];
      } else if (!isEligible) {
          rejections = ['Sunucu değerlendirmesi talebi reddetti.'];
      } else {
          rejections = [];
      }

      benefitAmount = Number(
          evaluationResult.benefitAmount
          ?? evaluationResult.discountAmount
          ?? evaluationResult.appliedDiscount
          ?? 0
      );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 'calc(100vh - 64px)', bgcolor: '#f1f5f9' }}>
      
      {/* HEADER */}
      <Box sx={{ p: 2, bgcolor: '#ffffff', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center' }}>
        <Typography variant="h6" fontWeight={800} sx={{ mr: 4 }}>Kampanya Motoru</Typography>
        <Stack direction="row" spacing={1}>
           {['DRAFT', 'ACTIVE', 'PAUSED', 'EXPIRED'].map(t => (
               <Chip 
                  key={t} label={t} 
                  onClick={() => setActiveTab(t)}
                  sx={{ fontWeight: 700, bgcolor: activeTab === t ? COLORS.primary : 'transparent', color: activeTab === t ? 'white' : COLORS.neutral, border: `1px solid ${activeTab === t ? COLORS.primary : COLORS.border}` }}
               />
           ))}
        </Stack>
        <Box sx={{ flexGrow: 1 }} />
        <Button variant="contained" disableElevation startIcon={<AddIcon />} sx={{ bgcolor: COLORS.brand, fontWeight: 700 }}>YENİ KAMPANYA</Button>
      </Box>

      {/* 3-PANEL LAYOUT */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* PANEL 1: CAMPAIGN LIST (30%) */}
        <Box sx={{ width: '30%', minWidth: 350, borderRight: `1px solid ${COLORS.border}`, bgcolor: 'white', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 2, borderBottom: `1px solid ${COLORS.border}` }}>
                <TextField 
                    fullWidth size="small" placeholder="Kampanya ara..." 
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>, endAdornment: <IconButton size="small"><FilterIcon fontSize="small" /></IconButton> }}
                    sx={{ bgcolor: COLORS.surface, '& fieldset': { borderColor: COLORS.border } }}
                />
            </Box>
            <List sx={{ flex: 1, overflow: 'auto', p: 0 }}>
                {campaigns.filter(c => c.status === activeTab || activeTab === 'ALL').map(camp => (
                    <ListItemButton 
                        key={camp.id} 
                        onClick={() => setSelectedCamp(camp)}
                        selected={selectedCamp.id === camp.id}
                        sx={{ borderBottom: `1px solid ${COLORS.border}`, flexDirection: 'column', alignItems: 'flex-start', p: 2, bgcolor: selectedCamp.id === camp.id ? '#eff6ff' : 'white' }}
                    >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', mb: 1 }}>
                            <Typography variant="subtitle2" fontWeight={800}>{camp.name}</Typography>
                            <Chip label={camp.type} size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800, bgcolor: COLORS.surface, color: COLORS.neutral }} />
                        </Box>
                        
                        <Stack direction="row" spacing={2} sx={{ mb: 1.5, width: '100%' }}>
                            <Box>
                                <Typography variant="caption" color="text.secondary" display="block" fontWeight={700}>KULLANIM/KOTA</Typography>
                                <Typography variant="body2" fontWeight={700}>{camp.redemptions} / {camp.quota}</Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary" display="block" fontWeight={700}>GELİR KATKISI</Typography>
                                <Typography variant="body2" fontWeight={800} color={COLORS.success}>{camp.uplift}</Typography>
                            </Box>
                        </Stack>
                        
                        <Box sx={{ width: '100%', height: 4, bgcolor: COLORS.border, borderRadius: 2, overflow: 'hidden' }}>
                            <Box sx={{ width: `${camp.fractionUsed}%`, height: '100%', bgcolor: camp.fractionUsed > 90 ? COLORS.error : COLORS.primary }} />
                        </Box>
                    </ListItemButton>
                ))}
            </List>
        </Box>

        {/* PANEL 2: RULE GRAPH / BUILDER (45%) */}
        <Box sx={{ flex: 1, minWidth: 500, bgcolor: COLORS.surface, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            
            <Box sx={{ p: 3, borderBottom: `1px solid ${COLORS.border}`, bgcolor: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Typography variant="h5" fontWeight={800} color="#0f172a">{selectedCamp.name}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{selectedCamp.id} • POLICY: {selectedCamp.stackPolicy}</Typography>
                </Box>
                <Switch defaultChecked={selectedCamp.status === 'ACTIVE'} color="success" />
            </Box>

            <Box sx={{ flex: 1, p: 4, overflow: 'auto' }}>
                <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ mb: 2, display: 'block', letterSpacing: 1 }}>KURAL MOTORU</Typography>
                
                {/* Visual Block: AUDIENCE */}
                <RuleBlock title="HEDEF KİTLE" icon={<RuleIcon/>} color={COLORS.brand}>
                    <Typography variant="body2" fontWeight={600}>Tüm kullanıcılar geçerli.</Typography>
                </RuleBlock>

                <RuleBlockConnector />

                {/* Visual Block: CONDITIONS */}
                <RuleBlock title="KOŞULLAR [VE]" icon={<SettingIcon />} color={COLORS.primary}>
                    <Stack spacing={1}>
                        <Box sx={{ p: 1.5, bgcolor: 'white', borderRadius: 1, border: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" fontWeight={600}><Typography component="span" fontWeight={800} color={COLORS.primary}>TİP:</Typography> PROMO_CODE</Typography>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>Değer: YAZ20</Typography>
                        </Box>
                        <Box sx={{ p: 1.5, bgcolor: 'white', borderRadius: 1, border: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" fontWeight={600}><Typography component="span" fontWeight={800} color={COLORS.primary}>TİP:</Typography> BASKET_AMOUNT</Typography>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>Operatör: GTE, Değer: ₺500</Typography>
                        </Box>
                        {selectedCamp.id === 'CMP-102' && (
                             <Box sx={{ p: 1.5, bgcolor: '#fffbeb', borderRadius: 1, border: `1px solid #fde68a`, display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2" fontWeight={600} color="#b45309"><Typography component="span" fontWeight={800}>TİP:</Typography> PAYMENT_METHOD</Typography>
                                <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#b45309' }}>İzinli: GARANTI_PAY, GARANTI_CC</Typography>
                             </Box>
                        )}
                    </Stack>
                    <Button size="small" startIcon={<AddIcon />} sx={{ mt: 2, color: COLORS.primary, fontWeight: 700 }}>KOŞUL EKLE</Button>
                </RuleBlock>

                <RuleBlockConnector />

                {/* Visual Block: BENEFIT */}
                <RuleBlock title="KAZANIM" icon={<PromoIcon />} color={COLORS.success}>
                    <Box sx={{ p: 1.5, bgcolor: 'white', borderRadius: 1, border: `1px dashed ${COLORS.success}`, display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" fontWeight={600}><Typography component="span" fontWeight={800} color={COLORS.success}>TİP:</Typography> PERCENTAGE_DISCOUNT</Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>Format: %15, Cap: Yok</Typography>
                    </Box>
                </RuleBlock>

                <RuleBlockConnector />

                {/* Visual Block: CONSTRAINTS */}
                <RuleBlock title="LİMİT & GÜVENLİK" icon={<WarningIcon />} color={COLORS.error}>
                     <Stack spacing={1}>
                        <Box sx={{ p: 1.5, bgcolor: 'white', borderRadius: 1, border: `1px solid ${COLORS.error}40` }}>
                            <Typography variant="body2" fontWeight={600}>Toplam Kota Limiti: {selectedCamp.quota} Adet</Typography>
                        </Box>
                        <Box sx={{ p: 1.5, bgcolor: 'white', borderRadius: 1, border: `1px solid ${COLORS.error}40` }}>
                            <Typography variant="body2" fontWeight={600}>Kötüye Kullanım Koruması: Aktif (İşaretli Kullanıcıları Engelle)</Typography>
                        </Box>
                    </Stack>
                </RuleBlock>

            </Box>
        </Box>

        {/* PANEL 3: ELIGIBILITY PREVIEW (25%) */}
        <Box sx={{ width: '25%', minWidth: 350, borderLeft: `1px solid ${COLORS.border}`, bgcolor: 'white', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 3, borderBottom: `1px solid ${COLORS.border}`, bgcolor: '#1e293b', color: 'white' }}>
                <Typography variant="subtitle1" fontWeight={800}>Uygunluk Önizleme & Etki</Typography>
                <Typography variant="caption" color="#94a3b8">Simülasyon motoru kural setini canlı test eder.</Typography>
            </Box>

            <Box sx={{ flex: 1, p: 3, overflow: 'auto' }}>
                <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 2, color: COLORS.neutral }}>GİRDİ (TEST)</Typography>
                
                <Stack spacing={2} sx={{ mb: 4 }}>
                    <TextField
                       label="Sepet Tutarı"
                       size="small" fullWidth type="number" 
                       value={previewBasket} onChange={e => setPreviewBasket(Number(e.target.value))}
                       InputProps={{ startAdornment: <InputAdornment position="start">₺</InputAdornment> }}
                    />
                    <TextField 
                       label="Promo Kodu" 
                       size="small" fullWidth 
                       value={previewCode} onChange={e => setPreviewCode(e.target.value)}
                    />
                    <TextField 
                       select label="Ödeme Yöntemi" 
                       size="small" fullWidth 
                       value={previewMethod} onChange={e => setPreviewMethod(e.target.value)}
                    >
                        <MenuItem value="CREDIT_CARD">Standart Kredi Kartı</MenuItem>
                        <MenuItem value="GARANTI_CC">Garanti BBVA Kredi Kartı</MenuItem>
                        <MenuItem value="GARANTI_PAY">Garanti Pay</MenuItem>
                    </TextField>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, border: `1px solid ${COLORS.border}`, borderRadius: 1 }}>
                        <Typography variant="body2" fontWeight={600}>Kullanıcı Şüpheli İşaretli mi?</Typography>
                        <Switch size="small" color="error" checked={previewUserFlagged} onChange={e => setPreviewUserFlagged(e.target.checked)} />
                    </Box>
                    <Button
                        variant="contained"
                        disableElevation
                        onClick={() => void handleEvaluate()}
                        disabled={evaluationLoading}
                        sx={{ fontWeight: 800, bgcolor: COLORS.primary }}
                    >
                        {evaluationLoading ? 'Değerlendiriliyor...' : 'Canlı Değerlendir'}
                    </Button>
                </Stack>

                <Divider sx={{ mb: 3 }} />

                <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 2, color: COLORS.neutral }}>SONUÇ</Typography>
                
                {isEligible ? (
                    <Paper elevation={0} sx={{ p: 2, bgcolor: '#ecfdf5', border: '1px solid #10b981', borderRadius: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', color: '#047857', mb: 1 }}>
                            <ValidIcon sx={{ mr: 1 }} />
                            <Typography variant="subtitle1" fontWeight={800}>GEÇERLİ (Uygun)</Typography>
                        </Box>
                        <Typography variant="body2" color="#065f46" fontWeight={600} sx={{ mb: 2 }}>
                            Sepet belirlenen tüm koşul kilitlerini açtı.
                        </Typography>
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #34d399', pt: 1 }}>
                            <Typography variant="caption" fontWeight={700} color="#047857">UYGULANAN İNDİRİM</Typography>
                            <Typography variant="subtitle2" fontWeight={800} color="#047857">- ₺{benefitAmount.toFixed(2)}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                            <Typography variant="caption" fontWeight={700} color="#047857">YENİ SEPET TUTARI</Typography>
                            <Typography variant="subtitle2" fontWeight={800} color="#047857">₺{(previewBasket - benefitAmount).toFixed(2)}</Typography>
                        </Box>
                    </Paper>
                ) : (
                    <Paper elevation={0} sx={{ p: 2, bgcolor: '#fef2f2', border: '1px solid #ef4444', borderRadius: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', color: '#b91c1c', mb: 1 }}>
                            <InvalidIcon sx={{ mr: 1 }} />
                            <Typography variant="subtitle1" fontWeight={800}>UYGUN DEĞİL (Reddedildi)</Typography>
                        </Box>
                        <Typography variant="body2" color="#b91c1c" fontWeight={600} sx={{ mb: 1 }}>Aşağıdaki koşullar sağlanamadığı için kural motorunda takıldı:</Typography>
                        
                        <List dense disablePadding>
                            {rejections.map((rej, i) => (
                                <ListItem key={i} disablePadding sx={{ py: 0.5 }}>
                                    <Box sx={{ width: 4, height: 4, bgcolor: '#ef4444', borderRadius: '50%', mr: 1 }} />
                                    <Typography variant="caption" color="#b91c1c" fontWeight={600}>{rej}</Typography>
                                </ListItem>
                            ))}
                        </List>
                    </Paper>
                )}

            </Box>
        </Box>

      </Box>
    </Box>
  );

  function RuleBlock({ title, icon, color, children }: { title: string, icon: any, color: string, children: any }) {
      return (
          <Paper elevation={0} sx={{ position: 'relative', border: '1px solid', borderColor: COLORS.border, borderRadius: 2, overflow: 'hidden' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', p: 1.5, bgcolor: color + '10', borderBottom: '1px solid', borderColor: color + '30' }}>
                  <Box sx={{ color, display: 'flex', mr: 1 }}>{icon}</Box>
                  <Typography variant="subtitle2" fontWeight={800} color={color}>{title}</Typography>
              </Box>
              <Box sx={{ p: 2, bgcolor: 'white' }}>
                  {children}
              </Box>
          </Paper>
      );
  }

  function RuleBlockConnector() {
      return (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 1 }}>
             <Box sx={{ width: 2, height: 24, bgcolor: COLORS.border }} />
          </Box>
      );
  }
}
