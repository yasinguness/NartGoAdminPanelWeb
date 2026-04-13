/**
 * SeatMapLive — Full-featured seat map management for events.
 * Uses admin API for rich seat details (owner, manual sell, stats).
 * 3-column layout: categories | SVG seat grid | detail/editor panel.
 * Multi-select, manual sell, batch ops, keyboard shortcuts.
 * Route: /admin/events/:eventId/seat-map
 */
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import {
  Box, Typography, Stack, Paper, Chip, Button, IconButton,
  TextField, Divider, alpha, useTheme, CircularProgress, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Badge, Menu, MenuItem, ListItemIcon, ListItemText,
} from '@mui/material';
import {
  ArrowBack as BackIcon, Refresh as RefreshIcon, Download as DownloadIcon,
  Close as CloseIcon, Block as BlockIcon, ShoppingCart as SellIcon,
  LockOpen as UnblockIcon, Deselect as DeselectIcon,
  ZoomIn as ZoomInIcon, ZoomOut as ZoomOutIcon, FitScreen as FitIcon,
  Edit as EditIcon, Save as SaveIcon, SelectAll as SelectAllIcon,
  Cancel as CancelIcon, DoNotDisturb as DisableIcon,
} from '@mui/icons-material';
import { ticketService } from '../../services/ticket/ticketService';
import { api } from '../../services/api';
import type {
  SeatMapResponse, SeatCategoryResponse, SeatRowResponse,
  OccupiedSeatDetail, SeatMapStats,
} from '../../types/tickets/ticketTypes';

// ── Internal seat model (flattened from API response) ───
interface SeatDetail {
  key: string;             // categoryId_rowLabel_seatNumber (unique)
  seatNumber: number;
  rowLabel: string;
  rowId: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  basePrice: number;
  ticketTypeId: string;
  status: 'AVAILABLE' | 'SOLD' | 'LOCKED' | 'RESERVED' | 'DISABLED';
  isManual: boolean;
  manualNote?: string;
  ownerName?: string;
  ticketNumber?: string;
  lockedUntil?: string;
}

interface CategorySummary {
  id: string;
  name: string;
  color: string;
  basePrice: number;
  ticketTypeId: string;
  total: number;
  sold: number;
  available: number;
  locked: number;
  disabled: number;
  manualSold: number;
  revenue: number;
}

// ── Status display config ──────────────────────────────
const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  AVAILABLE: { color: '#22c55e', label: 'Müsait' },
  SOLD:      { color: '#ef4444', label: 'Satıldı' },
  LOCKED:    { color: '#fbbf24', label: 'Kilitli' },
  RESERVED:  { color: '#8b5cf6', label: 'Rezerve' },
  DISABLED:  { color: '#d1d5db', label: 'Devre Dışı' },
};

const getSeatFill = (seat: SeatDetail, categoryColor: string): string => {
  switch (seat.status) {
    case 'AVAILABLE':  return categoryColor;
    case 'SOLD':       return seat.isManual ? '#f97316' : '#ef4444';
    case 'LOCKED':     return '#fbbf24';
    case 'RESERVED':   return '#8b5cf6';
    case 'DISABLED':   return '#d1d5db';
    default:           return categoryColor;
  }
};

const SEAT_SIZE = 22;
const SEAT_GAP = 4;
const ROW_LABEL_X = 32;
const SEAT_START_X = 50;
const PADDING_TOP = 60;
const ROW_HEIGHT = SEAT_SIZE + SEAT_GAP;

// ── Calculate stats from API data (client fallback) ────
const calculateStats = (data: SeatMapResponse): SeatMapStats => {
  let total = 0, available = 0, occupied = 0, manual = 0, locked = 0, disabled = 0;
  let maxRev = 0, curRev = 0;
  data.categories.forEach(cat => {
    cat.rows.forEach(row => {
      const rowTotal = row.availableSeats.length + row.occupiedSeats.length;
      total += rowTotal;
      available += row.availableSeats.length;
      const details = row.occupiedSeatDetails || [];
      details.forEach(d => {
        if (d.status === 'SOLD') { occupied++; curRev += cat.basePrice; if (d.isManual) manual++; }
        else if (d.status === 'LOCKED') locked++;
        else if (d.status === 'DISABLED') disabled++;
        else occupied++;
      });
      // If no details, count from occupiedSeats numbers
      if (details.length === 0) occupied += row.occupiedSeats.length;
      maxRev += rowTotal * cat.basePrice;
    });
  });
  return { totalSeats: total, availableSeats: available, occupiedSeats: occupied,
    lockedSeats: locked, disabledSeats: disabled, manualSoldSeats: manual,
    maxRevenue: maxRev, currentRevenue: curRev };
};

