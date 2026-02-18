import { BusinessStatus } from "../enums/businessStatus";

export interface FederationUpdateRequest {
  name?: string;
  description?: string;
  taxNumber?: string;
  logoUrl?: string;
  website?: string;
  email?: string;
  phoneNumber?: string;
  status?: BusinessStatus;
}
