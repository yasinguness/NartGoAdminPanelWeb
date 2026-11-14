import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Autocomplete,
  Avatar,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  InputBase,
  Menu,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { Close as CloseIcon, MoreVert as MoreIcon, Search as SearchIcon, Tune as TuneIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { au } from '../theme/adminUsers';
import { TR_CITIES } from '../constants/trCities';
import { userService } from '../services/user/userService';
import { heritageVillageService } from '../services/heritageVillageService';
import { SavedView, UserRow, UserSearchResult, UserStats, userSearchService } from '../services/user/userSearchService';
import UserFilterDrawer, { Pill } from './Users/UserFilterDrawer';
import { ProfileBar, StatusBadge } from './Users/userUi';
import { apiMessage, initials, timeAgo } from './Users/userFormat';
import CreateUserDialog from './Users/CreateUserDialog';
import UserSelectionDialog from './Notifications/components/UserSelectionDialog';
import {
  activeChips,
  AGE_LABEL,
  drawerCount,
  emptyFilters,
  filtersFromParams,
  filtersToParams,
  monthStart,
  serverQuery,
  SORT_LABEL,
  STATUS_LABEL,
  TYPE_LABEL,
  UserFilters,
} from './Users/userFilters';

/**
 * Admin › Kullanıcılar (docs/plan/admin-kullanicilar.md, tasarım ekran 1).
 * Süzgeç durumu URL'de; sıralama ve sayfalama sunucuda. Memleket ve sülale süzgeçleri sunucuda kayda yazılır.
 */

const PAGE_SIZE = 25;

const fmtNum = (n?: number | null) => (n ?? 0).toLocaleString('tr-TR');

const COLS = '44px minmax(220px, 2.2fr) 90px 100px minmax(170px, 1.6fr) 110px 70px 130px 110px 44px';

function StatTile({ label, value, tone, onClick, active }: { label: string; value?: number; tone?: string; onClick: () => void; active?: boolean }) {
  return (
    <Box component="button" type="button" onClick={onClick} aria-pressed={active}
      sx={{ textAlign: 'left', bgcolor: au.surface, border: `1px solid ${active ? au.primary : au.border}`, borderRadius: '16px', px: 2, py: 1.75, cursor: 'pointer', font: 'inherit', '&:focus-visible': { outline: `2px solid ${au.primary}`, outlineOffset: 2 } }}>
      <Typography sx={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.08em', color: au.muted }}>{label.toLocaleUpperCase('tr-TR')}</Typography>
      {value === undefined ? <Skeleton width={70} height={36} /> : <Typography sx={{ fontSize: 26, fontWeight: 800, color: tone ?? au.primary }}>{fmtNum(value)}</Typography>}
    </Box>
  );
}

function SelectBox({ label, value, options, onChange, placeholder = 'Tümü' }: {
  label: string; value: string; options: [string, string][]; onChange: (v: string) => void; placeholder?: string;
}) {
  const active = value !== '';
  return (
    <TextField select size="small" label={label} value={value} onChange={(e) => onChange(e.target.value)}
      SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }}
      sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', height: 44, bgcolor: active ? au.primaryTint : au.surface, fontWeight: active ? 600 : 400, color: active ? au.primary : au.text },
        '& fieldset': { borderColor: active ? au.primary : au.inputBorder, borderWidth: active ? '1.5px' : '1px' } }}>
      <MenuItem value="">{placeholder}</MenuItem>
      {options.map(([v, l]) => (
        <MenuItem key={v} value={v}>{l}</MenuItem>
      ))}
    </TextField>
  );
}

