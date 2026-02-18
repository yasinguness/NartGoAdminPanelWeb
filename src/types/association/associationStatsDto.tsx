export interface AssociationStatsDto {
  id: string;
  associationId: string;
  
  // Basic statistics
  viewCount?: number;
  favoriteCount?: number;
  totalOrders?: number;
  totalReservations?: number;
  totalRevenue?: number;
  averageRating?: number;
  totalReviews?: number;
  
  // Agreement statistics
  totalAgreementCount?: number;
  activeAgreementCount?: number;
  
  // Member statistics
  activeMembers?: number;
  
  // Benefit statistics
  activeBenefits?: number;
  totalBenefits?: number;
  
  // Daily statistics
  dailyViews?: Record<string, number>;
  dailyOrders?: Record<string, number>;
  dailyReservations?: Record<string, number>;
  
  // Audit information
  createdAt?: string;
  updatedAt?: string;
}
