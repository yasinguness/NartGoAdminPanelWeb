import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { couponService } from '../../services/coupons/couponService';
import type { CouponRequest } from '../../services/coupons/couponTypes';

export function useCoupons() {
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ['coupons', 'list'],
    queryFn: () => couponService.list(),
    staleTime: 60_000,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CouponRequest) => couponService.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coupons'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CouponRequest }) => couponService.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coupons'] }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => couponService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coupons'] }),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => couponService.toggle(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coupons'] }),
  });

  return { list, createMutation, updateMutation, removeMutation, toggleMutation };
}
