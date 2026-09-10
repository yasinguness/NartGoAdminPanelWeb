import { api } from '../api';
import type {
  TimeRange,
  RevenueKpi,
  GrowthKpi,
  FunnelKpi,
  OperationalKpi,
  PlatformHealthKpi,
  ExecutiveDashboardData,
} from './executiveTypes';

const PATHS = {
  revenue: '/finance/admin/executive/revenue',
  growth: '/auth/admin/executive/growth',
  funnel: '/tickets/admin/executive/funnel',
  operational: '/events/admin/executive/operational',
  platform: '/auth/admin/executive/platform-health',
} as const;

async function safeGet<T>(path: string, params?: Record<string, any>): Promise<T | null> {
  try {
    // skipAuthRedirect: bu endpoint'ler admin-only ve henüz backend'de yayında olmayabilir.
    // 401/403 gelirse api interceptor logout tetiklemesin; fallback akışı devreye girsin.
    const res = await api.get<any>(path, { params, skipAuthRedirect: true } as any);
    const body = res.data;
    if (body && typeof body === 'object' && 'data' in body && 'success' in body) {
      return (body.data ?? null) as T | null;
    }
    return body as T;
  } catch (err: any) {
    const status = err?.response?.status;
    // 401 (henüz yayında değil / role mismatch), 403, 404, 501 — fallback'e düş
    if (status === 401 || status === 403 || status === 404 || status === 501) return null;
    throw err;
  }
}

async function getRevenue(range: TimeRange): Promise<RevenueKpi | null> {
  const primary = await safeGet<RevenueKpi>(PATHS.revenue, { range });
  if (primary) return primary;
  return await fallbackRevenueFromSettlement();
}

async function fallbackRevenueFromSettlement(): Promise<RevenueKpi | null> {
  try {
    const res = await api.get('/finance/kpis', { skipAuthRedirect: true } as any);
    const k: any = res.data || {};
    return {
      gmvToday: { value: Number(k.gmvToday ?? 0) },
      gmvWeek: { value: Number(k.gmvWeek ?? 0) },
      gmvMonth: { value: Number(k.gmvMonth ?? k.gmv ?? 0) },
      netRevenueMonth: { value: Number(k.netRevenueMonth ?? k.net ?? 0) },
      aov: { value: Number(k.aov ?? 0) },
      currency: k.currency || 'TRY',
    };
  } catch {
    return null;
  }
}

async function getGrowth(range: TimeRange): Promise<GrowthKpi | null> {
  const primary = await safeGet<GrowthKpi>(PATHS.growth, { range });
  if (primary) return primary;
  return await fallbackGrowthFromUserStats();
}

async function fallbackGrowthFromUserStats(): Promise<GrowthKpi | null> {
  try {
    const res = await api.get('/auth/admin/users/stats', { skipAuthRedirect: true } as any);
    const s: any = res.data?.data || res.data || {};
    return {
      dau: { value: Number(s.dau ?? s.dailyActive ?? 0) },
      wau: { value: Number(s.wau ?? s.weeklyActive ?? 0) },
      mau: { value: Number(s.mau ?? s.monthlyActive ?? 0) },
      newSignups: { value: Number(s.newSignups ?? s.newRegistrations ?? 0) },
      kFactor: { value: Number(s.kFactor ?? 0) },
    };
  } catch {
    return null;
  }
}

async function getFunnel(range: TimeRange): Promise<FunnelKpi | null> {
  return await safeGet<FunnelKpi>(PATHS.funnel, { range });
}

async function getOperational(): Promise<OperationalKpi | null> {
  const primary = await safeGet<OperationalKpi>(PATHS.operational);
  if (primary) return primary;
  return await fallbackOperational();
}

async function fallbackOperational(): Promise<OperationalKpi | null> {
  try {
    const res = await api.get('/events', { params: { size: 200 }, skipAuthRedirect: true } as any);
    const data: any = res.data?.data || res.data?.content || res.data || [];
    const list: any[] = Array.isArray(data) ? data : data.content || [];
    const now = Date.now();
    const h72 = now + 72 * 3600 * 1000;

    const active = list.filter(e => e.status === 'ACTIVE');
    const upcoming = active.filter(e => {
      const t = e.eventTime ? new Date(e.eventTime).getTime() : 0;
      return t >= now && t <= h72;
    });
    const cancelled = list.filter(e => e.status === 'CANCELLED').length;

    const capacityValues = active
      .map(e => {
        const cap = Number(e.maxParticipants ?? 0);
        const sold = Number(e.currentParticipants ?? 0);
        return cap > 0 ? (sold / cap) * 100 : null;
      })
      .filter((v): v is number => v !== null);

    const avgOccupancy = capacityValues.length > 0
      ? capacityValues.reduce((s, v) => s + v, 0) / capacityValues.length
      : 0;

    const total = list.length || 1;

    return {
      activeEvents: active.length,
      upcomingEvents72h: upcoming.length,
      avgOccupancyPct: { value: Math.round(avgOccupancy * 10) / 10 },
      cancellationRatePct: { value: Math.round((cancelled / total) * 1000) / 10 },
    };
  } catch {
    return null;
  }
}

async function getPlatformHealth(): Promise<PlatformHealthKpi | null> {
  return await safeGet<PlatformHealthKpi>(PATHS.platform);
}

async function getDashboard(range: TimeRange = '7d'): Promise<ExecutiveDashboardData> {
  const [revenue, growth, funnel, operational, platform] = await Promise.all([
    getRevenue(range).catch(() => null),
    getGrowth(range).catch(() => null),
    getFunnel(range).catch(() => null),
    getOperational().catch(() => null),
    getPlatformHealth().catch(() => null),
  ]);

  return {
    range,
    generatedAt: new Date().toISOString(),
    revenue,
    growth,
    funnel,
    operational,
    platform,
    partial: {
      revenue: revenue === null,
      growth: growth === null,
      funnel: funnel === null,
      operational: operational === null,
      platform: platform === null,
    },
  };
}

export const executiveService = {
  getRevenue,
  getGrowth,
  getFunnel,
  getOperational,
  getPlatformHealth,
  getDashboard,
  PATHS,
};
