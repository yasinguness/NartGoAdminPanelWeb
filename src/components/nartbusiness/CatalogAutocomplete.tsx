import type { ReactNode, SyntheticEvent } from 'react';
import { Autocomplete, CircularProgress, TextField } from '@mui/material';
import type { AutocompleteRenderOptionState } from '@mui/material';

/**
 * Sonlu domain'lerde (sektör, şehir, sülale kataloğu, vb.) serbest yazıyı
 * yasaklayan ve daima katalogtan seçim zorlayan tek tipte autocomplete.
 *
 * Generic — options string[] de olabilir, object[] de.
 */

interface Props<T> {
  label: ReactNode;
  options: readonly T[] | T[];
  value: T | null | undefined;
  onChange: (v: T | null) => void;
  loading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  helperText?: ReactNode;
  required?: boolean;
  error?: boolean;
  getOptionLabel?: (opt: T) => string;
  isOptionEqualToValue?: (a: T, b: T) => boolean;
  renderOption?: (
    props: React.HTMLAttributes<HTMLLIElement>,
    option: T,
    state: AutocompleteRenderOptionState,
  ) => ReactNode;
  noOptionsText?: ReactNode;
  size?: 'small' | 'medium';
  /**
   * Dropdown popup'ın minimum genişliği (px). Default 280px — dar grid
   * sütunlarında bile uzun seçenek metinleri kırpılmasın diye.
   */
  popperMinWidth?: number;
}

export default function CatalogAutocomplete<T>({
  label,
  options,
  value,
  onChange,
  loading,
  disabled,
  placeholder,
  helperText,
  required,
  error,
  getOptionLabel,
  isOptionEqualToValue,
  renderOption,
  noOptionsText,
  size = 'small',
  popperMinWidth = 280,
}: Props<T>) {
  return (
    <Autocomplete<T>
      size={size}
      fullWidth
      disabled={disabled}
      loading={loading}
      options={options as T[]}
      value={value ?? null}
      onChange={(_: SyntheticEvent, v: T | null) => onChange(v)}
      getOptionLabel={
        getOptionLabel ?? ((opt) => (typeof opt === 'string' ? opt : String(opt)))
      }
      isOptionEqualToValue={isOptionEqualToValue}
      renderOption={renderOption}
      noOptionsText={noOptionsText ?? (loading ? 'Yükleniyor…' : 'Sonuç yok')}
      slotProps={{
        popper: {
          // Dar grid sütununda dropdown menünün kırpılmasını engelle —
          // input geniş olamasa da popup tam metni gösterir.
          sx: { minWidth: popperMinWidth },
          placement: 'bottom-start',
        },
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={required ? <>{label} *</> : label}
          placeholder={placeholder}
          error={error}
          helperText={helperText}
          InputProps={{
            ...params.InputProps,
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
