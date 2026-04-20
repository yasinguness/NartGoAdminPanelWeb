import { api } from '../api';

export interface Anomaly {
  type: 'HIGH_FREQUENCY' | 'BULK_DELETION' | 'OFF_HOURS' | 'IP_DIVERGENCE' | string;
  severity: 'low' | 'medium' | 'high' | string;
  actorEmail?: string;
  message?: string;
  eventCount?: number;
  firstSeen?: string;
  lastSeen?: string;
  sampleDetails?: string[];
}

export interface AnomalySummary {
  totalAnomalies: number;
  highSeverity: number;
  mediumSeverity: number;
  lowSeverity: number;
  auditEventsScanned: number;
}

export interface AnomalyScanResponse {
  generatedAt: string;
  windowHours: number;
  summary?: AnomalySummary;
  anomalies: Anomaly[];
}

function unwrap<T>(body: any): T | null {
  if (!body) return null;
  if (typeof body === 'object' && 'data' in body && 'success' in body) return (body.data ?? null) as T | null;
  return body as T;
}

async function scan(hours = 24): Promise<AnomalyScanResponse | null> {
  try {
    const res = await api.get<any>('/auth/admin/anomalies/scan', { params: { hours } });
    return unwrap<AnomalyScanResponse>(res.data);
  } catch (err: any) {
    const code = err?.response?.status;
    if (code === 404 || code === 501 || code === 403) return null;
    throw err;
  }
}

export const anomalyService = { scan };
