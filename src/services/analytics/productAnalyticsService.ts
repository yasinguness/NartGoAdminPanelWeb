/**
 * Ürün Kullanım Analitiği servisi — mobile SDK event'lerinin aggregate okumaları.
 *
 * Backend admin endpoint'leri:
 *   GET /analytics/admin/events/top
 *   GET /analytics/admin/events/by-platform
 *   GET /analytics/admin/events/daily-trend
 *   GET /analytics/admin/events/first-screen-distribution
 */
import { api } from '../api';
import type {
  TopEventDto,
  PlatformBreakdownDto,
  DailyTrendPointDto,
  FirstScreenDistributionDto,
} from '../../types/analytics/productAnalytics';

function unwrap<T>(body: any): T | null {
  if (!body) return null;
  if (typeof body === 'object' && 'data' in body && 'success' in body) {
    return (body.data ?? null) as T | null;
  }
  return body as T;
}

async function safeArray<T>(path: string, params?: Record<string, any>): Promise<T[]> {
  try {
    const res = await api.get<any>(path, { params, skipAuthRedirect: true } as any);
    const data = unwrap<T[]>(res.data);
    return Array.isArray(data) ? data : [];
  } catch (err: any) {
    const code = err?.response?.status;
    if (code === 401 || code === 403 || code === 404 || code === 501) return [];
    throw err;
  }
}

async function getTopEvents(days: number = 7, limit: number = 20): Promise<TopEventDto[]> {
  return safeArray<TopEventDto>('/analytics/admin/events/top', { days, limit });
}

async function getEventsByPlatform(days: number = 7): Promise<PlatformBreakdownDto[]> {
  return safeArray<PlatformBreakdownDto>('/analytics/admin/events/by-platform', { days });
}

async function getDailyTrend(eventName: string, days: number = 30): Promise<DailyTrendPointDto[]> {
  if (!eventName) return [];
  return safeArray<DailyTrendPointDto>('/analytics/admin/events/daily-trend', {
    eventName,
    days,
  });
}

async function getFirstScreenDistribution(days: number = 7): Promise<FirstScreenDistributionDto[]> {
  return safeArray<FirstScreenDistributionDto>(
    '/analytics/admin/events/first-screen-distribution',
    { days },
  );
}

export const productAnalyticsService = {
  getTopEvents,
  getEventsByPlatform,
  getDailyTrend,
  getFirstScreenDistribution,
};
