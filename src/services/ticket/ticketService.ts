import { api } from '../api';
import {
  TicketTypeResponse,
  CreateTicketTypeRequest,
  VenueTemplate,
  VenueLayoutType,
  SeatMapResponse,
  OrderResponse,
  TicketResponse,
} from '../../types/tickets/ticketTypes';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
  statusCode: number;
  statusMessage: string;
}

export const ticketService = {
  // ── Bilet Türü İşlemleri ──────────────────────────────────

  createTicketType: async (request: CreateTicketTypeRequest) => {
    const response = await api.post<ApiResponse<TicketTypeResponse>>('/tickets/admin/ticket-types', request);
    return response.data;
  },

  getTicketType: async (id: string) => {
    const response = await api.get<ApiResponse<TicketTypeResponse>>(`/tickets/admin/ticket-types/${id}`);
    return response.data;
  },

  getEventTicketTypes: async (eventId: string) => {
    const response = await api.get<ApiResponse<TicketTypeResponse[]>>(`/tickets/admin/events/${eventId}/ticket-types`);
    return response.data;
  },

  updateTicketType: async (id: string, request: CreateTicketTypeRequest) => {
    const response = await api.put<ApiResponse<TicketTypeResponse>>(`/tickets/admin/ticket-types/${id}`, request);
    return response.data;
  },

  deleteTicketType: async (id: string) => {
    const response = await api.delete<ApiResponse<void>>(`/tickets/admin/ticket-types/${id}`);
    return response.data;
  },

  // ── Sipariş İşlemleri ─────────────────────────────────────

  getEventOrders: async (eventId: string) => {
    const response = await api.get<ApiResponse<OrderResponse[]>>(`/tickets/admin/events/${eventId}/orders`);
    return response.data;
  },

  // ── Check-in İstatistikleri ───────────────────────────────

  getCheckInStats: async (eventId: string) => {
    const response = await api.get<ApiResponse<{
      totalTickets: number;
      checkedIn: number;
      notCheckedIn: number;
      checkInRate: number;
    }>>(`/tickets/admin/events/${eventId}/checkin-stats`);
    return response.data;
  },

  // ── Bilet İşlemleri ───────────────────────────────────────

  getTicketById: async (id: string) => {
    const response = await api.get<ApiResponse<TicketResponse>>(`/tickets/${id}`);
    return response.data;
  },

  cancelTicket: async (id: string) => {
    const response = await api.post<ApiResponse<TicketResponse>>(`/tickets/${id}/cancel`);
    return response.data;
  },

  refundTicket: async (id: string) => {
    const response = await api.post<ApiResponse<TicketResponse>>(`/tickets/${id}/refund`);
    return response.data;
  },

  getTicketQRCode: async (id: string) => {
    const response = await api.get<ApiResponse<string>>(`/tickets/${id}/qr-code`);
    return response.data;
  },

  // ── Koltuk İşlemleri ──────────────────────────────────────

  getSeatMap: async (eventId: string) => {
    const response = await api.get<ApiResponse<SeatMapResponse>>(`/tickets/seats/events/${eventId}/map`);
    return response.data;
  },

  reserveSeats: async (eventId: string, seatIds: string[], ttlMinutes?: number) => {
    const response = await api.post<ApiResponse<{ reservationId: string }>>(`/tickets/seats/events/${eventId}/reserve`, {
      seatIds,
      ttlMinutes,
    });
    return response.data;
  },

  cancelSeatReservation: async (eventId: string, reservationId: string) => {
    const response = await api.post<ApiResponse<void>>(`/tickets/seats/events/${eventId}/cancel/${reservationId}`);
    return response.data;
  },

  // ── Salon Planı Kaydetme (Admin) ──────────────────────────

  saveSeatMapDesign: async (eventId: string, designPayload: Record<string, any>) => {
    const response = await api.post<ApiResponse<{ designId: string; version: number }>>(
      `/tickets/admin/events/${eventId}/seat-map`,
      designPayload
    );
    return response.data;
  },

  // Admin seat map — zengin detay + stats
  getAdminSeatMap: async (eventId: string) => {
    const response = await api.get<ApiResponse<SeatMapResponse>>(`/tickets/admin/events/${eventId}/seat-map`);
    return response.data;
  },

  // Layout meta kaydet
  saveLayoutMeta: async (eventId: string, layout: {
    layoutMeta?: Record<string, any>;
    stagePosition?: Record<string, any>;
    mapping?: Record<string, any>;
  }) => {
    const response = await api.put<ApiResponse<{ eventId: string; savedAt: string }>>(
      `/tickets/admin/events/${eventId}/seat-map/layout`, layout
    );
    return response.data;
  },

  // Manuel satış
  manualSellSeat: async (eventId: string, seatId: string, note?: string) => {
    const response = await api.post<ApiResponse<any>>(
      `/tickets/admin/events/${eventId}/seats/${seatId}/manual-sell`,
      { note: note || '', adminEmail: 'admin' }
    );
    return response.data;
  },

  // Manuel satış iptal
  manualUnsellSeat: async (eventId: string, seatId: string) => {
    const response = await api.post<ApiResponse<any>>(
      `/tickets/admin/events/${eventId}/seats/${seatId}/manual-unsell`,
      { adminEmail: 'admin' }
    );
    return response.data;
  },

  // Toplu koltuk işlemi
  batchSeatOperation: async (eventId: string, seatIds: string[], action: string, note?: string) => {
    const response = await api.post<ApiResponse<{ action: string; succeeded: number; skipped: number }>>(
      `/tickets/admin/events/${eventId}/seats/batch`,
      { seatIds, action, note: note || '', adminEmail: 'admin' }
    );
    return response.data;
  },

  // Koltuk istatistikleri (available, sold, reserved, blocked, occupancyRate)
  getSeatStats: async (eventId: string) => {
    const response = await api.get<ApiResponse<{
      total: number; available: number; reserved: number;
      sold: number; blocked: number; occupancyRate: number;
    }>>(`/tickets/admin/events/${eventId}/seats/stats`);
    return response.data;
  },

  // Tekil koltuk detayı (manuel satış bilgisi, erişilebilirlik, disable durumu)
  getSeatDetail: async (eventId: string, seatId: string) => {
    const response = await api.get<ApiResponse<Record<string, any>>>(
      `/tickets/admin/events/${eventId}/seats/${seatId}`
    );
    return response.data;
  },

  // Bölge listesi (quota, sold count, ticketTypeId ile)
  getSeatCategories: async (eventId: string) => {
    const response = await api.get<ApiResponse<Array<{
      id: string; name: string; basePrice: number; color: string;
      quota: number; ticketTypeId: string; totalSeats: number; soldSeats: number;
    }>>>(`/tickets/admin/events/${eventId}/seat-categories`);
    return response.data;
  },

  // Audit log (koltuk işlem geçmişi)
  getSeatAuditLog: async (eventId: string, page = 0, size = 50) => {
    const response = await api.get<ApiResponse<Array<Record<string, any>>>>(
      `/tickets/admin/events/${eventId}/seats/audit?page=${page}&size=${size}`
    );
    return response.data;
  },

  getOccupiedSeats: async (eventId: string) => {
    const response = await api.get<ApiResponse<string[]>>(`/tickets/seats/events/${eventId}/occupied`);
    return response.data;
  },

  getReservedSeats: async (eventId: string) => {
    const response = await api.get<ApiResponse<string[]>>(`/tickets/seats/events/${eventId}/reserved`);
    return response.data;
  },

  // ── Kampanya & Kupon (Doküman Bölüm 8) ────────────────────

  createCoupon: async (params: {
    code: string;
    eventId?: string;
    discountType: 'PERCENTAGE' | 'FIXED';
    discountValue: number;
    maxUsage: number;
    validFrom: string;
    validUntil: string;
  }) => {
    const response = await api.post<ApiResponse<any>>('/tickets/campaigns', params);
    return response.data;
  },

  getCampaigns: async (params?: { eventId?: string; status?: string }) => {
    const response = await api.get<ApiResponse<any[]>>('/tickets/campaigns', { params });
    return response.data;
  },

  updateCampaignStatus: async (campaignId: string, status: string) => {
    const response = await api.patch<ApiResponse<void>>(`/tickets/campaigns/${campaignId}/status`, null, {
      params: { status },
    });
    return response.data;
  },

  // Hazır Şablonlar (Frontend'de static olarak tutulacak)
  getVenueTemplates: (): VenueTemplate[] => {
    return venueTemplates.map(template => ({
      ...template,
      seatMap: template.seatMap || createMockSeatMap(template.layout),
    })) as VenueTemplate[];
  },

  getTemplateByType: (type: VenueLayoutType): VenueTemplate | undefined => {
    const template = venueTemplates.find(t => t.type === type);
    if (!template) return undefined;
    return {
      ...template,
      seatMap: template.seatMap || createMockSeatMap(template.layout),
    } as VenueTemplate;
  },

  // ── Profil Bazlı Kayıtlı Şablonlar ──────────────────────

  getSavedTemplates: async () => {
    const response = await api.get<ApiResponse<any[]>>('/tickets/admin/seat-map-templates');
    return response.data;
  },

  saveTemplate: async (template: { name: string; description?: string; venueData: Record<string, any> }) => {
    const response = await api.post<ApiResponse<any>>('/tickets/admin/seat-map-templates', template);
    return response.data;
  },

  deleteTemplate: async (templateId: string) => {
    const response = await api.delete<ApiResponse<void>>(`/tickets/admin/seat-map-templates/${templateId}`);
    return response.data;
  },

  // ── Koltuk Durum Yönetimi (Admin) ────────────────────────

  updateSeatStatus: async (eventId: string, seatIds: string[], status: string, assignment?: {
    ownerName?: string; ownerEmail?: string; note?: string;
  }) => {
    const response = await api.post<ApiResponse<void>>(`/tickets/admin/events/${eventId}/seats/status`, {
      seatIds, status, ...assignment,
    });
    return response.data;
  },

  bulkAssignSeats: async (eventId: string, assignments: Array<{
    seatId: string; ownerName: string; ownerEmail: string; ticketCode?: string;
  }>) => {
    const response = await api.post<ApiResponse<void>>(`/tickets/admin/events/${eventId}/seats/assign`, {
      assignments,
    });
    return response.data;
  },
};

