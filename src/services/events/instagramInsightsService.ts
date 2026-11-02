/**
 * @nartgo Instagram analizi (event-service).
 *
 * Sunucu Graph API'den paylaşım istatistiklerini, takipçilerin saat saat
 * çevrimiçi sayılarını ve demografiyi çeker; anahtar tarayıcıya hiç gelmez.
 * Rapor 3 saat önbelleklidir; "Yenile" yeniden çeker (en sık 2 dakikada bir).
 */

import { api } from '../api';

const ROOT = '/events/admin/instagram';

const unwrap = <T,>(response: { data: unknown }): T => {
  const body = response.data as { data?: T } | T;
  return (body && typeof body === 'object' && 'data' in (body as object) ? (body as { data: T }).data : body) as T;
};

export interface IgPoint { date: string; value: number }
export interface IgBreakdown { label: string; value: number }

export interface IgPost {
  /** İstanbul saatiyle ISO zaman (ör. 2026-10-29T19:56:59+03:00). */
  timestamp: string;
  type: 'Reels' | 'Carousel' | 'Fotoğraf';
  /** Açıklamadan tahmin edilen konu. */
  topic: string;
  /** Açıklamanın ilk satırı. */
  title: string;
  permalink?: string | null;
  reach: number;
  views: number;
  interactions: number;
  shares: number;
  saves: number;
  likes: number;
  comments: number;
}

export interface IgInsights {
  fetchedAt: string;
  account: { username: string; followers: number; mediaCount: number };
  /** Son 28 gün toplamları: reach, views, profile_views, accounts_engaged, total_interactions. */
  totals28: Record<string, number>;
  dailyReach: IgPoint[];
  dailyFollows: IgPoint[];
  /** [haftanın günü 0=Pzt][İstanbul saati] ortalama çevrimiçi takipçi; veri yoksa null. */
  heat: (number | null)[][];
  age: IgBreakdown[];
  gender: IgBreakdown[];
  city: IgBreakdown[];
  country: IgBreakdown[];
  posts: IgPost[];
}

export const instagramInsightsService = {
  async insights(refresh = false): Promise<IgInsights> {
    return unwrap<IgInsights>(await api.get(`${ROOT}/insights`, { params: { refresh } }));
  },
};
