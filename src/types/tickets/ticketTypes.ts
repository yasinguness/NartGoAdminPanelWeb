// Bilet Türü Durumları (Backend: TicketTypeStatus)
export enum TicketTypeStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED',
}

// Bilet Durumları (Backend: TicketStatus)
export enum TicketStatus {
  CREATED = 'CREATED',
  RESERVED = 'RESERVED',
  ACTIVE = 'ACTIVE',
  USED = 'USED',
  CHECKED_IN = 'CHECKED_IN',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

// Sipariş Durumları (Backend: OrderStatus)
export enum OrderStatus {
  PENDING = 'PENDING',
  CHECKOUT_CREATED = 'CHECKOUT_CREATED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAID = 'PAID',
  COMPLETED = 'COMPLETED',
  REFUNDED = 'REFUNDED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

// Bilet Kategorisi (Doküman: Bilet Türleri)
export enum TicketCategory {
  STANDARD = 'STANDARD',
  VIP = 'VIP',
  EARLY_BIRD = 'EARLY_BIRD',
  STUDENT = 'STUDENT',
  GROUP = 'GROUP',
  FREE = 'FREE',
  DONATION = 'DONATION',
}

// Etkinlik Formatı
export enum EventFormat {
  PHYSICAL = 'PHYSICAL',
  ONLINE = 'ONLINE',
  HYBRID = 'HYBRID',
}

// İade Politikası Zaman Dilimi
export interface RefundPolicyTier {
  minDaysBefore: number;
  maxDaysBefore: number | null; // null = sınırsız
  refundPercentage: number;
  requiresManualApproval: boolean;
}

// İade Politikası
export interface RefundPolicy {
  isRefundable: boolean;
  tiers: RefundPolicyTier[];
  platformFeeRefundable: boolean; // Komisyon iade edilir mi
  notes?: string;
}

// Varsayılan İade Politikası (Doküman Bölüm 7.1)
export const DEFAULT_REFUND_POLICY: RefundPolicy = {
  isRefundable: true,
  platformFeeRefundable: false,
  tiers: [
    { minDaysBefore: 7, maxDaysBefore: null, refundPercentage: 100, requiresManualApproval: false },
    { minDaysBefore: 3, maxDaysBefore: 7, refundPercentage: 75, requiresManualApproval: false },
    { minDaysBefore: 1, maxDaysBefore: 3, refundPercentage: 50, requiresManualApproval: true },
    { minDaysBefore: 0, maxDaysBefore: 1, refundPercentage: 0, requiresManualApproval: false },
  ],
};

// Mekan Düzeni Türleri
// Mekan Düzeni Türleri
export enum VenueLayoutType {
  THEATER = 'theater',
  STADIUM = 'stadium',
  CONCERT = 'concert',
  CLASSROOM = 'classroom',
  GENERAL_ADMISSION = 'general_admission',
  CONCERT_HALL = 'concert_hall',
  CONFERENCE_CENTER = 'conference_center',
}

// Sahne Düzeni Stilleri (Backend: layoutStyle)
export enum LayoutStyle {
  STRAIGHT = 'straight',
  CURVED = 'curved',
  U_SHAPE = 'uShape',
  AMPHITHEATER = 'amphitheater',
}

// Sahne Konumu (Backend: stagePosition)
export enum StagePosition {
  FRONT = 'front',
  BACK = 'back',
  NONE = 'none',
}

// Koltuk Durumları
export enum SeatStatus {
  AVAILABLE = 'available',
  OCCUPIED = 'occupied',
  RESERVED = 'reserved',
  BLOCKED = 'blocked',
  SOLD = 'sold',
}

// Koltuk Kategorileri
export enum SeatCategory {
  VIP = 'VIP',
  PREMIUM = 'PREMIUM',
  STANDARD = 'STANDARD',
  ECONOMY = 'ECONOMY',
  WHEELCHAIR = 'WHEELCHAIR',
}

// Tek Koltuk
export interface Seat {
  id: string;
  row: string;
  number: number;
  status: SeatStatus;
  category: SeatCategory;
  price?: number;
  x: number; // Görsel konumlandırma için
  y: number;
  rotation?: number;
  label?: string;
}

// Koltuk Sırası (Backend: SeatRowResponse)
export interface SeatRowResponse {
  rowId: string;
  rowLabel: string;
  availableSeats: number[];
  occupiedSeats: number[];
}

// Koltuk Kategorisi (Backend: SeatCategoryResponse)
export interface SeatCategoryResponse {
  categoryId: string;
  categoryName: string;
  basePrice: number;
  ticketTypeId: string;
  rows: SeatRowResponse[];
}

// Koltuk Haritası Response (Backend: SeatMapResponse)
export interface SeatMapResponse {
  eventId: string;
  enabled: boolean;
  layoutMeta?: Record<string, any>;
  mapping?: Record<string, string>;
  stagePosition: StagePosition;
  layoutStyle: LayoutStyle;
  corridorType?: 'center' | 'sides' | 'none';
  categoryIdToColor?: Record<string, string>;
  revision?: number;
  rowLabelOrder?: string[];
  rowLabelToCategoryId?: Record<string, string>;
  categories: SeatCategoryResponse[];
}

// Rezervasyon Request/Response
export interface ReserveSeatsRequest {
  seatIds: string[]; // categoryId_rowLabel_seatNumber formatında
  ttlMinutes?: number;
}

export interface ReserveSeatsResponse {
  reservationId: string;
}

// Bilet Türü Response
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
  seatMap?: SeatMapResponse;
  createdAt: string;
  updatedAt: string;
}

// Bilet Türü Oluşturma Request
export interface CreateTicketTypeRequest {
  eventId: string;
  name: string;
  description?: string;
  basePrice: number;
  currency?: string;
  capacityTotal: number;
  saleStartAt: string;
  saleEndAt: string;
  seatMap?: SeatMapResponse;
}

// Fiyat Bölgesi
export interface PricingZone {
  id: string;
  name: string;
  category: SeatCategory;
  basePrice: number;
  color: string;
  seatCount: number;
}

// Satış Dönemi
export interface SalesPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  discountPercentage?: number;
  maxTickets?: number;
}

