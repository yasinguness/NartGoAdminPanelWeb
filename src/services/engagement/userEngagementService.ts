/**
 * Kullanıcı Etkileşimi servisi.
 *
 * Backend endpoint'leri:
 *   GET  /auth/admin/analytics/inactive-users
 *   GET  /auth/admin/analytics/login-frequency
 *   POST /notifications/admin/push/bulk
 */
import { api } from '../api';
import type {
  InactiveUserDto,
  InactiveUsersPage,
  LoginFrequencyDto,
  BulkPushRequest,
  BulkPushResponse,
} from '../../types/engagement';

function unwrap<T>(body: any): T | null {
  if (!body) return null;
  if (typeof body === 'object' && 'data' in body && 'success' in body) {
    return (body.data ?? null) as T | null;
  }
  return body as T;
}

export interface InactiveUsersQuery {
  days?: number;
  platform?: string;
  page?: number;
  size?: number;
}

export interface LoginFrequencyQuery {
  days?: number;
  platform?: string;
  sort?: 'asc' | 'desc';
  limit?: number;
}

async function getInactiveUsers(q: InactiveUsersQuery = {}): Promise<InactiveUsersPage> {
  const params: Record<string, any> = {
    days: q.days ?? 30,
    page: q.page ?? 0,
    size: q.size ?? 50,
  };
  if (q.platform && q.platform !== 'ALL') params.platform = q.platform;

  const res = await api.get<any>('/auth/admin/analytics/inactive-users', {
    params,
    skipAuthRedirect: true,
  } as any);
  const data = unwrap<any>(res.data);

  // Backend olası şekilleri: { content, totalElements, totalPages, ... } VEYA doğrudan Spring Page
  const content: InactiveUserDto[] = Array.isArray(data?.content) ? data.content : [];
  return {
    content,
    totalElements: Number(data?.totalElements ?? content.length),
    totalPages: Number(data?.totalPages ?? 1),
    number: Number(data?.number ?? params.page),
    size: Number(data?.size ?? params.size),
    first: data?.first,
    last: data?.last,
    empty: data?.empty,
  };
}

async function getLoginFrequency(q: LoginFrequencyQuery = {}): Promise<LoginFrequencyDto[]> {
  const params: Record<string, any> = {
    days: q.days ?? 30,
    sort: q.sort ?? 'desc',
    limit: q.limit ?? 100,
  };
  if (q.platform && q.platform !== 'ALL') params.platform = q.platform;

  const res = await api.get<any>('/auth/admin/analytics/login-frequency', {
    params,
    skipAuthRedirect: true,
  } as any);
  const data = unwrap<LoginFrequencyDto[]>(res.data);
  return Array.isArray(data) ? data : [];
}

async function sendBulkPush(req: BulkPushRequest): Promise<BulkPushResponse> {
  const res = await api.post<any>('/notifications/admin/push/bulk', req, {
    skipAuthRedirect: true,
  } as any);
  const data = unwrap<BulkPushResponse>(res.data);
  return data ?? { totalTargeted: 0, queued: 0, failed: 0, errors: [] };
}

export const userEngagementService = {
  getInactiveUsers,
  getLoginFrequency,
  sendBulkPush,
};
