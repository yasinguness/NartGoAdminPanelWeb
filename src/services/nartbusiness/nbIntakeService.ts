import { api } from '../api';
export type IntakeStatus = 'INVITED' | 'PENDING' | 'ACKNOWLEDGED' | 'APPROVED' | 'REJECTED';
export interface IntakeItem { type: 'REQUEST' | 'OFFER'; title: string; description: string;
  timing: string; city?: string; budget?: number; currency: string; targetCustomer?: string; }
export interface IntakeRow { id: string; memberId: string; memberLabel?: string; assignedTo: string;
  status: IntakeStatus; createdAt: string; expiresAt: string; submittedAt?: string;
  reviewedAt?: string; reviewedBy?: string; revoked: boolean; items?: IntakeItem[];
  listingIds: string[]; reviewNote?: string; contactQuoteIds: string[]; contactPending: boolean; contactNote?: string;
  /** ADMIN_LINK: admin bağlantısıyla; MEMBER_HOME: üye ana sayfadan kendisi gönderdi. */
  origin?: 'ADMIN_LINK' | 'MEMBER_HOME';
  /** Paylaş akışında üyenin düzelttiği alanlar ve tercihleri; eski kayıtlarda yok. */
  draft?: IntakeDraft | null;
  /** Üyenin gördüğü talep çubuğu (Faz 6). */
  trackStatus?: TrackStatus | null;
  statusHistory?: { status: TrackStatus; at: string }[];
  forwardedMemberIds?: string[]; }
export type TrackStatus = 'RECEIVED' | 'IN_REVIEW' | 'PUBLISHED' | 'FORWARDED' | 'RESPONDED' | 'CLOSED';
/** Üyenin Ana Sayfa'da gördüğü çubukla aynı adlar (nartgo-web Taleplerim). */
export const trackLabels: Record<TrackStatus, string> = {
  RECEIVED: 'Alındı', IN_REVIEW: 'Ekip inceliyor', PUBLISHED: 'Yayında',
  FORWARDED: 'Firmalara iletildi', RESPONDED: 'Yanıt geldi', CLOSED: 'Kapandı' };
export interface IntakeDraft { what?: string; quantity?: string; location?: string; timing?: string; budget?: string;
  sectorSuggestion?: string; keywords?: string[]; hideCompany: boolean; notifyWhatsapp: boolean; }
export interface ItemEdit { title: string; description: string; city?: string; }
export interface IntakeLink { id: string; url: string; expiresAt: string; }
export interface IntakeContact { id: string; supplierMemberId: string; supplierCompanyName?: string;
  supplierDisplayName?: string; price: number; currency: string; }
const base = '/nb/needs/admin/intakes';
export const nbIntakeService = {
  async list(status: string, page: number, contactsOnly = false) {
    const res = await api.get(base, { params: { status: status || undefined, page, size: 25, contactsOnly } });
    return res.data.data as { content: IntakeRow[]; totalPages: number; totalElements: number };
  },
  async invite(memberId: string, validDays: number) {
    return (await api.post(base, { memberId, validDays })).data.data as IntakeLink;
  },
  async approve(id: string, sectorCodes: string[]) {
    return (await api.post(`${base}/${id}/approve`, { ownerConfirmed: true, sectorCodes })).data.data as IntakeRow;
  },
  async reject(id: string, note: string) { await api.post(`${base}/${id}/reject`, { note }); },
  async revoke(id: string) { await api.post(`${base}/${id}/revoke`); },
  async resultLink(id: string) { return (await api.post(`${base}/${id}/result-link`)).data.data as IntakeLink; },
  /** Baglantiyi uyenin kayitli e-postasina gonderir. Adres yoksa uc 404 doner. */
  async emailLink(id: string, url: string, message: string) { await api.post(`${base}/${id}/email-link`, { url, message }); },
  async completeContacts(id: string, note: string) { await api.post(`${base}/${id}/contacts/complete`, { note }); },
  /** Üye "Ekip inceliyor" görür. */
  async startReview(id: string) { return (await api.post(`${base}/${id}/review`)).data.data as IntakeRow; },
  /** Yayından önce başlık, metin ve şehir düzeltmesi. */
  async editItems(id: string, items: ItemEdit[]) { return (await api.put(`${base}/${id}/items`, { items })).data.data as IntakeRow; },
  /** Talebi kapatır; yayımlanmış ilanlar açık kalır. */
  async closeRequest(id: string, note: string) { return (await api.post(`${base}/${id}/close`, { note })).data.data as IntakeRow; },
  async contacts(id: string) { return (await api.get(`${base}/${id}/contacts`)).data.data as IntakeContact[]; },
};
