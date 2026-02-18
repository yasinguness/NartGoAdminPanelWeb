import { MembershipStatus } from './membershipStatus';

export interface MembershipStatusUpdateRequest {
  status: MembershipStatus;
  reason?: string;
  membershipEndDate?: string; // Optional, especially for cancellation cases
} 