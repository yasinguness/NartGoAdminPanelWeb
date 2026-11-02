/**
 * Editor's Desk → Instagram paylaşım kuyruğu (content-service).
 *
 * Desk'te "Tümü (.zip)" indirilince paket (slayt görselleri + açıklama) buraya düşer.
 * Paylaşım Instagram Content Publishing API ile sunucudan yapılır; anahtar tarayıcıya gelmez.
 */

import { api } from '../api';

const ROOT = '/content/admin/desk/instagram';

export type IgPackageState = 'READY' | 'SCHEDULED' | 'PUBLISHING' | 'PUBLISHED' | 'FAILED';

export interface IgPackage {
  postId: string;
  title: string;
  caption: string;
  /** Slayt JPEG adresleri (aynı origin, herkese açık). */
  slides: string[];
  state: IgPackageState;
  scheduledAt: string | null;
  publishedAt: string | null;
  permalink: string | null;
  error: string | null;
  updatedAt: string;
  createdBy: string | null;
  postDate: string | null;
  postStatus: string | null;
  format: string | null;
  /** Gönderi tarihi + plan saatinden önerilen paylaşım zamanı. */
  defaultAt: string | null;
}

export interface IgQueueConfig {
  /** Sunucuda paylaşım açık mı (DESK_INSTAGRAM_ENABLED). */
  enabled: boolean;
  /** Instagram anahtarı tanımlı mı. */
  configured: boolean;
  maxSlides: number;
}

export const deskInstagramService = {
  async config(): Promise<IgQueueConfig> {
    return (await api.get(`${ROOT}/config`)).data;
  },
  async packages(): Promise<IgPackage[]> {
    return (await api.get(`${ROOT}/packages`)).data;
  },
  async publish(postId: string): Promise<void> {
    await api.post(`${ROOT}/packages/${encodeURIComponent(postId)}/publish`);
  },
  async schedule(postId: string, at: Date): Promise<void> {
    await api.put(`${ROOT}/packages/${encodeURIComponent(postId)}/schedule`, { at: at.toISOString() });
  },
  async unschedule(postId: string): Promise<void> {
    await api.delete(`${ROOT}/packages/${encodeURIComponent(postId)}/schedule`);
  },
  async remove(postId: string): Promise<void> {
    await api.delete(`${ROOT}/packages/${encodeURIComponent(postId)}`);
  },
};
