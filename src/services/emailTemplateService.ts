import { api } from './api';

/**
 * Hazır e-posta template'lerini admin panelden elle gönderme.
 * Backend: notification-service AdminEmailTemplateController
 *   GET  /notifications/admin/email-templates        → katalog
 *   POST /notifications/admin/email-templates/send    → gönder (kuyruğa al)
 */

export interface EmailTemplateVar {
  name: string;
  label: string;
  required: boolean;
  placeholder: string;
}

export interface EmailTemplateDef {
  key: string;
  title: string;
  defaultSubject: string;
  /** Hangi ürün: "NartGo" / "NartBusiness" — admin karışıklığını önler. */
  product?: string;
  /** Karşılama / Üyelik / Abonelik / Ödeme — mailin ne ile ilgili olduğu. */
  category?: string;
  /** Mail içeriğinin tek cümlelik özeti. */
  description?: string;
  variables: EmailTemplateVar[];
}

export interface EmailPreviewResult {
  subject: string;
  product?: string;
  category?: string;
  description?: string;
  /** Render edilmiş HTML — iframe içinde gösterilir. */
  html: string;
}

export interface SendTemplateBody {
  to: string;
  templateName: string;
  subject?: string;
  variables?: Record<string, string>;
}

export interface SendTemplateResult {
  to: string;
  template: string;
  subject: string;
}

export const emailTemplateService = {
  async catalog(): Promise<EmailTemplateDef[]> {
    const res = await api.get<EmailTemplateDef[]>('/notifications/admin/email-templates');
    return Array.isArray(res.data) ? res.data : [];
  },

  async send(body: SendTemplateBody): Promise<SendTemplateResult> {
    const res = await api.post<SendTemplateResult>('/notifications/admin/email-templates/send', body);
    return res.data;
  },

  /** Template'i değişkenlerle render edip HTML önizleme döner (GÖNDERMEZ). */
  async preview(body: SendTemplateBody): Promise<EmailPreviewResult> {
    const res = await api.post<EmailPreviewResult>('/notifications/admin/email-templates/preview', body);
    return res.data;
  },

  /** Gönderilen e-posta logları (sayfalı, filtreli). */
  async logs(params: {
    recipient?: string;
    status?: string;
    product?: string;
    page?: number;
    size?: number;
  } = {}): Promise<EmailLogPage> {
    const res = await api.get<EmailLogPage>('/notifications/admin/email-templates/logs', { params });
    return res.data;
  },
};

export interface EmailLogEntry {
  id: string;
  recipient: string;
  templateName?: string;
  subject?: string;
  product?: string;
  category?: string;
  status: string; // SENT | FAILED
  errorMessage?: string;
  createdAt: string;
}

/** Spring Page yanıtının kullandığımız alt kümesi. */
export interface EmailLogPage {
  content: EmailLogEntry[];
  totalElements: number;
  totalPages: number;
  number: number;
}

export default emailTemplateService;
