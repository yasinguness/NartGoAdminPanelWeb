import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { refundService } from '../../services/refunds/refundService';
import type { RefundActionRequest } from '../../services/refunds/refundTypes';

export function useRefunds(params?: { status?: string; from?: string; to?: string }) {
  const qc = useQueryClient();

  const refunds = useQuery({
    queryKey: ['refunds', params],
    queryFn: () => refundService.list(params),
    staleTime: 30_000,
    refetchInterval: 90_000,
  });

  const actMutation = useMutation({
    mutationFn: ({ refundId, payload }: { refundId: string; payload: RefundActionRequest }) =>
      refundService.act(refundId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['refunds'] }),
  });

  return { refunds, actMutation };
}
