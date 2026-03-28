import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { subMerchantService } from '../../services/subMerchant/subMerchantService';
import {
  SubMerchantCreateRequest,
  SubMerchantListParams,
  SubMerchantStatus,
} from '../../types/subMerchant';

export const useSubMerchants = (params: SubMerchantListParams) =>
  useQuery({
    queryKey: ['sub-merchants', params],
    queryFn: async () => {
      const response = await subMerchantService.listSubMerchants(params);
      return response.data;
    },
  });

export const useSubMerchantById = (id: string | undefined) =>
  useQuery({
    queryKey: ['sub-merchant', id],
    queryFn: async () => {
      if (!id) {
        throw new Error('Sub-merchant id is required.');
      }
      const response = await subMerchantService.getSubMerchantById(id);
      return response.data;
    },
    enabled: Boolean(id),
  });

export const useSubMerchantIyzicoDetail = (id: string | undefined) =>
  useQuery({
    queryKey: ['sub-merchant-iyzico', id],
    queryFn: async () => {
      if (!id) {
        throw new Error('Sub-merchant id is required.');
      }
      const response = await subMerchantService.getSubMerchantIyzicoDetail(id);
      return response.data;
    },
    enabled: Boolean(id),
  });

export const useSubMerchantAuditLogs = (id: string | undefined) =>
  useQuery({
    queryKey: ['sub-merchant-audit-logs', id],
    queryFn: async () => {
      if (!id) {
        throw new Error('Sub-merchant id is required.');
      }
      const response = await subMerchantService.getSubMerchantAuditLogs(id);
      return response.data;
    },
    enabled: Boolean(id),
  });

export const useCreateSubMerchant = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ payload, idempotencyKey }: { payload: SubMerchantCreateRequest; idempotencyKey: string }) =>
      subMerchantService.createSubMerchant(payload, idempotencyKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sub-merchants'] });
    },
  });
};

export const useUpdateSubMerchantStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: SubMerchantStatus }) =>
      subMerchantService.updateSubMerchantStatus(id, { status }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sub-merchants'] });
      queryClient.invalidateQueries({ queryKey: ['sub-merchant', variables.id] });
    },
  });
};

export const useSyncSubMerchantIyzico = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, idempotencyKey }: { id: string; idempotencyKey: string }) =>
      subMerchantService.syncSubMerchantIyzico(id, idempotencyKey),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sub-merchants'] });
      queryClient.invalidateQueries({ queryKey: ['sub-merchant', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['sub-merchant-iyzico', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['sub-merchant-audit-logs', variables.id] });
    },
  });
};
