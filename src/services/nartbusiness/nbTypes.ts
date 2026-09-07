// NartBusiness admin panel için DTO tipleri
// Sprint 7 — backend response şekilleriyle eşleşmeli.

export type MembershipTier = 'KURUCU' | 'STANDART' | 'GENC_GIRISIMCI' | 'PROFESYONEL' | 'PATRON';

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
  | 'TRIAL'
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
 * Google Places'tan gelen yapılandırılmış şirket adresi.
 * Tüm alanlar opsiyonel — formattedAddress (`description`) ve placeId en kritik olanlar.
 */
export interface CompanyAddressRequest {
  city?: string;
  district?: string;
  country?: string;
  postalCode?: string;
  /** Google Places `formatted_address` (en fazla 500 karakter). */
  description?: string;
  latitude?: number;
  longitude?: number;
  placeId?: string;
}

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
  /** Ülke kodu — `+90` gibi. Mevcut user lookup'unda profil telefonu boşsa doldurulur. */
  phoneCode?: string;
  /** GSM numarası — sadece rakam, ülke kodu hariç (10-15 hane). */
  gsmNo?: string;
  createIfMissing?: boolean;
  /**
   * APPROVED_PENDING_PAYMENT ile oluştururken ödeme penceresi (gün, 1-365).
   * Boş → 7. Uzun tanıtım dönemlerinde mutlaka doldur; aksi hâlde üye 7 gün
   * sonra sessizce "onay süresi doldu"ya düşer.
   */
  paymentWindowDays?: number;
  requestedTier: MembershipTier;
  /** Üye tipi: BUSINESS (varsayılan) | PROFESSIONAL (kurumda karar verici). */
  memberType?: 'BUSINESS' | 'PROFESSIONAL';
  companyName: string;
  /** PROFESSIONAL: ünvan/pozisyon. */
  personJobTitle?: string;
  /** PROFESSIONAL: uzmanlık alanları. */
  expertise?: string;
  sectorCodes: string[];
  city: string;
  /** Google Places'tan gelen yapılandırılmış adres — opsiyonel ama önerilir. */
  companyAddress?: CompanyAddressRequest;
  /** Opsiyonel işletme tanıtım metni (max 300 karakter). */
  businessDescription?: string;
  race?: NbRace;
  clanName?: string;
  hometownDetail?: string;
  linkedinUrl?: string;
  websiteUrl?: string;
  instagramUrl?: string;
  /** TRIAL için trialDurationDays zorunludur. */
  targetStatus: 'ACTIVE' | 'APPROVED_PENDING_PAYMENT' | 'TRIAL';
  trialDurationDays?: number;
  grantFreeMembership?: boolean;
  verifiedBusiness?: boolean;
  adminNote: string;
}

/**
 * Admin panel — mevcut üyenin işletme bilgilerini düzenleme payload'ı.
 * Backend: PUT /api/v1/nb/admin/members/{memberId}/business
 *
 * Lifecycle alanları (tier/status/period/ödeme) buraya dahil değil — onlar
 * suspend/cancel/reactivate gibi ayrı aksiyon endpoint'lerinde.
 */
export interface AdminUpdateBusinessRequest {
  companyName: string;
  sectorCodes: string[];
  city: string;
  companyAddress?: CompanyAddressRequest;
  businessDescription?: string;
  race?: NbRace;
  clanName?: string;
  hometownDetail?: string;
  linkedinUrl?: string;
  websiteUrl?: string;
  instagramUrl?: string;
  /** "Doğrulanmış İşletme" rozeti — admin elle açıp kapatabilir. */
  verifiedBusiness?: boolean;
  /** Audit trail — zorunlu. */
  adminNote: string;
}

/**
 * Admin panel — directory profil alanlarını ve logoyu güncelleme payload'ı.
 * Backend: PUT /api/v1/nb/admin/directory/{memberId}/profile
 */
