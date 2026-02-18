import { CardStatus } from '../enums/cardStatus';
import { MembershipStatus } from '../enums/membershipStatus';
import { SubscriptionStatus } from '../enums/subscriptionStatus';
import { SubscriptionPaymentDto } from '../subscriptionPayment/subscriptionPaymentDto';
import { PackageType } from './packageType';

export interface AssociationMemberUpdateRequest {
  userEmail?: string;
  userFirstName?: string;
  userLastName?: string;
  membershipEndDate?: Date;
  status?: MembershipStatus;
  membershipFeePaid?: boolean;
  membershipFeePaymentDate?: Date;
  membershipCardStatus?: CardStatus;
  lastPayment?: SubscriptionPaymentDto;
  revenueCatSubscriberId?: string;
  subscriptionStatus?: SubscriptionStatus;
  autoRenewEnabled?: boolean;
  nextBillingDate?: Date;
  packageType?: PackageType;
  membershipNumber?: string;
  membershipStartDate?: string;
  notes?: string;
}
