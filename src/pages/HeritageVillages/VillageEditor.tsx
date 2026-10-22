import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Autocomplete, Box, Button, Checkbox, Chip, CircularProgress, Dialog, DialogContent, DialogTitle, Divider, FormControlLabel,
  IconButton, MenuItem, Stack, Tab, Tabs, TextField, Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useSnackbar } from 'notistack';
import { errorText } from '../../services/heritageReviewService';
import {
  ACTION_LABEL, CONFIDENCE_LABEL, COUNTRIES, PRECISION_LABEL, countryLabel, emptyBody, heritageVillageService,
  type FamilyOption, type GeoCandidate, type Precision, type VillageBody, type VillageCheck, type VillageDetail,
} from '../../services/heritageVillageService';
import GeocodeFinder from './GeocodeFinder';
import PickMap, { type LatLng } from './PickMap';

const toBody = (d: VillageDetail): VillageBody => ({
  officialName: d.official_name, province: d.province, district: d.district, countryCode: d.country_code, adminType: d.admin_type,
  latitude: d.latitude, longitude: d.longitude, precision: d.location_precision, sourceNote: d.location_source_note ?? '',
  duplicateReviewed: false, osmId: d.osm_id ?? '', aliases: d.aliases,
});

const complete = (b: VillageBody) => b.officialName.trim().length >= 2 && b.province.trim() && b.district.trim() && b.latitude != null && b.longitude != null;

/**
 * Köy ekleme / düzenleme penceresi. Yeni köyde önce bilgiler ve konum; kaydedince Çerkesçe ad, sülale ve geçmiş sekmeleri açılır.
 * Konum: haritaya tıkla, iğneyi sürükle ya da "Konumu bul" ile Google/OpenStreetMap'ten çek. Uyarılar kaydetmeden önce canlı gösterilir.
 */
