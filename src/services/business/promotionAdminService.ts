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
  /** Ayar başına son değişiklik. Şekli sunucuda teyit edilmedi; bkz. `normalizeSettingChanges`. */
  settingChanges?: unknown;
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
  /**
   * Kapsam başına yer durumu (3 Kasım 2026). Eski `slot` alanı il yeri olarak
   * duruyor; mobil uygulama bozulmasın diye sunucu ikisini birden döndürüyor.
   * Sunucu güncellenmeden önce bu alan gelmez, o yüzden opsiyonel.
   */
  slots?: Partial<Record<PromotionScope, PromotionSlot>>;
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

/**
 * `missing(BusinessEntity)` sunucudaki uygunluk eksikleri.
 *
 * Liste sunucuda büyüyebilir — nitekim OWNERSHIP 2 Kasım 2026'da eklendi ve
 * panel onu tanımadığı için eksik hiç görünmüyordu: dört çip yeşil kalırken
 * "öne çıkarılamaz" uyarısı çıkıyordu. Bu yüzden tip artık açık uçlu ve
 * arayüz tanımadığı kodu da yazıyor (bkz. `CheckChips`).
 */
export type PromotionMissing = 'PHOTO' | 'CATEGORY' | 'CITY' | 'INACTIVE' | 'OWNERSHIP' | (string & {});

/** Eksiklerin admin'e görünen karşılığı; sunucudaki `missingMessage` ile aynı anlam. */
export const MISSING_LABEL: Record<string, string> = {
  PHOTO: 'Fotoğraf yok',
  CATEGORY: 'Kategori seçilmemiş',
  CITY: 'İl çözümlenemedi',
  INACTIVE: 'İşletme yayında değil',
  OWNERSHIP: 'Sahiplik doğrulanmamış',
};

/** Eksik yoksa gösterilen olumlu kontroller. */
export const CHECK_LABEL: Record<string, string> = {
  PHOTO: 'Fotoğraf',
  CATEGORY: 'Kategori',
  CITY: 'İl',
  INACTIVE: 'Yayında',
  OWNERSHIP: 'Sahiplik',
};

/** Panelin tanıdığı kontroller; sunucu bunun dışında bir kod dönerse ham hâliyle gösterilir. */
export const KNOWN_CHECKS = ['PHOTO', 'CATEGORY', 'CITY', 'INACTIVE', 'OWNERSHIP'] as const;

