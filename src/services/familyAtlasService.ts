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
