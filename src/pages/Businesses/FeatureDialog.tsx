import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Stack, Switch, TextField, ToggleButton,
  ToggleButtonGroup, Typography,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { featuredAdminService, featuredErrorText, formatDate } from '../../services/business/featuredAdminService';

const PRESETS = [7, 14, 30, 90, 180];

export interface FeatureTarget {
  id: string;
  name: string;
  /** Hâlâ öne çıkıyorsa bitiş tarihi; değilse null. */
  activeUntil: string | null;
}

/**
 * Öne çıkar / süreyi uzat / bitişi değiştir. Gün seçilir ya da doğrudan bitiş tarihi girilir;
 * kaydetmeden önce bitişin hangi gün olacağı gösterilir.
 */
export default function FeatureDialog({ target, onClose, onDone }: { target: FeatureTarget | null; onClose: () => void; onDone: () => void }) {
  const { enqueueSnackbar } = useSnackbar();
  const [mode, setMode] = useState<'days' | 'date'>('days');
  const [days, setDays] = useState(30);
  const [endDate, setEndDate] = useState('');
  const [extend, setExtend] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const active = Boolean(target?.activeUntil);

  useEffect(() => { setMode('days'); setDays(30); setEndDate(''); setExtend(true); setError(''); }, [target?.id]);

  const preview = useMemo(() => {
    if (mode === 'date') return endDate ? new Date(`${endDate}T23:59:59`) : null;
    if (!days || days < 1) return null;
    const base = active && extend && target?.activeUntil ? new Date(target.activeUntil) : new Date();
    return new Date(base.getTime() + days * 86_400_000);
  }, [mode, endDate, days, active, extend, target?.activeUntil]);

  const save = async () => {
    if (!target) return;
    setBusy(true); setError('');
    try {
      await featuredAdminService.feature(target.id, mode === 'date' ? { endDate } : { days, extend: active && extend });
      enqueueSnackbar(active ? `${target.name}: süre güncellendi.` : `${target.name} öne çıkarıldı.`, { variant: 'success' });
      onDone(); onClose();
    } catch (e) { setError(featuredErrorText(e)); } finally { setBusy(false); }
  };

  const today = new Date().toISOString().slice(0, 10);
  return (
    <Dialog open={Boolean(target)} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>{active ? 'Öne çıkarma süresini değiştir' : 'İşletmeyi öne çıkar'}</DialogTitle>
      <DialogContent>
        <Typography fontWeight={600}>{target?.name}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {active ? `Şu an ${formatDate(target!.activeUntil)} tarihine kadar öne çıkıyor.` : 'Ana sayfada ve işletmeler listesinde, konumdan bağımsız olarak en üstte gösterilir.'}
        </Typography>
        <ToggleButtonGroup exclusive size="small" value={mode} onChange={(_, v) => v && setMode(v)} sx={{ mb: 2 }}>
          <ToggleButton value="days">Gün sayısı</ToggleButton>
          <ToggleButton value="date">Bitiş tarihi</ToggleButton>
        </ToggleButtonGroup>
        {mode === 'days' ? (
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {PRESETS.map((d) => (
                <Chip key={d} label={`${d} gün`} onClick={() => setDays(d)} color={days === d ? 'primary' : 'default'} variant={days === d ? 'filled' : 'outlined'} />
              ))}
            </Stack>
            <TextField size="small" type="number" label="Gün" value={days} onChange={(e) => setDays(Number(e.target.value))} inputProps={{ min: 1, max: 365 }} />
            {active && (
              <FormControlLabel control={<Switch checked={extend} onChange={(e) => setExtend(e.target.checked)} />}
                label={extend ? 'Mevcut bitişin üstüne ekle' : 'Bugünden itibaren say'} />
            )}
          </Stack>
        ) : (
          <TextField size="small" type="date" label="Bitiş tarihi" value={endDate} onChange={(e) => setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} inputProps={{ min: today }} fullWidth />
        )}
        <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
          <Typography variant="body2">Öne çıkarma bitişi: <b>{preview ? preview.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</b></Typography>
        </Box>
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">Vazgeç</Button>
        <Button variant="contained" onClick={() => void save()} disabled={busy || !preview}>{busy ? 'Kaydediliyor…' : active ? 'Süreyi kaydet' : 'Öne çıkar'}</Button>
      </DialogActions>
    </Dialog>
  );
}
