import { api } from './api';

/**
 * Admin köy yönetimi (auth-service `HeritageVillageAdminService`): ekle, düzenle, kaldır, takma ad,
 * Çerkesçe ad ve sülale bağı; konum bulma (yerel liste + Google + OpenStreetMap).
 * Bekleyen konum katkıları ayrı: heritageReviewService (Köy Konumları masası).
 */

export type Precision = 'EXACT' | 'APPROXIMATE' | 'HISTORICAL';
export type VillageStatus = 'approved' | 'removed';

export interface VillageRow {
  id: string;
  official_name: string;
  province: string;
  district: string;
  country_code: string;
  admin_type: 'village' | 'neighbourhood';
  latitude: number;
  longitude: number;
  status: VillageStatus;
  slug: string;
  merged_into: string | null;
  location_precision: Precision;
  confidence: string;
  family_count: number;
  /** Onay bekleyen kullanıcı katkısı + teyit bekleyen/tartışmalı topluluk kaydı (konum katkıları hariç). */
  pending_count: number;
}

export interface VillageList {
  total: number;
  page: number;
  size: number;
  items: VillageRow[];
  provinces: string[];
  countries: string[];
  pendingWithoutLocation: number;
  villagesWithPending: number;
}

export interface PendingSummary {
  villageContributions: number;
  communityPending: number;
  communityDisputed: number;
  familySuggestions: number;
  locationQueue: number;
  instagramComments: number;
  decidableTasks: number;
}

export interface ContributionItem {
  id: string;
  type: string;
  title: string;
  lines: { label: string; value: string }[];
  source: string;
  createdAt: string;
  contributor: string | null;
  contributorApproved: number;
}

export interface CommunityItem {
  type: 'name' | 'family';
  id: string;
  label: string;
  detail: string | null;
  trust: 'pending' | 'disputed';
  added_at: string;
  confirms: number;
  disputes: { reason: string | null; created_at: string }[];
}

export interface VillageTask {
  id: string;
  task_key: string;
  question: string;
  options: string[];
  context_value: string | null;
  votes: Record<string, number>;
}

export interface VillageContributions {
  pending: ContributionItem[];
  locationPending: ContributionItem[];
  recent: { id: string; type: string; status: string; review_note: string | null; reviewed_at: string | null; contributor: string | null; reviewer: string | null }[];
  community: CommunityItem[];
  trustNeeded: number;
  tasks: VillageTask[];
  locationAnswers: Record<string, number>;
}

export interface VillageName { id: string; name: string; language: string; script: 'latin' | 'cyrillic'; status: string; trust: string; source: string }
export interface VillageFamilyLink { id: string; family_id: number; name: string; race: string; status: string; trust: string; source: string }
export interface VillageLogEntry { id: string; action: string; detail: string; created_at: string; admin_name: string | null }

export interface VillageDetail extends Omit<VillageRow, 'family_count'> {
  source: string;
  osm_id: string | null;
  location_source_note: string;
  location_verified_at: string | null;
  flags: string[];
  aliases: string[];
  names: VillageName[];
  families: VillageFamilyLink[];
  memberCount: number;
  log: VillageLogEntry[];
}

export interface VillageBody {
  officialName: string;
  province: string;
  district: string;
  countryCode: string;
  adminType: 'village' | 'neighbourhood';
  latitude: number | null;
  longitude: number | null;
  precision: Precision;
  sourceNote: string;
  duplicateReviewed: boolean;
  osmId: string;
  aliases: string[];
}

export interface GeoCandidate {
  source: 'osm_local' | 'google' | 'nominatim';
  sourceLabel: string;
  name: string;
  address: string;
  province: string;
  district: string;
  countryCode: string;
  country: string;
  latitude: number;
  longitude: number;
  osmId: string | null;
  villageId: string | null;
}

export interface GeocodeResult { candidates: GeoCandidate[]; provider: string; googleConfigured: boolean }

export interface VillageCheck {
  flags: string[];
  duplicates: { id: string; official_name: string; province: string; district: string; latitude: number; longitude: number; distance_m: number }[];
  pointDistricts: { province: string; district: string }[];
  geoChecked?: boolean;
}

export interface FamilyOption { id: number; family_name: string; race: string }

const ROOT = '/auth/heritage/admin/village-desk';
const unwrap = <T,>(response: { data: unknown }): T => {
  const body = response.data as { data?: T } | T;
  return (body && typeof body === 'object' && 'data' in (body as object) ? (body as { data: T }).data : body) as T;
};

export const emptyBody = (): VillageBody => ({
  officialName: '', province: '', district: '', countryCode: 'TR', adminType: 'village', latitude: null, longitude: null,
  precision: 'APPROXIMATE', sourceNote: '', duplicateReviewed: false, osmId: '', aliases: [],
});

