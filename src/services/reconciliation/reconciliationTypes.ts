export type MismatchType = 'STALE_PENDING' | 'ORPHANED_CHECKOUT' | 'PROVIDER_DB_DRIFT' | 'DUPLICATE_TRANSACTION';
export type Severity = 'low' | 'medium' | 'high';
export type ResolveAction = 'FORCE_SUCCESS' | 'FORCE_FAILED' | 'MARK_REFUNDED' | 'IGNORE';

export interface Mismatch {
  paymentId: string;
  orderId?: string;
  transactionId?: string;
  sessionToken?: string;
  type: MismatchType | string;
  severity: Severity | string;
  dbStatus?: string;
  providerStatus?: string;
  providerResponseCode?: string;
  providerResponseMsg?: string;
  dbAmount?: number | string;
  providerAmount?: number | string;
  currency?: string;
  createdAt?: string;
  paymentDate?: string;
  ageMinutes?: number;
  suggestedAction?: string;
}

export interface ReconciliationSummary {
  stalePending: number;
  orphanedCheckout: number;
  providerDbStatusDrift: number;
  duplicateTransactions: number;
  criticalCount: number;
  warningCount: number;
  totalAtRiskAmount?: number | string;
  oldestMismatchAt?: string;
}

export interface ReconciliationResponse {
  range: string;
  generatedAt: string;
  totalMismatches: number;
  summary?: ReconciliationSummary;
  mismatches: Mismatch[];
}

export interface ResolveRequest {
  action: ResolveAction;
  reason: string;
}
