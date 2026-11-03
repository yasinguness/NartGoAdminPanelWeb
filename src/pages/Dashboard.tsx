import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Paper, Stack, Typography } from '@mui/material';
import EventIcon from '@mui/icons-material/EventAvailable';
import NotifyIcon from '@mui/icons-material/CampaignOutlined';
import BusinessIcon from '@mui/icons-material/AddBusiness';
import DotIcon from '@mui/icons-material/FiberManualRecord';
import { PageContainer } from '../components/Page';
import { useRole } from '../hooks/useRole';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';
import { adminLoginStatsService } from '../services/auth/adminLoginStatsService';
import { executiveService } from '../services/executive/executiveService';
import type { ActiveAlertDto, EngagementOverviewDto } from '../types/security/loginStats';
import type { PlatformHealthKpi, RevenueKpi } from '../services/executive/executiveTypes';
import AttentionPanel from '../components/dashboard/AttentionPanel';
import AudienceHealth from '../components/dashboard/AudienceHealth';
import OnboardingFunnelCard from '../components/dashboard/OnboardingFunnelCard';
import HeritageStatsCard from '../components/dashboard/HeritageStatsCard';
import {
  dashboardStatsService, type HeritageAdminStats, type OnboardingFunnel,
} from '../services/dashboardStatsService';

/**
 * Kontrol paneli.
 *
 * Tek soruyu cevaplar: bugün neye bakmalıyım. Üstte ne yapılması gerektiği
 * (dikkat isteyenler), yanında kitlenin sağlığı, altında platformun dört temel
 * sayısı.
 *
 * Kişi bazlı listeler (son girişler, en aktif kullanıcılar, kullanıcı zaman
 * çizelgesi) buradan kaldırıldı: kontrol paneli "kim" sorusunun değil "ne"
 * sorusunun yeri. O listeler Kullanım ve Tutunma Analitiği bölümündeki kendi
 * sayfalarında duruyor ve orada filtrelenebiliyor da.
 *
 * Widget'ların hepsi `skipAuthRedirect` ile çağrılır: bunlar süs sayaçlar,
 * birinin 401'i oturumu kapatmamalı.
 */
const DASH_REQ: Record<string, unknown> = { skipAuthRedirect: true };

const greeting = (d = new Date()) => {
  const h = d.getHours();
  if (h < 6) return 'İyi geceler';
  if (h < 12) return 'Günaydın';
  if (h < 18) return 'İyi günler';
  if (h < 22) return 'İyi akşamlar';
  return 'İyi geceler';
};

const longDate = (d = new Date()) =>
  d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });

const tl = (n?: number | null) => (n == null ? '—' : `${Math.round(n).toLocaleString('tr-TR')} ₺`);
const nn = (n?: number | null) => (n == null ? '—' : n.toLocaleString('tr-TR'));

interface UserStats { total: number; newThisMonth: number }

