export interface FederationStatsDto {
  id: string;
  federationId: string;
  
  // Member statistics
  totalMembers?: number;
  activeMembers?: number;
  
  // Agreement statistics
  totalAgreements?: number;
  activeAgreements?: number;
  
  // Benefit statistics
  totalBenefits?: number;
  activeBenefits?: number;
  
  // Daily statistics
  dailyViews?: Record<string, number>;
  dailyOrders?: Record<string, number>;
  dailyReservations?: Record<string, number>;
  
  // Other statistics
  favoriteCount?: number;
  
  // Audit information
  createdAt?: string;
  updatedAt?: string;
}
