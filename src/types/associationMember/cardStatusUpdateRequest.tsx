import { CardStatus } from './cardStatus';

export interface CardStatusUpdateRequest {
  status: CardStatus;
  reason?: string;
  expiryDate?: string;
} 