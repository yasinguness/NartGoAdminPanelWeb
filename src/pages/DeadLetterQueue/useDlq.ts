import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dlqService } from '../../services/dlq/dlqService';

export function useDlq(status: string, page: number, size: number) {
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ['dlq', 'list', status, page, size],
    queryFn: () => dlqService.list(status, page, size),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const stats = useQuery({
    queryKey: ['dlq', 'stats'],
    queryFn: () => dlqService.stats(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const retryMutation = useMutation({
    mutationFn: (id: string) => dlqService.retry(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dlq'] }),
  });

  const dismissMutation = useMutation({
    mutationFn: (id: string) => dlqService.dismiss(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dlq'] }),
  });

  return { list, stats, retryMutation, dismissMutation };
}
