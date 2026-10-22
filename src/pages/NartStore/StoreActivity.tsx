import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, InputAdornment, MenuItem, Paper, Stack, Tab, Table, TableBody, TableCell, TableHead,
  TablePagination, TableRow, Tabs, TextField, Tooltip, Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  ERROR_TYPES, EVENT_LABEL, PAYMENT_LABEL, deviceLabel, errorText, storeActivityService,
  type EventGroup, type Overview, type Platform, type StoreEvent, type StoreOrder, type StoreUserActivity,
} from '../../services/nartstore/storeActivityService';

/**
 * NartStore › Hareketler. Mağaza sitesinde kim neye baktı, neyi sepete ekledi/çıkardı, ne aradı, nerede hata aldı;
 * siparişler ve ödeme sonucu. Giriş yapmamış ziyaretçi "Misafir" görünür (ziyaretçi kimliğiyle gruplanır).
 */

const fmtTime = (iso: string) => new Date(iso).toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
const fmtMoney = (n: number) => `${Number(n || 0).toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ₺`;
const pct = (a: number, b: number) => (b > 0 ? `%${Math.round((a / b) * 100)}` : '—');

export default function StoreActivity() {
  const [tab, setTab] = useState(0);
  const [days, setDays] = useState(7);
  const [userFilter, setUserFilter] = useState<{ id: string; label: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const showUser = (id: string, label: string) => { setUserFilter({ id, label }); setTab(1); };

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 0.5 }}>
        <Typography variant="h5" fontWeight={700} sx={{ flex: 1 }}>NartStore hareketleri</Typography>
        <TextField select size="small" label="Dönem" value={days} onChange={(e) => setDays(Number(e.target.value))} sx={{ minWidth: 140 }}>
          <MenuItem value={1}>Bugün</MenuItem>
          <MenuItem value={7}>Son 7 gün</MenuItem>
          <MenuItem value={30}>Son 30 gün</MenuItem>
          <MenuItem value={90}>Son 90 gün</MenuItem>
        </TextField>
        <Button startIcon={<RefreshIcon />} onClick={() => setRefreshKey((k) => k + 1)}>Yenile</Button>
      </Stack>
      <Typography color="text.secondary" sx={{ mb: 2, maxWidth: 900 }}>
        store.nartgo.net'te ve NartGo uygulamasındaki mağazada kim hangi ürüne baktı, neyi sepete ekledi ya da çıkardı, ne aradı ve nerede hata aldı. Sipariş ve ödeme sonucu siparişler kaydından gelir.
        Giriş yapmamış ziyaretçiler "Misafir" olarak görünür.
      </Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }} variant="scrollable">
        <Tab label="Özet" />
        <Tab label="Olay akışı" />
        <Tab label="Kişiler" />
        <Tab label="Siparişler ve ödeme" />
        <Tab label="Hatalar" />
      </Tabs>
      {tab === 0 && <OverviewTab days={days} refreshKey={refreshKey} />}
      {tab === 1 && <EventsTab days={days} refreshKey={refreshKey} user={userFilter} onClearUser={() => setUserFilter(null)} onUser={showUser} />}
      {tab === 2 && <UsersTab days={days} refreshKey={refreshKey} onUser={showUser} />}
      {tab === 3 && <OrdersTab days={days} refreshKey={refreshKey} onUser={showUser} />}
      {tab === 4 && <EventsTab days={days} refreshKey={refreshKey} user={null} onClearUser={() => undefined} onUser={showUser} fixedGroup="errors" />}
    </Box>
  );
}

function useLoad<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    run().then((d) => { if (alive) { setData(d); setError(''); } }).catch((e) => { if (alive) setError(errorText(e)); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [run]);
  return { data, loading, error };
}

function Stat({ label, value, hint, tone }: { label: string; value: string | number; hint?: string; tone?: 'error' | 'success' }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, minWidth: 150, flex: 1 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="h5" fontWeight={800} color={tone === 'error' ? 'error.main' : tone === 'success' ? 'success.main' : 'text.primary'}>{value}</Typography>
      {hint && <Typography variant="caption" color="text.secondary">{hint}</Typography>}
    </Paper>
  );
}

