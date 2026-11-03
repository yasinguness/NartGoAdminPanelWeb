import { api } from './api';

/**
 * Kontrol panelindeki iki kartı besleyen uçlar.
 *
 * İkisi de auth-service'te ve panel sözleşmesine göre yazıldı
 * (docs/admin-dashboard-api-contract.md). Uçlar yayına alınmadan önce 404
 * dönüyor; kartlar o durumda sessizce gizleniyor, servis yayına girince
 * kendiliğinden görünüyorlar. Bu yüzden hata yutuluyor ve `null` dönülüyor.
 */

/** Kayıt sonrası profil tamamlama hunisi. Adımlar kümülatiftir. */
export interface OnboardingFunnelStep {
  key: string;
  label: string;
  count: number;
}

export interface OnboardingFunnel {
  days: number;
  cohortSize: number;
  steps: OnboardingFunnelStep[];
}

/** Ortak Hafıza birikimi ve bu hafta en çok ilerleyen köyler. */
export interface HeritageAdminStats {
  villages: { total: number; withConfirmedLocation: number };
  families: { total: number; linkedToVillage: number };
  contributions7d: { count: number; contributors: number };
  topProgressVillages: Array<{
    /** Veritabanında UUID; sayı değil. */
    villageId: string;
    name: string;
    province: string | null;
    completionPct: number;
    /** 7 gün öncesine göre yüzde PUANI farkı. */
    deltaPct: number;
  }>;
}

/** Süs sayaçlar: 401'leri oturumu kapatmamalı. */
const REQ: Record<string, unknown> = { skipAuthRedirect: true };

const unwrap = <T,>(body: unknown): T | null => {
  const b = body as { data?: T } | T;
  const v = (b && typeof b === 'object' && 'data' in (b as object) ? (b as { data: T }).data : b) as T;
  return v ?? null;
};

export const dashboardStatsService = {
  async onboardingFunnel(days = 30): Promise<OnboardingFunnel | null> {
    try {
      const res = await api.get('/auth/admin/onboarding/funnel', { params: { days }, ...REQ });
      const d = unwrap<OnboardingFunnel>(res.data);
      // Uç boş kohortta cohortSize: 0 ve sıfır sayılı adımlar döndürüyor,
      // null döndürmüyor; yine de dizi gelmezse kartı gösterme.
      return d && Array.isArray(d.steps) ? d : null;
    } catch {
      return null;
    }
  },

  async heritageStats(): Promise<HeritageAdminStats | null> {
    try {
      const res = await api.get('/auth/heritage/admin/stats', REQ);
      const d = unwrap<HeritageAdminStats>(res.data);
      if (!d || !d.villages) return null;
      return { ...d, topProgressVillages: d.topProgressVillages ?? [] };
    } catch {
      return null;
    }
  },
};
