/**
 * Dizin profilindeki kod alanlarının Türkçe karşılıkları.
 *
 * Bu kodlar sunucuya **değer olarak** gidiyor ve veritabanında öyle saklanıyor;
 * çevrilemezler. Ama kullanıcıya da ham gösterilmemeli: admin panelde şirket
 * türü açılırında "SOLE_PROPRIETOR", "JSC" gibi değerler görünüyordu ve bunlar
 * Türkiye'deki şirket türlerine karşılık gelmediği için ne seçileceği
 * anlaşılmıyordu.
 *
 * Kural: değer kodun kendisi, ekranda görünen bu sözlükten gelir.
 */

export const COMPANY_TYPE_OPTIONS = [
  'SOLE_PROPRIETOR',
  'LLC',
  'JSC',
  'COOPERATIVE',
  'OTHER',
] as const;

const COMPANY_TYPE_LABELS: Record<string, string> = {
  // Karşılıklar Türkiye'deki tüzel kişilik biçimlerine göre verildi;
  // parantez içindeki kısaltmalar seçimi hızlandırır.
  SOLE_PROPRIETOR: 'Şahıs Şirketi',
  LLC: 'Limited Şirket (LTD. ŞTİ.)',
  JSC: 'Anonim Şirket (A.Ş.)',
  COOPERATIVE: 'Kooperatif',
  OTHER: 'Diğer',
};

export const COMPANY_SIZE_OPTIONS = [
  'MICRO',
  'SMALL',
  'MEDIUM',
  'LARGE',
  'ENTERPRISE',
] as const;

const COMPANY_SIZE_LABELS: Record<string, string> = {
  // Aralıklar KOBİ yönetmeliğindeki çalışan sayısı eşiklerine yakın tutuldu;
  // "MEDIUM" tek başına kime denk geldiğini söylemiyordu.
  MICRO: 'Mikro (1-9 kişi)',
  SMALL: 'Küçük (10-49 kişi)',
  MEDIUM: 'Orta (50-249 kişi)',
  LARGE: 'Büyük (250-999 kişi)',
  ENTERPRISE: 'Kurumsal (1000+ kişi)',
};

export const PHONE_VISIBILITY_OPTIONS = [
  'NOBODY',
  'VERIFIED_MEMBERS',
  'MESSAGE_SENDERS',
  'EVERYONE',
] as const;

const PHONE_VISIBILITY_LABELS: Record<string, string> = {
  // Bu bir gizlilik ayarı; kodun kendisi kimin göreceğini söylemiyordu.
  NOBODY: 'Hiç kimse',
  VERIFIED_MEMBERS: 'Doğrulanmış üyeler',
  MESSAGE_SENDERS: 'Mesaj gönderenler',
  EVERYONE: 'Tüm üyeler',
};

const label = (dict: Record<string, string>) => (code: string) =>
  dict[code] ?? code;

export const companyTypeLabel = label(COMPANY_TYPE_LABELS);
export const companySizeLabel = label(COMPANY_SIZE_LABELS);
export const phoneVisibilityLabel = label(PHONE_VISIBILITY_LABELS);

// ── Giriş biçimlendirme ────────────────────────────────────────────────

/**
 * Telefonu okunur hâle getirir: `05321234567` → `0532 123 45 67`.
 *
 * Sunucuya rakamların kendisi gidiyor; buradaki boşluklar yalnız yazarken
 * doğrulamayı kolaylaştırmak için. Yanlış hane sayısı, boşluklu biçimde
 * gözle hemen fark ediliyor.
 */
export function formatTrPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 4) return d;
  if (d.length <= 7) return `${d.slice(0, 4)} ${d.slice(4)}`;
  if (d.length <= 9) return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
  return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7, 9)} ${d.slice(9)}`;
}

/** Kaydetmeden önce boşlukları at; saklanan değer yalnız rakam olsun. */
export function normalizeTrPhone(formatted: string): string {
  return formatted.replace(/\D/g, '');
}

/** 11 hane ve 0 ile başlıyor mu (05xx xxx xx xx). */
export function isTrPhoneComplete(value: string): boolean {
  const d = normalizeTrPhone(value);
  return d.length === 11 && d.startsWith('0');
}

/** Kuruluş yılı için makul aralık. */
export const FOUNDED_YEAR_MIN = 1900;
export const foundedYearMax = () => new Date().getFullYear();
