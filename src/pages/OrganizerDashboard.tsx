import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Event as EventIcon,
  ConfirmationNumber as TicketIcon,
  QrCodeScanner as QrIcon,
  TrendingUp as RevenueIcon,
  Add as AddIcon,
  ArrowForward as ArrowIcon,
  CheckCircle as CheckCircleIcon,
  People as PeopleIcon,
  EventSeat as SeatIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { formatDate, formatDateTime } from '../utils/dateUtils';
import { PageContainer } from '../components/Page';
import { useRole } from '../hooks/useRole';
import { adminOperationsService } from '../services/admin/adminOperationsService';
import { salesCommandService } from '../services/sales/salesCommand.service';

interface EventSummary {
  id: string;
  name: string;
  eventTime: string;
  status: string;
  currentParticipants: number;
  maxParticipants: number;
  checkInEnabled?: boolean;
}

interface TicketStats {
  totalTickets: number;
  checkedIn: number;
  notCheckedIn: number;
  checkInRate: number;
}

const getGreeting = (): string => {
  const h = new Date().getHours();
  if (h < 6) return 'İyi geceler';
  if (h < 12) return 'Günaydın';
  if (h < 18) return 'İyi günler';
  return 'İyi akşamlar';
};

export default function OrganizerDashboard() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { userName } = useRole();

  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalTicketsSold, setTotalTicketsSold] = useState(0);
  const [totalCheckedIn, setTotalCheckedIn] = useState(0);
  const [eventStats, setEventStats] = useState<Record<string, TicketStats>>({});
  const [velocityData, setVelocityData] = useState<any[]>([]);

  // Strict mode double mount guard
  const fetchedRef = useRef(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1) Organizatorun kendi etkinliklerini cek (TEK cagri)
      const eventsRes = await adminOperationsService.getMyEvents();
      const allEvents: EventSummary[] = Array.isArray(eventsRes) ? eventsRes : (eventsRes as any)?.data ?? [];

      const relevantEvents = allEvents
        .sort((a, b) => new Date(b.eventTime).getTime() - new Date(a.eventTime).getTime())
        .slice(0, 10);

      setEvents(relevantEvents);

      // 2) Sadece en aktif 1 etkinlik icin detayli satis verisi cek (TEK cagri)
      //    Diger etkinliklerin bilet/katilimci sayisi zaten my-events response'unda var
      const topEvent = relevantEvents.find(e => e.currentParticipants > 0) || relevantEvents[0];

      if (topEvent) {
        try {
          const dash = await salesCommandService.getSalesDashboard(topEvent.id);
          if (dash) {
            setTotalRevenue(Number(dash.grossRevenue) || 0);
            setTotalTicketsSold(dash.ticketsIssued ?? 0);
            setTotalCheckedIn(dash.ticketsCheckedIn ?? 0);
            setEventStats({
              [topEvent.id]: {
                totalTickets: dash.ticketsIssued ?? 0,
                checkedIn: dash.ticketsCheckedIn ?? 0,
                notCheckedIn: (dash.ticketsIssued ?? 0) - (dash.ticketsCheckedIn ?? 0),
                checkInRate: dash.ticketsIssued > 0 ? (dash.ticketsCheckedIn / dash.ticketsIssued) * 100 : 0,
              },
            });
          }
        } catch { /* */ }

        // 3) Satis trendi (TEK cagri)
        try {
          const velocity = await salesCommandService.getSalesVelocity(topEvent.id, 1440);
          if (velocity && velocity.length > 0) {
            setVelocityData(velocity.map((v: any) => ({
              date: v.windowStart ? formatDate(v.windowStart) : '',
              gelir: Number(v.revenue) || 0,
              siparis: v.paidOrderCount || 0,
            })));
          }
        } catch { /* */ }
      }

      // Diger etkinliklerin toplam bilet sayisini my-events verisinden al
      const totalFromEvents = relevantEvents.reduce((sum, e) => sum + (e.currentParticipants || 0), 0);
      if (!topEvent) setTotalTicketsSold(totalFromEvents);

    } catch {
      // Sessizce gec
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Strict mode double mount guard
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchData();
  }, [fetchData]);

  const activeEvents = useMemo(() => events.filter((e) => e.status === 'ACTIVE'), [events]);
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return activeEvents.filter((e) => new Date(e.eventTime) > now);
  }, [activeEvents]);

  const cardSx = {
    borderRadius: 3,
    border: '1px solid',
    borderColor: 'divider',
    boxShadow: 'none',
    overflow: 'hidden',
  };

  return (
    <PageContainer title="Organizatör Paneli">
      {loading && <LinearProgress sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999 }} />}

      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={800}>
          {getGreeting()}, {userName?.split(' ')[0] || 'Organizatör'} 👋
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Etkinliklerinizin durumunu buradan takip edebilirsiniz.
        </Typography>
      </Box>

      {/* Metric Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          {
            label: 'Aktif Etkinlik',
            value: activeEvents.length,
            icon: <EventIcon />,
            color: theme.palette.primary.main,
            onClick: () => navigate('/events'),
          },
          {
            label: 'Satılan Bilet',
            value: totalTicketsSold,
            icon: <TicketIcon />,
            color: theme.palette.success.main,
            onClick: () => navigate('/tickets'),
          },
          {
            label: 'Toplam Giriş',
            value: totalCheckedIn,
            icon: <QrIcon />,
            color: theme.palette.info.main,
          },
          {
            label: 'Toplam Gelir',
            value: `₺${totalRevenue.toLocaleString('tr-TR')}`,
            icon: <RevenueIcon />,
            color: theme.palette.warning.main,
          },
        ].map((metric, i) => (
          <Grid item xs={6} md={3} key={i}>
            <Card
              sx={{
                ...cardSx,
                cursor: metric.onClick ? 'pointer' : 'default',
                transition: 'all 0.2s',
                '&:hover': metric.onClick ? { borderColor: metric.color, transform: 'translateY(-2px)' } : {},
              }}
              onClick={metric.onClick}
            >
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      {metric.label}
                    </Typography>
                    <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5 }}>
                      {loading ? <CircularProgress size={20} /> : metric.value}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: alpha(metric.color, 0.1),
                      color: metric.color,
                    }}
                  >
                    {metric.icon}
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Satış Trendi */}
      {velocityData.length > 1 && (
        <Card sx={{ ...cardSx, p: 2.5, mb: 3 }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>
            Satış Trendi — {events[0]?.name || 'En Aktif Etkinlik'}
          </Typography>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={velocityData}>
              <defs>
                <linearGradient id="colorGelir" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <RechartsTooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                formatter={(value: number, name: string) => [
                  name === 'gelir' ? `₺${value.toLocaleString('tr-TR')}` : value,
                  name === 'gelir' ? 'Gelir' : 'Siparis',
                ]}
              />
              <Area type="monotone" dataKey="gelir" stroke="#10b981" fill="url(#colorGelir)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Quick Actions */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Etkinlik Oluştur', icon: <AddIcon />, path: '/event-creation', color: 'primary' as const },
          { label: 'Bilet Yönetimi', icon: <TicketIcon />, path: '/tickets', color: 'success' as const },
          { label: 'Gişe', icon: <SeatIcon />, path: '/box-office', color: 'info' as const },
        ].map((action, i) => (
          <Grid item xs={4} key={i}>
            <Button
              fullWidth
              variant="outlined"
              color={action.color}
              startIcon={action.icon}
              onClick={() => navigate(action.path)}
              sx={{
                py: 1.5,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                borderWidth: 1.5,
              }}
            >
              {action.label}
            </Button>
          </Grid>
        ))}
      </Grid>

      {/* Events Table */}
      <Card sx={cardSx}>
        <Box
          sx={{
            px: 2.5,
            py: 1.5,
            borderBottom: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Box>
            <Typography variant="subtitle2" fontWeight={700}>
              Etkinliklerim
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {activeEvents.length} aktif · {upcomingEvents.length} yaklaşan
            </Typography>
          </Box>
          <Button
            size="small"
            endIcon={<ArrowIcon />}
            onClick={() => navigate('/events')}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Tümünü Gör
          </Button>
        </Box>

        {loading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <CircularProgress size={28} />
          </Box>
        ) : events.length === 0 ? (
          <Box sx={{ p: 5, textAlign: 'center' }}>
            <Typography sx={{ fontSize: 40, mb: 1 }}>🎪</Typography>
            <Typography variant="subtitle2" fontWeight={600} color="text.secondary">
              Henüz etkinliğiniz yok
            </Typography>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => navigate('/event-creation')}
              sx={{ mt: 2, textTransform: 'none', borderRadius: 2 }}
            >
              İlk Etkinliğinizi Oluşturun
            </Button>
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                {['Etkinlik', 'Tarih', 'Durum', 'Bilet Satış', 'Check-in', ''].map((h) => (
                  <TableCell
                    key={h}
                    sx={{
                      fontWeight: 700,
                      fontSize: 11,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      color: 'text.secondary',
                    }}
                  >
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {events.map((event) => {
                const stats = eventStats[event.id];
                const isUpcoming = new Date(event.eventTime) > new Date();

                return (
                  <TableRow
                    key={event.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/events/${event.id}`)}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} sx={{ maxWidth: 250 }} noWrap>
                        {event.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {formatDateTime(event.eventTime)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={
                          event.checkInEnabled
                            ? 'Kapı Açık'
                            : isUpcoming
                              ? 'Yaklaşan'
                              : event.status === 'COMPLETED'
                                ? 'Tamamlandı'
                                : 'Aktif'
                        }
                        size="small"
                        color={
                          event.checkInEnabled
                            ? 'success'
                            : isUpcoming
                              ? 'warning'
                              : event.status === 'COMPLETED'
                                ? 'default'
                                : 'primary'
                        }
                        variant="outlined"
                        sx={{ fontWeight: 600, height: 22, fontSize: 11 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <PeopleIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="caption" fontWeight={600} fontFamily="monospace">
                          {event.currentParticipants || 0} / {event.maxParticipants || 0}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      {stats ? (
                        <Stack spacing={0.5}>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <CheckCircleIcon sx={{ fontSize: 14, color: 'success.main' }} />
                            <Typography variant="caption" fontWeight={600} fontFamily="monospace">
                              {stats.checkedIn} / {stats.totalTickets}
                            </Typography>
                          </Stack>
                          <LinearProgress
                            variant="determinate"
                            value={stats.checkInRate}
                            sx={{
                              height: 3,
                              borderRadius: 2,
                              bgcolor: 'grey.200',
                              '& .MuiLinearProgress-bar': { borderRadius: 2, bgcolor: 'success.main' },
                            }}
                          />
                        </Stack>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          —
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        variant="text"
                        endIcon={<ArrowIcon sx={{ fontSize: 14 }} />}
                        sx={{ textTransform: 'none', fontSize: 11, fontWeight: 600, minWidth: 0 }}
                      >
                        Detay
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </PageContainer>
  );
}
