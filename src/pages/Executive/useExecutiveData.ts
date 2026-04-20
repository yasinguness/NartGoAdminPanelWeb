import { useQuery } from '@tanstack/react-query';
import { executiveService } from '../../services/executive/executiveService';
import type { TimeRange } from '../../services/executive/executiveTypes';

const REFRESH_MS = {
  fast: 30_000,
  medium: 60_000,
  slow: 300_000,
} as const;

export function useExecutiveData(range: TimeRange) {
  return useQuery({
    queryKey: ['executive-dashboard', range],
    queryFn: () => executiveService.getDashboard(range),
    staleTime: REFRESH_MS.medium,
    refetchInterval: REFRESH_MS.medium,
    refetchOnWindowFocus: true,
  });
}
