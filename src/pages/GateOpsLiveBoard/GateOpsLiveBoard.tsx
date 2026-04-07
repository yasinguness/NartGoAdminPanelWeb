import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Stack,
  Grid,
  Button,
  TextField,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Chip,
  alpha,
  keyframes,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
} from '@mui/material';
import {
  QrCode2,
  CheckCircle,
  Cancel,
  Warning,
  Person,
  Search,
  PlayArrow,
  Stop,
  Close,
  Settings,
  Download,
  MeetingRoom,
  Refresh,
  Wifi,
  WifiOff,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useSnackbar } from 'notistack';
import {
  gateOpsService,
  CheckInStats,
  TicketValidationResponse,
  CheckInAuditEntry,
  FraudAlarm,
} from '../../services/gate-ops/gateOps.service';

// ── Constants ────────────────────────────────────────────────────────────────
const TOTAL_CAPACITY = 100;
const CATEGORY_CAPS: Record<string, number> = { sahne: 20, vip: 30, standart: 60, balkon: 40 };
const CATEGORY_LABELS: Record<string, string> = {
  sahne: 'Sahne Önü',
  vip: 'VIP',
  standart: 'Standart',
  balkon: 'Balkon',
};
const CATEGORY_COLORS: Record<string, string> = {
  sahne: '#e040fb',
  vip: '#ffd740',
  standart: '#42a5f5',
  balkon: '#66bb6a',
};

// ── Doküman Bölüm 6.2: Doğrulama Renk Sistemi ─────────────────────────────
type ValidationResult = 'VALID' | 'ALREADY_USED' | 'INVALID' | 'WRONG_EVENT' | 'TOO_EARLY' | 'TRANSFERRED';
const VALIDATION_COLORS: Record<ValidationResult, { bg: string; fg: string; label: string; icon: 'success' | 'error' | 'warning' | 'info' }> = {
  VALID:        { bg: '#22c55e', fg: '#fff', label: 'GİRİŞ ONAYLANDI', icon: 'success' },
  ALREADY_USED: { bg: '#ef4444', fg: '#fff', label: 'BU BİLET ZATEN KULLANILDI', icon: 'error' },
  INVALID:      { bg: '#dc2626', fg: '#fff', label: 'GEÇERSİZ BİLET', icon: 'error' },
  WRONG_EVENT:  { bg: '#f59e0b', fg: '#000', label: 'BAŞKA ETKİNLİĞE AİT', icon: 'warning' },
  TOO_EARLY:    { bg: '#eab308', fg: '#000', label: 'ETKİNLİK HENÜZ BAŞLAMADI', icon: 'warning' },
  TRANSFERRED:  { bg: '#f97316', fg: '#fff', label: 'TRANSFER EDİLMİŞ BİLET', icon: 'info' },
};

// ── Sesli Uyarı Sistemi (Web Audio API) ─────────────────────────────────────
const audioCtxRef = { current: null as AudioContext | null };
function getAudioCtx(): AudioContext {
  if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
  return audioCtxRef.current;
}
function playBeep(frequency: number, duration: number, type: OscillatorType = 'sine') {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.value = 0.3;
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch { /* Audio not supported */ }
}
function playSuccessSound() {
  playBeep(880, 0.15, 'sine');
  setTimeout(() => playBeep(1100, 0.2, 'sine'), 150);
}
function playErrorSound() {
  playBeep(300, 0.3, 'square');
  setTimeout(() => playBeep(200, 0.4, 'square'), 200);
}
function playWarningSound() {
  playBeep(600, 0.2, 'triangle');
  setTimeout(() => playBeep(500, 0.2, 'triangle'), 200);
}

const TURKISH_NAMES = [
  'Ayse Kaya', 'Burak Demir', 'Canan Yildiz', 'Deniz Arslan', 'Elif Sahin',
  'Fatih Celik', 'Gul Ozturk', 'Hakan Acar', 'Irem Polat', 'Kemal Yilmaz',
  'Leyla Korkmaz', 'Mert Aksoy', 'Nihan Erdem', 'Oguz Tas', 'Pinar Dogan',
  'Recep Aydin', 'Selin Unal', 'Tolga Kurt', 'Umut Kaplan', 'Vildan Sen',
];

type ScanState = 'idle' | 'scanning' | 'success' | 'error' | 'duplicate';
interface LogEntry { type: ScanState; name: string; detail: string; time: string; }
interface AlertEntry { text: string; color: string; time: string; }
interface OverlayData { type: ScanState; name: string; detail: string; category: string; }

// ── Animations ───────────────────────────────────────────────────────────────
const scanLineMove = keyframes`
  0% { top: 0; }
  100% { top: calc(100% - 2px); }
`;
const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;
const shakeAnim = keyframes`
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-6px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
`;
const fadeSlideIn = keyframes`
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
`;

