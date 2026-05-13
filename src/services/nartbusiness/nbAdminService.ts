/**
 * NartBusiness admin panel API client.
 *
 * Backend routes (Sprint 0-6):
 *   - nb-membership-service: /api/v1/nb/membership/**, /api/v1/nb/packages/**
 *   - nb-verification-service: /api/v1/nb/admin/verification/**
 *   - nb-directory-service: /api/v1/nb/admin/directory/**
 *   - DLQ: /api/v1/nb/admin/dlq/**
 *
 * Gateway routing tüm /api/v1/nb/** path'lerini ilgili servise yönlendirir.
 */
import { api } from '../api';
import type {
  ApiEnvelope,
  CommitteeVoteRequest,
  EmbeddingJob,
  EmbeddingJobStatus,
  MatchBatchSummary,
  NbDashboardStats,
  NbDlqEntry,
  NbMember,
  NbMemberStatus,
  PagedResult,
  Sector,
  ValueChainBulkImportRequest,
  ValueChainBulkImportResult,
  ValueChainEdge,
  ValueChainEdgeCreate,
  ValueChainEdgeUpdate,
  VerificationCase,
  VerificationCaseStatus,
} from './nbTypes';

function unwrap<T>(body: any): T | null {
  if (!body) return null;
  if (typeof body === 'object' && 'success' in body && 'data' in body) {
    return (body as ApiEnvelope<T>).data ?? null;
  }
  return body as T;
}

// ============================================================
// Dashboard
// ============================================================

async function getDashboardStats(): Promise<NbDashboardStats | null> {
  try {
    const res = await api.get<any>('/nb/admin/dashboard/stats');
    return unwrap<NbDashboardStats>(res.data);
  } catch (err: any) {
    const code = err?.response?.status;
    if (code === 404 || code === 501) return null;
    throw err;
  }
}

// ============================================================
// Members
// ============================================================

async function listMembers(params: {
  status?: NbMemberStatus;
  tier?: string;
  page?: number;
  size?: number;
}): Promise<PagedResult<NbMember> | null> {
  try {
    const res = await api.get<any>('/nb/admin/members', { params });
    return unwrap<PagedResult<NbMember>>(res.data);
  } catch (err: any) {
    if (err?.response?.status === 404) return null;
    throw err;
  }
}

async function getMember(memberId: string): Promise<NbMember | null> {
  const res = await api.get<any>(`/nb/admin/members/${memberId}`);
  return unwrap<NbMember>(res.data);
}

/**
 * Sprint 23 — Admin manuel üye oluşturma.
 * Self-service apply akışını atlayarak offline anlaşmalı işletmeler için.
 */
async function createMemberManually(
  body: import('./nbTypes').AdminCreateMemberRequest,
): Promise<NbMember | null> {
  const res = await api.post<any>('/nb/admin/members', body);
  return unwrap<NbMember>(res.data);
}

/**
 * Sprint 23.1 — NartGo kullanıcı autocomplete arama (admin manuel üye dropdown).
 *
 * Backend: GET /api/v1/nb/admin/users/search?q=...&limit=20
 * Admin JWT korumalı; nb-membership-service internal token ile auth-service'e proxy yapar.
 *
 * @param q     prefix arama (min 2 karakter; daha kısa string boş array döner)
 * @param limit max sonuç (default 20, max 50)
 */
export interface NbUserSearchResult {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  // Sprint 23.1+ — autocomplete kartı zenginleştirmesi
  phone?: string | null;
  createdAt?: string | null;
  /** ACTIVE / SUBMITTED / NEEDS_INFO / APPROVED_PENDING_PAYMENT vs. null. */
  nbMemberStatus?: string | null;
  /** True ise kullanıcı zaten "aktif" bir NB üyeliği içinde — submit bloklanmalı. */
  nbMemberConflict?: boolean;
}

async function searchUsers(q: string, limit = 20): Promise<NbUserSearchResult[]> {
  if (!q || q.trim().length < 3) return [];
  try {
    const res = await api.get<any>('/nb/admin/users/search', {
      params: { q: q.trim(), limit },
    });
    const data = unwrap<NbUserSearchResult[]>(res.data);
    return data ?? [];
  } catch (err: any) {
    if (err?.response?.status === 404) return [];
    throw err;
  }
}

/**
 * Sprint 23.1+ — Yeni-kullanıcı modunda email blur'da çalışır.
 * Email zaten kayıtlıysa frontend uyarı + tek-tıkla mod değişimi sunar.
 *
 * Yanıt:
 *  - null     : email kayıtlı değil (güvenle yeni-user akışı sürdürülebilir)
 *  - obje     : kullanıcı bulundu (userId, nbMemberStatus, nbMemberConflict, vs.)
 */
async function lookupUserByEmail(email: string): Promise<NbUserSearchResult | null> {
  if (!email || !email.trim()) return null;
  try {
    const res = await api.get<any>('/nb/admin/users/lookup', {
      params: { email: email.trim().toLowerCase() },
    });
    return unwrap<NbUserSearchResult | null>(res.data);
  } catch (err: any) {
    if (err?.response?.status === 404) return null;
    throw err;
  }
}

// ============================================================
// Verification Queue
// ============================================================

