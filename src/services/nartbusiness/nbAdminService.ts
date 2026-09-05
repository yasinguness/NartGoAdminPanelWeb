/**
 * NartBusiness admin panel API client.
 *
 * Backend routes (Sprint 0-6):
 *   - nb-membership-service: /api/v1/nb/membership/**, /api/v1/nb/packages/**
 *   - nb-verification-service: /api/v1/nb/admin/verification/**
 *   - nb-directory-service: /api/v1/nb/admin/directory/**
 *   - DLQ: /api/v1/nb/admin/dlq/**
 *
 * Gateway routing tüm /api/v1/nb/** path'lerini ilgili servise yönlendirir.
 */
import { api } from '../api';
import type {
  AdminActionRequest,
  AdminImpactPreview,
  ApiEnvelope,
  CommitteeVoteRequest,
  EmbeddingJob,
  EmbeddingJobStatus,
  MatchBatchSummary,
  MembershipTier,
  NbDashboardStats,
  NbDlqEntry,
  NbMember,
  NbMemberStatus,
  NbPeriodView,
  PagedResult,
  Sector,
  JobTitle,
  Testimonial,
  TestimonialUpsert,
  TierConfig,
  TierConfigUpdate,
  TierDocumentPolicy,
  ValueChainBulkImportRequest,
  ValueChainBulkImportResult,
  ValueChainEdge,
  ValueChainEdgeCreate,
  ValueChainEdgeUpdate,
  VerificationCase,
  VerificationCaseStatus,
  VerificationDocumentType,
} from './nbTypes';

/**
 * Manuel üye oluşturma sonucu.
 * - invited=true  → hesabı olmayan e-posta; davet oluşturuldu, davet e-postası gitti.
 * - invited=false → hesap mevcuttu; üye anında oluşturuldu (member dolu).
 */
export interface CreateMemberResult {
  invited: boolean;
  message: string;
  member?: NbMember | null;
  inviteId?: string;
  email?: string;
}

/** İş ilanı (admin moderasyon görünümü). */
export interface NbJobPostingRow {
  id: string;
  ownerMemberId: string;
  ownerDisplayName?: string | null;
  ownerCompanyName?: string | null;
  title: string;
  description?: string | null;
  employmentType?: string | null;
  seniority?: string | null;
  city?: string | null;
  district?: string | null;
  remoteAllowed?: boolean;
  sectorCode?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency?: string | null;
  applyEmail?: string | null;
  applyUrl?: string | null;
  status: 'PUBLISHED' | 'CLOSED' | 'HIDDEN';
  createdAt?: string | null;
  expiresAt?: string | null;
}

export type NbListingStatus = 'ACTIVE' | 'CLOSED' | 'EXPIRED' | 'DELETED';
export type NbListingType = 'REQUEST' | 'OFFER';

export interface NbListingRow {
  id: string;
  ownerMemberId: string;
  ownerDisplayName?: string | null;
  ownerCompanyName?: string | null;
  ownerSpotlight?: boolean;
  type: NbListingType;
  title: string;
  description?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  currency?: string | null;
  city?: string | null;
  district?: string | null;
  sectorCode?: string | null;
  status: NbListingStatus;
  interestCount?: number;
  createdAt?: string | null;
  expiresAt?: string | null;
  /** Herkese açık mı? true → web'de blur yok + paylaşılabilir (public detay). */
  isPublic?: boolean;
  /** Editöryel (NartGo derleme) ilan. */
  curated?: boolean;
}

export interface NbListingAdminStats {
  total: number;
  active: number;
  closed: number;
  expired: number;
  deleted: number;
  requests: number;
  offers: number;
  openedLast7d: number;
}

/** Bekleyen kayıt satırı (admin liste görünümü) — davet veya public başvuru. */
export interface NbPendingInvite {
  id: string;
  email: string;
  /** ADMIN_INVITE (admin daveti) | SELF_APPLY (public web başvurusu). */
  origin?: string | null;
  tier?: string | null;
  companyName?: string | null;
  adminNote?: string | null;
  createdAt?: string | null;
}

function unwrap<T>(body: any): T | null {
  if (!body) return null;
  if (typeof body === 'object' && 'success' in body && 'data' in body) {
    return (body as ApiEnvelope<T>).data ?? null;
  }
  return body as T;
}

// ============================================================
// Dashboard
// ============================================================

async function getDashboardStats(): Promise<NbDashboardStats | null> {
  try {
    const res = await api.get<any>('/nb/admin/dashboard/stats');
    return unwrap<NbDashboardStats>(res.data);
  } catch (err: any) {
    const code = err?.response?.status;
    if (code === 404 || code === 501) return null;
    throw err;
  }
}

/**
 * TYFCB — topluluğun yönlendirmelerle ürettiği kapanan iş değeri (ROI kanıtı).
 * nb-needs-service'ten gelir; endpoint yoksa null (defansif).
 */
async function getReferralImpact(): Promise<import('./nbTypes').ReferralImpact | null> {
  try {
    const res = await api.get<any>('/nb/needs/stats/referral-impact');
    return unwrap<import('./nbTypes').ReferralImpact>(res.data);
  } catch (err: any) {
    const code = err?.response?.status;
    if (code === 404 || code === 501) return null;
    throw err;
  }
}

