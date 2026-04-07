/**
 * Ticket Management Service — Admin bilet yönetim API'leri
 */
import { api } from '../api';
import type {
  TicketListItem,
  TicketDetailResponse,
  OrderDetailResponse,
  TicketFilters,
} from '../../types/tickets/ticketManagementTypes';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
  statusCode: number;
  statusMessage: string;
}

export const ticketManagementService = {
  // ── Bilet Listeleme (Etkinlik bazlı) ─────────────────────
  getEventTickets: async (eventId: string): Promise<ApiResponse<TicketListItem[]>> => {
    // Admin orders endpoint üzerinden biletlere erişiyoruz
    const response = await api.get<ApiResponse<OrderDetailResponse[]>>(
      `/tickets/admin/events/${eventId}/orders`
    );

    // Orders içindeki ticket'ları düzleştir
    const tickets: TicketListItem[] = [];
    if (response.data?.data) {
      for (const order of response.data.data) {
        if (order.tickets) {
          for (const ticket of order.tickets) {
            tickets.push({
              id: ticket.id,
              orderId: order.id,
              ticketTypeName: '', // Will be resolved client-side
              status: (ticket.status as any) || 'ACTIVE',
              serialNo: ticket.serialNo,
              issuedAt: ticket.issuedAt,
              canBeCheckedIn: ticket.status === 'ACTIVE',
              canBeRefunded: ticket.status === 'ACTIVE' || ticket.status === 'RESERVED',
              isCheckedIn: ticket.status === 'CHECKED_IN' || ticket.status === 'USED',
              userEmail: '',
              eventId,
              eventName: '',
            });
          }
        }
      }
    }

    return { ...response.data, data: tickets };
  },

  // ── Bilet Detay ──────────────────────────────────────────
  getTicketDetail: async (ticketId: string): Promise<ApiResponse<TicketDetailResponse>> => {
    const response = await api.get<ApiResponse<TicketDetailResponse>>(`/tickets/${ticketId}`);
    return response.data;
  },

  // ── Bilet İptal (Admin) ──────────────────────────────────
  cancelTicket: async (ticketId: string, reason?: string): Promise<ApiResponse<void>> => {
    const response = await api.post<ApiResponse<void>>(
      `/tickets/${ticketId}/cancel`,
      null,
      { params: { reason: reason || 'Admin tarafından iptal edildi' } }
    );
    return response.data;
  },

  // ── Bilet İade (Admin) ───────────────────────────────────
  refundTicket: async (ticketId: string, reason?: string): Promise<ApiResponse<void>> => {
    const response = await api.post<ApiResponse<void>>(
      `/tickets/${ticketId}/refund`,
      null,
      { params: { reason: reason || 'Admin tarafından iade edildi' } }
    );
    return response.data;
  },

  // ── QR Kod Getir ─────────────────────────────────────────
  getTicketQRCode: async (ticketId: string): Promise<ApiResponse<string>> => {
    const response = await api.get<ApiResponse<string>>(`/tickets/${ticketId}/qr-code`);
    return response.data;
  },

  // ── Sipariş Listeleme (Etkinlik bazlı) ───────────────────
  getEventOrders: async (eventId: string): Promise<ApiResponse<OrderDetailResponse[]>> => {
    const response = await api.get<ApiResponse<OrderDetailResponse[]>>(
      `/tickets/admin/events/${eventId}/orders`
    );
    return response.data;
  },

  // ── Check-in İstatistikleri ──────────────────────────────
  getCheckInStats: async (eventId: string) => {
    const response = await api.get<ApiResponse<{
      totalTickets: number;
      checkedIn: number;
      notCheckedIn: number;
      checkInRate: number;
    }>>(`/tickets/admin/events/${eventId}/checkin-stats`);
    return response.data;
  },

  // ── Müşteri Destek Arama ─────────────────────────────────
  searchCustomer: async (query: string) => {
    const response = await api.get<ApiResponse<any>>('/tickets/customer-support/search', {
      params: { q: query },
    });
    return response.data;
  },

  // ── Bilet Yeniden Gönder ─────────────────────────────────
  resendTicket: async (customerId: string, params: { orderId: string; channel: string }) => {
    const response = await api.post<ApiResponse<void>>(
      `/tickets/customer-support/${customerId}/resend-ticket`,
      null,
      { params }
    );
    return response.data;
  },

  // ── Check-in Reset ───────────────────────────────────────
  resetCheckIn: async (customerId: string, params: { ticketId: string; reason: string }) => {
    const response = await api.post<ApiResponse<void>>(
      `/tickets/customer-support/${customerId}/reset-checkin`,
      null,
      { params }
    );
    return response.data;
  },

  // ── Transfer İşlemleri (Doküman Bölüm 5.4) ──────────────

  getTicketTransferHistory: async (ticketId: string) => {
    const response = await api.get<ApiResponse<any[]>>(`/tickets/${ticketId}/transfers`);
    return response.data;
  },

  initiateTransfer: async (ticketId: string, toEmail: string) => {
    const response = await api.post<ApiResponse<void>>(`/tickets/${ticketId}/transfer`, { toEmail });
    return response.data;
  },
};

export default ticketManagementService;
