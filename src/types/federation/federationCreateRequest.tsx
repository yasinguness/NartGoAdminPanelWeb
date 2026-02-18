import { AddressDTO } from "../businesses/addressModel";
import { BusinessSocialMediaCreateRequest } from "../socialMedia/businessSocialMediaCreateRequest";

export interface FederationCreateRequest {
  name: string;
  shortName?: string;
  shortDescription?: string;
  description?: string;
  foundationDate?: Date;
  taxNumber?: string;
  logoUrl?: string;
  profileImageUrl?: string;
  coverImageUrl?: string;
  website?: string;
  email?: string;
  phoneNumber?: string;
  whatsappNumber?: string;
  membershipCardDesignUrl?: string;
  hasMembershipCardVerification?: boolean;
  address?: AddressDTO;
  socialMedia?: BusinessSocialMediaCreateRequest[];
  ownerId: string;
}