/**
 * Admin "Modül Aktivitesi" — topluluk modüllerinin kullanım hacmi (aktivasyon ölçümü).
 * nb-community-service'ten gelir; endpoint yoksa null (defansif).
 */
async function getModuleActivity(): Promise<import('./nbTypes').ModuleActivity | null> {
  try {
    const res = await api.get<any>('/nb/community/stats/module-activity');
    return unwrap<import('./nbTypes').ModuleActivity>(res.data);
  } catch (err: any) {
    const code = err?.response?.status;
    if (code === 404 || code === 501) return null;
    throw err;
  }
}

// ============================================================
// Members
// ============================================================

async function listMembers(params: {
  status?: NbMemberStatus;
  tier?: string;
  page?: number;
  size?: number;
}): Promise<PagedResult<NbMember> | null> {
  try {
    const res = await api.get<any>('/nb/admin/members', { params });
    return unwrap<PagedResult<NbMember>>(res.data);
  } catch (err: any) {
    if (err?.response?.status === 404) return null;
    throw err;
  }
}

async function getMember(memberId: string): Promise<NbMember | null> {
  const res = await api.get<any>(`/nb/admin/members/${memberId}`);
  return unwrap<NbMember>(res.data);
}

export interface NbMemberViewStats {
  memberId: string;
  total: number;
  mobile: number;
  web: number;
  unknown: number;
}

/** İşletme (profil) görüntülenme sayıları: toplam + mobil/web (nb-directory). */
async function memberViewStats(memberId: string): Promise<NbMemberViewStats | null> {
  const res = await api.get<any>(`/nb/admin/directory/${memberId}/view-stats`);
  return unwrap<NbMemberViewStats>(res.data);
}

/**
 * Sprint 24 — Admin aksiyon etki önizlemesi. Suspend/cancel öncesi çağrılır;
 * UI hangi aksiyonların geçerli olduğunu (allowedActions) ve hangi kayıtların
 * etkileneceğini bu yanıttan okur.
 */
async function getMemberImpact(memberId: string): Promise<AdminImpactPreview | null> {
  const res = await api.get<any>(`/nb/admin/members/${memberId}/impact`);
  return unwrap<AdminImpactPreview>(res.data);
}

async function suspendMember(
  memberId: string,
  body: AdminActionRequest,
): Promise<NbMember | null> {
  const res = await api.patch<any>(`/nb/admin/members/${memberId}/suspend`, body);
  return unwrap<NbMember>(res.data);
}

async function reactivateMember(
  memberId: string,
  body: AdminActionRequest,
): Promise<NbMember | null> {
  const res = await api.patch<any>(`/nb/admin/members/${memberId}/reactivate`, body);
  return unwrap<NbMember>(res.data);
}

async function cancelMember(
  memberId: string,
  body: AdminActionRequest,
): Promise<NbMember | null> {
  const res = await api.patch<any>(`/nb/admin/members/${memberId}/cancel`, body);
  return unwrap<NbMember>(res.data);
}

// ── Ücretsiz deneme yönetimi (süre üyeye göre admin'ce belirlenebilir) ──

async function grantTrial(memberId: string, days?: number): Promise<NbMember | null> {
  const qs = days && days > 0 ? `?days=${days}` : '';
  const res = await api.patch<any>(`/nb/admin/members/${memberId}/grant-trial${qs}`);
  return unwrap<NbMember>(res.data);
}

async function extendTrial(memberId: string, days = 7): Promise<NbMember | null> {
  const res = await api.patch<any>(`/nb/admin/members/${memberId}/extend-trial?days=${days}`);
  return unwrap<NbMember>(res.data);
}

async function revokeTrial(memberId: string): Promise<NbMember | null> {
  const res = await api.patch<any>(`/nb/admin/members/${memberId}/revoke-trial`);
  return unwrap<NbMember>(res.data);
}

// ── Hazır e-posta template'ini elle yeniden gönderme ──

export type NbResendTemplate = 'RECEIVED' | 'APPROVED' | 'NEEDS_INFO';

/**
 * Hazır NB başvuru e-postasını üyenin güncel (auth'ta düzeltilmiş) adresine —
 * ya da `email` verilirse o adrese — yeniden gönderir. Değişkenler backend'de
 * kayıttan yeniden kurulur. Dönen `to` = gönderim yapılan adres.
 */
async function resendEmail(
  memberId: string,
  template: NbResendTemplate,
  email?: string,
): Promise<{ template: string; to: string }> {
  const res = await api.post<any>(`/nb/admin/members/${memberId}/resend-email`, {
    template,
    email: email?.trim() || undefined,
  });
  return (unwrap<{ template: string; to: string }>(res.data) ?? { template, to: email ?? '' });
}

/**
 * Üyenin NartGo hesabına "şifrenizi belirleyin" e-postası (Keycloak UPDATE_PASSWORD
 * + VERIFY_EMAIL — gerçek, 72 saat geçerli link) gönderir. Onboarding maili kaybolan
 * ya da şifresini hiç belirlememiş üye için. Dönen `to` = gönderim yapılan adres.
 */
async function sendSetPasswordEmail(memberId: string): Promise<{ to: string }> {
  const res = await api.post<any>(
    `/nb/admin/members/${memberId}/send-set-password-email`,
    {},
  );
  return unwrap<{ to: string }>(res.data) ?? { to: '' };
}

