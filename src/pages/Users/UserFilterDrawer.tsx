import { useEffect, useState } from 'react';
import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Drawer,
  FormControlLabel,
  IconButton,
  MenuItem,
  Slider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { au } from '../../theme/adminUsers';
import { TR_CITIES } from '../../constants/trCities';
import { heritageVillageService } from '../../services/heritageVillageService';
import { userSearchService } from '../../services/user/userSearchService';
import { ACTIVITY_LABEL, AGE_LABEL, emptyFilters, serverQuery, STATUS_LABEL, TYPE_LABEL, UserFilters } from './userFilters';

/**
 * Gelişmiş süzgeç çekmecesi (tasarım ekran 2). Değişiklikler "Uygula"ya kadar yereldir; alttaki sayı
 * gecikmeli sayım ucuyla güncellenir. MUI Drawer odak tuzağı kurar, Esc ile kapanır.
 */
export function Pill({ label, selected, onClick, dashed }: { label: string; selected: boolean; onClick: () => void; dashed?: boolean }) {
  return (
    <Box
      component="button"
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      sx={{
        height: 38,
        px: 1.75,
        borderRadius: 999,
        cursor: 'pointer',
        font: 'inherit',
        fontWeight: selected ? 700 : 400,
        color: selected ? au.primary : au.text,
        bgcolor: selected ? au.primaryTint : au.surface,
        border: selected ? `1.5px solid ${au.primary}` : dashed ? `1px dashed ${au.primaryOutline}` : `1px solid ${au.chipBorder}`,
        '&:focus-visible': { outline: `2px solid ${au.primary}`, outlineOffset: 2 },
      }}
    >
      {label}
    </Box>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Stack component="section" spacing={1.25}>
      <Typography component="h2" sx={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', color: au.muted }}>
        {title.toLocaleUpperCase('tr-TR')}
      </Typography>
      {children}
    </Stack>
  );
}

const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

export default function UserFilterDrawer({
  open,
  value,
  onClose,
  onApply,
}: {
  open: boolean;
  value: UserFilters;
  onClose: () => void;
  onApply: (f: UserFilters) => void;
}) {
  const [f, setF] = useState<UserFilters>(value);
  const [matched, setMatched] = useState<number | null>(null);
  const [villageOptions, setVillageOptions] = useState<{ id: string; label: string }[]>([]);
  const [familyOptions, setFamilyOptions] = useState<{ id: number; label: string }[]>([]);

  useEffect(() => {
    if (open) setF(value);
  }, [open, value]);

  // Sayı gecikmeli güncellenir: her tuşta istek gitmez.
  useEffect(() => {
    if (!open) return;
    setMatched(null);
    const t = setTimeout(() => {
      userSearchService.count(serverQuery(f)).then(setMatched).catch(() => setMatched(null));
    }, 350);
    return () => clearTimeout(t);
  }, [f, open]);

  const set = (patch: Partial<UserFilters>) => setF((x) => ({ ...x, ...patch }));

  const searchVillages = async (q: string) => {
    if (q.trim().length < 2) return;
    try {
      const r = await heritageVillageService.list({ q, province: f.hometownProvince, size: 15 });
      setVillageOptions(r.items.map((v) => ({ id: v.id, label: `${v.official_name} · ${v.district}, ${v.province}` })));
    } catch {
      setVillageOptions([]);
    }
  };

  const searchFamilies = async (q: string) => {
    if (q.trim().length < 2) return;
    try {
      const r = await heritageVillageService.searchFamilies(q);
      setFamilyOptions(r.map((x) => ({ id: x.id, label: x.family_name })));
    } catch {
      setFamilyOptions([]);
    }
  };

  const inputSx = { '& .MuiOutlinedInput-root': { borderRadius: '12px', minHeight: 46 } };

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: 520, maxWidth: '100%' } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 3, py: 2, borderBottom: `1px solid ${au.borderSoft}` }}>
        <Typography component="h1" sx={{ flex: 1, fontSize: 20, fontWeight: 800, color: au.text }}>
          Filtreler
        </Typography>
        <Button onClick={() => setF({ ...emptyFilters(), q: f.q, sort: f.sort })} sx={{ color: au.primary, fontWeight: 700 }}>
          Temizle
        </Button>
        <IconButton aria-label="Kapat" onClick={onClose} sx={{ width: 44, height: 44 }}>
          <CloseIcon />
        </IconButton>
      </Box>

      <Stack spacing={3} sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2.5 }}>
        <Section title="Hesap">
          <Stack direction="row" flexWrap="wrap" gap={1}>
            {Object.entries(TYPE_LABEL).map(([k, l]) => (
              <Pill key={k} label={l} selected={f.type.includes(k)} onClick={() => set({ type: toggle(f.type, k) })} />
            ))}
          </Stack>
          <Stack direction="row" flexWrap="wrap" gap={1}>
            {['ACTIVE', 'PENDING', 'BLOCKED'].map((k) => (
              <Pill key={k} label={STATUS_LABEL[k]} selected={f.status.includes(k)} onClick={() => set({ status: toggle(f.status, k) })} />
            ))}
          </Stack>
        </Section>

        <Section title="Yaş aralığı">
          <Stack direction="row" flexWrap="wrap" gap={1}>
            {['18-24', '25-34', '35-44', '45-54', '55+', 'unknown'].map((k) => (
              <Pill key={k} label={AGE_LABEL[k]} dashed={k === 'unknown'} selected={f.age.includes(k)} onClick={() => set({ age: toggle(f.age, k) })} />
            ))}
          </Stack>
          <Typography sx={{ fontSize: 12.5, color: au.muted }}>Yaş, doğum yılından hesaplanır. Doğum yılı girmeyenler ayrı sayılır.</Typography>
        </Section>

        <Section title="Memleket">
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.25 }}>
            <TextField select size="small" label="İl" value={f.hometownProvince ?? ''} sx={inputSx}
              onChange={(e) => set({ hometownProvince: e.target.value || undefined, hometownDistrict: undefined })}>
              <MenuItem value="">Tümü</MenuItem>
              {TR_CITIES.map((c) => (
                <MenuItem key={c} value={c}>{c}</MenuItem>
              ))}
            </TextField>
            <TextField size="small" label="İlçe" value={f.hometownDistrict ?? ''} sx={inputSx} disabled={!f.hometownProvince}
              onChange={(e) => set({ hometownDistrict: e.target.value || undefined })} />
            <Autocomplete
              options={villageOptions}
              value={f.villageId ? { id: f.villageId, label: f.villageName ?? 'Seçili köy' } : null}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              filterOptions={(x) => x}
              onInputChange={(_, q) => searchVillages(q)}
              onChange={(_, v) => set({ villageId: v?.id, villageName: v?.label.split(' · ')[0] })}
              renderInput={(p) => <TextField {...p} size="small" label="Köy ara" sx={inputSx} />}
              noOptionsText="En az 2 harf yaz"
            />
            <Autocomplete
              options={familyOptions}
              value={f.familyId ? { id: Number(f.familyId), label: f.familyName ?? 'Seçili sülale' } : null}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              filterOptions={(x) => x}
              onInputChange={(_, q) => searchFamilies(q)}
              onChange={(_, v) => set({ familyId: v ? String(v.id) : undefined, familyName: v?.label })}
              renderInput={(p) => <TextField {...p} size="small" label="Sülale ara" sx={inputSx} />}
              noOptionsText="En az 2 harf yaz"
            />
          </Box>
          <FormControlLabel
            control={<Checkbox checked={!!f.villageVerified} onChange={(e) => set({ villageVerified: e.target.checked || undefined })} />}
            label="Yalnız konumu teyitli köyler"
          />
        </Section>

        <Section title="Şu anki konum">
          <TextField select size="small" label="İl seç" value={f.currentCity ?? ''} sx={inputSx}
            onChange={(e) => set({ currentCity: e.target.value || undefined })}>
            <MenuItem value="">Tümü</MenuItem>
            {TR_CITIES.map((c) => (
              <MenuItem key={c} value={c}>{c}</MenuItem>
            ))}
          </TextField>
          <FormControlLabel
            disabled
            control={<Checkbox />}
            label="Yalnız NartLive konumu açık olanlar (yakında)"
          />
          <Typography sx={{ fontSize: 12.5, color: au.muted }}>
            Konum yalnız il düzeyinde filtrelenir. Anlık koordinat bu ekranda görünmez.
          </Typography>
        </Section>

        <Section title="Profil">
          <Box role="radiogroup" aria-label="Fotoğraf" sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 0.5, bgcolor: au.page, borderRadius: '12px', p: 0.5 }}>
            {([['', 'Fark etmez'], ['yes', 'Fotoğraf var'], ['no', 'Fotoğraf yok']] as const).map(([k, l]) => {
              const on = (f.photo ?? '') === k;
              return (
                <Box key={k} component="button" type="button" role="radio" aria-checked={on}
                  onClick={() => set({ photo: (k || undefined) as UserFilters['photo'] })}
                  sx={{ height: 40, border: 0, borderRadius: '9px', cursor: 'pointer', font: 'inherit', bgcolor: on ? au.primary : 'transparent', color: on ? '#fff' : au.text, fontWeight: on ? 700 : 400 }}>
                  {l}
                </Box>
              );
            })}
          </Box>
          <Box>
            <Stack direction="row" justifyContent="space-between" sx={{ fontSize: 13.5 }}>
              <Typography sx={{ fontWeight: 600, fontSize: 13.5 }}>Profil doluluğu</Typography>
              <Typography sx={{ color: au.primary, fontWeight: 700, fontSize: 13.5 }}>
                {f.minProfile ? `%${f.minProfile} ve üstü` : 'Fark etmez'}
              </Typography>
            </Stack>
            <Slider
              aria-label="En az profil doluluğu"
              value={f.minProfile ?? 0}
              step={10}
              min={0}
              max={100}
              onChange={(_, v) => set({ minProfile: (v as number) || undefined })}
              sx={{ color: au.success }}
            />
          </Box>
          <FormControlLabel disabled control={<Checkbox />} label="Telefonu doğrulı (yakında)" />
          <FormControlLabel control={<Checkbox checked={!!f.hasFamily} onChange={(e) => set({ hasFamily: e.target.checked || undefined })} />} label="Sülale eklemiş" />
          <FormControlLabel control={<Checkbox checked={!!f.hasVillage} onChange={(e) => set({ hasVillage: e.target.checked || undefined })} />} label="Köyünü seçmiş" />
        </Section>

        <Section title="Aktivite">
          <Stack direction="row" flexWrap="wrap" gap={1}>
            {Object.entries(ACTIVITY_LABEL).map(([k, l]) => (
              <Pill key={k} label={l} selected={f.activity === k} onClick={() => set({ activity: f.activity === k ? undefined : (k as UserFilters['activity']) })} />
            ))}
          </Stack>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.25 }}>
            <TextField type="date" size="small" label="Kayıt: başlangıç" InputLabelProps={{ shrink: true }} value={f.createdFrom ?? ''} sx={inputSx}
              onChange={(e) => set({ createdFrom: e.target.value || undefined })} />
            <TextField type="date" size="small" label="Kayıt: bitiş" InputLabelProps={{ shrink: true }} value={f.createdTo ?? ''} sx={inputSx}
              onChange={(e) => set({ createdTo: e.target.value || undefined })} />
          </Box>
        </Section>
      </Stack>

      <Box sx={{ borderTop: `1px solid ${au.borderSoft}`, px: 3, pt: 1.75, pb: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ flex: 1 }} aria-live="polite">
          <Typography sx={{ fontWeight: 800, fontSize: 17 }}>{matched === null ? '…' : matched.toLocaleString('tr-TR')}</Typography>
          <Typography sx={{ fontSize: 12.5, color: au.muted }}>kullanıcı eşleşiyor</Typography>
        </Box>
        <Button variant="outlined" onClick={() => setF({ ...emptyFilters(), q: f.q, sort: f.sort })}
          sx={{ height: 48, borderRadius: '12px', borderColor: au.inputBorder, color: au.text }}>
          Temizle
        </Button>
        <Button variant="contained" onClick={() => onApply(f)} disableElevation
          sx={{ height: 48, px: 3.25, borderRadius: '12px', bgcolor: au.primary, '&:hover': { bgcolor: au.primaryDark }, fontWeight: 700 }}>
          Uygula
        </Button>
      </Box>
    </Drawer>
  );
}
