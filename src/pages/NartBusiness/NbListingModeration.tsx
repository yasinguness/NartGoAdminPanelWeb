import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Switch,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Pagination,
  Paper,
  Select,
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
import BlockIcon from '@mui/icons-material/Block';
import RestoreIcon from '@mui/icons-material/Restore';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import StarIcon from '@mui/icons-material/Star';
import EditIcon from '@mui/icons-material/Edit';
import {
  Autocomplete,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
} from '@mui/material';
import { nbAdminService, type NbListingPair } from '../../services/nartbusiness/nbAdminService';
import type { NbMember, Sector } from '../../services/nartbusiness/nbTypes';
import {
  NbKpi,
  NbPageHeader,
  NbTabs,
  NbUndoToast,
  type NbUndoState,
  nbCard,
  nbGoldBtn,
  nbLabel,
  nbMono,
  nbPrimaryBtn,
  nbSecondaryBtn,
} from '../../components/nartbusiness/ui';
import { nb, nbRadius } from '../../theme/nbBrand';
import type {
  NbRequestType,
  NbListingRow,
  NbListingStatus,
  NbListingType,
  NbListingAdminStats,
  NbListingViewStats,
} from '../../services/nartbusiness/nbAdminService';
import { nbErrorMessage } from '../../services/nartbusiness/nbErrorMessage';

const STATUS_LABEL: Record<NbListingStatus, string> = {
  ACTIVE: 'Aktif',
  CLOSED: 'Kapalı',
  EXPIRED: 'Süresi doldu',
  DELETED: 'Silinmiş',
};

const STATUS_COLOR: Record<NbListingStatus, 'success' | 'default' | 'warning' | 'error'> = {
  ACTIVE: 'success',
  CLOSED: 'default',
  EXPIRED: 'warning',
  DELETED: 'error',
};

const TYPE_LABEL: Record<NbListingType, string> = { REQUEST: 'Talep', OFFER: 'Arz' };

const REQUEST_TYPE_LABEL: Record<NbRequestType, string> = {
  SUPPLIER: 'Tedarikçi arıyor',
  BUYER: 'Alıcı arıyor',
  SERVICE: 'Hizmet arıyor',
  LOGISTICS: 'Lojistik',
  PARTNER: 'İş ortağı',
  OTHER: 'Diğer',
};

/** İlan açılabilecek üyeler — yalnızca erişimi açık olanlar. */
const OWNER_ELIGIBLE_STATUSES = ['ACTIVE', 'TRIAL'];

function fmtDate(s?: string | null): string {
  if (!s) return '—';
  try {
    return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(s));
  } catch {
    return '—';
  }
}

function fmtBudget(r: NbListingRow): string {
  const cur = r.currency === 'TRY' || !r.currency ? '₺' : r.currency;
  if (r.budgetMin != null && r.budgetMax != null) return `${r.budgetMin.toLocaleString('tr-TR')}–${r.budgetMax.toLocaleString('tr-TR')} ${cur}`;
  if (r.budgetMax != null) return `${r.budgetMax.toLocaleString('tr-TR')} ${cur}`;
  if (r.budgetMin != null) return `${r.budgetMin.toLocaleString('tr-TR')} ${cur}`;
  return '—';
}

