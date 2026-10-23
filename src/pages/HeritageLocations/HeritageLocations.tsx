import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSnackbar } from 'notistack';
import './reviewDesk.css';
import GeocodeFinder from '../HeritageVillages/GeocodeFinder';
import ReviewMap, { SOURCE_COLOR, distanceM, satelliteConfigured, type LatLng } from './ReviewMap';
import {
  errorText, heritageReviewService,
  type BulkDistrictItem, type DecisionBody, type SourceAcceptPreview, type HistoryEntry, type QueueItem, type QueueResponse,
  type ReviewDetail, type ReviewReason, type ReviewTab,
} from '../../services/heritageReviewService';

/**
 * Köy konumu inceleme masası. Tasarım: docs/admin-panel-village.
 * Kuyruk · harita · karar paneli. Nedenler, kontroller, adaylar ve önerilen
 * karar sunucudan gelir (HeritageLocationReviewService); bu sayfa yalnız
 * çizer ve adminin seçtiği çözümleri gönderir.
 */

const TABS: { k: ReviewTab; label: string; dot: string }[] = [
  { k: 'all', label: 'Tümü', dot: '#14231a' },
  { k: 'dist', label: 'İlçe uyuşmazlığı', dot: '#8f5b00' },
  { k: 'dup', label: 'Yakın tekrar', dot: '#2b5b8c' },
  { k: 'water', label: 'Sınır ve su', dot: '#b3412a' },
  { k: 'none', label: 'Konumsuz', dot: '#6a4c93' },
  { k: 'comm', label: 'Topluluk önerisi', dot: '#6a4c93' },
  { k: 'mid', label: 'Orta güven', dot: '#8a6210' },
  { k: 'asked', label: 'Toplulukta', dot: '#6a4c93' },
];
const CHIP: Record<ReviewReason, { label: string; cls: string }> = {
  dist: { label: 'İlçe', cls: 'rchip rDist' }, dup: { label: 'Yakın tekrar', cls: 'rchip rDup' },
  water: { label: 'Sınır / su', cls: 'rchip rWater' }, none: { label: 'Konumsuz', cls: 'rchip rNone' },
  comm: { label: 'Üye önerisi', cls: 'rchip rComm' }, mid: { label: 'Orta güven', cls: 'rchip rMid' },
};
type SessionStatus = { st: 'ok' | 'rej' | 'ask' | 'skip'; text: string; decisionId?: string };
const ST: Record<SessionStatus['st'], { label: string; cls: string }> = {
  ok: { label: 'Onaylandı', cls: 'qSt sOk' }, rej: { label: 'Reddedildi', cls: 'qSt sRej' },
  ask: { label: 'Toplulukta', cls: 'qSt sAsk' }, skip: { label: 'Atlandı', cls: 'qSt sSkip' },
};
const MK = { ok: '✓', fail: '✕', warn: '!', info: 'i' } as const;
const MKC = { ok: 'mk mkOk', fail: 'mk mkFail', warn: 'mk mkWarn', info: 'mk mkInfo' } as const;
const MKL = { ok: 'Geçti', fail: 'Engel', warn: 'Dikkat', info: 'Bilgi' } as const;
const SRC_LABEL = { geo: 'GeoNames', web: 'Web kaydı', uye: 'Üye önerisi', osm: 'OSM yerleşimi', kayit: 'Kayıttaki nokta' } as const;