// Hazır Mekan Şablonları
const venueTemplates: any[] = [
  {
    id: 'template-theater-small',
    name: 'Küçük Tiyatro Salonu',
    description: '150 kişilik klasik tiyatro düzeni',
    thumbnail: '/templates/theater-small.png',
    type: VenueLayoutType.THEATER,
    style: 'straight' as any,
    capacity: 150,
    layout: {
      id: 'layout-theater-small',
      name: 'Küçük Tiyatro',
      type: VenueLayoutType.THEATER,
      width: 800,
      height: 600,
      stage: {
        type: 'rectangle',
        width: 300,
        height: 80,
        x: 250,
        y: 50,
        label: 'SAHNE',
        color: '#2D5A33',
      },
      sections: [
        {
          id: 'section-vip',
          name: 'VIP Bölge',
          color: '#FFD700',
          category: 'VIP' as any,
          basePrice: 500,
          rows: generateRows('A', 'C', 15, 0, 150),
          offsetX: 100,
          offsetY: 0,
        },
        {
          id: 'section-premium',
          name: 'Premium Bölge',
          color: '#C0C0C0',
          category: 'PREMIUM' as any,
          basePrice: 350,
          rows: generateRows('D', 'F', 15, 0, 270),
          offsetX: 100,
          offsetY: 0,
        },
        {
          id: 'section-standard',
          name: 'Standart Bölge',
          color: '#CD7F32',
          category: 'STANDARD' as any,
          basePrice: 200,
          rows: generateRows('G', 'J', 15, 0, 390),
          offsetX: 100,
          offsetY: 0,
        },
      ],
      totalCapacity: 150,
    },
  },
  {
    id: 'template-concert-medium',
    name: 'Konser Salonu',
    description: '500 kişilik konser düzeni',
    thumbnail: '/templates/concert-medium.png',
    type: VenueLayoutType.CONCERT,
    style: 'curved' as any,
    capacity: 500,
    layout: {
      id: 'layout-concert-medium',
      name: 'Konser Salonu',
      type: VenueLayoutType.CONCERT,
      width: 1000,
      height: 800,
      stage: {
        type: 'semicircle',
        width: 400,
        height: 100,
        x: 300,
        y: 30,
        label: 'SAHNE',
        color: '#16461C',
      },
      sections: [
        {
          id: 'section-golden-circle',
          name: 'Altın Çember',
          color: '#FFD700',
          category: 'VIP' as any,
          basePrice: 1000,
          rows: generateRows('A', 'B', 20, 0, 150),
          offsetX: 100,
          offsetY: 0,
        },
        {
          id: 'section-front',
          name: 'Ön Bölge',
          color: '#E6E6FA',
          category: 'PREMIUM' as any,
          basePrice: 600,
          rows: generateRows('C', 'G', 25, 0, 230),
          offsetX: 75,
          offsetY: 0,
        },
        {
          id: 'section-middle',
          name: 'Orta Bölge',
          color: '#87CEEB',
          category: 'STANDARD' as any,
          basePrice: 400,
          rows: generateRows('H', 'M', 25, 0, 430),
          offsetX: 75,
          offsetY: 0,
        },
        {
          id: 'section-back',
          name: 'Arka Bölge',
          color: '#90EE90',
          category: 'ECONOMY' as any,
          basePrice: 200,
          rows: generateRows('N', 'R', 25, 0, 630),
          offsetX: 75,
          offsetY: 0,
        },
      ],
      totalCapacity: 500,
    },
  },
  {
    id: 'template-stadium',
    name: 'Stadyum Düzeni',
    description: '5000+ kişilik büyük etkinlik düzeni',
    thumbnail: '/templates/stadium.png',
    type: VenueLayoutType.STADIUM,
    style: 'straight' as any,
    capacity: 5000,
    layout: {
      id: 'layout-stadium',
      name: 'Stadyum',
      type: VenueLayoutType.STADIUM,
      width: 1200,
      height: 1000,
      stage: {
        type: 'rectangle',
        width: 200,
        height: 100,
        x: 500,
        y: 400,
        label: 'SAHNE',
        color: '#16461C',
      },
      sections: [
        {
          id: 'section-a',
          name: 'A Tribün',
          color: '#FF6B6B',
          category: 'PREMIUM' as any,
          basePrice: 800,
          rows: generateRows('A', 'J', 40, 0, 100),
          offsetX: 50,
          offsetY: 0,
          rotation: 0,
        },
        {
          id: 'section-b',
          name: 'B Tribün',
          color: '#4ECDC4',
          category: 'STANDARD' as any,
          basePrice: 500,
          rows: generateRows('A', 'J', 25, 0, 100),
          offsetX: 900,
          offsetY: 0,
          rotation: 0,
        },
        {
          id: 'section-c',
          name: 'C Tribün',
          color: '#45B7D1',
          category: 'STANDARD' as any,
          basePrice: 500,
          rows: generateRows('A', 'J', 25, 0, 520),
          offsetX: 50,
          offsetY: 0,
          rotation: 0,
        },
        {
          id: 'section-d',
          name: 'D Tribün',
          color: '#96CEB4',
          category: 'ECONOMY' as any,
          basePrice: 300,
          rows: generateRows('A', 'J', 25, 0, 520),
          offsetX: 900,
          offsetY: 0,
          rotation: 0,
        },
      ],
      totalCapacity: 5000,
    },
  },
  {
    id: 'template-classroom',
    name: 'Konferans Salonu',
    description: '100 kişilik sınıf düzeni',
    thumbnail: '/templates/classroom.png',
    type: VenueLayoutType.CLASSROOM,
    style: 'straight' as any,
    capacity: 100,
    layout: {
      id: 'layout-classroom',
      name: 'Konferans Salonu',
      type: VenueLayoutType.CLASSROOM,
      width: 600,
      height: 500,
      stage: {
        type: 'rectangle',
        width: 200,
        height: 60,
        x: 200,
        y: 30,
        label: 'PODYUM',
        color: '#8B4513',
      },
      sections: [
        {
          id: 'section-main',
          name: 'Ana Salon',
          color: '#DDA0DD',
          category: 'STANDARD' as any,
          basePrice: 150,
          rows: generateRows('A', 'J', 10, 0, 120),
          offsetX: 100,
          offsetY: 0,
        },
      ],
      totalCapacity: 100,
    },
  },
  {
    id: 'template-general-admission',
    name: 'Genel Giriş',
    description: 'Koltuksuz ayakta izleme alanı',
    thumbnail: '/templates/general.png',
    type: VenueLayoutType.GENERAL_ADMISSION,
    style: 'straight' as any,
    capacity: 1000,
    layout: {
      id: 'layout-general',
      name: 'Genel Giriş Alanı',
      type: VenueLayoutType.GENERAL_ADMISSION,
      width: 800,
      height: 600,
      stage: {
        type: 'rectangle',
        width: 300,
        height: 80,
        x: 250,
        y: 40,
        label: 'SAHNE',
        color: '#16461C',
      },
      sections: [],
      totalCapacity: 1000,
    },
  },
];