/**
 * Havale/EFT ile ödeme yapan üyenin manuel onayı. Sadece
 * APPROVED_PENDING_PAYMENT durumundaki üyelerde geçerli — admin WhatsApp'tan
 * dekontu aldığında bu endpoint'i çağırarak üyeliği aktive eder.
 */
async function confirmBankTransfer(
  memberId: string,
  body: { paymentReference?: string; adminNote?: string },
): Promise<NbMember | null> {
  const res = await api.post<any>(
    `/nb/admin/members/${memberId}/confirm-bank-transfer`,
    body,
  );
  return unwrap<NbMember>(res.data);
}

async function hardDeleteMember(
  memberId: string,
  body: AdminActionRequest,
): Promise<void> {
  await api.delete(`/nb/admin/members/${memberId}`, { data: body });
}

/**
 * Sprint 24 — Üyenin tüm dönemleri (yeni → eski). Detay sayfasında tablo.
 */
async function listMemberPeriods(memberId: string): Promise<NbPeriodView[]> {
  try {
    const res = await api.get<any>(`/nb/admin/members/${memberId}/periods`);
    return unwrap<NbPeriodView[]>(res.data) ?? [];
  } catch (err: any) {
    if (err?.response?.status === 404) return [];
    throw err;
  }
}

/**
 * Sprint 23 — Admin manuel üye oluşturma.
 * Self-service apply akışını atlayarak offline anlaşmalı işletmeler için.
 *
 * Email-davet modeli: girilen e-postanın hesabı yoksa backend Keycloak hesabı
 * AÇMAZ; bekleyen bir NB daveti oluşturup davet e-postası gönderir (invited=true).
 * Kullanıcı aynı e-postayla kaydolup profilini tamamlayınca üyelik otomatik tanımlanır.
 * Hesap zaten varsa eskisi gibi üye anında oluşturulur (invited=false, member dolu).
 */
async function createMemberManually(
  body: import('./nbTypes').AdminCreateMemberRequest,
): Promise<CreateMemberResult> {
  const res = await api.post<any>('/nb/admin/members', body);
  const data = unwrap<CreateMemberResult>(res.data);
  return data ?? { invited: false, message: 'Üye oluşturuldu.' };
}

/** Bekleyen email-davetleri (hesabı henüz olmayan/profil tamamlamamış kişiler). */
async function listPendingInvites(): Promise<NbPendingInvite[]> {
  const res = await api.get<any>('/nb/admin/membership/invites');
  return unwrap<NbPendingInvite[]>(res.data) ?? [];
}

/** Bekleyen daveti tekrar e-postayla gönder. */
async function resendInvite(inviteId: string): Promise<void> {
  await api.post(`/nb/admin/membership/invites/${inviteId}/resend`);
}

/** Bekleyen daveti iptal et (CANCELLED). */
async function cancelInvite(inviteId: string): Promise<void> {
  await api.post(`/nb/admin/membership/invites/${inviteId}/cancel`);
}

// ── İş İlanları moderasyonu ──────────────────────────────────

interface NbJobPage {
  content: NbJobPostingRow[];
  page: number;
  totalPages: number;
  totalElements: number;
}

/** İş ilanları — duruma göre (boş = tümü). */
async function listJobPostings(
  status?: 'PUBLISHED' | 'CLOSED' | 'HIDDEN',
  page = 0,
  size = 25,
): Promise<NbJobPage> {
  const res = await api.get<any>('/nb/needs/jobs/admin', {
    params: { status, page, size },
  });
  const d = unwrap<NbJobPage>(res.data);
  return d ?? { content: [], page: 0, totalPages: 0, totalElements: 0 };
}

/** İlanı gizle (HIDDEN). */
async function hideJobPosting(id: string): Promise<void> {
  await api.post(`/nb/needs/jobs/admin/${id}/hide`);
}

/** Gizlenen ilanı yeniden yayınla (PUBLISHED). */
async function publishJobPosting(id: string): Promise<void> {
  await api.post(`/nb/needs/jobs/admin/${id}/publish`);
}

// ── İlan (Talep/Arz) yönetimi ──────────────────────────────────

interface NbListingPage {
  content: NbListingRow[];
  page: number;
  totalPages: number;
  totalElements: number;
}

/** İlanlar — filtreli, sayfalı (tüm durumlar; boş filtre = tümü). */
async function listListings(params: {
  type?: NbListingType;
  status?: NbListingStatus;
  sectorCode?: string;
  city?: string;
  q?: string;
  page?: number;
  size?: number;
} = {}): Promise<NbListingPage> {
  const res = await api.get<any>('/nb/needs/admin', {
    params: { page: 0, size: 25, ...params },
  });
  const d = unwrap<NbListingPage>(res.data);
  return d ?? { content: [], page: 0, totalPages: 0, totalElements: 0 };
}

/** İlan detayı (durum farketmez). */
async function getListing(id: string): Promise<NbListingRow | null> {
  const res = await api.get<any>(`/nb/needs/admin/${id}`);
  return unwrap<NbListingRow>(res.data);
}

