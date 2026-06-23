import { api } from '../api';
import { ApiResponse } from '../../types/api';

/** NB audit_logs satırı (AuditLogEntity). */
export interface NbAuditRow {
  id: number;
  occurredAt: string;
  source: string;
  action: string;
  actorRole?: string | null;
  actorUserId?: string | null;
  targetId?: string | null;
  targetType?: string | null;
  outcome?: string | null;
  meta?: Record<string, unknown> | null;
  correlationId?: string | null;
}

/** Backend PageResponse (AuditAdminController). */
export interface NbAuditPage {
  content: NbAuditRow[];
  page: number;
  size: number;
  totalElements: number;
}

export interface NbAuditQuery {
  action?: string;
  actorUserId?: string;
  days?: number;
  page?: number;
  size?: number;
}

export const nbAuditService = {
  async list(params: NbAuditQuery): Promise<NbAuditPage> {
    const res = await api.get<ApiResponse<NbAuditPage>>('/nb/admin/audit', { params });
    return res.data.data;
  },
};

export default nbAuditService;