export default function Dashboard() {
  const navigate = useNavigate();
  const { isAdmin } = useRole();
  const user = useAuthStore((s) => s.user);

  const [engagement, setEngagement] = useState<EngagementOverviewDto | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [businessCount, setBusinessCount] = useState<number | null>(null);
  const [eventCount, setEventCount] = useState<number | null>(null);
  const [upcoming, setUpcoming] = useState<number | null>(null);
  const [revenue, setRevenue] = useState<RevenueKpi | null>(null);
  const [health, setHealth] = useState<PlatformHealthKpi | null>(null);
  const [alerts, setAlerts] = useState<ActiveAlertDto[]>([]);
  const [funnel, setFunnel] = useState<OnboardingFunnel | null>(null);
  const [heritage, setHeritage] = useState<HeritageAdminStats | null>(null);
  const [dismissed, setDismissed] = useState<string[]>([]);

  const unwrap = (body: any) => (body && typeof body === 'object' && 'data' in body ? body.data : body);

  const load = useCallback(async () => {
    // Hepsi bağımsız: biri düşerse yalnız o kutu boş kalır.
    await Promise.allSettled([
      adminLoginStatsService.getEngagementOverview(DASH_REQ).then(setEngagement),
      api.get<any>('/auth/admin/users/stats', DASH_REQ).then((r) => {
        const d = unwrap(r.data);
        if (d) setUserStats({ total: Number(d.total ?? 0), newThisMonth: Number(d.newThisMonth ?? 0) });
      }),
      api.get<any>('/businesses', { params: { page: 0, size: 1 }, ...DASH_REQ })
        .then((r) => setBusinessCount(Number(unwrap(r.data)?.totalElements ?? 0))),
      api.get<any>('/events/popular/all', { params: { page: 0, size: 1 }, ...DASH_REQ })
        .then((r) => setEventCount(Number(unwrap(r.data)?.totalElements ?? 0))),
      executiveService.getRevenue?.('30d').then(setRevenue).catch(() => null),
      executiveService.getPlatformHealth?.().then(setHealth).catch(() => null),
      executiveService.getOperational?.()
        .then((o) => setUpcoming(o?.upcomingEvents72h ?? null)).catch(() => null),
      adminLoginStatsService.getActiveAlerts().then((a) => setAlerts(a ?? [])).catch(() => null),
      // Bu iki uç yayına alınmadan 404 dönüyor; servis hatayı yutup null
      // döndürüyor, kart da görünmüyor. Yayına girince kendiliğinden açılırlar.
      dashboardStatsService.onboardingFunnel(30).then(setFunnel),
      dashboardStatsService.heritageStats().then(setHeritage),
    ]);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const services = health?.services ?? [];
  const down = services.filter((s) => s.status === 'down' || s.status === 'degraded');
  const serviceLine = services.length === 0
    ? null
    : down.length === 0
      ? { text: 'Tüm servisler çalışıyor', ok: true }
      : { text: `${down.length} serviste sorun var: ${down.map((s) => s.name).join(', ')}`, ok: false };

  const topAlert = useMemo(
    () => alerts.filter((a) => a.severity === 'HIGH' && !dismissed.includes(a.code))[0] ?? null,
    [alerts, dismissed],
  );

  return (
    <PageContainer>
      {/* ── Selamlama ve hızlı eylemler ─────────────────────── */}
      <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'flex-start' }} spacing={2} sx={{ mb: 3 }}>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: 28, fontWeight: 700, lineHeight: 1.2 }}>
            {greeting()}{user?.firstName ? `, ${user.firstName}` : ''}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
            <Typography variant="body2" color="text.secondary">{longDate()}</Typography>
            {serviceLine && (
              <>
                <Typography variant="body2" color="text.secondary">·</Typography>
                <DotIcon sx={{ fontSize: 10, color: serviceLine.ok ? '#1f8a4c' : '#b3261e' }} />
                <Typography variant="body2" sx={{ color: serviceLine.ok ? 'text.secondary' : '#b3261e' }}>
                  {serviceLine.text}
                </Typography>
              </>
            )}
          </Stack>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button size="small" variant="outlined" startIcon={<EventIcon />}
            onClick={() => navigate('/event-creation')}>Etkinlik oluştur</Button>
          <Button size="small" variant="outlined" startIcon={<NotifyIcon />}
            onClick={() => navigate('/notifications')}>Bildirim gönder</Button>
          <Button size="small" variant="outlined" startIcon={<BusinessIcon />}
            onClick={() => navigate('/businesses')}>İşletme ekle</Button>
        </Stack>
      </Stack>

      {/* ── Açık uyarı ───────────────────────────────────────── */}
      {topAlert && (
        <Alert
          severity="warning" sx={{ mb: 3, borderRadius: 2 }}
          action={
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="contained" color="warning"
                onClick={() => navigate('/security/anomalies')}>İncele</Button>
              <Button size="small" onClick={() => setDismissed([...dismissed, topAlert.code])}>Gördüm</Button>
            </Stack>
          }
        >
          <b>{topAlert.title}:</b> {topAlert.description}
        </Alert>
      )}

      {/* ── Dikkat isteyenler + kitle sağlığı ─────────────────── */}
      {isAdmin && (
        <Box sx={{
          display: 'grid', gap: 2.5, mb: 3,
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.7fr) minmax(0, 1fr)' },
          alignItems: 'start',
        }}>
          <AttentionPanel />
          <AudienceHealth engagement={engagement} totalUsers={userStats?.total ?? null} />
        </Box>
      )}

      {/* ── Dört temel sayı ──────────────────────────────────── */}
      <Box sx={{
        display: 'grid', gap: 2.5, mb: 3,
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
      }}>
        <Tile label="Toplam kullanıcı" value={nn(userStats?.total)}
          hint={userStats ? `+${nn(userStats.newThisMonth)} bu ay` : undefined}
          onClick={() => navigate('/users')} />
        <Tile label="İşletme" value={nn(businessCount)}
          hint="rehberdeki toplam kayıt" onClick={() => navigate('/businesses')} />
        <Tile label="Etkinlik" value={nn(upcoming ?? eventCount)}
          hint={upcoming != null ? `72 saat içinde · ${nn(eventCount)} toplam` : 'toplam etkinlik'}
          onClick={() => navigate('/events')} />
        <Tile label="Gelir · son 30 gün" value={tl(revenue?.gmvMonth?.value)}
          hint="bilet · mağaza · öne çıkarma" onClick={() => navigate('/finance/overview')} />
      </Box>

      {(funnel || heritage) && (
        <Box sx={{
          display: 'grid', gap: 2.5, mb: 3,
          gridTemplateColumns: { xs: '1fr', lg: funnel && heritage ? 'repeat(2, minmax(0, 1fr))' : '1fr' },
          alignItems: 'start',
        }}>
          {funnel && <OnboardingFunnelCard data={funnel} />}
          {heritage && <HeritageStatsCard data={heritage} />}
        </Box>
      )}

      <Typography variant="caption" color="text.secondary">
        Kişi bazlı listeler (son girişler, en aktif kullanıcılar) Kullanım ve Tutunma Analitiği
        bölümündeki kendi sayfalarına taşındı.
      </Typography>
    </PageContainer>
  );
}

function Tile({ label, value, hint, onClick }: {
  label: string; value: string; hint?: string; onClick?: () => void;
}) {
  return (
    <Paper
      variant="outlined" onClick={onClick}
      sx={{
        px: 2.5, py: 2, borderRadius: 3,
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick ? { bgcolor: 'action.hover' } : undefined,
      }}
    >
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography sx={{ fontSize: 28, fontWeight: 700, lineHeight: 1.15, mt: 0.25 }}>{value}</Typography>
      {hint && <Typography variant="caption" color="text.secondary">{hint}</Typography>}
    </Paper>
  );
}
