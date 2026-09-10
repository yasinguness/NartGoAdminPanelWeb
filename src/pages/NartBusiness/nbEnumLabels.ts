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
 * Telefonun SAKLANAN biçimi E.164'tür: `+905321234567`.
 *
 * Mobil taraf (`nbPhoneToE164`) böyle yazıyor. Panel bir süre `05321234567`
 * (11 hane, başında 0) yazdı; aynı alan iki farklı biçimde saklandığı için
 * mobildeki görüntüleme ve arama bozuluyordu. Panel artık E.164 üretir.
 */

/** Herhangi bir biçimden 10 haneli ulusal numarayı çıkarır (ülke kodu hariç). */
export function trPhoneNationalDigits(raw: string | undefined | null): string {
  const d = (raw ?? '').replace(/\D/g, '');
  if (!d) return '';
  // +90XXXXXXXXXX (12), 0XXXXXXXXXX (11), XXXXXXXXXX (10) — hepsinde son 10.
  return d.slice(-10);
}

/** 10 haneli ulusal numarayı saklanacak E.164 biçimine çevirir. */
export function trPhoneToE164(nationalDigits: string): string {
  const d = (nationalDigits ?? '').replace(/\D/g, '').slice(-10);
  return d.length === 10 ? `+90${d}` : '';
}

/** Telefon girildiyse eksiksiz mi (10 ulusal hane). */
export function isTrPhoneComplete(value: string | undefined | null): boolean {
  return trPhoneNationalDigits(value).length === 10;
}

/** Kuruluş yılı için makul aralık. */
export const FOUNDED_YEAR_MIN = 1900;
export const foundedYearMax = () => new Date().getFullYear();

/**
 * İşletme tanıtımının üst sınırı.
 *
 * Backend'de dört DTO'da {@code @Size(max = 1000)} olarak duruyor
 * (AdminCreateMemberRequest, AdminUpdateBusinessRequest, AnonymousApplyRequest,
 * ApplyMembershipRequest). Sayı üç yerde ayrı ayrı yazılıydı; biri
 * güncellenmeyince kullanıcı yazmaya devam edip kaydederken 400 alıyordu.
 * Tek yerden okunur.
 *
 * NOT: Bu, dizin profilindeki `summary` alanı DEĞİL (o 5000).
 */
export const BUSINESS_DESC_MAX = 1000;