export interface AdminUpdateDirectoryProfileRequest {
  adminNote: string;
  logoUrl?: string;
  displayName?: string;
  personRole?: string;
  expertise?: string;
  companyName?: string;
  sectorCodes?: string[];
  sectorCode?: string;
  subSectorCode?: string;
  companySize?: 'MICRO' | 'SMALL' | 'MEDIUM' | 'LARGE' | 'ENTERPRISE';
  foundedYear?: number;
  address?: CompanyAddressRequest;
  websiteUrl?: string;
  summary?: string;
  isPublic?: boolean;
  race?: NbRace;
  clanName?: string;
  hometownDetail?: string;
  linkedinUrl?: string;
  instagramUrl?: string;
  phoneNumber?: string;
  whatsappEnabled?: boolean;
  phoneVisibility?: 'NOBODY' | 'VERIFIED_MEMBERS' | 'MESSAGE_SENDERS' | 'EVERYONE';
  offerings?: any[];
  seeking?: any[];
  facebookUrl?: string;
  twitterUrl?: string;
  tiktokUrl?: string;
  youtubeUrl?: string;
  companyType?: 'SOLE_PROPRIETOR' | 'LLC' | 'JSC' | 'COOPERATIVE' | 'OTHER';
  brands?: string[];
  serviceCategories?: string[];
  workingHours?: Record<string, any>;
  photoUrls?: string[];
  promoVideoUrl?: string;
  promoVideoDurationSeconds?: number;
  // verifiedBusiness bilerek yok: rozetin doğruluk kaynağı üyelik servisi,
  // dizin profili oradan periyodik olarak hizalanıyor.
}

export interface NbMember {
  memberId: string;
  userId: string;
  tier: MembershipTier;
  /** Üye tipi: BUSINESS (işletme) | PROFESSIONAL (kurumda karar verici). */
  memberType?: 'BUSINESS' | 'PROFESSIONAL';
  status: NbMemberStatus;
  joinedAt: string;
  currentPeriodId?: string;
  verificationCaseId?: string;

  // Profesyonel
  personJobTitle?: string;
  expertise?: string;

  // Ücretsiz deneme
  trialEndsAt?: string;
  trialUsed?: boolean;

  // Sprint 23 — Hafif KYC
  companyName?: string;
  sectorCodes?: string[];
  sectorCode?: string;
  city?: string;
  district?: string;
  country?: string;
  postalCode?: string;
  companyFormattedAddress?: string;
  businessDescription?: string;
  race?: NbRace;
  clanName?: string;
  hometownDetail?: string;
  linkedinUrl?: string;
  websiteUrl?: string;
  instagramUrl?: string;
  displayName?: string;
  personRole?: string;
  companySize?: 'MICRO' | 'SMALL' | 'MEDIUM' | 'LARGE' | 'ENTERPRISE';
  foundedYear?: number;
  phoneNumber?: string;
  whatsappEnabled?: boolean;
  phoneVisibility?: 'NOBODY' | 'VERIFIED_MEMBERS' | 'MESSAGE_SENDERS' | 'EVERYONE';
  facebookUrl?: string;
  twitterUrl?: string;
  tiktokUrl?: string;
  youtubeUrl?: string;
  companyType?: 'SOLE_PROPRIETOR' | 'LLC' | 'JSC' | 'COOPERATIVE' | 'OTHER';
  nartgoTenureMonths?: number | null;

  // Sprint 23 — Komite döngüsü
  needsInfoCount?: number;

  // Sprint 23 — 7-gün ödeme penceresi
  approvedAt?: string;
  approvalExpiresAt?: string;

  // Sprint 23 — "Doğrulanmış İşletme" rozeti
  verifiedBusiness?: boolean;
  verifiedAt?: string;
  
  // Directory Profile Alanları
  logoUrl?: string;

  // Sprint 27 — Apply form'da seçilen ödeme yöntemi (Kart vs Havale)
  paymentMethod?: 'IYZICO' | 'BANK_TRANSFER';
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
  actorDisplayName?: string;
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
  sectorCodes?: string[];
  sectorCode?: string;
  city?: string;
  district?: string;
  country?: string;
  race?: NbRace;
  clanName?: string;
  hometownDetail?: string;
  linkedinUrl?: string;
  websiteUrl?: string;
  instagramUrl?: string;
  nartgoTenureMonths?: number | null;

  documents: VerificationDocument[];
}

