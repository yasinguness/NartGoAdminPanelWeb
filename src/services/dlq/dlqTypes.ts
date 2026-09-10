export type DlqStatus = 'PENDING' | 'RETRIED' | 'DISMISSED';

export interface DeadLetterEntry {
  id: string;
  topic: string;
  messageKey?: string;
  payload?: string;
  errorMessage?: string;
  status: DlqStatus | string;
  retryCount: number;
  failedAt?: string;
  retriedAt?: string;
}

export interface DlqStats {
  pending: number;
  retried: number;
  dismissed: number;
  total: number;
}

export interface DlqPage {
  content: DeadLetterEntry[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}
