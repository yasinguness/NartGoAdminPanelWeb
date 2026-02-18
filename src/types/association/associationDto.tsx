import { BankAccountDto } from '../bankAccount/bankAccountDto';
import { BusinessSocialMediaDto } from '../socialMedia/businessSocialMediaDto';
import { BusinessStatus } from '../enums/businessStatus';
import { AssociationStatsDto } from './associationStatsDto';
import { AddressDTO } from '../businesses/addressModel';
import { WorkingHoursDto } from '../workingHours/workingHoursDto';

export interface AssociationDto {
  // Base fields
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

  // Association specific fields
  associationCode?: string;
  taxNumber?: string;
  foundationDate?: Date;
  federationId?: string;
  federationName?: string;
  membershipFee?: number;
  membershipDurationMonths?: number;
  hasSubscriptionSystem: boolean;
  activeMemberCount: number;
  totalMemberCount: number;

  // Additional fields
  categoryId?: string;
  subCategoryId?: string;
  galleryImages?: string[];
  socialMedia?: BusinessSocialMediaDto[];
  workingHours?: WorkingHoursDto[];
  stats?: AssociationStatsDto;
  address?: AddressDTO;
  bankAccountInfo?: BankAccountDto;
}
