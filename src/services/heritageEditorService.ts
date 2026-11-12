import { api } from './api';

/**
 * Köy Editörü rolü (Keycloak `nart_village_editor`) ve editör gözetimi.
 * Sunucu: auth-service HeritageEditorAdminController, yalnız yönetici. Bkz. docs/plan/nartgo-koy-editoru.md
 */
const ROOT = '/auth/heritage/admin/editors';

const unwrap = <T,>(response: { data: unknown }): T => {
  const body = response.data as { data?: T } | T;
  return (body && typeof body === 'object' && 'data' in (body as object) ? (body as { data: T }).data : body) as T;
};

export interface EditorActionSummary {
  last24h: number;
  newVillages7d: number;
  recent: { actorEmail: string | null; method: string; path: string; status: number; createdAt: string }[];
}

export type AdminRequestKind = 'contribution' | 'family_merge' | 'village_remove';

export interface AdminRequest {
  id: string;
  kind: AdminRequestKind;
  target: string;
  villageId: string | null;
  villageSlug: string | null;
  title: string;
  note: string;
  requestedEmail: string | null;
  status: 'open' | 'done' | 'declined';
  resolvedNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface AdminRequestTarget { kind: AdminRequestKind; target: string; status: 'open' | 'declined'; resolvedNote: string | null }

/** Köy Editörünün yetkisi dışındaki kararı yöneticiye göndermesi. Sunucu: HeritageAdminRequestController. */
const REQ = '/auth/heritage/admin/requests';

export const heritageAdminRequestService = {
  async send(kind: AdminRequestKind, target: string, note: string): Promise<{ id: string; alreadyOpen: boolean }> {
    return unwrap(await api.post(REQ, { kind, target, note }));
  },
  async openTargets(): Promise<AdminRequestTarget[]> {
    return unwrap<AdminRequestTarget[]>(await api.get(`${REQ}/open-targets`)) ?? [];
  },
  /** Yalnız yönetici. status: open (varsayılan) ya da closed. */
  async list(status: 'open' | 'closed' = 'open'): Promise<{ items: AdminRequest[]; open: number }> {
    return unwrap(await api.get(REQ, { params: { status } }));
  },
  async resolve(id: string, status: 'done' | 'declined', note: string): Promise<void> {
    await api.post(`${REQ}/${id}/resolve`, { status, note });
  },
};

/** Sülale çifti anahtarı: sunucu küçük:büyük biçiminde saklar. */
export const familyPairKey = (a: number, b: number) => `${Math.min(a, b)}:${Math.max(a, b)}`;

export const heritageEditorService = {
  async status(userId: string): Promise<boolean> {
    return unwrap<{ editor: boolean }>(await api.get(`${ROOT}/${userId}`)).editor;
  },
  async grant(userId: string): Promise<boolean> {
    return unwrap<{ editor: boolean }>(await api.put(`${ROOT}/${userId}`)).editor;
  },
  async revoke(userId: string): Promise<boolean> {
    return unwrap<{ editor: boolean }>(await api.delete(`${ROOT}/${userId}`)).editor;
  },
  async actions(): Promise<EditorActionSummary> {
    return unwrap(await api.get(`${ROOT}/actions`));
  },
};
