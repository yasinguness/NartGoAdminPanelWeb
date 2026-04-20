import { api } from '../api';
import type { RefundListResponse, RefundActionRequest, RefundItem } from './refundTypes';

const BASE = '/finance/admin/refunds';

function unwrap<T>(body: any): T | null {
  if (!body) return null;
  if (typeof body === 'object' && 'data' in body && 'success' in body) return (body.data ?? null) as T | null;
  return body as T;
}

async function list(params?: { status?: string; from?: string; to?: string }): Promise<RefundListResponse | null> {
  try {
    const res = await api.get<any>(BASE, { params });
    return unwrap<RefundListResponse>(res.data);
  } catch (err: any) {
    const status = err?.response?.status;
    if (status === 404 || status === 501 || status === 403) return null;
    throw err;
  }
}

async function act(refundId: string, payload: RefundActionRequest): Promise<RefundItem | null> {
  const res = await api.post<any>(`${BASE}/${refundId}/action`, payload);
  return unwrap<RefundItem>(res.data);
}

export const refundService = {
  list,
  act,
};