async function listVerificationQueue(
  page = 0,
  size = 25,
  status?: VerificationCaseStatus,
): Promise<PagedResult<VerificationCase> | null> {
  try {
    const params: Record<string, string | number> = { page, size };
    if (status) params.status = status;
    const res = await api.get<any>('/nb/admin/verification/queue', { params });
    return unwrap<PagedResult<VerificationCase>>(res.data) ?? null;
  } catch (err: any) {
    if (err?.response?.status === 404) return null;
    throw err;
  }
}

async function getVerificationCase(caseId: string): Promise<VerificationCase | null> {
  const res = await api.get<any>(`/nb/admin/verification/cases/${caseId}`);
  return unwrap<VerificationCase>(res.data);
}

/** Sprint 23 — Case'in tarihçesi (admin denetim görünümü). */
async function getCaseTimeline(
  caseId: string,
): Promise<import('./nbTypes').CaseTimelineEntry[]> {
  const res = await api.get<any>(`/nb/admin/verification/cases/${caseId}/timeline`);
  return unwrap<import('./nbTypes').CaseTimelineEntry[]>(res.data) ?? [];
}

async function submitCommitteeVote(caseId: string, body: CommitteeVoteRequest): Promise<void> {
  await api.post(`/nb/admin/verification/cases/${caseId}/votes`, body);
}

async function decideVerification(
  caseId: string,
  status: VerificationCaseStatus,
  note?: string
): Promise<VerificationCase | null> {
  const res = await api.post<any>(`/nb/admin/verification/cases/${caseId}/decide`, null, {
    params: { status, note },
  });
  return unwrap<VerificationCase>(res.data);
}

// ============================================================
// Sectors
// ============================================================

async function listSectors(): Promise<Sector[]> {
  const res = await api.get<any>('/nb/admin/directory/sectors');
  return unwrap<Sector[]>(res.data) ?? [];
}

async function upsertSector(body: Sector): Promise<Sector | null> {
  const res = await api.put<any>('/nb/admin/directory/sectors', body);
  return unwrap<Sector>(res.data);
}

// ============================================================
// Value Chain (Sprint 9 — Matching #1)
// ============================================================

async function listValueChain(): Promise<ValueChainEdge[]> {
  const res = await api.get<any>('/nb/admin/directory/value-chain');
  return unwrap<ValueChainEdge[]>(res.data) ?? [];
}

async function createValueChain(body: ValueChainEdgeCreate): Promise<ValueChainEdge | null> {
  const res = await api.post<any>('/nb/admin/directory/value-chain', body);
  return unwrap<ValueChainEdge>(res.data);
}

async function updateValueChain(id: string, body: ValueChainEdgeUpdate): Promise<ValueChainEdge | null> {
  const res = await api.put<any>(`/nb/admin/directory/value-chain/${id}`, body);
  return unwrap<ValueChainEdge>(res.data);
}

async function deleteValueChain(id: string): Promise<void> {
  await api.delete(`/nb/admin/directory/value-chain/${id}`);
}

async function bulkImportValueChain(
  body: ValueChainBulkImportRequest,
): Promise<ValueChainBulkImportResult | null> {
  const res = await api.post<any>('/nb/admin/directory/value-chain/bulk-import', body);
  return unwrap<ValueChainBulkImportResult>(res.data);
}

// ============================================================
// Matching batch + Embedding jobs (Sprint 10)
// ============================================================

async function triggerMatchingBatch(): Promise<MatchBatchSummary | null> {
  const res = await api.post<any>('/nb/admin/directory/matching/batch/trigger');
  return unwrap<MatchBatchSummary>(res.data);
}

async function listEmbeddingJobs(
  status: EmbeddingJobStatus = 'FAILED',
  page = 0,
  size = 50,
): Promise<EmbeddingJob[]> {
  const res = await api.get<any>('/nb/admin/directory/embedding/jobs', {
    params: { status, page, size },
  });
  return unwrap<EmbeddingJob[]>(res.data) ?? [];
}

async function retryEmbeddingJob(id: string): Promise<EmbeddingJob | null> {
  const res = await api.post<any>(`/nb/admin/directory/embedding/jobs/${id}/retry`);
  return unwrap<EmbeddingJob>(res.data);
}

// ============================================================
// DLQ (per-service)
// ============================================================

async function listDlqEntries(service: string, page = 0, size = 50): Promise<NbDlqEntry[]> {
  try {
    const res = await api.get<any>(`/nb/admin/dlq/${service}`, { params: { page, size } });
    return unwrap<NbDlqEntry[]>(res.data) ?? [];
  } catch (err: any) {
    if (err?.response?.status === 404) return [];
    throw err;
  }
}

async function replayDlqEntry(service: string, eventDbId: string): Promise<NbDlqEntry | null> {
  const res = await api.post<any>(`/nb/admin/dlq/${service}/${eventDbId}/replay`);
  return unwrap<NbDlqEntry>(res.data);
}

export const nbAdminService = {
  // Dashboard
  getDashboardStats,
  // Members
  listMembers,
  getMember,
  createMemberManually,
  searchUsers,
  lookupUserByEmail,
  // Verification
  listVerificationQueue,
  getVerificationCase,
  getCaseTimeline,
  submitCommitteeVote,
  decideVerification,
  // Sectors
  listSectors,
  upsertSector,
  // Value Chain
  listValueChain,
  createValueChain,
  updateValueChain,
  deleteValueChain,
  bulkImportValueChain,
  // Matching + Embedding (Sprint 10)
  triggerMatchingBatch,
  listEmbeddingJobs,
  retryEmbeddingJob,
  // DLQ
  listDlqEntries,
  replayDlqEntry,
};