/** Admin düzenleme — gönderilen alanlar güncellenir (null/eksik dokunulmaz). */
async function updateListing(
  id: string,
  body: Partial<{
    title: string;
    description: string | null;
    budgetMin: number | null;
    budgetMax: number | null;
    city: string | null;
    sectorCode: string | null;
  }>,
): Promise<NbListingRow | null> {
  const res = await api.put<any>(`/nb/needs/admin/${id}`, body);
  return unwrap<NbListingRow>(res.data);
}

/** Moderasyon: durum değiştir (ACTIVE=yeniden aç, CLOSED=kapat, DELETED=sil). */
async function setListingStatus(id: string, status: NbListingStatus): Promise<void> {
  await api.post(`/nb/needs/admin/${id}/status`, null, { params: { status } });
}

/** Görünürlük: ilanı herkese aç/kapat. value=true → web'de blur yok + paylaşılabilir. */
async function setListingPublic(id: string, value: boolean): Promise<void> {
  await api.post(`/nb/needs/admin/${id}/public`, null, { params: { value } });
}

/** İlan yönetim özet istatistikleri. */
async function listingStats(): Promise<NbListingAdminStats | null> {
  const res = await api.get<any>('/nb/needs/admin/stats');
  return unwrap<NbListingAdminStats>(res.data);
}

export interface NbListingViewStats {
  listingId: string;
  total: number;
  mobile: number;
  web: number;
  unknown: number;
}

/** Verilen ilanlar için mobil/web/toplam görüntülenme sayıları (toplu). */
async function listingViewStats(ids: string[]): Promise<NbListingViewStats[]> {
  if (!ids.length) return [];
  const res = await api.get<any>('/nb/needs/admin/view-stats', {
    params: { ids: ids.join(',') },
  });
  return unwrap<NbListingViewStats[]>(res.data) ?? [];
}

// ── Yönlendirme (Referral) yönetimi ──────────────────────────────────

export type NbReferralStatus =
  | 'PROPOSED' | 'ACCEPTED' | 'DECLINED' | 'CLOSED_WON' | 'CLOSED_LOST' | 'CANCELLED';

export interface NbReferralRow {
  id: string;
  referrerMemberId: string;
  targetMemberId: string;
  customerName: string;
  customerPhone?: string | null;
  customerContext?: string | null;
  sectorCode?: string | null;
  status: NbReferralStatus;
  proposedAt?: string | null;
  decidedAt?: string | null;
  closedAt?: string | null;
  outcomeNote?: string | null;
  dealValueTry?: number | null;
}

export interface NbReferralAdminStats {
  total: number;
  proposed: number;
  accepted: number;
  declined: number;
  closedWon: number;
  closedLost: number;
  cancelled: number;
  totalDealValueTry: number;
  winRatePct: number;
}

interface NbReferralPage {
  content: NbReferralRow[];
  page: number;
  totalPages: number;
  totalElements: number;
}

async function listReferrals(params: {
  status?: NbReferralStatus;
  q?: string;
  page?: number;
  size?: number;
} = {}): Promise<NbReferralPage> {
  const res = await api.get<any>('/nb/referrals/admin', {
    params: { page: 0, size: 25, ...params },
  });
  const d = unwrap<NbReferralPage>(res.data);
  return d ?? { content: [], page: 0, totalPages: 0, totalElements: 0 };
}

async function getReferral(id: string): Promise<NbReferralRow | null> {
  const res = await api.get<any>(`/nb/referrals/admin/${id}`);
  return unwrap<NbReferralRow>(res.data);
}

/** Admin düzenleme — müşteri/bağlam/sektör/iş değeri/sonuç notu. */
async function updateReferral(
  id: string,
  body: Partial<{
    customerName: string;
    customerPhone: string | null;
    customerContext: string | null;
    sectorCode: string | null;
    dealValueTry: number | null;
    outcomeNote: string | null;
  }>,
): Promise<NbReferralRow | null> {
  const res = await api.put<any>(`/nb/referrals/admin/${id}`, body);
  return unwrap<NbReferralRow>(res.data);
}

/** Moderasyon: durum değiştir (örn. CANCELLED ile iptal). */
async function setReferralStatus(id: string, status: NbReferralStatus): Promise<void> {
  await api.post(`/nb/referrals/admin/${id}/status`, null, { params: { status } });
}

async function referralStats(): Promise<NbReferralAdminStats | null> {
  const res = await api.get<any>('/nb/referrals/admin/stats');
  return unwrap<NbReferralAdminStats>(res.data);
}

// ── Topluluk Soruları (Open-Call) yönetimi ──────────────────────────────────

export type NbQuestionStatus = 'OPEN' | 'ANSWERED' | 'CLOSED' | 'EXPIRED' | 'HIDDEN';

export interface NbQuestionRow {
  id: string;
  askerMemberId?: string | null;
  askerDisplayName?: string | null;
  askerCompanyName?: string | null;
  title: string;
  body?: string | null;
  sectorCode?: string | null;
  city?: string | null;
  anonymous?: boolean;
  status: NbQuestionStatus;
  acceptedAnswerId?: string | null;
  answerCount?: number;
  viewCount?: number;
  expiresAt?: string | null;
  createdAt?: string | null;
}

export interface NbQuestionAdminStats {
  total: number;
  open: number;
  answered: number;
  closed: number;
  expired: number;
  hidden: number;
}

