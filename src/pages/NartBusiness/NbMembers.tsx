import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  LinearProgress,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Pagination,
  Paper,
  Select,
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
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RefreshIcon from '@mui/icons-material/Refresh';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
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
  fullDate,
  RACE_LABEL,
  relativeDate,
  STATUS_LABEL,
  TIER_LABEL,
} from '../../utils/nbDisplay';
import { NbStatusBadge } from '../../components/nartbusiness';
import { URGENCY_STYLE, urgencyOf } from '../../theme/nbBrand';
import type { NbBulkResult } from '../../services/nartbusiness/nbAdminService';
import NbCreateMemberDialog from './NbCreateMemberDialog';
import NbMemberActionDialog from './NbMemberActionDialog';
import NbMemberHardDeleteDialog from './NbMemberHardDeleteDialog';

type QuickFilter =
  | 'all'
  | 'pending'
  | 'recent7d'
  | 'incomplete'
  | 'kurucu'
  | 'professional'
  | 'trialEnding'
  | 'approvalExpired';

/** "Denemesi bitiyor" eşiği — bu kadar gün kalanlar takip listesine düşer. */
const TRIAL_ENDING_DAYS = 7;

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

const QUICK_FILTERS: { value: QuickFilter; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'pending', label: 'Bekleyenler' },
  { value: 'recent7d', label: 'Son 7 gün' },
  { value: 'incomplete', label: 'Eksik profil' },
  { value: 'kurucu', label: 'Kurucu' },
  { value: 'professional', label: 'Profesyonel' },
  // Takip filtreleri: ikisi de "bugün dokunulması gereken" üyeleri ayırır.
  { value: 'trialEnding', label: 'Denemesi bitiyor' },
  { value: 'approvalExpired', label: 'Onay süresi doldu' },
];

/** Deneme bitişine kalan tam gün; deneme yoksa null. */
function trialDaysLeft(trialEndsAt?: string): number | null {
  if (!trialEndsAt) return null;
  const ms = new Date(trialEndsAt).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;
  return Math.max(0, Math.floor(ms / 86400000));
}

