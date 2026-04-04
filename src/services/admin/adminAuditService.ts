import { api } from '../api';
import type { AdminAuditLogEntry, AdminAuditLogFilter } from '../../types/admin/adminAuditLog';

interface PageResponse<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    /** 0-based page number (named `number` in Spring's PageResponseDto) */
    number: number;
    size: number;
}

const unwrap = async <T>(req: Promise<{ data: { data: T } }>): Promise<T> => {
    const res = await req;
    return res.data.data;
};

export const adminAuditService = {
    getLogs(filter: AdminAuditLogFilter = {}): Promise<PageResponse<AdminAuditLogEntry>> {
        const params: Record<string, string | number | undefined> = {
            page: filter.page ?? 0,
            size: filter.size ?? 20,
        };
        if (filter.actorEmail) params.actorEmail = filter.actorEmail;
        if (filter.action) params.action = filter.action;
        if (filter.targetType) params.targetType = filter.targetType;
        if (filter.targetId) params.targetId = filter.targetId;
        if (filter.from) params.from = filter.from;
        if (filter.to) params.to = filter.to;

        return unwrap(api.get('/auth/admin/audit', { params }));
    },
};
