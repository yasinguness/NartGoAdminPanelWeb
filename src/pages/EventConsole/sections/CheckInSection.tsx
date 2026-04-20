import { useState, useEffect, useMemo } from 'react';
import {
  Paper, Typography, Stack, Button, Box, alpha, useTheme, Grid, LinearProgress, Chip,
  Table, TableHead, TableRow, TableCell, TableBody, TextField, InputAdornment, IconButton, Tooltip, CircularProgress,
} from '@mui/material';
import {
  OpenInNew as OpenIcon,
  CheckCircle as CheckedIcon, Schedule as ScheduleIcon,
  People as PeopleIcon, Search as SearchIcon, Refresh as RefreshIcon,
  FileDownload as DownloadIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { format } from 'date-fns';
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
  const { enqueueSnackbar } = useSnackbar();
  const [stats, setStats] = useState<CheckInStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsSearch, setLogsSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    adminOperationsService.getCheckInStats(event.id)
      .then((res: any) => {
        setStats(res?.data || res || {});
      })
      .catch(() => setStats({}))
      .finally(() => setLoading(false));
  }, [event.id]);

  const fetchLogs = () => {
    setLogsLoading(true);
    adminOperationsService.getCheckInLogs(event.id)
      .then((res: any) => {
        setLogs(Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []);
      })
      .catch(() => setLogs([]))
      .finally(() => setLogsLoading(false));
  };

  useEffect(() => { fetchLogs(); }, [event.id]);

  const filteredLogs = useMemo(() => {
    const q = logsSearch.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter(l => {
      const hay = [l.attendeeName, l.attendeeEmail, l.ticketNumber, l.seatInfo].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [logs, logsSearch]);

  const handleExportCsv = () => {
    const headers = ['Ad Soyad', 'E-posta', 'Bilet No', 'Koltuk', 'Bilet Türü', 'Giriş Saati', 'Görevli', 'Kanal', 'Durum'];
    const rows = logs.map((l: any) => [
      l.attendeeName || '—', l.attendeeEmail || '—', l.ticketNumber || '—',
      l.seatInfo || '—', l.ticketType || '—',
      l.checkedInAt ? format(new Date(l.checkedInAt), 'dd.MM.yyyy HH:mm') : '',
      l.checkedInBy || '', l.gate || '',
      l.checkedIn ? 'Giriş Yaptı' : 'Bekleniyor',
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `giris-kayitlari-${event.name.replace(/\s+/g, '_')}.csv`;
    a.click(); URL.revokeObjectURL(url);
    enqueueSnackbar('CSV indirildi', { variant: 'success' });
  };

  if (loading) return <SectionLoading message="Check-in istatistikleri yükleniyor..." />;

  const total = stats?.totalTickets || 0;
  const checkedIn = stats?.checkedInCount || 0;
  const pending = stats?.pendingCount ?? Math.max(0, total - checkedIn);
  const pct = total > 0 ? (checkedIn / total) * 100 : 0;
  const doneCount = logs.filter((l: any) => l.checkedIn).length;

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

      {/* ━━━ GİRİŞ KAYITLARI — Tam tablo ━━━ */}
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', flexWrap: 'wrap', gap: 1 }}>
          <Box>
            <Typography variant="subtitle2" fontWeight={700}>Giriş Kayıtları</Typography>
            <Typography variant="caption" color="text.secondary">Tüm bilet sahiplerinin giriş durumu</Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField size="small" placeholder="İsim / bilet no / koltuk..."
              value={logsSearch} onChange={e => setLogsSearch(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16, color: 'text.disabled', mr: 0.5 }} /></InputAdornment> }}
              sx={{ width: { xs: 180, md: 240 }, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            <Chip label={`${doneCount} / ${logs.length} giriş`}
              size="small" color="success" variant="outlined" sx={{ fontWeight: 600 }}
            />
            <Tooltip title="Yenile">
              <IconButton size="small" onClick={fetchLogs} disabled={logsLoading}>
                {logsLoading ? <CircularProgress size={16} /> : <RefreshIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
            <Button variant="outlined" size="small" startIcon={<DownloadIcon sx={{ fontSize: 14 }} />}
              onClick={handleExportCsv} disabled={logs.length === 0}
              sx={{ textTransform: 'none', fontSize: 11, borderRadius: 2 }}
            >
              CSV
            </Button>
          </Stack>
        </Box>

        {logsLoading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={28} /></Box>
        ) : logs.length === 0 && !logsSearch ? (
          <Box sx={{ textAlign: 'center', py: 5 }}>
            <Typography variant="body2" color="text.secondary" fontWeight={500}>Henüz giriş kaydı yok</Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
              Bilet satışı yapıldığında kayıtlar burada görünecek
            </Typography>
          </Box>
        ) : filteredLogs.length === 0 && logsSearch ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary">"{logsSearch}" için sonuç bulunamadı</Typography>
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#fafafa' }}>
                  {['Kişi', 'Bilet No', 'Koltuk', 'Bilet Türü', 'Giriş Saati', 'Görevli', 'Kanal', 'Durum'].map(col => (
                    <TableCell key={col} sx={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', py: 1 }}>
                      {col}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredLogs.map((log: any, i: number) => (
                  <TableRow key={log.id ?? i} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>{log.attendeeName || '—'}</Typography>
                      <Typography variant="caption" color="text.secondary">{log.attendeeEmail}</Typography>
                    </TableCell>
                    <TableCell><Typography sx={{ fontSize: 11, fontFamily: 'monospace', color: '#374151' }}>{log.ticketNumber || '—'}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{log.seatInfo || '—'}</Typography></TableCell>
                    <TableCell><Typography variant="body2" color="text.secondary">{log.ticketType || '—'}</Typography></TableCell>
                    <TableCell>
                      {log.checkedInAt
                        ? <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 11 }}>{format(new Date(log.checkedInAt), 'dd.MM HH:mm')}</Typography>
                        : <Typography variant="caption" color="text.disabled">—</Typography>}
                    </TableCell>
                    <TableCell><Typography variant="body2" color="text.secondary" sx={{ fontSize: 11 }}>{log.checkedInBy || '—'}</Typography></TableCell>
                    <TableCell><Typography variant="body2" color="text.secondary" sx={{ fontSize: 11 }}>{log.gate || '—'}</Typography></TableCell>
                    <TableCell>
                      {log.checkedIn
                        ? <Chip label="Giriş Yaptı" size="small" color="success" sx={{ height: 20, fontSize: 10, fontWeight: 700 }} />
                        : <Chip label="Bekleniyor" size="small" color="warning" variant="outlined" sx={{ height: 20, fontSize: 10, fontWeight: 600 }} />}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
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
