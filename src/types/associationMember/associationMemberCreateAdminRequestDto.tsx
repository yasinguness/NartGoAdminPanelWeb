import { PackageType } from './packageType';

export interface AssociationMemberCreateAdminRequestDto {
  userId: string;
  packageType: PackageType;
  membershipStartDate?: string;
  customMembershipEndDate?: string;
} 