// ── Helper ───────────────────────────────────────────────────────────────────
function timeNow(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randomSeat(cat: string): { row: string; seat: number } {
  const rows = 'ABCDEFGHIJKLMNOP';
  return { row: rows[Math.floor(Math.random() * 8)], seat: Math.floor(Math.random() * 30) + 1 };
}
function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ── Component ────────────────────────────────────────────────────────────────
export default function GateOpsLiveBoard() {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();

  // URL params
  const { eventId: paramEventId } = useParams<{ eventId?: string }>();
  const [searchParams] = useSearchParams();
  const eventId = paramEventId || searchParams.get('eventId') || '';

  // Mode
  const [mode, setMode] = useState<'demo' | 'live'>(eventId ? 'live' : 'demo');

  // Core state (used in demo mode, partially updated in live mode)
  const [counts, setCounts] = useState({ checkin: 0, errors: 0, dups: 0, vip: 0 });
  const [catCounts, setCatCounts] = useState<Record<string, number>>({ sahne: 0, vip: 0, standart: 0, balkon: 0 });
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [alerts, setAlerts] = useState<AlertEntry[]>([]);
  const [vipLog, setVipLog] = useState<LogEntry[]>([]);
  const [paceData, setPaceData] = useState<number[]>(Array(12).fill(0));
  const [checkedIn, setCheckedIn] = useState<Set<string>>(new Set());

  // Scan state
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [overlayData, setOverlayData] = useState<OverlayData | null>(null);
  const [manualCode, setManualCode] = useState('');

  // Auto demo
  const [autoRunning, setAutoRunning] = useState(false);
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const paceRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const paceCounterRef = useRef(0);

  // Dialogs
  const [searchOpen, setSearchOpen] = useState(false);
  const [closeGateOpen, setCloseGateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Live data state
  const [liveStats, setLiveStats] = useState<CheckInStats | null>(null);
  const [liveAudits, setLiveAudits] = useState<CheckInAuditEntry[]>([]);
  const [liveFraudAlarms, setLiveFraudAlarms] = useState<FraudAlarm[]>([]);
  const [liveHourlyCounts, setLiveHourlyCounts] = useState<number[]>(Array(12).fill(0));
  const [liveLoading, setLiveLoading] = useState(false);

  // Pace tracker — every 30s push counter to paceData (demo mode only)
  useEffect(() => {
    if (mode === 'demo') {
      paceRef.current = setInterval(() => {
        setPaceData(prev => {
          const next = [...prev.slice(1), paceCounterRef.current];
          paceCounterRef.current = 0;
          return next;
        });
      }, 30000);
      return () => { if (paceRef.current) clearInterval(paceRef.current); };
    }
  }, [mode]);

  // ── Live data fetching ─────────────────────────────────────────────────────
  const fetchLiveData = useCallback(async () => {
    if (mode !== 'live' || !eventId) return;
    try {
      const [stats, audits, alarms, hourly] = await Promise.allSettled([
        gateOpsService.getCheckInStats(eventId),
        gateOpsService.getRecentAudits(eventId, 2),
        gateOpsService.getFraudAlarms(eventId, 60),
        gateOpsService.getHourlyCounts(eventId),
      ]);
      if (stats.status === 'fulfilled' && stats.value) {
        setLiveStats(stats.value);
      }
      if (audits.status === 'fulfilled' && audits.value) {
        setLiveAudits(audits.value);
        setLogEntries(audits.value.map(a => ({
          type: a.validationStatus === 'SUCCESS' ? 'success' as ScanState :
                a.validationStatus === 'ALREADY_USED' ? 'duplicate' as ScanState : 'error' as ScanState,
          name: a.userName || a.userEmail || 'Bilinmeyen',
          detail: a.ticketTypeName || a.validationStatus,
          time: formatTime(a.createdAt),
        })));
      }
      if (alarms.status === 'fulfilled' && alarms.value) {
        setLiveFraudAlarms(alarms.value);
        setAlerts(alarms.value.map(a => ({
          text: a.title || a.description,
          color: a.severity === 'HIGH' ? theme.palette.error.main : theme.palette.warning.main,
          time: formatTime(a.createdAt),
        })));
      }
      if (hourly.status === 'fulfilled' && hourly.value) {
        const hCounts = hourly.value.map(h => h.count);
        if (hCounts.length > 0) {
          setLiveHourlyCounts(hCounts.slice(-12));
          setPaceData(prev => hCounts.length > 0 ? hCounts.slice(-12) : prev);
        }
      }
    } catch (e) {
      // Silently handle — data will retry on next interval
    }
  }, [mode, eventId, theme]);

  // Polling for live mode
  useEffect(() => {
    if (mode === 'live' && eventId) {
      setLiveLoading(true);
      fetchLiveData().finally(() => setLiveLoading(false));
      const interval = setInterval(fetchLiveData, 10000);
      return () => clearInterval(interval);
    }
  }, [mode, eventId, fetchLiveData]);

  // ── Live check-in handler (with sound & color system) ──────────────────────
  const handleLiveCheckIn = useCallback(async (code: string) => {
    if (!eventId) return;
    setScanState('scanning');
    try {
      const result = await gateOpsService.validateAndCheckIn(code, eventId);
      if (result.validationStatus === 'SUCCESS') {
        setScanState('success');
        playSuccessSound();
        const seatDetail = result.seatInfo ? `Sıra ${result.seatInfo.row}-${result.seatInfo.number}` : result.serialNo;
        setOverlayData({
          type: 'success',
          name: result.userName || 'Misafir',
          detail: `${result.ticketTypeName || ''} · ${seatDetail}`,
          category: result.seatInfo?.category?.toLowerCase() || result.ticketTypeName?.toLowerCase() || 'standart',
        });
        enqueueSnackbar(`${result.userName || 'Misafir'} - Giriş onaylandı`, { variant: 'success' });
        const entry: LogEntry = {
          type: 'success',
          name: result.userName || 'Misafir',
          detail: `${result.ticketTypeName || ''} · ${seatDetail}`,
          time: timeNow(),
        };
        setLogEntries(p => [entry, ...p].slice(0, 50));
      } else if (result.validationStatus === 'ALREADY_USED') {
        setScanState('duplicate');
        playWarningSound();
        setOverlayData({
          type: 'duplicate',
          name: result.userName || 'Misafir',
          detail: VALIDATION_COLORS.ALREADY_USED.label,
          category: '',
        });
        enqueueSnackbar(`${result.userName || 'Misafir'} - Çift tarama`, { variant: 'warning' });
        const entry: LogEntry = {
          type: 'duplicate',
          name: result.userName || 'Misafir',
          detail: 'Çift tarama',
          time: timeNow(),
        };
        setLogEntries(p => [entry, ...p].slice(0, 50));
      } else {
        setScanState('error');
        playErrorSound();
        // Map validation status to color system
        const valStatus = result.validationStatus as ValidationResult;
        const valColor = VALIDATION_COLORS[valStatus] || VALIDATION_COLORS.INVALID;
        setOverlayData({
          type: 'error',
          name: result.userName || result.message || 'Geçersiz',
          detail: valColor.label,
          category: '',
        });
        enqueueSnackbar(valColor.label, { variant: 'error' });
        const entry: LogEntry = {
          type: 'error',
          name: result.userName || result.message || 'Geçersiz',
          detail: valColor.label,
          time: timeNow(),
        };
        setLogEntries(p => [entry, ...p].slice(0, 50));
      }
      setOverlayVisible(true);
      setTimeout(() => setOverlayVisible(false), 2200);
      setTimeout(() => setScanState('idle'), 3000);
      // Refresh live data after check-in
      setTimeout(fetchLiveData, 500);
    } catch (error: any) {
      setScanState('error');
      playErrorSound();
      setOverlayData({
        type: 'error',
        name: 'Hata',
        detail: error?.response?.data?.message || 'Bağlantı hatası',
        category: '',
      });
      enqueueSnackbar(error?.response?.data?.message || 'Bağlantı hatası', { variant: 'error' });
      setOverlayVisible(true);
      setTimeout(() => setOverlayVisible(false), 2200);
      setTimeout(() => setScanState('idle'), 3000);
    }
  }, [eventId, enqueueSnackbar, fetchLiveData]);

  // ── Simulation (demo mode) ─────────────────────────────────────────────────
  const simulate = useCallback((type: 'ok' | 'invalid' | 'duplicate', name: string, category: string) => {
    const { row, seat } = randomSeat(category);
    const detail = `${CATEGORY_LABELS[category]} - ${row}${seat}`;
    const key = `${name}-${category}-${row}${seat}`;

    setScanState('scanning');

    setTimeout(() => {
      let resultState: ScanState;
      if (type === 'ok') {
        if (checkedIn.has(key)) {
          resultState = 'duplicate';
        } else {
          resultState = 'success';
        }
      } else if (type === 'duplicate') {
        resultState = 'duplicate';
      } else {
        resultState = 'error';
      }

      setScanState(resultState);
      setOverlayData({ type: resultState, name, detail, category });
      setOverlayVisible(true);

      // Sound feedback
      if (resultState === 'success') playSuccessSound();
      else if (resultState === 'duplicate') playWarningSound();
      else if (resultState === 'error') playErrorSound();

      // Update counters
      if (resultState === 'success') {
        setCounts(p => ({ ...p, checkin: p.checkin + 1, vip: category === 'vip' ? p.vip + 1 : p.vip }));
        setCatCounts(p => ({ ...p, [category]: p[category] + 1 }));
        setCheckedIn(p => { const s = new Set(p); s.add(key); return s; });
        paceCounterRef.current += 1;
        if (category === 'vip') {
          setVipLog(p => [{ type: 'success', name, detail, time: timeNow() }, ...p].slice(0, 20));
        }
      } else if (resultState === 'error') {
        setCounts(p => {
          const next = { ...p, errors: p.errors + 1 };
          if (next.errors > 0 && next.errors % 3 === 0) {
            setAlerts(a => [{ text: `${next.errors} hatalı okuma tespit edildi!`, color: theme.palette.error.main, time: timeNow() }, ...a].slice(0, 10));
          }
          return next;
        });
      } else if (resultState === 'duplicate') {
        setCounts(p => ({ ...p, dups: p.dups + 1 }));
        setAlerts(a => [{ text: `Cift tarama: ${name}`, color: theme.palette.warning.main, time: timeNow() }, ...a].slice(0, 10));
      }

      // Log
      const entry: LogEntry = { type: resultState, name, detail, time: timeNow() };
      setLogEntries(p => [entry, ...p].slice(0, 50));

      // Hide overlay after 2.2s
      setTimeout(() => setOverlayVisible(false), 2200);
      // Reset to idle after 3s
      setTimeout(() => setScanState('idle'), 3000);
    }, 300);
  }, [checkedIn, theme]);

  // Auto demo
  const toggleAuto = useCallback(() => {
    if (autoRunning) {
      if (autoRef.current) clearInterval(autoRef.current);
      autoRef.current = null;
      setAutoRunning(false);
      enqueueSnackbar('Otomatik demo durduruldu', { variant: 'info' });
    } else {
      setAutoRunning(true);
      enqueueSnackbar('Otomatik demo başlatıldı', { variant: 'success' });
      autoRef.current = setInterval(() => {
        setCounts(c => {
          if (c.checkin >= TOTAL_CAPACITY) {
            if (autoRef.current) clearInterval(autoRef.current);
            setAutoRunning(false);
            return c;
          }
          return c;
        });
        const r = Math.random();
        const name = pickRandom(TURKISH_NAMES);
        const cat = pickRandom(Object.keys(CATEGORY_CAPS));
        if (r < 0.70) {
          simulate('ok', name, cat);
        } else if (r < 0.85) {
          simulate('duplicate', name, cat);
        } else {
          simulate('invalid', name, cat);
        }
      }, 2000);
    }
  }, [autoRunning, simulate, enqueueSnackbar]);

  useEffect(() => {
    return () => { if (autoRef.current) clearInterval(autoRef.current); };
  }, []);

  // Stop auto demo when switching to live mode
  useEffect(() => {
    if (mode === 'live' && autoRunning) {
      if (autoRef.current) clearInterval(autoRef.current);
      autoRef.current = null;
      setAutoRunning(false);
    }
  }, [mode, autoRunning]);

  // ── Derived values ────────────────────────────────────────────────────────
  const displayCheckin = mode === 'live' ? (liveStats?.checkedInCount ?? 0) : counts.checkin;
  const displayTotal = mode === 'live' ? (liveStats?.totalTickets ?? TOTAL_CAPACITY) : TOTAL_CAPACITY;
  const displayRemaining = mode === 'live' ? (liveStats?.remainingCount ?? 0) : Math.max(0, TOTAL_CAPACITY - counts.checkin);
  const displayErrors = mode === 'live' ? 0 : counts.errors;
  const displayDups = mode === 'live' ? 0 : counts.dups;
  const displayVip = mode === 'live' ? 0 : counts.vip;

  const occupancyPct = displayTotal > 0 ? Math.min(100, Math.round((displayCheckin / displayTotal) * 100)) : 0;
  const paceAvg = paceData.reduce((a, b) => a + b, 0);
  const paceMax = Math.max(...paceData, 1);

  // ── Scan glow color ───────────────────────────────────────────────────────
  const glowColor = (() => {
    switch (scanState) {
      case 'scanning': return theme.palette.info.main;
      case 'success': return theme.palette.success.main;
      case 'error': return theme.palette.error.main;
      case 'duplicate': return theme.palette.warning.main;
      default: return 'transparent';
    }
  })();

  // ── Search mock result ─────────────────────────────────────────────────────
  const searchResult = searchQuery.length > 2 ? {
    name: 'Elif Sahin',
    ticket: 'TCK-2024-0847',
    category: 'VIP',
    seat: 'B12',
    status: 'Giriş Yapmadı',
  } : null;

  // ── Manual input handler ──────────────────────────────────────────────────
  const handleManualInput = useCallback(() => {
    if (!manualCode.trim()) return;
    if (mode === 'live') {
      handleLiveCheckIn(manualCode.trim());
    } else {
      simulate('ok', pickRandom(TURKISH_NAMES), pickRandom(Object.keys(CATEGORY_CAPS)));
    }
    setManualCode('');
  }, [mode, manualCode, handleLiveCheckIn, simulate]);

  // ── Mode toggle handler ───────────────────────────────────────────────────
  const handleModeChange = useCallback((_: React.MouseEvent<HTMLElement>, newMode: 'demo' | 'live' | null) => {
    if (!newMode) return;
    if (newMode === 'live' && !eventId) {
      enqueueSnackbar('Canlı mod için URL\'de eventId parametresi gereklidir', { variant: 'warning' });
      return;
    }
    setMode(newMode);
    enqueueSnackbar(newMode === 'live' ? 'Canlı moda geçildi' : 'Demo moda geçildi', { variant: 'info' });
  }, [eventId, enqueueSnackbar]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ mx: -3, mt: -3, mb: -3, display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 64px)', bgcolor: theme.palette.background.default, overflow: 'hidden' }}>

      {/* ── Top Event Bar ──────────────────────────────────────────────────── */}
      <Box sx={{ px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${alpha(theme.palette.divider, 0.12)}`, bgcolor: alpha(theme.palette.background.paper, 0.6) }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <MeetingRoom sx={{ color: theme.palette.primary.main }} />
          <Box>
            <Typography variant="subtitle1" fontWeight={800}>Kapı Giriş Kontrol Terminali</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
              {mode === 'live' && eventId
                ? `Canlı Mod · Event: ${eventId.length > 8 ? eventId.slice(0, 8) + '...' : eventId}`
                : 'Demo Mod — Simülasyon'}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={handleModeChange}
            size="small"
            sx={{ height: 28 }}
          >
            <ToggleButton value="demo" sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.7rem', px: 1.5 }}>
              Demo
            </ToggleButton>
            <ToggleButton value="live" sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.7rem', px: 1.5 }}>
              Canlı
            </ToggleButton>
          </ToggleButtonGroup>
          <Chip
            icon={mode === 'live' ? <Wifi sx={{ fontSize: 14 }} /> : <WifiOff sx={{ fontSize: 14 }} />}
            label={mode === 'live' ? 'CANLI' : 'DEMO'}
            size="small"
            color={mode === 'live' ? 'success' : 'default'}
            variant="outlined"
            sx={{ fontWeight: 800, letterSpacing: 1 }}
          />
          {mode === 'live' && liveLoading && <CircularProgress size={18} sx={{ ml: 0.5 }} />}
          <IconButton size="small"><Settings fontSize="small" /></IconButton>
        </Box>
      </Box>

      {/* ── No eventId prompt for live mode ────────────────────────────────── */}
      {mode === 'live' && !eventId && (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 4 }}>
          <Paper variant="outlined" sx={{ p: 4, borderRadius: 3, textAlign: 'center', maxWidth: 400 }}>
            <Warning sx={{ fontSize: 48, color: theme.palette.warning.main, mb: 2 }} />
            <Typography variant="h6" fontWeight={800} gutterBottom>Etkinlik Seçilmedi</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Canlı modu kullanmak için URL'de bir etkinlik ID'si belirtmeniz gerekmektedir.
            </Typography>
            <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'monospace' }}>
              /gate-ops?eventId=xxx veya /gate-ops/:eventId
            </Typography>
            <Box sx={{ mt: 3 }}>
              <Button variant="outlined" size="small" sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
                onClick={() => setMode('demo')}>
                Demo Moda Geç
              </Button>
            </Box>
          </Paper>
        </Box>
      )}

      {/* ── 3-Panel Body ───────────────────────────────────────────────────── */}
      {!(mode === 'live' && !eventId) && (
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* === LEFT PANEL === */}
        <Box sx={{ width: 300, minWidth: 300, borderRight: `1px solid ${alpha(theme.palette.divider, 0.1)}`, display: 'flex', flexDirection: 'column', overflow: 'auto', p: 2, gap: 2 }}>
          <Typography variant="overline" fontWeight={800} color="text.secondary" letterSpacing={2}>Canlı İstatistik</Typography>

          {/* Stat boxes 2x2 */}
          <Grid container spacing={1}>
            {[
              { label: 'Giriş Yapan', value: displayCheckin, color: theme.palette.success.main, delta: mode === 'live' ? `toplam ${displayTotal} bilet` : `+${Math.min(counts.checkin, 5)} son 5dk` },
              { label: 'Bekleyen', value: displayRemaining, color: theme.palette.text.secondary, delta: 'kapasite dahilinde' },
              { label: 'Hatalı Okuma', value: displayErrors, color: theme.palette.error.main, delta: displayErrors > 0 ? 'dikkat!' : 'sorun yok' },
              { label: 'Tekrar Deneme', value: displayDups, color: theme.palette.warning.main, delta: displayDups > 0 ? 'kontrol edin' : 'temiz' },
            ].map((s, i) => (
              <Grid item xs={6} key={i}>
                <Paper variant="outlined" sx={{ p: 1.5, borderColor: alpha(s.color, 0.25), borderRadius: 2 }}>
                  <Typography variant="h4" fontWeight={900} sx={{ fontFamily: 'monospace', color: s.color, lineHeight: 1 }}>{s.value}</Typography>
                  <Typography variant="caption" fontWeight={700} display="block" color="text.secondary" noWrap>{s.label}</Typography>
                  <Typography variant="caption" sx={{ color: alpha(s.color, 0.7), fontSize: '0.65rem' }}>{s.delta}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          {/* Doluluk */}
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" fontWeight={800} color="text.secondary">DOLULUK</Typography>
              <Typography variant="caption" fontWeight={800} sx={{ fontFamily: 'monospace' }}>%{occupancyPct}</Typography>
            </Box>
            <Box sx={{ position: 'relative', height: 8, borderRadius: 4, overflow: 'hidden', bgcolor: alpha(theme.palette.divider, 0.15) }}>
              <Box sx={{
                height: '100%', width: `${occupancyPct}%`, borderRadius: 4,
                bgcolor: occupancyPct > 90 ? theme.palette.error.main : occupancyPct > 70 ? theme.palette.warning.main : theme.palette.success.main,
                backgroundImage: `linear-gradient(90deg, transparent, ${alpha('#fff', 0.25)}, transparent)`,
                backgroundSize: '200% 100%',
                animation: `${shimmer} 2s linear infinite`,
                transition: 'width 0.6s ease',
              }} />
            </Box>
            {mode === 'demo' && (
              <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: 'wrap' }}>
                {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
                  <Chip key={k} label={`${label}: ${catCounts[k]}/${CATEGORY_CAPS[k]}`} size="small"
                    sx={{ fontSize: '0.6rem', height: 20, bgcolor: alpha(CATEGORY_COLORS[k], 0.12), color: CATEGORY_COLORS[k], fontWeight: 700, mb: 0.5 }} />
                ))}
              </Stack>
            )}
            {mode === 'live' && (
              <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: 'wrap' }}>
                <Chip label={`Giriş: ${displayCheckin}/${displayTotal}`} size="small"
                  sx={{ fontSize: '0.6rem', height: 20, bgcolor: alpha(theme.palette.success.main, 0.12), color: theme.palette.success.main, fontWeight: 700, mb: 0.5 }} />
                {liveStats?.checkInRate != null && (
                  <Chip label={`Oran: %${Math.round(liveStats.checkInRate)}`} size="small"
                    sx={{ fontSize: '0.6rem', height: 20, bgcolor: alpha(theme.palette.info.main, 0.12), color: theme.palette.info.main, fontWeight: 700, mb: 0.5 }} />
                )}
              </Stack>
            )}
          </Paper>

          {/* Son Taramalar */}
          <Typography variant="overline" fontWeight={800} color="text.secondary" letterSpacing={2}>Son Taramalar</Typography>
          <Box sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {logEntries.length === 0 && (
              <Typography variant="caption" color="text.disabled" textAlign="center" sx={{ mt: 2 }}>Henüz tarama yok</Typography>
            )}
            {logEntries.slice(0, 20).map((entry, i) => (
              <Box key={i} sx={{
                display: 'flex', alignItems: 'center', gap: 1, px: 1, py: 0.5, borderRadius: 1,
                bgcolor: alpha(theme.palette.background.paper, 0.5),
                animation: i === 0 ? `${fadeSlideIn} 0.3s ease` : undefined,
              }}>
                {entry.type === 'success' && <CheckCircle sx={{ fontSize: 14, color: theme.palette.success.main }} />}
                {entry.type === 'error' && <Cancel sx={{ fontSize: 14, color: theme.palette.error.main }} />}
                {entry.type === 'duplicate' && <Warning sx={{ fontSize: 14, color: theme.palette.warning.main }} />}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="caption" fontWeight={700} noWrap display="block">{entry.name}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }} noWrap>{entry.detail}</Typography>
                </Box>
                <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'monospace', fontSize: '0.6rem', flexShrink: 0 }}>{entry.time}</Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* === CENTER PANEL === */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', p: 3, gap: 3 }}>

          {/* Anlık Doluluk Sayacı */}
          <Paper elevation={0} sx={{
            px: 4, py: 1.5, borderRadius: 3,
            bgcolor: alpha(occupancyPct > 90 ? theme.palette.error.main : occupancyPct > 70 ? theme.palette.warning.main : theme.palette.success.main, 0.08),
            border: `1px solid ${alpha(occupancyPct > 90 ? theme.palette.error.main : occupancyPct > 70 ? theme.palette.warning.main : theme.palette.success.main, 0.2)}`,
            textAlign: 'center',
          }}>
            <Stack direction="row" spacing={1.5} alignItems="baseline" justifyContent="center">
              <Typography variant="h3" fontWeight={900} fontFamily="JetBrains Mono, monospace"
                sx={{ color: occupancyPct > 90 ? 'error.main' : occupancyPct > 70 ? 'warning.main' : 'success.main', lineHeight: 1 }}>
                {displayCheckin}
              </Typography>
              <Typography variant="h5" fontWeight={400} color="text.disabled" fontFamily="monospace">/</Typography>
              <Typography variant="h5" fontWeight={700} color="text.secondary" fontFamily="monospace">{displayTotal}</Typography>
            </Stack>
            <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase" letterSpacing={1}>
              giriş yaptı · %{occupancyPct} doluluk
            </Typography>
          </Paper>

          {/* QR Scan Frame */}
          <Box sx={{
            width: 240, height: 240, position: 'relative', borderRadius: 3,
            border: `2px solid ${scanState === 'idle' ? alpha(theme.palette.divider, 0.3) : alpha(glowColor, 0.6)}`,
            boxShadow: scanState !== 'idle' ? `0 0 30px ${alpha(glowColor, 0.3)}, inset 0 0 20px ${alpha(glowColor, 0.05)}` : 'none',
            transition: 'border-color 0.3s, box-shadow 0.3s',
            animation: scanState === 'error' ? `${shakeAnim} 0.4s ease` : undefined,
            display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
            bgcolor: alpha(theme.palette.background.paper, 0.3),
          }}>
            {/* Corner brackets */}
            {[
              { top: -1, left: -1, borderTop: '3px solid', borderLeft: '3px solid' },
              { top: -1, right: -1, borderTop: '3px solid', borderRight: '3px solid' },
              { bottom: -1, left: -1, borderBottom: '3px solid', borderLeft: '3px solid' },
              { bottom: -1, right: -1, borderBottom: '3px solid', borderRight: '3px solid' },
            ].map((style, i) => (
              <Box key={i} sx={{ position: 'absolute', width: 28, height: 28, ...style, borderColor: scanState === 'idle' ? theme.palette.text.secondary : glowColor, transition: 'border-color 0.3s' }} />
            ))}

            {/* Scanning line */}
            {scanState === 'scanning' && (
              <Box sx={{ position: 'absolute', left: 8, right: 8, height: 2, bgcolor: alpha(theme.palette.info.main, 0.8), borderRadius: 1, boxShadow: `0 0 8px ${alpha(theme.palette.info.main, 0.5)}`, animation: `${scanLineMove} 1.2s ease-in-out infinite` }} />
            )}

            {/* Content inside frame */}
            {scanState === 'idle' && (
              <Stack alignItems="center" spacing={1}>
                <QrCode2 sx={{ fontSize: 56, color: alpha(theme.palette.text.secondary, 0.4) }} />
                <Typography variant="caption" color="text.secondary" textAlign="center">QR kod bekleniyor...</Typography>
              </Stack>
            )}
            {scanState === 'scanning' && (
              <Typography variant="caption" color="info.main" fontWeight={700}>Taranıyor...</Typography>
            )}
            {(scanState === 'success' || scanState === 'error' || scanState === 'duplicate') && overlayData && (
              <Stack alignItems="center" spacing={0.5} sx={{ zIndex: 1 }}>
                {scanState === 'success' && <CheckCircle sx={{ fontSize: 40, color: theme.palette.success.main }} />}
                {scanState === 'error' && <Cancel sx={{ fontSize: 40, color: theme.palette.error.main }} />}
                {scanState === 'duplicate' && <Warning sx={{ fontSize: 40, color: theme.palette.warning.main }} />}
                <Typography variant="body2" fontWeight={800} textAlign="center">{overlayData.name}</Typography>
                <Typography variant="caption" color="text.secondary" textAlign="center">{overlayData.detail}</Typography>
                <Chip
                  size="small"
                  label={scanState === 'success' ? 'GİRİŞ ONAYLANDI' : scanState === 'error' ? 'GEÇERSİZ BİLET' : 'CIFT TARAMA'}
                  sx={{
                    fontWeight: 800, fontSize: '0.65rem',
                    bgcolor: alpha(glowColor, 0.15), color: glowColor,
                  }}
                />
              </Stack>
            )}
          </Box>

          {/* Manuel code input */}
          <Box sx={{ display: 'flex', gap: 1, width: '100%', maxWidth: 360 }}>
            <TextField
              size="small" fullWidth
              placeholder={mode === 'live' ? 'Bilet kodu veya QR verisi girin' : 'Manuel Kod Girişi'}
              value={manualCode}
              onChange={e => setManualCode(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && manualCode.trim()) {
                  handleManualInput();
                }
              }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            <Button variant="contained" size="small" sx={{ fontWeight: 700, px: 3, borderRadius: 2 }}
              onClick={handleManualInput}>
              Tara
            </Button>
          </Box>

          {/* Demo buttons — only in demo mode */}
          {mode === 'demo' && (
            <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="center">
              <Button size="small" variant="outlined" color="success" sx={{ fontWeight: 700, borderRadius: 2, textTransform: 'none' }}
                onClick={() => simulate('ok', pickRandom(TURKISH_NAMES), 'standart')}>
                Geçerli Bilet
              </Button>
              <Button size="small" variant="outlined" sx={{ fontWeight: 700, borderRadius: 2, textTransform: 'none', borderColor: '#ffd740', color: '#ffd740', '&:hover': { borderColor: '#ffc400', bgcolor: alpha('#ffd740', 0.08) } }}
                onClick={() => simulate('ok', pickRandom(TURKISH_NAMES), 'vip')}>
                VIP Giriş
              </Button>
              <Button size="small" variant="outlined" color="warning" sx={{ fontWeight: 700, borderRadius: 2, textTransform: 'none' }}
                onClick={() => simulate('duplicate', pickRandom(TURKISH_NAMES), 'standart')}>
                Çift Tarama
              </Button>
              <Button size="small" variant="outlined" color="error" sx={{ fontWeight: 700, borderRadius: 2, textTransform: 'none' }}
                onClick={() => simulate('invalid', pickRandom(TURKISH_NAMES), 'standart')}>
                Geçersiz Bilet
              </Button>
            </Stack>
          )}

          {/* Live mode refresh button */}
          {mode === 'live' && eventId && (
            <Button size="small" variant="outlined" startIcon={<Refresh />}
              sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 700 }}
              onClick={() => { setLiveLoading(true); fetchLiveData().finally(() => setLiveLoading(false)); }}>
              Verileri Yenile
            </Button>
          )}

          {/* Full-screen overlay */}
          {overlayVisible && overlayData && (
            <Box sx={{
              position: 'absolute', inset: 0, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
              bgcolor: alpha(theme.palette.background.default, 0.85), backdropFilter: 'blur(6px)',
              animation: `${fadeSlideIn} 0.25s ease`,
            }}>
              <Paper elevation={8} sx={{
                p: 5, borderRadius: 4, textAlign: 'center', minWidth: 340,
                border: `3px solid ${alpha(glowColor, 0.4)}`,
                boxShadow: `0 0 40px ${alpha(glowColor, 0.2)}`,
              }}>
                {overlayData.type === 'success' && <CheckCircle sx={{ fontSize: 80, color: VALIDATION_COLORS.VALID.bg, mb: 1 }} />}
                {overlayData.type === 'error' && <Cancel sx={{ fontSize: 80, color: VALIDATION_COLORS.INVALID.bg, mb: 1 }} />}
                {overlayData.type === 'duplicate' && <Warning sx={{ fontSize: 80, color: VALIDATION_COLORS.ALREADY_USED.bg, mb: 1 }} />}
                <Typography variant="h5" fontWeight={900} gutterBottom>{overlayData.name}</Typography>
                <Typography variant="body1" color="text.secondary" gutterBottom>{overlayData.detail}</Typography>
                {overlayData.category && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {CATEGORY_LABELS[overlayData.category] || overlayData.category}
                  </Typography>
                )}
                <Chip
                  label={
                    overlayData.type === 'success' ? VALIDATION_COLORS.VALID.label
                    : overlayData.type === 'duplicate' ? VALIDATION_COLORS.ALREADY_USED.label
                    : overlayData.detail || VALIDATION_COLORS.INVALID.label
                  }
                  sx={{
                    fontWeight: 800,
                    bgcolor: overlayData.type === 'success' ? alpha(VALIDATION_COLORS.VALID.bg, 0.15)
                      : overlayData.type === 'duplicate' ? alpha(VALIDATION_COLORS.ALREADY_USED.bg, 0.15)
                      : alpha(VALIDATION_COLORS.INVALID.bg, 0.15),
                    color: overlayData.type === 'success' ? VALIDATION_COLORS.VALID.bg
                      : overlayData.type === 'duplicate' ? VALIDATION_COLORS.ALREADY_USED.bg
                      : VALIDATION_COLORS.INVALID.bg,
                    fontSize: '0.85rem', height: 36, mt: 1, px: 2,
                  }}
                />
              </Paper>
            </Box>
          )}
        </Box>

        {/* === RIGHT PANEL === */}
        <Box sx={{ width: 280, minWidth: 280, borderLeft: `1px solid ${alpha(theme.palette.divider, 0.1)}`, display: 'flex', flexDirection: 'column', overflow: 'auto', p: 2, gap: 2 }}>
          <Typography variant="overline" fontWeight={800} color="text.secondary" letterSpacing={2}>Anomali & Analiz</Typography>

          {/* Uyarılar */}
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
            <Typography variant="caption" fontWeight={800} color="text.secondary" display="block" sx={{ mb: 1 }}>UYARILAR</Typography>
            {alerts.length === 0 ? (
              <Typography variant="caption" color="text.disabled">Henuz uyari yok</Typography>
            ) : (
              <Stack spacing={0.5} sx={{ maxHeight: 120, overflow: 'auto' }}>
                {alerts.slice(0, 5).map((a, i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, p: 0.5, borderRadius: 1, bgcolor: alpha(a.color, 0.08), animation: i === 0 ? `${fadeSlideIn} 0.3s ease` : undefined }}>
                    <Warning sx={{ fontSize: 12, color: a.color }} />
                    <Typography variant="caption" sx={{ fontSize: '0.6rem', flex: 1, color: a.color, fontWeight: 600 }}>{a.text}</Typography>
                    <Typography variant="caption" sx={{ fontSize: '0.55rem', fontFamily: 'monospace', color: 'text.disabled' }}>{a.time}</Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </Paper>

          {/* Kategori Dağılımı */}
          {mode === 'demo' && (
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
              <Typography variant="caption" fontWeight={800} color="text.secondary" display="block" sx={{ mb: 1 }}>KATEGORİ DAĞILIMI</Typography>
              <Stack spacing={1}>
                {Object.entries(CATEGORY_CAPS).map(([k, cap]) => {
                  const val = catCounts[k];
                  const pct = Math.round((val / cap) * 100);
                  return (
                    <Box key={k}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                        <Typography variant="caption" fontWeight={700} sx={{ fontSize: '0.65rem' }}>{CATEGORY_LABELS[k]}</Typography>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '0.65rem' }}>{val}/{cap} (%{pct})</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={pct} sx={{ height: 5, borderRadius: 3, bgcolor: alpha(theme.palette.divider, 0.12), '& .MuiLinearProgress-bar': { bgcolor: CATEGORY_COLORS[k], borderRadius: 3 } }} />
                    </Box>
                  );
                })}
              </Stack>
            </Paper>
          )}

          {/* Live mode — check-in summary */}
          {mode === 'live' && liveStats && (
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
              <Typography variant="caption" fontWeight={800} color="text.secondary" display="block" sx={{ mb: 1 }}>GİRİŞ ÖZETİ</Typography>
              <Stack spacing={1}>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                    <Typography variant="caption" fontWeight={700} sx={{ fontSize: '0.65rem' }}>Giriş Yapan</Typography>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '0.65rem' }}>{liveStats.checkedInCount}/{liveStats.totalTickets} (%{Math.round(liveStats.checkInRate)})</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={Math.min(100, liveStats.checkInRate)} sx={{ height: 5, borderRadius: 3, bgcolor: alpha(theme.palette.divider, 0.12), '& .MuiLinearProgress-bar': { bgcolor: theme.palette.success.main, borderRadius: 3 } }} />
                </Box>
                {liveStats.lastCheckIn && (
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                    Son giriş: {formatTime(liveStats.lastCheckIn)}
                  </Typography>
                )}
              </Stack>
            </Paper>
          )}

          {/* Giriş Hızı */}
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
            <Typography variant="caption" fontWeight={800} color="text.secondary" display="block" sx={{ mb: 0.5 }}>GİRİŞ HIZI (son 10 dk)</Typography>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
              <Typography variant="h4" fontWeight={900} sx={{ fontFamily: 'monospace', lineHeight: 1 }}>{paceAvg}</Typography>
              <Typography variant="caption" color="text.secondary">{mode === 'live' ? 'kişi/saat' : 'kişi/dakika'}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: '2px', mt: 1, height: 36 }}>
              {paceData.map((v, i) => (
                <Box key={i} sx={{
                  flex: 1, minHeight: 2, height: `${Math.max(5, (v / paceMax) * 100)}%`,
                  bgcolor: alpha(theme.palette.primary.main, i === paceData.length - 1 ? 1 : 0.4),
                  borderRadius: '2px 2px 0 0', transition: 'height 0.4s ease',
                }} />
              ))}
            </Box>
          </Paper>

          {/* Check-in Listesi (Aranabilir) */}
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="caption" fontWeight={800} color="text.secondary">GİRİŞ LİSTESİ</Typography>
              <Chip label={`${logEntries.filter(e => e.type === 'success').length} giriş`} size="small"
                sx={{ height: 18, fontSize: '0.55rem', fontWeight: 700, bgcolor: alpha(theme.palette.success.main, 0.1), color: theme.palette.success.main }} />
            </Box>
            <TextField
              size="small" placeholder="İsim veya bilet ara..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              sx={{ mb: 1, '& .MuiOutlinedInput-root': { borderRadius: 1.5, height: 28, fontSize: '0.7rem' } }}
              InputProps={{ startAdornment: <Search sx={{ fontSize: 14, mr: 0.5, color: 'text.disabled' }} /> }}
            />
            <Box sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 0.3 }}>
              {logEntries.length === 0 ? (
                <Typography variant="caption" color="text.disabled" textAlign="center" sx={{ mt: 2 }}>Henüz giriş yok</Typography>
              ) : (
                logEntries
                  .filter(e => {
                    if (!searchQuery.trim()) return true;
                    const q = searchQuery.toLowerCase();
                    return e.name.toLowerCase().includes(q) || e.detail.toLowerCase().includes(q);
                  })
                  .slice(0, 30)
                  .map((entry, i) => (
                    <Box key={i} sx={{
                      display: 'flex', alignItems: 'center', gap: 0.5, px: 0.5, py: 0.3, borderRadius: 1,
                      bgcolor: alpha(
                        entry.type === 'success' ? theme.palette.success.main :
                        entry.type === 'duplicate' ? theme.palette.warning.main : theme.palette.error.main,
                        0.04
                      ),
                      animation: i === 0 && !searchQuery ? `${fadeSlideIn} 0.3s ease` : undefined,
                    }}>
                      {entry.type === 'success' && <CheckCircle sx={{ fontSize: 12, color: theme.palette.success.main }} />}
                      {entry.type === 'error' && <Cancel sx={{ fontSize: 12, color: theme.palette.error.main }} />}
                      {entry.type === 'duplicate' && <Warning sx={{ fontSize: 12, color: theme.palette.warning.main }} />}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="caption" fontWeight={700} noWrap display="block" sx={{ fontSize: '0.65rem' }}>{entry.name}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem' }} noWrap>{entry.detail}</Typography>
                      </Box>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '0.55rem', color: 'text.disabled', flexShrink: 0 }}>{entry.time}</Typography>
                    </Box>
                  ))
              )}
            </Box>
          </Paper>
        </Box>
      </Box>
      )}

      {/* ── Bottom Bar ─────────────────────────────────────────────────────── */}
      <Box sx={{
        px: 2.5, py: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderTop: `1px solid ${alpha(theme.palette.divider, 0.12)}`, bgcolor: alpha(theme.palette.background.paper, 0.6),
        flexWrap: 'wrap', gap: 1,
      }}>
        <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap' }}>
          {[
            { label: 'Toplam Giriş', value: displayCheckin, color: theme.palette.success.main },
            { label: 'Doluluk', value: `%${occupancyPct}`, color: occupancyPct > 90 ? theme.palette.error.main : theme.palette.info.main },
            { label: 'Reddedilen', value: displayErrors, color: theme.palette.error.main },
            { label: 'Cift Deneme', value: displayDups, color: theme.palette.warning.main },
            { label: 'VIP Giriş', value: displayVip, color: '#ffd740' },
          ].map((s, i) => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: s.color }} />
              <Typography variant="caption" color="text.secondary" fontWeight={600}>{s.label}:</Typography>
              <Typography variant="caption" fontWeight={800} sx={{ fontFamily: 'monospace' }}>{s.value}</Typography>
            </Box>
          ))}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button size="small" variant="outlined" startIcon={<Search />} sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 700 }}
            onClick={() => setSearchOpen(true)}>
            Misafir Ara
          </Button>
          {mode === 'demo' && (
            <Button size="small" variant={autoRunning ? 'contained' : 'outlined'} color={autoRunning ? 'error' : 'primary'}
              startIcon={autoRunning ? <Stop /> : <PlayArrow />}
              sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 700 }}
              onClick={toggleAuto}>
              {autoRunning ? 'Demoyu Durdur' : 'Otomatik Demo'}
            </Button>
          )}
        </Box>
      </Box>

      {/* ── Misafir Ara Dialog ─────────────────────────────────────────────── */}
      <Dialog open={searchOpen} onClose={() => setSearchOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight={800}>Misafir Ara</Typography>
          <IconButton size="small" onClick={() => setSearchOpen(false)}><Close /></IconButton>
        </DialogTitle>
        <DialogContent>
          <TextField fullWidth size="small" placeholder="Ad, soyad veya bilet kodu girin..." value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)} sx={{ mt: 1, mb: 2 }}
            InputProps={{ startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} /> }}
          />
          {searchResult && (
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: alpha(theme.palette.primary.main, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Person sx={{ color: theme.palette.primary.main }} />
                </Box>
                <Box>
                  <Typography variant="subtitle1" fontWeight={800}>{searchResult.name}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{searchResult.ticket}</Typography>
                </Box>
              </Box>
              <Grid container spacing={1} sx={{ mb: 2 }}>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary" display="block">Kategori</Typography>
                  <Typography variant="body2" fontWeight={700}>{searchResult.category}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary" display="block">Koltuk</Typography>
                  <Typography variant="body2" fontWeight={700}>{searchResult.seat}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary" display="block">Durum</Typography>
                  <Chip size="small" label={searchResult.status} color="warning" sx={{ fontWeight: 700, height: 22, fontSize: '0.7rem' }} />
                </Grid>
              </Grid>
              <Button variant="contained" fullWidth sx={{ fontWeight: 700, textTransform: 'none', borderRadius: 2 }}
                onClick={() => {
                  if (mode === 'live' && eventId) {
                    handleLiveCheckIn(searchResult.ticket);
                  } else {
                    simulate('ok', searchResult.name, 'vip');
                  }
                  setSearchOpen(false);
                  setSearchQuery('');
                }}>
                Manuel Giriş Ver
              </Button>
            </Paper>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Kapıyı Kapat Dialog ────────────────────────────────────────────── */}
      <Dialog open={closeGateOpen} onClose={() => setCloseGateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Typography variant="h6" fontWeight={800} color="error">Kapıyı Kapat</Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Bu islem kapidaki tum tarama cihazlarini devre disi birakacaktir. Emin misiniz?
          </Typography>
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
            <Grid container spacing={1}>
              <Grid item xs={6}><Typography variant="caption" color="text.secondary">Toplam Giriş</Typography><Typography variant="body1" fontWeight={800}>{displayCheckin}</Typography></Grid>
              <Grid item xs={6}><Typography variant="caption" color="text.secondary">Doluluk</Typography><Typography variant="body1" fontWeight={800}>%{occupancyPct}</Typography></Grid>
              <Grid item xs={6}><Typography variant="caption" color="text.secondary">Hata</Typography><Typography variant="body1" fontWeight={800}>{displayErrors}</Typography></Grid>
              <Grid item xs={6}><Typography variant="caption" color="text.secondary">Cift Okuma</Typography><Typography variant="body1" fontWeight={800}>{displayDups}</Typography></Grid>
            </Grid>
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCloseGateOpen(false)} sx={{ textTransform: 'none' }}>Iptal</Button>
          <Button variant="contained" color="error" sx={{ textTransform: 'none', fontWeight: 700 }}
            onClick={() => { setCloseGateOpen(false); enqueueSnackbar('Kapi kapatildi', { variant: 'warning' }); }}>
            Kapıyı Kapat
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