interface NbQuestionPage {
  content: NbQuestionRow[];
  page: number;
  totalPages: number;
  totalElements: number;
}

async function listQuestions(params: {
  status?: NbQuestionStatus;
  q?: string;
  page?: number;
  size?: number;
} = {}): Promise<NbQuestionPage> {
  const res = await api.get<any>('/nb/admin/community/questions', {
    params: { page: 0, size: 25, ...params },
  });
  const d = unwrap<NbQuestionPage>(res.data);
  return d ?? { content: [], page: 0, totalPages: 0, totalElements: 0 };
}

async function getQuestion(id: string): Promise<NbQuestionRow | null> {
  const res = await api.get<any>(`/nb/admin/community/questions/${id}`);
  return unwrap<NbQuestionRow>(res.data);
}

/** Admin düzenleme — başlık/içerik/sektör/şehir. */
async function updateQuestion(
  id: string,
  body: Partial<{
    title: string;
    body: string;
    sectorCode: string | null;
    city: string | null;
  }>,
): Promise<NbQuestionRow | null> {
  const res = await api.put<any>(`/nb/admin/community/questions/${id}`, body);
  return unwrap<NbQuestionRow>(res.data);
}

/** Moderasyon: durum değiştir (OPEN=aç, CLOSED=kapat, HIDDEN=gizle/kaldır). */
async function setQuestionStatus(id: string, status: NbQuestionStatus): Promise<void> {
  await api.post(`/nb/admin/community/questions/${id}/status`, null, { params: { status } });
}

async function questionStats(): Promise<NbQuestionAdminStats | null> {
  const res = await api.get<any>('/nb/admin/community/questions/stats');
  return unwrap<NbQuestionAdminStats>(res.data);
}

/**
 * Mevcut üyenin işletme bilgilerini düzenle (CRUD-Update).
 * Backend NbMember'ı günceller ve directory-service'e override sinyali yayar.
 */
async function updateMemberBusiness(
  memberId: string,
  body: import('./nbTypes').AdminUpdateBusinessRequest,
): Promise<NbMember | null> {
  const res = await api.put<any>(`/nb/admin/members/${memberId}/business`, body);
  return unwrap<NbMember>(res.data);
}

/**
 * Admin panel — directory profilini ve logoyu güncelle.
 * Backend DirectoryProfile'ı günceller.
 */
async function updateDirectoryProfile(
  memberId: string,
  body: import('./nbTypes').AdminUpdateDirectoryProfileRequest,
): Promise<any> {
  const res = await api.put<any>(`/nb/admin/directory/${memberId}/profile`, body);
  return unwrap(res.data);
}

/**
 * Profil fotoğrafı/logo upload için presigned URL al (admin yetkisiyle).
 */
async function getPresignedProfileUpload(
  memberId: string,
  kind: 'avatar' | 'cover' | 'gallery' | 'video',
  contentType: string,
  fileSize: number,
): Promise<{ uploadUrl: string }> {
  const body = { memberId, kind, contentType, fileSize };
  const res = await api.post<any>('/media/nb/presign/profile', body);
  return unwrap(res.data);
}

/**
 * Dosyayı presigned URL'e doğrudan (PUT) yükle
 */
async function uploadFileToPresigned(uploadUrl: string, file: File, contentType: string): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
    },
    body: file,
  });
  if (!res.ok) {
    throw new Error('Upload failed');
  }
}


/**
 * Sprint 23.1 — NartGo kullanıcı autocomplete arama (admin manuel üye dropdown).
 *
 * Backend: GET /api/v1/nb/admin/users/search?q=...&limit=20
 * Admin JWT korumalı; nb-membership-service internal token ile auth-service'e proxy yapar.
 *
 * @param q     prefix arama (min 2 karakter; daha kısa string boş array döner)
 * @param limit max sonuç (default 20, max 50)
 */
export interface NbUserSearchResult {
  /** auth-service iç DB UUID'si — telefon/profil lookup için. NB üyeliği için KULLANMA. */
  userId: string;
  /** Keycloak UUID (JWT sub) — NB sistemi kullanıcıyı bununla tanır; NbMember.userId bu olmalı. */
  keycloakUserId?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  // Sprint 23.1+ — autocomplete kartı zenginleştirmesi
  phone?: string | null;
  createdAt?: string | null;
  /** ACTIVE / SUBMITTED / NEEDS_INFO / APPROVED_PENDING_PAYMENT vs. null. */
  nbMemberStatus?: string | null;
  /** True ise kullanıcı zaten "aktif" bir NB üyeliği içinde — submit bloklanmalı. */
  nbMemberConflict?: boolean;
  // Sprint 24 — NartGo profilinden NB formu pre-fill için
  race?: string | null;
  family?: string | null;
  currentCity?: string | null;
  currentDistrict?: string | null;
  hometownCity?: string | null;
  hometownVillage?: string | null;
  companyName?: string | null;
}

/** auth-service /families/race/{race} yanıtı. */
export interface RaceFamily {
  id: number;
  familyName: string;
  race: string;
}

