import { api } from './api';

/**
 * Köy Masası: Ortak Hafıza'da bekleyen işlerin sayısı, son günlerin hareketi ve köy bazında özet.
 * Sunucu: auth-service HeritageDeskService. Bkz. docs/plan/nartgo-koy-masasi.md
 */
const ROOT = '/auth/heritage/admin/desk';

const unwrap = <T,>(response: { data: unknown }): T => {
  const body = response.data as { data?: T } | T;
  return (body && typeof body === 'object' && 'data' in (body as object) ? (body as { data: T }).data : body) as T;
};

export interface DeskPending {
  photos: number;
  voices: number;
  /** Kaldırılması istenip gizlenen fotoğraflar. */
  removals: number;
  /** Şikâyetle gizlenen duyurular. */
  announcements: number;
  /** Tarihçesi ya da ses kaydı olup göç yolu girilmemiş köyler. */
  migration: number;
  /** Köy editörlüğü başvuruları (yalnız yöneticiye sayılır). */
  editorRequests: number;
}

export interface DeskActivity {
  photos: number;
  albumPhotos: number;
  voices: number;
  listens: number;
  names: number;
  announcements: number;
  responses: number;
  invites: number;
  inviteJoins: number;
  histories: number;
}

export interface DeskSummary {
  pending: DeskPending;
  /** En eski bekleyen fotoğraf ya da ses kaydının yaşı, saat. */
  oldestPendingHours: number | null;
  last7: DeskActivity;
  last30: DeskActivity;
  totals: { photos: number; albumPhotos: number; voices: number; villagesWithArchive: number; villageEditors: number; routesPublished: number };
}

export interface DeskVillage {
  id: string;
  name: string;
  province: string;
  district: string;
  members: number;
  families: number;
  photos: number;
  voices: number;
  albums: number;
  announcements30: number;
  pending: number;
  editors: string | null;
  routeStatus: 'draft' | 'published' | null;
  inviteJoins: number;
}

/** Kuyrukta karar bekleyen iş sayısı (menü rozeti ve başlık için). */
export const deskQueueTotal = (p: DeskPending) => p.photos + p.voices + p.removals + p.announcements;

export const heritageDeskService = {
  async summary(config?: Record<string, unknown>): Promise<DeskSummary> {
    return unwrap(await api.get(`${ROOT}/summary`, config));
  },
  async villages(): Promise<DeskVillage[]> {
    return unwrap(await api.get(`${ROOT}/villages`));
  },
};
