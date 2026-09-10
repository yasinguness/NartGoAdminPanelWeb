import { api } from '../api';
import type { FinanceOverviewData, FinanceRange } from './financeOverviewTypes';

const PATH = '/finance/admin/overview';

async function safeGet<T>(path: string, params?: Record<string, any>): Promise<T | null> {
  try {
    const res = await api.get<any>(path, { params });
    const body = res.data;
    if (body && typeof body === 'object' && 'data' in body && 'success' in body) {
      return (body.data ?? null) as T | null;
    }
    return body as T;
  } catch (err: any) {
    const status = err?.response?.status;
    if (status === 404 || status === 501 || status === 403) return null;
    throw err;
  }
}

async function getOverview(range: FinanceRange = '30d'): Promise<FinanceOverviewData | null> {
  return await safeGet<FinanceOverviewData>(PATH, { range });
}

export const financeOverviewService = {
  getOverview,
  PATH,
};
