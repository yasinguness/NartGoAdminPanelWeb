import { api } from '../api';
import {
  AddSeatsRequest,
  AdminCategoryCapacityUpdateRequest,
  AdminEventCancelRequest,
  AdminEventCapacityUpdateRequest,
  AdminOrderRefundRequest,
  AdminTicketOverrideRequest,
  ApiEnvelope,
  BackfillRequest,
  BulkOrderActionRequest,
  CheckInOnlineRequest,
  CheckInQrRequest,
  CheckInValidateRequest,
  CheckInStats,
  GenericApiData,
  OfflineGenerateRequest,
  OfflineSyncRequest,
  OfflineValidateRequest,
  OrderResponse,
  QrParseRequest,
  RemoveSeatsRequest,
  SeatMoveRequest,
  SeatOverrideRequest,
  TicketTypeResponse,
} from '../../types/admin/adminOperations';

const unwrap = async <T>(request: Promise<{ data: ApiEnvelope<T> }>) => {
  const response = await request;
  return response.data;
};

export const adminOperationsService = {
  pauseEvent: (eventId: string) =>
    unwrap<GenericApiData>(api.post(`/events/admin/${eventId}/pause`)),

  resumeEvent: (eventId: string) =>
    unwrap<GenericApiData>(api.post(`/events/admin/${eventId}/resume`)),

  cancelEvent: (eventId: string, payload: AdminEventCancelRequest) =>
    unwrap<GenericApiData>(api.post(`/events/admin/${eventId}/cancel`, payload)),

  closeEventSales: (eventId: string) =>
    unwrap<GenericApiData>(api.post(`/events/admin/${eventId}/close-sales`)),

  updateEventCapacity: (eventId: string, payload: AdminEventCapacityUpdateRequest) =>
    unwrap<GenericApiData>(api.patch(`/events/admin/${eventId}/capacity`, payload)),

  backfillEventAudit: (eventId: string, payload?: BackfillRequest) =>
    unwrap<GenericApiData>(api.post(`/events/admin/${eventId}/audit/backfill`, payload ?? {})),

  overrideSeats: (eventId: string, payload: SeatOverrideRequest) =>
    unwrap<GenericApiData>(api.post(`/tickets/admin/events/${eventId}/seats/override`, payload)),

  overrideSeatById: (eventId: string, seatId: string, payload: Omit<SeatOverrideRequest, 'seatIds'>) =>
    unwrap<GenericApiData>(api.post(`/tickets/admin/events/${eventId}/seats/${seatId}/override`, payload)),

  getSeatAudit: (eventId: string) =>
    unwrap<GenericApiData>(api.get(`/tickets/admin/events/${eventId}/seats/audit`)),

  addSeats: (eventId: string, payload: AddSeatsRequest) =>
    unwrap<GenericApiData>(api.post(`/tickets/admin/events/${eventId}/seats/add`, payload)),

  removeSeats: (eventId: string, payload: RemoveSeatsRequest) =>
    unwrap<GenericApiData>(api.delete(`/tickets/admin/events/${eventId}/seats`, { data: payload })),

  moveSeat: (eventId: string, payload: SeatMoveRequest) =>
    unwrap<GenericApiData>(api.post(`/tickets/admin/events/${eventId}/seats/move`, payload)),

  backfillSeating: (eventId: string, payload?: BackfillRequest) =>
    unwrap<GenericApiData>(api.post(`/tickets/admin/events/${eventId}/seating/backfill`, payload ?? {})),

  getOrders: (eventId: string) =>
    unwrap<OrderResponse[]>(api.get(`/tickets/admin/events/${eventId}/orders`)),

  getTicketTypes: (eventId: string) =>
    unwrap<TicketTypeResponse[]>(api.get(`/tickets/admin/events/${eventId}/ticket-types`)),

  getCheckInStats: (eventId: string) =>
    unwrap<CheckInStats>(api.get(`/tickets/admin/events/${eventId}/checkin-stats`)),

  bulkCancelRefundOrders: (eventId: string, payload: BulkOrderActionRequest) =>
    unwrap<GenericApiData>(api.post(`/tickets/admin/events/${eventId}/orders/bulk-cancel-refund`, payload)),

  cancelAllOrders: (eventId: string, payload: AdminOrderRefundRequest) =>
    unwrap<GenericApiData>(api.post(`/tickets/admin/events/${eventId}/orders/cancel-all`, payload)),

  refundOrder: (orderId: string, payload: AdminOrderRefundRequest) =>
    unwrap<GenericApiData>(api.post(`/tickets/admin/orders/${orderId}/refund`, payload)),

  overrideTicket: (eventId: string, ticketId: string, payload: AdminTicketOverrideRequest) =>
    unwrap<GenericApiData>(api.post(`/tickets/admin/events/${eventId}/tickets/${ticketId}/override`, payload)),

  updateCategoryCapacity: (eventId: string, categoryId: string, payload: AdminCategoryCapacityUpdateRequest) =>
    unwrap<GenericApiData>(api.patch(`/tickets/admin/events/${eventId}/categories/${categoryId}/capacity`, payload)),

  getAdminAudit: (params?: Record<string, string | number | undefined>) =>
    unwrap<GenericApiData>(api.get('/tickets/admin/audit', { params })),

  backfillAdminAudit: (eventId: string) =>
    unwrap<GenericApiData>(api.post('/tickets/admin/audit/backfill', undefined, { params: { eventId } })),

  getCheckInAuditByEvent: (eventId: string) =>
    unwrap<GenericApiData>(api.get(`/ticket/checkin/audit/event/${eventId}`)),

  getCheckInAuditByTicket: (ticketId: string) =>
    unwrap<GenericApiData>(api.get(`/ticket/checkin/audit/ticket/${ticketId}`)),

  getMyCheckInHistory: () =>
    unwrap<GenericApiData>(api.get('/ticket/checkin/audit/my-history')),

  getCheckInStaffStats: (eventId: string) =>
    unwrap<GenericApiData>(api.get(`/ticket/checkin/audit/event/${eventId}/staff-stats`)),

  getRecentCheckIns: (eventId: string) =>
    unwrap<GenericApiData>(api.get(`/ticket/checkin/audit/event/${eventId}/recent`)),

  getHourlyCheckInCounts: (eventId: string) =>
    unwrap<GenericApiData>(api.get(`/ticket/checkin/audit/event/${eventId}/hourly-counts`)),

  checkInOnline: (payload: CheckInOnlineRequest) =>
    unwrap<GenericApiData>(api.post('/tickets/checkin/online', payload)),

  checkInQr: (payload: CheckInQrRequest) =>
    unwrap<GenericApiData>(api.post('/tickets/checkin/qr', payload)),

  validateCheckIn: (payload: CheckInValidateRequest) =>
    unwrap<GenericApiData>(api.post('/tickets/checkin/validate', payload)),

  generateOfflineData: (payload: OfflineGenerateRequest) =>
    unwrap<GenericApiData>(api.post('/tickets/checkin/offline/generate', payload)),

  validateOfflineCheckIn: (payload: OfflineValidateRequest) =>
    unwrap<GenericApiData>(api.post('/tickets/checkin/offline/validate', payload)),

  syncOfflineCheckIns: (payload: OfflineSyncRequest) =>
    unwrap<GenericApiData>(api.post('/tickets/checkin/offline/sync', payload)),

  parseQr: (payload: QrParseRequest) =>
    unwrap<GenericApiData>(api.post('/tickets/checkin/qr/parse', payload)),
};
