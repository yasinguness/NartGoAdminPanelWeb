import { useEffect, useState } from 'react';
import { Alert, Box, Button, Checkbox, Chip, FormControlLabel, Stack, Step, StepLabel, Stepper, TextField, Typography } from '@mui/material';
import { nbAdminService, type NbListingCandidate } from '../../services/nartbusiness/nbAdminService';
import { nbIntakeService, trackLabels, type IntakeRow, type TrackStatus } from '../../services/nartbusiness/nbIntakeService';
import { nbErrorMessage } from '../../services/nartbusiness/nbErrorMessage';

const STEPS: TrackStatus[] = ['RECEIVED', 'IN_REVIEW', 'PUBLISHED', 'FORWARDED', 'RESPONDED'];
const draftLabels: [keyof NonNullable<IntakeRow['draft']>, string][] = [
  ['what', 'Aranan / sunulan'], ['quantity', 'Miktar'], ['location', 'Konum'], ['timing', 'Süre'], ['budget', 'Bütçe']];
const when = (v: string) => new Date(v).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/**
 * Talep takibi (docs/redesign Faz 6): durum ve geçmiş, üyenin Paylaş'ta
 * düzelttiği alanlar, incelemeye alma, yayından önce düzenleme, yayından sonra
 * firmalara iletme ve talebi kapatma. Her işlem üyenin Taleplerim kartını
 * değiştirir; o yüzden düğmeler üyenin göreceği adı taşıyor.
 */
