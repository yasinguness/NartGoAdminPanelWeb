import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Divider,
  TextField,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Edit as EditIcon,
  Visibility as PreviewIcon,
  Save as SaveIcon,
  Check as CheckIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  RestartAlt as ResetIcon,
  Close as CloseIcon,
  Block as BlockIcon,
  ShoppingCart as CartIcon,
  ConfirmationNumber as TicketIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  CenterFocusStrong as FitIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';

// ─── Types ───
interface SeatCategory {
  name: string;
  price: number;
  color: string;
}

interface SelectedSeat {
  key: string;
  row: string;
  num: number;
  cat: string;
}

interface Template {
  rows: number;
  seats: number;
  aisle: number;
  icon: string;
  label: string;
}

// ─── Constants ───
const CATEGORIES: Record<string, SeatCategory> = {
  sahne: { name: 'Sahne Önü', price: 450, color: '#f59e0b' },
  vip: { name: 'VIP', price: 280, color: '#a855f7' },
  standart: { name: 'Standart', price: 120, color: '#3b82f6' },
  balkon: { name: 'Balkon', price: 80, color: '#6b7280' },
};

const TEMPLATES: Record<string, Template> = {
  theater: { rows: 12, seats: 18, aisle: 9, icon: '🎭', label: 'Tiyatro' },
  concert: { rows: 15, seats: 22, aisle: 11, icon: '🎵', label: 'Konser' },
  conference: { rows: 10, seats: 14, aisle: 7, icon: '🎓', label: 'Konferans' },
  custom: { rows: 8, seats: 12, aisle: 6, icon: '⚡', label: 'Özel' },
};

const MAX_SELECT = 6;

const rowLabel = (i: number) => String.fromCharCode(65 + i);

const getDefaultCat = (rowIndex: number, totalRows: number): string => {
  if (rowIndex < 2) return 'sahne';
  if (rowIndex < 4) return 'vip';
  if (rowIndex < totalRows - 2) return 'standart';
  return 'balkon';
};