export default function NbListingModeration() {
  const [type, setType] = useState<'' | NbListingType>('');
  const [status, setStatus] = useState<'' | NbListingStatus>('');
  const [q, setQ] = useState('');
  const [qInput, setQInput] = useState('');
  const [rows, setRows] = useState<NbListingRow[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<NbUndoState | null>(null);
  const [stats, setStats] = useState<NbListingAdminStats | null>(null);
  const [views, setViews] = useState<Record<string, NbListingViewStats>>({});
  const [editing, setEditing] = useState<NbListingRow | null>(null);
  const [creating, setCreating] = useState(false);

  /* ── Eşleştirme ───────────────────────────────────────────────────── */
  const [tab, setTab] = useState<'pairs' | 'all'>('pairs');
  const [pairs, setPairs] = useState<NbListingPair[]>([]);
  const [pairsLoading, setPairsLoading] = useState(true);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [pairBusy, setPairBusy] = useState(false);

  const loadPairs = useCallback(async () => {
    setPairsLoading(true);
    try {
      const list = await nbAdminService.listingPairs(5);
      setPairs(list);
      setSelectedRequestId((prev) => prev ?? list[0]?.request.id ?? null);
    } catch (e) {
      setError(nbErrorMessage(e, 'Eşleştirme önerileri alınamadı.'));
    } finally {
      setPairsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPairs();
  }, [loadPairs]);

  /** Sol kolondaki talepler — her biri en az bir aday taşıyanlar. */
  const pairRequests = useMemo(() => {
    const seen = new Map<string, NbListingRow>();
    pairs.forEach((p) => {
      if (!seen.has(p.request.id)) seen.set(p.request.id, p.request);
    });
    return [...seen.values()];
  }, [pairs]);

  /** Seçili talebin arz adayları, skora göre. */
  const candidateOffers = useMemo(
    () => pairs.filter((p) => p.request.id === selectedRequestId),
    [pairs, selectedRequestId],
  );

  // Ortadaki çift: elle seçilen arz, yoksa en yüksek skorlu aday.
  const currentPair = useMemo(
    () => candidateOffers.find((p) => p.offer.id === selectedOfferId) ?? candidateOffers[0] ?? null,
    [candidateOffers, selectedOfferId],
  );

  // Talep değişince arz seçimi düşer; yoksa önceki talebin arzı seçili kalır.
  useEffect(() => {
    setSelectedOfferId(null);
  }, [selectedRequestId]);

  /**
   * Tanıştırma başlat.
   *
   * Çift onaylanınca iki ilanın **sahipleri** tanıştırılır — ilanlar değil.
   * Gerekçe olarak iki ilanın başlığı yazılır: üyeye giden bildirimde
   * "neden tanıştırıldım" sorusunun cevabı bu satır.
   */
  const startIntroduction = async () => {
    if (!currentPair) return;
    setPairBusy(true);
    try {
      await nbAdminService.createIntroduction({
        memberAId: currentPair.request.ownerMemberId,
        memberBId: currentPair.offer.ownerMemberId,
        reason: `${currentPair.request.title} ↔ ${currentPair.offer.title}`,
      });
      // Tanıştırma kurulduğuna göre bu çift bir daha önerilmemeli.
      await nbAdminService.dismissListingPair(currentPair.request.id, currentPair.offer.id);
      setMsg({ message: 'Tanıştırma oluşturuldu, iki tarafa da bildirim gitti.' });
      await loadPairs();
    } catch (e) {
      setError(nbErrorMessage(e, 'Tanıştırma oluşturulamadı.'));
    } finally {
      setPairBusy(false);
    }
  };

  /** Atla — çift kalıcı olarak elenir. */
  const dismissPair = async () => {
    if (!currentPair) return;
    setPairBusy(true);
    try {
      await nbAdminService.dismissListingPair(currentPair.request.id, currentPair.offer.id);
      setMsg({ message: 'Çift elendi, bir daha önerilmeyecek.' });
      await loadPairs();
    } catch (e) {
      setError(nbErrorMessage(e, 'Çift elenemedi.'));
    } finally {
      setPairBusy(false);
    }
  };

  useEffect(() => { setPage(0); }, [type, status, q]);

  // Arama debounce.
  useEffect(() => {
    const t = setTimeout(() => setQ(qInput.trim()), 350);
    return () => clearTimeout(t);
  }, [qInput]);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    nbAdminService
      .listListings({
        type: type || undefined,
        status: status || undefined,
        q: q || undefined,
        page,
      })
      .then((p) => {
        setRows(p.content);
        setTotalPages(Math.max(1, p.totalPages));
        // Sayfadaki ilanlar için görüntülenme (mobil/web) sayılarını çek.
        nbAdminService
          .listingViewStats(p.content.map((r) => r.id))
          .then((list) => setViews(Object.fromEntries(list.map((v) => [v.listingId, v]))))
          .catch(() => {});
      })
      .catch((e) => setError(nbErrorMessage(e) ?? 'Yüklenemedi'))
      .finally(() => setLoading(false));
  }, [type, status, q, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { nbAdminService.listingStats().then(setStats).catch(() => {}); }, []);

  const act = async (row: NbListingRow, next: NbListingStatus, label: string) => {
    setBusyId(row.id);
    const previous = row.status;
    try {
      await nbAdminService.setListingStatus(row.id, next);
      setMsg({
        message: `İlan ${label}.`,
        // Durum değişikliği gerçekten geri alınabilir bir işlem: eski duruma
        // yazmak yeterli. Geri alınamayan işlemlerde bu alan boş bırakılır.
        onUndo: async () => {
          await nbAdminService.setListingStatus(row.id, previous);
          load();
        },
      });
      load();
      nbAdminService.listingStats().then(setStats).catch(() => {});
    } catch (e) {
      // Hata yeşil "başarılı" kutusuna düşüyordu: başarısız bir işlem
      // başarıymış gibi görünüyordu.
      setError(nbErrorMessage(e) ?? 'İşlem başarısız');
    } finally {
      setBusyId(null);
    }
  };

  // Görünürlük toggle: true → web'de blur yok + paylaşılabilir (public detay).
  const togglePublic = async (row: NbListingRow, value: boolean) => {
    setBusyId(row.id);
    try {
      await nbAdminService.setListingPublic(row.id, value);
      setMsg({
        message: value ? 'İlan herkese açıldı.' : 'İlan üyeye özel yapıldı.',
        onUndo: async () => {
          await nbAdminService.setListingPublic(row.id, !value);
          load();
        },
      });
      load();
    } catch (e) {
      setError(nbErrorMessage(e) ?? 'İşlem başarısız');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Box>
      <NbPageHeader
        crumb="NartBusiness · Ticaret & Fırsatlar"
        title="İlanlar · Talep & Arz"
        subtitle="Talep ve arzı yan yana koy, sistemin bulduğu çifti onayla ya da ele. Onay tek tuşla tanıştırmaya dönüşür."
        actions={
          <Button disableElevation sx={nbPrimaryBtn} onClick={() => setCreating(true)}>
            + Yeni ilan
          </Button>
        }
        kpis={
          <>
            <NbKpi
              label="AÇIK TALEP"
              value={stats?.requests ?? '—'}
              hint="aktif ilan"
              tone="bad"
              active={type === 'REQUEST'}
              onClick={() => {
                setTab('all');
                setType((t) => (t === 'REQUEST' ? '' : 'REQUEST'));
              }}
            />
            <NbKpi
              label="AÇIK ARZ"
              value={stats?.offers ?? '—'}
              hint="aktif ilan"
              tone="good"
              active={type === 'OFFER'}
              onClick={() => {
                setTab('all');
                setType((t) => (t === 'OFFER' ? '' : 'OFFER'));
              }}
            />
            <NbKpi
              label="ÖNERİLEN ÇİFT"
              value={pairs.length}
              hint="onay bekliyor"
              active={tab === 'pairs'}
              onClick={() => setTab('pairs')}
            />
            <NbKpi label="SON 7 GÜN" value={stats?.openedLast7d ?? '—'} hint="yeni ilan" />
          </>
        }
        tabs={
          <NbTabs
            items={[
              { key: 'pairs', label: 'Eşleştirme', count: pairs.length },
              { key: 'all', label: 'Tüm ilanlar' },
            ]}
            value={tab}
            onChange={setTab}
          />
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* ── Eşleştirme: talep | önerilen çift | arz ───────────────────── */}
      {tab === 'pairs' && (
        <Stack direction="row" flexWrap="wrap" sx={{ gap: 2, alignItems: 'flex-start' }}>
          <Box sx={{ flex: '1 1 280px', minWidth: 0 }}>
            <Stack direction="row" alignItems="center" sx={{ gap: 1.125, mb: 1.125 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: nb.red }} />
              <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>
                Talepler{' '}
                <Box component="span" sx={{ color: nb.textFaint, fontWeight: 400 }}>
                  ({pairRequests.length})
                </Box>
              </Typography>
            </Stack>

            <Stack sx={{ gap: 1.125 }}>
              {pairRequests.map((r) => {
                const active = r.id === selectedRequestId;
                const count = pairs.filter((p) => p.request.id === r.id).length;
                return (
                  <Box
                    key={r.id}
                    onClick={() => setSelectedRequestId(r.id)}
                    sx={{
                      bgcolor: nb.surface,
                      border: `1px solid ${active ? nb.red : nb.border}`,
                      borderRadius: '11px',
                      p: 1.625,
                      cursor: 'pointer',
                    }}
                  >
                    <Typography sx={{ fontSize: 13, fontWeight: 600, lineHeight: 1.35 }}>
                      {r.title}
                    </Typography>
                    <Typography sx={{ fontSize: 11.5, color: nb.textMuted, mt: 0.625 }}>
                      {r.ownerCompanyName ?? r.ownerDisplayName ?? 'İlan sahibi yok'}
                    </Typography>
                    <Stack direction="row" alignItems="center" sx={{ gap: 1, mt: 1 }}>
                      <Typography sx={{ ...nbMono, fontSize: 11, color: nb.textFaint }}>
                        {r.city ?? '—'}
                      </Typography>
                      <Box
                        component="span"
                        sx={{
                          ml: 'auto', bgcolor: nb.bg, border: '1px solid #e2ded3', borderRadius: '5px',
                          px: 0.875, py: 0.25, fontSize: 11, color: nb.textMuted,
                        }}
                      >
                        {count} aday
                      </Box>
                    </Stack>
                  </Box>
                );
              })}

              {pairRequests.length === 0 && !pairsLoading && (
                <Typography sx={{ p: 2.5, fontSize: 12, color: nb.textMuted, textAlign: 'center' }}>
                  Eşleşen talep yok.
                </Typography>
              )}
            </Stack>
          </Box>

          {/* Önerilen çift */}
          <Box sx={{ ...(nbCard as object), flex: '1.2 1 340px', p: 2 }}>
            <Typography sx={nbLabel}>ÖNERİLEN EŞLEŞTİRME</Typography>

            {pairsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
                <CircularProgress size={24} />
              </Box>
            ) : !currentPair ? (
              <Typography sx={{ py: 4, fontSize: 12.5, color: nb.textMuted, textAlign: 'center' }}>
                Soldan bir talep seç.
              </Typography>
            ) : (
              <>
                <Box
                  sx={{
                    mt: 1.5, border: `1px solid ${nb.divider}`, bgcolor: nb.inputBg,
                    borderRadius: '10px', p: 1.625,
                  }}
                >
                  <Typography sx={{ fontSize: 10, letterSpacing: '0.1em', color: nb.red, fontWeight: 600 }}>
                    TALEP
                  </Typography>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 600, mt: 0.625, lineHeight: 1.35 }}>
                    {currentPair.request.title}
                  </Typography>
                  <Typography sx={{ fontSize: 11.5, color: nb.textMuted, mt: 0.5 }}>
                    {currentPair.request.ownerCompanyName ?? currentPair.request.ownerDisplayName ?? '—'}
                  </Typography>
                </Box>

                <Stack direction="row" alignItems="center" sx={{ gap: 1.25, my: 1.375 }}>
                  <Box sx={{ flex: 1, height: '1px', bgcolor: nb.border }} />
                  <Box
                    component="span"
                    sx={{
                      ...nbMono,
                      bgcolor: nb.greenTint, color: nb.green, fontSize: 13, fontWeight: 500,
                      borderRadius: '6px', px: 1.25, py: 0.5,
                    }}
                  >
                    %{currentPair.score}
                  </Box>
                  <Box sx={{ flex: 1, height: '1px', bgcolor: nb.border }} />
                </Stack>

                <Box
                  sx={{
                    border: `1px solid ${nb.divider}`, bgcolor: nb.inputBg,
                    borderRadius: '10px', p: 1.625,
                  }}
                >
                  <Typography sx={{ fontSize: 10, letterSpacing: '0.1em', color: nb.green, fontWeight: 600 }}>
                    ARZ
                  </Typography>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 600, mt: 0.625, lineHeight: 1.35 }}>
                    {currentPair.offer.title}
                  </Typography>
                  <Typography sx={{ fontSize: 11.5, color: nb.textMuted, mt: 0.5 }}>
                    {currentPair.offer.ownerCompanyName ?? currentPair.offer.ownerDisplayName ?? '—'}
                  </Typography>
                </Box>

                {/* Skor asla gerekçesiz durmaz. */}
                <Stack direction="row" flexWrap="wrap" sx={{ gap: 0.75, mt: 1.5 }}>
                  {currentPair.matchedOn.map((r) => (
                    <Box
                      key={r}
                      component="span"
                      sx={{
                        bgcolor: nb.bg, border: '1px solid #e2ded3', borderRadius: `${nbRadius.pill}px`,
                        px: 1.25, py: 0.5, fontSize: 11, color: '#4a545c',
                      }}
                    >
                      {r}
                    </Box>
                  ))}
                </Stack>

                <Stack direction="row" sx={{ gap: 1, mt: 1.75 }}>
                  <Button
                    disableElevation
                    onClick={startIntroduction}
                    disabled={pairBusy}
                    sx={{ ...(nbGoldBtn as object), flex: 2 }}
                  >
                    {pairBusy ? 'Oluşturuluyor…' : 'Tanıştırma başlat'}
                  </Button>
                  <Button
                    disableElevation
                    onClick={dismissPair}
                    disabled={pairBusy}
                    sx={{ ...(nbSecondaryBtn as object), flex: 1 }}
                  >
                    Atla
                  </Button>
                </Stack>

                <Typography sx={{ fontSize: 11, color: nb.textFaint, mt: 1.125, lineHeight: 1.5 }}>
                  Atlanan çift kalıcı olarak elenir ve bir daha önerilmez.
                </Typography>
              </>
            )}
          </Box>

          {/* Arz kolonu — seçili talebin adayları */}
          <Box sx={{ flex: '1 1 280px', minWidth: 0 }}>
            <Stack direction="row" alignItems="center" sx={{ gap: 1.125, mb: 1.125 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: nb.green }} />
              <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>
                Arz adayları{' '}
                <Box component="span" sx={{ color: nb.textFaint, fontWeight: 400 }}>
                  ({candidateOffers.length})
                </Box>
              </Typography>
            </Stack>

            <Stack sx={{ gap: 1.125 }}>
              {candidateOffers.map((p) => {
                const active = p.offer.id === currentPair?.offer.id;
                return (
                  <Box
                    key={p.offer.id}
                    onClick={() => setSelectedOfferId(p.offer.id)}
                    sx={{
                      bgcolor: nb.surface,
                      border: `1px solid ${active ? nb.green : nb.border}`,
                      borderRadius: '11px',
                      p: 1.625,
                      cursor: 'pointer',
                    }}
                  >
                    <Stack direction="row" alignItems="flex-start" sx={{ gap: 1 }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 600, lineHeight: 1.35, minWidth: 0 }}>
                        {p.offer.title}
                      </Typography>
                      <Typography sx={{ ...nbMono, ml: 'auto', fontSize: 11.5, color: nb.green, fontWeight: 500 }}>
                        %{p.score}
                      </Typography>
                    </Stack>
                    <Typography sx={{ fontSize: 11.5, color: nb.textMuted, mt: 0.625 }}>
                      {p.offer.ownerCompanyName ?? p.offer.ownerDisplayName ?? '—'}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: nb.textFaint, mt: 0.625 }}>
                      {p.matchedOn.join(' · ')}
                    </Typography>
                  </Box>
                );
              })}

              {candidateOffers.length === 0 && !pairsLoading && (
                <Typography sx={{ p: 2.5, fontSize: 12, color: nb.textMuted, textAlign: 'center' }}>
                  Bu talebe uyan arz yok.
                </Typography>
              )}
            </Stack>
          </Box>
        </Stack>
      )}

      {tab === 'all' && (
      <>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={2}>
        <TextField
          size="small"
          label="Ara (başlık, şirket, şehir…)"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          sx={{ minWidth: 240, flexGrow: 1 }}
        />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Tür</InputLabel>
          <Select label="Tür" value={type} onChange={(e) => setType(e.target.value as '' | NbListingType)}>
            <MenuItem value="">Tümü</MenuItem>
            <MenuItem value="REQUEST">Talep</MenuItem>
            <MenuItem value="OFFER">Arz</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Durum</InputLabel>
          <Select label="Durum" value={status} onChange={(e) => setStatus(e.target.value as '' | NbListingStatus)}>
            <MenuItem value="">Tümü</MenuItem>
            <MenuItem value="ACTIVE">Aktif</MenuItem>
            <MenuItem value="CLOSED">Kapalı</MenuItem>
            <MenuItem value="EXPIRED">Süresi doldu</MenuItem>
            <MenuItem value="DELETED">Silinmiş</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      <Paper variant="outlined">
        {loading ? (
          <Stack alignItems="center" py={5}><CircularProgress size={26} /></Stack>
        ) : rows.length === 0 ? (
          <Typography color="text.secondary" sx={{ p: 3 }}>Kayıt yok.</Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>İlan</TableCell>
                  <TableCell>Tür</TableCell>
                  <TableCell>Sahip</TableCell>
                  <TableCell>Sektör / Şehir</TableCell>
                  <TableCell>Bütçe</TableCell>
                  <TableCell align="center">İlgi</TableCell>
                  <TableCell align="center">Görüntülenme</TableCell>
                  <TableCell>Tarih</TableCell>
                  <TableCell>Durum</TableCell>
                  <TableCell align="center">Herkese Açık</TableCell>
                  <TableCell align="right">İşlem</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell sx={{ maxWidth: 260 }}>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        {r.ownerSpotlight && (
                          <Tooltip title="Öne çıkan (Patron/Kurucu)">
                            <StarIcon sx={{ fontSize: 15, color: 'warning.main' }} />
                          </Tooltip>
                        )}
                        <Typography variant="body2" fontWeight={600} noWrap>{r.title}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" variant="outlined"
                        color={r.type === 'REQUEST' ? 'warning' : 'success'}
                        label={TYPE_LABEL[r.type] ?? r.type} />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 180 }}>
                      <Typography variant="body2" noWrap>
                        {r.ownerCompanyName || r.ownerDisplayName || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {[r.sectorCode, r.city].filter(Boolean).join(' · ') || '—'}
                    </TableCell>
                    <TableCell>{fmtBudget(r)}</TableCell>
                    <TableCell align="center">{r.interestCount ?? 0}</TableCell>
                    <TableCell align="center">
                      {(() => {
                        const v = views[r.id];
                        if (!v || v.total === 0) return <span style={{ color: '#999' }}>0</span>;
                        return (
                          <Tooltip title={`Mobil: ${v.mobile} · Web: ${v.web}${v.unknown ? ` · Diğer: ${v.unknown}` : ''}`}>
                            <span style={{ fontWeight: 600 }}>
                              {v.total}
                              <span style={{ color: '#888', fontWeight: 400, fontSize: 12 }}>
                                {' '}({v.mobile}m/{v.web}w)
                              </span>
                            </span>
                          </Tooltip>
                        );
                      })()}
                    </TableCell>
                    <TableCell>{fmtDate(r.createdAt)}</TableCell>
                    <TableCell>
                      <Chip size="small" variant="outlined"
                        color={STATUS_COLOR[r.status] ?? 'default'}
                        label={STATUS_LABEL[r.status] ?? r.status} />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title={r.isPublic ? 'Herkese açık — web\'de blur yok, paylaşılabilir' : 'Üyeye özel — non-member maskeli teaser görür'}>
                        <span>
                          <Switch
                            size="small"
                            checked={!!r.isPublic}
                            disabled={busyId === r.id}
                            onChange={(e) => togglePublic(r, e.target.checked)}
                          />
                        </span>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                        <Tooltip title="Detay / Düzenle">
                          <IconButton size="small" onClick={() => setEditing(r)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {r.status !== 'ACTIVE' && (
                          <Tooltip title="Yeniden aç (ACTIVE)">
                            <span>
                              <Button size="small" startIcon={<RestoreIcon />} disabled={busyId === r.id}
                                onClick={() => act(r, 'ACTIVE', 'yeniden açıldı')}>Aç</Button>
                            </span>
                          </Tooltip>
                        )}
                        {r.status === 'ACTIVE' && (
                          <Tooltip title="Kapat (CLOSED)">
                            <span>
                              <Button size="small" color="warning" startIcon={<BlockIcon />} disabled={busyId === r.id}
                                onClick={() => act(r, 'CLOSED', 'kapatıldı')}>Kapat</Button>
                            </span>
                          </Tooltip>
                        )}
                        {r.status !== 'DELETED' && (
                          <Tooltip title="Sil (soft, DELETED)">
                            <span>
                              <Button size="small" color="error" startIcon={<DeleteOutlineIcon />} disabled={busyId === r.id}
                                onClick={() => act(r, 'DELETED', 'silindi')}>Sil</Button>
                            </span>
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {totalPages > 1 && (
        <Stack alignItems="center" sx={{ mt: 2 }}>
          <Pagination count={totalPages} page={page + 1} onChange={(_, p) => setPage(p - 1)} color="primary" />
        </Stack>
      )}
      </>
      )}

      {/* Kalıcı yeşil "başarılı" şeridi yok: her yazma işlemi 10 sn'lik
          geri-al kutusu bırakır, süre dolunca işlem kalıcı sayılır. */}
      <NbUndoToast state={msg} onClose={() => setMsg(null)} />

      {editing && (
        <_ListingFormDialog
          row={editing}
          onClose={() => setEditing(null)}
          onSaved={(updatedMsg) => {
            setEditing(null);
            setMsg({ message: updatedMsg });
            load();
          }}
        />
      )}

      {creating && (
        <_ListingFormDialog
          onClose={() => setCreating(false)}
          onSaved={(createdMsg) => {
            setCreating(false);
            setMsg({ message: createdMsg });
            load();
            nbAdminService.listingStats().then(setStats).catch(() => {});
          }}
        />
      )}
    </Box>
  );
}

/** Form bölümü başlığı — alanları anlam gruplarına ayırır. */
function _Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.12em' }}>
        {title}
      </Typography>
      {hint && (
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
          {hint}
        </Typography>
      )}
      <Stack spacing={2} sx={{ mt: hint ? 0 : 1 }}>{children}</Stack>
    </Box>
  );
}

