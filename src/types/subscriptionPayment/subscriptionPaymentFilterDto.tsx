import { SubscriptionStatus } from '../enums/subscriptionStatus';
import { PackageType } from '../associationMember/packageType';
import { EventType } from '../enums/eventType';
import { Environment } from '../enums/environment';
import { Store } from '../enums/store';
import { SubscriptionType } from './adminSubscriptionPaymentDto';

export interface SubscriptionPaymentFilterDto {
  // Association filter
  associationId?: string;

  // Date range filters
  startDate?: string; // ISO date-time format
  endDate?: string; // ISO date-time format

  // Status and type filters
  status?: SubscriptionStatus;
  eventType?: string | EventType;
  eventTypes?: (string | EventType)[]; // Multiple event types
  packageType?: PackageType;
  packageTypes?: PackageType[]; // Multiple package types

  // User and member filters
  userId?: string;
  memberEmail?: string;
  memberName?: string;
  membershipNumber?: string;

  // Transaction filters
  revenuecatTransactionId?: string;
  originalTransactionId?: string;
  store?: string | Store; // APP_STORE, GOOGLE_PLAY
  environment?: string | Environment; // SANDBOX, PRODUCTION
  currency?: string;

  // Amount filters
  minAmount?: number;
  maxAmount?: number;

  // Business filters (for subscription agreements)
  businessId?: string;
  businessName?: string;

  // Payment specific filters
  isRefunded?: boolean;
  isInGracePeriod?: boolean;
  cancellationReason?: string;
  productId?: string;

  // Subscription cycle filters
  minRenewalNumber?: number;
  maxRenewalNumber?: number;

  // Search term for general searching
  searchTerm?: string; // Can search across member name, email, transaction ID, etc.

  // Subscription type filters
  subscriptionType?: SubscriptionType;

  // Sorting preferences
  sortBy?: 'paymentDate' | 'amount' | 'memberName' | 'status' | 'eventType' | 'packageType' | string;
  sortDirection?: 'ASC' | 'DESC';
} 