export default function VillageEditor({ villageId, onClose, onChanged }: { villageId: string | 'new'; onClose: () => void; onChanged: () => void }) {
  const { enqueueSnackbar } = useSnackbar();
  const [id, setId] = useState<string | null>(villageId === 'new' ? null : villageId);
  const [detail, setDetail] = useState<VillageDetail | null>(null);
  const [body, setBody] = useState<VillageBody>(emptyBody());
  const [loading, setLoading] = useState(villageId !== 'new');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [check, setCheck] = useState<VillageCheck | null>(null);
  const [focus, setFocus] = useState<LatLng | null>(null);
  const [tab, setTab] = useState(0);

  const load = useCallback(async (target: string) => {
    setLoading(true);
    try {
      const d = await heritageVillageService.detail(target);
      setDetail(d); setBody(toBody(d));
      if (d.latitude != null && d.longitude != null) setFocus({ lat: d.latitude, lng: d.longitude });
    } catch (e) { setError(errorText(e)); } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (id) void load(id); }, [id, load]);

  const set = <K extends keyof VillageBody>(key: K, value: VillageBody[K]) => setBody((b) => ({ ...b, [key]: value, ...(key === 'latitude' || key === 'longitude' || key === 'officialName' ? { duplicateReviewed: false } : {}) }));

  // Canlı kontrol: alanlar tamamlanınca kaydetmeden uyarıları göster.
  useEffect(() => {
    if (!complete(body)) { setCheck(null); return; }
    const t = window.setTimeout(() => {
      heritageVillageService.check(body, id ?? undefined).then(setCheck).catch(() => setCheck(null));
    }, 600);
    return () => window.clearTimeout(t);
  }, [body.officialName, body.province, body.district, body.countryCode, body.latitude, body.longitude, body.osmId, id]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (p: LatLng) => setBody((b) => ({ ...b, latitude: Number(p.lat.toFixed(6)), longitude: Number(p.lng.toFixed(6)), duplicateReviewed: false }));

  const fromCandidate = (c: GeoCandidate) => {
    setBody((b) => {
      const fillArea = !b.province.trim() && !b.district.trim();
      return {
        ...b,
        latitude: Number(c.latitude.toFixed(6)), longitude: Number(c.longitude.toFixed(6)), duplicateReviewed: false,
        officialName: b.officialName.trim() ? b.officialName : c.name,
        countryCode: fillArea && c.countryCode ? c.countryCode : b.countryCode,
        province: fillArea ? c.province : b.province,
        district: fillArea ? c.district : b.district,
        osmId: c.osmId ?? b.osmId,
        sourceNote: b.sourceNote || `Konum: ${c.sourceLabel}${c.address ? ` (${c.address})` : ''}`,
      };
    });
    setFocus({ lat: c.latitude, lng: c.longitude });
  };

  const save = async () => {
    setSaving(true); setError('');
    try {
      if (id) {
        await heritageVillageService.update(id, body);
        enqueueSnackbar('Köy güncellendi.', { variant: 'success' });
        await load(id);
      } else {
        const created = await heritageVillageService.create(body);
        enqueueSnackbar('Köy eklendi. Şimdi Çerkesçe ad ve sülale ekleyebilirsiniz.', { variant: 'success' });
        setId(created.id); setTab(1);
      }
      onChanged();
    } catch (e) { setError(errorText(e)); } finally { setSaving(false); }
  };

  const removeOrRestore = async () => {
    if (!id || !detail) return;
    const removing = detail.status === 'approved';
    if (removing && !window.confirm(`"${detail.official_name}" haritadan ve aramadan kalkacak${detail.memberCount ? `; ${detail.memberCount} kişi bu köyü profiline bağlamış` : ''}. Silinmez, "Kaldırılanlar" listesinden geri alınabilir. Devam edilsin mi?`)) return;
    setSaving(true); setError('');
    try {
      if (removing) await heritageVillageService.remove(id); else await heritageVillageService.restore(id);
      enqueueSnackbar(removing ? 'Köy kaldırıldı.' : 'Köy geri alındı.', { variant: 'success' });
      onChanged();
      await load(id);
    } catch (e) { setError(errorText(e)); } finally { setSaving(false); }
  };

  const point = body.latitude != null && body.longitude != null ? { lat: body.latitude, lng: body.longitude } : null;
  const nearby = useMemo(() => (check?.duplicates ?? []).map((d) => ({ id: d.id, name: `${d.official_name} · ${d.distance_m} m`, lat: d.latitude, lng: d.longitude })), [check]);
  const countries = COUNTRIES.some((c) => c.code === body.countryCode) ? COUNTRIES : [...COUNTRIES, { code: body.countryCode, label: body.countryCode }];
  const isTurkey = body.countryCode === 'TR';
  const removed = detail?.status === 'removed';

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="lg" scroll="paper">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ flex: 1 }}>
          {id ? (detail?.official_name ?? 'Köy') : 'Yeni köy ekle'}
          {detail && <Typography variant="body2" color="text.secondary">{detail.district}, {detail.province} · {countryLabel(detail.country_code)}</Typography>}
        </Box>
        {removed && <Chip color="warning" label="Kaldırılmış" />}
        {detail && <Chip variant="outlined" label={CONFIDENCE_LABEL[detail.confidence] ?? detail.confidence} />}
        <IconButton onClick={onClose} aria-label="Kapat"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {loading ? <Box sx={{ p: 6, textAlign: 'center' }}><CircularProgress /></Box> : (
          <>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Tab label="Bilgiler ve konum" />
              <Tab label="Çerkesçe adlar" disabled={!id} />
              <Tab label="Sülaleler" disabled={!id} />
              <Tab label="Geçmiş" disabled={!id} />
            </Tabs>
            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
            {tab === 0 && (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1.2fr' }, gap: 3 }}>
                <Stack spacing={2}>
                  <TextField label="Köy adı" required value={body.officialName} onChange={(e) => set('officialName', e.target.value)} />
                  <Stack direction="row" spacing={1}>
                    <TextField select label="Ülke" value={body.countryCode} onChange={(e) => set('countryCode', e.target.value)} sx={{ minWidth: 170 }}>
                      {countries.map((c) => <MenuItem key={c.code} value={c.code}>{c.label}</MenuItem>)}
                    </TextField>
                    <TextField select label="Tür" value={body.adminType} onChange={(e) => set('adminType', e.target.value as VillageBody['adminType'])} fullWidth>
                      <MenuItem value="village">Köy</MenuItem>
                      <MenuItem value="neighbourhood">Mahalle</MenuItem>
                    </TextField>
                  </Stack>
                  <TextField label={isTurkey ? 'İl' : 'Bölge / il'} required value={body.province} onChange={(e) => set('province', e.target.value)} />
                  <TextField label={isTurkey ? 'İlçe' : 'Belediye / ilçe'} required value={body.district} onChange={(e) => set('district', e.target.value)}
                    helperText={isTurkey ? undefined : 'Türkiye dışında sınır kontrolü yapılmaz; yalnız yakındaki aynı köy kontrolü çalışır.'} />
                  <Autocomplete multiple freeSolo options={[]} value={body.aliases} onChange={(_, v) => set('aliases', v as string[])}
                    renderTags={(v, getTagProps) => v.map((o, i) => <Chip size="small" label={o} {...getTagProps({ index: i })} key={o} />)}
                    renderInput={(p) => <TextField {...p} label="Takma adlar / eski adlar" helperText="Yazıp Enter'a basın. Aramada bu adlarla da bulunur." />} />
                  <TextField select label="Konum hassasiyeti" value={body.precision} onChange={(e) => set('precision', e.target.value as Precision)}
                    helperText={body.precision === 'HISTORICAL' ? 'Tarihî konum haritada görünmez; köy sayfasında yazıyla anılır.' : 'Bilinmiyorsa "Yaklaşık" bırakın.'}>
                    {(Object.keys(PRECISION_LABEL) as Precision[]).map((k) => <MenuItem key={k} value={k}>{PRECISION_LABEL[k]}</MenuItem>)}
                  </TextField>
                  <TextField label="Konum kaynağı notu" value={body.sourceNote} onChange={(e) => set('sourceNote', e.target.value)} multiline minRows={2}
                    helperText="Örnek: Google Haritalar, köy muhtarlığı, dernek kaydı. Boşsa 'Admin panelinden elle girildi' yazılır." />
                </Stack>
                <Stack spacing={2}>
                  <GeocodeFinder query={[body.officialName].filter(Boolean).join(' ')} province={body.province} district={body.district} country={body.countryCode} onPick={fromCandidate} />
                  <PickMap point={point} nearby={nearby} focus={focus} onPick={pick} />
                  <Stack direction="row" spacing={1}>
                    <TextField size="small" label="Enlem" type="number" value={body.latitude ?? ''} onChange={(e) => set('latitude', e.target.value === '' ? null : Number(e.target.value))} inputProps={{ step: 'any' }} />
                    <TextField size="small" label="Boylam" type="number" value={body.longitude ?? ''} onChange={(e) => set('longitude', e.target.value === '' ? null : Number(e.target.value))} inputProps={{ step: 'any' }} />
                  </Stack>
                  <Typography variant="caption" color="text.secondary">Haritaya tıklayarak ya da iğneyi sürükleyerek konumu belirleyin.</Typography>
                  <CheckPanel check={check} body={body} onDistrict={(province, district) => setBody((b) => ({ ...b, province, district }))} onReviewed={(v) => set('duplicateReviewed', v)} />
                </Stack>
              </Box>
            )}
            {tab === 1 && id && detail && <NamesTab detail={detail} onChange={() => { void load(id); onChanged(); }} />}
            {tab === 2 && id && detail && <FamiliesTab detail={detail} onChange={() => { void load(id); onChanged(); }} />}
            {tab === 3 && detail && <LogTab detail={detail} />}
          </>
        )}
      </DialogContent>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 2 }}>
        {detail && (
          <Button color={removed ? 'primary' : 'error'} onClick={() => void removeOrRestore()} disabled={saving}>{removed ? 'Geri al' : 'Köyü kaldır'}</Button>
        )}
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose}>Kapat</Button>
        {tab === 0 && (
          <Button variant="contained" onClick={() => void save()} disabled={saving || !complete(body)}>
            {saving ? 'Kaydediliyor…' : id ? 'Değişiklikleri kaydet' : 'Köyü ekle'}
          </Button>
        )}
      </Box>
    </Dialog>
  );
}

