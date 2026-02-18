# Subscription Payment Service

This service provides comprehensive functionality for managing subscription payments, analytics, and revenue tracking for associations.

## Features

- **Transaction Management**: Get and filter subscription payment transactions
- **Revenue Analytics**: Detailed revenue analysis and reporting
- **Association Analytics**: Comprehensive analytics for associations
- **Payment Details**: Individual payment information retrieval
- **Export Functionality**: Export payment data in various formats

## Usage Examples

### Get Association Transactions with Filtering

```typescript
import { subscriptionPaymentService } from "../services/subscriptionPayments/subscriptionPaymentService";
import { SubscriptionStatus } from "../../types/enums";
import { PackageType } from "../../types/associationMember/packageType";

const filter = {
  status: SubscriptionStatus.ACTIVE,
  packageType: PackageType.PREMIUM,
  startDate: "2024-01-01T00:00:00Z",
  endDate: "2024-12-31T23:59:59Z",
  eventType: "INITIAL_PURCHASE",
};

const transactions =
  await subscriptionPaymentService.getAssociationTransactions(
    "association-id",
    filter,
    0, // page
    20, // size
    "purchaseDate,desc" // sort
  );
```

### Get Association Analytics

```typescript
const analytics = await subscriptionPaymentService.getAssociationAnalytics(
  "association-id",
  "2024-01-01T00:00:00Z", // startDate
  "2024-12-31T23:59:59Z" // endDate
);

console.log("Total Revenue:", analytics.data.totalRevenue);
console.log("Active Members:", analytics.data.activeMembers);
console.log("Monthly Revenue:", analytics.data.monthlyRevenue);
```

### Get Payment Details

```typescript
const paymentDetails =
  await subscriptionPaymentService.getSubscriptionPaymentDetails(
    "association-id",
    "payment-id"
  );
```

### Search Payments

```typescript
const searchResults =
  await subscriptionPaymentService.searchSubscriptionPayments(
    "john.doe@example.com", // searchTerm
    0, // page
    10 // size
  );
```

### Export Payments

```typescript
const filter = {
  associationId: "association-id",
  startDate: "2024-01-01T00:00:00Z",
  endDate: "2024-12-31T23:59:59Z",
};

const csvData = await subscriptionPaymentService.exportSubscriptionPayments(
  filter,
  "csv"
);
// Handle the blob data for download
```

## API Endpoints

The service maps to the following backend endpoints:

- `GET /api/v1/subscription-payments/{associationId}/transactions` - Get association transactions
- `GET /api/v1/subscription-payments/{associationId}/analytics` - Get association analytics
- `GET /api/v1/subscription-payments/{associationId}/transactions/{paymentId}` - Get payment details
- `GET /subscription-payments/association/{associationId}` - Get payments by association
- `GET /subscription-payments/user/{userId}` - Get payments by user
- `GET /subscription-payments/search` - Search payments
- `GET /subscription-payments/statistics` - Get payment statistics
- `GET /subscription-payments/export` - Export payments

## Types

### SubscriptionPaymentFilterDto

```typescript
interface SubscriptionPaymentFilterDto {
  associationId?: string;
  startDate?: string; // ISO date-time format
  endDate?: string; // ISO date-time format
  status?: SubscriptionStatus;
  eventType?: string;
  packageType?: PackageType;
  userId?: string;
  revenuecatTransactionId?: string;
}
```

### AssociationRevenueDto

```typescript
interface AssociationRevenueDto {
  totalRevenue: number; // BigDecimal in Java, number in TypeScript
  totalTransactions: number; // long in Java, number in TypeScript
  newSubscriptions: number; // long in Java, number in TypeScript
  renewals: number; // long in Java, number in TypeScript
  transactions: PageResponseDto<SubscriptionPaymentDto>; // Page in Java, PageResponseDto in TypeScript
}
```

### AssociationAnalyticsDto

```typescript
interface AssociationAnalyticsDto {
  totalMembers: number;
  activeMembers: number;
  newMembersThisMonth: number;
  churnedMembersThisMonth: number;
  memberGrowthRate: number;
  totalRevenue: number;
  monthlyRevenue: number;
  revenueGrowthRate: number;
  averageRevenuePerMember: number;
  revenueByPackageType: Record<string, number>;
  totalSubscriptions: number;
  activeSubscriptions: number;
  expiredSubscriptions: number;
  cancelledSubscriptions: number;
  subscriptionRenewalRate: number;
  totalPayments: number;
  successfulPayments: number;
  failedPayments: number;
  refundedPayments: number;
  paymentSuccessRate: number;
  dailyRevenue: Record<string, number>;
  dailyNewMembers: Record<string, number>;
  dailyActiveMembers: Record<string, number>;
  monthlyRevenueTrend: Record<string, number>;
  monthlyNewMembers: Record<string, number>;
  revenueByLocation: Record<string, number>;
  membersByLocation: Record<string, number>;
  packageTypeDistribution: Record<string, number>;
  packageTypeRevenue: Record<string, number>;
  retentionRate: Record<string, number>;
  averageLifetimeValue: number;
  averageSubscriptionDuration: number;
  conversionRate: number;
  churnRate: number;
  netPromoterScore?: number;
}
```
