/**
 * SeatMapOverview — Compact seat map visualization for TicketManagement.
 * Shows seat occupancy grid, category legend, and link to full editor.
 */
import { useState, useEffect, useMemo } from 'react';
import { Box, Typography, Stack, Chip, Paper, alpha, useTheme, Button, Skeleton, Tooltip } from '@mui/material';
import { MapOutlined as MapIcon, OpenInNew as OpenIcon } from '@mui/icons-material';
import { api } from '../../../services/api';

interface SeatData {
  id: string;
  row: string;
  col: number;
  category: string;
  status: 'AVAILABLE' | 'RESERVED' | 'SOLD' | 'BLOCKED' | 'DISABLED';
}

interface CategoryData {
  name: string;
  color: string;
  total: number;
  available: number;
  sold: number;
}

interface AuditEntry {
  time: string;
  actor: string;
  action: string;
}

interface Props {
  eventId: string;
  eventName: string;
}

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: '#22c55e',
  RESERVED: '#f59e0b',
  SOLD: '#ef4444',
  BLOCKED: '#d1d5db',
};

export default function SeatMapOverview({ eventId, eventName }: Props) {
  const theme = useTheme();
  const [seats, setSeats] = useState<SeatData[]>([]);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMap, setHasMap] = useState(false);

  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // Single admin endpoint — returns occupancy + stats + blockedSeats
        const [seatMapRes, auditRes] = await Promise.allSettled([
          api.get(`/tickets/admin/events/${eventId}/seat-map`),
          api.get(`/tickets/admin/events/${eventId}/seats/audit?page=0&size=8`),
        ]);
        if (cancelled) return;

        const seatMap = seatMapRes.status === 'fulfilled' ? seatMapRes.value.data?.data : null;
        const auditData = auditRes.status === 'fulfilled' ? (auditRes.value.data?.data || []) : [];

        if (seatMap?.categories?.length > 0) {
          setHasMap(true);
          const catColors = ['#8b5cf6', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#ec4899'];
          const newSeats: SeatData[] = [];
          const catMap: CategoryData[] = [];

          seatMap.categories.forEach((cat: any, ci: number) => {
            let total = 0, available = 0, sold = 0;
            cat.rows?.forEach((row: any) => {
              (row.availableSeats || []).forEach((seatNum: number) => {
                newSeats.push({ id: `${cat.categoryId}_${row.rowLabel}_${seatNum}`, row: row.rowLabel, col: seatNum, category: cat.categoryName, status: 'AVAILABLE' });
                total++; available++;
              });
              (row.occupiedSeats || []).forEach((seatNum: number) => {
                // Check occupiedSeatDetails for rich status
                const detail = (row.occupiedSeatDetails || []).find((d: any) => d.seatNumber === seatNum);
                const status = detail?.status === 'LOCKED' ? 'RESERVED' : 'SOLD';
                newSeats.push({ id: `${cat.categoryId}_${row.rowLabel}_${seatNum}`, row: row.rowLabel, col: seatNum, category: cat.categoryName, status });
                total++; if (status === 'SOLD') sold++;
              });
              (row.blockedSeats || []).forEach((seatNum: number) => {
                newSeats.push({ id: `${cat.categoryId}_${row.rowLabel}_${seatNum}`, row: row.rowLabel, col: seatNum, category: cat.categoryName, status: 'BLOCKED' });
                total++;
              });
            });
            catMap.push({ name: cat.categoryName || `Kategori ${ci + 1}`, color: catColors[ci % catColors.length], total, available, sold });
          });
          setSeats(newSeats);
          setCategories(catMap);
        }

        if (Array.isArray(auditData) && auditData.length > 0) {
          setAuditLogs(auditData.slice(0, 8).map((e: any) => ({
            time: e.createdAt ? new Date(e.createdAt).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '',
            actor: e.performedBy || e.userEmail || 'sistem',
            action: e.description || e.action || '',
          })));
        }
      } catch { /* no seat map */ }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [eventId]);

  const seatStats = useMemo(() => ({
    total: seats.length,
    available: seats.filter(s => s.status === 'AVAILABLE').length,
    sold: seats.filter(s => s.status === 'SOLD').length,
    reserved: seats.filter(s => s.status === 'RESERVED').length,
    blocked: seats.filter(s => s.status === 'BLOCKED').length,
  }), [seats]);

  const rows = useMemo(() => [...new Set(seats.map(s => s.row))].sort(), [seats]);
  const maxCol = useMemo(() => Math.max(...seats.map(s => s.col), 0), [seats]);

  if (loading) {
    return (
      <Paper sx={{ p: 2.5, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
        <Skeleton variant="text" width={200} height={28} />
        <Skeleton variant="rectangular" height={120} sx={{ mt: 1, borderRadius: 2 }} />
      </Paper>
    );
  }

  if (!hasMap) return null; // No seat map for this event

  const occupancyPct = seatStats.total > 0 ? Math.round(((seatStats.sold + seatStats.reserved) / seatStats.total) * 100) : 0;

  return (
    <Paper sx={{ p: 2.5, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <MapIcon sx={{ fontSize: 20, color: 'primary.main' }} />
          <Typography variant="subtitle2" fontWeight={700}>Koltuk Haritası</Typography>
          <Chip label={`${occupancyPct}% dolu`} size="small" color={occupancyPct > 80 ? 'error' : occupancyPct > 50 ? 'warning' : 'success'} sx={{ height: 20, fontSize: 10, fontWeight: 700 }} />
        </Stack>
        <Button size="small" variant="outlined" endIcon={<OpenIcon sx={{ fontSize: 14 }} />}
          href={`/admin/events/${eventId}/seat-map`}
          sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600, fontSize: 11 }}>
          Düzenle
        </Button>
      </Stack>

      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {/* Seat grid — büyük ve okunabilir */}
        <Box sx={{ flex: 1, minWidth: 280, maxHeight: 320, overflow: 'auto', bgcolor: alpha(theme.palette.background.default, 0.5), borderRadius: 2, p: 2, border: `1px solid ${theme.palette.divider}` }}>
          {/* Stage */}
          <Box sx={{ textAlign: 'center', mb: 1.5 }}>
            <Box sx={{ display: 'inline-block', px: 4, py: 0.5, bgcolor: alpha(theme.palette.primary.main, 0.08), borderRadius: 1, border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}` }}>
              <Typography sx={{ fontSize: 9, fontWeight: 700, color: theme.palette.primary.main, textTransform: 'uppercase', letterSpacing: 1.5 }}>Sahne</Typography>
            </Box>
          </Box>
          {/* Seats */}
          {rows.map(row => (
            <Stack key={row} direction="row" spacing={0.4} justifyContent="center" sx={{ mb: 0.4 }}>
              <Typography sx={{ fontSize: 9, color: theme.palette.text.secondary, width: 16, textAlign: 'right', lineHeight: '10px', mt: '2px', fontWeight: 600 }}>{row}</Typography>
              {seats.filter(s => s.row === row).sort((a, b) => a.col - b.col).map(seat => (
                <Tooltip key={seat.id} title={`${seat.category} · ${seat.row}${seat.col} · ${seat.status === 'AVAILABLE' ? 'Müsait' : seat.status === 'SOLD' ? 'Satıldı' : seat.status === 'RESERVED' ? 'Rezerve' : 'Bloklu'}`} placement="top">
                  <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: STATUS_COLORS[seat.status], opacity: seat.status === 'BLOCKED' ? 0.4 : 0.85, cursor: 'default', transition: 'transform 0.15s', '&:hover': { transform: 'scale(1.4)' } }} />
                </Tooltip>
              ))}
            </Stack>
          ))}
          {/* Legend */}
          <Stack direction="row" spacing={1.5} justifyContent="center" sx={{ mt: 1, pt: 1, borderTop: `1px solid ${theme.palette.divider}` }}>
            {Object.entries(STATUS_COLORS).map(([status, color]) => (
              <Stack key={status} direction="row" spacing={0.3} alignItems="center">
                <Box sx={{ width: 6, height: 6, borderRadius: 0.5, bgcolor: color }} />
                <Typography sx={{ fontSize: 8, color: theme.palette.text.disabled }}>
                  {status === 'AVAILABLE' ? 'Müsait' : status === 'SOLD' ? 'Satıldı' : status === 'RESERVED' ? 'Rezerve' : 'Bloklu'}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Box>

        {/* Right side: categories + stats + logs */}
        <Box sx={{ width: { xs: '100%', md: 280 }, flexShrink: 0 }}>
          {/* Category breakdown */}
          <Stack spacing={1} sx={{ mb: 2 }}>
            {categories.map(cat => {
              const pct = cat.total > 0 ? Math.round((cat.sold / cat.total) * 100) : 0;
              const barColor = pct === 0 ? theme.palette.warning.main : cat.color;
              return (
                <Box key={cat.name}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: cat.color, flexShrink: 0 }} />
                    <Typography sx={{ fontSize: 12, fontWeight: 600, flex: 1 }}>{cat.name}</Typography>
                    <Typography sx={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: pct === 0 ? theme.palette.warning.main : theme.palette.text.secondary }}>
                      {cat.sold}/{cat.total} <span style={{ fontSize: 9, color: theme.palette.text.disabled }}>({pct}%)</span>
                    </Typography>
                  </Box>
                  <Box sx={{ height: 6, borderRadius: 3, bgcolor: alpha(barColor, 0.12), overflow: 'hidden' }}>
                    <Box sx={{ height: '100%', borderRadius: 3, bgcolor: barColor, width: `${Math.max(pct, 2)}%`, transition: 'width 0.3s' }} />
                  </Box>
                </Box>
              );
            })}
          </Stack>

          {/* Quick stats */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.75, mb: 1.5 }}>
            {[
              { label: 'Müsait', value: seatStats.available, color: '#22c55e' },
              { label: 'Satıldı', value: seatStats.sold, color: '#ef4444' },
              { label: 'Rezerve', value: seatStats.reserved, color: '#f59e0b' },
              { label: 'Bloklu', value: seatStats.blocked, color: '#9ca3af' },
            ].map(s => (
              <Box key={s.label} sx={{ p: 0.75, borderRadius: 1.5, bgcolor: alpha(s.color, 0.06), border: `1px solid ${alpha(s.color, 0.15)}`, textAlign: 'center' }}>
                <Typography sx={{ fontSize: 14, fontWeight: 800, fontFamily: 'monospace', color: s.color }}>{s.value}</Typography>
                <Typography sx={{ fontSize: 8, color: theme.palette.text.disabled, fontWeight: 600, textTransform: 'uppercase' }}>{s.label}</Typography>
              </Box>
            ))}
          </Box>




          {/* Recent audit logs */}
          {auditLogs.length > 0 && (
            <Box>
              <Typography sx={{ fontSize: 9, fontWeight: 700, color: theme.palette.text.disabled, textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.75 }}>Son İşlemler</Typography>
              <Stack spacing={0.5}>
                {auditLogs.slice(0, 5).map((log, i) => {
                  const actionLower = (log.action || '').toLowerCase();
                  const logColor = actionLower.includes('başarılı') || actionLower.includes('oluşturuldu') || actionLower.includes('success')
                    ? theme.palette.success.main
                    : actionLower.includes('iptal') || actionLower.includes('cancel') || actionLower.includes('failed')
                      ? theme.palette.error.main
                      : actionLower.includes('iade') || actionLower.includes('refund')
                        ? theme.palette.warning.main
                        : theme.palette.text.secondary;
                  // UUID → kısa bilet no
                  const shortAction = (log.action || '').replace(/[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{6}/gi, (m: string) => `NGT-${m.slice(-6)}`);
                  return (
                    <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                      <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: logColor, mt: '5px', flexShrink: 0 }} />
                      <Typography sx={{ fontSize: 9, color: theme.palette.text.disabled, fontFamily: 'monospace', flexShrink: 0, mt: '1px' }}>{log.time}</Typography>
                      <Box>
                        <Typography sx={{ fontSize: 10, color: logColor, lineHeight: 1.3, fontWeight: 500 }}>{shortAction}</Typography>
                        <Typography sx={{ fontSize: 8, color: theme.palette.text.disabled }}>{log.actor}</Typography>
                      </Box>
                    </Box>
                  );
                })}
              </Stack>
            </Box>
          )}
        </Box>
      </Box>
    </Paper>
  );
}
