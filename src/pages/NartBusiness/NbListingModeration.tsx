import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Switch,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Pagination,
  Paper,
  Select,
  Snackbar,
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
import { nbAdminService } from '../../services/nartbusiness/nbAdminService';
import type { NbMember, Sector } from '../../services/nartbusiness/nbTypes';
import type {
  NbListingCreateBody,
  NbRequestType,
  NbListingRow,
  NbListingStatus,
  NbListingType,
  NbListingAdminStats,
  NbListingViewStats,
} from '../../services/nartbusiness/nbAdminService';

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

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
      <Typography variant="h5" fontWeight={700}>{value.toLocaleString('tr-TR')}</Typography>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
    </Paper>
  );
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
  const [msg, setMsg] = useState<string | null>(null);
  const [stats, setStats] = useState<NbListingAdminStats | null>(null);
  const [views, setViews] = useState<Record<string, NbListingViewStats>>({});
  const [editing, setEditing] = useState<NbListingRow | null>(null);
  const [creating, setCreating] = useState(false);

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
      .catch((e) => setError(e?.response?.data?.error?.message ?? 'Yüklenemedi'))
      .finally(() => setLoading(false));
  }, [type, status, q, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { nbAdminService.listingStats().then(setStats).catch(() => {}); }, []);

  const act = async (row: NbListingRow, next: NbListingStatus, label: string) => {
    setBusyId(row.id);
    try {
      await nbAdminService.setListingStatus(row.id, next);
      setMsg(`İlan ${label}.`);
      load();
      nbAdminService.listingStats().then(setStats).catch(() => {});
    } catch (e: any) {
      setMsg(e?.response?.data?.error?.message ?? 'İşlem başarısız');
    } finally {
      setBusyId(null);
    }
  };

  // Görünürlük toggle: true → web'de blur yok + paylaşılabilir (public detay).
  const togglePublic = async (row: NbListingRow, value: boolean) => {
    setBusyId(row.id);
    try {
      await nbAdminService.setListingPublic(row.id, value);
      setMsg(value ? 'İlan herkese açıldı (public).' : 'İlan üyeye özel yapıldı.');
      load();
    } catch (e: any) {
      setMsg(e?.response?.data?.error?.message ?? 'İşlem başarısız');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Box p={3}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h4" fontWeight={600}>
          İlanlar (Talep / Arz) — Yönetim
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreating(true)}>
          Yeni İlan
        </Button>
      </Stack>

      {stats && (
        <Grid container spacing={1.5} mb={2}>
          <Grid item xs={6} sm={3} md={1.5}><StatCard label="Toplam" value={stats.total} /></Grid>
          <Grid item xs={6} sm={3} md={1.5}><StatCard label="Aktif" value={stats.active} /></Grid>
          <Grid item xs={6} sm={3} md={1.5}><StatCard label="Kapalı" value={stats.closed} /></Grid>
          <Grid item xs={6} sm={3} md={1.5}><StatCard label="Süresi doldu" value={stats.expired} /></Grid>
          <Grid item xs={6} sm={3} md={1.5}><StatCard label="Silinmiş" value={stats.deleted} /></Grid>
          <Grid item xs={6} sm={3} md={1.5}><StatCard label="Talep" value={stats.requests} /></Grid>
          <Grid item xs={6} sm={3} md={1.5}><StatCard label="Arz" value={stats.offers} /></Grid>
          <Grid item xs={6} sm={3} md={1.5}><StatCard label="Son 7 gün" value={stats.openedLast7d} /></Grid>
        </Grid>
      )}

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

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

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

      <Snackbar open={!!msg} autoHideDuration={4000} onClose={() => setMsg(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {msg ? <Alert severity="success" variant="filled" onClose={() => setMsg(null)}>{msg}</Alert> : undefined}
      </Snackbar>

      {editing && (
        <_ListingFormDialog
          row={editing}
          onClose={() => setEditing(null)}
          onSaved={(updatedMsg) => {
            setEditing(null);
            setMsg(updatedMsg);
            load();
          }}
        />
      )}

      {creating && (
        <_ListingFormDialog
          onClose={() => setCreating(false)}
          onSaved={(createdMsg) => {
            setCreating(false);
            setMsg(createdMsg);
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
      setErr(e?.response?.data?.error?.message ?? (isEdit ? 'Kaydedilemedi' : 'Oluşturulamadı'));
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
