import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  MenuItem,
  Pagination,
  Paper,
  Snackbar,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RefreshIcon from '@mui/icons-material/Refresh';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import VerifiedIcon from '@mui/icons-material/Verified';
import { nbAdminService } from '../../services/nartbusiness/nbAdminService';
import type { NbPendingInvite } from '../../services/nartbusiness/nbAdminService';
import type {
  MembershipTier,
  NbMember,
  NbMemberStatus,
  PagedResult,
} from '../../services/nartbusiness/nbTypes';
import {
  formatMoney,
  fullDate,
  RACE_LABEL,
  relativeDate,
  STATUS_LABEL,
  TIER_LABEL,
} from '../../utils/nbDisplay';
import { NbStatusBadge } from '../../components/nartbusiness';
import {
  NbBulkBar,
  NbFilterBar,
  NbKpi,
  NbPageHeader,
  NbUndoToast,
  nbCard,
  nbDividerLine,
  nbGrid,
  nbHeadRow,
  nbNumber,
  nbPrimaryBtn,
  nbSecondaryBtn,
} from '../../components/nartbusiness/ui';
import { NB_UNDO_MS, type NbUndoState } from '../../components/nartbusiness/ui/NbUndoToast';
import {
  countPendingTasks,
  memberTask,
  missingMatchingFields,
  sortByTask,
  type NbMemberTask,
} from './nbMemberTask';
import { nb, nbRadius, URGENCY_STYLE, urgencyOf } from '../../theme/nbBrand';
import type { NbBulkAction, NbBulkResult } from '../../services/nartbusiness/nbAdminService';
import NbCreateMemberDialog from './NbCreateMemberDialog';
import NbMemberActionDialog from './NbMemberActionDialog';
import NbMemberHardDeleteDialog from './NbMemberHardDeleteDialog';
import NbBulkHistoryDialog from './NbBulkHistoryDialog';
import { nbErrorMessage } from '../../services/nartbusiness/nbErrorMessage';

/**
 * Liste filtreleri.
 *
 * Sekiz çipten beşe indi. Çıkarılanlar ("son 7 gün", "profesyonel",
 * "denemesi bitiyor", "onay süresi doldu") ya bir soruyu değil bir merakı
 * karşılıyordu ya da artık "aksiyon bekleyen" içinde eriyor: denemesi biten
 * üye zaten bekleyen işi olan üyedir.
 */
type QuickFilter = 'all' | 'task' | 'payment' | 'incomplete' | 'trial' | 'kurucu';

/**
 * TRIAL üyenin kalan deneme süresi — status badge altına gösterilir.
 * Renk: ≤2 gün/bitmiş → error, ≤7 gün → warning, aksi → text.secondary.
 */
/**
 * Kalan süre metni + görsel ağırlık.
 *
 * Önceden "3 gün kaldı" ile "26 gün kaldı" aynı puntoda, aynı renkteydi —
 * aciliyet hiç kodlanmamıştı. Artık renk VE kalınlık birlikte değişiyor;
 * eşikler tek yerde (`urgencyOf`), listede ve detayda aynı.
 */
function trialRemaining(
  trialEndsAt?: string,
): { text: string; color: string; weight: number } | null {
  if (!trialEndsAt) return null;
  const ends = new Date(trialEndsAt).getTime();
  if (Number.isNaN(ends)) return null;
  const diffDays = Math.ceil((ends - Date.now()) / 86_400_000);
  if (diffDays <= 0) {
    return { text: 'Süresi doldu', color: URGENCY_STYLE.critical.color, weight: 700 };
  }
  const text = diffDays === 1 ? 'Son gün' : `${diffDays} gün`;
  const u = URGENCY_STYLE[urgencyOf(diffDays)];
  return { text, color: u.color, weight: u.weight };
}

const QUICK_FILTERS: { value: Exclude<QuickFilter, 'all'>; label: string }[] = [
  { value: 'task', label: 'Aksiyon bekleyen' },
  { value: 'payment', label: 'Ödeme bekleyen' },
  { value: 'incomplete', label: 'Eksik profil' },
  { value: 'trial', label: 'Denemede' },
  { value: 'kurucu', label: 'Kurucu' },
];

/** Tablo ızgarası — başlık ve satırlar aynı şablonu okumak zorunda. */
const ROW_GRID = '32px minmax(0,2.4fr) 104px minmax(0,1.5fr) 150px 40px';

/**
 * Üye satırı.
 *
 * Satır sonunda kebab menü yok; yerine **o üyenin tek işi** buton olarak
 * duruyor (`memberTask`). Menü beş seçeneği eşit ağırlıkta gösterip "şimdi
 * hangisi" sorusunu yöneticiye bırakıyordu; buton soruyu satırın kendisine
 * cevaplatıyor. Yapılacak iş yoksa hücre boş kalır — boş kalması bilgidir.
 *
 * Satırın tamamı detaya gider; checkbox ve buton kendi tıklamalarını yutar,
 * yoksa seçim yapmak isteyen kişi detay sayfasına düşerdi.
 */