function CheckPanel({ check, body, onDistrict, onReviewed }: {
  check: VillageCheck | null; body: VillageBody; onDistrict: (province: string, district: string) => void; onReviewed: (v: boolean) => void;
}) {
  if (!check) return null;
  const has = (f: string) => check.flags.includes(f);
  const other = check.pointDistricts.filter((d) => d.province !== body.province || d.district !== body.district);
  return (
    <Stack spacing={1}>
      {has('outside_country') && <Alert severity="error">Nokta Türkiye sınırları dışında. Köy başka bir ülkedeyse ülkeyi değiştirin; değilse noktayı düzeltin.</Alert>}
      {has('water') && <Alert severity="warning">Nokta deniz ya da göl üzerinde görünüyor. Tarihî (su altında kalmış) bir konumsa hassasiyeti "Tarihî" seçin, değilse noktayı kaydırın.</Alert>}
      {has('outside_district') && (
        <Alert severity="warning" action={other.length === 1 ? <Button size="small" onClick={() => onDistrict(other[0].province, other[0].district)}>Düzelt</Button> : undefined}>
          Nokta seçtiğiniz ilçenin sınırları dışında.{other.length > 0 && ` Noktanın bulunduğu yer: ${other.map((d) => `${d.district}, ${d.province}`).join(' / ')}.`} Kayıt yine yapılabilir.
        </Alert>
      )}
      {has('pending_duplicate') && <Alert severity="info">Bu köy için bekleyen bir katkı var (Köy Konumları masası). Çift kayıt olmaması için önce oradan bakın.</Alert>}
      {has('moved_over_3km') && <Alert severity="info">Nokta, eşleşen yerleşim kaydından 3 km'den fazla uzakta.</Alert>}
      {has('possible_duplicate') && (
        <Alert severity="warning">
          <Typography fontWeight={600}>Yakında aynı köy olabilir:</Typography>
          {check.duplicates.map((d) => <div key={d.id}>{d.official_name} · {d.district}, {d.province} · {d.distance_m} m</div>)}
          <FormControlLabel control={<Checkbox checked={body.duplicateReviewed} onChange={(e) => onReviewed(e.target.checked)} />} label="Farklı bir köy, yine de kaydet" />
        </Alert>
      )}
      {check.flags.length === 0 && <Alert severity="success">{check.geoChecked === false ? 'Yakında aynı adlı kayıt yok.' : 'Konum kontrolleri temiz: sınır, ilçe ve tekrar kontrolü geçti.'}</Alert>}
    </Stack>
  );
}

function NamesTab({ detail, onChange }: { detail: VillageDetail; onChange: () => void }) {
  const { enqueueSnackbar } = useSnackbar();
  const [name, setName] = useState('');
  const [script, setScript] = useState<'latin' | 'cyrillic'>('latin');
  const [busy, setBusy] = useState(false);
  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); onChange(); } catch (e) { enqueueSnackbar(errorText(e), { variant: 'error' }); } finally { setBusy(false); }
  };
  const active = detail.names.filter((n) => n.status === 'approved');
  return (
    <Stack spacing={2}>
      <Typography color="text.secondary">Köyün Çerkesçe ya da eski adları. Köy sayfasında ve aramada görünür; takma adlardan farkı, yazı türünün (Latin / Kiril) bilinmesidir.</Typography>
      <Stack direction="row" spacing={1}>
        <TextField size="small" label="Ad" value={name} onChange={(e) => setName(e.target.value)} fullWidth />
        <TextField size="small" select label="Yazı" value={script} onChange={(e) => setScript(e.target.value as 'latin' | 'cyrillic')} sx={{ minWidth: 130 }}>
          <MenuItem value="latin">Latin</MenuItem>
          <MenuItem value="cyrillic">Kiril</MenuItem>
        </TextField>
        <Button variant="contained" disabled={busy || name.trim().length < 2} onClick={() => void act(async () => { await heritageVillageService.addName(detail.id, name.trim(), script); setName(''); })}>Ekle</Button>
      </Stack>
      <Divider />
      {active.length === 0 && <Typography color="text.secondary">Henüz ad yok.</Typography>}
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {active.map((n) => (
          <Chip key={n.id} label={`${n.name} · ${n.script === 'cyrillic' ? 'Kiril' : 'Latin'}${n.trust === 'pending' ? ' · teyit bekliyor' : n.trust === 'disputed' ? ' · tartışmalı' : ''}`}
            onDelete={() => void act(() => heritageVillageService.removeName(detail.id, n.id))} />
        ))}
      </Stack>
    </Stack>
  );
}

