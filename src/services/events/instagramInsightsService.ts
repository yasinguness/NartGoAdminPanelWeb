/**
 * @nartgo Instagram analizi (content-service, Editör Masası; docs/plan/nartgo-editor-masasi.md).
 *
 * Sunucu Graph API'den paylaşım istatistiklerini, takipçilerin saat saat
 * çevrimiçi sayılarını ve demografiyi çeker; anahtar tarayıcıya hiç gelmez.
 * Rapor 3 saat önbelleklidir; "Yenile" yeniden çeker (en sık 2 dakikada bir).
 */

import { api } from '../api';

const ROOT = '/content/admin/desk/instagram';

const unwrap = <T,>(response: { data: unknown }): T => {
  const body = response.data as { data?: T } | T;
  return (body && typeof body === 'object' && 'data' in (body as object) ? (body as { data: T }).data : body) as T;
};

export interface IgPoint { date: string; value: number }
export interface IgBreakdown { label: string; value: number }

export interface IgPost {
  id: string;
  /** Eşleşen Editor's Desk gönderisi (kuyruktan ya da elle). */
  deskPostId?: string | null;
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
  /** Gece kaydından günlük geçmiş (28 gün sınırı olmadan); followers yalnız kaydın alındığı günler için dolu. */
  history: IgHistoryPoint[];
}

export interface IgHistoryPoint {
  date: string;
  followers: number | null;
  reach: number | null;
  views: number | null;
  follows: number | null;
  interactions: number | null;
}

export interface SuggestedTime { at: string; hour: number; online: number }

export interface PerfPost {
  mediaId: string;
  permalink: string | null;
  format: string | null;
  topic: string | null;
  title: string;
  postedAt: string;
  deskPostId: string | null;
  deskFormat: string | null;
  matchSource: 'queue' | 'manual' | 'none' | null;
  reach: number | null; views: number | null; likes: number | null; comments: number | null;
  saves: number | null; shares: number | null; interactions: number | null;
  firstDay: { reach: number | null; views: number | null; interactions: number | null };
  week: { reach: number | null; saves: number | null; shares: number | null };
  aboveMedian: boolean | null;
}

export interface PerfGroup { key: string; count: number; medianReach: number; medianSaves: number; medianShares: number }

export interface Performance {
  days: number;
  medianReach: number;
  byFormat: PerfGroup[];
  byTopic: PerfGroup[];
  posts: PerfPost[];
  unmatched: number;
  lastSnapshot: string | null;
}

export interface DeskPostRef { id: string; title: string | null; date: string | null; format: string | null; status: string | null }

export const instagramInsightsService = {
  async insights(refresh = false): Promise<IgInsights> {
    return unwrap<IgInsights>(await api.get(`${ROOT}/insights`, { params: { refresh } }));
  },
  async performance(days = 90): Promise<Performance> {
    return unwrap<Performance>(await api.get(`${ROOT}/performance`, { params: { days } }));
  },
  /** date: "YYYY-MM-DD" (İstanbul günü). */
  async suggestedTimes(date: string): Promise<SuggestedTime[]> {
    return unwrap<SuggestedTime[]>(await api.get(`${ROOT}/suggested-times`, { params: { date } }));
  },
  async deskPosts(q: string): Promise<DeskPostRef[]> {
    return unwrap<DeskPostRef[]>(await api.get(`${ROOT}/desk-posts`, { params: { q } }));
  },
  async match(mediaId: string, deskPostId: string): Promise<void> {
    await api.post(`${ROOT}/media/${encodeURIComponent(mediaId)}/match`, { deskPostId });
  },
  async unmatch(mediaId: string): Promise<void> {
    await api.delete(`${ROOT}/media/${encodeURIComponent(mediaId)}/match`);
  },
};
