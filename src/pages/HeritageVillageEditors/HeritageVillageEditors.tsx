import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Paper, Stack, Tab, Table, TableBody, TableCell, TableHead, TableRow, Tabs, Typography,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { AddEditorDialog, MoveEditorDialog, type VillageOption } from './EditorDialogs';
import { errorText } from '../../services/heritageReviewService';
import {
  heritageVillageEditorService, type EditorCandidate, type EditorListStatus, type VillageEditorRow,
} from '../../services/heritageVillageEditorService';

/**
 * Köy editörleri (yalnız yönetici): adaylar, başvurular, yanıt bekleyen davetler, editörler ve geçmiş.
 * Ekle (davet ya da hemen editör), köyünü değiştir, editörlüğü kaldır, geçmiş kaydı sil.
 * Bkz. docs/plan/nartgo-koy-editoru-koy-bazli.md
 */
type TabKey = 'candidates' | EditorListStatus;
const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const person = (name: string | null, email: string | null) => (
  <>
    <Typography variant="body2" fontWeight={700}>{name ?? 'Adsız'}</Typography>
    {email && <Typography variant="caption" color="text.secondary">{email}</Typography>}
  </>
);

export default function HeritageVillageEditors() {
  const { enqueueSnackbar } = useSnackbar();
  const [tab, setTab] = useState<TabKey>('candidates');
  const [candidates, setCandidates] = useState<EditorCandidate[] | null>(null);
  const [rows, setRows] = useState<VillageEditorRow[] | null>(null);
  const [requested, setRequested] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [adding, setAdding] = useState<{ user: { id: string; label: string }; village: VillageOption } | null | false>(false);
  const [moving, setMoving] = useState<VillageEditorRow | null>(null);

  const load = useCallback(async () => {
    try {
      if (tab === 'candidates') {
        setCandidates(await heritageVillageEditorService.candidates());
        setRequested((await heritageVillageEditorService.list('requested')).requested);
      } else {
        const r = await heritageVillageEditorService.list(tab);
        setRows(r.items); setRequested(r.requested);
      }
      setError('');
    } catch (e) { setError(errorText(e)); }
  }, [tab]);
  useEffect(() => { setCandidates(null); setRows(null); void load(); }, [load]);

  const run = async (key: string, action: () => Promise<void>, done: string) => {
    setBusy(key);
    try { await action(); enqueueSnackbar(done, { variant: 'success' }); await load(); }
    catch (e) { enqueueSnackbar(errorText(e), { variant: 'error' }); }
    finally { setBusy(null); }
  };

  /** Pencereden çağrılır; başarılıysa true döner ve pencere kapanır. */
  const submit = async (action: () => Promise<void>, done: string) => {
    try { await action(); enqueueSnackbar(done, { variant: 'success' }); await load(); return true; }
    catch (e) { enqueueSnackbar(errorText(e), { variant: 'error' }); return false; }
  };

  const loading = !error && (tab === 'candidates' ? candidates === null : rows === null);

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2} flexWrap="wrap">
        <Typography variant="h5" fontWeight={700}>Köy Editörleri</Typography>
        <Button variant="contained" onClick={() => setAdding(null)}>Editör Ekle</Button>
      </Stack>
      <Typography color="text.secondary" sx={{ mb: 1, maxWidth: 860 }}>
        Köy editörü yalnız kendi köyünde çalışır ve yalnız onay verir: incelemedeki fotoğrafı ve ses kaydını yayınlar,
        şikâyetle gizlenen duyuruyu yeniden yayına alır. Reddetme, kaldırma ve göç yolu girişi genel editörde kalır.
        Editörün adı köy sayfasında görünür. Adaylar, son 60 günde kendi köyü için onaylanmış katkısı olan üyelerdir;
        listede olmayan birini "Editör Ekle" ile ekleyebilirsiniz.
      </Typography>
      <Tabs value={tab} onChange={(_, v: TabKey) => setTab(v)} sx={{ mb: 2 }}>
        <Tab value="candidates" label="Adaylar" />
        <Tab value="requested" label={`Başvurular · ${requested}`} />
        <Tab value="invited" label="Yanıt Bekleyen Davetler" />
        <Tab value="active" label="Editörler" />
        <Tab value="closed" label="Geçmiş" />
      </Tabs>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading && <CircularProgress size={24} />}

      {tab === 'candidates' && candidates && (
        candidates.length === 0
          ? <Typography color="text.secondary">Son 60 günde katkısı onaylanan, henüz editör olmayan üye yok.</Typography>
          : (
            <Paper variant="outlined" sx={{ borderRadius: 2, overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Üye</TableCell>
                    <TableCell>Köy</TableCell>
                    <TableCell>Son 60 gün</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {candidates.map((c) => {
                    const key = `${c.userId}-${c.villageId}`;
                    return (
                      <TableRow key={key}>
                        <TableCell>{person(c.name, c.email)}</TableCell>
                        <TableCell>
                          <Typography variant="body2">{c.villageName} · {c.province}</Typography>
                          {!c.visible && <Chip size="small" label="Köyünde Görünmüyor" sx={{ mt: 0.5 }} />}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {c.contributions} katkı · {c.photos} fotoğraf · {c.voices} ses kaydı
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Button size="small" variant="contained" disabled={busy === key}
                            onClick={() => void run(key, () => heritageVillageEditorService.invite(c.userId, c.villageId), 'Davet gönderildi. Üye uygulamada kabul edince editör olur.')}>
                            Davet Et
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Paper>
          )
      )}

      {tab !== 'candidates' && rows && (
        rows.length === 0
          ? (
            <Typography color="text.secondary">
              {tab === 'requested' ? 'Bekleyen başvuru yok.' : tab === 'invited' ? 'Yanıt bekleyen davet yok.' : tab === 'closed' ? 'Geçmiş kayıt yok.' : 'Henüz köy editörü yok.'}
            </Typography>
          )
          : (
            <Paper variant="outlined" sx={{ borderRadius: 2, overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Üye</TableCell>
                    <TableCell>Köy</TableCell>
                    <TableCell>{tab === 'active' ? 'Editör Olduğu Gün' : tab === 'closed' ? 'Durum' : 'Tarih'}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((r) => {
                    const key = `${r.userId}-${r.villageId}`;
                    return (
                      <TableRow key={key}>
                        <TableCell>{person(r.name, r.email)}</TableCell>
                        <TableCell>
                          <Typography variant="body2">{r.villageName} · {r.province}</Typography>
                          {r.member === false && <Chip size="small" label="Köy Üyesi Değil" sx={{ mt: 0.5 }} />}
                        </TableCell>
                        <TableCell>
                          {tab === 'closed' && (
                            <Chip size="small" label={r.status === 'revoked' ? 'Kaldırıldı' : 'Reddedildi'} sx={{ mr: 1 }} />
                          )}
                          {fmt(tab === 'active' || tab === 'closed' ? (r.decidedAt ?? r.createdAt) : r.createdAt)}
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            {tab === 'requested' && (
                              <>
                                <Button size="small" variant="contained" disabled={busy === key}
                                  onClick={() => void run(key, () => heritageVillageEditorService.decide(r.userId, r.villageId, 'approve'), 'Başvuru onaylandı.')}>
                                  Onayla
                                </Button>
                                <Button size="small" variant="outlined" disabled={busy === key}
                                  onClick={() => void run(key, () => heritageVillageEditorService.decide(r.userId, r.villageId, 'decline'), 'Başvuru reddedildi. Üyeye bildirim gitmez.')}>
                                  Reddet
                                </Button>
                              </>
                            )}
                            {(tab === 'active' || tab === 'invited') && (
                              <Button size="small" variant="outlined" disabled={busy === key} onClick={() => setMoving(r)}>
                                Köyünü Değiştir
                              </Button>
                            )}
                            {tab === 'closed' && (
                              <>
                                <Button size="small" variant="outlined" disabled={busy === key}
                                  onClick={() => setAdding({
                                    user: { id: r.userId, label: r.name ?? r.email ?? 'Adsız' },
                                    village: { id: r.villageId, label: `${r.villageName} · ${r.province}` },
                                  })}>
                                  Yeniden Ekle
                                </Button>
                                <Button size="small" color="error" variant="outlined" disabled={busy === key}
                                  onClick={() => {
                                    if (window.confirm('Bu geçmiş kayıt kalıcı olarak silinecek. Devam edilsin mi?'))
                                      void run(key, () => heritageVillageEditorService.remove(r.userId, r.villageId), 'Kayıt silindi.');
                                  }}>
                                  Kaydı Sil
                                </Button>
                              </>
                            )}
                            {(tab === 'active' || tab === 'invited') && (
                              <Button size="small" color="error" variant="outlined" disabled={busy === key}
                                onClick={() => {
                                  if (window.confirm(tab === 'active' ? 'Bu kişinin köy editörlüğü kaldırılacak. Devam edilsin mi?' : 'Davet geri alınacak. Devam edilsin mi?'))
                                    void run(key, () => heritageVillageEditorService.decide(r.userId, r.villageId, 'revoke'), tab === 'active' ? 'Editörlük kaldırıldı.' : 'Davet geri alındı.');
                                }}>
                                {tab === 'active' ? 'Editörlüğü Kaldır' : 'Daveti Geri Al'}
                              </Button>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Paper>
          )
      )}

      <AddEditorDialog
        open={adding !== false}
        initial={adding || null}
        onClose={() => setAdding(false)}
        onSubmit={(userId, villageId, direct) => submit(
          () => heritageVillageEditorService.add(userId, villageId, direct),
          direct ? 'Üye köy editörü oldu.' : 'Davet gönderildi. Üye uygulamada kabul edince editör olur.',
        )}
      />
      <MoveEditorDialog
        row={moving}
        onClose={() => setMoving(null)}
        onSubmit={(to) => moving ? submit(
          () => heritageVillageEditorService.move(moving.userId, moving.villageId, to),
          moving.status === 'active' ? 'Editörlük yeni köye taşındı.' : 'Davet yeni köy için gönderildi.',
        ) : Promise.resolve(false)}
      />
    </Box>
  );
}
