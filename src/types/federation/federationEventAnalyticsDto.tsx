export interface FederationEventAnalyticsDto {
  totalEventCount: number;
  eventCountByStatus: Record<string, number>;
  eventTrend: Record<string, number>;
  eventCountByAssociation: Record<string, number>;
  eventCountByType: Record<string, number>;
  upcomingEventCountByAssociation: Record<string, number>;
} 