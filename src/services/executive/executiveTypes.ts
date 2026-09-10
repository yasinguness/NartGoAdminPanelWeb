export type TimeRange = '24h' | '7d' | '30d' | '90d' | 'ytd';

export interface TimeseriesPoint {
  t: string;
  v: number;
}

export interface MetricWithTrend {
  value: number;
  previousValue?: number;
  deltaPct?: number;
  series?: TimeseriesPoint[];
  anomaly?: { zScore: number; severity: 'low' | 'medium' | 'high' } | null;
}

export interface RevenueKpi {
  gmvToday: MetricWithTrend;
  gmvWeek: MetricWithTrend;
  gmvMonth: MetricWithTrend;
  netRevenueMonth: MetricWithTrend;
  aov: MetricWithTrend;
  mrr?: MetricWithTrend;
  paidVsFreeSplit?: { paid: number; free: number };
  currency?: string;
}

export interface GrowthKpi {
  dau: MetricWithTrend;
  wau: MetricWithTrend;
  mau: MetricWithTrend;
  newSignups: MetricWithTrend;
  kFactor: MetricWithTrend;
  retention?: {
    d1: number;
    d7: number;
    d30: number;
  };
}

export interface FunnelStep {
  key: string;
  label: string;
  count: number;
  dropOffPct?: number;
}

export interface FunnelKpi {
  steps: FunnelStep[];
  conversionOverall: number;
  period: TimeRange;
}

export interface OperationalKpi {
  activeEvents: number;
  upcomingEvents72h: number;
  avgOccupancyPct: MetricWithTrend;
  cancellationRatePct: MetricWithTrend;
  suspiciousTicketRatePct?: number;
  ticketsSoldToday?: number;
  checkInsToday?: number;
}

export interface ServiceHealth {
  name: string;
  status: 'up' | 'degraded' | 'down' | 'unknown';
  latencyMs?: number;
  lastChecked?: string;
}

export interface PlatformHealthKpi {
  errorRateP99: MetricWithTrend;
  paymentFailureRate: MetricWithTrend;
  fcmDeliveryRate: MetricWithTrend;
  kafkaLagTotal?: MetricWithTrend;
  services: ServiceHealth[];
  uptime30dPct?: number;
}

export interface ExecutiveDashboardData {
  range: TimeRange;
  generatedAt: string;
  revenue: RevenueKpi | null;
  growth: GrowthKpi | null;
  funnel: FunnelKpi | null;
  operational: OperationalKpi | null;
  platform: PlatformHealthKpi | null;
  partial: {
    revenue: boolean;
    growth: boolean;
    funnel: boolean;
    operational: boolean;
    platform: boolean;
  };
}