export default function SeatMapLive() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();

  // Raw API data
  const [seatMapData, setSeatMapData] = useState<SeatMapResponse | null>(null);
  const [stats, setStats] = useState<SeatMapStats | null>(null);

  // Derived flat seat list + categories
  const [allSeats, setAllSeats] = useState<SeatDetail[]>([]);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [eventName, setEventName] = useState('');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Selection
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [highlightCategory, setHighlightCategory] = useState<string | null>(null);

  // Right panel
  const [detailSeat, setDetailSeat] = useState<SeatDetail | null>(null);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [rightPanelMode, setRightPanelMode] = useState<'seat' | 'category'>('seat');

  // Category editor
  const [editingCategory, setEditingCategory] = useState<CategorySummary | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatPrice, setEditCatPrice] = useState('');
  const [editCatColor, setEditCatColor] = useState('');
  const [editCatSaving, setEditCatSaving] = useState(false);

  // Manual sell dialog
  const [manualSellOpen, setManualSellOpen] = useState(false);
  const [manualSellNote, setManualSellNote] = useState('');
  const [manualSellLoading, setManualSellLoading] = useState(false);

  // Block dialog
  const [blockOpen, setBlockOpen] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [blockLoading, setBlockLoading] = useState(false);

  // Zoom
  const [zoom, setZoom] = useState(1);
  const svgContainerRef = useRef<HTMLDivElement>(null);

  // Context menu
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; seat: SeatDetail } | null>(null);

  // Audit logs
  const [auditLogs, setAuditLogs] = useState<Array<Record<string, any>>>([]);

  // ── Ordered rows from API ───────────────────────────
  const rowOrder = useMemo(() => seatMapData?.rowLabelOrder || [...new Set(allSeats.map(s => s.rowLabel))].sort(), [seatMapData, allSeats]);

  // SVG dimensions
  const maxCols = useMemo(() => {
    const byRow: Record<string, number> = {};
    allSeats.forEach(s => { byRow[s.rowLabel] = Math.max(byRow[s.rowLabel] || 0, s.seatNumber); });
    return Math.max(...Object.values(byRow), 0);
  }, [allSeats]);

  const svgWidth = useMemo(() => SEAT_START_X + maxCols * (SEAT_SIZE + SEAT_GAP) + ROW_LABEL_X + 40, [maxCols]);
  const svgHeight = useMemo(() => PADDING_TOP + rowOrder.length * ROW_HEIGHT + 40, [rowOrder]);

  // ── Flatten API response into SeatDetail[] ──────────
  const flattenSeatMap = useCallback((data: SeatMapResponse): SeatDetail[] => {
    const colorMap = data.categoryIdToColor || {};
    const palette = ['#8b5cf6', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#ec4899'];
    const result: SeatDetail[] = [];

    data.categories.forEach((cat, ci) => {
      const color = colorMap[cat.categoryId] || palette[ci % palette.length];
      cat.rows.forEach(row => {
        // Build detail lookup
        const detailMap = new Map<number, OccupiedSeatDetail>();
        (row.occupiedSeatDetails || []).forEach(d => detailMap.set(d.seatNumber, d));

        // Available seats
        row.availableSeats.forEach(num => {
          result.push({
            key: `${cat.categoryId}_${row.rowLabel}_${num}`,
            seatNumber: num, rowLabel: row.rowLabel, rowId: row.rowId,
            categoryId: cat.categoryId, categoryName: cat.categoryName,
            categoryColor: color, basePrice: cat.basePrice,
            ticketTypeId: cat.ticketTypeId,
            status: 'AVAILABLE', isManual: false,
          });
        });

        // Occupied seats
        row.occupiedSeats.forEach(num => {
          const detail = detailMap.get(num);
          result.push({
            key: `${cat.categoryId}_${row.rowLabel}_${num}`,
            seatNumber: num, rowLabel: row.rowLabel, rowId: row.rowId,
            categoryId: cat.categoryId, categoryName: cat.categoryName,
            categoryColor: color, basePrice: cat.basePrice,
            ticketTypeId: cat.ticketTypeId,
            status: (detail?.status as any) || 'SOLD',
            isManual: detail?.isManual || false,
            manualNote: detail?.manualNote,
            ownerName: detail?.ownerName,
            ticketNumber: detail?.ticketNumber,
            lockedUntil: detail?.lockedUntil,
          });
        });

        // Blocked seats
        (row.blockedSeats || []).forEach(num => {
          result.push({
            key: `${cat.categoryId}_${row.rowLabel}_${num}`,
            seatNumber: num, rowLabel: row.rowLabel, rowId: row.rowId,
            categoryId: cat.categoryId, categoryName: cat.categoryName,
            categoryColor: color, basePrice: cat.basePrice,
            ticketTypeId: cat.ticketTypeId,
            status: 'DISABLED', isManual: false,
          });
        });
      });
    });

    return result;
  }, []);

  // ── Build category summaries ────────────────────────
  const buildCategories = useCallback((data: SeatMapResponse, seats: SeatDetail[]): CategorySummary[] => {
    const colorMap = data.categoryIdToColor || {};
    const palette = ['#8b5cf6', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#ec4899'];

    return data.categories.map((cat, ci) => {
      const color = colorMap[cat.categoryId] || palette[ci % palette.length];
      const catSeats = seats.filter(s => s.categoryId === cat.categoryId);
      const sold = catSeats.filter(s => s.status === 'SOLD').length;
      const locked = catSeats.filter(s => s.status === 'LOCKED').length;
      const disabled = catSeats.filter(s => s.status === 'DISABLED').length;
      const available = catSeats.filter(s => s.status === 'AVAILABLE').length;
      const manualSold = catSeats.filter(s => s.isManual && s.status === 'SOLD').length;

      return {
        id: cat.categoryId, name: cat.categoryName, color,
        basePrice: cat.basePrice, ticketTypeId: cat.ticketTypeId,
        total: catSeats.length, sold, available, locked, disabled, manualSold,
        revenue: sold * cat.basePrice,
      };
    });
  }, []);

  // ── Fetch data from admin endpoint ──────────────────
  const fetchData = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const [mapRes, eventRes, auditRes] = await Promise.allSettled([
        api.get(`/tickets/admin/events/${eventId}/seat-map`),
        api.get(`/events/${eventId}`),
        api.get(`/tickets/admin/events/${eventId}/seats/audit?page=0&size=20`),
      ]);

      const data: SeatMapResponse | null = mapRes.status === 'fulfilled' ? mapRes.value.data?.data : null;
      const event = eventRes.status === 'fulfilled' ? eventRes.value.data?.data : null;

      if (event) setEventName(event.name || '');

      if (data && data.categories?.length > 0) {
        setSeatMapData(data);
        const seats = flattenSeatMap(data);
        setAllSeats(seats);
        setCategories(buildCategories(data, seats));
        setStats(data.stats || calculateStats(data));
      }

      // Audit logs
      const auditData = auditRes.status === 'fulfilled' ? (auditRes.value.data?.data || []) : [];
      if (Array.isArray(auditData)) setAuditLogs(auditData);

      setLastUpdated(new Date());
    } catch (err) {
      console.error('Seat map yüklenemedi:', err);
      enqueueSnackbar('Koltuk haritası yüklenemedi', { variant: 'error' });
    } finally { setLoading(false); }
  }, [eventId, enqueueSnackbar, flattenSeatMap, buildCategories]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Keyboard shortcuts ──────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedKeys(new Set()); setDetailSeat(null);
        setRightPanelOpen(false); setContextMenu(null);
      }
      if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const visible = highlightCategory ? allSeats.filter(s => s.categoryId === highlightCategory) : allSeats;
        setSelectedKeys(new Set(visible.map(s => s.key)));
      }
      if (e.key === 'r' && !e.ctrlKey && !e.metaKey && !(document.activeElement instanceof HTMLInputElement)) {
        fetchData();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [allSeats, highlightCategory, fetchData]);

  // ── Seat click ──────────────────────────────────────
  const handleSeatClick = (seat: SeatDetail, e: React.MouseEvent) => {
    if (e.shiftKey && selectedKeys.size > 0) {
      const idx = allSeats.findIndex(s => s.key === seat.key);
      const lastKey = [...selectedKeys].pop()!;
      const lastIdx = allSeats.findIndex(s => s.key === lastKey);
      const [start, end] = [Math.min(idx, lastIdx), Math.max(idx, lastIdx)];
      setSelectedKeys(prev => new Set([...prev, ...allSeats.slice(start, end + 1).map(s => s.key)]));
    } else if (e.ctrlKey || e.metaKey) {
      setSelectedKeys(prev => { const n = new Set(prev); n.has(seat.key) ? n.delete(seat.key) : n.add(seat.key); return n; });
    } else {
      setSelectedKeys(new Set([seat.key]));
      setDetailSeat(seat);
      setRightPanelMode('seat');
      setRightPanelOpen(true);
    }
  };

  const handleSeatContextMenu = (seat: SeatDetail, e: React.MouseEvent) => {
    e.preventDefault();
    if (!selectedKeys.has(seat.key)) setSelectedKeys(new Set([seat.key]));
    setContextMenu({ x: e.clientX, y: e.clientY, seat });
  };

  // ── Batch actions ───────────────────────────────────
  const selectedSeats = useMemo(() => allSeats.filter(s => selectedKeys.has(s.key)), [allSeats, selectedKeys]);

  const doBatch = async (action: string, note = '') => {
    if (selectedKeys.size === 0) return;
    try {
      await api.post(`/tickets/admin/events/${eventId}/seats/status`, {
        seatIds: [...selectedKeys], status: action,
      });
      enqueueSnackbar(`${selectedKeys.size} koltuk güncellendi`, { variant: 'success' });
      setSelectedKeys(new Set()); setContextMenu(null);
      fetchData();
    } catch { enqueueSnackbar('İşlem başarısız', { variant: 'error' }); }
  };

  // ── Manual sell — optimistic update ─────────────────
  const handleManualSellSuccess = (seatKeys: string[], note: string) => {
    // Optimistic: move from available → sold in local state
    setSeatMapData(prev => {
      if (!prev) return prev;
      const keySet = new Set(seatKeys);
      return {
        ...prev,
        categories: prev.categories.map(cat => ({
          ...cat,
          rows: cat.rows.map(row => {
            const affected = row.availableSeats.filter(n =>
              keySet.has(`${cat.categoryId}_${row.rowLabel}_${n}`));
            if (affected.length === 0) return row;
            return {
              ...row,
              availableSeats: row.availableSeats.filter(n =>
                !keySet.has(`${cat.categoryId}_${row.rowLabel}_${n}`)),
              occupiedSeats: [...row.occupiedSeats, ...affected],
              occupiedSeatDetails: [
                ...(row.occupiedSeatDetails || []),
                ...affected.map(n => ({
                  seatNumber: n, status: 'SOLD' as const,
                  isManual: true, manualNote: note,
                })),
              ],
            };
          }),
        })),
      };
    });

    // Re-derive flat seats + stats from updated data
    setTimeout(() => {
      if (seatMapData) {
        const seats = flattenSeatMap(seatMapData);
        setAllSeats(seats);
        setCategories(buildCategories(seatMapData, seats));
        setStats(calculateStats(seatMapData));
      }
    }, 50);
  };

  const doManualSell = async () => {
    setManualSellLoading(true);
    try {
      const keys = selectedKeys.size > 1 ? [...selectedKeys] : detailSeat ? [detailSeat.key] : [];
      await api.post(`/tickets/admin/events/${eventId}/seats/status`, {
        seatIds: keys, status: 'SOLD',
      });
      handleManualSellSuccess(keys, manualSellNote);
      enqueueSnackbar(`${keys.length} koltuk manuel satıldı`, { variant: 'success' });
      setManualSellOpen(false); setManualSellNote('');
      setSelectedKeys(new Set()); setDetailSeat(null); setRightPanelOpen(false);
      // Full refresh for accuracy
      fetchData();
    } catch { enqueueSnackbar('Manuel satış başarısız', { variant: 'error' }); }
    finally { setManualSellLoading(false); }
  };

  const doBlock = async () => {
    setBlockLoading(true);
    try {
      const keys = selectedKeys.size > 0 ? [...selectedKeys] : detailSeat ? [detailSeat.key] : [];
      await api.post(`/tickets/admin/events/${eventId}/seats/status`, { seatIds: keys, status: 'BLOCKED' });
      enqueueSnackbar(`${keys.length} koltuk kapatıldı`, { variant: 'success' });
      setBlockOpen(false); setBlockReason(''); setSelectedKeys(new Set()); fetchData();
    } catch { enqueueSnackbar('İşlem başarısız', { variant: 'error' }); }
    finally { setBlockLoading(false); }
  };

  const doUnblock = async () => {
    const keys = selectedKeys.size > 0 ? [...selectedKeys] : detailSeat ? [detailSeat.key] : [];
    try {
      await api.post(`/tickets/admin/events/${eventId}/seats/status`, { seatIds: keys, status: 'AVAILABLE' });
      enqueueSnackbar(`${keys.length} koltuk açıldı`, { variant: 'success' });
      setSelectedKeys(new Set()); fetchData();
    } catch { enqueueSnackbar('İşlem başarısız', { variant: 'error' }); }
  };

  // ── Category editor ─────────────────────────────────
  const openCategoryEditor = (cat: CategorySummary) => {
    setEditingCategory(cat);
    setEditCatName(cat.name);
    setEditCatPrice(String(cat.basePrice));
    setEditCatColor(cat.color);
    setRightPanelMode('category');
    setRightPanelOpen(true);
    setDetailSeat(null);
  };

  const saveCategoryEdit = async () => {
    if (!editingCategory || !eventId) return;
    setEditCatSaving(true);
    try {
      await api.put(`/tickets/admin/events/${eventId}/seat-categories/${editingCategory.id}`, {
        name: editCatName, basePrice: parseFloat(editCatPrice) || 0, color: editCatColor,
      });
      enqueueSnackbar('Bölge güncellendi — fiyat bilet tipiyle senkronize edildi', { variant: 'success' });
      setRightPanelOpen(false); setEditingCategory(null); fetchData();
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.data?.message || 'Güncelleme başarısız', { variant: 'error' });
    } finally { setEditCatSaving(false); }
  };

  // ── CSV export ──────────────────────────────────────
  const exportCSV = () => {
    const header = 'Sıra,Koltuk,Bölge,Fiyat,Durum,Manuel,Not\n';
    const csvRows = allSeats.map(s =>
      `${s.rowLabel},${s.seatNumber},${s.categoryName},${s.basePrice},${s.status},${s.isManual},${s.manualNote || ''}`
    ).join('\n');
    const blob = new Blob([header + csvRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `seat-map-${eventId}.csv`; a.click();
    URL.revokeObjectURL(url);
    enqueueSnackbar('CSV indirildi', { variant: 'success' });
  };

  // ── Zoom ────────────────────────────────────────────
  const handleZoom = useCallback((delta: number) => {
    setZoom(z => Math.max(0.3, Math.min(3, z + delta)));
  }, []);

  useEffect(() => {
    const el = svgContainerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) { e.preventDefault(); handleZoom(e.deltaY > 0 ? -0.1 : 0.1); }
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [handleZoom]);

  // ── Render ──────────────────────────────────────────
  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Stack alignItems="center" spacing={2}>
          <CircularProgress size={32} />
          <Typography color="text.secondary">Koltuk haritası yükleniyor...</Typography>
        </Stack>
      </Box>
    );
  }

  const occupancyPct = stats ? (stats.totalSeats > 0 ? Math.round(((stats.occupiedSeats + stats.lockedSeats) / stats.totalSeats) * 100) : 0) : 0;

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 56px)', overflow: 'hidden' }}>
      {/* ══════════════ LEFT PANEL ══════════════ */}
      <Box sx={{ width: 260, flexShrink: 0, bgcolor: 'background.paper', borderRight: `1px solid ${theme.palette.divider}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <IconButton size="small" onClick={() => navigate(-1)}><BackIcon sx={{ fontSize: 18 }} /></IconButton>
            <Typography variant="subtitle2" fontWeight={700} noWrap sx={{ flex: 1 }}>{eventName}</Typography>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip label={`${occupancyPct}% dolu`} size="small"
              color={occupancyPct > 80 ? 'error' : occupancyPct > 50 ? 'warning' : 'success'}
              sx={{ height: 20, fontSize: 10, fontWeight: 700 }} />
            {lastUpdated && (
              <Typography variant="caption" color="text.disabled">
                {lastUpdated.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
              </Typography>
            )}
          </Stack>
        </Box>

        {/* Categories */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
          <Typography sx={{ fontSize: 9, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 1, mb: 1.5 }}>
            Bölgeler
          </Typography>
          <Stack spacing={0.75}>
            {categories.map(cat => (
              <Box key={cat.id}
                onClick={() => setHighlightCategory(highlightCategory === cat.id ? null : cat.id)}
                sx={{ p: 1.5, borderRadius: 2, cursor: 'pointer',
                  border: `1px solid ${highlightCategory === cat.id ? cat.color : theme.palette.divider}`,
                  bgcolor: highlightCategory === cat.id ? alpha(cat.color, 0.06) : 'transparent',
                  transition: 'all 0.15s', '&:hover': { bgcolor: alpha(cat.color, 0.04) } }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: cat.color }} />
                  <Typography sx={{ fontSize: 12, fontWeight: 600, flex: 1 }}>{cat.name}</Typography>
                  <Typography sx={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700,
                    color: cat.sold >= cat.total ? 'error.main' : 'text.secondary' }}>
                    {cat.sold}/{cat.total}
                  </Typography>
                  <Tooltip title="Bölgeyi düzenle">
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); openCategoryEditor(cat); }}
                      sx={{ p: 0.25, opacity: 0.5, '&:hover': { opacity: 1 } }}>
                      <EditIcon sx={{ fontSize: 13 }} />
                    </IconButton>
                  </Tooltip>
                </Stack>
                <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                  <Typography sx={{ fontSize: 9, color: 'text.disabled' }}>₺{cat.basePrice}</Typography>
                  {cat.manualSold > 0 && (
                    <Typography sx={{ fontSize: 9, color: '#f97316' }}>{cat.manualSold} manuel</Typography>
                  )}
                </Stack>
                <Box sx={{ mt: 0.5, height: 3, borderRadius: 2, bgcolor: alpha(cat.color, 0.15) }}>
                  <Box sx={{ height: '100%', borderRadius: 2, bgcolor: cat.color,
                    width: `${cat.total > 0 ? (cat.sold / cat.total) * 100 : 0}%`, transition: 'width 0.3s' }} />
                </Box>
              </Box>
            ))}
          </Stack>

          <Divider sx={{ my: 2 }} />

          {/* Stats from API */}
          <Typography sx={{ fontSize: 9, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 1, mb: 1 }}>Özet</Typography>
          {stats && [
            { label: 'Toplam', value: stats.totalSeats, color: theme.palette.text.primary },
            { label: 'Müsait', value: stats.availableSeats, color: '#22c55e' },
            { label: 'Satılan', value: stats.occupiedSeats, color: '#ef4444' },
            { label: 'Kilitli', value: stats.lockedSeats, color: '#fbbf24' },
            { label: 'Devre Dışı', value: stats.disabledSeats, color: '#d1d5db' },
            { label: 'Manuel Satış', value: stats.manualSoldSeats, color: '#f97316' },
          ].map(s => (
            <Box key={s.label} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{s.label}</Typography>
              <Typography sx={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: s.color }}>{s.value}</Typography>
            </Box>
          ))}
          {stats && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1, mt: 1, borderTop: `1px solid ${theme.palette.divider}` }}>
                <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Mevcut Gelir</Typography>
                <Typography sx={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 800, color: '#10b981' }}>
                  ₺{stats.currentRevenue.toLocaleString('tr-TR')}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>Maks. Gelir</Typography>
                <Typography sx={{ fontSize: 10, fontFamily: 'monospace', color: 'text.disabled' }}>
                  ₺{stats.maxRevenue.toLocaleString('tr-TR')}
                </Typography>
              </Box>
            </>
          )}
        </Box>

        {/* Recent audit logs */}
        {auditLogs.length > 0 && (
          <Box sx={{ px: 2, pb: 1 }}>
            <Typography sx={{ fontSize: 9, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 1, mb: 0.75 }}>
              Son İşlemler
            </Typography>
            <Stack spacing={0.5} sx={{ maxHeight: 120, overflowY: 'auto' }}>
              {auditLogs.slice(0, 8).map((log, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 0.75, alignItems: 'flex-start' }}>
                  <Typography sx={{ fontSize: 8, color: 'text.disabled', fontFamily: 'monospace', flexShrink: 0, mt: '1px' }}>
                    {log.createdAt ? new Date(log.createdAt).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                  </Typography>
                  <Box>
                    <Typography sx={{ fontSize: 10, color: 'text.secondary', lineHeight: 1.3 }}>{log.description || log.action}</Typography>
                    <Typography sx={{ fontSize: 8, color: 'text.disabled' }}>{log.performedBy || log.userEmail || ''}</Typography>
                  </Box>
                </Box>
              ))}
            </Stack>
          </Box>
        )}

        {/* Bottom actions */}
        <Box sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Stack spacing={1}>
            <Button fullWidth size="small" variant="outlined" startIcon={<RefreshIcon />}
              onClick={fetchData} sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}>Yenile</Button>
            <Button fullWidth size="small" variant="outlined" startIcon={<DownloadIcon />}
              onClick={exportCSV} sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}>CSV İndir</Button>
          </Stack>
        </Box>
      </Box>

      {/* ══════════════ CENTER — SVG SEAT MAP ══════════════ */}
      <Box ref={svgContainerRef} sx={{ flex: 1, position: 'relative', overflow: 'auto', bgcolor: theme.palette.mode === 'dark' ? '#0f172a' : '#f8fafc' }}>
        {allSeats.length === 0 ? (
          <Stack alignItems="center" justifyContent="center" sx={{ height: '100%' }} spacing={2}>
            <Typography sx={{ fontSize: 48, opacity: 0.3 }}>🪑</Typography>
            <Typography color="text.secondary">Bu etkinlik için koltuk haritası bulunamadı</Typography>
            <Button variant="outlined" onClick={() => navigate('/seat-map')} sx={{ textTransform: 'none', borderRadius: 2 }}>
              Seat Map Designer'da Oluştur
            </Button>
          </Stack>
        ) : (
          <Box sx={{ p: 2, minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* Zoom controls */}
            <Stack direction="row" spacing={0.5} sx={{ position: 'sticky', top: 8, zIndex: 10, alignSelf: 'flex-end', bgcolor: 'background.paper', borderRadius: 2, border: `1px solid ${theme.palette.divider}`, p: 0.5 }}>
              <Tooltip title="Uzaklaştır"><IconButton size="small" onClick={() => handleZoom(-0.15)}><ZoomOutIcon sx={{ fontSize: 18 }} /></IconButton></Tooltip>
              <Typography sx={{ fontSize: 11, fontFamily: 'monospace', lineHeight: '30px', px: 0.5, minWidth: 36, textAlign: 'center' }}>{Math.round(zoom * 100)}%</Typography>
              <Tooltip title="Yakınlaştır"><IconButton size="small" onClick={() => handleZoom(0.15)}><ZoomInIcon sx={{ fontSize: 18 }} /></IconButton></Tooltip>
              <Tooltip title="Sığdır"><IconButton size="small" onClick={() => setZoom(1)}><FitIcon sx={{ fontSize: 18 }} /></IconButton></Tooltip>
            </Stack>

            {/* SVG Canvas */}
            <svg width={svgWidth * zoom} height={svgHeight * zoom} viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ marginTop: 8 }}>
              {/* Stage */}
              <g transform={`translate(${svgWidth / 2}, 15)`}>
                <rect x={-60} y={0} width={120} height={22} rx={4}
                  fill={alpha('#10b981', 0.1)} stroke={alpha('#10b981', 0.3)} strokeWidth={1} />
                <text x={0} y={15} textAnchor="middle" fontSize={9} fontWeight={700} fill="#10b981"
                  style={{ letterSpacing: '2px' }}>SAHNE</text>
              </g>

              {/* Rows — using rowLabelOrder from API */}
              {rowOrder.map((rowLabel, ri) => {
                const rowSeats = allSeats.filter(s => s.rowLabel === rowLabel).sort((a, b) => a.seatNumber - b.seatNumber);
                const y = PADDING_TOP + ri * ROW_HEIGHT;
                if (rowSeats.length === 0) return null;

                return (
                  <g key={rowLabel}>
                    {/* Left row label */}
                    <text x={ROW_LABEL_X} y={y + SEAT_SIZE / 2 + 4} textAnchor="middle"
                      fontSize={10} fontWeight={600} fontFamily="monospace" fill={theme.palette.text.disabled}>
                      {rowLabel}
                    </text>

                    {/* Seats */}
                    {rowSeats.map((seat, si) => {
                      const x = SEAT_START_X + si * (SEAT_SIZE + SEAT_GAP);
                      const isSelected = selectedKeys.has(seat.key);
                      const isHighlighted = !highlightCategory || seat.categoryId === highlightCategory;
                      const fill = getSeatFill(seat, seat.categoryColor);

                      return (
                        <g key={seat.key}
                          onClick={(e) => handleSeatClick(seat, e as any)}
                          onContextMenu={(e) => handleSeatContextMenu(seat, e as any)}
                          style={{ cursor: 'pointer' }}>
                          <rect x={x} y={y} width={SEAT_SIZE} height={SEAT_SIZE} rx={3}
                            fill={fill}
                            opacity={isHighlighted ? (isSelected ? 1 : 0.85) : 0.15}
                            stroke={isSelected ? '#1d4ed8' : 'transparent'}
                            strokeWidth={isSelected ? 2 : 0} />
                          <text x={x + SEAT_SIZE / 2} y={y + SEAT_SIZE / 2 + 3.5}
                            textAnchor="middle" fontSize={7} fontWeight={600}
                            fill="#fff" opacity={isHighlighted ? 0.9 : 0.3}
                            style={{ pointerEvents: 'none' }}>
                            {seat.seatNumber}
                          </text>
                          {/* Manual sell indicator (orange dot) */}
                          {seat.isManual && seat.status === 'SOLD' && (
                            <circle cx={x + SEAT_SIZE - 3} cy={y + 3} r={3} fill="#f97316" stroke="#fff" strokeWidth={0.5} />
                          )}
                        </g>
                      );
                    })}

                    {/* Right row label */}
                    <text x={SEAT_START_X + rowSeats.length * (SEAT_SIZE + SEAT_GAP) + 10}
                      y={y + SEAT_SIZE / 2 + 4} fontSize={10} fontWeight={600} fontFamily="monospace"
                      fill={theme.palette.text.disabled}>{rowLabel}</text>
                  </g>
                );
              })}
            </svg>

            {/* Legend */}
            <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap"
              sx={{ mt: 2, p: 1.5, bgcolor: alpha(theme.palette.divider, 0.15), borderRadius: 2 }}>
              {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                <Stack key={key} direction="row" spacing={0.5} alignItems="center">
                  <Box sx={{ width: 12, height: 12, borderRadius: 1, bgcolor: val.color }} />
                  <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 600 }}>{val.label}</Typography>
                </Stack>
              ))}
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Box sx={{ width: 12, height: 12, borderRadius: 1, bgcolor: '#f97316' }} />
                <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 600 }}>Manuel Satış</Typography>
              </Stack>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Box sx={{ width: 12, height: 12, borderRadius: 1, bgcolor: '#3b82f6', border: '2px solid #1d4ed8' }} />
                <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 600 }}>Seçili</Typography>
              </Stack>
            </Stack>

            <Typography sx={{ mt: 1, fontSize: 10, color: 'text.disabled', textAlign: 'center' }}>
              Ctrl+tıkla: çoklu seç · Shift+tıkla: aralık · Ctrl+A: tümü · Esc: temizle · R: yenile · Ctrl+kaydır: zoom
            </Typography>
          </Box>
        )}

        {/* ── FLOATING ACTION BAR (multi-select) ── */}
        {selectedKeys.size > 1 && (
          <Paper elevation={8} sx={{
            position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
            px: 3, py: 1.5, borderRadius: 3, display: 'flex', alignItems: 'center', gap: 2,
            bgcolor: 'background.paper', border: `1px solid ${theme.palette.divider}`, zIndex: 1000,
          }}>
            <Badge badgeContent={selectedKeys.size} color="primary">
              <Typography sx={{ fontSize: 13, fontWeight: 700 }}>Seçili</Typography>
            </Badge>
            <Divider orientation="vertical" flexItem />
            {selectedSeats.some(s => s.status === 'AVAILABLE') && (
              <>
                <Button size="small" variant="contained" color="error" startIcon={<SellIcon />}
                  onClick={() => setManualSellOpen(true)}
                  sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}>Manuel Sat</Button>
                <Button size="small" variant="outlined" color="warning" startIcon={<BlockIcon />}
                  onClick={() => setBlockOpen(true)}
                  sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}>Kapat</Button>
              </>
            )}
            {selectedSeats.some(s => s.status === 'DISABLED' || s.status === 'LOCKED') && (
              <Button size="small" variant="outlined" color="success" startIcon={<UnblockIcon />}
                onClick={doUnblock} sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}>Aç</Button>
            )}
            <IconButton size="small" onClick={() => setSelectedKeys(new Set())}><DeselectIcon sx={{ fontSize: 18 }} /></IconButton>
          </Paper>
        )}
      </Box>

      {/* ══════════════ RIGHT PANEL ══════════════ */}
      {rightPanelOpen && (rightPanelMode === 'category' ? editingCategory : detailSeat) && (
        <Box sx={{ width: 300, flexShrink: 0, bgcolor: 'background.paper', borderLeft: `1px solid ${theme.palette.divider}`, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>

          {/* ── CATEGORY EDITOR ── */}
          {rightPanelMode === 'category' && editingCategory && (
            <>
              <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="subtitle2" fontWeight={800}>Bölge Düzenle</Typography>
                  <IconButton size="small" onClick={() => { setRightPanelOpen(false); setEditingCategory(null); }}>
                    <CloseIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Stack>
              </Box>
              <Box sx={{ p: 2, flex: 1 }}>
                <Stack spacing={2}>
                  <TextField fullWidth size="small" label="Bölge Adı" value={editCatName}
                    onChange={e => setEditCatName(e.target.value)} />
                  <TextField fullWidth size="small" label="Fiyat (₺)" type="number" value={editCatPrice}
                    onChange={e => setEditCatPrice(e.target.value)}
                    InputProps={{ inputProps: { min: 0, step: 0.01 } }} />
                  <Box>
                    <Typography sx={{ fontSize: 11, color: 'text.secondary', mb: 0.5 }}>Renk</Typography>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap">
                      {['#8b5cf6', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16'].map(c => (
                        <Box key={c} onClick={() => setEditCatColor(c)}
                          sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: c, cursor: 'pointer',
                            border: editCatColor === c ? '3px solid' : '2px solid transparent',
                            borderColor: editCatColor === c ? 'primary.main' : 'transparent',
                            '&:hover': { transform: 'scale(1.15)' }, transition: 'all 0.15s' }} />
                      ))}
                    </Stack>
                  </Box>
                  <Divider />
                  <Typography sx={{ fontSize: 9, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 1 }}>İstatistikler</Typography>
                  {[
                    { label: 'Toplam', value: editingCategory.total },
                    { label: 'Satılan', value: editingCategory.sold, color: '#ef4444' },
                    { label: 'Manuel', value: editingCategory.manualSold, color: '#f97316' },
                    { label: 'Müsait', value: editingCategory.available, color: '#22c55e' },
                    { label: 'Kilitli', value: editingCategory.locked, color: '#fbbf24' },
                    { label: 'Devre Dışı', value: editingCategory.disabled, color: '#d1d5db' },
                  ].map(s => (
                    <Box key={s.label} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{s.label}</Typography>
                      <Typography sx={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: s.color || 'text.primary' }}>{s.value}</Typography>
                    </Box>
                  ))}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1, borderTop: `1px solid ${theme.palette.divider}` }}>
                    <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Gelir</Typography>
                    <Typography sx={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 800, color: '#10b981' }}>₺{editingCategory.revenue.toLocaleString('tr-TR')}</Typography>
                  </Box>
                  {editingCategory.sold > 0 && (
                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha('#f59e0b', 0.05), borderColor: alpha('#f59e0b', 0.3) }}>
                      <Typography sx={{ fontSize: 11, color: '#b45309' }}>
                        Bu bölgede {editingCategory.sold} satılmış koltuk var. Kapasite satılmış koltuk sayısının altına düşürülemez.
                      </Typography>
                    </Paper>
                  )}
                </Stack>
              </Box>
              <Box sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
                <Button fullWidth variant="contained" size="small" startIcon={<SaveIcon />}
                  disabled={editCatSaving || !editCatName.trim()} onClick={saveCategoryEdit}
                  sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}>
                  {editCatSaving ? <CircularProgress size={16} /> : 'Kaydet ve Senkronize Et'}
                </Button>
                <Typography sx={{ fontSize: 9, color: 'text.disabled', textAlign: 'center', mt: 1 }}>
                  Fiyat değişiklikleri bağlı bilet tipine otomatik yansır
                </Typography>
              </Box>
            </>
          )}

          {/* ── SEAT DETAIL ── */}
          {rightPanelMode === 'seat' && detailSeat && (
            <>
              <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="subtitle2" fontWeight={800}>
                    Koltuk {detailSeat.rowLabel}-{detailSeat.seatNumber}
                  </Typography>
                  <IconButton size="small" onClick={() => { setRightPanelOpen(false); setDetailSeat(null); setSelectedKeys(new Set()); }}>
                    <CloseIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Stack>
              </Box>
              <Box sx={{ p: 2, flex: 1 }}>
                <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap">
                  <Chip label={detailSeat.categoryName} size="small"
                    sx={{ bgcolor: alpha(detailSeat.categoryColor, 0.12), color: detailSeat.categoryColor, fontWeight: 600, fontSize: 11 }} />
                  <Chip label={STATUS_CONFIG[detailSeat.status]?.label || detailSeat.status} size="small"
                    sx={{ bgcolor: alpha(STATUS_CONFIG[detailSeat.status]?.color || '#ccc', 0.12),
                      color: STATUS_CONFIG[detailSeat.status]?.color, fontWeight: 600, fontSize: 11 }} />
                  {detailSeat.isManual && <Chip label="Manuel" size="small" color="warning" sx={{ fontWeight: 600, fontSize: 10 }} />}
                </Stack>

                <Typography variant="h5" fontWeight={800} fontFamily="monospace" sx={{ mb: 2 }}>
                  ₺{detailSeat.basePrice.toLocaleString('tr-TR')}
                </Typography>
                <Divider sx={{ mb: 2 }} />

                {/* SOLD */}
                {detailSeat.status === 'SOLD' && (
                  <Box sx={{ mb: 2 }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 1 }}>
                      {detailSeat.isManual ? 'Manuel Satış' : 'Online Satış'}
                    </Typography>
                    {detailSeat.ownerName && (
                      <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.5 }}>Satıcı: {detailSeat.ownerName}</Typography>
                    )}
                    {detailSeat.ticketNumber && (
                      <Typography sx={{ fontSize: 11, fontFamily: 'monospace', color: 'text.disabled', mb: 0.5 }}>Bilet: {detailSeat.ticketNumber}</Typography>
                    )}
                    {detailSeat.manualNote && (
                      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, my: 1 }}>
                        <Typography sx={{ fontSize: 10, fontWeight: 600, color: 'text.disabled', mb: 0.25 }}>Not</Typography>
                        <Typography sx={{ fontSize: 12 }}>{detailSeat.manualNote}</Typography>
                      </Paper>
                    )}
                    {detailSeat.isManual && (
                      <Button fullWidth variant="outlined" color="warning" size="small" startIcon={<CancelIcon />}
                        onClick={async () => {
                          try {
                            await api.post(`/tickets/admin/events/${eventId}/seats/status`, { seatIds: [detailSeat.key], status: 'AVAILABLE' });
                            enqueueSnackbar('Manuel satış iptal edildi', { variant: 'success' });
                            setRightPanelOpen(false); setDetailSeat(null); fetchData();
                          } catch { enqueueSnackbar('İşlem başarısız', { variant: 'error' }); }
                        }}
                        sx={{ mt: 1, textTransform: 'none', borderRadius: 2, fontWeight: 600 }}>Manuel Satışı İptal Et</Button>
                    )}
                  </Box>
                )}

                {/* AVAILABLE */}
                {detailSeat.status === 'AVAILABLE' && (
                  <Stack spacing={1}>
                    <Button fullWidth variant="contained" color="error" size="small" startIcon={<SellIcon />}
                      onClick={() => setManualSellOpen(true)}
                      sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}>Manuel Sat</Button>
                    <Button fullWidth variant="outlined" color="warning" size="small" startIcon={<BlockIcon />}
                      onClick={() => setBlockOpen(true)}
                      sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}>Koltuğu Kapat</Button>
                    <Button fullWidth variant="outlined" size="small" startIcon={<DisableIcon />}
                      onClick={async () => {
                        try {
                          await api.post(`/tickets/admin/events/${eventId}/seats/status`, { seatIds: [detailSeat.key], status: 'BLOCKED' });
                          enqueueSnackbar('Koltuk devre dışı bırakıldı', { variant: 'success' });
                          setRightPanelOpen(false); fetchData();
                        } catch { enqueueSnackbar('İşlem başarısız', { variant: 'error' }); }
                      }}
                      sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}>Devre Dışı Bırak</Button>
                  </Stack>
                )}

                {/* LOCKED */}
                {detailSeat.status === 'LOCKED' && (
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Ödeme bekleniyor</Typography>
                    {detailSeat.lockedUntil && (
                      <Typography variant="caption" color="warning.main" fontWeight={600} sx={{ mb: 1, display: 'block' }}>
                        Süre: {detailSeat.lockedUntil}
                      </Typography>
                    )}
                    <Button fullWidth variant="outlined" color="error" size="small" startIcon={<UnblockIcon />}
                      onClick={doUnblock}
                      sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}>Kilidi Zorla Aç</Button>
                  </Box>
                )}

                {/* DISABLED */}
                {detailSeat.status === 'DISABLED' && (
                  <Button fullWidth variant="outlined" color="success" size="small" startIcon={<UnblockIcon />}
                    onClick={doUnblock}
                    sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}>Tekrar Aktif Et</Button>
                )}

                <Divider sx={{ my: 2 }} />
                <Typography sx={{ fontSize: 9, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 1, mb: 1 }}>Detaylar</Typography>
                {[
                  { label: 'Bölge', value: detailSeat.categoryName },
                  { label: 'Sıra', value: detailSeat.rowLabel },
                  { label: 'Koltuk No', value: detailSeat.seatNumber },
                  { label: 'Fiyat', value: `₺${detailSeat.basePrice.toLocaleString('tr-TR')}` },
                  { label: 'ID', value: detailSeat.key },
                ].map(d => (
                  <Box key={d.label} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{d.label}</Typography>
                    <Typography sx={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 600, maxWidth: 160 }} noWrap>{d.value}</Typography>
                  </Box>
                ))}
              </Box>
            </>
          )}
        </Box>
      )}

      {/* ── CONTEXT MENU ── */}
      <Menu open={!!contextMenu} onClose={() => setContextMenu(null)}
        anchorReference="anchorPosition"
        anchorPosition={contextMenu ? { top: contextMenu.y, left: contextMenu.x } : undefined}>
        {contextMenu?.seat.status === 'AVAILABLE' && [
          <MenuItem key="sell" onClick={() => { setDetailSeat(contextMenu.seat); setManualSellOpen(true); setContextMenu(null); }}>
            <ListItemIcon><SellIcon fontSize="small" color="error" /></ListItemIcon>
            <ListItemText>Manuel Sat</ListItemText>
          </MenuItem>,
          <MenuItem key="block" onClick={() => { setBlockOpen(true); setContextMenu(null); }}>
            <ListItemIcon><BlockIcon fontSize="small" color="warning" /></ListItemIcon>
            <ListItemText>Kapat</ListItemText>
          </MenuItem>,
        ]}
        {(contextMenu?.seat.status === 'DISABLED' || contextMenu?.seat.status === 'LOCKED') && (
          <MenuItem onClick={() => { doUnblock(); setContextMenu(null); }}>
            <ListItemIcon><UnblockIcon fontSize="small" color="success" /></ListItemIcon>
            <ListItemText>Aç / Aktif Et</ListItemText>
          </MenuItem>
        )}
        {contextMenu?.seat.status === 'SOLD' && contextMenu.seat.isManual && (
          <MenuItem onClick={async () => {
            try {
              await api.post(`/tickets/admin/events/${eventId}/seats/status`, { seatIds: [contextMenu.seat.key], status: 'AVAILABLE' });
              enqueueSnackbar('Manuel satış iptal edildi', { variant: 'success' });
              setContextMenu(null); fetchData();
            } catch { enqueueSnackbar('İşlem başarısız', { variant: 'error' }); }
          }}>
            <ListItemIcon><CancelIcon fontSize="small" color="warning" /></ListItemIcon>
            <ListItemText>Manuel Satışı İptal Et</ListItemText>
          </MenuItem>
        )}
        <Divider />
        <MenuItem onClick={() => {
          const catId = contextMenu?.seat.categoryId;
          setSelectedKeys(new Set(allSeats.filter(s => s.categoryId === catId).map(s => s.key)));
          setContextMenu(null);
        }}>
          <ListItemIcon><SelectAllIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Bölgedeki Tümünü Seç</ListItemText>
        </MenuItem>
      </Menu>

      {/* ── MANUAL SELL DIALOG ── */}
      <Dialog open={manualSellOpen} onClose={() => setManualSellOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Manuel Satış</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {selectedKeys.size > 1
              ? `${selectedKeys.size} koltuk seçili`
              : detailSeat ? `${detailSeat.rowLabel}-${detailSeat.seatNumber} · ${detailSeat.categoryName}` : ''}
          </Typography>
          <TextField fullWidth size="small" label="Not (opsiyonel)" multiline rows={2}
            value={manualSellNote} onChange={e => setManualSellNote(e.target.value)}
            placeholder="Örn: Kapıda nakit satış, misafir bileti, sponsor..." />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setManualSellOpen(false)} sx={{ textTransform: 'none' }}>Vazgeç</Button>
          <Button variant="contained" color="error" disabled={manualSellLoading} onClick={doManualSell}
            sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}>
            {manualSellLoading ? <CircularProgress size={16} /> : 'Satışı Onayla'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── BLOCK DIALOG ── */}
      <Dialog open={blockOpen} onClose={() => setBlockOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Koltuğu Kapat</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {selectedKeys.size > 1 ? `${selectedKeys.size} koltuk kapatılacak`
              : detailSeat ? `${detailSeat.rowLabel}-${detailSeat.seatNumber} · ${detailSeat.categoryName}` : ''}
          </Typography>
          <TextField fullWidth size="small" label="Sebep (opsiyonel)" value={blockReason}
            onChange={e => setBlockReason(e.target.value)} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setBlockOpen(false)} sx={{ textTransform: 'none' }}>Vazgeç</Button>
          <Button variant="contained" color="warning" disabled={blockLoading} onClick={doBlock}
            sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}>
            {blockLoading ? <CircularProgress size={16} /> : 'Kapat'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
