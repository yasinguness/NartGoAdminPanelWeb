import { api } from './api';

/** Sülale atlası yönetimi (auth-service HeritageFamilyAtlasService). Bkz. docs/plan/nartgo-sulale-atlasi.md. */

export interface ImportRow { village: string; province: string; district: string; name: string; reason?: string }
export interface ImportReport {
  total: number;
  links: number;
  existingFamilies: number;
  newFamilies: number;
  excluded: ImportRow[];
  noVillage: number;
  noVillageSample: ImportRow[];
  ambiguous: { name: string; village: string; matches: string[] }[];
  newFamilyList: { name: string; race: string; otherRaceMatches: string[] }[];
}

export interface NameSuggestion {
  id: string;
  name: string;
  times: number;
  village: string | null;
  province: string | null;
  district: string | null;
  candidates: { exact: { id: number; slug: string; name: string; race: string; villages: number }[]; suggestions: { id: number; slug: string; name: string; race: string; villages: number }[] };
}

export interface CleanupReport {
  renames: { id: number; from: string; to: string; race: string; alternate?: string }[];
  merges: { keep: number; gone: number; name: string; race: string; keepLinks: number; goneLinks: number }[];
  skippedDifferentTribe: { name: string; reason: string }[];
  crossRaceForModerator: { name: string; races: string[]; families: { id: number; race: string; links: number }[] }[];
  candidatesBefore?: number;
  candidatesAfter?: number;
  renamed?: number;
  merged?: number;
}

export interface MergeSide {
  id: number;
  name: string;
  race: string;
  cyrillic: string | null;
  tribes: string[];
  villageCount: number;
  villages: { name: string; province: string }[];
  spellings: string[];
}
export interface MergeItem { a: MergeSide; b: MergeSide; match: string; warning: string | null; sharedVillages: number; score: number }

export interface Candidate { id: number | string; name: string; race?: string; province?: string; district?: string }
export interface IgComment {
  /** Yorum kimliğinin tek yönlü özeti; kişiye götürmez. */
  comment_id: string;
  text: string;
  commented_at: string | null;
  media_posted_on: string;
  status: 'pending' | 'used' | 'ignored';
  familyCandidates: Candidate[];
  villageCandidates: Candidate[];
  /** Yorumda geçen halk/kabile adları (Şapsığ, Abzeh…); sülale adayı değildir. */
  groupMentions?: string[];
}

/** Sülale listesi satırı — GET /public/families/top ve .../search. */
export interface FamilyListItem {
  id?: number;
  slug: string;
  name: string;
  race?: string;
  /** Bu sülalenin bağlı olduğu onaylı köy sayısı. */
  villages: number;
  /** Köylerin yayıldığı il sayısı (yalnız top listesinde). */
  provinces?: number;
}

/** Sülale detayındaki köy kaydı. */
export interface FamilyVillage {
  id: string;
  name: string;
  province?: string;
  district?: string;
  latitude?: number | null;
  longitude?: number | null;
  tribes?: string[];
  /** Bağın nereden geldiği: kaynak listesi, Instagram yorumu, topluluk katkısı… */
  sourceLabel?: string;
}

/** Sülale detay sayfası — GET /public/families/{slug}. */
export interface FamilyDetail {
  /** Slug değiştiyse backend yönlendirme ister. */
  redirect?: string;
  /**
   * Sayısal kimlik — Kiril yazım kaydı bunu ister.
   * Eski auth-service sürümü döndürmüyor; alan yoksa düzenleme kapalı kalır.
   */
  id?: number;
  slug: string;
  name: string;
  /** Kiril yazım — panelden düzenlenebilen tek alan. */
  cyrillic?: string | null;
  race?: string;
  /** Aynı sülalenin bilinen yazım çeşitleri. */
  spellings: string[];
  /** Köyler kabileye göre gruplanır; kabilesizler tek grupta toplanır. */
  groups: { tribe: string; villages: FamilyVillage[] }[];
  /** Adı geçen ama henüz bir köye oturmamış kayıtlar. */
  unplaced: unknown[];
  villageCount: number;
  provinceCount: number;
  /** Haritada koordinatı olan köy sayısı. */
  mappedCount: number;
}