export default function NbIntakeTracking({ row, busy, run, onRow }: {
  row: IntakeRow;
  busy: boolean;
  run: (work: () => Promise<void>) => Promise<void>;
  onRow: (row: IntakeRow) => void;
}) {
  const pending = row.status === 'PENDING' && !row.revoked;
  const track = row.trackStatus ?? null;
  const [items, setItems] = useState(() => (row.items || []).map(i => ({ title: i.title, description: i.description, city: i.city || '' })));
  const [candidates, setCandidates] = useState<NbListingCandidate[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [closeNote, setCloseNote] = useState('');
  const [error, setError] = useState('');
  const listingId = row.listingIds[0];
  const forwarded = row.forwardedMemberIds?.length ?? 0;

  useEffect(() => {
    setItems((row.items || []).map(i => ({ title: i.title, description: i.description, city: i.city || '' })));
  }, [row]);
  useEffect(() => {
    if (!listingId || track === 'CLOSED') { setCandidates([]); return; }
    let active = true;
    nbAdminService.listingCandidates(listingId, { limit: 12 })
      .then(list => { if (active) setCandidates(list); })
      .catch(e => { if (active) setError(nbErrorMessage(e)); });
    return () => { active = false; };
  }, [listingId, track, forwarded]);

  const edited = items.some((it, i) => {
    const o = row.items?.[i];
    return !!o && (it.title !== o.title || it.description !== o.description || (it.city || '') !== (o.city || ''));
  });
  const activeStep = track ? (track === 'CLOSED' ? -1 : STEPS.indexOf(track)) : -1;

  return <Box sx={{ mt: 1 }}>
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    <Typography fontWeight={600}>Üyenin gördüğü durum</Typography>
    {track ? <>
      {track === 'CLOSED'
        ? <Chip size="small" label="Kapandı" sx={{ mt: 1 }} />
        : <Stepper activeStep={activeStep} alternativeLabel sx={{ mt: 1.5 }}>
            {STEPS.map(s => <Step key={s} completed={STEPS.indexOf(s) < activeStep}>
              <StepLabel>{s === 'FORWARDED' && forwarded ? `${forwarded} firmaya iletildi` : trackLabels[s]}</StepLabel></Step>)}
          </Stepper>}
      {!!row.statusHistory?.length && <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 1 }}>
        {row.statusHistory.map(e => `${trackLabels[e.status]} ${when(e.at)}`).join(' · ')}</Typography>}
    </> : <Typography variant="body2" color="text.secondary">Bu kayıt üye talebi olarak takip edilmiyor (yanıtsız davet ya da "şimdilik ihtiyaç yok").</Typography>}

    {row.draft && <Box sx={{ mt: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
      <Typography fontWeight={600} variant="body2">Üyenin Paylaş'ta düzelttiği alanlar</Typography>
      {draftLabels.filter(([k]) => row.draft?.[k]).map(([k, l]) =>
        <Typography key={k} variant="body2">{l}: {String(row.draft?.[k])}</Typography>)}
      {!!row.draft.keywords?.length && <Typography variant="body2">Anahtar kelimeler: {row.draft.keywords.join(', ')}</Typography>}
      {row.draft.sectorSuggestion && <Typography variant="body2">Önerilen sektör: {row.draft.sectorSuggestion}</Typography>}
      {row.draft.hideCompany && <Alert severity="warning" sx={{ mt: 1 }}>Üye firma adının gizlenmesini istiyor. İlanı firma adı olmadan yayınlayın; yanıtları ekip üzerinden iletin.</Alert>}
      {row.draft.notifyWhatsapp && <Typography variant="body2" sx={{ mt: 0.5 }}>Yanıt gelince WhatsApp'tan haber almak istiyor.</Typography>}
    </Box>}

    {pending && <>
      {track === 'RECEIVED' && <Button sx={{ mt: 2 }} variant="outlined" disabled={busy}
        onClick={() => run(async () => { onRow(await nbIntakeService.startReview(row.id)); })}>İncelemeye al</Button>}
      <Typography fontWeight={600} sx={{ mt: 2 }}>Yayından önce düzelt</Typography>
      {items.map((it, i) => <Stack key={i} spacing={1.5} sx={{ mt: 1.5 }}>
        <TextField size="small" label="Başlık" value={it.title} inputProps={{ maxLength: 255 }}
          onChange={e => setItems(cur => cur.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} />
        <TextField size="small" multiline minRows={3} label="İlan metni" value={it.description} inputProps={{ maxLength: 3000 }}
          onChange={e => setItems(cur => cur.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} />
        <TextField size="small" label="Şehir" value={it.city} inputProps={{ maxLength: 100 }}
          onChange={e => setItems(cur => cur.map((x, j) => j === i ? { ...x, city: e.target.value } : x))} />
      </Stack>)}
      <Button sx={{ mt: 1.5 }} disabled={busy || !edited || items.some(i => !i.title.trim() || !i.description.trim())}
        onClick={() => run(async () => { onRow(await nbIntakeService.editItems(row.id, items)); })}>Düzenlemeyi kaydet</Button>
    </>}

    {listingId && track && track !== 'CLOSED' && <Box sx={{ mt: 3 }}>
      <Typography fontWeight={600}>Firmalara ilet {forwarded > 0 && `(${forwarded} firmaya iletildi)`}</Typography>
      <Typography variant="caption" color="text.secondary">Seçilen firmalara ilan uygulama içi bildirim ve e-postayla gider; üye "N firmaya iletildi" görür.</Typography>
      {candidates.length === 0
        ? <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Uygun aday bulunamadı. İlan yönlendirme ekranından elle arayabilirsiniz.</Typography>
        : candidates.map(c => <FormControlLabel key={c.memberId} sx={{ display: 'flex' }} disabled={c.alreadyReferred || busy}
            control={<Checkbox checked={c.alreadyReferred || picked.includes(c.memberId)}
              onChange={e => setPicked(cur => e.target.checked ? [...cur, c.memberId] : cur.filter(x => x !== c.memberId))} />}
            label={<span>{c.companyName || c.memberId}{c.city ? ` · ${c.city}` : ''}{c.score != null ? ` · skor ${Math.round(c.score * 100)}` : ''}{c.alreadyReferred ? ' · iletildi' : ''}{c.matchedOn?.length ? ` · ${c.matchedOn.slice(0, 2).join(', ')}` : ''}</span>} />)}
      <Button sx={{ mt: 1 }} variant="contained" disabled={busy || picked.length === 0}
        onClick={() => run(async () => {
          for (const memberId of picked) await nbAdminService.referListing(listingId, { memberId, channel: 'IN_APP' });
          setPicked([]);
          onRow({ ...row, trackStatus: track === 'PUBLISHED' ? 'FORWARDED' : track,
            forwardedMemberIds: [...new Set([...(row.forwardedMemberIds || []), ...picked])] });
        })}>Seçilenlere ilet ({picked.length})</Button>
    </Box>}

    {track && track !== 'CLOSED' && !pending && <Box sx={{ mt: 3 }}>
      <TextField fullWidth size="small" label="Kapatma notu (isteğe bağlı)" value={closeNote} inputProps={{ maxLength: 1000 }}
        onChange={e => setCloseNote(e.target.value)} />
      <Button color="error" sx={{ mt: 1 }} disabled={busy} onClick={() => {
        if (window.confirm('Talep üyenin Taleplerim kartından düşer. Yayımlanmış ilanlar açık kalır. Devam edilsin mi?'))
          void run(async () => { onRow(await nbIntakeService.closeRequest(row.id, closeNote.trim() || 'Ekip kapattı.')); });
      }}>Talebi kapat</Button>
    </Box>}
  </Box>;
}
