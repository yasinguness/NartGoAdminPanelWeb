import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Stack,
  Button,
  TextField,
  MenuItem,
  Chip,
  Divider,
  List,
  ListItemButton,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  AccountBalanceWallet as PayoutIcon,
  ReceiptLong as LedgerIcon,
  MoneyOff as RefundIcon,
  TrendingDown as ChargebackIcon,
  PointOfSale as SalesIcon,
  CheckCircle as SettledIcon,
  HourglassEmpty as PendingIcon,
  WarningAmber as WarningIcon,
  Download as ExportIcon,
  EditNote as AdjustIcon,
  AccountBalance as BankIcon,
} from '@mui/icons-material';

// --- Domain Models from Specification ---
export type SettlementStatus = 'DRAFT' | 'READY' | 'ON_HOLD' | 'PROCESSING' | 'PAID' | 'FAILED' | 'RECONCILING';
export type PayoutStatus = 'NOT_STARTED' | 'QUEUED' | 'SENT' | 'SETTLED' | 'FAILED';

export interface SettlementKpi {
  grossSales: number;
  netSales: number;
  refundTotal: number;
  serviceFeeRevenue: number;
  organizerPayable: number;
  pendingPayout: number;
  chargebackExposure: number;
  failedSettlementCount: number;
}

export interface LedgerEntry {
  id: string;
  type: string;
  desc: string;
  amount: number;
}

export interface SettlementBatch {
  id: string;
  organizerName: string;
  period: string; // simplification for mock
  currency: string;
  status: SettlementStatus;
  payoutStatus: PayoutStatus;
  grossSales: number;
  refundedAmount: number;
  serviceFeeRevenue: number;
  taxTotal: number;
  manualAdjustmentsTotal: number;
  chargebackTotal: number;
  netPayable: number;
  anomalyFlags: string[];
}


const COLORS = {
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  primary: '#3b82f6',
  surface: '#f8fafc',
  border: '#e2e8f0',
};

// --- Component ---
import { settlementService } from '../../services/finance/settlement.service';

