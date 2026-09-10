import { useQuery } from '@tanstack/react-query';
import { financeOverviewService } from '../../services/financeOverview/financeOverviewService';
import type { FinanceRange } from '../../services/financeOverview/financeOverviewTypes';

export function useFinanceOverview(range: FinanceRange) {
  return useQuery({
    queryKey: ['finance-overview', range],
    queryFn: () => financeOverviewService.getOverview(range),
    staleTime: 60_000,
    refetchInterval: 120_000,
    refetchOnWindowFocus: true,
  });
}
