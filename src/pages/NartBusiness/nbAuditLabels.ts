// NartBusiness audit log — ham enum/kod değerlerini anlamlı Türkçe etiketlere çevirir.
// Bilinmeyen değerler için humanize() okunur bir fallback üretir (alt çizgileri ayırır).

const ACTION_LABELS: Record<string, string> = {
  ADMIN_MANUAL_CREATE_MEMBER: 'Üye manuel oluşturuldu',
  ADMIN_UPDATE_MEMBER_BUSINESS: 'Üye işletme bilgisi güncellendi',
  ADMIN_SUSPEND_MEMBER: 'Üye askıya alındı',
  ADMIN_REACTIVATE_MEMBER: 'Üye yeniden aktifleştirildi',
  ADMIN_CANCEL_MEMBER: 'Üyelik iptal edildi',
  ADMIN_HARD_DELETE_MEMBER: 'Üye kalıcı silindi',
  ADMIN_CONFIRM_BANK_TRANSFER: 'Banka havalesi onaylandı',
  ADMIN_GRANT_TRIAL: 'Deneme süresi verildi',
  ADMIN_EXTEND_TRIAL: 'Deneme süresi uzatıldı',
  ADMIN_REVOKE_TRIAL: 'Deneme süresi iptal edildi',
  ADMIN_RESEND_EMAIL: 'E-posta yeniden gönderildi',
  ADMIN_SEND_SET_PASSWORD_EMAIL: 'Şifre belirleme e-postası gönderildi',
  ADMIN_RESEND_NB_INVITE: 'Davet yeniden gönderildi',
  ADMIN_CANCEL_NB_INVITE: 'Davet iptal edildi',
  TIER_UPDATE: 'Kademe güncellendi',
  TIER_DOC_POLICY_UPDATE: 'Belge politikası güncellendi',
  NB_APPLICATION_SUBMITTED: 'Başvuru gönderildi',
  KYC_DECIDE: 'Doğrulama kararı verildi',
  KYC_VOTE: 'Doğrulama oyu verildi',
  KVKK_REJECT: 'KVKK talebi reddedildi',
  REPORT_RESOLVE: 'Şikayet sonuçlandırıldı',
  MATCH_BATCH_TRIGGER: 'Eşleştirme toplu çalıştırıldı',
  DLQ_REPLAY: 'Hata kuyruğu yeniden işlendi',
};

const OUTCOME_LABELS: Record<string, string> = {
  SUCCESS: 'Başarılı',
  FAILURE: 'Başarısız',
  FAILED: 'Başarısız',
  ERROR: 'Hata',
  FORBIDDEN: 'Reddedildi',
};

const SOURCE_LABELS: Record<string, string> = {
  'nb-membership-service': 'Üyelik',
  'nb-directory-service': 'Dizin',
  'nb-community-service': 'Topluluk',
  'nb-needs-service': 'Talepler',
  'nb-verification-service': 'Doğrulama',
  'media-service': 'Medya',
  'payment-service': 'Ödeme',
  'ticket-service': 'Destek',
  'notification-service': 'Bildirim',
  'auth-service': 'Kimlik',
};

const TARGET_TYPE_LABELS: Record<string, string> = {
  nb_member: 'Üye',
  nb_application: 'Başvuru',
  nb_membership_invite: 'Davet',
  nb_tier_config: 'Kademe',
  verification_case: 'Doğrulama dosyası',
  tier_doc_policy: 'Belge politikası',
  report: 'Şikayet',
  dsr: 'KVKK talebi',
  outbox_event: 'Olay kaydı',
};

const META_KEY_LABELS: Record<string, string> = {
  category: 'Kategori',
  note: 'Not',
  reason: 'Gerekçe',
  email: 'E-posta',
  to: 'Alıcı',
  template: 'Şablon',
  days: 'Gün',
  tierId: 'Kademe',
  active: 'Aktif',
  targetName: 'Hedef',
  companyName: 'İşletme',
};

/** ALL_CAPS_SNAKE → "Title case" okunur fallback. */
export function humanize(s: string): string {
  if (!s) return '';
  return s
    .toLocaleLowerCase('tr-TR')
    .replace(/_/g, ' ')
    .replace(/(^|\s)\S/g, (c) => c.toLocaleUpperCase('tr-TR'));
}

export const actionLabel = (a?: string | null): string =>
  !a ? '—' : ACTION_LABELS[a] ?? humanize(a);

export const outcomeLabel = (o?: string | null): string =>
  !o ? '—' : OUTCOME_LABELS[o.toUpperCase()] ?? o;

export const sourceLabel = (s?: string | null): string =>
  !s ? '—' : SOURCE_LABELS[s] ?? s.replace(/-service$/, '');

export const targetTypeLabel = (t?: string | null): string =>
  !t ? '' : TARGET_TYPE_LABELS[t] ?? humanize(t);

export const metaKeyLabel = (k: string): string => META_KEY_LABELS[k] ?? humanize(k);

/** meta objesini "Etiket: değer" satırlarına çevirir (boş/teknik anahtarları atlar). */
export function formatMeta(meta?: Record<string, unknown> | null): { key: string; label: string; value: string }[] {
  if (!meta) return [];
  const SKIP = new Set(['targetName']); // hedef kolonunda zaten gösteriliyor
  return Object.entries(meta)
    .filter(([k, v]) => !SKIP.has(k) && v !== null && v !== undefined && String(v).trim() !== '')
    .map(([k, v]) => ({ key: k, label: metaKeyLabel(k), value: String(v) }));
}
