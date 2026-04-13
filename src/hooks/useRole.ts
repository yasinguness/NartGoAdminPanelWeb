import { useMemo } from 'react';
import { useAuthStore } from '../store/authStore';
import {
  normalizeRole,
  hasOrganizerRole,
  canAccessPath,
  getDefaultPath,
  getFallbackPath,
  ROLES,
} from '../config/roles';

/**
 * Merkezi rol tabanlı erişim kontrolü hook'u.
 *
 * Tüm yetki kararları `config/roles.ts` üzerinden alınır.
 * Bu hook sadece roller dizisini parse eder ve yardımcı flag'ler sunar.
 */
export function useRole() {
  const user = useAuthStore((state) => state.user);

  return useMemo(() => {
    const roles: string[] = [];

    // Parse roles from user object — Set, Array, or string
    if (user?.role) {
      if (user.role instanceof Set) {
        user.role.forEach((r) => roles.push(normalizeRole(String(r))));
      } else if (Array.isArray(user.role)) {
        (user.role as string[]).forEach((r) => roles.push(normalizeRole(String(r))));
      } else if (typeof user.role === 'string') {
        roles.push(normalizeRole(user.role as string));
      }
    }

    const isAdmin = roles.includes(ROLES.ADMIN);
    const isEditor = roles.includes(ROLES.EDITOR);
    const isOrganizer = hasOrganizerRole(roles);
    const isAssociation = roles.includes(ROLES.ASSOCIATION);

    const normalizeIdentity = (value?: string | null) => (value || '').trim().toLowerCase();

    return {
      roles,
      isAdmin,
      isEditor,
      isOrganizer,
      isAssociation,
      isEditorOnly: isEditor && !isAdmin && !isOrganizer,

      /** Kullanıcı bu path'e erişebilir mi? */
      canAccess: (path: string) => canAccessPath(path, roles),

      /** Varsayılan landing path */
      defaultPath: getDefaultPath(roles),

      /** Yetkisiz sayfada nereye yönlendirilsin? */
      fallbackPath: getFallbackPath(roles),

      /** Verilen rollerden herhangi birine sahip mi? */
      hasRole: (...checkRoles: string[]) =>
        checkRoles.some((r) => roles.includes(normalizeRole(r))),

      /** Resource ownership kontrolü (editor kendi içeriğini görebilir) */
      isOwner: (resourceAuthor?: string): boolean => {
        if (isAdmin) return true;
        const resourceIdentity = normalizeIdentity(resourceAuthor);
        const userEmail = normalizeIdentity(user?.email);
        const userFullName = normalizeIdentity(
          user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : '',
        );
        if (!resourceIdentity) return false;
        return resourceIdentity === userEmail || (!!userFullName && resourceIdentity === userFullName);
      },

      userEmail: user?.email || '',
      userName: user?.firstName && user?.lastName
        ? `${user.firstName} ${user.lastName}`
        : user?.email || '',
    };
  }, [user]);
}
