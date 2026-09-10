import { api } from '../api';

/** Backend ortak ShareStatsView (common-api) ile birebir. */
export interface ShareStatsView {
  entityType: 'LISTING' | 'MEMBER' | 'QUESTION';
  clicks: number;   // paylaşım linkinin açılması (landing hit)
  shares: number;   // uygulama içi "Paylaş" eylemi
  byPlatform: Record<string, number>;
  windowDays: number;
}

function unwrap<T>(body: any): T | null {
  if (body && typeof body === 'object' && 'data' in body) {
    return (body.data ?? null) as T | null;
  }
  return (body ?? null) as T | null;
}

async function fetchOne(path: string, days: number): Promise<ShareStatsView | null> {
  try {
    const res = await api.get<any>(path, { params: { days } });
    return unwrap<ShareStatsView>(res.data);
  } catch {
    // Servis-başına tolerans: biri düşse de diğerleri gösterilsin.
    return null;
  }
}

/**
 * NB paylaşım istatistiklerini 3 servisten (needs/directory/community) çekip
 * birleştirir. Gateway `/api/v1/nb/admin/{servis}/share-stats` → ilgili servis.
 */
export async function getShareStats(days = 30): Promise<ShareStatsView[]> {
  const [listing, member, question] = await Promise.all([
    fetchOne('/nb/admin/needs/share-stats', days),
    fetchOne('/nb/admin/directory/share-stats', days),
    fetchOne('/nb/admin/community/share-stats', days),
  ]);
  return [listing, member, question].filter(Boolean) as ShareStatsView[];
}

export const ENTITY_LABEL: Record<ShareStatsView['entityType'], string> = {
  LISTING: 'İlan',
  MEMBER: 'İşletme',
  QUESTION: 'Soru',
};