/**
 * Köy detayı — GET /public/map/villages/{id}.
 *
 * Köy hakkında panelde ihtiyaç duyulan her şey tek çağrıda geliyor:
 * konum teyit durumu, Çerkesçe/eski adlar teyit sayılarıyla, kabileler,
 * köyde kayıtlı sülaleler ve verinin kaynağı.
 */
export interface VillageDetail {
  id: string;
  slug?: string;
  name: string;
  province?: string;
  district?: string;
  lat?: number | null;
  lng?: number | null;
  /** admin_verified | community_verified | source_accepted | … */
  confidence?: string;
  /** Hazır okunur etiket: "Konum teyitli", "Kaynak listesinden"… */
  confidenceLabel?: string;
  verified?: boolean;
  /** Çerkesçe ve eski adlar (ham liste). */
  altNames?: string[];
  /** Aynı adlar, teyit durumu ve köylü onay sayısıyla. */
  names?: { id: string; name: string; trust: string; confirms: number }[];
  /** Bir adın "teyitli" sayılması için gereken onay sayısı. */
  trustNeeded?: number;
  tribes?: string[];
  /** Köyde kayıtlı sülaleler; `villages` o sülalenin toplam köy sayısı. */
  families?: { id: string; familyId: number; slug?: string; name: string; villages?: number }[];
  /** Sülale bağlarının nereden geldiği, özet metin. */
  familySource?: string;
  /** Köy verisinin kaynağı (kaynak listesi / topluluk katkısı). */
  source?: string;
  /** Eşik altındaysa gizlenir (null gelir). */
  memberCount?: number | null;
}

/** Köyde kayıtlı sülale — GET /villages/{id}/families. */
export interface VillageFamily {
  familyId: number;
  name: string;
  race?: string;
  slug?: string;
  sourceLabel?: string;
}

/**
 * Üye bildirimlerinden türetilen köy–sülale bağları.
 *
 * Üyeliği ve profilinde sülalesi olan her üye, köyü için bir bildirim sayılır.
 * Tek üye bildirirse bağ teyit bekleyen, 7 günden eski iki ayrı üye bildirirse
 * teyitli olur. Rapor yalnız sayı döndürür — kim bildirdi bilgisi hiçbir
 * yerde gösterilmez.
 */
export interface MemberLinksReport {
  dryRun: boolean;
  /** Değerlendirilen sülale–köy çifti sayısı. */
  pairs: number;
  /** Etkilenen köy sayısı. */
  villages: number;
  created: number;
  /** Yeterli bildirim olduğu için doğrudan teyitli açılanlar. */
  createdVerified: number;
  /** Teyit bekleyenden teyitliye geçenler. */
  upgraded: number;
  /** Bildirim azaldığı için teyitliden geri düşenler. */
  downgraded: number;
  /** Bildirimi kalmadığı için geri çekilenler. */
  withdrawn: number;
  unchanged: number;
  /** Moderatörün kaldırdığı, bu yüzden yeniden açılmayan bağlar. */
  blockedByModerator: number;
}

/**
 * Profil eşleştirme raporu (kuru çalıştırma ve uygulama aynı şekli döner).
 *
 * Üyelerin profilinde serbest metin olarak yazdığı sülale adlarını katalogla
 * eşler. Tek adaya oturanlar bağlanır; birden çok adaya uyanlar ve boş /
 * yer tutucu değerler ayrı sayılır, insan kararına bırakılır.
 */