async function searchUsers(q: string, limit = 20): Promise<NbUserSearchResult[]> {
  if (!q || q.trim().length < 3) return [];
  try {
    const res = await api.get<any>('/nb/admin/users/search', {
      params: { q: q.trim(), limit },
    });
    const data = unwrap<NbUserSearchResult[]>(res.data);
    return data ?? [];
  } catch (err: any) {
    if (err?.response?.status === 404) return [];
    throw err;
  }
}

/**
 * Sprint 24 — Sülale katalogunu seçilen ırka göre döner.
 * Endpoint: GET /api/v1/auth/families/race/{race} (auth-service, gateway-routed).
 * Race değerleri: adige, abhaz, cecen, dagistan, karacay, oset, other.
 *
 * Sülale autocomplete'i için kullanılır — admin manuel üye + verify case
 * detayları gibi NB formlarında ortak.
 */
async function listFamiliesByRace(race: string): Promise<RaceFamily[]> {
  if (!race || !race.trim()) return [];
  try {
    const res = await api.get<any>(`/auth/families/race/${encodeURIComponent(race)}`);
    return unwrap<RaceFamily[]>(res.data) ?? [];
  } catch (err: any) {
    if (err?.response?.status === 404) return [];
    throw err;
  }
}

/**
 * Sprint 24 — Kataloga yeni sülale ekle (admin).
 * Backend conflict check yapar (aynı race + familyName varsa 409). Caller 409'u
 * tolere edip mevcut kaydı seçtirebilir.
 *
 * Endpoint: POST /api/v1/auth/families body {familyName, race}.
 */
async function createFamily(familyName: string, race: string): Promise<RaceFamily | null> {
  const res = await api.post<any>('/auth/families', {
    familyName: familyName.trim(),
    race,
  });
  return unwrap<RaceFamily>(res.data);
}

/**
 * Sprint 23.1+ — Yeni-kullanıcı modunda email blur'da çalışır.
 * Email zaten kayıtlıysa frontend uyarı + tek-tıkla mod değişimi sunar.
 *
 * Yanıt:
 *  - null     : email kayıtlı değil (güvenle yeni-user akışı sürdürülebilir)
 *  - obje     : kullanıcı bulundu (userId, nbMemberStatus, nbMemberConflict, vs.)
 */
async function lookupUserByEmail(email: string): Promise<NbUserSearchResult | null> {
  if (!email || !email.trim()) return null;
  try {
    const res = await api.get<any>('/nb/admin/users/lookup', {
      params: { email: email.trim().toLowerCase() },
    });
    const data = unwrap<NbUserSearchResult | null>(res.data);
    // Boş obje veya kimliği olmayan veri yanlış-pozitif "kayıtlı" mesajına
    // neden oluyordu — userId yoksa null kabul et.
    if (!data || !data.userId) return null;
    return data;
  } catch (err: any) {
    if (err?.response?.status === 404) return null;
    throw err;
  }
}

/**
 * Sprint 24 — userId ile NartGo kullanıcısı detayı (NB detay sayfası).
 * Aynı NbUserSearchResult şekli — NB üyelik durumu da iliştirilmiş.
 */
async function getUserById(userId: string): Promise<NbUserSearchResult | null> {
  if (!userId || !userId.trim()) return null;
  try {
    const res = await api.get<any>(`/nb/admin/users/${userId}`);
    const data = unwrap<NbUserSearchResult | null>(res.data);
    if (!data || !data.userId) return null;
    return data;
  } catch (err: any) {
    if (err?.response?.status === 404) return null;
    throw err;
  }
}

// ============================================================
// Verification Queue
// ============================================================

async function listVerificationQueue(
  page = 0,
  size = 25,
  status?: VerificationCaseStatus,
): Promise<PagedResult<VerificationCase> | null> {
  try {
    const params: Record<string, string | number> = { page, size };
    if (status) params.status = status;
    const res = await api.get<any>('/nb/admin/verification/queue', { params });
    return unwrap<PagedResult<VerificationCase>>(res.data) ?? null;
  } catch (err: any) {
    if (err?.response?.status === 404) return null;
    throw err;
  }
}

async function getVerificationCase(caseId: string): Promise<VerificationCase | null> {
  const res = await api.get<any>(`/nb/admin/verification/cases/${caseId}`);
  return unwrap<VerificationCase>(res.data);
}

/** Sprint 23 — Case'in tarihçesi (admin denetim görünümü). */
async function getCaseTimeline(
  caseId: string,
): Promise<import('./nbTypes').CaseTimelineEntry[]> {
  const res = await api.get<any>(`/nb/admin/verification/cases/${caseId}/timeline`);
  return unwrap<import('./nbTypes').CaseTimelineEntry[]>(res.data) ?? [];
}

async function submitCommitteeVote(caseId: string, body: CommitteeVoteRequest): Promise<void> {
  await api.post(`/nb/admin/verification/cases/${caseId}/votes`, body);
}

async function decideVerification(
  caseId: string,
  status: VerificationCaseStatus,
  note?: string
): Promise<VerificationCase | null> {
  const res = await api.post<any>(`/nb/admin/verification/cases/${caseId}/decide`, null, {
    params: { status, note },
  });
  return unwrap<VerificationCase>(res.data);
}

async function listTierDocPolicies(): Promise<TierDocumentPolicy[]> {
  const res = await api.get<any>('/nb/admin/verification/tier-doc-policies');
  return unwrap<TierDocumentPolicy[]>(res.data) ?? [];
}

