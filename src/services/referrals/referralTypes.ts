export interface ReferralSummary {
  totalInvites: number;
  pendingInvites: number;
  completedInvites: number;
  expiredInvites: number;
  invitesLast30d: number;
  completedLast30d: number;
  kFactor?: number;
  conversionRate?: number;
  signupsLast30d: number;
}

export interface TopReferrer {
  userId: string;
  email?: string;
  name?: string;
  totalInvites: number;
  completedCount: number;
  pendingCount: number;
  conversionRate?: number;
  lastInviteAt?: string;
}

export interface ReferralOverviewResponse {
  generatedAt: string;
  summary?: ReferralSummary;
  topReferrers: TopReferrer[];
}
