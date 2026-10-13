import { useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  FormControlLabel,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import CasinoIcon from '@mui/icons-material/Casino';
import DownloadIcon from '@mui/icons-material/Download';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import PublishOutlinedIcon from '@mui/icons-material/PublishOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { FeaturedStoryService } from '../../services/featured/featuredStoryService';

const featuredStoryService = FeaturedStoryService.getInstance();
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import {
  RaffleCampaign,
  RaffleEntry,
  RaffleWinner,
  raffleAdminService,
} from '../../services/raffle/raffleAdminService';
import { durationText, fmtDate, phaseOf } from './raffleForm';

function Block({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Box component="section">
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
        <Typography variant="subtitle1" fontWeight={700}>{title}</Typography>
        {action}
      </Stack>
      {children}
    </Box>
  );
}

/**
 * Çekiliş detayı: sağdan açılan panel. Üstte durum ve sıradaki iş (kura,
 * story), altta hediyeler, kazananlar ve katılımcılar.
 */
export default function RaffleCampaignDetail({
  campaign,
  entries,
  winners,
  loading,
  onClose,
  onEdit,
  onChanged,
  onDeleted,
}: {
  campaign: RaffleCampaign | null;
  entries: RaffleEntry[];
  winners: RaffleWinner[];
  loading: boolean;
  onClose: () => void;
  onEdit: (c: RaffleCampaign) => void;
  onChanged: (id: string) => Promise<void>;
  /** Silindikten sonra: panel kapanır, liste yenilenir. */
  onDeleted: () => Promise<void>;
}) {
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [force, setForce] = useState(false);
  const [drawCount, setDrawCount] = useState(3);
  const [drawing, setDrawing] = useState(false);

  // Yayından kaldır / yayına al / sil
  const [removal, setRemoval] = useState<'unpublish' | 'delete' | null>(null);
  const [storyIds, setStoryIds] = useState<string[] | null>(null);
  const [dropStories, setDropStories] = useState(true);
  const [busy, setBusy] = useState(false);

  const c = campaign;
  const join = c?.entryMode === 'JOIN';
  const phase = c ? phaseOf(c) : null;
  const ended = c ? Date.now() > new Date(c.endsAt).getTime() : false;
  const prizeTotal = (c?.prizes ?? []).reduce((n, p) => n + p.quantity, 0);
  const participantCount = c?.eligibleCount ?? entries.length;
  // Süre dolmadan ya da yeniden çekimde sunucu onay (force) ister: kutu işaretlenmeden düğme kapalı.
  const needsForce = !ended || !!c?.winnersDrawn;

  const runDraw = async () => {
    if (!c) return;
    setDrawing(true);
    try {
      const result = await raffleAdminService.draw(c.id, drawCount, force);
      enqueueSnackbar(`Kura çekildi: ${result.length} kazanan`, { variant: 'success' });
      setConfirmOpen(false);
      await onChanged(c.id);
    } catch (e: any) {
      enqueueSnackbar(e?.response?.data?.message || 'Kura çekilemedi', { variant: 'error' });
    } finally {
      setDrawing(false);
    }
  };

  const downloadCsv = async () => {
    if (!c) return;
    try {
      const rows = await raffleAdminService.entries(c.id, 10000);
      const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const csv = [
        ['Ad', 'E-posta', 'Katılım', 'Kullanıcı ID'].map(esc).join(','),
        ...rows.map((r) => [r.displayName, r.email, r.joinedAt ? fmtDate(r.joinedAt) : '', r.userId].map(esc).join(',')),
      ].join('\n');
      const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `cekilis-${c.name.replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase()}-katilimcilar.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      enqueueSnackbar('Katılımcı listesi indirilemedi', { variant: 'error' });
    }
  };

  /** Bu çekilişi tanıtan story'ler; kaldırınca açılmayan story kalmasın. */
  const openRemoval = async (kind: 'unpublish' | 'delete') => {
    setRemoval(kind);
    setDropStories(true);
    setStoryIds(null);
    try {
      const all = await featuredStoryService.list();
      setStoryIds(all.filter((s) => s.targetType === 'RAFFLE' && s.targetId === c?.id).map((s) => s.id));
    } catch {
      setStoryIds([]);
    }
  };

  const confirmRemoval = async () => {
    if (!c || !removal) return;
    setBusy(true);
    try {
      if (removal === 'delete') await raffleAdminService.remove(c.id);
      else await raffleAdminService.update(c.id, { status: 'DRAFT' });
      let storyFailed = false;
      if (dropStories && storyIds?.length) {
        const results = await Promise.allSettled(storyIds.map((id) => featuredStoryService.remove(id)));
        storyFailed = results.some((r) => r.status === 'rejected');
      }
      enqueueSnackbar(
        removal === 'delete' ? 'Çekiliş silindi; uygulamadan kalktı' : 'Çekiliş taslağa alındı; uygulamadan kalktı',
        { variant: 'success' },
      );
      if (storyFailed) {
        enqueueSnackbar("Bazı story'ler kaldırılamadı. Öne Çıkan Hikayeler'den elle kaldır.", { variant: 'warning' });
      }
      setRemoval(null);
      if (removal === 'delete') await onDeleted();
      else await onChanged(c.id);
    } catch (e: any) {
      enqueueSnackbar(e?.response?.data?.message || 'İşlem yapılamadı', { variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    if (!c) return;
    if (new Date(c.endsAt).getTime() <= Date.now()) {
      enqueueSnackbar('Bitiş tarihi geçmiş. Önce Düzenle\'den yeni bir bitiş tarihi seç.', { variant: 'warning' });
      return;
    }
    setBusy(true);
    try {
      await raffleAdminService.update(c.id, { status: 'ACTIVE' });
      enqueueSnackbar('Çekiliş yayında', { variant: 'success' });
      await onChanged(c.id);
    } catch (e: any) {
      enqueueSnackbar(e?.response?.data?.message || 'Yayına alınamadı', { variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  /** Sıradaki iş: admin panele bakınca ne yapacağını görür. */
  const nextStep = (() => {
    if (!c || !phase) return null;
    if (c.status === 'DRAFT') return { severity: 'info' as const, text: 'Taslak: uygulamada görünmüyor. Hazırsan düzenleyip "Yayında" yap.' };
    if (phase.label === 'Kura bekliyor') return { severity: 'warning' as const, text: 'Süre doldu. Kurayı çekebilirsin.' };
    if (c.winnersDrawn) return { severity: 'success' as const, text: 'Kura çekildi. Kazananlarla iletişime geçmeyi unutma; uygulama bildirim göndermiyor.' };
    return null;
  })();

  return (
    <Drawer anchor="right" open={!!c || loading} onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', md: 720 } } }}>
      {loading && !c ? (
        <Box sx={{ p: 6, textAlign: 'center' }}><CircularProgress size={28} /></Box>
      ) : c && phase ? (
        <Stack sx={{ height: '100%' }}>
          {/* Başlık */}
          <Box sx={{ p: 3, pb: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Stack direction="row" alignItems="flex-start" spacing={2}>
              {c.coverImageUrl ? (
                <Avatar variant="rounded" src={c.coverImageUrl} sx={{ width: 64, height: 64 }} />
              ) : (
                <Avatar variant="rounded" sx={{ width: 64, height: 64, bgcolor: 'action.hover' }}>
                  <CardGiftcardIcon color="action" />
                </Avatar>
              )}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Chip size="small" label={phase.label} color={phase.color} />
                  <Chip size="small" variant="outlined" label={join ? 'Çekilişe katıl' : 'XP ile hak'} />
                </Stack>
                <Typography variant="h6" fontWeight={700} sx={{ mt: 0.75 }} noWrap>{c.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {fmtDate(c.startsAt)} → {fmtDate(c.endsAt)}
                  {durationText(new Date(c.startsAt), new Date(c.endsAt)) && ` · ${durationText(new Date(c.startsAt), new Date(c.endsAt))}`}
                </Typography>
              </Box>
              <IconButton aria-label="Kapat" onClick={onClose}><CloseIcon /></IconButton>
            </Stack>

            <Stack direction="row" spacing={3} sx={{ mt: 2 }}>
              <Box>
                <Typography variant="h5" fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {participantCount.toLocaleString('tr-TR')}
                </Typography>
                <Typography variant="caption" color="text.secondary">{join ? 'katılımcı' : 'hak kazanan'}</Typography>
              </Box>
              {join && (
                <Box>
                  <Typography variant="h5" fontWeight={700}>{prizeTotal}</Typography>
                  <Typography variant="caption" color="text.secondary">kazanan çıkacak</Typography>
                </Box>
              )}
              <Box>
                <Typography variant="h5" fontWeight={700}>{c.popupEnabled ? 'Açık' : 'Kapalı'}</Typography>
                <Typography variant="caption" color="text.secondary">açılış penceresi</Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
              <Button variant="contained" color="warning" startIcon={<CasinoIcon />}
                disabled={c.status === 'CANCELLED' || participantCount === 0}
                onClick={() => { setForce(false); setConfirmOpen(true); }}>
                {c.winnersDrawn ? 'Kurayı yeniden çek' : 'Kurayı çek'}
              </Button>
              <Button variant="outlined" startIcon={<EditIcon />} onClick={() => onEdit(c)}>Düzenle</Button>
              {join && (
                <>
                  <Button startIcon={<AutoStoriesIcon />} onClick={() => navigate(`/featured-stories?raffle=${c.id}`)}>
                    Story&apos;de tanıt
                  </Button>
                  <Button startIcon={<DownloadIcon />} onClick={downloadCsv} disabled={participantCount === 0}>
                    Katılımcılar (CSV)
                  </Button>
                </>
              )}
            </Stack>
            <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
              {c.status === 'ACTIVE' ? (
                <Button size="small" color="inherit" startIcon={<VisibilityOffOutlinedIcon />} disabled={busy}
                  onClick={() => openRemoval('unpublish')}>
                  Yayından kaldır
                </Button>
              ) : c.status === 'DRAFT' ? (
                <Button size="small" color="success" startIcon={<PublishOutlinedIcon />} disabled={busy} onClick={publish}>
                  Yayına al
                </Button>
              ) : null}
              <Button size="small" color="error" startIcon={<DeleteOutlineIcon />} disabled={busy}
                onClick={() => openRemoval('delete')}>
                Sil
              </Button>
            </Stack>
          </Box>

          {/* Gövde */}
          <Stack spacing={4} sx={{ p: 3, overflowY: 'auto', flex: 1 }}>
            {nextStep && <Alert severity={nextStep.severity}>{nextStep.text}</Alert>}

            {join && (
              <Block title="Hediyeler">
                <Stack spacing={1}>
                  {(c.prizes ?? []).map((p, i) => (
                    <Stack key={p.id ?? p.title} direction="row" spacing={1.5} alignItems="center">
                      <Typography variant="body2" color="text.secondary" sx={{ width: 20 }}>{i + 1}.</Typography>
                      <Avatar variant="rounded" src={p.imageUrl ?? undefined} sx={{ width: 36, height: 36, bgcolor: 'action.hover' }}>
                        <CardGiftcardIcon fontSize="small" color="action" />
                      </Avatar>
                      <Typography sx={{ flex: 1 }}>{p.title}</Typography>
                      <Chip size="small" label={`${p.quantity} adet`} />
                    </Stack>
                  ))}
                </Stack>
              </Block>
            )}

            <Block title="Kazananlar">
              {winners.length === 0 ? (
                <Typography variant="body2" color="text.secondary">Henüz kura çekilmedi.</Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{join ? 'Hediye' : 'Sıra'}</TableCell>
                      <TableCell>Üye</TableCell>
                      {!join && <TableCell align="right">Hak</TableCell>}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {winners.map((w) => (
                      <TableRow key={`${w.userId}-${w.rank}`}>
                        <TableCell>
                          {join ? (
                            <Chip size="small" icon={<EmojiEventsIcon />} label={w.prizeTitle || 'Hediye'} color="warning" />
                          ) : w.rank === 1 ? (
                            <Chip size="small" icon={<EmojiEventsIcon />} label="Asıl" color="warning" />
                          ) : (
                            <Chip size="small" label={`${w.rank - 1}. yedek`} variant="outlined" />
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>{w.displayName || '—'}</Typography>
                          <Typography variant="caption" color="text.secondary">{w.email}</Typography>
                        </TableCell>
                        {!join && <TableCell align="right">{w.entryCount}</TableCell>}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {winners[0] && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Çekim: {fmtDate(winners[0].drawnAt)}{winners[0].drawnBy ? ` · ${winners[0].drawnBy}` : ''}
                </Typography>
              )}
            </Block>

            <Block title={join ? 'Katılımcılar' : 'Hak sıralaması'}
              action={entries.length >= 100 ? (
                <Typography variant="caption" color="text.secondary">İlk 100 · tamamı CSV&apos;de</Typography>
              ) : undefined}>
              {entries.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  {join ? 'Henüz katılan yok.' : 'Henüz hak kazanan yok.'}
                </Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: 40 }}>#</TableCell>
                      <TableCell>Üye</TableCell>
                      {join ? <TableCell>Katılım</TableCell> : (
                        <>
                          <TableCell align="right">XP</TableCell>
                          <TableCell align="right">Hak</TableCell>
                        </>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {entries.map((e, i) => (
                      <TableRow key={e.userId}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>{e.displayName || '—'}</Typography>
                          <Typography variant="caption" color="text.secondary">{e.email}</Typography>
                        </TableCell>
                        {join ? (
                          <TableCell><Typography variant="caption">{fmtDate(e.joinedAt)}</Typography></TableCell>
                        ) : (
                          <>
                            <TableCell align="right">{e.campaignXp}</TableCell>
                            <TableCell align="right">{e.entries}</TableCell>
                          </>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Block>
          </Stack>

          {/* Yayından kaldır / sil onayı */}
          <Dialog open={!!removal} onClose={() => !busy && setRemoval(null)} maxWidth="xs" fullWidth>
            <DialogTitle>{removal === 'delete' ? 'Çekiliş silinsin mi?' : 'Yayından kaldırılsın mı?'}</DialogTitle>
            <DialogContent>
              <Stack spacing={2}>
                <Typography variant="body2">
                  {removal === 'delete'
                    ? 'Uygulamadan tamamen kalkar ve bu listeden silinir. Geri alınamaz. Katılım ve kazanan kayıtları denetim için saklanır.'
                    : 'Çekiliş taslağa alınır: ana sayfa kartı, çekiliş sayfası ve açılış penceresi uygulamadan kalkar. Katılımlar silinmez; istediğinde "Yayına al" ile geri açabilirsin.'}
                </Typography>
                {participantCount > 0 && (
                  <Alert severity="warning">
                    {participantCount} kişi katıldı. {removal === 'delete' ? 'Silinince' : 'Kaldırılınca'} çekiliş sayfasını göremezler.
                  </Alert>
                )}
                {storyIds === null ? (
                  <Typography variant="caption" color="text.secondary">Story&apos;ler kontrol ediliyor…</Typography>
                ) : storyIds.length > 0 ? (
                  <FormControlLabel
                    control={<Checkbox checked={dropStories} onChange={(e) => setDropStories(e.target.checked)} />}
                    label={<Typography variant="body2">Bu çekilişi tanıtan {storyIds.length} story&apos;yi de kaldır</Typography>}
                  />
                ) : null}
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setRemoval(null)} disabled={busy}>Vazgeç</Button>
              <Button variant="contained" color={removal === 'delete' ? 'error' : 'primary'} onClick={confirmRemoval}
                disabled={busy || storyIds === null}>
                {busy ? 'İşleniyor…' : removal === 'delete' ? 'Sil' : 'Yayından kaldır'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Kura onayı */}
          <Dialog open={confirmOpen} onClose={() => !drawing && setConfirmOpen(false)} maxWidth="xs" fullWidth>
            <DialogTitle>{c.winnersDrawn ? 'Kura yeniden çekilsin mi?' : 'Kura çekilsin mi?'}</DialogTitle>
            <DialogContent>
              <Stack spacing={2}>
                <Typography variant="body2">
                  {join
                    ? `${participantCount} katılımcı arasından ${prizeTotal} kazanan çekilecek; her hediyeye adedi kadar.`
                    : `Hak sayısına göre ağırlıklı çekim: 1 asıl kazanan${drawCount > 1 ? ` ve ${drawCount - 1} yedek` : ''}.`}
                  {' '}Çekiliş &quot;Bitti&quot; durumuna geçer.
                </Typography>
                {!join && (
                  <TextField label="Kazanan sayısı (asıl + yedek)" type="number" size="small" value={drawCount}
                    inputProps={{ min: 1 }} onChange={(e) => setDrawCount(Math.max(1, Number(e.target.value) || 1))} />
                )}
                {c.winnersDrawn && (
                  <Alert severity="warning">Mevcut kazananlar silinir ve yeniden çekilir.</Alert>
                )}
                {!ended && !c.winnersDrawn && (
                  <Alert severity="info">Süre henüz dolmadı. Erken çekersen katılım kapanır.</Alert>
                )}
                {needsForce && (
                  <FormControlLabel
                    control={<Checkbox checked={force} onChange={(e) => setForce(e.target.checked)} />}
                    label={<Typography variant="body2">{c.winnersDrawn ? 'Evet, yeniden çek' : 'Evet, süre dolmadan çek'}</Typography>}
                  />
                )}
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setConfirmOpen(false)} disabled={drawing}>Vazgeç</Button>
              <Button variant="contained" color="warning" onClick={runDraw} disabled={drawing || (needsForce && !force)}>
                {drawing ? 'Çekiliyor…' : 'Kurayı çek'}
              </Button>
            </DialogActions>
          </Dialog>
        </Stack>
      ) : null}
    </Drawer>
  );
}
