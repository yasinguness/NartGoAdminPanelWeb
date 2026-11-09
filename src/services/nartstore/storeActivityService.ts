import { api } from '../api';

/**
 * NartStore hareketleri (NartStore arka ucu `/v1/commerce/admin/store-analytics/*`). Panelin API kökü `/api/v1`,
 * mağaza arka ucu aynı ağ geçidinde `/v1/commerce` altında; kök yalnız bu istekler için değiştirilir.
 *
 * Adres her zaman MUTLAK olmalı: kök göreliyse (`.env.local`: `/api/v1`) kırpınca boş kalıyordu, axios da
 * göreli `/v1/commerce/...` yolunu kendi baseURL'inin önüne ekleyip `/api/v1/v1/commerce/...` (404) üretiyordu.
 * Göreli kökte: geliştirmede aynı köken (Vite `/v1/commerce` proxy'si), derlemede ağ geçidi
 * (`VITE_COMMERCE_ORIGIN`, varsayılan api.nartgo.net; CORS `*.nartgo.net` kabul ediyor).
 */
export function commerceOrigin(apiBase: string, dev: boolean, origin: string, commerceEnv?: string): string {
  const root = apiBase.trim().replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '');
  if (/^https?:\/\//.test(root)) return root;
  if (dev) return origin.replace(/\/+$/, '');
  return (commerceEnv || 'https://api.nartgo.net').replace(/\/+$/, '');
}
const COMMERCE = `${commerceOrigin(
  import.meta.env.VITE_API_BASE_URL || 'https://api.nartgo.net/api/v1',
  import.meta.env.DEV,
  typeof window !== 'undefined' ? window.location.origin : '',
  import.meta.env.VITE_COMMERCE_ORIGIN,
)}/v1/commerce/admin/store-analytics`;

export type EventGroup = 'all' | 'cart' | 'clicks' | 'search' | 'checkout' | 'errors' | 'auth' | 'pages';

export interface Overview {
  totals: {
    visitors: number; users: number; sessions: number; pageViews: number; productViews: number; productClicks: number;
    addToCart: number; removeFromCart: number; searches: number; errors: number; peopleWithErrors: number;
  };
  funnel: { viewed: number; carted: number; checkout: number; submitted: number };
  orders: { status: string; count: number; total: number }[];
  trend: { date: string; visitors: number; addToCart: number; errors: number; orders: number; paid: number }[];
  topProducts: { productId: string; title: string | null; storeName: string | null; views: number; clicks: number; addToCart: number; removed: number; cartUsers: number }[];
  topSearches: { query: string; count: number; zeroResults: number }[];
  topErrors: { eventType: string; message: string; endpoint: string | null; status: string | null; count: number; people: number; lastAt: string }[];
  platforms: { platform: 'app' | 'web'; visitors: number; users: number; addToCart: number; orders: number; errors: number }[];
}

export type Platform = 'all' | 'app' | 'web';

/** Mobil `ios`/`android`, web `mobile`/`desktop` (tarayıcı) gönderir. */
export const deviceLabel = (device: string | null, source: string | null) =>
  device === 'ios' ? 'Uygulama · iPhone' : device === 'android' ? 'Uygulama · Android' : source === 'app' ? 'Uygulama'
    : device === 'mobile' ? 'Web · telefon' : device === 'desktop' ? 'Web · bilgisayar' : device ?? '—';

export interface StoreEvent {
  id: string;
  eventType: string;
  createdAt: string;
  path: string | null;
  deviceType: string | null;
  source: string | null;
  visitorId: string | null;
  sessionId: string | null;
  metadata: Record<string, unknown> | null;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  productId: string | null;
  productTitle: string | null;
  storeName: string | null;
}

export interface StoreUserActivity {
  id: string; name: string | null; email: string; pageViews: number; productViews: number; addToCart: number; removeFromCart: number;
  searches: number; checkouts: number; errors: number; orders: number; paidOrders: number; lastSeen: string;
}

export interface StoreOrder {
  id: string; createdAt: string; total: number; paymentStatus: string; status: string; paymentMethod: string; paymentProvider: string | null;
  couponCode: string | null; userId: string; userName: string | null; userEmail: string | null; itemCount: number;
  lastHistory: { status?: string; note?: string; reason?: string; at?: string } | null;
}

