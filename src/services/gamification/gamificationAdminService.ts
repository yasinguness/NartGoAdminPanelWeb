import { api } from '../api';
import { ApiResponse } from '../../types/api';
import {
  GamificationConfigDto,
  GamificationConfigCreateRequest,
  GamificationConfigRecordDto,
  GamificationMonthlyRewardsDto,
  MonthlyRewardItemDto,
} from '../../types/gamification/gamificationAdmin';

const basePath = '/auth/gamification/admin';

const defaultReward = (rank: number): MonthlyRewardItemDto => ({
  rank,
  title: '',
  description: '',
  icon: '',
  color: rank === 1 ? 'FFD700' : rank === 2 ? 'C0C0C0' : 'CD7F32',
});

const normalizeRewards = (monthlyRewards: any): GamificationMonthlyRewardsDto => {
  const raw = (monthlyRewards ?? {}) as Partial<GamificationMonthlyRewardsDto>;
  const rewardMap = new Map<number, MonthlyRewardItemDto>();
  for (const reward of Array.isArray(raw.rewards) ? raw.rewards : []) {
    if (typeof reward?.rank === 'number') {
      rewardMap.set(reward.rank, {
        ...defaultReward(reward.rank),
        ...reward,
      });
    }
  }
  const ranks = [1, 2, 3];
  return {
    month: raw.month,
    title: raw.title,
    description: raw.description,
    daysRemaining: raw.daysRemaining,
    periodDays: raw.periodDays,
    resetEveryDays: raw.resetEveryDays,
    resetAt: raw.resetAt,
    rewards: ranks.map((rank) => rewardMap.get(rank) ?? defaultReward(rank)),
  };
};

const normalizeConfig = (data: any): GamificationConfigDto => {
  const raw = (data ?? {}) as Partial<GamificationConfigDto>;
  return {
    actions: Array.isArray(raw.actions)
      ? raw.actions.map((action) => ({
        reason: action.reason ?? '',
        xp: Number(action.xp ?? 0),
        label: action.label ?? '',
        description: action.description ?? '',
        icon: action.icon ?? '',
        category: action.category ?? '',
        dailyCap: Boolean(action.dailyCap),
      }))
      : [],
    dailySocialCap: {
      maxXp: Number(raw.dailySocialCap?.maxXp ?? 0),
      affectedCategories: Array.isArray(raw.dailySocialCap?.affectedCategories) ? raw.dailySocialCap.affectedCategories : ['social'],
      resetTime: raw.dailySocialCap?.resetTime ?? '00:00 UTC',
    },
    maxXpPerAction: Number(raw.maxXpPerAction ?? 500),
    monthlyRewards: normalizeRewards(raw.monthlyRewards),
  };
};

export const gamificationAdminService = {
  // Original legacy endpoints for DEFAULT
  getConfig: async (): Promise<GamificationConfigDto> => {
    const response = await api.get<ApiResponse<GamificationConfigDto>>(`${basePath}/config`);
    return normalizeConfig(response.data.data);
  },

  updateConfig: async (payload: GamificationConfigDto): Promise<GamificationConfigDto> => {
    const response = await api.put<ApiResponse<GamificationConfigDto>>(`${basePath}/config`, payload);
    return normalizeConfig(response.data.data);
  },

  // New CRUD endpoints
  getConfigs: async (): Promise<GamificationConfigRecordDto[]> => {
    const response = await api.get<ApiResponse<GamificationConfigRecordDto[]>>(`${basePath}/configs`);
    return (response.data.data ?? []).map(record => ({
      configKey: record.configKey,
      config: normalizeConfig(record.config)
    }));
  },

  getConfigByKey: async (configKey: string): Promise<GamificationConfigRecordDto> => {
    const response = await api.get<ApiResponse<GamificationConfigRecordDto>>(`${basePath}/configs/${configKey}`);
    return {
      configKey: response.data.data.configKey,
      config: normalizeConfig(response.data.data.config)
    };
  },

  createConfig: async (payload: GamificationConfigCreateRequest): Promise<GamificationConfigRecordDto> => {
    const response = await api.post<ApiResponse<GamificationConfigRecordDto>>(`${basePath}/configs`, payload);
    return {
      configKey: response.data.data.configKey,
      config: normalizeConfig(response.data.data.config)
    };
  },

  updateConfigByKey: async (configKey: string, payload: GamificationConfigDto): Promise<GamificationConfigRecordDto> => {
    const response = await api.put<ApiResponse<GamificationConfigRecordDto>>(`${basePath}/configs/${configKey}`, {
      configKey,
      config: payload
    });
    return {
      configKey: response.data.data.configKey,
      config: normalizeConfig(response.data.data.config)
    };
  },

  deleteConfig: async (configKey: string): Promise<void> => {
    await api.delete(`${basePath}/configs/${configKey}`);
  }
};