export interface ProfileCleanupReport {
  dryRun: boolean;
  scanned: number;
  /** Tek adaya oturduğu için doğrudan bağlananlar. */
  autoLinked: number;
  /**
   * Yalnız düzeltilmiş backend döndürür. Alan yoksa sunucu ESKİ sürümdür ve
   * uygulamak veri bozar — sürüm işareti olarak kullanılıyor.
   */
  raceResolved?: number;
  /** Ad önerisi kuyruğuna düşenler. */
  queuedForReview: number;
  /** Birden çok sülaleye uyduğu için karar bekleyenler. */
  ambiguous: number;
  /** Eski sunucuda yok. */
  skippedPlaceholder?: number;
  /** Eski sunucuda yok. */
  skippedGroup?: number;
  manualReview: number;
  rows: { userId: string; legacy: string; action: string; candidateFamilyIds?: number[] }[];
  /**
   * Uygulama köy bağlarını da yeniden hesaplar; sonucu burada döner.
   * Kuru çalıştırmada ve eski sunucuda yoktur.
   */
  memberLinks?: MemberLinksReport;
}

/**
 * Köy arama sonucu. Kaynak: GET /auth/heritage/public/search
 * Uç en fazla 12 köy döndürür ve sorgu en az 2 karakter olmalıdır.
 */
export interface VillageHit {
  id: string;
  name: string;
  province?: string;
  district?: string;
  /** Çerkesçe / eski ad — aramada bu da taranır. */
  altName?: string;
}

/** Köylü teyidi kuyruğundaki kayıt (sülale bağı ya da Çerkesçe köy adı). Kişi bilgisi yok. */
export interface TrustItem {
  type: 'family' | 'name';
  id: string;
  village_id: string;
  label: string;
  source: string;
  added_at: string;
  villageName?: string;
  province?: string;
  district?: string;
  villageSlug?: string;
  confirms: number;
  disputes: { reason: string; created_at: string }[];
}

const ROOT = '/auth/heritage/admin/families';
const TRUST = '/auth/heritage/admin/trust';
const unwrap = <T,>(response: { data: unknown }): T => {
  const body = response.data as { data?: T } | T;
  return (body && typeof body === 'object' && 'data' in (body as object) ? (body as { data: T }).data : body) as T;
};

