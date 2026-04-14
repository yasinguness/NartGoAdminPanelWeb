import { api } from '../api';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
  statusCode: number;
  statusMessage: string;
}

export interface SeatTemplateRow {
  name: string;
  seatCount: number;
}

export interface SeatTemplateCategory {
  name: string;
  rows: string[];
  color: string;
}

export interface SeatTemplateParseResult {
  rows: SeatTemplateRow[];
  totalSeats: number;
  confidence: number;
}

export interface SeatTemplate {
  id: string;
  name: string;
  description: string;
  totalSeats: number;
  thumbnailUrl: string | null;
  organizerId: string | null;
  createdBy: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  layout: {
    rows: SeatTemplateRow[];
    categories: SeatTemplateCategory[];
  } | null;
}

export interface ApplyTemplateRequest {
  templateId: string;
  categoryTicketTypeMapping: Record<string, string>;
}

export interface ApplyTemplateResult {
  created: number;
  eventId: string;
  templateId: string;
  templateName: string;
}

export const seatTemplateService = {
  /**
   * PDF veya PNG dosyasını parse et — sadece preview.
   */
  parseFile: async (file: File): Promise<ApiResponse<SeatTemplateParseResult>> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<ApiResponse<SeatTemplateParseResult>>(
      '/tickets/admin/seat-templates/parse',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },

  /**
   * Yeni şablon kaydet.
   */
  saveTemplate: async (data: {
    name: string;
    rows: SeatTemplateRow[];
    categories?: SeatTemplateCategory[];
    organizerId?: string;
    stagePosition?: 'top' | 'bottom';
  }) => {
    const response = await api.post<ApiResponse<{ id: string; name: string; totalSeats: number; createdAt: string }>>(
      '/tickets/admin/seat-templates',
      data
    );
    return response.data;
  },

  /**
   * Tüm şablonları listele.
   */
  listTemplates: async (): Promise<ApiResponse<SeatTemplate[]>> => {
    const response = await api.get<ApiResponse<SeatTemplate[]>>('/tickets/admin/seat-templates');
    return response.data;
  },

  /**
   * Şablonu etkinliğe uygula.
   */
  applyTemplate: async (eventId: string, data: ApplyTemplateRequest): Promise<ApiResponse<ApplyTemplateResult>> => {
    const response = await api.post<ApiResponse<ApplyTemplateResult>>(
      `/tickets/admin/seat-templates/apply/${eventId}`,
      data
    );
    return response.data;
  },

  /**
   * Şablon sil.
   */
  deleteTemplate: async (templateId: string) => {
    const response = await api.delete<ApiResponse<void>>(`/tickets/admin/seat-templates/${templateId}`);
    return response.data;
  },
};
