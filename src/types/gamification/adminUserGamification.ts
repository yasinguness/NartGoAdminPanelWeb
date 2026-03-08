import { PageResponseDto } from '../common/pageResponse';

export interface AdminUserGamificationRewardItemDto {
  rewardId: string;
  points: number;
  reason: string;
  referenceId?: string | null;
  idempotencyKey?: string | null;
  metadata?: string | null;
  createdAt: string;
}

export interface AdminUserGamificationRewardDetailDto {
  rewardId: string;
  userId: string;
  userEmail?: string | null;
  userDisplayName?: string | null;
  points: number;
  reason: string;
  referenceId?: string | null;
  idempotencyKey?: string | null;
  metadata?: string | null;
  createdAt: string;
}

export interface AdminUserGamificationRewardsQuery {
  reason?: string;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}

export type AdminUserGamificationRewardsPage = PageResponseDto<AdminUserGamificationRewardItemDto>;
