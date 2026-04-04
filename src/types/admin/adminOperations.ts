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

// ── Ticket & Order types ──────────────────────────────────────────────────────

export type TicketTypeStatus = 'ACTIVE' | 'INACTIVE' | 'SOLD_OUT' | 'ENDED';

export interface TicketTypeResponse {
  id: string;
  eventId: string;
  name: string;
  description?: string;
  basePrice: number;
  currency: string;
  capacityTotal: number;
  capacitySold: number;
  capacityReserved: number;
  availableCapacity: number;
  saleStartAt: string;
  saleEndAt: string;
  status: TicketTypeStatus;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItemResponse {
  ticketTypeId: string;
  ticketTypeName?: string;
  unitPrice: number;
  quantity: number;
  discountApplied: number;
  finalPrice: number;
  totalPrice: number;
}

export interface TicketResponse {
  id: string;
  ticketTypeId: string;
  status: string;
  serialNo: string;
  qrCodeUrl?: string;
  issuedAt?: string;
}

export type OrderStatus = 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED' | 'FAILED';

export interface OrderResponse {
  id: string;
  eventId: string;
  reservationId?: string;
  status: OrderStatus;
  totalAmount: number;
  currency: string;
  iyzicoPaymentId?: string;
  createdAt: string;
  paidAt?: string;
  items: OrderItemResponse[];
  tickets: TicketResponse[];
}

export interface CheckInStats {
  totalTickets: number;
  checkedIn: number;
  notCheckedIn: number;
  checkInRate: number;
}