function MemberRow({
  member,
  onClick,
  onTask,
  selected,
  onToggleSelect,
}: {
  member: NbMember;
  onClick: () => void;
  onTask: (task: NbMemberTask) => void;
  selected: boolean;
  onToggleSelect: () => void;
}) {
  const initial = (member.companyName ?? '?').trim().charAt(0).toUpperCase();
  const task = memberTask(member);
  const identityLine =
    member.race && member.clanName
      ? `${RACE_LABEL[member.race]} · ${member.clanName}`
      : member.race
      ? RACE_LABEL[member.race]
      : null;
  const meta =
    [member.memberType === 'PROFESSIONAL' ? member.personJobTitle : member.city, identityLine]
      .filter(Boolean)
      .join(' · ') || 'Profil bilgisi yok';

  const trial = member.status === 'TRIAL' ? trialRemaining(member.trialEndsAt) : null;

  return (
    <Box
      onClick={onClick}
      sx={{
        ...(nbGrid(ROW_GRID) as object),
        px: 2,
        py: 1.375,
        borderBottom: nbDividerLine,
        cursor: 'pointer',
        bgcolor: selected ? '#f6faf8' : 'transparent',
        '&:hover': { bgcolor: selected ? '#f6faf8' : nb.inputBg },
      }}
    >
      <Box onClick={(e) => e.stopPropagation()} sx={{ display: 'flex' }}>
        <Checkbox
          size="small"
          checked={selected}
          onChange={onToggleSelect}
          sx={{ p: 0, color: nb.inputBorder, '&.Mui-checked': { color: nb.green } }}
          inputProps={{ 'aria-label': `${member.companyName ?? 'Üye'} seç` }}
        />
      </Box>

      <Stack direction="row" alignItems="center" sx={{ gap: 1.375, minWidth: 0 }}>
        {/* Logo varsa logo, yoksa baş harf. MemberView zaten logoUrl
            taşıyordu ama liste hep baş harf çiziyordu; tanıdık işletmeyi
            listede gözle bulmak zorlaşıyordu. Görsel yüklenemezse baş harfe
            düşer (onError), kırık resim ikonu çıkmaz. */}
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: '9px',
            flexShrink: 0,
            overflow: 'hidden',
            display: 'grid',
            placeItems: 'center',
            fontSize: 12.5,
            fontWeight: 700,
            bgcolor: member.status === 'ACTIVE' ? nb.greenTint : '#f2f1ec',
            color: member.status === 'ACTIVE' ? nb.green : nb.textMuted,
          }}
        >
          {member.logoUrl ? (
            <Box
              component="img"
              src={member.logoUrl}
              alt=""
              loading="lazy"
              onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                e.currentTarget.style.display = 'none';
              }}
              sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            initial
          )}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" alignItems="center" sx={{ gap: 0.75, minWidth: 0 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }} noWrap>
              {member.companyName ?? 'Şirket bilgisi eksik'}
            </Typography>
            {/* Doğrulanmış işareti kendi kolonunu hak etmiyordu: taşıdığı
                bilgi zaten "bu isme güvenilir". */}
            {member.verifiedBusiness && (
              <Tooltip title="Doğrulanmış İşletme" arrow>
                <VerifiedIcon sx={{ fontSize: 14, color: nb.green, flexShrink: 0 }} />
              </Tooltip>
            )}
          </Stack>
          <Typography sx={{ fontSize: 11, color: nb.textFaint, mt: 0.25 }} noWrap>
            {meta}
          </Typography>
        </Box>
      </Stack>

      <Box sx={{ minWidth: 0 }}>
        <Box
          component="span"
          sx={{
            border: '1px solid #e2ded3',
            bgcolor: nb.inputBg,
            borderRadius: '5px',
            px: 1,
            py: 0.375,
            fontSize: 11,
            color: nb.textMuted,
            whiteSpace: 'nowrap',
          }}
        >
          {TIER_LABEL[member.tier]}
        </Box>
      </Box>

      <Stack direction="row" alignItems="center" sx={{ gap: 0.75, minWidth: 0 }}>
        <NbStatusBadge status={member.status} label={STATUS_LABEL[member.status]} />
        {/* Kalan gün durumun yanında, alt satırda değil: iki satırlık hücre
            satır yüksekliğini şişirip taramayı yavaşlatıyordu. */}
        {trial && (
          <Tooltip
            title={member.trialEndsAt ? `Deneme bitişi: ${fullDate(member.trialEndsAt)}` : ''}
            arrow
          >
            <Typography
              sx={{ fontSize: 11, color: trial.color, fontWeight: trial.weight, whiteSpace: 'nowrap' }}
            >
              {trial.text}
            </Typography>
          </Tooltip>
        )}
      </Stack>

      <Box onClick={(e) => e.stopPropagation()}>
        {task && (
          <Button
            disableElevation
            onClick={() => onTask(task)}
            sx={{
              border: `1px solid ${task.urgency === 'due' ? '#bcd8ca' : nb.inputBorder}`,
              bgcolor: task.urgency === 'due' ? nb.greenTint : '#fff',
              color: task.urgency === 'due' ? nb.green : nb.textMuted,
              borderRadius: `${nbRadius.controlSm}px`,
              px: 1.25,
              py: 0.625,
              fontSize: 11.5,
              fontWeight: 500,
              textTransform: 'none',
              whiteSpace: 'nowrap',
              '&:hover': { bgcolor: task.urgency === 'due' ? '#dceae2' : nb.inputBg },
            }}
          >
            {task.label}
          </Button>
        )}
      </Box>

      <Typography sx={{ color: '#b6b0a2', textAlign: 'right', fontSize: 15, lineHeight: 1 }}>
        ›
      </Typography>
    </Box>
  );
}

