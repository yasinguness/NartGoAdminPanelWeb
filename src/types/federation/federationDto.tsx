import { BankAccountDto } from '../bankAccount/bankAccountDto';
import { AddressDTO } from '../businesses/addressModel';
import { BusinessStatus } from '../enums/businessStatus';
import { FederationStatsDto } from './federationStatsDto';

export interface FederationDto {
  // BaseBusinessEntity fields
  id: string;
  name: string;
  description?: string;
  shortDescription?: string;
  profileImageUrl?: string;
  coverImageUrl?: string;
  logoUrl?: string;
  phoneNumber?: string;
  whatsappNumber?: string;
  email?: string;
  website?: string;
  ownerId: string;
  verified: boolean;
  priority?: number;
  acceptedPaymentMethods?: string[];
  hasOnlinePayment: boolean;
  createdAt: Date;
  updatedAt: Date;
  version?: number;
  status: BusinessStatus;
  openNow: boolean;
  nextOpeningTime?: string;

  address?: AddressDTO;
  
  // Federation specific fields
  federationCode?: string;
  taxNumber?: string;
  foundationDate?: Date;
  membershipCardDesignUrl?: string;
  hasMembershipCardVerification: boolean;
  
  // Related entities
  stats?: FederationStatsDto;
  bankAccountInfo?: BankAccountDto;
  associationIds?: string[];
  businessAgreementIds?: string[];

  // Statistics
  activeAssociationCount?: number;
  totalAssociationCount?: number;
  activeAgreementCount?: number;
  totalAgreementCount?: number;
}
