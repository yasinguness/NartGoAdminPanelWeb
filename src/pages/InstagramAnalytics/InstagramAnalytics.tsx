/**
 * Instagram Analizi — @nartgo hesabının paylaşım performansı, en iyi paylaşım
 * saatleri ve takipçi kitlesi.
 *
 * Endpoint: GET /events/admin/instagram/insights?refresh=
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Stack, Paper, Grid, Typography, Table, TableHead, TableBody, TableRow, TableCell,
  Skeleton, Alert, MenuItem, Select, FormControl, InputLabel, Chip, Tooltip, Link,
} from '@mui/material';
import { CameraAlt as InstagramIcon } from '@mui/icons-material';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip,
} from 'recharts';
import AdminShell from '../../components/AdminShell';
import { darkAdmin } from '../../theme/darkAdmin';
import { instagramInsightsService, type IgInsights, type IgPost } from '../../services/events/instagramInsightsService';

const DAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const DAYS_LONG = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
const GREEN = '#0d6b3f';
const HEAT = ['#e6f1ea', '#b5d8c2', '#76b693', '#33885d', '#0b5631'];
const GENDER: Record<string, string> = { F: 'Kadın', M: 'Erkek', U: 'Belirtilmemiş' };

const full = (n?: number | null) => (n == null ? '—' : n.toLocaleString('tr-TR'));
const short = (n?: number | null) => {
  if (n == null) return '—';
  if (n >= 100_000) return `${Math.round(n / 1000)}B`;
  if (n >= 10_000) return `${(n / 1000).toFixed(1).replace('.', ',')}B`;
  return n.toLocaleString('tr-TR');
};
const pct = (x: number) => `%${(x * 100).toFixed(1).replace('.', ',')}`;
const hh = (h: number) => `${String(h).padStart(2, '0')}:00`;
const median = (a: number[]) => {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
/** Paylaşımın İstanbul saati ve haftanın günü — zaman zaten +03:00 ile geliyor, tarayıcı saat dilimine çevirmiyoruz. */
const postHour = (p: IgPost) => Number(p.timestamp.slice(11, 13));
const postDay = (p: IgPost) => (new Date(`${p.timestamp.slice(0, 10)}T12:00:00Z`).getUTCDay() + 6) % 7;

/** Paylaşımdan sonraki 3 saatte çevrimiçi olacak ortalama takipçi: gönderi zirveye kadar etkileşim toplar. */
function slotScore(heat: IgInsights['heat'], d: number, h: number) {
  let s = 0;
  for (let k = 1; k <= 3; k++) { const x = h + k; s += heat[(d + (x > 23 ? 1 : 0)) % 7]?.[x % 24] ?? 0; }
  return s / 3;
}
function bestSlots(heat: IgInsights['heat'], d: number, n = 2) {
  const c: [number, number][] = [];
  for (let h = 8; h <= 22; h++) c.push([h, slotScore(heat, d, h)]);
  c.sort((a, b) => b[1] - a[1]);
  const out: [number, number][] = [];
  for (const s of c) { if (out.every(o => Math.abs(o[0] - s[0]) >= 3)) out.push(s); if (out.length === n) break; }
  return out;
}

function Section({ title, children, sx }: { title: string; children: React.ReactNode; sx?: object }) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, ...darkAdmin.sx.card, height: '100%', ...sx }}>
      <Typography sx={{ ...darkAdmin.sx.sectionLabel, mb: 1.5 }}>{title}</Typography>
      {children}
    </Paper>
  );
}

