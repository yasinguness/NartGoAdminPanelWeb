import { api } from '../api';

/** Admin › Kullanıcılar arama, sayım, detay özeti (auth-service AdminUserSearchController). */

export type UserRow = {
  id: string;
  name: string;
  email: string;
  imageUrl?: string | null;
  status: string;
  accountType: string;
  village: { id: string; name: string; district: string; province: string } | null;
  hometownCity?: string | null;
  currentCity?: string | null;
  ageBand: string;
  profileScore: number;
  lastLoginAt?: string | null;
  createdAt?: string | null;
};

export type UserSearchResult = { items: UserRow[]; page: number; size: number; matched: number; total: number };

export type UserStats = {
  total: number;
  active: number;
  pending: number;
  blocked: number;
  with_photo: number;
  with_village: number;
  new_this_month: number;
};

export type UserOverview = UserRow & {
  emailVerified: boolean;
  phoneMasked?: string | null;
  hasPhone: boolean;
  familyId?: number | null;
  familyName?: string | null;
  familyTrust?: string | null;
  language?: string | null;
  identityProvider: string;
  villageVerified?: boolean;
  confirmsGiven: number;
  disputesGiven: number;
  familiesAdded: number;
  loginCount: number;
  points: number;
  isAdmin: boolean;
  tags: string[];
  checks: { key: string; done: boolean }[];
};

export type SavedView = { id: string; name: string; filters: Record<string, string> };
export type BulkResult = { ok: number; skipped: number; failed: { id: string; error: string }[] };

const base = '/auth/admin/users';

export const userSearchService = {
  setPassword: async (id: string, newPassword: string) => api.put(`${base}/${id}/password`, { newPassword }),
  search: async (q: Record<string, string>, page: number, size = 25) =>
    (await api.get<UserSearchResult>(`${base}/search`, { params: { ...q, page, size } })).data,
  count: async (q: Record<string, string>) => (await api.get<{ matched: number }>(`${base}/search/count`, { params: q })).data.matched,
  stats: async () => (await api.get<UserStats>(`${base}/search/stats`)).data,
  neighbors: async (q: Record<string, string>, id: string) =>
    (await api.get<{ index: number; total: number; prevId?: string; nextId?: string }>(`${base}/search/neighbors`, { params: { ...q, id } })).data,
  overview: async (id: string) => (await api.get<UserOverview>(`${base}/${id}/overview`)).data,
  revealPhone: async (id: string) => (await api.post<{ phone: string }>(`${base}/${id}/phone`)).data.phone,
  exportCsv: async (q: Record<string, string>, reason: string, includePhone: boolean) =>
    (await api.post<Blob>(`${base}/search/export`, { reason, includePhone }, { params: q, responseType: 'blob' })).data,
  bulk: async (ids: string[], action: 'block' | 'unblock' | 'tag', opts: { reason?: string; tag?: string } = {}) =>
    (await api.post<BulkResult>(`${base}/bulk`, { ids, action, ...opts })).data,
  views: async () => (await api.get<SavedView[]>(`${base}/views`)).data,
  saveView: async (name: string, filters: Record<string, string>) =>
    (await api.post<{ id: string; name: string }>(`${base}/views`, { name, filters })).data,
  deleteView: async (id: string) => api.delete(`${base}/views/${id}`),
};
