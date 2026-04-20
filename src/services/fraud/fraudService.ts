import { api } from '../api';

export interface FlaggedCustomer {
  id: string;
  email: string;
  reason: string;
  flaggedByEmail?: string;
  flaggedAt?: string;
}

export interface SuspiciousCustomer {
  email: string;
  totalOrders: number;
  refundedCount: number;
  failedCount: number;
  cancelledCount: number;
  refundRatePct?: number;
  failRatePct?: number;
  lastOrderAt?: string;
  riskReason?: string;
  severity: 'low' | 'medium' | 'high' | string;
}

export interface FraudOverviewResponse {
  generatedAt: string;
  flaggedCount: number;
  suspiciousCount: number;
  flagged: FlaggedCustomer[];
  suspicious: SuspiciousCustomer[];
}

export interface FraudFlagRequest {
  email: string;
  reason: string;
}

function unwrap<T>(body: any): T | null {
  if (!body) return null;
  if (typeof body === 'object' && 'data' in body && 'success' in body) return (body.data ?? null) as T | null;
  return body as T;
}

async function overview(): Promise<FraudOverviewResponse | null> {
  try {
    const res = await api.get<any>('/tickets/admin/fraud/overview');
    return unwrap<FraudOverviewResponse>(res.data);
  } catch (err: any) {
    const code = err?.response?.status;
    if (code === 404 || code === 501 || code === 403) return null;
    throw err;
  }
}

async function flag(req: FraudFlagRequest): Promise<FlaggedCustomer | null> {
  const res = await api.post<any>('/tickets/admin/fraud/flag', req);
  return unwrap<FlaggedCustomer>(res.data);
}

async function unflag(id: string): Promise<void> {
  await api.delete(`/tickets/admin/fraud/flag/${id}`);
}

export const fraudService = { overview, flag, unflag };
