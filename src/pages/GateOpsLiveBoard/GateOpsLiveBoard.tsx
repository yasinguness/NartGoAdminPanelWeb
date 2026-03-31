import React, { useState, useEffect } from 'react';
import { gateOpsService } from '../../services/gate-ops/gateOps.service';
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
  Drawer,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Warning as WarningIcon,
  Sensors as DeviceIcon,
  Close as CloseIcon,
  Wifi as OnlineIcon,
  WifiOff as OfflineIcon,
  BatteryChargingFull as BatteryIcon,
  Speed as RateIcon,
  Refresh as RefreshIcon,
  Group as QueueIcon,
  ErrorOutline as FraudIcon,
} from '@mui/icons-material';

const COLORS = {
  success: '#10b981', // green / online / normal
  warning: '#f59e0b', // amber / busy / wait
  error: '#ef4444', // red / offline / fraud
  critical: '#b91c1c', // dark red
  neutral: '#64748b',
};

// Mock Gate & Device Data
const mockGates = [
  {
    id: 'G-MAIN', name: 'Ana Giriş (Zemin)', expectedTotal: 800, checkedIn: 340,
    waitMins: 15, scanRate: 18, status: 'BUSY',
    devices: [
      { id: 'PD-11', sn: 'ZBR-911', status: 'ONLINE', ping: '20ms', battery: 85, staff: 'Ali K.' },
      { id: 'PD-12', sn: 'ZBR-912', status: 'ONLINE', ping: '22ms', battery: 60, staff: 'Can D.' },
      { id: 'PD-13', sn: 'ZBR-913', status: 'OFFLINE', ping: '-', battery: 0, staff: 'Bağlantı Koptu' },
    ],
    fraudAlarms: [
      { ticket: 'TCK-ALREADY-99', time: '1sn önce', type: 'REPLAY_ATTEMPT' },
      { ticket: 'TCK-FAKE-01', time: '4dk önce', type: 'INVALID_SIGNATURE' },
    ]
  },
  {
    id: 'G-VIP', name: 'VIP Girişi (Valet)', expectedTotal: 150, checkedIn: 80,
    waitMins: 0, scanRate: 2, status: 'NORMAL',
    devices: [
      { id: 'PD-VIP1', sn: 'IPH-001', status: 'ONLINE', ping: '45ms', battery: 98, staff: 'Ceren Y.' },
    ],
    fraudAlarms: []
  },
  {
    id: 'G-NORTH', name: 'Kuzey Kapı (Balkon)', expectedTotal: 600, checkedIn: 450,
    waitMins: 5, scanRate: 45, status: 'NORMAL',
    devices: [
      { id: 'PD-N1', sn: 'ZBR-441', status: 'ONLINE', ping: '18ms', battery: 45, staff: 'Ayşe B.' },
      { id: 'PD-N2', sn: 'ZBR-442', status: 'ONLINE', ping: '25ms', battery: 30, staff: 'Mehmet Y.' },
    ],
    fraudAlarms: [
      { ticket: 'TCK-ALREADY-44', time: '15dk önce', type: 'REPLAY_ATTEMPT' },
    ]
  },
  {
    id: 'G-SOUTH', name: 'Güney Kapı (Zemin Arka)', expectedTotal: 450, checkedIn: 50,
    waitMins: 35, scanRate: 8, status: 'CRITICAL',
    devices: [
      { id: 'PD-S1', sn: 'ZBR-331', status: 'OFFLINE', ping: '-', battery: 12, staff: 'Zayıf Sinyal' },
      { id: 'PD-S2', sn: 'ZBR-332', status: 'ONLINE', ping: '400ms', battery: 88, staff: 'Burak C.' },
    ],
    fraudAlarms: []
  }
];

