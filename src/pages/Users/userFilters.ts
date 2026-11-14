/**
 * Kullanıcı listesi süzgeç durumu (docs/plan/admin-kullanicilar.md).
 * Durum URL'de tutulur: paylaşılabilir, geri tuşu çalışır. Aynı anahtarlar sunucuya da gider.
 * Gruplar arası VE, grup içi çoklu seçim VEYA (sunucuda).
 */

export type UserFilters = {
  q?: string;
  type: string[];
  status: string[];
  hometownProvince?: string;
  hometownDistrict?: string;
  villageId?: string;
  villageName?: string;
  familyId?: string;
  familyName?: string;
  villageVerified?: boolean;
  currentCity?: string;
  age: string[];
  photo?: 'yes' | 'no';
  minProfile?: number;
  hasFamily?: boolean;
  hasVillage?: boolean;
  activity?: 'today' | '7d' | '30d' | '90plus' | 'never';
  createdFrom?: string;
  createdTo?: string;
  tag?: string;
  sort?: 'created' | 'lastLogin' | 'profile' | 'name';
};

export const emptyFilters = (): UserFilters => ({ type: [], status: [], age: [] });

const LIST_KEYS = ['type', 'status', 'age'] as const;
const STRING_KEYS = [
  'q', 'hometownProvince', 'hometownDistrict', 'villageId', 'villageName', 'familyId', 'familyName',
  'currentCity', 'photo', 'activity', 'createdFrom', 'createdTo', 'tag', 'sort',
] as const;
const BOOL_KEYS = ['villageVerified', 'hasFamily', 'hasVillage'] as const;

type Loose = Record<string, unknown>;

export function filtersFromParams(p: URLSearchParams): UserFilters {
  const f: UserFilters = emptyFilters();
  const loose = f as unknown as Loose;
  for (const k of LIST_KEYS) f[k] = (p.get(k) || '').split(',').filter(Boolean);
  for (const k of STRING_KEYS) {
    const v = p.get(k);
    if (v) loose[k] = v;
  }
  for (const k of BOOL_KEYS) if (p.get(k) === 'true') loose[k] = true;
  const mp = Number(p.get('minProfile'));
  if (mp > 0) f.minProfile = mp;
  return f;
}

