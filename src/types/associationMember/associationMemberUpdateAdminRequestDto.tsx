import { MembershipStatus } from './membershipStatus';
import { PackageType } from './packageType';

export interface AssociationMemberUpdateAdminRequestDto {
  userFirstName?: string;
  userLastName?: string;
  userEmail?: string;
  membershipNumber?: string;
  membershipStartDate?: string;
  membershipEndDate?: string;
  status?: MembershipStatus;
  membershipFeePaid?: boolean;
  packageType?: PackageType;
} 