export default function GateOpsLiveBoard() {
  const [gates, setGates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGate, setSelectedGate] = useState<any | null>(null);
  const [isDrawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const fetchLiveStatus = async () => {
      try {
        setLoading(true);
        const data = await gateOpsService.getLiveGatewayStatus('e-28haz'); // Default event
        if (data && data.length > 0) {
          setGates(data);
        } else {
          setGates(mockGates);
        }
      } catch (err) {
        console.error("Failed to fetch live gate status, using mock", err);
        setGates(mockGates);
      } finally {
        setLoading(false);
      }
    };

    fetchLiveStatus();
    const timer = setInterval(fetchLiveStatus, 10000); // Polling every 10s
    return () => clearInterval(timer);
  }, []);

  const handleGateClick = (gate: any) => {
    setSelectedGate(gate);
    setDrawerOpen(true);
  };

  const currentGates = gates.length > 0 ? gates : mockGates;
  const totalExpected = currentGates.reduce((sum, g) => sum + g.expectedTotal, 0);
  const totalCheckedIn = currentGates.reduce((sum, g) => sum + g.checkedIn, 0);
  const totalDevices = currentGates.reduce((sum, g) => sum + g.devices.length, 0);
  const offlineDevices = currentGates.reduce((sum, g) => sum + g.devices.filter((d: any) => d.status === 'OFFLINE').length, 0);
  const activeFraudAlarms = currentGates.reduce((sum, g) => sum + g.fraudAlarms.length, 0);

  const occupancyPct = ((totalCheckedIn / totalExpected) * 100).toFixed(1);

  if (loading && gates.length === 0) {
      return (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', bgcolor: '#0f172a' }}>
              <Typography variant="h6" color="white">Kapı Operasyon Sistemine Bağlanılıyor...</Typography>
          </Box>
      );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 'calc(100vh - 64px)', bgcolor: '#0f172a' }}>
      
      {/* 1. Control Room Header */}
      <Box sx={{ p: 2, bgcolor: '#1e293b', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', color: 'white' }}>
        <Typography variant="h6" fontWeight={800} sx={{ mr: 4 }}>Kapı Operasyonları (Canlı)</Typography>
        
        <TextField select size="small" label="Mekan / Etkinlik" defaultValue="e-28haz" sx={{ minWidth: 250, '& .MuiInputBase-root': { color: 'white' }, '& .MuiInputLabel-root': { color: '#94a3b8' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#334155' } }}>
           <MenuItem value="e-28haz">Zorlu PSM (Şu Anki Konser)</MenuItem>
        </TextField>

        <Box sx={{ flexGrow: 1 }} />
        
        <Chip icon={<Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: COLORS.success, ml: 1, animation: 'pulse 1.5s infinite' }}/>} label="CANLI YAYIN" sx={{ bgcolor: 'rgba(16, 185, 129, 0.1)', color: COLORS.success, fontWeight: 700 }} />
        <Button variant="outlined" startIcon={<RefreshIcon />} size="small" sx={{ borderColor: '#334155', color: '#cbd5e1', fontWeight: 600 }}>
          Şimdi Senkronize Et
        </Button>
      </Box>

      {/* 2. Global KPI Bar (Sticky) */}
      <Box sx={{ p: 2, bgcolor: '#0b0f19', color: 'white', position: 'sticky', top: 64, zIndex: 10, display: 'flex', justifyContent: 'space-between', gap: 2, overflowX: 'auto', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <KpiItem label="Giriş Yapan" value={`${totalCheckedIn} / ${totalExpected}`} subValue={`%${occupancyPct} Doluluk`} color={COLORS.success} />
        <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
        <KpiItem label="Ortalama Bekleme" value="14 dk" subValue="Maks. Kuyruk 35 dk" color={COLORS.warning} icon={<QueueIcon fontSize="small"/>} />
        <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
        <KpiItem label="Tarayıcı Durumu" value={`${totalDevices - offlineDevices} / ${totalDevices}`} subValue={`${offlineDevices} Cihaz Çevrimdışı`} color={offlineDevices > 0 ? COLORS.error : COLORS.success} icon={<DeviceIcon fontSize="small"/>} />
        <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
        <KpiItem label="Güvenlik & Dolandırıcılık" value={`${activeFraudAlarms}`} subValue="Son 1 Saat İçinde" color={activeFraudAlarms > 0 ? COLORS.error : COLORS.success} icon={<FraudIcon fontSize="small"/>}/>
      </Box>

      {/* 3. Split-view: Gate Grid vs Drawer */}
      <Box sx={{ display: 'flex', flex: 1, p: 3, gap: 3, overflow: 'hidden' }}>
        
        {/* LEFT PANEL: Responsive Grid of Gates */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
            <Grid container spacing={3}>
                {currentGates.map(gate => {
                    const pct = ((gate.checkedIn / gate.expectedTotal) * 100).toFixed(0);
                    const isOfflineGate = gate.devices.every(d => d.status === 'OFFLINE');
                    let gateCol = COLORS.success;
                    if (gate.status === 'BUSY') gateCol = COLORS.warning;
                    if (gate.status === 'CRITICAL' || isOfflineGate) gateCol = COLORS.error;
                    
                    return (
                        <Grid item xs={12} md={6} xl={4} key={gate.id}>
                            <Paper 
                                onClick={() => handleGateClick(gate)}
                                sx={{ 
                                    p: 3, 
                                    borderRadius: 3, 
                                    bgcolor: '#1e293b', 
                                    border: '1px solid', 
                                    borderColor: gateCol === COLORS.error ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.05)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 16px rgba(0,0,0,0.5)' }
                                }}
                            >
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                    <Box>
                                        <Typography variant="h6" fontWeight={800} color="white">{gate.name}</Typography>
                                        <Typography variant="caption" color="#94a3b8" sx={{ fontFamily: 'monospace' }}>{gate.id}</Typography>
                                    </Box>
                                    <Chip 
                                        label={gate.status} 
                                        size="small" 
                                        sx={{ bgcolor: gateCol + '15', color: gateCol, fontWeight: 800, borderRadius: 1 }} 
                                    />
                                </Box>
                                
                                <Grid container spacing={2} sx={{ mb: 3 }}>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="#94a3b8" fontWeight={700}>TRAFİK (GİREN / BEKLENEN)</Typography>
                                        <Typography variant="h5" color="white" fontWeight={800}>{gate.checkedIn} <Typography component="span" variant="body2" color="#64748b">/ {gate.expectedTotal}</Typography></Typography>
                                        <LinearProgress variant="determinate" value={Number(pct)} sx={{ mt: 1, bgcolor: '#334155', '& .MuiLinearProgress-bar': { bgcolor: COLORS.success } }} />
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="#94a3b8" fontWeight={700} sx={{ display: 'block' }}>HIZ & BEKLEME</Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'end', gap: 1 }}>
                                            <Typography variant="h5" color={gate.waitMins > 20 ? COLORS.error : gate.waitMins > 10 ? COLORS.warning : COLORS.success} fontWeight={800}>
                                                {gate.waitMins} <Typography component="span" variant="caption" fontWeight={700}>dk</Typography>
                                            </Typography>
                                            <Typography variant="caption" color="#64748b" sx={{ mb: 0.5 }}>(@ {gate.scanRate} bilet/dk)</Typography>
                                        </Box>
                                    </Grid>
                                </Grid>

                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, bgcolor: '#0f172a', borderRadius: 2 }}>
                                    
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        {gate.devices.map(d => (
                                            <Tooltip title={`Cihaz: ${d.sn} (${d.status}) - Şarj: ${d.battery}%`} key={d.id}>
                                                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: d.status === 'ONLINE' ? COLORS.success : COLORS.error, border: '2px solid #0f172a' }} />
                                            </Tooltip>
                                        ))}
                                    </Box>
                                    
                                    {gate.fraudAlarms.length > 0 ? (
                                        <Box sx={{ display: 'flex', alignItems: 'center', color: COLORS.error }}>
                                            <FraudIcon sx={{ fontSize: 16, mr: 0.5 }} />
                                            <Typography variant="caption" fontWeight={800}>{gate.fraudAlarms.length} ALARM (SON 15 DK)</Typography>
                                        </Box>
                                    ) : (
                                        <Typography variant="caption" fontWeight={700} color="#64748b">ALARM YOK</Typography>
                                    )}
                                </Box>
                            </Paper>
                        </Grid>
                    );
                })}
            </Grid>
        </Box>
        
        {/* RIGHT DRAWER: Gate Drill-down Panel */}
        <Drawer
          anchor="right"
          variant="persistent"
          open={isDrawerOpen}
          sx={{ '& .MuiDrawer-paper': { width: { xs: '100%', md: 450 }, position: 'relative', bgcolor: '#1e293b', borderLeft: '1px solid rgba(255,255,255,0.05)', boxShadow: '-4px 0 30px rgba(0,0,0,0.5)' } }}
        >
          {selectedGate ? (
            <Box sx={{ p: 4, height: '100%', display: 'flex', flexDirection: 'column', color: 'white' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                 <Box>
                    <Typography variant="h5" fontWeight={800} color="white">{selectedGate.name}</Typography>
                    <Typography variant="caption" color="#94a3b8" sx={{ fontFamily: 'monospace', letterSpacing: 1 }}>{selectedGate.id} • KAPI DETAYI</Typography>
                 </Box>
                 <IconButton onClick={() => setDrawerOpen(false)} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: 'white' }}>
                    <CloseIcon fontSize="small" />
                 </IconButton>
              </Box>
              
              <Divider sx={{ mb: 4, borderColor: 'rgba(255,255,255,0.1)' }} />

              <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 2, color: '#e2e8f0', display: 'flex', alignItems: 'center' }}>
                 <DeviceIcon sx={{ mr: 1, fontSize: 18, color: '#64748b' }} /> Cihaz & Personel Skoru
              </Typography>

              <Stack spacing={2} sx={{ mb: 4 }}>
                  {selectedGate.devices.map((d: any) => {
                      const isOffline = d.status === 'OFFLINE';
                      return (
                          <Box key={d.id} sx={{ p: 2, bgcolor: '#0f172a', borderRadius: 2, border: '1px solid', borderColor: isOffline ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.05)' }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                      {isOffline ? <OfflineIcon sx={{ color: COLORS.error, mr: 1, fontSize: 18 }} /> : <OnlineIcon sx={{ color: COLORS.success, mr: 1, fontSize: 18 }} />}
                                      <Typography variant="subtitle2" fontWeight={700} color={isOffline ? COLORS.error : 'white'}>{d.sn}</Typography>
                                      <Typography variant="caption" sx={{ ml: 1, color: '#64748b', fontFamily: 'monospace' }}>({d.id})</Typography>
                                  </Box>
                                  <Chip label={d.status} size="small" sx={{ bgcolor: isOffline ? 'rgba(239,68,68,0.1)' : 'rgba(16, 185, 129, 0.1)', color: isOffline ? COLORS.error : COLORS.success, fontSize: '0.6rem', height: 20, fontWeight: 800 }} />
                              </Box>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Box>
                                      <Typography variant="caption" color="#64748b" display="block">PERSONEL GİRİŞİ</Typography>
                                      <Typography variant="body2" fontWeight={600} color="#cbd5e1">{d.staff}</Typography>
                                  </Box>
                                  <Stack direction="row" spacing={2}>
                                      <Box sx={{ textAlign: 'right' }}>
                                          <Typography variant="caption" color="#64748b" display="block">PİNG</Typography>
                                          <Typography variant="body2" fontWeight={700} color={d.ping === '-' ? COLORS.error : d.ping.replace('ms', '') > 200 ? COLORS.warning : COLORS.success}>{d.ping}</Typography>
                                      </Box>
                                      <Box sx={{ textAlign: 'right' }}>
                                          <Typography variant="caption" color="#64748b" display="block">ŞARJ</Typography>
                                          <Box sx={{ display: 'flex', alignItems: 'center', color: d.battery < 20 ? COLORS.error : COLORS.success }}>
                                              <BatteryIcon sx={{ fontSize: 16 }} />
                                              <Typography variant="body2" fontWeight={700}>%{d.battery}</Typography>
                                          </Box>
                                      </Box>
                                  </Stack>
                              </Box>
                          </Box>
                      );
                  })}
              </Stack>

              <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 2, color: '#e2e8f0', display: 'flex', alignItems: 'center' }}>
                 <WarningIcon sx={{ mr: 1, fontSize: 18, color: '#f59e0b' }} /> Canlı Güvenlik Kaydı
              </Typography>

              <Stack spacing={1} sx={{ flex: 1 }}>
                  {selectedGate.fraudAlarms.length === 0 ? (
                      <Box sx={{ p: 3, textAlign: 'center', bgcolor: 'rgba(16, 185, 129, 0.05)', borderRadius: 2, border: '1px dashed rgba(16, 185, 129, 0.2)' }}>
                          <Typography variant="body2" color={COLORS.success} fontWeight={600}>Bu kapıda güvenlik şüphesi yok.</Typography>
                      </Box>
                  ) : (
                      selectedGate.fraudAlarms.map((alm: any, idx: number) => (
                          <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', p: 1.5, bgcolor: '#0f172a', borderRadius: 2, borderLeft: `3px solid ${COLORS.error}` }}>
                              <Box>
                                  <Typography variant="body2" fontWeight={700} color="#ef4444">{alm.type}</Typography>
                                  <Typography variant="caption" color="#94a3b8" sx={{ fontFamily: 'monospace' }}>Bilet: {alm.ticket}</Typography>
                              </Box>
                              <Typography variant="caption" color="#64748b" fontWeight={700}>{alm.time}</Typography>
                          </Box>
                      ))
                  )}
              </Stack>

              {/* Action Bar Bottom */}
              <Box sx={{ mt: 'auto', display: 'flex', gap: 2, pt: 3, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                 <Button variant="outlined" fullWidth sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.2)' }}>
                   KAPIYI SIFIRLA
                 </Button>
                 <Button variant="contained" color="error" fullWidth disableElevation sx={{ fontWeight: 700 }}>
                   ANONSA BAĞLAN
                 </Button>
              </Box>
            </Box>
          ) : null}
        </Drawer>
      </Box>

      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
      `}</style>
    </Box>
  );

  function KpiItem({ label, value, subValue, color, icon }: { label: string, value: string, subValue: string, color: string, icon?: any }) {
    return (
      <Box sx={{ minWidth: 160, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
           {icon && <Box sx={{ color }}>{icon}</Box>}
           <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>{label}</Typography>
        </Box>
        <Typography variant="h4" sx={{ color: 'white', fontWeight: 800 }}>{value}</Typography>
        <Typography variant="caption" sx={{ color, fontWeight: 600 }}>{subValue}</Typography>
      </Box>
    );
  }
}
