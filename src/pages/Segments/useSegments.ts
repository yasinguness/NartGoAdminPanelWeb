import { useQuery } from '@tanstack/react-query';
import { segmentService } from '../../services/segments/segmentService';

export function useSegments() {
  return useQuery({
    queryKey: ['segments', 'overview'],
    queryFn: () => segmentService.overview(),
    staleTime: 60_000,
    refetchInterval: 300_000,
  });
}
