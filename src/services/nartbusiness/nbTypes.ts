// NartBusiness admin panel için DTO tipleri
// Sprint 7 — backend response şekilleriyle eşleşmeli.

export type MembershipTier = 'KURUCU' | 'STANDART' | 'GENC_GIRISIMCI' | 'PATRON';

// Sprint 23 — Komite-onaylı-sonra-öde akışı:
//   SUBMITTED → NEEDS_INFO → SUBMITTED → APPROVED_PENDING_PAYMENT → ACTIVE
//                                                                 → APPROVED_EXPIRED
//   SUBMITTED → REJECTED (komite reddi veya 3. NEEDS_INFO)
export type NbMemberStatus =
  | 'SUBMITTED'
  | 'NEEDS_INFO'
  | 'REJECTED'
  | 'APPROVED_PENDING_PAYMENT'
  | 'APPROVED_EXPIRED'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'SUSPENDED'
  | 'CANCELLED'
  /** @deprecated Sprint 22.5 ve öncesi. */
  | 'PENDING_VERIFICATION';

export type NbRace =
  | 'adige'
  | 'abhaz'
  | 'cecen'
  | 'karacay'
  | 'dagistan'
  | 'oset'
  | 'other';

/**
 * Sprint 23 — Admin manuel üye oluşturma payload'ı.
 * Backend: POST /api/v1/nb/admin/members
 *
 * Sprint 23.1 — userId veya email'den en az biri zorunlu:
 *  - userId verilmişse direkt kullanılır
 *  - email verilmişse backend auth-service'te lookup yapar
 *  - email yok + createIfMissing=true → Keycloak'ta yeni user yaratılır (firstName + lastName zorunlu)
 */
export interface AdminCreateMemberRequest {
  userId?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  createIfMissing?: boolean;
  requestedTier: MembershipTier;
  companyName: string;
  sectorCode: string;
  city: string;
  race: NbRace;
  clanName: string;
  hometownDetail?: string;
  linkedinUrl?: string;
  websiteUrl?: string;
  instagramUrl?: string;
  /** Sadece ACTIVE veya APPROVED_PENDING_PAYMENT desteklenir. */
  targetStatus: 'ACTIVE' | 'APPROVED_PENDING_PAYMENT';
  grantFreeMembership?: boolean;
  verifiedBusiness?: boolean;
  adminNote: string;
}

export interface NbMember {
  memberId: string;
  userId: string;
  tier: MembershipTier;
  status: NbMemberStatus;
  joinedAt: string;
  currentPeriodId?: string;
  verificationCaseId?: string;

  // Sprint 23 — Hafif KYC
  companyName?: string;
  sectorCode?: string;
  city?: string;
  race?: NbRace;
  clanName?: string;
  hometownDetail?: string;
  linkedinUrl?: string;
  websiteUrl?: string;
  instagramUrl?: string;
  nartgoTenureMonths?: number | null;

  // Sprint 23 — Komite döngüsü
  needsInfoCount?: number;

  // Sprint 23 — 7-gün ödeme penceresi
  approvedAt?: string;
  approvalExpiresAt?: string;

  // Sprint 23 — "Doğrulanmış İşletme" rozeti
  verifiedBusiness?: boolean;
  verifiedAt?: string;
}

export type VerificationCaseStatus =
  | 'SUBMITTED'
  | 'IN_REVIEW'
  | 'NEEDS_INFO'
  | 'APPROVED'
  | 'REJECTED';

export type VerificationDocumentType =
  | 'VERGI_LEVHASI'
  | 'TICARET_SICIL'
  | 'IMZA_SIRKULERI'
  | 'KIMLIK'
  | 'KULTUREL_BEYAN';

export interface VerificationDocument {
  id: string;
  caseId: string;
  type: VerificationDocumentType;
  mediaUrl: string;
  uploadedAt: string;
}

export type CaseTimelineEntryType =
  | 'SUBMITTED'
  | 'VOTE'
  | 'NEEDS_INFO'
  | 'APPROVED'
  | 'REJECTED'
  | 'USER_RESPONSE';

export interface CaseTimelineEntry {
  at: string;
  type: CaseTimelineEntryType;
  actorUserId?: string;
  description: string;
  detail?: string;
}

export interface VerificationCase {
  caseId: string;
  memberId: string;
  userId: string;
  tier?: MembershipTier;
  status: VerificationCaseStatus;
  submittedAt: string;
  decidedAt?: string;
  decisionNote?: string;
  needsInfoCount?: number;

  // Sprint 23 — Hafif KYC denormalize (event payload'undan)
  companyName?: string;
  sectorCode?: string;
  city?: string;
  race?: NbRace;
  clanName?: string;
  hometownDetail?: string;
  linkedinUrl?: string;
  websiteUrl?: string;
  instagramUrl?: string;
  nartgoTenureMonths?: number | null;

  documents: VerificationDocument[];
}

export interface Sector {
  code: string;
  parentCode?: string;
  nameTr: string;
  nameEn?: string;
  description?: string;
  sortOrder: number;
  active: boolean;
}

// Sprint 9 — sektör değer-zinciri (Matching #1)
export type ChainDirection = 'SUPPLIES_TO' | 'BUYS_FROM' | 'COLLABORATES';

export interface ValueChainEdge {
  id: string;
  sourceSector: string;
  targetSector: string;
  direction: ChainDirection;
  weight: number;     // 0.0 - 1.0
  notes?: string;
  active: boolean;
  updatedAt: string;
}

export interface ValueChainEdgeCreate {
  sourceSector: string;
  targetSector: string;
  direction: ChainDirection;
  weight: number;
  notes?: string;
  alsoReverse?: boolean;
}

export interface ValueChainBulkImportRequest {
  edges: ValueChainEdgeCreate[];
  upsert: boolean;
}

export interface ValueChainBulkImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export interface ValueChainEdgeUpdate {
  weight?: number;
  notes?: string;
  active?: boolean;
}

// Sprint 10
export type EmbeddingJobStatus = 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED';

export interface EmbeddingJob {
  id: string;
  memberId: string;
  status: EmbeddingJobStatus;
  attempts: number;
  lastError?: string;
  enqueuedAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface MatchBatchSummary {
  anchorsProcessed: number;
  suggestionsEmitted: number;
  elapsedMs: number;
}

export interface NbDashboardStats {
  totalMembers: number;
  activeMembers: number;
  pendingVerification: number;
  paymentPending: number;
  membersByTier: Record<MembershipTier, number>;
  recentApplicationsLast7Days: number;
}

export type CommitteeVoteType = 'APPROVE' | 'REJECT' | 'NEEDS_INFO';

export interface CommitteeVoteRequest {
  vote: CommitteeVoteType;
  note?: string;
}

export interface NbDlqEntry {
  id: string;
  eventId: string;
  topic: string;
  eventType: string;
  aggregateId: string;
  retryCount: number;
  lastError?: string;
  createdAt: string;
  deadLetteredAt: string;
}

export interface PagedResult<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp?: string;
}
