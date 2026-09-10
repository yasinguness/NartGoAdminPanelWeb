export type RefundStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type RefundAction = 'APPROVE' | 'REJECT' | 'RETRY' | 'MARK_COMPLETED';

export interface RefundItem {
  refundId: string;
  paymentId?: string;
  orderId?: string;
  eventId?: string;
  status: RefundStatus | string;
  amount: number | string;
  currency?: string;
  reason?: string;
  transactionId?: string;
  refundDate?: string;
  createdAt?: string;
  ageHours?: number;
  providerResponse?: string;
  slaBreach?: boolean;
}

export interface RefundSummary {
  pendingCount: number;
  processingCount: number;
  completedCount: number;
  failedCount: number;
  pendingAmount: number | string;
  processingAmount: number | string;
  completedAmount: number | string;
  failedAmount: number | string;
  oldestPendingAt?: string;
  slaBreachCount: number;
}

export interface RefundListResponse {
  generatedAt: string;
  summary?: RefundSummary;
  refunds: RefundItem[];
}

export interface RefundActionRequest {
  action: RefundAction;
  note?: string;
}
