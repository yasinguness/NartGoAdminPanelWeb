import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import HeritagePendingCard from '../../components/HeritagePendingCard';
import {
  Alert, Box, Button, Chip, CircularProgress, InputAdornment, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableHead, TablePagination,
  TableRow, TextField, Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import { errorText } from '../../services/heritageReviewService';
import { CONFIDENCE_LABEL, countryLabel, heritageVillageService, type VillageList, type VillageView } from '../../services/heritageVillageService';
import VillageEditor, { CONTRIBUTIONS_TAB } from './VillageEditor';

const PAGE = 50;

/** Süzgeç kartları: tıklanınca tablo o görünüme geçer (sunucu `view`). */
const VIEWS: { v: VillageView; label: string; hint: string }[] = [
  { v: 'all', label: 'Tüm köyler', hint: 'arama ve il süzgecine göre' },
  { v: 'pending', label: 'Karar bekleyen', hint: 'katkı, düzeltme ya da itiraz' },
  { v: 'noLocation', label: 'Konum eksik', hint: 'koordinatsız ya da ilçe düzeyi' },
  { v: 'disputed', label: 'Tartışmalı', hint: 'itiraz edilmiş ad ya da sülale' },
];

/**
 * Köyler: ekleme, düzenleme, kaldırma, Çerkesçe ad ve sülale yönetimi. Türkiye dışı köyler (Kosova vb.) buradan eklenir.
 * Bekleyen konum katkıları (koordinatsız kayıtlar dahil) Köy Konumları masasında incelenir.
 */
export default function HeritageVillages() {
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [province, setProvince] = useState('');
  const [country, setCountry] = useState('');
  const [status, setStatus] = useState('approved');
  const [page, setPage] = useState(0);
  const [data, setData] = useState<VillageList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();
  // ?village=<id> (yönetici talepleri masası) köyü doğrudan açar; &tab=katki katkı sekmesine gider.
  const [editing, setEditing] = useState<{ id: string; tab: number } | null>(() => {
    const id = searchParams.get('village');
    return id ? { id, tab: searchParams.get('tab') === 'katki' ? CONTRIBUTIONS_TAB : 0 } : null;
  });
  // ?pending=1 (admin ana sayfası bağlantıları) "Karar bekleyen" görünümünü açar.
  const [view, setView] = useState<VillageView>(searchParams.get('pending') === '1' ? 'pending' : 'all');

  useEffect(() => { const t = window.setTimeout(() => { setQuery(q); setPage(0); }, 300); return () => window.clearTimeout(t); }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await heritageVillageService.list({ q: query, province, country, status, view, pendingOnly: view === 'pending', page, size: PAGE })); setError(''); }
    catch (e) { setError(errorText(e)); } finally { setLoading(false); }
  }, [query, province, country, status, view, page]);

  useEffect(() => { void load(); }, [load]);

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 0.5 }}>
        <Typography variant="h5" fontWeight={700} sx={{ flex: 1 }}>Köyler</Typography>
        <Button component={RouterLink} to="/heritage/locations">Konum inceleme masası</Button>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setEditing({ id: 'new', tab: 0 })}>Yeni köy ekle</Button>
      </Stack>
      <Typography color="text.secondary" sx={{ mb: 2, maxWidth: 860 }}>
        Haritada eksik köyü buradan ekleyin; konumu Google ya da OpenStreetMap'ten bulabilir, Kosova gibi Türkiye dışındaki köyleri de girebilirsiniz.
        Bir köyü açıp adını, konumunu, Çerkesçe adlarını ve sülalelerini düzenleyebilirsiniz.
      </Typography>
      <HeritagePendingCard />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 1.5, mb: 2 }} role="group" aria-label="Köy görünümü">
        {VIEWS.map((x) => {
          const on = view === x.v;
          const n = data?.counts?.[x.v] ?? (x.v === 'pending' ? data?.villagesWithPending : x.v === 'all' ? data?.total : undefined);
          return (
            <Paper key={x.v} component="button" type="button" variant="outlined" aria-pressed={on}
              onClick={() => { setView(x.v); setPage(0); }}
              sx={{ p: 1.5, textAlign: 'left', cursor: 'pointer', font: 'inherit', bgcolor: on ? 'action.selected' : 'background.paper',
                borderColor: on ? 'primary.main' : 'divider', borderWidth: on ? 2 : 1, '&:hover': { borderColor: 'primary.main' } }}>
              <Typography variant="body2" color="text.secondary">{x.label}</Typography>
              <Typography variant="h5" fontWeight={700} color={x.v !== 'all' && (n ?? 0) > 0 ? (x.v === 'disputed' ? 'error.main' : 'warning.main') : 'text.primary'}>
                {n == null ? '–' : n.toLocaleString('tr-TR')}
              </Typography>
              <Typography variant="caption" color="text.secondary">{x.hint}</Typography>
            </Paper>
          );
        })}
      </Box>
      {data && data.pendingWithoutLocation > 0 && (
        <Alert severity="info" sx={{ mb: 2 }} action={<Button component={RouterLink} to="/heritage/locations" size="small">İncele</Button>}>
          {data.pendingWithoutLocation} köy kaydının konumu henüz yok. Konum inceleme masasında "Konumsuz" sekmesinden tamamlanır.
        </Alert>
      )}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField size="small" fullWidth placeholder="Köy adı, eski ad ya da ilçe ara" value={q} onChange={(e) => setQ(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
          <TextField size="small" select label="Ülke" value={country} onChange={(e) => { setCountry(e.target.value); setPage(0); }} sx={{ minWidth: 150 }}>
            <MenuItem value="">Tümü</MenuItem>
            {(data?.countries ?? []).map((c) => <MenuItem key={c} value={c}>{countryLabel(c)}</MenuItem>)}
          </TextField>
          <TextField size="small" select label="İl / bölge" value={province} onChange={(e) => { setProvince(e.target.value); setPage(0); }} sx={{ minWidth: 170 }}>
            <MenuItem value="">Tümü</MenuItem>
            {(data?.provinces ?? []).map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
          </TextField>
          <TextField size="small" select label="Durum" value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} sx={{ minWidth: 150 }}>
            <MenuItem value="approved">Yayında</MenuItem>
            <MenuItem value="removed">Kaldırılanlar</MenuItem>
            <MenuItem value="all">Hepsi</MenuItem>
          </TextField>
        </Stack>
      </Paper>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Köy</TableCell><TableCell>İlçe, il</TableCell><TableCell>Ülke</TableCell><TableCell>Konum</TableCell><TableCell align="right">Sülale</TableCell><TableCell>Durum</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}><CircularProgress size={24} /></TableCell></TableRow>}
            {!loading && data?.items.length === 0 && <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>{view === 'all' ? 'Köy bulunamadı. Aradığınız köy yoksa "Yeni köy ekle" ile açın.' : 'Bu görünümde köy yok.'}</TableCell></TableRow>}
            {!loading && data?.items.map((v) => (
              <TableRow key={v.id} hover sx={{ cursor: 'pointer', opacity: v.status === 'removed' ? 0.6 : 1 }} onClick={() => setEditing({ id: v.id, tab: v.pending_count > 0 ? CONTRIBUTIONS_TAB : 0 })}>
                <TableCell><Stack direction="row" spacing={1} alignItems="center"><Typography fontWeight={600}>{v.official_name}</Typography>{v.pending_count > 0 && <Chip size="small" color="warning" label={`${v.pending_count} Karar Bekliyor`} />}{v.disputed && <Chip size="small" color="error" variant="outlined" label="Tartışmalı" />}</Stack>{v.admin_type === 'neighbourhood' && <Typography variant="caption" color="text.secondary">Mahalle</Typography>}</TableCell>
                <TableCell>{v.district}, {v.province}</TableCell>
                <TableCell>{countryLabel(v.country_code)}</TableCell>
                <TableCell>
                  <Chip size="small" variant="outlined" label={CONFIDENCE_LABEL[v.confidence] ?? v.confidence} color={v.confidence === 'admin_verified' || v.confidence === 'community_verified' ? 'success' : 'default'} />
                  {v.location_precision === 'HISTORICAL' && <Chip size="small" sx={{ ml: 0.5 }} label="Tarihî" />}
                  {v.location_precision === 'DISTRICT' && <Chip size="small" color="info" variant="outlined" sx={{ ml: 0.5 }} label="İlçe Düzeyi" />}
                </TableCell>
                <TableCell align="right">{v.family_count}</TableCell>
                <TableCell>{v.merged_into ? <Chip size="small" label="Birleştirildi" /> : v.status === 'removed' ? <Chip size="small" color="warning" label="Kaldırıldı" /> : <Chip size="small" color="success" variant="outlined" label="Yayında" />}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {data && <TablePagination component="div" count={data.total} page={data.page} onPageChange={(_, p) => setPage(p)} rowsPerPage={PAGE} rowsPerPageOptions={[PAGE]} labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`} />}
      </Paper>
      {editing && <VillageEditor key={editing.id} villageId={editing.id} initialTab={editing.tab} onClose={() => setEditing(null)} onChanged={() => void load()} />}
    </Box>
  );
}
