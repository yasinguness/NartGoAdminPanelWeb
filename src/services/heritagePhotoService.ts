import { api } from './api';

/**
 * Eski fotoğraf arşivi inceleme kuyruğu (yönetici ve Köy Editörü).
 * Sunucu: auth-service HeritagePhotoService. Bkz. docs/plan/nartgo-koy-geri-gelme.md
 */
const ROOT = '/auth/heritage/admin/photos';

const unwrap = <T,>(response: { data: unknown }): T => {
  const body = response.data as { data?: T } | T;
  return (body && typeof body === 'object' && 'data' in (body as object) ? (body as { data: T }).data : body) as T;
};

/** pending: inceleme bekleyen. requested: kaldırılması istenip gizlenen. published: yayındakiler. */
export type PhotoQueue = 'pending' | 'requested' | 'published';
export type PhotoDecision = 'approve' | 'reject' | 'remove' | 'keep' | 'clear_names';

export interface ArchivePhoto {
  id: string;
  imageUrl: string;
  caption: string | null;
  year: number | null;
  /** hidden: kaldırılması istendi, karar verilene kadar gizli. */
  status: 'pending' | 'published' | 'hidden';
  createdAt: string;
  villageName: string;
  villageSlug: string;
  authorName: string | null;
  authorEmail: string | null;
  /** Doluysa albüm fotoğrafı, boşsa eski fotoğraf. İkisini de giriş yapmış herkes görür. */
  albumTitle: string | null;
  removalRequests: number;
  removalReasons: string | null;
  /** İsim önerileri, " | " ile ayrılmış. */
  names: string | null;
}

export const heritagePhotoService = {
  async queue(status: PhotoQueue = 'pending', config?: Record<string, unknown>): Promise<{ items: ArchivePhoto[]; pending: number; requested: number }> {
    return unwrap(await api.get(ROOT, { ...config, params: { status } }));
  },
  /**
   * approve ve reject incelemedeki fotoğraf için, remove yayındaki için (ret ve kaldırmada dosya silinir).
   * keep gizlenen fotoğrafı yeniden yayına alır, clear_names isim önerilerini siler.
   */
  async decide(id: string, decision: PhotoDecision, note?: string): Promise<void> {
    await api.post(`${ROOT}/${id}/decision`, { decision, note });
  },
};
