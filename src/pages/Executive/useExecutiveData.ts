import { useQuery } from '@tanstack/react-query';
import { executiveService } from '../../services/executive/executiveService';
import type { TimeRange } from '../../services/executive/executiveTypes';
import { useRole } from '../../hooks/useRole';

const REFRESH_MS = {
  fast: 30_000,
  medium: 60_000,
  slow: 300_000,
} as const;

export function useExecutiveData(range: TimeRange) {
  const { isAdmin } = useRole();
  return useQuery({
    queryKey: ['executive-dashboard', range],
    queryFn: () => executiveService.getDashboard(range),
    staleTime: REFRESH_MS.medium,
    refetchInterval: REFRESH_MS.medium,
    refetchOnWindowFocus: true,
    // Admin olmayan kullan\u0131c\u0131 Navigate ile /dashboard'a y\u00f6nlenmeden \u00f6nce query tetiklenmesin \u2014
    // aksi halde admin-only endpoint'ler 401 d\u00f6ner ve api interceptor otomatik logout yapar.
    enabled: isAdmin,
  });
}