function OverviewTab({ days, refreshKey }: { days: number; refreshKey: number }) {
  const { data, loading, error } = useLoad<Overview>(() => storeActivityService.overview(days), [days, refreshKey]);
  if (loading) return <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress /></Box>;
  if (error || !data) return <Alert severity="error">{error}</Alert>;
  const t = data.totals;
  const paid = data.orders.find((o) => o.status === 'PAID');
  const failed = data.orders.find((o) => o.status === 'FAILED');
  const allOrders = data.orders.reduce((n, o) => n + o.count, 0);
  const f = data.funnel;
  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
        <Stat label="Ziyaretçi" value={t.visitors} hint={`${t.users} kişi giriş yaptı`} />
        <Stat label="Ürün görüntüleme" value={t.productViews} hint={`${t.productClicks} ürüne tıklama`} />
        <Stat label="Sepete ekleme" value={t.addToCart} hint={`${t.removeFromCart} çıkarma`} />
        <Stat label="Sipariş" value={allOrders} hint={`${paid?.count ?? 0} ödendi · ${fmtMoney(paid?.total ?? 0)}`} tone="success" />
        <Stat label="Hata" value={t.errors} hint={`${t.peopleWithErrors} kişi etkilendi · ${failed?.count ?? 0} ödeme başarısız`} tone={t.errors ? 'error' : undefined} />
      </Stack>

      {data.platforms?.length > 0 && (
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          {(['app', 'web'] as const).map((k) => {
            const p = data.platforms.find((x) => x.platform === k);
            return (
              <Paper key={k} variant="outlined" sx={{ p: 2, borderRadius: 2, flex: 1, minWidth: 260 }}>
                <Typography fontWeight={700}>{k === 'app' ? 'NartGo uygulaması' : 'store.nartgo.net (web)'}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {p ? `${p.visitors} ziyaretçi · ${p.users} giriş yapmış · ${p.addToCart} sepete ekleme · ${p.orders} sipariş · ${p.errors} hata` : 'Bu dönemde hareket yok.'}
                </Typography>
              </Paper>
            );
          })}
        </Stack>
      )}

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
        <Typography fontWeight={700} sx={{ mb: 1 }}>Satın alma hunisi (oturum)</Typography>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
          {[
            { label: 'Ürüne baktı', v: f.viewed, of: null },
            { label: 'Sepete ekledi', v: f.carted, of: f.viewed },
            { label: 'Ödeme sayfasına geçti', v: f.checkout, of: f.carted },
            { label: 'Sipariş verdi', v: f.submitted, of: f.checkout },
          ].map((s) => (
            <Box key={s.label} sx={{ flex: 1, p: 1.5, borderRadius: 1.5, bgcolor: 'action.hover' }}>
              <Typography variant="caption" color="text.secondary">{s.label}</Typography>
              <Typography variant="h6" fontWeight={800}>{s.v}</Typography>
              {s.of != null && <Typography variant="caption" color="text.secondary">bir önceki adımın {pct(s.v, s.of)}'i</Typography>}
            </Box>
          ))}
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'auto' }}>
        <Typography fontWeight={700} sx={{ p: 2, pb: 0 }}>Günlük</Typography>
        <Table size="small">
          <TableHead><TableRow><TableCell>Gün</TableCell><TableCell align="right">Ziyaretçi</TableCell><TableCell align="right">Sepete ekleme</TableCell><TableCell align="right">Sipariş</TableCell><TableCell align="right">Ödenen</TableCell><TableCell align="right">Hata</TableCell></TableRow></TableHead>
          <TableBody>
            {[...data.trend].reverse().map((d) => (
              <TableRow key={d.date}>
                <TableCell>{new Date(d.date).toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' })}</TableCell>
                <TableCell align="right">{d.visitors}</TableCell><TableCell align="right">{d.addToCart}</TableCell>
                <TableCell align="right">{d.orders}</TableCell><TableCell align="right">{d.paid}</TableCell>
                <TableCell align="right" sx={{ color: d.errors ? 'error.main' : undefined }}>{d.errors}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.4fr 1fr' }, gap: 2 }}>
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'auto' }}>
          <Typography fontWeight={700} sx={{ p: 2, pb: 0 }}>En çok ilgi gören ürünler</Typography>
          <Table size="small">
            <TableHead><TableRow><TableCell>Ürün</TableCell><TableCell align="right">Görüntüleme</TableCell><TableCell align="right">Tıklama</TableCell><TableCell align="right">Sepete</TableCell><TableCell align="right">Çıkarma</TableCell><TableCell align="right">Kişi</TableCell></TableRow></TableHead>
            <TableBody>
              {data.topProducts.length === 0 && <TableRow><TableCell colSpan={6} sx={{ color: 'text.secondary' }}>Bu dönemde ürün hareketi yok.</TableCell></TableRow>}
              {data.topProducts.map((p) => (
                <TableRow key={p.productId}>
                  <TableCell><Typography variant="body2" fontWeight={600}>{p.title ?? 'Silinmiş ürün'}</Typography><Typography variant="caption" color="text.secondary">{p.storeName}</Typography></TableCell>
                  <TableCell align="right">{p.views}</TableCell><TableCell align="right">{p.clicks}</TableCell>
                  <TableCell align="right">{p.addToCart}</TableCell><TableCell align="right">{p.removed}</TableCell><TableCell align="right">{p.cartUsers}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'auto' }}>
          <Typography fontWeight={700} sx={{ p: 2, pb: 0 }}>Aramalar</Typography>
          <Table size="small">
            <TableHead><TableRow><TableCell>Aranan</TableCell><TableCell align="right">Kez</TableCell><TableCell align="right">Sonuçsuz</TableCell></TableRow></TableHead>
            <TableBody>
              {data.topSearches.length === 0 && <TableRow><TableCell colSpan={3} sx={{ color: 'text.secondary' }}>Bu dönemde arama yok.</TableCell></TableRow>}
              {data.topSearches.map((s) => (
                <TableRow key={s.query}>
                  <TableCell>{s.query}</TableCell><TableCell align="right">{s.count}</TableCell>
                  <TableCell align="right" sx={{ color: s.zeroResults ? 'warning.dark' : undefined, fontWeight: s.zeroResults ? 700 : undefined }}>{s.zeroResults}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      </Box>

      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'auto' }}>
        <Typography fontWeight={700} sx={{ p: 2, pb: 0 }}>En sık hatalar</Typography>
        <Table size="small">
          <TableHead><TableRow><TableCell>Tür</TableCell><TableCell>Mesaj</TableCell><TableCell>Yer</TableCell><TableCell align="right">Kez</TableCell><TableCell align="right">Kişi</TableCell><TableCell>Son</TableCell></TableRow></TableHead>
          <TableBody>
            {data.topErrors.length === 0 && <TableRow><TableCell colSpan={6} sx={{ color: 'text.secondary' }}>Bu dönemde hata kaydı yok.</TableCell></TableRow>}
            {data.topErrors.map((e, i) => (
              <TableRow key={i}>
                <TableCell><Chip size="small" color="error" variant="outlined" label={EVENT_LABEL[e.eventType] ?? e.eventType} /></TableCell>
                <TableCell sx={{ maxWidth: 420 }}>{e.message}</TableCell>
                <TableCell><Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{[e.endpoint, e.status && e.status !== '0' ? e.status : null].filter(Boolean).join(' · ') || '—'}</Typography></TableCell>
                <TableCell align="right">{e.count}</TableCell><TableCell align="right">{e.people}</TableCell><TableCell>{fmtTime(e.lastAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Stack>
  );
}

const GROUPS: { v: EventGroup; label: string }[] = [
  { v: 'all', label: 'Tümü (sayfa gezintisi hariç)' }, { v: 'cart', label: 'Sepet ve kupon' }, { v: 'clicks', label: 'Ürün ve tıklamalar' },
  { v: 'search', label: 'Arama' }, { v: 'checkout', label: 'Ödeme adımları' }, { v: 'errors', label: 'Hatalar' }, { v: 'auth', label: 'Giriş ve kayıt' },
  { v: 'pages', label: 'Sayfa gezintisi' },
];

/** Olayın kısa açıklaması: ne arandı, kaç sonuç, hata mesajı, kupon... */
function detailOf(e: StoreEvent): string {
  const m = (e.metadata ?? {}) as Record<string, unknown>;
  switch (e.eventType) {
    case 'search': return `"${m.query ?? ''}" · ${m.results ?? 0} sonuç`;
    case 'coupon_apply': return `${m.code ?? ''} · ${m.success ? 'geçerli' : `geçersiz${m.message ? `: ${m.message}` : ''}`}`;
    case 'add_to_cart': return m.price != null ? `${fmtMoney(Number(m.price))}` : '';
    case 'order_submit': return [m.paymentMethod, m.coupon ? `kupon ${m.coupon}` : null, m.items ? `${m.items} ürün` : null].filter(Boolean).join(' · ');
    case 'login': case 'signup': return String(m.method ?? '');
    case 'page_view': return e.path ?? '';
    default:
      if (ERROR_TYPES.has(e.eventType)) return [m.message, m.endpoint, m.status && m.status !== 0 ? `HTTP ${m.status}` : null, m.step].filter(Boolean).join(' · ');
      return '';
  }
}

function EventsTab({ days, refreshKey, user, onClearUser, onUser, fixedGroup }: {
  days: number; refreshKey: number; user: { id: string; label: string } | null; onClearUser: () => void;
  onUser: (id: string, label: string) => void; fixedGroup?: EventGroup;
}) {
  const [group, setGroup] = useState<EventGroup>(fixedGroup ?? 'all');
  const [platform, setPlatform] = useState<Platform>('all');
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  useEffect(() => { const t = window.setTimeout(() => { setQuery(q); setPage(0); }, 350); return () => window.clearTimeout(t); }, [q]);
  useEffect(() => { setPage(0); }, [group, platform, user?.id, days]);
  const { data, loading, error } = useLoad(
    () => storeActivityService.events({ group: fixedGroup ?? group, platform, userId: user?.id, q: query || undefined, days, page, size: 50 }),
    [fixedGroup, group, platform, user?.id, query, days, page, refreshKey],
  );
  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }}>
        <TextField size="small" fullWidth placeholder="Kişi (ad, e-posta), ürün, arama ya da hata metni" value={q} onChange={(e) => setQ(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
        {!fixedGroup && (
          <TextField size="small" select label="Tür" value={group} onChange={(e) => setGroup(e.target.value as EventGroup)} sx={{ minWidth: 240 }}>
            {GROUPS.map((g) => <MenuItem key={g.v} value={g.v}>{g.label}</MenuItem>)}
          </TextField>
        )}
        <TextField size="small" select label="Nereden" value={platform} onChange={(e) => setPlatform(e.target.value as Platform)} sx={{ minWidth: 160 }}>
          <MenuItem value="all">Uygulama ve web</MenuItem>
          <MenuItem value="app">Yalnız uygulama</MenuItem>
          <MenuItem value="web">Yalnız web</MenuItem>
        </TextField>
        {user && <Chip label={`Kişi: ${user.label}`} onDelete={onClearUser} color="primary" />}
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'auto' }}>
        <Table size="small">
          <TableHead><TableRow><TableCell>Zaman</TableCell><TableCell>Kim</TableCell><TableCell>Ne yaptı</TableCell><TableCell>Ürün</TableCell><TableCell>Ayrıntı</TableCell><TableCell>Nereden</TableCell></TableRow></TableHead>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}><CircularProgress size={24} /></TableCell></TableRow>}
            {!loading && data?.items.length === 0 && <TableRow><TableCell colSpan={6} sx={{ py: 4, color: 'text.secondary' }}>Bu süzgeçte kayıt yok. Yeni olaylar mağaza sitesi güncellendikten sonra birikmeye başlar.</TableCell></TableRow>}
            {!loading && data?.items.map((e) => (
              <TableRow key={e.id} hover>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtTime(e.createdAt)}</TableCell>
                <TableCell>
                  {e.userId ? (
                    <Tooltip title="Bu kişinin tüm hareketleri">
                      <Box sx={{ cursor: 'pointer' }} onClick={() => onUser(e.userId!, e.userName || e.userEmail || 'Kullanıcı')}>
                        <Typography variant="body2" fontWeight={600}>{e.userName || '—'}</Typography>
                        <Typography variant="caption" color="text.secondary">{e.userEmail}</Typography>
                      </Box>
                    </Tooltip>
                  ) : <Typography variant="body2" color="text.secondary">Misafir <Typography component="span" variant="caption" sx={{ fontFamily: 'monospace' }}>{e.visitorId?.slice(-6)}</Typography></Typography>}
                </TableCell>
                <TableCell><Chip size="small" label={EVENT_LABEL[e.eventType] ?? e.eventType} color={ERROR_TYPES.has(e.eventType) ? 'error' : e.eventType === 'order_submit' ? 'success' : 'default'} variant={ERROR_TYPES.has(e.eventType) ? 'outlined' : 'filled'} /></TableCell>
                <TableCell><Typography variant="body2">{e.productTitle ?? '—'}</Typography>{e.storeName && <Typography variant="caption" color="text.secondary">{e.storeName}</Typography>}</TableCell>
                <TableCell sx={{ maxWidth: 380 }}><Typography variant="body2" sx={{ wordBreak: 'break-word' }}>{detailOf(e) || '—'}</Typography></TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{deviceLabel(e.deviceType, e.source)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {data && <TablePagination component="div" count={data.total} page={page} onPageChange={(_, p) => setPage(p)} rowsPerPage={50} rowsPerPageOptions={[50]} labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`} />}
      </Paper>
    </Stack>
  );
}

function UsersTab({ days, refreshKey, onUser }: { days: number; refreshKey: number; onUser: (id: string, label: string) => void }) {
  const { data, loading, error } = useLoad<StoreUserActivity[]>(() => storeActivityService.users(days), [days, refreshKey]);
  const [onlyCart, setOnlyCart] = useState(false);
  const rows = useMemo(() => (data ?? []).filter((u) => !onlyCart || (u.addToCart > 0 && u.paidOrders === 0)), [data, onlyCart]);
  if (error) return <Alert severity="error">{error}</Alert>;
  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Chip label="Sepete ekleyip ödemeyenler" color={onlyCart ? 'warning' : 'default'} variant={onlyCart ? 'filled' : 'outlined'} onClick={() => setOnlyCart((v) => !v)} />
        <Typography variant="caption" color="text.secondary">Yalnız giriş yapmış kişiler. Satıra tıklayınca o kişinin olay akışı açılır.</Typography>
      </Stack>
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'auto' }}>
        <Table size="small">
          <TableHead><TableRow><TableCell>Kişi</TableCell><TableCell align="right">Sayfa</TableCell><TableCell align="right">Ürün</TableCell><TableCell align="right">Sepete</TableCell><TableCell align="right">Çıkardı</TableCell><TableCell align="right">Arama</TableCell><TableCell align="right">Ödeme sayfası</TableCell><TableCell align="right">Sipariş / ödenen</TableCell><TableCell align="right">Hata</TableCell><TableCell>Son görülme</TableCell></TableRow></TableHead>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={10} align="center" sx={{ py: 4 }}><CircularProgress size={24} /></TableCell></TableRow>}
            {!loading && rows.length === 0 && <TableRow><TableCell colSpan={10} sx={{ py: 4, color: 'text.secondary' }}>Bu dönemde giriş yapmış kullanıcı hareketi yok.</TableCell></TableRow>}
            {!loading && rows.map((u) => (
              <TableRow key={u.id} hover sx={{ cursor: 'pointer' }} onClick={() => onUser(u.id, u.name || u.email)}>
                <TableCell><Typography variant="body2" fontWeight={600}>{u.name || '—'}</Typography><Typography variant="caption" color="text.secondary">{u.email}</Typography></TableCell>
                <TableCell align="right">{u.pageViews}</TableCell><TableCell align="right">{u.productViews}</TableCell>
                <TableCell align="right">{u.addToCart}</TableCell><TableCell align="right">{u.removeFromCart}</TableCell>
                <TableCell align="right">{u.searches}</TableCell><TableCell align="right">{u.checkouts}</TableCell>
                <TableCell align="right">{u.orders} / {u.paidOrders}</TableCell>
                <TableCell align="right" sx={{ color: u.errors ? 'error.main' : undefined, fontWeight: u.errors ? 700 : undefined }}>{u.errors}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtTime(u.lastSeen)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Stack>
  );
}

function OrdersTab({ days, refreshKey, onUser }: { days: number; refreshKey: number; onUser: (id: string, label: string) => void }) {
  const { data, loading, error } = useLoad<StoreOrder[]>(() => storeActivityService.orders(days), [days, refreshKey]);
  const [status, setStatus] = useState('all');
  const rows = useMemo(() => (data ?? []).filter((o) => status === 'all' || o.paymentStatus === status), [data, status]);
  if (error) return <Alert severity="error">{error}</Alert>;
  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1}>
        {['all', 'FAILED', 'PENDING', 'PAID'].map((s) => (
          <Chip key={s} label={s === 'all' ? 'Hepsi' : PAYMENT_LABEL[s]} color={status === s ? (s === 'FAILED' ? 'error' : 'primary') : 'default'} variant={status === s ? 'filled' : 'outlined'} onClick={() => setStatus(s)} />
        ))}
      </Stack>
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'auto' }}>
        <Table size="small">
          <TableHead><TableRow><TableCell>Zaman</TableCell><TableCell>Kişi</TableCell><TableCell align="right">Tutar</TableCell><TableCell>Ödeme</TableCell><TableCell>Yöntem</TableCell><TableCell>Sipariş durumu</TableCell><TableCell>Son not</TableCell></TableRow></TableHead>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4 }}><CircularProgress size={24} /></TableCell></TableRow>}
            {!loading && rows.length === 0 && <TableRow><TableCell colSpan={7} sx={{ py: 4, color: 'text.secondary' }}>Bu süzgeçte sipariş yok.</TableCell></TableRow>}
            {!loading && rows.map((o) => (
              <TableRow key={o.id} hover>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtTime(o.createdAt)}</TableCell>
                <TableCell sx={{ cursor: 'pointer' }} onClick={() => onUser(o.userId, o.userName || o.userEmail || 'Kullanıcı')}>
                  <Typography variant="body2" fontWeight={600}>{o.userName || '—'}</Typography><Typography variant="caption" color="text.secondary">{o.userEmail}</Typography>
                </TableCell>
                <TableCell align="right">{fmtMoney(o.total)}<Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{o.itemCount} ürün{o.couponCode ? ` · ${o.couponCode}` : ''}</Typography></TableCell>
                <TableCell><Chip size="small" label={PAYMENT_LABEL[o.paymentStatus] ?? o.paymentStatus} color={o.paymentStatus === 'PAID' ? 'success' : o.paymentStatus === 'FAILED' ? 'error' : 'warning'} variant="outlined" /></TableCell>
                <TableCell>{o.paymentMethod === 'CREDIT_CARD' ? 'Kart' : o.paymentMethod === 'BANK_TRANSFER' ? 'Havale' : o.paymentMethod}{o.paymentProvider ? ` · ${o.paymentProvider}` : ''}</TableCell>
                <TableCell>{o.status}</TableCell>
                <TableCell sx={{ maxWidth: 320 }}><Typography variant="caption">{o.lastHistory?.note || o.lastHistory?.reason || o.lastHistory?.status || '—'}</Typography></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Stack>
  );
}
