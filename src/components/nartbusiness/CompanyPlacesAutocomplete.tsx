import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Autocomplete,
  CircularProgress,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import {
  getPlaceDetails,
  PlacePrediction,
  searchPlaces,
} from '../../services/google/googlePlacesService';
import { AddressDTO } from '../../types/businesses/addressModel';

export interface CompanyPlaceResult {
  placeId?: string;
  companyName: string;
  address: Partial<AddressDTO> & { displayName?: string };
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect: (result: CompanyPlaceResult) => void;
  error?: boolean;
  helperText?: React.ReactNode;
  required?: boolean;
}

export function CompanyPlacesAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  error,
  helperText,
  required,
}: Props) {
  const [options, setOptions] = useState<PlacePrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(false);
  const selectionRef = useRef(0);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastQueryRef = useRef('');

  const fetchPredictions = useCallback((input: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!input || input.length < 2) {
      setOptions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      if (input === lastQueryRef.current) return;
      lastQueryRef.current = input;
      setLoading(true);
      try {
        const results = await searchPlaces(input, { types: ['establishment'] });
        setOptions(results);
      } finally {
        setLoading(false);
      }
    }, 350);
  }, []);

  useEffect(() => {
    fetchPredictions(value);
  }, [value, fetchPredictions]);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const handleSelect = async (_: unknown, option: PlacePrediction | string | null) => {
    if (!option || typeof option === 'string') return;
    const name = option.structured_formatting.main_text || option.description;
    const selection = ++selectionRef.current;
    setDetailsError(false);
    onChange(name);
    setOpen(false);

    const details = await getPlaceDetails(option.place_id);
    if (selection !== selectionRef.current) return;
    if (details) {
      onPlaceSelect({
        placeId: option.place_id,
        companyName: (details as { displayName?: string }).displayName || name,
        address: details,
      });
    } else {
      setDetailsError(true);
      onPlaceSelect({ companyName: name, address: {} });
    }
  };

  return (
    <Autocomplete<PlacePrediction, false, false, true>
      freeSolo
      open={open && options.length > 0}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      options={options}
      getOptionLabel={(opt) =>
        typeof opt === 'string' ? opt : opt.structured_formatting.main_text
      }
      filterOptions={(x) => x}
      loading={loading}
      inputValue={value}
      onInputChange={(_, val, reason) => {
        if (reason === 'input') {
          selectionRef.current += 1;
          setDetailsError(false);
          onChange(val);
        }
      }}
      onChange={handleSelect}
      renderOption={(props, opt) => {
        const { key: _k, ...rest } = props as React.HTMLAttributes<HTMLLIElement> & { key?: React.Key };
        return (
          <li {...rest} key={opt.place_id}>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {opt.structured_formatting.main_text}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              {opt.structured_formatting.secondary_text}
            </Typography>
          </li>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={`Şirket Adı${required ? ' *' : ''}`}
          size="small"
          fullWidth
          error={error}
          helperText={detailsError ? 'Adres alınamadı. Adresi ve ili elle doldurun.' : helperText}
          placeholder="Şirket adı yazın veya Google'dan ara"
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <InputAdornment position="start">
                <BusinessIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
            endAdornment: (
              <>
                {loading ? <CircularProgress size={16} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
}