/**
 * İlan oluşturma / düzenleme.
 *
 * Form iki karara göre şekillenir:
 *  1) İlan kimin adına açılıyor — bir işletme mi, yoksa Pazar Panosu (küratör) mü?
 *     Bu seçim, ilanın kime ait göründüğünü ve iletişim yolunun nereden geldiğini
 *     değiştirdiği için forma en üstte ve ayrı bir adım gibi konur.
 *  2) Tür (Talep/Arz) — "talep alt türü" yalnızca talepte anlamlı.
 *
 * Düzenleme modunda sahip değiştirilemez ve yalnızca backend'in
 * PUT /nb/needs/admin/{id} ile güncellediği alanlar gösterilir.
 */
function _ListingFormDialog({
  row,
  onClose,
  onSaved,
}: {
  row?: NbListingRow;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const isEdit = !!row;

  const [ownerMode, setOwnerMode] = useState<'member' | 'curated'>('member');
  const [owner, setOwner] = useState<NbMember | null>(null);
  const [members, setMembers] = useState<NbMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [sectors, setSectors] = useState<Sector[]>([]);

  const [type, setType] = useState<NbListingType>(row?.type ?? 'REQUEST');
  const [requestType, setRequestType] = useState<'' | NbRequestType>('');
  const [title, setTitle] = useState(row?.title ?? '');
  const [description, setDescription] = useState(row?.description ?? '');
  const [city, setCity] = useState(row?.city ?? '');
  const [district, setDistrict] = useState(row?.district ?? '');
  const [sectorCode, setSectorCode] = useState(row?.sectorCode ?? '');
  const [subSectorCode, setSubSectorCode] = useState('');
  const [budgetMin, setBudgetMin] = useState(row?.budgetMin?.toString() ?? '');
  const [budgetMax, setBudgetMax] = useState(row?.budgetMax?.toString() ?? '');
  const [currency, setCurrency] = useState(row?.currency ?? 'TRY');
  const [durationDays, setDurationDays] = useState('');
  const [externalContact, setExternalContact] = useState('');
  const [source, setSource] = useState('');

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [warn, setWarn] = useState<string | null>(null);

  // Sahip seçici: üye sayısı küçük olduğu için tek seferde çekilip istemcide
  // filtrelenir. Üye sayısı büyürse sunucu tarafı arama gerekir.
  useEffect(() => {
    if (isEdit) return;
    setMembersLoading(true);
    nbAdminService
      .listMembers({ size: 500 })
      .then((p) => setMembers((p?.content ?? []).filter((m) => OWNER_ELIGIBLE_STATUSES.includes(m.status as string))))
      .catch(() => setMembers([]))
      .finally(() => setMembersLoading(false));
  }, [isEdit]);

  // Sektör kataloğu — kod elle yazılmasın diye açılır listeye beslenir.
  useEffect(() => {
    nbAdminService.listSectors().then((list) => setSectors(list.filter((x) => x.active))).catch(() => setSectors([]));
  }, []);

  const topSectors = sectors.filter((x) => !x.parentCode);
  const subSectors = sectors.filter((x) => x.parentCode && x.parentCode === sectorCode);

  const num = (v: string): number | null => (v.trim() ? Number(v) : null);
  const useMember = !isEdit && ownerMode === 'member';

  // Kaydet butonu neden kapalı — kullanıcı tahmin etmesin.
  const blocker = !title.trim()
    ? 'Başlık gerekli'
    : useMember && !owner
      ? 'İlan sahibi işletmeyi seçin'
      : !isEdit && ownerMode === 'curated' && !externalContact.trim()
        ? 'Pazar Panosu ilanında iletişim yolu gerekli'
        : null;

  const save = async () => {
    setSaving(true);
    setErr(null);
    setWarn(null);
    try {
      if (isEdit && row) {
        await nbAdminService.updateListing(row.id, {
          title: title.trim(),
          description: description.trim() || null,
          city: city.trim() || null,
          sectorCode: sectorCode.trim() || null,
          subSectorCode: subSectorCode.trim() || null,
          requestType: type === 'REQUEST' ? requestType || null : null,
          budgetMin: num(budgetMin),
          budgetMax: num(budgetMax),
          durationDays: num(durationDays),
        });
        onSaved('İlan güncellendi.');
        return;
      }

      const created = await nbAdminService.createListing({
        ownerMemberId: useMember ? owner?.memberId : undefined,
        type,
        title: title.trim(),
        description: description.trim() || null,
        requestType: type === 'REQUEST' ? requestType || null : null,
        budgetMin: num(budgetMin),
        budgetMax: num(budgetMax),
        currency: currency.trim() || 'TRY',
        city: city.trim() || null,
        district: district.trim() || null,
        sectorCode: sectorCode || null,
        subSectorCode: subSectorCode || null,
        externalContact: ownerMode === 'curated' ? externalContact.trim() || null : null,
        source: source.trim() || null,
        durationDays: num(durationDays),
      });

      // Backend ownerMemberId'yi desteklemiyorsa ilan sessizce küratöre yazılır.
      if (useMember && owner && created && created.ownerMemberId !== owner.memberId) {
        setWarn(
          'İlan oluşturuldu ancak seçtiğiniz işletmenin adına yazılmadı. Backend (nb-needs-service) ' +
            'ownerMemberId alanını henüz desteklemiyor; ilan küratör hesabına kaydedildi.',
        );
        setSaving(false);
        return;
      }
      onSaved(useMember && owner ? `İlan ${ownerLabel(owner)} adına oluşturuldu.` : 'İlan oluşturuldu (Pazar Panosu).');
    } catch (e: any) {
      setErr(nbErrorMessage(e) ?? (isEdit ? 'Kaydedilemedi' : 'Oluşturulamadı'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ pb: 1 }}>
        {isEdit ? 'İlanı Düzenle' : 'Yeni İlan'}
        {isEdit && row && (
          <Typography variant="body2" color="text.secondary">
            {TYPE_LABEL[row.type]} · {row.ownerCompanyName || row.ownerDisplayName || '—'} · {STATUS_LABEL[row.status]}
          </Typography>
        )}
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={3} sx={{ mt: 0.5 }}>
          {!isEdit && (
            <_Section title="1 · İlan sahibi" hint="İlanın kimin ilanı olarak görüneceğini belirler.">
              <ToggleButtonGroup
                exclusive
                size="small"
                value={ownerMode}
                onChange={(_, v) => v && setOwnerMode(v)}
              >
                <ToggleButton value="member" sx={{ textTransform: 'none', px: 2 }}>Bir işletme adına</ToggleButton>
                <ToggleButton value="curated" sx={{ textTransform: 'none', px: 2 }}>Pazar Panosu (NartGo)</ToggleButton>
              </ToggleButtonGroup>

              {ownerMode === 'member' ? (
                <Autocomplete
                  options={members}
                  loading={membersLoading}
                  value={owner}
                  onChange={(_, v) => setOwner(v)}
                  getOptionLabel={ownerLabel}
                  isOptionEqualToValue={(a, b) => a.memberId === b.memberId}
                  renderOption={(props, m) => (
                    <li {...props} key={m.memberId}>
                      <Stack>
                        <Typography variant="body2">{ownerLabel(m)}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {[m.city, m.sectorCode, m.status].filter(Boolean).join(' · ')}
                        </Typography>
                      </Stack>
                    </li>
                  )}
                  renderInput={(params) => (
                    <TextField {...params} size="small" label="İşletme ara (şirket adı)" autoFocus />
                  )}
                />
              ) : (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label="Dış iletişim"
                    value={externalContact}
                    onChange={(e) => setExternalContact(e.target.value)}
                    size="small"
                    fullWidth
                    placeholder="wa.me/905… · tel:+90… · https://…"
                    helperText="İlgilenen üyenin ulaşacağı adres."
                  />
                  <TextField
                    label="Kaynak notu"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    size="small"
                    fullWidth
                    placeholder="ör. WhatsApp grubu"
                    helperText="Opsiyonel — ilanın nereden derlendiği."
                  />
                </Stack>
              )}
            </_Section>
          )}

          {!isEdit && <Divider />}

          <_Section title={isEdit ? 'İlan' : '2 · İlan'}>
            {!isEdit && (
              <ToggleButtonGroup exclusive size="small" value={type} onChange={(_, v) => v && setType(v)}>
                <ToggleButton value="REQUEST" sx={{ textTransform: 'none', px: 3 }}>Talep</ToggleButton>
                <ToggleButton value="OFFER" sx={{ textTransform: 'none', px: 3 }}>Arz</ToggleButton>
              </ToggleButtonGroup>
            )}

            <TextField
              label="Başlık"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              fullWidth
              size="small"
              inputProps={{ maxLength: 255 }}
            />
            <TextField
              label="Açıklama"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              size="small"
              multiline
              minRows={3}
              inputProps={{ maxLength: 5000 }}
            />
            {type === 'REQUEST' && (
              <FormControl size="small" sx={{ maxWidth: 280 }}>
                <InputLabel>Talep alt türü</InputLabel>
                <Select
                  label="Talep alt türü"
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value as '' | NbRequestType)}
                >
                  <MenuItem value="">Belirtilmedi</MenuItem>
                  {(Object.keys(REQUEST_TYPE_LABEL) as NbRequestType[]).map((k) => (
                    <MenuItem key={k} value={k}>{REQUEST_TYPE_LABEL[k]}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </_Section>

          <Divider />

          <_Section title={isEdit ? 'Sınıflandırma' : '3 · Sınıflandırma'} hint="İlanın hangi üyelere bildirim olarak gideceğini belirler.">
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormControl size="small" fullWidth>
                <InputLabel>Sektör</InputLabel>
                <Select
                  label="Sektör"
                  value={topSectors.some((x) => x.code === sectorCode) ? sectorCode : ''}
                  onChange={(e) => { setSectorCode(e.target.value); setSubSectorCode(''); }}
                >
                  <MenuItem value="">Belirtilmedi</MenuItem>
                  {topSectors.map((x) => (
                    <MenuItem key={x.code} value={x.code}>{x.nameTr}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" fullWidth disabled={!sectorCode || subSectors.length === 0}>
                <InputLabel>Alt sektör</InputLabel>
                <Select
                  label="Alt sektör"
                  value={subSectors.some((x) => x.code === subSectorCode) ? subSectorCode : ''}
                  onChange={(e) => setSubSectorCode(e.target.value)}
                >
                  <MenuItem value="">Belirtilmedi</MenuItem>
                  {subSectors.map((x) => (
                    <MenuItem key={x.code} value={x.code}>{x.nameTr}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="Şehir" value={city} onChange={(e) => setCity(e.target.value)} size="small" fullWidth />
              {!isEdit && (
                <TextField label="İlçe" value={district} onChange={(e) => setDistrict(e.target.value)} size="small" fullWidth />
              )}
            </Stack>
          </_Section>

          <Divider />

          <_Section title={isEdit ? 'Bütçe ve süre' : '4 · Bütçe ve süre'} hint="Tümü opsiyonel.">
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
              <TextField label="Bütçe min" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)}
                size="small" fullWidth type="number" />
              <TextField label="Bütçe max" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)}
                size="small" fullWidth type="number" />
              {!isEdit && (
                <FormControl size="small" sx={{ minWidth: 130 }}>
                  <InputLabel>Para birimi</InputLabel>
                  <Select label="Para birimi" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                    <MenuItem value="TRY">₺ TRY</MenuItem>
                    <MenuItem value="USD">$ USD</MenuItem>
                    <MenuItem value="EUR">€ EUR</MenuItem>
                  </Select>
                </FormControl>
              )}
              <TextField
                label="Süre (gün)"
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                size="small"
                type="number"
                sx={{ minWidth: 140 }}
                placeholder="Varsayılan"
              />
            </Stack>
          </_Section>

          {warn && <Alert severity="warning">{warn}</Alert>}
          {err && <Alert severity="error">{err}</Alert>}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Typography variant="caption" color="text.secondary" sx={{ mr: 'auto' }}>
          {blocker ?? (isEdit ? 'Değişiklikler kaydedilecek.' : useMember && owner
            ? `İlan ${ownerLabel(owner)} adına yayımlanacak.`
            : 'İlan Pazar Panosu ilanı olarak yayımlanacak.')}
        </Typography>
        <Button onClick={onClose} disabled={saving}>Kapat</Button>
        <Button onClick={save} variant="contained" disabled={saving || !!blocker}>
          {saving ? 'Kaydediliyor…' : isEdit ? 'Kaydet' : 'Oluştur'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** Seçicide ve mesajlarda kullanılan işletme etiketi. */
function ownerLabel(m: NbMember): string {
  return m.companyName?.trim() || `Üye ${m.memberId.slice(0, 8)}`;
}
