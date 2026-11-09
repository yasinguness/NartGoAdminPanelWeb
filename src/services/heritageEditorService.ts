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
