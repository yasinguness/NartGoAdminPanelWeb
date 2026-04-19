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
export const AUTHENTICATED: Role[] = [
  ROLES.ADMIN, ROLES.EVENT_ORGANIZATOR, ROLES.EDITOR, ROLES.ASSOCIATION,
  ROLES.CHECK_IN_STAFF, ROLES.RAFFLE_MODERATOR, ROLES.ROLE_BUSINESS,
  ROLES.ROLE_RAFFLE_ADMIN, ROLES.STORE_ADMIN,
];

// ─── Path → Rol eşlemesi ─────────────────────────────────────
type RouteAccess = { path: string; roles: Role[]; description?: string };

export const ROLE_ROUTE_MAP: RouteAccess[] = [
  // ── Genel ──
  { path: '/dashboard', roles: [...ORG, ROLES.EDITOR, ROLES.ASSOCIATION], description: 'Ana kontrol paneli' },

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
  { path: '/venue-inventory', roles: ORG, description: 'Mekan envanter' },
  { path: '/settlement-finance', roles: ADMIN_ONLY, description: 'Mutabakat & finans' },
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
  { path: '/associations', roles: [ROLES.ADMIN, ROLES.ASSOCIATION], description: 'Dernekler' },

  // ── Sistem ──
  { path: '/devices', roles: ADMIN_ONLY, description: 'Cihaz yönetimi' },
  { path: '/gamification', roles: ADMIN_ONLY, description: 'Oyunlaştırma' },
  { path: '/audit-log', roles: ADMIN_ONLY, description: 'Denetim kayıtları' },
  { path: '/analytics', roles: ADMIN_ONLY, description: 'Panel analitik' },
  { path: '/settings', roles: AUTHENTICATED, description: 'Ayarlar (herkes)' },
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
  return '/dashboard';
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
