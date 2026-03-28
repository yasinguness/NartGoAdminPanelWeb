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
  Switch,
  FormControlLabel,
  InputAdornment,
  Avatar,
  CircularProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
} from '@mui/material';
import {
  QrCodeScanner as QrIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  PersonOutline as PersonIcon,
  Warning as WarningIcon,
  SignalCellularAlt as OnlineIcon,
  SignalCellularOff as OfflineIcon,
} from '@mui/icons-material';

export interface InteractiveCheckInProps {
  eventId: string;
  eventName: string;
  onScan?: (qrCode: string, gate: string) => Promise<any>;
}

interface ScanData {
  id: string;
  time: string;
  name: string;
  ticketType: string;
  status: 'SUCCESS' | 'ALREADY_USED' | 'INVALID';
  seat?: string;
}

export default function InteractiveCheckInDashboard({ eventId, eventName, onScan }: InteractiveCheckInProps) {
  const [isOffline, setIsOffline] = useState(false);
  const [gate, setGate] = useState('Ana Kapı - Turnike 1');
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Stats
  const [stats, setStats] = useState({ total: 1200, checkedIn: 843, remaining: 357 });

  // Recent scans mock
  const [recentScans, setRecentScans] = useState<ScanData[]>([
    { id: 'scan-1', time: '14:23:45', name: 'Ayşe Yılmaz', ticketType: 'VIP', status: 'SUCCESS', seat: 'VIP-A1' },
    { id: 'scan-2', time: '14:23:10', name: 'Bilinmeyen Bilet', ticketType: '-', status: 'INVALID' },
    { id: 'scan-3', time: '14:22:55', name: 'Can Demir', ticketType: 'Genel Giriş', status: 'ALREADY_USED', seat: 'A Blok-12' },
  ]);

  const [lastScanResult, setLastScanResult] = useState<ScanData | null>(null);

  const simulateScan = async (code: string) => {
    setIsProcessing(true);
    setInputValue('');

    // Simulate network delay
    await new Promise(r => setTimeout(r, 600));

    let scanResult: ScanData;

    if (code.includes('fail')) {
      scanResult = { id: Date.now().toString(), time: new Date().toLocaleTimeString('tr-TR'), name: 'Test Bilet', ticketType: 'Genel', status: 'INVALID' };
    } else if (code.includes('used')) {
      scanResult = { id: Date.now().toString(), time: new Date().toLocaleTimeString('tr-TR'), name: 'Test Bilet', ticketType: 'Genel', status: 'ALREADY_USED' };
    } else {
      scanResult = { id: Date.now().toString(), time: new Date().toLocaleTimeString('tr-TR'), name: 'Ziyaretçi ' + Math.floor(Math.random() * 100), ticketType: Math.random() > 0.8 ? 'VIP' : 'Genel Giriş', status: 'SUCCESS', seat: `C-${Math.floor(Math.random() * 40)}` };
      setStats(prev => ({ ...prev, checkedIn: prev.checkedIn + 1, remaining: prev.remaining - 1 }));
    }

    setLastScanResult(scanResult);
    setRecentScans(prev => [scanResult, ...prev].slice(0, 10)); // Keep last 10
    setIsProcessing(false);

    if (onScan) {
      try {
        await onScan(code, gate);
      } catch (err) {
        console.error('API Error mock', err);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      simulateScan(inputValue.trim());
    }
  };

  const percentage = Math.round((stats.checkedIn / stats.total) * 100);

  return (
    <Box sx={{ p: 1, backgroundColor: '#f0f4f8', minHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header Bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, p: 2, bgcolor: 'white', borderRadius: 2, boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
        <Box>
          <Typography variant="h6" fontWeight={700} color="primary.main">{eventName || 'Event Check-In'}</Typography>
          <Typography variant="body2" color="text.secondary">Gate Kontrol Paneli</Typography>
        </Box>
        <Stack direction="row" spacing={3} alignItems="center">
          <TextField select size="small" value={gate} onChange={(e) => setGate(e.target.value)} sx={{ width: 200 }} SelectProps={{ native: true }}>
            <option value="Ana Kapı - Turnike 1">Ana Kapı - Turnike 1</option>
            <option value="Ana Kapı - Turnike 2">Ana Kapı - Turnike 2</option>
            <option value="VIP Giriş">VIP Giriş</option>
            <option value="Kulis Giriş">Kulis Giriş</option>
          </TextField>
          
          <FormControlLabel
            control={<Switch checked={isOffline} onChange={(e) => setIsOffline(e.target.checked)} color="warning" />}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {isOffline ? <OfflineIcon color="warning" /> : <OnlineIcon color="success" />}
                <Typography variant="body2" fontWeight={600} color={isOffline ? 'warning.main' : 'success.main'}>
                  {isOffline ? 'OFFLINE MOD' : 'CANLI (ONLINE)'}
                </Typography>
              </Box>
            }
          />
        </Stack>
      </Box>

      <Grid container spacing={3} sx={{ flex: 1 }}>
        
        {/* LEFT PANEL: SCANNER & FEEDBACK */}
        <Grid item xs={12} md={5} lg={4}>
          <Paper elevation={0} sx={{ p: 4, height: '100%', borderRadius: 4, display: 'flex', flexDirection: 'column', bgcolor: 'white', boxShadow: '0 8px 30px rgba(0,0,0,0.04)' }}>
            
            <Typography variant="subtitle1" fontWeight={700} mb={2}>Bilet QR veya Barkod Okutun</Typography>
            
            <TextField
              fullWidth
              autoFocus
              placeholder="Fiziksel barkod okuyucu hazır..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isProcessing}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <QrIcon color={isProcessing ? 'disabled' : 'primary'} />
                  </InputAdornment>
                ),
                sx: { borderRadius: 3, fontSize: '1.1rem', bgcolor: '#f8fafc' }
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
               Barkod okuyucu ile okutun veya elle kod girip ENTER'a basın (Test: pass, fail, used)
            </Typography>

            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 4 }}>
              {isProcessing ? (
                <Box sx={{ textAlign: 'center' }}>
                  <CircularProgress size={60} thickness={4} />
                  <Typography variant="h6" sx={{ mt: 2, color: 'text.secondary' }}>Sorgulanıyor...</Typography>
                </Box>
              ) : lastScanResult ? (
                <FeedbackCard result={lastScanResult} />
              ) : (
                <Box sx={{ textAlign: 'center', opacity: 0.3 }}>
                  <QrIcon sx={{ fontSize: 100 }} />
                  <Typography variant="h6" sx={{ mt: 2 }}>Tarama Bekleniyor</Typography>
                </Box>
              )}
            </Box>

            <Button variant="outlined" size="large" sx={{ mt: 3, borderRadius: 3, borderStyle: 'dashed' }} onClick={() => setInputValue('')}>
              LİSTEDEN SEÇ / MANUEL GİRİŞ
            </Button>
          </Paper>
        </Grid>

        {/* MIDDLE PANEL: STATS & OVERVIEW */}
        <Grid item xs={12} md={3} lg={4}>
          <Paper elevation={0} sx={{ p: 4, height: '100%', borderRadius: 4, bgcolor: 'white', boxShadow: '0 8px 30px rgba(0,0,0,0.04)' }}>
            <Typography variant="subtitle1" fontWeight={700} mb={4}>Doluluk Oranı</Typography>
            
            <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center', mb: 6 }}>
              <CircularProgress variant="determinate" value={100} size={200} thickness={3} sx={{ color: '#e2e8f0', position: 'absolute' }} />
              <CircularProgress variant="determinate" value={percentage} size={200} thickness={3} sx={{ color: '#10b981' }} />
              <Box sx={{ position: 'absolute', top: 0, left: 0, bottom: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                <Typography variant="h3" fontWeight={800} color="#10b981">%{percentage}</Typography>
                <Typography variant="body2" color="text.secondary">İçeride</Typography>
              </Box>
            </Box>

            <Stack spacing={3}>
              <StatRow label="Toplam Kapasite" value={stats.total} color="text.primary" />
              <Divider />
              <StatRow label="Giriş Yapan" value={stats.checkedIn} color="#10b981" />
              <Divider />
              <StatRow label="Bekleyen" value={stats.remaining} color="#f59e0b" />
            </Stack>
          </Paper>
        </Grid>

        {/* RIGHT PANEL: AUDIT LOG */}
        <Grid item xs={12} md={4} lg={4}>
          <Paper elevation={0} sx={{ p: 4, height: '100%', borderRadius: 4, display: 'flex', flexDirection: 'column', bgcolor: 'white', boxShadow: '0 8px 30px rgba(0,0,0,0.04)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
               <Typography variant="subtitle1" fontWeight={700}>Son İşlemler</Typography>
               <Chip size="small" label="Canlı Akış" color="success" variant="outlined" />
            </Box>
            
            <List sx={{ flex: 1, overflow: 'auto', p: 0 }}>
              {recentScans.map((scan, index) => (
                <React.Fragment key={scan.id}>
                  <ListItem alignItems="flex-start" sx={{ px: 0, py: 1.5 }}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: scan.status === 'SUCCESS' ? '#e6f4ea' : '#fce8e6', color: scan.status === 'SUCCESS' ? '#137333' : '#c5221f' }}>
                        {scan.status === 'SUCCESS' ? <PersonIcon /> : <WarningIcon />}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="subtitle2" fontWeight={600} color={scan.status !== 'SUCCESS' ? 'error.main' : 'text.primary'}>
                            {scan.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">{scan.time}</Typography>
                        </Box>
                      }
                      secondary={
                        <React.Fragment>
                          <Typography component="span" variant="body2" color="text.secondary">
                            {scan.ticketType} {scan.seat ? ` • Koltuk: ${scan.seat}` : ''}
                          </Typography>
                          {scan.status !== 'SUCCESS' && (
                            <Typography component="div" variant="caption" color="error.main" fontWeight={600} sx={{ mt: 0.5 }}>
                              {scan.status === 'ALREADY_USED' ? 'Zaten Kullanılmış Bilet' : 'Geçersiz Bilet'}
                            </Typography>
                          )}
                        </React.Fragment>
                      }
                    />
                  </ListItem>
                  {index < recentScans.length - 1 && <Divider component="li" />}
                </React.Fragment>
              ))}
            </List>
          </Paper>
        </Grid>

      </Grid>
    </Box>
  );

  function FeedbackCard({ result }: { result: ScanData }) {
    const isSuccess = result.status === 'SUCCESS';
    const isUsed = result.status === 'ALREADY_USED';
    
    return (
      <Box sx={{ 
        p: 4, 
        width: '100%', 
        borderRadius: 4, 
        bgcolor: isSuccess ? '#ecfdf5' : '#fef2f2',
        border: '2px solid',
        borderColor: isSuccess ? '#10b981' : '#ef4444',
        textAlign: 'center',
        animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
      }}>
        {isSuccess ? <CheckCircleIcon sx={{ fontSize: 80, color: '#10b981', mb: 2 }} /> : <CancelIcon sx={{ fontSize: 80, color: '#ef4444', mb: 2 }} />}
        
        <Typography variant="h5" fontWeight={800} color={isSuccess ? '#065f46' : '#991b1b'} mb={1}>
          {isSuccess ? 'GİRİŞ ONAYLANDI' : isUsed ? 'ZATEN KULLANILMIŞ' : 'GEÇERSİZ BİLET'}
        </Typography>
        
        <Typography variant="subtitle1" fontWeight={600} color="text.primary">{result.name}</Typography>
        
        {isSuccess && (
          <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Chip label={`Tip: ${result.ticketType}`} variant="outlined" color="success" />
            {result.seat && <Chip label={`Koltuk: ${result.seat}`} color="success" />}
          </Box>
        )}

        <style>
          {`
            @keyframes popIn {
              0% { transform: scale(0.8); opacity: 0; }
              100% { transform: scale(1); opacity: 1; }
            }
          `}
        </style>
      </Box>
    );
  }

  function StatRow({ label, value, color }: { label: string, value: number, color: string }) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="subtitle1" color="text.secondary">{label}</Typography>
        <Typography variant="h5" fontWeight={700} sx={{ color }}>{value}</Typography>
      </Box>
    );
  }
}
