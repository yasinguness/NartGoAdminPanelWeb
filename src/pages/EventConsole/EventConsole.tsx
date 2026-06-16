/**
 * EventConsole — Tek bir etkinliği yönetmek için organizatöre özel konsol.
 * Mockup tabanlı: sidebar + header + content layout.
 *
 * Sidebar: ETKİNLİK (Genel Bakış, Koltuk Haritası, Satış Raporu, Katılımcılar)
 *          KAPIDA (Giriş Kayıtları, Kapı Görevlileri)
 *          DİĞER  (Bildirimler, CSV Dışa Aktar)
 */
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, Typography, Button, Stack, IconButton, useTheme,
  CircularProgress, Chip, Drawer, useMediaQuery, Menu, MenuItem, ListItemIcon, ListItemText,
  Tooltip,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  EventSeat as SeatIcon,
  TrendingUp as SalesIcon,
  ShoppingCartCheckout as OrdersIcon,
  LoginOutlined as CheckInIcon,
  ManageAccounts as StaffIcon,
  Notifications as NotifIcon,
  FileDownload as ExportIcon,
  Settings as SettingsIcon,
  Menu as MenuIcon,
  Circle as DotIcon,
  MoreVert as MoreIcon,
  ArrowBack as BackIcon,
  ConfirmationNumber as TicketIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { eventService } from '../../services/event/eventService';
import { EventResponseDTO } from '../../types/events/eventModel';
import { useRole } from '../../hooks/useRole';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import ForbiddenPage from '../../components/ForbiddenPage';

import OverviewSection from './sections/OverviewSection';
import SeatMapSection from './sections/SeatMapSection';
import SalesSection from './sections/SalesSection';
import OrdersSection from './sections/OrdersSection';
import TicketsSection from './sections/TicketsSection';
import CheckInSection from './sections/CheckInSection';
import StaffSection from './sections/StaffSection';
import NotificationsSection from './sections/NotificationsSection';
import ExportSection from './sections/ExportSection';
import SettingsSection from './sections/SettingsSection';
import { SectionErrorBoundary } from './SectionErrorBoundary';

type SectionKey = 'overview' | 'tickets' | 'seat-map' | 'sales' | 'orders' | 'check-in' | 'staff' | 'notifications' | 'export' | 'settings';

interface NavItem {
  key: SectionKey;
  label: string;
  icon: React.ReactNode;
  group: 'ETKİNLİK' | 'KAPIDA' | 'DİĞER';
}

const NAV_ITEMS: NavItem[] = [
  { key: 'overview', label: 'Genel Bakış', icon: <DashboardIcon fontSize="small" />, group: 'ETKİNLİK' },
  { key: 'tickets', label: 'Bilet Tipleri', icon: <TicketIcon fontSize="small" />, group: 'ETKİNLİK' },
  { key: 'seat-map', label: 'Koltuk Haritası', icon: <SeatIcon fontSize="small" />, group: 'ETKİNLİK' },
  { key: 'sales', label: 'Satış Raporu', icon: <SalesIcon fontSize="small" />, group: 'ETKİNLİK' },
  { key: 'orders', label: 'Siparişler & Katılımcılar', icon: <OrdersIcon fontSize="small" />, group: 'ETKİNLİK' },
  { key: 'check-in', label: 'Giriş Kayıtları', icon: <CheckInIcon fontSize="small" />, group: 'KAPIDA' },
  { key: 'staff', label: 'Kapı Görevlileri', icon: <StaffIcon fontSize="small" />, group: 'KAPIDA' },
  { key: 'notifications', label: 'Bildirimler', icon: <NotifIcon fontSize="small" />, group: 'DİĞER' },
  { key: 'export', label: 'CSV Dışa Aktar', icon: <ExportIcon fontSize="small" />, group: 'DİĞER' },
  { key: 'settings', label: 'Ayarlar', icon: <SettingsIcon fontSize="small" />, group: 'DİĞER' },
];

const DRAWER_WIDTH = 240;

