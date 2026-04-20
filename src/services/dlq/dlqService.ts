import { api } from '../api';
import type { DlqPage, DlqStats, DeadLetterEntry } from './dlqTypes';

const BASE = '/notifications/admin/dead-letters';

function unwrap<T>(body: any): T | null {
  if (!body) return null;
  if (typeof body === 'object' && 'data' in body && 'success' in body) return (body.data ?? null) as T | null;
  return body as T;
}

async function list(status = 'PENDING', page = 0, size = 25): Promise<DlqPage | null> {
  try {
    const res = await api.get<any>(BASE, { params: { status, page, size } });
    return unwrap<DlqPage>(res.data);
  } catch (err: any) {
    const code = err?.response?.status;
    if (code === 404 || code === 501 || code === 403) return null;
    throw err;
  }
}

async function stats(): Promise<DlqStats | null> {
  try {
    const res = await api.get<any>(`${BASE}/stats`);
    return unwrap<DlqStats>(res.data);
  } catch (err: any) {
    const code = err?.response?.status;
    if (code === 404 || code === 501 || code === 403) return null;
    throw err;
  }
}

async function retry(id: string): Promise<DeadLetterEntry | null> {
  const res = await api.post<any>(`${BASE}/${id}/retry`);
  return unwrap<DeadLetterEntry>(res.data);
}

async function dismiss(id: string): Promise<void> {
  await api.delete(`${BASE}/${id}`);
}

export const dlqService = { list, stats, retry, dismiss };
