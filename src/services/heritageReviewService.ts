import { api } from './api';

/**
 * Köy konumu inceleme masası (auth-service `HeritageLocationReviewService`).
 * Sunucu her kayıt için nedenleri, kontrolleri, adayları ve önerilen kararı
 * hazır verir; panel tahmin yürütmez. Bkz. docs/plan/nartgo-koy-inceleme-masasi.md.
 */

export type ReviewReason = 'dist' | 'dup' | 'water' | 'none' | 'comm' | 'mid';
export type ReviewTab = 'all' | ReviewReason | 'asked';
export type CheckMark = 'ok' | 'fail' | 'warn' | 'info';
export type RecKind = 'approve' | 'ask' | 'warn' | 'place';
export type CandidateSource = 'geo' | 'osm' | 'uye' | 'kayit' | 'web';

export interface Recommendation {
  kind: RecKind;
  title: string;
  why: string;
  resolutions: Record<string, string>;
}

export interface QueueItem {
  id: string;
  state: 'pending' | 'asked';
  name: string;
  province: string;
  district: string;
  pointDistrict: { province: string; district: string } | null;
  oldNames: string[];
  reasons: ReviewReason[];
  ease: number;
  /** Köyü henüz olmayan kayıtta, köy açılınca bağlanacak sülale sayısı. */
  familyLinks: number;
  recommendation: Recommendation;
}

export interface QueueResponse {
  datasetVersion: string;
  decided: number;
  pending: number;
  counts: Record<ReviewTab, number>;
  provinces: string[];
  items: QueueItem[];
  rejectReasons: string[];
}

export interface ReviewCheck {
  key: string | null;
  mk: CheckMark;
  title: string;
  detail: string;
  options: { v: string; label: string }[];
}

export interface ReviewCandidate {
  n: number;
  src: CandidateSource;
  title: string;
  detail: string;
  latitude: number;
  longitude: number;
  distance: number;
  osmId?: string;
}

export interface NearbyVillage {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distance: number;
}

export interface Boundary {
  name: string;
  geometry: { type: 'MultiPolygon'; coordinates: number[][][][] };
}

export interface ReviewDetail extends QueueItem {
  villageId: string | null;
  type: 'village' | 'correction';
  latitude: number | null;
  longitude: number | null;
  groups: string;
  families: string;
  sources: string[];
  confidence: string;
  geonames: { id: string; name: string; url: string } | null;
  checks: ReviewCheck[];
  precision: string;
  contributor: { display_name?: string; total?: number; approved?: number } | null;
  taskVotes: { question: string; status: string; votes: { answer: string; n: number }[] } | null;
  candidates: ReviewCandidate[];
  nearby: NearbyVillage[];
  boundaries: { record?: Boundary | null; point?: Boundary | null };
}

export type DecisionAction = 'APPROVE' | 'REJECT' | 'ASK_COMMUNITY';

export interface DecisionBody {
  action: DecisionAction;
  resolutions?: Record<string, string>;
  latitude?: number;
  longitude?: number;
  rejectReason?: string;
  note?: string;
  /** Kayıtta il/ilçe yoksa admin'in yazdığı; boşsa sunucu noktanın düştüğü ilçeyi kullanır. */
  province?: string;
  district?: string;
}

export interface DecisionResult {
  decisionId: string;
  status: 'approved' | 'rejected' | 'asked';
  summary: string;
}

export interface HistoryEntry {
  id: string;
  action: DecisionAction;
  payload: { summary?: string; note?: string };
  created_at: string;
  undone_at: string | null;
  admin_name: string | null;
  undoable: boolean;
}

export interface BulkDistrictItem {
  id: string;
  name: string;
  province: string;
  from: string;
  to: string;
}

export interface SourceAcceptPreview {
  accept: number;
  questions: number;
  left: { id: string; name: string; province: string; district: string; status: 'blocked' | 'existing'; reason: string }[];
}

const ROOT = '/auth/heritage/admin/locations';
const unwrap = <T,>(response: { data: unknown }): T => {
  const body = response.data as { data?: T } | T;
  return (body && typeof body === 'object' && 'data' in (body as object) ? (body as { data: T }).data : body) as T;
};

export const heritageReviewService = {
  async queue(): Promise<QueueResponse> {
    return unwrap(await api.get(`${ROOT}/review`));
  },
  async detail(id: string): Promise<ReviewDetail> {
    return unwrap(await api.get(`${ROOT}/review/${encodeURIComponent(id)}`));
  },
  async decide(id: string, body: DecisionBody): Promise<DecisionResult> {
    return unwrap(await api.post(`${ROOT}/${encodeURIComponent(id)}/decision`, body));
  },
  async history(id: string): Promise<HistoryEntry[]> {
    return unwrap(await api.get(`${ROOT}/${encodeURIComponent(id)}/history`));
  },
  async undo(id: string, decisionId: string): Promise<void> {
    await api.post(`${ROOT}/${encodeURIComponent(id)}/undo`, { decisionId });
  },
  async bulkDistrictPreview(): Promise<BulkDistrictItem[]> {
    return unwrap(await api.get(`${ROOT}/bulk-district`));
  },
  async bulkDistrictApply(ids: string[]): Promise<{ approved: number; items: { id: string; status: string; decisionId?: string; reason?: string }[] }> {
    return unwrap(await api.post(`${ROOT}/bulk-district`, { ids }));
  },
  /** Kaynak listesinden toplu kabul: önizleme (kaç kayıt haritaya girer, kaçında topluluğa soru açılır, kalanlar). */
  async sourceAcceptPreview(): Promise<SourceAcceptPreview> {
    return unwrap(await api.get(`${ROOT}/source-accept`));
  },
  async sourceAcceptApply(): Promise<{ accepted: number; questions: number; skipped: number; failed: { id: string; reason: string }[] }> {
    return unwrap(await api.post(`${ROOT}/source-accept`));
  },
  /** Yüksek güvenli seed kayıtlarının toplu onayı (kuru çalıştırma raporu). */
  async seedDryRun(): Promise<{ reportId: string; datasetVersion: string; candidateCount: number; passed: number; failed: number }> {
    return unwrap(await api.post(`${ROOT}/seed-high-confidence/dry-run`));
  },
  async seedApply(reportId: string): Promise<{ approved: number; failed: number }> {
    return unwrap(await api.post(`${ROOT}/seed-high-confidence/apply`, { reportId, confirmation: 'APPROVE_HIGH_CONFIDENCE_HERITAGE_LOCATIONS' }));
  },
};

export const errorText = (error: unknown): string => {
  const e = error as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? 'İstek tamamlanamadı.';
};
