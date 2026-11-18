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

/** closed: geçmiş (reddedilen başvuru ya da davet, kaldırılan editörlük). */
export type EditorListStatus = 'requested' | 'invited' | 'active' | 'closed';

export interface VillageEditorRow {
  userId: string;
  name: string | null;
  email: string | null;
  villageId: string;
  villageName: string;
  province: string;
  status: 'requested' | 'invited' | 'active' | 'declined' | 'revoked';
  createdAt: string;
  decidedAt: string | null;
  /** Kişi o köyün üyesi mi (eski sunucu göndermez). */
  member?: boolean;
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
  /** Aday listesine bakmadan ekler. direct: hemen editör olur; değilse davet gider, kişi kabul edince editör olur. */
  async add(userId: string, villageId: string, direct: boolean): Promise<void> {
    await api.post(ROOT, { userId, villageId, direct });
  },
  /** Editörlüğü ya da yanıtlanmamış daveti başka köye taşır. */
  async move(userId: string, fromVillageId: string, toVillageId: string): Promise<void> {
    await api.post(`${ROOT}/move`, { userId, fromVillageId, toVillageId });
  },
  /** Yalnız geçmişteki kayıt silinir. */
  async remove(userId: string, villageId: string): Promise<void> {
    await api.delete(ROOT, { params: { userId, villageId } });
  },
  /** approve ve decline başvuru için; revoke editörlüğü ya da yanıtlanmamış daveti geri alır. */
  async decide(userId: string, villageId: string, decision: 'approve' | 'decline' | 'revoke'): Promise<void> {
    await api.post(`${ROOT}/decision`, { userId, villageId, decision });
  },
};