// Yardımcı fonksiyon: Sıra oluşturma
function generateRows(
  startRow: string, 
  endRow: string, 
  seatsPerRow: number, 
  startX: number, 
  startY: number
): any[] {
  const rows: any[] = [];
  const startCharCode = startRow.charCodeAt(0);
  const endCharCode = endRow.charCodeAt(0);
  
  for (let i = startCharCode; i <= endCharCode; i++) {
    const rowLabel = String.fromCharCode(i);
    const rowIndex = i - startCharCode;
    
    const seats = [];
    for (let j = 1; j <= seatsPerRow; j++) {
      seats.push({
        id: `seat-${rowLabel}-${j}`,
        row: rowLabel,
        number: j,
        status: 'AVAILABLE',
        category: 'STANDARD',
        x: startX + (j - 1) * 35,
        y: startY + rowIndex * 40,
        label: `${rowLabel}${j}`,
      });
    }
    
    rows.push({
      id: `row-${rowLabel}`,
      label: rowLabel,
      seats,
      offsetX: 0,
      offsetY: rowIndex * 40,
    });
  }
  
  return rows;
}

function createMockSeatMap(layout: any): SeatMapResponse {
  return {
    eventId: 'template',
    enabled: true,
    stagePosition: 'front' as any,
    layoutStyle: 'straight' as any,
    categories: layout.sections.map((section: any) => ({
      categoryId: section.id,
      categoryName: section.name,
      basePrice: section.basePrice,
      ticketTypeId: 'template',
      rows: section.rows.map((row: any) => ({
        rowId: row.id,
        rowLabel: row.label,
        availableSeats: row.seats.map((s: any) => s.number),
        occupiedSeats: [],
      })),
    })),
  };
}

export default ticketService;
