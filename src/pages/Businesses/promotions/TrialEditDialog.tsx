import { useState } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Stack, Switch,
  TextField, Typography,
} from '@mui/material';
import { promotionAdminService, type PromotionPurchase } from '../../../services/business/promotionAdminService';
import { fmtDate, scopeLine } from './shared';

const errText = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { message?: string } } } | null)?.response?.data?.message || fallback;

/**
 * Deneme düzenleme ve kaldırma (business-service `PUT/DELETE /admin/promotions/{id}/trial`).
 * Süre başlangıçtan sayılır; arkasında sırada bekleyen öne çıkarma varsa sunucu onu da kaydırır.
 * Kaldırma: sıradaki deneme silinir, yayındaki bugün biter (görüntülenme kaydı kalır).
 */
export default function TrialEditDialog({ row, mode, onClose, onDone }: {
  row: PromotionPurchase;
  mode: 'edit' | 'remove';
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [days, setDays] = useState(String(row.days));
  const [story, setStory] = useState(row.includeStory);
  const [note, setNote] = useState(row.note ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const started = !!row.startsAt && new Date(row.startsAt).getTime() <= Date.now();
  const n = Number(days);
  const validDays = Number.isInteger(n) && n >= 1 && n <= 90;
  const newEnd = row.startsAt && validDays ? new Date(new Date(row.startsAt).getTime() + n * 86400000) : null;
  const endsInPast = newEnd != null && newEnd.getTime() <= Date.now();
  const changed = n !== row.days || story !== row.includeStory || note !== (row.note ?? '');

  const save = async () => {
    setBusy(true); setError(null);
    try {
      if (mode === 'remove') {
        const r = await promotionAdminService.removeTrial(row.id);
        onDone(r.deleted ? 'Sıradaki deneme silindi.' : 'Deneme bugün itibarıyla kaldırıldı.');
      } else {
        await promotionAdminService.updateTrial(row.id, {
          ...(n !== row.days ? { days: n } : {}),
          ...(story !== row.includeStory ? { includeStory: story } : {}),
          ...(note !== (row.note ?? '') ? { note } : {}),
        });
        onDone('Deneme güncellendi.');
      }
      onClose();
    } catch (e) {
      setError(errText(e, 'Kaydedilemedi.'));
    } finally { setBusy(false); }
  };

  return (
    <Dialog open onClose={() => !busy && onClose()} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pb: 0.5 }}>{mode === 'remove' ? 'Deneme kaldırılsın mı?' : 'Denemeyi düzenle'}</DialogTitle>
      <DialogContent>
        <Typography fontWeight={600}>{row.businessName ?? row.businessId}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {scopeLine(row)} · {fmtDate(row.startsAt)} – {fmtDate(row.endsAt)}
        </Typography>

        {mode === 'remove' ? (
          <Typography variant="body2">
            {started
              ? 'Öne çıkarma bugün sona erer ve sponsorlu alanlardan kalkar. Şimdiye kadarki görüntülenme ve tıklama kaydı korunur.'
              : 'Deneme henüz başlamadı; kayıt tamamen silinir.'}
            {row.includeStory && ' Hikâye eki de kaldırılır.'}
            {' '}Arkasında sırada bekleyen öne çıkarma varsa öne çekilir.
          </Typography>
        ) : (
          <Stack spacing={2}>
            <TextField
              label="Süre (gün, başlangıçtan)" type="number" size="small" value={days}
              onChange={(e) => setDays(e.target.value)}
              inputProps={{ min: 1, max: 90 }}
              error={!validDays || endsInPast}
              helperText={!validDays ? '1 ile 90 arası' : endsInPast
                ? 'Bu süreyle deneme bugünden önce biter; kısaltmak yerine kaldırın.'
                : newEnd ? `Yeni bitiş: ${fmtDate(newEnd.toISOString())}` : undefined}
            />
            <FormControlLabel control={<Switch checked={story} onChange={(e) => setStory(e.target.checked)} />}
              label={<Box><Typography variant="body2">Hikâye eki</Typography>
                <Typography variant="caption" color="text.secondary">Ana sayfa hikâyelerinde sponsorlu kart</Typography></Box>} />
            <TextField label="Not" size="small" value={note} onChange={(e) => setNote(e.target.value)}
              inputProps={{ maxLength: 300 }} placeholder="ör. NartBusiness üyesi, ilk ay" />
          </Stack>
        )}
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={busy}>Vazgeç</Button>
        {mode === 'remove'
          ? <Button variant="contained" color="error" disabled={busy} onClick={save}>Kaldır</Button>
          : <Button variant="contained" disabled={busy || !changed || !validDays || endsInPast} onClick={save}>Kaydet</Button>}
      </DialogActions>
    </Dialog>
  );
}