async function updateTierDocPolicy(
  tier: MembershipTier,
  requiredDocTypes: VerificationDocumentType[],
): Promise<TierDocumentPolicy | null> {
  const res = await api.put<any>(`/nb/admin/verification/tier-doc-policies/${tier}`, {
    requiredDocTypes,
  });
  return unwrap<TierDocumentPolicy>(res.data);
}

// ============================================================
// Tiers (Sprint 26 — dynamic tier management)
// ============================================================

async function listTiers(): Promise<TierConfig[]> {
  const res = await api.get<any>('/nb/admin/membership/tiers');
  return unwrap<TierConfig[]>(res.data) ?? [];
}

async function upsertTier(id: string, body: TierConfigUpdate): Promise<TierConfig | null> {
  const res = await api.put<any>(`/nb/admin/membership/tiers/${id}`, body);
  return unwrap<TierConfig>(res.data);
}

// ============================================================
// Sectors
// ============================================================

async function listSectors(): Promise<Sector[]> {
  const res = await api.get<any>('/nb/admin/directory/sectors');
  return unwrap<Sector[]>(res.data) ?? [];
}

async function upsertSector(body: Sector): Promise<Sector | null> {
  const res = await api.put<any>('/nb/admin/directory/sectors', body);
  return unwrap<Sector>(res.data);
}

// ============================================================
// Job Titles (ünvan/pozisyon kataloğu — profesyonel üyelik)
// ============================================================

async function listJobTitles(): Promise<JobTitle[]> {
  const res = await api.get<any>('/nb/admin/directory/job-titles');
  return unwrap<JobTitle[]>(res.data) ?? [];
}

async function upsertJobTitle(body: JobTitle): Promise<JobTitle | null> {
  const res = await api.put<any>('/nb/admin/directory/job-titles', body);
  return unwrap<JobTitle>(res.data);
}

async function deleteJobTitle(id: string): Promise<void> {
  await api.delete(`/nb/admin/directory/job-titles/${id}`);
}

// ============================================================
// Testimonials (referanslar — küratörlü üye sözleri)
// ============================================================

async function listTestimonials(): Promise<Testimonial[]> {
  const res = await api.get<any>('/nb/admin/membership/testimonials');
  return unwrap<Testimonial[]>(res.data) ?? [];
}

async function createTestimonial(body: TestimonialUpsert): Promise<Testimonial | null> {
  const res = await api.post<any>('/nb/admin/membership/testimonials', body);
  return unwrap<Testimonial>(res.data);
}

async function updateTestimonial(id: string, body: TestimonialUpsert): Promise<Testimonial | null> {
  const res = await api.put<any>(`/nb/admin/membership/testimonials/${id}`, body);
  return unwrap<Testimonial>(res.data);
}

async function deleteTestimonial(id: string): Promise<void> {
  await api.delete(`/nb/admin/membership/testimonials/${id}`);
}

// ============================================================
// Value Chain (Sprint 9 — Matching #1)
// ============================================================

async function listValueChain(): Promise<ValueChainEdge[]> {
  const res = await api.get<any>('/nb/admin/directory/value-chain');
  return unwrap<ValueChainEdge[]>(res.data) ?? [];
}

async function createValueChain(body: ValueChainEdgeCreate): Promise<ValueChainEdge | null> {
  const res = await api.post<any>('/nb/admin/directory/value-chain', body);
  return unwrap<ValueChainEdge>(res.data);
}

async function updateValueChain(id: string, body: ValueChainEdgeUpdate): Promise<ValueChainEdge | null> {
  const res = await api.put<any>(`/nb/admin/directory/value-chain/${id}`, body);
  return unwrap<ValueChainEdge>(res.data);
}

async function deleteValueChain(id: string): Promise<void> {
  await api.delete(`/nb/admin/directory/value-chain/${id}`);
}

async function bulkImportValueChain(
  body: ValueChainBulkImportRequest,
): Promise<ValueChainBulkImportResult | null> {
  const res = await api.post<any>('/nb/admin/directory/value-chain/bulk-import', body);
  return unwrap<ValueChainBulkImportResult>(res.data);
}

// ============================================================
// Matching batch + Embedding jobs (Sprint 10)
// ============================================================

async function triggerMatchingBatch(): Promise<MatchBatchSummary | null> {
  const res = await api.post<any>('/nb/admin/directory/matching/batch/trigger');
  return unwrap<MatchBatchSummary>(res.data);
}

async function listEmbeddingJobs(
  status: EmbeddingJobStatus = 'FAILED',
  page = 0,
  size = 50,
): Promise<EmbeddingJob[]> {
  const res = await api.get<any>('/nb/admin/directory/embedding/jobs', {
    params: { status, page, size },
  });
  return unwrap<EmbeddingJob[]>(res.data) ?? [];
}

async function retryEmbeddingJob(id: string): Promise<EmbeddingJob | null> {
  const res = await api.post<any>(`/nb/admin/directory/embedding/jobs/${id}/retry`);
  return unwrap<EmbeddingJob>(res.data);
}

// ============================================================
// DLQ (per-service)
// ============================================================

