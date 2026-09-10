export type FinanceRange = '24h' | '7d' | '30d' | '90d' | 'ytd';

export interface FinanceMetricWithTrend {
  value: number | string;
  previousValue?: number | string;
  deltaPct?: number;
}

export interface PnlBreakdown {
  gross: number | string;
  iyzicoCommission: number | string;
  refunds: number | string;
  vat: number | string;
  platformFee: number | string;
  organizerPayout: number | string;
  net: number | string;
}

export interface FinanceTimeseriesPoint {
  t: string;
  gross: number | string;
  net: number | string;
}

export interface CurrencyBreakdown {
  currency: string;
  orderCount: number;
  grossAmount: number | string;
  sharePct: number;
}

export interface EventTypeBreakdown {
  paidCount: number;
  freeCount: number;
  paidGross: number | string;
}

export interface PaymentMethodBreakdown {
  method: string;
  count: number;
  amount: number | string;
  sharePct: number;
}

export interface TopEvent {
  eventId: string;
  eventName?: string | null;
  orderCount: number;
  grossAmount: number | string;
  netAmount: number | string;
}

export interface FinanceOverviewData {
  range: FinanceRange;
  currency: string;
  generatedAt: string;
  grossRevenue?: FinanceMetricWithTrend;
  netRevenue?: FinanceMetricWithTrend;
  platformFee?: FinanceMetricWithTrend;
  marginPct?: FinanceMetricWithTrend;
  refundRate?: FinanceMetricWithTrend;
  chargebackRate?: FinanceMetricWithTrend;
  pnl?: PnlBreakdown;
  dailySeries?: FinanceTimeseriesPoint[];
  byCurrency?: CurrencyBreakdown[];
  byEventType?: EventTypeBreakdown;
  byPaymentMethod?: PaymentMethodBreakdown[];
  topEvents?: TopEvent[];
}
