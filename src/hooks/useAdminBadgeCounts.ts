import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { nbAdminService } from '../services/nartbusiness/nbAdminService';
import { emailTemplateService } from '../services/emailTemplateService';

/**
 * Admin "müdahale bekleyen" kuyruk sayıları — sidebar nav badge'lerini besler.
 *
 * Admin paneli saf REST (websocket yok); bu yüzden 60 sn polling + pencere
 * odaklanınca yenileme ile "yeni iş geldi mi" sinyali veriyoruz. Her alt-çağrı
 * defansif: hata/403/404 → o kuyruk 0 sayılır, badge sistemi tek bir servisin
 * down olmasından etkilenmez.
 *
 * Dönen anahtarlar nav item path'leridir (Layout eşlemesi için).
 */
export interface AdminBadgeCounts {
  '/nartbusiness/verification': number;
  '/nartbusiness/members': number;
  '/nartbusiness/moderation': number;
  '/nartbusiness/market-opinions': number;
  '/nartbusiness/market-news': number;
  '/business-claims': number;
  '/email-logs': number;
}

const EMPTY: AdminBadgeCounts = {
  '/nartbusiness/verification': 0,
  '/nartbusiness/members': 0,
  '/nartbusiness/moderation': 0,
  '/nartbusiness/market-opinions': 0,
  '/nartbusiness/market-news': 0,
  '/business-claims': 0,
  '/email-logs': 0,
};

function unwrap(body: any): any {
  if (body && typeof body === 'object' && 'data' in body) return body.data;
  return body;
}

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

async function fetchCounts(): Promise<AdminBadgeCounts> {
  const [stats, moderation, opinions, news, claims, emailFailed] = await Promise.all([
    // Üyelik dashboard istatistikleri — verification + members badge'lerini besler.
    safe(async () => {
      const s: any = await nbAdminService.getDashboardStats();
      return {
        pendingVerification: Number(s?.pendingVerification ?? 0),
        paymentPending: Number(s?.paymentPending ?? 0),
      };
    }, { pendingVerification: 0, paymentPending: 0 }),
    // Topluluk şikayet moderasyonu — açık (OPEN) kayıtlar
    safe(async () => {
      const res = await api.get<any>('/nb/admin/community/reports', { params: { limit: 100 } });
      const list = unwrap(res.data);
      if (!Array.isArray(list)) return 0;
      return list.filter((r: any) => (r?.status ?? 'OPEN') === 'OPEN').length;
    }, 0),
    // Üye görüşleri — onay bekleyen
    safe(async () => {
      const res = await api.get<any>('/nb/market/admin/opinions/pending', { params: { limit: 100 } });
      const list = unwrap(res.data);
      return Array.isArray(list) ? list.length : 0;
    }, 0),
    // Piyasa haberleri — onay bekleyen (hibrit moderasyon)
    safe(async () => {
      const res = await api.get<any>('/nb/market/admin/news/pending', { params: { limit: 100 } });
      const list = unwrap(res.data);
      return Array.isArray(list) ? list.length : 0;
    }, 0),
    // İşletme talepleri — PENDING toplam (size=1 ile sadece sayım)
    safe(async () => {
      const res = await api.get<any>('/businesses/admin/claims', { params: { status: 'PENDING', page: 0, size: 1 } });
      const body = unwrap(res.data);
      return Number(body?.totalElements ?? body?.total ?? 0);
    }, 0),
    // Başarısız e-postalar
    safe(async () => {
      const page = await emailTemplateService.logs({ status: 'FAILED', page: 0, size: 1 });
      return Number(page?.totalElements ?? 0);
    }, 0),
  ]);

  return {
    '/nartbusiness/verification': stats.pendingVerification,
    // Bekleyen kayıt: komiteye sunulan + onaylanıp ödeme bekleyen üyeler
    // (members sayfasındaki "Bekleyen" stat'ıyla aynı mantık).
    '/nartbusiness/members': stats.pendingVerification + stats.paymentPending,
    '/nartbusiness/moderation': moderation,
    '/nartbusiness/market-opinions': opinions,
    '/nartbusiness/market-news': news,
    '/business-claims': claims,
    '/email-logs': emailFailed,
  };
}

/**
 * Nav badge sayıları. 60 sn'de bir + pencere odaklanınca yenilenir.
 * `counts[path]` ile Layout her nav item için badge gösterir.
 */
export function useAdminBadgeCounts(): Record<string, number> {
  const { data } = useQuery({
    queryKey: ['admin-badge-counts'],
    queryFn: fetchCounts,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
    placeholderData: EMPTY,
  });
  return (data ?? EMPTY) as unknown as Record<string, number>;
}
