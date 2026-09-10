/**
 * NartBusiness görselleştirme token'ları.
 *
 * Renk son adımda seçilir, forma göre değil işe göre: kimlik (kategorik),
 * büyüklük (tek hue, sıralı), durum (ayrılmış). Bu üç iş burada ayrı ayrı
 * tanımlıdır ve birbirinin yerine kullanılmaz — "durum yeşili" hiçbir zaman
 * "seri 3" olmaz.
 *
 * KATEGORİK PALET DOĞRULANMIŞTIR (5 slot, light yüzey):
 *   Lightness band  PASS · Chroma floor PASS
 *   CVD separation  PASS — en kötü komşu ΔE 9.1 (protan)
 *   Normal görüş    PASS — en kötü komşu ΔE 19.6
 *   Contrast        WARN — 3:1 altında kalan slotlar var; bu yüzden kategorik
 *                   renk kullanan her grafik GÖRÜNÜR ETİKET veya sayı listesi
 *                   ile birlikte gelir (relief kuralı). Renk tek başına hiçbir
 *                   yerde anlam taşımaz.
 *
 * Slot sırası sabittir ve döndürülmez: bir filtre seri sayısını değiştirdiğinde
 * hayatta kalanlar yeniden boyanmaz.
 */

import { nb } from '../../../theme/nbBrand';

/** Kimlik paleti — sabit sıralı, döngüsüz. En fazla 5 seri. */
export const NB_CATEGORICAL = [
  '#2a78d6', // 1 mavi
  '#eb6834', // 2 turuncu
  '#1baf7a', // 3 su yeşili
  '#eda100', // 4 sarı
  '#e87ba4', // 5 magenta
] as const;

/**
 * Büyüklük için tek hue — NartBusiness laciverti, açıktan koyuya.
 * Sıralı ramp: "daha çok = daha koyu". Kategorik palet yerine bunu kullan;
 * seriler birbirinden ayrılmıyorsa değil, büyüklük karşılaştırılıyorsa.
 */
export const NB_SEQUENTIAL = [
  '#C7D0E4',
  '#9DAAC9',
  '#6E80AB',
  '#42568C',
  nb.navy,
] as const;

/** Grafiklerde tek seri kullanıldığında varsayılan dolgu. */
export const NB_SERIES_SINGLE = '#42568C';

/**
 * Durum renkleri — AYRILMIŞ. Kategorik seri olarak asla kullanılmaz.
 * Her zaman etiketle birlikte gelir, renk tek başına durum anlatmaz.
 */
export const NB_STATUS = {
  good: '#0E7C4A',
  warning: '#B7791F',
  serious: '#B3261E',
  neutral: '#64748B',
} as const;

/** Eksen, ızgara ve etiket mürekkebi — resesif kalmalı, seriyle yarışmamalı. */
export const NB_INK = {
  grid: 'rgba(27, 42, 74, 0.08)',
  axis: 'rgba(27, 42, 74, 0.45)',
  label: nb.navy,
  muted: '#64748B',
} as const;

/** Sayıyı Türkçe binlik ayracıyla basar. */
export function nbNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('tr-TR').format(value);
}

/** ₺ tam sayı tutarı: 4250000 → "₺4.250.000". */
export function nbTry(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(amount)) return '—';
  return `₺${new Intl.NumberFormat('tr-TR').format(Math.round(amount))}`;
}

/** Büyük tutarı kısaltır: 4250000 → "₺4,3 mn". Hero rakamlarda kullanılır. */
export function nbTryCompact(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(amount)) return '—';
  if (amount >= 1_000_000) return `₺${(amount / 1_000_000).toFixed(1).replace('.', ',')} mn`;
  if (amount >= 1_000) return `₺${Math.round(amount / 1_000)} bin`;
  return nbTry(amount);
}

/** Yüzde — bölen sıfırsa 0 döner, NaN üretmez. */
export function nbPct(part: number, whole: number): number {
  if (!whole) return 0;
  return Math.round((part / whole) * 100);
}
