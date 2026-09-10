import { api } from '../api';
import type { CohortRetentionResponse } from './cohortTypes';

function unwrap<T>(body: any): T | null {
  if (!body) return null;
  if (typeof body === 'object' && 'data' in body && 'success' in body) return (body.data ?? null) as T | null;
  return body as T;
}

async function retention(weeks = 16): Promise<CohortRetentionResponse | null> {
  try {
    const res = await api.get<any>('/auth/admin/cohorts/retention', { params: { weeks } });
    return unwrap<CohortRetentionResponse>(res.data);
  } catch (err: any) {
    const code = err?.response?.status;
    if (code === 404 || code === 501 || code === 403) return null;
    throw err;
  }
}

export const cohortService = { retention };
