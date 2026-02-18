export interface FederationBusinessAnalyticsDto {
  totalBusinessCount: number;
  businessDistributionByCategory: Record<string, number>;
  newBusinessTrend: Record<string, number>;
  businessCountByAssociation: Record<string, number>;
  activeBusinessCountByCategory: Record<string, number>;
  pendingBusinessCountByCategory: Record<string, number>;
} 