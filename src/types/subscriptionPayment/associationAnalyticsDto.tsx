export interface AssociationAnalyticsDto {
  // Member analytics
  totalMembers: number;
  activeMembers: number;
  newMembersThisMonth: number;
  churnedMembersThisMonth: number;
  memberGrowthRate: number;
  
  // Revenue analytics
  totalRevenue: number;
  monthlyRevenue: number;
  revenueGrowthRate: number;
  averageRevenuePerMember: number;
  revenueByPackageType: Record<string, number>;
  
  // Subscription analytics
  totalSubscriptions: number;
  activeSubscriptions: number;
  expiredSubscriptions: number;
  cancelledSubscriptions: number;
  subscriptionRenewalRate: number;
  
  // Payment analytics
  totalPayments: number;
  successfulPayments: number;
  failedPayments: number;
  refundedPayments: number;
  paymentSuccessRate: number;
  
  // Time-based analytics
  dailyRevenue: Record<string, number>;
  dailyNewMembers: Record<string, number>;
  dailyActiveMembers: Record<string, number>;
  monthlyRevenueTrend: Record<string, number>;
  monthlyNewMembers: Record<string, number>;
  
  // Geographic analytics
  revenueByLocation: Record<string, number>;
  membersByLocation: Record<string, number>;
  
  // Package analytics
  packageTypeDistribution: Record<string, number>;
  packageTypeRevenue: Record<string, number>;
  
  // Retention analytics
  retentionRate: Record<string, number>; // Retention by month
  averageLifetimeValue: number;
  averageSubscriptionDuration: number;
  
  // Performance metrics
  conversionRate: number;
  churnRate: number;
  netPromoterScore?: number;
} 