export interface FederationAnalyticsDto {
  // Association statistics
  totalAssociationCount: number;
  activeAssociationCount: number;
  newAssociationsCount: number;
  inactiveAssociationCount: number;
  
  // Member statistics
  totalMemberCount: number;
  membershipDistribution: Record<string, number>; // e.g., {"BRONZE": 100, "SILVER": 50, "GOLD": 25}
  memberTrend: Record<string, number>; // Daily member count trend
  
  // Revenue statistics
  totalRevenue: number;
  revenueTrend: Record<string, number>; // Daily revenue trend
  revenueByAssociation: Record<string, number>; // Revenue per association
  
  // Renewal statistics
  renewalRate: number;
  renewalRateByMembershipType: Record<string, number>; // Renewal rate per membership type
  renewalRateTrend: Record<string, number>; // Daily renewal rate trend
  
  // Business statistics
  totalBusinessCount: number;
  businessDistributionByCategory: Record<string, number>; // Business count per category
  newBusinessTrend: Record<string, number>; // Daily new business count trend
} 