/**
 * Bekleyen email-davetleri (hesabı henüz olmayan/profil tamamlamamış kişiler).
 * Davet edilen kişi üye listesinde GÖRÜNMEZ — bu panel admin'in tek görünürlüğü.
 * refreshKey değiştiğinde (yeni davet oluşturulunca) listeyi yeniden çeker.
 */
function PendingInvitesPanel({ refreshKey }: { refreshKey: number }) {
  const [invites, setInvites] = useState<NbPendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ severity: 'success' | 'error'; text: string } | null>(null);

  const load = () => {
    setLoading(true);
    nbAdminService
      .listPendingInvites()
      .then(setInvites)
      .catch(() => setInvites([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, [refreshKey]);

  const handleResend = (inv: NbPendingInvite) => {
    setBusyId(inv.id);
    nbAdminService
      .resendInvite(inv.id)
      .then(() => setMsg({ severity: 'success', text: `Davet tekrar gönderildi: ${inv.email}` }))
      .catch((e) =>
        setMsg({ severity: 'error', text: nbErrorMessage(e) ?? 'Gönderilemedi' }),
      )
      .finally(() => setBusyId(null));
  };

  const handleCancel = (inv: NbPendingInvite) => {
    if (!window.confirm(`Davet iptal edilsin mi?\n${inv.email}\n\nKişi sonradan kaydolursa üyelik otomatik tanımlanmaz.`)) {
      return;
    }
    setBusyId(inv.id);
    nbAdminService
      .cancelInvite(inv.id)
      .then(() => {
        setMsg({ severity: 'success', text: `Davet iptal edildi: ${inv.email}` });
        setInvites((prev) => prev.filter((x) => x.id !== inv.id));
      })
      .catch((e) =>
        setMsg({ severity: 'error', text: nbErrorMessage(e) ?? 'İptal edilemedi' }),
      )
      .finally(() => setBusyId(null));
  };

  return (
    <Accordion variant="outlined" disableGutters sx={{ mb: 2, '&:before': { display: 'none' } }} defaultExpanded={false}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack direction="row" spacing={1} alignItems="center">
          <MailOutlineIcon fontSize="small" color="action" />
          <Typography fontWeight={600}>Bekleyen Kayıtlar</Typography>
          <Chip
            size="small"
            color={invites.length > 0 ? 'warning' : 'default'}
            label={loading ? '…' : invites.length}
          />
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Hesabı olmayan kişiler için bekleyen kayıtlar — admin daveti veya public başvuru. Kişi aynı
          e-postayla (Apple/Google/e-posta) kaydolup profilini tamamlayınca otomatik bağlanır
          (davet→üye, başvuru→komiteye SUBMITTED) ve listeden düşer.
        </Typography>

        {msg && (
          <Alert severity={msg.severity} onClose={() => setMsg(null)} sx={{ mb: 1.5 }}>
            {msg.text}
          </Alert>
        )}

        {loading ? (
          <Stack alignItems="center" py={3}>
            <CircularProgress size={22} />
          </Stack>
        ) : invites.length === 0 ? (
          <Typography variant="body2" color="text.secondary" py={1}>
            Bekleyen davet yok.
          </Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>E-posta</TableCell>
                  <TableCell>Tür</TableCell>
                  <TableCell>İşletme</TableCell>
                  <TableCell>Kademe</TableCell>
                  <TableCell>Oluşturulma</TableCell>
                  <TableCell align="right">İşlem</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {invites.map((inv) => (
                  <TableRow key={inv.id} hover>
                    <TableCell>{inv.email}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        variant="outlined"
                        color={inv.origin === 'SELF_APPLY' ? 'info' : 'default'}
                        label={inv.origin === 'SELF_APPLY' ? 'Başvuru' : 'Davet'}
                      />
                    </TableCell>
                    <TableCell>{inv.companyName || '—'}</TableCell>
                    <TableCell>
                      {inv.tier ? TIER_LABEL[inv.tier as MembershipTier] ?? inv.tier : '—'}
                    </TableCell>
                    <TableCell>{inv.createdAt ? relativeDate(inv.createdAt) : '—'}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Daveti tekrar gönder">
                        <span>
                          <IconButton
                            size="small"
                            disabled={busyId === inv.id}
                            onClick={() => handleResend(inv)}
                          >
                            <RefreshIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Daveti iptal et">
                        <span>
                          <IconButton
                            size="small"
                            color="error"
                            disabled={busyId === inv.id}
                            onClick={() => handleCancel(inv)}
                          >
                            <CancelOutlinedIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </AccordionDetails>
    </Accordion>
  );
}

export default function NbMembers() {
  const navigate = useNavigate();
  const [data, setData] = useState<PagedResult<NbMember> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  // Durum süzgeci URL'den okunur ve URL'e yazılır.
  //
  // Panodaki "Üyelere git" butonları /members?status=NEEDS_INFO gibi
  // adreslere yönlendiriyordu ama ekran parametreyi okumuyordu: buton
  // süzülmemiş listeye düşürüyor, admin aradığını bulamıyordu. Aynı zamanda
  // süzülmüş bir listeyi paylaşmayı/yer imine eklemeyi mümkün kılıyor.
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState<NbMemberStatus | ''>(
    () => (searchParams.get('status') as NbMemberStatus | null) ?? '',
  );
  const [tier, setTier] = useState<MembershipTier | ''>('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');

  // ── Toplu işlem ────────────────────────────────────────────────────────
  // KAFSİAD gibi toplu kayıtlarda aynı işlemi 39 üyeye tek tek uygulamak
  // pratikte yapılmıyor. Seçim yalnız GÖRÜNEN satırlar üzerinden çalışır:
  // filtre değişince seçim temizlenir, yoksa "neyi seçmiştim" belirsizleşir.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<NbBulkAction>('REOPEN_APPROVAL');
  const [bulkDays, setBulkDays] = useState(14);
  const [bulkTemplate, setBulkTemplate] = useState<'RECEIVED' | 'APPROVED' | 'NEEDS_INFO'>('APPROVED');
  const [bulkPushTitle, setBulkPushTitle] = useState('');
  const [bulkPushMessage, setBulkPushMessage] = useState('');
  const [bulkNote, setBulkNote] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkResult, setBulkResult] = useState<NbBulkResult | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const [createOpen, setCreateOpen] = useState(false);
  const [createMsg, setCreateMsg] = useState<{ severity: 'success' | 'info'; text: string } | null>(null);
  const [invitesRefresh, setInvitesRefresh] = useState(0);
  const [actionMember, setActionMember] = useState<NbMember | null>(null);
  /** Kademe fiyat kataloğu — gelir riski bunun üzerinden hesaplanır. */
  const [tierPrices, setTierPrices] = useState<Record<string, number> | null>(null);
  /** Yazma işlemi sonrası 10 sn'lik geri-al kutusu. */
  const [undo, setUndo] = useState<NbUndoState | null>(null);
  const [deleteMember, setDeleteMember] = useState<NbMember | null>(null);

  // Search debounce
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 250);
    return () => clearTimeout(t);
  }, [search]);

  /**
   * Çip seçimi tek seçimlidir; aynı çipe ikinci kez basmak filtreyi kaldırır.
   *
   * Prototipteki çoklu seçim istemcideki sabit listede çalışıyordu. Burada
   * liste sunucudan sayfalı geliyor ve iki filtrenin kesişimi sunucuya
   * anlatılamıyor; tek seçim, gösterdiği sonucu gerçekten karşılayan filtredir.
   */
  const applyQuickFilter = (value: Exclude<QuickFilter, 'all'>) => {
    setQuickFilter((prev) => (prev === value ? 'all' : value));
  };

  // Çip → sunucu süzgeci. "Aksiyon bekleyen" ve "eksik profil" sunucuda
  // karşılığı olmayan türetilmiş kümeler; onlar gelen sayfada süzülür.
  useEffect(() => {
    if (quickFilter === 'payment') {
      setStatus('APPROVED_PENDING_PAYMENT');
      setTier('');
    } else if (quickFilter === 'trial') {
      setStatus('TRIAL');
      setTier('');
    } else if (quickFilter === 'kurucu') {
      setStatus('');
      setTier('KURUCU');
    } else {
      setStatus('');
      setTier('');
    }
    setPage(0);
  }, [quickFilter]);

  // Kademe fiyatları bir kez çekilir; katalog yavaş değişen küçük bir liste.
  useEffect(() => {
    nbAdminService
      .listTiers()
      .then((tiers) => {
        const map: Record<string, number> = {};
        tiers.forEach((t) => {
          map[t.code] = t.priceAmount;
        });
        setTierPrices(map);
      })
      // Katalog gelmezse gelir riski "—" gösterir; sayfa çalışmaya devam eder.
      .catch(() => setTierPrices(null));
  }, []);

  const load = () => {
    setLoading(true);
    nbAdminService
      .listMembers({
        status: status || undefined,
        tier: tier || undefined,
        page,
        size: 25,
      })
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err?.message ?? 'Veri yüklenemedi');
        setLoading(false);
      });
  };

  useEffect(load, [page, status, tier]); // eslint-disable-line react-hooks/exhaustive-deps

  // Süzgeç değişince adresi güncelle (geçmişi kirletmeden).
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (status) next.set('status', status);
    else next.delete('status');
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Filtre/sayfa değişince seçim düşer — görünmeyen üyeye işlem uygulanmasın.
  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, status, tier, quickFilter, debouncedSearch]);

  // İstemci taraflı arama + sunucuda karşılığı olmayan çipler + iş sıralaması
  const filtered = useMemo(() => {
    let result = data?.content ?? [];
    if (debouncedSearch) {
      result = result.filter((m) => {
        const haystack = [
          m.companyName,
          m.city,
          m.clanName,
          ...(m.sectorCodes ?? (m.sectorCode ? [m.sectorCode] : [])),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(debouncedSearch);
      });
    }
    if (quickFilter === 'task') {
      result = result.filter((m) => memberTask(m) !== null);
    }
    if (quickFilter === 'incomplete') {
      result = result.filter((m) => missingMatchingFields(m).length > 0);
    }
    // Bekleyen işi olan üye üstte — liste bir kayıt defteri değil, iş kuyruğu.
    return sortByTask(result);
  }, [data?.content, debouncedSearch, quickFilter]);

  const toggleSelectAll = () =>
    setSelectedIds((prev) =>
      prev.size === filtered.length ? new Set() : new Set(filtered.map((m) => m.memberId)),
    );

  /**
   * Satırdaki tek işi çalıştır.
   *
   * İki tür iş var ve ikisi farklı davranır:
   *
   * - **Kayıt değiştiren** işler (ödeme onayı, süre açma) burada çalışır ve
   *   arkasından 10 saniyelik geri-al kutusu bırakır. Kalıcı yeşil bir
   *   "başarılı" şeridi yerine geri-al: yanlış üyeye basıldıysa lazım olan
   *   şey onay değil, dönüş yoludur.
   * - **Başka bir ekrana götüren** işler (komite kararı, belge isteme) yazma
   *   yapmaz, ilgili kuyruğa ya da diyaloğa götürür. Bunlarda geri alınacak
   *   bir şey olmadığı için kutu da çıkmaz.
   *
   * Ödeme onayı geri-al olarak sunulur ama gerçekte sunucuda bir "geri al"
   * ucu yok: kutu yalnız 10 saniye boyunca **askıya alınmış** bir isteği
   * iptal eder, yani istek o süre dolmadan gönderilmez. Gönderilmiş bir
   * ödeme onayını geri alıyormuş gibi yapmak, yapamayacağımız bir söz olurdu.
   */
  const runTask = (member: NbMember, task: NbMemberTask) => {
    const name = member.companyName ?? 'Üye';

    if (task.kind === 'committee') {
      navigate(`/nartbusiness/verification?memberId=${member.memberId}`);
      return;
    }
    if (task.kind === 'requestInfo' || task.kind === 'completeProfile') {
      // Eksik bilgi talebi üyenin kendi detayında, alan alan yapılır; buradan
      // toptan bir "belge iste" göndermek hangi belgenin istendiğini kaydetmez.
      navigate(`/nartbusiness/members/${member.memberId}?tab=identity`);
      return;
    }
    if (task.kind === 'trialEnding') {
      navigate(`/nartbusiness/members/${member.memberId}?tab=membership`);
      return;
    }

    // Buradan sonrası yazma işlemi: gönderim 10 sn askıda bekler.
    const label = task.kind === 'confirmPayment' ? 'Ödeme onaylandı' : 'Ödeme süresi yeniden açıldı';
    let cancelled = false;

    const timer = setTimeout(async () => {
      if (cancelled) return;
      try {
        if (task.kind === 'confirmPayment') {
          await nbAdminService.confirmBankTransfer(member.memberId, {
            adminNote: 'Üye listesinden onaylandı',
          });
        } else {
          await nbAdminService.reopenApproval(member.memberId, 14, 'Üye listesinden yeniden açıldı');
        }
        load();
      } catch (e) {
        setError(nbErrorMessage(e, `${name} için işlem başarısız`));
      }
    }, NB_UNDO_MS);

    setUndo({
      message: `${name} — ${label}.`,
      onUndo: () => {
        cancelled = true;
        clearTimeout(timer);
      },
    });
  };

  const runBulk = async () => {
    setBulkBusy(true);
    setBulkResult(null);
    try {
      const res = await nbAdminService.bulkMemberAction({
        memberIds: [...selectedIds],
        action: bulkAction,
        days:
          bulkAction === 'REOPEN_APPROVAL' || bulkAction === 'GRANT_TRIAL'
            ? bulkDays
            : undefined,
        template: bulkAction === 'RESEND_EMAIL' ? bulkTemplate : undefined,
        pushTitle: bulkAction === 'SEND_PUSH' ? bulkPushTitle.trim() : undefined,
        pushMessage: bulkAction === 'SEND_PUSH' ? bulkPushMessage.trim() : undefined,
        note: bulkNote.trim() || undefined,
      });
      setBulkResult(res);
      load();
    } catch (e: any) {
      setError(nbErrorMessage(e, 'Toplu işlem başarısız'));
      setBulkOpen(false);
    } finally {
      setBulkBusy(false);
    }
  };

  /**
   * Başlık şeridindeki dört sayı.
   *
   * Toplam üye sunucudan gelir; diğer üçü **gelen sayfa** üzerinden
   * hesaplanır ve ipucu metninde "bu sayfada" yazar. 25 üyelik bir sayfada
   * "5 aksiyon bekliyor" ile tüm ağda 5 iş olması aynı şey değil; ikisini
   * ayırmayan bir sayı yanlış bir sayıdır.
   */
  const stats = useMemo(() => {
    const all = data?.content ?? [];
    const now = new Date();
    const thisMonth = all.filter((m) => {
      const d = new Date(m.joinedAt);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;

    // Gelir riski: ödemesi beklenen üyelerin kademe ücretleri toplamı.
    // Kademe fiyatı üyede taşınmıyor, katalogdan eşlenir; katalog gelmediyse
    // risk hesaplanamaz ve kutu "—" gösterir. Eksik veriyle uydurulmuş bir ₺
    // rakamı, hiç rakam olmamasından kötüdür.
    const awaiting = all.filter((m) => m.status === 'APPROVED_PENDING_PAYMENT');
    const revenueAtRisk = tierPrices
      ? awaiting.reduce((sum, m) => sum + (tierPrices[m.tier] ?? 0), 0)
      : null;

    return {
      total: data?.totalElements ?? 0,
      pendingTasks: countPendingTasks(all),
      awaiting: awaiting.length,
      thisMonth,
      revenueAtRisk,
    };
  }, [data, tierPrices]);

  return (
    <Box>
      <NbPageHeader
        crumb="NartBusiness · Üyelik"
        title="Üyeler"
        subtitle="Bekleyen işi olan üyeler üstte. Her satırda o üyenin tek işi buton olarak duruyor."
        actions={
          <>
            {/* Geçmiş sidebar'a menü öğesi olarak eklenmedi: menü zaten 79
                öğeydi, seyrek kullanılan bir rapor oraya girseydi az önce
                düzeltilen kalabalık geri gelirdi. Ait olduğu yer burası. */}
            <Button disableElevation sx={nbSecondaryBtn} onClick={() => setHistoryOpen(true)}>
              Toplu işlem geçmişi
            </Button>
            <Button disableElevation sx={nbPrimaryBtn} onClick={() => setCreateOpen(true)}>
              + Üye oluştur
            </Button>
          </>
        }
        kpis={
          <>
            <NbKpi
              label="TOPLAM ÜYE"
              value={nbNumber(stats.total)}
              hint={stats.thisMonth ? `${stats.thisMonth} bu ay` : undefined}
              active={quickFilter === 'all'}
              onClick={() => {
                setQuickFilter('all');
                setSearch('');
                setPage(0);
              }}
            />
            <NbKpi
              label="AKSİYON BEKLEYEN"
              value={nbNumber(stats.pendingTasks)}
              hint="bu sayfada"
              tone="bad"
              active={quickFilter === 'task'}
              onClick={() => applyQuickFilter('task')}
            />
            <NbKpi label="BU AY YENİ" value={nbNumber(stats.thisMonth)} hint="bu sayfada" />
            <NbKpi
              label="GELİR RİSKİ"
              value={stats.revenueAtRisk == null ? '—' : formatMoney(stats.revenueAtRisk)}
              hint={stats.awaiting ? `${stats.awaiting} bekleyen ödeme` : 'bekleyen ödeme yok'}
              tone="warn"
              active={quickFilter === 'payment'}
              onClick={() => applyQuickFilter('payment')}
            />
          </>
        }
      />

      {/* Email-davet modeli — bekleyen davetler (üye listesinde görünmezler) */}
      <PendingInvitesPanel refreshKey={invitesRefresh} />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading && !data && !error && <MemberTableSkeleton />}

      {/* Veri geldiyse SWR: filtre/sayfa değişiminde tabloyu koru, üstte ince
          ilerleme çubuğu göster — mevcut listeyi shimmer'a kurban etme. */}
      {data && !error && (
        <>
          <Box sx={{ height: 4, mb: 0.5 }}>{loading && <LinearProgress />}</Box>

          <Paper elevation={0} sx={{ ...(nbCard as object), overflow: 'hidden' }}>
            <NbFilterBar
              search={search}
              onSearch={setSearch}
              placeholder="Şirket, şehir, sülale veya sektör…"
              chips={QUICK_FILTERS.map((f) => ({
                key: f.value,
                label: f.label,
                active: quickFilter === f.value,
                onToggle: () => applyQuickFilter(f.value),
              }))}
              trailing={
                <Typography sx={{ fontSize: 11.5, color: nb.textFaint }}>
                  {filtered.length} kayıt
                </Typography>
              }
            />

            {/* Seçim çubuğu — yalnız seçim varken. Boşken yer kaplamak, hiç
                kullanılmayan bir araç çubuğunu kalıcı gürültüye çevirirdi. */}
            <NbBulkBar
              count={selectedIds.size}
              actions={[
                {
                  label: 'Ödeme hatırlat',
                  onClick: () => {
                    setBulkAction('RESEND_EMAIL');
                    setBulkTemplate('APPROVED');
                    setBulkResult(null);
                    setBulkOpen(true);
                  },
                },
                {
                  label: 'Belge iste',
                  onClick: () => {
                    setBulkAction('RESEND_EMAIL');
                    setBulkTemplate('NEEDS_INFO');
                    setBulkResult(null);
                    setBulkOpen(true);
                  },
                },
                {
                  label: 'Diğer toplu işlem…',
                  onClick: () => {
                    setBulkAction('REOPEN_APPROVAL');
                    setBulkResult(null);
                    setBulkOpen(true);
                  },
                },
                { label: 'Seçimi temizle', ghost: true, onClick: () => setSelectedIds(new Set()) },
              ]}
            />

            <Box sx={nbHeadRow(ROW_GRID)}>
              <Box sx={{ display: 'flex' }}>
                <Checkbox
                  size="small"
                  indeterminate={selectedIds.size > 0 && selectedIds.size < filtered.length}
                  checked={filtered.length > 0 && selectedIds.size === filtered.length}
                  onChange={toggleSelectAll}
                  sx={{ p: 0, color: nb.inputBorder, '&.Mui-checked': { color: nb.green } }}
                  inputProps={{ 'aria-label': 'Tümünü seç' }}
                />
              </Box>
              <Box>ÜYE</Box>
              <Box>KADEME</Box>
              <Box>DURUM</Box>
              <Box>BEKLEYEN İŞ</Box>
              <Box />
            </Box>

            {filtered.map((m) => (
              <MemberRow
                key={m.memberId}
                member={m}
                onClick={() => navigate(`/nartbusiness/members/${m.memberId}`)}
                onTask={(task) => runTask(m, task)}
                selected={selectedIds.has(m.memberId)}
                onToggleSelect={() => toggleSelect(m.memberId)}
              />
            ))}

            {filtered.length === 0 && (
              <Stack alignItems="center" sx={{ py: 6, gap: 1 }}>
                <Typography sx={{ fontSize: 13, color: nb.textMuted }}>
                  {debouncedSearch || quickFilter !== 'all'
                    ? 'Filtreyle eşleşen üye yok.'
                    : 'Henüz hiç üye yok.'}
                </Typography>
                {(debouncedSearch || quickFilter !== 'all') && (
                  <Button
                    disableElevation
                    sx={nbSecondaryBtn}
                    onClick={() => {
                      setSearch('');
                      setQuickFilter('all');
                    }}
                  >
                    Filtreleri temizle
                  </Button>
                )}
              </Stack>
            )}
          </Paper>

          {data.totalPages > 1 && (
            <Stack alignItems="center" sx={{ mt: 2 }}>
              <Pagination
                count={data.totalPages}
                page={page + 1}
                onChange={(_, p) => setPage(p - 1)}
              />
            </Stack>
          )}
        </>
      )}


      {/* Toplu işlem */}
      <Dialog open={bulkOpen} onClose={() => !bulkBusy && setBulkOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Toplu İşlem — {selectedIds.size} üye</DialogTitle>
        <DialogContent>
          {!bulkResult ? (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField
                select
                size="small"
                label="İşlem"
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value as typeof bulkAction)}
              >
                <MenuItem value="REOPEN_APPROVAL">Ödeme süresini yeniden aç / uzat</MenuItem>
                <MenuItem value="GRANT_TRIAL">Ücretsiz deneme ver</MenuItem>
                <MenuItem value="RESEND_EMAIL">Hazır e-posta gönder</MenuItem>
                <MenuItem value="SEND_PUSH">Bildirim gönder</MenuItem>
                <MenuItem value="SEND_SET_PASSWORD">Şifre belirleme e-postası gönder</MenuItem>
              </TextField>

              {bulkAction === 'SEND_SET_PASSWORD' && (
                <Alert severity="info" sx={{ '& .MuiAlert-message': { fontSize: 13 } }}>
                  Her üyeye 72 saat geçerli, kendine ait bir şifre belirleme bağlantısı
                  gider. Metin &laquo;önceki e-postamız size ulaşmamış olabilir&raquo;
                  çerçevesinde yazılmıştır.
                  <br />
                  <br />
                  Geçici şifreli karşılama e-postası yeniden gönderilemez, çünkü o şifre
                  hiçbir yerde saklanmıyor. Maili alamamış üyeler için doğru yol budur.
                  <br />
                  <br />
                  Üyenin mevcut şifresi bağlantıya tıklayana kadar geçerli kalır. Hesabı
                  bağlı olmayan üyeler sebebiyle birlikte atlanır.
                </Alert>
              )}

              {bulkAction === 'REOPEN_APPROVAL' && (
                <TextField
                  size="small"
                  type="number"
                  label="Ödeme penceresi (gün)"
                  value={bulkDays}
                  onChange={(e) => setBulkDays(Number(e.target.value))}
                  inputProps={{ min: 1, max: 365 }}
                  helperText="Her üyeye bildirim ve e-posta gider. Yalnız onayı bekleyen veya süresi dolmuş üyelerde çalışır; diğerleri atlanır."
                />
              )}

              {bulkAction === 'GRANT_TRIAL' && (
                <TextField
                  size="small"
                  type="number"
                  label="Deneme süresi (gün)"
                  value={bulkDays}
                  onChange={(e) => setBulkDays(Number(e.target.value))}
                  inputProps={{ min: 1, max: 365 }}
                  helperText="Yalnız ödeme bekleyen ve daha önce deneme kullanmamış üyelerde çalışır; diğerleri sebebiyle birlikte atlanır."
                />
              )}

              {bulkAction === 'SEND_PUSH' && (
                <>
                  <TextField
                    size="small"
                    label="Bildirim başlığı"
                    value={bulkPushTitle}
                    onChange={(e) => setBulkPushTitle(e.target.value)}
                    inputProps={{ maxLength: 80 }}
                  />
                  <TextField
                    size="small"
                    multiline
                    minRows={3}
                    label="Bildirim metni"
                    value={bulkPushMessage}
                    onChange={(e) => setBulkPushMessage(e.target.value)}
                    inputProps={{ maxLength: 300 }}
                    helperText="Aynı metin seçili tüm üyelere gider. Kişiselleştirme yok — kişisel bir mesaj gerekiyorsa üye detayından tek tek gönder."
                  />
                </>
              )}

              {bulkAction === 'RESEND_EMAIL' && (
                <TextField
                  select
                  size="small"
                  label="Şablon"
                  value={bulkTemplate}
                  onChange={(e) => setBulkTemplate(e.target.value as typeof bulkTemplate)}
                >
                  <MenuItem value="RECEIVED">Başvurunuz alındı</MenuItem>
                  <MenuItem value="APPROVED">Onaylandı — ödeme bekleniyor</MenuItem>
                  <MenuItem value="NEEDS_INFO">Ek bilgi talebi</MenuItem>
                </TextField>
              )}

              <TextField
                size="small"
                label="Not (opsiyonel)"
                value={bulkNote}
                onChange={(e) => setBulkNote(e.target.value)}
                helperText="İşlem kaydına yazılır."
              />
            </Stack>
          ) : (
            <Stack spacing={1.5} sx={{ pt: 1 }}>
              <Alert severity={bulkResult.failed === 0 ? 'success' : 'warning'}>
                {bulkResult.succeeded}/{bulkResult.total} üyede işlem tamamlandı.
              </Alert>
              {/* Kısmi başarı gizlenmiyor: hangi üyede neden olmadığı yazılı. */}
              {bulkResult.failed > 0 && (
                <Box sx={{ maxHeight: 240, overflowY: 'auto' }}>
                  {bulkResult.outcomes
                    .filter((o) => !o.ok)
                    .map((o) => (
                      <Typography key={o.memberId} variant="caption" display="block" color="text.secondary">
                        {(data?.content ?? []).find((m) => m.memberId === o.memberId)?.companyName
                          ?? o.memberId.slice(0, 8)}
                        {' — '}
                        {o.detail ?? 'bilinmeyen hata'}
                      </Typography>
                    ))}
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          {!bulkResult ? (
            <>
              <Button onClick={() => setBulkOpen(false)} disabled={bulkBusy}>Vazgeç</Button>
              <Button
                variant="contained"
                onClick={() => void runBulk()}
                disabled={
                  bulkBusy ||
                  (bulkAction === 'SEND_PUSH' &&
                    (!bulkPushTitle.trim() || !bulkPushMessage.trim()))
                }
              >
                {bulkBusy ? 'Uygulanıyor…' : `${selectedIds.size} üyeye uygula`}
              </Button>
            </>
          ) : (
            <Button
              variant="contained"
              onClick={() => {
                setBulkOpen(false);
                setSelectedIds(new Set());
              }}
            >
              Kapat
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <NbBulkHistoryDialog open={historyOpen} onClose={() => setHistoryOpen(false)} />

      <NbCreateMemberDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(result) => {
          load();
          if (result?.invited) {
            setInvitesRefresh((n) => n + 1);
            setCreateMsg({
              severity: 'info',
              text:
                result.message ||
                `Davet e-postası gönderildi (${result.email ?? ''}). Kullanıcı aynı e-postayla kaydolup profilini tamamlayınca üyelik otomatik tanımlanacak.`,
            });
          } else {
            setCreateMsg({
              severity: 'success',
              text:
                result?.message ||
                'Üye oluşturuldu. Yeni hesap açıldıysa giriş bilgileri e-postayla gönderilir; mevcut kullanıcıyı elle bilgilendirin.',
            });
          }
        }}
      />

      <Snackbar
        open={!!createMsg}
        autoHideDuration={createMsg?.severity === 'info' ? 9000 : 5000}
        onClose={() => setCreateMsg(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {createMsg ? (
          <Alert
            severity={createMsg.severity}
            variant="filled"
            onClose={() => setCreateMsg(null)}
            sx={{ maxWidth: 520 }}
          >
            {createMsg.text}
          </Alert>
        ) : undefined}
      </Snackbar>

      <NbMemberActionDialog
        open={!!actionMember}
        member={actionMember}
        onClose={() => setActionMember(null)}
        onActionDone={() => {
          setActionMember(null);
          load();
        }}
      />

      <NbMemberHardDeleteDialog
        open={!!deleteMember}
        member={deleteMember}
        onClose={() => setDeleteMember(null)}
        onDeleted={() => {
          setDeleteMember(null);
          load();
        }}
      />
      {/* Kalıcı "başarılı" şeridi yok: her yazma işlemi 10 sn'lik geri-al
          kutusu bırakır, süre dolunca işlem kalıcı sayılır. */}
      <NbUndoToast state={undo} onClose={() => setUndo(null)} />
    </Box>
  );
}

/** İlk yükleme iskeleti — gerçek tablo düzeniyle hizalı satır placeholder'ları. */
function MemberTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <>
      <Box sx={{ height: 4, mb: 0.5 }}>
        <LinearProgress />
      </Box>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small" sx={{ minWidth: 720 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={cellHeadSx}>Üye</TableCell>
              <TableCell sx={cellHeadSx}>Kademe</TableCell>
              <TableCell sx={cellHeadSx}>Durum</TableCell>
              <TableCell sx={cellHeadSx}>Rozet</TableCell>
              <TableCell sx={cellHeadSx}>Katılım</TableCell>
              <TableCell sx={cellHeadSx} align="right">
                {' '}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Array.from({ length: rows }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Skeleton variant="circular" width={36} height={36} />
                    <Box sx={{ minWidth: 0 }}>
                      <Skeleton variant="text" width={180} />
                      <Skeleton variant="text" width={120} height={14} />
                    </Box>
                  </Stack>
                </TableCell>
                <TableCell><Skeleton variant="rounded" width={64} height={22} /></TableCell>
                <TableCell><Skeleton variant="rounded" width={88} height={22} /></TableCell>
                <TableCell><Skeleton variant="rounded" width={88} height={22} /></TableCell>
                <TableCell><Skeleton variant="text" width={70} /></TableCell>
                <TableCell align="right"><Skeleton variant="circular" width={24} height={24} sx={{ ml: 'auto' }} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}

// Caps yerine küçük gri kalın — modern tablo başlığı
const cellHeadSx = {
  textTransform: 'none' as const,
  fontWeight: 600,
  color: 'text.secondary',
  fontSize: 12,
  letterSpacing: 0.2,
};

