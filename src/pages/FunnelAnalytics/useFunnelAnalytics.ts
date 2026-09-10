import { useQuery } from '@tanstack/react-query';
import { executiveService } from '../../services/executive/executiveService';
import type { TimeRange } from '../../services/executive/executiveTypes';

export function useFunnelAnalytics(current: TimeRange, compareWith?: TimeRange) {
  const curQuery = useQuery({
    queryKey: ['funnel-analytics', 'current', current],
    queryFn: () => executiveService.getFunnel(current),
    staleTime: 60_000,
  });

  const prevQuery = useQuery({
    queryKey: ['funnel-analytics', 'previous', compareWith],
    queryFn: () => compareWith ? executiveService.getFunnel(compareWith) : Promise.resolve(null),
    enabled: !!compareWith,
    staleTime: 60_000,
  });

  return { curQuery, prevQuery };
}
