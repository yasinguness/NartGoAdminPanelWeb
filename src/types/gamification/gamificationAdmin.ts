export interface GamificationActionAdminDto {
  reason: string;
  xp: number;
  label: string;
  description: string;
  icon: string;
  category: string;
  dailyCap?: boolean;
}

export interface GamificationDailySocialCapDto {
  maxXp: number;
  affectedCategories: string[];
  resetTime: string;
}

export interface MonthlyRewardItemDto {
  rank: number;
  title: string;
  description: string;
  icon: string;
  color: string;
}

export interface GamificationMonthlyRewardsDto {
  month?: string;
  title?: string;
  description?: string;
  daysRemaining?: number;
  periodDays?: number;
  resetEveryDays?: number;
  resetAt?: string;
  rewards: MonthlyRewardItemDto[];
}

export interface GamificationConfigDto {
  actions: GamificationActionAdminDto[];
  dailySocialCap: GamificationDailySocialCapDto;
  maxXpPerAction: number;
  monthlyRewards: GamificationMonthlyRewardsDto;
}

export interface GamificationConfigCreateRequest {
  configKey: string;
  config: GamificationConfigDto;
}

export interface GamificationConfigRecordDto {
  configKey: string;
  config: GamificationConfigDto;
}

