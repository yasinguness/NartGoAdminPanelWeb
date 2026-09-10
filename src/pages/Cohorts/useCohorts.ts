import { useQuery } from '@tanstack/react-query';
import { cohortService } from '../../services/cohorts/cohortService';

export function useCohorts(weeks: number) {
  return useQuery({
    queryKey: ['cohorts', 'retention', weeks],
    queryFn: () => cohortService.retention(weeks),
    staleTime: 300_000,
  });
}