export const familyAtlasService = {
  async trustQueue(state: 'disputed' | 'pending'): Promise<TrustItem[]> { return unwrap(await api.get(TRUST, { params: { state } })); },
  async trustDecide(type: TrustItem['type'], id: string, action: 'keep' | 'remove'): Promise<void> {
    await api.post(`${TRUST}/${type}/${encodeURIComponent(id)}`, { action });
  },
  async dryRun(): Promise<ImportReport> { return unwrap(await api.get(`${ROOT}/import/dry-run`)); },
  async apply(): Promise<{ linked: number; newFamilies: number; excluded: number; noVillage: number }> { return unwrap(await api.post(`${ROOT}/import`)); },
  async nameSuggestions(status = 'pending'): Promise<NameSuggestion[]> { return unwrap(await api.get(`${ROOT}/suggestions`, { params: { status } })); },
  async resolveName(id: string, action: 'link' | 'create' | 'reject', familyId?: number, race?: string): Promise<void> {
    await api.post(`${ROOT}/suggestions/${encodeURIComponent(id)}`, { action, familyId, race });
  },
  async cleanupDryRun(): Promise<CleanupReport> { return unwrap(await api.get(`${ROOT}/cleanup/dry-run`)); },
  async cleanupApply(): Promise<CleanupReport> { return unwrap(await api.post(`${ROOT}/cleanup`)); },
  async mergeQueue(limit = 100): Promise<{ total: number; items: MergeItem[] }> { return unwrap(await api.get(`${ROOT}/merge-queue`, { params: { limit } })); },
  async decide(familyA: number, familyB: number, action: 'merge' | 'distinct', keep?: number): Promise<{ decisionId: string; summary: string }> {
    return unwrap(await api.post(`${ROOT}/merge`, { familyA, familyB, action, keep }));
  },
  async undo(decisionId: string): Promise<void> { await api.post(`${ROOT}/merge/${encodeURIComponent(decisionId)}/undo`); },
  async setCyrillic(familyId: number, cyrillic: string): Promise<void> { await api.put(`${ROOT}/${familyId}/cyrillic`, { cyrillic }); },
  async importInstagram(mediaCode: string, postedOn: string, comments: IgImportRow[]): Promise<{ added: number; received: number }> {
    return unwrap(await api.post(`${ROOT}/instagram/import`, { mediaCode, postedOn, comments }));
  },
  async instagram(status: 'pending' | 'used' | 'ignored' = 'pending'): Promise<{ items: IgComment[]; counts: Record<string, number> }> {
    return unwrap(await api.get(`${ROOT}/instagram`, { params: { status } }));
  },
  async link(commentId: string, body: { familyId?: number; newFamilyName?: string; race?: string; villageId: string; spelling?: string }): Promise<{ linked: boolean; slug: string }> {
    return unwrap(await api.post(`${ROOT}/instagram/${encodeURIComponent(commentId)}/link`, body));
  },
  async ignore(commentId: string): Promise<void> { await api.post(`${ROOT}/instagram/${encodeURIComponent(commentId)}/ignore`); },

  /** En çok köye yayılmış sülaleler — liste ekranının varsayılan görünümü. */
  async topFamilies(limit = 50): Promise<FamilyListItem[]> {
    return unwrap(await api.get('/auth/heritage/public/families/top', { params: { limit } })) ?? [];
  },

  /** Ad ve yazım çeşitleri üzerinden sülale araması. */
  async searchFamilies(q: string): Promise<{ exact: FamilyListItem[]; suggestions: FamilyListItem[] }> {
    const query = q.trim();
    if (query.length < 2) return { exact: [], suggestions: [] };
    const body = unwrap<{ exact?: FamilyListItem[]; suggestions?: FamilyListItem[] }>(
      await api.get('/auth/heritage/public/families/search', { params: { q: query } }),
    );
    return { exact: body?.exact ?? [], suggestions: body?.suggestions ?? [] };
  },

  /** Sülale detayı: yazım çeşitleri, kabileye göre köyler, sayılar. */
  async familyDetail(slug: string): Promise<FamilyDetail | null> {
    return unwrap(await api.get(`/auth/heritage/public/families/${encodeURIComponent(slug)}`));
  },

  /** Bir köyde kayıtlı sülaleler. */
  async villageFamilies(villageId: string): Promise<VillageFamily[]> {
    return unwrap(await api.get(`/auth/heritage/villages/${encodeURIComponent(villageId)}/families`)) ?? [];
  },

  /** Köy detayı: konum, adlar, kabileler, köydeki sülaleler, kaynak. */
  async villageDetail(id: string): Promise<VillageDetail | null> {
    return unwrap(await api.get(`/auth/heritage/public/map/villages/${encodeURIComponent(id)}`));
  },

  /** Köye sülale bağı ekle (topluluk katkısı olarak kaydedilir). */
  async addVillageFamily(villageId: string, familyId: number): Promise<void> {
    await api.post(`/auth/heritage/villages/${encodeURIComponent(villageId)}/family-links`, { familyId });
  },

  /** Üye bildirimlerinden köy–sülale bağlarını hesapla — rapor, yazma yok. */
  async memberLinksDryRun(): Promise<MemberLinksReport> {
    return unwrap(await api.get(`${ROOT}/member-links/dry-run`));
  },
  /** Aynı hesabı uygula: bağlar açılır, yükselir, düşer ya da geri çekilir. */
  async memberLinksApply(): Promise<MemberLinksReport> {
    return unwrap(await api.post(`${ROOT}/member-links`));
  },

  /** Profil sülale adlarını katalogla eşle — rapor, yazma yok. */
  async profileCleanupDryRun(): Promise<ProfileCleanupReport> {
    return unwrap(await api.get(`${ROOT}/profile-cleanup/dry-run`));
  },
  /** Aynı planı uygula: tek adaya oturanlar bağlanır, kalanı kuyruğa düşer. */
  async profileCleanupApply(): Promise<ProfileCleanupReport> {
    return unwrap(await api.post(`${ROOT}/profile-cleanup`));
  },

  /**
   * Köy kataloğunda ad/eski ad üzerinden arama.
   *
   * Yorum eşleştirme ekranında köy seçimi eskiden yalnızca yorumdan tahmin
   * edilen adaylarla sınırlıydı; aday çıkmadığında admin'in Köy Konumları
   * sayfasına gidip kimliği elle kopyalaması gerekiyordu. Bu uç, katalogun
   * tamamını aranabilir kılar.
   */
  async searchVillages(q: string): Promise<VillageHit[]> {
    const query = q.trim();
    if (query.length < 2) return [];
    const body = unwrap<{ villages?: VillageHit[] }>(
      await api.get('/auth/heritage/public/search', { params: { q: query } }),
    );
    return body?.villages ?? [];
  },
};

