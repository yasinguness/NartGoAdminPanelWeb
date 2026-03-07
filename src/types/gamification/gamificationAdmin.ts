import { PageResponseDto } from '../common/pageResponse';

export interface GamificationActionAdminDto {
  reason: string;
  xp: number;
  label: string;
  description: string;
  icon: string;
  category: string;
  enabled: boolean;
  dailyCap: boolean;
}

export interface GamificationRulesDto {
  dailySocialCapMaxXp: number;
  dailySocialCapResetTime: string;
  maxXpPerAction: number;
  referralMaxPerIpPerDay: number;
}

export interface MonthlyRewardRankDto {
  title: string;
  description: string;
  icon: string;
  color: string;
}

export interface GamificationMonthlyRewardsDto {
  rank1: MonthlyRewardRankDto;
  rank2: MonthlyRewardRankDto;
  rank3: MonthlyRewardRankDto;
}

export interface GamificationTogglesDto {
  gamificationEnabled: boolean;
  referralEnabled: boolean;
  streakEnabled: boolean;
  businessReportEnabled: boolean;
}

export interface GamificationConfigDto {
  actions: GamificationActionAdminDto[];
  rules: GamificationRulesDto;
  monthlyRewards: GamificationMonthlyRewardsDto;
  toggles: GamificationTogglesDto;
}

export interface GamificationActionUpdateRequest {
  xp: number;
  label: string;
  description: string;
  icon: string;
  category: string;
  enabled: boolean;
  dailyCap: boolean;
}

export interface GamificationAuditItemDto {
  id: string;
  actorUserId: string;
  actorEmail: string;
  action: string;
  target: string;
  beforeJson: string;
  afterJson: string;
  createdAt: string;
}

export interface GamificationAuditQuery {
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}

export type GamificationAuditPage = PageResponseDto<GamificationAuditItemDto>;
