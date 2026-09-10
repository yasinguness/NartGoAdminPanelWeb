export interface PayoutBatchRef {
  batchId: string;
  payoutAmount: number | string;
  status?: string;
  payoutStatus?: string;
  transactionDate?: string;
  ageMinutes?: number;
}

export interface OrganizerPayout {
  businessId: string;
  eventId?: string;
  displayName: string;
  currency: string;
  pendingBatches: number;
  approvedBatches: number;
  paidBatches: number;
  failedBatches: number;
  pendingAmount: number | string;
  approvedAmount: number | string;
  paidAmount: number | string;
  oldestPendingAt?: string;
  lastPayoutAt?: string;
  pendingBatchRefs?: PayoutBatchRef[];
}

export interface PayoutSummary {
  organizersWithPending: number;
  totalPendingBatches: number;
  totalApprovedBatches: number;
  totalPaidBatches: number;
  totalFailedBatches: number;
  pendingPayoutAmount: number | string;
  approvedPayoutAmount: number | string;
  paidPayoutAmount: number | string;
  oldestPendingAt?: string;
}

export interface PayoutResponse {
  generatedAt: string;
  summary: PayoutSummary;
  organizers: OrganizerPayout[];
}

export interface BatchActionRequest {
  batchIds: string[];
  note?: string;
}

export interface BatchActionResult {
  succeeded: number;
  requested: number;
}
