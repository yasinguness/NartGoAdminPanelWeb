/**
 * Gelir/komisyon hesaplama config'i.
 * Merkezi tek bir yerden yönetim — tüm ekranlar bu değerleri kullanır.
 *
 * TODO: İleride bu değerler backend'den gelmeli (settings API veya per-event override).
 */

export const REVENUE_CONFIG = {
  /** iyzico + banka komisyonu (toplam) — %5 varsayıldı */
  paymentProcessingFeeRate: 0.05,

  /** NartGo servis komisyonu — %12 */
  platformFeeRate: 0.12,

  /** KDV — %5 bilet biletlerinde */
  vatRate: 0.05,

  /** Varsayılan para birimi */
  defaultCurrency: 'TRY',
} as const;

/** Brüt gelirden organizatöre kalan net tutarı hesapla */
export function calculateNetRevenue(gross: number): number {
  const fees = REVENUE_CONFIG.paymentProcessingFeeRate + REVENUE_CONFIG.platformFeeRate;
  return gross * (1 - fees);
}

/** Organizatöre kalan oran (%) */
export function organizerRetainPct(): number {
  const fees = REVENUE_CONFIG.paymentProcessingFeeRate + REVENUE_CONFIG.platformFeeRate;
  return (1 - fees) * 100;
}
