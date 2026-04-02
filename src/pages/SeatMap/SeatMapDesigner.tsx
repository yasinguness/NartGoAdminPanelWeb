/**
 * SeatMapDesigner — Canvas-based Venue Design Engine
 *
 * 6 venue templates, curved/straight rows, section system,
 * zoom/pan, admin brush tools, preview mode with ticket cart.
 */
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  Box, Typography, Button, IconButton, Tooltip, Dialog, DialogTitle,
  DialogContent, DialogActions, Stack, Chip, alpha,
} from '@mui/material';
import {
  Edit as EditIcon, Visibility as PreviewIcon, Save as SaveIcon,
  Check as CheckIcon, Add as AddIcon, Remove as RemoveIcon,
  RestartAlt as ResetIcon, Close as CloseIcon, Block as BlockIcon,
  ShoppingCart as CartIcon, ConfirmationNumber as TicketIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import {
  VenueConfig, VenueType, Seat, SeatCategory, DEFAULT_CATEGORIES, VENUE_TEMPLATES,
  generateVenueSeats, drawStage, drawSeat, drawStandingZone, drawSectionLabel,
  getCategoryColor, findSeatAtPoint, computeStats, SEAT_SIZE,
} from './venueEngine';

// ─── Constants ─────────────────────────────────────────────────────────────
const BG = '#0e1117';
const SURFACE = '#161b27';
const SURFACE2 = '#1e2436';
const SURFACE3 = '#252d42';
const BORDER = '#2a3350';
const TEXT = '#e8edf8';
const TEXT2 = '#8b95b0';
const TEXT3 = '#4a5270';
const GREEN = '#10b981';
const MAX_SELECT = 8;

// ─── Component ─────────────────────────────────────────────────────────────
const SeatMapDesigner: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();

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

  // Generate seats when venue changes
  useEffect(() => {
    setSeats(generateVenueSeats(venue));
    setSelectedSeats([]);
    setSoldSeats(new Set());
  }, [venue]);

  const loadTemplate = useCallback((type: VenueType) => {
    const t = VENUE_TEMPLATES.find(v => v.type === type);
    if (t) { setVenue(t.generate()); setVp({ x: 0, y: 0, zoom: 1 }); }
  }, []);

  const switchMode = useCallback((m: 'edit' | 'preview') => {
    setMode(m);
    setSelectedSeats([]);
    setHoveredSeat(null);
    if (m === 'preview') {
      const sold = new Set<string>();
      seats.forEach(s => { if (s.status !== 'disabled' && Math.random() < 0.15) sold.add(s.id); });
      setSoldSeats(sold);
    }
  }, [seats]);

  // Screen → world coordinate
  const s2w = useCallback((sx: number, sy: number): [number, number] => {
    const c = canvasRef.current;
    if (!c) return [0, 0];
    const r = c.getBoundingClientRect();
    return [(sx - r.left - c.width / 2) / vp.zoom - vp.x, (sy - r.top - c.height / 2) / vp.zoom - vp.y];
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

  // Canvas render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const parent = canvas.parentElement;
    if (parent) { canvas.width = parent.clientWidth; canvas.height = parent.clientHeight; }

    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(vp.zoom, vp.zoom);
    ctx.translate(vp.x, vp.y);

    // Grid dots
    ctx.fillStyle = '#1a2035';
    const gs = 40;
    const vw = canvas.width / vp.zoom;
    const vh = canvas.height / vp.zoom;
    const sx = Math.floor((-vp.x - vw / 2) / gs) * gs;
    const sy = Math.floor((-vp.y - vh / 2) / gs) * gs;
    for (let gx = sx; gx < -vp.x + vw / 2; gx += gs) {
      for (let gy = sy; gy < -vp.y + vh / 2; gy += gs) {
        ctx.beginPath(); ctx.arc(gx, gy, 1, 0, Math.PI * 2); ctx.fill();
      }
    }

    // Stage
    drawStage(ctx, venue.stage);

    // Section labels
    for (const sec of venue.sections) {
      drawSectionLabel(ctx, sec, seats.filter(s => s.sectionId === sec.id));
    }

    // Standing zones
    for (const z of venue.standingZones) {
      drawStandingZone(ctx, z, getCategoryColor(z.category, categories));
    }

    // Seats
    for (const seat of seats) {
      const color = getCategoryColor(seat.category, categories);
      let st: 'normal' | 'hover' | 'selected' | 'disabled' | 'sold' = 'normal';
      if (seat.status === 'disabled' || seat.status === 'blocked') st = 'disabled';
      else if (mode === 'preview' && soldSeats.has(seat.id)) st = 'sold';
      else if (selectedSeats.some(s => s.id === seat.id)) st = 'selected';
      else if (hoveredSeat?.id === seat.id) st = 'hover';
      drawSeat(ctx, seat.x, seat.y, color, st);
    }

    // Row labels (straight sections only)
    ctx.fillStyle = TEXT3;
    ctx.font = 'bold 9px Inter, monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (const sec of venue.sections) {
      if (sec.curveRadius > 0) continue;
      const secSeats = seats.filter(s => s.sectionId === sec.id);
      const rows = [...new Set(secSeats.map(s => s.rowLabel))];
      for (const rl of rows) {
        const rs = secSeats.filter(s => s.rowLabel === rl);
        if (!rs.length) continue;
        const left = rs.reduce((a, b) => a.x < b.x ? a : b);
        ctx.fillText(rl, left.x - SEAT_SIZE, left.y);
      }
    }

    ctx.restore();
  }, [venue, seats, vp, hoveredSeat, selectedSeats, soldSeats, mode, categories]);

  // Resize observer
  useEffect(() => {
    const el = canvasRef.current?.parentElement;
    if (!el) return;
    const obs = new ResizeObserver(() => setVp(v => ({ ...v })));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Stats
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

  // Keyboard shortcuts
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (mode !== 'edit' || (e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.key === '1') setCurrentTool('premium');
      if (e.key === '2') setCurrentTool('vip');
      if (e.key === '3') setCurrentTool('standard');
      if (e.key === '4') setCurrentTool('economy');
      if (e.key === 'e' || e.key === 'E') setCurrentTool('disabled');
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [mode]);

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', background: BG, mx: -3, mt: -3, mb: -3 }}>

      {/* TOP BAR */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, height: 52, background: SURFACE, borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography sx={{ fontSize: 17, fontWeight: 800, color: TEXT }}>Nart<Box component="span" sx={{ color: GREEN }}>Go</Box></Typography>
          <Box sx={{ width: 1, height: 18, background: BORDER }} />
          <Typography sx={{ fontSize: 13, color: TEXT2 }}><b style={{ color: TEXT }}>{venue.name}</b> — Oturma Düzeni</Typography>
          <Chip label={`${stats.total} koltuk · ${venue.sections.length} bölüm`} size="small" sx={{ height: 22, fontSize: 10, fontWeight: 700, bgcolor: alpha(GREEN, 0.1), color: GREEN }} />
        </Box>

        <Box sx={{ display: 'flex', background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: 2, p: '3px', gap: '2px' }}>
          {(['edit', 'preview'] as const).map(m => (
            <Button key={m} size="small"
              startIcon={m === 'edit' ? <EditIcon sx={{ fontSize: '14px !important' }} /> : <PreviewIcon sx={{ fontSize: '14px !important' }} />}
              onClick={() => switchMode(m)}
              sx={{ px: 1.75, py: 0.5, borderRadius: 1.5, fontSize: 12, fontWeight: 600, textTransform: 'none', minWidth: 'auto', color: mode === m ? TEXT : TEXT3, background: mode === m ? SURFACE3 : 'transparent', '&:hover': { background: mode === m ? SURFACE3 : alpha(SURFACE3, 0.5) } }}>
              {m === 'edit' ? 'Düzenleme' : 'Önizleme'}
            </Button>
          ))}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button size="small" startIcon={<SaveIcon sx={{ fontSize: '14px !important' }} />}
            onClick={() => enqueueSnackbar('Taslak kaydedildi', { variant: 'info' })}
            sx={{ px: 1.5, py: 0.75, borderRadius: 2, fontSize: 12, fontWeight: 600, textTransform: 'none', color: TEXT2, background: SURFACE2, border: `1px solid ${BORDER}`, '&:hover': { background: SURFACE3 } }}>
            Kaydet
          </Button>
          <Button size="small" startIcon={<CheckIcon sx={{ fontSize: '14px !important' }} />}
            onClick={() => enqueueSnackbar('Oturma düzeni onaylandı', { variant: 'success' })}
            sx={{ px: 1.5, py: 0.75, borderRadius: 2, fontSize: 12, fontWeight: 600, textTransform: 'none', color: '#0a1a12', background: GREEN, '&:hover': { background: '#0ea271' } }}>
            Onayla
          </Button>
        </Box>
      </Box>

      {/* MAIN */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* LEFT PANEL */}
        <Box sx={{ width: 240, flexShrink: 0, background: SURFACE, borderRight: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {mode === 'edit' ? (<>
            {/* Templates */}
            <Box sx={{ p: 2, borderBottom: `1px solid ${BORDER}` }}>
              <Typography sx={{ fontSize: 10, fontWeight: 700, color: TEXT3, textTransform: 'uppercase', letterSpacing: 1, mb: 1.25 }}>Salon Tipi</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.75 }}>
                {VENUE_TEMPLATES.map(t => (
                  <Box key={t.type} onClick={() => loadTemplate(t.type)}
                    sx={{ background: venue.type === t.type ? alpha(GREEN, 0.12) : SURFACE2, border: `1.5px solid ${venue.type === t.type ? GREEN : BORDER}`, borderRadius: 2, p: '8px 6px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s', '&:hover': { borderColor: venue.type === t.type ? GREEN : SURFACE3, background: SURFACE3 } }}>
                    <Typography sx={{ fontSize: 18, mb: 0.25 }}>{t.icon}</Typography>
                    <Typography sx={{ fontSize: 10, fontWeight: 600, color: venue.type === t.type ? GREEN : TEXT2, lineHeight: 1.2 }}>{t.label}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>

            {/* Category tools */}
            <Box sx={{ p: 2, borderBottom: `1px solid ${BORDER}` }}>
              <Typography sx={{ fontSize: 10, fontWeight: 700, color: TEXT3, textTransform: 'uppercase', letterSpacing: 1, mb: 1.25 }}>Kategori Fırçası</Typography>
              {categories.map(cat => (
                <Box key={cat.id} onClick={() => setCurrentTool(cat.id)}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1.25, p: '8px 10px', borderRadius: 1.5, cursor: 'pointer', mb: 0.5, border: `1.5px solid ${currentTool === cat.id ? cat.color : 'transparent'}`, background: currentTool === cat.id ? SURFACE2 : 'transparent', color: cat.color, transition: 'all 0.15s', '&:hover': { background: SURFACE3 } }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: 0.75, background: cat.color, flexShrink: 0 }} />
                  <Typography sx={{ fontSize: 12, fontWeight: 600, flex: 1 }}>{cat.name}</Typography>
                  <Typography sx={{ fontSize: 10, fontFamily: 'monospace', color: TEXT3 }}>₺{cat.price}</Typography>
                </Box>
              ))}
              <Box onClick={() => setCurrentTool('disabled')}
                sx={{ display: 'flex', alignItems: 'center', gap: 1.25, p: '8px 10px', borderRadius: 1.5, cursor: 'pointer', border: `1.5px solid ${currentTool === 'disabled' ? TEXT3 : 'transparent'}`, background: currentTool === 'disabled' ? SURFACE2 : 'transparent', color: currentTool === 'disabled' ? TEXT : TEXT3, transition: 'all 0.15s', '&:hover': { background: SURFACE3 } }}>
                <BlockIcon sx={{ fontSize: 13 }} />
                <Typography sx={{ fontSize: 12, fontWeight: 600 }}>Koltuk Kapat</Typography>
              </Box>
            </Box>

            {/* Stats */}
            <Box sx={{ p: 2, flex: 1, overflowY: 'auto' }}>
              <Typography sx={{ fontSize: 10, fontWeight: 700, color: TEXT3, textTransform: 'uppercase', letterSpacing: 1, mb: 1.25 }}>İstatistikler</Typography>
              {categories.map(cat => {
                const cnt = stats.counts[cat.id] || 0;
                const pct = stats.total > 0 ? (cnt / stats.total) * 100 : 0;
                return (
                  <Box key={cat.id} sx={{ mb: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '2px', background: cat.color }} />
                        <Typography sx={{ fontSize: 11, color: TEXT2 }}>{cat.name}</Typography>
                      </Box>
                      <Typography sx={{ fontSize: 11, fontFamily: 'monospace', color: TEXT2, fontWeight: 600 }}>{cnt}</Typography>
                    </Box>
                    <Box sx={{ height: 3, background: SURFACE3, borderRadius: 1, overflow: 'hidden' }}>
                      <Box sx={{ height: '100%', width: `${pct}%`, background: cat.color, borderRadius: 1, transition: 'width 0.3s' }} />
                    </Box>
                  </Box>
                );
              })}
              <Box sx={{ mt: 2, p: 1.5, background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: TEXT2, mb: 0.75 }}>
                  <span>Toplam Koltuk</span><b style={{ color: TEXT }}>{stats.total}</b>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: TEXT2, mb: 0.75 }}>
                  <span>Bölüm Sayısı</span><b style={{ color: TEXT }}>{venue.sections.length}</b>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, pt: 0.75, borderTop: `1px solid ${BORDER}` }}>
                  <span style={{ color: TEXT2 }}>Maks. Gelir</span>
                  <b style={{ color: GREEN, fontFamily: 'monospace' }}>₺{stats.maxRevenue.toLocaleString('tr-TR')}</b>
                </Box>
              </Box>
            </Box>
          </>) : (
            /* PREVIEW LEFT */
            <Box sx={{ p: 2 }}>
              <Typography sx={{ fontSize: 10, fontWeight: 700, color: TEXT3, textTransform: 'uppercase', letterSpacing: 1, mb: 1.25 }}>Bilet Kategorileri</Typography>
              <Stack spacing={0.75}>
                {categories.map(cat => (
                  <Box key={cat.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.25, p: '8px 10px', borderRadius: 2, background: SURFACE2, border: `1px solid ${BORDER}` }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: '3px', background: cat.color, flexShrink: 0 }} />
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: 12, fontWeight: 600, color: TEXT }}>{cat.name}</Typography>
                      <Typography sx={{ fontSize: 10.5, color: TEXT3 }}>{avail[cat.id] || 0} müsait</Typography>
                    </Box>
                    <Typography sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: TEXT }}>₺{cat.price}</Typography>
                  </Box>
                ))}
              </Stack>
              <Box sx={{ display: 'flex', gap: 1.5, mt: 1.5 }}>
                {[{ c: SURFACE2, b: BORDER, l: 'Dolu' }, { c: GREEN, b: 'transparent', l: 'Seçili' }].map(v => (
                  <Box key={v.l} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: 11, color: TEXT3 }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: '3px', background: v.c, border: v.b !== 'transparent' ? `1px solid ${v.b}` : undefined }} />
                    {v.l}
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Box>

        {/* CANVAS */}
        <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <canvas ref={canvasRef}
            onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp}
            onMouseLeave={() => { setIsPanning(false); setIsPainting(false); setTip(null); setHoveredSeat(null); }}
            onWheel={onWheel}
            style={{ width: '100%', height: '100%', cursor: isPanning ? 'grabbing' : hoveredSeat ? 'pointer' : 'grab' }}
          />

          {/* Zoom */}
          <Box sx={{ position: 'absolute', bottom: 20, right: mode === 'preview' ? 280 : 20, display: 'flex', flexDirection: 'column', gap: 0.5, zIndex: 10 }}>
            {[
              { icon: <AddIcon sx={{ fontSize: 18 }} />, fn: () => setVp(v => ({ ...v, zoom: Math.min(3, v.zoom + 0.15) })) },
            ].map((b, i) => (
              <IconButton key={i} onClick={b.fn} sx={{ width: 36, height: 36, borderRadius: 2, background: SURFACE2, border: `1px solid ${BORDER}`, color: TEXT2, '&:hover': { background: SURFACE3 } }}>{b.icon}</IconButton>
            ))}
            <Box sx={{ background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: 1.5, py: 0.5, px: 1, fontSize: 11, fontFamily: 'monospace', color: TEXT2, textAlign: 'center' }}>
              {Math.round(vp.zoom * 100)}%
            </Box>
            <IconButton onClick={() => setVp(v => ({ ...v, zoom: Math.max(0.3, v.zoom - 0.15) }))}
              sx={{ width: 36, height: 36, borderRadius: 2, background: SURFACE2, border: `1px solid ${BORDER}`, color: TEXT2, '&:hover': { background: SURFACE3 } }}>
              <RemoveIcon sx={{ fontSize: 18 }} />
            </IconButton>
            <IconButton onClick={() => setVp({ x: 0, y: 0, zoom: 1 })}
              sx={{ width: 36, height: 36, borderRadius: 2, background: SURFACE2, border: `1px solid ${BORDER}`, color: TEXT2, '&:hover': { background: SURFACE3 } }}>
              <ResetIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
        </Box>

        {/* RIGHT PANEL (Preview) */}
        {mode === 'preview' && (
          <Box sx={{ width: 260, flexShrink: 0, background: SURFACE, borderLeft: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Box sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Typography sx={{ fontSize: 10, fontWeight: 700, color: TEXT3, textTransform: 'uppercase', letterSpacing: 1 }}>
                Seçilen Koltuklar ({selectedSeats.length}/{MAX_SELECT})
              </Typography>

              {selectedSeats.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4, color: TEXT3 }}>
                  <Typography sx={{ fontSize: 28, mb: 0.5, opacity: 0.5 }}>🪑</Typography>
                  <Typography sx={{ fontSize: 12 }}>Koltuk seçmek için haritaya tıklayın</Typography>
                </Box>
              ) : (
                <Stack spacing={0.75}>
                  {selectedSeats.map(s => {
                    const cat = categories.find(c => c.id === s.category);
                    return (
                      <Box key={s.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: 2, p: '8px 10px' }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '2px', background: cat?.color, flexShrink: 0 }} />
                        <Box sx={{ flex: 1 }}>
                          <Typography sx={{ fontSize: 12, fontWeight: 700, color: TEXT }}>{s.sectionName} · {s.rowLabel}-{s.seatNumber}</Typography>
                          <Typography sx={{ fontSize: 10, color: TEXT3 }}>{cat?.name}</Typography>
                        </Box>
                        <Typography sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: GREEN }}>₺{cat?.price}</Typography>
                        <IconButton size="small" onClick={() => setSelectedSeats(prev => prev.filter(ss => ss.id !== s.id))} sx={{ color: TEXT3, p: 0.25, '&:hover': { color: '#ef4444' } }}>
                          <CloseIcon sx={{ fontSize: 13 }} />
                        </IconButton>
                      </Box>
                    );
                  })}
                </Stack>
              )}

              {selectedSeats.length > 0 && (
                <Box sx={{ background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: 2, p: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, mb: 0.75, color: TEXT2 }}>
                    <span>Bilet ({selectedSeats.length})</span><span>₺{price.sub.toLocaleString('tr-TR')}</span>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, mb: 0.75, color: TEXT2 }}>
                    <span>Hizmet (%5)</span><span>₺{price.fee.toLocaleString('tr-TR')}</span>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 800, pt: 1, borderTop: `1px solid ${BORDER}`, color: TEXT }}>
                    <span>Toplam</span>
                    <span style={{ color: GREEN, fontFamily: 'monospace' }}>₺{price.total.toLocaleString('tr-TR')}</span>
                  </Box>
                </Box>
              )}

              <Button fullWidth disabled={!selectedSeats.length} onClick={() => setOrderOpen(true)} startIcon={<CartIcon />}
                sx={{ py: 1.5, borderRadius: 2.5, fontSize: 14, fontWeight: 800, textTransform: 'none', background: selectedSeats.length > 0 ? GREEN : SURFACE3, color: selectedSeats.length > 0 ? '#0a1a12' : TEXT3, '&:hover': { background: '#0ea271' }, '&:disabled': { background: SURFACE3, color: TEXT3 } }}>
                Ödemeye Geç
              </Button>
            </Box>
          </Box>
        )}
      </Box>

      {/* TOOLTIP */}
      {tip && (
        <Box sx={{ position: 'fixed', zIndex: 200, left: tip.x, top: tip.y, background: SURFACE3, border: `1px solid ${BORDER}`, borderRadius: 2, p: '8px 12px', pointerEvents: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.4)', whiteSpace: 'nowrap' }}>
          <Typography sx={{ fontWeight: 700, color: TEXT2, fontSize: 10, textTransform: 'uppercase', mb: 0.25 }}>{tip.seat.sectionName} · Sıra {tip.seat.rowLabel}</Typography>
          <Typography sx={{ fontSize: 13, fontWeight: 800, color: TEXT, mb: 0.5 }}>Koltuk {tip.seat.seatNumber}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: 11, color: TEXT2 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '2px', background: getCategoryColor(tip.seat.category, categories) }} />
            {categories.find(c => c.id === tip.seat.category)?.name}
          </Box>
          {mode === 'preview' && <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, color: TEXT, mt: 0.5 }}>₺{categories.find(c => c.id === tip.seat.category)?.price}</Typography>}
        </Box>
      )}

      {/* ORDER MODAL */}
      <Dialog open={orderOpen} onClose={() => setOrderOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 4, boxShadow: '0 20px 60px rgba(0,0,0,0.6)' } }}
        slotProps={{ backdrop: { sx: { backdropFilter: 'blur(6px)' } } }}>
        <DialogTitle sx={{ px: 3, pt: 2.5, pb: 0 }}>
          <Typography sx={{ fontSize: 18, fontWeight: 800, color: TEXT }}><TicketIcon sx={{ fontSize: 20, mr: 1, verticalAlign: 'text-bottom', color: GREEN }} />Sipariş Özeti</Typography>
          <Typography sx={{ fontSize: 13, color: TEXT3, mt: 0.5 }}>{venue.name}</Typography>
        </DialogTitle>
        <DialogContent sx={{ px: 3, py: 2.5 }}>
          <Stack spacing={1} sx={{ mb: 2 }}>
            {selectedSeats.map(s => {
              const cat = categories.find(c => c.id === s.category);
              return (
                <Box key={s.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, background: SURFACE2, borderRadius: 2 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '3px', background: cat?.color, flexShrink: 0 }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{s.sectionName} · {s.rowLabel}-{s.seatNumber}</Typography>
                    <Typography sx={{ fontSize: 11, color: TEXT3 }}>{cat?.name}</Typography>
                  </Box>
                  <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, color: GREEN }}>₺{cat?.price}</Typography>
                </Box>
              );
            })}
          </Stack>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.75, background: SURFACE3, borderRadius: 2 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: TEXT }}>Ödenecek Tutar</Typography>
            <Typography sx={{ fontSize: 22, fontWeight: 800, fontFamily: 'monospace', color: GREEN }}>₺{price.total.toLocaleString('tr-TR')}</Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOrderOpen(false)} sx={{ px: 2, py: 1, borderRadius: 2, fontSize: 13, fontWeight: 600, textTransform: 'none', color: TEXT2, background: SURFACE2, border: `1px solid ${BORDER}` }}>Geri</Button>
          <Button onClick={() => { setOrderOpen(false); enqueueSnackbar('Ödeme sayfasına yönlendiriliyorsunuz...', { variant: 'success' }); }}
            sx={{ px: 2, py: 1, borderRadius: 2, fontSize: 13, fontWeight: 600, textTransform: 'none', color: '#0a1a12', background: GREEN, '&:hover': { background: '#0ea271' } }}>
            Ödemeye Geç
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SeatMapDesigner;
