/**
 * NB admin panelinde tekrarlayan görüntüleme yardımcıları — UUID gizleme,
 * relative date, eksik alan rozetleri, enum → insan dili.
 */

import type {
  MembershipPeriodStatus,
  MembershipTier,
  NbMemberStatus,
  NbRace,
} from '../services/nartbusiness/nbTypes';

/** Tarihi "Bugün" / "Dün" / "3 gün önce" / "2 ay önce" gibi göreceli formata çevirir. */
export function relativeDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Bugün';
  if (diffDays === 1) return 'Dün';
  if (diffDays < 7) return `${diffDays} gün önce`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} hafta önce`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} ay önce`;
  return `${Math.floor(diffDays / 365)} yıl önce`;
}

/** Tarihi tam formatla (hover tooltip için): "15 Mayıs 2026, 09:31". */
export function fullDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Sadece tarih kısmı: "15 Mayıs 2026". */
export function shortDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** İki tarih arası ay sayısı (yaklaşık). Negatifse 0 döner. */
export function monthsBetween(fromIso?: string | null, toIso?: string | null): number {
  if (!fromIso || !toIso) return 0;
  const a = new Date(fromIso);
  const b = new Date(toIso);
  const diff =
    (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  return Math.max(0, diff);
}

/** UUID'nin ilk 8 karakterini döner. */
export function shortId(id?: string | null): string {
  if (!id) return '';
  return id.length >= 8 ? id.slice(0, 8) : id;
}

export const TIER_LABEL: Record<MembershipTier, string> = {
  KURUCU: 'Kurucu',
  STANDART: 'Standart',
  GENC_GIRISIMCI: 'Genç Girişimci',
  PATRON: 'Patron',
};

export const STATUS_LABEL: Record<NbMemberStatus, string> = {
  SUBMITTED: 'Komite inceliyor',
  NEEDS_INFO: 'Ek bilgi bekleniyor',
  REJECTED: 'Reddedildi',
  APPROVED_PENDING_PAYMENT: 'Onaylandı · ödeme bekliyor',
  APPROVED_EXPIRED: 'Onay süresi doldu',
  ACTIVE: 'Aktif',
  EXPIRED: 'Süresi doldu',
  SUSPENDED: 'Askıda',
  CANCELLED: 'İptal',
  PENDING_VERIFICATION: 'Eski (doğrulama bekliyor)',
};

export const RACE_LABEL: Record<NbRace, string> = {
  adige: 'Adige',
  abhaz: 'Abhaz',
  cecen: 'Çeçen',
  karacay: 'Karaçay',
  dagistan: 'Dağıstan',
  oset: 'Oset',
  other: 'Diğer',
};

export const PERIOD_STATUS_LABEL: Record<MembershipPeriodStatus, string> = {
  PAYMENT_PENDING: 'Ödeme bekliyor',
  ACTIVE: 'Aktif',
  EXPIRED: 'Süresi doldu',
  CANCELLED: 'İptal',
};

/** Ücreti TL formatında basar: 15.000,00 ₺ */
export function formatMoney(amount?: number | null, currency: string = 'TRY'): string {
  if (amount == null) return '—';
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}
