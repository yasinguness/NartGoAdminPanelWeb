import { useQuery } from '@tanstack/react-query';
import { referralService } from '../../services/referrals/referralService';

export function useReferrals() {
  return useQuery({
    queryKey: ['referrals', 'overview'],
    queryFn: () => referralService.overview(),
    staleTime: 60_000,
    refetchInterval: 300_000,
  });
}
