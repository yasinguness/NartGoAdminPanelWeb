import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reconciliationService } from '../../services/reconciliation/reconciliationService';
import type { ResolveRequest } from '../../services/reconciliation/reconciliationTypes';

export function useReconciliation() {
  const qc = useQueryClient();

  const mismatches = useQuery({
    queryKey: ['reconciliation', 'mismatches'],
    queryFn: () => reconciliationService.getMismatches(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const resolveMutation = useMutation({
    mutationFn: ({ paymentId, payload }: { paymentId: string; payload: ResolveRequest }) =>
      reconciliationService.resolve(paymentId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reconciliation'] });
    },
  });

  return { mismatches, resolveMutation };
}