export const heritageVillageService = {
  async list(params: { q?: string; province?: string; country?: string; status?: string; pendingOnly?: boolean; page?: number; size?: number }): Promise<VillageList> {
    return unwrap(await api.get(ROOT, { params }));
  },
  async detail(id: string): Promise<VillageDetail> {
    return unwrap(await api.get(`${ROOT}/${id}`));
  },
  async create(body: VillageBody): Promise<{ id: string; slug: string }> {
    return unwrap(await api.post(ROOT, body));
  },
  async update(id: string, body: VillageBody): Promise<void> {
    await api.put(`${ROOT}/${id}`, body);
  },
  async remove(id: string): Promise<void> {
    await api.delete(`${ROOT}/${id}`);
  },
  async restore(id: string): Promise<void> {
    await api.post(`${ROOT}/${id}/restore`);
  },
  async check(body: VillageBody, excludeId?: string): Promise<VillageCheck> {
    return unwrap(await api.post(`${ROOT}/check`, body, { params: excludeId ? { excludeId } : undefined }));
  },
  async geocode(q: string, province?: string, district?: string, country?: string): Promise<GeocodeResult> {
    return unwrap(await api.get(`${ROOT}/geocode`, { params: { q, province: province || undefined, district: district || undefined, country: country || undefined } }));
  },
  async addName(id: string, name: string, script: 'latin' | 'cyrillic'): Promise<void> {
    await api.post(`${ROOT}/${id}/names`, { name, script });
  },
  async removeName(id: string, nameId: string): Promise<void> {
    await api.delete(`${ROOT}/${id}/names/${nameId}`);
  },
  async searchFamilies(q: string): Promise<FamilyOption[]> {
    return unwrap(await api.get(`${ROOT}/families/search`, { params: { q } }));
  },
  async addFamily(id: string, familyId: number): Promise<void> {
    await api.post(`${ROOT}/${id}/families`, { familyId });
  },
  async removeFamily(id: string, linkId: string): Promise<void> {
    await api.delete(`${ROOT}/${id}/families/${linkId}`);
  },
  async pendingSummary(): Promise<PendingSummary> {
    return unwrap(await api.get(`${ROOT}/pending-summary`));
  },
  async contributions(id: string): Promise<VillageContributions> {
    return unwrap(await api.get(`${ROOT}/${id}/contributions`));
  },
  async reviewContribution(id: string, contributionId: string, approve: boolean, note?: string): Promise<void> {
    await api.post(`${ROOT}/${id}/contributions/${contributionId}`, { approve, note });
  },
  /** keep: doğru kabul edilir (teyitli sayılır); remove: kaldırılır. */
  async resolveCommunity(id: string, type: 'name' | 'family', itemId: string, action: 'keep' | 'remove'): Promise<void> {
    await api.post(`${ROOT}/${id}/community/${type}/${itemId}`, { action });
  },
  async decideTask(id: string, taskId: string, answer: string): Promise<void> {
    await api.post(`${ROOT}/${id}/tasks/${taskId}`, { answer });
  },
};

export const COUNTRIES: { code: string; label: string }[] = [
  { code: 'TR', label: 'Türkiye' }, { code: 'XK', label: 'Kosova' }, { code: 'BA', label: 'Bosna-Hersek' }, { code: 'MK', label: 'Kuzey Makedonya' },
  { code: 'AL', label: 'Arnavutluk' }, { code: 'RS', label: 'Sırbistan' }, { code: 'BG', label: 'Bulgaristan' }, { code: 'RO', label: 'Romanya' },
  { code: 'GR', label: 'Yunanistan' }, { code: 'JO', label: 'Ürdün' }, { code: 'SY', label: 'Suriye' }, { code: 'IL', label: 'İsrail' },
  { code: 'RU', label: 'Rusya' }, { code: 'GE', label: 'Gürcistan' }, { code: 'UA', label: 'Ukrayna' }, { code: 'DE', label: 'Almanya' },
  { code: 'US', label: 'ABD' },
];

export const countryLabel = (code: string) => COUNTRIES.find((c) => c.code === code)?.label ?? code;

export const CONFIDENCE_LABEL: Record<string, string> = {
  admin_verified: 'Admin teyitli', community_verified: 'Köylü teyitli', source_accepted: 'Kaynaktan kabul', user_corrected: 'Kullanıcı düzeltmesi', automatic: 'Otomatik (teyitsiz)',
};

export const PRECISION_LABEL: Record<Precision, string> = { EXACT: 'Kesin', APPROXIMATE: 'Yaklaşık', HISTORICAL: 'Tarihî (köy artık orada değil)' };

export const ACTION_LABEL: Record<string, string> = {
  CREATE: 'Köy eklendi', UPDATE: 'Köy düzenlendi', REMOVE: 'Köy kaldırıldı', RESTORE: 'Köy geri alındı',
  CONTRIB_APPROVE: 'Kullanıcı katkısı onaylandı', CONTRIB_REJECT: 'Kullanıcı katkısı reddedildi',
  COMMUNITY_ACCEPT: 'Topluluk kaydı kabul edildi', COMMUNITY_REMOVE: 'Topluluk kaydı kaldırıldı', TASK_DECIDE: 'Köy sorusu karara bağlandı',
  NAME_ADD: 'Ad eklendi', NAME_REMOVE: 'Ad kaldırıldı', FAMILY_ADD: 'Sülale eklendi', FAMILY_REMOVE: 'Sülale kaldırıldı',
};
