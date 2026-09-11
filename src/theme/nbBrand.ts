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
  // ── Koyu yüzey (sidebar, koyu başlık şeridi) ─────────────────────────
  /** Sidebar zemini ve koyu yüzeyler. */
  navy: '#0d1b25',
  navyDeep: '#0a141c',
  navySoft: '#25404f',

  // ── Aksan ────────────────────────────────────────────────────────────
  /** Altın — YALNIZ marka işareti ve birincil CTA. Dekorasyon için değil. */
  gold: '#d8a83a',
  goldSoft: '#d8a83a',
  goldTint: 'rgba(216, 168, 58, 0.12)',
  goldTintStrong: 'rgba(216, 168, 58, 0.20)',

  // ── Aydınlık yüzeyler ────────────────────────────────────────────────
  /** Sayfa zemini. */
  bg: '#f4f3ef',
  /** Kart / panel zemini. */
  surface: '#fffefb',
  /** 1px kenarlık. Gölge KULLANILMAZ, ayrım kenarlıkla yapılır. */
  border: '#e6e3da',
  /** Kart içi ayraç (kenarlıktan bir ton açık). */
  divider: '#f0eee7',
  /** Girdi zemini. */
  inputBg: '#faf9f5',
  inputBorder: '#ddd9cf',

  // ── Metin kademeleri ─────────────────────────────────────────────────
  text: '#0e1b26',
  textMuted: '#5f6b73',
  /** Büyük harf etiketler ve ikincil üstveri. */
  textFaint: '#8b8478',

  // ── Anlamsal renkler (aksandan AYRI) ─────────────────────────────────
  /** İyi / başarılı / yüksek eşleşme. */
  green: '#1f6f52',
  greenDeep: '#0f4632',
  greenTint: '#eaf3ee',
  /** Bekleyen / uyarı. */
  amber: '#8a6d1f',
  amberTint: '#f7f0dd',
  /** Acil / olumsuz. */
  red: '#b0413e',
  redTint: '#f8ebea',

  // ── Koyu zemin üzerindeki metin kademeleri ───────────────────────────
  onDark: '#e7eef3',
  onDarkMuted: '#8fa0ad',
  onDarkFaint: '#6f8595',
  onDarkLine: 'rgba(255,255,255,0.08)',
} as const;

/**
 * Tipografi ölçeği.
 *
 * Başlıklar serif (Instrument Serif), arayüz IBM Plex Sans, sayısal ve
 * teknik alanlar IBM Plex Mono. Mono seçimi süs değil: skor, tarih ve
 * kimlik gibi hizalanması gereken alanlarda rakam genişliği sabit olmalı.
 */
export const nbType = {
  serif: "'Instrument Serif', Georgia, serif",
  sans: "'IBM Plex Sans', system-ui, sans-serif",
  mono: "'IBM Plex Mono', ui-monospace, monospace",
  /** Sayfa başlığı. */
  pageTitle: { fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 34, fontWeight: 400, lineHeight: 1.15 },
  /** Büyük harf bölüm/sütun etiketi. */
  label: { fontSize: 10, letterSpacing: '0.12em', fontWeight: 600, textTransform: 'uppercase' as const },
  /** Breadcrumb — etiketten biraz daha geniş aralıklı. */
  crumb: { fontSize: 10, letterSpacing: '0.16em', fontWeight: 600, textTransform: 'uppercase' as const },
  body: { fontSize: 13 },
  bodySm: { fontSize: 12 },
} as const;

/** Köşe yarıçapları — kart 12, kontrol 7-8, pill 20. */
export const nbRadius = { card: 12, panel: 10, control: 8, controlSm: 7, pill: 20, badge: 5 } as const;


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
