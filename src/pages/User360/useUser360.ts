import { useQuery } from '@tanstack/react-query';
import { userService } from '../../services/user/userService';
import { user360Service } from '../../services/user360/user360Service';

export function useUser360(userId: string | undefined) {
  const profile = useQuery({
    queryKey: ['user360', 'profile', userId],
    queryFn: () => (userId ? userService.getUserAdmin(userId) : Promise.resolve(null)),
    enabled: !!userId,
    staleTime: 60_000,
  });

  const email = (profile.data as any)?.data?.email || (profile.data as any)?.email || null;

  const ordersSummary = useQuery({
    queryKey: ['user360', 'orders', email],
    queryFn: () => (email ? user360Service.getOrdersSummaryByEmail(email) : Promise.resolve(null)),
    enabled: !!email,
    staleTime: 60_000,
  });

  const sessionSummary = useQuery({
    queryKey: ['user360', 'session-summary', userId],
    queryFn: () => (userId ? userService.getUserSessionSummary(userId, 10) : Promise.resolve(null)),
    enabled: !!userId,
    staleTime: 120_000,
  });

  const loginStats = useQuery({
    queryKey: ['user360', 'login-stats', userId],
    queryFn: () => (userId ? userService.getUserLoginStats(userId) : Promise.resolve(null)),
    enabled: !!userId,
    staleTime: 120_000,
  });

  const notes = useQuery({
    queryKey: ['user360', 'notes', userId],
    queryFn: () => (userId ? userService.getAdminNotes(userId) : Promise.resolve(null)),
    enabled: !!userId,
    staleTime: 60_000,
  });

  const activity = useQuery({
    queryKey: ['user360', 'activity', userId],
    queryFn: () => (userId ? userService.getActivityLog(userId, 25) : Promise.resolve(null)),
    enabled: !!userId,
    staleTime: 60_000,
  });

  return {
    profile,
    email,
    ordersSummary,
    sessionSummary,
    loginStats,
    notes,
    activity,
    loading: profile.isLoading,
    refetchAll: () => {
      profile.refetch();
      ordersSummary.refetch();
      sessionSummary.refetch();
      loginStats.refetch();
      notes.refetch();
      activity.refetch();
    },
  };
}