export default function Users() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => filtersFromParams(params), [params]);
  const page = Math.max(Number(params.get('page')) || 1, 1);

  const [search, setSearch] = useState(filters.q ?? '');
  const [result, setResult] = useState<UserSearchResult | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [views, setViews] = useState<SavedView[]>([]);
  const [selected, setSelected] = useState<Map<string, UserRow>>(new Map());
  const [drawer, setDrawer] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [sortEl, setSortEl] = useState<HTMLElement | null>(null);
  const [rowMenu, setRowMenu] = useState<{ el: HTMLElement; row: UserRow } | null>(null);
  const [dialog, setDialog] = useState<null | 'export' | 'block' | 'tag' | 'notify' | 'create' | 'view'>(null);
  const [blockTargets, setBlockTargets] = useState<UserRow[]>([]);
  const [text, setText] = useState('');
  const [includePhone, setIncludePhone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [villageOptions, setVillageOptions] = useState<{ id: string; label: string }[]>([]);

  const apply = useCallback(
    (f: UserFilters, keepPage = false) => {
      const next = filtersToParams(f);
      if (keepPage && page > 1) next.page = String(page);
      setParams(next);
    },
    [setParams, page],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      setResult(await userSearchService.search(serverQuery(filters), page - 1, PAGE_SIZE));
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    userSearchService.stats().then(setStats).catch(() => {});
    userSearchService.views().then(setViews).catch(() => {});
  }, []);

  // Arama kutusu URL'ye gecikmeli yazılır.
  useEffect(() => {
    const t = setTimeout(() => {
      if ((filters.q ?? '') !== search.trim()) apply({ ...filters, q: search.trim() || undefined });
    }, 400);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const items = result?.items ?? [];
  const chips = activeChips(filters);
  const allOnPage = items.length > 0 && items.every((r) => selected.has(r.id));
  const set = (patch: Partial<UserFilters>) => apply({ ...filters, ...patch });

  const toggleRow = (r: UserRow) =>
    setSelected((m) => {
      const n = new Map(m);
      if (n.has(r.id)) n.delete(r.id);
      else n.set(r.id, r);
      return n;
    });

  const toggleAll = () =>
    setSelected((m) => {
      const n = new Map(m);
      if (allOnPage) items.forEach((r) => n.delete(r.id));
      else items.forEach((r) => n.set(r.id, r));
      return n;
    });

  const detailHref = (id: string) => `/users/${id}?${new URLSearchParams(filtersToParams(filters)).toString()}`;

  const syncKeycloak = async () => {
    setSyncing(true);
    try {
      const r = await userService.syncKeycloakStatuses();
      enqueueSnackbar(`${r.updatedCount} kullanıcının durumu güncellendi`, { variant: 'success' });
      load();
    } catch {
      enqueueSnackbar('Keycloak senkronizasyonu yapılamadı', { variant: 'error' });
    } finally {
      setSyncing(false);
    }
  };

  const doExport = async () => {
    if (text.trim().length < 5) return;
    setBusy(true);
    try {
      const blob = await userSearchService.exportCsv(serverQuery(filters), text.trim(), includePhone);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kullanicilar-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setDialog(null);
    } catch {
      enqueueSnackbar('Dışa aktarılamadı', { variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const exportSelected = () => {
    // Seçililer: aynı uç, kimlik listesiyle değil süzgeçle çalışır; seçili sayısı küçükse CSV istemcide üretilir.
    const rows = [...selected.values()];
    const header = 'Ad Soyad,E-posta,Durum,Hesap,Köy,İl,Konum (il),Yaş aralığı,Profil %,Son giriş\n';
    const esc = (v: unknown) => {
      const s = String(v ?? '');
      return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
    };
    const body = rows
      .map((r) => [r.name, r.email, STATUS_LABEL[r.status] ?? r.status, TYPE_LABEL[r.accountType] ?? r.accountType, r.village?.name ?? '',
        r.village?.province ?? r.hometownCity ?? '', r.currentCity ?? '', AGE_LABEL[r.ageBand] ?? '', r.profileScore, r.lastLoginAt ?? ''].map(esc).join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + header + body], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `secili-kullanicilar-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const runBulk = async (action: 'block' | 'unblock' | 'tag', targets: UserRow[]) => {
    setBusy(true);
    try {
      const r = await userSearchService.bulk(targets.map((t) => t.id), action, action === 'tag' ? { tag: text.trim() } : { reason: text.trim() });
      enqueueSnackbar(`${r.ok} başarılı · ${r.skipped} atlandı · ${r.failed.length} hatalı`, { variant: r.failed.length ? 'warning' : 'success' });
      setDialog(null);
      setSelected(new Map());
      load();
    } catch (e) {
      enqueueSnackbar(apiMessage(e) ?? 'İşlem yapılamadı', { variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const saveView = async () => {
    if (!text.trim()) return;
    try {
      await userSearchService.saveView(text.trim(), filtersToParams(filters));
      setViews(await userSearchService.views());
      setDialog(null);
      enqueueSnackbar('Görünüm kaydedildi', { variant: 'success' });
    } catch {
      enqueueSnackbar('Görünüm kaydedilemedi', { variant: 'error' });
    }
  };

  const viewActive = (v: SavedView) => new URLSearchParams(v.filters).toString() === new URLSearchParams(filtersToParams(filters)).toString();
  const noFilters = chips.length === 0;

  const searchVillages = async (q: string) => {
    if (q.trim().length < 2) return;
    try {
      const r = await heritageVillageService.list({ q, province: filters.hometownProvince, size: 15 });
      setVillageOptions(r.items.map((v) => ({ id: v.id, label: `${v.official_name} · ${v.district}, ${v.province}` })));
    } catch {
      setVillageOptions([]);
    }
  };

  const pages = Math.max(Math.ceil((result?.matched ?? 0) / PAGE_SIZE), 1);
  const openDialog = (d: typeof dialog) => {
    setText('');
    setIncludePhone(false);
    setDialog(d);
  };

  const pillBtnSx = { height: 44, px: 2, borderRadius: 999, fontWeight: 700, textTransform: 'none' } as const;

  return (
    <Box sx={{ bgcolor: au.page, minHeight: '100%', mx: { xs: -2, md: -3 }, mt: { xs: -2, md: -3 }, color: au.text }}>
      {/* Üst başlık (NARTGO · KULLANICILAR, italik serif) panel kabuğunda. */}
      <Stack spacing={2.5} sx={{ px: { xs: 2, md: 4 }, py: 3 }}>
        <Stack direction="row" alignItems="flex-end" justifyContent="space-between" flexWrap="wrap" gap={2}>
          <Box>
            <Typography sx={{ color: au.muted, fontSize: 13 }}>Panel › Kullanıcılar</Typography>
            <Typography component="h1" sx={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.01em', mt: 0.5 }}>Kullanıcı yönetimi</Typography>
            <Typography sx={{ color: au.muted }}>Kullanıcıları filtrele, görünüm olarak kaydet, toplu işlem yap.</Typography>
          </Box>
          <Stack direction="row" gap={1.25} flexWrap="wrap">
            <Tooltip title="Keycloak'taki hesap durumlarını veritabanına eşitler">
              <span>
                <Button variant="outlined" onClick={syncKeycloak} disabled={syncing}
                  sx={{ ...pillBtnSx, bgcolor: au.surface, color: au.primary, borderColor: au.primaryOutline, borderWidth: 1.5 }}>
                  {syncing ? 'Eşitleniyor…' : 'Keycloak senkronizasyonu'}
                </Button>
              </span>
            </Tooltip>
            <Button variant="outlined" onClick={() => openDialog('export')}
              sx={{ ...pillBtnSx, bgcolor: au.surface, color: au.primary, borderColor: au.primaryOutline, borderWidth: 1.5 }}>
              Dışa aktar (filtreye göre)
            </Button>
            <Button variant="contained" disableElevation onClick={() => setDialog('create')}
              sx={{ ...pillBtnSx, bgcolor: au.primary, '&:hover': { bgcolor: au.primaryDark } }}>
              Yeni kullanıcı
            </Button>
          </Stack>
        </Stack>

        {/* Sayı kartları: tıklanınca süzgeç uygular */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 1.5 }}>
          <StatTile label="Toplam" value={stats?.total} onClick={() => apply(emptyFilters())} active={noFilters} />
          <StatTile label="Aktif" value={stats?.active} onClick={() => apply({ ...emptyFilters(), status: ['ACTIVE'] })} />
          <StatTile label="Bekleyen" value={stats?.pending} tone={au.warningText} onClick={() => apply({ ...emptyFilters(), status: ['PENDING'] })} />
          {(stats?.blocked ?? 0) > 0 && (
            <StatTile label="Engellenen" value={stats?.blocked} tone={au.danger} onClick={() => apply({ ...emptyFilters(), status: ['BLOCKED'] })} />
          )}
          <StatTile label="Fotoğraflı" value={stats?.with_photo} onClick={() => apply({ ...emptyFilters(), photo: 'yes' })} />
          <StatTile label="Köyü seçmiş" value={stats?.with_village} onClick={() => apply({ ...emptyFilters(), hasVillage: true })} />
          <StatTile label="Bu ay yeni" value={stats?.new_this_month} tone={au.info} onClick={() => apply({ ...emptyFilters(), createdFrom: monthStart() })} />
        </Box>

        {/* Süzgeçler */}
        <Stack component="section" aria-label="Filtreler" spacing={1.75} sx={{ bgcolor: au.surface, border: `1px solid ${au.border}`, borderRadius: '18px', p: 2 }}>
          <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
            <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: au.muted, mr: 0.5 }}>GÖRÜNÜMLER</Typography>
            <Pill label="Tüm kullanıcılar" selected={noFilters} onClick={() => apply({ ...emptyFilters(), sort: filters.sort })} />
            {views.map((v) => (
              <Box key={v.id} sx={{ display: 'inline-flex', alignItems: 'center' }}>
                <Pill label={v.name} selected={viewActive(v)} onClick={() => setParams(v.filters)} />
                <IconButton size="small" aria-label={`${v.name} görünümünü sil`}
                  onClick={async () => {
                    await userSearchService.deleteView(v.id).catch(() => {});
                    setViews((x) => x.filter((y) => y.id !== v.id));
                  }}>
                  <CloseIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Box>
            ))}
            <Pill label="+ Görünüm kaydet" dashed selected={false} onClick={() => openDialog('view')} />
          </Stack>

          <Stack direction="row" gap={1.25} flexWrap="wrap">
            <Box component="label" sx={{ flex: '1 1 320px', display: 'flex', alignItems: 'center', gap: 1.25, height: 46, px: 1.75, bgcolor: au.page, borderRadius: '12px', color: au.muted }}>
              <SearchIcon fontSize="small" />
              <InputBase placeholder="İsim, e-posta veya telefon ile ara" inputProps={{ 'aria-label': 'Kullanıcı ara' }} value={search}
                onChange={(e) => setSearch(e.target.value)} sx={{ flex: 1, color: au.text }} />
              {search && (
                <IconButton size="small" aria-label="Aramayı temizle" onClick={() => setSearch('')}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
            <Box sx={{ minWidth: 180 }}>
              <SelectBox label="Hesap türü" value={filters.type.length === 1 ? filters.type[0] : ''} options={Object.entries(TYPE_LABEL)}
                onChange={(v) => set({ type: v ? [v] : [] })} />
            </Box>
            <Box sx={{ minWidth: 160 }}>
              <SelectBox label="Durum" value={filters.status.length === 1 ? filters.status[0] : ''}
                options={[['ACTIVE', 'Aktif'], ['PENDING', 'Bekleyen'], ['BLOCKED', 'Engelli']]} onChange={(v) => set({ status: v ? [v] : [] })} />
            </Box>
            <Button onClick={() => setDrawer(true)} startIcon={<TuneIcon />}
              sx={{ height: 46, px: 2, borderRadius: '12px', border: `1.5px solid ${au.primary}`, color: au.primary, fontWeight: 700, textTransform: 'none', bgcolor: au.surface }}>
              Daha fazla filtre
              {drawerCount(filters) > 0 && (
                <Box component="span" sx={{ ml: 1, bgcolor: au.primary, color: '#fff', borderRadius: 999, px: 1, fontSize: 12 }}>{drawerCount(filters)}</Box>
              )}
            </Button>
          </Stack>

          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 1.25 }}>
            <SelectBox label="Memleket (il)" value={filters.hometownProvince ?? ''} options={TR_CITIES.map((c) => [c, c])}
              onChange={(v) => set({ hometownProvince: v || undefined, hometownDistrict: undefined })} />
            <Autocomplete
              size="small"
              options={villageOptions}
              value={filters.villageId ? { id: filters.villageId, label: filters.villageName ?? 'Seçili köy' } : null}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              filterOptions={(x) => x}
              onInputChange={(_, q) => searchVillages(q)}
              onChange={(_, v) => set({ villageId: v?.id, villageName: v?.label.split(' · ')[0] })}
              noOptionsText="En az 2 harf yaz"
              renderInput={(p) => (
                <TextField {...p} label="Memleket (köy)" placeholder="Köy ara" InputLabelProps={{ shrink: true }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', minHeight: 44 } }} />
              )}
            />
            <SelectBox label="Şu anki konum (il)" value={filters.currentCity ?? ''} options={TR_CITIES.map((c) => [c, c])}
              onChange={(v) => set({ currentCity: v || undefined })} />
            <SelectBox label="Yaş aralığı" value={filters.age.length === 1 ? filters.age[0] : ''}
              options={['18-24', '25-34', '35-44', '45-54', '55+', 'unknown'].map((k) => [k, AGE_LABEL[k]])} onChange={(v) => set({ age: v ? [v] : [] })} />
            <SelectBox label="Profil doluluğu" value={filters.minProfile ? String(filters.minProfile) : ''}
              options={[['30', '%30 ve üstü'], ['60', '%60 ve üstü'], ['90', '%90 ve üstü']]} onChange={(v) => set({ minProfile: v ? Number(v) : undefined })} />
            <SelectBox label="Kayıt tarihi" value={filters.createdFrom && !filters.createdTo ? filters.createdFrom : ''}
              options={[
                [monthStart(), 'Bu ay'],
                [new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10), 'Son 7 gün'],
                [new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10), 'Son 30 gün'],
                [`${new Date().getFullYear()}-01-01`, 'Bu yıl'],
              ]}
              onChange={(v) => set({ createdFrom: v || undefined, createdTo: undefined })} />
          </Box>

          <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
            <Pill label="Profil fotoğrafı var" selected={filters.photo === 'yes'} onClick={() => set({ photo: filters.photo === 'yes' ? undefined : 'yes' })} />
            <Pill label="Köyünü seçmiş" selected={!!filters.hasVillage} onClick={() => set({ hasVillage: filters.hasVillage ? undefined : true })} />
            <Pill label="Sülale eklemiş" selected={!!filters.hasFamily} onClick={() => set({ hasFamily: filters.hasFamily ? undefined : true })} />
            <Tooltip title="Telefon doğrulaması henüz tutulmuyor">
              <span><Pill label="Telefonu doğrulı" selected={false} onClick={() => {}} /></span>
            </Tooltip>
            <Tooltip title="NartLive konumu ayrı serviste; bu listede süzülemiyor">
              <span><Pill label="NartLive açık" selected={false} onClick={() => {}} /></span>
            </Tooltip>
            <Pill label="Hiç giriş yapmamış" selected={filters.activity === 'never'} onClick={() => set({ activity: filters.activity === 'never' ? undefined : 'never' })} />
          </Stack>

          {chips.length > 0 && (
            <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap" sx={{ borderTop: `1px solid ${au.borderSoft}`, pt: 1.5 }}>
              <Typography sx={{ fontSize: 13, color: au.muted }}>Etkin:</Typography>
              {chips.map((c) => (
                <Box key={c.key} component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, bgcolor: au.primaryTint, color: au.primary, borderRadius: 999, pl: 1.5, pr: 0.5, py: 0.5, fontSize: 13, fontWeight: 600 }}>
                  {c.label}
                  <IconButton size="small" aria-label={`${c.label} süzgecini kaldır`} onClick={() => apply(c.remove(filters))} sx={{ width: 24, height: 24, color: au.primary }}>
                    <CloseIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Box>
              ))}
              <Button onClick={() => apply({ ...emptyFilters(), sort: filters.sort })} sx={{ color: au.primary, fontWeight: 700, textTransform: 'none' }}>Temizle</Button>
              <Box sx={{ flex: 1 }} />
              <Typography sx={{ fontSize: 12.5, color: au.muted }}>
                Memleket ve sülale özel nitelikli veridir. Bu filtreler ve dışa aktarmalar denetim kaydına yazılır.
              </Typography>
            </Stack>
          )}
        </Stack>

        {/* Tablo */}
        <Box component="section" aria-label="Kullanıcılar" sx={{ bgcolor: au.surface, border: `1px solid ${au.border}`, borderRadius: '18px', overflow: 'hidden' }}>
          {selected.size > 0 && (
            <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1.5} flexWrap="wrap" sx={{ px: 2.25, py: 1.75, bgcolor: au.bulkBar, color: '#fff' }}>
              <Typography sx={{ fontWeight: 700 }}>{selected.size} kullanıcı seçili</Typography>
              <Stack direction="row" gap={1} flexWrap="wrap">
                <Button onClick={() => setDialog('notify')} sx={{ height: 38, px: 1.75, bgcolor: '#fff', color: au.primary, borderRadius: '10px', fontWeight: 700, textTransform: 'none', '&:hover': { bgcolor: au.primaryTint } }}>
                  Bildirim gönder
                </Button>
                {[
                  ['Etiketle', () => openDialog('tag')],
                  ['Seçilileri dışa aktar', exportSelected],
                ].map(([l, fn]) => (
                  <Button key={l as string} onClick={fn as () => void} sx={{ height: 38, px: 1.75, color: '#fff', border: `1px solid ${au.bulkBarBorder}`, borderRadius: '10px', fontWeight: 600, textTransform: 'none' }}>
                    {l as string}
                  </Button>
                ))}
                <Button onClick={() => { setBlockTargets([...selected.values()]); openDialog('block'); }}
                  sx={{ height: 38, px: 1.75, color: au.bulkDanger, border: `1px solid ${au.bulkDangerBorder}`, borderRadius: '10px', fontWeight: 600, textTransform: 'none' }}>
                  Engelle
                </Button>
                <IconButton aria-label="Seçimi temizle" onClick={() => setSelected(new Map())} sx={{ color: '#fff' }}>
                  <CloseIcon />
                </IconButton>
              </Stack>
            </Stack>
          )}

          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2.25, py: 1.5, borderBottom: `1px solid ${au.borderSoft}` }}>
            <Typography sx={{ color: au.muted }} aria-live="polite">
              <Box component="strong" sx={{ color: au.text }}>{fmtNum(result?.matched)} kullanıcı</Box> eşleşiyor, toplam {fmtNum(result?.total)}
            </Typography>
            <Button onClick={(e) => setSortEl(e.currentTarget)} sx={{ color: au.primary, fontWeight: 700, textTransform: 'none' }}>
              Sırala: {SORT_LABEL[filters.sort ?? 'created']} ▾
            </Button>
            <Menu anchorEl={sortEl} open={!!sortEl} onClose={() => setSortEl(null)}>
              {Object.entries(SORT_LABEL).map(([k, l]) => (
                <MenuItem key={k} selected={(filters.sort ?? 'created') === k} onClick={() => { setSortEl(null); set({ sort: k as UserFilters['sort'] }); }}>{l}</MenuItem>
              ))}
            </Menu>
          </Stack>

          <Box sx={{ overflowX: 'auto' }}>
            <Box role="table" aria-label="Kullanıcı listesi" sx={{ minWidth: 1060 }}>
              <Box role="row" sx={{ display: 'grid', gridTemplateColumns: COLS, alignItems: 'center', px: 2.25, py: 1.25, bgcolor: au.surfaceSoft, borderBottom: `1px solid ${au.borderSoft}`, fontSize: 11.5, fontWeight: 700, letterSpacing: '0.08em', color: au.muted }}>
                <span role="columnheader"><Checkbox size="small" checked={allOnPage} indeterminate={!allOnPage && items.some((r) => selected.has(r.id))} onChange={toggleAll} inputProps={{ 'aria-label': 'Sayfadakilerin tümünü seç' }} /></span>
                {['KULLANICI', 'DURUM', 'HESAP', 'MEMLEKET', 'KONUM', 'YAŞ', 'PROFİL', 'SON GİRİŞ', ''].map((h, i) => (
                  <span role="columnheader" key={i}>{h}</span>
                ))}
              </Box>

              {loading && !result
                ? Array.from({ length: 6 }).map((_, i) => (
                    <Box key={i} sx={{ px: 2.25, py: 1.5, borderBottom: `1px solid ${au.borderSoft}` }}><Skeleton height={40} /></Box>
                  ))
                : failed
                  ? (
                    <Stack alignItems="center" spacing={1.5} sx={{ py: 6 }}>
                      <Typography>Kullanıcılar yüklenemedi.</Typography>
                      <Button variant="outlined" onClick={load} sx={{ borderRadius: '10px', textTransform: 'none' }}>Tekrar dene</Button>
                    </Stack>
                  )
                  : items.length === 0
                    ? (
                      <Stack alignItems="center" spacing={1.5} sx={{ py: 6 }}>
                        <Typography sx={{ fontWeight: 700 }}>Bu filtreyle kullanıcı yok</Typography>
                        {!noFilters && (
                          <Button variant="outlined" onClick={() => apply({ ...emptyFilters(), sort: filters.sort })} sx={{ borderRadius: '10px', textTransform: 'none' }}>
                            Filtreleri temizle
                          </Button>
                        )}
                      </Stack>
                    )
                    : items.map((r) => {
                        const isSel = selected.has(r.id);
                        return (
                          <Box key={r.id} role="row" component={RouterLink} to={detailHref(r.id)}
                            sx={{ display: 'grid', gridTemplateColumns: COLS, alignItems: 'center', px: 2.25, py: 1.5, borderBottom: `1px solid ${au.borderSoft}`,
                              bgcolor: isSel ? au.selectedRow : 'transparent', color: au.text, textDecoration: 'none', opacity: loading ? 0.6 : 1,
                              '&:hover': { bgcolor: au.surfaceSoft }, '&:focus-visible': { outline: `2px solid ${au.primary}`, outlineOffset: -2 } }}>
                            <span role="cell" onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleRow(r); }}>
                              <Checkbox size="small" checked={isSel} inputProps={{ 'aria-label': `${r.name} seç` }} />
                            </span>
                            <Stack role="cell" direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
                              <Avatar src={r.imageUrl ?? undefined} alt="" sx={{ width: 40, height: 40, bgcolor: r.imageUrl ? au.avatar : au.avatarSoft, color: au.muted, fontWeight: 700, fontSize: 14 }}>
                                {initials(r.name || r.email)}
                              </Avatar>
                              <Box sx={{ minWidth: 0 }}>
                                <Typography sx={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name || '-'}</Typography>
                                <Typography sx={{ fontSize: 12.5, color: au.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.email}</Typography>
                              </Box>
                            </Stack>
                            <span role="cell"><StatusBadge status={r.status} /></span>
                            <span role="cell">{TYPE_LABEL[r.accountType] ?? r.accountType ?? '-'}</span>
                            <Box role="cell" sx={{ minWidth: 0 }}>
                              {r.village ? (
                                <>
                                  <Typography sx={{ fontWeight: 600 }}>{r.village.name}</Typography>
                                  <Typography sx={{ fontSize: 12.5, color: au.muted }}>{[r.village.district, r.village.province].filter(Boolean).join(' · ')}</Typography>
                                </>
                              ) : (
                                <Typography sx={{ color: au.placeholder }}>{r.hometownCity || 'Seçilmemiş'}</Typography>
                              )}
                            </Box>
                            <Typography role="cell" sx={{ color: r.currentCity ? au.text : au.placeholder }}>{r.currentCity || 'Bilinmiyor'}</Typography>
                            <Typography role="cell" sx={{ color: r.ageBand === 'unknown' ? au.placeholder : au.text }}>{r.ageBand === 'unknown' ? '-' : AGE_LABEL[r.ageBand] ?? r.ageBand}</Typography>
                            <span role="cell"><ProfileBar value={r.profileScore} /></span>
                            <Typography role="cell" sx={{ color: r.lastLoginAt ? au.muted : au.placeholder }}>{timeAgo(r.lastLoginAt)}</Typography>
                            <span role="cell" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                              <IconButton aria-label={`${r.name} işlemleri`} onClick={(e) => setRowMenu({ el: e.currentTarget, row: r })}>
                                <MoreIcon />
                              </IconButton>
                            </span>
                          </Box>
                        );
                      })}
            </Box>
          </Box>

          <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1.5} flexWrap="wrap" sx={{ px: 2.25, py: 1.5 }}>
            <Typography sx={{ color: au.muted }}>
              {result && result.matched > 0 ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, result.matched)} / ${fmtNum(result.matched)}` : '0'}
            </Typography>
            <Stack direction="row" alignItems="center" gap={0.75}>
              <IconButton aria-label="Önceki sayfa" disabled={page <= 1} onClick={() => setParams({ ...filtersToParams(filters), page: String(page - 1) })}
                sx={{ width: 40, height: 40, border: `1px solid ${au.chipBorder}`, borderRadius: '10px' }}>‹</IconButton>
              {Array.from({ length: Math.min(pages, 5) }, (_, i) => Math.min(Math.max(page - 2, 1), Math.max(pages - 4, 1)) + i).map((n) => (
                <Button key={n} aria-current={n === page ? 'page' : undefined} onClick={() => setParams({ ...filtersToParams(filters), page: String(n) })}
                  sx={{ minWidth: 40, height: 40, borderRadius: '10px', fontWeight: 700, bgcolor: n === page ? au.primary : au.surface, color: n === page ? '#fff' : au.text,
                    border: n === page ? 0 : `1px solid ${au.chipBorder}`, '&:hover': { bgcolor: n === page ? au.primaryDark : au.surfaceSoft } }}>
                  {n}
                </Button>
              ))}
              <IconButton aria-label="Sonraki sayfa" disabled={page >= pages} onClick={() => setParams({ ...filtersToParams(filters), page: String(page + 1) })}
                sx={{ width: 40, height: 40, border: `1px solid ${au.chipBorder}`, borderRadius: '10px' }}>›</IconButton>
            </Stack>
          </Stack>
        </Box>
      </Stack>

      {/* Satır menüsü */}
      <Menu anchorEl={rowMenu?.el} open={!!rowMenu} onClose={() => setRowMenu(null)}>
        <MenuItem onClick={() => { const r = rowMenu!.row; setRowMenu(null); navigate(detailHref(r.id)); }}>Detayı aç</MenuItem>
        <MenuItem onClick={() => { const r = rowMenu!.row; setRowMenu(null); setSelected(new Map([[r.id, r]])); setDialog('notify'); }}>Bildirim gönder</MenuItem>
        <MenuItem onClick={() => { const r = rowMenu!.row; setRowMenu(null); setSelected(new Map([[r.id, r]])); openDialog('tag'); }}>Etiketle</MenuItem>
        {rowMenu?.row.status === 'BLOCKED' ? (
          <MenuItem onClick={() => { const r = rowMenu!.row; setRowMenu(null); setText(''); runBulk('unblock', [r]); }}>Engeli kaldır</MenuItem>
        ) : (
          <MenuItem sx={{ color: au.danger }} onClick={() => { const r = rowMenu!.row; setRowMenu(null); setBlockTargets([r]); openDialog('block'); }}>Engelle</MenuItem>
        )}
      </Menu>

      <UserFilterDrawer open={drawer} value={filters} onClose={() => setDrawer(false)} onApply={(f) => { setDrawer(false); apply(f); }} />

      {/* Dışa aktarma: sebep zorunlu, telefon varsayılan dışarıda */}
      <Dialog open={dialog === 'export'} onClose={() => setDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Filtreye göre dışa aktar</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2, color: au.muted }}>
            {fmtNum(result?.matched)} kullanıcı CSV olarak indirilir. Sebep ve süzgeç denetim kaydına yazılır. Tam adres hiçbir zaman dışarı çıkmaz.
          </Typography>
          <TextField autoFocus fullWidth multiline minRows={2} label="Sebep (zorunlu)" value={text} onChange={(e) => setText(e.target.value)} />
          <FormControlLabel sx={{ mt: 1 }} control={<Checkbox checked={includePhone} onChange={(e) => setIncludePhone(e.target.checked)} />} label="Telefon sütununu ekle" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)}>Vazgeç</Button>
          <Button variant="contained" disabled={busy || text.trim().length < 5} onClick={doExport} sx={{ bgcolor: au.primary }}>İndir</Button>
        </DialogActions>
      </Dialog>

      {/* Engelleme: onay ve sebep */}
      <Dialog open={dialog === 'block'} onClose={() => setDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{blockTargets.length === 1 ? `${blockTargets[0].name} engellensin mi?` : `${blockTargets.length} kullanıcı engellensin mi?`}</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2, color: au.muted }}>Engellenen kullanıcı giriş yapamaz. Sebep denetim kaydına yazılır.</Typography>
          <TextField autoFocus fullWidth multiline minRows={2} label="Sebep (zorunlu)" value={text} onChange={(e) => setText(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)}>Vazgeç</Button>
          <Button variant="contained" color="error" disabled={busy || text.trim().length < 5} onClick={() => runBulk('block', blockTargets)}>Engelle</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={dialog === 'tag'} onClose={() => setDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Etiketle</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2, color: au.muted }}>{selected.size} kullanıcıya etiket eklenir. Etiketi yalnız yöneticiler görür.</Typography>
          <TextField autoFocus fullWidth label="Etiket" inputProps={{ maxLength: 40 }} value={text} onChange={(e) => setText(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)}>Vazgeç</Button>
          <Button variant="contained" disabled={busy || !text.trim()} onClick={() => runBulk('tag', [...selected.values()])} sx={{ bgcolor: au.primary }}>Ekle</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={dialog === 'view'} onClose={() => setDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Görünüm kaydet</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2, color: au.muted }}>Etkin süzgeçler adlandırılıp yalnız senin için saklanır.</Typography>
          <TextField autoFocus fullWidth label="Görünüm adı" inputProps={{ maxLength: 60 }} value={text} onChange={(e) => setText(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)}>Vazgeç</Button>
          <Button variant="contained" disabled={!text.trim() || noFilters} onClick={saveView} sx={{ bgcolor: au.primary }}>Kaydet</Button>
        </DialogActions>
      </Dialog>

      {dialog === 'notify' && (
        <UserSelectionDialog
          open
          onClose={() => setDialog(null)}
          onSuccess={() => { setDialog(null); setSelected(new Map()); }}
          initialSelected={[...selected.values()].map((r) => ({ id: r.id, email: r.email, displayName: r.name }))}
        />
      )}

      <CreateUserDialog open={dialog === 'create'} onClose={() => setDialog(null)} onCreated={(id) => { setDialog(null); navigate(`/users/${id}`); }} />
    </Box>
  );
}
