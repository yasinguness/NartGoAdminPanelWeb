import { api } from '../api';
import type { ReconciliationResponse, ResolveRequest, Mismatch } from './reconciliationTypes';

const BASE = '/finance/admin/reconciliation';

function unwrap<T>(body: any): T | null {
  if (!body) return null;
  if (typeof body === 'object' && 'data' in body && 'success' in body) return (body.data ?? null) as T | null;
  return body as T;
}

async function safeGet<T>(path: string, params?: Record<string, any>): Promise<T | null> {
  try {
    const res = await api.get<any>(path, { params });
    return unwrap<T>(res.data);
  } catch (err: any) {
    const status = err?.response?.status;
    if (status === 404 || status === 501 || status === 403) return null;
    throw err;
  }
}

async function getMismatches(): Promise<ReconciliationResponse | null> {
  return await safeGet<ReconciliationResponse>(`${BASE}/mismatches`);
}

async function resolve(paymentId: string, payload: ResolveRequest): Promise<Mismatch | null> {
  const res = await api.post<any>(`${BASE}/${paymentId}/resolve`, payload);
  return unwrap<Mismatch>(res.data);
}

export const reconciliationService = {
  getMismatches,
  resolve,
};
