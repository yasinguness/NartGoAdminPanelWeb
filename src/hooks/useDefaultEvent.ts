import { useQuery } from '@tanstack/react-query';
import { useRole } from './useRole';
import { adminOperationsService } from '../services/admin/adminOperationsService';
import { EventResponseDTO } from '../types/events/eventModel';

export interface UseDefaultEventResult {
  events: EventResponseDTO[];
  defaultEventId: string | null;
  mustSelect: boolean;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Organizatör veya adminin etkinliklerini çeker ve varsayılan seçilecek etkinliği döndürür.
 *
 * React Query ile cache — 5 dakika staleTime, sayfa geçişlerinde tekrar fetch etmez.
 *
 * Mantık:
 * - Sadece 1 aktif etkinlik varsa → onu default seç (mustSelect = false)
 * - Birden fazla aktif etkinlik varsa → null döndür (kullanıcı seçmeli)
 * - Hiç etkinlik yoksa → null
 */
export function useDefaultEvent(): UseDefaultEventResult {
  const { isAdmin, isOrganizer } = useRole();
  const enabled = isAdmin || isOrganizer;

  const { data, isLoading, error, refetch } = useQuery<EventResponseDTO[]>({
    queryKey: ['my-events'],
    queryFn: async () => {
      const res: any = await adminOperationsService.getMyEvents();
      const list: EventResponseDTO[] = Array.isArray(res) ? res : (res?.data ?? []);
      // Tarihe göre sırala (yakın olan önde)
      return [...list].sort((a, b) => {
        const da = a.eventTime ? new Date(a.eventTime).getTime() : 0;
        const db = b.eventTime ? new Date(b.eventTime).getTime() : 0;
        return da - db;
      });
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 dakika
    gcTime: 10 * 60 * 1000,   // 10 dakika cache'te tut
    retry: 1,
  });

  const events = data ?? [];
  const now = Date.now();
  const activeEvents = events.filter(e => {
    if (e.status === 'CANCELLED' || e.status === 'COMPLETED') return false;
    if (e.eventTime) {
      const endTime = e.endTime ? new Date(e.endTime).getTime() : new Date(e.eventTime).getTime() + 24 * 60 * 60 * 1000;
      return endTime >= now;
    }
    return true;
  });

  const defaultEventId = activeEvents.length === 1 ? activeEvents[0].id : null;
  const mustSelect = activeEvents.length > 1;

  return {
    events,
    defaultEventId,
    mustSelect,
    loading: isLoading,
    error: error ? (error as Error).message : null,
    refetch,
  };
}
