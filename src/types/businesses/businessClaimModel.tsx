export type BusinessClaimStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';

export type BusinessClaimDecision = 'APPROVE' | 'REJECT';

export interface BusinessClaimResponse {
  claimId: string;
  businessId: string;
  businessName: string;
  requesterUserId: string;
  requesterEmail: string;
  status: BusinessClaimStatus;
  verificationMethod?: string;
  verificationNotes?: string;
  rejectionReason?: string;
  reviewedByUserId?: string;
  reviewedByEmail?: string;
  reviewedAt?: string;
  createdAt: string;
  pointsAwarded?: number;
  badgesAwarded?: string[];
}

export interface BusinessClaimReviewRequest {
  decision: BusinessClaimDecision;
  verificationMethod?: string;
  verificationNotes?: string;
  rejectionReason?: string;
}