/** Yalnız dolu alanlar; adlar (villageName, familyName) çip yazısı için URL'de kalır, sunucu yok sayar. */
export function filtersToParams(f: UserFilters): Record<string, string> {
  const out: Record<string, string> = {};
  const loose = f as unknown as Loose;
  for (const k of LIST_KEYS) if (f[k].length) out[k] = f[k].join(',');
  for (const k of STRING_KEYS) {
    const v = loose[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') out[k] = String(v).trim();
  }
  for (const k of BOOL_KEYS) if (loose[k]) out[k] = 'true';
  if (f.minProfile && f.minProfile > 0) out.minProfile = String(f.minProfile);
  return out;
}

export const TYPE_LABEL: Record<string, string> = { INDIVIDUAL: 'Bireysel', BUSINESS: 'İşletme', ADMIN: 'Yönetici' };
export const STATUS_LABEL: Record<string, string> = { ACTIVE: 'Aktif', PENDING: 'Bekleyen', BLOCKED: 'Engelli', PASSIVE: 'Pasif' };
export const AGE_LABEL: Record<string, string> = {
  '18-24': '18–24', '25-34': '25–34', '35-44': '35–44', '45-54': '45–54', '55+': '55+', unknown: 'Belirtmemiş', '<18': '18 altı',
};
export const ACTIVITY_LABEL: Record<string, string> = {
  today: 'Bugün', '7d': 'Son 7 gün', '30d': 'Son 30 gün', '90plus': '90+ gündür yok', never: 'Hiç girmedi',
};
export const SORT_LABEL: Record<string, string> = { created: 'Son kayıt', lastLogin: 'Son giriş', profile: 'Profil doluluğu', name: 'Ad' };

export type ActiveChip = { key: string; label: string; remove: (f: UserFilters) => UserFilters };

/** "Etkin:" satırındaki silinebilir çipler. */
export function activeChips(f: UserFilters): ActiveChip[] {
  const chips: ActiveChip[] = [];
  const drop = (k: keyof UserFilters, ...extra: (keyof UserFilters)[]) => (x: UserFilters) => {
    const n = { ...x } as unknown as Loose;
    for (const key of [k, ...extra]) delete n[key];
    return n as unknown as UserFilters;
  };
  const pull = (k: 'type' | 'status' | 'age', v: string) => (x: UserFilters) => ({ ...x, [k]: x[k].filter((i) => i !== v) });
  if (f.q) chips.push({ key: 'q', label: `Arama: ${f.q}`, remove: drop('q') });
  f.type.forEach((t) => chips.push({ key: `type-${t}`, label: `Hesap: ${TYPE_LABEL[t] ?? t}`, remove: pull('type', t) }));
  f.status.forEach((s) => chips.push({ key: `status-${s}`, label: `Durum: ${STATUS_LABEL[s] ?? s}`, remove: pull('status', s) }));
  if (f.photo) chips.push({ key: 'photo', label: f.photo === 'yes' ? 'Fotoğraf var' : 'Fotoğraf yok', remove: drop('photo') });
  if (f.hometownProvince) chips.push({ key: 'hp', label: `Memleket: ${f.hometownProvince}`, remove: drop('hometownProvince') });
  if (f.hometownDistrict) chips.push({ key: 'hd', label: `Memleket ilçe: ${f.hometownDistrict}`, remove: drop('hometownDistrict') });
  if (f.villageId) chips.push({ key: 'village', label: `Köy: ${f.villageName ?? 'seçili'}`, remove: drop('villageId', 'villageName') });
  if (f.familyId) chips.push({ key: 'family', label: `Sülale: ${f.familyName ?? 'seçili'}`, remove: drop('familyId', 'familyName') });
  if (f.villageVerified) chips.push({ key: 'vv', label: 'Konumu teyitli köy', remove: drop('villageVerified') });
  if (f.currentCity) chips.push({ key: 'cc', label: `Konum: ${f.currentCity}`, remove: drop('currentCity') });
  f.age.forEach((a) => chips.push({ key: `age-${a}`, label: `Yaş: ${AGE_LABEL[a] ?? a}`, remove: pull('age', a) }));
  if (f.minProfile) chips.push({ key: 'mp', label: `Profil %${f.minProfile}+`, remove: drop('minProfile') });
  if (f.hasFamily) chips.push({ key: 'hf', label: 'Sülale eklemiş', remove: drop('hasFamily') });
  if (f.hasVillage) chips.push({ key: 'hv', label: 'Köyünü seçmiş', remove: drop('hasVillage') });
  if (f.activity) chips.push({ key: 'act', label: `Son giriş: ${ACTIVITY_LABEL[f.activity]}`, remove: drop('activity') });
  if (f.createdFrom || f.createdTo)
    chips.push({ key: 'created', label: `Kayıt: ${f.createdFrom ?? '…'} – ${f.createdTo ?? '…'}`, remove: drop('createdFrom', 'createdTo') });
  if (f.tag) chips.push({ key: 'tag', label: `Etiket: ${f.tag}`, remove: drop('tag') });
  return chips;
}

/** "Daha fazla filtre (n)": çekmecedeki alanlardan kaç tanesi etkin (arama ve sıralama hariç). */
export function drawerCount(f: UserFilters): number {
  return activeChips(f).filter((c) => c.key !== 'q').length;
}

/** Sunucuya giden sorgu: çip adları ve boşlar çıkarılır. */
export function serverQuery(f: UserFilters): Record<string, string> {
  const p = filtersToParams(f);
  delete p.villageName;
  delete p.familyName;
  return p;
}

/** "Bu ay yeni" kartı: ayın ilk günü. */
export function monthStart(today = new Date()): string {
  const d = new Date(today.getFullYear(), today.getMonth(), 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}
