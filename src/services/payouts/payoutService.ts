import { api } from '../api';
import type { PayoutResponse, BatchActionRequest, BatchActionResult } from './payoutTypes';

const BASE = '/finance/admin/payouts';

function unwrap<T>(body: any): T | null {
  if (!body) return null;
  if (typeof body === 'object' && 'data' in body && 'success' in body) return (body.data ?? null) as T | null;
  return body as T;
}

async function safeGet<T>(path: string): Promise<T | null> {
  try {
    const res = await api.get<any>(path);
    return unwrap<T>(res.data);
  } catch (err: any) {
    const status = err?.response?.status;
    if (status === 404 || status === 501 || status === 403) return null;
    throw err;
  }
}

async function getByOrganizer(): Promise<PayoutResponse | null> {
  return await safeGet<PayoutResponse>(`${BASE}/by-organizer`);
}

async function batchApprove(payload: BatchActionRequest): Promise<BatchActionResult | null> {
  const res = await api.post<any>(`${BASE}/batch-approve`, payload);
  return unwrap<BatchActionResult>(res.data);
}

async function batchRetry(payload: BatchActionRequest): Promise<BatchActionResult | null> {
  const res = await api.post<any>(`${BASE}/batch-retry`, payload);
  return unwrap<BatchActionResult>(res.data);
}

export const payoutService = {
  getByOrganizer,
  batchApprove,
  batchRetry,
};