const trCompare = (a: string, b: string) => a.localeCompare(b, 'tr');
const meters = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1).replace('.', ',')} km` : `${Math.round(m)} m`);
const isTyping = (t: EventTarget | null) => t instanceof HTMLElement && Boolean(t.closest('input,textarea,select,[contenteditable="true"]'));

const Arrow = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>
);
const Ext = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" /></svg>
);

export default function HeritageLocations() {
  const { enqueueSnackbar } = useSnackbar();
  const [queue, setQueue] = useState<QueueResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ReviewTab>('all');
  const [il, setIl] = useState('all');
  // Varsayılan: köy açılınca en çok sülale bağı kurulacak kayıtlar önce.
  const [sort, setSort] = useState<'sulale' | 'il' | 'kolay'>('sulale');
  const [sel, setSel] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, ReviewDetail>>({});
  const [res, setRes] = useState<Record<string, Record<string, string>>>({});
  const [pos, setPos] = useState<Record<string, LatLng>>({});
  const [status, setStatus] = useState<Record<string, SessionStatus>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [moving, setMoving] = useState(false);
  const [finding, setFinding] = useState(false);
  // Kayıtta il/ilçe yoksa (koordinatsız ya da eksik önerilmiş köy) onayla birlikte gönderilir.
  const [area, setArea] = useState({ province: '', district: '' });
  const [satellite, setSatellite] = useState(false);
  const [rejOpen, setRejOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);
  const [bulk, setBulk] = useState<{ open: boolean; items: BulkDistrictItem[] | null }>({ open: false, items: null });
  const [toast, setToast] = useState<{ name: string; text: string; undo: { id: string; decisionId: string }[] } | null>(null);
  const [report, setReport] = useState<{ open: boolean; data?: SourceAcceptPreview; busy?: boolean }>({ open: false });
  const toastTimer = useRef<number | undefined>(undefined);

  // ── Veri ──
  const loadQueue = useCallback(async () => {
    setLoadError(null);
    try {
      const q = await heritageReviewService.queue();
      setQueue(q);
      setSel((cur) => (cur && q.items.some((i) => i.id === cur) ? cur : q.items.find((i) => i.state === 'pending')?.id ?? q.items[0]?.id ?? null));
    } catch (e) { setLoadError(errorText(e)); }
  }, []);
  useEffect(() => { void loadQueue(); }, [loadQueue]);

  const fetchDetail = useCallback(async (id: string, force = false) => {
    if (!force && details[id]) return;
    try {
      const d = await heritageReviewService.detail(id);
      if ('checks' in d) setDetails((cur) => ({ ...cur, [id]: d }));
    } catch (e) { enqueueSnackbar(errorText(e), { variant: 'error' }); }
  }, [details, enqueueSnackbar]);

  // ── Kuyruk görünümü ──
  const items = queue?.items ?? [];
  const decidedHere = (id: string) => Boolean(status[id] && status[id].st !== 'skip');
  const visible = useMemo(() => {
    let list = items.filter((q) => (filter === 'asked' ? q.state === 'asked' : q.state === 'pending' && (filter === 'all' || q.reasons.includes(filter))))
      .filter((q) => il === 'all' || q.province === il);
    list = sort === 'kolay' ? [...list].sort((a, b) => a.ease - b.ease)
      : sort === 'sulale' ? [...list].sort((a, b) => (b.familyLinks ?? 0) - (a.familyLinks ?? 0) || a.ease - b.ease)
      : [...list].sort((a, b) => trCompare(a.province, b.province) || trCompare(a.name, b.name));
    return list;
  }, [items, filter, il, sort]);
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: 0, dist: 0, dup: 0, water: 0, none: 0, comm: 0, mid: 0, asked: 0 };
    items.forEach((q) => {
      if (decidedHere(q.id)) return;
      if (q.state === 'asked') { c.asked++; return; }
      c.all++; q.reasons.forEach((r) => { c[r]++; });
    });
    return c;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, status]);

  const nextId = useCallback((fromId: string | null, st: Record<string, SessionStatus>) => {
    if (!visible.length) return fromId;
    const i = Math.max(0, visible.findIndex((q) => q.id === fromId));
    for (let k = 1; k <= visible.length; k++) { const q = visible[(i + k) % visible.length]; if (!st[q.id]) return q.id; }
    for (let k = 1; k <= visible.length; k++) { const q = visible[(i + k) % visible.length]; if (!st[q.id] || st[q.id].st === 'skip') return q.id; }
    return fromId;
  }, [visible]);

  // Süzgeç değişince seçili kayıt görünür listede değilse ilk bekleyene geç.
  useEffect(() => {
    if (!visible.length) return;
    if (!sel || !visible.some((q) => q.id === sel)) setSel((visible.find((q) => !status[q.id]) ?? visible[0]).id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, il, visible.length]);

  const [previews, setPreviews] = useState<Record<string, { key: string; data: ReviewDetail }>>({});
  const baseCurrent: QueueItem | undefined = items.find((q) => q.id === sel);
  const current: QueueItem | undefined = useMemo(() => {
    const prev = sel ? previews[sel]?.data : undefined;
    return baseCurrent && prev ? { ...baseCurrent, pointDistrict: prev.pointDistrict, recommendation: prev.recommendation } : baseCurrent;
  }, [baseCurrent, previews, sel]);
  const baseDetail = sel ? details[sel] : undefined;
  // Nokta konulunca/taşınınca kontroller sunucudan yeniden hesaplanır (tek doğruluk kaynağı: onay kuralları ile aynı kod).
  const pv = sel ? previews[sel]?.data : undefined;
  const detail = useMemo(() => (baseDetail && pv
    ? { ...baseDetail, checks: pv.checks, nearby: pv.nearby, boundaries: pv.boundaries, precision: pv.precision }
    : baseDetail), [baseDetail, pv]);
  useEffect(() => {
    if (!sel) return;
    void fetchDetail(sel);
    setRejOpen(false); setMoreOpen(false); setMoving(false); setFinding(false); setArea({ province: '', district: '' }); setCopied(false); setHistory(null);
    const n = nextId(sel, status);
    if (n && n !== sel) void fetchDetail(n); // sıradakini önden yükle
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel]);

  // ── Karar durumu ──
  const explicit = (sel && res[sel]) || {};
  const eff: Record<string, string> = useMemo(() => {
    if (!current) return {};
    const rec = current.recommendation;
    return { ...(rec.kind === 'approve' ? rec.resolutions : {}), ...explicit };
  }, [current, explicit]);
  const original: LatLng | null = detail && detail.latitude != null && detail.longitude != null ? { lat: detail.latitude, lng: detail.longitude } : null;
  const moved = sel ? pos[sel] ?? null : null;
  const areaProvince = (baseDetail?.province?.trim() || area.province.trim());
  const areaDistrict = (baseDetail?.district?.trim() || area.district.trim());
  useEffect(() => {
    if (!sel || !moved) return;
    const key = `${moved.lat},${moved.lng},${areaProvince},${areaDistrict}`;
    if (previews[sel]?.key === key) return;
    let live = true;
    heritageReviewService.preview(sel, { latitude: moved.lat, longitude: moved.lng, province: areaProvince, district: areaDistrict })
      .then((data) => {
        if (!live) return;
        setPreviews((cur) => ({ ...cur, [sel]: { key, data } }));
        // Kayıtta il/ilçe yoksa noktanın düştüğü ilçe alanlara yazılır (admin değiştirebilir).
        if (!areaProvince && !areaDistrict && data.province && data.district) setArea({ province: data.province, district: data.district });
      })
      .catch(() => { /* kontrol alınamazsa onayda sunucu aynı kuralları yine uygular ve nedenini söyler */ });
    return () => { live = false; };
  }, [sel, moved, areaProvince, areaDistrict, previews]);
  const point = moved ?? original;
  const st = sel ? status[sel] : undefined;
  const decided = Boolean(st && st.st !== 'skip');

  const unresolved = useMemo(() => (detail?.checks ?? []).filter((c) => {
    if (!c.key) return false;
    const v = eff[c.key];
    return !v || ((v === 'move' || v === 'place') && !moved);
  }), [detail, eff, moved]);

  const setResolution = (key: string, v: string | undefined) => {
    if (!sel) return;
    setRes((cur) => {
      const next = { ...(cur[sel] ?? {}) };
      if (v === undefined) delete next[key]; else next[key] = v;
      return { ...cur, [sel]: next };
    });
  };
  const setPoint = (p: LatLng | null) => {
    if (!sel) return;
    setPos((cur) => { const next = { ...cur }; if (p) next[sel] = p; else delete next[sel]; return next; });
  };
  const pickFix = (key: string, v: string) => {
    setResolution(key, v);
    if (v === 'move' || v === 'place') setMoving(true);
    else if (key === 'loc' && (v === 'hist' || v === 'district')) { setPoint(null); setMoving(false); }
  };
  const onMapPick = (p: LatLng) => {
    setPoint(p);
    if (detail?.checks.some((c) => c.key === 'loc')) setResolution('loc', original ? 'move' : 'place');
    setMoving(false);
  };

  const sendItems = (): string[] => {
    if (!detail || !current) return [];
    const it: string[] = [];
    Object.entries(eff).forEach(([k, v]) => {
      if (!k.startsWith('dup:')) return;
      const name = detail.nearby.find((n) => `dup:${n.id}` === k)?.name ?? 'Komşu kayıt';
      it.push(v === 'merge' ? `${name} ile birleşir` : `${name} ayrı köy`);
    });
    if (eff.ilce === 'point' && current.pointDistrict) it.push(`İlçe: ${current.pointDistrict.district}`);
    else if (eff.ilce === 'keep') it.push(`İlçe: ${current.district}`);
    if (eff.ilce === 'approx' || eff.precision === 'approx') it.push('Konum yaklaşık');
    if (eff.precision === 'exact') it.push('Konum kesin');
    if (eff.loc === 'district' && !moved) it.push('Konum ilçe düzeyinde (haritada nokta olarak çizilmez)');
    else if (eff.loc === 'hist') it.push('Tarihî konum');
    else if (moved && original) it.push(`Yeni konum, ${meters(distanceM(original, moved))}`);
    else if (moved) it.push('Yeni nokta');
    if (!it.length) it.push('Konum olduğu gibi');
    return it;
  };

  // ── İşlemler ──
  const armToast = (t: NonNullable<typeof toast>) => {
    window.clearTimeout(toastTimer.current);
    setToast(t);
    toastTimer.current = window.setTimeout(() => setToast(null), 7000);
  };
  const decide = async (body: DecisionBody, sessionSt: SessionStatus['st']) => {
    if (!sel || !current || busy) return;
    setBusy(true);
    try {
      const note = (notes[sel] ?? '').trim();
      const r = await heritageReviewService.decide(sel, { ...body, note: note || undefined });
      const nextStatus = { ...status, [sel]: { st: sessionSt, text: r.summary, decisionId: r.decisionId } };
      setStatus(nextStatus);
      armToast({ name: current.name, text: r.summary, undo: [{ id: sel, decisionId: r.decisionId }] });
      setRejOpen(false); setMoreOpen(false); setMoving(false);
      const n = nextId(sel, nextStatus);
      if (n) setSel(n);
    } catch (e) { enqueueSnackbar(errorText(e), { variant: 'error' }); }
    finally { setBusy(false); }
  };
  const missingArea = Boolean(detail && (!detail.province?.trim() || !detail.district?.trim()));
  const approve = (extra: Record<string, string> = {}) => decide({
    action: 'APPROVE',
    resolutions: { ...eff, ...extra },
    ...(moved ? { latitude: moved.lat, longitude: moved.lng } : {}),
    ...(missingArea && area.province.trim() && area.district.trim() ? { province: area.province.trim(), district: area.district.trim() } : {}),
  }, 'ok');
  const ask = () => decide({ action: 'ASK_COMMUNITY', resolutions: eff }, 'ask');
  const reject = (reason: string) => decide({ action: 'REJECT', rejectReason: reason }, 'rej');
  const skip = () => {
    if (!sel) return;
    const next = { ...status, [sel]: status[sel] ?? { st: 'skip' as const, text: 'atlandı' } };
    setStatus(next);
    const n = nextId(sel, next); if (n) setSel(n);
  };
  const undo = async (list: { id: string; decisionId: string }[]) => {
    window.clearTimeout(toastTimer.current); setToast(null);
    setBusy(true);
    try {
      for (const u of [...list].reverse()) await heritageReviewService.undo(u.id, u.decisionId);
      setStatus((cur) => { const next = { ...cur }; list.forEach((u) => delete next[u.id]); return next; });
      await Promise.all(list.map((u) => fetchDetail(u.id, true)));
      setSel(list[0].id);
      enqueueSnackbar(list.length > 1 ? `${list.length} karar geri alındı` : 'Karar geri alındı', { variant: 'info' });
    } catch (e) { enqueueSnackbar(errorText(e), { variant: 'error' }); }
    finally { setBusy(false); }
  };
  const openMore = async () => {
    const open = !moreOpen; setMoreOpen(open);
    if (open && sel) {
      try { setHistory(await heritageReviewService.history(sel)); } catch { setHistory([]); }
    }
  };
  const copy = (text: string) => {
    navigator.clipboard?.writeText(text).catch(() => undefined);
    setCopied(true); window.setTimeout(() => setCopied(false), 1600);
  };

  // Toplu ilçe düzeltme
  useEffect(() => {
    if (filter !== 'dist' || bulk.items) return;
    heritageReviewService.bulkDistrictPreview().then((items) => setBulk((b) => ({ ...b, items }))).catch(() => setBulk((b) => ({ ...b, items: [] })));
  }, [filter, bulk.items]);
  const bulkIds = (bulk.items ?? []).filter((b) => !status[b.id]).map((b) => b.id);
  const applyBulk = async () => {
    if (!bulkIds.length || busy) return;
    setBusy(true);
    try {
      const r = await heritageReviewService.bulkDistrictApply(bulkIds);
      const done = r.items.filter((x) => x.status === 'approved' && x.decisionId) as { id: string; decisionId: string }[];
      setStatus((cur) => { const next = { ...cur }; done.forEach((d) => { next[d.id] = { st: 'ok', text: 'onaylandı · ilçe noktanın ilçesine göre düzeltildi', decisionId: d.decisionId }; }); return next; });
      armToast({ name: `${done.length} kayıt`, text: 'onaylandı · ilçe noktanın ilçesine göre düzeltildi', undo: done });
      setBulk({ open: false, items: null });
      const failed = r.items.filter((x) => x.status !== 'approved').length;
      if (failed) enqueueSnackbar(`${failed} kayıt toplu düzeltmeye uygun değildi; tek tek incele.`, { variant: 'warning' });
    } catch (e) { enqueueSnackbar(errorText(e), { variant: 'error' }); }
    finally { setBusy(false); }
  };

  // Kaynak listesinden toplu kabul: tam kayıtlar haritaya girer, köylü teyidi açık kalır.
  const openReport = async () => {
    setReport({ open: true, busy: true });
    try { setReport({ open: true, data: await heritageReviewService.sourceAcceptPreview() }); }
    catch (e) { setReport({ open: false }); enqueueSnackbar(errorText(e), { variant: 'error' }); }
  };
  const applyReport = async () => {
    if (!report.data) return;
    setReport((r) => ({ ...r, busy: true }));
    try {
      const r = await heritageReviewService.sourceAcceptApply();
      enqueueSnackbar(`${r.accepted} köy haritaya eklendi${r.questions ? `, ${r.questions} köyde topluluğa soru açıldı` : ''}${r.failed.length ? `, ${r.failed.length} kayıt uygulanamadı` : ''}`, { variant: r.failed.length ? 'warning' : 'success' });
      setReport({ open: false }); setDetails({}); await loadQueue();
    } catch (e) { setReport((x) => ({ ...x, busy: false })); enqueueSnackbar(errorText(e), { variant: 'error' }); }
  };

  // Kısayollar: A onayla, R reddet, S atla, M taşı
  const primaryRef = useRef<() => void>(() => undefined);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey || report.open) return;
      const k = e.key.toLowerCase();
      if (k === 'a') { e.preventDefault(); primaryRef.current(); }
      else if (k === 'r' && !decided) { e.preventDefault(); setRejOpen((v) => !v); }
      else if (k === 's') { e.preventDefault(); skip(); }
      else if (k === 'm' && !decided && detail) { e.preventDefault(); setMoving((v) => !v); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });

  // ── Çizim değerleri ──
  const sessCount = Object.values(status).filter((s) => s.st !== 'skip').length;
  const total = queue ? queue.decided + queue.pending : 0;
  const doneTotal = (queue?.decided ?? 0) + sessCount;
  const groups = useMemo(() => {
    if (sort === 'kolay') return visible.length ? [{ label: 'Kolaydan zora', items: visible }] : [];
    if (sort === 'sulale') return visible.length ? [{ label: 'Sülale bağı bekleyen önce', items: visible }] : [];
    const m = new Map<string, QueueItem[]>();
    visible.forEach((q) => { if (!m.has(q.province)) m.set(q.province, []); m.get(q.province)!.push(q); });
    return [...m.entries()].map(([label, its]) => ({ label: label || 'İl yok', items: its }));
  }, [visible, sort]);

  const rec = current?.recommendation;
  const why = unresolved.map((c) => {
    if (c.key?.startsWith('dup:')) return `${detail?.nearby.find((n) => `dup:${n.id}` === c.key)?.name ?? 'komşu'} için yakın tekrar`;
    return ({ ilce: 'ilçe', loc: 'konum', precision: 'konum güveni' } as Record<string, string>)[c.key ?? ''] ?? 'kontrol';
  });
  let primary: { label: string; cls: string; dis: boolean; why?: string; run: () => void };
  if (decided) primary = { label: 'Sıradaki kayda geç', cls: 'btnP', dis: false, run: () => { const n = nextId(sel, status); if (n) setSel(n); } };
  else if (!detail) primary = { label: 'Onayla', cls: 'btnP', dis: true, run: () => undefined };
  else if (rec?.kind === 'ask' && unresolved.some((c) => c.key === 'loc')) primary = { label: 'Topluluğa sor', cls: 'btnP btnAsk', dis: false, why: "Konum seçersen bu düğme Onayla'ya döner.", run: () => void ask() };
  else if (!point && eff.loc !== 'district') primary = { label: 'Onayla', cls: 'btnP', dis: true, why: 'Önce haritada köyün yerine nokta koy ya da "ilçe düzeyinde onayla" seç.', run: () => undefined };
  else if (eff.loc === 'district' && !point && missingArea && !(area.province.trim() && area.district.trim())) primary = { label: 'Onayla', cls: 'btnP', dis: true, why: 'İlçe düzeyinde onay için il ve ilçeyi yazın.', run: () => undefined };
  else if (unresolved.length) primary = { label: 'Onayla', cls: 'btnP', dis: true, why: `Önce karar ver: ${[...new Set(why)].join(', ')}`, run: () => undefined };
  else primary = { label: 'Onayla', cls: 'btnP', dis: false, run: () => void approve() };
  primaryRef.current = () => { if (!primary.dis && !busy) primary.run(); };

  const legend = (() => {
    const l: { bg: string; border: string; t: string }[] = [{ bg: '#b3412a', border: '2px solid #fff', t: 'İncelenen nokta' }];
    const srcs = new Set(detail?.candidates.map((c) => c.src) ?? []);
    srcs.forEach((s) => { if (s !== 'kayit') l.push({ bg: SOURCE_COLOR[s], border: '0', t: SRC_LABEL[s] }); });
    if (detail?.nearby.length) l.push({ bg: '#fff', border: '2px solid #7d8a80', t: 'Komşu kayıt' });
    if (detail?.boundaries?.record || detail?.boundaries?.point) l.push({ bg: 'transparent', border: '2px dashed #6a4c93', t: 'İlçe sınırı' });
    return l;
  })();
  const ll = point ? { lat: point.lat.toFixed(6), lng: point.lng.toFixed(6) } : null;
  const idx = visible.findIndex((q) => q.id === sel);

  if (loadError) return <div className="hrd"><div className="loading"><div><p className="err">{loadError}</p><button type="button" className="mini" onClick={() => void loadQueue()} style={{ marginTop: 10 }}>Yeniden dene</button></div></div></div>;
  if (!queue) return <div className="hrd"><div className="loading">İnceleme kuyruğu hazırlanıyor. İlk açılışta kontroller hesaplandığı için birkaç saniye sürebilir.</div></div>;

  return (
    <div className="hrd">
      <header className="top">
        <div>
          <div className="crumb"><span>Yönetim</span><span aria-hidden="true">›</span><span>Ortak Hafıza</span><span aria-hidden="true">›</span><span>Köy konumları</span></div>
          <h1>Köy konumu inceleme</h1>
        </div>
        <div className="prog">
          <div className="progNum"><b>{doneTotal.toLocaleString('tr-TR')}</b> karara bağlandı · <b>{Math.max(0, total - doneTotal).toLocaleString('tr-TR')}</b> bekliyor<br /><span>Bu oturumda {sessCount} karar</span></div>
          <div className="progBar" role="progressbar" aria-label="İnceleme ilerlemesi" aria-valuemin={0} aria-valuemax={total} aria-valuenow={doneTotal}>
            <span className="progFill" style={{ width: `${total ? (queue.decided / total) * 100 : 0}%` }} />
            <span className="progSess" style={{ width: `${total ? (sessCount / total) * 100 : 0}%` }} />
          </div>
          <button type="button" className="report mono" onClick={() => void openReport()} title="İl, ilçe, ad ve koordinatı tam yüksek güvenli kayıtları haritaya al">Kaynaktan toplu kabul</button>
        </div>
      </header>

      <div className="filters" role="group" aria-label="İnceleme nedeni">
        {TABS.map((t) => (
          <button key={t.k} type="button" className="ftab" aria-pressed={filter === t.k} onClick={() => { setFilter(t.k); setBulk((b) => ({ ...b, open: false })); }}>
            <span className="fdot" style={{ background: t.dot }} />{t.label}<span className="n">{counts[t.k] ?? 0}</span>
          </button>
        ))}
        <span className="fsp" />
        <label className="flab" htmlFor="il-sec">İl</label>
        <select id="il-sec" className="fsel" value={il} onChange={(e) => setIl(e.target.value)}>
          <option value="all">Tüm iller</option>
          {queue.provinces.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <label className="flab" htmlFor="sira-sec">Sıra</label>
        <select id="sira-sec" className="fsel" value={sort} onChange={(e) => setSort(e.target.value as 'sulale' | 'il' | 'kolay')}>
          <option value="sulale">Sülale bağı bekleyen önce</option>
          <option value="il">İle göre</option>
          <option value="kolay">Kolaydan zora</option>
        </select>
      </div>

      <div className="body">
        <nav className="queue" aria-label="İnceleme kuyruğu">
          {filter === 'dist' && (bulk.items?.length ?? 0) > 0 && (
            <div className="bulk">
              <div className="bulkT"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2f7a46" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12l5 5L20 6" /></svg>Toplu düzeltme önerisi</div>
              <div className="bulkD">Tek sorunu ilçe adı olan ve noktası tek bir ilçenin içinde kalan kayıtlar birlikte düzeltilip onaylanabilir.</div>
              {bulk.open && (
                <ul className="bulkList">
                  {bulk.items!.map((b) => (
                    <li key={b.id}><span><b>{b.name}</b> <s>{b.from}</s> → {b.to}</span><span className={status[b.id] ? 'qSt sSkip' : 'qSt sOk'}>{status[b.id] ? 'karara bağlandı' : 'uygulanacak'}</span></li>
                  ))}
                </ul>
              )}
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" className="mini" aria-expanded={bulk.open} onClick={() => setBulk((b) => ({ ...b, open: !b.open }))}>{bulk.open ? 'Önizlemeyi kapat' : `Önizle (${bulkIds.length})`}</button>
                {bulk.open && <button type="button" className="mini" style={{ background: 'var(--brand)', color: '#fff', borderColor: 'var(--brand)' }} disabled={busy || !bulkIds.length} onClick={() => void applyBulk()}>{bulkIds.length ? `${bulkIds.length} kaydı düzelt ve onayla` : 'Uygulanacak kayıt yok'}</button>}
              </div>
            </div>
          )}
          {groups.map((g) => (
            <div className="qWrap" role="group" aria-label={g.label} key={g.label}>
              <div className="qGroup"><span>{g.label}</span><span>{g.items.length} kayıt</span></div>
              {g.items.map((q) => {
                const qs = status[q.id];
                const sub = q.district + (q.pointDistrict ? ` → nokta ${q.pointDistrict.district}` : '') + (q.oldNames[0] ? ` · eski adı ${q.oldNames[0]}` : '');
                const recCls = q.recommendation.kind === 'approve' ? 'qRec' : q.recommendation.kind === 'warn' ? 'qRec qRecWarn' : 'qRec qRecAsk';
                return (
                  <button key={q.id} type="button" className={`qItem${q.id === sel ? ' qOn' : ''}${qs && qs.st !== 'skip' ? ' qDone' : ''}`} aria-current={q.id === sel} onClick={() => setSel(q.id)}>
                    <span className="qTop"><span className="qName">{q.name}</span>{qs && <span className={ST[qs.st].cls}>{ST[qs.st].label}</span>}</span>
                    <span className="qSub">{sub}</span>
                    <span className="qChips">
                      {q.state === 'asked' && <span className="rchip rAsk">Toplulukta</span>}
                      {q.reasons.map((r) => <span key={r} className={CHIP[r].cls}>{CHIP[r].label}</span>)}
                      {(q.familyLinks ?? 0) > 0 && <span className="rchip rComm">{q.familyLinks} sülale bekliyor</span>}
                    </span>
                    {!qs && <span className={recCls}><Arrow />{q.recommendation.title}</span>}
                  </button>
                );
              })}
            </div>
          ))}
          {visible.length === 0 && <div className="qEmpty">Bu süzgeçte bekleyen kayıt yok.</div>}
        </nav>

        <section className="mapCol" aria-label="Harita">
          <div className="map">
            <ReviewMap detail={detail ?? null} original={original} point={point} moving={moving} satellite={satellite} onPick={onMapPick} />
            <div className="mapBar">
              <div className="mapGrp">
                <div className="seg" role="group" aria-label="Harita türü">
                  <button type="button" className="segBtn" aria-pressed={!satellite} onClick={() => setSatellite(false)}>Harita</button>
                  <button type="button" className="segBtn" aria-pressed={satellite} disabled={!satelliteConfigured} title={satelliteConfigured ? undefined : 'Uydu katmanı yapılandırılmamış; sağdaki Google uydu bağlantısını kullan.'} onClick={() => setSatellite(true)}>Uydu</button>
                </div>
                {detail && !decided && (
                  <button type="button" className="mapBtn" aria-pressed={moving} onClick={() => setMoving((v) => !v)}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2v20M2 12h20" /><path d="m9 5 3-3 3 3M9 19l3 3 3-3M5 9l-3 3 3 3M19 9l3 3-3 3" /></svg>
                    {moving ? 'Taşımayı bırak' : point ? 'Noktayı taşı' : 'Nokta koy'}
                  </button>
                )}
                {moved && original && !decided && (
                  <button type="button" className="mapBtn" onClick={() => { setPoint(null); if (explicit.loc === 'move') setResolution('loc', undefined); }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg>İlk konuma dön
                  </button>
                )}
              </div>
              {ll && (
                <div className="mapGrp">
                  <a className="mapBtn" href={`https://www.google.com/maps/@${ll.lat},${ll.lng},900m/data=!3m1!1e3`} target="_blank" rel="noopener noreferrer">Google uydu<Ext /></a>
                  <a className="mapBtn" href={`https://yandex.com.tr/harita/?ll=${ll.lng}%2C${ll.lat}&z=16&l=sat&pt=${ll.lng}%2C${ll.lat}`} target="_blank" rel="noopener noreferrer">Yandex<Ext /></a>
                </div>
              )}
            </div>
            {moving && <div className="mapHint" role="status">{point ? 'Yeni konum için haritaya tıkla' : 'Köyün yerine tıkla, nokta koy'}</div>}
            {detail && !point && !moving && (
              <div className="noLoc">
                <div className="noLocCard">
                  <div style={{ fontWeight: 800, fontSize: 15 }}>Bu kaydın konumu yok</div>
                  <p style={{ margin: '6px 0 12px', color: 'var(--muted)', fontSize: 13 }}>Haritada köyün yerine tıklayarak nokta koy ya da bir adayı seç. Bulamazsan atla.</p>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                    <button type="button" className="mini" onClick={() => setMoving(true)}>Haritada işaretle</button>
                    <button type="button" className="mini" aria-pressed={finding} onClick={() => setFinding((v) => !v)}>Konumu bul (Google / OpenStreetMap)</button>
                  </div>
                  {finding && (
                    <div style={{ marginTop: 12, textAlign: 'left' }}>
                      <GeocodeFinder query={detail.name} province={detail.province} district={detail.district} onPick={(c) => {
                        onMapPick({ lat: c.latitude, lng: c.longitude });
                        // Kayıtta il/ilçe yoksa bulunan yerin il/ilçesi önerilir (admin düzeltebilir).
                        if (missingArea && c.province && c.district) setArea({ province: c.province, district: c.district });
                        setFinding(false);
                      }} />
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="legend" aria-hidden="true">
              {legend.map((l) => <span className="lg" key={l.t}><span className="lgDot" style={{ background: l.bg, border: l.border }} />{l.t}</span>)}
            </div>
          </div>
        </section>

        <aside className="panel" aria-label="Karar paneli">
          <div className="pScroll">
            {!current ? <div className="qEmpty">Seçili kayıt yok.</div> : !detail ? <div className="qEmpty">Kayıt yükleniyor…</div> : (
              <div className="pIn" key={detail.id}>
                <div className="pEyebrow"><span>{idx >= 0 ? `${idx + 1} / ${visible.length}` : ''}</span><span>{detail.type === 'village' ? 'Yeni köy kaydı' : detail.confidence ? `Kaynak güveni ${detail.confidence}` : 'Mevcut köy'}</span></div>
                <h2 className="pName">{detail.name}</h2>
                {detail.oldNames.length > 0 && <div className="ady serif">{detail.oldNames.join(' · ')}</div>}
                {missingArea ? (
                  <div className="pPlace" style={{ display: 'grid', gap: 6 }}>
                    <span style={{ color: 'var(--muted)', fontSize: 12.5 }}>Kayıtta il ve ilçe yok. Yazın ya da boş bırakın: onaylanınca noktanın düştüğü ilçe kullanılır.</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input className="fsel" style={{ flex: 1, minWidth: 0 }} placeholder="İl" value={area.province} onChange={(e) => setArea((a) => ({ ...a, province: e.target.value }))} />
                      <input className="fsel" style={{ flex: 1, minWidth: 0 }} placeholder="İlçe" value={area.district} onChange={(e) => setArea((a) => ({ ...a, district: e.target.value }))} />
                    </div>
                  </div>
                ) : (
                  <div className="pPlace">
                    {detail.province} · {eff.ilce === 'point' && current.pointDistrict ? <><s>{detail.district}</s> → <b>{current.pointDistrict.district}</b></> : detail.district}
                  </div>
                )}
                <div className="tags">
                  {detail.groups && <span className="tag">{detail.groups}</span>}
                  {detail.families && <span className="tag">Sülaleler: {detail.families}</span>}
                  {detail.sources.map((s) => <span className="tag" key={s} title={s}>Kaynak: {s}</span>)}
                  {detail.contributor && <span className="tag">Öneren: {detail.contributor.display_name ?? 'üye'} · {detail.contributor.approved ?? 0}/{detail.contributor.total ?? 0} kabul</span>}
                </div>
                <div className="coord">
                  <span className="mono coordV">{point ? `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}` : 'Koordinat yok'}</span>
                  {point && <button type="button" className="mini" onClick={() => copy(`${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}`)}>{copied ? 'Kopyalandı' : 'Kopyala'}</button>}
                  {detail.geonames && <a className="mini mono" href={detail.geonames.url} target="_blank" rel="noopener noreferrer">GeoNames {detail.geonames.id}</a>}
                </div>

                {decided && st && (
                  <div className="rec recDone">
                    <div className="recL">Karara bağlandı</div>
                    <div className="recT"><span className={ST[st.st].cls.split(' ')[1]}>{ST[st.st].label}</span></div>
                    <p className="recW">{st.text}</p>
                    {st.decisionId && <div style={{ marginTop: 10 }}><button type="button" className="mini" disabled={busy} onClick={() => void undo([{ id: detail.id, decisionId: st.decisionId! }])}>Kararı geri al</button></div>}
                  </div>
                )}

                {!decided && rec && (
                  <div className={`rec${rec.kind === 'approve' ? '' : rec.kind === 'warn' ? ' recWarn' : ' recAsk'}`}>
                    <div className="recL"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z" /></svg>Önerilen karar</div>
                    <div className="recT">{rec.title}</div>
                    <p className="recW">{rec.why}</p>
                  </div>
                )}

                {detail.taskVotes && (
                  <div className="rec recAsk">
                    <div className="recL">Topluluk yanıtları</div>
                    <div className="recT" style={{ fontSize: 15 }}>{detail.taskVotes.question}</div>
                    {detail.taskVotes.votes.length === 0 ? <p className="recW">Henüz yanıt yok.</p>
                      : detail.taskVotes.votes.map((v) => <p className="recW" key={v.answer}><b>{v.n}</b> · {v.answer}</p>)}
                  </div>
                )}

                <div className="sect">
                  <div className="sectH"><span>Kontroller</span><span>{(() => {
                    let f = 0, w = 0;
                    detail.checks.forEach((c) => { const ok = c.key && explicit[c.key] && !((explicit[c.key] === 'move' || explicit[c.key] === 'place') && !moved); if (ok) return; if (c.mk === 'fail') f++; if (c.mk === 'warn') w++; });
                    return f || w ? [f ? `${f} engel` : '', w ? `${w} uyarı` : ''].filter(Boolean).join(' · ') : 'Hepsi tamam';
                  })()}</span></div>
                  {detail.checks.map((c, i) => {
                    const chosen = c.key ? explicit[c.key] : undefined;
                    const resolved = chosen && !((chosen === 'move' || chosen === 'place') && !moved);
                    const mk = resolved ? 'ok' : c.mk;
                    const label = c.options.find((o) => o.v === chosen)?.label;
                    return (
                      <div className="chk" key={`${c.key ?? 'c'}-${i}`}>
                        <span className={MKC[mk]} role="img" aria-label={MKL[mk]}>{MK[mk]}</span>
                        <div>
                          <div className="chkT">{c.title}</div>
                          <div className="chkD">{resolved ? `Karar: ${label ?? 'noktayı elle taşıdın'}.` : c.detail}</div>
                          {c.key && c.options.length > 0 && !decided && (
                            <div className="fixes">
                              {c.options.map((o) => (
                                <button key={o.v} type="button" className="fix" aria-pressed={eff[c.key!] === o.v} onClick={() => pickFix(c.key!, o.v)}>
                                  {o.label}{rec?.kind === 'approve' && rec.resolutions[c.key!] === o.v && <span style={{ fontSize: 10.5, fontWeight: 600, opacity: 0.7 }}>önerilen</span>}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {detail.candidates.length > 0 && (
                  <div className="sect">
                    <div className="sectH"><span>Konum adayları</span><span>{detail.candidates.length}</span></div>
                    {detail.candidates.map((c) => {
                      const isCurrent = c.distance === 0 && original != null;
                      const on = moved ? distanceM(moved, { lat: c.latitude, lng: c.longitude }) < 2 : isCurrent;
                      return (
                        <div className={`cand${on ? ' candOn' : ''}`} key={c.n}>
                          <span className="num" style={{ background: SOURCE_COLOR[c.src] }}>{c.n}</span>
                          <div style={{ minWidth: 0 }}><div className="candT">{c.title}</div><div className="candD">{c.detail}</div></div>
                          {!decided && (
                            <button type="button" className="mini" aria-pressed={on} onClick={() => {
                              if (isCurrent) { setPoint(null); if (explicit.loc === 'move') setResolution('loc', undefined); }
                              else { setPoint({ lat: c.latitude, lng: c.longitude }); if (detail.checks.some((k) => k.key === 'loc')) setResolution('loc', original ? 'move' : 'place'); }
                              setMoving(false);
                            }}>{on ? 'Seçili' : 'Bu noktayı seç'}</button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="more">
                  <button type="button" className="moreBtn" aria-expanded={moreOpen} onClick={() => void openMore()}><span>Diğer işlemler, geçmiş ve not</span><span aria-hidden="true">{moreOpen ? '−' : '+'}</span></button>
                  {moreOpen && (
                    <>
                      {!decided && (
                        <>
                          <div className="act"><div><div className="actT">Yaklaşık konum olarak onayla</div><div className="actD">Haritada içi boş nokta olarak görünür; köylüler teyit edebilir.</div></div><button type="button" className="mini" disabled={busy || !point} onClick={() => void approve({ precision: 'approx' })}>Uygula</button></div>
                          <div className="act"><div><div className="actT">Tarihî konum olarak onayla</div><div className="actD">Köy taşındıysa ya da su altında kaldıysa eski yeri saklanır; haritada gösterilmez.</div></div><button type="button" className="mini" disabled={busy || !original || detail.type === 'village'} onClick={() => void approve({ loc: 'hist' })}>Uygula</button></div>
                        </>
                      )}
                      <div className="sectH" style={{ marginTop: 14 }}><span>Kayıt geçmişi</span><span>{history?.length ?? ''}</span></div>
                      {history === null ? <div className="histD">Yükleniyor…</div> : history.length === 0 ? <div className="histD">Bu kayıt için karar geçmişi yok.</div> : history.map((h) => (
                        <div className="hist" key={h.id}>
                          <div className="histT">{h.payload?.summary ?? h.action}{h.undone_at ? ' · geri alındı' : ''}</div>
                          <div className="histD">{new Date(h.created_at).toLocaleString('tr-TR')} · {h.admin_name ?? 'admin'}{h.payload?.note ? ` · “${h.payload.note}”` : ''}</div>
                          {h.undoable && !h.undone_at && <button type="button" className="mini" style={{ marginTop: 6 }} disabled={busy} onClick={() => void undo([{ id: detail.id, decisionId: h.id }])}>Bu kararı geri al</button>}
                        </div>
                      ))}
                      <label htmlFor="karar-notu" style={{ display: 'block', fontWeight: 700, fontSize: 13, margin: '14px 0 6px' }}>Karar notu <span style={{ fontWeight: 500, color: 'var(--muted)' }}>(isteğe bağlı, kayıt geçmişinde görünür)</span></label>
                      <textarea id="karar-notu" className="note" value={notes[detail.id] ?? ''} maxLength={900} onChange={(e) => setNotes((n) => ({ ...n, [detail.id]: e.target.value }))} placeholder="Örneğin: köyden bir üye telefonda teyit etti." />
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="foot">
            {rejOpen && !decided && (
              <div className="rej">
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ember)' }}>Neden reddediyorsun?</div>
                <div className="rejOpts">{queue.rejectReasons.map((o) => <button key={o} type="button" className="rejOpt" disabled={busy} onClick={() => void reject(o)}>{o}</button>)}</div>
              </div>
            )}
            {detail && !decided && !unresolved.length && point && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center', fontSize: 12, color: 'var(--muted)' }}>
                <span>Gönderilecek:</span>
                {sendItems().map((s) => <span key={s} className="tag" style={{ color: 'var(--ink)', background: '#f1f6f2', borderColor: '#cfe0d2' }}>{s}</span>)}
              </div>
            )}
            <button type="button" className={primary.cls} aria-disabled={primary.dis || busy} onClick={() => { if (!primary.dis && !busy) primary.run(); }}>{busy ? 'Kaydediliyor…' : primary.label}<Arrow /></button>
            {primary.why && !decided && <div className="footWhy">{primary.why}</div>}
            <div className="footRow">
              <button type="button" className="btnS" style={{ color: 'var(--violet)' }} disabled={busy || decided || !detail?.villageId || current?.state === 'asked'} title={!detail?.villageId ? 'Köy sayfası olmayan kayıt topluluğa sorulamaz.' : undefined} onClick={() => void ask()}>Topluluğa sor</button>
              <button type="button" className="btnS btnDanger" aria-expanded={rejOpen} disabled={busy || decided || !detail} onClick={() => setRejOpen((v) => !v)}>Reddet</button>
              <button type="button" className="btnS" onClick={skip}>Atla</button>
            </div>
            <div className="keys">Kısayollar: <span className="kbd">A</span> onayla <span className="kbd">R</span> reddet <span className="kbd">S</span> atla <span className="kbd">M</span> taşı</div>
          </div>
        </aside>
      </div>

      {toast && (
        <div className="toast" role="status">
          <span className="toastIc" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12l5 5L20 6" /></svg></span>
          <span className="toastT"><b>{toast.name}</b> {toast.text}</span>
          <button type="button" className="undo" disabled={busy} onClick={() => void undo(toast.undo)}>Geri al</button>
        </div>
      )}

      {report.open && (
        <div className="dlgBack" role="dialog" aria-modal="true" aria-labelledby="rapor-baslik" onClick={(e) => { if (e.target === e.currentTarget && !report.busy) setReport({ open: false }); }}>
          <div className="dlg">
            <h2 id="rapor-baslik">Kaynaktan toplu kabul</h2>
            {!report.data ? <p>Kayıtlar kontrol ediliyor…</p> : (
              <>
                <p>Kaynak güveni yüksek; il, ilçe, köy adı ve koordinatı tam olan kayıtlar haritaya alınır. Bunlar &quot;admin teyitli&quot; sayılmaz, &quot;kaynaktan kabul&quot; olarak görünür; köylüler teyit edebilir. İlçe sınırı ya da yakın tekrar şüphesi olan köyde, köy sayfasında topluluğa soru açılır.</p>
                <div className="dlgRow"><span>Haritaya girecek</span><b style={{ color: 'var(--ok)' }}>{report.data.accept}</b></div>
                <div className="dlgRow"><span>Bunlardan topluluğa soru açılacak</span><b>{report.data.questions}</b></div>
                <div className="dlgRow"><span>Kuyrukta kalacak</span><b>{report.data.left.length}</b></div>
                {report.data.left.length > 0 && (
                  <ul className="bulkList" style={{ maxHeight: 180, overflow: 'auto', marginTop: 8 }}>
                    {report.data.left.map((l) => <li key={l.id}><span><b>{l.name}</b> · {l.province} / {l.district}</span><span className="qSt sSkip">{l.reason}</span></li>)}
                  </ul>
                )}
                <p style={{ fontSize: 12.5, color: 'var(--muted)' }}>Orta ve düşük güvenli, koordinatı olmayan kayıtlar bu işleme girmez; kuyrukta tek tek incelenir. Her kabul kayıt geçmişine yazılır ve tek tek geri alınabilir.</p>
              </>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="button" className="btnS" disabled={report.busy} onClick={() => setReport({ open: false })}>Kapat</button>
              {report.data && report.data.accept > 0 && <button type="button" className="btnP" style={{ minHeight: 40, fontSize: 14 }} disabled={report.busy} onClick={() => void applyReport()}>{report.busy ? 'Haritaya alınıyor…' : `${report.data.accept} köyü haritaya al`}</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
