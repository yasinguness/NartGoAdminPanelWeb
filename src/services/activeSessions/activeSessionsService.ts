import { api } from '../api';

export interface ActiveSession {
  userId?: string;
  email?: string;
  lastLoginAt?: string;
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: string;
  location?: string;
  minutesAgo?: number;
  suspicious?: boolean;
  suspicionReason?: string;
}

export interface ActiveSessionsResponse {
  generatedAt: string;
  hoursWindow: number;
  totalActiveSessions: number;
  suspiciousCount: number;
  sessions: ActiveSession[];
}

function unwrap<T>(body: any): T | null {
  if (!body) return null;
  if (typeof body === 'object' && 'data' in body && 'success' in body) return (body.data ?? null) as T | null;
  return body as T;
}

async function active(hours = 24): Promise<ActiveSessionsResponse | null> {
  try {
    const res = await api.get<any>('/auth/admin/sessions/active', { params: { hours } });
    return unwrap<ActiveSessionsResponse>(res.data);
  } catch (err: any) {
    const code = err?.response?.status;
    if (code === 404 || code === 501 || code === 403) return null;
    throw err;
  }
}

export const activeSessionsService = { active };
