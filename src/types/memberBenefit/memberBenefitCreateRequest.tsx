import { BenefitType } from '../enums/benefitType';

export interface MemberBenefitCreateRequest {
  businessAgreementId?: string;
  subscriptionAgreementId?: string;
  benefitType: BenefitType;
  benefitDescription?: string;
  discountPercentage?: number;
  couponCode?: string;
  benefitStartDate: Date;
  benefitEndDate?: Date;
  maxUsageCount?: number;
}
