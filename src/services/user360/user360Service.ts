import { api } from '../api';
import type { UserOrdersSummary } from './user360Types';

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

async function getOrdersSummaryByEmail(email: string, limit = 20): Promise<UserOrdersSummary | null> {
  const encoded = encodeURIComponent(email);
  return await safeGet<UserOrdersSummary>(`/tickets/admin/users/by-email/${encoded}/orders-summary`, { limit });
}

export const user360Service = {
  getOrdersSummaryByEmail,
};
