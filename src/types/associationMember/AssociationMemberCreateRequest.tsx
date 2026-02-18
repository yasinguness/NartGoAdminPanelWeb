import { PackageType } from './packageType';

export interface AssociationMemberCreateRequest {
  // Required fields
  associationId: string;
  userId: string;
  userEmail: string;
  userFirstName: string;
  userLastName: string;
  membershipStartDate: Date;
  membershipFeePaid: boolean;
  packageType: PackageType;
  
  // Optional fields
  membershipEndDate?: Date;
  membershipFeePaymentDate?: Date;
  revenueCatSubscriberId?: string;
  membershipNumber?: string;
  notes?: string;
}
