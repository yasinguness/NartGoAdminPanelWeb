/**
 * İhale eşleştirme konsolu — üç bölüm: **liste | detay | yönlendirme kuyruğu.**
 *
 * Çekirdek prensip değişmedi (bkz. `docs/plan/nb-ihale-modulu.md`):
 * *sistem önerir, insan karar verir.* Skorlar yalnız aday üretir; otomatik
 * toplu bildirim yok.
 *
 * Değişen, kararın **nasıl** verildiği. Önceki ekranda her eşleşen üyenin
 * yanında bir "Yönlendir" butonu vardı ve her biri kendi taslak penceresini
 * açıyordu: sekiz üyeye yönlendirmek sekiz pencere, sekiz onay demekti.
 * Oysa iş doğal olarak toplu: bir ihale gelir, ona uyan birkaç üye seçilir,
 * hepsine aynı anda haber verilir. Yeni akış bunu izliyor —
 * **çoklu seçim → tek önizleme → tek gönderim.**
 *
 * İki kanal korunuyor:
 * - **Uygulama bildirimi** — üyeye anında düşer, kaydı burada tutulur.
 * - **WhatsApp** — sistem taslak üretir, mesajı admin kendi gönderir.
 *
 * **Ödeme duvarı:** ödemesi bekleyen üyeler de listede çıkar ve rozetlenir.
 * Onlara yönlendirme yapmak kasıtlıdır: bildirim ulaşır, ihalenin başlığı,
 * idaresi ve kaynak bağlantısı ulaşmaz. Taslak da kapalı üretilir — sistem,
 * uyardığı sızıntıyı kendisi hazırlamamalı.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  LinearProgress,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  nbAdminService,
  NB_TENDER_STATUS_LABEL,
  NB_TENDER_REFERRAL_STATUS_LABEL,
  type NbTenderDetail,
  type NbTenderListItem,
  type NbTenderMatch,
  type NbTenderChannel,
  type NbTenderReferralStatus,
  type NbTenderStatus,
} from '../../services/nartbusiness/nbAdminService';
import { relativeDate } from '../../utils/nbDisplay';
import {
  NbFilterBar,
  NbKpi,
  NbPageHeader,
  NbUndoToast,
  nbCard,
  nbChip,
  nbDividerLine,
  nbLabel,
  nbMono,
  nbPill,
  nbPrimaryBtn,
  nbSecondaryBtn,
  nbSelectedRow,
  type NbUndoState,
} from '../../components/nartbusiness/ui';
import { nb, nbRadius, URGENCY_STYLE, urgencyOf } from '../../theme/nbBrand';
import { nbErrorMessage } from '../../services/nartbusiness/nbErrorMessage';
import { matchReason, tenderMatchTags } from './nbTenderMatch';

/* ── Yardımcılar ──────────────────────────────────────────────────────── */

/**
 * Son teklife kalan tam gün. Tarih yoksa/bozuksa null.
 *
 * Aciliyet eşikleri panelin geri kalanıyla ortak (`urgencyOf`): deneme
 * süresi bitişinde kullanılan kademelerin aynısı. İhale son teklifi de
 * birebir aynı problem, ikinci bir eşik seti tanımlamaya gerek yok.
 */
function daysUntil(iso?: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) return null;
  return Math.ceil((ms - Date.now()) / 86_400_000);
}

/** Kalan gün etiketi — listede ve önizlemede aynı ifade. */
function deadlineLabel(days: number | null): string {
  if (days == null) return 'tarih yok';
  if (days < 0) return 'süresi doldu';
  if (days === 0) return 'bugün son';
  if (days === 1) return 'yarın son';
  return `${days} gün`;
}

function formatDeadline(iso?: string | null): string {
  if (!iso) return 'belirtilmemiş';
  try {
    return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return iso;
  }
}

/** Hızlı filtreler — hepsi çoklu seçim, hepsi gelen liste üzerinde çalışır. */
type QuickKey = 'urgent' | 'strong' | 'construction' | 'untouched';

const QUICK_FILTERS: { key: QuickKey; label: string }[] = [
  { key: 'urgent', label: '≤6 gün' },
  { key: 'strong', label: '%85+ eşleşme' },
  { key: 'construction', label: 'Yapım işleri' },
  { key: 'untouched', label: 'Hiç yönlendirilmemiş' },
];

/**
 * Sıralama.
 *
 * Varsayılan **son teklif tarihi**, eşleşme sayısı değil. Eşleşme sayısına
 * göre sıralamak, geniş ama zayıf eşleşen bir ihaleyi tek ve kuvvetli
 * eşleşeni olan ihalenin önüne koyuyordu; oysa on gevşek aday, bir sağlam
 * adaydan değerli değil. Kuyruğun sırasını belirleyen şey **güncellik ve
 * hazırlanabilirlik** olmalı: bugün üzerinde çalışılabilecek iş, en çok
 * isim taşıyan iş değil.
 *
 * "Skor" seçeneği kaldırıldı: skor üye başına ölçülüyor ve liste ucu onu
 * taşımıyordu. Adı "skor" olup aslında eşleşme sayısına göre sıralayan bir
 * seçenek, kullanıcıya yanlış söyler.
 */
type SortKey = 'deadline' | 'matches';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'deadline', label: 'Son teklif' },
  { key: 'matches', label: 'Eşleşme sayısı' },
];

/** Günlük hedef — yöneticinin kendi hedefi, sistemin ölçtüğü bir değer değil. */
const TARGET_KEY = 'nb.tenders.dailyTarget';
const DEFAULT_TARGET = 15;

/** Kuyruğa alınmış tek satır. */
interface QueueItem {
  memberId: string;
  memberName: string;
  score: number;
  paywalled: boolean;
}

