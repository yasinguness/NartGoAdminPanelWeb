import { useState, useEffect } from 'react';
import {
  Paper, Typography, Stack, Button, Box, alpha, useTheme, Grid, LinearProgress, Chip,
} from '@mui/material';
import {
  OpenInNew as OpenIcon, QrCodeScanner as QrIcon,
  CheckCircle as CheckedIcon, Schedule as ScheduleIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { EventResponseDTO } from '../../../types/events/eventModel';
import { adminOperationsService } from '../../../services/admin/adminOperationsService';
import { SectionLoading } from './_shared';

interface CheckInStats {
  totalTickets?: number;
  checkedInCount?: number;
  pendingCount?: number;
  lastCheckInAt?: string;
}

export default function CheckInSection({ event }: { event: EventResponseDTO }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const [stats, setStats] = useState<CheckInStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    adminOperationsService.getCheckInStats(event.id)
      .then((res: any) => {
        setStats(res?.data || res || {});
      })
      .catch(() => setStats({}))
      .finally(() => setLoading(false));
  }, [event.id]);

  if (loading) return <SectionLoading message="Check-in istatistikleri yükleniyor..." />;

  const total = stats?.totalTickets || 0;
  const checkedIn = stats?.checkedInCount || 0;
  const pending = stats?.pendingCount ?? Math.max(0, total - checkedIn);
  const pct = total > 0 ? (checkedIn / total) * 100 : 0;

  return (
    <Stack spacing={2}>
      {/* Canlı istatistikler */}
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="caption" sx={{ letterSpacing: 1.5, fontSize: 10, fontWeight: 700, color: 'text.secondary' }}>
          CANLI GİRİŞ İSTATİSTİKLERİ
        </Typography>

        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={4}>
            <StatMini icon={<PeopleIcon />} label="Toplam Bilet" value={total} color={theme.palette.primary.main} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <StatMini icon={<CheckedIcon />} label="Giriş Yapan" value={checkedIn} color={theme.palette.success.main} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <StatMini icon={<ScheduleIcon />} label="Bekleyen" value={pending} color={theme.palette.warning.main} />
          </Grid>
        </Grid>

        {/* Progress bar */}
        <Box sx={{ mt: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Giriş Doluluğu
            </Typography>
            <Typography variant="body2" fontWeight={800} sx={{ fontFamily: 'monospace' }}>
              %{pct.toFixed(1)}
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={pct}
            sx={{
              height: 8, borderRadius: 4,
              bgcolor: alpha(theme.palette.success.main, 0.1),
              '& .MuiLinearProgress-bar': { bgcolor: theme.palette.success.main },
            }}
          />
        </Box>

        {stats?.lastCheckInAt && (
          <Chip
            size="small"
            label={`Son giriş: ${new Date(stats.lastCheckInAt).toLocaleTimeString('tr-TR')}`}
            sx={{ mt: 2, fontSize: 11 }}
          />
        )}
      </Paper>

      {/* Canlı izleme CTA */}
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, bgcolor: alpha(theme.palette.success.main, 0.04) }}>
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="subtitle2" fontWeight={700}>Gate Ops — Canlı Giriş İzleme</Typography>
            <Typography variant="body2" color="text.secondary">
              Kapı görevlilerinin yaptığı check-in'leri anlık takip et, sahtecilik uyarılarını gör
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<QrIcon />} onClick={() => navigate('/gate-ops')}>
            Gate Ops Aç
          </Button>
        </Stack>
      </Paper>

      {/* Kapıda durum */}
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="caption" sx={{ letterSpacing: 1.5, fontSize: 10, fontWeight: 700, color: 'text.secondary' }}>
          KAPI DURUMU
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {event.checkInEnabled
            ? 'Check-in açık. Görevliler QR tarayabilir ve manuel giriş yapabilir.'
            : event.eventTime
              ? `Check-in henüz açılmadı. Etkinlik başlamadan 2 saat önce otomatik açılır.`
              : 'Check-in durumu belirsiz.'}
        </Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={<OpenIcon />}
          onClick={() => navigate(`/event-operations/${event.id}`)}
          sx={{ mt: 2 }}
        >
          Operasyon Konsolu
        </Button>
      </Paper>
    </Stack>
  );
}

function StatMini({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Box sx={{
        width: 40, height: 40, borderRadius: 2,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        bgcolor: alpha(color, 0.1), color,
      }}>
        {icon}
      </Box>
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: 700 }}>
          {label}
        </Typography>
        <Typography sx={{ fontFamily: 'serif', fontStyle: 'italic', fontSize: 22, fontWeight: 700, lineHeight: 1 }}>
          {value}
        </Typography>
      </Box>
    </Box>
  );
}