/** Yatay çubuk listesi; `n` verilirse sağda kaç paylaşıma dayandığı gösterilir. */
function Bars({ rows, dim }: { rows: { label: string; value: number; n?: number; tip?: string }[]; dim?: (r: { n?: number; label: string }) => boolean }) {
  const max = Math.max(1, ...rows.map(r => r.value));
  return (
    <Stack spacing={1}>
      {rows.map(r => (
        <Tooltip key={r.label} title={r.tip ?? `${r.label}: ${full(r.value)}`} placement="top-start">
          <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(90px,150px) 1fr 76px', gap: 1.25, alignItems: 'center' }}>
            <Typography noWrap sx={{ fontSize: 13 }}>{r.label}</Typography>
            <Box sx={{ height: 12 }}>
              <Box sx={{ height: '100%', width: `${(r.value / max) * 100}%`, minWidth: 2, bgcolor: dim?.(r) ? '#76b693' : GREEN, borderRadius: '0 4px 4px 0' }} />
            </Box>
            <Typography sx={{ fontSize: 12, fontFamily: darkAdmin.font.monoFamily, textAlign: 'right' }}>
              {short(r.value)}{r.n != null && <span style={{ color: darkAdmin.text.muted }}> ·{r.n}</span>}
            </Typography>
          </Box>
        </Tooltip>
      ))}
    </Stack>
  );
}

function Heatmap({ heat }: { heat: IgInsights['heat'] }) {
  const flat = heat.flat().filter((v): v is number => v != null);
  const lo = Math.min(...flat), hi = Math.max(...flat);
  const color = (v: number | null) => (v == null ? darkAdmin.border.default : HEAT[Math.min(4, Math.floor(((v - lo) / (hi - lo || 1)) * 5))]);
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: '40px repeat(24, minmax(20px, 1fr))', gap: '2px', minWidth: 600, fontSize: 10, color: darkAdmin.text.muted, fontFamily: darkAdmin.font.monoFamily }}>
        <span />
        {Array.from({ length: 24 }, (_, h) => <Box key={h} sx={{ textAlign: 'center' }}>{h % 3 === 0 ? String(h).padStart(2, '0') : ''}</Box>)}
        {heat.map((row, d) => {
          const best = bestSlots(heat, d).map(s => s[0]);
          return [
            <Box key={`l${d}`} sx={{ alignSelf: 'center' }}>{DAYS[d]}</Box>,
            ...row.map((v, h) => (
              <Tooltip key={`${d}-${h}`} title={`${DAYS_LONG[d]} ${hh(h)} · ~${full(v)} takipçi çevrimiçi${best.includes(h) ? ' · önerilen paylaşım saati' : ''}`}>
                <Box sx={{ aspectRatio: '1 / 1', borderRadius: '3px', bgcolor: color(v), position: 'relative',
                  ...(best.includes(h) && { '&::after': { content: '""', position: 'absolute', inset: '30%', borderRadius: '50%', bgcolor: darkAdmin.status.primary } }) }} />
              </Tooltip>
            )),
          ];
        })}
      </Box>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 1.5, fontSize: 11, color: darkAdmin.text.muted, flexWrap: 'wrap' }}>
        <span>Az</span>
        <Stack direction="row" spacing={0.25}>{HEAT.map(c => <Box key={c} sx={{ width: 14, height: 14, borderRadius: '3px', bgcolor: c }} />)}</Stack>
        <span>Çok çevrimiçi</span>
        <Stack direction="row" spacing={0.5} alignItems="center"><Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: darkAdmin.status.primary }} /><span>Önerilen paylaşım saati</span></Stack>
      </Stack>
    </Box>
  );
}

type SortKey = 'reach' | 'er' | 'shares' | 'timestamp';