export default function NbTenders() {
  const [statusFilter, setStatusFilter] = useState<NbTenderStatus>('NEW');
  const [tenders, setTenders] = useState<NbTenderListItem[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<NbTenderDetail | null>(null);

  const [listLoading, setListLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [undo, setUndo] = useState<NbUndoState | null>(null);

  // Süresi geçmiş ihaleler sunucudan varsayılan olarak hiç gelmiyor:
  // yönlendirilemezler, kuyrukta yalnız yer kaplarlar. Arşiv bakışı için
  // geri çağrılabilirler.
  const [includeExpired, setIncludeExpired] = useState(false);

  const [quick, setQuick] = useState<Record<QuickKey, boolean>>({
    urgent: false, strong: false, construction: false, untouched: false,
  });
  const [sortBy, setSortBy] = useState<SortKey>('deadline');
  const [search, setSearch] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);

  /* ── Kuyruk ─────────────────────────────────────────────────────────── */
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [channel, setChannel] = useState<NbTenderChannel>('IN_APP');
  const [queueNote, setQueueNote] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewText, setPreviewText] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [sending, setSending] = useState(false);

  /** Bugünün hedefi — panelde ayarlanır, tarayıcıda kalır. */
  const [target, setTarget] = useState(() => {
    try {
      const raw = localStorage.getItem(TARGET_KEY);
      const n = raw ? Number(raw) : NaN;
      return Number.isFinite(n) && n > 0 ? n : DEFAULT_TARGET;
    } catch {
      return DEFAULT_TARGET;
    }
  });

  /* ── Yükleme ────────────────────────────────────────────────────────── */

  // Adlandırılmış seçenekler bilinçli: imza (status, keepSelection) iken
  // araya bir bayrak eklemek üç çağrı yerinin anlamını sessizce değiştirmişti
  // (keepSelection=true, includeExpired=true'ya dönüşüyordu).
  const loadList = useCallback(
    async (opts: {
      status: NbTenderStatus;
      includeExpired: boolean;
      keepSelection?: boolean;
    }) => {
      const { status, includeExpired: withExpired, keepSelection = false } = opts;
      // SWR: liste zaten doluyken spinner'a kurban etme.
      setListLoading((prev) => prev || tenders.length === 0);
      setError(null);
      try {
        const [page, c] = await Promise.all([
          nbAdminService.listTenders({ status, includeExpired: withExpired, page: 0, size: 50 }),
          nbAdminService.getTenderCounts(),
        ]);
        setTenders(page.content);
        setCounts(c);
        if (!keepSelection) setSelectedId(page.content[0]?.id ?? null);
      } catch (e) {
        setError(nbErrorMessage(e, 'İhaleler yüklenemedi.'));
      } finally {
        setListLoading(false);
      }
    },
    [tenders.length],
  );

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      setDetail(await nbAdminService.getTenderDetail(id));
    } catch (e) {
      setError(nbErrorMessage(e, 'İhale detayı yüklenemedi.'));
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList({ status: statusFilter, includeExpired });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, includeExpired]);

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
    else setDetail(null);
  }, [selectedId, loadDetail]);

  // İhale değişince kuyruk boşalır. Kuyruk **bir ihaleye** aittir; başka
  // ihaleden seçilmiş üyelerin yanlışlıkla buraya gönderilmesi geri
  // alınamaz bir hata olurdu.
  useEffect(() => {
    setQueue([]);
    setQueueNote('');
  }, [selectedId]);

  useEffect(() => {
    try {
      localStorage.setItem(TARGET_KEY, String(target));
    } catch {
      // Depolama kapalıysa hedef yalnız bu oturumda geçerli olur.
    }
  }, [target]);

  /* ── Türetilmiş liste ───────────────────────────────────────────────── */

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    let base = tenders;

    if (q) {
      base = base.filter((t) =>
        [t.title, t.province, t.authority, t.externalId].filter(Boolean).join(' ').toLowerCase().includes(q),
      );
    }
    if (quick.urgent) {
      base = base.filter((t) => {
        const d = daysUntil(t.deadline);
        return d != null && d <= 6;
      });
    }
    if (quick.construction) {
      base = base.filter((t) => (t.tenderType ?? '').toLocaleLowerCase('tr').includes('yapım'));
    }
    if (quick.untouched) {
      // "Hiç yönlendirilmemiş" ancak detay yüklendiğinde kesin bilinir;
      // listede taşınan bilgi eşleşme sayısı. Bu yüzden filtre, eşleşmesi
      // olup da henüz hiç işlenmemiş (yeni) kayıtları gösterir.
      base = base.filter((t) => t.matchCount > 0 && t.status === 'NEW');
    }
    // "%85+ eşleşme" listede değil detayda ölçülebilir; seçili ihalede
    // güçlü eşleşme yoksa listeyi süzmek yerine detayda işaretleniyor.

    const byDeadline = (t: NbTenderListItem) => {
      const d = daysUntil(t.deadline);
      // Tarihi olmayan kayıt sona: sıralamada öne geçip yer kapmasın.
      return d == null ? Number.MAX_SAFE_INTEGER : d;
    };

    return [...base].sort((a, b) => {
      if (sortBy === 'matches') return b.matchCount - a.matchCount || byDeadline(a) - byDeadline(b);
      // Süresi geçmiş kayıtlar her hâlükârda sona: üzerinde yapılacak iş yok.
      const expiredA = byDeadline(a) < 0 ? 1 : 0;
      const expiredB = byDeadline(b) < 0 ? 1 : 0;
      return expiredA - expiredB || byDeadline(a) - byDeadline(b) || b.matchCount - a.matchCount;
    });
  }, [tenders, search, quick, sortBy]);

  const zeroMatchCount = useMemo(() => tenders.filter((t) => t.matchCount === 0).length, [tenders]);

  /** Son teklifine 3 gün ve altı kalan ihaleler — kuyruğun gerçek aciliyeti. */
  const urgentCount = useMemo(
    () =>
      tenders.filter((t) => {
        const d = daysUntil(t.deadline);
        return d != null && d >= 0 && d <= 3;
      }).length,
    [tenders],
  );

  const referredIds = useMemo(
    () => new Set((detail?.referrals ?? []).map((r) => r.memberId)),
    [detail],
  );

  /**
   * Bu üyeye bu ihale daha önce yönlendirildi mi?
   *
   * İki kaynak var ve ikisi de tek başına eksik: `detail.referrals` yalnız
   * bu oturumda yüklenen kayıtları taşır, `alreadyReferred` ise backend'in
   * kendi bayrağı. Biri "hayır" derken diğeri "evet" diyebilir; mükerrer
   * bildirim riskinde temkinli taraf "evet"tir.
   */
  const alreadySent = useCallback(
    (m: NbTenderMatch) => m.alreadyReferred || referredIds.has(m.memberId),
    [referredIds],
  );

  /** Bugün gönderilen yönlendirme sayısı — "bugün işlenen" bundan gelir. */
  const doneToday = useMemo(() => {
    const today = new Date().toDateString();
    return (detail?.referrals ?? []).filter((r) => new Date(r.createdAt).toDateString() === today).length;
  }, [detail]);

  // Kendi useMemo'su: `detail?.matches ?? []` her render'da yeni bir dizi
  // üretiyor ve aşağıdaki memo'ları boşa tetikliyordu.
  const matches = useMemo(() => detail?.matches ?? [], [detail]);
  const strongMatches = useMemo(() => matches.filter((m) => m.score >= 85).length, [matches]);

  const visibleMatches = useMemo(
    () => (quick.strong ? matches.filter((m) => m.score >= 85) : matches),
    [matches, quick.strong],
  );

  /* ── Eylemler ───────────────────────────────────────────────────────── */

  const toggleQueue = useCallback(
    (m: NbTenderMatch) => {
      setQueue((prev) =>
        prev.some((q) => q.memberId === m.memberId)
          ? prev.filter((q) => q.memberId !== m.memberId)
          : [...prev, { memberId: m.memberId, memberName: m.memberName, score: m.score, paywalled: m.paywalled }],
      );
    },
    [],
  );

  /**
   * Ödemesi bekleyen üyeye gidecek taslak — ihaleyi **tarif eder, tanımlamaz.**
   * İl, iş türü ve kalan gün var; başlık, idare ve kaynak bağlantısı yok.
   */
  const gatedDraft = useCallback(
    (memberName: string) => {
      if (!detail) return '';
      const days = daysUntil(detail.deadline);
      return [
        `Merhaba ${memberName},`,
        '',
        `Ağımıza düşen bir ihale senin iş alanına uyuyor — ${[detail.province, detail.tenderType]
          .filter(Boolean)
          .join(' · ')}, son teklife ${deadlineLabel(days)}.`,
        '',
        'İhalenin detaylarını paylaşabilmem için üyeliğinin aktif olması gerekiyor.',
        'İlgilenirsen üyeliğini tamamlayalım, süreci birlikte değerlendirelim.',
        '',
        'Selamlar',
      ].join('\n');
    },
    [detail],
  );

  /**
   * Önizleme: kuyruktaki **ilk** üyenin taslağı gösterilir.
   *
   * Her üye için ayrı metin üretip yan yana göstermek pencereyi okunmaz
   * yapardı; metinler zaten yalnız hitap satırında farklılaşıyor. Kuyrukta
   * ödemesi bekleyen üye varsa onların kapalı metin alacağı ayrıca yazılı.
   */
  const openPreview = useCallback(async () => {
    if (!detail || queue.length === 0) return;
    // Klavye kısayolu (Y) da buradan geçer; engel tek yerde dursun.
    if (daysUntil(detail.deadline) != null && daysUntil(detail.deadline)! < 0) {
      setError('Son teklif tarihi geçmiş bir ihale yönlendirilemez. Kayıt takip için arşivlenebilir.');
      return;
    }
    setPreviewOpen(true);
    setPreviewLoading(true);
    try {
      const first = queue[0];
      const text = first.paywalled
        ? gatedDraft(first.memberName)
        : await nbAdminService.getTenderDraft(detail.id, first.memberId);
      setPreviewText(text);
    } catch (e) {
      setError(nbErrorMessage(e, 'Taslak üretilemedi.'));
      setPreviewText('');
    } finally {
      setPreviewLoading(false);
    }
  }, [detail, queue, gatedDraft]);

  /**
   * Kuyruğu gönder.
   *
   * Toplu uç yok; istekler **sırayla** gidiyor. Paralel göndermek backend'i
   * boğar, ve daha önemlisi kısmi başarıyı takip edilemez kılar. Biri
   * düşerse kalanlar devam eder ve sonuç üye üye raporlanır — sessizce
   * yarıda kalan bir gönderim, hiç gönderilmemiş olmaktan kötüdür.
   */
  const sendQueue = useCallback(async () => {
    if (!detail || queue.length === 0) return;
    setSending(true);
    const failed: string[] = [];
    let ok = 0;
    for (const item of queue) {
      try {
        await nbAdminService.referTender(detail.id, {
          memberId: item.memberId,
          channel,
          note: queueNote.trim() || undefined,
        });
        ok += 1;
      } catch {
        failed.push(item.memberName);
      }
    }
    setSending(false);
    setPreviewOpen(false);
    setQueue([]);
    setQueueNote('');
    setUndo({
      message:
        failed.length === 0
          ? `${ok} üyeye yönlendirme kaydedildi${channel === 'IN_APP' ? ', bildirim gönderildi' : ''}.`
          : `${ok}/${queue.length} gönderildi. Başarısız: ${failed.join(', ')}`,
    });
    await loadDetail(detail.id);
    await loadList({ status: statusFilter, includeExpired, keepSelection: true });
  }, [detail, queue, channel, queueNote, loadDetail, loadList, statusFilter, includeExpired]);

  const changeStatus = useCallback(
    async (status: NbTenderStatus, id?: string) => {
      const targetId = id ?? detail?.id;
      if (!targetId) return;
      try {
        await nbAdminService.updateTenderStatus(targetId, status);
        setUndo({ message: `İhale "${NB_TENDER_STATUS_LABEL[status]}" olarak işaretlendi.` });
        await loadList({ status: statusFilter, includeExpired, keepSelection: true });
        if (detail?.id === targetId) await loadDetail(targetId);
      } catch (e) {
        setError(nbErrorMessage(e, 'Durum güncellenemedi.'));
      }
    },
    [detail, loadList, loadDetail, statusFilter, includeExpired],
  );

  const rematch = useCallback(async () => {
    if (!detail) return;
    try {
      const n = await nbAdminService.rematchTender(detail.id);
      setUndo({ message: `${n} eşleşme bulundu.` });
      await loadDetail(detail.id);
    } catch (e) {
      setError(nbErrorMessage(e, 'Yeniden eşleştirme başarısız.'));
    }
  }, [detail, loadDetail]);

  /**
   * Yanlış eşleşme bildir.
   *
   * Skorlama modeline **negatif sinyal** gider: aynı üye bu ihaleyle bir
   * daha eşleşmez ve sinyal, kelime ağırlıklarının gözden geçirilmesi için
   * kaydedilir. "Atla" ile karıştırılmamalı — atlamak bir kararsızlık,
   * bildirmek bir düzeltmedir.
   */
  const reportMismatch = useCallback(
    async (m: NbTenderMatch) => {
      if (!detail) return;
      try {
        await nbAdminService.reportTenderMismatch(detail.id, m.memberId);
        setUndo({ message: `${m.memberName} bu ihaleden elendi, modele negatif sinyal gitti.` });
        await loadDetail(detail.id);
      } catch (e) {
        setError(nbErrorMessage(e, 'Bildirim kaydedilemedi.'));
      }
    },
    [detail, loadDetail],
  );

  const updateReferralStatus = useCallback(
    async (referralId: string, status: NbTenderReferralStatus) => {
      if (!detail) return;
      try {
        await nbAdminService.updateTenderReferral(referralId, { status });
        setUndo({ message: 'Yönlendirme durumu güncellendi.' });
        await loadDetail(detail.id);
      } catch (e) {
        setError(nbErrorMessage(e, 'Durum güncellenemedi.'));
      }
    },
    [detail, loadDetail],
  );

  /**
   * Eşleşmesi olmayan kayıtları topluca arşivle.
   *
   * Günde 250+ ihale geliyor ve önemli kısmı hiçbir üyeye uymuyor. Tek tek
   * arşivlemek kuyruğu işlenemez kılıyordu.
   */
  const archiveZeroMatches = useCallback(async () => {
    const targets = tenders.filter((t) => t.matchCount === 0);
    if (targets.length === 0) return;
    if (
      !window.confirm(
        `${targets.length} ihale arşivlenecek (hiç eşleşen üyesi olmayanlar).\n\n` +
          'Arşiv sekmesinden geri alınabilir. Devam edilsin mi?',
      )
    ) {
      return;
    }
    setBulkBusy(true);
    let ok = 0;
    try {
      // Sırayla: toplu uç yok, backend'i paralel isteklerle boğmayalım.
      for (const t of targets) {
        try {
          await nbAdminService.updateTenderStatus(t.id, 'ARCHIVED');
          ok += 1;
        } catch {
          /* biri düşerse kalanı yine de arşivlensin */
        }
      }
      setUndo({
        message:
          ok === targets.length
            ? `${ok} ihale arşivlendi.`
            : `${ok}/${targets.length} ihale arşivlendi, kalanı başarısız.`,
      });
      await loadList({ status: statusFilter, includeExpired });
    } finally {
      setBulkBusy(false);
    }
  }, [tenders, loadList, statusFilter, includeExpired]);

  /* ── Klavye ─────────────────────────────────────────────────────────── */

  // Handler'lar her render'da yeniden kuruluyor; dinleyici tek kez bağlanıp
  // ref üzerinden okusun diye son sürüm burada tutulur.
  const shortcuts = useRef({ visible, selectedId, setSelectedId, changeStatus, openPreview, queue, previewOpen });
  shortcuts.current = { visible, selectedId, setSelectedId, changeStatus, openPreview, queue, previewOpen };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Metin alanındayken kısayol çalışmaz: "e" yazmak ihale arşivlemesin.
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const s = shortcuts.current;
      const key = e.key.toLowerCase();

      if (key === 'escape') {
        setPreviewOpen(false);
        return;
      }
      if (s.previewOpen) return; // Pencere açıkken gezinme kısayolları susar.

      if (key === 'j' || key === 'k') {
        e.preventDefault();
        const i = s.visible.findIndex((t) => t.id === s.selectedId);
        const next = key === 'j' ? Math.min(i + 1, s.visible.length - 1) : Math.max(i - 1, 0);
        if (s.visible[next]) s.setSelectedId(s.visible[next].id);
        return;
      }
      if (key === 'e' && s.selectedId) {
        e.preventDefault();
        void s.changeStatus('ARCHIVED', s.selectedId);
        return;
      }
      if (key === 'y' && s.queue.length > 0) {
        e.preventDefault();
        void s.openPreview();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* ── Render ─────────────────────────────────────────────────────────── */

  /**
   * Seçili ihalenin zaman durumu.
   *
   * **Süresi geçmiş bir ihale güncel teklif çağrısı olarak gönderilemez.**
   * Kayıt panelde duruyor olabilir — sonuç ve yüklenici takibi için tutulur —
   * ama üyeye "şuna teklif ver" diye gitmesi, üyenin zamanını boşa harcatır
   * ve ağın güvenilirliğini düşürür. Gönderim kapatılır, sebebi yazılır.
   *
   * İkinci eşik hazırlık süresi: teknik olarak açık ama iki günden az kalmış
   * bir ihalede teklif hazırlamak çoğu firma için mümkün değil. Bu engel
   * değil uyarı — kararı yönetici verir.
   */
  const deadlineDays = daysUntil(detail?.deadline);
  const expired = deadlineDays != null && deadlineDays < 0;
  const tightPrep = !expired && deadlineDays != null && deadlineDays <= 2;

  const queuedIds = new Set(queue.map((q) => q.memberId));
  const paywalledInQueue = queue.filter((q) => q.paywalled).length;

  return (
    <Box>
      <NbPageHeader
        crumb="NartBusiness · Ticaret & Fırsatlar"
        title="İhaleler"
        subtitle="Sistem eşleşme önerir, yönlendirme kararını sen verirsin. Seçtiğin üyeler kuyruğa girer, tek önizlemeyle birlikte gönderilir."
        actions={
          <>
            <Button
              disableElevation
              sx={nbSecondaryBtn}
              disabled={bulkBusy || zeroMatchCount === 0}
              onClick={archiveZeroMatches}
            >
              {bulkBusy ? 'Arşivleniyor…' : `Eşleşmesizleri arşivle (${zeroMatchCount})`}
            </Button>
            <Button disableElevation sx={nbPrimaryBtn} disabled={!detail} onClick={rematch}>
              Yeniden eşleştir
            </Button>
          </>
        }
        kpis={
          <>
            {/* Hedef yöneticinin kendi hedefi; sistemin ölçtüğü bir değer
                değil. Tıklayınca değiştirilir, uydurulmuş bir kota gibi
                durmaması için kaynağı açıkça yazılı. */}
            <NbKpi
              label="BUGÜN İŞLENEN"
              value={`${doneToday} / ${target}`}
              hint="kendi hedefin"
              tone={doneToday >= target ? 'good' : 'neutral'}
              onClick={() => {
                const input = window.prompt('Günlük hedefin kaç yönlendirme olsun?', String(target));
                const n = Number(input);
                if (Number.isFinite(n) && n > 0) setTarget(Math.round(n));
              }}
            />
            <NbKpi
              label="SON TEKLİFE ≤3 GÜN"
              value={urgentCount}
              hint="bu listede"
              tone="bad"
              active={quick.urgent}
              onClick={() => setQuick((q) => ({ ...q, urgent: !q.urgent }))}
            />
            <NbKpi label="YENİ İHALE" value={counts.NEW ?? 0} hint="işlenmemiş" />
            <NbKpi
              label="KUYRUKTA"
              value={queue.length}
              hint={queue.length ? 'gönderilmeyi bekliyor' : 'üye seçilmedi'}
              tone={queue.length ? 'warn' : 'neutral'}
            />
          </>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Üç bölüm: liste | detay | kuyruk. Sabit piksel grid track yok;
          900px altında kolonlar alt alta yığılır. */}
      <Stack direction="row" flexWrap="wrap" sx={{ gap: 2, alignItems: 'flex-start' }}>
        {/* ── 1. İhale listesi ─────────────────────────────────────────── */}
        <Box sx={{ ...(nbCard as object), flex: '1 1 300px', overflow: 'hidden' }}>
          <NbFilterBar
            search={search}
            onSearch={setSearch}
            placeholder="Başlık, il, idare veya İKN…"
            chips={QUICK_FILTERS.map((f) => ({
              key: f.key,
              label: f.label,
              active: quick[f.key],
              onToggle: () => setQuick((q) => ({ ...q, [f.key]: !q[f.key] })),
            }))}
          />

          <Stack direction="row" alignItems="center" sx={{ gap: 1, px: 1.75, py: 1.25, borderBottom: nbDividerLine }}>
            <Typography sx={{ ...nbLabel }}>SIRALA</Typography>
            {SORTS.map((s) => (
              <Button key={s.key} disableElevation onClick={() => setSortBy(s.key)} sx={nbChip(sortBy === s.key)}>
                {s.label}
              </Button>
            ))}
          </Stack>

          <Stack direction="row" sx={{ gap: 0.75, px: 1.75, py: 1.25, borderBottom: nbDividerLine }}>
            {(['NEW', 'REVIEWED', 'ARCHIVED'] as NbTenderStatus[]).map((s) => (
              <Button
                key={s}
                disableElevation
                onClick={() => setStatusFilter(s)}
                sx={nbChip(statusFilter === s)}
              >
                {NB_TENDER_STATUS_LABEL[s]} {counts[s] != null ? `· ${counts[s]}` : ''}
              </Button>
            ))}
            {/* Gizlenenin kaç tane olduğunu söylemezsek süzme sessiz veri
                kaybı gibi görünür. Sayı sıfırsa anahtar hiç çıkmaz. */}
            {(counts.EXPIRED ?? 0) > 0 && (
              <Button
                disableElevation
                onClick={() => setIncludeExpired((v) => !v)}
                sx={{ ...(nbChip(includeExpired) as object), ml: 'auto' }}
                title="Süresi geçmiş ihaleler yönlendirilemez; varsayılan görünümde gizlidir."
              >
                Süresi geçmiş · {counts.EXPIRED}
              </Button>
            )}
          </Stack>

          <Box sx={{ height: 3 }}>{listLoading && <LinearProgress />}</Box>

          <Box sx={{ maxHeight: '62vh', overflowY: 'auto' }}>
            {visible.map((t) => {
              const days = daysUntil(t.deadline);
              const u = URGENCY_STYLE[urgencyOf(days)];
              const active = t.id === selectedId;
              return (
                <Box
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  sx={{
                    px: 1.75, py: 1.5, borderBottom: nbDividerLine, cursor: 'pointer',
                    ...(nbSelectedRow(active) as object),
                  }}
                >
                  <Typography sx={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.35 }}>
                    {t.title}
                  </Typography>
                  <Stack direction="row" flexWrap="wrap" alignItems="center" sx={{ gap: 1, mt: 0.75 }}>
                    <Typography sx={{ ...nbMono, fontSize: 11, color: nb.textFaint }}>
                      {t.province ?? '—'}
                    </Typography>
                    {/* Süresi geçmiş satır aciliyet rengiyle değil, nötr bir
                        "yönlendirilemez" rozetiyle görünür. */}
                    {t.expired ? (
                      <Box component="span" sx={nbPill('neutral')}>Süresi geçti</Box>
                    ) : (
                      <Typography sx={{ fontSize: 11, color: u.color, fontWeight: u.weight }}>
                        {deadlineLabel(days)}
                      </Typography>
                    )}
                    <Box component="span" sx={{ ...(nbPill(t.matchCount > 0 ? 'good' : 'neutral') as object), ml: 'auto' }}>
                      {t.matchCount} eşleşme
                    </Box>
                  </Stack>
                </Box>
              );
            })}

            {visible.length === 0 && !listLoading && (
              <Typography sx={{ p: 3, fontSize: 12.5, color: nb.textMuted, textAlign: 'center' }}>
                Bu filtrelerle eşleşen ihale yok.
              </Typography>
            )}
          </Box>

          <Typography sx={{ px: 1.75, py: 1.25, fontSize: 11, color: nb.textFaint, borderTop: nbDividerLine }}>
            J/K gezin · E arşivle · Y kuyruğu gönder
          </Typography>
        </Box>

        {/* ── 2. İhale detayı ──────────────────────────────────────────── */}
        <Box sx={{ ...(nbCard as object), flex: '2 1 420px', overflow: 'hidden' }}>
          {detailLoading && !detail ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress size={26} />
            </Box>
          ) : !detail ? (
            <Typography sx={{ p: 3, fontSize: 12.5, color: nb.textMuted, textAlign: 'center' }}>
              Soldan bir ihale seç.
            </Typography>
          ) : (
            <>
              <Box sx={{ px: 2.25, py: 2, borderBottom: nbDividerLine }}>
                <Typography sx={{ fontSize: 15, fontWeight: 600, lineHeight: 1.35 }}>
                  {detail.title}
                </Typography>
                <Stack direction="row" flexWrap="wrap" sx={{ gap: 1.25, mt: 1 }}>
                  <Typography sx={{ fontSize: 11.5, color: nb.textMuted }}>
                    {detail.authority ?? 'idare belirtilmemiş'}
                  </Typography>
                  <Typography sx={{ ...nbMono, fontSize: 11.5, color: nb.textFaint }}>
                    İKN {detail.externalId}
                  </Typography>
                  {/* Tarih tek başına yetmiyor: "10 Eylül 2026" yazısı, bugünün
                      11 Eylül olduğunu bilmeyen göze geçerli bir çağrı gibi
                      görünüyordu. Kalan süre etiketini yanına koyuyoruz. */}
                  <Typography
                    sx={{
                      fontSize: 11.5,
                      color: expired ? nb.red : nb.textMuted,
                      fontWeight: expired ? 600 : 400,
                    }}
                  >
                    Son teklif: {formatDeadline(detail.deadline)} · {deadlineLabel(deadlineDays)}
                  </Typography>
                </Stack>

                {/* "Sistem bu ihaleyi neden eşleştirdi" — ihale düzeyinde. */}
                <Stack direction="row" flexWrap="wrap" sx={{ gap: 0.75, mt: 1.25 }}>
                  <Typography sx={{ ...nbLabel, alignSelf: 'center' }}>NEDEN EŞLEŞTİ</Typography>
                  {tenderMatchTags(matches).map((tag) => (
                    <Box
                      key={tag}
                      component="span"
                      sx={{
                        bgcolor: nb.bg, border: `1px solid #e2ded3`, borderRadius: `${nbRadius.pill}px`,
                        px: 1.25, py: 0.5, fontSize: 11, color: '#4a545c',
                      }}
                    >
                      {tag}
                    </Box>
                  ))}
                  {matches.length === 0 && (
                    <Typography sx={{ fontSize: 11.5, color: nb.textFaint }}>
                      Hiç eşleşme yok — bu kayıt arşivlenebilir.
                    </Typography>
                  )}
                </Stack>

                <Stack direction="row" flexWrap="wrap" sx={{ gap: 1, mt: 1.5 }}>
                  {detail.sourceUrl && (
                    <Button
                      disableElevation
                      sx={nbSecondaryBtn}
                      component="a"
                      href={detail.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Kaynakta aç
                    </Button>
                  )}
                  <Button disableElevation sx={nbSecondaryBtn} onClick={() => changeStatus('REVIEWED')}>
                    İncelendi
                  </Button>
                  <Button disableElevation sx={nbSecondaryBtn} onClick={() => changeStatus('ARCHIVED')}>
                    Arşivle
                  </Button>
                </Stack>
              </Box>

              {/* Eşleşen üyeler */}
              <Stack
                direction="row"
                alignItems="center"
                sx={{ gap: 1, px: 2.25, py: 1.25, borderBottom: nbDividerLine }}
              >
                <Typography sx={nbLabel}>EŞLEŞEN ÜYELER · {visibleMatches.length}</Typography>
                {strongMatches > 0 && (
                  <Button
                    disableElevation
                    onClick={() => setQuick((q) => ({ ...q, strong: !q.strong }))}
                    sx={{ ...(nbChip(quick.strong) as object), ml: 'auto' }}
                  >
                    %85+ ({strongMatches})
                  </Button>
                )}
              </Stack>

              <Box sx={{ maxHeight: '48vh', overflowY: 'auto' }}>
                {visibleMatches.map((m) => {
                  const sent = alreadySent(m);
                  const queued = queuedIds.has(m.memberId);
                  return (
                    <Stack
                      key={m.memberId}
                      direction="row"
                      sx={{ gap: 1.25, px: 2.25, py: 1.5, borderBottom: nbDividerLine, alignItems: 'flex-start' }}
                    >
                      <Checkbox
                        size="small"
                        checked={queued}
                        disabled={sent}
                        onChange={() => toggleQueue(m)}
                        sx={{ p: 0, mt: 0.25, color: nb.inputBorder, '&.Mui-checked': { color: nb.green } }}
                        inputProps={{ 'aria-label': `${m.memberName} kuyruğa ekle` }}
                      />
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Stack direction="row" alignItems="center" flexWrap="wrap" sx={{ gap: 0.875 }}>
                          <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{m.memberName}</Typography>
                          <Box
                            component="span"
                            sx={{
                              ...nbMono,
                              bgcolor: m.score >= 85 ? nb.greenTint : nb.bg,
                              color: m.score >= 85 ? nb.green : '#4a545c',
                              fontSize: 11.5, fontWeight: 500, borderRadius: '6px', px: 0.875, py: 0.25,
                            }}
                          >
                            %{Math.round(m.score)}
                          </Box>
                          {m.paywalled && (
                            <Box component="span" sx={nbPill('warn')}>ödeme bekliyor</Box>
                          )}
                          {sent && <Box component="span" sx={nbPill('neutral')}>gönderildi</Box>}
                        </Stack>

                        {/* Skor tek başına gösterilmez: gerekçe her zaman yanında. */}
                        <Typography sx={{ fontSize: 11.5, color: nb.textMuted, lineHeight: 1.5, mt: 0.5 }}>
                          {matchReason(m.matchedOn)}
                        </Typography>

                        <Stack direction="row" alignItems="center" sx={{ gap: 1.5, mt: 0.75 }}>
                          <Typography sx={{ fontSize: 11, color: nb.textFaint }}>
                            {m.city ?? 'şehir yok'}
                          </Typography>
                          <Button
                            onClick={() => reportMismatch(m)}
                            sx={{
                              minWidth: 0, p: 0, fontSize: 11, color: nb.red, textTransform: 'none',
                              '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' },
                            }}
                          >
                            Yanlış eşleşme bildir
                          </Button>
                        </Stack>
                      </Box>
                    </Stack>
                  );
                })}

                {visibleMatches.length === 0 && (
                  <Typography sx={{ p: 3, fontSize: 12.5, color: nb.textMuted, textAlign: 'center' }}>
                    {quick.strong ? '%85 üzeri eşleşme yok.' : 'Bu ihaleye uyan üye bulunamadı.'}
                  </Typography>
                )}
              </Box>
            </>
          )}
        </Box>

        {/* ── 3. Yönlendirme kuyruğu ───────────────────────────────────── */}
        <Box sx={{ ...(nbCard as object), flex: '1 1 300px', overflow: 'hidden' }}>
          <Box sx={{ px: 2, py: 1.75, borderBottom: nbDividerLine }}>
            <Typography sx={nbLabel}>YÖNLENDİRME KUYRUĞU</Typography>
            <Typography sx={{ fontSize: 11.5, color: nb.textFaint, mt: 0.5, lineHeight: 1.5 }}>
              Seçtiğin üyeler burada birikir. Kanal ve not kuyruğun tamamına uygulanır.
            </Typography>
          </Box>

          {queue.length === 0 ? (
            <Typography sx={{ p: 3, fontSize: 12.5, color: nb.textMuted, textAlign: 'center' }}>
              Ortadaki listeden üye seç.
            </Typography>
          ) : (
            <>
              <Box sx={{ maxHeight: '30vh', overflowY: 'auto' }}>
                {queue.map((q) => (
                  <Stack
                    key={q.memberId}
                    direction="row"
                    alignItems="center"
                    sx={{ gap: 1, px: 2, py: 1.25, borderBottom: nbDividerLine }}
                  >
                    <Typography sx={{ fontSize: 12.5, minWidth: 0 }} noWrap>
                      {q.memberName}
                    </Typography>
                    <Typography sx={{ ...nbMono, fontSize: 11, color: nb.textFaint }}>
                      %{Math.round(q.score)}
                    </Typography>
                    <Button
                      onClick={() => setQueue((prev) => prev.filter((x) => x.memberId !== q.memberId))}
                      sx={{
                        ml: 'auto', minWidth: 0, p: 0, fontSize: 15, color: '#b6b0a2', lineHeight: 1,
                        '&:hover': { bgcolor: 'transparent', color: nb.red },
                      }}
                      aria-label={`${q.memberName} kuyruktan çıkar`}
                    >
                      ×
                    </Button>
                  </Stack>
                ))}
              </Box>

              <Box sx={{ px: 2, py: 1.75, borderBottom: nbDividerLine }}>
                <Typography sx={nbLabel}>KANAL</Typography>
                <Stack direction="row" sx={{ gap: 0.75, mt: 0.875 }}>
                  <Button
                    disableElevation
                    onClick={() => setChannel('IN_APP')}
                    sx={nbChip(channel === 'IN_APP')}
                  >
                    Uygulama
                  </Button>
                  <Button
                    disableElevation
                    onClick={() => setChannel('WHATSAPP')}
                    sx={nbChip(channel === 'WHATSAPP')}
                  >
                    WhatsApp
                  </Button>
                </Stack>
                <Typography sx={{ fontSize: 11, color: nb.textFaint, mt: 0.875, lineHeight: 1.5 }}>
                  {channel === 'IN_APP'
                    ? 'Bildirim üyeye anında düşer ve kaydı burada tutulur.'
                    : 'Sistem taslak üretir, mesajı sen gönderirsin. Kayıt yine tutulur.'}
                </Typography>
              </Box>

              <Box sx={{ px: 2, py: 1.75 }}>
                <Typography sx={nbLabel}>NOT (OPSİYONEL)</Typography>
                <Box
                  component="textarea"
                  value={queueNote}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setQueueNote(e.target.value)}
                  placeholder="Kuyruktaki herkese aynı not gider."
                  sx={{
                    width: '100%', mt: 0.875, minHeight: 64, resize: 'vertical',
                    border: `1px solid ${nb.inputBorder}`, bgcolor: nb.inputBg, borderRadius: '9px',
                    p: 1.25, fontSize: 12.5, fontFamily: 'inherit', color: nb.text, outline: 'none',
                  }}
                />

                {paywalledInQueue > 0 && (
                  <Typography sx={{ fontSize: 11, color: nb.amber, mt: 1, lineHeight: 1.5 }}>
                    {paywalledInQueue} üyenin ödemesi bekliyor. Onlara ihalenin başlığı ve bağlantısı
                    gitmez, yalnız il ve iş türünü anlatan kapalı metin gider.
                  </Typography>
                )}

                {expired && (
                  <Typography sx={{ fontSize: 11.5, color: nb.red, mt: 1.25, lineHeight: 1.5 }}>
                    Son teklif tarihi geçmiş. Bu kayıt güncel bir teklif çağrısı olarak
                    gönderilemez; sonuç takibi için arşivlenebilir.
                  </Typography>
                )}
                {tightPrep && (
                  <Typography sx={{ fontSize: 11.5, color: nb.amber, mt: 1.25, lineHeight: 1.5 }}>
                    Son teklife {deadlineLabel(deadlineDays)} kaldı. Çoğu firma bu sürede teklif
                    hazırlayamaz; yine de göndereceksen mesajda bunu belirt.
                  </Typography>
                )}

                <Button
                  disableElevation
                  fullWidth
                  disabled={expired}
                  sx={{
                    ...(nbPrimaryBtn as object),
                    mt: 1.5,
                    '&.Mui-disabled': { bgcolor: '#e2ded3', color: nb.textFaint },
                  }}
                  onClick={openPreview}
                >
                  Önizle ve gönder ({queue.length})
                </Button>
              </Box>
            </>
          )}

          {/* Bu ihalede daha önce yapılmış yönlendirmeler */}
          {detail && detail.referrals.length > 0 && (
            <>
              <Box sx={{ px: 2, py: 1.5, borderTop: nbDividerLine, borderBottom: nbDividerLine }}>
                <Typography sx={nbLabel}>GÖNDERİLMİŞ · {detail.referrals.length}</Typography>
              </Box>
              <Box sx={{ maxHeight: '26vh', overflowY: 'auto' }}>
                {detail.referrals.map((r) => (
                  <Box key={r.id} sx={{ px: 2, py: 1.25, borderBottom: nbDividerLine }}>
                    <Stack direction="row" alignItems="center" sx={{ gap: 0.875 }}>
                      <Typography sx={{ fontSize: 12, fontWeight: 500, minWidth: 0 }} noWrap>
                        {r.memberName}
                      </Typography>
                      <Box component="span" sx={{ ...(nbPill(r.status === 'WON' ? 'good' : r.status === 'DECLINED' ? 'bad' : 'info') as object), ml: 'auto' }}>
                        {NB_TENDER_REFERRAL_STATUS_LABEL[r.status]}
                      </Box>
                    </Stack>
                    <Stack direction="row" alignItems="center" sx={{ gap: 1, mt: 0.625 }}>
                      <Typography sx={{ fontSize: 10.5, color: nb.textFaint }}>
                        {r.channel === 'IN_APP' ? 'Uygulama' : 'WhatsApp'} · {relativeDate(r.createdAt)}
                      </Typography>
                      {r.status === 'SENT' && (
                        <Tooltip title="Üye ilgilendiğini bildirdiyse işaretle" arrow>
                          <Button
                            onClick={() => updateReferralStatus(r.id, 'INTERESTED')}
                            sx={{
                              ml: 'auto', minWidth: 0, p: 0, fontSize: 11, color: nb.green,
                              textTransform: 'none', '&:hover': { bgcolor: 'transparent' },
                            }}
                          >
                            İlgilendi
                          </Button>
                        </Tooltip>
                      )}
                    </Stack>
                  </Box>
                ))}
              </Box>
            </>
          )}
        </Box>
      </Stack>

      {/* ── Tek önizleme, tek gönderim ─────────────────────────────────── */}
      <Dialog
        open={previewOpen}
        onClose={() => !sending && setPreviewOpen(false)}
        maxWidth={false}
        PaperProps={{
          sx: {
            width: 'min(620px, 100%)', bgcolor: nb.surface, borderRadius: '14px',
            boxShadow: '0 30px 70px rgba(14,27,38,.35)', m: 2.5,
          },
        }}
      >
        <Box sx={{ px: 2.75, pt: 2.25, pb: 1.75, borderBottom: nbDividerLine }}>
          <Typography sx={{ fontSize: 16, fontWeight: 600 }}>Yönlendirmeyi önizle</Typography>
          <Typography sx={{ fontSize: 12, color: nb.textMuted, mt: 0.375 }}>
            {queue.length} üye · {channel === 'IN_APP' ? 'Uygulama bildirimi' : 'WhatsApp'}
          </Typography>
        </Box>

        <Box sx={{ px: 2.75, py: 2.25 }}>
          {previewLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <>
              <Typography sx={{ fontSize: 11.5, color: nb.textFaint, mb: 1 }}>
                {/* Metinler yalnız hitap satırında farklılaşıyor; hepsini yan
                    yana göstermek pencereyi okunmaz yapardı. */}
                Örnek metin — {queue[0]?.memberName} için. Diğerlerinde yalnız hitap satırı değişir.
              </Typography>
              <Box
                sx={{
                  whiteSpace: 'pre-wrap', bgcolor: nb.inputBg, border: `1px solid ${nb.inputBorder}`,
                  borderRadius: '9px', p: 1.75, fontSize: 12.5, lineHeight: 1.6, color: nb.text,
                  maxHeight: '40vh', overflowY: 'auto',
                }}
              >
                {previewText || 'Taslak üretilemedi.'}
              </Box>

              {queueNote.trim() && (
                <Typography sx={{ fontSize: 11.5, color: nb.textMuted, mt: 1.25 }}>
                  Not olarak eklenecek: {queueNote.trim()}
                </Typography>
              )}

              {paywalledInQueue > 0 && (
                <Typography sx={{ fontSize: 11.5, color: nb.amber, mt: 1.25, lineHeight: 1.5 }}>
                  Kuyruktaki {paywalledInQueue} üyenin ödemesi beklediği için onlara kapalı metin gider.
                </Typography>
              )}
            </>
          )}
        </Box>

        <Stack direction="row" alignItems="center" sx={{ px: 2.75, py: 1.75, borderTop: nbDividerLine }}>
          <Button
            onClick={() => setPreviewOpen(false)}
            disabled={sending}
            sx={{ color: nb.textMuted, fontSize: 13, textTransform: 'none', px: 0, minWidth: 0 }}
          >
            Vazgeç
          </Button>
          <Button
            disableElevation
            disabled={sending || queue.length === 0}
            onClick={sendQueue}
            sx={{ ...(nbPrimaryBtn as object), ml: 'auto' }}
          >
            {sending ? 'Gönderiliyor…' : `${queue.length} üyeye gönder`}
          </Button>
        </Stack>
      </Dialog>

      <NbUndoToast state={undo} onClose={() => setUndo(null)} />
    </Box>
  );
}