function FamiliesTab({ detail, onChange }: { detail: VillageDetail; onChange: () => void }) {
  const { enqueueSnackbar } = useSnackbar();
  const [options, setOptions] = useState<FamilyOption[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (input.trim().length < 2) { setOptions([]); return; }
    const t = window.setTimeout(() => { heritageVillageService.searchFamilies(input.trim()).then(setOptions).catch(() => setOptions([])); }, 300);
    return () => window.clearTimeout(t);
  }, [input]);

  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); onChange(); } catch (e) { enqueueSnackbar(errorText(e), { variant: 'error' }); } finally { setBusy(false); }
  };
  const active = detail.families.filter((f) => f.status === 'approved');
  return (
    <Stack spacing={2}>
      <Typography color="text.secondary">Bu köyde yaşayan (ya da yaşamış) sülaleler. Listede olmayan yeni bir sülale için önce Sülale Atlası'nda kayıt açılmalı.</Typography>
      <Autocomplete<FamilyOption> options={options} inputValue={input} onInputChange={(_, v) => setInput(v)} value={null} disabled={busy}
        getOptionLabel={(o) => `${o.family_name} (${o.race})`} filterOptions={(o) => o} noOptionsText={input.trim().length < 2 ? 'En az 2 harf yazın' : 'Sülale bulunamadı'}
        onChange={(_, v) => { if (v) { setInput(''); void act(() => heritageVillageService.addFamily(detail.id, v.id)); } }}
        renderInput={(p) => <TextField {...p} size="small" label="Sülale ara ve ekle" />} />
      <Divider />
      {active.length === 0 && <Typography color="text.secondary">Bu köye bağlı sülale yok.</Typography>}
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {active.map((f) => (
          <Chip key={f.id} label={`${f.name}${f.trust === 'pending' ? ' · teyit bekliyor' : f.trust === 'disputed' ? ' · tartışmalı' : ''}`}
            onDelete={() => { if (window.confirm(`"${f.name}" bu köyden kaldırılsın mı?`)) void act(() => heritageVillageService.removeFamily(detail.id, f.id)); }} />
        ))}
      </Stack>
    </Stack>
  );
}

function LogTab({ detail }: { detail: VillageDetail }) {
  if (detail.log.length === 0) return <Typography color="text.secondary">Panelden yapılmış bir değişiklik yok.</Typography>;
  return (
    <Stack spacing={1}>
      {detail.log.map((l) => (
        <Box key={l.id} sx={{ display: 'flex', gap: 2, alignItems: 'baseline' }}>
          <Typography variant="body2" color="text.secondary" sx={{ minWidth: 150 }}>{new Date(l.created_at).toLocaleString('tr-TR')}</Typography>
          <Typography fontWeight={600}>{ACTION_LABEL[l.action] ?? l.action}</Typography>
          <Typography variant="body2" color="text.secondary">{l.admin_name ?? 'Bilinmiyor'}</Typography>
        </Box>
      ))}
    </Stack>
  );
}
