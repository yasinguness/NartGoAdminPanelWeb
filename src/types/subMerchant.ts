export type SubMerchantOwnerType = 'ASSOCIATION' | 'BUSINESS' | 'INDIVIDUAL';
export type SubMerchantStatus = 'ACTIVE' | 'DISABLED';
export type IyzicoSubMerchantType =
  | 'PERSONAL'
  | 'PRIVATE_COMPANY'
  | 'LIMITED_OR_JOINT_STOCK_COMPANY';

export interface SubMerchantListParams {
  page?: number;
  size?: number;
  search?: string;
  ownerType?: SubMerchantOwnerType | '';
  ownerId?: string;
  status?: SubMerchantStatus | '';
}

export interface SubMerchantSummary {
  id: string;
  ownerType: SubMerchantOwnerType;
  ownerId: string;
  name: string;
  email?: string;
  contactPhone?: string;
  status: SubMerchantStatus;
  iyzicoSubMerchantKey?: string;
  iyzicoSubMerchantSyncedAt?: string;
  createdAt?: string;
}

export interface SubMerchantCreateRequest {
  ownerType: SubMerchantOwnerType;
  ownerId: string;
  name: string;
  email: string;
  contactPhone: string;
  status: SubMerchantStatus;
  iyzicoSubMerchantType: IyzicoSubMerchantType;
  iban: string;
  address: string;
  contactName?: string;
  contactSurname?: string;
  identityNumber?: string;
  taxNumber?: string;
  taxOffice?: string;
  legalCompanyTitle?: string;
}

export interface SubMerchantDetail extends SubMerchantCreateRequest {
  id: string;
  iyzicoSubMerchantKey?: string;
  iyzicoSubMerchantExternalId?: string;
  iyzicoSubMerchantSyncedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SubMerchantStatusUpdateRequest {
  status: SubMerchantStatus;
}

export interface SubMerchantIyzicoDetail {
  subMerchantId: string;
  iyzicoSubMerchantKey?: string;
  iyzicoSubMerchantExternalId?: string;
  iyzicoSubMerchantType?: IyzicoSubMerchantType;
  status?: string;
  syncedAt?: string;
  rawResponse?: unknown;
}

export interface SubMerchantAuditLog {
  id: string;
  action: string;
  actorId?: string;
  actorName?: string;
  details?: string;
  createdAt: string;
}

export interface OwnerValidationResult {
  ownerType: SubMerchantOwnerType;
  ownerId: string;
  displayName: string;
  subtitle?: string;
  email?: string;
  contactPhone?: string;
}
