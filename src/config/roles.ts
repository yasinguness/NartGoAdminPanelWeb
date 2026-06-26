/**
 * Merkezi rol ve yetki tanımları.
 *
 * Backend Keycloak rolleri (tam liste):
 *   admin, association, CHECK_IN_STAFF, EDITOR,
 *   EVENT_ORGANIZATOR, RAFFLE_MODERATOR, role_business,
 *   ROLE_RAFFLE_ADMIN, store_admin
 *
 * Tüm sidebar görünürlüğü, route guard'ları ve canAccess() kontrolü
 * bu dosyadaki `ROLE_ROUTE_MAP` üzerinden çalışır.
 *
 * GÜVENLİK POLİTİKASI: Default-deny.
 * Route haritada yoksa erişim REDDEDİLİR. Her yeni sayfa eklenirken
 * ROLE_ROUTE_MAP'e eklenmelidir.
 *
 * Yeni sayfa eklerken:
 *  1. Buraya path + allowedRoles ekle
 *  2. Layout.tsx navSections'a sidebar linki ekle (allowedRoles belirt)
 *  3. App.tsx'e Route ekle
 */

// ─── Rol sabitleri (normalize edilmiş — uppercase) ───────────
export const ROLES = {
  ADMIN: 'ADMIN',
  ASSOCIATION: 'ASSOCIATION',
  CHECK_IN_STAFF: 'CHECK_IN_STAFF',
  EDITOR: 'EDITOR',
  EVENT_ORGANIZATOR: 'EVENT_ORGANIZATOR',
  RAFFLE_MODERATOR: 'RAFFLE_MODERATOR',
  ROLE_BUSINESS: 'ROLE_BUSINESS',
  ROLE_RAFFLE_ADMIN: 'ROLE_RAFFLE_ADMIN',
  STORE_ADMIN: 'STORE_ADMIN',
  // NartBusiness rolleri (backend @PreAuthorize ile birebir)
  NB_ADMIN: 'NB_ADMIN',
  NB_CO_ADMIN: 'NB_CO_ADMIN',
  NB_COMMITTEE: 'NB_COMMITTEE',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

/** Backend'den gelen rol string'ini normalize et */
export function normalizeRole(role: string): string {
  return role.trim().toUpperCase();
}

/** Organizatör mü? (farklı backend varyantlarını destekler) */
export function isOrganizerRole(role: string): boolean {
  const r = normalizeRole(role);
  return r === 'EVENT_ORGANIZATOR' || r === 'EVENT_ORGANIZER' || r === 'ORGANIZER';
}

/** Roller dizisinde organizatör var mı? */
export function hasOrganizerRole(roles: string[]): boolean {
  return roles.some(isOrganizerRole);
}

// ─── Rol grupları (reusable) ─────────────────────────────────
export const ORG: Role[] = [ROLES.ADMIN, ROLES.EVENT_ORGANIZATOR];
export const ADMIN_ONLY: Role[] = [ROLES.ADMIN];
export const CONTENT: Role[] = [ROLES.ADMIN, ROLES.EDITOR];
export const RAFFLE: Role[] = [ROLES.ADMIN, ROLES.EVENT_ORGANIZATOR, ROLES.ROLE_RAFFLE_ADMIN, ROLES.RAFFLE_MODERATOR];
/** NartBusiness yönetimi — admin + tüm NB rolleri. Granular yetkiyi backend @PreAuthorize uygular. */
export const NB: Role[] = [ROLES.ADMIN, ROLES.NB_ADMIN, ROLES.NB_CO_ADMIN, ROLES.NB_COMMITTEE];
export const AUTHENTICATED: Role[] = [
  ROLES.ADMIN, ROLES.EVENT_ORGANIZATOR, ROLES.EDITOR, ROLES.ASSOCIATION,
  ROLES.CHECK_IN_STAFF, ROLES.RAFFLE_MODERATOR, ROLES.ROLE_BUSINESS,
  ROLES.ROLE_RAFFLE_ADMIN, ROLES.STORE_ADMIN,
  ROLES.NB_ADMIN, ROLES.NB_CO_ADMIN, ROLES.NB_COMMITTEE,
];

// ─── Path → Rol eşlemesi ─────────────────────────────────────
type RouteAccess = { path: string; roles: Role[]; description?: string };

export const ROLE_ROUTE_MAP: RouteAccess[] = [
  // ── Genel ──
  { path: '/dashboard', roles: [...ORG, ROLES.EDITOR, ROLES.ASSOCIATION], description: 'Ana kontrol paneli' },
  { path: '/executive', roles: ADMIN_ONLY, description: 'Stratejik KPI kontrol paneli' },

  // ── Etkinlik Yönetimi (organizatör) ──
  { path: '/events', roles: ORG, description: 'Etkinlik listesi' },
  { path: '/event-categories', roles: ADMIN_ONLY, description: 'Etkinlik kategorileri' },
  { path: '/event-creation', roles: ORG, description: 'Etkinlik oluşturma sihirbazı' },
  { path: '/tickets', roles: ORG, description: 'Bilet yönetimi' },
  { path: '/event-operations', roles: ORG, description: 'Etkinlik operasyon konsolu' },
  { path: '/event-console', roles: ORG, description: 'Etkinlik operasyon konsolu (v2)' },
  { path: '/seat-templates', roles: ORG, description: 'Salon planı şablonları' },
  { path: '/event/raffle-live', roles: RAFFLE, description: 'Çekiliş canlı yayın' },

  // ── Satış & Finans ──
  { path: '/sales-command', roles: ORG, description: 'Satış komuta merkezi' },
  { path: '/box-office', roles: ORG, description: 'Gişe' },
  { path: '/venue-inventory', roles: ADMIN_ONLY, description: 'Mekan envanter (global mekan y\u00f6netimi — admin)' },
  { path: '/settlement-finance', roles: ADMIN_ONLY, description: 'Mutabakat & finans' },
  { path: '/finance/overview', roles: ADMIN_ONLY, description: 'Finansal genel bak\u0131\u015f (P&L)' },
  { path: '/finance/reconciliation', roles: ADMIN_ONLY, description: 'Iyzico \u2194 DB mutabakat\u0131' },
  { path: '/finance/payouts', roles: ADMIN_ONLY, description: 'Organizat\u00f6r payout takvimi' },
  { path: '/finance/refunds', roles: ADMIN_ONLY, description: '\u0130ade y\u00f6netimi' },
  { path: '/sub-merchants', roles: ADMIN_ONLY, description: 'Alt bayiler' },

  // ── Operasyonlar ──
  { path: '/gate-ops', roles: ORG, description: 'Kapı operasyonları' },
  { path: '/customer-support', roles: [ROLES.ADMIN], description: 'Müşteri destek' },
  { path: '/campaign-engine', roles: ADMIN_ONLY, description: 'Kampanya motoru' },

  // ── İçerik (editor için) ──
  { path: '/content', roles: CONTENT, description: 'Makale / blog yönetimi' },
  { path: '/articles', roles: CONTENT, description: 'Makale listesi' },

  // ── Bildirim ──
  { path: '/notifications', roles: ADMIN_ONLY, description: 'Bildirim kampanyaları' },
  { path: '/notification-calendar', roles: ADMIN_ONLY, description: 'Bildirim takvimi' },

  // ── Video & Akış (admin) ──
  { path: '/feeds', roles: ADMIN_ONLY, description: 'Video akış moderasyonu' },
  { path: '/bulletins', roles: ADMIN_ONLY, description: 'Bülten yönetimi' },

  // ── İşletme Yönetimi (admin) ──
  { path: '/businesses', roles: ADMIN_ONLY, description: 'İşletmeler' },
  { path: '/business-claims', roles: ADMIN_ONLY, description: 'İşletme talepleri' },
  { path: '/business-categories', roles: ADMIN_ONLY, description: 'İşletme kategorileri' },

  // ── Kullanıcılar ──
  { path: '/users', roles: ADMIN_ONLY, description: 'Kullanıcı yönetimi' },
  { path: '/users/360', roles: ADMIN_ONLY, description: 'User 360\u00b0 destek g\u00f6r\u00fcn\u00fcm\u00fc' },
  { path: '/associations', roles: [ROLES.ADMIN, ROLES.ASSOCIATION], description: 'Dernekler' },

  // ── Operasyonel sistem ──
  { path: '/ops/dlq', roles: ADMIN_ONLY, description: 'Dead Letter Queue monitor' },
  { path: '/ops/jobs', roles: ADMIN_ONLY, description: 'Scheduled Jobs monitor' },

  // ── Growth ──
  { path: '/growth/segments', roles: ADMIN_ONLY, description: 'Kullan\u0131c\u0131 segmentleri' },
  { path: '/growth/cohorts', roles: ADMIN_ONLY, description: 'Retention kohort matrisi' },
  { path: '/growth/funnel', roles: ADMIN_ONLY, description: 'D\u00f6n\u00fc\u015f\u00fcm hunisi analizi' },
  { path: '/growth/coupons', roles: ADMIN_ONLY, description: 'Kupon y\u00f6netimi' },
  { path: '/growth/referrals', roles: ADMIN_ONLY, description: 'Davet program\u0131 (K-factor)' },
  { path: '/growth/churn', roles: ADMIN_ONLY, description: 'Churn risk skorlamas\u0131' },

  // ── G\u00fcvenlik ──
  { path: '/security/rbac', roles: ADMIN_ONLY, description: 'RBAC matrisi \u00b7 rol y\u00f6netimi' },
  { path: '/security/sessions', roles: ADMIN_ONLY, description: 'Aktif oturumlar' },
  { path: '/security/anomalies', roles: ADMIN_ONLY, description: 'Anomali tarama' },
  { path: '/security/fraud', roles: ADMIN_ONLY, description: 'Fraud tespiti' },

  // ── Kullanıcı Etkileşimi ──
  { path: '/engagement/inactive-users', roles: ADMIN_ONLY, description: '\u0130naktif kullan\u0131c\u0131 y\u00f6netimi' },
  { path: '/engagement/login-frequency', roles: ADMIN_ONLY, description: 'Login s\u0131kl\u0131\u011f\u0131 analizi' },
  { path: '/engagement/product-analytics', roles: ADMIN_ONLY, description: '\u00dcr\u00fcn kullan\u0131m analiti\u011fi' },

  // ── Sistem ──
  { path: '/devices', roles: ADMIN_ONLY, description: 'Cihaz yönetimi' },
  { path: '/gamification', roles: ADMIN_ONLY, description: 'Oyunlaştırma' },
  { path: '/audit-log', roles: ADMIN_ONLY, description: 'Denetim kayıtları' },
  { path: '/analytics', roles: ADMIN_ONLY, description: 'Panel analitik' },
  { path: '/settings', roles: AUTHENTICATED, description: 'Ayarlar (herkes)' },

  // ── NartBusiness (NB rolleri + admin) ──
  { path: '/nartbusiness/dashboard', roles: NB, description: 'NB KPI dashboard' },
  { path: '/nartbusiness/members', roles: NB, description: 'NB üye yönetimi' },
  { path: '/nartbusiness/verification', roles: NB, description: 'Doğrulama kuyruğu' },
  { path: '/nartbusiness/verification-policies', roles: NB, description: 'Belge politikaları' },
  { path: '/nartbusiness/sectors', roles: NB, description: 'Sektör katalogu' },
  { path: '/nartbusiness/job-titles', roles: NB, description: 'Ünvan katalogu' },
  { path: '/nartbusiness/tiers', roles: NB, description: 'Üyelik tipleri' },
  { path: '/nartbusiness/value-chain', roles: NB, description: 'Sektör değer zinciri' },
  { path: '/nartbusiness/embedding-jobs', roles: NB, description: 'Embedding & matching' },
  { path: '/nartbusiness/moderation', roles: NB, description: 'Moderasyon kuyruğu' },
  { path: '/nartbusiness/dlq', roles: NB, description: 'NB DLQ' },
  { path: '/nartbusiness/share-analytics', roles: NB, description: 'Paylaşım analitikleri' },
  { path: '/nartbusiness/testimonials', roles: NB, description: 'Referanslar' },
  { path: '/nartbusiness/market-opinions', roles: NB, description: 'Üye görüşleri moderasyonu' },
];

/**
 * Verilen path'e verilen roller ile erişilebilir mi?
 * GÜVENLİK: Default-deny — haritalanmamış path'e erişim reddedilir.
 */
export function canAccessPath(path: string, userRoles: string[]): boolean {
  const normalized = userRoles.map(normalizeRole);

  // Admin her yere girer
  if (normalized.includes(ROLES.ADMIN)) return true;

  // En spesifik eşleşmeyi bul (uzun path önce)
  const sorted = [...ROLE_ROUTE_MAP].sort((a, b) => b.path.length - a.path.length);
  const match = sorted.find(
    (r) => path === r.path || path.startsWith(r.path + '/'),
  );

  // DEFAULT-DENY: Tanımsız route → erişim reddedilir
  if (!match) {
    if (import.meta.env.DEV) {
      console.warn(`[RBAC] Unmapped route: ${path} — default deny. Add to ROLE_ROUTE_MAP.`);
    }
    return false;
  }

  // Rol kontrolü
  return match.roles.some((requiredRole) => {
    if (isOrganizerRole(requiredRole)) {
      return hasOrganizerRole(normalized);
    }
    return normalized.includes(normalizeRole(requiredRole));
  });
}

/**
 * Route'un erişim bilgisini döndürür (debug amaçlı).
 */
export function getRouteAccess(path: string): RouteAccess | undefined {
  const sorted = [...ROLE_ROUTE_MAP].sort((a, b) => b.path.length - a.path.length);
  return sorted.find((r) => path === r.path || path.startsWith(r.path + '/'));
}

/**
 * Varsayılan landing path (login sonrası).
 */
export function getDefaultPath(roles: string[]): string {
  const n = roles.map(normalizeRole);
  if (n.includes(ROLES.ADMIN)) return '/dashboard';
  if (hasOrganizerRole(n)) return '/events';
  if (n.includes(ROLES.EDITOR)) return '/content';
  if (n.includes(ROLES.ASSOCIATION)) return '/associations';
  // Yalnızca NB rolü olan kullanıcı /dashboard'a giremez → NB dashboard'a indir.
  if (isNbOnlyRole(n)) return '/nartbusiness/dashboard';
  return '/dashboard';
}

/** Sadece NB rolü mü (klasik panel rollerinden hiçbiri yok)? */
function isNbOnlyRole(normalizedRoles: string[]): boolean {
  const hasNb = normalizedRoles.some(
    (r) => r === ROLES.NB_ADMIN || r === ROLES.NB_CO_ADMIN || r === ROLES.NB_COMMITTEE,
  );
  if (!hasNb) return false;
  const hasClassic =
    normalizedRoles.includes(ROLES.ADMIN) ||
    hasOrganizerRole(normalizedRoles) ||
    normalizedRoles.includes(ROLES.EDITOR) ||
    normalizedRoles.includes(ROLES.ASSOCIATION);
  return !hasClassic;
}

/**
 * Yetkisiz sayfada nereye yönlendirilsin?
 */
export function getFallbackPath(roles: string[]): string {
  const n = roles.map(normalizeRole);
  if (n.includes(ROLES.ADMIN)) return '/dashboard';
  if (hasOrganizerRole(n)) return '/events';
  if (n.includes(ROLES.EDITOR)) return '/content';
  if (n.includes(ROLES.ASSOCIATION)) return '/associations';
  if (isNbOnlyRole(n)) return '/nartbusiness/dashboard';
  return '/dashboard';
}

/**
 * Bir rol grubuyla eşleşme kontrolü (type-safe).
 */
export function hasAnyRole(userRoles: string[], requiredRoles: Role[]): boolean {
  const normalized = userRoles.map(normalizeRole);
  if (normalized.includes(ROLES.ADMIN)) return true;
  return requiredRoles.some((r) => {
    if (isOrganizerRole(r)) return hasOrganizerRole(normalized);
    return normalized.includes(normalizeRole(r));
  });
}
