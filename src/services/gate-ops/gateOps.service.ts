import { api } from '../api';

// ── Response Types ──────────────────────────────────────────

export interface CheckInStats {
    eventId: string;
    total: number;
    totalTickets: number;
    checkedInCount: number;
    remainingCount: number;
    checkInRate: number;
    lastCheckIn: string | null;
}

export interface TicketValidationResponse {
    valid: boolean;
    validationStatus: 'SUCCESS' | 'FAILED' | 'ALREADY_USED' | 'INVALID_TICKET' | 'WRONG_EVENT' | 'CANCELLED' | 'REFUNDED';
    message: string;
    errorCode: string | null;
    serialNo: string;
    ticketTypeName: string;
    ticketStatus: string;
    issuedAt: string;
    userName: string;
    userEmail: string;
    userPhone: string;
    eventName: string;
    eventStartDate: string;
    eventLocation: string;
    seatInfo: {
        row: string;
        number: number;
        category: string;
    } | null;
    alreadyCheckedIn: boolean;
    checkInTime: string | null;
    checkedInBy: string | null;
    validatedAt: string;
    validatedBy: string;
}

export interface CheckInAuditEntry {
    id: string;
    ticketId: string;
    eventId: string;
    validatedByEmail: string | null;
    validationMethod: 'QR_SCAN' | 'MANUAL' | 'OFFLINE' | 'OVERRIDE';
    validationStatus: 'SUCCESS' | 'FAILED' | 'ALREADY_USED' | 'INVALID_TICKET' | 'WRONG_EVENT' | 'CANCELLED' | 'REFUNDED';
    errorMessage: string | null;
    createdAt: string;
    // Enriched fields from ticket/user
    userName?: string;
    userEmail?: string;
    ticketTypeName?: string;
    seatRow?: string;
    seatNumber?: number;
}

export interface HourlyCount {
    hour: number;
    count: number;
}

export interface GateLiveStatus {
    gateId: string;
    name: string;
    status: 'ONLINE' | 'OFFLINE' | 'ERROR';
    throughput: number;
    scanCount: number;
    lastScanAt: string | null;
}

export interface FraudAlarm {
    id: string;
    type: string;
    title: string;
    description: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    createdAt: string;
}

interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
}

// ── Service ──────────────────────────────────────────

class GateOpsService {
    // ── Check-in Stats ──
    async getCheckInStats(eventId: string): Promise<CheckInStats> {
        const response = await api.get<ApiResponse<CheckInStats>>(`/tickets/checkin/stats/${eventId}`);
        return response.data?.data;
    }

    // ── QR Validate & Check-in ──
    async validateAndCheckIn(
        qrCodeData: string,
        eventId: string,
        _staffEmail?: string,
    ): Promise<TicketValidationResponse> {
        const response = await api.post<ApiResponse<TicketValidationResponse>>('/tickets/checkin/validate', {
            qrCodeData,
            eventId,
            deviceInfo: {
                deviceType: 'ADMIN_PANEL',
                browser: navigator.userAgent,
            },
        });
        return response.data?.data;
    }

    // ── QR Check-in (simple) ──
    async checkInByQR(qrCodeData: string, staffUserId?: string): Promise<TicketValidationResponse> {
        const response = await api.post<ApiResponse<TicketValidationResponse>>('/tickets/checkin/qr', {
            qrCodeData,
            staffUserId,
        });
        return response.data?.data;
    }

    // ── Manual Check-in ──
    async checkInOnline(ticketCode: string, eventId: string, staffUserId?: string): Promise<any> {
        const response = await api.post<ApiResponse<any>>('/tickets/checkin/online', {
            ticketCode,
            eventId,
            staffUserId,
        });
        return response.data?.data;
    }

    // ── Recent Audit Entries ──
    async getRecentAudits(eventId: string, hoursAgo: number = 1): Promise<CheckInAuditEntry[]> {
        const response = await api.get<ApiResponse<CheckInAuditEntry[]>>(
            `/ticket/checkin/audit/event/${eventId}/recent`,
            { params: { hoursAgo } }
        );
        return response.data?.data || [];
    }

    // ── Hourly Counts ──
    async getHourlyCounts(eventId: string): Promise<HourlyCount[]> {
        const response = await api.get<ApiResponse<HourlyCount[]>>(
            `/ticket/checkin/audit/event/${eventId}/hourly-counts`
        );
        return response.data?.data || [];
    }

    // ── Staff Stats ──
    async getStaffStats(eventId: string): Promise<any> {
        const response = await api.get<ApiResponse<any>>(
            `/ticket/checkin/audit/event/${eventId}/staff-stats`
        );
        return response.data?.data;
    }

    // ── Gate Operations ──
    async getLiveGatewayStatus(eventId: string): Promise<GateLiveStatus[]> {
        const response = await api.get<ApiResponse<GateLiveStatus[]>>(
            '/tickets/gate-ops/live-status',
            { params: { eventId } }
        );
        return response.data?.data || [];
    }

    async getGateDrillDown(gateId: string): Promise<any> {
        const response = await api.get<ApiResponse<any>>(`/tickets/gate-ops/gates/${gateId}`);
        return response.data?.data;
    }

    async getDeviceStatus(gateId: string): Promise<any[]> {
        const response = await api.get<ApiResponse<any[]>>(`/tickets/gate-ops/gates/${gateId}/devices`);
        return response.data?.data || [];
    }

    async getFraudAlarms(eventId: string, minutes: number = 60): Promise<FraudAlarm[]> {
        const response = await api.get<ApiResponse<FraudAlarm[]>>(
            '/tickets/gate-ops/fraud-alarms',
            { params: { eventId, minutes } }
        );
        return response.data?.data || [];
    }

    async broadcastMessage(gateId: string, message: string): Promise<any> {
        const response = await api.post<ApiResponse<any>>(`/tickets/gate-ops/gates/${gateId}/broadcast`, { message });
        return response.data?.data;
    }

    async resetGateCounter(gateId: string): Promise<any> {
        const response = await api.post<ApiResponse<any>>(`/tickets/gate-ops/gates/${gateId}/reset`);
        return response.data?.data;
    }
}

export const gateOpsService = new GateOpsService();
