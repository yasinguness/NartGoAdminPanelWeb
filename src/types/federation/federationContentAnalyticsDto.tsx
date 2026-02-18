export interface FederationContentAnalyticsDto {
  totalContentCount: number;
  contentCountByType: Record<string, number>;
  contentTrend: Record<string, number>;
  contentCountByAssociation: Record<string, number>;
  contentCountByCategory: Record<string, number>;
  recentContentCountByType: Record<string, number>;
} 