import { api } from '../api';
import { ApiResponse } from '../../types/api';
import { PageResponseDto } from '../../types/common/pageResponse';
import {
  SubMerchantSummary,
  SubMerchantDetail,
  SubMerchantListParams,
  SubMerchantCreateRequest,
  SubMerchantStatusUpdateRequest,
  SubMerchantIyzicoDetail,
  SubMerchantAuditLog,
} from '../../types/subMerchant';

const BASE_PATH = '/payment/admin/sub-merchants';

export const subMerchantService = {
  listSubMerchants: async (params: SubMerchantListParams) => {
    const response = await api.get<ApiResponse<PageResponseDto<SubMerchantSummary>>>(BASE_PATH, {
      params: {
        page: params.page ?? 0,
        size: params.size ?? 10,
        search: params.search || undefined,
        ownerType: params.ownerType || undefined,
        ownerId: params.ownerId || undefined,
        status: params.status || undefined,
      },
    });
    return response.data;
  },

  getSubMerchantById: async (id: string) => {
    const response = await api.get<ApiResponse<SubMerchantDetail>>(`${BASE_PATH}/${id}`);
    return response.data;
  },

  createSubMerchant: async (payload: SubMerchantCreateRequest, idempotencyKey: string) => {
    const response = await api.post<ApiResponse<SubMerchantDetail>>(BASE_PATH, payload, {
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
    });
    return response.data;
  },

  updateSubMerchant: async (
    id: string,
    payload: Partial<SubMerchantCreateRequest>,
    idempotencyKey: string
  ) => {
    const response = await api.patch<ApiResponse<SubMerchantDetail>>(`${BASE_PATH}/${id}`, payload, {
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
    });
    return response.data;
  },

  updateSubMerchantStatus: async (id: string, payload: SubMerchantStatusUpdateRequest) => {
    const response = await api.patch<ApiResponse<SubMerchantDetail>>(`${BASE_PATH}/${id}/status`, payload);
    return response.data;
  },

  getSubMerchantIyzicoDetail: async (id: string) => {
    const response = await api.get<ApiResponse<SubMerchantIyzicoDetail>>(`${BASE_PATH}/${id}/iyzico`);
    return response.data;
  },

  syncSubMerchantIyzico: async (id: string, idempotencyKey: string) => {
    const response = await api.post<ApiResponse<SubMerchantIyzicoDetail>>(
      `${BASE_PATH}/${id}/iyzico/sync`,
      {},
      {
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
      }
    );
    return response.data;
  },

  getSubMerchantAuditLogs: async (id: string) => {
    const response = await api.get<ApiResponse<SubMerchantAuditLog[]>>(`${BASE_PATH}/${id}/audit-logs`);
    return response.data;
  },
};