export default function InstagramAnalytics() {
  const [refresh, setRefresh] = useState(0);
  const [sort, setSort] = useState<SortKey>('reach');
  const { data, isLoading, isFetching, error, dataUpdatedAt, refetch } = useQuery({
    queryKey: ['instagram-insights', refresh],
    queryFn: () => instagramInsightsService.insights(refresh > 0),
    staleTime: 10 * 60_000,
    // Önbellek boşken çekim uzun sürüyor. Varsayılan 3 denemeyle her hata
    // üç kez tekrarlanıyor ve sayfa dakikalarca "yükleniyor"da kalıyordu;
    // tek deneme yeterli, kullanıcı yenile tuşuyla tekrar isteyebilir.
    retry: false,
  });

  const a = useMemo(() => {
    if (!data) return null;
    const P = data.posts.map(p => ({ ...p, er: p.reach ? p.interactions / p.reach : 0 }));
    const group = <K extends string | number>(key: (p: typeof P[number]) => K) => {
      const g = new Map<K, typeof P>();
      P.forEach(p => g.set(key(p), [...(g.get(key(p)) ?? []), p]));
      return g;
    };
    const topics = [...group(p => p.topic)].map(([k, v]) => ({
      label: k, value: median(v.map(p => p.reach)), n: v.length,
      tip: `${k} · ${v.length} paylaşım · ortanca ${full(median(v.map(p => p.reach)))} erişim · etkileşim ${pct(v.reduce((s, p) => s + p.interactions, 0) / Math.max(1, v.reduce((s, p) => s + p.reach, 0)))}`,
    })).sort((x, y) => y.value - x.value);
    const formats = [...group(p => p.type)].map(([k, v]) => ({
      type: k, n: v.length, reach: median(v.map(p => p.reach)),
      er: v.reduce((s, p) => s + p.interactions, 0) / Math.max(1, v.reduce((s, p) => s + p.reach, 0)),
      shares: median(v.map(p => p.shares)), saves: median(v.map(p => p.saves)),
    })).sort((x, y) => y.reach - x.reach);
    const hours = [...group(postHour)].filter(([, v]) => v.length >= 2).sort((x, y) => x[0] - y[0])
      .map(([h, v]) => ({ label: hh(h), value: median(v.map(p => p.reach)), n: v.length, tip: `${hh(h)} · ${v.length} paylaşım · ortanca ${full(median(v.map(p => p.reach)))} erişim` }));
    const days = [...group(postDay)].sort((x, y) => x[0] - y[0])
      .map(([d, v]) => ({ label: DAYS_LONG[d], value: median(v.map(p => p.reach)), n: v.length }));
    const slots = DAYS.map((_, d) => [d, ...bestSlots(data.heat, d, 1)[0]] as [number, number, number]).sort((x, y) => y[2] - x[2]);
    let peak: [number, number, number] = [0, 0, -1];
    data.heat.forEach((row, d) => row.forEach((v, h) => { if (v != null && v > peak[2]) peak = [d, h, v]; }));
    const byReach = [...P].sort((x, y) => y.reach - x.reach);
    const promo = topics.find(t => t.label === 'NartGo tanıtım');
    return { P, topics, formats, hours, days, slots, peak, byReach, promo };
  }, [data]);

  const posts = useMemo(() => {
    if (!a) return [];
    return [...a.P].sort((x, y) => (sort === 'timestamp' ? y.timestamp.localeCompare(x.timestamp) : y[sort] - x[sort]));
  }, [a, sort]);

  // 504'te sunucudan gövde gelmiyor; genel "alınamadı" yerine ne olduğunu yaz.
  const errStatus = (error as any)?.response?.status as number | undefined;
  const errMsg = ((error as any)?.response?.data?.message as string | undefined)
    ?? (errStatus === 504 || (error as any)?.code === 'ECONNABORTED'
      ? "Instagram'dan çekme süresi aşıldı. Veri önbellekte yokken bu çağrı uzun sürebiliyor; yenile tuşuyla tekrar dene."
      : undefined);
  const gained = (data?.dailyFollows ?? []).reduce((s, p) => s + p.value, 0);

  return (
    <AdminShell
      title="Instagram Hesap Analizi"
      subtitle={data ? `@${data.account.username} · ${full(data.account.followers)} takipçi · ${data.posts.length} paylaşım` : 'Paylaşım performansı, en iyi saatler ve kitle'}
      icon={<InstagramIcon sx={{ fontSize: 26 }} />}
      label="İçerik • Yalnızca Admin"
      isFetching={isFetching}
      lastUpdatedAt={dataUpdatedAt}
      onRefresh={() => (refresh === 0 ? setRefresh(1) : refetch())}
      footerText={data ? `Instagram'dan çekilme: ${new Date(data.fetchedAt).toLocaleString('tr-TR')} · sunucu 3 saat önbellekler, yenile tuşu yeniden çeker.` : undefined}
    >
      {error && <Alert severity="error" sx={{ mb: 3 }}>{errMsg || 'Instagram verisi alınamadı.'}</Alert>}
      {isLoading && (
        <Stack spacing={2}>
          <Typography sx={{ fontSize: 13, color: darkAdmin.text.secondary }}>Instagram'dan çekiliyor; ilk yükleme 20–40 saniye sürebilir.</Typography>
          {[1, 2, 3].map(i => <Skeleton key={i} variant="rectangular" height={160} sx={{ borderRadius: 2 }} />)}
        </Stack>
      )}

      {data && a && (
        <Stack spacing={3}>
          <Grid container spacing={2}>
            {[
              ['Takipçi', full(data.account.followers)],
              ['Erişim · 28 gün', short(data.totals28.reach)],
              ['Görüntülenme · 28 gün', short(data.totals28.views)],
              ['Etkileşim · 28 gün', short(data.totals28.total_interactions)],
              ['Profil ziyareti · 28 gün', short(data.totals28.profile_views)],
              ['Yeni takipçi · 28 gün', `+${full(gained)}`],
            ].map(([label, value]) => (
              <Grid item xs={6} md={2} key={label}>
                <Paper variant="outlined" sx={{ p: 2, ...darkAdmin.sx.statTile, height: '100%' }}>
                  <Typography sx={{ ...darkAdmin.sx.sectionLabel }}>{label}</Typography>
                  <Typography sx={{ ...darkAdmin.sx.kpiValue, mt: 0.5 }}>{value}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Section title="Öne çıkanlar">
                <Stack component="ol" spacing={1.25} sx={{ m: 0, pl: 2.5, fontSize: 14, lineHeight: 1.55 }}>
                  {a.topics[0] && (
                    <li><b>{a.topics[0].label}</b> paylaşımları ortanca <b>{short(a.topics[0].value)}</b> erişim alıyor
                      {a.promo && a.promo !== a.topics[0] && <>; uygulama tanıtımları <b>{short(a.promo.value)}</b>. Tanıtımı ayrı gönderi yapmak yerine kültür içeriğinin son sayfasına koymak daha verimli</>}.</li>
                  )}
                  <li>Biçimlerde ortanca erişim: {a.formats.map((f, i) => <span key={f.type}>{i > 0 && ', '}{f.type} <b>{short(f.reach)}</b></span>)}. En çok erişen 10 paylaşımın {a.byReach.slice(0, 10).filter(p => p.type === a.formats[0]?.type).length}'u {a.formats[0]?.type.toLowerCase()}.</li>
                  <li>Takipçiler en kalabalık <b>{DAYS_LONG[a.peak[0]]} {hh(a.peak[1])}</b> civarı çevrimiçi. Haftanın en iyi paylaşım saati <b>{DAYS_LONG[a.slots[0][0]]} {hh(a.slots[0][1])}</b>.</li>
                  {a.byReach[0] && <li>En çok erişen: “{a.byReach[0].title.slice(0, 70)}” (<b>{short(a.byReach[0].reach)}</b> erişim, {full(a.byReach[0].shares)} paylaşılma).</li>}
                </Stack>
              </Section>
            </Grid>
            <Grid item xs={12} md={6}>
              <Section title="Günlük erişim · son 28 gün">
                <ResponsiveContainer width="100%" height={150}>
                  <AreaChart data={data.dailyReach.slice(-28)} margin={{ top: 5, right: 8, left: -8, bottom: 0 }}>
                    <CartesianGrid stroke={darkAdmin.border.subtle} vertical={false} />
                    <XAxis dataKey="date" tickFormatter={(d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}`} tick={{ fontSize: 10 }} minTickGap={24} />
                    <YAxis tickFormatter={short} tick={{ fontSize: 10 }} width={48} />
                    <ChartTooltip formatter={(v: number) => [full(v), 'Erişim']} labelFormatter={(d: string) => d.split('-').reverse().join('.')} />
                    <Area type="monotone" dataKey="value" stroke={GREEN} strokeWidth={2} fill={GREEN} fillOpacity={0.12} />
                  </AreaChart>
                </ResponsiveContainer>
                <Typography sx={{ ...darkAdmin.sx.sectionLabel, mt: 2, mb: 1 }}>Günlük yeni takipçi</Typography>
                <ResponsiveContainer width="100%" height={110}>
                  <BarChart data={data.dailyFollows.filter(p => p.value > 0).slice(-28)} margin={{ top: 5, right: 8, left: -8, bottom: 0 }}>
                    <CartesianGrid stroke={darkAdmin.border.subtle} vertical={false} />
                    <XAxis dataKey="date" tickFormatter={(d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}`} tick={{ fontSize: 10 }} minTickGap={24} />
                    <YAxis tick={{ fontSize: 10 }} width={48} />
                    <ChartTooltip formatter={(v: number) => [full(v), 'Yeni takipçi']} labelFormatter={(d: string) => d.split('-').reverse().join('.')} />
                    <Bar dataKey="value" fill={GREEN} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Section>
            </Grid>
          </Grid>

          <Section title="Takipçiler ne zaman çevrimiçi? · son 4 hafta, İstanbul saati">
            <Typography sx={{ fontSize: 13, color: darkAdmin.text.secondary, mb: 2, maxWidth: 760 }}>
              Altın noktalar her gün için önerilen paylaşım saatleri: çevrimiçi yoğunluğun zirvesinden 1–3 saat önce paylaşılan gönderi, zirveye kadar etkileşim toplayıp keşfete itilir.
            </Typography>
            {data.heat.flat().some(v => v != null) ? <Heatmap heat={data.heat} /> : <Alert severity="info">Instagram çevrimiçi takipçi verisini henüz vermedi.</Alert>}
          </Section>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Section title="Haftanın en iyi saatleri">
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 1 }}>
                  {a.slots.map(([d, h, s]) => (
                    <Box key={d} sx={{ border: `1px solid ${darkAdmin.border.default}`, borderRadius: 1.5, p: 1.25 }}>
                      <Typography sx={{ fontSize: 12, color: darkAdmin.text.secondary }}>{DAYS_LONG[d]}</Typography>
                      <Typography sx={{ fontSize: 20, fontWeight: 700 }}>{hh(h)}</Typography>
                      <Typography sx={{ fontSize: 11, color: darkAdmin.text.muted }}>sonraki 3 saatte ~{short(Math.round(s))} kişi</Typography>
                    </Box>
                  ))}
                </Box>
              </Section>
            </Grid>
            <Grid item xs={12} md={6}>
              <Section title="Geçmiş paylaşımlar · paylaşım saatine göre ortanca erişim">
                <Bars rows={a.hours} dim={r => (r.n ?? 0) < 4} />
                <Typography sx={{ fontSize: 11, color: darkAdmin.text.muted, mt: 1.5 }}>
                  Sağdaki küçük sayı o saatteki paylaşım adedi. Açık renkli çubuklar 4'ten az paylaşıma dayanıyor; temkinli okuyun.
                </Typography>
              </Section>
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Section title="Konuya göre ortanca erişim">
                <Bars rows={a.topics} />
                <Typography sx={{ fontSize: 11, color: darkAdmin.text.muted, mt: 1.5 }}>Konu, açıklamanın ilk satırlarından otomatik tahmin ediliyor.</Typography>
              </Section>
            </Grid>
            <Grid item xs={12} md={6}>
              <Section title="Biçime göre">
                <Box sx={{ overflowX: 'auto' }}>
                  <Table size="small" sx={{ '& .MuiTableCell-root': { borderBottomColor: darkAdmin.border.subtle, fontSize: 13 } }}>
                    <TableHead><TableRow>
                      {['Biçim', 'Adet', 'Ort. erişim', 'Etkileşim', 'Paylaşılma', 'Kaydetme'].map((h, i) => (
                        <TableCell key={h} align={i ? 'right' : 'left'} sx={{ ...darkAdmin.sx.sectionLabel }}>{h}</TableCell>))}
                    </TableRow></TableHead>
                    <TableBody>
                      {a.formats.map(f => (
                        <TableRow key={f.type}>
                          <TableCell>{f.type}</TableCell>
                          <TableCell align="right">{f.n}</TableCell>
                          <TableCell align="right">{short(f.reach)}</TableCell>
                          <TableCell align="right">{pct(f.er)}</TableCell>
                          <TableCell align="right">{short(f.shares)}</TableCell>
                          <TableCell align="right">{short(f.saves)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
                <Typography sx={{ ...darkAdmin.sx.sectionLabel, mt: 2.5, mb: 1.5 }}>Haftanın gününe göre ortanca erişim</Typography>
                <Bars rows={a.days} />
              </Section>
            </Grid>
          </Grid>

          <Section title="Tüm paylaşımlar">
            <FormControl size="small" sx={{ minWidth: 180, mb: 2 }}>
              <InputLabel sx={{ fontSize: 12 }}>Sırala</InputLabel>
              <Select label="Sırala" value={sort} onChange={e => setSort(e.target.value as SortKey)}>
                <MenuItem value="reach">Erişim</MenuItem>
                <MenuItem value="er">Etkileşim oranı</MenuItem>
                <MenuItem value="shares">Paylaşılma</MenuItem>
                <MenuItem value="timestamp">Tarih</MenuItem>
              </Select>
            </FormControl>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ '& .MuiTableCell-root': { borderBottomColor: darkAdmin.border.subtle, fontSize: 13, verticalAlign: 'top' } }}>
                <TableHead><TableRow>
                  {['Tarih', 'Paylaşım', 'Konu', 'Erişim', 'Etkileşim', 'Oran', 'Paylaşılma', 'Kaydetme'].map((h, i) => (
                    <TableCell key={h} align={i > 2 ? 'right' : 'left'} sx={{ ...darkAdmin.sx.sectionLabel, whiteSpace: 'nowrap' }}>{h}</TableCell>))}
                </TableRow></TableHead>
                <TableBody>
                  {posts.map(p => (
                    <TableRow key={p.timestamp + p.permalink} hover>
                      <TableCell sx={{ whiteSpace: 'nowrap', fontFamily: darkAdmin.font.monoFamily, fontSize: '12px !important' }}>
                        {p.timestamp.slice(8, 10)}.{p.timestamp.slice(5, 7)}.{p.timestamp.slice(2, 4)} {p.timestamp.slice(11, 16)}
                        <Box sx={{ color: darkAdmin.text.muted, fontFamily: 'inherit' }}>{DAYS[postDay(p)]} · {p.type}</Box>
                      </TableCell>
                      <TableCell sx={{ minWidth: 240 }}>
                        {p.permalink ? <Link href={p.permalink} target="_blank" rel="noopener" underline="hover" color="inherit">{p.title || '(açıklama yok)'}</Link> : p.title}
                      </TableCell>
                      <TableCell><Chip size="small" label={p.topic} sx={{ fontSize: 11, bgcolor: '#e2efe7' }} /></TableCell>
                      <TableCell align="right">{full(p.reach)}</TableCell>
                      <TableCell align="right">{full(p.interactions)}</TableCell>
                      <TableCell align="right">{pct(p.er)}</TableCell>
                      <TableCell align="right">{full(p.shares)}</TableCell>
                      <TableCell align="right">{full(p.saves)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Section>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Section title="Yaş">
                <Bars rows={data.age} />
                <Typography sx={{ ...darkAdmin.sx.sectionLabel, mt: 2.5, mb: 1.5 }}>Cinsiyet</Typography>
                <Bars rows={data.gender.map(g => ({ ...g, label: GENDER[g.label] ?? g.label }))} dim={r => r.label === 'Belirtilmemiş'} />
              </Section>
            </Grid>
            <Grid item xs={12} md={6}>
              <Section title="Şehir">
                <Bars rows={data.city} />
                <Typography sx={{ ...darkAdmin.sx.sectionLabel, mt: 2.5, mb: 1.5 }}>Ülke</Typography>
                <Bars rows={data.country.map(c => ({ ...c, label: regionName(c.label) }))} />
              </Section>
            </Grid>
          </Grid>
        </Stack>
      )}
    </AdminShell>
  );
}

const regionNames = typeof Intl !== 'undefined' && 'DisplayNames' in Intl ? new Intl.DisplayNames(['tr'], { type: 'region' }) : null;
function regionName(code: string) {
  try { return regionNames?.of(code) ?? code; } catch { return code; }
}
