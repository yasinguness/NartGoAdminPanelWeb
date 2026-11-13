import { api } from './api';

/**
 * Göç yolu (yönetici ve Köy Editörü): köyün Kafkasya'daki kökeninden bugünkü yerine uzanan duraklar.
 * Sunucu: auth-service HeritageMigrationService. Bkz. docs/plan/nartgo-goc-yolu.md
 */
const ROOT = '/auth/heritage/admin/migration';

const unwrap = <T,>(response: { data: unknown }): T => {
  const body = response.data as { data?: T } | T;
  return (body && typeof body === 'object' && 'data' in (body as object) ? (body as { data: T }).data : body) as T;
};

export type RouteStatus = 'draft' | 'published' | null;

export interface MigrationStop {
  place: string;
  /** Sıralama ve paylaşım görseli için tek yıl; belirsizse boş. */
  year: number | null;
  /** Ekranda yazan hâli: "1864", "1864 ile 1867 arası". */
  yearText: string | null;
  note: string | null;
  /** Zorunlu: kaynağı olmayan durak kaydedilmez. */
  source: string;
  latitude: number | null;
  longitude: number | null;
}

export interface MigrationQueueRow {
  id: string;
  villageName: string;
  province: string;
  district: string;
  /** null: yol yok, ama tarihçe ya da ses kaydı var. */
  status: RouteStatus;
  updatedAt: string | null;
  stops: number;
  histories: number;
  voices: number;
}

export interface MigrationEditorView {
  village: { id: string; slug: string; name: string; province: string; district: string; latitude: number; longitude: number };
  status: RouteStatus;
  stops: MigrationStop[];
  /** Üyelerin yazdığı tarihçeler: editöre ipucu. */
  histories: { narrative: string; origin: string; period: string; sourceNote: string }[];
  /** "Ailen köye nereden gelmiş?" ve "Köy nasıl kuruldu?" ses kayıtları. */
  voices: { prompt: string; title: string | null; narratorName: string; audioUrl: string; durationSeconds: number }[];
}

export const heritageMigrationService = {
  async queue(config?: Record<string, unknown>): Promise<{ items: MigrationQueueRow[]; waiting: number; drafts: number }> {
    return unwrap(await api.get(ROOT, config));
  },
  async view(villageId: string): Promise<MigrationEditorView> {
    return unwrap(await api.get(`${ROOT}/${villageId}`));
  },
  /** publish=false taslak kaydeder (yayındaki yol da taslağa döner); publish=true üyeye açar. */
  async save(villageId: string, stops: MigrationStop[], publish: boolean): Promise<void> {
    await api.put(`${ROOT}/${villageId}`, { stops, publish });
  },
  async remove(villageId: string): Promise<void> {
    await api.delete(`${ROOT}/${villageId}`);
  },
};
