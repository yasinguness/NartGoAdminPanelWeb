/**
 * Workspace tanımları — panelin iki dünyası.
 *
 * NartGo (etkinlik, bilet, finans) ile NartBusiness (üyelik, doğrulama,
 * topluluk) aynı uygulamada yaşar ama aynı kabuğu paylaşmaz. Auth, API
 * istemcisi, RBAC motoru ve generic komponentler ortaktır; kenar çubuğu,
 * tema ve iniş sayfası workspace'e göre değişir.
 *
 * Aktif workspace URL'den türetilir (bkz. workspaceForPath). Store yalnızca
 * "girişte hangisini seçtin" tercihini hatırlar; tek gerçek kaynak adres
 * çubuğudur, böylece link paylaşmak veya sayfa yenilemek durumu bozmaz.
 */

import type { NavSection } from './nav/types';
import { nartgoNavSections } from './nav/nartgoNav';
import { nartbusinessNavSections } from './nav/nartbusinessNav';
import { ROLES, normalizeRole, getDefaultPath, type Role } from './roles';
import { nb } from '../theme/nbBrand';

export type WorkspaceId = 'nartgo' | 'nartbusiness';

export interface Workspace {
    id: WorkspaceId;
    /** Kenar çubuğu ve seçim ekranındaki ad. */
    name: string;
    /** Adın altındaki tek satırlık açıklama. */
    tagline: string;
    /** Seçim ekranında ne yönetildiğini anlatan kısa metin. */
    description: string;
    /** Marka rozetindeki harf. */
    monogram: string;
    /** Üst bardaki büyük harfli bağlam etiketi. */
    breadcrumbLabel: string;
    /** Bu workspace'e girişi açan roller. ADMIN her zaman girer. */
    roles: Role[];
    /** Workspace'e girildiğinde açılan sayfa. */
    defaultPath: string;
    /** Bu önekle başlayan her adres bu workspace'e aittir. */
    pathPrefix?: string;
    /** Kenar çubuğu zemini — iki dünyayı ilk bakışta ayıran şey. */
    sidebarBg: string;
    nav: NavSection[];
}

export const WORKSPACES: Workspace[] = [
    {
        id: 'nartgo',
        name: 'NartGo',
        tagline: 'Etkinlik & Bilet Platformu',
        description: 'Etkinlikler, biletler, satış ve finans, kullanıcı yönetimi, bildirimler ve platform operasyonları.',
        monogram: 'N',
        breadcrumbLabel: 'NARTGO',
        roles: [
            ROLES.ADMIN, ROLES.EVENT_ORGANIZATOR, ROLES.EDITOR, ROLES.ASSOCIATION,
            ROLES.CHECK_IN_STAFF, ROLES.RAFFLE_MODERATOR, ROLES.ROLE_BUSINESS,
            ROLES.ROLE_RAFFLE_ADMIN, ROLES.STORE_ADMIN,
        ],
        defaultPath: '/dashboard',
        sidebarBg: '#0F1A14',
        nav: nartgoNavSections,
    },
    {
        id: 'nartbusiness',
        name: 'NartBusiness',
        tagline: 'İş Ağı & Üyelik Yönetimi',
        description: 'Üyelik yaşam döngüsü, belge doğrulama, topluluk moderasyonu, ilan ve ihale akışları.',
        monogram: 'NB',
        breadcrumbLabel: 'NARTBUSINESS',
        roles: [ROLES.ADMIN, ROLES.NB_ADMIN, ROLES.NB_CO_ADMIN, ROLES.NB_COMMITTEE],
        defaultPath: '/nartbusiness/dashboard',
        pathPrefix: '/nartbusiness',
        sidebarBg: nb.navyDeep,
        nav: nartbusinessNavSections,
    },
];

export const DEFAULT_WORKSPACE: WorkspaceId = 'nartgo';

export function getWorkspace(id: WorkspaceId): Workspace {
    return WORKSPACES.find((w) => w.id === id) ?? WORKSPACES[0];
}

/**
 * Adresten workspace türet. Önek eşleşmesi yoksa NartGo varsayılır —
 * paneldeki adreslerin ezici çoğunluğu öneksiz NartGo yollarıdır.
 */
export function workspaceForPath(pathname: string): Workspace {
    const prefixed = WORKSPACES.find(
        (w) => w.pathPrefix && (pathname === w.pathPrefix || pathname.startsWith(w.pathPrefix + '/')),
    );
    return prefixed ?? getWorkspace(DEFAULT_WORKSPACE);
}

/**
 * Kullanıcının girebileceği workspace'ler.
 *
 * ADMIN ikisine de girer. Diğer roller yalnızca kendi dünyalarına: sadece
 * NB_COMMITTEE rolü olan bir moderatör NartGo'nun etkinlik/finans kabuğunu
 * hiç görmemeli.
 */
export function workspacesForRoles(userRoles: string[]): Workspace[] {
    const normalized = userRoles.map(normalizeRole);
    if (normalized.includes(ROLES.ADMIN)) return WORKSPACES;
    return WORKSPACES.filter((w) =>
        w.roles.some((r) => normalized.includes(normalizeRole(r))),
    );
}

/** Kullanıcı bu workspace'e girebilir mi? */
export function canAccessWorkspace(id: WorkspaceId, userRoles: string[]): boolean {
    return workspacesForRoles(userRoles).some((w) => w.id === id);
}

/**
 * Giriş sonrası nereye inilecek?
 *
 * İki panele de yetkisi olan (pratikte ADMIN) seçim ekranına düşer — soru
 * yalnızca gerçekten bir seçim varken sorulur. Tek dünyası olan kullanıcı
 * için rol bazlı mevcut davranış korunur: editör /content'e, organizatör
 * /events'e iner, workspace kavramı onlar için görünmez kalır.
 */
export function getLandingPath(userRoles: string[]): string {
    return workspacesForRoles(userRoles).length > 1
        ? '/workspace'
        : getDefaultPath(userRoles);
}
