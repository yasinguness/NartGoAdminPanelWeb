import { api } from './api';

/**
 * Köy duyuru panosu inceleme kuyruğu (yönetici ve Köy Editörü).
 * Sunucu: auth-service HeritageAnnouncementService. Bkz. docs/plan/nartgo-koy-geri-gelme.md
 */
const ROOT = '/auth/heritage/admin/announcements';

const unwrap = <T,>(response: { data: unknown }): T => {
  const body = response.data as { data?: T } | T;
  return (body && typeof body === 'object' && 'data' in (body as object) ? (body as { data: T }).data : body) as T;
};

export type AnnouncementKind = 'wedding' | 'condolence' | 'mevlit' | 'festival' | 'other';

export const ANNOUNCEMENT_KIND_LABEL: Record<AnnouncementKind, string> = {
  wedding: 'Düğün',
  condolence: 'Taziye',
  mevlit: 'Mevlit',
  festival: 'Şenlik',
  other: 'Diğer',
};

export interface ReportedAnnouncement {
  id: string;
  kind: AnnouncementKind;
  title: string;
  body: string | null;
  place: string | null;
  eventDate: string | null;
  eventTime: string | null;
  /** published: şikâyet aldı ama yayında; hidden: 3 şikâyetle gizlendi. */
  status: 'published' | 'hidden';
  createdAt: string;
  villageName: string;
  villageSlug: string;
  authorName: string | null;
  authorEmail: string | null;
  reports: number;
  reasons: string | null;
}

export const heritageAnnouncementService = {
  async queue(config?: Record<string, unknown>): Promise<{ items: ReportedAnnouncement[]; hidden: number }> {
    return unwrap(await api.get(ROOT, config));
  },
  /** restore: şikâyetler silinir, yeniden yayında. remove: kaldırılır. */
  async decide(id: string, decision: 'restore' | 'remove', note?: string): Promise<void> {
    await api.post(`${ROOT}/${id}/decision`, { decision, note });
  },
};
