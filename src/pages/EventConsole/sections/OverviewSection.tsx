/**
 * OverviewSection — Genel Bakış (mockup ana ekran).
 * Stats kartları + canlı koltuk haritası + panel özellikleri listesi.
 */
import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Stack, Grid, alpha, useTheme, CircularProgress,
} from '@mui/material';
import { ticketService } from '../../../services/ticket/ticketService';
import { EventResponseDTO } from '../../../types/events/eventModel';
import { calculateNetRevenue, organizerRetainPct } from '../../../config/revenueConfig';

interface Props {
  event: EventResponseDTO;
}

interface SeatCell {
  status: 'available' | 'sold' | 'locked' | 'disabled' | 'vip';
  color?: string;
}

interface StatData {
  sold: number;
  capacity: number;
  grossRevenue: number;
  netRevenue: number;
  checkedIn: number;
}

export default function OverviewSection({ event }: Props) {
  const theme = useTheme();
  const [seatMap, setSeatMap] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatData>({
    sold: 0,
    capacity: event.maxParticipants || 0,
    grossRevenue: 0,
    netRevenue: 0,
    checkedIn: 0,
  });

  useEffect(() => {
    setLoading(true);
    ticketService.getAdminSeatMap(event.id)
      .then(res => {
        if (res.success && res.data) {
          setSeatMap(res.data);
          const s = res.data.stats;
          const gross = Number(s?.currentRevenue) || 0;
          setStats({
            sold: s?.occupiedSeats || 0,
            capacity: s?.totalSeats || event.maxParticipants || 0,
            grossRevenue: gross,
            netRevenue: calculateNetRevenue(gross),
            checkedIn: 0,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [event.id]);

  const occupancyPct = stats.capacity > 0 ? (stats.sold / stats.capacity) * 100 : 0;
  const isPaid = event.isPaid === true;

  // Mock seat grid from seatMap
  const buildSeatGrid = (): SeatCell[][] => {
    if (!seatMap?.categories) {
      // Placeholder 8x20 grid
      return Array.from({ length: 8 }, () =>
        Array.from({ length: 20 }, (): SeatCell => ({ status: 'available' }))
      );
    }

    const rows: SeatCell[][] = [];
    seatMap.categories.forEach((cat: any) => {
      (cat.rows || []).forEach((row: any) => {
        const availableSet = new Set(row.availableSeats || []);
        const occupiedSet = new Set(row.occupiedSeats || []);
        const blockedSet = new Set(row.blockedSeats || []);
        const all = new Set<number>([
          ...(row.availableSeats || []),
          ...(row.occupiedSeats || []),
          ...(row.blockedSeats || []),
        ]);
        const seats: SeatCell[] = Array.from(all).sort((a, b) => a - b).map(n => {
          if (blockedSet.has(n)) return { status: 'disabled' };
          if (occupiedSet.has(n)) return { status: 'sold' };
          if (availableSet.has(n)) {
            const isVip = cat.categoryName?.toLowerCase().includes('vip');
            return { status: isVip ? 'vip' : 'available' };
          }
          return { status: 'available' };
        });
        rows.push(seats);
      });
    });
    return rows.length > 0 ? rows : Array.from({ length: 8 }, () =>
      Array.from({ length: 20 }, (): SeatCell => ({ status: 'available' }))
    );
  };

  const seatGrid = buildSeatGrid();
  const gridDims = seatGrid.length > 0 ? `${seatGrid.length}×${Math.max(...seatGrid.map(r => r.length))}` : '—';

  const panelFeatures = [
    'Canlı koltuk izleme',
    'Satış raporu',
    'Gelir takibi',
    'Katılımcı listesi',
    'Kapı görevlisi atama',
    'Manuel check-in',
    '2 saat önce oto. açılır',
    'Manuel koltuk satışı',
    'Sponsor / basın davetli',
    'Giriş kayıtları tablosu',
    'CSV dışa aktarma',
    'Toplu bildirim',
  ];

  return (
    <Box>
      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <StatCard
          label="Satılan"
          primary={`${stats.sold}`}
          secondary={`/ ${stats.capacity}`}
          sub={`%${occupancyPct.toFixed(1)} doluluk`}
          accent="#C9A227"
        />
        <StatCard
          label="Brüt Gelir"
          primary={`${stats.grossRevenue.toLocaleString('tr-TR')} ₺`}
          sub={isPaid ? 'Son 24 sa +18' : 'Ücretsiz etkinlik'}
        />
        <StatCard
          label="Derneğe (Tahmini)"
          primary={`${Math.round(stats.netRevenue).toLocaleString('tr-TR')} ₺`}
          sub={`Net (%${organizerRetainPct().toFixed(0)} kalıyor)`}
          accent="#C9A227"
        />
        <StatCard
          label="Girişler"
          primary={`${stats.checkedIn}`}
          sub="Check-in 17:30'da açılır"
        />
      </Grid>

      {/* Seat Map + Panel Features */}
      <Grid container spacing={2}>
        <Grid item xs={12} lg={8}>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="caption" sx={{ letterSpacing: 1.5, fontSize: 10, fontWeight: 700, color: 'text.secondary' }}>
                KOLTUK HARİTASI — CANLI
              </Typography>
              <Typography variant="caption" color="text.disabled" sx={{ fontSize: 11 }}>
                Tiyatro · {gridDims}
              </Typography>
            </Stack>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
            ) : (
              <>
                {/* Sahne */}
                <Box sx={{ textAlign: 'center', mb: 2 }}>
                  <Typography variant="caption" sx={{ letterSpacing: 6, fontSize: 10, fontWeight: 700, color: 'text.secondary' }}>
                    SAHNE
                  </Typography>
                  <Box sx={{ height: 2, bgcolor: 'text.primary', mx: 'auto', mt: 0.5, maxWidth: 500 }} />
                </Box>

                {/* Grid */}
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                  {seatGrid.map((row, ri) => (
                    <Box key={ri} sx={{ display: 'flex', gap: 0.5 }}>
                      {row.map((seat, si) => (
                        <Box key={si} sx={{
                          width: 14, height: 14,
                          borderRadius: 0.4,
                          bgcolor: seat.status === 'sold' ? '#1B2A20'
                            : seat.status === 'disabled' ? alpha(theme.palette.text.disabled, 0.2)
                            : seat.status === 'vip' ? '#C9A227'
                            : alpha('#4CAF50', 0.35),
                        }} />
                      ))}
                    </Box>
                  ))}
                </Box>

                {/* Legend */}
                <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 3 }}>
                  <LegendDot color={alpha('#4CAF50', 0.35)} label="Boş" />
                  <LegendDot color="#1B2A20" label="Satıldı" />
                  <LegendDot color="#C9A227" label="VIP" />
                  <LegendDot color={alpha(theme.palette.text.disabled, 0.3)} label="Blok" />
                </Stack>
              </>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, height: '100%' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="caption" sx={{ letterSpacing: 1.5, fontSize: 10, fontWeight: 700, color: 'text.secondary' }}>
                PANEL ÖZELLİKLERİ
              </Typography>
              <Typography variant="caption" color="text.disabled" sx={{ fontSize: 11 }}>Tam liste</Typography>
            </Stack>

            <Stack spacing={0.8}>
              {panelFeatures.map((f, i) => (
                <Typography key={i} variant="body2" sx={{ fontSize: 13, color: 'text.secondary' }}>
                  {f}
                </Typography>
              ))}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

// ── Sub-components ──
interface StatCardProps {
  label: string;
  primary: string;
  secondary?: string;
  sub?: string;
  accent?: string;
}

function StatCard({ label, primary, secondary, sub, accent }: StatCardProps) {
  return (
    <Grid item xs={12} sm={6} md={3}>
      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, height: '100%' }}>
        <Typography variant="caption" sx={{
          letterSpacing: 1.5, fontSize: 10, fontWeight: 700,
          color: 'text.secondary', display: 'block', mb: 1.5,
        }}>
          {label.toUpperCase()}
        </Typography>
        <Stack direction="row" alignItems="baseline" spacing={0.5}>
          <Typography sx={{
            fontFamily: 'serif', fontStyle: 'normal', fontSize: 28,
            fontWeight: 700, color: accent || 'text.primary', lineHeight: 1,
          }}>
            {primary}
          </Typography>
          {secondary && (
            <Typography sx={{ fontFamily: 'serif', fontSize: 22, color: 'text.secondary' }}>
              {secondary}
            </Typography>
          )}
        </Stack>
        {sub && (
          <Typography variant="caption" color="text.disabled" sx={{ fontSize: 11, mt: 1, display: 'block' }}>
            {sub}
          </Typography>
        )}
      </Paper>
    </Grid>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <Stack direction="row" spacing={0.8} alignItems="center">
      <Box sx={{ width: 10, height: 10, borderRadius: 0.3, bgcolor: color }} />
      <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary' }}>{label}</Typography>
    </Stack>
  );
}
