export interface Association {
  id: string;
  name: string;
  code: string;
  type: string;
  status: string;
  memberCount: number;
  eventCount: number;
  establishedDate: string;
  email: string;
  phone: string;
  address: string;
}

export interface AssociationMember {
  id: string;
  firstName: string;
  lastName: string;
  membershipType: string;
  joinDate: string;
  status: string;
}

export interface AssociationEvent {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  location: string;
  status: string;
}

export interface AssociationBenefit {
  id: string;
  name: string;
  description: string;
  discount: number;
  businessName: string;
  businessType: string;
  agreementStartDate: string;
  agreementEndDate: string;
  status: string;
  terms: string;
  eligibilityCriteria: string;
}

export interface AssociationStats {
  totalMembers: number;
  activeMembers: number;
  totalEvents: number;
  upcomingEvents: number;
  totalRevenue: number;
  monthlyRevenue: number;
  memberGrowth: number;
}

export interface AssociationTimeline {
  id: string;
  description: string;
  timestamp: string;
}

export interface AssociationLocation {
  latitude: number;
  longitude: number;
  address: string;
} 