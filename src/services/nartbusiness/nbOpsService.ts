/**
 * NartBusiness değer operasyonu — Deneme Merkezi, üye notları/görevleri,
 * sonuç kartı, haftalık ihale kısa listesi ve panel ayarları.
 *
 * Backend: nb-membership-service `/nb/admin/*` (AdminTrialCenterController,
 * AdminMemberNotesController, AdminSettingsController, AdminTenderController
 * `/shortlist`).
 */
import { api } from '../api';

function unwrap<T>(data: unknown): T {
  const env = data as { data?: T };
  return (env && typeof env === 'object' && 'data' in env ? env.data : data) as T;
}

// ── Sonuç kartı ──────────────────────────────────────────────────────────

/** null = ilgili servise ulaşılamadı ("bilinmiyor"), 0 değil. */
export interface NbValueSummary {
  memberId: string;
  tendersReferred: number;
  tendersViewed: number;
  tendersInterested: number;
  tendersBid: number;
  tendersWon: number;
  introductions: number;
  introductionsMet: number;
  introductionsSucceeded: number;
  requestsOpened: number | null;
  offersOpened: number | null;
  quotesReceived: number | null;
  quotesGiven: number | null;
  interestsGiven: number | null;
  profileViewsRecent: number | null;
  profileViewsTotal: number | null;
  tenderValue: boolean | null;
  introValue: boolean | null;
  requestValue: boolean | null;
  visibilityValue: boolean | null;
  valueSignals: number;
}

// ── Notlar / görevler / segment ──────────────────────────────────────────

export type NbNoteKind = 'NOTE' | 'CALL' | 'MEETING' | 'TASK';
export type NbSuccessSegment = 'VALUE_SEEN' | 'ENGAGED_NO_RESULT' | 'SILENT';

export const NB_NOTE_KIND_LABEL: Record<NbNoteKind, string> = {
  NOTE: 'Not',
  CALL: 'Telefon',
  MEETING: 'Görüşme',
  TASK: 'Görev',
};

export const NB_SEGMENT_LABEL: Record<NbSuccessSegment, string> = {
  VALUE_SEEN: 'Sonuç alan',
  ENGAGED_NO_RESULT: 'Aktif, sonuç bekleyen',
  SILENT: 'Pasif',
};

/** Segmentin deneme sonundaki karşılığı (analiz, 7 Ekim). */
export const NB_SEGMENT_PLAY: Record<NbSuccessSegment, string> = {
  VALUE_SEEN: 'Faaliyet özetiyle birlikte üyelik teklifi',
  ENGAGED_NO_RESULT: 'Değerlendirme görüşmesi sonrası 30 gün uzatma',
  SILENT: 'Telefonla iletişim; yanıt alınamazsa bülten listesinde tutulur',
};

