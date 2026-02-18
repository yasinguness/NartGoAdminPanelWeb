import { BenefitType } from '../enums/benefitType';
import { BenefitStatus } from '../enums/benefitStatus';

export interface MemberBenefitDto {
  id: string;
  memberId: string;
  memberName: string;
  businessAgreementId?: string;
  subscriptionAgreementId?: string;
  businessName?: string;
  benefitType: BenefitType;
  discountPercentage?: number;
  couponCode?: string;
  benefitStartDate: Date;
  benefitEndDate?: Date;
  status: BenefitStatus;
  usageCount?: number;
  maxUsageCount?: number;
  createdAt: Date;
  updatedAt: Date;
}