export interface IgImportRow { id: string; text: string; timestamp?: string }

/**
 * Yorum dosyasını içe aktarma biçimine çevirir. Kullanıcı adı, profil ve fotoğraf alanları dosyada olsa da OKUNMAZ.
 *
 * CSV (UTF-8, ilk satır başlık, virgül ya da noktalı virgül):
 *   id,text,timestamp
 *   17912345678901234,"Biz Uzunyayla Hacıosman'danız, Hatko",2026-10-16T19:42:00+0300
 * JSON: [{id,text,timestamp}], {data:[…]} (Graph API) ya da {comments:[…]} (yt-dlp).
 */
export function parseCommentFile(name: string, raw: string): IgImportRow[] {
  if (name.toLowerCase().endsWith('.csv')) return parseCsv(raw);
  const data = JSON.parse(raw) as unknown;
  const pick = (x: unknown): unknown[] => {
    if (Array.isArray(x)) return x;
    if (x && typeof x === 'object') {
      const o = x as Record<string, unknown>;
      if (Array.isArray(o.data)) return o.data;
      if (Array.isArray(o.comments)) return o.comments;
    }
    return [];
  };
  const out: IgImportRow[] = [];
  const walk = (items: unknown[]) => items.forEach((it) => {
    if (!it || typeof it !== 'object') return;
    const o = it as Record<string, unknown>;
    const text = typeof o.text === 'string' ? o.text : '';
    const id = o.id != null ? String(o.id) : '';
    if (id && text.trim()) out.push({ id, text, timestamp: o.timestamp != null ? String(o.timestamp) : undefined });
    const replies = (o.replies as { data?: unknown[] } | undefined)?.data;
    if (Array.isArray(replies)) walk(replies);
  });
  walk(pick(data));
  return out;
}

function parseCsv(raw: string): IgImportRow[] {
  const text = raw.replace(/^\uFEFF/, '');
  const sep = (text.split('\n')[0].match(/;/g)?.length ?? 0) > (text.split('\n')[0].match(/,/g)?.length ?? 0) ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell); if (row.some((x) => x.trim())) rows.push(row);
  const head = (rows.shift() ?? []).map((h) => h.trim().toLowerCase());
  const at = (k: string) => head.indexOf(k);
  if (at('id') < 0 || at('text') < 0) throw new Error('CSV başlığı en az "id,text" olmalı.');
  return rows.map((r) => ({ id: (r[at('id')] ?? '').trim(), text: r[at('text')] ?? '', timestamp: at('timestamp') >= 0 ? r[at('timestamp')]?.trim() || undefined : undefined }))
    .filter((r) => r.id && r.text.trim());
}
