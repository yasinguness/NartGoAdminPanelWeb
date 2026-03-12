import { api } from '../api';
import { ApiResponse } from '../../types/api';
import { PageResponseDto } from '../../types/common/pageResponse';
import {
  BusinessClaimResponse,
  BusinessClaimReviewRequest,
  BusinessClaimStatus,
} from '../../types/businesses/businessClaimModel';

export interface BusinessClaimListParams {
  status?: BusinessClaimStatus | '';
  page?: number;
  size?: number;
}

export const businessClaimService = {
  getClaims: async (
    params: BusinessClaimListParams,
  ): Promise<PageResponseDto<BusinessClaimResponse>> => {
    const response = await api.get<ApiResponse<PageResponseDto<BusinessClaimResponse>>>(
      '/businesses/admin/claims',
      { params },
    );
    return response.data.data;
  },

  reviewClaim: async (
    claimId: string,
    request: BusinessClaimReviewRequest,
  ): Promise<BusinessClaimResponse> => {
    const response = await api.patch<ApiResponse<BusinessClaimResponse>>(
      `/businesses/admin/claims/${claimId}`,
      request,
    );
    return response.data.data;
  },
};
