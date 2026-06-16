import { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Stack,
  Button,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  Checkbox,
  FormControlLabel,
  Menu,
  MenuItem,
  TextField,
  Divider,
} from '@mui/material';
import {
  MouseOutlined as SelectIcon,
  BlockOutlined as BlockIcon,
  CheckCircleOutline as ReleaseIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';

export type SeatRole = 'ADMIN' | 'ORGANIZER';
export type SeatStatus = 'AVAILABLE' | 'RESERVED' | 'SOLD' | 'BLOCKED';

export interface Seat {
  id: string;
  row: string;
  col: number;
  category: string;
  status: SeatStatus;
}

export interface InteractiveSeatMapProps {
  initialRole?: SeatRole;
  eventId?: string;
  onSeatAction?: (action: 'block' | 'release' | 'override', seatIds: string[], reason: string) => Promise<void>;
  eventData?: any;
}

const defaultCategories = [
  { id: '1', name: 'VIP', color: '#9c27b0', total: 0, available: 0 },
  { id: '2', name: 'A Blok', color: '#1976d2', total: 0, available: 0 },
  { id: '3', name: 'B Blok', color: '#2e7d32', total: 0, available: 0 },
  { id: '4', name: 'C Blok', color: '#ed6c02', total: 0, available: 0 },
];

const defaultRows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

export default function InteractiveSeatMap({ initialRole = 'ADMIN', eventId, onSeatAction, eventData }: InteractiveSeatMapProps) {
  const [role, setRole] = useState<SeatRole>(initialRole);
  const [activeTool, setActiveTool] = useState<'select' | 'block' | 'release' | 'override'>('select');
  const [selectedSeats, setSelectedSeats] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState<Record<string, boolean>>({
    AVAILABLE: true,
    RESERVED: true,
    SOLD: true,
    BLOCKED: true,
  });
  const [reason, setReason] = useState<string>('');
  const [roleAnchorEl, setRoleAnchorEl] = useState<null | HTMLElement>(null);
  const [categories, setCategories] = useState(defaultCategories);
  const [auditLogs, setAuditLogs] = useState<{ time: string; actor: string; action: string }[]>([]);
  const [seatRows, setSeatRows] = useState(defaultRows);
  const [, setLoading] = useState(false);

  // Generate fallback seats from rows
  const generateSeats = (rows: string[]): Seat[] => {
    const seats: Seat[] = [];
    rows.forEach((r, rIdx) => {
      const cat = categories.length > 3 ? categories[Math.min(rIdx < 2 ? 0 : rIdx < 4 ? 1 : rIdx < 6 ? 2 : 3, categories.length - 1)].name : 'Standart';
      for (let c = 1; c <= 16; c++) {
        seats.push({ id: `${r}-${c}`, row: r, col: c, category: cat, status: 'AVAILABLE' });
      }
    });
    return seats;
  };

  const [seats, setSeats] = useState<Seat[]>(() => generateSeats(defaultRows));

  // Fetch real seat data if eventId provided
  useEffect(() => {
    if (!eventId) return;
    (async () => {
      setLoading(true);
      try {
        const { api } = await import('../../../services/api');
        const [seatMapRes, occupiedRes, reservedRes, auditRes] = await Promise.allSettled([
          api.get(`/tickets/seats/events/${eventId}/map`),
          api.get(`/tickets/seats/events/${eventId}/occupied`),
          api.get(`/tickets/seats/events/${eventId}/reserved`),
          api.get(`/tickets/admin/events/${eventId}/seats/audit`),
        ]);

        const seatMap = seatMapRes.status === 'fulfilled' ? seatMapRes.value.data?.data : null;
        const occupied = occupiedRes.status === 'fulfilled' ? (occupiedRes.value.data?.data || []) : [];
        const reserved = reservedRes.status === 'fulfilled' ? (reservedRes.value.data?.data || []) : [];
        const auditData = auditRes.status === 'fulfilled' ? (auditRes.value.data?.data || []) : [];

        if (seatMap?.categories?.length > 0) {
          const cats = seatMap.categories.map((c: any, i: number) => ({
            id: c.categoryId || String(i),
            name: c.categoryName || `Kategori ${i + 1}`,
            color: ['#9c27b0', '#1976d2', '#2e7d32', '#ed6c02', '#d32f2f'][i % 5],
            total: c.rows?.reduce((sum: number, r: any) => sum + (r.availableSeats?.length || 0) + (r.occupiedSeats?.length || 0), 0) || 0,
            available: c.rows?.reduce((sum: number, r: any) => sum + (r.availableSeats?.length || 0), 0) || 0,
          }));
          setCategories(cats);

          const newSeats: Seat[] = [];
          seatMap.categories.forEach((cat: any) => {
            cat.rows?.forEach((row: any) => {
              (row.availableSeats || []).forEach((seatNum: number) => {
                const id = `${cat.categoryId}_${row.rowLabel}_${seatNum}`;
                const isOccupied = occupied.includes(id);
                const isReserved = reserved.includes(id);
                newSeats.push({
                  id,
                  row: row.rowLabel,
                  col: seatNum,
                  category: cat.categoryName,
                  status: isOccupied ? 'SOLD' : isReserved ? 'RESERVED' : 'AVAILABLE',
                });
              });
              (row.occupiedSeats || []).forEach((seatNum: number) => {
                newSeats.push({
                  id: `${cat.categoryId}_${row.rowLabel}_${seatNum}`,
                  row: row.rowLabel,
                  col: seatNum,
                  category: cat.categoryName,
                  status: 'SOLD',
                });
              });
            });
          });
          if (newSeats.length > 0) {
            setSeats(newSeats);
            const uniqueRows = [...new Set(newSeats.map(s => s.row))].sort();
            setSeatRows(uniqueRows);
          }
        }

        if (Array.isArray(auditData) && auditData.length > 0) {
          setAuditLogs(auditData.slice(0, 5).map((e: any) => ({
            time: e.createdAt ? new Date(e.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '',
            actor: e.performedBy || e.userEmail || 'sistem',
            action: e.description || e.action || '',
          })));
        }
      } catch { /* silently handle - keep generated seats */ }
      setLoading(false);
    })();
  }, [eventId]);

  const stats = useMemo(() => {
    return {
      AVAILABLE: seats.filter((s) => s.status === 'AVAILABLE').length,
      RESERVED: seats.filter((s) => s.status === 'RESERVED').length,
      SOLD: seats.filter((s) => s.status === 'SOLD').length,
      BLOCKED: seats.filter((s) => s.status === 'BLOCKED').length,
    };
  }, [seats]);

  const handleSeatClick = (seatId: string) => {
    const seat = seats.find(s => s.id === seatId);
    if (!seat) return;
    
    // Select tool logic
    setSelectedSeats(prev => {
      const nw = new Set(prev);
      if (nw.has(seatId)) nw.delete(seatId);
      else nw.add(seatId);
      return nw;
    });
  };

  const applyAction = async (actionType: 'block' | 'release' | 'override') => {
    if (!reason.trim() || selectedSeats.size === 0) return;

    const previousSeats = seats;

    // Optimistic UI update for the mockup demonstration
    setSeats(prev => prev.map(s => {
      if (selectedSeats.has(s.id)) {
        if (actionType === 'block') return { ...s, status: 'BLOCKED' };
        if (actionType === 'release') return { ...s, status: 'AVAILABLE' };
        // override might be complex, default to SOLD or AVAILABLE for demo
      }
      return s;
    }));

    if (onSeatAction) {
      try {
        await onSeatAction(actionType, Array.from(selectedSeats), reason);
      } catch {
        setSeats(previousSeats);
        return;
      }
    }
    
    setSelectedSeats(new Set());
    setReason('');
  };

  const getStatusColor = (status: SeatStatus) => {
    switch (status) {
      case 'AVAILABLE': return '#4caf50';
      case 'RESERVED': return '#c49000';
      case 'SOLD': return '#1976d2';
      case 'BLOCKED': return '#bdbdbd';
      default: return '#eee';
    }
  };
  
  const getStatusLabel = (status: SeatStatus) => {
    switch (status) {
      case 'AVAILABLE': return 'Müsait';
      case 'RESERVED': return 'Rezerve';
      case 'SOLD': return 'Satıldı';
      case 'BLOCKED': return 'Bloklu';
      default: return '';
    }
  }

  // Row selection mock
  const [rowMenuAnchor, setRowMenuAnchor] = useState<null|HTMLElement>(null);
  
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '800px', backgroundColor: 'background.default' }}>
      {/* Top Meta Bar */}
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e0e0e0', bgcolor: 'white' }}>
        <Typography variant="body2" color="text.secondary">
          Eventler › <strong>{eventData?.name || 'Zorlu PSM — Yaz Konseri'}</strong> › Koltuk haritası
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="body2" color="text.secondary">28 Haz 2026 · {seats.length} koltuk</Typography>
          <Chip label="Satışta" size="small" color="success" sx={{ borderRadius: 1 }} />
          <Button 
            variant="outlined" 
            size="small" 
            endIcon={<MoreVertIcon />}
            sx={{ ml: 2, borderRadius: 10, textTransform: 'none', bgcolor: '#e3f2fd' }}
            onClick={(e) => setRoleAnchorEl(e.currentTarget)}
          >
            Rol: <strong>{role}</strong> — tıkla değiştir
          </Button>
          <Menu anchorEl={roleAnchorEl} open={Boolean(roleAnchorEl)} onClose={() => setRoleAnchorEl(null)}>
            <MenuItem onClick={() => { setRole('ADMIN'); setRoleAnchorEl(null); }}>ADMIN</MenuItem>
            <MenuItem onClick={() => { setRole('ORGANIZER'); setRoleAnchorEl(null); }}>ORGANIZER</MenuItem>
          </Menu>
        </Stack>
      </Box>

      {/* 3 Column Layout */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* LEFT PANEL */}
        <Box sx={{ width: 280, p: 2, bgcolor: 'white', borderRight: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {/* Araçlar */}
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600} letterSpacing={1}>ARAÇ</Typography>
            <ToggleButtonGroup
              orientation="vertical"
              value={activeTool}
              exclusive
              onChange={(_, val) => val && setActiveTool(val)}
              fullWidth
              sx={{ mt: 1, gap: 1, '& .MuiToggleButtonGroup-grouped': { border: '1px solid #e0e0e0 !important', borderRadius: '8px !important', textTransform: 'none', justifyContent: 'flex-start', px: 2, py: 1.5 } }}
            >
              <ToggleButton value="select"><SelectIcon sx={{mr: 1, fontSize: 20}}/> Seç</ToggleButton>
              <ToggleButton value="block"><BlockIcon sx={{mr: 1, fontSize: 20}}/> Blokla</ToggleButton>
              <ToggleButton value="release"><ReleaseIcon sx={{mr: 1, fontSize: 20}}/> Serbest bırak</ToggleButton>
              {role === 'ADMIN' && (
                <ToggleButton value="override"><MoreVertIcon sx={{mr: 1, fontSize: 20}}/> Override</ToggleButton>
              )}
            </ToggleButtonGroup>
          </Box>

          {/* Kategoriler */}
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600} letterSpacing={1}>KATEGORİLER</Typography>
            <Stack spacing={1.5} sx={{ mt: 2 }}>
              {categories.map(cat => (
                <Box key={cat.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: cat.color }} />
                    <Typography variant="body2">{cat.name}</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">{cat.total - cat.available}/{cat.total}</Typography>
                </Box>
              ))}
            </Stack>
          </Box>

          {/* Göster / Filtre */}
          <Box sx={{ mt: 'auto' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} letterSpacing={1}>GÖSTER</Typography>
            <Stack>
              <FormControlLabel control={<Checkbox size="small" checked={showFilters['AVAILABLE']} onChange={(e) => setShowFilters(prev => ({...prev, AVAILABLE: e.target.checked}))} />} label={<Typography variant="body2">Müsait</Typography>} />
              <FormControlLabel control={<Checkbox size="small" checked={showFilters['RESERVED']} onChange={(e) => setShowFilters(prev => ({...prev, RESERVED: e.target.checked}))} />} label={<Typography variant="body2">Rezerve</Typography>} />
            </Stack>
          </Box>
        </Box>

        {/* MIDDLE PANEL (Map) */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: '#f5f7f9', overflow: 'hidden' }}>
          {/* Top Toolbar */}
          <Box sx={{ p: 2, display: 'flex', gap: 1, borderBottom: '1px solid #e0e0e0', bgcolor: 'white' }}>
            <Button variant="outlined" size="small" sx={{ borderRadius: 2, color: 'text.primary', borderColor: '#cfd8dc' }} onClick={() => setSelectedSeats(new Set(seats.map(s => s.id)))}>Tümünü seç</Button>
            <Button variant="outlined" size="small" sx={{ borderRadius: 2, color: 'text.primary', borderColor: '#cfd8dc' }} onClick={(e) => setRowMenuAnchor(e.currentTarget)}>Sıra seç (A)</Button>
            <Menu anchorEl={rowMenuAnchor} open={Boolean(rowMenuAnchor)} onClose={() => setRowMenuAnchor(null)}>
              {seatRows.map(r => (
                <MenuItem key={r} onClick={() => { setSelectedSeats(new Set(seats.filter(s => s.row === r).map(s => s.id))); setRowMenuAnchor(null); }}>Sıra {r}</MenuItem>
              ))}
            </Menu>
            <Button variant="outlined" size="small" sx={{ borderRadius: 2, color: 'text.primary', borderColor: '#cfd8dc' }} onClick={() => { setReason('Toplu bloklama'); applyAction('block'); }}>Seçiliyi blokla</Button>
            <Button variant="outlined" size="small" sx={{ borderRadius: 2, color: 'text.primary', borderColor: '#cfd8dc' }} onClick={() => { setReason('Toplu serbest bırakma'); applyAction('release'); }}>Seçiliyi serbest bırak</Button>
            {role === 'ADMIN' && (
              <Button variant="outlined" size="small" sx={{ borderRadius: 2, color: 'text.primary', borderColor: '#cfd8dc' }}>Admin override</Button>
            )}
            <Button variant="text" size="small" sx={{ borderRadius: 2, ml: 'auto', color: 'text.secondary' }} onClick={() => setSelectedSeats(new Set())}>Seçimi temizle</Button>
          </Box>

          {/* Map Area */}
          <Box sx={{ flex: 1, p: 4, overflow: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            
            {/* Sahne */}
            <Paper variant="outlined" sx={{ width: 400, py: 2, textAlign: 'center', mb: 6, bgcolor: '#fafafa', color: 'text.secondary', letterSpacing: 2 }}>
              SAHNE
            </Paper>

            {/* Grid */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {seatRows.map(row => {
                const rowSeats = seats.filter(s => s.row === row);
                const leftSeats = rowSeats.filter(s => s.col <= 8);
                const rightSeats = rowSeats.filter(s => s.col > 8);

                return (
                  <Box key={row} sx={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <Typography variant="caption" sx={{ width: 20, textAlign: 'right', color: 'text.secondary' }}>{row}</Typography>
                    
                    <Box sx={{ display: 'flex', gap: '6px' }}>
                      {leftSeats.map(seat => (
                        <SeatBlock 
                          key={seat.id} 
                          seat={seat} 
                          selected={selectedSeats.has(seat.id)} 
                          onClick={() => handleSeatClick(seat.id)}
                          visible={showFilters[seat.status]}
                        />
                      ))}
                    </Box>

                    {/* Corridor Gap */}
                    <Box sx={{ width: 20 }} />

                    <Box sx={{ display: 'flex', gap: '6px' }}>
                      {rightSeats.map(seat => (
                        <SeatBlock 
                          key={seat.id} 
                          seat={seat} 
                          selected={selectedSeats.has(seat.id)} 
                          onClick={() => handleSeatClick(seat.id)}
                          visible={showFilters[seat.status]}
                        />
                      ))}
                    </Box>
                  </Box>
                )
              })}
            </Box>

            {/* Legend Map Bottom */}
            <Box sx={{ mt: 8, display: 'flex', gap: 3, alignItems: 'center', p: 2, bgcolor: 'white', borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              {['AVAILABLE', 'RESERVED', 'SOLD', 'BLOCKED'].map(status => (
                <Box key={status} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 16, height: 16, borderRadius: 1, bgcolor: getStatusColor(status as SeatStatus) }} />
                  <Typography variant="body2" color="text.secondary">{getStatusLabel(status as SeatStatus)}</Typography>
                </Box>
              ))}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 16, height: 16, borderRadius: 1, bgcolor: '#4caf50', border: '2px solid #ff3d00' }} />
                <Typography variant="body2" color="text.secondary">Seçili</Typography>
              </Box>
            </Box>

          </Box>
        </Box>

        {/* RIGHT PANEL (Inspector) */}
        <Box sx={{ width: 320, bgcolor: 'white', borderLeft: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column' }}>
          
          <Box sx={{ p: 3, flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
            {selectedSeats.size === 0 ? (
              <>
                <Typography variant="caption" color="text.secondary" fontWeight={600} letterSpacing={1}>ÖZET</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f1f8e9', borderColor: '#c5e1a5' }}>
                      <Typography variant="h5" sx={{ color: '#2e7d32', fontWeight: 'bold' }}>{stats.AVAILABLE}</Typography>
                      <Typography variant="body2" color="text.secondary">Müsait</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6}>
                    <Paper variant="outlined" sx={{ p: 2, bgcolor: '#fff8e1', borderColor: '#ffe082' }}>
                      <Typography variant="h5" sx={{ color: '#ff8f00', fontWeight: 'bold' }}>{stats.RESERVED}</Typography>
                      <Typography variant="body2" color="text.secondary">Rezerve</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6}>
                    <Paper variant="outlined" sx={{ p: 2, bgcolor: '#e3f2fd', borderColor: '#90caf9' }}>
                      <Typography variant="h5" sx={{ color: '#1565c0', fontWeight: 'bold' }}>{stats.SOLD}</Typography>
                      <Typography variant="body2" color="text.secondary">Satıldı</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6}>
                    <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f5f5f5', borderColor: '#e0e0e0' }}>
                      <Typography variant="h5" sx={{ color: '#757575', fontWeight: 'bold' }}>{stats.BLOCKED}</Typography>
                      <Typography variant="body2" color="text.secondary">Bloklu</Typography>
                    </Paper>
                  </Grid>
                </Grid>

                <Divider sx={{ my: 2 }} />
                
                <Box sx={{ py: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.5 }}>
                  <SelectIcon sx={{ fontSize: 40, mb: 2 }} />
                  <Typography variant="body2" align="center">Bir koltuğa tıklayın veya çoklu seçim yapın</Typography>
                </Box>
              </>
            ) : (
              <>
                <Typography variant="caption" color="text.secondary" fontWeight={600} letterSpacing={1}>İNCELE</Typography>
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {selectedSeats.size === 1 ? `${Array.from(selectedSeats)[0]} Seçili` : `${selectedSeats.size} Koltuk Seçili`}
                  </Typography>
                  {selectedSeats.size > 1 && (
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap">
                      {['AVAILABLE', 'RESERVED', 'SOLD', 'BLOCKED'].map(status => {
                        const count = Array.from(selectedSeats).filter(id => seats.find(s => s.id === id)?.status === status).length;
                        if (count === 0) return null;
                        return (
                          <Chip 
                            key={status} 
                            size="small" 
                            label={`${count} ${getStatusLabel(status as SeatStatus)}`} 
                            sx={{ bgcolor: getStatusColor(status as SeatStatus) + '20', color: getStatusColor(status as SeatStatus), fontWeight: 600, border: '1px solid', borderColor: getStatusColor(status as SeatStatus) + '50' }}
                          />
                        );
                      })}
                    </Stack>
                  )}
                  {selectedSeats.size === 1 && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Kategori: {seats.find(s => s.id === Array.from(selectedSeats)[0])?.category} <br/>
                      Durum: {getStatusLabel(seats.find(s => s.id === Array.from(selectedSeats)[0])?.status as SeatStatus)}
                    </Typography>
                  )}
                </Box>
                
                <Divider />

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Typography variant="subtitle2">Aksiyon Seçin</Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Button variant="outlined" size="small" onClick={() => setActiveTool('block')} color={activeTool === 'block' ? 'primary' : 'inherit'}>Blokla</Button>
                    <Button variant="outlined" size="small" onClick={() => setActiveTool('release')} color={activeTool === 'release' ? 'primary' : 'inherit'}>Serbest Bırak</Button>
                    {role === 'ADMIN' && <Button variant="outlined" size="small" onClick={() => setActiveTool('override')} color={activeTool === 'override' ? 'primary' : 'inherit'}>Admin Override</Button>}
                  </Stack>
                  <TextField 
                    label="Neden? (Zorunlu)" 
                    size="small" 
                    fullWidth 
                    required 
                    multiline 
                    rows={2}
                    value={reason} 
                    onChange={e => setReason(e.target.value)} 
                    helperText="Bu alan işlem günlüğüne yazılacaktır."
                  />
                  <Button 
                    variant="contained" 
                    disableElevation 
                    disabled={!reason.trim()}
                    onClick={() => applyAction(activeTool === 'select' ? 'block' : activeTool)}
                  >
                    Uygula
                  </Button>
                </Box>
              </>
            )}
          </Box>

          <Box sx={{ borderTop: '1px solid #e0e0e0', p: 3, bgcolor: '#fafafa' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} letterSpacing={1}>SON İŞLEMLER</Typography>
            <Stack spacing={1.5} sx={{ mt: 2 }}>
              {auditLogs.map((log, i) => (
                 <Box key={i} sx={{ display: 'flex', gap: 2, fontSize: '0.8rem' }}>
                    <Typography sx={{ color: 'text.secondary', width: 40 }}>{log.time}</Typography>
                    <Typography sx={{ fontWeight: 600 }}>{log.actor}</Typography>
                    <Typography sx={{ color: 'text.secondary' }}>{log.action}</Typography>
                 </Box>
              ))}
            </Stack>
          </Box>
        </Box>
      </Box>
    </Box>
  );

  function SeatBlock({ seat, selected, onClick, visible }: { seat: Seat, selected: boolean, onClick: () => void, visible: boolean }) {
    if (!visible) {
      return <Box sx={{ width: 24, height: 24 }} />; // Placeholder to keep grid layout
    }
    
    return (
      <Box
        onClick={onClick}
        sx={{
          width: 24,
          height: 24,
          borderRadius: 0.5,
          bgcolor: getStatusColor(seat.status),
          cursor: 'pointer',
          border: selected ? '2px solid #ff3d00' : 'none',
          boxSizing: 'border-box',
          opacity: seat.status === 'BLOCKED' ? 0.7 : 1,
          '&:hover': {
            transform: 'scale(1.1)',
            transition: 'transform 0.1s',
            zIndex: 1,
          }
        }}
        title={`${seat.category} - ${seat.id} (${getStatusLabel(seat.status)})`}
      />
    );
  }
}
