import { useCallback, useEffect, useState } from 'react';
import {
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
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import CasinoIcon from '@mui/icons-material/Casino';
import { useSnackbar } from 'notistack';
import {
  raffleAdminService,
  RaffleCampaign,
  RaffleEntry,
  RaffleWinner,
  RafflePopupFrequency,
  RaffleStatus,
  UpsertRaffleCampaign,
} from '../../services/raffle/raffleAdminService';

// ── yardımcılar ──

const STATUS_META: Record<RaffleStatus, { label: string; color: 'default' | 'success' | 'warning' | 'error' }> = {
  DRAFT: { label: 'Taslak', color: 'default' },
  ACTIVE: { label: 'Aktif', color: 'success' },
  ENDED: { label: 'Bitti', color: 'warning' },
  CANCELLED: { label: 'İptal', color: 'error' },
};

const FREQ_LABEL: Record<RafflePopupFrequency, string> = {
  ONCE: 'Bir kez',
  DAILY: 'Günde bir',
  EVERY_OPEN: 'Her açılışta',
};

/** ISO (Z) → input[type=datetime-local] değeri (yerel saat). */
function toLocalInput(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** datetime-local → ISO (UTC). */
function toIso(local: string): string | undefined {
  if (!local) return undefined;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' });
}

interface FormState {
  name: string;
  prize: string;
  description: string;
  startsAt: string; // datetime-local
  endsAt: string;
  status: RaffleStatus;
  xpPerEntry: number;
  maxEntriesPerUser: string; // '' = sınırsız
  popupEnabled: boolean;
  popupTitle: string;
  popupBody: string;
  popupImageUrl: string;
  popupCtaText: string;
  popupFrequency: RafflePopupFrequency;
}

const EMPTY_FORM: FormState = {
  name: '',
  prize: '',
  description: '',
  startsAt: '',
  endsAt: '',
  status: 'DRAFT',
  xpPerEntry: 50,
  maxEntriesPerUser: '',
  popupEnabled: false,
  popupTitle: '',
  popupBody: '',
  popupImageUrl: '',
  popupCtaText: '',
  popupFrequency: 'DAILY',
};

function campaignToForm(c: RaffleCampaign): FormState {
  return {
    name: c.name,
    prize: c.prize,
    description: c.description ?? '',
    startsAt: toLocalInput(c.startsAt),
    endsAt: toLocalInput(c.endsAt),
    status: c.status,
    xpPerEntry: c.xpPerEntry,
    maxEntriesPerUser: c.maxEntriesPerUser ? String(c.maxEntriesPerUser) : '',
    popupEnabled: c.popupEnabled,
    popupTitle: c.popupTitle ?? '',
    popupBody: c.popupBody ?? '',
    popupImageUrl: c.popupImageUrl ?? '',
    popupCtaText: c.popupCtaText ?? '',
    popupFrequency: c.popupFrequency ?? 'DAILY',
  };
}

function formToRequest(f: FormState): UpsertRaffleCampaign {
  return {
    name: f.name.trim(),
    prize: f.prize.trim(),
    description: f.description,
    startsAt: toIso(f.startsAt),
    endsAt: toIso(f.endsAt),
    status: f.status,
    xpPerEntry: f.xpPerEntry,
    // 0 gönderilirse backend sınırsız (null) yapar
    maxEntriesPerUser: f.maxEntriesPerUser === '' ? 0 : Number(f.maxEntriesPerUser),
    popupEnabled: f.popupEnabled,
    popupTitle: f.popupTitle,
    popupBody: f.popupBody,
    popupImageUrl: f.popupImageUrl,
    popupCtaText: f.popupCtaText,
    popupFrequency: f.popupFrequency,
  };
}

// ── sayfa ──

export default function RaffleCampaigns() {
  const { enqueueSnackbar } = useSnackbar();

  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<RaffleCampaign[]>([]);

  // Form dialog
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RaffleCampaign | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Detay (liderlik + çekim + kazananlar)
  const [detail, setDetail] = useState<RaffleCampaign | null>(null);
  const [entriesList, setEntriesList] = useState<RaffleEntry[]>([]);
  const [winnersList, setWinnersList] = useState<RaffleWinner[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Çekim
  const [drawCount, setDrawCount] = useState(3);
  const [drawForce, setDrawForce] = useState(false);
  const [drawConfirmOpen, setDrawConfirmOpen] = useState(false);
  const [drawing, setDrawing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCampaigns(await raffleAdminService.list());
    } catch {
      enqueueSnackbar('Kampanyalar yüklenemedi', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (c: RaffleCampaign) => {
    setEditing(c);
    setForm(campaignToForm(c));
    setFormOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.prize.trim() || !form.startsAt || !form.endsAt) {
      enqueueSnackbar('Ad, ödül, başlangıç ve bitiş zorunlu', { variant: 'warning' });
      return;
    }
    setSaving(true);
    try {
      const body = formToRequest(form);
      if (editing) {
        await raffleAdminService.update(editing.id, body);
        enqueueSnackbar('Kampanya güncellendi', { variant: 'success' });
      } else {
        await raffleAdminService.create(body);
        enqueueSnackbar('Kampanya oluşturuldu', { variant: 'success' });
      }
      setFormOpen(false);
      await load();
      if (detail && editing && detail.id === editing.id) {
        await openDetail(editing.id);
      }
    } catch (e: any) {
      enqueueSnackbar(e?.response?.data?.message || 'Kaydedilemedi', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const [c, entries, winners] = await Promise.all([
        raffleAdminService.get(id),
        raffleAdminService.entries(id, 100),
        raffleAdminService.winners(id),
      ]);
      setDetail(c);
      setEntriesList(entries);
      setWinnersList(winners);
    } catch {
      enqueueSnackbar('Kampanya detayı yüklenemedi', { variant: 'error' });
    } finally {
      setDetailLoading(false);
    }
  };

  const runDraw = async () => {
    if (!detail) return;
    setDrawing(true);
    try {
      const winners = await raffleAdminService.draw(detail.id, drawCount, drawForce);
      setWinnersList(winners);
      enqueueSnackbar(`Çekiliş tamamlandı — ${winners.length} kazanan`, { variant: 'success' });
      setDrawConfirmOpen(false);
      setDrawForce(false);
      await load();
      await openDetail(detail.id);
    } catch (e: any) {
      enqueueSnackbar(e?.response?.data?.message || 'Çekim başarısız', { variant: 'error' });
    } finally {
      setDrawing(false);
    }
  };

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <CasinoIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>
            Çekiliş Kampanyaları
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Yenile">
            <IconButton onClick={load}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Yeni Kampanya
          </Button>
        </Stack>
      </Stack>

      <Alert severity="info" sx={{ mb: 2 }}>
        Çekiliş hakkı = kampanya penceresi içindeki XP ÷ hak başına XP (varsayılan 50). Haklar puan
        defterinden otomatik hesaplanır; ayrıca bir kayıt tutulmaz.
      </Alert>

      {/* ── Kampanya listesi ── */}
      <Paper variant="outlined" sx={{ mb: 3 }}>
        {loading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <CircularProgress size={28} />
          </Box>
        ) : campaigns.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">Henüz kampanya yok.</Typography>
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Kampanya</TableCell>
                <TableCell>Ödül</TableCell>
                <TableCell>Dönem</TableCell>
                <TableCell>Durum</TableCell>
                <TableCell align="center">Popup</TableCell>
                <TableCell align="center">XP/Hak</TableCell>
                <TableCell align="center">Kazananlar</TableCell>
                <TableCell align="right">İşlem</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {campaigns.map((c) => (
                <TableRow key={c.id} hover>
                  <TableCell>
                    <Typography fontWeight={600}>{c.name}</Typography>
                  </TableCell>
                  <TableCell>{c.prize}</TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {fmtDate(c.startsAt)} → {fmtDate(c.endsAt)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={STATUS_META[c.status].label} color={STATUS_META[c.status].color} />
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      size="small"
                      variant="outlined"
                      label={c.popupEnabled ? `Açık · ${FREQ_LABEL[c.popupFrequency]}` : 'Kapalı'}
                      color={c.popupEnabled ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="center">{c.xpPerEntry}</TableCell>
                  <TableCell align="center">
                    {c.winnersDrawn ? (
                      <Chip size="small" icon={<EmojiEventsIcon />} label="Çekildi" color="warning" />
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        —
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Düzenle">
                      <IconButton size="small" onClick={() => openEdit(c)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Button size="small" onClick={() => openDetail(c.id)}>
                      Detay
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* ── Detay: katılım liderliği + çekim + kazananlar ── */}
      {detailLoading && (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <CircularProgress size={28} />
        </Box>
      )}
      {detail && !detailLoading && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="h6" fontWeight={700}>
              {detail.name} — Katılım &amp; Çekim
            </Typography>
            <Chip
              size="small"
              label={`${detail.eligibleCount ?? entriesList.length} katılımcı (≥1 hak)`}
              color="info"
            />
          </Stack>

          <Grid container spacing={2}>
            {/* Liderlik */}
            <Grid item xs={12} md={7}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Hak Liderliği (ilk 100)
              </Typography>
              {entriesList.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Henüz hak kazanan yok.
                </Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>#</TableCell>
                      <TableCell>Üye</TableCell>
                      <TableCell align="right">Dönem XP</TableCell>
                      <TableCell align="right">Hak</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {entriesList.map((e, i) => (
                      <TableRow key={e.userId}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {e.displayName || '—'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {e.email}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{e.campaignXp}</TableCell>
                        <TableCell align="right">
                          <Chip size="small" label={e.entries} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Grid>

            {/* Çekim + Kazananlar */}
            <Grid item xs={12} md={5}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Çekim
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <TextField
                  label="Kazanan sayısı (1 asıl + yedekler)"
                  type="number"
                  size="small"
                  value={drawCount}
                  onChange={(e) => setDrawCount(Math.max(1, Number(e.target.value) || 1))}
                  sx={{ width: 220 }}
                />
                <Button
                  variant="contained"
                  color="warning"
                  startIcon={<CasinoIcon />}
                  disabled={drawing}
                  onClick={() => setDrawConfirmOpen(true)}
                >
                  Çekilişi Yap
                </Button>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                Ağırlıklı rastgele: hak sayısı = bilet. Aynı üye bir kez kazanır. Kampanya bitmeden ya
                da yeniden çekim için onay kutusundaki &quot;zorla&quot; seçeneği gerekir.
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Kazananlar
              </Typography>
              {winnersList.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Henüz çekim yapılmadı.
                </Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Sıra</TableCell>
                      <TableCell>Üye</TableCell>
                      <TableCell align="right">Hak</TableCell>
                      <TableCell>Çekim</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {winnersList.map((w) => (
                      <TableRow key={`${w.userId}-${w.rank}`}>
                        <TableCell>
                          {w.rank === 1 ? (
                            <Chip size="small" icon={<EmojiEventsIcon />} label="1 · Asıl" color="warning" />
                          ) : (
                            <Chip size="small" label={`${w.rank} · Yedek`} variant="outlined" />
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {w.displayName || '—'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {w.email}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{w.entryCount}</TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {fmtDate(w.drawnAt)}
                            {w.drawnBy ? ` · ${w.drawnBy}` : ''}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* ── Oluştur / Düzenle dialog ── */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editing ? 'Kampanyayı Düzenle' : 'Yeni Çekiliş Kampanyası'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12} md={6}>
              <TextField label="Kampanya adı" fullWidth size="small" value={form.name}
                onChange={(e) => set('name', e.target.value)} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="Ödül (örn. Akordeon)" fullWidth size="small" value={form.prize}
                onChange={(e) => set('prize', e.target.value)} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Açıklama" fullWidth size="small" multiline rows={2} value={form.description}
                onChange={(e) => set('description', e.target.value)} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="Başlangıç" type="datetime-local" fullWidth size="small" value={form.startsAt}
                onChange={(e) => set('startsAt', e.target.value)} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="Bitiş" type="datetime-local" fullWidth size="small" value={form.endsAt}
                onChange={(e) => set('endsAt', e.target.value)} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="Durum" select fullWidth size="small" value={form.status}
                onChange={(e) => set('status', e.target.value as RaffleStatus)}>
                {(Object.keys(STATUS_META) as RaffleStatus[]).map((s) => (
                  <MenuItem key={s} value={s}>{STATUS_META[s].label}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="Hak başına XP" type="number" fullWidth size="small" value={form.xpPerEntry}
                onChange={(e) => set('xpPerEntry', Math.max(1, Number(e.target.value) || 1))} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="Kişi başı max hak (boş = sınırsız)" type="number" fullWidth size="small"
                value={form.maxEntriesPerUser}
                onChange={(e) => set('maxEntriesPerUser', e.target.value)} />
            </Grid>

            <Grid item xs={12}>
              <Divider textAlign="left">
                <Typography variant="caption" color="text.secondary">APP-İÇİ TANITIM POPUP&apos;I</Typography>
              </Divider>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={<Switch checked={form.popupEnabled}
                  onChange={(e) => set('popupEnabled', e.target.checked)} />}
                label="Popup gösterilsin"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="Gösterim sıklığı" select fullWidth size="small" value={form.popupFrequency}
                onChange={(e) => set('popupFrequency', e.target.value as RafflePopupFrequency)}>
                {(Object.keys(FREQ_LABEL) as RafflePopupFrequency[]).map((f) => (
                  <MenuItem key={f} value={f}>{FREQ_LABEL[f]}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="Popup başlık" fullWidth size="small" value={form.popupTitle}
                onChange={(e) => set('popupTitle', e.target.value)} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="Buton metni (örn. Davet Et, Hakkını Artır)" fullWidth size="small"
                value={form.popupCtaText} onChange={(e) => set('popupCtaText', e.target.value)} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Popup metni" fullWidth size="small" multiline rows={3} value={form.popupBody}
                onChange={(e) => set('popupBody', e.target.value)} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Görsel URL (ödül fotoğrafı)" fullWidth size="small" value={form.popupImageUrl}
                onChange={(e) => set('popupImageUrl', e.target.value)} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)}>Vazgeç</Button>
          <Button variant="contained" onClick={save} disabled={saving}>
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Çekim onayı ── */}
      <Dialog open={drawConfirmOpen} onClose={() => setDrawConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Çekilişi onayla</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>{detail?.name}</strong> için <strong>{drawCount}</strong> kazanan (1 asıl
            {drawCount > 1 ? ` + ${drawCount - 1} yedek` : ''}) çekilecek. Bu işlem kampanyayı
            &quot;Bitti&quot; durumuna alır.
          </Typography>
          <FormControlLabel
            control={<Checkbox checked={drawForce} onChange={(e) => setDrawForce(e.target.checked)} />}
            label={
              <Typography variant="body2">
                Zorla (kampanya bitmeden erken çekim ya da mevcut kazananları silip YENİDEN çekim)
              </Typography>
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDrawConfirmOpen(false)}>Vazgeç</Button>
          <Button variant="contained" color="warning" onClick={runDraw} disabled={drawing}>
            {drawing ? 'Çekiliyor…' : 'Çek'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
