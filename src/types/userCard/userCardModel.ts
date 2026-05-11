/// Mirror of backend UserCardDto (business-service).
export interface UserCardDto {
  id?: string;
  userEmail: string;
  cardNumber: string;
  qrToken: string;
  displayName?: string;
  profileImageUrl?: string;
  mobileVisible: boolean;
  createdAt?: string;
}

/// Backend wraps lists in PageResponseDto (NOT raw Spring `Page`).
/// Field set is identical to Spring Page so existing list UIs that already
/// read .content / .totalElements / .number / .size / .totalPages keep
/// working unchanged.
export interface PageResponseDto<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
  empty: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
}
