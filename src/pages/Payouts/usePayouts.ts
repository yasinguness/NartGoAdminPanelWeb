import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { payoutService } from '../../services/payouts/payoutService';
import type { BatchActionRequest } from '../../services/payouts/payoutTypes';

export function usePayouts() {
  const qc = useQueryClient();

  const byOrganizer = useQuery({
    queryKey: ['payouts', 'by-organizer'],
    queryFn: () => payoutService.getByOrganizer(),
    staleTime: 30_000,
    refetchInterval: 90_000,
  });

  const approveMutation = useMutation({
    mutationFn: (payload: BatchActionRequest) => payoutService.batchApprove(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payouts'] }),
  });

  const retryMutation = useMutation({
    mutationFn: (payload: BatchActionRequest) => payoutService.batchRetry(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payouts'] }),
  });

  return { byOrganizer, approveMutation, retryMutation };
}
