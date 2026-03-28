export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
  statusCode: number;
  statusMessage: string;
}

export interface AdminEventCancelRequest {
  reason: string;
}

export interface AdminEventCapacityUpdateRequest {
  capacity: number;
  reason: string;
}

export interface EventAdminBackfillRequest {
  reason?: string;
}

export type SeatTargetState = 'AVAILABLE' | 'BLOCKED' | 'RESERVED' | 'SOLD' | 'OCCUPIED';

export interface SeatOverrideRequest {
  targetState: SeatTargetState;
  reason: string;
  seatIds?: string[];
}

export interface AddSeatsRequest {
  categoryId: string;
  rowLabel: string;
  seatNumbers: number[];
  reason: string;
}

export interface RemoveSeatsRequest {
  seatIds: string[];
  reason: string;
}

export interface SeatMoveRequest {
  seatId: string;
  targetCategoryId: string;
  targetRowLabel: string;
  targetSeatNumber: number;
  reason: string;
}

export interface BackfillRequest {
  reason?: string;
}

export interface BulkOrderActionRequest {
  orderIds: string[];
  reason: string;
}

export interface AdminOrderRefundRequest {
  reason: string;
}

export type AdminTicketOverrideAction = 'REFUND' | 'CANCEL' | 'REISSUE' | 'CHECK_IN_RESET';

export interface AdminTicketOverrideRequest {
  action: AdminTicketOverrideAction;
  reason: string;
}

export interface AdminCategoryCapacityUpdateRequest {
  capacity: number;
  reason: string;
}

export interface CheckInOnlineRequest {
  ticketCode: string;
  eventId: string;
  staffUserId: string;
}

export interface CheckInQrRequest {
  qrCodeData: string;
  staffUserId: string;
}

export interface CheckInValidateRequest {
  qrCodeData: string;
  eventId: string;
  deviceInfo?: {
    deviceId?: string;
    platform?: string;
  };
  locationInfo?: {
    gate?: string;
    [key: string]: unknown;
  };
}

export interface OfflineGenerateRequest {
  eventId: string;
  staffUserId: string;
}

export interface OfflineValidateRequest {
  eventId: string;
  ticketCode?: string;
  qrCodeData?: string;
  deviceId?: string;
}

export interface OfflineSyncRequest {
  eventId: string;
  deviceId?: string;
  attempts: unknown[];
}

export interface QrParseRequest {
  qrCodeData: string;
}

export type GenericApiData = Record<string, unknown> | Array<Record<string, unknown>> | string | number | boolean | null;