// ─── Component ───
const SeatMapDesigner: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();

  const colors = useMemo(() => ({
    bg: theme.palette.background.default,
    surface: theme.palette.background.paper,
    surface2: alpha(theme.palette.primary.main, 0.04),
    surface3: alpha(theme.palette.primary.main, 0.08),
    border: theme.palette.divider,
    border2: alpha(theme.palette.divider, 0.5),
    text: theme.palette.text.primary,
    text2: theme.palette.text.secondary,
    text3: theme.palette.text.disabled,
    green: theme.palette.primary.main,
    greenDark: theme.palette.primary.dark,
    greenDim: alpha(theme.palette.primary.main, 0.12),
    contrast: theme.palette.primary.contrastText,
  }), [theme]);

  // State
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [currentTool, setCurrentTool] = useState('sahne');
  const [template, setTemplate] = useState('theater');
  const [rowCount, setRowCount] = useState(12);
  const [seatsPerRow, setSeatsPerRow] = useState(18);
  const [aislePos, setAislePos] = useState(9);
  const [seatData, setSeatData] = useState<Record<string, string>>({});
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedSeats, setSelectedSeats] = useState<SelectedSeat[]>([]);
  const [takenSeats, setTakenSeats] = useState<Set<string>>(new Set());
  const [isPainting, setIsPainting] = useState(false);
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [tooltipData, setTooltipData] = useState<{
    show: boolean; x: number; y: number;
    row: string; seatNum: number; cat: string;
  } | null>(null);

  const venueRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sidebars and Zen Mode
  const [searchParams, setSearchParams] = useSearchParams();
  const isZenMode = searchParams.get('zen') === 'true';
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);

  const toggleZenMode = () => {
    const next = isZenMode ? 'false' : 'true';
    setSearchParams({ zen: next });
  };

  const handleFitToScreen = useCallback(() => {
    if (!venueRef.current || !containerRef.current) return;
    const vWidth = venueRef.current.offsetWidth + 100;
    const vHeight = venueRef.current.offsetHeight + 100;
    const cWidth = containerRef.current.offsetWidth;
    const cHeight = containerRef.current.offsetHeight;
    
    const scale = Math.min(cWidth / vWidth, cHeight / vHeight, 1.2);
    setZoomLevel(Math.max(0.4, Math.round(scale * 10) / 10));
  }, []);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // Generate taken seats on preview mode switch
  const generateTakenSeats = useCallback(() => {
    const taken = new Set<string>();
    for (let r = 0; r < rowCount; r++) {
      for (let s = 0; s < seatsPerRow; s++) {
        const key = `${r}-${s}`;
        const cat = seatData[key] || getDefaultCat(r, rowCount);
        if (cat !== 'disabled' && Math.random() < 0.18) {
          taken.add(key);
        }
      }
    }
    return taken;
  }, [rowCount, seatsPerRow, seatData]);

  // Mode switch
  const handleModeSwitch = useCallback((newMode: 'edit' | 'preview') => {
    setMode(newMode);
    if (newMode === 'preview') {
      setSelectedSeats([]);
      setTakenSeats(generateTakenSeats());
    }
  }, [generateTakenSeats]);

  // Template load
  const handleTemplateLoad = useCallback((key: string) => {
    const t = TEMPLATES[key];
    setTemplate(key);
    setRowCount(t.rows);
    setSeatsPerRow(t.seats);
    setAislePos(t.aisle);
    setSeatData({});
  }, []);

  // Paint seat (edit mode)
  const paintSeat = useCallback((key: string) => {
    setSeatData(prev => ({ ...prev, [key]: currentTool }));
  }, [currentTool]);

  // Preview seat click
  const handlePreviewClick = useCallback((key: string, row: string, num: number, cat: string) => {
    if (cat === 'disabled' || takenSeats.has(key)) return;

    setSelectedSeats(prev => {
      const exists = prev.find(s => s.key === key);
      if (exists) return prev.filter(s => s.key !== key);
      if (prev.length >= MAX_SELECT) {
        enqueueSnackbar(`Maksimum ${MAX_SELECT} koltuk seçilebilir`, { variant: 'warning' });
        return prev;
      }
      return [...prev, { key, row, num, cat }];
    });
  }, [takenSeats, enqueueSnackbar]);

  // Stats calculation
  const stats = useMemo(() => {
    const counts: Record<string, number> = { sahne: 0, vip: 0, standart: 0, balkon: 0 };
    for (let r = 0; r < rowCount; r++) {
      for (let s = 0; s < seatsPerRow; s++) {
        const cat = seatData[`${r}-${s}`] || getDefaultCat(r, rowCount);
        if (counts[cat] !== undefined) counts[cat]++;
      }
    }
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const maxRevenue = Object.entries(counts).reduce(
      (a, [k, v]) => a + (CATEGORIES[k]?.price || 0) * v, 0
    );
    return { counts, total, maxRevenue };
  }, [rowCount, seatsPerRow, seatData]);

  // Available seats for legend (preview)
  const availableCounts = useMemo(() => {
    const counts: Record<string, number> = { sahne: 0, vip: 0, standart: 0, balkon: 0 };
    for (let r = 0; r < rowCount; r++) {
      for (let s = 0; s < seatsPerRow; s++) {
        const key = `${r}-${s}`;
        const cat = seatData[key] || getDefaultCat(r, rowCount);
        if (counts[cat] !== undefined && !takenSeats.has(key)) counts[cat]++;
      }
    }
    return counts;
  }, [rowCount, seatsPerRow, seatData, takenSeats]);

  // Price summary
  const priceSummary = useMemo(() => {
    const subtotal = selectedSeats.reduce((a, s) => a + (CATEGORIES[s.cat]?.price || 0), 0);
    const fee = Math.round(subtotal * 0.05);
    return { subtotal, fee, total: subtotal + fee };
  }, [selectedSeats]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (mode !== 'edit') return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT') return;
      switch (e.key) {
        case '1': setCurrentTool('sahne'); break;
        case '2': setCurrentTool('vip'); break;
        case '3': setCurrentTool('standart'); break;
        case '4': setCurrentTool('balkon'); break;
        case 'e': case 'E': setCurrentTool('disabled'); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode]);

  // Global mouseup to stop painting
  useEffect(() => {
    const stop = () => setIsPainting(false);
    window.addEventListener('mouseup', stop);
    return () => window.removeEventListener('mouseup', stop);
  }, []);

  // ─── Render helpers ───
  const renderSeat = (r: number, s: number) => {
    const key = `${r}-${s}`;
    const cat = seatData[key] || getDefaultCat(r, rowCount);
    const isSelected = selectedSeats.some(ss => ss.key === key);
    const isTaken = takenSeats.has(key);
    const catInfo = CATEGORIES[cat];

    let bgColor = 'transparent';
    let border = `1.5px dashed ${colors.border}`;
    let boxShadow = 'none';
    let cursor = 'default';
    let opacity = 1;

    if (cat === 'disabled') {
      bgColor = colors.surface2;
      border = `1px solid ${colors.border}`;
      opacity = 0.4;
    } else if (catInfo) {
      bgColor = catInfo.color;
      border = 'none';
      boxShadow = `0 1px 0 rgba(0,0,0,0.3), 0 0 4px ${alpha(catInfo.color, 0.3)}`;
      cursor = 'pointer';
    }

    // Preview overrides
    if (mode === 'preview') {
      if (isTaken) {
        bgColor = colors.surface2;
        boxShadow = 'none';
        cursor = 'not-allowed';
        opacity = 0.5;
        border = 'none';
      } else if (isSelected) {
        bgColor = colors.green;
        boxShadow = `0 0 0 2px ${alpha(colors.green, 0.6)}, 0 0 12px ${alpha(colors.green, 0.4)}`;
        border = 'none';
      }
    }

    return (
      <Box
        key={key}
        onMouseDown={(e) => {
          if (mode === 'edit' && cat !== 'disabled') {
            e.preventDefault();
            setIsPainting(true);
            paintSeat(key);
          }
        }}
        onMouseEnter={(e) => {
          if (mode === 'edit' && isPainting && cat !== 'disabled') {
            paintSeat(key);
          }
          if (catInfo) {
            setTooltipData({
              show: true,
              x: e.clientX + 14,
              y: e.clientY - 60,
              row: rowLabel(r),
              seatNum: s + 1,
              cat,
            });
          }
        }}
        onMouseMove={(e) => {
          if (tooltipData?.show) {
            setTooltipData(prev => prev ? { ...prev, x: e.clientX + 14, y: e.clientY - 60 } : null);
          }
        }}
        onMouseLeave={() => setTooltipData(null)}
        onClick={() => {
          if (mode === 'preview' && catInfo) {
            handlePreviewClick(key, rowLabel(r), s + 1, cat);
          }
        }}
        sx={{
          width: 22,
          height: 22,
          borderRadius: '5px 5px 3px 3px',
          flexShrink: 0,
          cursor,
          background: bgColor,
          border,
          boxShadow,
          opacity,
          transition: 'transform 0.1s, box-shadow 0.1s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          userSelect: 'none',
          '&:hover': (mode === 'edit' && catInfo)
            ? { transform: 'scale(1.2)', zIndex: 5 }
            : (mode === 'preview' && catInfo && !isTaken && !isSelected)
              ? { transform: 'scale(1.15)', zIndex: 5, opacity: 0.85 }
              : {},
          ...(isSelected && mode === 'preview' && { transform: 'scale(1.15)', zIndex: 5 }),
        }}
      />
    );
  };

  const renderRow = (r: number) => {
    const seats = [];
    for (let s = 0; s < seatsPerRow; s++) {
      if (s === aislePos) {
        seats.push(<Box key={`aisle-${r}`} sx={{ width: 16, flexShrink: 0 }} />);
      }
      seats.push(renderSeat(r, s));
    }

    return (
      <Box key={r} sx={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        <Typography sx={{
          width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 700, color: colors.text3, fontFamily: '"JetBrains Mono", monospace',
          flexShrink: 0,
        }}>
          {rowLabel(r)}
        </Typography>
        <Box sx={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
          {seats}
        </Box>
        <Typography sx={{
          width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 700, color: colors.text3, fontFamily: '"JetBrains Mono", monospace',
          flexShrink: 0,
        }}>
          {rowLabel(r)}
        </Typography>
      </Box>
    );
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%', 
      width: '100%',
      background: colors.bg,
      overflow: 'hidden'
    }}>
      {/* TOP NAV */}
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        px: 3, height: 56, background: colors.surface, borderBottom: `1px solid ${colors.border}`,
        flexShrink: 0,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography sx={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.5 }}>
            Nart<Box component="span" sx={{ color: colors.green }}>Go</Box>
          </Typography>
          <Box sx={{ width: 1, height: 20, background: colors.border }} />
          <Typography sx={{ fontSize: 13.5, color: colors.text2 }}>
            <Box component="strong" sx={{ color: colors.text, fontWeight: 600 }}>Oturma Düzeni</Box> — Tasarımcı
          </Typography>
        </Box>

        {/* Mode toggle */}
        <Box sx={{
          display: 'flex', background: colors.surface2,
          border: `1px solid ${colors.border}`, borderRadius: 2, p: '3px', gap: '2px',
        }}>
          {(['edit', 'preview'] as const).map(m => (
            <Button
              key={m}
              size="small"
              startIcon={m === 'edit' ? <EditIcon sx={{ fontSize: '14px !important' }} /> : <PreviewIcon sx={{ fontSize: '14px !important' }} />}
              onClick={() => handleModeSwitch(m)}
              sx={{
                px: 1.75, py: 0.75, borderRadius: 1.5, fontSize: 13, fontWeight: 600,
                textTransform: 'none', minWidth: 'auto',
                color: mode === m ? colors.text : colors.text3,
                background: mode === m ? colors.surface3 : 'transparent',
                boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
                '&:hover': { background: mode === m ? colors.surface3 : alpha(colors.surface3, 0.5) },
              }}
            >
              {m === 'edit' ? 'Düzenleme' : 'Önizleme'}
            </Button>
          ))}
        </Box>

        {/* Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Tooltip title={isZenMode ? "Zen Modundan Çık" : "Zen Modu (Tam Pencere)"}>
            <IconButton
              size="small"
              onClick={toggleZenMode}
              sx={{
                width: 36, height: 36, borderRadius: 2, background: colors.surface2, border: `1px solid ${colors.border}`,
                color: isZenMode ? colors.green : colors.text2, '&:hover': { background: colors.surface3, color: colors.text },
              }}
            >
              {isZenMode ? <FullscreenExitIcon /> : <FullscreenIcon />}
            </IconButton>
          </Tooltip>

          <Tooltip title="Gerçek Tam Ekran (F11)">
            <IconButton
              size="small"
              onClick={toggleFullScreen}
              sx={{
                width: 36, height: 36, borderRadius: 2, background: colors.surface2, border: `1px solid ${colors.border}`,
                color: colors.text2, '&:hover': { background: colors.surface3, color: colors.text },
              }}
            >
              <FullscreenIcon />
            </IconButton>
          </Tooltip>

          <Button
            size="small"
            startIcon={<SaveIcon sx={{ fontSize: '14px !important' }} />}
            onClick={() => enqueueSnackbar('Taslak kaydedildi', { variant: 'info' })}
            sx={{
              px: 2, py: 1, borderRadius: 2, fontSize: 13, fontWeight: 600, textTransform: 'none',
              color: colors.text2, background: colors.surface2, border: `1px solid ${colors.border}`,
              '&:hover': { background: colors.surface3, color: colors.text },
            }}
          >
            Kaydet
          </Button>
          <Button
            size="small"
            startIcon={<CheckIcon sx={{ fontSize: '14px !important' }} />}
            onClick={() => enqueueSnackbar('Oturma düzeni kaydedildi ve bilet oluşturucuya aktarıldı', { variant: 'success' })}
            sx={{
              px: 2, py: 1, borderRadius: 2, fontSize: 13, fontWeight: 600, textTransform: 'none',
              color: colors.contrast, background: colors.green,
              '&:hover': { background: colors.greenDark },
            }}
          >
            Onayla & Devam
          </Button>
        </Box>
      </Box>

      {/* MAIN AREA */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── LEFT PANEL ── */}
        {mode === 'edit' && (
          <Box sx={{
            width: isLeftPanelOpen ? 280 : 0, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
            flexShrink: 0, background: colors.surface, position: 'relative',
            borderRight: isLeftPanelOpen ? `1px solid ${colors.border}` : 'none', 
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            boxShadow: isLeftPanelOpen ? '4px 0 24px rgba(0,0,0,0.1)' : 'none',
            zIndex: 10,
          }}>
            {/* Toggle Handle */}
            <Tooltip title={isLeftPanelOpen ? "Kaydır" : "Göster"} placement="right">
              <IconButton
                onClick={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
                sx={{
                  position: 'absolute', right: isLeftPanelOpen ? 4 : -32, top: '50%', transform: 'translateY(-50%)',
                  zIndex: 100, width: 28, height: 28, borderRadius: 1.5, 
                  background: colors.surface, border: `1px solid ${colors.border}`,
                  color: isLeftPanelOpen ? colors.text3 : colors.green, p: 0,
                  transition: 'all 0.3s',
                  '&:hover': { background: colors.surface2, color: colors.text2, transform: 'translateY(-50%) scale(1.1)' }
                }}
              >
                {isLeftPanelOpen ? <ChevronLeftIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
              </IconButton>
            </Tooltip>

            <Box sx={{ width: 280, height: '100%', display: 'flex', flexDirection: 'column', visibility: isLeftPanelOpen ? 'visible' : 'hidden', opacity: isLeftPanelOpen ? 1 : 0, transition: 'opacity 0.2s' }}>
              {/* Templates */}
              <Box sx={{ p: 3, borderBottom: `1px solid ${colors.border}` }}>
                <Typography sx={{ fontSize: 10, fontWeight: 700, color: colors.text3, textTransform: 'uppercase', letterSpacing: 1, mb: 1.25 }}>
                  Şablon Seç
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.75 }}>
                  {Object.entries(TEMPLATES).map(([key, t]) => (
                    <Box
                      key={key}
                      onClick={() => handleTemplateLoad(key)}
                      sx={{
                        background: template === key ? colors.greenDim : colors.surface2,
                        border: `1.5px solid ${template === key ? colors.green : colors.border}`,
                        borderRadius: 2, p: '10px 8px', cursor: 'pointer', textAlign: 'center',
                        transition: 'all 0.15s',
                        '&:hover': { borderColor: colors.border2, background: colors.surface3 },
                      }}
                    >
                      <Typography sx={{ fontSize: 20, mb: 0.5 }}>{t.icon}</Typography>
                      <Typography sx={{
                        fontSize: 11, fontWeight: 600,
                        color: template === key ? colors.green : colors.text2,
                      }}>
                        {t.label}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>

              {/* Category tools */}
              <Box sx={{ p: 3, borderBottom: `1px solid ${colors.border}` }}>
                <Typography sx={{ fontSize: 10, fontWeight: 700, color: colors.text3, textTransform: 'uppercase', letterSpacing: 1, mb: 2 }}>
                  Kategori Fırçası
                </Typography>
                {Object.entries(CATEGORIES).map(([key, cat]) => (
                  <Box
                    key={key}
                    onClick={() => setCurrentTool(key)}
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 1.5,
                      p: '12px 16px', borderRadius: 2, cursor: 'pointer', mb: 1,
                      border: `1.5px solid ${currentTool === key ? cat.color : 'transparent'}`,
                      background: currentTool === key ? colors.surface2 : 'transparent',
                      color: cat.color, transition: 'all 0.15s',
                      '&:hover': { background: colors.surface3 },
                    }}
                  >
                    <Box sx={{ width: 14, height: 14, borderRadius: 1, background: cat.color, flexShrink: 0 }} />
                    <Typography sx={{ fontSize: 14, fontWeight: 600, flex: 1 }}>{cat.name}</Typography>
                    <Typography sx={{ fontSize: 12, fontFamily: '"JetBrains Mono", monospace', color: colors.text3 }}>
                      ₺{cat.price}
                    </Typography>
                  </Box>
                ))}
                {/* Disabled tool */}
                <Box
                  onClick={() => setCurrentTool('disabled')}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 1.5,
                    p: '12px 16px', borderRadius: 2, cursor: 'pointer',
                    border: `1.5px solid ${currentTool === 'disabled' ? colors.text3 : 'transparent'}`,
                    background: currentTool === 'disabled' ? colors.surface2 : 'transparent',
                    color: currentTool === 'disabled' ? colors.text : colors.text3,
                    transition: 'all 0.15s',
                    '&:hover': { background: colors.surface3, color: colors.text2 },
                  }}
                >
                  <BlockIcon sx={{ fontSize: 14 }} />
                  <Typography sx={{ fontSize: 14, fontWeight: 600 }}>Koltuk Kapat</Typography>
                </Box>
              </Box>

              {/* Mini stats */}
              <Box sx={{ p: 3, flex: 1, overflowY: 'auto' }}>
                <Typography sx={{ fontSize: 10, fontWeight: 700, color: colors.text3, textTransform: 'uppercase', letterSpacing: 1, mb: 2 }}>
                  İstatistikler
                </Typography>
                <Stack spacing={0.75}>
                  {Object.entries(stats.counts).map(([key, count]) => {
                    const cat = CATEGORIES[key];
                    if (!cat) return null;
                    const pct = stats.total ? (count / stats.total) * 100 : 0;
                    return (
                      <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '3px', background: cat.color, flexShrink: 0 }} />
                        <Typography sx={{ fontSize: 12, color: colors.text2, width: 72 }}>{cat.name}</Typography>
                        <Box sx={{ flex: 1, height: 4, background: colors.surface3, borderRadius: 1, overflow: 'hidden' }}>
                          <Box sx={{ height: '100%', width: `${pct}%`, background: cat.color, borderRadius: 1, transition: 'width 0.3s' }} />
                        </Box>
                        <Typography sx={{ fontSize: 12, fontFamily: '"JetBrains Mono", monospace', color: colors.text2, width: 30, textAlign: 'right' }}>
                          {count}
                        </Typography>
                      </Box>
                    );
                  })}
                </Stack>
              </Box>
            </Box>
          </Box>
        )}

        {/* ── CANVAS ── */}
        <Box 
          ref={containerRef}
          sx={{
          flex: 1, position: 'relative', overflow: 'hidden', background: colors.bg,
          backgroundImage: `
            radial-gradient(circle at 50% 0%, ${alpha(colors.green, 0.04)} 0%, transparent 60%),
            linear-gradient(${colors.border2} 2px, transparent 2px),
            linear-gradient(90deg, ${colors.border2} 2px, transparent 2px)
          `,
          backgroundSize: '100% 100%, 32px 32px, 32px 32px',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Box sx={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
            justifyContent: 'center', p: 5, overflow: 'auto',
          }}>
            <Box
              ref={venueRef}
              sx={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                transformOrigin: 'top center', transition: 'transform 0.2s',
                transform: `scale(${zoomLevel})`, minWidth: 600,
              }}
            >
              {/* Stage */}
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3.5, width: '100%' }}>
                <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                  {[
                    { color: '#ef4444', delay: '0s' },
                    { color: '#f59e0b', delay: '0.4s' },
                    { color: '#22c55e', delay: '0.8s' },
                    { color: '#3b82f6', delay: '1.2s' },
                    { color: '#a855f7', delay: '1.6s' },
                  ].map((light, i) => (
                    <Box
                      key={i}
                      sx={{
                        width: 6, height: 6, borderRadius: '50%', background: light.color,
                        animation: 'seatmapBlink 3s infinite',
                        animationDelay: light.delay,
                        '@keyframes seatmapBlink': {
                          '0%,80%,100%': { opacity: 1 },
                          '40%': { opacity: 0.2 },
                        },
                      }}
                    />
                  ))}
                </Box>
                <Box sx={{
                  background: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
                  border: `1px solid ${theme.palette.divider}`, borderRadius: 3,
                  py: 2.5, px: 8, fontSize: 15, fontWeight: 800, color: theme.palette.primary.main,
                  letterSpacing: 4, textTransform: 'uppercase', width: 'fit-content', minWidth: 400, textAlign: 'center',
                  boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.15)}`, position: 'relative',
                  '&::after': {
                    content: '""', position: 'absolute', bottom: -16, left: '50%',
                    transform: 'translateX(-50%)', width: '90%', height: 16,
                    background: `linear-gradient(180deg, ${alpha(theme.palette.divider, 0.4)}, transparent)`,
                    borderRadius: '0 0 100px 100px',
                  },
                }}>
                  🎤 &nbsp; S A H N E &nbsp; 🎤
                </Box>
              </Box>

              {/* Seat rows */}
              <Stack spacing={0.625} sx={{ width: '100%', alignItems: 'center' }}>
                {Array.from({ length: rowCount }, (_, r) => renderRow(r))}
              </Stack>
            </Box>
          </Box>

          {/* Zoom controls */}
          <Box sx={{
            position: 'absolute', bottom: 20, right: mode === 'edit' ? 280 : 280,
            display: 'flex', flexDirection: 'column', gap: 0.5, zIndex: 10,
          }}>
            {[
              { icon: <AddIcon />, label: 'Yakınlaştır', action: () => setZoomLevel(z => Math.min(2, z + 0.1)) },
              { icon: <RemoveIcon />, label: 'Uzaklaştır', action: () => setZoomLevel(z => Math.max(0.4, z - 0.1)) },
              { icon: <FitIcon />, label: 'Sığdır', action: handleFitToScreen },
              { icon: <ResetIcon />, label: 'Sıfırla', action: () => setZoomLevel(1) },
            ].map((btn, i) => (
              <React.Fragment key={i}>
                {i === 2 && (
                  <Box sx={{
                    background: colors.surface2, border: `1px solid ${colors.border}`,
                    borderRadius: 1.5, py: 0.5, px: 1, fontSize: 11,
                    fontFamily: '"JetBrains Mono", monospace', color: colors.text2, textAlign: 'center',
                  }}>
                    {Math.round(zoomLevel * 100)}%
                  </Box>
                )}
                <Tooltip title={btn.label} placement="left">
                  <IconButton
                    onClick={btn.action}
                    sx={{
                      width: 36, height: 36, borderRadius: 2,
                      background: colors.surface2, border: `1px solid ${colors.border}`,
                      color: colors.text2, '&:hover': { background: colors.surface3, color: colors.text },
                    }}
                  >
                    {btn.icon}
                  </IconButton>
                </Tooltip>
              </React.Fragment>
            ))}
          </Box>
        </Box>

        {/* ── RIGHT PANEL (EDIT) ── */}
        {mode === 'edit' && (
          <Box sx={{
            width: isRightPanelOpen ? 320 : 0, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
            flexShrink: 0, background: colors.surface, position: 'relative',
            borderLeft: isRightPanelOpen ? `1px solid ${colors.border}` : 'none', 
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            boxShadow: isRightPanelOpen ? '-4px 0 24px rgba(0,0,0,0.1)' : 'none',
            zIndex: 10,
          }}>
            {/* Toggle Handle */}
            <Tooltip title={isRightPanelOpen ? "Kaydır" : "Ayarları Göster"} placement="left">
              <IconButton
                onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
                sx={{
                  position: 'absolute', left: isRightPanelOpen ? 4 : -32, top: '50%', transform: 'translateY(-50%)',
                  zIndex: 100, width: 28, height: 28, borderRadius: 1.5, 
                  background: colors.surface, border: `1px solid ${colors.border}`,
                  color: isRightPanelOpen ? colors.text3 : colors.green, p: 0,
                  transition: 'all 0.3s',
                  '&:hover': { background: colors.surface2, color: colors.text2, transform: 'translateY(-50%) scale(1.1)' }
                }}
              >
                {isRightPanelOpen ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
              </IconButton>
            </Tooltip>

            <Box sx={{ width: 320, height: '100%', display: 'flex', flexDirection: 'column', visibility: isRightPanelOpen ? 'visible' : 'hidden', opacity: isRightPanelOpen ? 1 : 0, transition: 'opacity 0.2s' }}>
              {/* Settings */}
              <Box sx={{ p: 3, borderBottom: `1px solid ${colors.border}` }}>
                <Typography sx={{ fontSize: 10, fontWeight: 700, color: colors.text3, textTransform: 'uppercase', letterSpacing: 1, mb: 2 }}>
                  Salon Ayarları
                </Typography>
              {[
                { label: 'Sıra Sayısı', value: rowCount, onChange: (v: number) => { setRowCount(v); setSeatData({}); }, min: 1, max: 30 },
                { label: 'Koltuk / Sıra', value: seatsPerRow, onChange: (v: number) => { setSeatsPerRow(v); setSeatData({}); }, min: 1, max: 40 },
                { label: 'Koridor Pozisyonu', value: aislePos, onChange: (v: number) => { setAislePos(v); setSeatData({}); }, min: 1, max: seatsPerRow },
              ].map((setting, i) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: i < 2 ? 1.25 : 0 }}>
                  <Typography sx={{ fontSize: 12.5, color: colors.text2 }}>{setting.label}</Typography>
                  <TextField
                    type="number"
                    size="small"
                    value={setting.value}
                    onChange={(e) => setting.onChange(parseInt(e.target.value) || setting.min)}
                    inputProps={{ min: setting.min, max: setting.max, style: { textAlign: 'center', padding: '4px 8px', fontFamily: '"JetBrains Mono", monospace', fontSize: 13 } }}
                    sx={{
                      width: 64,
                      '& .MuiOutlinedInput-root': {
                        background: colors.surface2, borderRadius: 1.5,
                        '& fieldset': { borderColor: colors.border },
                        '&:hover fieldset': { borderColor: colors.border2 },
                        '&.Mui-focused fieldset': { borderColor: colors.green },
                      },
                      '& input': { color: colors.text },
                    }}
                  />
                </Box>
              ))}
            </Box>

            {/* Category stats */}
            <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
              {Object.entries(stats.counts).map(([key, count]) => {
                const cat = CATEGORIES[key];
                if (!cat) return null;
                return (
                  <Box key={key} sx={{
                    background: colors.surface2, border: `1px solid ${colors.border}`,
                    borderRadius: 2.5, p: 1.75, mb: 1.25,
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25 }}>
                      <Box sx={{ width: 12, height: 12, borderRadius: '3px', background: cat.color }} />
                      <Typography sx={{ fontSize: 13, fontWeight: 700, color: colors.text }}>{cat.name}</Typography>
                      <Box sx={{ ml: 'auto' }}>
                        <Box sx={{
                          fontSize: 11, fontWeight: 700, px: 1, py: '3px', borderRadius: 1.5,
                          background: colors.greenDim, color: colors.green,
                        }}>
                          ₺{cat.price}
                        </Box>
                      </Box>
                    </Box>
                    <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 18, fontWeight: 800, color: colors.text }}>
                      {count}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: colors.text3 }}>
                      koltuk · Maks. ₺{(cat.price * count).toLocaleString('tr-TR')}
                    </Typography>
                  </Box>
                );
              })}

              {/* Total summary */}
              <Box sx={{ background: colors.surface2, border: `1px solid ${colors.border}`, borderRadius: 2.5, p: 1.75 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, mb: 0.75, color: colors.text2 }}>
                  <span>Toplam Koltuk</span>
                  <strong style={{ color: colors.text }}>{stats.total}</strong>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, mb: 0.75, color: colors.text2 }}>
                  <span>Maks. Gelir</span>
                  <strong style={{ color: colors.green }}>₺{stats.maxRevenue.toLocaleString('tr-TR')}</strong>
                </Box>
                <Box sx={{
                  display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 800,
                  pt: 1, borderTop: `1px solid ${colors.border}`, mt: 0.25, color: colors.text,
                }}>
                  <span>Doluluk Hedefi</span>
                  <strong>%100</strong>
                </Box>
              </Box>
              </Box>
            </Box>
          </Box>
        )}

        {/* ── RIGHT PANEL (PREVIEW) ── */}
        {mode === 'preview' && (
          <Box sx={{
            width: isRightPanelOpen ? 320 : 0, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
            flexShrink: 0, background: colors.surface, position: 'relative',
            borderLeft: isRightPanelOpen ? `1px solid ${colors.border}` : 'none', 
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            boxShadow: isRightPanelOpen ? '-4px 0 24px rgba(0,0,0,0.1)' : 'none',
            zIndex: 10,
          }}>
            {/* Toggle Handle */}
            <Tooltip title={isRightPanelOpen ? "Kaydır" : "Özeti Göster"} placement="left">
              <IconButton
                onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
                sx={{
                  position: 'absolute', left: isRightPanelOpen ? 4 : -32, top: '50%', transform: 'translateY(-50%)',
                  zIndex: 100, width: 28, height: 28, borderRadius: 1.5, 
                  background: colors.surface, border: `1px solid ${colors.border}`,
                  color: isRightPanelOpen ? colors.text3 : colors.green, p: 0,
                  transition: 'all 0.3s',
                  '&:hover': { background: colors.surface2, color: colors.text2, transform: 'translateY(-50%) scale(1.1)' }
                }}
              >
                {isRightPanelOpen ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
              </IconButton>
            </Tooltip>

            <Box sx={{ width: 320, height: '100%', display: 'flex', flexDirection: 'column', visibility: isRightPanelOpen ? 'visible' : 'hidden', opacity: isRightPanelOpen ? 1 : 0, transition: 'opacity 0.2s' }}>
              {/* Legend */}
              <Box sx={{ p: 3, borderBottom: `1px solid ${colors.border}` }}>
                <Typography sx={{ fontSize: 10, fontWeight: 700, color: colors.text3, textTransform: 'uppercase', letterSpacing: 1, mb: 2 }}>
                  Bilet Kategorileri
                </Typography>
              <Stack spacing={0.75}>
                {Object.entries(CATEGORIES).map(([key, cat]) => (
                  <Box key={key} sx={{
                    display: 'flex', alignItems: 'center', gap: 1.25,
                    p: '8px 10px', borderRadius: 2, background: colors.surface2, border: `1px solid ${colors.border}`,
                  }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: '3px', background: cat.color, flexShrink: 0 }} />
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 600, color: colors.text }}>{cat.name}</Typography>
                      <Typography sx={{ fontSize: 11.5, color: colors.text3 }}>{availableCounts[key] || 0} koltuk müsait</Typography>
                    </Box>
                    <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 13, fontWeight: 700, color: colors.text }}>
                      ₺{cat.price}
                    </Typography>
                  </Box>
                ))}
              </Stack>
              <Box sx={{ display: 'flex', gap: 1.5, mt: 1.25 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: 12, color: colors.text3 }}>
                  <Box sx={{ width: 14, height: 14, borderRadius: 1, background: colors.surface2, border: `1px solid ${colors.border}` }} />
                  Dolu
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: 12, color: colors.text3 }}>
                  <Box sx={{ width: 14, height: 14, borderRadius: 1, background: colors.green }} />
                  Seçili
                </Box>
              </Box>
            </Box>

            {/* Selected seats */}
            <Box sx={{ flex: 1, overflowY: 'auto', p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: colors.text3, textTransform: 'uppercase', letterSpacing: 1 }}>
                Seçilen Koltuklar
              </Typography>

              {selectedSeats.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4, px: 2, color: colors.text3 }}>
                  <Typography sx={{ fontSize: 32, mb: 1, opacity: 0.5 }}>🪑</Typography>
                  <Typography sx={{ fontSize: 13 }}>Koltuk seçmek için haritaya tıklayın</Typography>
                </Box>
              ) : (
                <Stack spacing={0.75}>
                  {selectedSeats.map(s => {
                    const cat = CATEGORIES[s.cat];
                    return (
                      <Box
                        key={s.key}
                        sx={{
                          display: 'flex', alignItems: 'center', gap: 1.25,
                          background: colors.surface2, border: `1px solid ${colors.border}`,
                          borderRadius: 2, p: '9px 12px',
                          animation: 'seatSlideIn 0.2s ease',
                          '@keyframes seatSlideIn': {
                            from: { opacity: 0, transform: 'translateY(-6px)' },
                            to: { opacity: 1, transform: 'none' },
                          },
                        }}
                      >
                        <Box sx={{ width: 10, height: 10, borderRadius: '3px', background: cat.color, flexShrink: 0 }} />
                        <Box sx={{ flex: 1 }}>
                          <Typography sx={{ fontSize: 13, fontWeight: 700, color: colors.text }}>
                            Sıra {s.row} — Koltuk {s.num}
                          </Typography>
                          <Typography sx={{ fontSize: 11.5, color: colors.text3 }}>{cat.name}</Typography>
                        </Box>
                        <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 13, fontWeight: 700, color: colors.green }}>
                          ₺{cat.price}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => setSelectedSeats(prev => prev.filter(ss => ss.key !== s.key))}
                          sx={{ color: colors.text3, p: 0.25, '&:hover': { color: '#ef4444' } }}
                        >
                          <CloseIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Box>
                    );
                  })}
                </Stack>
              )}

              {/* Price summary */}
              {selectedSeats.length > 0 && (
                <Box sx={{ background: colors.surface2, border: `1px solid ${colors.border}`, borderRadius: 2.5, p: 1.75 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, mb: 1, color: colors.text2 }}>
                    <span>Bilet ({selectedSeats.length} adet)</span>
                    <span>₺{priceSummary.subtotal.toLocaleString('tr-TR')}</span>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, mb: 1, color: colors.text2 }}>
                    <span>Hizmet Bedeli (%5)</span>
                    <span>₺{priceSummary.fee.toLocaleString('tr-TR')}</span>
                  </Box>
                  <Box sx={{
                    display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 800,
                    pt: 1.25, borderTop: `1px solid ${colors.border}`, mt: 0.5, color: colors.text,
                  }}>
                    <span>Toplam</span>
                    <span style={{ color: colors.green, fontFamily: '"JetBrains Mono", monospace' }}>
                      ₺{priceSummary.total.toLocaleString('tr-TR')}
                    </span>
                  </Box>
                </Box>
              )}

              {/* Buy button */}
              <Button
                fullWidth
                disabled={selectedSeats.length === 0}
                onClick={() => setOrderModalOpen(true)}
                startIcon={<CartIcon />}
                sx={{
                  py: 1.625, borderRadius: 2.5, fontSize: 15, fontWeight: 800, textTransform: 'none',
                  background: selectedSeats.length > 0 ? colors.green : colors.surface3,
                  color: selectedSeats.length > 0 ? colors.contrast : colors.text3,
                  '&:hover': { background: colors.greenDark, transform: 'translateY(-1px)', boxShadow: `0 4px 16px ${alpha(colors.green, 0.3)}` },
                  '&:disabled': { background: colors.surface3, color: colors.text3 },
                }}
              >
                Ödemeye Geç
              </Button>

              <Typography sx={{ fontSize: 11.5, color: colors.text3, textAlign: 'center' }}>
                Maksimum <strong style={{ color: colors.text2 }}>6</strong> koltuk seçilebilir
              </Typography>
              </Box>
            </Box>
          </Box>
        )}
      </Box>

      {/* ── TOOLTIP ── */}
      {tooltipData?.show && (
        <Box sx={{
          position: 'fixed', zIndex: 200, left: tooltipData.x, top: tooltipData.y,
          background: colors.surface3, border: `1px solid ${colors.border2}`,
          borderRadius: 2, p: '8px 12px', pointerEvents: 'none',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)', whiteSpace: 'nowrap',
        }}>
          <Typography sx={{ fontWeight: 700, color: colors.text2, fontSize: 11, textTransform: 'uppercase', mb: 0.25 }}>
            Sıra {tooltipData.row}
          </Typography>
          <Typography sx={{ fontSize: 14, fontWeight: 800, color: colors.text, mb: 0.5 }}>
            Koltuk {tooltipData.seatNum}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: 12, color: colors.text2 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '2px', background: CATEGORIES[tooltipData.cat]?.color }} />
            {CATEGORIES[tooltipData.cat]?.name}
          </Box>
          {mode === 'preview' && (
            <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, color: colors.text, mt: 0.5 }}>
              ₺{CATEGORIES[tooltipData.cat]?.price}
            </Typography>
          )}
        </Box>
      )}

      {/* ── ORDER MODAL ── */}
      <Dialog
        open={orderModalOpen}
        onClose={() => setOrderModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            background: colors.surface, border: `1px solid ${colors.border2}`,
            borderRadius: 4, boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          },
        }}
        slotProps={{ backdrop: { sx: { backdropFilter: 'blur(6px)' } } }}
      >
        <DialogTitle sx={{ px: 3, pt: 2.5, pb: 0 }}>
          <Typography sx={{ fontSize: 18, fontWeight: 800, color: colors.text }}>
            <TicketIcon sx={{ fontSize: 20, mr: 1, verticalAlign: 'text-bottom' }} />
            Sipariş Özeti
          </Typography>
          <Typography sx={{ fontSize: 13, color: colors.text3, mt: 0.5 }}>
            Oturma Düzeni Siparişi
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ px: 3, py: 2.5 }}>
          <Stack spacing={1} sx={{ mb: 2 }}>
            {selectedSeats.map(s => {
              const cat = CATEGORIES[s.cat];
              return (
                <Box key={s.key} sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5,
                  p: 1.5, background: colors.surface2, borderRadius: 2,
                }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: '3px', background: cat.color, flexShrink: 0 }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 700, color: colors.text }}>Sıra {s.row} — Koltuk {s.num}</Typography>
                    <Typography sx={{ fontSize: 12, color: colors.text3 }}>{cat.name}</Typography>
                  </Box>
                  <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, color: colors.green }}>
                    ₺{cat.price}
                  </Typography>
                </Box>
              );
            })}
          </Stack>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: colors.text3, mb: 1, px: 0.5 }}>
            <span>Ara Toplam</span>
            <span>₺{priceSummary.subtotal.toLocaleString('tr-TR')}</span>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: colors.text3, mb: 1.5, px: 0.5 }}>
            <span>Hizmet Bedeli</span>
            <span>₺{priceSummary.fee.toLocaleString('tr-TR')}</span>
          </Box>
          <Box sx={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            p: 1.75, background: colors.surface3, borderRadius: 2, mt: 0.5,
          }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: colors.text }}>Ödenecek Tutar</Typography>
            <Typography sx={{ fontSize: 22, fontWeight: 800, fontFamily: '"JetBrains Mono", monospace', color: colors.green }}>
              ₺{priceSummary.total.toLocaleString('tr-TR')}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setOrderModalOpen(false)}
            sx={{
              px: 2, py: 1, borderRadius: 2, fontSize: 13, fontWeight: 600, textTransform: 'none',
              color: colors.text2, background: colors.surface2, border: `1px solid ${colors.border}`,
              '&:hover': { background: colors.surface3, color: colors.text },
            }}
          >
            Geri Dön
          </Button>
          <Button
            onClick={() => {
              setOrderModalOpen(false);
              enqueueSnackbar('Ödeme sayfasına yönlendiriliyorsunuz...', { variant: 'success' });
            }}
            sx={{
              px: 2, py: 1, borderRadius: 2, fontSize: 13, fontWeight: 600, textTransform: 'none',
              color: colors.contrast, background: colors.green,
              '&:hover': { background: colors.greenDark },
            }}
          >
            Ödemeye Geç
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SeatMapDesigner;
