/**
 * Bilet Yönetim Tipleri — Admin Panel
 * Backend DTO'larıyla uyumlu (TicketResponse, CompactTicketResponse, OrderResponse)
 */
import { TicketStatus, OrderStatus } from './ticketTypes';

// ─── Bilet Listesi (Backend: CompactTicketResponse) ─────────
export interface TicketListItem {
  id: string;
  orderId: string;
  ticketTypeName: string;
  status: TicketStatus;
  serialNo?: string;
  issuedAt?: string;
  qrCodeData?: string;
  qrCodeImage?: string;
  canBeCheckedIn: boolean;
  canBeRefunded: boolean;
  isCheckedIn: boolean;
  userEmail: string;
  userName?: string;
  userPhone?: string;
  eventId: string;
  eventName: string;
  eventImageUrl?: string;
  eventStartDate?: string;
  eventEndDate?: string;
  eventLocation?: string;
  eventAddress?: string;
  eventPrice?: number;
  eventCurrency?: string;
  organizerId?: string;
  organizerName?: string;
  seatInfo?: SeatInfo;
}

// ─── Bilet Detay (Backend: TicketResponse) ──────────────────
export interface TicketDetailResponse {
  id: string;
  orderId: string;
  ticketTypeId: string;
  ticketTypeName: string;
  eventId: string;
  userEmail: string;
  status: TicketStatus;
  serialNo?: string;
  issuedAt?: string;
  createdAt?: string;
  qrCodeUrl?: string;
  qrCodeData?: string;
  qrCodeImage?: string;
  canBeCheckedIn: boolean;
  canBeRefunded: boolean;
  isCheckedIn: boolean;
  seatInfo?: SeatInfo;
  // Event info
  eventName: string;
  eventDescription?: string;
  eventAddress?: { city?: string; district?: string; fullAddress?: string };
  eventStartDate?: string;
  eventEndDate?: string;
  eventImageUrl?: string;
  eventTicketPrice?: number;
  eventCurrency?: string;
  eventOrganizerId?: string;
  eventOrganizerFirstName?: string;
  eventOrganizerLastName?: string;
  eventStatus?: string;
  eventMaxParticipants?: number;
  eventCurrentParticipants?: number;
}

// ─── Koltuk Bilgisi ─────────────────────────────────────────
export interface SeatInfo {
  sectionName?: string;
  rowLabel?: string;
  seatNumber?: number;
  categoryName?: string;
}

// ─── Sipariş Detay (Backend: OrderResponse) ─────────────────
export interface OrderDetailResponse {
  id: string;
  eventId: string;
  reservationId?: string;
  status: OrderStatus;
  totalAmount: number;
  currency: string;
  iyzicoPaymentId?: string;
  createdAt?: string;
  paidAt?: string;
  items: OrderItemResponse[];
  tickets: OrderTicketResponse[];
}

export interface OrderItemResponse {
  ticketTypeId: string;
  unitPrice: number;
  quantity: number;
  discountApplied?: number;
  finalPrice?: number;
  totalPrice: number;
}

export interface OrderTicketResponse {
  id: string;
  ticketTypeId: string;
  status?: string;
  serialNo?: string;
  issuedAt?: string;
}

// ─── Filtre ─────────────────────────────────────────────────
export interface TicketFilters {
  eventId?: string;
  status?: TicketStatus | '';
  search?: string; // ad, email, bilet kodu
  page: number;
  size: number;
}

// ─── Toplu İşlem ────────────────────────────────────────────
export type BulkAction = 'cancel' | 'refund' | 'resend_qr';

export interface BulkActionRequest {
  ticketIds: string[];
  action: BulkAction;
  reason?: string;
}

// ─── Transfer (Doküman Bölüm 5.4) ──────────────────────────

export interface TicketTransferRecord {
  id: string;
  ticketId: string;
  fromEmail: string;
  fromName?: string;
  toEmail: string;
  toName?: string;
  transferredAt: string;
  status: 'COMPLETED' | 'PENDING' | 'REJECTED';
}

export interface TicketTransferConfig {
  isTransferable: boolean;
  maxTransferCount: number;        // Organizatör belirler (genellikle 1)
  transferDeadlineHours: number;   // Etkinlikten kaç saat önce kapanır (varsayılan 24)
  requiresApproval: boolean;       // Admin onayı gerekli mi
  currentTransferCount: number;    // Bu bilet kaç kez transfer edildi
}
