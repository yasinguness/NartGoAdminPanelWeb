import { useEffect, useState } from 'react';
import {
  Alert, Autocomplete, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Radio, RadioGroup,
  Stack, TextField, Typography,
} from '@mui/material';
import UserSearchAutocomplete from '../../components/UserSearchAutocomplete';
import type { UserDTO } from '../../types/users/userModel';
import { heritageVillageService } from '../../services/heritageVillageService';

/** Köy Editörleri sayfasının ekleme ve köy değiştirme pencereleri. */
export interface VillageOption { id: string; label: string }

/** Onaylı köylerde ad ile arama (en az 2 harf). */
export function VillagePicker({ value, onChange, label = 'Köy' }: { value: VillageOption | null; onChange: (v: VillageOption | null) => void; label?: string }) {
  const [input, setInput] = useState('');
  const [options, setOptions] = useState<VillageOption[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const q = input.trim();
    if (q.length < 2 || (value && input === value.label)) { setOptions(value ? [value] : []); return; }
    let live = true;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await heritageVillageService.list({ q, status: 'approved', size: 15 });
        if (live) setOptions(r.items.map((v) => ({ id: v.id, label: `${v.official_name} · ${v.district}, ${v.province}` })));
      } catch { if (live) setOptions([]); }
      finally { if (live) setLoading(false); }
    }, 350);
    return () => { live = false; clearTimeout(t); setLoading(false); };
  }, [input, value]);
  return (
    <Autocomplete
      value={value} options={options} filterOptions={(x) => x}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      onChange={(_, v) => onChange(v)} inputValue={input} onInputChange={(_, v) => setInput(v)}
      noOptionsText={input.trim().length < 2 ? 'En az 2 harf yazın' : 'Köy bulunamadı'}
      loading={loading} loadingText="Aranıyor…"
      renderInput={(params) => (
        <TextField {...params} size="small" label={label} placeholder="Köy adı ile arayın"
          InputProps={{ ...params.InputProps, endAdornment: <>{loading && <CircularProgress size={16} />}{params.InputProps.endAdornment}</> }} />
      )}
    />
  );
}

const userLabel = (u: UserDTO) => u.displayName || `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email;

export function AddEditorDialog({ open, initial, onClose, onSubmit }: {
  open: boolean;
  /** Geçmişten "Yeniden Ekle" ile açıldığında kişi ve köy hazır gelir. */
  initial?: { user: { id: string; label: string }; village: VillageOption } | null;
  onClose: () => void;
  onSubmit: (userId: string, villageId: string, direct: boolean) => Promise<boolean>;
}) {
  const [user, setUser] = useState<UserDTO | null>(null);
  const [village, setVillage] = useState<VillageOption | null>(null);
  const [direct, setDirect] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    setUser(null); setDirect(false); setBusy(false);
    setVillage(initial?.village ?? null);
  }, [open, initial]);
  const userId = initial?.user.id ?? user?.id ?? null;
  const submit = async () => {
    if (!userId || !village) return;
    setBusy(true);
    const ok = await onSubmit(userId, village.id, direct);
    setBusy(false);
    if (ok) onClose();
  };
  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Köy Editörü Ekle</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {initial
            ? <Typography><b>{initial.user.label}</b></Typography>
            : <UserSearchAutocomplete value={user} onChange={setUser} label="Üye" required />}
          {user && <Typography variant="caption" color="text.secondary" sx={{ mt: -1 }}>{userLabel(user)} · {user.email}</Typography>}
          <VillagePicker value={village} onChange={setVillage} />
          <RadioGroup value={direct ? 'direct' : 'invite'} onChange={(e) => setDirect(e.target.value === 'direct')}>
            <FormControlLabel value="invite" control={<Radio size="small" />}
              label={<Typography variant="body2"><b>Davet gönder.</b> Üye uygulamada kabul edince editör olur.</Typography>} />
            <FormControlLabel value="direct" control={<Radio size="small" />}
              label={<Typography variant="body2"><b>Hemen editör yap.</b> Üyeyle önceden konuştuysanız seçin.</Typography>} />
          </RadioGroup>
          {direct && (
            <Alert severity="info" sx={{ py: 0 }}>
              Üyenin adı köy sayfasında editör olarak hemen görünür ve üyeye bildirim gider.
            </Alert>
          )}
          <Typography variant="caption" color="text.secondary">
            Köyün üyesi olmayan biri de eklenebilir; listede "Köy Üyesi Değil" olarak görünür.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>Vazgeç</Button>
        <Button variant="contained" onClick={() => void submit()} disabled={busy || !userId || !village}>
          {direct ? 'Editör Yap' : 'Davet Gönder'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function MoveEditorDialog({ row, onClose, onSubmit }: {
  row: { name: string | null; villageId: string; villageName: string; status: string } | null;
  onClose: () => void;
  onSubmit: (toVillageId: string) => Promise<boolean>;
}) {
  const [village, setVillage] = useState<VillageOption | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setVillage(null); setBusy(false); }, [row]);
  const same = village?.id === row?.villageId;
  const submit = async () => {
    if (!village || same) return;
    setBusy(true);
    const ok = await onSubmit(village.id);
    setBusy(false);
    if (ok) onClose();
  };
  return (
    <Dialog open={!!row} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Köyünü Değiştir</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2">
            <b>{row?.name ?? 'Adsız'}</b> · şimdiki köy: {row?.villageName}
          </Typography>
          <VillagePicker value={village} onChange={setVillage} label="Yeni köy" />
          {same && <Alert severity="warning" sx={{ py: 0 }}>Yeni köy şimdiki köyle aynı.</Alert>}
          <Typography variant="caption" color="text.secondary">
            {row?.status === 'active'
              ? 'Editörlük yeni köye taşınır; eski köyde editör olarak görünmez. Üyeye bildirim gider.'
              : 'Davet yeni köy için yeniden gönderilir.'}
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>Vazgeç</Button>
        <Button variant="contained" onClick={() => void submit()} disabled={busy || !village || same}>Taşı</Button>
      </DialogActions>
    </Dialog>
  );
}
