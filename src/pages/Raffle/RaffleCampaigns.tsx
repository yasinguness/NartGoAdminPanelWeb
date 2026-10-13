import { useCallback, useEffect, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useSnackbar } from 'notistack';
import {
  raffleAdminService,
  RaffleCampaign,
  RaffleEntry,
  RaffleWinner,
} from '../../services/raffle/raffleAdminService';
import { FREQ_LABEL, durationText, fmtDate, phaseOf } from './raffleForm';
import RaffleCampaignForm from './RaffleCampaignForm';
import RaffleCampaignDetail from './RaffleCampaignDetail';

/**
 * Çekilişler: liste, sağdan açılan detay (kura, story, katılımcılar) ve
 * bölümlere ayrılmış oluşturma/düzenleme formu.
 */
export default function RaffleCampaigns() {
  const { enqueueSnackbar } = useSnackbar();

  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<RaffleCampaign[]>([]);
  const [helpOpen, setHelpOpen] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RaffleCampaign | null>(null);

  const [detail, setDetail] = useState<RaffleCampaign | null>(null);
  const [entries, setEntries] = useState<RaffleEntry[]>([]);
  const [winners, setWinners] = useState<RaffleWinner[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCampaigns(await raffleAdminService.list());
    } catch {
      enqueueSnackbar('Çekilişler yüklenemedi', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    load();
  }, [load]);

  const openDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const [c, e, w] = await Promise.all([
        raffleAdminService.get(id),
        raffleAdminService.entries(id, 100),
        raffleAdminService.winners(id),
      ]);
      setDetail(c);
      setEntries(e);
      setWinners(w);
    } catch {
      enqueueSnackbar('Çekiliş detayı yüklenemedi', { variant: 'error' });
    } finally {
      setDetailLoading(false);
    }
  }, [enqueueSnackbar]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (c: RaffleCampaign) => {
    setEditing(c);
    setFormOpen(true);
  };

  const onSaved = async (message: string) => {
    enqueueSnackbar(message, { variant: 'success' });
    setFormOpen(false);
    await load();
    if (detail && editing && detail.id === editing.id) await openDetail(editing.id);
  };

  const onDetailChanged = async (id: string) => {
    await Promise.all([load(), openDetail(id)]);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
        <Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h5" fontWeight={700}>Çekilişler</Typography>
            <Tooltip title="Nasıl çalışır?">
              <IconButton size="small" onClick={() => setHelpOpen((v) => !v)} aria-expanded={helpOpen}>
                <HelpOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Uygulamada hediye çekilişleri. Bir satıra tıkla: katılımcılar, kura ve story orada.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Yenile">
            <IconButton onClick={load}><RefreshIcon /></IconButton>
          </Tooltip>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>Yeni çekiliş</Button>
        </Stack>
      </Stack>

      <Collapse in={helpOpen}>
        <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'action.hover' }}>
          <Stack spacing={1}>
            <Typography variant="body2">
              <strong>Çekilişe katıl:</strong> kullanıcı uygulamada &quot;Çekilişe katıl&quot;a basar, herkes bir kez katılır.
              Kura her hediyeye adedi kadar kazanan çeker; bir kişi iki hediye kazanamaz.
            </Typography>
            <Typography variant="body2">
              <strong>XP ile hak:</strong> kullanıcı ayrıca katılmaz; hak = çekiliş süresinde kazanılan XP ÷ hak başına XP.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Uygulamada yalnız katılımcı sayısı ve kazananların baş harfleri görünür. Tam ad ve e-posta yalnız burada.
            </Typography>
          </Stack>
        </Paper>
      </Collapse>

      <Paper variant="outlined">
        {loading && campaigns.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={28} /></Box>
        ) : campaigns.length === 0 ? (
          <Stack alignItems="center" spacing={1.5} sx={{ p: 6, textAlign: 'center' }}>
            <CardGiftcardIcon color="disabled" sx={{ fontSize: 40 }} />
            <Typography fontWeight={600}>Henüz çekiliş yok</Typography>
            <Typography variant="body2" color="text.secondary">
              Hediyeleri ve tarihleri belirle, taslak olarak kaydet; hazır olunca yayınla.
            </Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>İlk çekilişi oluştur</Button>
          </Stack>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Çekiliş</TableCell>
                <TableCell>Tarih</TableCell>
                <TableCell align="right">Katılım</TableCell>
                <TableCell>Durum</TableCell>
                <TableCell>Açılış penceresi</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {campaigns.map((c) => {
                const phase = phaseOf(c);
                const join = c.entryMode === 'JOIN';
                const length = durationText(new Date(c.startsAt), new Date(c.endsAt));
                return (
                  <TableRow key={c.id} hover sx={{ cursor: 'pointer' }} onClick={() => openDetail(c.id)}
                    selected={detail?.id === c.id}>
                    <TableCell sx={{ maxWidth: 360 }}>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar variant="rounded" src={c.coverImageUrl ?? c.popupImageUrl ?? undefined}
                          sx={{ width: 40, height: 40, bgcolor: 'action.hover' }}>
                          <CardGiftcardIcon fontSize="small" color="action" />
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography fontWeight={600} noWrap>{c.name}</Typography>
                          <Typography variant="caption" color="text.secondary" noWrap component="div">
                            {join ? 'Çekilişe katıl' : `XP ile hak · ${c.xpPerEntry} XP = 1 hak`} · {c.prize}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap>{fmtDate(c.startsAt)}</Typography>
                      <Typography variant="caption" color="text.secondary" noWrap component="div">
                        → {fmtDate(c.endsAt)}{length ? ` · ${length}` : ''}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {c.eligibleCount != null ? c.eligibleCount.toLocaleString('tr-TR') : '—'}
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={phase.label} color={phase.color} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color={c.popupEnabled ? 'text.primary' : 'text.secondary'}>
                        {c.popupEnabled ? FREQ_LABEL[c.popupFrequency] : 'Kapalı'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      <Tooltip title="Düzenle">
                        <IconButton size="small" onClick={() => openEdit(c)}><EditIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Paper>

      <RaffleCampaignDetail
        campaign={detail}
        entries={entries}
        winners={winners}
        loading={detailLoading}
        onClose={() => setDetail(null)}
        onEdit={openEdit}
        onChanged={onDetailChanged}
        onDeleted={async () => {
          setDetail(null);
          await load();
        }}
      />

      <RaffleCampaignForm open={formOpen} editing={editing} onClose={() => setFormOpen(false)} onSaved={onSaved} />
    </Box>
  );
}
