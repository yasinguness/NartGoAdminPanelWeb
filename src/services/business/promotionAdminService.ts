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
  /** Uygulamadaki "Öne çıkarma çok yakında, haber ver" kaydı (işletme sahibi). */
  interestCount?: number;
  purchases: PromotionPurchase[];
  byProvince: ProvinceResult[];
}

/** Yer durumu: `used`/`limit` ve bir sonraki boşalma zamanı. */
export interface PromotionSlot {
  limit: number;
  used: number;
  available: boolean;
  nextFreeAt?: string | null;
}

/**
 * `GET /businesses/{id}/promotion` — işletme sahibinin teklif ekranını besleyen uç.
 * Admin de çağırabiliyor (controller'da `hasAnyAuthority('ROLE_ADMIN',...)`), bu yüzden
 * deneme tanımlarken "yer dolu mu", "fotoğrafı var mı" sorularını tahmin etmek yerine
 * sunucudan okuyoruz — işletmeyi seçtiğimiz anda.
 */
export interface PromotionOffer {
  businessId: string;
  businessName: string;
  city: string | null;
  province: string | null;
  region: string | null;
  businessActive: boolean;
  eligibility: { ok: boolean; missing: PromotionMissing[] };
  enabled: boolean;
  slot: PromotionSlot;
  storySlot: PromotionSlot;
  current: { purchaseId: string; scope: PromotionScope; endsAt: string; remainingDays: number } | null;
}

/** `missing(BusinessEntity)` sunucudaki dört eksik. */
export type PromotionMissing = 'PHOTO' | 'CATEGORY' | 'CITY' | 'INACTIVE';

/** Eksiklerin admin'e görünen karşılığı; sunucudaki `missingMessage` ile aynı anlam. */
export const MISSING_LABEL: Record<PromotionMissing, string> = {
  PHOTO: 'Fotoğraf yok',
  CATEGORY: 'Kategori seçilmemiş',
  CITY: 'İl çözümlenemedi',
  INACTIVE: 'İşletme yayında değil',
};

/** Eksik yoksa gösterilen olumlu kontroller. */
export const CHECK_LABEL: Record<PromotionMissing, string> = {
  PHOTO: 'Fotoğraf',
  CATEGORY: 'Kategori',
  CITY: 'İl',
  INACTIVE: 'Yayında',
};

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
  /** Seçilen işletmenin uygunluğu ve yer durumu (deneme panelinde kullanılır). */
  async offerFor(businessId: string): Promise<PromotionOffer> {
    return unwrap(await api.get(`/businesses/${businessId}/promotion`));
  },
};

export const SCOPE_LABEL: Record<PromotionScope, string> = { CITY: 'İl', REGION: 'Bölge', COUNTRY: 'Tüm Türkiye' };

/** Kapsamın ne yaptığı — fiyat tablosunda başlığın altında duran açıklama. */
export const SCOPE_HINT: Record<PromotionScope, string> = {
  CITY: 'İşletmenin bulunduğu ilde',
  REGION: 'İlin bulunduğu coğrafi bölge',
  COUNTRY: 'Online satış ya da kargo yapanlar için',
};

export const SCOPES: PromotionScope[] = ['CITY', 'REGION', 'COUNTRY'];

/** Sunucunun fiyat anahtarları: `CITY_7`, `STORY_30` … */
export const priceKey = (scope: PromotionScope, days: 7 | 30) => `${scope}_${days}`;
export const storyKey = (days: 7 | 30) => `STORY_${days}`;
export const CITY_SLOT_LIMIT = 'CITY_SLOT_LIMIT';
export const STORY_SLOT_LIMIT = 'STORY_SLOT_LIMIT';
/** Sunucudaki varsayılanlar (`PromotionSettings`). */
export const DEFAULT_SLOT_LIMIT = 3;