export const storeActivityService = {
  async overview(days: number, opts?: Record<string, unknown>): Promise<Overview> {
    return (await api.get(`${COMMERCE}/overview`, { params: { days }, ...opts })).data;
  },
  async events(params: { group?: EventGroup; userId?: string; q?: string; platform?: Platform; days: number; page: number; size?: number }): Promise<{ total: number; page: number; size: number; items: StoreEvent[] }> {
    const { group, platform, ...rest } = params;
    return (await api.get(`${COMMERCE}/events`, { params: { ...rest, group: group === 'all' ? undefined : group, platform: platform === 'all' ? undefined : platform } })).data;
  },
  async users(days: number): Promise<StoreUserActivity[]> {
    return (await api.get(`${COMMERCE}/users`, { params: { days } })).data;
  },
  async orders(days: number): Promise<StoreOrder[]> {
    return (await api.get(`${COMMERCE}/orders`, { params: { days } })).data;
  },
};

export const EVENT_LABEL: Record<string, string> = {
  page_view: 'Sayfa görüntüleme', product_view: 'Ürün sayfası', product_click: 'Ürüne tıklama', add_to_cart: 'Sepete ekledi',
  add_to_cart_failed: 'Sepete eklenemedi', remove_from_cart: 'Sepetten çıkardı', begin_checkout: 'Ödeme sayfasına geçti',
  order_submit: 'Sipariş verdi', order_failed: 'Sipariş başarısız', contact_click: 'Satıcıyla iletişim', search: 'Arama',
  wishlist_add: 'Favoriye ekledi', wishlist_remove: 'Favoriden çıkardı', coupon_apply: 'Kupon denedi', login: 'Giriş yaptı',
  signup: 'Kayıt oldu', client_error: 'Sayfa hatası', api_error: 'Sunucu hatası',
};

export const ERROR_TYPES = new Set(['client_error', 'api_error', 'add_to_cart_failed', 'order_failed']);

/**
 * Hata olayının türü: 4xx yanıt iş kuralı reddidir (ör. satıcının kendi ürününü sepete eklemesi),
 * durum kodu yoksa istek sunucuya ulaşmamıştır (kullanıcının bağlantısı ya da zaman aşımı).
 * Sunucu tarafı aynı ayrımla sayar (analytics-admin.service realErrorSql): 4xx hata sayılmaz.
 */
export type ErrorKind = 'rejected' | 'network' | 'server' | 'client' | null;

export const errorKind = (eventType: string, status: unknown): ErrorKind => {
  if (!ERROR_TYPES.has(eventType)) return null;
  if (eventType === 'client_error') return 'client';
  if (eventType === 'order_failed') return 'server';
  const st = Number(status ?? 0) || 0;
  if (st >= 400 && st < 500) return 'rejected';
  if (st === 0) return 'network';
  return 'server';
};

const KIND_LABEL: Record<Exclude<ErrorKind, null>, string> = {
  rejected: 'İşlem reddedildi',
  network: 'Bağlantı sorunu',
  server: 'Sunucu hatası',
  client: 'Sayfa hatası',
};

export const eventLabel = (eventType: string, status?: unknown) => {
  const kind = errorKind(eventType, status);
  if (eventType === 'add_to_cart_failed') return kind === 'rejected' ? 'Sepete eklenemedi (kural)' : EVENT_LABEL[eventType];
  if (eventType === 'order_failed') return EVENT_LABEL[eventType];
  return kind ? KIND_LABEL[kind] : EVENT_LABEL[eventType] ?? eventType;
};

export const kindColor = (kind: ErrorKind): 'error' | 'warning' | 'default' =>
  kind === 'rejected' ? 'warning' : kind === 'network' ? 'default' : 'error';

export const PAYMENT_LABEL: Record<string, string> = { PAID: 'Ödendi', PENDING: 'Ödeme bekliyor', FAILED: 'Ödeme başarısız', REFUNDED: 'İade edildi' };

export const errorText = (e: unknown) => {
  const err = e as { response?: { status?: number; data?: { message?: string } }; message?: string };
  if (err?.response?.status === 403) return 'Bu kayıtları görmek için yönetici yetkisi gerekiyor.';
  return err?.response?.data?.message ?? err?.message ?? 'Kayıtlar alınamadı.';
};
