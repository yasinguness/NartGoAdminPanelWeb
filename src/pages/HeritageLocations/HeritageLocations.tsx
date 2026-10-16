import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Divider, FormControl, InputLabel,
  LinearProgress, MenuItem, Paper, Select, Stack, TextField, Typography,
} from '@mui/material';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { heritageReviewService, type HeritageDecision, type ReviewContribution } from '../../services/heritageReviewService';

const REASONS: Record<string, string> = {
  DISTRICT_MISMATCH: 'İlçe uyuşmazlığı', NEAR_DUPLICATE: 'Yakın tekrar',
  BOUNDARY_OR_WATER: 'Sınır ya da su', MEDIUM_CONFIDENCE: 'Orta güven',
  MERGE_SUGGESTION: 'Birleştirme önerisi', MISSING_LOCATION: 'Konumsuz köy',
  COMMUNITY_SUGGESTION: 'Topluluk önerisi',
};
const FLAG_REASON: Record<string, string> = {
  outside_district: 'DISTRICT_MISMATCH', source_district_mismatch: 'DISTRICT_MISMATCH',
  possible_duplicate: 'NEAR_DUPLICATE', pending_duplicate: 'NEAR_DUPLICATE',
  moved_over_3km: 'BOUNDARY_OR_WATER', medium: 'MEDIUM_CONFIDENCE',
  outside_country: 'BOUNDARY_OR_WATER', water: 'BOUNDARY_OR_WATER',
  medium_confidence: 'MEDIUM_CONFIDENCE', merge_suggested: 'MERGE_SUGGESTION',
  community_suggestion: 'COMMUNITY_SUGGESTION', missing_location: 'MISSING_LOCATION',
};
const SATELLITE_URL = import.meta.env.VITE_HERITAGE_SATELLITE_URL as string | undefined;
const SATELLITE_ATTRIBUTION = import.meta.env.VITE_HERITAGE_SATELLITE_ATTRIBUTION as string | undefined;

type Place = { id?: string; osm_id?: string; official_name?: string; name?: string; latitude?: number; longitude?: number; district?: string; village_id?: string | null; source?: string; distanceKm?: number; distance_km?: number };
type Point = { lat: number; lon: number };
const candidateKey = (place: Place, index: number) => String(place.id ?? place.osm_id ?? `candidate-${index}`);

function asPoint(item: ReviewContribution): Point | null {
  const p = item.location ?? item.payload?.reviewed_payload ?? item.payload ?? {};
  const lat = Number(p.latitude ?? item.latitude); const lon = Number(p.longitude ?? item.longitude);
  return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? { lat, lon } : null;
}
function locationPayload(item: ReviewContribution) {
  const payload = item.payload ?? {};
  const p = payload.reviewed_payload ?? payload;
  if (!Object.keys(p).length) return item;
  return {
    ...p,
    province: p.province ?? item.province,
    district: p.district ?? item.district,
    official_name: p.official_name ?? item.official_name,
  };
}
function reasonKeys(item: ReviewContribution): string[] {
  const p = locationPayload(item);
  const flags: string[] = p.location_checks?.flags ?? p.flags ?? [];
  const declared = Array.isArray(item.reasons) ? item.reasons : Array.isArray(item.reason) ? item.reason : [item.reason].filter(Boolean);
  const mapped = [...flags, ...declared].map((f) => FLAG_REASON[String(f)] ?? (REASONS[String(f)] ? String(f) : undefined)).filter(Boolean) as string[];
  const seed = p.seed_record ?? {};
  if (seed.guven && seed.guven !== 'yüksek') mapped.push('MEDIUM_CONFIDENCE');
  if (!asPoint(item)) mapped.push('MISSING_LOCATION');
  if (item.type === 'village' || item.contributionType === 'village' || item.origin === 'community') mapped.push('COMMUNITY_SUGGESTION');
  if (item.mergeCandidates?.length) mapped.push('MERGE_SUGGESTION');
  if (mapped.length === 0) mapped.push(item.type === 'village' || item.contributionType === 'village' ? 'COMMUNITY_SUGGESTION' : 'MISSING_LOCATION');
  return [...new Set(mapped)];
}
function errorText(error: any) {
  return error?.response?.data?.message ?? error?.message ?? 'İstek tamamlanamadı.';
}

