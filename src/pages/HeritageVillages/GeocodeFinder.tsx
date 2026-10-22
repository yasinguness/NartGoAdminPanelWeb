import { useEffect, useState } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, List, ListItemButton, ListItemText, Stack, TextField, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { errorText } from '../../services/heritageReviewService';
import { heritageVillageService, type GeoCandidate, type GeocodeResult } from '../../services/heritageVillageService';

const SOURCE_COLOR: Record<GeoCandidate['source'], 'success' | 'primary' | 'default'> = { osm_local: 'success', google: 'primary', nominatim: 'default' };

/**
 * Konum bulma: köy adını yazınca yerel yerleşim listesinde, Google'da (anahtar varsa) ve OpenStreetMap'te arar.
 * Sonuç öneridir; seçilince üst bileşen noktayı haritaya koyar, admin görüp onaylar.
 */
export default function GeocodeFinder({
  query, province, district, country, onPick,
}: {
  query: string;
  province?: string;
  district?: string;
  country?: string;
  onPick: (c: GeoCandidate) => void;
}) {
  const [text, setText] = useState(query);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<GeocodeResult | null>(null);

  // Üstteki ad değişince arama kutusu da değişir; admin elle yazdıysa ezilir (ad yazarken aramak doğal).
  useEffect(() => { setText(query); setResult(null); }, [query]);

  const run = async () => {
    if (text.trim().length < 2) return;
    setBusy(true); setError('');
    try { setResult(await heritageVillageService.geocode(text.trim(), province, district, country)); }
    catch (e) { setError(errorText(e)); setResult(null); }
    finally { setBusy(false); }
  };

  return (
    <Box>
      <Stack direction="row" spacing={1}>
        <TextField size="small" fullWidth label="Köy adı ile konum ara" value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void run(); } }}
          helperText="İl ve ilçe seçiliyse aramaya eklenir. Örnek: Yassıpınar" />
        <Button variant="contained" onClick={() => void run()} disabled={busy || text.trim().length < 2} startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <SearchIcon />} sx={{ whiteSpace: 'nowrap', alignSelf: 'flex-start', height: 40 }}>
          Konumu bul
        </Button>
      </Stack>
      {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
      {result && !result.googleConfigured && (
        <Alert severity="info" sx={{ mt: 1 }}>Google anahtarı tanımlı değil; yerel liste ve OpenStreetMap kullanılıyor. Google için sunucuda GOOGLE_PLACES_API_KEY tanımlı olmalı.</Alert>
      )}
      {result && result.candidates.length === 0 && (
        <Alert severity="warning" sx={{ mt: 1 }}>Sonuç bulunamadı. Adı farklı yazmayı deneyin ya da haritaya tıklayarak konumu elle seçin.</Alert>
      )}
      {result && result.candidates.length > 0 && (
        <List dense disablePadding sx={{ mt: 1, border: 1, borderColor: 'divider', borderRadius: 1, maxHeight: 220, overflow: 'auto' }}>
          {result.candidates.map((c, i) => (
            <ListItemButton key={`${c.source}-${c.latitude}-${c.longitude}-${i}`} onClick={() => onPick(c)}>
              <ListItemText
                primary={<Stack direction="row" spacing={1} alignItems="center"><Typography fontWeight={600}>{c.name || '(adsız)'}</Typography><Chip size="small" label={c.sourceLabel} color={SOURCE_COLOR[c.source]} variant="outlined" />{c.villageId && <Chip size="small" label="Zaten kayıtlı" color="warning" />}</Stack>}
                secondary={`${c.address || [c.district, c.province].filter(Boolean).join(', ')} · ${c.latitude.toFixed(5)}, ${c.longitude.toFixed(5)}`}
              />
            </ListItemButton>
          ))}
        </List>
      )}
    </Box>
  );
}
