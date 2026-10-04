import { api } from '../api';
export type IntakeStatus = 'INVITED' | 'PENDING' | 'ACKNOWLEDGED' | 'APPROVED' | 'REJECTED';
export interface IntakeItem { type: 'REQUEST' | 'OFFER'; title: string; description: string;
  timing: string; city?: string; budget?: number; currency: string; targetCustomer?: string; }
export interface IntakeRow { id: string; memberId: string; memberLabel?: string; assignedTo: string;
  status: IntakeStatus; createdAt: string; expiresAt: string; submittedAt?: string;
  reviewedAt?: string; reviewedBy?: string; revoked: boolean; items?: IntakeItem[];
  listingIds: string[]; reviewNote?: string; contactQuoteIds: string[]; contactPending: boolean; contactNote?: string; }
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
  async contacts(id: string) { return (await api.get(`${base}/${id}/contacts`)).data.data as IntakeContact[]; },
};
