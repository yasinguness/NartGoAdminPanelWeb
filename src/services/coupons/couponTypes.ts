export type DiscountType = 'RATE' | 'AMOUNT';
export type CouponStatus = 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'SCHEDULED' | 'EXHAUSTED';

export interface Coupon {
  id: string;
  code: string;
  campaignId: string;
  discountType: DiscountType | string;
  discountValue: number | string;
  maxUsage: number;
  usedCount?: number;
  minBasketAmount?: number | string;
  validFrom: string;
  validTo: string;
  active: boolean;
  status: CouponStatus | string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CouponSummary {
  activeCount: number;
  expiredCount: number;
  exhaustedCount: number;
  totalUsage: number;
  totalDiscountGiven?: number | string;
}

export interface CouponListResponse {
  generatedAt: string;
  summary?: CouponSummary;
  coupons: Coupon[];
}

export interface CouponRequest {
  code: string;
  campaignId: string;
  discountType: DiscountType;
  discountValue: number;
  maxUsage: number;
  minBasketAmount?: number;
  validFrom: string;
  validTo: string;
  active?: boolean;
}
