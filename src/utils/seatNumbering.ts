/**
 * Koltuk Numaralandırma Düzenleri
 *
 * Salonlarda kullanılan üç temel koltuk numaralandırma yöntemi:
 *
 * 1. LTR (Soldan Sağa):  1, 2, 3, 4, 5, 6, 7, 8, 9
 *    Standart düzen. Sahneye soldan bakan seyirci için doğal sıra.
 *
 * 2. RTL (Sağdan Sola):  9, 8, 7, 6, 5, 4, 3, 2, 1
 *    Ters düzen. Sahneye sağdan bakan seyirci için.
 *
 * 3. CENTER_OUT (Ortadan Dışa): 1, 3, 5, 7, 9, 8, 6, 4, 2
 *    Tek numaralar soldan, çift numaralar sağdan → merkez koridor en düşük numarayı alır.
 *    Türk tiyatroları ve kültür merkezlerinde yaygın.
 */

export type SeatNumberingMode = 'ltr' | 'rtl' | 'center-out';

export const NUMBERING_MODES: { value: SeatNumberingMode; label: string; description: string; example: string }[] = [
  {
    value: 'ltr',
    label: 'Soldan Sağa',
    description: 'Standart sıralama',
    example: '1, 2, 3, 4, 5',
  },
  {
    value: 'rtl',
    label: 'Sağdan Sola',
    description: 'Ters sıralama',
    example: '5, 4, 3, 2, 1',
  },
  {
    value: 'center-out',
    label: 'Ortadan Dışa',
    description: 'Tek numaralar sol, çift numaralar sağ',
    example: '1, 3, 5, 4, 2',
  },
];

/**
 * Verilen koltuk sayısı ve numaralandırma moduna göre,
 * her fiziksel pozisyon (soldan sağa 0..count-1) için koltuk numarasını döndürür.
 *
 * @param count   Sıradaki toplam koltuk sayısı
 * @param mode    Numaralandırma düzeni
 * @returns       Fiziksel pozisyonlara karşılık gelen koltuk numaraları dizisi (length = count)
 *
 * @example
 * generateSeatNumbers(9, 'ltr')        → [1, 2, 3, 4, 5, 6, 7, 8, 9]
 * generateSeatNumbers(9, 'rtl')        → [9, 8, 7, 6, 5, 4, 3, 2, 1]
 * generateSeatNumbers(9, 'center-out') → [1, 3, 5, 7, 9, 8, 6, 4, 2]
 */
export function generateSeatNumbers(count: number, mode: SeatNumberingMode = 'ltr'): number[] {
  if (count <= 0) return [];

  switch (mode) {
    case 'ltr':
      return Array.from({ length: count }, (_, i) => i + 1);

    case 'rtl':
      return Array.from({ length: count }, (_, i) => count - i);

    case 'center-out': {
      // Tek numaralar (1,3,5,...) soldan sağa → sol yarı
      // Çift numaralar (2,4,6,...) sağdan sola → sağ yarı
      // Sonuç: ortada en büyük numara, kenarlarda en küçük
      const odds: number[] = [];
      const evens: number[] = [];
      for (let n = 1; n <= count; n++) {
        if (n % 2 === 1) odds.push(n);
        else evens.push(n);
      }
      // Sol taraf: tek numaralar soldan sağa
      // Sağ taraf: çift numaralar büyükten küçüğe (en büyük ortaya yakın)
      return [...odds, ...evens.reverse()];
    }

    default:
      return Array.from({ length: count }, (_, i) => i + 1);
  }
}

/**
 * Fiziksel pozisyon indeksini (0-based, soldan sağa) koltuk numarasına çevirir.
 *
 * @param position  Fiziksel pozisyon (0-based, sol=0)
 * @param count     Sıradaki toplam koltuk sayısı
 * @param mode      Numaralandırma düzeni
 */
export function seatNumberAtPosition(position: number, count: number, mode: SeatNumberingMode = 'ltr'): number {
  const numbers = generateSeatNumbers(count, mode);
  return numbers[position] ?? position + 1;
}
