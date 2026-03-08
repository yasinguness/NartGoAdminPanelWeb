import { api } from '../api';
import { ApiResponse } from '../../types/api';
import {
  GamificationConfigDto,
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

const normalizeRewards = (monthlyRewards: unknown): GamificationMonthlyRewardsDto => {
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
    daysRemaining: raw.daysRemaining,
    rewards: ranks.map((rank) => rewardMap.get(rank) ?? defaultReward(rank)),
  };
};

const normalizeConfig = (data: unknown): GamificationConfigDto => {
  const raw = (data ?? {}) as Partial<GamificationConfigDto>;
  return {
    actions: Array.isArray(raw.actions)
      ? raw.actions.map((action) => ({
        ...action,
        dailyCap: Boolean(action.dailyCap),
      }))
      : [],
    dailySocialCap: {
      maxXp: raw.dailySocialCap?.maxXp ?? 0,
      affectedCategories: Array.isArray(raw.dailySocialCap?.affectedCategories) ? raw.dailySocialCap.affectedCategories : ['social'],
      resetTime: raw.dailySocialCap?.resetTime ?? '00:00 UTC',
    },
    maxXpPerAction: raw.maxXpPerAction ?? 500,
    monthlyRewards: normalizeRewards(raw.monthlyRewards),
  };
};

export const gamificationAdminService = {
  getConfig: async (): Promise<GamificationConfigDto> => {
    const response = await api.get<ApiResponse<GamificationConfigDto>>(`${basePath}/config`);
    return normalizeConfig(response.data.data);
  },

  updateConfig: async (payload: GamificationConfigDto): Promise<GamificationConfigDto> => {
    const response = await api.put<ApiResponse<GamificationConfigDto>>(`${basePath}/config`, payload);
    return normalizeConfig(response.data.data);
  },
};