export default function EventConsole() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { eventId } = useParams<{ eventId: string }>();
  const { enqueueSnackbar } = useSnackbar();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const { isAdmin } = useRole();
  const currentUser = useAuthStore(s => s.user);
  const [searchParams, setSearchParams] = useSearchParams();

  // URL query param'dan aktif section'ı oku
  const validSections: SectionKey[] = ['overview', 'tickets', 'seat-map', 'sales', 'orders', 'check-in', 'staff', 'notifications', 'export', 'settings'];
  const sectionFromUrl = searchParams.get('section') as SectionKey | null;
  const initialSection: SectionKey = sectionFromUrl && validSections.includes(sectionFromUrl) ? sectionFromUrl : 'overview';

  const [event, setEvent] = useState<EventResponseDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<SectionKey>(initialSection);

  // Section değişince URL'i güncelle (browser back/forward çalışır)
  const changeSection = (key: SectionKey) => {
    setActiveSection(key);
    const next = new URLSearchParams(searchParams);
    if (key === 'overview') next.delete('section');
    else next.set('section', key);
    setSearchParams(next, { replace: false });
  };

  // Browser navigation (back/forward) ile URL değişince state'i senkronize et
  useEffect(() => {
    const urlSection = searchParams.get('section') as SectionKey | null;
    const target = urlSection && validSections.includes(urlSection) ? urlSection : 'overview';
    if (target !== activeSection) setActiveSection(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkInToggling, setCheckInToggling] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [mobileActionsAnchor, setMobileActionsAnchor] = useState<null | HTMLElement>(null);

  const handleToggleCheckIn = async () => {
    if (!eventId || checkInToggling) return;
    setCheckInToggling(true);
    const nextState = !checkInOpen;
    try {
      const endpoint = nextState ? 'enable' : 'disable';
      await api.post(`/events/admin/${eventId}/checkin/${endpoint}`);
      setCheckInOpen(nextState);
      enqueueSnackbar(nextState ? 'Check-in açıldı' : 'Check-in kapatıldı', { variant: 'success' });
    } catch {
      enqueueSnackbar('Check-in durumu değiştirilemedi', { variant: 'error' });
    } finally {
      setCheckInToggling(false);
    }
  };

  useEffect(() => {
    if (!eventId) return;
    setLoading(true);
    eventService.getEventById(eventId)
      .then(res => {
        if (res.success && res.data) {
          // Role-based access: admin veya etkinliğin organizatörü olmalı
          const isOwner = currentUser?.id === res.data.organizerId;
          if (!isAdmin && !isOwner) {
            setAccessDenied(true);
            return;
          }
          setEvent(res.data);
          setCheckInOpen(res.data.checkInEnabled === true);
        }
      })
      .catch(() => enqueueSnackbar('Etkinlik yüklenemedi', { variant: 'error' }))
      .finally(() => setLoading(false));
  }, [eventId, isAdmin, currentUser?.id]);

  const sectionsByGroup = useMemo(() => {
    const groups: Record<string, NavItem[]> = { 'ETKİNLİK': [], 'KAPIDA': [], 'DİĞER': [] };
    NAV_ITEMS.forEach(item => groups[item.group].push(item));
    return groups;
  }, []);

  const activeItem = NAV_ITEMS.find(i => i.key === activeSection)!;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (accessDenied) {
    // 403 Forbidden — ownership kontrolü başarısız
    return <ForbiddenPage />;
  }

  if (!event) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="error">Etkinlik bulunamadı</Typography>
        <Button onClick={() => navigate('/events')} sx={{ mt: 2 }}>Etkinliklere Dön</Button>
      </Box>
    );
  }

  // ═══ Sidebar içeriği ═══
  const sidebar = (
    <Box sx={{
      width: DRAWER_WIDTH,
      height: '100%',
      bgcolor: '#F8FAFC', // dark green-black
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Logo/Header */}
      <Box sx={{ p: 2.5, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box sx={{
            width: 32, height: 32, borderRadius: '50%',
            bgcolor: '#C9A227', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 14, color: '#F8FAFC',
          }}>
            N
          </Box>
          <Typography variant="body2" fontWeight={700} sx={{ letterSpacing: 0.3 }}>
            NartGo Admin
          </Typography>
        </Stack>
      </Box>

      {/* Nav sections */}
      <Box
        component="nav"
        role="navigation"
        aria-label="Etkinlik konsol menüsü"
        sx={{ flex: 1, overflow: 'auto', py: 2 }}
      >
        {Object.entries(sectionsByGroup).map(([group, items]) => (
          <Box key={group} sx={{ mb: 2 }} role="group" aria-labelledby={`nav-group-${group}`}>
            <Typography
              id={`nav-group-${group}`}
              variant="caption"
              sx={{
                px: 2.5, mb: 1, display: 'block',
                color: 'rgba(255,255,255,0.4)',
                fontSize: 10, letterSpacing: 1.5, fontWeight: 600,
              }}
            >
              {group}
            </Typography>
            {items.map(item => {
              const isActive = activeSection === item.key;
              return (
                <Box
                  key={item.key}
                  component="button"
                  onClick={() => { changeSection(item.key); setMobileDrawerOpen(false); }}
                  onKeyDown={(e: React.KeyboardEvent) => {
                    // Arrow key navigation arasında sekmeler
                    const items = NAV_ITEMS;
                    const currentIdx = items.findIndex(i => i.key === item.key);
                    if (e.key === 'ArrowDown' && currentIdx < items.length - 1) {
                      e.preventDefault();
                      changeSection(items[currentIdx + 1].key);
                    } else if (e.key === 'ArrowUp' && currentIdx > 0) {
                      e.preventDefault();
                      changeSection(items[currentIdx - 1].key);
                    } else if (e.key === 'Home') {
                      e.preventDefault();
                      changeSection(items[0].key);
                    } else if (e.key === 'End') {
                      e.preventDefault();
                      changeSection(items[items.length - 1].key);
                    }
                  }}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={item.label}
                  sx={{
                    // Button reset
                    background: 'none',
                    border: 'none',
                    font: 'inherit',
                    textAlign: 'left',
                    width: 'calc(100% - 24px)',
                    // Visual
                    mx: 1.5, mb: 0.3, px: 1.5, py: 1,
                    borderRadius: 1.5,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    bgcolor: isActive ? 'rgba(201,162,39,0.12)' : 'transparent',
                    color: isActive ? '#C9A227' : 'rgba(255,255,255,0.75)',
                    transition: 'all 0.15s',
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.03)', color: 'white' },
                    '&:focus-visible': {
                      outline: '2px solid #C9A227',
                      outlineOffset: 2,
                    },
                  }}
                >
                  <DotIcon sx={{ fontSize: 6, opacity: isActive ? 1 : 0.4 }} />
                  <Typography variant="body2" sx={{ fontSize: 13, fontWeight: isActive ? 600 : 400 }}>
                    {item.label}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        ))}
      </Box>

      {/* Footer — etkinlik adı */}
      <Box sx={{ p: 2, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, letterSpacing: 0.5 }}>
          ETKİNLİK
        </Typography>
        <Typography variant="body2" fontWeight={600} noWrap sx={{ mt: 0.3 }}>
          {event.name}
        </Typography>
      </Box>
    </Box>
  );

  // ═══ Content ═══
  const renderContent = () => {
    const sectionMap: Record<SectionKey, { component: React.ReactNode; name: string }> = {
      'overview': { component: <OverviewSection event={event} />, name: 'Genel Bakış' },
      'tickets': { component: <TicketsSection event={event} />, name: 'Bilet Tipleri' },
      'seat-map': { component: <SeatMapSection event={event} />, name: 'Koltuk Haritası' },
      'sales': { component: <SalesSection event={event} />, name: 'Satış Raporu' },
      'orders': { component: <OrdersSection event={event} />, name: 'Siparişler & Katılımcılar' },
      'check-in': { component: <CheckInSection event={event} />, name: 'Giriş Kayıtları' },
      'staff': { component: <StaffSection event={event} />, name: 'Kapı Görevlileri' },
      'notifications': { component: <NotificationsSection event={event} />, name: 'Bildirimler' },
      'export': { component: <ExportSection event={event} />, name: 'CSV Dışa Aktar' },
      'settings': { component: <SettingsSection event={event} />, name: 'Ayarlar' },
    };
    const current = sectionMap[activeSection];
    return (
      <SectionErrorBoundary key={activeSection} sectionName={current.name}>
        {current.component}
      </SectionErrorBoundary>
    );
  };

  const eventDateStr = event.eventTime ? format(new Date(event.eventTime), "d MMMM yyyy, HH:mm", { locale: tr }) : '';

  return (
    <Box sx={{ display: 'flex', height: '100vh', bgcolor: theme.palette.background.default }}>
      {/* Desktop Sidebar */}
      {!isMobile && (
        <Box sx={{ width: DRAWER_WIDTH, flexShrink: 0 }}>
          {sidebar}
        </Box>
      )}

      {/* Mobile Drawer */}
      {isMobile && (
        <Drawer
          open={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
          PaperProps={{ sx: { border: 'none' } }}
        >
          {sidebar}
        </Drawer>
      )}

      {/* Main Content */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <Box sx={{
          borderBottom: '1px solid',
          borderColor: 'divider',
          px: { xs: 2, md: 4 },
          py: 2,
          bgcolor: 'background.paper',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          flexShrink: 0,
        }}>
          {isMobile && (
            <IconButton onClick={() => setMobileDrawerOpen(true)}>
              <MenuIcon />
            </IconButton>
          )}

          {/* Back-to-list pill (belirgin) */}
          <Tooltip title="Etkinlikler listesine dön" arrow>
            <Button
              size="small"
              variant="outlined"
              startIcon={<BackIcon sx={{ fontSize: 14 }} />}
              onClick={() => navigate('/events')}
              sx={{
                mr: 1.5,
                borderColor: 'rgba(201,162,39,0.3)',
                color: 'text.secondary',
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'none',
                letterSpacing: 0.3,
                '&:hover': { borderColor: 'primary.main', bgcolor: 'rgba(201,162,39,0.08)', color: 'primary.main' },
              }}
            >
              Etkinlikler
            </Button>
          </Tooltip>

          {/* Breadcrumb + Title */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.3 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', letterSpacing: 1, fontSize: 10, fontWeight: 600 }}>
                {activeItem.label.toUpperCase()}
              </Typography>
            </Stack>
            <Typography variant="h5" fontWeight={700} noWrap sx={{ fontFamily: 'serif', fontStyle: 'normal' }}>
              {checkInOpen && <Chip size="small" label="Canlı" color="success" sx={{ mr: 1, height: 22, fontSize: 11 }} />}
              {event.name} — {eventDateStr}
            </Typography>
          </Box>

          {/* Action Buttons — Mobilde 3-nokta menü */}
          <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
            <IconButton onClick={(e) => setMobileActionsAnchor(e.currentTarget)} aria-label="İşlemler">
              <MoreIcon />
            </IconButton>
            <Menu
              anchorEl={mobileActionsAnchor}
              open={Boolean(mobileActionsAnchor)}
              onClose={() => setMobileActionsAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              <MenuItem onClick={() => { changeSection('export'); setMobileActionsAnchor(null); }}>
                <ListItemIcon><ExportIcon fontSize="small" /></ListItemIcon>
                <ListItemText>CSV İndir</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => { changeSection('notifications'); setMobileActionsAnchor(null); }}>
                <ListItemIcon><NotifIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Bildirim Gönder</ListItemText>
              </MenuItem>
              <MenuItem
                onClick={() => { handleToggleCheckIn(); setMobileActionsAnchor(null); }}
                disabled={checkInToggling}
                sx={{ color: checkInOpen ? 'success.main' : 'primary.main' }}
              >
                <ListItemIcon>
                  {checkInToggling ? <CircularProgress size={16} /> : <CheckInIcon fontSize="small" color={checkInOpen ? 'success' : 'primary'} />}
                </ListItemIcon>
                <ListItemText>{checkInOpen ? 'Check-in Açık' : 'Check-in Aç'}</ListItemText>
              </MenuItem>
            </Menu>
          </Box>

          <Stack direction="row" spacing={1} sx={{ display: { xs: 'none', md: 'flex' } }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ExportIcon fontSize="small" />}
              onClick={() => changeSection('export')}
              sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 11, fontWeight: 700, borderRadius: 1.5 }}
            >
              CSV İndir
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<NotifIcon fontSize="small" />}
              onClick={() => changeSection('notifications')}
              sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 11, fontWeight: 700, borderRadius: 1.5 }}
            >
              Bildirim
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={checkInToggling ? <CircularProgress size={14} color="inherit" /> : <CheckInIcon fontSize="small" />}
              onClick={handleToggleCheckIn}
              disabled={checkInToggling}
              sx={{
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                fontSize: 11,
                fontWeight: 700,
                borderRadius: 1.5,
                bgcolor: checkInOpen ? 'success.main' : '#F8FAFC',
                '&:hover': { bgcolor: checkInOpen ? 'success.dark' : '#1a2b1f' },
              }}
            >
              {checkInOpen ? 'Check-in Açık' : 'Check-in Aç'}
            </Button>
          </Stack>
        </Box>

        {/* Scrollable content */}
        <Box
          component="main"
          role="main"
          aria-label={activeItem.label}
          sx={{ flex: 1, overflow: 'auto', p: { xs: 2, md: 3 } }}
        >
          {renderContent()}
        </Box>
      </Box>
    </Box>
  );
}
