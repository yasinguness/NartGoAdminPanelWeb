import { BillingCycle } from '../enums/billingCycle';
import { ExpirationReason } from '../enums/expirationReason';
import { SubscriptionStatus } from '../enums/subscriptionStatus';
import { SubscriptionType } from '../enums/subscriptionType';

export interface SubscriptionPaymentDto {
  // Basic fields
  id: string;
  subscriptionType: SubscriptionType;
  userId: string;
  businessId?: string;
  associationId?: string;
  packageType?: string;
  durationType?: string;
  billingCycle: BillingCycle;
  price: number;
  currency: string;
  purchaseDate: Date;
  expiryDate: Date;
  status: SubscriptionStatus;

  // RevenueCat specific fields
  revenuecatProductId?: string;
  revenuecatEntitlementIds?: string[];
  revenuecatTransactionId?: string;
  eventTime?: Date;
  eventType?: string;
  store?: string;
  environment?: string;
  periodType?: string;
  originalTransactionId?: string;

  // Cancellation and expiration fields
  cancellationDate?: Date;
  cancellationReason?: string;
  expirationReason?: ExpirationReason;
  gracePeriodExpirationDate?: Date;
  refundedAt?: Date;
  autoResumeDate?: Date;

  // Additional fields
  presentedOfferingId?: string;
  priceInPurchasedCurrency?: number;
  taxPercentage?: number;
  commissionPercentage?: number;
  countryCode?: string;
  offerCode?: string;
  renewalNumber?: number;

  // Webhook related fields
  webhookReceivedAt?: Date;
  webhookProcessedAt?: Date;
  webhookProcessingStatus?: string;
  webhookProcessingError?: string;

  // Related entities
  subscriptionAgreementId?: string;
  associationMemberId?: string;

  // Subscription cycle fields
  subscriptionCycle?: number;
  previousSubscriptionId?: string;
  nextSubscriptionId?: string;

  // Refund fields
  refundReason?: string;
  refundAmount?: number;
  refundDate?: Date;
}
