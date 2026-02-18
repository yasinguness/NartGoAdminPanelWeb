import { AddressDTO } from '../businesses/addressModel';
import { BusinessSocialMediaCreateRequest } from '../socialMedia/businessSocialMediaCreateRequest';
import { WorkingHoursCreateRequest } from '../workingHours/workingHoursCreateRequest';

export interface AssociationCreateRequest {
  // Required fields
  name: string;
  ownerId: string;
  
  // Optional fields
  shortDescription?: string;
  description?: string;
  taxNumber?: string;
  address?: AddressDTO;
  federationId?: string;
  membershipFee?: number;
  membershipDurationMonths?: number;
  galleryImages?: string[];
  logoUrl?: string;
  profileImageUrl?: string;
  coverImageUrl?: string;
  website?: string;
  email?: string;
  phoneNumber?: string;
  whatsappNumber?: string;
  hasSubscriptionSystem?: boolean;
  socialMedia?: BusinessSocialMediaCreateRequest[];
  workingHours?: WorkingHoursCreateRequest[];
}
