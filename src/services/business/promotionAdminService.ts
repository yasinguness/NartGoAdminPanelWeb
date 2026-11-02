import { api } from '../api';

/**
 * Ücretli öne çıkarma (business-service `BusinessPromotionController`,
 * docs/plan/nartgo-isletme-one-cikar.md). Fiyatı girilmemiş seçenek satışa kapalıdır.
 */

export type PromotionScope = 'CITY' | 'REGION' | 'COUNTRY';

export interface PromotionPurchase {
  id: string;
  businessId: string;
  businessName?: string | null;
  buyerEmail?: string | null;
  grantedBy?: string | null;
  scope: PromotionScope;
  province: string | null;
  days: number;
  includeStory: boolean;
  amount: number;
  status: 'PENDING' | 'ACTIVE' | 'FAILED' | 'REFUND_NEEDED';
  trial: boolean;
  shipsNationwide?: boolean | null;
  createdAt: string;
  paidAt: string | null;
  startsAt: string | null;
  endsAt: string | null;
  views: number;
  clicks: number;
  note: string | null;
}

export interface ProvinceResult { province: string; promotions: number; avgViews: number; avgClicks: number }

export interface PromotionOverview {
  settings: Record<string, number | null>;
  paidLast7Days: number;
  revenueLast30Days: number;
  refundNeeded: number;
  purchases: PromotionPurchase[];
  byProvince: ProvinceResult[];
}

const ROOT = '/businesses/admin/promotions';
const unwrap = <T,>(response: { data: unknown }): T => {
  const body = response.data as { data?: T } | T;
  return (body && typeof body === 'object' && 'data' in (body as object) ? (body as { data: T }).data : body) as T;
};

export const promotionAdminService = {
  async overview(): Promise<PromotionOverview> {
    return unwrap(await api.get(ROOT));
  },
  async updateSettings(changes: Record<string, number | null>): Promise<Record<string, number | null>> {
    return unwrap(await api.put(`${ROOT}/settings`, changes));
  },
  async markRefunded(id: string): Promise<PromotionPurchase> {
    return unwrap(await api.post(`${ROOT}/${id}/refunded`));
  },
  async grant(body: { businessId: string; scope: PromotionScope; days: number; includeStory: boolean; overrideSlot: boolean; note?: string }): Promise<PromotionPurchase> {
    return unwrap(await api.post(`${ROOT}/grant`, body));
  },
};

export const SCOPE_LABEL: Record<PromotionScope, string> = { CITY: 'İl', REGION: 'Bölge', COUNTRY: 'Tüm Türkiye' };