// Sprint 26 — admin'den yönetilen dinamik üyelik tier konfigürasyonu
/** Tier'a bağlı yetkiler — admin düzenler, üye UI'ında gösterilir. */
export interface NbEntitlements {
  directoryBoost: boolean;
  weeklySpotlight: boolean;
  goldBadge: boolean;
  searchPriority: boolean;
  mediaSlots: number;
  matchPriority: boolean;
  profileAnalytics: boolean;
  conciergeSupport: boolean;
  teamSeats: number;
  jobPostingEnabled: boolean;
  rfqEarlyAccess: boolean;
}

export interface TierConfig {
  id: string;
  code: string;
  displayName: string;
  priceAmount: number;
  currency: string;
  pricePeriod: string;
  shortDescription?: string;
  features: string[];
  sortOrder: number;
  active: boolean;
  entitlements?: NbEntitlements;
}

export interface TierConfigUpdate {
  displayName: string;
  priceAmount: number;
  currency: string;
  pricePeriod: string;
  shortDescription?: string;
  features: string[];
  sortOrder: number;
  active: boolean;
  entitlements?: NbEntitlements;
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

// Profesyonel üye ünvan/pozisyon kataloğu (admin'den yönetilir — sektörler gibi).
export interface JobTitle {
  id?: string; // null/undefined = yeni kayıt
  label: string;
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

/**
 * TYFCB — topluluğun yönlendirmelerle ürettiği kapanan iş değeri.
 * Backend: GET /api/v1/nb/needs/stats/referral-impact
 */
export interface ReferralImpact {
  totalDealValueTry: number;
  wonCount: number;
  dealValueTryLast12Months: number;
  wonCountLast12Months: number;
}

/**
 * Admin "Modül Aktivitesi" — topluluk modüllerinin kullanım hacmi.
 * Backend: GET /api/v1/nb/community/stats/module-activity
 */
export interface ModuleActivity {
  mentorshipTotal: number;
  mentorshipMatched: number;
  mentorshipLast30: number;
  ventureTotal: number;
  ventureFormed: number;
  ventureLast30: number;
  questionTotal: number;
  questionLast30: number;
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

export type MembershipPeriodStatus =
  | 'PAYMENT_PENDING'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'REFUNDED'
  | 'CANCELLED';

export interface NbPeriodView {
  id: string;
  memberId: string;
  tier: MembershipTier;
  startsAt: string;
  endsAt: string;
  fee: number;
  currency: string;
  paymentId?: string | null;
  status: MembershipPeriodStatus;
  createdAt: string;
}

// Sprint 24 — admin lifecycle aksiyonları
export type AdminMemberAction = 'SUSPEND' | 'REACTIVATE' | 'CANCEL';

/** PATCH suspend/reactivate/cancel payload — kategori + min-30-char gerekçe. */
export interface AdminActionRequest {
  category: string;
  note: string;
}

/**
 * GET /members/{memberId}/impact yanıtı — UI aksiyon butonlarını disable/enable
 * eder ve kullanıcıya "şu kayıtlar etkilenecek" uyarısı verir.
 */
export interface AdminImpactPreview {
  memberId: string;
  status: NbMemberStatus;
  tier: MembershipTier;
  activePeriods: number;
  paymentPendingPeriods: number;
  verifiedBusiness: boolean;
  currentPeriodId?: string | null;
  allowedActions: AdminMemberAction[];
}

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

export interface TierDocumentPolicy {
  tier: MembershipTier;
  requiredDocTypes: VerificationDocumentType[];
  updatedAt?: string;
  updatedByUserId?: string;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp?: string;
}

// ── Referanslar (küratörlü üye sözleri) ──

export interface Testimonial {
  id: string;
  authorName: string;
  authorCompany?: string;
  authorTitle?: string;
  quote: string;
  avatarUrl?: string;
  approved: boolean;
  sortOrder: number;
}

export interface TestimonialUpsert {
  authorName: string;
  authorCompany?: string;
  authorTitle?: string;
  quote: string;
  avatarUrl?: string;
  memberId?: string;
  approved: boolean;
  sortOrder: number;
}