/** Listede gösterilecek küçük üye-aksiyon menüsü (kebab). */
function RowMenu({
  member,
  onOpen,
  onActionRequest,
  onDeleteRequest,
}: {
  member: NbMember;
  onOpen: () => void;
  onActionRequest: () => void;
  onDeleteRequest: () => void;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const open = !!anchor;
  const isTerminal =
    member.status === 'CANCELLED' || member.status === 'REJECTED';

  const close = () => setAnchor(null);

  return (
    <>
      <IconButton
        size="small"
        onClick={(e) => {
          e.stopPropagation();
          setAnchor(e.currentTarget);
        }}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu anchorEl={anchor} open={open} onClose={close}>
        <MenuItem
          onClick={(e) => {
            e.stopPropagation();
            close();
            onOpen();
          }}
        >
          <ListItemIcon>
            <OpenInNewIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Detayı aç</ListItemText>
        </MenuItem>
        {!isTerminal && (
          <MenuItem
            onClick={(e) => {
              e.stopPropagation();
              close();
              onActionRequest();
            }}
          >
            <ListItemIcon>
              {member.status === 'SUSPENDED' ? (
                <VerifiedIcon fontSize="small" color="success" />
              ) : (
                <PauseCircleOutlineIcon fontSize="small" color="warning" />
              )}
            </ListItemIcon>
            <ListItemText>
              {member.status === 'SUSPENDED' ? 'Aktifleştir / İptal Et' : 'Askıya Al / İptal Et'}
            </ListItemText>
          </MenuItem>
        )}
        {isTerminal && (
          <MenuItem disabled>
            <ListItemIcon>
              <CancelOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Sonuçlandı — aksiyon yok</ListItemText>
          </MenuItem>
        )}
        <MenuItem
          onClick={(e) => {
            e.stopPropagation();
            close();
            onDeleteRequest();
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <DeleteForeverIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Kalıcı Sil</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}

function MemberRow({
  member,
  onClick,
  onActionRequest,
  onDeleteRequest,
  selected,
  onToggleSelect,
}: {
  member: NbMember;
  onClick: () => void;
  onActionRequest: () => void;
  onDeleteRequest: () => void;
  selected: boolean;
  onToggleSelect: () => void;
}) {
  const navigate = useNavigate();
  const initial = (member.companyName ?? '?').trim().charAt(0).toUpperCase();
  const identityLine =
    member.race && member.clanName
      ? `${RACE_LABEL[member.race]} · ${member.clanName}`
      : member.race
      ? RACE_LABEL[member.race]
      : null;

  return (
    <TableRow
      hover
      sx={{ cursor: 'pointer' }}
      onClick={onClick}
    >
      {/* Üye (compound cell): avatar + şirket + lokasyon/kimlik */}
      <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          size="small"
          checked={selected}
          onChange={onToggleSelect}
          inputProps={{ 'aria-label': `${member.companyName ?? 'Üye'} seç` }}
        />
      </TableCell>

      <TableCell>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar
            sx={{
              width: 36,
              height: 36,
              bgcolor: member.companyName ? 'primary.light' : 'warning.light',
              fontSize: 14,
            }}
          >
            {initial}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
              {member.companyName ? (
                <Typography
                  variant="body2"
                  fontWeight={600}
                  sx={{
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: 240,
                  }}
                >
                  {member.companyName}
                </Typography>
              ) : (
                <Chip
                  size="small"
                  color="warning"
                  variant="outlined"
                  label="Şirket bilgisi eksik"
                />
              )}
              {member.memberType === 'PROFESSIONAL' && (
                <Chip size="small" color="info" label="Profesyonel" sx={{ height: 20 }} />
              )}
              {/* Doğrulanmış rozeti kendi kolonunu hak etmiyordu: neredeyse
                  her satırda boştu ve tablonun en geniş alanı "—" ile
                  doluyordu. İsmin yanında sessiz bir işaret olarak daha
                  doğru — taşıdığı bilgi zaten "bu isme güvenilir". */}
              {member.verifiedBusiness && (
                <Tooltip title="Doğrulanmış İşletme" arrow>
                  <VerifiedIcon sx={{ fontSize: 15, color: 'info.main', flexShrink: 0 }} />
                </Tooltip>
              )}
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {[
                member.memberType === 'PROFESSIONAL' ? member.personJobTitle : member.city,
                identityLine,
              ]
                .filter(Boolean)
                .join(' · ') || 'Profil bilgisi yok'}
            </Typography>
          </Box>
        </Stack>
      </TableCell>

      {/* Kademe */}
      <TableCell>
        <Chip size="small" variant="outlined" label={TIER_LABEL[member.tier]} />
      </TableCell>

      {/* Durum */}
      <TableCell>
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ flexWrap: 'nowrap' }}>
          <NbStatusBadge status={member.status} label={STATUS_LABEL[member.status]} />
          {member.status === 'TRIAL' &&
            (() => {
              const r = trialRemaining(member.trialEndsAt);
              return r ? (
                <Tooltip
                  title={member.trialEndsAt ? `Deneme bitişi: ${fullDate(member.trialEndsAt)}` : ''}
                  arrow
                >
                  {/* Alt satır yerine yan yana: iki satırlık hücre satır
                      yüksekliğini şişiriyor ve tarama hızını düşürüyordu. */}
                  <Typography
                    variant="caption"
                    sx={{ color: r.color, fontWeight: r.weight, whiteSpace: 'nowrap' }}
                  >
                    {r.text}
                  </Typography>
                </Tooltip>
              ) : null;
            })()}
        </Stack>
      </TableCell>

      {/* Katılım — relative + hover full */}
      <TableCell>
        <Tooltip title={fullDate(member.joinedAt)} arrow>
          <Typography variant="body2">{relativeDate(member.joinedAt)}</Typography>
        </Tooltip>
      </TableCell>

      {/* Aksiyon — kebab */}
      <TableCell align="right" onClick={(e) => e.stopPropagation()}>
        <RowMenu
          member={member}
          onOpen={() => navigate(`/nartbusiness/members/${member.memberId}`)}
          onActionRequest={onActionRequest}
          onDeleteRequest={onDeleteRequest}
        />
      </TableCell>
    </TableRow>
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
        setMsg({ severity: 'error', text: e?.response?.data?.error?.message ?? 'Gönderilemedi' }),
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
        setMsg({ severity: 'error', text: e?.response?.data?.error?.message ?? 'İptal edilemedi' }),
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
  const [status, setStatus] = useState<NbMemberStatus | ''>('');
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
  const [bulkAction, setBulkAction] = useState<'REOPEN_APPROVAL' | 'RESEND_EMAIL'>('REOPEN_APPROVAL');
  const [bulkDays, setBulkDays] = useState(14);
  const [bulkTemplate, setBulkTemplate] = useState<'RECEIVED' | 'APPROVED' | 'NEEDS_INFO'>('APPROVED');
  const [bulkNote, setBulkNote] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkResult, setBulkResult] = useState<NbBulkResult | null>(null);

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
  const [deleteMember, setDeleteMember] = useState<NbMember | null>(null);

  // Search debounce
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 250);
    return () => clearTimeout(t);
  }, [search]);

  // Quick filter → status/tier seçimine map
  useEffect(() => {
    if (quickFilter === 'pending') {
      setStatus('SUBMITTED');
      setTier('');
    } else if (quickFilter === 'kurucu') {
      setTier('KURUCU');
    } else if (quickFilter === 'trialEnding') {
      // Sunucudan yalnız denemeleri çek; kalan gün eşiği istemcide süzülür.
      setStatus('TRIAL');
      setTier('');
    } else if (quickFilter === 'approvalExpired') {
      setStatus('APPROVED_EXPIRED');
      setTier('');
    }
    setPage(0);
  }, [quickFilter]);

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

  // Filtre/sayfa değişince seçim düşer — görünmeyen üyeye işlem uygulanmasın.
  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, status, tier, quickFilter, debouncedSearch]);

  // İstemci taraflı arama + quick filter (recent7d, incomplete)
  const filtered = useMemo(() => {
    const all = data?.content ?? [];
    let result = all;
    if (debouncedSearch) {
      result = result.filter((m) => {
        const haystack = [m.companyName, m.city, m.clanName, ...(m.sectorCodes ?? (m.sectorCode ? [m.sectorCode] : []))]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(debouncedSearch);
      });
    }
    if (quickFilter === 'recent7d') {
      const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
      result = result.filter((m) => new Date(m.joinedAt).getTime() >= cutoff);
    }
    if (quickFilter === 'incomplete') {
      result = result.filter(
        (m) => !m.companyName || (!(m.sectorCodes?.length) && !m.sectorCode) || !m.race || !m.clanName,
      );
    }
    if (quickFilter === 'professional') {
      result = result.filter((m) => m.memberType === 'PROFESSIONAL');
    }
    if (quickFilter === 'trialEnding') {
      result = result
        .filter((m) => {
          const d = trialDaysLeft(m.trialEndsAt);
          return d != null && d <= TRIAL_ENDING_DAYS;
        })
        // En acili üstte: aksiyon listesi olarak kullanılacak.
        .sort((a, b) => (trialDaysLeft(a.trialEndsAt) ?? 0) - (trialDaysLeft(b.trialEndsAt) ?? 0));
    }
    return result;
  }, [data?.content, debouncedSearch, quickFilter]);

  const toggleSelectAll = () =>
    setSelectedIds((prev) =>
      prev.size === filtered.length ? new Set() : new Set(filtered.map((m) => m.memberId)),
    );

  const runBulk = async () => {
    setBulkBusy(true);
    setBulkResult(null);
    try {
      const res = await nbAdminService.bulkMemberAction({
        memberIds: [...selectedIds],
        action: bulkAction,
        days: bulkAction === 'REOPEN_APPROVAL' ? bulkDays : undefined,
        template: bulkAction === 'RESEND_EMAIL' ? bulkTemplate : undefined,
        note: bulkNote.trim() || undefined,
      });
      setBulkResult(res);
      load();
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? e?.message ?? 'Toplu işlem başarısız');
      setBulkOpen(false);
    } finally {
      setBulkBusy(false);
    }
  };

  // Stats — şu anki sayfa üzerinden hesaplanır (backend toplam stats için /dashboard/stats var ama burada yeterli)
  const stats = useMemo(() => {
    const all = data?.content ?? [];
    return {
      total: data?.totalElements ?? 0,
      active: all.filter((m) => m.status === 'ACTIVE').length,
      trial: all.filter((m) => m.status === 'TRIAL').length,
      pending: all.filter(
        (m) =>
          m.status === 'SUBMITTED' ||
          m.status === 'NEEDS_INFO' ||
          m.status === 'APPROVED_PENDING_PAYMENT',
      ).length,
      suspended: all.filter((m) => m.status === 'SUSPENDED').length,
      trialEnding: all.filter((m) => {
        if (m.status !== 'TRIAL') return false;
        const d = trialDaysLeft(m.trialEndsAt);
        return d != null && d <= TRIAL_ENDING_DAYS;
      }).length,
      approvalExpired: all.filter((m) => m.status === 'APPROVED_EXPIRED').length,
      cancelled: all.filter((m) => m.status === 'CANCELLED').length,
      incomplete: all.filter(
        (m) => !m.companyName || (!(m.sectorCodes?.length) && !m.sectorCode) || !m.race || !m.clanName,
      ).length,
    };
  }, [data]);

  return (
    <Box p={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4" fontWeight={600}>
          NartBusiness — Üyeler
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateOpen(true)}
        >
          Manuel Üye Oluştur
        </Button>
      </Stack>

      {/* Stats summary */}
      <Paper variant="outlined" sx={{ px: 2, py: 1.5, mb: 2 }}>
        <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
          <StatChip label="Toplam" value={stats.total} />
          <StatChip label="Aktif" value={stats.active} color="success" />
          {stats.trial > 0 && <StatChip label="Deneme" value={stats.trial} color="info" />}
          <StatChip label="Bekleyen" value={stats.pending} color="warning" />
          <StatChip label="Askıda" value={stats.suspended} color="error" />
          <StatChip label="İptal" value={stats.cancelled} color="default" />
          {stats.incomplete > 0 && (
            <StatChip label="Eksik profil" value={stats.incomplete} color="warning" />
          )}
        </Stack>
      </Paper>

      {/* Email-davet modeli — bekleyen davetler (üye listesinde görünmezler) */}
      <PendingInvitesPanel refreshKey={invitesRefresh} />

      {/* Arama */}
      <TextField
        fullWidth
        size="small"
        placeholder="Şirket adı, şehir, sülale veya sektör koduyla ara…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 1.5 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
      />

      {/* Hızlı filtreler */}
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
        {QUICK_FILTERS.map((f) => {
          const count =
            f.value === 'pending'
              ? stats.pending
              : f.value === 'incomplete'
              ? stats.incomplete
              : f.value === 'trialEnding'
              ? stats.trialEnding
              : f.value === 'approvalExpired'
              ? stats.approvalExpired
              : undefined;
          return (
            <Chip
              key={f.value}
              size="small"
              clickable
              color={quickFilter === f.value ? 'primary' : 'default'}
              variant={quickFilter === f.value ? 'filled' : 'outlined'}
              label={count != null ? `${f.label} (${count})` : f.label}
              onClick={() => {
                if (f.value === 'all') {
                  setQuickFilter('all');
                  setStatus('');
                  setTier('');
                } else {
                  setQuickFilter(f.value);
                }
              }}
            />
          );
        })}
      </Stack>

      {/* Detaylı filtreler */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel>Durum</InputLabel>
          <Select
            label="Durum"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as NbMemberStatus | '');
              setPage(0);
            }}
          >
            <MenuItem value="">Hepsi</MenuItem>
            {(Object.keys(STATUS_LABEL) as NbMemberStatus[]).map((s) => (
              <MenuItem key={s} value={s}>
                {STATUS_LABEL[s]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Kademe</InputLabel>
          <Select
            label="Kademe"
            value={tier}
            onChange={(e) => {
              setTier(e.target.value as MembershipTier | '');
              setPage(0);
            }}
          >
            <MenuItem value="">Hepsi</MenuItem>
            {(Object.keys(TIER_LABEL) as MembershipTier[]).map((t) => (
              <MenuItem key={t} value={t}>
                {TIER_LABEL[t]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      {/* İlk yükleme: skeleton tablo (boş ekran/spinner yerine). */}
      {loading && !data && !error && <MemberTableSkeleton />}

      {/* Veri geldiyse SWR: filtre/sayfa değişiminde tabloyu koru, üstte ince
          ilerleme çubuğu göster — mevcut listeyi shimmer'a kurban etme. */}
      {data && !error && (
        <>
          <Box sx={{ height: 4, mb: 0.5 }}>
            {loading && <LinearProgress />}
          </Box>
          {/* Seçim çubuğu — yalnız seçim varken görünür.
              Boşken yer kaplamak, hiç kullanılmayan bir araç çubuğunu kalıcı
              gürültüye çevirirdi. */}
          {selectedIds.size > 0 && (
            <Paper
              variant="outlined"
              sx={{
                mb: 1.5, px: 2, py: 1.25, borderRadius: 2,
                display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap',
                borderColor: 'primary.main',
                bgcolor: 'action.hover',
              }}
            >
              <Typography variant="body2" fontWeight={600}>
                {selectedIds.size} üye seçildi
              </Typography>
              <Box sx={{ flex: 1 }} />
              <Button
                size="small"
                variant="contained"
                onClick={() => {
                  setBulkResult(null);
                  setBulkOpen(true);
                }}
              >
                Toplu İşlem…
              </Button>
              <Button size="small" onClick={() => setSelectedIds(new Set())}>
                Seçimi Temizle
              </Button>
            </Paper>
          )}

          <TableContainer component={Paper} variant="outlined">
            <Table size="small" sx={{ minWidth: 720 }}>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      size="small"
                      indeterminate={selectedIds.size > 0 && selectedIds.size < filtered.length}
                      checked={filtered.length > 0 && selectedIds.size === filtered.length}
                      onChange={toggleSelectAll}
                      inputProps={{ 'aria-label': 'Tümünü seç' }}
                    />
                  </TableCell>
                  <TableCell sx={cellHeadSx}>Üye</TableCell>
                  <TableCell sx={cellHeadSx}>Kademe</TableCell>
                  <TableCell sx={cellHeadSx}>Durum</TableCell>
                  <TableCell sx={cellHeadSx}>Katılım</TableCell>
                  <TableCell sx={cellHeadSx} align="right">
                    {' '}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((m) => (
                  <MemberRow
                    key={m.memberId}
                    member={m}
                    onClick={() =>
                      navigate(`/nartbusiness/members/${m.memberId}`)
                    }
                    onActionRequest={() => setActionMember(m)}
                    onDeleteRequest={() => setDeleteMember(m)}
                    selected={selectedIds.has(m.memberId)}
                    onToggleSelect={() => toggleSelect(m.memberId)}
                  />
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Stack alignItems="center" py={5} spacing={1}>
                        <Typography variant="body2" color="text.secondary">
                          {debouncedSearch || quickFilter !== 'all'
                            ? 'Filtreyle eşleşen üye yok.'
                            : 'Henüz hiç üye yok.'}
                        </Typography>
                        {(debouncedSearch || quickFilter !== 'all') && (
                          <Button
                            size="small"
                            onClick={() => {
                              setSearch('');
                              setQuickFilter('all');
                              setStatus('');
                              setTier('');
                            }}
                          >
                            Filtreleri temizle
                          </Button>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
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
                <MenuItem value="RESEND_EMAIL">Hazır e-posta gönder</MenuItem>
              </TextField>

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
              <Button variant="contained" onClick={() => void runBulk()} disabled={bulkBusy}>
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

function StatChip({
  label,
  value,
  color = 'default',
}: {
  label: string;
  value: number;
  color?: 'default' | 'success' | 'warning' | 'error' | 'info';
}) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography
        variant="body2"
        fontWeight={600}
        color={
          color === 'success'
            ? 'success.main'
            : color === 'warning'
            ? 'warning.main'
            : color === 'error'
            ? 'error.main'
            : color === 'info'
            ? 'info.main'
            : 'text.primary'
        }
      >
        {value}
      </Typography>
    </Box>
  );
}
