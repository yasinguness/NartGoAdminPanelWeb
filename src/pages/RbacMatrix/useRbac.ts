import { useQuery } from '@tanstack/react-query';
import { rbacService } from '../../services/rbac/rbacService';

export function useRbac() {
  return useQuery({
    queryKey: ['rbac', 'overview'],
    queryFn: () => rbacService.overview(),
    staleTime: 60_000,
  });
}