export interface NbNote {
  id: string;
  memberId: string;
  memberName?: string | null;
  kind: NbNoteKind;
  body: string;
  dueAt?: string | null;
  doneAt?: string | null;
  outcome?: string | null;
  auto: boolean;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NbNotePatch {
  body?: string;
  done?: boolean;
  outcome?: string;
  dueAt?: string;
  clearDue?: boolean;
}

// ── Deneme Merkezi ───────────────────────────────────────────────────────

export interface NbTrialRow {
  memberId: string;
  companyName?: string | null;
  city?: string | null;
  tier?: string | null;
  status: string;
  phone?: string | null;
  trialEndsAt?: string | null;
  daysLeft?: number | null;
  lastActiveAt?: string | null;
  /** null = son-aktiflik verisi alınamadı. */
  neverOpened?: boolean | null;
  value?: NbValueSummary | null;
  segment?: NbSuccessSegment | null;
  segmentSetBy?: 'AUTO' | 'ADMIN' | null;
  suggestedSegment?: NbSuccessSegment | null;
  nextTask?: { id: string; body: string; dueAt?: string | null; auto: boolean } | null;
  openTasks: number;
  lastNote?: { kind: NbNoteKind; body: string; createdAt: string } | null;
}

export interface NbTrialCenter {
  rows: NbTrialRow[];
  activityDataAvailable: boolean;
}

// ── Kısa liste ───────────────────────────────────────────────────────────

export interface NbShortlistItem {
  tenderId: string;
  title: string;
  authority?: string | null;
  province?: string | null;
  tenderType?: string | null;
  deadline?: string | null;
  sourceUrl?: string | null;
  score: number;
  reasons: string[];
}

export interface NbMemberShortlist {
  memberId: string;
  companyName?: string | null;
  city?: string | null;
  status: string;
  phone?: string | null;
  locked: boolean;
  sentThisWeek: number;
  weeklyLimit: number;
  remaining: number;
  items: NbShortlistItem[];
}

// ── Ayarlar ──────────────────────────────────────────────────────────────

export interface NbTenderMatchingSettings {
  threshold: number;
  maxMatchesPerTender: number;
  weeklyReferralLimit: number;
  shortlistSize: number;
}

export interface NbTrialPlaybookSettings {
  enabled: boolean;
  resultCardDaysBefore: number;
  callDaysBefore: number;
  introFollowUpDays: number;
  offerWindowDays: number;
  followUpStopDaysAfter: number;
  resultCardEmail: boolean;
  offerEmail: boolean;
}

export interface NbDigestSettings {
  enabled: boolean;
  dayOfWeek: number;
  tenders: number;
  members: number;
  listings: number;
}

export interface NbConversionTargets {
  valueDeliveredMembers: number;
  weeklyActiveMembers: number;
  referralOpenRatePct: number;
  referralFeedbackRatePct: number;
  meetings: number;
  paidConversions: number;
  valueGateDate: string;
  paymentGateDate: string;
  rhythmGateDate: string;
}

export interface NbSettings {
  'tender.matching': NbTenderMatchingSettings;
  'trial.playbook': NbTrialPlaybookSettings;
  digest: NbDigestSettings;
  'conversion.targets': NbConversionTargets;
}

export type NbSettingsGroup = keyof NbSettings;

// ── Üye fırsatları (nb-needs) ────────────────────────────────────────────

export interface NbSuggestedListing {
  listingId: string;
  type: 'REQUEST' | 'OFFER';
  title: string;
  ownerCompanyName?: string | null;
  city?: string | null;
  sectorCode?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  score: number;
  matchedOn: string[];
}

export interface NbOwnListing {
  listingId: string;
  type: 'REQUEST' | 'OFFER';
  title: string;
  sectorCode?: string | null;
  city?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  quotes: number;
  interests: number;
  referralsSent: number;
}

export interface NbCustomerReferral {
  id: string;
  direction: 'GIVEN' | 'RECEIVED';
  otherMemberId: string;
  customerName: string;
  sectorCode?: string | null;
  status?: string | null;
  dealValueTry?: number | null;
  createdAt: string;
}

export interface NbMemberOpportunities {
  suggested: NbSuggestedListing[];
  /** false = puanlama servisine ulaşılamadı; liste eksik. */
  suggestionsAvailable: boolean;
  own: NbOwnListing[];
  customerReferrals: NbCustomerReferral[];
}

/** Üyeye giden ihale yönlendirmesi (geçmiş). */
export interface NbMemberTenderReferral {
  id: string;
  tenderId: string;
  tenderTitle?: string | null;
  status: string;
  channel: string;
  createdAt: string;
  viewedAt?: string | null;
}

// ── Abonelik ─────────────────────────────────────────────────────────────

export type NbBillingInterval = 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUAL' | 'YEARLY';
export type NbSubscriptionStatus = 'PENDING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'EXPIRED';

export const NB_SUBSCRIPTION_STATUS_LABEL: Record<NbSubscriptionStatus, string> = {
  PENDING: 'Ödeme tamamlanmadı',
  ACTIVE: 'Aktif',
  PAST_DUE: 'Ödeme tahsil edilemedi',
  CANCELED: 'İptal edildi',
  EXPIRED: 'Sona erdi',
};

export const NB_INTERVAL_LABEL: Record<NbBillingInterval, string> = { MONTHLY: 'Aylık (eski)', QUARTERLY: '3 ay', SEMIANNUAL: '6 ay', YEARLY: '12 ay' };

export interface NbTermPurchase { id: string; memberId: string; memberName: string; durationMonths: number; fee: number; currency: string; status: string; startsAt: string; endsAt: string }

export interface NbBillingPlan {
  oneTime: boolean;
  durationMonths: number;
  id: string;
  tierId: string;
  tierName: string;
  interval: NbBillingInterval;
  name: string;
  price: number;
  currency: string;
  promo: boolean;
  active: boolean;
  synced: boolean;
  syncedAt?: string | null;
  retiredAt?: string | null;
  liveSubscribers: number;
  savingsLabel?: string | null;
}

export interface NbSubscription {
  id: string;
  memberId: string;
  memberName?: string | null;
  status: NbSubscriptionStatus;
  planId: string;
  planName?: string | null;
  tierId?: string | null;
  interval?: NbBillingInterval | null;
  price?: number | null;
  currency: string;
  promo: boolean;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd: boolean;
  graceUntil?: string | null;
  failedAt?: string | null;
  startedAt?: string | null;
  canceledAt?: string | null;
  createdAt: string;
  iyzicoSubscriptionRef?: string | null;
}

export interface NbSubscriptionSummary {
  active: number;
  pastDue: number;
  canceledThisMonth: number;
  monthlyRecurringRevenue: number;
  page: { content: NbSubscription[]; totalPages: number; totalElements: number };
}

// ── Haftalık özet ────────────────────────────────────────────────────────

export interface NbDigestListing {
  listingId: string;
  type: string;
  title: string;
  ownerCompanyName?: string | null;
  city?: string | null;
}

export interface NbDigest {
  memberId: string;
  companyName?: string | null;
  city?: string | null;
  status: string;
  phone?: string | null;
  tenders: NbShortlistItem[];
  listings: NbDigestListing[];
  listingsAvailable: boolean;
  weekStart: string;
  emailSent: boolean;
  whatsappSent: boolean;
}

export interface NbDigestWeek {
  weekStart: string;
  enabled: boolean;
  dayOfWeek: number;
  members: NbDigest[];
}

// ── Dönüşüm panosu ───────────────────────────────────────────────────────

export interface NbBoardMetric {
  key: string;
  label: string;
  /** null = ölçülemedi (ör. son-aktiflik servisi yanıt vermedi). */
  value: number | null;
  denominator: number | null;
  target: number;
  unit: 'COUNT' | 'PERCENT';
  hint: string;
}

export interface NbBoardCohort {
  weekStart: string;
  members: number;
  ended: number;
  paid: number;
}

export interface NbBoardGate {
  key: string;
  date: string;
  question: string;
  status: 'PASSED' | 'FAILED' | 'PENDING' | 'MANUAL';
  detail: string;
}

export interface NbConversionBoard {
  metrics: NbBoardMetric[];
  cohorts: NbBoardCohort[];
  gates: NbBoardGate[];
  activityDataAvailable: boolean;
}

export const nbOpsService = {
  // Deneme Merkezi + sonuç kartı
  async trialCenter(): Promise<NbTrialCenter> {
    return unwrap<NbTrialCenter>((await api.get('/nb/admin/trial-center')).data);
  },
  async valueSummary(memberId: string): Promise<NbValueSummary> {
    return unwrap<NbValueSummary>((await api.get(`/nb/admin/members/${memberId}/value-summary`)).data);
  },

  // Notlar / görevler / segment
  async notes(memberId: string): Promise<NbNote[]> {
    return unwrap<NbNote[]>((await api.get(`/nb/admin/members/${memberId}/notes`)).data);
  },
  async addNote(memberId: string, body: { kind: NbNoteKind; body: string; dueAt?: string; outcome?: string }) {
    return unwrap<NbNote>((await api.post(`/nb/admin/members/${memberId}/notes`, body)).data);
  },
  async updateNote(noteId: string, patch: NbNotePatch) {
    return unwrap<NbNote>((await api.patch(`/nb/admin/notes/${noteId}`, patch)).data);
  },
  async deleteNote(noteId: string) {
    await api.delete(`/nb/admin/notes/${noteId}`);
  },
  async tasks(scope: 'today' | 'overdue' | 'all' = 'today'): Promise<NbNote[]> {
    return unwrap<NbNote[]>((await api.get('/nb/admin/tasks', { params: { scope } })).data);
  },
  async setSegment(memberId: string, segment: NbSuccessSegment | null) {
    return unwrap<{ segment: string; setBy: string }>(
      (await api.patch(`/nb/admin/members/${memberId}/segment`, { segment })).data,
    );
  },

  // Kısa liste
  async shortlist(memberIds?: string[]): Promise<NbMemberShortlist[]> {
    const params = new URLSearchParams();
    (memberIds ?? []).forEach((id) => params.append('memberIds', id));
    return unwrap<NbMemberShortlist[]>((await api.get('/nb/admin/tenders/shortlist', { params })).data);
  },
  async shortlistDraft(memberId: string, tenderIds: string[]): Promise<string> {
    return unwrap<{ draft: string }>(
      (await api.post('/nb/admin/tenders/shortlist/whatsapp-draft', { memberId, tenderIds })).data,
    ).draft;
  },

  // Üye fırsatları
  async memberOpportunities(memberId: string, limit = 10): Promise<NbMemberOpportunities> {
    return unwrap<NbMemberOpportunities>(
      (await api.get(`/nb/needs/admin/members/${memberId}/opportunities`, { params: { limit } })).data,
    );
  },
  async memberTenderReferrals(memberId: string, size = 20): Promise<NbMemberTenderReferral[]> {
    const page = unwrap<{ content: NbMemberTenderReferral[] }>(
      (await api.get('/nb/admin/tenders/referrals', { params: { memberId, page: 0, size } })).data,
    );
    return page?.content ?? [];
  },

  // Abonelik planları ve abonelikler
  async termPurchases(params: { status?: string; page: number; size: number }): Promise<{ content: NbTermPurchase[]; totalPages: number; totalElements: number }> {
    return unwrap((await api.get('/nb/admin/billing/purchases', { params })).data);
  },
  async billingPlans(): Promise<NbBillingPlan[]> {
    return unwrap<NbBillingPlan[]>((await api.get('/nb/admin/billing/plans')).data);
  },
  async createBillingPlan(body: { tierId: string; interval: NbBillingInterval; price: number; name?: string; promo?: boolean }) {
    return unwrap<NbBillingPlan>((await api.post('/nb/admin/billing/plans', body)).data);
  },
  async setBillingPlanActive(id: string, active: boolean) {
    return unwrap<NbBillingPlan>((await api.patch(`/nb/admin/billing/plans/${id}`, { active })).data);
  },
  async syncBillingPlan(id: string) {
    return unwrap<NbBillingPlan>((await api.post(`/nb/admin/billing/plans/${id}/sync`)).data);
  },
  async subscriptions(params: { status?: NbSubscriptionStatus; page?: number; size?: number }): Promise<NbSubscriptionSummary> {
    return unwrap<NbSubscriptionSummary>((await api.get('/nb/admin/billing/subscriptions', { params })).data);
  },
  /** Üyenin son aboneliği; hiç yoksa null. */
  async memberSubscription(memberId: string): Promise<NbSubscription | null> {
    const s = unwrap<NbSubscription | Record<string, never>>(
      (await api.get(`/nb/admin/billing/members/${memberId}/subscription`)).data,
    );
    return s && 'id' in s ? (s as NbSubscription) : null;
  },
  async cancelSubscription(id: string) {
    return unwrap<NbSubscription>((await api.post(`/nb/admin/billing/subscriptions/${id}/cancel`)).data);
  },
  async retrySubscription(id: string) {
    return unwrap<NbSubscription>((await api.post(`/nb/admin/billing/subscriptions/${id}/retry`)).data);
  },
  async extendSubscriptionGrace(id: string, days: number) {
    return unwrap<NbSubscription>((await api.post(`/nb/admin/billing/subscriptions/${id}/extend-grace`, null, { params: { days } })).data);
  },
  async offerPlan(memberId: string, planId: string | null, validDays?: number) {
    return unwrap<{ offeredPlanId?: string | null; offeredPlanUntil?: string | null }>(
      (await api.patch(`/nb/admin/billing/members/${memberId}/offer-plan`, { planId, validDays })).data,
    );
  },

  // Haftalık özet
  async digestWeek(): Promise<NbDigestWeek> {
    return unwrap<NbDigestWeek>((await api.get('/nb/admin/digest/week')).data);
  },
  async digestPreview(memberId: string): Promise<{ digest: NbDigest; whatsappText: string }> {
    return unwrap<{ digest: NbDigest; whatsappText: string }>((await api.get(`/nb/admin/digest/${memberId}`)).data);
  },
  async digestSendEmail(memberId: string) {
    return unwrap<NbDigest>((await api.post(`/nb/admin/digest/${memberId}/email`)).data);
  },
  async digestMarkWhatsapp(memberId: string) {
    return unwrap<NbDigest>((await api.post(`/nb/admin/digest/${memberId}/whatsapp-sent`)).data);
  },
  async digestSendWeek(): Promise<{ sent: number; skipped: number; failed: number }> {
    return unwrap<{ sent: number; skipped: number; failed: number }>((await api.post('/nb/admin/digest/send-week')).data);
  },

  async conversionBoard(): Promise<NbConversionBoard> {
    return unwrap<NbConversionBoard>((await api.get('/nb/admin/conversion-board')).data);
  },

  // Ayarlar
  async settings(): Promise<NbSettings> {
    return unwrap<NbSettings>((await api.get('/nb/admin/settings')).data);
  },
  async updateSettings<G extends NbSettingsGroup>(group: G, patch: Partial<NbSettings[G]>): Promise<NbSettings[G]> {
    return unwrap<NbSettings[G]>((await api.put(`/nb/admin/settings/${group}`, patch)).data);
  },
};
