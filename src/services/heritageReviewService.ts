import { api } from './api';

export interface ReviewContribution {
  id: string;
  type: string;
  status: string;
  source?: string;
  created_at?: string;
  reviewed_at?: string;
  reviewed_by?: string;
  review_note?: string;
  village_id?: string | null;
  official_name?: string;
  province?: string;
  district?: string;
  reasons?: string[];
  reason?: string | string[];
  payload: Record<string, any>;
  location?: { latitude?: number | null; longitude?: number | null };
  candidates?: any[];
  nearbyVillages?: any[];
  mergeCandidates?: any[];
  checks?: any[];
  districtBoundary?: any;
  pointDistrictBoundary?: any;
  pointDistrict?: { province?: string; district?: string } | string;
  history?: any[];
  [key: string]: any;
}

export type HeritageDecision =
  | 'APPROVE'
  | 'MOVE_CANDIDATE_AND_APPROVE'
  | 'MOVE_MANUAL_AND_APPROVE'
  | 'CORRECT_DISTRICT_AND_APPROVE'
  | 'MERGE'
  | 'MARK_SEPARATE'
  | 'REJECT'
  | 'ASK_COMMUNITY';

const ROOT = '/auth/heritage';
const ADMIN_LOCATIONS = `${ROOT}/admin/locations`;
const unwrap = (response: any) => response?.data?.data ?? response?.data;
const isNotFound = (error: any) => error?.response?.status === 404;

export const heritageReviewService = {
  async getQueue(status = 'pending'): Promise<ReviewContribution[]> {
    const data = unwrap(await api.get(`${ROOT}/admin/contributions`, { params: { status } }));
    const rows = Array.isArray(data) ? data : data?.items ?? data?.records ?? data?.content ?? [];
    return Array.isArray(rows) ? rows : [];
  },
  async checkLocation(payload: Record<string, any>) {
    return unwrap(await api.post(`${ROOT}/locations/check`, payload));
  },
  async regions(province?: string): Promise<{ name: string }[]> {
    const data = unwrap(await api.get(`${ROOT}/locations/regions`, { params: province ? { province } : {} }));
    return Array.isArray(data) ? data : [];
  },
  async searchPlaces(province: string, district: string, q: string) {
    const data = unwrap(await api.get(`${ROOT}/locations/search`, { params: { province, district, q } }));
    return Array.isArray(data) ? data : [];
  },
  async reviewLegacy(item: ReviewContribution, approve: boolean, note: string, payload?: Record<string, any>) {
    return unwrap(await api.post(`${ROOT}/admin/contributions/${encodeURIComponent(item.id)}/review`, {
      approve,
      note,
      payload: approve ? payload ?? item.payload : null,
    }));
  },
  async applyDecision(item: ReviewContribution, decision: HeritageDecision, body: Record<string, any>) {
    try {
      const { duplicateResolution: _duplicateResolution, duplicateResolutions: _duplicateResolutions, ...decisionBody } = body;
      return unwrap(await api.post(`${ADMIN_LOCATIONS}/${encodeURIComponent(item.id)}/decision`, { ...decisionBody, decision }));
    } catch (error) {
      if (!isNotFound(error)) throw error;
      const legacyDecisions: HeritageDecision[] = [
        'APPROVE', 'MOVE_CANDIDATE_AND_APPROVE', 'MOVE_MANUAL_AND_APPROVE',
        'CORRECT_DISTRICT_AND_APPROVE', 'MARK_SEPARATE', 'REJECT',
      ];
      if (!legacyDecisions.includes(decision)) throw error;
      const rawResolutions = body.duplicateResolutions ?? body.duplicateResolution;
      const resolutions = Array.isArray(rawResolutions) ? rawResolutions : rawResolutions?.relatedIds?.map((relatedId: string) => ({ relatedId, type: rawResolutions.type, keepId: rawResolutions.keepId })) ?? [];
      if (resolutions.some((resolution: any) => resolution.type === 'MERGE')) {
        throw new Error('Birleştirme kararı API sunucusunda henüz desteklenmiyor; kayıt onaylanmadı.');
      }
      const approve = decision !== 'REJECT';
      return this.reviewLegacy(item, approve, body.note || 'Admin panelinden köy konumu incelendi.', {
        ...(body.record ?? item.payload),
        ...(decision === 'MARK_SEPARATE' ? { duplicate_reviewed: true } : {}),
        ...(resolutions.length ? { duplicate_reviewed: resolutions.every((resolution: any) => resolution.type === 'DISTINCT'), duplicate_resolution: resolutions } : {}),
      });
    }
  },
  async getHistory(id: string) {
    const data = unwrap(await api.get(`${ADMIN_LOCATIONS}/${encodeURIComponent(id)}/history`));
    return Array.isArray(data) ? data : data?.items ?? data?.records ?? [];
  },
  async undo(id: string, auditId: string) {
    return unwrap(await api.post(`${ADMIN_LOCATIONS}/${encodeURIComponent(id)}/undo`, { auditId }));
  },
};
