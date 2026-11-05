/**
 * Editör Masası › Performans: @nartgo gönderilerinin sayıları, Editor's Desk gönderisiyle eşleşmesi,
 * format ve konu karşılaştırması. Veri gece kaydından gelir (content-service, docs/plan/nartgo-editor-masasi.md).
 * "İlk gün" / "7. gün": paylaşımdan en az 24 saat / 7 gün sonra alınan ilk günlük ölçüm.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Autocomplete, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid, Link, MenuItem, Paper,
  Select, Skeleton, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material';
import { darkAdmin } from '../../theme/darkAdmin';
import {
  instagramInsightsService, type DeskPostRef, type PerfGroup, type PerfPost,
} from '../../services/events/instagramInsightsService';

const n = (v?: number | null) => (v == null ? '—' : v.toLocaleString('tr-TR'));
const day = (iso: string) => new Date(iso).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' });
const errText = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { message?: string } } } | null)?.response?.data?.message || fallback;

function Groups({ title, rows, median }: { title: string; rows: PerfGroup[]; median: number }) {
  const max = Math.max(1, ...rows.map(r => r.medianReach));
  return (
    <Paper variant="outlined" sx={{ p: 2.5, ...darkAdmin.sx.card, height: '100%' }}>
      <Typography sx={{ ...darkAdmin.sx.sectionLabel, mb: 1.5 }}>{title}</Typography>
      {!rows.length && <Typography sx={{ fontSize: 13, color: darkAdmin.text.secondary }}>Henüz ölçüm yok.</Typography>}
      <Stack spacing={1.25}>
        {rows.map(r => (
          <Box key={r.key}>
            <Stack direction="row" sx={{ fontSize: 13, mb: 0.5 }}>
              <Box sx={{ flex: 1 }}>{r.key} <Box component="span" sx={{ color: darkAdmin.text.secondary }}>· {r.count} gönderi</Box></Box>
              <Tooltip title={`Ortanca kaydetme ${n(r.medianSaves)} · paylaşım ${n(r.medianShares)}`}><b>{n(r.medianReach)}</b></Tooltip>
            </Stack>
            <Box sx={{ height: 6, borderRadius: 3, bgcolor: darkAdmin.border.subtle, overflow: 'hidden' }}>
              <Box sx={{ height: '100%', width: `${(r.medianReach / max) * 100}%`, bgcolor: r.medianReach >= median ? '#0d6b3f' : '#9bb8a6' }} />
            </Box>
          </Box>
        ))}
      </Stack>
    </Paper>
  );
}

function MatchDialog({ post, onClose }: { post: PerfPost; onClose: () => void }) {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [pick, setPick] = useState<DeskPostRef | null>(null);
  const options = useQuery({ queryKey: ['desk-posts', q], queryFn: () => instagramInsightsService.deskPosts(q) });
  const save = useMutation({
    mutationFn: () => instagramInsightsService.match(post.mediaId, pick!.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ig-performance'] }); onClose(); },
  });
  return (
    <Dialog open onClose={() => !save.isPending && onClose()} maxWidth="sm" fullWidth>
      <DialogTitle>Desk gönderisiyle eşleştir</DialogTitle>
      <DialogContent>
        <Typography sx={{ fontSize: 14, mb: 2 }}>
          Instagram: “{post.title}” · {day(post.postedAt)}
        </Typography>
        <Autocomplete
          options={options.data ?? []}
          loading={options.isFetching}
          value={pick}
          onChange={(_, v) => setPick(v)}
          onInputChange={(_, v) => setQ(v)}
          filterOptions={x => x}
          getOptionLabel={o => `${o.title ?? o.id}${o.date ? ` · ${o.date}` : ''}${o.format ? ` · ${o.format}` : ''}`}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          renderInput={params => <TextField {...params} label="Desk gönderisi (başlıkta ara)" />}
        />
        {save.error && <Alert severity="error" sx={{ mt: 2 }}>{errText(save.error, 'Eşleştirilemedi.')}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={save.isPending}>Vazgeç</Button>
        <Button variant="contained" disabled={!pick || save.isPending} onClick={() => save.mutate()}>Eşleştir</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function PerformanceTab() {
  const qc = useQueryClient();
  const [days, setDays] = useState(90);
  const [filter, setFilter] = useState<'all' | 'desk' | 'unmatched'>('all');
  const [matching, setMatching] = useState<PerfPost | null>(null);
  const perf = useQuery({ queryKey: ['ig-performance', days], queryFn: () => instagramInsightsService.performance(days) });
  const unmatch = useMutation({
    mutationFn: (p: PerfPost) => instagramInsightsService.unmatch(p.mediaId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ig-performance'] }),
  });

  const data = perf.data;
  const rows = (data?.posts ?? []).filter(p => filter === 'all' || (filter === 'desk' ? !!p.deskPostId : !p.deskPostId));

  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 1 }}>
        <Select size="small" value={days} onChange={e => setDays(Number(e.target.value))}>
          {[30, 90, 180, 365].map(d => <MenuItem key={d} value={d}>Son {d} gün</MenuItem>)}
        </Select>
        <ToggleButtonGroup size="small" exclusive value={filter} onChange={(_, v) => v && setFilter(v)}>
          <ToggleButton value="all">Tümü</ToggleButton>
          <ToggleButton value="desk">Desk'ten</ToggleButton>
          <ToggleButton value="unmatched">Eşleşmeyen{data ? ` (${data.unmatched})` : ''}</ToggleButton>
        </ToggleButtonGroup>
        <Box sx={{ flex: 1 }} />
        {data?.lastSnapshot && (
          <Typography sx={{ fontSize: 12, color: darkAdmin.text.secondary }}>Son ölçüm: {day(data.lastSnapshot)}</Typography>
        )}
      </Stack>

      {perf.error && <Alert severity="error">{errText(perf.error, 'Performans yüklenemedi.')}</Alert>}
      {perf.isLoading && <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />}
      {data && !data.posts.length && (
        <Alert severity="info">
          Henüz ölçüm yok. Sunucu her gece 03:00'ten sonra gönderileri ölçer; ilk kayıttan sonra burada görünür.
        </Alert>
      )}

      {data && data.posts.length > 0 && (
        <>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}><Groups title="Formata göre ortanca erişim" rows={data.byFormat} median={data.medianReach} /></Grid>
            <Grid item xs={12} md={6}><Groups title="Konuya göre ortanca erişim" rows={data.byTopic} median={data.medianReach} /></Grid>
          </Grid>

          <Paper variant="outlined" sx={{ ...darkAdmin.sx.card, overflowX: 'auto' }}>
            <Typography sx={{ ...darkAdmin.sx.sectionLabel, p: 2, pb: 0 }}>
              Gönderiler · hesabın ortanca erişimi {n(data.medianReach)}
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Gönderi</TableCell>
                  <TableCell align="right">Erişim</TableCell>
                  <TableCell align="right">İlk gün erişim</TableCell>
                  <TableCell align="right">7. gün erişim</TableCell>
                  <TableCell align="right">Beğeni</TableCell>
                  <TableCell align="right">Kaydetme</TableCell>
                  <TableCell align="right">Paylaşım</TableCell>
                  <TableCell>Desk</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map(p => (
                  <TableRow key={p.mediaId} hover>
                    <TableCell sx={{ minWidth: 260 }}>
                      <Box sx={{ fontWeight: 600, fontSize: 13.5 }}>
                        {p.permalink ? <Link href={p.permalink} target="_blank" rel="noopener" underline="hover">{p.title || '(açıklamasız)'}</Link> : p.title}
                      </Box>
                      <Box sx={{ fontSize: 12, color: darkAdmin.text.secondary }}>
                        {day(p.postedAt)} · {p.format}{p.topic ? ` · ${p.topic}` : ''}
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.75} justifyContent="flex-end" alignItems="center">
                        {p.aboveMedian != null && (
                          <Tooltip title={p.aboveMedian ? 'Hesabın ortancasının üstünde' : 'Hesabın ortancasının altında'}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: p.aboveMedian ? '#0d6b3f' : '#c8a96a' }} />
                          </Tooltip>
                        )}
                        <b>{n(p.reach)}</b>
                      </Stack>
                    </TableCell>
                    <TableCell align="right">{n(p.firstDay.reach)}</TableCell>
                    <TableCell align="right">{n(p.week.reach)}</TableCell>
                    <TableCell align="right">{n(p.likes)}</TableCell>
                    <TableCell align="right">{n(p.saves)}</TableCell>
                    <TableCell align="right">{n(p.shares)}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {p.deskPostId ? (
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <Chip size="small" label={p.matchSource === 'manual' ? 'Elle eşleşti' : 'Kuyruktan'} />
                          <Button size="small" disabled={unmatch.isPending} onClick={() => unmatch.mutate(p)}>Kaldır</Button>
                        </Stack>
                      ) : (
                        <Button size="small" onClick={() => setMatching(p)}>Eşleştir</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
          <Typography sx={{ fontSize: 12, color: darkAdmin.text.secondary }}>
            “İlk gün” ve “7. gün”: paylaşımdan en az 24 saat ve 7 gün sonra alınan ilk gece ölçümü. Kuyruktan paylaşılan gönderiler
            Desk'le kendiliğinden eşleşir; elle paylaşılanları “Eşleştir” ile bağlayabilirsiniz.
          </Typography>
        </>
      )}
      {unmatch.error && <Alert severity="error">{errText(unmatch.error, 'Eşleşme kaldırılamadı.')}</Alert>}
      {matching && <MatchDialog post={matching} onClose={() => setMatching(null)} />}
    </Stack>
  );
}
