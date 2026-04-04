/**
 * SeatMapDesigner — Canvas-based, theme-aware, responsive, fully editable.
 * Wraps with an event picker so admins first select a paid event before editing.
 */
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  Box, Typography, Button, IconButton, Tooltip, Dialog, DialogTitle,
  DialogContent, DialogActions, Stack, Chip, TextField, Slider, Select,
  MenuItem, Divider, useTheme, alpha, useMediaQuery, Paper, Avatar,
  CircularProgress, InputAdornment,
} from '@mui/material';
import {
  Edit as EditIcon, Visibility as PreviewIcon, Save as SaveIcon,
  Check as CheckIcon, Add as AddIcon, Remove as RemoveIcon,
  RestartAlt as ResetIcon, Close as CloseIcon, Block as BlockIcon,
  ShoppingCart as CartIcon, ConfirmationNumber as TicketIcon,
  Delete as DeleteIcon, Settings as SettingsIcon,
  KeyboardArrowUp as UpIcon, KeyboardArrowDown as DownIcon,
  ArrowBack as BackIcon, Search as SearchIcon, MapOutlined as MapIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import {
  VenueConfig, VenueType, Seat, SeatCategory, SectionConfig, DEFAULT_CATEGORIES,
  VENUE_TEMPLATES, generateVenueSeats, drawStageThemed, drawSeatThemed,
  drawStandingZone, drawSectionLabelThemed, getCategoryColor, findSeatAtPoint,
  computeStats, SEAT_SIZE, DARK_THEME, LIGHT_THEME, DrawTheme,
  updateSection, addRowToSection, removeRowFromSection, updateRow,
  updateSectionSeatCount, addSection, removeSection,
} from './venueEngine';
import { api } from '../../services/api';

interface EventSummary {
  id: string;
  name: string;
  eventTime?: string;
  status?: string;
  isPaid?: boolean;
  currentParticipants?: number;
  maxParticipants?: number;
  image?: string;
  category?: { name: string };
}

// ─── Event Picker ──────────────────────────────────────────────────────────
const EventPicker: React.FC<{ onSelect: (event: EventSummary) => void }> = ({ onSelect }) => {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const [search, setSearch] = useState('');
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const fetchEvents = async (keyword?: string) => {
    setLoading(true);
    try {
      const params: Record<string, string | number | boolean> = { page: 0, size: 20, isPaid: true };
      if (keyword?.trim()) params.keyword = keyword.trim();
      const res = await api.get('/events', { params });
      const content = res.data?.data?.content || [];
      setEvents(Array.isArray(content) ? content : []);
      setSearched(true);
    } catch {
      enqueueSnackbar('Etkinlikler yuklenemedi', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEvents(); }, []);

  return (
    <Box sx={{ maxWidth: 760, mx: 'auto', px: 3, py: 5 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
        <Box sx={{ width: 44, height: 44, borderRadius: 2.5, bgcolor: alpha(theme.palette.primary.main, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <MapIcon sx={{ color: 'primary.main', fontSize: 24 }} />
        </Box>
        <Box>
          <Typography variant="h6" fontWeight={800}>Koltuk Haritasi Duzenleyici</Typography>
          <Typography variant="body2" color="text.secondary">Duzenlemek istediginiz ucretli etkinligi secin</Typography>
        </Box>
      </Stack>

      <Stack direction="row" spacing={1} sx={{ my: 3 }}>
        <TextField
          fullWidth
          placeholder="Etkinlik adi ile ara..."
          size="small"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') fetchEvents(search); }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} /></InputAdornment> }}
        />
        <Button variant="contained" onClick={() => fetchEvents(search)} disabled={loading}
          sx={{ textTransform: 'none', borderRadius: 2, px: 3, whiteSpace: 'nowrap' }}>
          {loading ? <CircularProgress size={18} color="inherit" /> : 'Ara'}
        </Button>
      </Stack>

      {loading && (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <CircularProgress size={32} />
        </Box>
      )}

      {!loading && searched && events.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography sx={{ fontSize: 36, mb: 1 }}>🎟️</Typography>
          <Typography color="text.secondary">Ucretli etkinlik bulunamadi</Typography>
        </Box>
      )}

      <Stack spacing={1.5}>
        {events.map(event => (
          <Paper key={event.id} variant="outlined" onClick={() => onSelect(event)}
            sx={{ p: 2, borderRadius: 2.5, cursor: 'pointer', transition: 'all 0.15s', '&:hover': { borderColor: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.03), boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.12)}` } }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar variant="rounded" src={event.image} sx={{ width: 52, height: 52, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main', fontWeight: 700, fontSize: 13 }}>
                {event.name?.[0]}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={700} noWrap>{event.name}</Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 0.4 }}>
                  {event.category?.name && <Chip label={event.category.name} size="small" sx={{ height: 18, fontSize: 10, fontWeight: 600 }} />}
                  <Chip label="Ucretli" size="small" color="primary" variant="outlined" sx={{ height: 18, fontSize: 10, fontWeight: 600 }} />
                  {event.status && <Chip label={event.status} size="small" variant="outlined" sx={{ height: 18, fontSize: 10 }} />}
                </Stack>
              </Box>
              <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                {event.eventTime && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    {new Date(event.eventTime).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Typography>
                )}
                {event.maxParticipants != null && (
                  <Typography variant="caption" color="text.disabled">
                    {event.currentParticipants ?? 0} / {event.maxParticipants} kisi
                  </Typography>
                )}
              </Box>
              <Button size="small" variant="outlined" sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap', ml: 1 }}>
                Haritayi Duzenle
              </Button>
            </Stack>
          </Paper>
        ))}
      </Stack>
    </Box>
  );
};

// ─── Main Designer Component ───────────────────────────────────────────────
const SeatMapDesignerInner: React.FC<{ event: EventSummary; onBack: () => void }> = ({ event, onBack }) => {
  const { enqueueSnackbar } = useSnackbar();
  const muiTheme = useTheme();
  const isDark = muiTheme.palette.mode === 'dark';
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
  const isSmall = useMediaQuery(muiTheme.breakpoints.down('lg'));
  const drawTheme: DrawTheme = isDark ? DARK_THEME : LIGHT_THEME;

  // Derived colors from MUI theme
  const bg = muiTheme.palette.background.default;
  const surface = muiTheme.palette.background.paper;
  const border = muiTheme.palette.divider;
  const textPrimary = muiTheme.palette.text.primary;
  const textSecondary = muiTheme.palette.text.secondary;
  const textDisabled = muiTheme.palette.text.disabled;
  const primary = muiTheme.palette.primary.main;
  const green = '#10b981';

  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [venue, setVenue] = useState<VenueConfig>(() => VENUE_TEMPLATES[0].generate());
  const [seats, setSeats] = useState<Seat[]>([]);
  const [categories] = useState<SeatCategory[]>(DEFAULT_CATEGORIES);
  const [currentTool, setCurrentTool] = useState('premium');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [vp, setVp] = useState({ x: 0, y: 0, zoom: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isPainting, setIsPainting] = useState(false);

  const [hoveredSeat, setHoveredSeat] = useState<Seat | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
  const [soldSeats, setSoldSeats] = useState<Set<string>>(new Set());
  const [tip, setTip] = useState<{ x: number; y: number; seat: Seat } | null>(null);
  const [orderOpen, setOrderOpen] = useState(false);

  // Section editor
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [leftTab, setLeftTab] = useState<'templates' | 'sections'>('templates');

  const MAX_SELECT = 8;

  // Generate seats when venue changes
  useEffect(() => {
    const gen = generateVenueSeats(venue);
    // Preserve categories from old seats
    setSeats(prev => {
      const oldMap = new Map(prev.map(s => [s.id, s]));
      return gen.map(s => {
        const old = oldMap.get(s.id);
        return old ? { ...s, category: old.category, status: old.status } : s;
      });
    });
    setSelectedSeats([]);
  }, [venue]);

  const loadTemplate = useCallback((type: VenueType) => {
    const t = VENUE_TEMPLATES.find(v => v.type === type);
    if (t) { setVenue(t.generate()); setVp({ x: 0, y: 0, zoom: 1 }); setEditingSectionId(null); }
  }, []);

  const switchMode = useCallback((m: 'edit' | 'preview') => {
    setMode(m); setSelectedSeats([]); setHoveredSeat(null); setEditingSectionId(null);
    if (m === 'preview') {
      const sold = new Set<string>();
      seats.forEach(s => { if (s.status !== 'disabled' && Math.random() < 0.15) sold.add(s.id); });
      setSoldSeats(sold);
    }
  }, [seats]);

  // Screen → world
  const s2w = useCallback((sx: number, sy: number): [number, number] => {
    const c = canvasRef.current;
    if (!c) return [0, 0];
    const r = c.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    return [
      (sx - r.left - r.width / 2) / vp.zoom - vp.x,
      (sy - r.top - r.height / 2) / vp.zoom - vp.y,
    ];
  }, [vp]);

  const paintSeat = useCallback((seat: Seat) => {
    if (mode !== 'edit') return;
    setSeats(prev => prev.map(s =>
      s.id === seat.id
        ? { ...s, category: currentTool === 'disabled' ? s.category : currentTool, status: currentTool === 'disabled' ? 'disabled' : 'available' }
        : s
    ));
  }, [mode, currentTool]);

  const previewClick = useCallback((seat: Seat) => {
    if (seat.status === 'disabled' || soldSeats.has(seat.id)) return;
    setSelectedSeats(prev => {
      if (prev.find(s => s.id === seat.id)) return prev.filter(s => s.id !== seat.id);
      if (prev.length >= MAX_SELECT) { enqueueSnackbar(`Maksimum ${MAX_SELECT} koltuk`, { variant: 'warning' }); return prev; }
      return [...prev, seat];
    });
  }, [soldSeats, enqueueSnackbar]);

  // Mouse handlers
  const onDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1 || e.altKey) { setIsPanning(true); setPanStart({ x: e.clientX, y: e.clientY }); return; }
    const [wx, wy] = s2w(e.clientX, e.clientY);
    const seat = findSeatAtPoint(seats, wx, wy);
    if (seat) {
      if (mode === 'edit') { setIsPainting(true); paintSeat(seat); }
      else previewClick(seat);
    } else { setIsPanning(true); setPanStart({ x: e.clientX, y: e.clientY }); }
  }, [s2w, seats, mode, paintSeat, previewClick]);

  const onMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      const dx = (e.clientX - panStart.x) / vp.zoom;
      const dy = (e.clientY - panStart.y) / vp.zoom;
      setVp(v => ({ ...v, x: v.x + dx, y: v.y + dy }));
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }
    const [wx, wy] = s2w(e.clientX, e.clientY);
    const seat = findSeatAtPoint(seats, wx, wy);
    setHoveredSeat(seat);
    setTip(seat ? { x: e.clientX + 14, y: e.clientY - 50, seat } : null);
    if (isPainting && mode === 'edit' && seat) paintSeat(seat);
  }, [isPanning, panStart, vp.zoom, s2w, seats, isPainting, mode, paintSeat]);

  const onUp = useCallback(() => { setIsPanning(false); setIsPainting(false); }, []);
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setVp(v => ({ ...v, zoom: Math.max(0.3, Math.min(3, v.zoom + (e.deltaY > 0 ? -0.1 : 0.1))) }));
  }, []);

  // Touch support for mobile
  const touchRef = useRef<{ x: number; y: number; dist: number } | null>(null);
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      touchRef.current = { x: t.clientX, y: t.clientY, dist: 0 };
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchRef.current = { x: (e.touches[0].clientX + e.touches[1].clientX) / 2, y: (e.touches[0].clientY + e.touches[1].clientY) / 2, dist: Math.hypot(dx, dy) };
    }
  }, []);
  const onTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (!touchRef.current) return;
    if (e.touches.length === 1) {
      const t = e.touches[0];
      const dx = (t.clientX - touchRef.current.x) / vp.zoom;
      const dy = (t.clientY - touchRef.current.y) / vp.zoom;
      setVp(v => ({ ...v, x: v.x + dx, y: v.y + dy }));
      touchRef.current = { ...touchRef.current, x: t.clientX, y: t.clientY };
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const scale = dist / (touchRef.current.dist || 1);
      setVp(v => ({ ...v, zoom: Math.max(0.3, Math.min(3, v.zoom * scale)) }));
      touchRef.current = { ...touchRef.current, dist };
    }
  }, [vp.zoom]);

  // Canvas render with DPR
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const dpr = window.devicePixelRatio || 1;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.scale(dpr, dpr);

    const t = drawTheme;
    ctx.fillStyle = t.bg;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(vp.zoom, vp.zoom);
    ctx.translate(vp.x, vp.y);

    // Grid dots
    ctx.fillStyle = t.gridDot;
    const gs = 40;
    const vw = w / vp.zoom;
    const vh = h / vp.zoom;
    const sx = Math.floor((-vp.x - vw / 2) / gs) * gs;
    const sy = Math.floor((-vp.y - vh / 2) / gs) * gs;
    for (let gx = sx; gx < -vp.x + vw / 2; gx += gs) {
      for (let gy = sy; gy < -vp.y + vh / 2; gy += gs) {
        ctx.beginPath(); ctx.arc(gx, gy, 1, 0, Math.PI * 2); ctx.fill();
      }
    }

    drawStageThemed(ctx, venue.stage, t);
    for (const sec of venue.sections) drawSectionLabelThemed(ctx, sec, seats.filter(s => s.sectionId === sec.id), t);
    for (const z of venue.standingZones) drawStandingZone(ctx, z, getCategoryColor(z.category, categories));

    for (const seat of seats) {
      const color = getCategoryColor(seat.category, categories);
      let st: 'normal' | 'hover' | 'selected' | 'disabled' | 'sold' = 'normal';
      if (seat.status === 'disabled' || seat.status === 'blocked') st = 'disabled';
      else if (mode === 'preview' && soldSeats.has(seat.id)) st = 'sold';
      else if (selectedSeats.some(s => s.id === seat.id)) st = 'selected';
      else if (hoveredSeat?.id === seat.id) st = 'hover';
      drawSeatThemed(ctx, seat.x, seat.y, color, st, t);
    }

    // Row labels
    ctx.fillStyle = t.sectionLabel;
    ctx.font = 'bold 9px Inter, monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (const sec of venue.sections) {
      if (sec.curveRadius > 0) continue;
      const ss = seats.filter(s => s.sectionId === sec.id);
      const rows = [...new Set(ss.map(s => s.rowLabel))];
      for (const rl of rows) {
        const rs = ss.filter(s => s.rowLabel === rl);
        if (!rs.length) continue;
        const left = rs.reduce((a, b) => a.x < b.x ? a : b);
        ctx.fillText(rl, left.x - SEAT_SIZE, left.y);
      }
    }

    // Highlight editing section
    if (editingSectionId) {
      const secSeats = seats.filter(s => s.sectionId === editingSectionId);
      if (secSeats.length) {
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const s of secSeats) { if (s.x < minX) minX = s.x; if (s.x > maxX) maxX = s.x; if (s.y < minY) minY = s.y; if (s.y > maxY) maxY = s.y; }
        ctx.save();
        ctx.strokeStyle = primary;
        ctx.lineWidth = 2 / vp.zoom;
        ctx.setLineDash([6 / vp.zoom, 4 / vp.zoom]);
        ctx.strokeRect(minX - 16, minY - 24, maxX - minX + 32, maxY - minY + 40);
        ctx.restore();
      }
    }

    ctx.restore();
  }, [venue, seats, vp, hoveredSeat, selectedSeats, soldSeats, mode, categories, drawTheme, editingSectionId, primary]);

  // Resize observer
  useEffect(() => {
    const el = canvasRef.current?.parentElement;
    if (!el) return;
    const obs = new ResizeObserver(() => setVp(v => ({ ...v })));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const stats = useMemo(() => computeStats(seats, categories), [seats, categories]);
  const avail = useMemo(() => {
    const c: Record<string, number> = {};
    categories.forEach(cat => { c[cat.id] = 0; });
    seats.forEach(s => { if (s.status !== 'disabled' && !soldSeats.has(s.id)) c[s.category] = (c[s.category] || 0) + 1; });
    return c;
  }, [seats, categories, soldSeats]);
  const price = useMemo(() => {
    const sub = selectedSeats.reduce((a, s) => a + (categories.find(c => c.id === s.category)?.price || 0), 0);
    const fee = Math.round(sub * 0.05);
    return { sub, fee, total: sub + fee };
  }, [selectedSeats, categories]);

  const editingSection = editingSectionId ? venue.sections.find(s => s.id === editingSectionId) : null;

  // Keyboard shortcuts
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (mode !== 'edit' || (e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.key === '1') setCurrentTool('premium');
      if (e.key === '2') setCurrentTool('vip');
      if (e.key === '3') setCurrentTool('standard');
      if (e.key === '4') setCurrentTool('economy');
      if (e.key === 'e' || e.key === 'E') setCurrentTool('disabled');
      if (e.key === 'Escape') setEditingSectionId(null);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [mode]);

  // ── Section editor helper
  const SectionEditor = () => {
    if (!editingSection) return null;
    const sec = editingSection;
    const secIdx = venue.sections.findIndex(s => s.id === sec.id);
    return (
      <Stack spacing={1.5} sx={{ p: 2, borderTop: `1px solid ${border}` }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {sec.name}
          </Typography>
          <IconButton size="small" onClick={() => setEditingSectionId(null)}><CloseIcon sx={{ fontSize: 14 }} /></IconButton>
        </Stack>

        <TextField size="small" label="Bölüm Adı" value={sec.name}
          onChange={e => setVenue(updateSection(venue, sec.id, { name: e.target.value }))} />

        <Stack direction="row" spacing={1}>
          <TextField size="small" label="Sıra Sayısı" type="number" value={sec.rows.length}
            onChange={e => {
              const n = parseInt(e.target.value) || 1;
              let v = venue;
              while (v.sections.find(s => s.id === sec.id)!.rows.length < n) v = addRowToSection(v, sec.id);
              while (v.sections.find(s => s.id === sec.id)!.rows.length > n && v.sections.find(s => s.id === sec.id)!.rows.length > 1) v = removeRowFromSection(v, sec.id);
              setVenue(v);
            }}
            inputProps={{ min: 1, max: 30 }}
            sx={{ flex: 1 }} />
          <TextField size="small" label="Koltuk/Sıra" type="number"
            value={sec.rows[0]?.seatCount ?? 16}
            onChange={e => setVenue(updateSectionSeatCount(venue, sec.id, parseInt(e.target.value) || 1))}
            inputProps={{ min: 1, max: 60 }}
            sx={{ flex: 1 }} />
        </Stack>

        <Stack direction="row" spacing={1}>
          <TextField size="small" label="Koltuk Aralık" type="number"
            value={sec.rows[0]?.seatSpacing ?? 26}
            onChange={e => {
              const sp = parseInt(e.target.value) || 20;
              let v = venue;
              sec.rows.forEach((_, i) => { v = updateRow(v, sec.id, i, { seatSpacing: sp }); });
              setVenue(v);
            }}
            inputProps={{ min: 14, max: 50 }}
            sx={{ flex: 1 }} />
          <TextField size="small" label="Sıra Aralık" type="number"
            value={sec.rows[1]?.rowGap ?? sec.rows[0]?.rowGap ?? 28}
            onChange={e => {
              const rg = parseInt(e.target.value) || 20;
              let v = venue;
              sec.rows.forEach((_, i) => { if (i > 0) v = updateRow(v, sec.id, i, { rowGap: rg }); });
              setVenue(v);
            }}
            inputProps={{ min: 16, max: 60 }}
            sx={{ flex: 1 }} />
        </Stack>

        {sec.curveRadius > 0 && (
          <Stack direction="row" spacing={1}>
            <TextField size="small" label="Eğri Yarıçap" type="number" value={sec.curveRadius}
              onChange={e => setVenue(updateSection(venue, sec.id, { curveRadius: parseInt(e.target.value) || 100 }))}
              inputProps={{ min: 50, max: 1000 }}
              sx={{ flex: 1 }} />
            <TextField size="small" label="Ark Açısı (°)" type="number" value={sec.arcSpan}
              onChange={e => setVenue(updateSection(venue, sec.id, { arcSpan: parseInt(e.target.value) || 60 }))}
              inputProps={{ min: 20, max: 350 }}
              sx={{ flex: 1 }} />
          </Stack>
        )}

        <Stack direction="row" spacing={1}>
          <TextField size="small" label="Döndürme (°)" type="number" value={sec.rotation}
            onChange={e => setVenue(updateSection(venue, sec.id, { rotation: parseInt(e.target.value) || 0 }))}
            inputProps={{ min: -180, max: 180 }}
            sx={{ flex: 1 }} />
          <Select size="small" value={sec.defaultCategory}
            onChange={e => setVenue(updateSection(venue, sec.id, { defaultCategory: e.target.value }))}
            sx={{ flex: 1 }}>
            {categories.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
          </Select>
        </Stack>

        {venue.sections.length > 1 && (
          <Button size="small" color="error" variant="outlined" startIcon={<DeleteIcon />}
            onClick={() => { setVenue(removeSection(venue, sec.id)); setEditingSectionId(null); }}
            sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}>
            Bölümü Sil
          </Button>
        )}
      </Stack>
    );
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────
  const LEFT_W = isMobile ? 0 : isSmall ? 200 : 240;
  const RIGHT_W = mode === 'preview' && !isMobile ? 260 : 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)', background: bg, mx: -3, mt: -3, mb: -3 }}>

      {/* TOP BAR */}
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        px: { xs: 1.5, md: 3 }, height: 48, background: surface,
        borderBottom: `1px solid ${border}`, flexShrink: 0, gap: 1,
        flexWrap: 'wrap', minHeight: 48,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
          <IconButton size="small" onClick={onBack} sx={{ color: textSecondary, '&:hover': { color: textPrimary } }}>
            <BackIcon sx={{ fontSize: 18 }} />
          </IconButton>
          <Typography sx={{ fontSize: 15, fontWeight: 800, color: textPrimary, flexShrink: 0 }}>
            Nart<Box component="span" sx={{ color: green }}>Go</Box>
          </Typography>
          {!isMobile && <>
            <Box sx={{ width: 1, height: 16, background: border }} />
            <Typography sx={{ fontSize: 12, color: textSecondary }} noWrap>
              <b style={{ color: textPrimary }}>{event.name}</b>
              <Box component="span" sx={{ ml: 1 }}>{venue.name}</Box>
            </Typography>
          </>}
          <Chip label={`${stats.total}`} size="small" sx={{ height: 20, fontSize: 10, fontWeight: 700, bgcolor: alpha(green, 0.1), color: green }} />
        </Box>

        <Box sx={{ display: 'flex', background: alpha(border, 0.3), border: `1px solid ${border}`, borderRadius: 2, p: '2px', gap: '2px' }}>
          {(['edit', 'preview'] as const).map(m => (
            <Button key={m} size="small"
              startIcon={!isMobile ? (m === 'edit' ? <EditIcon sx={{ fontSize: '13px !important' }} /> : <PreviewIcon sx={{ fontSize: '13px !important' }} />) : undefined}
              onClick={() => switchMode(m)}
              sx={{ px: isMobile ? 1 : 1.5, py: 0.375, borderRadius: 1.5, fontSize: 11, fontWeight: 600, textTransform: 'none', minWidth: 'auto', color: mode === m ? textPrimary : textDisabled, background: mode === m ? surface : 'transparent', boxShadow: mode === m ? muiTheme.shadows[1] : 'none', '&:hover': { background: mode === m ? surface : alpha(surface, 0.5) } }}>
              {m === 'edit' ? (isMobile ? '✏️' : 'Düzenle') : (isMobile ? '👁' : 'Önizle')}
            </Button>
          ))}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Button size="small" startIcon={!isMobile ? <SaveIcon sx={{ fontSize: '13px !important' }} /> : undefined}
            onClick={() => enqueueSnackbar(`"${event.name}" koltuk haritasi kaydedildi`, { variant: 'success' })}
            sx={{ px: 1.25, py: 0.5, borderRadius: 2, fontSize: 11, fontWeight: 600, textTransform: 'none', color: textSecondary, background: alpha(border, 0.3), border: `1px solid ${border}`, '&:hover': { background: alpha(border, 0.5) } }}>
            {isMobile ? '💾' : 'Kaydet'}
          </Button>
          <Button size="small" startIcon={!isMobile ? <CheckIcon sx={{ fontSize: '13px !important' }} /> : undefined}
            onClick={() => { enqueueSnackbar(`"${event.name}" koltuk haritasi yayina alindi!`, { variant: 'success' }); }}
            sx={{ px: 1.25, py: 0.5, borderRadius: 2, fontSize: 11, fontWeight: 600, textTransform: 'none', color: '#fff', background: green, '&:hover': { background: '#0ea271' } }}>
            {isMobile ? '✓' : 'Yayinla'}
          </Button>
        </Box>
      </Box>

      {/* MAIN */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* LEFT PANEL */}
        {!isMobile && mode === 'edit' && (
          <Box sx={{ width: LEFT_W, flexShrink: 0, background: surface, borderRight: `1px solid ${border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* Tab switcher */}
            <Box sx={{ display: 'flex', borderBottom: `1px solid ${border}` }}>
              {(['templates', 'sections'] as const).map(tab => (
                <Box key={tab} onClick={() => setLeftTab(tab)}
                  sx={{ flex: 1, py: 1, textAlign: 'center', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: leftTab === tab ? primary : textDisabled, borderBottom: leftTab === tab ? `2px solid ${primary}` : '2px solid transparent', transition: 'all 0.15s' }}>
                  {tab === 'templates' ? 'Şablonlar' : 'Bölümler'}
                </Box>
              ))}
            </Box>

            <Box sx={{ flex: 1, overflowY: 'auto' }}>
              {leftTab === 'templates' ? (<>
                {/* Templates */}
                <Box sx={{ p: 1.5 }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0.5 }}>
                    {VENUE_TEMPLATES.map(t => (
                      <Box key={t.type} onClick={() => loadTemplate(t.type)}
                        sx={{ background: venue.type === t.type ? alpha(primary, 0.1) : 'transparent', border: `1.5px solid ${venue.type === t.type ? primary : border}`, borderRadius: 2, p: '6px 4px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s', '&:hover': { background: alpha(primary, 0.05) } }}>
                        <Typography sx={{ fontSize: 16, mb: 0.25 }}>{t.icon}</Typography>
                        <Typography sx={{ fontSize: 9, fontWeight: 600, color: venue.type === t.type ? primary : textSecondary, lineHeight: 1.1 }}>{t.label}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
                <Divider />
                {/* Category tools */}
                <Box sx={{ p: 1.5 }}>
                  <Typography sx={{ fontSize: 9.5, fontWeight: 700, color: textDisabled, textTransform: 'uppercase', letterSpacing: 1, mb: 1 }}>Fırça</Typography>
                  {categories.map(cat => (
                    <Box key={cat.id} onClick={() => setCurrentTool(cat.id)}
                      sx={{ display: 'flex', alignItems: 'center', gap: 1, p: '6px 8px', borderRadius: 1.5, cursor: 'pointer', mb: 0.25, border: `1.5px solid ${currentTool === cat.id ? cat.color : 'transparent'}`, background: currentTool === cat.id ? alpha(cat.color, 0.08) : 'transparent', transition: 'all 0.15s', '&:hover': { background: alpha(cat.color, 0.05) } }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '3px', background: cat.color, flexShrink: 0 }} />
                      <Typography sx={{ fontSize: 11, fontWeight: 600, flex: 1, color: currentTool === cat.id ? cat.color : textPrimary }}>{cat.name}</Typography>
                      <Typography sx={{ fontSize: 9.5, fontFamily: 'monospace', color: textDisabled }}>₺{cat.price}</Typography>
                    </Box>
                  ))}
                  <Box onClick={() => setCurrentTool('disabled')}
                    sx={{ display: 'flex', alignItems: 'center', gap: 1, p: '6px 8px', borderRadius: 1.5, cursor: 'pointer', border: `1.5px solid ${currentTool === 'disabled' ? textDisabled : 'transparent'}`, transition: 'all 0.15s', '&:hover': { background: alpha(textDisabled, 0.05) } }}>
                    <BlockIcon sx={{ fontSize: 12, color: textDisabled }} />
                    <Typography sx={{ fontSize: 11, fontWeight: 600, color: currentTool === 'disabled' ? textPrimary : textDisabled }}>Kapat</Typography>
                  </Box>
                </Box>
                <Divider />
                {/* Stats summary */}
                <Box sx={{ p: 1.5 }}>
                  <Typography sx={{ fontSize: 9.5, fontWeight: 700, color: textDisabled, textTransform: 'uppercase', letterSpacing: 1, mb: 1 }}>Özet</Typography>
                  {categories.map(cat => (
                    <Box key={cat.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
                      <Box sx={{ width: 6, height: 6, borderRadius: '2px', background: cat.color }} />
                      <Typography sx={{ fontSize: 10.5, color: textSecondary, flex: 1 }}>{cat.name}</Typography>
                      <Typography sx={{ fontSize: 10.5, fontFamily: 'monospace', color: textSecondary, fontWeight: 600 }}>{stats.counts[cat.id] || 0}</Typography>
                    </Box>
                  ))}
                  <Box sx={{ mt: 1, pt: 1, borderTop: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <span style={{ color: textSecondary }}>Toplam</span>
                    <b style={{ color: textPrimary }}>{stats.total}</b>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, mt: 0.5 }}>
                    <span style={{ color: textSecondary }}>Gelir</span>
                    <b style={{ color: green, fontFamily: 'monospace' }}>₺{stats.maxRevenue.toLocaleString('tr-TR')}</b>
                  </Box>
                </Box>
              </>) : (<>
                {/* Sections list */}
                <Box sx={{ p: 1.5 }}>
                  {venue.sections.map((sec) => {
                    const secSeats = seats.filter(s => s.sectionId === sec.id);
                    const isEditing = editingSectionId === sec.id;
                    return (
                      <Box key={sec.id} onClick={() => setEditingSectionId(isEditing ? null : sec.id)}
                        sx={{
                          p: 1, mb: 0.5, borderRadius: 2, cursor: 'pointer',
                          border: `1.5px solid ${isEditing ? primary : border}`,
                          background: isEditing ? alpha(primary, 0.05) : 'transparent',
                          transition: 'all 0.15s', '&:hover': { background: alpha(primary, 0.03) },
                        }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <SettingsIcon sx={{ fontSize: 14, color: isEditing ? primary : textDisabled }} />
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography sx={{ fontSize: 12, fontWeight: 600, color: textPrimary }} noWrap>{sec.name}</Typography>
                            <Typography sx={{ fontSize: 10, color: textDisabled }}>
                              {sec.rows.length} sıra · {secSeats.length} koltuk
                            </Typography>
                          </Box>
                          <Chip label={sec.curveRadius > 0 ? 'Eğri' : 'Düz'} size="small"
                            sx={{ height: 18, fontSize: 9, fontWeight: 600 }} />
                        </Stack>
                      </Box>
                    );
                  })}
                  <Button size="small" fullWidth variant="outlined" startIcon={<AddIcon />}
                    onClick={() => setVenue(addSection(venue))}
                    sx={{ mt: 1, textTransform: 'none', borderRadius: 2, borderStyle: 'dashed', fontWeight: 600, fontSize: 11 }}>
                    Bölüm Ekle
                  </Button>
                </Box>
              </>)}
            </Box>

            {/* Section editor drawer */}
            {editingSection && <SectionEditor />}
          </Box>
        )}

        {/* PREVIEW LEFT */}
        {!isMobile && mode === 'preview' && (
          <Box sx={{ width: LEFT_W, flexShrink: 0, background: surface, borderRight: `1px solid ${border}`, p: 2, overflowY: 'auto' }}>
            <Typography sx={{ fontSize: 9.5, fontWeight: 700, color: textDisabled, textTransform: 'uppercase', letterSpacing: 1, mb: 1 }}>Kategoriler</Typography>
            <Stack spacing={0.5}>
              {categories.map(cat => (
                <Box key={cat.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: '6px 8px', borderRadius: 2, background: alpha(cat.color, 0.05), border: `1px solid ${alpha(cat.color, 0.12)}` }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '3px', background: cat.color, flexShrink: 0 }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 600, color: textPrimary }}>{cat.name}</Typography>
                    <Typography sx={{ fontSize: 9.5, color: textDisabled }}>{avail[cat.id] || 0} müsait</Typography>
                  </Box>
                  <Typography sx={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: textPrimary }}>₺{cat.price}</Typography>
                </Box>
              ))}
            </Stack>
          </Box>
        )}

        {/* CANVAS */}
        <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <canvas ref={canvasRef}
            onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp}
            onMouseLeave={() => { setIsPanning(false); setIsPainting(false); setTip(null); setHoveredSeat(null); }}
            onWheel={onWheel}
            onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onUp}
            style={{ width: '100%', height: '100%', cursor: isPanning ? 'grabbing' : hoveredSeat ? 'pointer' : 'grab', touchAction: 'none' }}
          />
          {/* Zoom controls */}
          <Box sx={{ position: 'absolute', bottom: 16, right: 16, display: 'flex', flexDirection: 'column', gap: 0.5, zIndex: 10 }}>
            <IconButton onClick={() => setVp(v => ({ ...v, zoom: Math.min(3, v.zoom + 0.15) }))}
              size="small" sx={{ width: 32, height: 32, borderRadius: 1.5, background: surface, border: `1px solid ${border}`, color: textSecondary, '&:hover': { background: alpha(border, 0.5) } }}>
              <AddIcon sx={{ fontSize: 16 }} />
            </IconButton>
            <Box sx={{ background: surface, border: `1px solid ${border}`, borderRadius: 1, py: 0.25, px: 0.75, fontSize: 10, fontFamily: 'monospace', color: textDisabled, textAlign: 'center' }}>
              {Math.round(vp.zoom * 100)}%
            </Box>
            <IconButton onClick={() => setVp(v => ({ ...v, zoom: Math.max(0.3, v.zoom - 0.15) }))}
              size="small" sx={{ width: 32, height: 32, borderRadius: 1.5, background: surface, border: `1px solid ${border}`, color: textSecondary, '&:hover': { background: alpha(border, 0.5) } }}>
              <RemoveIcon sx={{ fontSize: 16 }} />
            </IconButton>
            <IconButton onClick={() => setVp({ x: 0, y: 0, zoom: 1 })}
              size="small" sx={{ width: 32, height: 32, borderRadius: 1.5, background: surface, border: `1px solid ${border}`, color: textSecondary, '&:hover': { background: alpha(border, 0.5) } }}>
              <ResetIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Box>
        </Box>

        {/* RIGHT PANEL (Preview cart) */}
        {mode === 'preview' && !isMobile && (
          <Box sx={{ width: 260, flexShrink: 0, background: surface, borderLeft: `1px solid ${border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Box sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Typography sx={{ fontSize: 10, fontWeight: 700, color: textDisabled, textTransform: 'uppercase', letterSpacing: 1 }}>
                Seçilenler ({selectedSeats.length}/{MAX_SELECT})
              </Typography>

              {selectedSeats.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4, color: textDisabled }}>
                  <Typography sx={{ fontSize: 24, mb: 0.5, opacity: 0.5 }}>🪑</Typography>
                  <Typography sx={{ fontSize: 11 }}>Koltuk seçmek için tıklayın</Typography>
                </Box>
              ) : (
                <Stack spacing={0.5}>
                  {selectedSeats.map(s => {
                    const cat = categories.find(c => c.id === s.category);
                    return (
                      <Box key={s.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, background: alpha(border, 0.3), border: `1px solid ${border}`, borderRadius: 2, p: '6px 8px' }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '2px', background: cat?.color, flexShrink: 0 }} />
                        <Box sx={{ flex: 1 }}>
                          <Typography sx={{ fontSize: 11, fontWeight: 700, color: textPrimary }}>{s.sectionName} · {s.rowLabel}{s.seatNumber}</Typography>
                          <Typography sx={{ fontSize: 9.5, color: textDisabled }}>{cat?.name}</Typography>
                        </Box>
                        <Typography sx={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: green }}>₺{cat?.price}</Typography>
                        <IconButton size="small" onClick={() => setSelectedSeats(p => p.filter(ss => ss.id !== s.id))} sx={{ color: textDisabled, p: 0.25, '&:hover': { color: muiTheme.palette.error.main } }}>
                          <CloseIcon sx={{ fontSize: 12 }} />
                        </IconButton>
                      </Box>
                    );
                  })}
                </Stack>
              )}

              {selectedSeats.length > 0 && (
                <Box sx={{ background: alpha(border, 0.3), border: `1px solid ${border}`, borderRadius: 2, p: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, mb: 0.5, color: textSecondary }}>
                    <span>Bilet ({selectedSeats.length})</span><span>₺{price.sub.toLocaleString('tr-TR')}</span>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, mb: 0.5, color: textSecondary }}>
                    <span>Hizmet (%5)</span><span>₺{price.fee.toLocaleString('tr-TR')}</span>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 800, pt: 0.75, borderTop: `1px solid ${border}`, color: textPrimary }}>
                    <span>Toplam</span>
                    <span style={{ color: green, fontFamily: 'monospace' }}>₺{price.total.toLocaleString('tr-TR')}</span>
                  </Box>
                </Box>
              )}

              <Button fullWidth disabled={!selectedSeats.length} onClick={() => setOrderOpen(true)} startIcon={<CartIcon />}
                sx={{ py: 1.25, borderRadius: 2, fontSize: 13, fontWeight: 800, textTransform: 'none', background: selectedSeats.length > 0 ? green : alpha(border, 0.3), color: selectedSeats.length > 0 ? '#fff' : textDisabled, '&:hover': { background: '#0ea271' }, '&:disabled': { background: alpha(border, 0.3), color: textDisabled } }}>
                Ödemeye Geç
              </Button>
            </Box>
          </Box>
        )}
      </Box>

      {/* TOOLTIP */}
      {tip && (
        <Box sx={{ position: 'fixed', zIndex: 200, left: tip.x, top: tip.y, background: surface, border: `1px solid ${border}`, borderRadius: 2, p: '6px 10px', pointerEvents: 'none', boxShadow: muiTheme.shadows[8], whiteSpace: 'nowrap' }}>
          <Typography sx={{ fontWeight: 700, color: textDisabled, fontSize: 9, textTransform: 'uppercase', mb: 0.25 }}>{tip.seat.sectionName} · Sıra {tip.seat.rowLabel}</Typography>
          <Typography sx={{ fontSize: 12, fontWeight: 800, color: textPrimary }}>Koltuk {tip.seat.seatNumber}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '2px', background: getCategoryColor(tip.seat.category, categories) }} />
            <Typography sx={{ fontSize: 10, color: textSecondary }}>{categories.find(c => c.id === tip.seat.category)?.name}</Typography>
            {mode === 'preview' && <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, color: green, fontSize: 10, ml: 0.5 }}>₺{categories.find(c => c.id === tip.seat.category)?.price}</Typography>}
          </Box>
        </Box>
      )}

      {/* ORDER MODAL */}
      <Dialog open={orderOpen} onClose={() => setOrderOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>
          <TicketIcon sx={{ fontSize: 20, mr: 1, verticalAlign: 'text-bottom', color: green }} />
          Sipariş Özeti
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1} sx={{ mb: 2 }}>
            {selectedSeats.map(s => {
              const cat = categories.find(c => c.id === s.category);
              return (
                <Box key={s.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, bgcolor: 'action.hover', borderRadius: 2 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '3px', background: cat?.color }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight={700}>{s.sectionName} · {s.rowLabel}-{s.seatNumber}</Typography>
                    <Typography variant="caption" color="text.secondary">{cat?.name}</Typography>
                  </Box>
                  <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, color: green }}>₺{cat?.price}</Typography>
                </Box>
              );
            })}
          </Stack>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2, bgcolor: 'action.selected', borderRadius: 2 }}>
            <Typography fontWeight={600}>Ödenecek Tutar</Typography>
            <Typography sx={{ fontSize: 20, fontWeight: 800, fontFamily: 'monospace', color: green }}>₺{price.total.toLocaleString('tr-TR')}</Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setOrderOpen(false)} sx={{ textTransform: 'none', borderRadius: 2 }}>Geri</Button>
          <Button onClick={() => { setOrderOpen(false); enqueueSnackbar('Ödeme sayfasına yönlendiriliyorsunuz...', { variant: 'success' }); }}
            variant="contained" sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 700, bgcolor: green, '&:hover': { bgcolor: '#0ea271' } }}>
            Ödemeye Geç
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// ─── Wrapper with Event Picker ─────────────────────────────────────────────
const SeatMapDesigner: React.FC = () => {
  const [selectedEvent, setSelectedEvent] = useState<EventSummary | null>(null);

  if (!selectedEvent) {
    return <EventPicker onSelect={setSelectedEvent} />;
  }

  return <SeatMapDesignerInner event={selectedEvent} onBack={() => setSelectedEvent(null)} />;
};

export default SeatMapDesigner;
