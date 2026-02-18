import { MembershipStatus } from './membershipStatus';

export interface AssociationMemberStatusUpdateDto {
  status: MembershipStatus;
  reason?: string;
} 