// Bilet Oluşturma Wizard State
export interface TicketCreationState {
  step: number;
  eventId: string;
  ticketName: string;
  description: string;
  layoutStyle: LayoutStyle;
  venueLayoutType?: VenueLayoutType;
  venueLayout?: VenueLayout;
  seatMap: SeatMapResponse | null;
  pricingZones: PricingZone[];
  salesPeriods: SalesPeriod[];
  saleStartAt: Date | null;
  saleEndAt: Date | null;
  currency: string;
}

// Koltuk Bölümü
export interface SeatSection {
  id: string;
  name: string;
  offsetX: number;
  offsetY: number;
  rotation?: number;
  color: string;
  category: SeatCategory;
  basePrice: number;
  rows: Array<{
    id: string;
    label: string;
    seats: Array<{
      id: string;
      number: number;
      status: SeatStatus;
      category: SeatCategory;
    }>;
  }>;
}

// Mekan Düzeni Detayı (Frontend State İçin)
export interface VenueLayout {
  width: number;
  height: number;
  totalCapacity: number;
  type: VenueLayoutType;
  stage?: {
    x: number;
    y: number;
    width: number;
    height: number;
    type: 'rectangle' | 'circle' | 'semicircle';
    color?: string;
    label?: string;
  };
  sections: SeatSection[];
}

// Hazır Şablon
export interface VenueTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  type: VenueLayoutType;
  style: LayoutStyle;
  layout: VenueLayout;
  seatMap: SeatMapResponse;
  capacity: number;
}

// ─── Bilet Yönetim Tipleri ────────────────────────────────

// Bilet Response (Backend: TicketEntity)
export interface TicketResponse {
  id: string;
  orderId: string;
  ticketTypeId: string;
  eventId: string;
  userId?: string;
  userEmail: string;
  status: TicketStatus;
  ticketCode: string;
  serialNo?: string;
  sequenceNumber?: number;
  qrCode?: string;
  qrCodeData?: string;
  pricePaid: number;
  currency: string;
  checkInTime?: string;
  cancelledAt?: string;
  refundedAt?: string;
  issuedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Sipariş Item
export interface OrderItem {
  ticketTypeId: string;
  ticketTypeName?: string;
  seatId?: string;
  quantity: number;
  unitPrice: number;
}

// Sipariş Response (Backend: OrderEntity)
export interface OrderResponse {
  id: string;
  userId: string;
  userEmail: string;
  orderReference: string;
  eventId: string;
  reservationId?: string;
  status: OrderStatus;
  items: OrderItem[];
  totalAmount: number;
  currency: string;
  couponCode?: string;
  pointsUsed?: number;
  paymentMethod?: string;
  paymentReference?: string;
  idempotencyKey: string;
  paidAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Genişletilmiş Bilet Türü Oluşturma (Doküman: Bilet Türleri)
export interface CreateTicketTypeExtended extends CreateTicketTypeRequest {
  category: TicketCategory;
  originalPrice?: number; // İndirimli fiyat varsa orijinal fiyat
  minPerOrder: number;
  maxPerOrder: number;
  isTransferable: boolean;
  isRefundable: boolean;
  maxTransferCount: number;
  refundPolicy?: RefundPolicy;
  requiresVerification?: boolean; // Öğrenci belgesi vb.
}

// Etkinlik Oluşturma İsteği (Genişletilmiş)
export interface CreateEventRequest {
  name: string;
  description: string;
  categoryId: string;
  organizerId: string;
  eventFormat: EventFormat;
  startAt: string;
  endAt: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  capacity: number;
  isSeated: boolean;
  seatMapId?: string;
  ageLimit?: number;
  language?: string;
  tags?: string[];
  isPaid: boolean;
  ticketTypes: CreateTicketTypeExtended[];
  refundPolicy: RefundPolicy;
  visibility: 'public' | 'link' | 'draft';
  image?: File;
}
