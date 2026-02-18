import { BenefitType } from '../enums/benefitType';
import { BenefitStatus } from '../enums/benefitStatus';

export interface MemberBenefitUpdateRequest {
  benefitType?: BenefitType;
  agreementId?: string;
  subscriptionAgreementId?: string;
  discountPercentage?: number;
  benefitDescription?: string;
  couponCode?: string;
  benefitEndDate?: Date;
  status?: BenefitStatus;
  maxUsageCount?: number;
}