/** Eksiği gidermenin yeri — admin'e "nereye gideyim" demek için. */
export const MISSING_FIX: Record<string, { text: string; to?: string }> = {
  OWNERSHIP: { text: 'Sahiplenme talebi onaylanmalı', to: '/business-claims' },
  PHOTO: { text: 'İşletme kaydına fotoğraf ya da logo eklenmeli' },
  CATEGORY: { text: 'İşletmeye kategori seçilmeli' },
  CITY: { text: "Adreste Türkiye'deki il doğru yazılmalı" },
  INACTIVE: { text: 'İşletme yayına alınmalı' },
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
export const REGION_SLOT_LIMIT = 'REGION_SLOT_LIMIT';
export const COUNTRY_SLOT_LIMIT = 'COUNTRY_SLOT_LIMIT';
/** Bir kullanıcıya aynı anda gösterilecek en fazla sponsorlu kart. */
export const VIEWER_SPONSORED_CAP = 'VIEWER_SPONSORED_CAP';

/** Kapsamın kendi yer sınırı anahtarı. */
export const slotLimitKey = (scope: PromotionScope) =>
  ({ CITY: CITY_SLOT_LIMIT, REGION: REGION_SLOT_LIMIT, COUNTRY: COUNTRY_SLOT_LIMIT }[scope]);

/** Satış açık/kapalı bayrağı (0/1). Girilmemişse açık sayılır. */
export const enabledKey = (scope: PromotionScope | 'STORY') => `${scope}_ENABLED`;

/**
 * Sunucu kapsam başına sınır ve satış bayraklarını destekliyor mu?
 *
 * `PromotionSettings.values()` tüm bilinen anahtarları (değeri boş olsa da)
 * döndürdüğü için anahtarın varlığı yeteneğin kendisidir. Bu tespit şart:
 * sunucu güncellenmeden yeni anahtar gönderilirse `update()` bilinmeyen
 * anahtarı `IllegalArgumentException` ile reddediyor ve admin "Bilinmeyen
 * ayar" hatası alıyor. Panel bu yüzden desteklenmeyen anahtarı hiç göndermez;
 * sunucu yayına girince kendiliğinden açılır.
 */
export function supportsScopeSlots(settings: Record<string, unknown>): boolean {
  return REGION_SLOT_LIMIT in settings && COUNTRY_SLOT_LIMIT in settings;
}

export function supportsEnabledFlags(settings: Record<string, unknown>): boolean {
  return enabledKey('CITY') in settings;
}

export function supportsViewerCap(settings: Record<string, unknown>): boolean {
  return VIEWER_SPONSORED_CAP in settings;
}
/** Sunucudaki varsayılanlar (`PromotionSettings`). */
export const DEFAULT_SLOT_LIMIT = 3;

/** Ayar başına son değişiklik — panelin kullandığı sade biçim. */
export interface SettingChange { key: string; at: string | null; by: string | null }

/**
 * `settingChanges` alanını çözümle.
 *
 * Bu alanın tam JSON şekli sunucu tarafında teyit edilemedi (sözleşme
 * belgesinde yalnız "updatedAt/updatedBy eklensin" yazıyordu, somut biçim
 * yoktu). Tek bir şekle bahse girip yanlış alan okumaktansa iki makul biçimi
 * de tanıyoruz: anahtara göre nesne ya da kayıt dizisi. Hiçbiri tutmazsa boş
 * dizi döner ve kart hiç görünmez — yanlış veri göstermektense göstermemek.
 */
export function normalizeSettingChanges(raw: unknown): SettingChange[] {
  if (!raw || typeof raw !== 'object') return [];
  const pick = (o: Record<string, unknown> | null | undefined) => ({
    at: (o?.updatedAt ?? o?.changedAt ?? o?.at ?? null) as string | null,
    by: (o?.updatedBy ?? o?.changedBy ?? o?.by ?? o?.actor ?? null) as string | null,
  });

  const rows: SettingChange[] = Array.isArray(raw)
    ? (raw as Array<Record<string, unknown>>).map((e) => ({
        key: String(e?.key ?? e?.setting ?? ''), ...pick(e),
      }))
    : Object.entries(raw as Record<string, unknown>).map(([key, v]) => ({
        key,
        ...pick(typeof v === 'object' ? (v as Record<string, unknown>) : null),
      }));

  return rows
    .filter((r) => r.key && (r.at || r.by))
    .sort((a, b) => String(b.at ?? '').localeCompare(String(a.at ?? '')));
}

/** Ayar anahtarının okunabilir adı: `REGION_30` → "Bölge · 30 gün". */
export function settingLabel(key: string): string {
  if (key === CITY_SLOT_LIMIT) return 'İl başına yer sınırı';
  if (key === STORY_SLOT_LIMIT) return 'Hikâye eki yer sınırı';
  const m = /^(CITY|REGION|COUNTRY|STORY)_(\d+)$/.exec(key);
  if (!m) return key;
  const base = m[1] === 'STORY' ? 'Hikâye eki' : SCOPE_LABEL[m[1] as PromotionScope];
  return `${base} · ${m[2]} gün`;
}

/**
 * Bölge kodlarının Türkçe karşılığı.
 *
 * Kodlar ASCII (`IC_ANADOLU`, `KARADENIZ`), bu yüzden harf dönüşümüyle doğru
 * ad üretilemez: Türkçe küçültme ASCII `I` harfini `ı` yapıyor ve "Karadenız"
 * çıkıyor; "İç Anadolu" ile "Doğu Anadolu" ise hiçbir dönüşümle elde edilemez.
 * Sunucudaki `TurkeyProvinces.Region` ile birebir.
 */
export const REGION_LABEL: Record<string, string> = {
  MARMARA: 'Marmara',
  EGE: 'Ege',
  AKDENIZ: 'Akdeniz',
  IC_ANADOLU: 'İç Anadolu',
  KARADENIZ: 'Karadeniz',
  DOGU_ANADOLU: 'Doğu Anadolu',
  GUNEYDOGU: 'Güneydoğu Anadolu',
};

/** Bilinmeyen kod gelirse kodun kendisi döner; uydurma ad üretilmez. */
export const regionLabel = (code?: string | null) =>
  (code ? REGION_LABEL[code] ?? code : null);
