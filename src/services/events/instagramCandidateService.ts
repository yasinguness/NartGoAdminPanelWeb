/**
 * Instagram'dan etkinlik adayları (event-service).
 *
 * NartGo'nun takip ettiği dernek hesapları düzenli taranır; "etkinlik,
 * zexes, buluşma…" geçen gönderiler ADAY olur. Otomatik yayın yok: her
 * adayı admin kontrol edip yayınlar ya da reddeder. Yayınlama mevcut
 * etkinlik oluşturma akışını kullanır.
 */

import { api } from '../api';

const ROOT = '/events/admin/instagram';

const unwrap = <T,>(response: { data: unknown }): T => {
  const body = response.data as { data?: T } | T;
  return (body && typeof body === 'object' && 'data' in (body as object) ? (body as { data: T }).data : body) as T;
};

/** Aday durumu — sekmelerle birebir. */
export type CandidateStatus = 'pending' | 'published' | 'rejected' | 'past' | 'duplicate';

/** Çıkarımın ne kadar güvenilir olduğu; sıralama da buna göre. */
export type CandidateConfidence = 'high' | 'medium' | 'low';

export interface InstagramCandidate {
  id: string;
  /** Gönderiyi paylaşan hesap. */
  username: string;
  displayName?: string | null;
  /** Instagram'daki özgün gönderi bağlantısı. */
  permalink?: string | null;
  caption?: string | null;
  /**
   * Gönderi görseli. Instagram bağlantıları birkaç gün sonra kırılabilir;
   * arayüz kırık görseli yer tutucuyla karşılar.
   */
  mediaUrl?: string | null;
  mediaType?: string | null;
  postedAt?: string | null;
  /** Gönderiden çıkarılan etkinlik başlığı. */
  title?: string | null;
  /** Adaylığı tetikleyen kelimeler, virgülle ayrık. */
  matchedKeywords?: string | null;
  /** Çıkarılan tarih-saat; yoksa admin girer. */
  eventTime?: string | null;
  /** Gönderide saat gerçekten bulundu mu — false ise saat zorunlu. */
  timeFound?: boolean;
  /** @deprecated Önerilen yer alanlarıyla değiştirildi; bilgi amaçlı kalıyor. */
  city?: string | null;

  // ── Önerilen yer ──────────────────────────────────────────
  // Varsayılan dernek binası; gönderide başka il geçiyorsa o il.
  // Konum seçicinin başlangıç değeri olur, admin değiştirebilir.
  placeId?: string | null;
  placeName?: string | null;
  formattedAddress?: string | null;
  district?: string | null;
  country?: string | null;
  countryCode?: string | null;
  /** Koordinat yoksa konum seçilmemiş sayılır ve yayınlama engellenir. */
  latitude?: number | null;
  longitude?: number | null;

  confidence?: CandidateConfidence;
  status: CandidateStatus;
  /** Kopya ise asıl adayın kimliği. */
  duplicateOf?: string | null;
  /** Yayınlandıysa oluşan etkinlik. */
  eventId?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  /** Kuruluşun NartGo hesabı tanımlı mı; değilse etkinlik NartGo adına açılır. */
  hasNartgoAccount?: boolean;
}

/**
 * Yayınlama gövdesindeki adres.
 *
 * Panelin GooglePlacesInput çıktısı (AddressValue) birebir buraya oturur.
 * Önceden city/district/place serbest metin olarak gidiyordu; yurt dışı bir
 * yer seçildiğinde ülke yanlış yazılıp sunucuda NOT NULL hatasına yol
 * açıyordu. Artık yapılandırılmış ve ülke tahmin edilmiyor.
 */
export interface PublishAddress {
  city?: string;
  district?: string;
  country?: string;
  countryCode?: string;
  latitude?: number;
  longitude?: number;
  /** Yer adı ya da açık adres. */
  description?: string;
}

/** Yayınlama gövdesi — boş bırakılan alanlar adaydan doldurulur. */
export interface PublishBody {
  name?: string;
  description?: string;
  /** ISO, Europe/Istanbul. */
  eventTime?: string;
  endTime?: string;
  address?: PublishAddress;
  categoryId?: string;
  maxParticipants?: number;
}

/** Elle tarama özeti. */
export interface ScanReport {
  scannedAccounts: number;
  /** İşletme/üretici hesabı olmadığı için incelenemeyenler. */
  notProfessional: number;
  errors: number;
  posts: number;
  added: number;
  past: number;
  duplicates: number;
  /** Anahtar ya da izin sorunu nedeniyle tarama yarıda kaldıysa sebebi. */
  stoppedBecause?: string | null;
}

/** Takip edilen kaynak hesap. */
export interface InstagramSource {
  username: string;
  displayName?: string | null;
  defaultCity?: string | null;
  /** Kuruluşun NartGo kullanıcı kimliği; boşsa etkinlik NartGo adına açılır. */
  organizerUserId?: string | null;
  organizerName?: string | null;
  organizerEmail?: string | null;
  enabled: boolean;
  status?: 'unknown' | 'ok' | 'not_professional' | 'error';
  lastError?: string | null;
  lastCheckedAt?: string | null;
  /** Bu hesaptan bekleyen aday sayısı. */
  pending?: number;
  /** Hesap için bulunan yer — bilgi amaçlı. */
  placeName?: string | null;
  formattedAddress?: string | null;
}

export const instagramCandidateService = {
  async candidates(status: CandidateStatus): Promise<InstagramCandidate[]> {
    return unwrap(await api.get(`${ROOT}/candidates`, { params: { status } })) ?? [];
  },

  async publish(id: string, body: PublishBody = {}): Promise<{ eventId: string; name: string }> {
    return unwrap(await api.post(`${ROOT}/candidates/${encodeURIComponent(id)}/publish`, body));
  },

  async reject(id: string): Promise<void> {
    await api.post(`${ROOT}/candidates/${encodeURIComponent(id)}/reject`);
  },

  /** Beklemeden elle tarama başlat. */
  async scan(): Promise<ScanReport> {
    return unwrap(await api.post(`${ROOT}/scan`));
  },

  async sources(): Promise<InstagramSource[]> {
    return unwrap(await api.get(`${ROOT}/sources`)) ?? [];
  },

  async saveSource(body: Partial<InstagramSource> & { username: string }): Promise<void> {
    await api.put(`${ROOT}/sources`, body);
  },
};

/** Sunucu 400'leri Türkçe ve gösterilebilir; olduğu gibi bas. */
export function candidateError(error: unknown): string {
  const e = error as { response?: { status?: number; data?: { message?: string; error?: { message?: string } } } };
  // Sunucu 400/404/409'u {status, message} ile döndürüyor ve mesaj Türkçe;
  // olduğu gibi göster. Genel 500'ler artık beklenmiyor.
  return (
    e?.response?.data?.message ??
    e?.response?.data?.error?.message ??
    (e?.response?.status === 409 ? 'Bu aday zaten yayında.' : 'İşlem başarısız.')
  );
}
