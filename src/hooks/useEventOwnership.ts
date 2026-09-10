import { useMemo } from 'react';
import { useRole } from './useRole';
import { useAuthStore } from '../store/authStore';
import { EventResponseDTO } from '../types/events/eventModel';

/**
 * Kullanıcının bir etkinlikte admin veya organizatör sahibi olup olmadığını kontrol eder.
 *
 * - Admin her etkinlikte full access
 * - Event Organizator sadece kendi etkinliklerinde full access
 * - Diğer roller → read-only (veya tamamen yasak, çağırana göre)
 */
export function useEventOwnership(event: EventResponseDTO | null | undefined) {
  const { isAdmin, isOrganizer } = useRole();
  const currentUser = useAuthStore(s => s.user);

  return useMemo(() => {
    if (!event) {
      return {
        isOwner: false,
        canView: false,
        canEdit: false,
        canDelete: false,
        canManage: false,
      };
    }

    const isOwner = !!currentUser?.id && currentUser.id === event.organizerId;
    const canManage = isAdmin || (isOrganizer && isOwner);

    return {
      isOwner,
      canView: isAdmin || isOwner,
      canEdit: canManage,
      canDelete: isAdmin, // Silme sadece admin
      canManage,
    };
  }, [event, isAdmin, isOrganizer, currentUser?.id]);
}
