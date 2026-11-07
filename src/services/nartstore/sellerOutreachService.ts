import { api } from '../api';
import { commerceOrigin } from './storeActivityService';

/**
 * Satıcı daveti (NartStore arka ucu `/v1/commerce/admin/seller-outreach`). Mesaj sunucudan gitmez:
 * panel WhatsApp'ı (wa.me) hazır metinle açar, gönder tuşuna yönetici basar; burada kime ne zaman
 * yazıldığı ve sonucu tutulur.
 */
const BASE = `${commerceOrigin(
  import.meta.env.VITE_API_BASE_URL || 'https://api.nartgo.net/api/v1',
  import.meta.env.DEV,
  typeof window !== 'undefined' ? window.location.origin : '',
  import.meta.env.VITE_COMMERCE_ORIGIN,
)}/v1/commerce/admin/seller-outreach`;

export type OutreachSource = 'KAFNET' | 'NARTGO' | 'MANUAL';
export type OutreachStatus = 'NEW' | 'SENT' | 'REPLIED' | 'INTERESTED' | 'DECLINED' | 'OPTED_OUT' | 'INVALID' | 'SELLER';
export type PhoneKind = 'MOBILE' | 'LANDLINE' | 'FOREIGN';

export interface OutreachContact {
  id: string;
  source: OutreachSource;
  externalRef: string | null;
  name: string;
  contactPerson: string | null;
  phone: string;
  phoneKind: PhoneKind;
  altPhones: string[];
  email: string | null;
  city: string | null;
  category: string | null;
  website: string | null;
  summary: string | null;
  status: OutreachStatus;
  notes: string | null;
  sentCount: number;
  lastSentAt: string | null;
  statusChangedAt: string | null;
  storeId: string | null;
  lastActionBy: string | null;
  canWhatsApp: boolean;
  doNotWrite: boolean;
}

export interface OutreachSummary {
  byStatus: Record<OutreachStatus, number>;
  bySource: Partial<Record<OutreachSource, number>>;
  sentToday: number;
  sentWeek: number;
  landlineOnly: number;
}

export interface OutreachImportRow {
  name: string;
  phones: string[];
  contacts?: string;
  contactPerson?: string;
  email?: string;
  city?: string;
  category?: string;
  website?: string;
  description?: string;
  externalRef?: string;
}

export interface OutreachImportResult {
  created: number;
  merged: number;
  alreadySeller: number;
  skippedNoPhone: number;
  landlineOnly: number;
  skipped: string[];
}

export type OutreachTemplates = Record<OutreachSource, string> & { defaults: Record<OutreachSource, string> };

export const sellerOutreachService = {
  async list(params: { status?: string; source?: string; q?: string; whatsappOnly?: boolean; page?: number }) {
    return (await api.get<{ items: OutreachContact[]; total: number; page: number; pageSize: number; summary: OutreachSummary }>(BASE, { params })).data;
  },
  async summary(opts?: Record<string, unknown>) {
    return (await api.get<OutreachSummary>(`${BASE}/summary`, opts)).data;
  },
  async import(source: OutreachSource, rows: OutreachImportRow[]) {
    return (await api.post<OutreachImportResult>(`${BASE}/import`, { source, rows })).data;
  },
  async update(id: string, body: { status?: OutreachStatus; notes?: string; phone?: string; contactPerson?: string }) {
    return (await api.patch<OutreachContact>(`${BASE}/${id}`, body)).data;
  },
  async markSent(id: string, force = false) {
    return (await api.post<OutreachContact>(`${BASE}/${id}/sent`, { force })).data;
  },
  async remove(id: string) {
    await api.delete(`${BASE}/${id}`);
  },
  async templates() {
    return (await api.get<OutreachTemplates>(`${BASE}/templates`)).data;
  },
  async saveTemplates(body: Partial<Record<OutreachSource, string>>) {
    return (await api.put<OutreachTemplates>(`${BASE}/templates`, body)).data;
  },
};

export const STATUS_META: Record<OutreachStatus, { label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info' }> = {
  NEW: { label: 'Yazılmadı', color: 'default' },
  SENT: { label: 'Mesaj Gönderildi', color: 'info' },
  REPLIED: { label: 'Yanıt Verdi', color: 'primary' },
  INTERESTED: { label: 'İlgileniyor', color: 'success' },
  DECLINED: { label: 'İlgilenmiyor', color: 'warning' },
  OPTED_OUT: { label: 'Bir Daha Yazma', color: 'error' },
  INVALID: { label: 'Numara Geçersiz', color: 'warning' },
  SELLER: { label: 'Mağaza Açtı', color: 'success' },
};

export const SOURCE_LABEL: Record<OutreachSource, string> = { KAFNET: 'Kafnet', NARTGO: 'NartGo işletmesi', MANUAL: 'Elle eklendi' };

/** 905321234567 → +90 532 123 45 67 */
export const formatPhone = (digits: string) => {
  if (/^90\d{10}$/.test(digits)) return `+90 ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10)}`;
  return `+${digits}`;
};

/** Şablonu doldurur: {firma}, {yetkili} (yoksa satır içinden temizlenir). */
export const renderTemplate = (template: string, c: Pick<OutreachContact, 'name' | 'contactPerson'>) =>
  template
    .replace(/\{firma\}/g, c.name.trim())
    .replace(/\s*\{yetkili\}/g, c.contactPerson ? ` ${c.contactPerson.trim()}` : '')
    .trim();

/** WhatsApp bağlantısı: masaüstünde WhatsApp Web/uygulama, telefonda uygulama açılır. */
export const whatsappLink = (digits: string, text: string) => `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
