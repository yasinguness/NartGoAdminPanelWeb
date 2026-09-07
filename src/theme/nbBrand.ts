/**
 * NartBusiness marka katmanı — tek kaynak.
 *
 * Panelde üç ayrı görsel dil vardı: ana tema NartGo yeşili, sidebar sabit
 * kodlanmış lacivert/altın, üye oluşturma modalı ise kendi "elite" temasını
 * kuruyordu. Sonuç: NartBusiness'ın lacivert-altın kimliği yalnız bir modalın
 * içinde yaşıyordu, dışarı çıkınca yeşile dönüyordu.
 *
 * Bu dosya o kimliğin tek tanımı. Sidebar, NB sayfaları ve NB diyalogları
 * buradan okur; hiçbir yerde hex elle yazılmaz.
 *
 * Palet mobil taraftaki NB token'larıyla hizalı (bkz. Mobile
 * packages/nartbusiness theme/nb_colors.dart): navy metin ve derin yüzey,
 * gold vurgu ve birincil aksiyon.
 */

export const nb = {
  /** Derin lacivert — sidebar zemini, koyu başlıklar. */
  navy: '#1B2A4A',
  navyDeep: '#142036',
  navySoft: '#243566',

  /** Altın — vurgu, aktif durum, birincil NB aksiyonu. */
  gold: '#B8860B',
  goldSoft: '#C9A227',
  goldTint: 'rgba(201, 162, 39, 0.12)',
  goldTintStrong: 'rgba(201, 162, 39, 0.20)',

  /** Koyu zemin üzerindeki metin kademeleri. */
  onDark: 'rgba(255,255,255,0.92)',
  onDarkMuted: 'rgba(255,255,255,0.62)',
  onDarkFaint: 'rgba(255,255,255,0.38)',
  onDarkLine: 'rgba(255,255,255,0.08)',
} as const;

/**
 * Üyelik durumlarının tek renk sözlüğü.
 *
 * Önceden her ekran kendi çip rengini seçiyordu; aynı durum listede mavi,
 * detayda gri görünebiliyordu. Durum → ton eşlemesi burada sabit.
 *
 * `tone` MUI'nin semantik adları değil bilinçli olarak: "ödeme bekliyor"
 * bir hata değil, bir bekleme; "süresi doldu" bir uyarı değil, bir kayıp.
 */
export type NbStatusTone = 'active' | 'trial' | 'waiting' | 'lapsed' | 'review' | 'closed';

export const NB_STATUS_TONE: Record<string, NbStatusTone> = {
  ACTIVE: 'active',
  TRIAL: 'trial',
  APPROVED_PENDING_PAYMENT: 'waiting',
  APPROVED_EXPIRED: 'lapsed',
  EXPIRED: 'lapsed',
  SUBMITTED: 'review',
  NEEDS_INFO: 'review',
  PENDING_VERIFICATION: 'review',
  SUSPENDED: 'closed',
  REJECTED: 'closed',
  CANCELLED: 'closed',
};

export const NB_TONE_STYLE: Record<NbStatusTone, { fg: string; bg: string; dot: string }> = {
  active:  { fg: '#0E7C4A', bg: 'rgba(16,185,129,0.10)',  dot: '#10B981' },
  trial:   { fg: '#1B2A4A', bg: 'rgba(27,42,74,0.07)',    dot: '#1B2A4A' },
  waiting: { fg: '#9A6B00', bg: 'rgba(245,158,11,0.12)',  dot: '#F59E0B' },
  lapsed:  { fg: '#8A5A5A', bg: 'rgba(120,80,80,0.10)',   dot: '#A57070' },
  review:  { fg: '#3F5378', bg: 'rgba(63,83,120,0.10)',   dot: '#5B7099' },
  closed:  { fg: '#6B7280', bg: 'rgba(107,114,128,0.10)', dot: '#9CA3AF' },
};

/**
 * Aciliyet eşiği — kalan gün sayısına göre görsel ağırlık.
 *
 * Listede "3 gün kaldı" ile "26 gün kaldı" aynı puntoda duruyordu; aciliyet
 * hiç kodlanmamıştı. Üç kademe yeterli: kritik (kırmızıya kaçan), yakın
 * (altın), sakin (soluk). Daha fazlası gürültü.
 */
export function urgencyOf(daysLeft: number | null | undefined): 'critical' | 'soon' | 'calm' {
  if (daysLeft == null) return 'calm';
  if (daysLeft <= 3) return 'critical';
  if (daysLeft <= 10) return 'soon';
  return 'calm';
}

export const URGENCY_STYLE: Record<'critical' | 'soon' | 'calm', { color: string; weight: number }> = {
  critical: { color: '#B3261E', weight: 700 },
  soon:     { color: nb.gold, weight: 600 },
  calm:     { color: '#94A3B8', weight: 400 },
};
