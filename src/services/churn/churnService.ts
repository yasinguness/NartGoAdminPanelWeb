import { api } from '../api';

export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface AtRiskUser {
  userId: string;
  email?: string;
  createdAt?: string;
  lastLoginAt?: string;
  daysSinceLogin?: number;
  tenureDays?: number;
  riskLevel: RiskLevel | string;
  riskScore: number;
  primaryRisk?: string;
}

export interface ChurnSummary {
  totalEligibleUsers: number;
  criticalRiskCount: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  avgDaysSinceLogin?: number;
  estimatedMonthlyChurnRate?: number;
}

export interface ChurnOverviewResponse {
  generatedAt: string;
  summary?: ChurnSummary;
  atRiskUsers: AtRiskUser[];
}

function unwrap<T>(body: any): T | null {
  if (!body) return null;
  if (typeof body === 'object' && 'data' in body && 'success' in body) return (body.data ?? null) as T | null;
  return body as T;
}

async function overview(): Promise<ChurnOverviewResponse | null> {
  try {
    const res = await api.get<any>('/auth/admin/churn/overview');
    return unwrap<ChurnOverviewResponse>(res.data);
  } catch (err: any) {
    const code = err?.response?.status;
    if (code === 404 || code === 501 || code === 403) return null;
    throw err;
  }
}

export const churnService = { overview };
