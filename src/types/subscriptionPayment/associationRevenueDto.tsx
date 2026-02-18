import { SubscriptionPaymentDto } from './subscriptionPaymentDto';
import { PageResponseDto } from '../common/pageResponse';

export interface AssociationRevenueDto {
  totalRevenue: number; // BigDecimal in Java, number in TypeScript
  totalTransactions: number; // long in Java, number in TypeScript
  newSubscriptions: number; // long in Java, number in TypeScript
  renewals: number; // long in Java, number in TypeScript
  transactions: PageResponseDto<SubscriptionPaymentDto>; // Page in Java, PageResponseDto in TypeScript
} 