export default function HeritageLocations() {
  const [items, setItems] = useState<ReviewContribution[]>([]);
  const [initialCount, setInitialCount] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [provinceFilter, setProvinceFilter] = useState('');
  const [reasonFilter, setReasonFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [draft, setDraft] = useState<Record<string, any> | null>(null);
  const [checks, setChecks] = useState<any>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [districts, setDistricts] = useState<{ name: string }[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyRecord, setHistoryRecord] = useState<{ id: string; name: string } | null>(null);
  const [lastDecision, setLastDecision] = useState<{ id: string; name: string; auditId?: string } | null>(null);
  const [satellite, setSatellite] = useState(false);
  const [manualPoint, setManualPoint] = useState<Point | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  const [correctedDistrict, setCorrectedDistrict] = useState('');
  const [mergeTargetId, setMergeTargetId] = useState('');
  const [retainedName, setRetainedName] = useState('');
  const [separatePairId, setSeparatePairId] = useState('');
  const [duplicateResolutions, setDuplicateResolutions] = useState<Record<string, 'MERGE' | 'DISTINCT'>>({});
  const mapHost = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  const loadQueue = useCallback(async (preserveId?: string | null) => {
    setLoading(true); setError(null);
    try {
      const result = await heritageReviewService.getQueue();
      const villageItems = result.filter((item) => item.type === 'village'
        || ['location', 'location_review', 'heritage_location', 'seed_location'].includes(String(item.type ?? '').toLowerCase())
        || (item.type === 'correction' && (item.payload?.target_type === 'village' || item.payload?.seed_record))
        || (item.type === 'removal' && item.payload?.target_type === 'village')
        || (!item.type && Boolean(item.reason || item.reasons || item.location)));
      setInitialCount((count) => count || villageItems.length);
      setItems(villageItems);
      const nextId = preserveId && villageItems.some((item) => item.id === preserveId)
        ? preserveId : villageItems[0]?.id ?? null;
      setSelectedId(nextId);
    } catch (e) { setError(errorText(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadQueue(); }, [loadQueue]);
  const selected = useMemo(() => items.find((item) => item.id === selectedId) ?? null, [items, selectedId]);
  const activePayload = useMemo(() => selected ? locationPayload(selected) : null, [selected]);
  const province = String(draft?.province ?? activePayload?.province ?? '');
  const district = String(draft?.district ?? activePayload?.district ?? '');
  const point = manualPoint ?? (selected ? asPoint(selected) : null);
  const candidateRows = useMemo(() => {
    const provided = selected?.candidates ?? [];
    return [...provided, ...places].filter((place) => Number.isFinite(Number(place.latitude)) && Number.isFinite(Number(place.longitude)));
  }, [places, selected]);

  const filteredItems = useMemo(() => items.filter((item) => {
    const p = locationPayload(item);
    return (!provinceFilter || p.province === provinceFilter)
      && (!reasonFilter || reasonKeys(item).includes(reasonFilter));
  }), [items, provinceFilter, reasonFilter]);
  const provinces = useMemo(() => [...new Set(items.map((item) => String(locationPayload(item).province ?? '')).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr')), [items]);
  const reasonCounts = useMemo(() => Object.keys(REASONS).map((key) => ({ key, count: items.filter((item) => reasonKeys(item).includes(key)).length })), [items]);
  const selectedIndex = filteredItems.findIndex((item) => item.id === selectedId);

  useEffect(() => {
    if (!selected) { setDraft(null); setChecks(null); setPlaces([]); setManualPoint(null); return; }
    setDraft({ ...locationPayload(selected) }); setNote(''); setChecks(null); setPlaces([]); setManualPoint(null);
    setSelectedCandidateId(''); setMergeTargetId(''); setSeparatePairId(''); setDuplicateResolutions({});
    setRetainedName(String(locationPayload(selected).official_name ?? selected.official_name ?? ''));
    const pointDistrict = typeof selected.pointDistrict === 'string' ? selected.pointDistrict : selected.pointDistrict?.district;
    setCorrectedDistrict(pointDistrict || String(locationPayload(selected).district ?? ''));
    let alive = true;
    const pointNow = asPoint(selected);
    if (pointNow) {
      heritageReviewService.checkLocation({ ...locationPayload(selected), latitude: pointNow.lat, longitude: pointNow.lon })
        .then((result) => {
          if (!alive) return;
          setChecks(result);
          const detected = result?.pointDistrict?.district ?? result?.point_district?.district ?? result?.districtAtPoint;
          if (detected) setCorrectedDistrict(String(detected));
        }).catch((e) => { if (alive) setChecks({ error: errorText(e), flags: [] }); });
    }
    return () => { alive = false; };
  }, [selected]);

  useEffect(() => {
    if (!selected || !province) { setDistricts([]); return; }
    let alive = true;
    heritageReviewService.regions(province).then((data) => { if (alive) setDistricts(data); }).catch(() => { if (alive) setDistricts([]); });
    return () => { alive = false; };
  }, [selected, province]);

  useEffect(() => {
    if (!selected || !province || !district) { setPlaces([]); return; }
    let alive = true;
    const q = String(draft?.official_name ?? selected.official_name ?? '').trim();
    if (q.length < 2) return;
    const timer = window.setTimeout(() => {
      heritageReviewService.searchPlaces(province, district, q).then((data) => { if (alive) setPlaces(data); }).catch(() => { if (alive) setPlaces([]); });
    }, 250);
    return () => { alive = false; window.clearTimeout(timer); };
  }, [selected, province, district, draft?.official_name]);

  useEffect(() => {
    if (!mapHost.current || mapRef.current) return;
    const map = L.map(mapHost.current, { center: [point?.lat ?? 39, point?.lon ?? 35], zoom: 7 });
    map.on('click', (event) => {
      const next = { lat: event.latlng.lat, lon: event.latlng.lng };
      setManualPoint(next);
      setDraft((current) => current ? { ...current, latitude: next.lat, longitude: next.lon, osm_id: undefined } : current);
    });
    mapRef.current = map;
    layersRef.current = L.layerGroup().addTo(map);
    return () => { map.remove(); mapRef.current = null; layersRef.current = null; markersRef.current = []; };
  // Leaflet owns the map lifecycle; data changes are handled by the layer effect below.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(selected)]);

  useEffect(() => {
    const map = mapRef.current; const layers = layersRef.current;
    if (!map || !layers) return;
    map.eachLayer((layer) => { if (layer instanceof L.TileLayer) map.removeLayer(layer); });
    if (satellite && SATELLITE_URL && SATELLITE_ATTRIBUTION) {
      L.tileLayer(SATELLITE_URL, { attribution: SATELLITE_ATTRIBUTION, maxZoom: 19 }).addTo(map);
    } else {
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors', maxZoom: 19 }).addTo(map);
    }
    layers.clearLayers(); markersRef.current = [];
    const addBoundary = (geometry: any, color: string, name: string) => {
      if (!geometry) return;
      try {
        const parsed = typeof geometry === 'string' ? JSON.parse(geometry) : geometry;
        L.geoJSON(parsed, { style: { color, weight: 2, fillColor: color, fillOpacity: 0.04, dashArray: '5 4' } })
          .bindTooltip(name).addTo(layers);
      } catch { /* Ignore malformed optional geometry and keep the review map usable. */ }
    };
    addBoundary(selected?.districtBoundary ?? selected?.boundaries?.recordDistrict, '#7b1fa2', `Kayıt ilçesi: ${activePayload?.district ?? ''}`);
    addBoundary(selected?.pointDistrictBoundary ?? selected?.boundaries?.pointDistrict, '#00838f', `Noktanın ilçesi: ${checks?.pointDistrict?.district ?? ''}`);
    const seedRecord = activePayload?.seed_record ?? {};
    if (Number.isFinite(Number(seedRecord.enlem)) && Number.isFinite(Number(seedRecord.boylam))) {
      L.circleMarker([Number(seedRecord.enlem), Number(seedRecord.boylam)], { radius: 7, color: '#00897b', fillColor: '#4db6ac', fillOpacity: 0.9, weight: 2 })
        .bindTooltip(`${seedRecord.geonames_adi ?? 'GeoNames adayı'} · GeoNames`).addTo(layers);
    }
    candidateRows.forEach((place) => {
      const marker = L.circleMarker([Number(place.latitude), Number(place.longitude)], { radius: 7, color: '#1565c0', fillColor: '#42a5f5', fillOpacity: 0.9, weight: 2 });
      const sourceName = place.source ?? (place.osm_id ? 'OSM' : 'Aday');
      marker.bindTooltip(`${place.official_name ?? place.name ?? 'Konum adayı'} · ${sourceName}`);
      marker.on('click', () => {
        const next = { lat: Number(place.latitude), lon: Number(place.longitude) };
        setManualPoint(next);
        setDraft((current) => current ? { ...current, latitude: next.lat, longitude: next.lon, osm_id: place.osm_id } : current);
      });
      marker.addTo(layers);
    });
    [...(selected?.nearbyVillages ?? []), ...(checks?.duplicates ?? [])].forEach((village: any) => {
      if (village.latitude == null || village.longitude == null) return;
      L.circleMarker([Number(village.latitude), Number(village.longitude)], { radius: 8, color: '#ef6c00', fillColor: '#ffb74d', fillOpacity: 0.9, weight: 2 })
        .bindTooltip(`${village.official_name ?? 'Yakındaki köy'} · mevcut kayıt`).addTo(layers);
    });
    if (point) {
      const marker = L.marker([point.lat, point.lon], { draggable: true, icon: L.divIcon({ className: 'heritage-village-pin', html: '<span></span>', iconSize: [24, 24], iconAnchor: [12, 12] }) });
      marker.on('dragend', () => {
        const moved = marker.getLatLng(); const next = { lat: moved.lat, lon: moved.lng };
        setManualPoint(next); setDraft((current) => current ? { ...current, latitude: moved.lat, longitude: moved.lng, osm_id: undefined } : current);
        heritageReviewService.checkLocation({ ...(draft ?? {}), latitude: moved.lat, longitude: moved.lng }).then(setChecks).catch((e) => setChecks({ error: errorText(e), flags: [] }));
      });
      marker.bindTooltip('Köyün mevcut noktası · sürükleyerek taşı'); marker.addTo(layers); markersRef.current.push(marker);
      map.setView([point.lat, point.lon], Math.max(map.getZoom(), 9));
    }
  // The map is a mutable Leaflet instance; redraw when its data inputs change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [point?.lat, point?.lon, candidateRows, checks, satellite, selectedId, activePayload, selected]);

  const openHistory = async (recordId = selected?.id, recordName = oldName) => {
    if (!recordId) return;
    setHistoryRecord({ id: recordId, name: recordName });
    setHistoryOpen(true); setHistory([]);
    try {
      const rows = await heritageReviewService.getHistory(recordId);
      setHistory(rows.sort((a: any, b: any) => String(b.createdAt ?? b.reviewed_at ?? '').localeCompare(String(a.createdAt ?? a.reviewed_at ?? ''))));
    } catch (e) { setError(errorText(e)); }
  };

  const goNext = () => {
    if (!filteredItems.length) return;
    setSelectedId(filteredItems[Math.min(selectedIndex < 0 ? 0 : selectedIndex + 1, filteredItems.length - 1)].id);
  };
  const skip = () => goNext();
  const decide = async (decision: HeritageDecision, extra: Record<string, any> = {}, recordOverride?: Record<string, any>) => {
    if (!selected || busy || !draft) return;
    if (decision === 'APPROVE' && unresolvedDuplicates.length) { setError('Onaydan önce her yakın tekrar için “Aynı köy” ya da “Farklı köy” seçin.'); return; }
    if (decision === 'REJECT' && !note.trim()) { setError('Reddetmek için neden yazılması zorunludur.'); return; }
    if (decision === 'MERGE' && !mergeTargetId) { setError('Birleştirilecek kayıt seçin.'); return; }
    if (decision === 'MARK_SEPARATE' && !separatePairId) { setError('Ayrı köy olarak işaretlenecek tekrar çiftini seçin.'); return; }
    setBusy(true); setError(null);
    try {
      const revised = { ...(recordOverride ?? draft) };
      const resolvedPairs = Object.entries(duplicateResolutions).map(([relatedId, type]) => ({ relatedId, type, ...(type === 'MERGE' ? { keepId: selected.village_id ?? relatedId } : {}) }));
      const resolutionTypes = new Set(resolvedPairs.map((resolution) => resolution.type));
      const duplicateResolution = resolutionTypes.size === 1 ? {
        type: resolvedPairs[0]?.type,
        relatedIds: resolvedPairs.map((resolution) => resolution.relatedId),
        ...(resolvedPairs[0]?.keepId ? { keepId: resolvedPairs[0].keepId } : {}),
      } : undefined;
      const result = await heritageReviewService.applyDecision(selected, decision, {
        note: note.trim(),
        record: revised,
        duplicateResolution,
        duplicateResolutions: resolvedPairs.length ? resolvedPairs : undefined,
        ...extra,
      });
      setLastDecision({ id: selected.id, name: oldName, auditId: result?.auditId ?? result?.audit_id });
      const oldIndex = selectedIndex;
      const remaining = filteredItems.filter((item) => item.id !== selected.id);
      setItems((current) => current.filter((item) => item.id !== selected.id));
      setSelectedId(remaining[Math.min(oldIndex, remaining.length - 1)]?.id ?? null);
      setManualPoint(null); setNote(''); setHistoryOpen(false);
    } catch (e) { setError(errorText(e)); }
    finally { setBusy(false); }
  };

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest('input,textarea,select,button,a,[contenteditable="true"],[role="dialog"]')) return;
      if (event.key.toLowerCase() === 's') { event.preventDefault(); skip(); }
      if (event.key.toLowerCase() === 'a' && selected && !busy) { event.preventDefault(); void decide('APPROVE'); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, busy, selectedIndex, filteredItems, note, draft]);

  const seed = activePayload?.seed_record ?? {};
  const reasons = selected ? reasonKeys(selected) : [];
  const oldName = String(activePayload?.official_name ?? selected?.official_name ?? '');
  const sourceRows = selected?.sources ?? activePayload?.sources ?? seed.kaynaklar ?? [];
  const sourceText = (Array.isArray(sourceRows) ? sourceRows : [sourceRows]).map((row: any) => typeof row === 'string' ? row : [row.name, row.source, row.url].filter(Boolean).join(' · ')).filter(Boolean).join(' · ');
  const validationRows = checks?.controls ?? checks?.checks ?? selected?.checks ?? activePayload?.checks ?? [];
  const possibleMerges = selected?.mergeCandidates ?? checks?.duplicates ?? [];
  const duplicatePairs = selected?.duplicatePairs ?? checks?.duplicates ?? [];
  const unresolvedDuplicates = duplicatePairs.filter((row: any) => !duplicateResolutions[String(row.id ?? row.village_id)]);
  const updatePoint = (axis: 'latitude' | 'longitude', value: string) => {
    if (!draft || value === '' || !Number.isFinite(Number(value))) return;
    const next = { ...draft, [axis]: Number(value), osm_id: undefined };
    setDraft(next);
    const lat = Number(next.latitude); const lon = Number(next.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) setManualPoint({ lat, lon });
  };
  const applyCandidate = (place: Place) => {
    if (place.latitude == null || place.longitude == null || !draft) return;
    const next = { ...draft, latitude: Number(place.latitude), longitude: Number(place.longitude), osm_id: place.osm_id };
    const index = candidateRows.indexOf(place);
    setDraft(next); setManualPoint({ lat: next.latitude, lon: next.longitude }); setSelectedCandidateId(candidateKey(place, index));
  };
  const moveToCandidateAndApprove = async () => {
    const candidate = candidateRows.find((row, index) => candidateKey(row, index) === selectedCandidateId);
    if (!draft || !candidate || candidate.latitude == null || candidate.longitude == null) {
      setError('Bu adla kullanılabilir OSM adayı bulunamadı.'); return;
    }
    const revised = { ...draft, latitude: Number(candidate.latitude), longitude: Number(candidate.longitude), osm_id: candidate.osm_id };
    setDraft(revised); setManualPoint({ lat: revised.latitude, lon: revised.longitude });
    await decide('MOVE_CANDIDATE_AND_APPROVE', { candidateId: candidate.id ?? candidate.osm_id }, revised);
  };
  const manualMoveAndApprove = () => {
    if (!manualPoint || !draft) return;
    void decide('MOVE_MANUAL_AND_APPROVE', { point: { latitude: manualPoint.lat, longitude: manualPoint.lon } });
  };
  const correctDistrictAndApprove = () => {
    if (!draft) return;
    const revised = { ...draft, district: correctedDistrict };
    void decide('CORRECT_DISTRICT_AND_APPROVE', {
      district: correctedDistrict,
      previousDistrict: activePayload?.district,
      previousName: activePayload?.official_name ?? selected?.official_name,
      preserveOldNameAsAlias: true,
    }, revised);
  };
  const undoChange = async (recordId: string, auditId: string) => {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      await heritageReviewService.undo(recordId, auditId);
      setLastDecision(null);
      await loadQueue(selectedId);
      if (historyRecord?.id === recordId) setHistory(await heritageReviewService.getHistory(recordId));
    } catch (e) { setError(errorText(e)); }
    finally { setBusy(false); }
  };

  return (
    <Box sx={{ pb: 3 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} justifyContent="space-between" spacing={1} sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={750}>Köy konumu inceleme</Typography>
          <Typography variant="body2" color="text.secondary">Bekleyen köy kayıtlarını harita ve kaynak kanıtlarıyla inceleyin.</Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip label={`${items.length ? selectedIndex + 1 : 0} / ${filteredItems.length} · toplam ${items.length}`} color="primary" variant="outlined" />
          {lastDecision && <>
            <Button size="small" onClick={() => void openHistory(lastDecision.id, lastDecision.name)}>Son kararın geçmişi</Button>
            {lastDecision.auditId && <Button size="small" color="warning" disabled={busy} onClick={() => void undoChange(lastDecision.id, lastDecision.auditId!)}>Son kararı geri al</Button>}
          </>}
          <Button size="small" onClick={() => void loadQueue(selectedId)}>Yenile</Button>
        </Stack>
      </Stack>
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 2 }}>
        {reasonCounts.filter((row) => row.count > 0).map((row) => <Chip key={row.key} size="small" clickable color={reasonFilter === row.key ? 'primary' : 'default'} variant={reasonFilter === row.key ? 'filled' : 'outlined'} label={`${REASONS[row.key]} ${row.count}`} onClick={() => setReasonFilter(reasonFilter === row.key ? '' : row.key)} />)}
        <Box sx={{ width: { xs: '100%', sm: 180 }, px: 1 }}>
          <Stack direction="row" justifyContent="space-between"><Typography variant="caption">İlerleme</Typography><Typography variant="caption">{Math.max(initialCount - items.length, 0)} / {initialCount}</Typography></Stack>
          <LinearProgress variant="determinate" value={initialCount ? Math.min(100, Math.max(0, ((initialCount - items.length) / initialCount) * 100)) : 0} />
        </Box>
      </Stack>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      <Stack direction={{ xs: 'column', xl: 'row' }} spacing={2} alignItems="stretch">
        <Paper variant="outlined" sx={{ width: { xs: '100%', xl: 310 }, flexShrink: 0, overflow: 'hidden' }}>
          <Stack spacing={1.5} sx={{ p: 1.5 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>İl</InputLabel><Select label="İl" value={provinceFilter} onChange={(e) => setProvinceFilter(e.target.value)}>
                <MenuItem value="">Tüm iller</MenuItem>{provinces.map((name) => <MenuItem key={name} value={name}>{name}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>Neden</InputLabel><Select label="Neden" value={reasonFilter} onChange={(e) => setReasonFilter(e.target.value)}>
                <MenuItem value="">Tüm nedenler</MenuItem>{Object.entries(REASONS).map(([key, label]) => <MenuItem key={key} value={key}>{label}</MenuItem>)}
              </Select>
            </FormControl>
            <Divider />
          </Stack>
          <Box sx={{ maxHeight: { xl: 'calc(100vh - 330px)' }, overflow: 'auto' }}>
            {loading ? <Box sx={{ display: 'grid', placeItems: 'center', p: 4 }}><CircularProgress size={26} /></Box>
              : filteredItems.length === 0 ? <Typography color="text.secondary" sx={{ p: 2 }}>Bu filtrelerde bekleyen kayıt yok.</Typography>
                : filteredItems.map((item) => {
                  const why = reasonKeys(item); const p = locationPayload(item);
                  return <Box key={item.id} component="button" onClick={() => setSelectedId(item.id)} sx={{ textAlign: 'left', display: 'block', width: '100%', p: 1.5, border: 0, borderTop: '1px solid', borderColor: 'divider', bgcolor: selectedId === item.id ? 'action.selected' : 'transparent', cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}>
                    <Typography fontWeight={700} noWrap>{p.official_name ?? item.official_name ?? p.seed_record?.koy ?? 'Adsız köy'}</Typography>
                    <Typography variant="caption" color="text.secondary">{p.province ?? 'İl bilinmiyor'} / {p.district ?? 'İlçe bilinmiyor'}</Typography>
                    <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mt: 0.7 }}>{why.map((key) => <Chip key={key} size="small" label={REASONS[key] ?? key} />)}</Stack>
                  </Box>;
                })}
          </Box>
        </Paper>

        {!selected ? <Paper variant="outlined" sx={{ flex: 1, p: 4, minHeight: 440 }}><Typography variant="h6">İnceleme kuyruğu hazır</Typography><Typography color="text.secondary">Bekleyen köy katkıları bu listede görünecek. Kayıtlar yüklenmiyorsa API erişimini kontrol edin.</Typography></Paper> : <>
          <Paper variant="outlined" sx={{ flex: 1.35, minWidth: 0, overflow: 'hidden' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 1.5 }}>
              <Box><Typography fontWeight={700}>{draft?.official_name ?? selected.official_name ?? 'Köy konumu'}</Typography><Typography variant="caption" color="text.secondary">{province} / {district}</Typography></Box>
              <Button size="small" onClick={() => setSatellite((value) => !value)} disabled={!SATELLITE_URL || !SATELLITE_ATTRIBUTION}>{satellite ? 'OSM katmanı' : SATELLITE_URL ? 'Uydu katmanı' : 'Uydu yapılandırılmamış'}</Button>
            </Stack>
            <Box ref={mapHost} sx={{ height: { xs: 340, xl: 'calc(100vh - 400px)' }, minHeight: 360, bgcolor: '#e7edf1', '& .heritage-village-pin span': { display: 'block', width: 20, height: 20, border: '3px solid white', borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)', background: '#ba1b1b', boxShadow: '0 1px 5px #333' } }} />
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ p: 1.5 }}>
              <Chip size="small" color="error" label="Mevcut nokta · sürükleyin" />
              <Chip size="small" color="success" label="GeoNames adayı" />
              <Chip size="small" color="info" label="OSM adayları · seçmek için işaretçiye tıklayın" />
              <Chip size="small" color="warning" label="Yakındaki kayıtlar" />
              {selected.districtBoundary && <Chip size="small" variant="outlined" label="Kayıt ilçesi sınırı" />}
              {selected.pointDistrictBoundary && <Chip size="small" variant="outlined" label="Noktanın ilçesi sınırı" />}
              {candidateRows.length === 0 && <Typography variant="caption" color="text.secondary">Benzer adlı OSM adayı bulunamadı.</Typography>}
            </Stack>
            {checks?.error && <Alert severity="warning" sx={{ m: 1 }}>Konum kontrolü: {checks.error}</Alert>}
          </Paper>

          <Paper variant="outlined" sx={{ flex: 1, minWidth: 300, p: 2, maxHeight: { xl: 'calc(100vh - 240px)' }, overflow: 'auto' }}>
            <Typography variant="subtitle1" fontWeight={750} sx={{ mb: 1 }}>Kanıtlar ve karar</Typography>
            <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mb: 1.5 }}>{reasons.map((key) => <Chip key={key} size="small" color="warning" label={REASONS[key] ?? key} />)}</Stack>
            <Typography variant="caption" color="text.secondary">Türkçe ad</Typography><Typography sx={{ mb: 1 }}>{draft?.official_name ?? selected.official_name ?? '—'}</Typography>
            <Typography variant="caption" color="text.secondary">Eski ad</Typography><Typography sx={{ mb: 1 }}>{seed.eski_ad ?? seed.eski_adlar ?? activePayload?.oldName ?? '—'}</Typography>
            <Typography variant="caption" color="text.secondary">Çerkesçe / diğer adlar</Typography><Typography sx={{ mb: 1 }}>{seed.cerkesce_ad ?? seed.adygece_ad ?? seed.cerkesce_veya_eski_adlar ?? activePayload?.circassianName ?? '—'}</Typography>
            <Typography variant="caption" color="text.secondary">Kaynaklar</Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>{[selected.source, sourceText, seed.kaynak, activePayload?.source_note].flat().filter(Boolean).join(' · ') || 'Kayıtta belirtilen kaynak yok'}</Typography>
            {seed.geonames_adi && <Typography variant="body2">GeoNames adayı: {seed.geonames_adi} · {seed.koordinat_kaynagi ?? 'GeoNames'}</Typography>}
            {(seed.gruplar || seed.sulaleler_kaynakta) && <Typography variant="body2" sx={{ mb: 1 }}>Topluluk / sülale kaydı: {[seed.gruplar, seed.sulaleler_kaynakta].filter(Boolean).join(' · ')}</Typography>}
            <Typography variant="caption" color="text.secondary">Doğrulama kontrolleri</Typography>
            <Stack spacing={0.5} sx={{ my: 0.7 }}>
              {validationRows.map((row: any, index: number) => <Alert key={row.id ?? row.code ?? index} severity={row.passed === false || row.status === 'failed' ? 'warning' : 'success'} sx={{ py: 0 }}>
                {row.label ?? row.name ?? row.code ?? 'Kontrol'}: {row.reason ?? row.message ?? (row.passed === false ? 'Başarısız' : 'Geçti')}
              </Alert>)}
              {(checks?.flags ?? activePayload?.location_checks?.flags ?? []).length === 0 ? <Typography variant="body2">İşaretlenmiş kontrol yok veya henüz çalışmadı.</Typography> : (checks?.flags ?? activePayload?.location_checks?.flags ?? []).map((flag: string) => <Alert key={flag} severity={flag.includes('duplicate') ? 'warning' : 'info'} sx={{ py: 0 }}>{FLAG_REASON[flag] ? REASONS[FLAG_REASON[flag]] : flag}</Alert>)}
              {checks?.distance_m != null && <Typography variant="body2">Kaynak noktasına uzaklık: {Math.round(checks.distance_m)} m</Typography>}
              {checks?.duplicates?.map((village: any) => <Typography key={village.id} variant="body2">Yakın kayıt: {village.official_name} · {Math.round(village.distance_m)} m</Typography>)}
              {duplicatePairs.map((village: any) => {
                const relatedId = String(village.id ?? village.village_id);
                const resolution = duplicateResolutions[relatedId];
                return <Paper key={`duplicate-${relatedId}`} variant="outlined" sx={{ p: 1 }}>
                  <Typography variant="body2" fontWeight={700}>Olası tekrar: {village.official_name ?? village.name ?? 'Yakındaki köy'} · {Math.round(Number(village.distance_m ?? village.distance_meters ?? 0))} m</Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 0.75 }}>
                    <Button size="small" variant={resolution === 'MERGE' ? 'contained' : 'outlined'} onClick={() => setDuplicateResolutions((current) => ({ ...current, [relatedId]: 'MERGE' }))}>Aynı köy, birleştir</Button>
                    <Button size="small" variant={resolution === 'DISTINCT' ? 'contained' : 'outlined'} onClick={() => setDuplicateResolutions((current) => ({ ...current, [relatedId]: 'DISTINCT' }))}>Farklı köy, ayrı tut</Button>
                  </Stack>
                  {resolution && <Typography variant="caption" color="success.main">Karar: {resolution === 'MERGE' ? 'Birleştir' : 'Ayrı köy'}</Typography>}
                  {!resolution && <Typography variant="caption" color="error">Onay için bu tekrar hakkında karar verin.</Typography>}
                </Paper>;
              })}
            </Stack>
            <Typography variant="caption" color="text.secondary">PTT resmi listesi</Typography><Typography variant="body2" sx={{ mb: 1 }}>{seed.ptt_ilce ?? seed.ptt_district ?? seed.ptt?.district ?? selected.pttMatch?.district ?? 'Bu katkıda PTT ilçe kaydı bulunmuyor.'}</Typography>
            <Divider sx={{ my: 1.5 }} />
            {draft && <>
              <Stack direction="row" spacing={1}>
                <TextField label="Enlem" type="number" size="small" fullWidth value={draft.latitude ?? point?.lat ?? ''} onChange={(e) => updatePoint('latitude', e.target.value)} />
                <TextField label="Boylam" type="number" size="small" fullWidth value={draft.longitude ?? point?.lon ?? ''} onChange={(e) => updatePoint('longitude', e.target.value)} />
              </Stack>
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <FormControl size="small" fullWidth><InputLabel>Noktanın ilçesi</InputLabel><Select label="Noktanın ilçesi" value={correctedDistrict || district} onChange={(e) => setCorrectedDistrict(e.target.value)}>{districts.map((row) => <MenuItem key={row.name} value={row.name}>{row.name}</MenuItem>)}</Select></FormControl>
                <Button variant="outlined" onClick={() => { const q = String(draft.official_name ?? '').trim(); if (q) void heritageReviewService.checkLocation(draft).then(setChecks).catch((e) => setChecks({ error: errorText(e), flags: [] })); }}>Kontrol et</Button>
              </Stack>
            </>}
            <TextField label="İnceleme notu (isteğe bağlı)" size="small" fullWidth multiline minRows={2} maxRows={4} value={note} onChange={(e) => setNote(e.target.value)} sx={{ mt: 1.5, mb: 1 }} />
            <Stack spacing={0.8}>
              <Button variant="contained" onClick={() => void decide('APPROVE')} disabled={busy || unresolvedDuplicates.length > 0}>Onayla (A)</Button>
              {unresolvedDuplicates.length > 0 && <Typography variant="caption" color="error">Önce {unresolvedDuplicates.length} yakın tekrar için karar verin.</Typography>}
              {candidateRows.length > 0 && <>
                <FormControl size="small" fullWidth><InputLabel>Aday konum</InputLabel><Select label="Aday konum" value={selectedCandidateId} onChange={(e) => { const id = e.target.value; const candidate = candidateRows.find((row, index) => candidateKey(row, index) === id); if (candidate) applyCandidate(candidate); }}>
                  {candidateRows.map((candidate, index) => { const id = candidateKey(candidate, index); return <MenuItem key={id} value={id}>{candidate.official_name ?? candidate.name ?? 'Konum adayı'} · {candidate.source ?? (candidate.osm_id ? 'OSM' : 'öneri')}{(candidate.distanceKm ?? candidate.distance_km) != null ? ` · ${Number(candidate.distanceKm ?? candidate.distance_km).toFixed(1)} km` : ''}</MenuItem>; })}
                </Select></FormControl>
                <Button variant="outlined" onClick={() => void moveToCandidateAndApprove()} disabled={busy || !selectedCandidateId}>Adaya taşı ve onayla</Button>
              </>}
              <Button variant="outlined" onClick={manualMoveAndApprove} disabled={busy || !manualPoint}>Noktayı elle taşı ve onayla</Button>
              <Button variant="outlined" onClick={correctDistrictAndApprove} disabled={busy || !correctedDistrict || correctedDistrict === String(activePayload?.district ?? '')}>İlçeyi düzelt ve onayla</Button>
              {possibleMerges.length > 0 && <>
                <FormControl size="small" fullWidth><InputLabel>Birleştirilecek kayıt</InputLabel><Select label="Birleştirilecek kayıt" value={mergeTargetId} onChange={(e) => setMergeTargetId(e.target.value)}><MenuItem value="">Kayıt seç</MenuItem>{possibleMerges.map((row: any) => <MenuItem key={row.id ?? row.village_id} value={String(row.id ?? row.village_id)}>{row.official_name ?? row.name} · {row.district ?? ''}</MenuItem>)}</Select></FormControl>
                <TextField size="small" label="Kalacak ad" value={retainedName} onChange={(e) => setRetainedName(e.target.value)} />
                <Button variant="outlined" onClick={() => void decide('MERGE', { targetId: mergeTargetId, retainedName, alternativeNames: [oldName].filter((name) => name && name !== retainedName) })} disabled={busy || !mergeTargetId || !retainedName.trim()}>Seçili kayıtla birleştir</Button>
              </>}
              {duplicatePairs.length > 0 && <>
                <FormControl size="small" fullWidth><InputLabel>Tekrar çifti</InputLabel><Select label="Tekrar çifti" value={separatePairId} onChange={(e) => setSeparatePairId(e.target.value)}><MenuItem value="">Kayıt seç</MenuItem>{duplicatePairs.map((row: any) => <MenuItem key={row.id ?? row.village_id} value={String(row.id ?? row.village_id)}>{row.official_name ?? row.name}</MenuItem>)}</Select></FormControl>
                <Button variant="outlined" color="warning" onClick={() => void decide('MARK_SEPARATE', { pairVillageId: separatePairId })} disabled={busy || !separatePairId}>Bu çifti ayrı köy olarak işaretle</Button>
              </>}
              <Button variant="outlined" onClick={() => void decide('ASK_COMMUNITY', { record: { ...draft, approximate: true }, requestConfirmation: true })} disabled={busy}>Yaklaşık konum olarak bırak ve topluluğa sor</Button>
              <Button variant="outlined" color="error" onClick={() => void decide('REJECT')} disabled={busy || !note.trim()}>Köy değil / kaynak hatası · reddet</Button>
              <Button variant="text" onClick={() => void openHistory(selected.id, oldName)}>Kayıt geçmişi</Button>
              <Button variant="text" onClick={skip} disabled={selectedIndex < 0 || selectedIndex >= filteredItems.length - 1}>Atla (S)</Button>
            </Stack>
            {selected.contributor && <Alert severity="info" sx={{ mt: 1.5 }}>Öneri sahibi: {selected.contributor.name ?? selected.contributor.id} · katkı: {selected.contributor.contributionCount ?? '—'} · kabul oranı: {selected.contributor.acceptanceRate ?? '—'}</Alert>}
          </Paper>
        </>}
      </Stack>

      {historyOpen && <Paper variant="outlined" sx={{ mt: 2, p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center"><Typography variant="h6">Kayıt geçmişi · {historyRecord?.name ?? oldName}</Typography><Button onClick={() => setHistoryOpen(false)}>Kapat</Button></Stack>
        {history.length === 0 ? <Typography color="text.secondary" sx={{ mt: 1 }}>Bu kayıt için henüz denetim geçmişi yok.</Typography> : history.map((entry) => <Box key={entry.id} sx={{ py: 1, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography fontWeight={700}>{entry.action ?? entry.decision ?? entry.status ?? 'Karar'} · {entry.createdAt ?? entry.reviewed_at ?? 'zaman bilgisi yok'}</Typography>
          <Typography variant="body2">İşlemi yapan: {entry.actorName ?? entry.actor ?? entry.reviewed_by ?? 'bilinmiyor'} · Yöntem: {entry.method ?? entry.source ?? 'elle'}</Typography>
          <Typography variant="body2">Not: {entry.note ?? entry.review_note ?? '—'}</Typography>
          <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>Önce: {JSON.stringify(entry.before ?? entry.beforeSnapshot ?? entry.payload ?? {}, null, 2)}</Typography>
          <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>Sonra: {JSON.stringify(entry.after ?? entry.afterSnapshot ?? entry.payload?.reviewed_payload ?? {}, null, 2)}</Typography>
          <Button size="small" color="warning" disabled={busy || !(entry.canUndo ?? entry.undoable)} onClick={() => void undoChange(historyRecord!.id, String(entry.id))}>Bu değişikliği geri al</Button>
        </Box>)}
      </Paper>}
    </Box>
  );
}
