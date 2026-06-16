/**
 * SeatMapDesigner — Atomic component architecture.
 * State management + canvas logic here, UI in child components.
 */
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Box, Stack, Typography, IconButton, Drawer, useTheme, alpha, useMediaQuery, CircularProgress, Divider, Button } from '@mui/material';
import { Add as AddIcon, Remove as RemoveIcon, RestartAlt as ResetIcon, Close as CloseIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import {
  VenueConfig, VenueType, Seat, SeatCategory, DEFAULT_CATEGORIES,
  VENUE_TEMPLATES, generateVenueSeats, drawStageThemed, drawSeatThemed,
  drawStandingZone, drawSectionLabelThemed, getCategoryColor, findSeatAtPoint,
  computeStats, SEAT_SIZE, DARK_THEME, LIGHT_THEME, DrawTheme,
  serializeVenueDesign, validateVenueDesign, deserializeVenueDesign,
} from './venueEngine';
import { ticketService } from '../../services/ticket/ticketService';

import EventPicker, { type EventSummary } from './components/EventPicker';
import DesignerTopBar from './components/DesignerTopBar';
import DesignerLeftPanel from './components/DesignerLeftPanel';
import PreviewSidebar from './components/PreviewSidebar';
import SeatTooltip from './components/SeatTooltip';
import OrderDialog from './components/OrderDialog';
import SeatActionPanel from './components/SeatActionPanel';

/* ═══════════════════════════════════════════════════════════════════════════
   DESIGNER INNER
   ═══════════════════════════════════════════════════════════════════════ */
const SeatMapDesignerInner: React.FC<{ event: EventSummary; onBack: () => void }> = ({ event, onBack }) => {
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmall = useMediaQuery(theme.breakpoints.down('lg'));
  const drawTheme: DrawTheme = isDark ? DARK_THEME : LIGHT_THEME;
  const bg = theme.palette.background.default;
  const surface = theme.palette.background.paper;
  const border = theme.palette.divider;
  const primary = theme.palette.primary.main;
  const textDisabled = theme.palette.text.disabled;

  // ── Core state ──────────────────────────────────────────
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [venue, setVenue] = useState<VenueConfig>(() => VENUE_TEMPLATES[0].generate());
  const [seats, setSeats] = useState<Seat[]>([]);
  const [categories] = useState<SeatCategory[]>(DEFAULT_CATEGORIES);
  const [currentTool, setCurrentTool] = useState('premium');
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
  const [soldSeats, setSoldSeats] = useState<Set<string>>(new Set());
  const [hoveredSeat, setHoveredSeat] = useState<Seat | null>(null);
  const [tip, setTip] = useState<{ x: number; y: number; seat: Seat } | null>(null);

  // Viewport
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [vp, setVp] = useState({ x: 0, y: 0, zoom: isMobile ? 0.6 : 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isPainting, setIsPainting] = useState(false);

  // UI state
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [leftTab, setLeftTab] = useState<'templates' | 'sections' | 'stage' | 'saved'>('templates');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const MAX_SELECT = 8;
  const LEFT_W = isSmall ? 200 : 240;
  const [loadingDesign, setLoadingDesign] = useState(true);
  const resetZoom = useCallback(() => setVp({ x: 0, y: 0, zoom: isMobile ? 0.6 : 1 }), [isMobile]);

  // ── Load seat map from backend ───────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingDesign(true);
      try {
        const res = await ticketService.getSeatMap(event.id);
        if (cancelled) return;
        const data = res?.data as any;
        if (data) {
          // 1. Try our own saved design format first (serializeVenueDesign output)
          const design = deserializeVenueDesign(data);
          if (design && design.venue.sections.length > 0) {
            setVenue(design.venue);
            if (design.seatOverrides.length > 0) {
              setTimeout(() => {
                setSeats(prev => prev.map(s => {
                  const override = design.seatOverrides.find(o => o.id === s.id);
                  return override ? { ...s, category: override.category, status: override.status } : s;
                }));
              }, 50);
            }
            enqueueSnackbar('Kayıtlı koltuk düzeni yüklendi', { variant: 'info' });
          }
          // 2. Try backend SeatMapResponse format (categories with rows)
          else if (data.categories && Array.isArray(data.categories) && data.categories.length > 0) {
            const catColors = ['#8b5cf6', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#ec4899'];
            const sections: import('./venueEngine').SectionConfig[] = [];
            const newCategories: import('./venueEngine').SeatCategory[] = [];

            data.categories.forEach((cat: any, ci: number) => {
              const catId = cat.categoryId || `cat-${ci}`;
              const catName = cat.categoryName || `Kategori ${ci + 1}`;
              const color = catColors[ci % catColors.length];

              newCategories.push({ id: catId, name: catName, color, price: cat.basePrice || 0 });

              const rows: import('./venueEngine').SectionConfig['rows'] = [];
              (cat.rows || []).forEach((row: any, ri: number) => {
                const totalSeats = (row.availableSeats?.length || 0) + (row.occupiedSeats?.length || 0);
                if (totalSeats > 0) {
                  rows.push({
                    label: row.rowLabel || String.fromCharCode(65 + ri),
                    seatCount: totalSeats,
                    seatSpacing: 26,
                    rowGap: 28,
                    aisleAfter: [],
                    aisleWidth: 20,
                  });
                }
              });

              if (rows.length > 0) {
                sections.push({
                  id: catId,
                  name: catName,
                  x: 0,
                  y: ci * 200,
                  rotation: 0,
                  curveRadius: 0,
                  arcSpan: 180,
                  defaultCategory: catId,
                  blockLabel: catName,
                  seatRangeDesc: '',
                  rows,
                });
              }
            });

            if (sections.length > 0) {
              setVenue({
                type: (data.layoutStyle as import('./venueEngine').VenueType) || 'proscenium',
                name: event.name || 'Etkinlik',
                stage: {
                  x: 0, y: -200, width: 400, height: 80,
                  shape: data.stagePosition === 'back' ? 'rectangle' : 'semicircle',
                  label: 'SAHNE',
                },
                sections,
                standingZones: [],
              });

              // Also load occupied seats
              try {
                const [occRes, resRes] = await Promise.allSettled([
                  ticketService.getOccupiedSeats(event.id),
                  ticketService.getReservedSeats(event.id),
                ]);
                const soldIds = new Set<string>();
                if (occRes.status === 'fulfilled') occRes.value?.data?.forEach((id: string) => soldIds.add(id));
                if (resRes.status === 'fulfilled') resRes.value?.data?.forEach((id: string) => soldIds.add(id));
                if (soldIds.size > 0) setSoldSeats(soldIds);
              } catch { /* ignore */ }

              enqueueSnackbar(`Etkinlik koltuk düzeni yüklendi (${sections.length} bölge)`, { variant: 'info' });
            }
          }
        }
      } catch {
        // No saved design — use default template
      } finally {
        if (!cancelled) setLoadingDesign(false);
      }
    })();
    return () => { cancelled = true; };
  }, [event.id]);

  // ── Generate seats ──────────────────────────────────────
  useEffect(() => {
    const gen = generateVenueSeats(venue);
    setSeats(prev => {
      const old = new Map(prev.map(s => [s.id, s]));
      return gen.map(s => { const o = old.get(s.id); return o ? { ...s, category: o.category, status: o.status } : s; });
    });
    setSelectedSeats([]);
  }, [venue]);

  const loadTemplate = useCallback((type: VenueType) => {
    const t = VENUE_TEMPLATES.find(v => v.type === type);
    if (t) { setVenue(t.generate()); resetZoom(); setEditingSectionId(null); }
  }, [resetZoom]);

  const switchMode = useCallback(async (m: 'edit' | 'preview') => {
    setMode(m); setSelectedSeats([]); setHoveredSeat(null); setEditingSectionId(null); setDrawerOpen(false);
    if (m === 'preview') {
      try {
        const [occ, res] = await Promise.allSettled([ticketService.getOccupiedSeats(event.id), ticketService.getReservedSeats(event.id)]);
        const sold = new Set<string>();
        if (occ.status === 'fulfilled') occ.value?.data?.forEach((id: string) => sold.add(id));
        if (res.status === 'fulfilled') res.value?.data?.forEach((id: string) => sold.add(id));
        if (sold.size === 0) seats.forEach(s => { if (s.status !== 'disabled' && Math.random() < 0.15) sold.add(s.id); });
        setSoldSeats(sold);
      } catch {
        const sold = new Set<string>(); seats.forEach(s => { if (s.status !== 'disabled' && Math.random() < 0.15) sold.add(s.id); }); setSoldSeats(sold);
      }
    }
  }, [seats, event.id]);

  // ── Interaction ─────────────────────────────────────────
  const s2w = useCallback((sx: number, sy: number): [number, number] => {
    const c = canvasRef.current; if (!c) return [0, 0]; const r = c.getBoundingClientRect();
    return [(sx - r.left - r.width / 2) / vp.zoom - vp.x, (sy - r.top - r.height / 2) / vp.zoom - vp.y];
  }, [vp]);

  const paintSeat = useCallback((seat: Seat) => {
    if (mode !== 'edit') return;
    setSeats(p => p.map(s => s.id === seat.id ? { ...s, category: currentTool === 'disabled' ? s.category : currentTool, status: currentTool === 'disabled' ? 'disabled' : 'available' } : s));
  }, [mode, currentTool]);

  const onDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1 || e.altKey) { setIsPanning(true); setPanStart({ x: e.clientX, y: e.clientY }); return; }
    const [wx, wy] = s2w(e.clientX, e.clientY); const seat = findSeatAtPoint(seats, wx, wy);
    if (seat) {
      if (mode === 'edit') { if (e.shiftKey) setSelectedSeats(p => p.find(s => s.id === seat.id) ? p.filter(s => s.id !== seat.id) : [...p, seat]); else { setIsPainting(true); paintSeat(seat); } }
      else { if (seat.status !== 'disabled' && !soldSeats.has(seat.id)) setSelectedSeats(p => { if (p.find(s => s.id === seat.id)) return p.filter(s => s.id !== seat.id); if (p.length >= MAX_SELECT) { enqueueSnackbar(`Maks ${MAX_SELECT}`, { variant: 'warning' }); return p; } return [...p, seat]; }); }
    } else { setIsPanning(true); setPanStart({ x: e.clientX, y: e.clientY }); setSelectedSeats([]); }
  }, [s2w, seats, mode, paintSeat, soldSeats, enqueueSnackbar]);

  const onMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) { setVp(v => ({ ...v, x: v.x + (e.clientX - panStart.x) / vp.zoom, y: v.y + (e.clientY - panStart.y) / vp.zoom })); setPanStart({ x: e.clientX, y: e.clientY }); return; }
    const [wx, wy] = s2w(e.clientX, e.clientY); const seat = findSeatAtPoint(seats, wx, wy);
    setHoveredSeat(seat); setTip(seat ? { x: e.clientX + 14, y: e.clientY - 50, seat } : null);
    if (isPainting && mode === 'edit' && seat) paintSeat(seat);
  }, [isPanning, panStart, vp.zoom, s2w, seats, isPainting, mode, paintSeat]);

  const onUp = useCallback(() => { setIsPanning(false); setIsPainting(false); }, []);

  // Wheel + touch: use native listeners with { passive: false } to allow preventDefault
  const touchRef = useRef<{ x: number; y: number; dist: number } | null>(null);
  const vpRef = useRef(vp);
  vpRef.current = vp;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      setVp(v => ({ ...v, zoom: Math.max(0.3, Math.min(3, v.zoom + (e.deltaY > 0 ? -0.1 : 0.1))) }));
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, dist: 0 };
      } else if (e.touches.length === 2) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX, dy = e.touches[0].clientY - e.touches[1].clientY;
        touchRef.current = { x: (e.touches[0].clientX + e.touches[1].clientX) / 2, y: (e.touches[0].clientY + e.touches[1].clientY) / 2, dist: Math.hypot(dx, dy) };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchRef.current) return;
      e.preventDefault();
      const v = vpRef.current;
      if (e.touches.length === 1) {
        const t = e.touches[0];
        const dx = (t.clientX - touchRef.current.x) / v.zoom, dy = (t.clientY - touchRef.current.y) / v.zoom;
        setVp(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
        touchRef.current = { ...touchRef.current, x: t.clientX, y: t.clientY };
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX, dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy), scale = dist / (touchRef.current.dist || 1);
        setVp(prev => ({ ...prev, zoom: Math.max(0.3, Math.min(3, prev.zoom * scale)) }));
        touchRef.current = { ...touchRef.current, dist };
      }
    };

    const handleTouchEnd = () => { setIsPanning(false); setIsPainting(false); };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  // ── Canvas render ───────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const parent = canvas.parentElement; if (!parent) return;
    const dpr = window.devicePixelRatio || 1, w = parent.clientWidth, h = parent.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr; canvas.style.width = w + 'px'; canvas.style.height = h + 'px'; ctx.scale(dpr, dpr);
    const t = drawTheme; ctx.fillStyle = t.bg; ctx.fillRect(0, 0, w, h);
    ctx.save(); ctx.translate(w / 2, h / 2); ctx.scale(vp.zoom, vp.zoom); ctx.translate(vp.x, vp.y);
    // Grid
    ctx.fillStyle = t.gridDot; const gs = 40, vw = w / vp.zoom, vh = h / vp.zoom;
    for (let gx = Math.floor((-vp.x - vw / 2) / gs) * gs; gx < -vp.x + vw / 2; gx += gs) for (let gy = Math.floor((-vp.y - vh / 2) / gs) * gs; gy < -vp.y + vh / 2; gy += gs) { ctx.beginPath(); ctx.arc(gx, gy, 1, 0, Math.PI * 2); ctx.fill(); }
    drawStageThemed(ctx, venue.stage, t);
    for (const sec of venue.sections) drawSectionLabelThemed(ctx, sec, seats.filter(s => s.sectionId === sec.id), t);
    for (const z of venue.standingZones) drawStandingZone(ctx, z, getCategoryColor(z.category, categories));
    for (const seat of seats) {
      let st: 'normal' | 'hover' | 'selected' | 'disabled' | 'sold' = 'normal';
      if (seat.status === 'disabled' || seat.status === 'blocked') st = 'disabled';
      else if (mode === 'preview' && soldSeats.has(seat.id)) st = 'sold';
      else if (selectedSeats.some(s => s.id === seat.id)) st = 'selected';
      else if (hoveredSeat?.id === seat.id) st = 'hover';
      drawSeatThemed(ctx, seat.x, seat.y, getCategoryColor(seat.category, categories), st, t);
    }
    ctx.fillStyle = t.sectionLabel; ctx.font = 'bold 9px Inter, monospace'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (const sec of venue.sections) { if (sec.curveRadius > 0) continue; const ss = seats.filter(s => s.sectionId === sec.id); for (const rl of [...new Set(ss.map(s => s.rowLabel))]) { const rs = ss.filter(s => s.rowLabel === rl); if (rs.length) ctx.fillText(rl, rs.reduce((a, b) => a.x < b.x ? a : b).x - SEAT_SIZE, rs[0].y); } }
    if (editingSectionId) { const es = seats.filter(s => s.sectionId === editingSectionId); if (es.length) { let x1=Infinity,x2=-Infinity,y1=Infinity,y2=-Infinity; for (const s of es) { x1=Math.min(x1,s.x); x2=Math.max(x2,s.x); y1=Math.min(y1,s.y); y2=Math.max(y2,s.y); } ctx.save(); ctx.strokeStyle=primary; ctx.lineWidth=2/vp.zoom; ctx.setLineDash([6/vp.zoom,4/vp.zoom]); ctx.strokeRect(x1-16,y1-24,x2-x1+32,y2-y1+40); ctx.restore(); } }
    ctx.restore();
  }, [venue, seats, vp, hoveredSeat, selectedSeats, soldSeats, mode, categories, drawTheme, editingSectionId, primary]);

  useEffect(() => { const el = canvasRef.current?.parentElement; if (!el) return; const obs = new ResizeObserver(() => setVp(v => ({...v}))); obs.observe(el); return () => obs.disconnect(); }, []);
  useEffect(() => { const h = (e: KeyboardEvent) => { if (mode !== 'edit' || (e.target as HTMLElement).tagName === 'INPUT') return; if (e.key === '1') setCurrentTool('premium'); if (e.key === '2') setCurrentTool('vip'); if (e.key === '3') setCurrentTool('standard'); if (e.key === '4') setCurrentTool('economy'); if (e.key === 'e' || e.key === 'E') setCurrentTool('disabled'); if (e.key === 'Escape') setEditingSectionId(null); }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [mode]);

  // ── Derived ─────────────────────────────────────────────
  const stats = useMemo(() => computeStats(seats, categories), [seats, categories]);
  const avail = useMemo(() => { const c: Record<string, number> = {}; categories.forEach(cat => c[cat.id] = 0); seats.forEach(s => { if (s.status !== 'disabled' && !soldSeats.has(s.id)) c[s.category] = (c[s.category] || 0) + 1; }); return c; }, [seats, categories, soldSeats]);
  const price = useMemo(() => { const sub = selectedSeats.reduce((a, s) => a + (categories.find(c => c.id === s.category)?.price || 0), 0); const fee = Math.round(sub * 0.05); return { sub, fee, total: sub + fee }; }, [selectedSeats, categories]);

  const doSave = async (publish = false) => {
    const errs = validateVenueDesign(venue, seats); if (errs.length) { errs.forEach(e => enqueueSnackbar(e, { variant: 'warning' })); return; }
    publish ? setPublishing(true) : setSaving(true);
    try { await ticketService.saveSeatMapDesign(event.id, { ...serializeVenueDesign(venue, seats, categories), ...(publish && { published: true }) }); enqueueSnackbar(`"${event.name}" ${publish ? 'yayına alındı' : 'kaydedildi'}!`, { variant: 'success' }); }
    catch (err: any) { enqueueSnackbar(err?.response?.data?.message || 'İşlem başarısız', { variant: 'error' }); }
    finally { setSaving(false); setPublishing(false); }
  };

  // ── RENDER ──────────────────────────────────────────────
  return (
    <Box sx={{
      height: 'calc(100vh - 64px)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      bgcolor: bg
    }}>
      <DesignerTopBar event={event} mode={mode} totalSeats={stats.total} saving={saving} publishing={publishing}
        onBack={onBack} onOpenDrawer={() => setDrawerOpen(true)} onSwitchMode={switchMode} onSave={() => doSave(false)} onPublish={() => doSave(true)} />

      <Box sx={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden'
      }}>
        {/* Desktop left panel */}
        {!isMobile && mode === 'edit' && (
          <Box sx={{ width: LEFT_W, flexShrink: 0, bgcolor: surface, borderRight: `1px solid ${border}`, overflowY: 'auto' }}>
            <DesignerLeftPanel venue={venue} seats={seats} categories={categories} currentTool={currentTool} leftTab={leftTab} editingSectionId={editingSectionId} stats={stats}
              onVenueChange={setVenue} onLoadTemplate={loadTemplate} onToolChange={setCurrentTool} onTabChange={setLeftTab} onEditSection={setEditingSectionId} />
          </Box>
        )}

        {/* Preview left */}
        {!isMobile && mode === 'preview' && (
          <Box sx={{ width: LEFT_W, flexShrink: 0, bgcolor: surface, borderRight: `1px solid ${border}`, p: 2, overflowY: 'auto' }}>
            <Typography sx={{ fontSize: 9, fontWeight: 700, color: textDisabled, textTransform: 'uppercase', letterSpacing: 1, mb: 1 }}>Kategoriler</Typography>
            <Stack spacing={0.5}>
              {categories.map(cat => (
                <Box key={cat.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: '6px 8px', borderRadius: 2, bgcolor: alpha(cat.color, 0.05), border: `1px solid ${alpha(cat.color, 0.12)}` }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: cat.color, flexShrink: 0 }} />
                  <Box sx={{ flex: 1 }}><Typography sx={{ fontSize: 11, fontWeight: 600 }}>{cat.name}</Typography><Typography sx={{ fontSize: 9, color: textDisabled }}>{avail[cat.id] || 0} müsait</Typography></Box>
                  <Typography sx={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700 }}>₺{cat.price}</Typography>
                </Box>
              ))}
            </Stack>
          </Box>
        )}

        {/* Canvas */}
        <Box sx={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          bgcolor: '#f8f9fa',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {loadingDesign && (
            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 15, bgcolor: alpha(bg, 0.8) }}>
              <Stack alignItems="center" spacing={1}>
                <CircularProgress size={28} />
                <Typography variant="caption" color="text.secondary">Koltuk düzeni yükleniyor...</Typography>
              </Stack>
            </Box>
          )}

          {/* Toolbar overlay — üstte */}
          {mode === 'edit' && (
            <Box sx={{
              position: 'absolute', top: 0, left: 0, right: 0,
              height: 44,
              bgcolor: 'background.paper',
              borderBottom: '1px solid', borderColor: 'divider',
              display: 'flex', alignItems: 'center',
              px: 2, gap: 1, zIndex: 10
            }}>
              <Button size="small">Geri Al</Button>
              <Button size="small">Yeniden</Button>
              <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 1 }} />
              <Button size="small" onClick={() => setSelectedSeats([...seats])}>Tümünü Seç</Button>
              <Button size="small">Izgaraya Uydur</Button>
              <Box sx={{ flex: 1 }} />
              <Typography variant="caption" color="text.secondary">
                %{Math.round(vp.zoom * 100)} · Space+Sürükle: Kaydır
              </Typography>
            </Box>
          )}

          <canvas ref={canvasRef} onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp}
            onMouseLeave={() => { setIsPanning(false); setIsPainting(false); setTip(null); setHoveredSeat(null); }}
            style={{ position: 'absolute', width: '100%', height: '100%', cursor: isPanning ? 'grabbing' : hoveredSeat ? 'pointer' : 'grab', touchAction: 'none' }} />

          {/* Seat details / action panel */}
          {mode === 'edit' && selectedSeats.length > 0 && (
            <Box sx={{ position: 'absolute', bottom: 16, right: isMobile ? 16 : 80, zIndex: 12 }}>
              <SeatActionPanel selectedSeats={selectedSeats} eventId={event.id}
                onStatusChange={(ids, status, assignment) => { setSeats(p => p.map(s => ids.includes(s.id) ? { ...s, status: status as import('./venueEngine').SeatStatus, assignment } : s)); setSelectedSeats([]); }}
                onClearSelection={() => setSelectedSeats([])} />
            </Box>
          )}

          {/* Legend (absolute, sol altta) */}
          <Box sx={{
            position: 'absolute', bottom: 16, left: 16,
            bgcolor: 'background.paper',
            border: '1px solid', borderColor: 'divider',
            borderRadius: 1.5, p: 1.5, zIndex: 10
          }}>
            {venue.sections.map(s => {
              const cat = categories.find(c => c.id === s.defaultCategory);
              return (
                <Box key={s.id} sx={{
                  display: 'flex', alignItems: 'center',
                  gap: 1, mb: 0.5
                }}>
                  <Box sx={{
                    width: 10, height: 10, borderRadius: 0.5,
                    bgcolor: cat?.color || '#ccc'
                  }}/>
                  <Typography variant="caption">{s.name}</Typography>
                </Box>
              )
            })}
          </Box>

          {/* Zoom controls (absolute, sağ altta) */}
          <Box sx={{
            position: 'absolute', bottom: 16, right: 16,
            display: 'flex', flexDirection: 'column', gap: 0.5,
            zIndex: 10
          }}>
            <IconButton size="small" onClick={() => setVp(v => ({ ...v, zoom: Math.min(3, v.zoom + 0.15) }))}
              sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1.5, '&:hover': { bgcolor: 'action.hover' } }}>
              <AddIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={resetZoom}
              sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1.5, '&:hover': { bgcolor: 'action.hover' } }}>
              <ResetIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={() => setVp(v => ({ ...v, zoom: Math.max(0.3, v.zoom - 0.15) }))}
              sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1.5, '&:hover': { bgcolor: 'action.hover' } }}>
              <RemoveIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        {/* Right Panel */}
        {!isMobile && (
          <PreviewSidebar 
            venue={venue} 
            categories={categories} 
            stats={stats} 
            activeSectionId={currentTool}
            onSaveAndContinue={() => doSave(true)}
            onPreview={() => switchMode('preview')}
            onReset={() => {
              if (window.confirm('Tüm plan sıfırlanacak, emin misiniz?')) {
                loadTemplate('empty' as import('./venueEngine').VenueType);
              }
            }}
          />
        )}
      </Box>

      {/* Mobile drawer */}
      <Drawer anchor="left" open={drawerOpen && isMobile} onClose={() => setDrawerOpen(false)} PaperProps={{ sx: { width: 260, bgcolor: surface } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1, borderBottom: `1px solid ${border}` }}>
          <Typography variant="subtitle2" fontWeight={700}>Araçlar</Typography>
          <IconButton size="small" onClick={() => setDrawerOpen(false)}><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
        </Box>
        <DesignerLeftPanel venue={venue} seats={seats} categories={categories} currentTool={currentTool} leftTab={leftTab} editingSectionId={editingSectionId} stats={stats}
          onVenueChange={setVenue} onLoadTemplate={loadTemplate} onToolChange={setCurrentTool} onTabChange={setLeftTab} onEditSection={setEditingSectionId} />
      </Drawer>

      {tip && <SeatTooltip tip={tip} categories={categories} mode={mode} />}
      <OrderDialog open={orderOpen} onClose={() => setOrderOpen(false)} selectedSeats={selectedSeats} categories={categories} price={price} />
    </Box>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   WRAPPER
   ═══════════════════════════════════════════════════════════════════════ */
export default function SeatMapDesigner() {
  const [selectedEvent, setSelectedEvent] = useState<EventSummary | null>(null);
  if (!selectedEvent) return <EventPicker onSelect={setSelectedEvent} />;
  return <SeatMapDesignerInner event={selectedEvent} onBack={() => setSelectedEvent(null)} />;
}
