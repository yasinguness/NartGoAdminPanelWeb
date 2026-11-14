import { api } from './api';

/**
 * Köye bağlı Köy Editörü atama (yalnız yönetici). Köy editörü yalnız kendi köyünde ve yalnız onay verir;
 * reddetme, kaldırma ve silme genel editörde kalır. Bkz. docs/plan/nartgo-koy-editoru-koy-bazli.md
 */
const ROOT = '/auth/heritage/admin/village-editors';

const unwrap = <T,>(response: { data: unknown }): T => {
  const body = response.data as { data?: T } | T;
  return (body && typeof body === 'object' && 'data' in (body as object) ? (body as { data: T }).data : body) as T;
};

export interface EditorCandidate {
  userId: string;
  name: string | null;
  email: string | null;
  villageId: string;
  villageName: string;
  province: string;
  /** Köyünde "listede görün" demiş mi. */
  visible: boolean;
  /** Son 60 günde bu köy için onaylanan katkı (ad, sülale, düzeltme). */
  contributions: number;
  photos: number;
  voices: number;
}

export type EditorListStatus = 'requested' | 'invited' | 'active';

export interface VillageEditorRow {
  userId: string;
  name: string | null;
  email: string | null;
  villageId: string;
  villageName: string;
  province: string;
  status: EditorListStatus;
  createdAt: string;
  decidedAt: string | null;
}

export const heritageVillageEditorService = {
  async candidates(): Promise<EditorCandidate[]> {
    return unwrap(await api.get(`${ROOT}/candidates`));
  },
  async list(status: EditorListStatus, config?: Record<string, unknown>): Promise<{ items: VillageEditorRow[]; requested: number }> {
    return unwrap(await api.get(ROOT, { ...config, params: { status } }));
  },
  /** Kişi uygulamada kabul edince editör olur. */
  async invite(userId: string, villageId: string): Promise<void> {
    await api.post(`${ROOT}/invite`, { userId, villageId });
  },
  /** approve ve decline başvuru için; revoke editörlüğü ya da yanıtlanmamış daveti geri alır. */
  async decide(userId: string, villageId: string, decision: 'approve' | 'decline' | 'revoke'): Promise<void> {
    await api.post(`${ROOT}/decision`, { userId, villageId, decision });
  },
};
