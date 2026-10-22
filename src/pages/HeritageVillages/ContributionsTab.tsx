import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, Chip, Divider, Paper, Stack, TextField, Typography } from '@mui/material';
import { useSnackbar } from 'notistack';
import { errorText } from '../../services/heritageReviewService';
import { heritageVillageService, type ContributionItem, type VillageContributions } from '../../services/heritageVillageService';

const TASK_OPTION: Record<string, string> = { circassian_name: 'Çerkesçe adı', old_name: 'Eski adı', unknown: 'Bilinmiyor' };
const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');

/**
 * Köy sayfası › Kullanıcı katkıları. Önerilen bilgi (ad, sülale, tarihçe, köy bilgisi, düzeltme, kaldırma) onaylanınca
 * köy sayfasına girer; topluluğun doğrudan eklediği ad/sülaleler burada kabul edilir ya da kaldırılır.
 * Önerilerde öneren admin'e görünür (konum masasındaki gibi); topluluk kayıtlarında ekleyen hiçbir yerde gösterilmez.
 */
export default function ContributionsTab({ villageId, data, onChange }: { villageId: string; data: VillageContributions; onChange: () => void }) {
  const { enqueueSnackbar } = useSnackbar();
  const [busy, setBusy] = useState<string | null>(null);

  const act = async (key: string, fn: () => Promise<void>, done: string) => {
    setBusy(key);
    try { await fn(); enqueueSnackbar(done, { variant: 'success' }); onChange(); }
    catch (e) { enqueueSnackbar(errorText(e), { variant: 'error' }); }
    finally { setBusy(null); }
  };

  const nothing = data.pending.length === 0 && data.community.length === 0 && data.tasks.length === 0 && data.locationPending.length === 0;
  const answers = data.locationAnswers ?? {};
  const answerTotal = Object.values(answers).reduce((a, b) => a + b, 0);

  return (
    <Stack spacing={3}>
      {nothing && <Alert severity="success">Bu köy için onay bekleyen kullanıcı katkısı yok.</Alert>}

      {data.pending.length > 0 && (
        <Section title="Onay bekleyen öneriler" hint="Onaylanan bilgi köy sayfasına girer; reddedilen yayına girmez. Not yazmak isteğe bağlı.">
          {data.pending.map((c) => (
            <PendingCard key={c.id} item={c} busy={busy === c.id}
              onDecide={(approve, note) => act(c.id, () => heritageVillageService.reviewContribution(villageId, c.id, approve, note), approve ? 'Onaylandı, köy sayfasına eklendi.' : 'Reddedildi.')} />
          ))}
        </Section>
      )}

      {data.community.length > 0 && (
        <Section title="Topluluğun eklediği, teyit bekleyen kayıtlar"
          hint={`Bunlar köy sayfasında "teyit bekliyor" ya da "tartışmalı" etiketiyle zaten görünüyor. Köyden ${data.trustNeeded} kişi teyit edince kendiliğinden teyitli olur; burada doğrudan kabul ya da kaldırabilirsin.`}>
          {data.community.map((c) => (
            <Paper key={c.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
                <Box sx={{ flex: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip size="small" label={c.type === 'name' ? 'Ad' : 'Sülale'} />
                    <Typography fontWeight={700}>{c.label}</Typography>
                    {c.detail && <Typography variant="caption" color="text.secondary">{c.type === 'name' ? (c.detail === 'cyrillic' ? 'Kiril' : 'Latin') : c.detail}</Typography>}
                    <Chip size="small" color={c.trust === 'disputed' ? 'error' : 'warning'} variant="outlined" label={c.trust === 'disputed' ? 'Tartışmalı' : `Teyit bekliyor · ${c.confirms}/${data.trustNeeded}`} />
                  </Stack>
                  <Typography variant="caption" color="text.secondary">Eklenme: {fmt(c.added_at)}</Typography>
                  {c.disputes.map((d, i) => <Typography key={i} variant="body2" color="error.main">İtiraz: {d.reason || 'gerekçe yazılmamış'}</Typography>)}
                </Box>
                <Stack direction="row" spacing={1}>
                  <Button size="small" variant="contained" disabled={busy === c.id}
                    onClick={() => act(c.id, () => heritageVillageService.resolveCommunity(villageId, c.type, c.id, 'keep'), 'Kabul edildi.')}>Doğru, kabul et</Button>
                  <Button size="small" color="error" disabled={busy === c.id}
                    onClick={() => { if (window.confirm(`"${c.label}" bu köyden kaldırılsın mı?`)) void act(c.id, () => heritageVillageService.resolveCommunity(villageId, c.type, c.id, 'remove'), 'Kaldırıldı.'); }}>Kaldır</Button>
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Section>
      )}

      {data.tasks.length > 0 && (
        <Section title="Köy soruları" hint="Köylülere sorulan sorular ve oy dağılımı. Bir cevap en az 3 oy alınca onaylanabilir.">
          {data.tasks.map((t) => (
            <Paper key={t.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography fontWeight={600}>{t.question}</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                {t.options.map((o) => {
                  const n = t.votes[o] ?? 0;
                  return (
                    <Button key={o} size="small" variant={n >= 3 ? 'contained' : 'outlined'} disabled={n < 3 || busy === t.id}
                      onClick={() => act(t.id, () => heritageVillageService.decideTask(villageId, t.id, o), 'Soru karara bağlandı.')}>
                      {TASK_OPTION[o] ?? o} · {n} oy
                    </Button>
                  );
                })}
              </Stack>
            </Paper>
          ))}
        </Section>
      )}

      {(data.locationPending.length > 0 || answerTotal > 0) && (
        <Section title="Konum" hint="Konum önerileri haritayla birlikte Köy Konumları masasında incelenir.">
          {answerTotal > 0 && (
            <Typography variant="body2">
              Köylülerin konum cevabı: {answers.yes ?? 0} "doğru", {answers.no ?? 0} "yanlış", {answers.unknown ?? 0} "bilmiyorum".
            </Typography>
          )}
          {data.locationPending.map((c) => (
            <Paper key={c.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box sx={{ flex: 1 }}><Typography fontWeight={600}>{c.title}</Typography><Lines item={c} /></Box>
                <Button size="small" component={RouterLink} to="/heritage/locations">Konum masasında aç</Button>
              </Stack>
            </Paper>
          ))}
        </Section>
      )}

      {data.recent.length > 0 && (
        <Section title="Son kararlar">
          {data.recent.map((r) => (
            <Typography key={r.id} variant="body2" color="text.secondary">
              {fmt(r.reviewed_at)} · {r.status === 'approved' ? 'Onaylandı' : 'Reddedildi'} · {r.contributor ?? 'Kullanıcı'}{r.reviewer ? ` · karar: ${r.reviewer}` : ''}{r.review_note ? ` · "${r.review_note}"` : ''}
            </Typography>
          ))}
        </Section>
      )}
    </Stack>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="subtitle1" fontWeight={700}>{title}</Typography>
      {hint && <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{hint}</Typography>}
      <Stack spacing={1.5}>{children}</Stack>
      <Divider sx={{ mt: 3 }} />
    </Box>
  );
}

function Lines({ item }: { item: ContributionItem }) {
  return (
    <Box component="dl" sx={{ m: 0, mt: 1, display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: 2, rowGap: 0.5 }}>
      {item.lines.map((l, i) => (
        <Box key={i} sx={{ display: 'contents' }}>
          <Typography component="dt" variant="body2" color="text.secondary">{l.label}</Typography>
          <Typography component="dd" variant="body2" sx={{ m: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{l.value}</Typography>
        </Box>
      ))}
    </Box>
  );
}

function PendingCard({ item, busy, onDecide }: { item: ContributionItem; busy: boolean; onDecide: (approve: boolean, note?: string) => void }) {
  const [note, setNote] = useState('');
  const [rejecting, setRejecting] = useState(false);
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography fontWeight={700} sx={{ flex: 1 }}>{item.title}</Typography>
        <Typography variant="caption" color="text.secondary">{fmt(item.createdAt)}</Typography>
      </Stack>
      <Typography variant="caption" color="text.secondary">
        {item.contributor ?? 'Kullanıcı'}{item.contributorApproved ? ` · daha önce ${item.contributorApproved} katkısı onaylandı` : ' · ilk katkısı'}{item.source === 'app' ? ' · uygulamadan' : item.source === 'web' ? ' · webden' : ''}
      </Typography>
      <Lines item={item} />
      {rejecting && (
        <TextField size="small" fullWidth sx={{ mt: 1.5 }} label="Ret nedeni (isteğe bağlı)" value={note} onChange={(e) => setNote(e.target.value)}
          placeholder="Örnek: kaynak yok, başka köyle karıştırılmış" />
      )}
      <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
        {!rejecting ? (
          <>
            <Button size="small" variant="contained" disabled={busy} onClick={() => onDecide(true)}>Onayla</Button>
            <Button size="small" color="error" disabled={busy} onClick={() => setRejecting(true)}>Reddet</Button>
          </>
        ) : (
          <>
            <Button size="small" variant="contained" color="error" disabled={busy} onClick={() => onDecide(false, note.trim() || undefined)}>Reddi kaydet</Button>
            <Button size="small" disabled={busy} onClick={() => { setRejecting(false); setNote(''); }}>Vazgeç</Button>
          </>
        )}
      </Stack>
    </Paper>
  );
}
