import { api } from '../api';
import { ApiResponse } from '../../types/api';
import { PageResponseDto } from '../../types/common/pageResponse';
import {
  GamificationActionAdminDto,
  GamificationActionUpdateRequest,
  GamificationAuditItemDto,
  GamificationAuditPage,
  GamificationAuditQuery,
  GamificationConfigDto,
  GamificationMonthlyRewardsDto,
  GamificationRulesDto,
  GamificationTogglesDto,
} from '../../types/gamification/gamificationAdmin';

const basePath = '/auth/admin/gamification';

const normalizeAuditPage = (data: unknown): GamificationAuditPage => {
  if (Array.isArray(data)) {
    return {
      content: data as GamificationAuditItemDto[],
      totalElements: data.length,
      totalPages: 1,
      number: 0,
      size: data.length,
      first: true,
      last: true,
      empty: data.length === 0,
      hasNext: false,
      hasPrevious: false,
    };
  }

  const maybePage = data as Partial<PageResponseDto<GamificationAuditItemDto>>;
  if (Array.isArray(maybePage?.content)) {
    return {
      content: maybePage.content,
      totalElements: maybePage.totalElements ?? maybePage.content.length,
      totalPages: maybePage.totalPages ?? 1,
      number: maybePage.number ?? 0,
      size: maybePage.size ?? maybePage.content.length,
      first: maybePage.first ?? true,
      last: maybePage.last ?? true,
      empty: maybePage.empty ?? maybePage.content.length === 0,
      hasNext: maybePage.hasNext ?? false,
      hasPrevious: maybePage.hasPrevious ?? false,
    };
  }

  return {
    content: [],
    totalElements: 0,
    totalPages: 0,
    number: 0,
    size: 0,
    first: true,
    last: true,
    empty: true,
    hasNext: false,
    hasPrevious: false,
  };
};

export const gamificationAdminService = {
  getConfig: async (): Promise<GamificationConfigDto> => {
    const response = await api.get<ApiResponse<GamificationConfigDto>>(`${basePath}/config`);
    return response.data.data;
  },

  updateConfig: async (payload: GamificationConfigDto): Promise<GamificationConfigDto> => {
    const response = await api.put<ApiResponse<GamificationConfigDto>>(`${basePath}/config`, payload);
    return response.data.data;
  },

  getActions: async (): Promise<GamificationActionAdminDto[]> => {
    const response = await api.get<ApiResponse<GamificationActionAdminDto[]>>(`${basePath}/actions`);
    return response.data.data;
  },

  patchAction: async (reason: string, payload: GamificationActionUpdateRequest): Promise<GamificationActionAdminDto> => {
    const response = await api.patch<ApiResponse<GamificationActionAdminDto>>(
      `${basePath}/actions/${encodeURIComponent(reason)}`,
      payload
    );
    return response.data.data;
  },

  getRules: async (): Promise<GamificationRulesDto> => {
    const response = await api.get<ApiResponse<GamificationRulesDto>>(`${basePath}/rules`);
    return response.data.data;
  },

  updateRules: async (payload: GamificationRulesDto): Promise<GamificationRulesDto> => {
    const response = await api.put<ApiResponse<GamificationRulesDto>>(`${basePath}/rules`, payload);
    return response.data.data;
  },

  getMonthlyRewards: async (): Promise<GamificationMonthlyRewardsDto> => {
    const response = await api.get<ApiResponse<GamificationMonthlyRewardsDto>>(`${basePath}/monthly-rewards`);
    return response.data.data;
  },

  updateMonthlyRewards: async (payload: GamificationMonthlyRewardsDto): Promise<GamificationMonthlyRewardsDto> => {
    const response = await api.put<ApiResponse<GamificationMonthlyRewardsDto>>(`${basePath}/monthly-rewards`, payload);
    return response.data.data;
  },

  getToggles: async (): Promise<GamificationTogglesDto> => {
    const response = await api.get<ApiResponse<GamificationTogglesDto>>(`${basePath}/toggles`);
    return response.data.data;
  },

  updateToggles: async (payload: GamificationTogglesDto): Promise<GamificationTogglesDto> => {
    const response = await api.put<ApiResponse<GamificationTogglesDto>>(`${basePath}/toggles`, payload);
    return response.data.data;
  },

  getAudit: async (query: GamificationAuditQuery): Promise<GamificationAuditPage> => {
    const response = await api.get<ApiResponse<unknown>>(`${basePath}/audit`, {
      params: {
        ...(query.from ? { from: query.from } : {}),
        ...(query.to ? { to: query.to } : {}),
        ...(typeof query.page === 'number' ? { page: query.page } : {}),
        ...(typeof query.size === 'number' ? { size: query.size } : {}),
      },
    });
    return normalizeAuditPage(response.data.data);
  },
};
