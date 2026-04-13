/**
 * GooglePlacesInput — Reusable Google Places Autocomplete location picker.
 * Returns structured AddressDTO-compatible data.
 *
 * Usage:
 *   <GooglePlacesInput value={address} onChange={setAddress} />
 *   <GooglePlacesInput value={address} onChange={setAddress} showDetails />
 */
import { useState, useRef, useCallback } from 'react';
import {
  Box, TextField, Paper, Typography, Stack, Chip, alpha, useTheme,
  CircularProgress, Collapse,
} from '@mui/material';
import { Place as PlaceIcon, CheckCircle as CheckIcon } from '@mui/icons-material';
import { searchPlaces, getPlaceDetails, PlacePrediction } from '../services/google/googlePlacesService';

// ── Address output type (matches backend AddressDTO) ──────────
export interface AddressValue {
  city?: string;
  district?: string;
  country?: string;
  countryCode?: string;
  street?: string;
  postalCode?: string;
  description?: string;        // formatted full address
  latitude?: number;
  longitude?: number;
  buildingNo?: string;
  floorNo?: string;
  apartmentNo?: string;
  addressDirections?: string;
}

interface Props {
  value: AddressValue | null;
  onChange: (address: AddressValue | null) => void;
  label?: string;
  placeholder?: string;
  showDetails?: boolean;       // show city/district/coords after selection
  required?: boolean;
  error?: boolean;
  helperText?: string;
  size?: 'small' | 'medium';
  fullWidth?: boolean;
}

export default function GooglePlacesInput({
  value,
  onChange,
  label = 'Konum',
  placeholder = 'Mekan adı veya adres yazın...',
  showDetails = false,
  required = false,
  error = false,
  helperText,
  size = 'small',
  fullWidth = true,
}: Props) {
  const theme = useTheme();
  const [search, setSearch] = useState(value?.description || '');
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleInput = useCallback((val: string) => {
    setSearch(val);
    if (val.length < 3) { setPredictions([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try { setPredictions(await searchPlaces(val)); }
      catch { setPredictions([]); }
      finally { setLoading(false); }
    }, 300);
  }, []);

  const handleSelect = useCallback(async (p: PlacePrediction) => {
    setSearch(p.description);
    setPredictions([]);
    const details = await getPlaceDetails(p.place_id);
    if (details) {
      onChange({
        city: details.city || undefined,
        district: details.district || undefined,
        country: details.country || 'Türkiye',
        countryCode: 'TR',
        street: details.street || undefined,
        postalCode: details.postalCode || undefined,
        description: details.description || p.description,
        latitude: details.latitude,
        longitude: details.longitude,
      });
    }
  }, [onChange]);

  const handleClear = useCallback(() => {
    setSearch('');
    onChange(null);
    setPredictions([]);
  }, [onChange]);

  const isSelected = !!value?.description;

  return (
    <Box sx={{ position: 'relative', width: fullWidth ? '100%' : 'auto' }}>
      <TextField
        fullWidth={fullWidth}
        size={size}
        label={label}
        value={search}
        onChange={e => { handleInput(e.target.value); if (isSelected) onChange(null); }}
        placeholder={placeholder}
        required={required}
        error={error}
        helperText={helperText}
        InputProps={{
          startAdornment: <PlaceIcon sx={{ mr: 1, color: isSelected ? 'success.main' : 'text.disabled', fontSize: 20 }} />,
          endAdornment: loading ? <CircularProgress size={16} /> : undefined,
        }}
        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
      />

      {/* Predictions dropdown */}
      {predictions.length > 0 && (
        <Paper sx={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1300,
          mt: 0.5, maxHeight: 260, overflow: 'auto',
          border: '1px solid', borderColor: 'divider', borderRadius: 2,
        }} elevation={4}>
          {predictions.map(p => (
            <Box key={p.place_id} onClick={() => handleSelect(p)}
              sx={{ px: 2, py: 1.5, cursor: 'pointer', '&:hover': { bgcolor: 'grey.50' },
                borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 'none' } }}>
              <Typography variant="body2" fontWeight={600}>{p.structured_formatting.main_text}</Typography>
              <Typography variant="caption" color="text.secondary">{p.structured_formatting.secondary_text}</Typography>
            </Box>
          ))}
        </Paper>
      )}

      {/* Selected address confirmation */}
      {isSelected && (
        <Collapse in>
          <Paper elevation={0} sx={{
            mt: 1, p: 1.5, borderRadius: 2,
            border: `1px solid ${alpha('#16a34a', 0.3)}`,
            bgcolor: alpha('#16a34a', 0.04),
          }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <CheckIcon sx={{ color: 'success.main', fontSize: 18 }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={600} noWrap>{value?.description}</Typography>
                {showDetails && (
                  <Typography variant="caption" color="text.secondary">
                    {[value?.city, value?.district].filter(Boolean).join(' / ')}
                    {value?.latitude ? ` — ${value.latitude.toFixed(4)}, ${value.longitude?.toFixed(4)}` : ''}
                  </Typography>
                )}
              </Box>
              <Chip size="small" label="Değiştir" variant="outlined"
                onClick={handleClear} sx={{ fontWeight: 600, fontSize: 11 }} />
            </Stack>
          </Paper>
        </Collapse>
      )}
    </Box>
  );
}