export default function SettlementFinance() {
  const [selectedBatch, setSelectedBatch] = useState<SettlementBatch | null>(null);
  const [batches, setBatches] = useState<SettlementBatch[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [rightTab, setRightTab] = useState(0);

  useEffect(() => {
    // Implementasyon: Gerçek backend API'sine bağlanıyor
    const fetchSettlements = async () => {
      try {
        setLoading(true);
        const data = await settlementService.getSettlements();
        setBatches(data || []);
        if (data && data.length > 0) {
            setSelectedBatch(data[0]);
        }
        const kpis = await settlementService.getKpis();
        if (kpis?.ledger) {
            setLedger(kpis.ledger);
        }
      } catch (err) {
        console.error('Failed to fetch settlements', err);
        setBatches([]);
      } finally {
        setLoading(false);
      }
    };
    fetchSettlements();
  }, []);

  const formatMoney = (val: number) => `₺${Math.abs(val).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;

  if (loading || !selectedBatch) {
      return (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', bgcolor: '#f1f5f9' }}>
              <Typography variant="h6" color="text.secondary">Yükleniyor...</Typography>
          </Box>
      );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 'calc(100vh - 64px)', bgcolor: '#f1f5f9' }}>
      
      {/* 1. ÜST SABİT FİLTRE BANDI */}
      <Box sx={{ p: 2, bgcolor: '#ffffff', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="h6" fontWeight={800} sx={{ mr: 2 }}>Ödeme & Mutabakat</Typography>
        
        <TextField select size="small" label="Tarih Aralığı" defaultValue="THIS_WEEK" sx={{ minWidth: 150 }}>
           <MenuItem value="THIS_WEEK">Bu Hafta</MenuItem>
           <MenuItem value="LAST_WEEK">Geçen Hafta</MenuItem>
        </TextField>
        <TextField select size="small" label="Organizatör" defaultValue="ALL" sx={{ minWidth: 200 }}>
           <MenuItem value="ALL">Tüm Organizatörler</MenuItem>
           <MenuItem value="O1">Zorlu PSM</MenuItem>
        </TextField>
        <TextField select size="small" label="Durum" defaultValue="ALL" sx={{ minWidth: 150 }}>
           <MenuItem value="ALL">Tümü</MenuItem>
           <MenuItem value="READY">Ödemeye Hazır</MenuItem>
           <MenuItem value="ON_HOLD">Beklemede</MenuItem>
        </TextField>
        
        <Box sx={{ flexGrow: 1 }} />
        <Button variant="outlined" startIcon={<ExportIcon />} sx={{ fontWeight: 700, borderColor: COLORS.border, color: '#334155' }}>Toplu Dışa Aktar</Button>
      </Box>

      {/* 2. KPI ŞERİDİ */}
      <Box sx={{ p: 2, bgcolor: '#0f172a', color: 'white', position: 'sticky', top: 64, zIndex: 10, display: 'flex', justifyContent: 'space-between', gap: 2, overflowX: 'auto', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <KpiItem label="Brüt Satış" value="₺470.000" subValue="Konsolide Satış" color="#38bdf8" />
        <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
        <KpiItem label="Net Satış" value="₺411.000" subValue="İadeler Düşülmüş" color="#10b981" />
        <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
        <KpiItem label="Toplam İade" value="- ₺59.000" subValue="%12,5 İade Oranı" color="#ef4444" />
        <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
        <KpiItem label="Hizmet Bedeli Geliri" value="+ ₺23.500" subValue="Platform Geliri" color="#8b5cf6" />
        <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
        <Box sx={{ display: 'flex', flexDirection: 'column', bgcolor: 'rgba(16, 185, 129, 0.1)', px: 3, py: 0.5, borderRadius: 2, border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700 }}>ORGANİZATÖR ÖDENECEĞİ</Typography>
            <Typography variant="h4" sx={{ color: '#10b981', fontWeight: 800 }}>₺378.500</Typography>
        </Box>
      </Box>

      {/* 3. THREE-PANEL ARCHITECTURE */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* SOL: SETTLEMENT QUEUE (30%) */}
        <Box sx={{ width: '28%', minWidth: 320, borderRight: `1px solid ${COLORS.border}`, bgcolor: 'white', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 2, borderBottom: `1px solid ${COLORS.border}`, bgcolor: COLORS.surface }}>
                <Typography variant="subtitle2" fontWeight={800} color="text.secondary">HAKEDİŞ KUYRUĞU</Typography>
            </Box>
            <List sx={{ flex: 1, overflow: 'auto', p: 0 }}>
                {batches.map(batch => (
                    <ListItemButton 
                        key={batch.id} 
                        onClick={() => setSelectedBatch(batch)}
                        selected={selectedBatch.id === batch.id}
                        sx={{ borderBottom: `1px solid ${COLORS.border}`, flexDirection: 'column', alignItems: 'flex-start', p: 2.5, bgcolor: selectedBatch.id === batch.id ? '#eff6ff' : 'white' }}
                    >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', mb: 0.5 }}>
                            <Typography variant="subtitle2" fontWeight={800}>{batch.organizerName}</Typography>
                            <StatusChip status={batch.status} />
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', mb: 2 }}>{batch.id} • {batch.period}</Typography>
                        
                        <Stack direction="row" justifyContent="space-between" sx={{ width: '100%' }}>
                            <Box>
                                <Typography variant="caption" color="text.secondary" display="block" fontWeight={700}>GROSS</Typography>
                                <Typography variant="body2" fontWeight={700}>{formatMoney(batch.grossSales)}</Typography>
                            </Box>
                            <Box sx={{ textAlign: 'right' }}>
                                <Typography variant="caption" color="text.secondary" display="block" fontWeight={700}>NET ÖDENECEK</Typography>
                                <Typography variant="body2" fontWeight={800} color={COLORS.success}>{formatMoney(batch.netPayable)}</Typography>
                            </Box>
                        </Stack>
                        
                        {batch.anomalyFlags.length > 0 && (
                            <Box sx={{ display: 'flex', alignItems: 'center', mt: 2, color: COLORS.error }}>
                                <WarningIcon sx={{ fontSize: 16, mr: 0.5 }} />
                                <Typography variant="caption" fontWeight={700}>{batch.anomalyFlags.length} RİSK ALARMI</Typography>
                            </Box>
                        )}
                    </ListItemButton>
                ))}
            </List>
        </Box>

        {/* ORTA: SETTLEMENT DETAIL (42%) */}
        <Box sx={{ width: '42%', minWidth: 500, bgcolor: COLORS.surface, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            
            <Box sx={{ p: 4, bgcolor: 'white', borderBottom: `1px solid ${COLORS.border}` }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box>
                        <Typography variant="h4" fontWeight={800} color="#0f172a">{selectedBatch.organizerName}</Typography>
                        <Typography variant="subtitle1" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{selectedBatch.id} • Periyot: {selectedBatch.period}</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">ÖDEME DURUMU</Typography>
                        <Chip label={selectedBatch.payoutStatus} color={selectedBatch.payoutStatus==='SETTLED'?'success':'warning'} sx={{ fontWeight: 800 }} />
                    </Box>
                </Box>

                {selectedBatch.anomalyFlags.length > 0 && (
                     <Paper elevation={0} sx={{ p: 2, bgcolor: '#fef2f2', border: `1px solid ${COLORS.error}`, borderRadius: 2, mb: 2 }}>
                         <Typography variant="subtitle2" color={COLORS.error} fontWeight={800} sx={{ display: 'flex', alignItems: 'center' }}>
                             <WarningIcon sx={{ mr: 1 }} /> Anomali (Risk) Algılandı: Ödeme Durduruldu
                         </Typography>
                         <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                             {selectedBatch.anomalyFlags.map(f => <Chip key={f} label={f} size="small" sx={{ bgcolor: 'white', color: COLORS.error, fontWeight: 700 }} />)}
                         </Stack>
                     </Paper>
                )}
            </Box>

            <Box sx={{ p: 4, flex: 1, overflow: 'auto' }}>
                <Typography variant="subtitle2" fontWeight={800} color="text.secondary" sx={{ mb: 2, letterSpacing: 1 }}>NET ÖDENECEK FORMÜLÜ (DAĞILIM)</Typography>
                
                <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: `1px solid ${COLORS.border}`, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <FormulaRow label="Brüt Satışlar" val={selectedBatch.grossSales} type="POSITIVE" />
                    <FormulaRow label="İadeler" val={selectedBatch.refundedAmount} type="NEGATIVE" />
                    
                    <Divider sx={{ my: 1 }} />
                    
                    <FormulaRow label="Net Satış Cirosu" val={selectedBatch.grossSales - selectedBatch.refundedAmount} type="NEUTRAL" bold />
                    
                    <Box sx={{ height: 16 }} />
                    <FormulaRow label="Platform Komisyonu" val={selectedBatch.serviceFeeRevenue} type="NEGATIVE" />
                    <FormulaRow label="Vergiler (Stopaj)" val={selectedBatch.taxTotal} type="NEGATIVE" />
                    <FormulaRow label="Chargeback Kesintisi" val={selectedBatch.chargebackTotal} type="NEGATIVE" />
                    <FormulaRow label="Manuel Düzeltmeler" val={selectedBatch.manualAdjustmentsTotal} type={selectedBatch.manualAdjustmentsTotal < 0 ? 'NEGATIVE' : 'POSITIVE'} />

                    <Divider sx={{ my: 1, borderBottomWidth: 2, borderColor: '#cbd5e1' }} />
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="subtitle1" fontWeight={800} color="#0f172a">ORGANİZATÖR NET ÖDENECEK</Typography>
                        <Typography variant="h4" fontWeight={900} color={COLORS.success}>{formatMoney(selectedBatch.netPayable)}</Typography>
                    </Box>
                </Paper>

                <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
                    <Button variant="outlined" disableElevation size="large" sx={{ flex: 1, fontWeight: 700, color: COLORS.error, borderColor: 'rgba(239,68,68,0.5)' }}>
                        DURDUR
                    </Button>
                    <Button variant="contained" disableElevation size="large" sx={{ flex: 2, fontWeight: 800, bgcolor: COLORS.primary }} disabled={selectedBatch.status !== 'READY'}>
                        ONAYLA & ÖDE
                    </Button>
                </Box>
            </Box>
        </Box>

        {/* SAĞ: LEDGER / EXPORT (30%) */}
        <Box sx={{ width: '30%', minWidth: 350, borderLeft: `1px solid ${COLORS.border}`, bgcolor: 'white', display: 'flex', flexDirection: 'column' }}>
            <Tabs value={rightTab} onChange={(e, v) => setRightTab(v)} sx={{ borderBottom: `1px solid ${COLORS.border}`, '& .MuiTab-root': { fontWeight: 700, textTransform: 'none' } }}>
                <Tab label="Hesap Defteri" />
                <Tab label="Düzeltmeler" />
                <Tab label="Dışa Aktar" />
            </Tabs>

            <Box sx={{ flex: 1, overflow: 'auto', p: 0 }}>
                {rightTab === 0 && (
                    <List disablePadding>
                        {ledger.map(l => (
                            <ListItemButton key={l.id} sx={{ borderBottom: `1px solid ${COLORS.surface}`, p: 2 }}>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="body2" fontWeight={700}>{l.desc}</Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>Tür: {l.type}</Typography>
                                </Box>
                                <Typography variant="body2" fontWeight={800} color={l.amount > 0 ? COLORS.success : l.amount < 0 ? COLORS.error : 'inherit'}>
                                    {l.amount > 0 ? '+' : ''}{formatMoney(l.amount)}
                                </Typography>
                            </ListItemButton>
                        ))}
                    </List>
                )}
                
                {rightTab === 1 && (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                        <AdjustIcon sx={{ fontSize: 60, color: COLORS.neutral, opacity: 0.3, mb: 2 }} />
                        <Typography variant="subtitle2" fontWeight={700}>Manuel Düzeltme Ekle</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Ceza kesintisi, iyi niyet iadesi veya vergi düzeltmesi girin.</Typography>
                        <Button variant="outlined" sx={{ fontWeight: 700 }}>+ YENİ DÜZELTME (BORÇ/ALACAK)</Button>
                    </Box>
                )}

                {rightTab === 2 && (
                    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Typography variant="subtitle2" fontWeight={700} color="text.secondary">MUHASEBE & RAPOR</Typography>
                        <Button variant="outlined" startIcon={<ExportIcon/>} sx={{ justifyContent: 'flex-start', py: 1.5, fontWeight: 700 }}>Mutabakat Dışa Aktar (XLSX)</Button>
                        <Button variant="outlined" startIcon={<ExportIcon/>} sx={{ justifyContent: 'flex-start', py: 1.5, fontWeight: 700 }}>Ekstre İndir (PDF)</Button>
                        <Button variant="outlined" startIcon={<BankIcon/>} sx={{ justifyContent: 'flex-start', py: 1.5, fontWeight: 700 }}>Muhasebe ERP Entegrasyonu</Button>
                    </Box>
                )}
            </Box>
        </Box>

      </Box>
    </Box>
  );

  function FormulaRow({ label, val, type, bold=false }: { label: string, val: number, type: 'POSITIVE'|'NEGATIVE'|'NEUTRAL', bold?: boolean }) {
      if (val === 0 && !bold) return null;
      let color = 'text.primary';
      let sign = '';
      if (type === 'POSITIVE') { color = COLORS.success; sign = '+ '; }
      if (type === 'NEGATIVE') { color = COLORS.error; sign = '- '; }
      
      return (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" fontWeight={bold ? 800 : 600} color="text.secondary">{label}</Typography>
              <Typography variant="body1" fontWeight={bold ? 800 : 700} color={color} sx={{ fontFamily: 'monospace' }}>
                  {sign}{formatMoney(val)}
              </Typography>
          </Box>
      );
  }

  function StatusChip({ status }: { status: SettlementStatus }) {
      let color = COLORS.neutral;
      if (status === 'READY') color = COLORS.success;
      if (status === 'ON_HOLD') color = COLORS.error;
      if (status === 'PAID') color = COLORS.primary;
      return <Chip label={status} size="small" sx={{ bgcolor: color+'20', color, fontWeight: 800, fontSize: '0.65rem', height: 20 }} />;
  }

  function KpiItem({ label, value, subValue, color }: { label: string, value: string, subValue: string, color: string }) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700, letterSpacing: 1 }}>{label}</Typography>
        <Typography variant="h4" sx={{ color: 'white', fontWeight: 800 }}>{value}</Typography>
        <Typography variant="caption" sx={{ color, fontWeight: 600 }}>{subValue}</Typography>
      </Box>
    );
  }
}
