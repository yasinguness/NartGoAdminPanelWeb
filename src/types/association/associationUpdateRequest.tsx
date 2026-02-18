import { BusinessStatus } from '../enums/businessStatus';

export interface AssociationUpdateRequest {
  name?: string;
  description?: string;
  federationId?: string;
  taxNumber?: string;
  membershipFee?: number;
  membershipDurationMonths?: number;
  logoUrl?: string;
  website?: string;
  email?: string;
  phoneNumber?: string;
  status?: BusinessStatus;
}
