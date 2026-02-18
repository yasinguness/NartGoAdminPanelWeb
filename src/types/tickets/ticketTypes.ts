// Bilet Türü Durumları
export enum TicketTypeStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  SOLD_OUT = 'SOLD_OUT',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

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
