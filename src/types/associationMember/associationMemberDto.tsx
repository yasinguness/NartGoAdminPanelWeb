import { CardStatus } from '../enums/cardStatus';
import { MembershipStatus } from '../enums/membershipStatus';
import { MemberBenefitDto } from '../memberBenefit/memberBenefitDto';

export interface AssociationMemberDto {
  id: string;
  associationId: string;
  associationName: string;
  userId: string;
  userEmail: string;
  userFirstName: string;
  userLastName: string;
  membershipNumber?: string;
  membershipStartDate: Date;
  membershipEndDate?: Date;
  status: MembershipStatus;
  membershipFeePaid: boolean;
  membershipFeePaymentDate?: Date;
  membershipCardNumber?: string;
  membershipCardIssuedDate?: Date;
  membershipCardExpiryDate?: Date;
  membershipCardStatus?: CardStatus;
  benefits?: MemberBenefitDto[];
  createdAt: Date;
  updatedAt: Date;
}