async function listDlqEntries(service: string, page = 0, size = 50): Promise<NbDlqEntry[]> {
  try {
    const res = await api.get<any>(`/nb/admin/dlq/${service}`, { params: { page, size } });
    return unwrap<NbDlqEntry[]>(res.data) ?? [];
  } catch (err: any) {
    if (err?.response?.status === 404) return [];
    throw err;
  }
}

async function replayDlqEntry(service: string, eventDbId: string): Promise<NbDlqEntry | null> {
  const res = await api.post<any>(`/nb/admin/dlq/${service}/${eventDbId}/replay`);
  return unwrap<NbDlqEntry>(res.data);
}

// ── Admin İletişim & Tanıştırma (docs/plan/nb-admin-iletisim-tanistir.md) ────

/** Üyeye tekil push bildirimi (in-app kaydı + FCM; NB tercih kapısı uygulanır). */
async function sendPush(
  memberId: string,
  body: { title: string; message: string },
): Promise<void> {
  await api.post(`/nb/admin/members/${memberId}/push`, body);
}

export type NbIntroductionStatus =
  | 'INTRODUCED'
  | 'MEETING_PENDING'
  | 'MET'
  | 'CLOSED_SUCCESS'
  | 'CLOSED_NO_RESULT';

export const NB_INTRODUCTION_STATUS_LABEL: Record<NbIntroductionStatus, string> = {
  INTRODUCED: 'Tanıştırıldı',
  MEETING_PENDING: 'Görüşme bekliyor',
  MET: 'Görüştüler',
  CLOSED_SUCCESS: 'Sonuç: iş birliği',
  CLOSED_NO_RESULT: 'Sonuçsuz kapandı',
};

export interface NbIntroduction {
  id: string;
  memberAId: string;
  memberAName: string;
  memberBId: string;
  memberBName: string;
  reason: string;
  status: NbIntroductionStatus;
  adminNote?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** İki üyeyi tanıştır — iki tarafa push + e-posta gider, kayıt döner. */
async function createIntroduction(body: {
  memberAId: string;
  memberBId: string;
  reason: string;
}): Promise<NbIntroduction> {
  const res = await api.post<any>('/nb/admin/introductions', body);
  return unwrap<NbIntroduction>(res.data) as NbIntroduction;
}

async function listIntroductions(params: {
  memberId?: string;
  page?: number;
  size?: number;
}): Promise<{ items: NbIntroduction[]; totalElements: number; totalPages: number; page: number }> {
  const res = await api.get<any>('/nb/admin/introductions', { params });
  return (
    unwrap<{ items: NbIntroduction[]; totalElements: number; totalPages: number; page: number }>(
      res.data,
    ) ?? { items: [], totalElements: 0, totalPages: 0, page: 0 }
  );
}

/** Tanıştırma takip kaydını güncelle (durum ve/veya not). */
async function updateIntroduction(
  introId: string,
  body: { status?: NbIntroductionStatus; adminNote?: string },
): Promise<NbIntroduction> {
  const res = await api.patch<any>(`/nb/admin/introductions/${introId}`, body);
  return unwrap<NbIntroduction>(res.data) as NbIntroduction;
}

export const nbAdminService = {
  // Dashboard
  getDashboardStats,
  getReferralImpact,
  getModuleActivity,
  // Tiers
  listTiers,
  upsertTier,
  // Members
  listMembers,
  getMember,
  memberViewStats,
  createMemberManually,
  listPendingInvites,
  resendInvite,
  cancelInvite,
  listJobPostings,
  hideJobPosting,
  publishJobPosting,
  listListings,
  getListing,
  updateListing,
  setListingStatus,
  setListingPublic,
  listingStats,
  listingViewStats,
  listReferrals,
  getReferral,
  updateReferral,
  setReferralStatus,
  referralStats,
  listQuestions,
  getQuestion,
  updateQuestion,
  setQuestionStatus,
  questionStats,
  updateMemberBusiness,
  updateDirectoryProfile,
  getPresignedProfileUpload,
  uploadFileToPresigned,
  searchUsers,
  lookupUserByEmail,
  getUserById,
  listFamiliesByRace,
  createFamily,
  getMemberImpact,
  suspendMember,
  reactivateMember,
  cancelMember,
  confirmBankTransfer,
  hardDeleteMember,
  listMemberPeriods,
  resendEmail,
  sendSetPasswordEmail,
  // İletişim & Tanıştırma
  sendPush,
  createIntroduction,
  listIntroductions,
  updateIntroduction,
  // Deneme
  grantTrial,
  extendTrial,
  revokeTrial,
  // Verification
  listVerificationQueue,
  getVerificationCase,
  getCaseTimeline,
  submitCommitteeVote,
  decideVerification,
  listTierDocPolicies,
  updateTierDocPolicy,
  // Sectors
  listSectors,
  upsertSector,
  // Job Titles
  listJobTitles,
  upsertJobTitle,
  deleteJobTitle,
  // Testimonials (referanslar)
  listTestimonials,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
  // Value Chain
  listValueChain,
  createValueChain,
  updateValueChain,
  deleteValueChain,
  bulkImportValueChain,
  // Matching + Embedding (Sprint 10)
  triggerMatchingBatch,
  listEmbeddingJobs,
  retryEmbeddingJob,
  // DLQ
  listDlqEntries,
  replayDlqEntry,
};
