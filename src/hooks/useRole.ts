import { useMemo } from 'react';
import { useAuthStore } from '../store/authStore';

/**
 * Role-based access control hook.
 *
 * Keycloak roles from JWT: ADMIN, EDITOR, MODERATOR, USER
 *
 * ADMIN: Tüm sayfalara erişim
 * EDITOR: Sadece İçerik/Makale sayfaları — kendi oluşturduklarını yönetir
 * MODERATOR: İçerik + Feed moderasyonu
 */
export function useRole() {
  const user = useAuthStore((state) => state.user);

  return useMemo(() => {
    const normalizeIdentity = (value?: string | null) => (value || '').trim().toLowerCase();
    const roles: string[] = [];

    // Parse roles from user object
    if (user?.role) {
      if (user.role instanceof Set) {
        user.role.forEach((r) => roles.push(String(r).toUpperCase()));
      } else if (Array.isArray(user.role)) {
        (user.role as string[]).forEach((r) => roles.push(String(r).toUpperCase()));
      } else if (typeof user.role === 'string') {
        roles.push((user.role as string).toUpperCase());
      }
    }

    const isAdmin = roles.includes('ADMIN');
    const isEditor = roles.includes('EDITOR');
    const isModerator = roles.includes('MODERATOR');

    return {
      roles,
      isAdmin,
      isEditor,
      isModerator,
      /** Editor can only access content pages */
      isEditorOnly: isEditor && !isAdmin,
      /** Check if user has any of the given roles */
      hasRole: (...checkRoles: string[]) => checkRoles.some((r) => roles.includes(r.toUpperCase())),
      /** Check if user can access a specific route */
      canAccess: (path: string): boolean => {
        if (isAdmin) return true;
        if (isEditor && !isAdmin) {
          // Editor can only access content routes
          const editorPaths = ['/dashboard', '/content', '/content/new'];
          return editorPaths.some((p) => path === p || path.startsWith('/content/'));
        }
        return true;
      },
      /** Check if user owns a resource (email or display name match) */
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
      /** Current user email */
      userEmail: user?.email || '',
      /** Current user display name */
      userName: user?.firstName && user?.lastName
        ? `${user.firstName} ${user.lastName}`
        : user?.email || '',
    };
  }, [user]);
}
