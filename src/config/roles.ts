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
 * Yeni sayfa eklerken:
 *  1. Buraya path + allowedRoles ekle
 *  2. Layout.tsx navSections'a sidebar linki ekle
 *  3. App.tsx'e Route ekle
 *  Başka bir yere dokunmana gerek yok.
 */

// ─── Rol sabitleri (normalize edilmiş — uppercase) ───────────
// Backend küçük/büyük harf karışık gönderir, biz hep uppercase tutarız.
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

/** Backend'den gelen rol string'ini normalize et */
export function normalizeRole(role: string): string {
  return role.trim().toUpperCase();
}

/** Organizatör mü? */
export function isOrganizerRole(role: string): boolean {
  const r = normalizeRole(role);
  return r === 'EVENT_ORGANIZATOR' || r === 'EVENT_ORGANIZER' || r === 'ORGANIZER';
}

/** Roller dizisinde organizatör var mı? */
export function hasOrganizerRole(roles: string[]): boolean {
  return roles.some(isOrganizerRole);
}

// ─── Path → Rol eşlemesi ─────────────────────────────────────
// null = herkes erişebilir (authenticated olmak yeterli)
// string[] = yalnızca bu rollerden biri gerekli
//
// Path matching: exact match veya startsWith (nested routes)

type RouteAccess = { path: string; roles: string[] | null };

const ORG = [ROLES.ADMIN, ROLES.EVENT_ORGANIZATOR];
const ADMIN_ONLY = [ROLES.ADMIN];
const CONTENT = [ROLES.ADMIN, ROLES.EDITOR];
const RAFFLE = [ROLES.ADMIN, ROLES.EVENT_ORGANIZATOR, ROLES.ROLE_RAFFLE_ADMIN, ROLES.RAFFLE_MODERATOR];

export const ROLE_ROUTE_MAP: RouteAccess[] = [
  // Genel
  { path: '/dashboard', roles: [...ORG, ROLES.EDITOR, ROLES.ASSOCIATION] },

  // Etkinlik Yönetimi
  { path: '/events', roles: ORG },
  { path: '/event-categories', roles: ORG },
  { path: '/event-creation', roles: ORG },
  { path: '/tickets', roles: ORG },
  { path: '/event-operations', roles: ORG },

  // Satış & Finans
  { path: '/sales-command', roles: ORG },
  { path: '/box-office', roles: ORG },
  { path: '/venue-inventory', roles: ORG },
  { path: '/settlement-finance', roles: ADMIN_ONLY },
  { path: '/sub-merchants', roles: ADMIN_ONLY },

  // Operasyonlar
  { path: '/gate-ops', roles: ORG },
  { path: '/customer-support', roles: ORG },
  { path: '/campaign-engine', roles: ADMIN_ONLY },

  // İçerik
  { path: '/content', roles: CONTENT },

  // İçerik Yönetimi
  { path: '/notifications', roles: ADMIN_ONLY },
  { path: '/feeds', roles: ADMIN_ONLY },
  { path: '/bulletins', roles: ADMIN_ONLY },

  // İşletme Yönetimi
  { path: '/businesses', roles: ADMIN_ONLY },
  { path: '/business-claims', roles: ADMIN_ONLY },
  { path: '/business-categories', roles: ADMIN_ONLY },

  // Kullanıcılar
  { path: '/users', roles: ADMIN_ONLY },
  { path: '/associations', roles: [ROLES.ADMIN, ROLES.ASSOCIATION] },

  // Sistem
  { path: '/devices', roles: ADMIN_ONLY },
  { path: '/gamification', roles: ADMIN_ONLY },
  { path: '/audit-log', roles: ADMIN_ONLY },
  { path: '/analytics', roles: ADMIN_ONLY },
  { path: '/settings', roles: ADMIN_ONLY },

  // Raffle / Çekiliş
  { path: '/event/raffle-live', roles: RAFFLE },
];

/**
 * Verilen path'e verilen roller ile erişilebilir mi?
 */
export function canAccessPath(path: string, userRoles: string[]): boolean {
  const normalized = userRoles.map(normalizeRole);

  // Admin her yere girer
  if (normalized.includes(ROLES.ADMIN)) return true;

  // Eşleşen route tanımını bul (en spesifik match önce)
  const match = ROLE_ROUTE_MAP.find(
    (r) => path === r.path || path.startsWith(r.path + '/'),
  );

  // Tanımsız route → authenticated yeter
  if (!match) return true;

  // roles: null → herkes
  if (!match.roles) return true;

  return match.roles.some((requiredRole) => {
    // EVENT_ORGANIZATOR varyantlarını normalize et
    if (isOrganizerRole(requiredRole)) {
      return hasOrganizerRole(normalized);
    }
    return normalized.includes(normalizeRole(requiredRole));
  });
}

/**
 * Varsayılan landing path
 */
export function getDefaultPath(roles: string[]): string {
  const n = roles.map(normalizeRole);
  if (n.includes(ROLES.ADMIN)) return '/dashboard';
  if (hasOrganizerRole(n)) return '/dashboard';
  if (n.includes(ROLES.EDITOR)) return '/content';
  if (n.includes(ROLES.ASSOCIATION)) return '/associations';
  return '/dashboard';
}

/**
 * Yetkisiz sayfada nereye yönlendirilsin?
 */
export function getFallbackPath(roles: string[]): string {
  const n = roles.map(normalizeRole);
  if (hasOrganizerRole(n)) return '/events';
  if (n.includes(ROLES.EDITOR)) return '/content';
  if (n.includes(ROLES.ASSOCIATION)) return '/associations';
  return '/dashboard';
}
