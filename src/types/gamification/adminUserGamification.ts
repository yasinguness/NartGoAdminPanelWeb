import { PageResponseDto } from '../common/pageResponse';

export interface AdminUserGamificationRewardItemDto {
  rewardId: string;
  points: number;
  reason: string;
  actionLabel?: string | null;
  category?: string | null;
  referenceId?: string | null;
  referenceName?: string | null;
  referenceType?: string | null;
  idempotencyKey?: string | null;
  metadata?: string | null;
  businessId?: string | null;
  businessName?: string | null;
  descriptionSummary?: string | null;
  createdAt: string;
}

export interface AdminUserGamificationRewardDetailDto {
  rewardId: string;
  userId: string;
  userEmail?: string | null;
  userDisplayName?: string | null;
  points: number;
  reason: string;
  actionLabel?: string | null;
  category?: string | null;
  referenceId?: string | null;
  referenceName?: string | null;
  referenceType?: string | null;
  idempotencyKey?: string | null;
  businessId?: string | null;
  businessName?: string | null;
  descriptionSummary?: string | null;
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
